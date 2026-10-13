//! Attacks and support abilities in flight: `updateAttack` and `applySupportAbility` (depth in the team-4.0
//! prototype chain in each doc line). The `updateAttack` chain runs d20 (a healer's mana refund) → d14 (a patched
//! ability's context) → d12 (support abilities) → d8 (team kits) → d7 (hold fire behind cover) → d6 (Cleave's arc)
//! → d5 (techniques; counter and last-stand boosts) → d4 (spell casts) → d2 (decoys, loud weapons, portal shots) →
//! d1 (swings and shots). Each layer below d12 returns whether the action it started with is released afterwards,
//! which JavaScript reads off the action object even after `f.action` is cleared.
use super::combat::{HitContext, Tags};
use super::consts::CC_IMMUNITY;
use super::effects::HARMFUL_TEAM;
use super::movement::js_cmp;
use super::queries::{de, js_index};
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::{angle_gap, clamp};
use crate::team::jsnum::Ent;
use crate::team::state::{BattleProjectiles, EntityPowers, EntityWeaponProperties};
use std::f64::consts::PI;

/// `strikes` (combat-v12.js): weapon techniques a metal disarm interrupts.
const STRIKES: [&str; 5] = ["drivingStrike", "charge", "cleave", "aimedShot", "cripplingStrike"];

/// `weaponProperties(f.weapon.name)` as the object JavaScript stores on projectiles.
fn weapon_properties(e: &crate::team::state::Entity) -> EntityWeaponProperties {
    e.weapon.properties.clone().unwrap_or(EntityWeaponProperties {
        blunt: Some(false),
        cold_iron: Some(false),
        heavy: Some(false),
        holy: Some(false),
        loud: Some(false),
        metal: Some(false),
        poison: Some(false),
        silver: Some(false),
    })
}

fn projectile(x: f64, y: f64, vx: f64, vy: f64, owner: f64, damage: f64, kind: &str, sprite: f64, life: f64, radius: f64) -> BattleProjectiles {
    BattleProjectiles {
        x,
        y,
        vx,
        vy,
        owner,
        damage,
        type_: kind.into(),
        sprite,
        life,
        radius,
        balance_ability: None,
        duration: None,
        molten: None,
        ordinary_arcane: None,
        payload: None,
        tags: None,
        technique: None,
        weapon_hit: None,
    }
}

impl Engine {
    /// d20 `healerSpend(f, run)`: healers get part of the mana a run spends back.
    pub fn healer_spend<R>(&mut self, f: Ent, run: impl FnOnce(&mut Engine) -> R) -> R {
        if self.f(f).role != "healer" {
            return run(self);
        }
        let before = self.f(f).mana;
        let result = run(self);
        let keep = self.b.healer_rules.mana;
        let e = self.fm(f);
        if e.mana < before {
            e.mana += (before - e.mana) * (1.0 - keep);
        }
        result
    }

    /// `updateAttack(f, t, dt)` from the top (d20).
    pub fn update_attack(&mut self, f: Ent, t: &Tgt, dt: f64) {
        self.healer_spend(f, |s| {
            match s.f(f).action.as_ref().and_then(|a| a.power.as_ref()).map(|p| p.id.clone()) {
                Some(id) => s.ability_context(f, &id, |s| s.update_attack_d12(f, t, dt)),
                None => s.update_attack_d12(f, t, dt),
            }
        });
    }

    /// d12: a support ability resolves when its windup ends, on the targets that are still legal.
    fn update_attack_d12(&mut self, f: Ent, t: &Tgt, dt: f64) {
        if self.f(f).action.as_ref().map(|a| a.type_.as_str()) != Some("supportAbility") {
            self.update_attack_d8(f, t, dt);
            return;
        }
        let a = self.f(f).action.clone().unwrap();
        let p = a.power.clone().expect("a support ability has a power");
        let spell = p.kind == "spell";
        let fe = self.f(f);
        if fe.hp <= 0.0
            || fe.sleep > 0.0
            || fe.amnesia > 0.0
            || spell && fe.suppressed > 0.0
            || !spell && ["hamstring", "disarmShot", "knockUp"].contains(&p.id.as_str()) && fe.disarmed > 0.0
            || fe.stagger > 0.0
            || fe.roll > 0.0
        {
            self.fm(f).action = None;
            return;
        }
        let elapsed = {
            let e = self.fm(f);
            let act = e.action.as_mut().unwrap();
            act.elapsed += dt;
            let elapsed = act.elapsed;
            e.action_label = p.name.clone();
            elapsed
        };
        if elapsed < a.windup {
            return;
        }
        self.fm(f).action = None;
        let targets: Vec<Ent> = a
            .targets
            .as_deref()
            .unwrap_or_default()
            .iter()
            .filter_map(|&index| self.b.combatants.iter().copied().find(|&x| self.f(x).side == index))
            .collect();
        let first = targets.first().copied();
        let legal = self.support_targets(f, &p, first.map(Tgt::of).as_ref(), true);
        let area = ["mendingWave", "barrier", "tauntShout", "knockUp"].contains(&p.id.as_str());
        let refused = if area { legal.is_empty() } else { first.map_or(true, |x| !legal.contains(&x)) };
        if refused {
            let cost = a.cost.unwrap_or(f64::NAN);
            let e = self.fm(f);
            if spell {
                e.mana = min(e.max_mana, e.mana + cost);
            } else {
                e.energy = min(e.max_energy, e.energy + cost);
            }
            e.power_used.0.retain(|(k, _)| *k != p.id);
            e.cast = min(e.cast, 0.2);
            return;
        }
        let chosen = if area { legal } else { targets.into_iter().filter(|x| legal.contains(x)).collect() };
        self.apply_support_ability(f, &p, &chosen);
    }

    /// d8: team kits (no team-4.0 fighter carries one) and d7: hold fire when the shot is about to hit cover.
    fn update_attack_d8(&mut self, f: Ent, t: &Tgt, dt: f64) {
        let Some(a) = self.f(f).action.clone() else {
            self.update_attack_d6(f, t, dt);
            return;
        };
        assert!(a.type_ != "teamKit", "team-4.0 fighters carry no team kit");
        let aimed = a.target_index.and_then(|i| js_index(i, self.b.fighters.len())).map(|i| Tgt::of(self.b.fighters[i])).unwrap_or_else(|| t.clone());
        let ranged = self.f(f).weapon.type_ == "ranged";
        let projectile = a.type_ == "shot" || a.type_ == "technique" && ranged;
        if a.released != Some(true) && a.elapsed + dt >= a.windup {
            let blocked = projectile && (self.thp(&aimed) <= 0.0 || !self.shot_clear(f, &aimed, a.angle.unwrap_or(f64::NAN)))
                || a.type_ == "cast" && (self.thp(&aimed) <= 0.0 || !self.clear_shot(self.f(f).x, self.f(f).y, self.tx(&aimed), self.ty(&aimed)));
            if blocked {
                let e = self.fm(f);
                e.energy = min(100.0, e.energy + a.refund_energy.unwrap_or(0.0));
                e.mana = min(e.max_mana, e.mana + a.refund_mana.unwrap_or(0.0));
                e.action = None;
                e.cooldown = min(e.cooldown, 0.12);
                if a.power.is_some() {
                    e.cast = min(e.cast, 0.2);
                }
                e.action_label = "Find a clear shot".into();
                return;
            }
        }
        self.update_attack_d6(f, &aimed, dt);
    }

    /// d6: Cleave's wide arc also hits other enemies standing in it.
    fn update_attack_d6(&mut self, f: Ent, t: &Tgt, dt: f64) -> bool {
        let action = self.f(f).action.clone();
        let cleave = action.as_ref().is_some_and(|a| a.type_ == "technique" && a.power.as_ref().is_some_and(|p| p.id == "cleave") && a.released != Some(true));
        let released = self.update_attack_d5(f, t, dt);
        if cleave && released && self.f(f).weapon.type_ != "ranged" {
            let angle = action.unwrap().angle.unwrap_or(f64::NAN);
            for e in self.enemies_of(f) {
                if t.is_plain() && e == t.ent {
                    continue;
                }
                let (fe, ee) = (self.f(f), self.f(e));
                if de(fe, ee) > fe.weapon.range + 16.0 || angle_gap(jsmath::atan2(ee.y - fe.y, ee.x - fe.x), angle) >= 1.6 {
                    continue;
                }
                let tags = super::combat::weapon_tags(fe);
                self.tr.hit_context = Some(HitContext { tags: Some(tags), technique: true, weapon_hit: true, ..Default::default() });
                let damage = self.f(f).damage * 0.75;
                self.hurt(&Tgt::of(e), Some(f), damage, "physical", true);
                self.tr.hit_context = None;
            }
        }
        released
    }

    /// d5: weapon techniques; otherwise counter and last-stand boosts around an ordinary swing or shot.
    fn update_attack_d5(&mut self, f: Ent, t: &Tgt, dt: f64) -> bool {
        let action = self.f(f).action.clone();
        let Some(a) = action.filter(|a| a.type_ == "technique") else {
            let action = self.f(f).action.clone();
            let was_released = action.as_ref().is_some_and(|a| a.released == Some(true));
            let weapon_action = action.as_ref().is_some_and(|a| a.type_ == "melee" || a.type_ == "shot");
            let fe = self.f(f);
            let boost = if weapon_action { (if fe.last_stand_time > 0.0 { 1.2 } else { 1.0 }) * if fe.counter_time > 0.0 { fe.counter_scale } else { 1.0 } } else { 1.0 };
            let damage = fe.damage;
            self.fm(f).damage *= boost;
            let released = self.update_attack_d4(f, t, dt);
            self.fm(f).damage = damage;
            if weapon_action && !was_released && released && self.f(f).counter_time > 0.0 {
                self.fm(f).counter_time = 0.0;
            }
            return released;
        };
        let p = a.power.clone().expect("a technique has a power");
        let fe = self.f(f);
        if fe.hp <= 0.0 || fe.sleep > 0.0 || fe.amnesia > 0.0 || fe.stagger > 0.0 || STRIKES.contains(&p.id.as_str()) && fe.disarmed > 0.0 && super::combat::weapon_tags(fe).metal {
            self.fm(f).action = None;
            return a.released == Some(true);
        }
        let (elapsed, mut released) = {
            let act = self.fm(f).action.as_mut().unwrap();
            act.elapsed += dt;
            (act.elapsed, act.released == Some(true))
        };
        if !released && elapsed >= a.windup {
            released = true;
            self.fm(f).action.as_mut().unwrap().released = Some(true);
            let fe = self.f(f);
            let boost = if fe.last_stand_time > 0.0 { 1.2 } else { 1.0 };
            let mult = match p.id.as_str() {
                "drivingStrike" => 1.1,
                "charge" => 0.65,
                "cleave" => 1.25,
                "aimedShot" => 1.25,
                "cripplingStrike" => 0.9,
                _ => 1.0,
            };
            let angle = a.angle.unwrap_or(f64::NAN);
            let payload = (p.id == "cripplingStrike").then(|| p.id.clone());
            if fe.weapon.type_ == "ranged" {
                let duration = self.duration(f, Some(t), 2.0);
                let fe = self.f(f);
                let mut shot = projectile(fe.x, fe.y, jsmath::cos(angle) * 290.0, jsmath::sin(angle) * 290.0, fe.side, fe.damage * mult * boost, "physical", -1.0, 2.5, 3.0);
                shot.tags = Some(weapon_properties(fe));
                shot.technique = Some(true);
                shot.weapon_hit = Some(true);
                shot.payload = payload;
                shot.duration = Some(duration);
                let loud = super::combat::weapon_tags(fe).loud;
                let (x, y) = (fe.x, fe.y);
                self.b.projectiles.push(shot);
                if loud {
                    self.emit_sound(Some(f), x, y, 190.0);
                }
            } else {
                let (tx, ty) = (self.tx(t), self.ty(t));
                let to = jsmath::atan2(ty - fe.y, tx - fe.x);
                let delta = jsmath::atan2(jsmath::sin(to - angle), jsmath::cos(to - angle));
                let reach = if p.id == "charge" { 36.0 } else { fe.weapon.range + 16.0 };
                if hypot2(fe.x - tx, fe.y - ty) <= reach && delta.abs() < if p.id == "cleave" { 1.6 } else { 1.05 } {
                    let duration = self.duration(f, Some(t), 2.0);
                    let tags = super::combat::weapon_tags(self.f(f));
                    self.tr.hit_context = Some(HitContext { tags: Some(tags), technique: true, weapon_hit: true, payload, duration: Some(duration), ..Default::default() });
                    let damage = self.f(f).damage * mult * boost;
                    let hit = self.hurt(t, Some(f), damage, "physical", true);
                    self.tr.hit_context = None;
                    if hit == Some(true) && t.is_plain() {
                        let (fx, fy) = (self.f(f).x, self.f(f).y);
                        if p.id == "drivingStrike" {
                            self.push(t.ent, fx, fy, 15.0);
                        }
                        if p.id == "charge" {
                            let e = self.fm(t.ent);
                            e.action = None;
                            e.stagger = max(e.stagger, 0.15);
                            if self.f(f).weapon.name.to_lowercase().contains("shield") {
                                let (fx, fy) = (self.f(f).x, self.f(f).y);
                                self.push(t.ent, fx, fy, 20.0);
                            }
                        }
                    }
                }
            }
        }
        if elapsed >= a.windup + a.recovery.unwrap_or(f64::NAN) {
            self.fm(f).action = None;
        }
        released
    }

    /// d4: a spell cast (Lightning, Storm, Light, Silence, Memory) lands when its windup ends.
    fn update_attack_d4(&mut self, f: Ent, t: &Tgt, dt: f64) -> bool {
        if self.f(f).action.as_ref().map(|a| a.type_.as_str()) != Some("cast") {
            return self.update_attack_d2(f, t, dt);
        }
        let fe = self.f(f);
        if fe.hp <= 0.0 || fe.sleep > 0.0 || fe.amnesia > 0.0 || fe.suppressed > 0.0 || fe.stagger > 0.0 {
            self.fm(f).action = None;
            return false;
        }
        let a = {
            let act = self.fm(f).action.as_mut().unwrap();
            act.elapsed += dt;
            act.clone()
        };
        if a.elapsed < a.windup {
            return false;
        }
        self.fm(f).action = None;
        let p = a.power.expect("a cast has a power");
        let reach = if p.id == "storm" { 300.0 } else { 220.0 };
        let (fx, fy) = (self.f(f).x, self.f(f).y);
        if hypot2(self.tx(t) - fx, self.ty(t) - fy) > reach {
            return false;
        }
        let tt = t.ent;
        if p.id == "memory" {
            if self.connect_control(f, tt) {
                let amnesia = self.duration(f, Some(t), self.b.rules.memory_duration);
                let e = self.fm(tt);
                e.amnesia = amnesia * if e.weakness == "memory loss" { 1.5 } else { 1.0 };
                e.action = None;
                e.insight = 0.0;
                e.mind_time = 0.0;
            }
            return false;
        }
        let light = p.id == "light";
        let silence = p.id == "silence";
        let duration = self.duration(f, Some(t), 1.8);
        let tags = if light { Tags { holy: true, sunlight: true, ..Default::default() } } else { Tags::default() };
        self.tr.hit_context = Some(HitContext { tags: Some(tags), payload: silence.then(|| "void".to_string()), duration: Some(duration), ..Default::default() });
        let amount = self.f(f).spell * if light { 0.70 } else if silence { 0.40 } else { 0.95 };
        let connected = self.hurt(t, Some(f), amount, if light { "holy" } else if silence { "void" } else { "lightning" }, true);
        self.tr.hit_context = None;
        if connected == Some(true) && t.is_plain() {
            if light {
                let blind = self.duration(f, Some(t), 1.5);
                let e = self.fm(tt);
                e.invisible = 0.0;
                e.illusion_time = 0.0;
                e.blind = blind;
            }
            if silence {
                self.fm(tt).action = None;
            }
        }
        if p.id == "storm" {
            let (x, y) = (self.tx(t), self.ty(t));
            self.emit_sound(Some(f), x, y, 260.0);
        }
        false
    }

    /// d2: swings and shots go at the decoy when fooled; a release reveals the attacker, loud weapons are heard, and
    /// shots fired while a portal is open leave from its exit.
    fn update_attack_d2(&mut self, f: Ent, t: &Tgt, dt: f64) -> bool {
        let fe = self.f(f);
        if fe.sleep > 0.0 || fe.amnesia > 0.0 {
            let released = fe.action.as_ref().is_some_and(|a| a.released == Some(true));
            self.fm(f).action = None;
            return released;
        }
        let had = fe.action.is_some();
        let released = fe.action.as_ref().is_some_and(|a| a.released == Some(true));
        let old = self.b.projectiles.len();
        let target = self.target_for(f, t);
        let now = self.update_attack_d1(f, &target, dt);
        if had && !released && now {
            self.fm(f).invisible = 0.0;
            let props = weapon_properties(self.f(f));
            if props.loud == Some(true) {
                let (x, y) = (self.f(f).x, self.f(f).y);
                self.emit_sound(Some(f), x, y, 190.0);
            }
            for i in old..self.b.projectiles.len() {
                self.b.projectiles[i].tags = Some(props.clone());
                let fe = self.f(f);
                if fe.portal_time > 0.0 {
                    if let Some(exit) = fe.gates.as_ref().map(|g| (g[1].x, g[1].y)) {
                        let angle = self.aim(exit.0, exit.1, f, t, 290.0);
                        let p = &mut self.b.projectiles[i];
                        p.x = exit.0;
                        p.y = exit.1;
                        p.vx = jsmath::cos(angle) * 290.0;
                        p.vy = jsmath::sin(angle) * 290.0;
                    }
                }
            }
        }
        now
    }

    /// d1: a melee windup tracks its target; on release a swing hits (or misses) and a shot leaves.
    fn update_attack_d1(&mut self, f: Ent, t: &Tgt, dt: f64) -> bool {
        let Some(a) = self.f(f).action.clone() else { return false };
        let (tx, ty) = (self.tx(t), self.ty(t));
        let (fx, fy) = (self.f(f).x, self.f(f).y);
        let mut angle = a.angle.unwrap_or(f64::NAN);
        let melee = a.type_ == "melee";
        if melee && a.released != Some(true) && a.elapsed < a.windup * 0.65 {
            let to = jsmath::atan2(ty - fy, tx - fx);
            let delta = jsmath::atan2(jsmath::sin(to - angle), jsmath::cos(to - angle));
            let tracking = min(dt, a.windup * 0.65 - a.elapsed);
            angle += clamp(delta, -PI * tracking, PI * tracking);
        }
        let elapsed = a.elapsed + dt;
        let mut released = a.released == Some(true);
        let release = !released && elapsed >= a.windup;
        {
            let act = self.fm(f).action.as_mut().unwrap();
            if melee && a.released != Some(true) && a.elapsed < a.windup * 0.65 {
                act.angle = Some(angle);
            }
            act.elapsed = elapsed;
            if release {
                act.released = Some(true);
            }
        }
        if release {
            released = true;
            self.fm(f).swing = 0.22;
            if melee {
                let (dx, dy) = (tx - fx, ty - fy);
                let d = hypot2(dx, dy);
                let to = jsmath::atan2(dy, dx);
                let difference = jsmath::atan2(jsmath::sin(to - angle), jsmath::cos(to - angle));
                let fe = self.f(f);
                if d <= fe.weapon.range + 16.0 && difference.abs() < if a.heavy == Some(true) { 1.35 } else { 1.05 } {
                    let damage = fe.damage;
                    self.hurt(t, Some(f), damage, "physical", true);
                }
            } else {
                let fe = self.f(f);
                let arcane = fe.weapon.type_ == "arcane";
                let damage = if arcane { fe.damage + fe.spell * self.b.rules.arcane_spell } else { fe.damage };
                let mut shot = projectile(fe.x, fe.y, jsmath::cos(angle) * 290.0, jsmath::sin(angle) * 290.0, fe.side, damage, if arcane { "arcane" } else { "physical" }, if arcane { 4.0 } else { -1.0 }, 2.5, 3.0);
                shot.ordinary_arcane = Some(arcane);
                self.b.projectiles.push(shot);
            }
        }
        if elapsed >= a.windup + a.recovery.unwrap_or(f64::NAN) {
            self.fm(f).action = None;
        }
        released
    }

    /// `startAttack(f, t)`: d12/d8 (disarmed fighters only cast) → d7 (abilities first; hold fire behind cover) → d6
    /// → d5 → d2 (decoys; energy) → d1 (wind up a swing or aim a shot).
    pub fn start_attack(&mut self, f: Ent, t: &Tgt) {
        if self.f(f).disarmed > 0.0 {
            self.cast_power(f, t);
            return;
        }
        // d7
        let fe = self.f(f);
        if fe.action.is_some() || fe.sleep > 0.0 || fe.amnesia > 0.0 || fe.stagger > 0.0 || fe.roll > 0.0 {
            return;
        }
        let casts = fe.cast_count;
        self.cast_power(f, t);
        if self.f(f).cast_count != casts || self.f(f).action.is_some() {
            return;
        }
        let fe = self.f(f);
        let free = fe.weapon.type_ == "melee" || fe.raging == Some(true) || fe.shape > 0.0;
        if !free {
            let (fx, fy) = (fe.x, fe.y);
            let angle = self.aim(fx, fy, f, t, 290.0);
            if !self.shot_clear(f, t, angle) {
                return;
            }
        }
        let energy = self.f(f).energy;
        self.start_attack_d6(f, t);
        let index = self.f(t.ent).index;
        let e = self.fm(f);
        let spent = max(0.0, energy - e.energy);
        if let Some(a) = e.action.as_mut().filter(|a| a.released != Some(true)) {
            a.refund_energy = Some(spent);
            a.target_index = Some(index);
        }
    }

    fn start_attack_d6(&mut self, f: Ent, t: &Tgt) {
        let fe = self.f(f);
        let free = fe.weapon.type_ == "melee" || fe.raging == Some(true) || fe.shape > 0.0;
        if !free && !self.clear_shot(fe.x, fe.y, self.tx(t), self.ty(t)) {
            return;
        }
        // d5
        let fe = self.f(f);
        if fe.sleep > 0.0 || fe.amnesia > 0.0 || fe.stagger > 0.0 || fe.roll > 0.0 || fe.action.is_some() {
            return;
        }
        let count = fe.cast_count;
        self.cast_power(f, t);
        if self.f(f).cast_count != count || self.f(f).action.is_some() {
            return;
        }
        // d2
        let fe = self.f(f);
        let arcane = fe.weapon.type_ == "arcane";
        if fe.sleep > 0.0 || fe.amnesia > 0.0 || fe.energy < 6.0 || fe.suppressed > 0.0 && arcane || fe.disarmed > 0.0 && super::combat::weapon_tags(fe).metal || fe.weakness == "silenced casting" && arcane {
            return;
        }
        let target = self.target_for(f, t);
        let before = self.f(f).action.is_some();
        self.start_attack_d1(f, &target);
        if !before && self.f(f).action.is_some() {
            self.fm(f).energy -= 6.0;
        }
    }

    /// d1: start a swing or a shot when the target is in reach.
    fn start_attack_d1(&mut self, f: Ent, t: &Tgt) {
        let fe = self.f(f);
        if fe.cooldown > 0.0 || fe.action.is_some() || fe.roll > 0.0 || fe.stagger > 0.0 {
            return;
        }
        let d = hypot2(self.tx(t) - fe.x, self.ty(t) - fe.y);
        if d > fe.weapon.range + 8.0 {
            return;
        }
        let melee = fe.weapon.type_ == "melee";
        let heavy = fe.weapon.interval >= 1.25;
        let windup = if melee { if heavy { 0.23 } else { 0.14 } } else { 0.22 };
        let angle = if melee {
            fe.angle
        } else {
            let (fx, fy) = (fe.x, fe.y);
            self.aim(fx, fy, f, t, 290.0)
        };
        let e = self.fm(f);
        e.action = Some(crate::team::state::EntityAction {
            type_: if melee { "melee" } else { "shot" }.into(),
            angle: Some(angle),
            elapsed: 0.0,
            windup: windup * (0.95 - 0.2 * e.tactics),
            recovery: Some(if melee { if heavy { 0.27 } else { 0.19 } } else { 0.14 }),
            released: Some(false),
            heavy: Some(heavy),
            cost: None,
            origin: None,
            power: None,
            refund_energy: None,
            refund_mana: None,
            target_index: None,
            targets: None,
            travel: None,
        });
        e.cooldown = e.interval + windup;
        e.action_label = if melee { "Wind up" } else { "Aim" }.into();
        if melee {
            self.b.metrics.swings += 1.0;
        } else {
            self.b.metrics.shots += 1.0;
        }
    }

    /// `applySupportAbility(f, p, targets)`: d14 (a patched ability's context; Resurrection's healing patch) → d12.
    pub fn apply_support_ability(&mut self, f: Ent, p: &EntityPowers, targets: &[Ent]) {
        let before: Vec<(Ent, f64)> = targets.iter().map(|&a| (a, self.f(a).hp)).collect();
        self.ability_context(f, &p.id, |s| {
            s.apply_support_ability_d12(f, p, targets);
            if p.id == "resurrection" {
                for (a, hp) in before {
                    if hp <= 0.0 && s.f(a).hp > 0.0 {
                        let factor = s.ability_factor(f, &p.id, "healing");
                        let e = s.fm(a);
                        e.hp = min(e.max_hp, e.hp * factor);
                    }
                }
            }
        });
    }

    /// Heal `a` on `f`'s behalf (`healSource` credits the healing).
    fn heal_from(&mut self, f: Ent, a: Ent, amount: f64) {
        self.tr.heal_source = Some(f);
        self.heal(a, amount);
        self.tr.heal_source = None;
    }

    /// d12 `applySupportAbility`: what each rolled support ability does.
    fn apply_support_ability_d12(&mut self, f: Ent, p: &EntityPowers, targets: &[Ent]) {
        let first = targets.first().copied();
        let factor = if p.group.as_deref() == Some("healing") { self.b.balance.multipliers.get("ability:healing:output").copied().unwrap_or(1.0) } else { 1.0 };
        let id = p.id.as_str();
        if id == "mendingWave" {
            for &a in targets {
                if self.f(a).hp > 0.0 && de(self.f(f), self.f(a)) <= 110.0 {
                    let n = self.f(f).spell * 0.75;
                    self.heal_from(f, a, n * factor);
                }
            }
        }
        if id == "chainHeal" && first.is_some_and(|a| self.f(a).hp > 0.0) {
            let mut used: Vec<f64> = Vec::new();
            let mut a = first;
            for power in [0.8, 0.65, 0.5] {
                let Some(cur) = a else { break };
                used.push(self.f(cur).side);
                let n = self.f(f).spell * power;
                self.heal_from(f, cur, n * factor);
                let mut next: Vec<Ent> = self
                    .support_allies(f, false)
                    .into_iter()
                    .filter(|&b| {
                        let be = self.f(b);
                        !used.contains(&be.side) && be.hp < be.max_hp * 0.9 && de(self.f(cur), be) <= 120.0 && self.support_line(cur, b)
                    })
                    .collect();
                next.sort_by(|&x, &y| {
                    let (xe, ye) = (self.f(x), self.f(y));
                    let r = xe.hp / xe.max_hp - ye.hp / ye.max_hp;
                    js_cmp(if r != 0.0 && !r.is_nan() { r } else { xe.side - ye.side })
                });
                a = next.first().copied();
            }
        }
        if id == "resurrection" {
            if let Some(t) = first.filter(|&t| self.f(t).hp <= 0.0 && self.f(t).support_revived != Some(true) && self.f(f).support_revive_spent != Some(true)) {
                self.fm(f).support_revive_spent = Some(true);
                let e = self.fm(t);
                e.support_revived = Some(true);
                e.hp = e.max_hp * 0.4 * factor;
                e.downed = false;
                e.credited_down = false;
                e.action = None;
                e.vx = 0.0;
                e.vy = 0.0;
                e.respawn_at = None;
                for key in HARMFUL_TEAM {
                    *super::effects::harmful_mut(e, key) = 0.0;
                }
                e.cc_immune = CC_IMMUNITY;
                self.b.plan_timer = 0.0;
                self.update_plans();
            }
        }
        if id == "cleanse" {
            if let Some(t) = first.filter(|&t| self.f(t).hp > 0.0) {
                let e = self.fm(t);
                for key in HARMFUL_TEAM {
                    *super::effects::harmful_mut(e, key) = 0.0;
                }
                e.action = None;
                e.cc_immune = CC_IMMUNITY;
                e.was_hard = false;
            }
        }
        if id == "barrier" {
            for &a in targets {
                if self.f(a).hp > 0.0 && de(self.f(f), self.f(a)) <= 110.0 {
                    let ward = self.duration(f, None, 4.0) * factor;
                    let e = self.fm(a);
                    e.ward_hits = max(e.ward_hits, 1.0);
                    e.ward_time = max(e.ward_time, ward);
                }
            }
        }
        if id == "stunBolt" || id == "disarmShot" {
            if let Some(t) = first.filter(|&t| self.f(t).hp > 0.0) {
                let (fx, fy) = (self.f(f).x, self.f(f).y);
                let angle = self.aim(fx, fy, f, &Tgt::of(t), 260.0);
                let duration = self.duration(f, Some(&Tgt::of(t)), if id == "stunBolt" { 1.2 } else { 2.4 });
                let fe = self.f(f);
                let spell = p.kind == "spell";
                let mut bolt = projectile(fe.x, fe.y, jsmath::cos(angle) * 260.0, jsmath::sin(angle) * 260.0, fe.side, (if spell { fe.spell } else { fe.damage }) * 0.25, if spell { "psychic" } else { "physical" }, 10.0, 2.0, 4.0);
                bolt.payload = Some(format!("support:{id}"));
                bolt.duration = Some(duration);
                self.b.projectiles.push(bolt);
            }
        }
        if id == "hamstring" {
            let duration = self.duration(f, first.map(Tgt::of).as_ref(), 4.0);
            self.support_control(f, first, id, duration);
        }
        if id == "tauntShout" || id == "knockUp" {
            for &a in targets {
                if self.f(a).hp > 0.0 {
                    let duration = self.duration(f, Some(&Tgt::of(a)), if id == "tauntShout" { 2.0 } else { 0.6 });
                    self.support_control(f, Some(a), id, duration);
                }
            }
        }
    }
}

//! Effects and support: durations, healing, crowd control, fortification, rebirth, projectiles, line of fire and
//! support targeting (depth in the team-4.0 prototype chain in each doc line).
use super::consts::{self, team_rules, CC_IMMUNITY};
use super::movement::{js_cmp, truthy, Kind};
use super::queries::{d, de, Pt};
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::segment;
use crate::team::jsnum::Ent;
use crate::team::state::{BattleProjectiles, BattleZones, EntityPowers, EntityWeaponProperties};

/// Projectile powers that can hit cover (`bolts`, combat-team-v2-1.js) and the small ones among them (`small`).
const BOLTS: [&str; 14] = ["fire", "ice", "water", "dream", "blood", "void", "custom", "metal", "crystal", "sound", "ember", "venom", "thornBolt", "roots"];
const SMALL: [&str; 5] = ["crystal", "ember", "venom", "thornBolt", "roots"];
/// `harmful` of the combat-12 layers (Phoenix rebirth clears these).
const HARMFUL_V12: [&str; 12] = ["burn", "poison", "bleed", "sleep", "root", "chrono", "slow", "blind", "amnesia", "suppressed", "disarmed", "soul"];
/// `harmful` of the team layers (Cleanse looks for these).
pub const HARMFUL_TEAM: [&str; 16] = ["burn", "poison", "bleed", "sleep", "root", "chrono", "slow", "blind", "amnesia", "suppressed", "disarmed", "soul", "crippled", "brambleSlow", "tauntTime", "kitStun"];

impl Engine {
    /// `patchFactor(this.balance, key)`
    pub fn patch_factor(&self, key: &str) -> f64 {
        self.b.balance.multipliers.get(key).copied().unwrap_or(1.0)
    }

    /// d8 `abilityFactor(f, id, field)`: the role-specific patch, else the general one.
    pub fn ability_factor(&self, f: Ent, id: &str, field: &str) -> f64 {
        let role = &self.f(f).role;
        let key = format!("ability:{id}:{field}");
        self.b.balance.multipliers.get(&format!("role:{role}:{key}")).copied().unwrap_or_else(|| self.patch_factor(&key))
    }

    /// A harmful effect's timer by name.
    pub fn effect_value(&self, f: Ent, key: &str) -> f64 {
        let e = self.f(f);
        match key {
            "burn" => e.burn,
            "poison" => e.poison,
            "bleed" => e.bleed,
            "sleep" => e.sleep,
            "root" => e.root,
            "chrono" => e.chrono,
            "slow" => e.slow,
            "blind" => e.blind,
            "amnesia" => e.amnesia,
            "suppressed" => e.suppressed,
            "disarmed" => e.disarmed,
            "soul" => e.soul,
            "crippled" => e.crippled,
            "brambleSlow" => e.bramble_slow,
            "tauntTime" => e.taunt_time,
            "kitStun" => e.kit_stun,
            other => panic!("unknown effect {other}"),
        }
    }

    /// `duration` chain: d2 (controllers' control lasts longer) → d8 (an ability's duration patch while it resolves)
    /// → d13 (role and target control patches) → d20 (weaknesses).
    pub fn duration(&self, f: Ent, t: Option<&Tgt>, seconds: f64) -> f64 {
        let fe = self.f(f);
        let te = t.map(|t| self.f(t.ent));
        // d20
        let mut result = seconds * if fe.weakness == "short power duration" { 0.45 } else { 1.0 } * if te.is_some_and(|t| t.weakness == "slow recovery") { 1.5 } else { 1.0 };
        // d13
        if let Some(te) = te {
            if te.team != fe.team {
                result = result * self.patch_factor(&format!("role:{}:control", fe.role)) * self.patch_factor("target:control");
            }
        }
        // d8
        if let Some((caster, id)) = &self.tr.balance_cast {
            if *caster == f {
                result *= self.ability_factor(f, id, "duration");
            }
        }
        // d2
        if fe.role == "controller" && te.is_some_and(|t| t.team != fe.team) {
            result *= self.b.controller_rules.duration;
        }
        result
    }

    /// `heal` chain: d8 (an ability's healing patch) → d12 (Cores and the Titan never heal) → d13 (role and target
    /// healing patches) → d16 (overtime halves healing; the healer is credited) → d20 (Death mark, slow recovery).
    pub fn heal(&mut self, f: Ent, amount: f64) -> f64 {
        // d8
        let source = self.tr.heal_source.unwrap_or(f);
        let id: Option<String> = match &self.tr.balance_cast {
            Some((caster, id)) if *caster == source => Some(id.clone()),
            _ => {
                if self.tr.balance_environment {
                    if self.tr.heal_source.is_some() {
                        Some("life".into())
                    } else if self.f(f).wind_remaining > 0.0 {
                        Some("secondWind".into())
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        };
        let mut amount = amount * match &id {
            Some(id) => self.ability_factor(source, id, "healing"),
            None => 1.0,
        };
        // d12
        if self.f(f).is_objective == Some(true) {
            return 0.0;
        }
        // d13
        let role = self.f(source).role.clone();
        amount *= self.patch_factor(&format!("role:{role}:healing")) * self.patch_factor("target:healing");
        // d16
        if self.b.time >= team_rules::OVERTIME {
            amount *= team_rules::OVERTIME_HEALING;
        }
        // d20
        let e = self.fm(f);
        if e.death_mark > 0.0 {
            amount *= 0.25;
        }
        if e.weakness == "slow recovery" {
            amount *= 0.5;
        }
        let gained = min(e.max_hp - e.hp, amount);
        e.hp += gained;
        // d16
        if gained > 0.0 {
            self.fm(source).healing_done += gained;
        }
        gained
    }

    /// `kitControl` chain: d2 (controllers' kits last longer) → d12 (Cores and the Titan are immune) → d13 (control
    /// patches) → d14 (apply a kit's stun, disarm, slow or taunt).
    pub fn kit_control(&mut self, f: Ent, t: Option<Ent>, id: &str, duration: f64) -> bool {
        let fe = self.f(f);
        // d2
        let duration = if fe.role == "controller" { duration * self.b.controller_rules.duration } else { duration };
        // d12
        let Some(t) = t else { return false };
        if self.f(t).is_objective == Some(true) {
            return false;
        }
        // d13
        let role = self.f(f).role.clone();
        let duration = duration * self.patch_factor(&format!("role:{role}:control")) * self.patch_factor("kit:control:output") * self.patch_factor("target:control");
        // d14
        let (fteam, findex) = (self.f(f).team, self.f(f).index);
        let te = self.f(t);
        if te.hp <= 0.0 || te.team == fteam || te.cc_immune > 0.0 || te.sleep > 0.0 || te.root > 0.0 || te.amnesia > 0.0 || te.suppressed > 0.0 || te.taunt_time > 0.0 {
            return false;
        }
        let e = self.fm(t);
        if id == "stunBolt" || id == "knockUp" {
            e.kit_stun = duration;
            e.sleep = duration;
            e.action = None;
            e.was_hard = true;
        }
        if id == "disarmShot" {
            e.disarmed = duration;
            e.action = None;
            e.cc_immune = duration + CC_IMMUNITY;
        }
        if id == "hamstring" {
            e.slow = duration;
            e.cc_immune = duration + CC_IMMUNITY;
        }
        if id == "tauntShout" {
            e.taunt_time = duration;
            e.taunt_source = Some(findex);
            e.target = Some(crate::team::state::NumOrStr::Num(findex));
            e.retarget = 0.0;
        }
        true
    }

    /// `fortified` chain: d6 (tanks a little tougher) → d13 (Fortified, patched, at most 60%).
    pub fn fortified(&self, _f: Ent) -> f64 {
        let base = max(0.0, min(0.6, team_rules::FORTIFIED * self.patch_factor("target:fortified")));
        min(0.6, base * consts::FORTIFIED_BONUS)
    }

    /// `rebirth` chain: d17 (also clears crippling) → d19 (Phoenix rebirth).
    pub fn rebirth(&mut self, f: Ent) -> bool {
        let phoenix = self.b.rules.phoenix_health;
        let e = self.fm(f);
        if e.hp > 0.0 || !e.phoenix_armed || e.phoenix_spent || e.death_mark > 0.0 {
            return false;
        }
        e.phoenix_armed = false;
        e.phoenix_spent = true;
        e.hp = e.max_hp * phoenix * if e.weakness == "slow recovery" { 0.5 } else { 1.0 };
        for key in HARMFUL_V12 {
            *harmful_mut(e, key) = 0.0;
        }
        e.action = None;
        e.crippled = 0.0;
        e.bramble_slow = 0.0;
        true
    }

    /// d20 `zone(f, type, x, y, radius, duration, damage = 0)`
    pub fn zone(&mut self, f: Ent, kind: &str, x: f64, y: f64, radius: f64, duration: f64, damage: f64) {
        let owner = self.f(f).side;
        self.b.zones.push(BattleZones { type_: kind.into(), x, y, radius, life: duration, owner, damage, tick: 0.0, due: None, pull: None, pulse: None, singularity: None });
    }

    /// d20 `emitSound(source, x, y, range)`: fighters weak to loud sounds are staggered and lose their action.
    pub fn emit_sound(&mut self, source: Option<Ent>, x: f64, y: f64, range: f64) {
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
            let fe = self.f(f);
            if Some(f) == source || fe.weakness != "loud sounds" || hypot2(fe.x - x, fe.y - y) > range {
                continue;
            }
            let e = self.fm(f);
            e.stagger = max(e.stagger, 0.65);
            e.cast = max(e.cast, 1.2);
            e.action = None;
            self.warn(f, "sound");
        }
    }

    /// `push` chain: d12 (Cores and the Titan never move) → d16 (knock back, kept on the field).
    /// `(fx, fy)` is where the push comes from (a fighter or a point).
    pub fn push(&mut self, t: Ent, fx: f64, fy: f64, amount: f64) {
        if self.f(t).is_objective == Some(true) {
            return;
        }
        let te = self.f(t);
        let angle = jsmath::atan2(te.y - fy, te.x - fx);
        let nx = self.clamp_x(te.x + jsmath::cos(angle) * amount);
        let ny = self.clamp_y(te.y + jsmath::sin(angle) * amount);
        let e = self.fm(t);
        e.x = nx;
        e.y = ny;
    }

    /// d13 `wideKnockback(t, f, type, x, y)`: a duel-field wall hit at x = 582 still pushes on the wide field.
    pub fn wide_knockback(&mut self, t: Ent, f: Option<Ent>, kind: &str, x: f64, y: f64) {
        let Some(f) = f else { return };
        if kind == "physical" && f != t && self.f(t).x == 582.0 && x >= 567.0 {
            let fe = self.f(f);
            let angle = jsmath::atan2(y - fe.y, x - fe.x);
            let push = min(14.0, 3.0 + fe.damage / 12.0);
            let nx = self.clamp_x(x + jsmath::cos(angle) * push);
            self.fm(t).x = nx;
        }
    }

    /// d15 `pathClear(f, t, angle, radius = 3, speed = 290)`: neither the lead path nor the direct line touches a rock.
    pub fn path_clear(&self, fx: f64, fy: f64, f_tactics: Option<f64>, t: &Tgt, angle: f64, radius: f64, speed: f64) -> bool {
        let (tx, ty) = (self.tx(t), self.ty(t));
        let dd = hypot2(tx - fx, ty - fy);
        let time = dd / speed * (0.45 + 0.5 * f_tactics.unwrap_or(0.5));
        let tvx = self.tvx(t);
        let tvy = self.tvy(t);
        let distance = hypot2(tx + tvx * time - fx, ty + tvy * time - fy);
        let lead = Pt { x: fx + jsmath::cos(angle) * distance, y: fy + jsmath::sin(angle) * distance };
        !self.b.obstacles.iter().any(|o| segment(o.x, o.y, fx, fy, lead.x, lead.y) <= o.radius + radius || segment(o.x, o.y, fx, fy, tx, ty) <= o.radius + radius)
    }

    /// d15 `shotClear(f, t, angle)`: from the portal exit when a portal is open.
    pub fn shot_clear(&mut self, f: Ent, t: &Tgt, angle: f64) -> bool {
        let fe = self.f(f);
        let gate = if fe.portal_time > 0.0 { fe.gates.as_ref().map(|g| (g[1].x, g[1].y)) } else { None };
        let tactics = Some(fe.tactics);
        match gate {
            None => self.path_clear(fe.x, fe.y, tactics, t, angle, 3.0, 290.0),
            Some((gx, gy)) => {
                let a = self.aim(gx, gy, f, t, 290.0);
                self.path_clear(gx, gy, tactics, t, a, 3.0, 290.0)
            }
        }
    }

    /// `projectileClear` chain: d6 (sound waves need a clear path) → d15 (bolts must clear cover; crystal checks
    /// three spreads).
    pub fn projectile_clear(&mut self, f: Ent, t: &Tgt, id: &str) -> bool {
        let (fx, fy, tactics) = (self.f(f).x, self.f(f).y, Some(self.f(f).tactics));
        if id == "sound" {
            let a = self.aim(fx, fy, f, t, 220.0);
            return self.path_clear(fx, fy, tactics, t, a, 7.0, 220.0);
        }
        if !BOLTS.contains(&id) {
            return true;
        }
        let spreads: &[f64] = if id == "crystal" { &[-0.18, 0.0, 0.18] } else { &[0.0] };
        let radius = if SMALL.contains(&id) { 4.0 } else { 7.0 };
        for &spread in spreads {
            let a = self.aim(fx, fy, f, t, 220.0) + spread;
            if !self.path_clear(fx, fy, tactics, t, a, radius, 220.0) {
                return false;
            }
        }
        true
    }

    /// d20 `launch(f, t, p, spread = 0)`: fire a spell projectile.
    pub fn launch(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, spread: f64) {
        let (fx, fy) = (self.f(f).x, self.f(f).y);
        let angle = self.aim(fx, fy, f, t, 220.0) + spread;
        let te = self.f(t.ent);
        let boost = p.id == "ice" && (te.wet > 0.0 || te.weakness == "extreme cold") || p.id == "fire" && te.weakness == "fire";
        let duration = self.duration(f, Some(t), 2.8) * if boost { 1.5 } else { 1.0 };
        let fe = self.f(f);
        let damage = fe.spell * if p.id == "crystal" { 0.5 } else if p.id == "dream" { self.b.rules.dream_damage } else { 1.0 };
        let kind = match p.id.as_str() {
            "ice" | "fire" | "water" | "blood" | "sound" | "void" => p.id.clone(),
            _ => "arcane".into(),
        };
        let tags = EntityWeaponProperties { blunt: None, cold_iron: None, heavy: None, holy: None, loud: None, metal: if p.id == "metal" { Some(true) } else { None }, poison: None, silver: None };
        let proj = BattleProjectiles {
            x: fe.x,
            y: fe.y,
            vx: jsmath::cos(angle) * 220.0,
            vy: jsmath::sin(angle) * 220.0,
            owner: fe.side,
            damage,
            type_: kind,
            sprite: p.sprite,
            life: 3.0,
            radius: if p.id == "crystal" { 4.0 } else { 7.0 },
            payload: Some(p.id.clone()),
            duration: Some(duration),
            tags: Some(tags),
            balance_ability: None,
            molten: None,
            ordinary_arcane: None,
            technique: None,
            weapon_hit: None,
        };
        self.b.projectiles.push(proj);
    }

    /// d10 `supportLine(f, t)`: support abilities need a clear shot.
    pub fn support_line(&self, f: Ent, t: Ent) -> bool {
        let (fe, te) = (self.f(f), self.f(t));
        self.clear_shot(fe.x, fe.y, te.x, te.y)
    }

    /// d10 `supportControl(f, t, id, duration)`
    pub fn support_control(&mut self, f: Ent, t: Option<Ent>, id: &str, duration: f64) -> bool {
        let Some(tt) = t else { return false };
        let te = self.f(tt);
        if te.is_objective == Some(true) || te.hp <= 0.0 || te.cc_immune > 0.0 {
            return false;
        }
        let duration = duration * self.b.balance.multipliers.get("ability:control:output").copied().unwrap_or(1.0);
        assert_eq!(self.b.mode, "team", "only team battles are ported");
        self.kit_control(f, t, id, duration)
    }

    /// d16 `supportChoice(f, p)`: the ally an old-style support spell helps most.
    pub fn support_choice(&self, f: Ent, p: &EntityPowers) -> Option<(Ent, f64)> {
        let fe = self.f(f);
        let weak = fe.weakness.as_str();
        if fe.mana < self.power_cost(&p.id, Some(p.cost), &p.rarity)
            || fe.suppressed > 0.0
            || weak == "silenced casting" && p.voice
            || self.b.night && weak == "loses power at night"
            || !self.b.night && weak == "loses power in daylight"
            || weak == "power needs a sacrifice" && fe.hp <= fe.max_hp * 0.03
        {
            return None;
        }
        let mut best: Option<(Ent, f64)> = None;
        for ally in self.allies_of(f, false) {
            let ae = self.f(ally);
            if de(fe, ae) > consts::SUPPORT_RANGE || !self.clear_shot(fe.x, fe.y, ae.x, ae.y) {
                continue;
            }
            let pct = ae.hp / ae.max_hp;
            let tank = if ae.role == "tank" { 4.0 } else { 0.0 };
            let mut value = -1.0;
            if p.id == "healing" && (pct <= 0.7 || [ae.burn, ae.poison, ae.bleed].iter().any(|&k| k > 0.5)) {
                value = 100.0 + (1.0 - pct) * 30.0 + tank;
            }
            if p.id == "regeneration" && pct <= 0.85 && ae.regeneration <= 0.5 {
                value = 74.0 + (1.0 - pct) * 10.0 + tank;
            }
            if p.id == "force" && ae.ward_time <= 0.5 && self.under_fire(ally, Kind::Any) {
                value = 72.0 + tank;
            }
            if p.id == "spiritArmor" && ae.spirit_armor <= 0.5 && self.under_fire(ally, Kind::Physical) {
                value = 72.0 + tank;
            }
            if value > best.map(|b| b.1).unwrap_or(-1.0) {
                best = Some((ally, value));
            }
        }
        best
    }

    /// d10 `supportTargets(f, p, t, committed = false)`: who a support ability would reach right now.
    pub fn support_targets(&mut self, f: Ent, p: &EntityPowers, t: Option<&Tgt>, committed: bool) -> Vec<Ent> {
        let fe = self.f(f);
        let allies: Vec<Ent> = self.support_allies(f, false).into_iter().filter(|&a| de(fe, self.f(a)) <= 240.0 && self.support_line(f, a)).collect();
        let mut hurt: Vec<Ent> = allies.iter().copied().filter(|&a| self.f(a).hp < self.f(a).max_hp * 0.8).collect();
        hurt.sort_by(|&a, &b| {
            let (ea, eb) = (self.f(a), self.f(b));
            let v = ea.hp / ea.max_hp - eb.hp / eb.max_hp;
            js_cmp(if truthy(v) { v } else { ea.side - eb.side })
        });
        let is_t = |a: Ent| t.is_some_and(|t| t.is_plain() && t.ent == a);
        match p.id.as_str() {
            "resurrection" => {
                if fe.support_revive_spent == Some(true) {
                    return vec![];
                }
                return self
                    .support_allies(f, true)
                    .into_iter()
                    .filter(|&a| a != f && self.f(a).support_revived != Some(true) && de(fe, self.f(a)) <= 240.0 && self.support_line(f, a) && (!committed || is_t(a)))
                    .take(1)
                    .collect();
            }
            "cleanse" => {
                let mut list: Vec<Ent> = allies.iter().copied().filter(|&a| HARMFUL_TEAM.iter().any(|k| self.effect_value(a, k) > 0.25) && (!committed || is_t(a))).collect();
                list.sort_by(|&a, &b| js_cmp(self.f(a).hp / self.f(a).max_hp - self.f(b).hp / self.f(b).max_hp));
                list.truncate(1);
                return list;
            }
            "barrier" => {
                let exposed = allies.iter().any(|&a| self.f(a).ward_time <= 0.5 && de(fe, self.f(a)) <= 110.0 && self.under_fire(a, Kind::Any));
                return if exposed { allies.iter().copied().filter(|&a| self.f(a).ward_time <= 0.5 && de(fe, self.f(a)) <= 110.0).collect() } else { vec![] };
            }
            "mendingWave" => return hurt.into_iter().filter(|&a| de(fe, self.f(a)) <= 110.0).collect(),
            "chainHeal" => return hurt.into_iter().filter(|&a| !committed || is_t(a)).take(1).collect(),
            "tauntShout" | "knockUp" => {
                let reach = if p.id == "tauntShout" { 110.0 } else { 85.0 };
                return self.support_enemies(f).into_iter().filter(|&a| self.f(a).cc_immune <= 0.0 && de(fe, self.f(a)) <= reach && self.support_line(f, a)).collect();
            }
            _ => {}
        }
        let Some(t) = t else { return vec![] };
        let te = self.f(t.ent);
        let (tx, ty) = (self.tx(t), self.ty(t));
        let reach = if p.id == "hamstring" { 100.0 } else { 260.0 };
        if self.t_is_objective(t) || self.thp(t) <= 0.0 || te.cc_immune > 0.0 || d(fe.x, fe.y, tx, ty) > reach || !self.clear_shot(fe.x, fe.y, tx, ty) {
            return vec![];
        }
        if p.id == "hamstring" && te.slow > 0.5 || p.id == "disarmShot" && te.disarmed > 0.5 {
            return vec![];
        }
        if p.id == "stunBolt" || p.id == "disarmShot" {
            let (fx, fy, tactics) = (fe.x, fe.y, Some(fe.tactics));
            let a = self.aim(fx, fy, f, t, 260.0);
            if !self.path_clear(fx, fy, tactics, t, a, 4.0, 260.0) {
                return vec![];
            }
        }
        vec![t.ent]
    }

    /// d16 `lifeSpot(f)`: where Life creation helps the most hurt teammates at once.
    pub fn life_spot(&self, f: Ent) -> Option<(Pt, f64)> {
        let hurt: Vec<Ent> = self.allies_of(f, true).into_iter().filter(|&a| self.f(a).hp < self.f(a).max_hp * 0.85).collect();
        if hurt.is_empty() {
            return None;
        }
        let mut best: Option<Ent> = None;
        let mut count = 0usize;
        for &a in &hurt {
            let n = hurt.iter().filter(|&&b| de(self.f(a), self.f(b)) < 110.0).count();
            if n > count {
                count = n;
                best = Some(a);
            }
        }
        if count >= 2 {
            let b = best.unwrap();
            let near: Vec<Ent> = hurt.iter().copied().filter(|&x| de(self.f(b), self.f(x)) < 110.0).collect();
            Some((self.centroid(&near), count as f64))
        } else {
            None
        }
    }
}

/// The timer field of a harmful effect (for clearing it).
fn harmful_mut<'a>(e: &'a mut crate::team::state::Entity, key: &str) -> &'a mut f64 {
    match key {
        "burn" => &mut e.burn,
        "poison" => &mut e.poison,
        "bleed" => &mut e.bleed,
        "sleep" => &mut e.sleep,
        "root" => &mut e.root,
        "chrono" => &mut e.chrono,
        "slow" => &mut e.slow,
        "blind" => &mut e.blind,
        "amnesia" => &mut e.amnesia,
        "suppressed" => &mut e.suppressed,
        "disarmed" => &mut e.disarmed,
        "soul" => &mut e.soul,
        "crippled" => &mut e.crippled,
        "brambleSlow" => &mut e.bramble_slow,
        "tauntTime" => &mut e.taunt_time,
        "kitStun" => &mut e.kit_stun,
        other => panic!("unknown effect {other}"),
    }
}

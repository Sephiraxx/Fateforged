//! Powers: which one a fighter picks (`powerUtility`, `powerPriority`, `copyChoice`), casting it (`castPower`) and
//! what it does (`usePower`). Depth in the team-4.0 prototype chain in each doc line.
//!
//! - `powerUtility`: d19 → d12 (rolled support abilities) → d8 → d7 (cover) → d6 (line of sight, mobility, ally
//!   support) → d5 (techniques, nature spells) → d4 (every other power).
//! - `castPower`: d20 (a healer's mana refund) → d14 → d13 (cooldown patches) → d8 (team kits: none in team-4.0) →
//!   d5 (the cast itself).
//! - `usePower`: d14 (a patched ability's context) → d12 (support abilities) → d10 (objectives stay put) → d7
//!   (cover; refunds if the shot is held) → d6 (ally support, Life, wide-field fixes, Reality) → d5 (techniques,
//!   nature spells) → d4 (copy, teleport, casts, rewind) → d3 (the combat-12 powers) → d2 (the rest).
//!
//! A fighter who cannot harm the innocent holds powers that would hit a neutral wisp (`powerUnsafe`, `innocentRisk`
//! in wisps.rs); only classic teamfight battles have wisps.
use super::combat::{weapon_tags, Tags};
use super::consts::MOBILITY;
use super::effects::HARMFUL_V12;
use super::queries::js_index;
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::{clamp, segment_distance};
use crate::team::jsnum::{Ent, JsMap};
use crate::team::state::{
    BattleLightningPulses, BattleObstacles, BattleSummons, EntityAction, EntityActionOrigin, EntityAnchor, EntityCastPayload, EntityDecoy, EntityGates, EntityPowers, EntityTeleportPlan,
};
use std::f64::consts::PI;

/// `SUPPORT_ABILITIES` ids (abilities-v13.js): the rolled support abilities.
const SUPPORT: [&str; 10] = ["mendingWave", "chainHeal", "resurrection", "cleanse", "barrier", "stunBolt", "hamstring", "disarmShot", "tauntShout", "knockUp"];
/// `SELF_POWERS` (combat-team-v2.js): powers that need no line of sight to the target.
const SELF_POWERS: [&str; 25] = [
    "teleport", "shadow", "illusion", "invisible", "flight", "portal", "regeneration", "absorption", "force", "spiritArmor", "healing", "size", "mind", "future", "life", "mirror", "phoenix", "rewind", "crystal", "guard", "parry", "secondWind", "lastStand", "perfectCounter", "shapeshift",
];
/// `ALLY_SUPPORT` (combat-team-v2.js)
const ALLY_SUPPORT: [&str; 4] = ["healing", "regeneration", "force", "spiritArmor"];
/// `nature` (combat-v12.js)
const NATURE: [&str; 4] = ["thornBolt", "roots", "bramble", "seedburst"];
/// `strikes` (combat-v12.js)
const STRIKES: [&str; 5] = ["drivingStrike", "charge", "cleave", "aimedShot", "cripplingStrike"];
/// `NEW_IDS` (combat-v12-powers.js)
const NEW_IDS: [&str; 10] = ["ember", "frostTouch", "kinetic", "venom", "silence", "mirror", "chainLightning", "phoenix", "rewind", "singularity"];
const REWIND_HEALTH_RECOVERY: f64 = 0.6;
const REWIND_MANA_RECOVERY: f64 = 0.75;

/// `CURRENT_CLASS_ABILITIES.compatible(p, weapon)` for a catalog weapon of type `kind`.
fn compatible(id: &str, kind: &str) -> bool {
    match id {
        "drivingStrike" | "charge" | "parry" | "cleave" => kind == "melee",
        "aimedShot" => kind == "ranged",
        "cripplingStrike" | "perfectCounter" => kind != "arcane",
        _ => true,
    }
}

/// `map[key] = v` on an object used as a map (a new key goes last).
fn js_set(map: &mut JsMap<f64>, key: &str, v: f64) {
    match map.0.iter_mut().find(|(k, _)| k == key) {
        Some((_, slot)) => *slot = v,
        None => map.0.push((key.to_string(), v)),
    }
}

/// `copyChoice(f, t)`'s result: a power to copy (and its priority), or the target's weapon strike.
#[derive(Clone, Debug)]
pub struct CopyChoice {
    pub power: Option<EntityPowers>,
    pub priority: f64,
    pub weapon: bool,
}

impl CopyChoice {
    fn payload(&self) -> EntityCastPayload {
        EntityCastPayload { power: self.power.clone(), priority: self.priority, weapon: self.weapon.then_some(true) }
    }
    fn of(p: &EntityCastPayload) -> CopyChoice {
        CopyChoice { power: p.power.clone(), priority: p.priority, weapon: p.weapon == Some(true) }
    }
}

impl Engine {
    fn weak_blocks(&self, f: Ent, p: &EntityPowers) -> bool {
        let fe = self.f(f);
        let weak = fe.weakness.as_str();
        weak == "silenced casting" && p.voice || self.b.night && weak == "loses power at night" || !self.b.night && weak == "loses power in daylight" || weak == "power needs a sacrifice" && fe.hp <= fe.max_hp * 0.03
    }

    /// d4 `powerPriority(f, t, p)`: utility, less a penalty for repeating the last cast.
    pub fn power_priority(&mut self, f: Ent, t: &Tgt, p: &EntityPowers) -> f64 {
        let utility = self.power_utility(f, t, p, false);
        if utility < 0.0 {
            return -1.0;
        }
        utility - if self.b.rules.alternation && self.f(f).last_cast_id.as_deref() == Some(p.id.as_str()) { 30.0 } else { 0.0 }
    }

    /// `powerUtility(f, t, p, copied = false)` from the top (d19): how much `f` wants to use `p` on `t` now (−1:
    /// not at all).
    pub fn power_utility(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> f64 {
        if !self.classic && MOBILITY.contains(&p.id.as_str()) && t.is_plain() && self.b.cores.contains(&t.ent) {
            return -1.0;
        }
        if SUPPORT.contains(&p.id.as_str()) {
            return self.support_utility(f, t, p, copied);
        }
        // d8
        if self.f(f).disarmed > 0.0 && p.kind == "technique" {
            return -1.0;
        }
        // d7
        if !self.projectile_clear(f, t, &p.id) {
            return -1.0;
        }
        if p.kind == "technique" && self.f(f).weapon.type_ == "ranged" {
            let (fx, fy) = (self.f(f).x, self.f(f).y);
            let angle = self.aim(fx, fy, f, t, 290.0);
            if !self.shot_clear(f, t, angle) {
                return -1.0;
            }
        }
        // d6
        if !SELF_POWERS.contains(&p.id.as_str()) && !self.clear_shot(self.f(f).x, self.f(f).y, self.tx(t), self.ty(t)) {
            return -1.0;
        }
        if MOBILITY.contains(&p.id.as_str()) && !copied {
            let own = self.power_utility_d5(f, t, p, copied);
            let fe = self.f(f);
            let boost = if fe.diving == Some(true) {
                hypot2(fe.x - self.tx(t), fe.y - self.ty(t)) > 90.0
            } else {
                self.is_skirmisher(&Tgt::of(f)) && fe.hp < fe.max_hp * 0.45 && self.threatened(f)
            };
            return if own >= 0.0 && boost { own + 25.0 } else { own };
        }
        if copied || !(ALLY_SUPPORT.contains(&p.id.as_str()) || p.id == "life") {
            return self.power_utility_d5(f, t, p, copied);
        }
        let own = self.power_utility_d5(f, t, p, copied);
        if p.id == "life" {
            let spot = if self.f(f).suppressed > 0.0 { None } else { self.life_spot(f) };
            let index = self.f(f).index;
            let cost = self.power_cost(&p.id, Some(p.cost), &p.rarity);
            return match spot {
                Some((_, count)) if self.f(f).mana >= cost && !self.b.zones.iter().any(|z| z.owner == index && z.type_ == "life" && z.life > 0.5) => max(own, 70.0 + count * 4.0),
                _ => own,
            };
        }
        if let Some((ally, value)) = self.support_choice(f, p) {
            if value > own {
                let index = self.f(ally).index;
                self.fm(f).support_target = Some(index);
                return value;
            }
        }
        self.fm(f).support_target = None;
        own
    }

    /// d12: a rolled support ability's utility.
    fn support_utility(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> f64 {
        let fe = self.f(f);
        if !copied && self.b.time - fe.power_used.get(&p.id).copied().unwrap_or(f64::NEG_INFINITY) < p.cooldown.unwrap_or(f64::NAN) {
            return -1.0;
        }
        if p.kind == "technique" {
            if copied || fe.energy < p.cost + 12.0 || !compatible(&p.id, &fe.weapon.type_) || ["hamstring", "disarmShot", "knockUp"].contains(&p.id.as_str()) && fe.disarmed > 0.0 {
                return -1.0;
            }
        } else if fe.mana < if copied { 9.0 } else { p.cost } || fe.suppressed > 0.0 || self.weak_blocks(f, p) {
            return -1.0;
        }
        if p.group.as_deref() == Some("control") && self.power_unsafe(f, t, p) {
            return -1.0;
        }
        let targets = self.support_targets(f, p, Some(t), false);
        if targets.is_empty() {
            return -1.0;
        }
        match p.id.as_str() {
            "resurrection" => 95.0,
            "cleanse" => 90.0,
            "mendingWave" | "chainHeal" => {
                let hurt = targets.iter().fold(0.0, |n, &a| n + 1.0 - self.f(a).hp / self.f(a).max_hp);
                85.0 + min(15.0, hurt * 10.0)
            }
            _ => {
                if p.group.as_deref() == Some("healing") {
                    75.0
                } else {
                    60.0
                }
            }
        }
    }

    /// d5: techniques and nature spells; everything else goes on to d4.
    fn power_utility_d5(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> f64 {
        let fe = self.f(f);
        if p.kind != "technique" {
            if fe.suppressed > 0.0 || self.power_unsafe(f, t, p) {
                return -1.0;
            }
            if !NATURE.contains(&p.id.as_str()) {
                return self.power_utility_d4(f, t, p, copied);
            }
            if fe.mana < if copied { 9.0 } else { p.cost } || self.weak_blocks(f, p) {
                return -1.0;
            }
            let te = self.f(t.ent);
            if p.id == "roots" && (te.flight > 0.0 || te.root > 0.3) {
                return -1.0;
            }
            if (p.id == "bramble" || p.id == "seedburst") && self.b.zones.iter().any(|z| z.owner == fe.side && z.type_ == p.id && z.life > 0.3) {
                return -1.0;
            }
            return 50.0;
        }
        if copied || fe.energy < p.cost + if p.id == "lastStand" { 0.0 } else { 12.0 } || self.power_unsafe(f, t, p) {
            return -1.0;
        }
        let (tx, ty) = (self.tx(t), self.ty(t));
        let d = hypot2(fe.x - tx, fe.y - ty);
        let melee = fe.weapon.type_ == "melee";
        let physical_weapon = fe.weapon.type_ != "arcane";
        let id = p.id.as_str();
        if (STRIKES.contains(&id) || id == "parry" || id == "perfectCounter") && fe.disarmed > 0.0 && weapon_tags(fe).metal {
            return -1.0;
        }
        if STRIKES.contains(&id) && fe.cooldown > 0.0 {
            return -1.0;
        }
        let range = fe.weapon.range;
        match id {
            "guard" => {
                if !fe.guard_ready && self.incoming_threat(f, super::movement::Kind::Physical, None) {
                    70.0
                } else {
                    -1.0
                }
            }
            "parry" => {
                let te = self.f(t.ent);
                let a = self.t_action(t);
                if melee && fe.parry_time <= 0.0 && a.is_some_and(|a| a.type_ == "melee") && d <= te.weapon.range + 25.0 && a.is_some_and(|a| a.elapsed < a.windup) {
                    80.0
                } else {
                    -1.0
                }
            }
            "perfectCounter" => {
                if physical_weapon && !fe.perfect_used && self.incoming_threat(f, super::movement::Kind::Physical, None) {
                    85.0
                } else {
                    -1.0
                }
            }
            "secondWind" => {
                if !fe.second_wind_used && fe.hp < fe.max_hp * 0.45 {
                    100.0
                } else {
                    -1.0
                }
            }
            "lastStand" => {
                if !fe.last_stand_used && fe.hp < fe.max_hp * 0.30 {
                    110.0
                } else {
                    -1.0
                }
            }
            "charge" => {
                let blocked = self.b.obstacles.iter().any(|o| segment_distance(o.x, o.y, fe.x, fe.y, tx, ty) < o.radius + fe.radius);
                if melee && fe.root <= 0.0 && d > range + 16.0 && d <= 110.0 && !blocked {
                    65.0
                } else {
                    -1.0
                }
            }
            "aimedShot" => {
                if fe.weapon.type_ == "ranged" && d <= range + 8.0 {
                    55.0
                } else {
                    -1.0
                }
            }
            "cripplingStrike" => {
                if physical_weapon && self.f(t.ent).crippled <= 0.3 && d <= range + 8.0 {
                    55.0
                } else {
                    -1.0
                }
            }
            _ => {
                if melee && d <= range + 8.0 {
                    55.0
                } else {
                    -1.0
                }
            }
        }
    }

    /// d4: the utility of every other power.
    fn power_utility_d4(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> f64 {
        let (tx, ty) = (self.tx(t), self.ty(t));
        let fe = self.f(f);
        let distance = hypot2(tx - fe.x, ty - fe.y);
        let threat = self.threatened(f);
        let cost = if copied { 9.0 } else { self.power_cost(&p.id, Some(p.cost), &p.rarity) };
        if fe.mana < cost || self.weak_blocks(f, p) {
            return -1.0;
        }
        let id = p.id.as_str();
        if copied && (id == "frostTouch" && distance >= 75.0 || id == "kinetic" && distance >= 90.0) {
            return -1.0;
        }
        if copied && self.power_unsafe(f, t, p) {
            return -1.0;
        }
        let rules = &self.b.rules;
        if id == "copy" && rules.copy_useful {
            return self.copy_choice(f, t).map_or(-1.0, |c| c.priority);
        }
        if id == "teleport" && rules.teleport_useful {
            return if self.teleport_destination(f, t).is_some() { 50.0 } else { -1.0 };
        }
        let reach = match id {
            "memory" if rules.memory_counterplay => Some(220.0),
            "light" | "silence" => Some(220.0),
            "storm" => Some(300.0),
            "chainLightning" => Some(450.0),
            "frostTouch" => Some(75.0),
            "kinetic" => Some(90.0),
            _ => None,
        };
        if reach.is_some_and(|r| distance > r) {
            return -1.0;
        }
        let fe = self.f(f);
        match id {
            "healing" => {
                return if fe.hp <= fe.max_hp * 0.75 || fe.burn > 0.5 || fe.poison > 0.5 || fe.bleed > 0.5 { 100.0 + (1.0 - fe.hp / fe.max_hp) * 20.0 } else { -1.0 };
            }
            "regeneration" => return if fe.hp <= fe.max_hp * 0.85 && fe.regeneration <= 0.5 { 75.0 } else { -1.0 },
            "phoenix" => return if !fe.phoenix_spent && !fe.phoenix_armed { 80.0 } else { -1.0 },
            _ => {}
        }
        if id == "future" && self.b.time - fe.power_used.get("future").copied().unwrap_or(f64::NEG_INFINITY) < 5.0 {
            return -1.0;
        }
        if id == "absorption" && self.b.rules.absorption_useful {
            return if fe.absorption <= 0.5 && self.incoming_threat(f, super::movement::Kind::Magical, None) { 70.0 } else { -1.0 };
        }
        if id == "spiritArmor" && self.b.rules.spirit_armor_useful {
            return if fe.spirit_armor <= 0.5 && self.incoming_threat(f, super::movement::Kind::Physical, None) { 70.0 } else { -1.0 };
        }
        let defense: Option<(f64, Option<f64>)> = match id {
            "force" => Some((fe.ward_time, Some(fe.ward_hits))),
            "future" => Some((fe.future_time, Some(fe.foreseen))),
            "mirror" => Some((fe.mirror_time, Some(fe.mirror_hits))),
            "spiritArmor" => Some((fe.spirit_armor, None)),
            "absorption" => Some((fe.absorption, None)),
            "flight" => Some((fe.flight, None)),
            "invisible" => Some((fe.invisible, None)),
            "illusion" => Some((fe.illusion_time, None)),
            "size" => Some((fe.size_time, None)),
            _ => None,
        };
        if let Some((timer, charges)) = defense {
            return if timer <= 0.5 || charges.is_some_and(|c| c == 0.0) && threat {
                if threat {
                    70.0
                } else {
                    35.0
                }
            } else {
                -1.0
            };
        }
        if id == "mind" {
            let seen = self.f(t.ent).invisible > 0.0
                || self.t_illusion(t) > 0.0
                || if self.b.rules.mind_useful { self.incoming_threat(f, super::movement::Kind::Any, None) } else { self.b.projectiles.iter().any(|x| x.owner != fe.side) };
            return if fe.insight <= 0.5 && seen { 65.0 } else { -1.0 };
        }
        if id == "shapeshift" {
            let near = if fe.weapon.type_ == "melee" { distance <= 90.0 } else { distance <= 60.0 && (fe.roll_cooldown > 0.0 || fe.energy < 18.0) };
            return if fe.shape <= 0.5 && near { 60.0 } else { -1.0 };
        }
        if id == "portal" {
            return if fe.portal_time <= 0.5 { 40.0 } else { -1.0 };
        }
        if id == "life" {
            return if (fe.hp <= fe.max_hp * 0.85 || fe.nutrition < 60.0) && !self.b.zones.iter().any(|z| z.owner == fe.side && z.type_ == "life" && z.life > 0.5) { 70.0 } else { -1.0 };
        }
        if id == "gravity" && self.b.zones.iter().any(|z| z.owner == fe.side && z.type_ == "gravity" && z.life > 0.5 && hypot2(tx - z.x, ty - z.y) < z.radius) {
            return -1.0;
        }
        if id == "beast" || id == "spirits" {
            let kind = if id == "beast" { "beast" } else { "spirit" };
            if self.b.summons.iter().any(|s| s.owner == fe.side && s.type_ == kind && s.life > 0.5) {
                return -1.0;
            }
        }
        if id == "rewind" {
            if let Some(a) = fe.anchor.as_ref() {
                let harmed = HARMFUL_V12.iter().any(|k| self.effect_value(f, k) > 0.5);
                return if max(0.0, a.hp - fe.hp) * REWIND_HEALTH_RECOVERY >= fe.max_hp * 0.08
                    || max(0.0, a.mana - fe.mana) * REWIND_MANA_RECOVERY >= fe.max_mana * 0.20
                    || harmed
                    || threat && hypot2(tx - a.x, ty - a.y) > distance + 50.0
                {
                    95.0
                } else {
                    -1.0
                };
            }
        }
        let te = self.f(t.ent);
        let controlled = match id {
            "time" => Some(te.chrono),
            "memory" => Some(te.amnesia),
            "soul" => Some(te.soul),
            "shadow" => Some(fe.invisible),
            _ => None,
        };
        if controlled.is_some_and(|v| v > 0.5) {
            return -1.0;
        }
        if id == "rewind" {
            45.0
        } else {
            50.0
        }
    }

    /// `copyChoice(f, t)`: d5 (spells only) → d4 (the target power `f` would most like to copy, else its weapon).
    pub fn copy_choice(&mut self, f: Ent, t: &Tgt) -> Option<CopyChoice> {
        // `{...t, powers: spells}`: a copy, never one of the Cores.
        let copy = t.with(|_| {});
        let available: Vec<EntityPowers> = self.f(t.ent).powers.iter().filter(|p| p.kind != "technique" && p.id != "copy").cloned().collect();
        let mut best: Option<CopyChoice> = None;
        let mut score = -1.0;
        for p in &available {
            let value = self.power_utility(f, &copy, p, true);
            if value > score {
                score = value;
                best = Some(CopyChoice { power: Some(p.clone()), priority: value, weapon: false });
            }
        }
        if best.is_some() {
            return best;
        }
        let (fe, te) = (self.f(f), self.f(t.ent));
        if available.is_empty() && hypot2(self.tx(t) - fe.x, self.ty(t) - fe.y) <= te.weapon.range + 16.0 && !self.innocent_risk_with(f, te.weapon.type_ == "melee", te.weapon.range, self.tx(t), self.ty(t)) {
            return Some(CopyChoice { power: None, priority: 50.0, weapon: true });
        }
        None
    }

    /// `castPower(f, t)` from the top (d20).
    pub fn cast_power(&mut self, f: Ent, t: &Tgt) {
        self.healer_spend(f, |s| {
            let count = s.f(f).cast_count;
            s.cast_power_d5(f, t);
            let fe = s.f(f);
            if fe.cast_count != count {
                if let Some(id) = fe.last_cast_id.clone().filter(|id| !id.is_empty() && fe.power_used.get(id).copied() == Some(s.b.time)) {
                    let key = format!("ability:{id}:cooldown");
                    // d13, then d14 on top of it.
                    let patch = s.patch_factor(&key);
                    s.fm(f).cast *= patch;
                    let ability = s.ability_factor(f, &id, "cooldown");
                    s.fm(f).cast *= ability / patch;
                }
            }
        });
    }

    /// d5 `castPower`: pick a power every 0.2 s, then pay for it and use it.
    fn cast_power_d5(&mut self, f: Ent, t: &Tgt) {
        let fe = self.f(f);
        if fe.powers.is_empty() || fe.cast > 0.0 || fe.action.is_some() || fe.roll > 0.0 || fe.stagger > 0.0 || fe.sleep > 0.0 || fe.amnesia > 0.0 {
            return;
        }
        if self.b.time >= fe.next_selection {
            let time = self.b.time;
            {
                let e = self.fm(f);
                e.next_selection = time + 0.20;
                e.selected_power = None;
            }
            let mut best = -1.0;
            let powers = self.f(f).powers.clone();
            for p in &powers {
                let value = self.power_priority(f, t, p);
                if value > best {
                    best = value;
                    self.fm(f).selected_power = Some(p.clone());
                }
            }
        }
        let Some(p) = self.f(f).selected_power.clone() else { return };
        if self.power_priority(f, t, &p) < 0.0 {
            return;
        }
        let choice = if p.id == "copy" { self.copy_choice(f, t) } else { None };
        if p.id == "copy" && choice.is_none() {
            return;
        }
        let effective = choice.as_ref().and_then(|c| c.power.clone()).unwrap_or_else(|| p.clone());
        let landing = if effective.id == "teleport" { self.teleport_destination(f, t) } else { None };
        if effective.id == "teleport" && landing.is_none() {
            return;
        }
        let technique = p.kind == "technique";
        {
            let e = self.fm(f);
            e.selected_power = None;
            e.cast_count += 1.0;
            e.power_index += 1.0;
            if e.weakness == "memory loss" && e.cast_count % 3.0 == 0.0 {
                if technique {
                    e.energy = max(0.0, e.energy - 4.0);
                } else {
                    e.mana = max(0.0, e.mana - 4.0);
                }
                e.cast = 1.5;
                return;
            }
        }
        let time = self.b.time;
        {
            let e = self.fm(f);
            let used = e.ability_use_counts.get(&p.id).copied().unwrap_or(0.0) + 1.0;
            js_set(&mut e.ability_use_counts, &p.id, used);
            if technique {
                e.energy -= p.cost;
            } else {
                e.mana -= p.cost;
            }
            e.cast = if technique { 4.2 } else { (if e.weakness == "power has a cooldown" { 7.0 } else { 4.2 }) / (1.0 + e.magic / 70.0) };
            js_set(&mut e.power_used, &effective.id, time);
            js_set(&mut e.power_used, &p.id, time);
            e.last_cast_id = Some(p.id.clone());
            e.cast_payload = choice.as_ref().map(CopyChoice::payload);
            e.teleport_plan = landing.map(|l| EntityTeleportPlan { x: l.x, y: l.y });
            if !technique && e.weakness == "power needs a sacrifice" {
                e.hp -= e.max_hp * 0.03;
            }
        }
        self.use_power(f, t, &p, false);
        let e = self.fm(f);
        e.cast_payload = None;
        e.teleport_plan = None;
    }

    /// `usePower(f, t, p, copied = false)` from the top (d14). `None` is JavaScript's `undefined`.
    pub fn use_power(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        self.ability_context(f, &p.id, |s| s.use_power_d12(f, t, p, copied))
    }

    /// d12: a rolled support ability starts its channel.
    fn use_power_d12(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        if !SUPPORT.contains(&p.id.as_str()) {
            return self.use_power_d10(f, t, p, copied);
        }
        let targets = self.support_targets(f, p, Some(t), false);
        if targets.is_empty() {
            return Some(false);
        }
        let sides: Vec<f64> = targets.iter().map(|&a| self.f(a).side).collect();
        let e = self.fm(f);
        e.action = Some(EntityAction {
            type_: "supportAbility".into(),
            power: Some(p.clone()),
            targets: Some(sides),
            elapsed: 0.0,
            windup: p.windup.unwrap_or(f64::NAN),
            cost: Some(if copied { 9.0 } else { p.cost }),
            angle: None,
            heavy: None,
            origin: None,
            recovery: None,
            refund_energy: None,
            refund_mana: None,
            released: None,
            target_index: None,
            travel: None,
        });
        if p.group.as_deref() == Some("control") {
            e.invisible = 0.0;
        }
        e.action_label = p.name.clone();
        Some(true)
    }

    /// d10: a power used on a Core or the Titan never moves it or interrupts it.
    fn use_power_d10(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        if self.f(t.ent).is_objective != Some(true) || !t.is_plain() {
            return self.use_power_d7(f, t, p, copied);
        }
        let (x, y) = (self.f(t.ent).x, self.f(t.ent).y);
        let result = self.use_power_d7(f, t, p, copied);
        let e = self.fm(t.ent);
        e.x = x;
        e.y = y;
        e.action = None;
        result
    }

    /// d7: shots need a clear path; an aimed action remembers its target and what to refund if it is held.
    fn use_power_d7(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        if !self.projectile_clear(f, t, &p.id) {
            return Some(false);
        }
        let result = self.use_power_d6(f, t, p, copied);
        let technique = p.kind == "technique";
        let refund_mana = if technique { 0.0 } else { self.power_cost(&p.id, Some(p.cost), &p.rarity) };
        let index = self.f(t.ent).index;
        if let Some(a) = self.fm(f).action.as_mut().filter(|a| a.released != Some(true)) {
            a.target_index = Some(index);
            a.refund_energy = Some(if technique { p.cost } else { 0.0 });
            a.refund_mana = Some(refund_mana);
        }
        result
    }

    /// d6: ally support, Life on the most hurt allies, wide-field placement of Earth/Illusion/Portal, Reality.
    fn use_power_d6(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        let ally = self.f(f).support_target.and_then(|i| js_index(i, self.b.fighters.len())).map(|i| self.b.fighters[i]);
        self.fm(f).support_target = None;
        let id = p.id.as_str();
        if let Some(ally) = ally.filter(|&a| !copied && a != f && self.f(a).hp > 0.0 && ALLY_SUPPORT.contains(&id)) {
            let duration = self.duration(f, None, 4.0);
            let (spell, index) = (self.f(f).spell, self.f(f).index);
            if id == "healing" {
                self.tr.heal_source = Some(f);
                self.heal(ally, spell * 1.15);
                self.tr.heal_source = None;
                let e = self.fm(ally);
                e.burn = 0.0;
                e.poison = 0.0;
                e.bleed = 0.0;
            }
            let e = self.fm(ally);
            if id == "regeneration" {
                e.regeneration = duration;
                e.regen_power = Some(spell);
                e.regen_source = Some(index);
            }
            if id == "force" {
                e.ward_hits = 2.0;
                e.shield = duration;
                e.ward_time = duration;
            }
            if id == "spiritArmor" {
                e.spirit_armor = duration;
            }
            return Some(true);
        }
        if id == "regeneration" {
            let e = self.fm(f);
            e.regen_power = None;
            e.regen_source = None;
        }
        if id == "life" && !copied {
            let (x, y) = match self.life_spot(f) {
                Some((spot, _)) => (spot.x, spot.y),
                None => (self.f(f).x, self.f(f).y),
            };
            let duration = self.duration(f, None, 4.0) + 2.0;
            self.zone(f, "life", x, y, 70.0, duration, 0.0);
            return Some(true);
        }
        if (id == "earth" || id == "illusion" || id == "portal") && !copied {
            let before = self.b.obstacles.len();
            let done = self.use_power_d5(f, t, p, copied);
            let (fx, fy, tx, ty) = (self.f(f).x, self.f(f).y, self.tx(t), self.ty(t));
            if id == "earth" && self.b.obstacles.len() > before {
                let (w, h) = (self.b.width, self.b.height);
                let o = self.b.obstacles.last_mut().unwrap();
                o.x = clamp((fx + tx) / 2.0, 35.0, w - 35.0);
                o.y = clamp((fy + ty) / 2.0, 35.0, h - 35.0);
            }
            if id == "illusion" && self.f(f).decoy.is_some() {
                let x = self.clamp_x(fx + if self.f(f).team != 0.0 { -55.0 } else { 55.0 });
                self.fm(f).decoy.as_mut().unwrap().x = x;
            }
            if id == "portal" && self.f(f).gates.is_some() {
                let angle = self.rng() * PI * 2.0;
                let fangle = self.f(f).angle;
                let g0 = self.clamp_x(fx + jsmath::cos(fangle) * 14.0);
                let g1 = EntityGates { x: self.clamp_x(tx + jsmath::cos(angle) * 75.0), y: self.clamp_y(ty + jsmath::sin(angle) * 75.0) };
                let gates = self.fm(f).gates.as_mut().unwrap();
                gates[0].x = g0;
                gates[1] = g1;
            }
            return done;
        }
        if id == "reality" {
            self.fm(f).invisible = 0.0;
            let (team, index) = (self.f(f).team, self.f(f).index);
            let (tx, ty) = (self.tx(t), self.ty(t));
            for i in 0..self.b.projectiles.len() {
                if self.owner_team(self.b.projectiles[i].owner) == Some(team) {
                    continue;
                }
                let pr = &mut self.b.projectiles[i];
                pr.owner = index;
                let angle = jsmath::atan2(ty - pr.y, tx - pr.x);
                let speed = hypot2(pr.vx, pr.vy);
                pr.vx = jsmath::cos(angle) * speed;
                pr.vy = jsmath::sin(angle) * speed;
            }
            let e = self.fm(t.ent);
            e.ward_hits = 0.0;
            e.shield = 0.0;
            e.spirit_armor = 0.0;
            let amount = self.f(f).spell * 0.3;
            self.hit(f, t, amount, "reality", None, Tags::default());
            return Some(true);
        }
        self.use_power_d5(f, t, p, copied)
    }

    /// d5: weapon techniques and nature spells.
    fn use_power_d5(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        let id = p.id.as_str();
        if p.kind == "technique" {
            if copied {
                return Some(false);
            }
            let sd = |s: &Engine, n: f64| s.duration(f, None, n);
            match id {
                "guard" => {
                    let d = sd(self, 1.2);
                    let e = self.fm(f);
                    e.guard_time = d;
                    e.guard_ready = true;
                }
                "parry" => self.fm(f).parry_time = sd(self, 0.65),
                "perfectCounter" => {
                    let d = sd(self, 0.80);
                    let e = self.fm(f);
                    e.perfect_used = true;
                    e.perfect_time = d;
                }
                "secondWind" => {
                    let d = sd(self, 3.0);
                    let e = self.fm(f);
                    e.second_wind_used = true;
                    e.wind_remaining = d;
                    e.wind_healing = e.max_hp * 0.10 / 3.0;
                }
                "lastStand" => {
                    let d = sd(self, 4.0);
                    let e = self.fm(f);
                    e.last_stand_used = true;
                    e.last_stand_time = d;
                }
                _ => {
                    let shot = self.f(f).weapon.type_ == "ranged";
                    let windup = if id == "charge" { 0.25 } else if shot { 0.35 } else if id == "cleave" { 0.30 } else { 0.20 };
                    let angle = if shot {
                        let (fx, fy) = (self.f(f).x, self.f(f).y);
                        self.aim(fx, fy, f, t, 290.0)
                    } else {
                        self.f(f).angle
                    };
                    let e = self.fm(f);
                    e.action = Some(EntityAction {
                        type_: "technique".into(),
                        power: Some(p.clone()),
                        angle: Some(angle),
                        elapsed: 0.0,
                        windup,
                        recovery: Some(if id == "cleave" { 0.35 } else { 0.19 }),
                        released: Some(false),
                        origin: Some(EntityActionOrigin { x: e.x, y: e.y }),
                        travel: Some(0.0),
                        cost: None,
                        heavy: None,
                        refund_energy: None,
                        refund_mana: None,
                        target_index: None,
                        targets: None,
                    });
                    e.cooldown = e.interval + windup;
                    e.invisible = 0.0;
                    return Some(true);
                }
            }
            self.fm(f).action = Some(EntityAction {
                type_: "technique".into(),
                power: Some(p.clone()),
                elapsed: 0.0,
                windup: 0.0,
                recovery: Some(0.10),
                released: Some(true),
                angle: None,
                origin: None,
                travel: None,
                cost: None,
                heavy: None,
                refund_energy: None,
                refund_mana: None,
                target_index: None,
                targets: None,
            });
            return Some(true);
        }
        if !NATURE.contains(&id) {
            let rewind = id == "rewind" && self.f(f).anchor.is_some();
            let result = self.use_power_d4(f, t, p, copied);
            if id == "flight" {
                self.fm(f).root = 0.0;
            }
            if rewind {
                let e = self.fm(f);
                e.crippled = 0.0;
                e.bramble_slow = 0.0;
            }
            return result;
        }
        if self.power_unsafe(f, t, p) {
            return Some(false);
        }
        self.fm(f).invisible = 0.0;
        let spell = self.f(f).spell;
        let (tx, ty) = (self.tx(t), self.ty(t));
        if id == "thornBolt" || id == "roots" {
            self.launch(f, t, p, 0.0);
            let duration = self.duration(f, Some(t), if id == "thornBolt" { 1.5 } else { 1.2 });
            let bolt = self.b.projectiles.last_mut().unwrap();
            bolt.type_ = "arcane".into();
            bolt.damage = spell * if id == "thornBolt" { 0.35 } else { 0.25 };
            bolt.payload = Some(id.to_string());
            bolt.duration = Some(duration);
            bolt.radius = 4.0;
        }
        if id == "bramble" {
            let duration = self.duration(f, Some(t), 3.0);
            self.zone(f, "bramble", tx, ty, 45.0, duration, spell * 0.08);
        }
        if id == "seedburst" {
            self.zone(f, "seedburst", tx, ty, 40.0, 0.70, spell * 0.8);
            let due = self.b.time + 0.70;
            self.b.zones.last_mut().unwrap().due = Some(due);
        }
        Some(true)
    }

    /// d4: Copy, Teleport, Size, Mind, Metal, the cast spells (Light, Silence, Storm, Memory), Future, Phoenix and
    /// Rewind back to an anchor.
    fn use_power_d4(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        let id = p.id.as_str();
        let rules = self.b.rules.clone();
        if id == "copy" && rules.copy_useful {
            let choice = match self.f(f).cast_payload.as_ref() {
                Some(c) => Some(CopyChoice::of(c)),
                None => self.copy_choice(f, t),
            };
            let Some(choice) = choice else { return Some(false) };
            if choice.weapon {
                let te = self.f(t.ent);
                let (amount, tags) = (te.damage * 0.85, weapon_tags(te));
                self.hit(f, t, amount, "physical", None, tags);
                return Some(true);
            }
            let power = choice.power.expect("a copied power");
            return self.use_power(f, t, &power, true);
        }
        if id == "teleport" && rules.teleport_useful {
            let landing = match self.f(f).teleport_plan.as_ref() {
                Some(l) => Some((l.x, l.y)),
                None => self.teleport_destination(f, t).map(|l| (l.x, l.y)),
            };
            let Some((x, y)) = landing else { return Some(false) };
            let e = self.fm(f);
            e.x = x;
            e.y = y;
            e.evade = 0.5;
            if rules.teleport_fast {
                e.cast *= 0.5;
            }
            return Some(true);
        }
        if id == "size" && rules.size_buff {
            let d = self.duration(f, None, 8.0);
            let e = self.fm(f);
            e.size_small = e.weapon.type_ != "melee";
            e.size_time = d;
            return Some(true);
        }
        if id == "mind" {
            self.use_power_d3(f, t, p, copied);
            if rules.mind_buff {
                self.fm(f).mind_time = self.duration(f, None, 4.0);
            }
            return Some(true);
        }
        if id == "metal" && rules.metal_impact {
            if self.power_unsafe(f, t, p) {
                return Some(false);
            }
            self.fm(f).invisible = 0.0;
            self.launch(f, t, p, 0.0);
            let d = self.duration(f, Some(t), 3.0);
            self.b.projectiles.last_mut().unwrap().duration = Some(d);
            return Some(true);
        }
        if ["light", "silence", "storm"].contains(&id) || id == "memory" && rules.memory_counterplay {
            let fe = self.f(f);
            if p.voice && fe.weakness == "silenced casting" {
                return None;
            }
            if hypot2(self.tx(t) - fe.x, self.ty(t) - fe.y) > if id == "storm" { 300.0 } else { 220.0 } {
                return None;
            }
            if id != "memory" && self.innocent_risk(f, t) {
                self.warn(f, "innocent-power");
                return None;
            }
            if id != "memory" {
                self.fm(f).invisible = 0.0;
            }
            let (fx, fy) = (self.f(f).x, self.f(f).y);
            let angle = self.aim(fx, fy, f, t, 290.0);
            self.fm(f).action = Some(EntityAction {
                type_: "cast".into(),
                power: Some(p.clone()),
                angle: Some(angle),
                elapsed: 0.0,
                windup: if id == "silence" || id == "memory" { 0.20 } else { 0.25 },
                recovery: Some(0.0),
                released: Some(false),
                cost: None,
                heavy: None,
                origin: None,
                refund_energy: None,
                refund_mana: None,
                target_index: None,
                targets: None,
                travel: None,
            });
            return None;
        }
        if id == "future" {
            let d = self.duration(f, None, 2.5);
            let time = self.b.time;
            let e = self.fm(f);
            e.foreseen = 2.0;
            e.future_time = d;
            e.insight = e.future_time * 0.5;
            js_set(&mut e.power_used, "future", time);
            return None;
        }
        if id == "phoenix" && (self.f(f).phoenix_spent || self.f(f).phoenix_armed) {
            return None;
        }
        let Some(anchor) = self.f(f).anchor.clone().filter(|_| id == "rewind") else {
            return self.use_power_d3(f, t, p, copied);
        };
        let amount = max(0.0, anchor.hp - self.f(f).hp) * REWIND_HEALTH_RECOVERY;
        self.heal(f, amount);
        let e = self.fm(f);
        e.mana += max(0.0, anchor.mana - e.mana) * REWIND_MANA_RECOVERY;
        e.x = anchor.x;
        e.y = anchor.y;
        for key in HARMFUL_V12 {
            *super::effects::harmful_mut(e, key) = 0.0;
        }
        e.anchor = None;
        e.action = None;
        None
    }

    /// d3: the combat-12 powers (Ember, Frost touch, Kinetic, Venom, Mirror, Chain lightning, Phoenix, Rewind,
    /// Singularity).
    fn use_power_d3(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        let id = p.id.as_str();
        if !NEW_IDS.contains(&id) {
            return self.use_power_d2(f, t, p, copied);
        }
        if p.voice && self.f(f).weakness == "silenced casting" {
            return None;
        }
        if ["ember", "frostTouch", "kinetic", "venom", "silence", "chainLightning", "singularity"].contains(&id) {
            if self.f(f).weakness == "cannot harm the innocent" && self.wisps_near_cast(f, t) {
                self.warn(f, "innocent-power");
                return None;
            }
            self.fm(f).invisible = 0.0;
        }
        let (tx, ty) = (self.tx(t), self.ty(t));
        let distance = hypot2(tx - self.f(f).x, ty - self.f(f).y);
        let duration = self.duration(f, Some(t), 3.0);
        let self_duration = self.duration(f, None, 4.0);
        let spell = self.f(f).spell;
        let tt = t.ent;
        match id {
            "ember" => {
                let fire = EntityPowers { id: "fire".into(), ..p.clone() };
                self.launch(f, t, &fire, 0.0);
                let d = self.duration(f, Some(t), 1.2) * if self.f(tt).weakness == "fire" { 1.5 } else { 1.0 };
                let bolt = self.b.projectiles.last_mut().unwrap();
                bolt.damage *= 0.3;
                bolt.payload = Some("ember".into());
                bolt.duration = Some(d);
                bolt.radius = 4.0;
            }
            "frostTouch" => {
                if distance < 75.0 {
                    self.hit(f, t, spell * 0.3, "ice", None, Tags::default());
                    let d = self.duration(f, Some(t), 1.2);
                    let e = self.fm(tt);
                    let v = d * if e.wet > 0.0 || e.weakness == "extreme cold" { 1.5 } else { 1.0 };
                    e.slow = v;
                    e.chrono = v;
                }
            }
            "kinetic" => {
                if distance < 90.0 {
                    self.hit(f, t, spell * 0.25, "psychic", None, Tags::default());
                    let (fx, fy) = (self.f(f).x, self.f(f).y);
                    self.push(tt, fx, fy, 30.0);
                    let e = self.fm(tt);
                    e.action = None;
                    e.stagger = max(e.stagger, 0.15);
                }
            }
            "venom" => {
                self.launch(f, t, p, 0.0);
                let bolt = self.b.projectiles.last_mut().unwrap();
                bolt.type_ = "poison".into();
                bolt.damage = spell * 0.6;
                bolt.radius = 4.0;
            }
            "silence" => {
                self.hit(f, t, spell * 0.4, "void", Some("void".into()), Tags::default());
                self.fm(tt).action = None;
            }
            "mirror" => {
                let e = self.fm(f);
                e.mirror_time = self_duration;
                e.mirror_hits = 3.0;
            }
            "chainLightning" => {
                let (side, time) = (self.f(f).side, self.b.time);
                for i in 0..3 {
                    self.b.lightning_pulses.push(BattleLightningPulses { owner: side, opening: i == 0, due: time + i as f64 * 0.45 });
                }
            }
            "phoenix" => {
                if !self.f(f).phoenix_spent {
                    self.fm(f).phoenix_armed = true;
                }
            }
            "rewind" => {
                let e = self.fm(f);
                if e.anchor.is_none() {
                    e.anchor = Some(EntityAnchor { hp: e.hp, mana: e.mana, x: e.x, y: e.y });
                } else {
                    let anchor = e.anchor.clone().unwrap();
                    let amount = max(0.0, anchor.hp - e.hp);
                    self.heal(f, amount);
                    let e = self.fm(f);
                    e.mana = max(e.mana, anchor.mana);
                    e.x = anchor.x;
                    e.y = anchor.y;
                    for key in HARMFUL_V12 {
                        *super::effects::harmful_mut(e, key) = 0.0;
                    }
                    e.anchor = None;
                    e.action = None;
                }
            }
            "singularity" => {
                let magic = self.f(f).magic;
                self.zone(f, "gravity", tx, ty, 105.0, duration, (12.0 + magic * 1.7) * 0.247);
                let z = self.b.zones.last_mut().unwrap();
                z.singularity = Some(true);
                z.pulse = Some(0.0);
                z.pull = Some(28.0);
            }
            _ => {}
        }
        None
    }

    /// d2: the original powers.
    fn use_power_d2(&mut self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> Option<bool> {
        let id = p.id.as_str();
        const REVEAL: [&str; 15] = ["fire", "ice", "water", "dream", "blood", "void", "custom", "storm", "crystal", "metal", "light", "telekinesis", "sound", "death", "reality"];
        if REVEAL.contains(&id) {
            self.fm(f).invisible = 0.0;
        }
        if p.voice && self.f(f).weakness == "silenced casting" {
            return None;
        }
        if self.f(f).weakness == "cannot harm the innocent" && REVEAL.contains(&id) && self.wisp_on_line(f, self.tx(t), self.ty(t), 18.0) {
            self.fm(f).orbit *= -1.0;
            self.warn(f, "innocent-power");
            return None;
        }
        let duration = self.duration(f, Some(t), 3.0);
        let self_duration = self.duration(f, None, 4.0);
        let (tx, ty) = (self.tx(t), self.ty(t));
        let (fx, fy) = (self.f(f).x, self.f(f).y);
        let distance = hypot2(tx - fx, ty - fy);
        let spell = self.f(f).spell;
        let tt = t.ent;
        match id {
            "fire" | "ice" | "water" | "dream" | "blood" | "void" | "custom" => self.launch(f, t, p, 0.0),
            "storm" => {
                self.hit(f, t, spell * 0.95, "lightning", None, Tags::default());
                let (x, y) = (self.tx(t), self.ty(t));
                self.emit_sound(Some(f), x, y, 260.0);
            }
            "earth" => {
                let x = clamp((fx + tx) / 2.0, 35.0, 565.0);
                let y = clamp((fy + ty) / 2.0, 35.0, 565.0);
                self.b.obstacles.push(BattleObstacles { x, y, radius: 18.0, life: self_duration + 2.0, terrain: None });
                if distance < 110.0 {
                    self.hit(f, t, spell * 0.55, "earth", None, Tags::default());
                    self.push(tt, fx, fy, 35.0);
                }
            }
            "lava" => self.zone(f, "lava", tx, ty, 40.0, duration, spell * 0.2),
            "metal" => {
                if !self.b.rules.metal_impact && weapon_tags(self.f(tt)).metal {
                    let e = self.fm(tt);
                    e.disarmed = duration;
                    e.action = None;
                }
                self.launch(f, t, p, 0.0);
            }
            "crystal" => {
                for angle in [-0.18, 0.0, 0.18] {
                    self.launch(f, t, p, angle);
                }
                let e = self.fm(f);
                e.ward_hits = max(e.ward_hits, 1.0);
                e.ward_time = self_duration;
            }
            "teleport" => {
                let angle = self.rng() * PI * 2.0;
                let d = if self.f(f).weapon.type_ == "melee" { 40.0 } else { 150.0 };
                let e = self.fm(f);
                e.x = clamp(tx + jsmath::cos(angle) * d, 18.0, 582.0);
                e.y = clamp(ty + jsmath::sin(angle) * d, 18.0, 582.0);
                e.evade = 0.5;
            }
            "shadow" => {
                let r = self_duration * if self.b.night { 1.4 } else { 1.0 };
                self.zone(f, "shadow", fx, fy, 75.0, r, 0.0);
            }
            "illusion" => {
                let e = self.fm(f);
                e.illusion_time = self_duration;
                e.decoy = Some(EntityDecoy { x: clamp(e.x + if e.side != 0.0 { -55.0 } else { 55.0 }, 18.0, 582.0), y: clamp(e.y + 45.0, 18.0, 582.0), hp: 1.0 });
            }
            "invisible" => self.fm(f).invisible = self_duration,
            "flight" => {
                let e = self.fm(f);
                e.flight = self_duration;
                e.evade = self_duration;
            }
            "portal" => {
                let angle = self.rng() * PI * 2.0;
                let e = self.fm(f);
                e.gates = Some(vec![
                    EntityGates { x: clamp(e.x + jsmath::cos(e.angle) * 14.0, 18.0, 582.0), y: clamp(e.y + jsmath::sin(e.angle) * 14.0, 18.0, 582.0) },
                    EntityGates { x: clamp(tx + jsmath::cos(angle) * 75.0, 18.0, 582.0), y: clamp(ty + jsmath::sin(angle) * 75.0, 18.0, 582.0) },
                ]);
                e.portal_time = self_duration;
                e.portal_used = false;
            }
            "light" => {
                self.hit(f, t, spell * 0.8, "holy", None, Tags { holy: true, sunlight: true, ..Default::default() });
                let e = self.fm(tt);
                e.invisible = 0.0;
                e.illusion_time = 0.0;
                e.blind = duration;
            }
            "regeneration" => self.fm(f).regeneration = self_duration,
            "absorption" => self.fm(f).absorption = self_duration,
            "shapeshift" => {
                self.fm(f).shape = self_duration;
                self.push(f, tx, ty, -20.0);
                if distance < 80.0 {
                    let damage = self.f(f).damage * 0.8;
                    self.hit(f, t, damage, "physical", None, Tags::default());
                }
            }
            "force" => {
                let e = self.fm(f);
                e.ward_hits = 2.0;
                e.shield = self_duration;
                e.ward_time = self_duration;
            }
            "spiritArmor" => self.fm(f).spirit_armor = self_duration,
            "healing" => {
                self.heal(f, spell * 1.15);
                let e = self.fm(f);
                e.burn = 0.0;
                e.poison = 0.0;
                e.bleed = 0.0;
            }
            "size" => {
                let e = self.fm(f);
                e.size_small = !e.size_small;
                e.size_time = self_duration;
            }
            "mind" => {
                self.fm(f).insight = self_duration;
                self.fm(tt).illusion_time = 0.0;
            }
            "telekinesis" => {
                self.hit(f, t, spell * 0.6, "psychic", None, Tags::default());
                self.push(tt, fx, fy, 65.0);
                let e = self.fm(tt);
                e.action = None;
                e.stagger = 0.25;
            }
            "soul" => {
                let side = self.f(f).side;
                let e = self.fm(tt);
                e.soul = duration;
                e.soul_owner = Some(side);
            }
            "spirits" => {
                let side = self.f(f).side;
                for i in 0..2 {
                    self.b.summons.push(BattleSummons { type_: "spirit".into(), owner: side, x: fx, y: fy, angle: Some(i as f64 * PI), life: self_duration + 1.0, cooldown: i as f64 * 0.4 });
                }
            }
            "future" => {
                let e = self.fm(f);
                e.foreseen = 2.0;
                e.future_time = self_duration;
                e.insight = self_duration * 0.5;
            }
            "memory" => {
                let d = self.duration(f, Some(t), self.b.rules.memory_duration);
                let e = self.fm(tt);
                e.amnesia = d * if e.weakness == "memory loss" { 1.5 } else { 1.0 };
                e.action = None;
                e.insight = 0.0;
            }
            "beast" => {
                let side = self.f(f).side;
                self.b.summons.push(BattleSummons { type_: "beast".into(), owner: side, x: fx, y: fy, angle: None, life: self_duration + 1.0, cooldown: 0.0 });
            }
            "sound" => {
                self.emit_sound(Some(f), fx, fy, 200.0);
                if distance < 130.0 {
                    self.hit(f, t, spell * 0.75, "sound", Some("sound".into()), Tags::default());
                } else {
                    self.launch(f, t, p, 0.0);
                }
            }
            "gravity" => self.zone(f, "gravity", tx, ty, 85.0, duration, 0.0),
            "time" => {
                let e = self.fm(tt);
                e.chrono = duration;
                e.slow = duration;
            }
            "space" => {
                {
                    let e = self.fm(f);
                    e.x = tx;
                    e.y = ty;
                }
                {
                    let e = self.fm(tt);
                    e.x = fx;
                    e.y = fy;
                }
                let side = self.f(f).side;
                let (nx, ny) = (self.f(tt).x, self.f(tt).y);
                for pr in self.b.projectiles.iter_mut().filter(|pr| pr.owner == side) {
                    let angle = jsmath::atan2(ny - pr.y, nx - pr.x);
                    let speed = hypot2(pr.vx, pr.vy);
                    pr.vx = jsmath::cos(angle) * speed;
                    pr.vy = jsmath::sin(angle) * speed;
                }
            }
            "life" => self.zone(f, "life", fx, fy, 65.0, self_duration + 2.0, 0.0),
            "death" => {
                self.fm(tt).death_mark = duration;
                let te = self.f(tt);
                if te.hp / te.max_hp < 0.2 {
                    let amount = te.hp + 1.0;
                    self.hit(f, t, amount, "death", None, Tags::default());
                } else {
                    self.hit(f, t, spell * 0.55, "death", None, Tags::default());
                }
            }
            "copy" => {
                let available: Vec<EntityPowers> = self.f(tt).powers.iter().filter(|x| x.id != "copy").cloned().collect();
                if !available.is_empty() && !copied {
                    let i = (max(0.0, self.f(f).cast_count - 1.0) as usize) % available.len();
                    let ability = available[i].clone();
                    self.use_power(f, t, &ability, true);
                } else {
                    let te = self.f(tt);
                    let (amount, tags) = (te.damage * 0.85, weapon_tags(te));
                    self.hit(f, t, amount, "physical", None, tags);
                }
            }
            "reality" => unreachable!("d6 handles Reality"),
            _ => {}
        }
        None
    }
}

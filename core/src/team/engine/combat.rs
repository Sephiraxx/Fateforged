//! The damage path: `hit`, `periodicHit`, `connectControl`, `applyImpact`, `hurt` and `fighterHit` (depth in the
//! team-4.0 prototype chain in each doc line). For team-4.0 the `hurt` chain runs d20 → d19 → d17 → d16 → d15 →
//! d12 → d11 → d10; d10 sends fighters through `fighterHit`, which calls the duel `hurt` (d5 → d3 → d2) directly
//! (`DuelBattle.prototype.hurt`), so the d9, d8 and d6 versions never run.
use super::consts::team_rules;
use super::movement::truthy;
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::clamp;
use crate::team::jsnum::Ent;
use crate::team::state::{BattleTitanDeaths, BattleTitanHits, EntityWeaponProperties};

/// `ROLE_OUTPUT` (role-output-combat.js)
fn role_output(role: &str) -> Option<f64> {
    match role {
        "tank" => Some(0.5),
        "healer" => Some(0.35),
        "controller" => Some(0.5),
        _ => None,
    }
}
const ROLE_OUTPUT_CONTROLLER: f64 = 0.5;
const ROLE_OUTPUT_HEALER: f64 = 0.35;
/// `OVERTIME_RAMP` (role-output-combat.js)
const OVERTIME_RAMP_START: f64 = 60.0;
const OVERTIME_RAMP_PER_SECOND: f64 = 0.05;

/// Weapon and hit tags (`weaponProperties(name)`, or a hit's own `tags`).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Tags {
    pub metal: bool,
    pub silver: bool,
    pub cold_iron: bool,
    pub poison: bool,
    pub holy: bool,
    pub loud: bool,
    pub blunt: bool,
    pub heavy: bool,
    pub sunlight: bool,
}

impl Tags {
    pub fn of(p: &EntityWeaponProperties) -> Tags {
        let t = |v: Option<bool>| v == Some(true);
        Tags { metal: t(p.metal), silver: t(p.silver), cold_iron: t(p.cold_iron), poison: t(p.poison), holy: t(p.holy), loud: t(p.loud), blunt: t(p.blunt), heavy: t(p.heavy), sunlight: false }
    }
}

/// `this.hitContext` while a hit resolves: a record, or the projectile that hit (same fields).
#[derive(Clone, Debug, Default, PartialEq)]
pub struct HitContext {
    pub payload: Option<String>,
    pub tags: Option<Tags>,
    pub duration: Option<f64>,
    pub periodic: bool,
    pub technique: bool,
    pub weapon_hit: bool,
    pub sprite: Option<f64>,
    pub ordinary_arcane: bool,
    pub balance_ability: Option<String>,
}

impl HitContext {
    /// `this.hitContext = p` for projectile `i`.
    pub fn projectile(p: &crate::team::state::BattleProjectiles) -> HitContext {
        HitContext {
            payload: p.payload.clone(),
            tags: p.tags.as_ref().map(Tags::of),
            duration: p.duration,
            periodic: false,
            technique: p.technique == Some(true),
            weapon_hit: p.weapon_hit == Some(true),
            sprite: Some(p.sprite),
            ordinary_arcane: p.ordinary_arcane == Some(true),
            balance_ability: p.balance_ability.clone(),
        }
    }
    fn periodic() -> HitContext {
        HitContext { periodic: true, ..Default::default() }
    }
}

/// `weaponProperties(t.weapon.name)`: the catalog weapon's properties (Cores carry none: all false).
pub fn weapon_tags(e: &crate::team::state::Entity) -> Tags {
    e.weapon.properties.as_ref().map(Tags::of).unwrap_or_default()
}

impl Engine {
    fn is_decoy(t: &Tgt) -> bool {
        t.over.as_ref().is_some_and(|o| o.decoy)
    }
    fn t_objective(&self, t: &Tgt) -> bool {
        t.over.as_ref().and_then(|o| o.is_objective).unwrap_or(self.f(t.ent).is_objective == Some(true))
    }
    fn is_core(&self, t: &Tgt) -> Option<usize> {
        if !t.is_plain() {
            return None;
        }
        self.b.cores.iter().position(|c| *c == t.ent)
    }
    fn is_titan(&self, t: &Tgt) -> bool {
        t.is_plain() && self.b.titan == t.ent
    }

    /// d2 `hit(f, t, amount, type, payload, tags = {})`
    pub fn hit(&mut self, f: Ent, t: &Tgt, amount: f64, kind: &str, payload: Option<String>, tags: Tags) {
        let duration = self.duration(f, Some(t), 2.8);
        self.tr.hit_context = Some(HitContext { payload, tags: Some(tags), duration: Some(duration), ..Default::default() });
        self.hurt(t, Some(f), amount, kind, false);
        self.tr.hit_context = None;
    }

    /// d4 `periodicHit(f, t, amount, type)`
    pub fn periodic_hit(&mut self, f: Ent, t: &Tgt, amount: f64, kind: &str) -> Option<bool> {
        self.tr.hit_context = Some(HitContext::periodic());
        let hit = self.hurt(t, Some(f), amount, kind, false);
        self.tr.hit_context = None;
        hit
    }

    /// d4 `connectControl(f, t)`: whether a control effect lands (Future sight, wards and a dodge roll stop it).
    pub fn connect_control(&mut self, f: Ent, t: Ent) -> bool {
        if self.f(t).hp <= 0.0 {
            return false;
        }
        if self.f(t).foreseen > 0.0 {
            self.fm(t).foreseen -= 1.0;
            return false;
        }
        if self.f(t).ward_hits > 0.0 {
            let e = self.fm(t);
            e.ward_hits -= 1.0;
            if e.ward_hits == 0.0 {
                e.shield = 0.0;
            }
            return false;
        }
        let (fe, te) = (self.f(f), self.f(t));
        let chance = max(0.35, fe.accuracy - te.dodge - if te.evade > 0.0 { 0.2 } else { 0.0 });
        !(self.rng() > chance)
    }

    /// d14 `abilityContext(f, p, run)`: while a patched ability resolves, its potency scales the caster's spell and
    /// damage, projectiles it fires carry its id, and Regeneration it grants heals by its healing patch.
    pub fn ability_context<R>(&mut self, f: Ent, id: &str, run: impl FnOnce(&mut Engine) -> R) -> R {
        if !self.b.effect_ability_ids.iter().any(|a| a == id) {
            return run(self);
        }
        if self.tr.balance_cast.as_ref().is_some_and(|(bf, bid)| *bf == f && bid == id) {
            return run(self);
        }
        let previous = self.tr.balance_cast.clone();
        let potency = self.ability_factor(f, id, "potency");
        let (spell, damage) = (self.f(f).spell, self.f(f).damage);
        // Projectiles are only ever appended while an ability resolves, so the new ones are the tail.
        let projectiles = if potency != 1.0 { Some(self.b.projectiles.len()) } else { None };
        let regens: Vec<(Ent, f64, Option<f64>)> = if id == "regeneration" {
            self.b.combatants.iter().map(|&a| (a, self.f(a).regeneration, self.f(a).regen_source)).collect()
        } else {
            Vec::new()
        };
        self.tr.balance_cast = Some((f, id.to_string()));
        {
            let e = self.fm(f);
            e.spell *= potency;
            e.damage *= potency;
        }
        let result = run(self);
        {
            let e = self.fm(f);
            e.spell = spell;
            e.damage = damage;
        }
        if let Some(n) = projectiles {
            for p in self.b.projectiles.iter_mut().skip(n) {
                if p.balance_ability.is_none() {
                    p.balance_ability = Some(id.to_string());
                }
            }
        }
        if id == "regeneration" {
            let healing = self.ability_factor(f, id, "healing");
            for (a, time, source) in regens {
                let e = self.fm(a);
                if e.regeneration > time || !same_opt(e.regen_source, source) {
                    e.regen_power = Some(e.regen_power.unwrap_or(spell) * healing);
                }
            }
        }
        self.tr.balance_cast = previous;
        result
    }

    /// `applyImpact(id, f, t, damage, duration)` chain: d14 (a patched ability's context) → d12 (`support:`) → d8
    /// (`kit:`) → d5 → d4 → d3 → d2 (what a spell's payload does to its target).
    pub fn apply_impact(&mut self, id: Option<&str>, f: Ent, t: Ent, damage: f64, duration: f64) -> Option<bool> {
        match self.tr.hit_context.as_ref().and_then(|c| c.balance_ability.clone()) {
            Some(ability) => self.ability_context(f, &ability, |s| s.apply_impact_d12(id, f, t, damage, duration)),
            None => self.apply_impact_d12(id, f, t, damage, duration),
        }
    }

    fn apply_impact_d12(&mut self, id: Option<&str>, f: Ent, t: Ent, damage: f64, duration: f64) -> Option<bool> {
        if let Some(rest) = id.and_then(|i| i.strip_prefix("support:")) {
            return Some(self.support_control(f, Some(t), rest, duration));
        }
        if let Some(rest) = id.and_then(|i| i.strip_prefix("kit:")) {
            return Some(self.kit_control(f, Some(t), rest, duration));
        }
        let spell = self.f(f).spell;
        match id {
            // d5
            Some("thornBolt") => {
                let e = self.fm(t);
                e.bleed = duration;
                e.bleed_damage = spell * 0.04;
            }
            Some("roots") => {
                let e = self.fm(t);
                if e.flight <= 0.0 {
                    e.root = duration;
                    e.roll = 0.0;
                    if e.action.as_ref().and_then(|a| a.power.as_ref()).is_some_and(|p| p.id == "charge") {
                        e.action = None;
                    }
                }
            }
            Some("cripplingStrike") => self.fm(t).crippled = duration,
            // d4
            Some("metal") if self.b.rules.metal_impact => {
                if weapon_tags(self.f(t)).metal {
                    let e = self.fm(t);
                    e.disarmed = duration;
                    e.action = None;
                }
            }
            // d3
            Some("ember") => {
                let e = self.fm(t);
                e.burn = duration;
                e.burn_damage = spell * 0.035;
            }
            Some("venom") => {
                let e = self.fm(t);
                e.poison = duration * if e.weakness == "poison" { 1.5 } else { 1.0 };
                e.poison_damage = spell * 0.16;
            }
            // d2
            Some("fire") => {
                {
                    let e = self.fm(t);
                    e.burn = duration;
                    e.burn_damage = spell * 0.1;
                }
                let (x, y) = (self.f(t).x, self.f(t).y);
                self.zone(f, "fire", x, y, 28.0, duration, spell * 0.08);
            }
            Some("ice") => {
                let e = self.fm(t);
                e.slow = duration;
                e.chrono = e.slow;
            }
            Some("water") => {
                self.fm(t).wet = duration + 2.0;
                let (fx, fy) = (self.f(f).x, self.f(f).y);
                self.push(t, fx, fy, 40.0);
            }
            Some("dream") => {
                let e = self.fm(t);
                e.sleep = duration;
                e.action = None;
            }
            Some("blood") => {
                {
                    let e = self.fm(t);
                    e.bleed = duration;
                    e.bleed_damage = spell * 0.09;
                }
                self.heal(f, damage * 0.3);
            }
            Some("sound") => {
                {
                    let e = self.fm(t);
                    e.stagger = max(e.stagger, 0.3);
                    e.action = None;
                }
                let (x, y) = (self.f(t).x, self.f(t).y);
                self.emit_sound(Some(f), x, y, 80.0);
            }
            Some("void") => {
                let e = self.fm(t);
                let anti = e.weakness == "anti-magic";
                e.mana = max(0.0, e.mana - spell * if anti { 1.2 } else { 0.6 });
                e.suppressed = duration * if anti { 2.0 } else { 1.0 };
            }
            Some("crystal") => {
                let e = self.fm(t);
                e.stagger = max(e.stagger, 0.12);
            }
            _ => {}
        }
        None
    }

    /// The `hurt` chain from the top (d20). `Some(true)` = the hit connected, `Some(false)` = a layer refused it,
    /// `None` = JavaScript's `undefined` (dodged, warded, a decoy, already down).
    pub fn hurt(&mut self, t: &Tgt, f: Option<Ent>, mut amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        // d20: controllers' and healers' output.
        if let Some(fi) = f {
            let fe = self.f(fi);
            if !(t.is_plain() && t.ent == fi) && fe.is_objective != Some(true) && self.f(t.ent).team != fe.team {
                if fe.role == "controller" {
                    let r = &self.b.controller_rules;
                    amount *= (if self.t_objective(t) { r.objective } else { r.damage }) / ROLE_OUTPUT_CONTROLLER;
                }
                if fe.role == "healer" && self.t_objective(t) && self.b.healer_rules.objective != 0.0 && !self.b.healer_rules.objective.is_nan() {
                    amount *= self.b.healer_rules.objective / ROLE_OUTPUT_HEALER;
                }
            }
        }
        // d19: the Titan never hits objectives; Cores take more damage late.
        if f == Some(self.b.titan) && self.t_objective(t) {
            return Some(false);
        }
        if self.is_core(t).is_some() {
            if let (Some(start), Some(per)) = (self.b.objective_rules.core_ramp.get("start").copied(), self.b.objective_rules.core_ramp.get("perSecond").copied()) {
                if self.b.time > start {
                    amount *= 1.0 + (self.b.time - start) * per;
                }
            }
        }
        // d17: when each Core was last hit.
        let core = self.is_core(t);
        let before = self.thp(t);
        let result = self.hurt_d16(t, f, amount, kind, can_dodge);
        if let Some(i) = core {
            if self.f(t.ent).hp < before {
                let at = self.b.core_hit_at.get_or_insert_with(|| vec![f64::NEG_INFINITY, f64::NEG_INFINITY]);
                at[i] = self.b.time;
            }
        }
        result
    }

    fn hurt_d16(&mut self, t: &Tgt, f: Option<Ent>, mut amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        // d16: role output, and the classic overtime ramp.
        if let Some(fi) = f {
            let fe = self.f(fi);
            if !(t.is_plain() && t.ent == fi) && fe.is_objective != Some(true) && self.f(t.ent).team != fe.team {
                amount *= role_output(&fe.role).unwrap_or(1.0);
                if !self.b.objective_mode && self.b.time > OVERTIME_RAMP_START {
                    amount *= 1.0 + (self.b.time - OVERTIME_RAMP_START) * OVERTIME_RAMP_PER_SECOND;
                }
            }
        }
        // d15: the fallen lose Forgefire; a Titan kill hands it to the claiming team's living fighters.
        let kills = self.b.titan_deaths.len();
        let result = self.hurt_d12(t, f, amount, kind, can_dodge);
        self.drop_fallen();
        if let Some(team) = self.b.titan_deaths.get(kills).map(|c| c.team) {
            let until = self.b.forgefire_until[team as usize];
            for i in 0..self.b.combatants.len() {
                let a = self.b.combatants[i];
                let e = self.fm(a);
                if e.team == team && e.hp > 0.0 {
                    e.forgefire_until = Some(until);
                }
            }
        }
        result
    }

    fn hurt_d12(&mut self, t: &Tgt, f: Option<Ent>, mut amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        // d11 (inside d12, which adds the kit stun afterwards): Forgefire's damage, and the Titan's bookkeeping.
        let connected = 'd11: {
            if self.b.done {
                break 'd11 Some(false);
            }
            let fighter = f.filter(|&fi| self.f(fi).team < 2.0 && self.f(fi).is_objective != Some(true));
            let forge = fighter.is_some_and(|fi| self.empowered(fi));
            if forge {
                amount *= self.b.titan_rules.damage;
            }
            if self.is_core(t).is_some() && forge {
                amount *= self.b.titan_rules.core_damage;
            }
            let before = self.thp(t);
            let connected = self.hurt_d10(t, f, amount, kind, can_dodge);
            if let Some(fi) = f.filter(|&fi| self.is_titan(t) && self.f(fi).team < 2.0) {
                if self.f(t.ent).hp < before {
                    self.titan_damaged(t.ent, fi, before);
                }
            }
            connected
        };
        if !Self::is_decoy(t) {
            let e = self.fm(t.ent);
            if e.hp > 0.0 && e.kit_stun > 0.0 {
                e.sleep = max(e.sleep, e.kit_stun);
            }
        }
        connected
    }

    /// d11: the Titan took damage from team `f.team`; on its death that team claims (or steals) Forgefire.
    fn titan_damaged(&mut self, titan: Ent, f: Ent, before: f64) {
        let damage = before - self.f(titan).hp;
        let team = self.f(f).team;
        let time = self.b.time;
        self.b.titan_ever_damaged = true;
        self.b.titan_last_hit = time;
        self.b.titan_damage[team as usize] += damage;
        let index = self.f(f).index;
        self.b.titan_hits.push(BattleTitanHits { index, damage, time });
        if self.f(titan).hp <= 0.0 {
            // No team-4.0 rule set has `claimShare`, so the killing blow always claims.
            let t = team as usize;
            let stolen = self.b.titan_damage[t] < self.b.titan_damage[1 - t];
            self.b.monster_kills[t] += 1.0;
            if stolen {
                self.b.steals[t] += 1.0;
            }
            let e = self.fm(f);
            e.monster_last_hits = Some(e.monster_last_hits.map_or(f64::NAN, |v| v + 1.0));
            self.b.forgefire_until[t] = time + self.b.titan_rules.forgefire;
            self.b.next_shield[t] = time;
            self.b.next_titan = time + self.b.titan_rules.respawn;
            self.b.slam_at = None;
            let damage = self.b.titan_damage.clone();
            self.b.titan_deaths.push(BattleTitanDeaths { time, team, stolen, damage });
        }
    }

    fn hurt_d10(&mut self, t: &Tgt, f: Option<Ent>, amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        if self.b.done {
            return Some(false);
        }
        if self.t_objective(t) {
            let Some(fi) = f else { return Some(false) };
            let te = self.f(t.ent);
            if te.team == self.f(fi).team || te.hp <= 0.0 {
                return Some(false);
            }
            let mut factor = 1.0;
            if self.is_core(t).is_some() {
                if self.guard_count(t.ent) >= 2.0 {
                    let r = &self.b.objective_rules;
                    factor *= 1.0 - r.guarded * if self.empowered(fi) { r.forgefire_guard } else { 1.0 };
                }
                if self.b.sudden_death {
                    factor *= 2.0;
                }
            }
            let dealt = min(self.f(t.ent).hp, max(0.0, amount * factor));
            {
                let e = self.fm(t.ent);
                e.hp -= dealt;
                e.hit_flash = 0.1;
            }
            let fe = self.fm(fi);
            fe.objective_damage = Some(fe.objective_damage.unwrap_or(0.0) + dealt);
            if self.f(t.ent).hp <= 0.0 && self.is_core(t).is_some() {
                let team = self.f(fi).team;
                self.b.done = true;
                self.b.winner_team = Some(team);
                self.b.winner = Some(team);
                self.b.reason = Some("Enemy Core destroyed".into());
            }
            return Some(dealt > 0.0);
        }
        let hit = self.fighter_hit(t, f, amount, kind, can_dodge);
        let delay = self.respawn_delay();
        let time = self.b.time;
        for i in 0..self.b.combatants.len() {
            let a = self.b.combatants[i];
            let e = self.fm(a);
            if e.hp <= 0.0 && !e.downed {
                e.downed = true;
                e.deaths += 1.0;
                e.action = None;
                if e.respawn_at.is_none() {
                    e.respawn_at = Some(time + delay);
                }
            }
        }
        hit
    }

    /// d10 `fighterHit(t, f, amount, type = 'physical', canDodge = true)`: team rules around the duel hit: no
    /// friendly fire, dives, overtime, exposure, the Bulwark guard's share, Forgefire's shield and kill credit.
    pub fn fighter_hit(&mut self, t: &Tgt, f: Option<Ent>, mut amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        let same = |_: &Engine, fi: Ent| t.is_plain() && t.ent == fi;
        if let Some(fi) = f {
            if !same(self, fi) && self.f(fi).team == self.f(t.ent).team {
                return Some(false);
            }
        }
        let decoy = Self::is_decoy(t);
        let enemy = f.filter(|&fi| !decoy && !same(self, fi) && self.f(fi).team != self.f(t.ent).team);
        if let Some(fi) = enemy {
            let tt = t.ent;
            if self.f(fi).diving == Some(true) {
                amount *= self.patch_factor("target:dive");
            }
            if self.b.time >= team_rules::OVERTIME {
                amount *= team_rules::OVERTIME_DAMAGE;
            }
            if self.f(tt).exposed > 0.0 && self.f(fi).role != "controller" {
                amount *= 1.0 + team_rules::EXPOSED_BONUS;
            }
            if self.f(tt).role == "tank" {
                amount *= 1.0 - self.fortified(tt);
            }
            let guard = if self.f(tt).role == "tank" {
                None
            } else {
                let te = self.f(tt);
                self.allies_of(tt, false).into_iter().find(|&a| {
                    let ae = self.f(a);
                    ae.role == "tank" && hypot2(ae.x - te.x, ae.y - te.y) < team_rules::BULWARK_RANGE && ae.sleep <= 0.0
                })
            };
            if let Some(g) = guard.filter(|_| amount > 0.0) {
                let share = amount * team_rules::BULWARK_SHARE * (1.0 - self.fortified(g));
                amount -= amount * team_rules::BULWARK_SHARE;
                let context = std::mem::replace(&mut self.tr.hit_context, Some(HitContext::periodic()));
                let (gx, gy, gh, gd) = (self.f(g).x, self.f(g).y, self.f(g).hp, self.f(fi).damage_done);
                self.duel_hurt(&Tgt::of(g), fi, share, kind, false);
                let dealt = max(0.0, self.f(fi).damage_done - gd);
                self.settle_shield(g, Some(fi), gh, dealt);
                self.wide_knockback(g, Some(fi), kind, gx, gy);
                let e = self.fm(g);
                if e.hp > 0.0 && e.kit_stun > 0.0 {
                    e.sleep = max(e.sleep, e.kit_stun);
                }
                self.tr.hit_context = context;
                self.credit_down(g, fi);
            }
        }
        let before = self.thp(t);
        let (x0, y0) = (self.tx(t), self.ty(t));
        let damage_before = f.map_or(0.0, |fi| self.f(fi).damage_done);
        let fi = f.expect("a fighter is hurt by someone");
        let connected = self.duel_hurt(t, fi, amount, kind, can_dodge);
        if !decoy {
            let tt = t.ent;
            let dealt = if !same(self, fi) { max(0.0, self.f(fi).damage_done - damage_before) } else { max(0.0, before - self.f(tt).hp) };
            self.settle_shield(tt, Some(fi), before, dealt);
            let e = self.fm(tt);
            if e.hp > 0.0 && e.kit_stun > 0.0 {
                e.sleep = max(e.sleep, e.kit_stun);
            }
            self.wide_knockback(tt, Some(fi), kind, x0, y0);
        }
        if let Some(fi) = enemy {
            let tt = t.ent;
            if self.f(tt).hp < before {
                let index = self.f(fi).index;
                let controller = self.f(fi).role == "controller";
                let e = self.fm(tt);
                e.last_attacker = Some(index);
                if controller && kind != "physical" {
                    e.exposed = team_rules::EXPOSED_TIME;
                }
            }
            if before > 0.0 && self.f(tt).hp <= 0.0 {
                self.fm(fi).kills += 1.0;
            }
        }
        connected
    }

    /// The duel `hurt` (`DuelBattle.prototype.hurt`): d5 (parries, counters, guard, last stand) → d3 (Phoenix
    /// rebirth) → d2 (the damage itself).
    pub fn duel_hurt(&mut self, t: &Tgt, f: Ent, amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        let decoy = Self::is_decoy(t);
        let physical = kind == "physical";
        let ordinary = {
            let c = self.tr.hit_context.as_ref();
            !c.is_some_and(|c| c.technique)
                && (c.is_some_and(|c| c.weapon_hit) || c.is_none() && self.f(f).weapon.type_ == "melee" || physical && c.is_some_and(|c| c.sprite == Some(-1.0)))
        };
        let tt = t.ent;
        let front = {
            let (fe, te) = (self.f(f), self.f(tt));
            let (tx, ty) = (self.tx(t), self.ty(t));
            let a = jsmath::atan2(fe.y - ty, fe.x - tx) - te.facing;
            jsmath::atan2(jsmath::sin(a), jsmath::cos(a)).abs() <= std::f64::consts::PI / 2.0
        };
        let te = self.f(tt);
        if self.thp(t) > 0.0
            && !decoy
            && ordinary
            && physical
            && front
            && !(te.disarmed > 0.0 && weapon_tags(te).metal)
            && !truthy(te.foreseen)
            && !truthy(te.ward_hits)
            && (te.perfect_time > 0.0 || te.parry_time > 0.0 && self.f(f).weapon.type_ == "melee")
        {
            let perfect = te.perfect_time > 0.0;
            let counter = self.duration(tt, None, 1.5);
            let e = self.fm(tt);
            e.perfect_time = 0.0;
            e.parry_time = 0.0;
            e.counter_scale = if perfect { 1.35 } else { 0.55 };
            e.counter_time = counter;
            e.cooldown = 0.0;
            return Some(false);
        }
        let guard = te.guard_ready && te.guard_time > 0.0 && physical && !decoy;
        let mult = (if guard { 0.7 } else { 1.0 }) * if te.last_stand_time > 0.0 { 0.65 } else { 1.0 };
        let connected = self.duel_hurt_d2(t, f, amount * mult, kind, can_dodge);
        if !decoy {
            self.rebirth(tt);
        }
        if connected == Some(true) && guard {
            self.fm(tt).guard_ready = false;
        }
        connected
    }

    /// d2 `hurt`: armor, weaknesses, the dodge and critical rolls, absorption, shields, knockback, the payload.
    fn duel_hurt_d2(&mut self, t: &Tgt, f: Ent, amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        let tt = t.ent;
        if Self::is_decoy(t) {
            let e = self.fm(tt);
            e.illusion_time = 0.0;
            if let Some(d) = e.decoy.as_mut() {
                d.hp = 0.0;
            }
            return None;
        }
        if self.f(tt).hp <= 0.0 {
            return None;
        }
        let physical = kind == "physical";
        let context = self.tr.hit_context.clone();
        let tags = context.as_ref().and_then(|c| c.tags).unwrap_or_else(|| if physical { weapon_tags(self.f(f)) } else { Tags::default() });
        let magical = !physical || tags.holy;
        if self.f(tt).foreseen > 0.0 {
            self.fm(tt).foreseen -= 1.0;
            return None;
        }
        if self.f(tt).ward_hits > 0.0 {
            let e = self.fm(tt);
            e.ward_hits -= 1.0;
            if e.ward_hits == 0.0 {
                e.shield = 0.0;
            }
            return None;
        }
        if can_dodge {
            let (fe, te) = (self.f(f), self.f(tt));
            let chance = max(0.35, fe.accuracy - te.dodge - if te.evade > 0.0 { 0.2 } else { 0.0 });
            if self.rng() > chance {
                return None;
            }
        }
        let (fe, te) = (self.f(f), self.f(tt));
        let armor_scale = if magical {
            if context.as_ref().is_some_and(|c| c.ordinary_arcane) {
                self.b.rules.arcane_armor
            } else {
                0.4
            }
        } else {
            1.0
        };
        let mut factor = 1.0 - te.armor * armor_scale;
        if te.shield > 0.0 {
            factor *= 0.5;
        }
        let weak = te.weakness.as_str();
        if tags.silver && weak == "silver"
            || tags.cold_iron && weak == "cold iron"
            || kind == "ice" && weak == "extreme cold"
            || (kind == "fire" || kind == "lava") && weak == "fire"
            || kind == "water" && weak == "water"
            || (kind == "holy" || tags.holy) && weak == "holy magic"
            || (tags.sunlight || kind == "holy") && weak == "sunlight"
            || kind == "poison" && weak == "poison"
        {
            factor *= 1.5;
        }
        if weak == "fragile body" && (tags.blunt || tags.heavy && physical) {
            factor *= 1.25;
        }
        if te.wet > 0.0 && (kind == "lightning" || kind == "ice") {
            factor *= 1.25;
        }
        if te.wet > 0.0 && (kind == "fire" || kind == "lava") {
            factor *= 0.7;
        }
        if te.flight > 0.0 && physical && fe.weapon.type_ == "melee" && fe.weapon.range < 45.0 {
            factor *= 0.4;
        }
        if te.spirit_armor > 0.0 && physical {
            factor *= 0.65;
        }
        let fcrit = fe.crit;
        let crit = if self.rng() < fcrit { 1.5 } else { 1.0 };
        let damage = max(1.0, amount * factor * crit);
        let mut dealt = damage;
        if magical && self.f(tt).absorption > 0.0 {
            let absorbed = damage * 0.55;
            dealt -= absorbed;
            let e = self.fm(tt);
            e.mana = min(e.max_mana, e.mana + absorbed * 0.6);
            self.heal(tt, absorbed * 0.2);
        }
        let tname = self.f(tt).weapon.name.to_lowercase();
        if tname.contains("shield") && f != tt {
            dealt *= 1.0 - if tname.contains("tower shield") { if magical { 0.08 } else { 0.22 } } else if magical { 0.05 } else { 0.15 };
        }
        let fside = self.f(f).side;
        {
            let e = self.fm(tt);
            e.hp = max(0.0, e.hp - dealt);
        }
        if fside != self.f(tt).side {
            self.fm(f).damage_done += dealt;
        }
        {
            let e = self.fm(tt);
            e.sleep = 0.0;
            e.hit_flash = 0.15;
            e.stagger = max(e.stagger, if e.weakness == "fragile body" { 0.2 } else { 0.07 });
        }
        if physical {
            let (fx, fy, fdamage) = (self.f(f).x, self.f(f).y, self.f(f).damage);
            let te = self.f(tt);
            let angle = jsmath::atan2(te.y - fy, te.x - fx);
            let push = min(14.0, 3.0 + fdamage / 12.0);
            let nx = clamp(te.x + jsmath::cos(angle) * push, 18.0, 582.0);
            let ny = clamp(te.y + jsmath::sin(angle) * push, 18.0, 582.0);
            {
                let e = self.fm(tt);
                e.x = nx;
                e.y = ny;
            }
            if tags.poison {
                let poison = self.duration(f, Some(&Tgt::of(tt)), 3.0);
                let e = self.fm(tt);
                e.poison = poison * if e.weakness == "poison" { 1.5 } else { 1.0 };
                e.poison_damage = fdamage * 0.12;
            }
            if tags.cold_iron && self.f(tt).weakness == "cold iron" {
                let e = self.fm(tt);
                e.suppressed = 2.0;
                e.action = None;
            }
        }
        if let Some(payload) = context.as_ref().and_then(|c| c.payload.clone()).filter(|p| !p.is_empty()) {
            let duration = match context.as_ref().and_then(|c| c.duration) {
                Some(d) if d != 0.0 && !d.is_nan() => d,
                _ => self.duration(f, Some(&Tgt::of(tt)), 2.8),
            };
            self.apply_impact(Some(&payload), f, tt, dealt, duration);
        }
        let (te, fe) = (self.f(tt), self.f(f));
        if te.spirit_armor > 0.0 && physical && fe.weapon.type_ == "melee" && hypot2(te.x - fe.x, te.y - fe.y) < 80.0 {
            let rebuke = te.spell * 0.18;
            let e = self.fm(f);
            e.hp = max(0.0, e.hp - rebuke);
            self.fm(tt).damage_done += rebuke;
        }
        Some(true)
    }
}

fn same_opt(a: Option<f64>, b: Option<f64>) -> bool {
    match (a, b) {
        (None, None) => true,
        (Some(x), Some(y)) => x == y,
        _ => false,
    }
}

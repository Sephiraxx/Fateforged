//! One step of the battle: `step` (d10; d22 only swaps in the portable math, which Rust always uses), `upkeep`
//! (d20 → d12 → d8 → d6), `environmentStep` (d6: `step` calls it past the d14 wrapper), `objectiveStep` (d19 → d17
//! → d15 → d11 → d10), `releaseFissure` and `finishAtLimit`.
use super::combat::{HitContext, Tags};
use super::consts::{brain_rules, CC_IMMUNITY};
use super::movement::js_key;
use super::objective::fissure_inside;
use super::queries::{d, de, js_index, Pt};
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::{clamp, segment, segment_distance, tick_timers};
use crate::team::jsnum::Ent;
use crate::team::state::{BattleProjectiles, EntityWeapon, NumOrStr};

/// `tickTechniqueTimers` (combat-team-v2.js)
fn tick_technique_timers(f: &mut crate::team::state::Entity, dt: f64) {
    f.guard_time = max(0.0, f.guard_time - dt);
    f.parry_time = max(0.0, f.parry_time - dt);
    f.perfect_time = max(0.0, f.perfect_time - dt);
    f.counter_time = max(0.0, f.counter_time - dt);
    f.last_stand_time = max(0.0, f.last_stand_time - dt);
    f.crippled = max(0.0, f.crippled - dt);
    f.bramble_slow = max(0.0, f.bramble_slow - dt);
}

/// `tickCombatTimers` (combat-team-v2.js)
pub(super) fn tick_combat_timers(f: &mut crate::team::state::Entity, dt: f64) {
    f.swing = max(0.0, f.swing - dt);
    f.slow = max(0.0, f.slow - dt);
    f.shield = max(0.0, f.shield - dt);
    f.evade = max(0.0, f.evade - dt);
    f.hit_flash = max(0.0, f.hit_flash - dt);
    f.stagger = max(0.0, f.stagger - dt);
}

impl Engine {
    /// `this.fighters[i]` for an index that may be missing.
    pub(super) fn fighter_at(&self, i: Option<f64>) -> Option<Ent> {
        i.and_then(|i| js_index(i, self.b.fighters.len())).map(|i| self.b.fighters[i])
    }

    /// `this.fighters[f.target]?.hp > 0 ? this.fighters[f.target] : this.nearestEnemy(f, point)`
    fn target_or_nearest(&self, f: Ent, point: Option<Pt>) -> Option<Ent> {
        let target = match &self.f(f).target {
            Some(NumOrStr::Num(i)) => self.fighter_at(Some(*i)),
            Some(NumOrStr::Str(s)) => self.fighter_at(s.parse::<f64>().ok()),
            None => None,
        };
        match target.filter(|&t| self.f(t).hp > 0.0) {
            Some(t) => Some(t),
            None => self.nearest_enemy(f, point),
        }
    }

    /// `upkeep(f, dt)` from the top (d20): the d6 per-fighter conditions, d8 kit timers and taunts, then cooldown
    /// rates for controllers and healers.
    pub fn upkeep(&mut self, f: Ent, dt: f64) {
        self.upkeep_d6(f, dt);
        // d8
        {
            let e = self.fm(f);
            e.kit_stun = max(0.0, e.kit_stun - dt);
            if e.kit_stun > 0.0 {
                e.sleep = max(e.sleep, e.kit_stun);
            }
            e.kit_cooldown = max(0.0, e.kit_cooldown - dt);
            if e.taunt_time > 0.0 {
                e.taunt_time = max(0.0, e.taunt_time - dt);
                e.cc_seconds += dt;
                if e.taunt_time <= 0.0 {
                    e.cc_immune = CC_IMMUNITY;
                }
            }
        }
        // d20
        let rate = match self.f(f).role.as_str() {
            "controller" => self.b.controller_rules.cooldown,
            "healer" => self.b.healer_rules.as_ref().map_or(1.0, |r| r.cooldown),
            _ => 1.0,
        };
        if rate != 1.0 {
            let extra = dt * (rate - 1.0);
            let e = self.fm(f);
            e.cast -= extra;
            if e.kit_cooldown > 0.0 {
                e.kit_cooldown = max(0.0, e.kit_cooldown - extra);
            }
        }
        // d23
        self.cast_upkeep(f, dt);
        // d24
        self.level_upkeep(f);
    }

    fn upkeep_d6(&mut self, f: Ent, dt: f64) {
        let env = self.b.environment.clone();
        let (size_buff, mind_buff) = (self.b.rules.size_buff, self.b.rules.mind_buff);
        {
            let e = self.fm(f);
            tick_timers(e, dt);
            e.burn = max(0.0, e.burn - dt);
            e.periodic += dt;
            e.energy = min(e.max_energy, e.energy + dt * if e.weakness == "limited stamina" { 5.0 } else { 11.0 });
            if e.weakness == "needs constant food" {
                e.nutrition = max(0.0, e.nutrition - dt * 2.2);
            }
        }
        self.eat_rations(f);
        {
            let e = self.fm(f);
            if env.weather == "rain" || env.weather == "storm" || env.ground == "water" && e.flight <= 0.0 {
                e.wet = max(e.wet, 0.1);
            }
            let raging = e.weakness == "uncontrollable rage" && e.hp < e.max_hp * 0.45;
            e.raging = Some(raging);
            let base = &e.original;
            let mut mv = base.move_ * (if e.shape > 0.0 { 1.2 } else { 1.0 }) * (if e.chrono > 0.0 { 0.75 } else { 1.0 }) * (if e.winded > 0.0 { 0.55 } else { 1.0 }) * if e.nutrition < 30.0 { 0.7 } else { 1.0 };
            if e.weakness == "water" && e.wet > 0.0 {
                mv *= 0.72;
            }
            if e.weakness == "extreme cold" && env.weather == "frost" {
                mv *= 0.78;
            }
            let damage = base.damage * (if raging { 1.15 } else { 1.0 }) * (if e.shape > 0.0 { 1.15 } else { 1.0 }) * if size_buff && e.size_time > 0.0 && !e.size_small { 1.15 } else { 1.0 };
            let interval = base.interval * if e.chrono > 0.0 { 1.5 } else { 1.0 };
            let accuracy = (base.accuracy + if mind_buff && e.mind_time > 0.0 { 0.08 } else { 0.0 })
                * (if e.blind > 0.0 || e.amnesia > 0.0 { 0.65 } else { 1.0 })
                * if e.weakness == "water" && e.wet > 0.0 { 0.8 } else { 1.0 };
            let dodge = base.dodge + (if mind_buff && e.mind_time > 0.0 { 0.08 } else { 0.0 }) + if e.size_time > 0.0 && e.size_small { 0.15 } else { 0.0 };
            let radius = if e.size_time > 0.0 {
                if e.size_small {
                    7.0
                } else {
                    11.0
                }
            } else {
                9.0
            };
            let w = &base.weapon;
            let weapon = EntityWeapon {
                damage: w.damage,
                interval: w.interval,
                name: w.name.clone(),
                properties: Some(w.properties.clone()),
                range: w.range + if e.size_time > 0.0 && !e.size_small && w.type_ == "melee" { 12.0 } else { 0.0 },
                sprite: w.sprite,
                tags: Some(w.tags.clone()),
                type_: w.type_.clone(),
            };
            e.move_ = mv;
            e.damage = damage;
            e.interval = interval;
            e.accuracy = accuracy;
            e.dodge = dodge;
            e.radius = radius;
            e.weapon = weapon;
        }
        if self.f(f).soul > 0.0 {
            if let Some(owner) = self.fighter_at(self.f(f).soul_owner).filter(|&o| self.f(o).hp > 0.0) {
                let (fe, oe) = (self.f(f), self.f(owner));
                if de(fe, oe) > 85.0 {
                    let angle = jsmath::atan2(oe.y - fe.y, oe.x - fe.x);
                    let (x, y) = (self.clamp_x(fe.x + jsmath::cos(angle) * dt * 15.0), self.clamp_y(fe.y + jsmath::sin(angle) * dt * 15.0));
                    let e = self.fm(f);
                    e.move_ *= 0.65;
                    e.x = x;
                    e.y = y;
                }
                let e = self.fm(f);
                let mana = min(e.mana, dt * 4.0);
                e.mana -= mana;
                let o = self.fm(owner);
                o.mana = min(o.max_mana, o.mana + mana);
            }
        }
        if self.f(f).periodic >= 0.5 {
            let period = self.f(f).periodic;
            self.fm(f).periodic = 0.0;
            let enemy = self.fighter_at(self.f(f).last_attacker).or_else(|| self.nearest_enemy(f, None)).unwrap_or(f);
            let ft = Tgt::of(f);
            if self.f(f).burn > 0.0 {
                let bd = self.f(f).burn_damage;
                let per = if bd != 0.0 && !bd.is_nan() { bd } else { self.f(enemy).spell * 0.065 };
                self.periodic_hit(enemy, &ft, per * period, "fire");
            }
            if self.f(f).poison > 0.0 {
                let amount = self.f(f).poison_damage * period;
                self.periodic_hit(enemy, &ft, amount, "poison");
            }
            if self.f(f).bleed > 0.0 {
                let amount = self.f(f).bleed_damage * period;
                self.periodic_hit(enemy, &ft, amount, "blood");
            }
            if self.f(f).regeneration > 0.0 {
                self.tr.heal_source = Some(self.fighter_at(self.f(f).regen_source).unwrap_or(f));
                let amount = self.f(f).regen_power.unwrap_or(self.f(f).spell) * 0.2 * period;
                self.heal(f, amount);
                self.tr.heal_source = None;
            }
            let mut environmental = 0.0;
            let (weak, max_hp) = (self.f(f).weakness.clone(), self.f(f).max_hp);
            if weak == "extreme cold" && env.weather == "frost" {
                environmental += max_hp * 0.0015 * period;
                self.warn(f, "cold");
            }
            if weak == "sunlight" && !self.b.night && env.weather == "clear" {
                environmental += max_hp * 0.0015 * period * if env.time == "day" { 1.0 } else { 0.5 };
                self.warn(f, "sunlight");
            }
            let relic = self.b.relic.clone();
            if weak == "a cursed relic" && relic.active && hypot2(self.f(f).x - relic.x, self.f(f).y - relic.y) < relic.radius {
                environmental += max_hp * 0.003 * period;
                let e = self.fm(f);
                e.mana = max(0.0, e.mana - period * 5.0);
                self.warn(f, "relic");
            }
            let e = self.fm(f);
            e.hp = max(0.0, e.hp - environmental);
        }
    }

    /// d6 `environmentStep(dt)`: technique timers, nature zones, mirrors, chain lightning, singularities, thunder,
    /// earth walls, zones, summons, and projectiles stopped by illusions or rocks.
    pub fn environment_step(&mut self, dt: f64) {
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
            let e = self.fm(f);
            tick_technique_timers(e, dt);
            if e.guard_time <= 0.0 {
                e.guard_ready = false;
            }
            if e.wind_remaining > 0.0 {
                let period = min(dt, e.wind_remaining);
                let amount = e.wind_healing * period;
                self.heal(f, amount);
                self.fm(f).wind_remaining -= period;
            }
        }
        for zi in 0..self.b.zones.len() {
            let Some(f) = self.fighter_at(Some(self.b.zones[zi].owner)).filter(|&f| self.f(f).hp > 0.0) else { continue };
            for t in self.enemies_of(f) {
                let z = self.b.zones[zi].clone();
                let te = self.f(t);
                let near = d(z.x, z.y, te.x, te.y) < z.radius;
                if z.type_ == "seedburst" && z.due.is_some_and(|due| self.b.time + dt >= due) && near {
                    self.periodic_hit(f, &Tgt::of(t), z.damage, "arcane");
                }
                let te = self.f(t);
                let near = d(z.x, z.y, te.x, te.y) < z.radius;
                if z.type_ == "bramble" && near && te.flight <= 0.0 {
                    let e = self.fm(t);
                    e.bramble_slow = max(e.bramble_slow, 0.10);
                }
                let te = self.f(t);
                if z.type_ == "bramble" && z.tick + dt >= 0.5 && d(z.x, z.y, te.x, te.y) < z.radius {
                    self.periodic_hit(f, &Tgt::of(t), z.damage * 0.5, "arcane");
                }
            }
            let z = &mut self.b.zones[zi];
            if z.type_ == "seedburst" && z.due.is_some_and(|due| self.b.time + dt >= due) {
                z.life = 0.0;
            }
        }
        // Mirrors.
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
            {
                let e = self.fm(f);
                e.mirror_time = max(0.0, e.mirror_time - dt);
                if e.mirror_time <= 0.0 {
                    e.mirror_hits = 0.0;
                }
            }
            if self.f(f).mirror_hits == 0.0 || self.f(f).mirror_hits.is_nan() || self.f(f).hp <= 0.0 {
                continue;
            }
            for pi in 0..self.b.projectiles.len() {
                let p = &self.b.projectiles[pi];
                let fe = self.f(f);
                if self.owner_team(p.owner) == Some(fe.team) {
                    continue;
                }
                let (nx, ny) = (p.x + p.vx * dt, p.y + p.vy * dt);
                let (dx, dy) = (nx - p.x, ny - p.y);
                let len = dx * dx + dy * dy;
                let along = clamp(((fe.x - p.x) * dx + (fe.y - p.y) * dy) / if len == 0.0 || len.is_nan() { 1.0 } else { len }, 0.0, 1.0);
                if hypot2(p.x + dx * along - fe.x, p.y + dy * along - fe.y) > fe.radius + p.radius + 12.0 {
                    continue;
                }
                let Some(t) = self.target_or_nearest(f, None) else { break };
                let index = self.f(f).index;
                let (tx, ty) = (self.f(t).x, self.f(t).y);
                let p = &mut self.b.projectiles[pi];
                p.owner = index;
                let angle = jsmath::atan2(ty - p.y, tx - p.x);
                let speed = hypot2(p.vx, p.vy);
                p.vx = jsmath::cos(angle) * speed;
                p.vy = jsmath::sin(angle) * speed;
                let e = self.fm(f);
                e.mirror_hits -= 1.0;
                if e.mirror_hits == 0.0 || e.mirror_hits.is_nan() {
                    break;
                }
            }
        }
        // Chain lightning.
        let pulses = self.b.lightning_pulses.clone();
        let mut kept = Vec::new();
        for p in pulses {
            if p.due > self.b.time {
                kept.push(p);
                continue;
            }
            let Some(f) = self.fighter_at(Some(p.owner)) else { continue };
            let Some(t) = self.target_or_nearest(f, None) else { continue };
            if self.f(f).hp <= 0.0 {
                continue;
            }
            if de(self.f(t), self.f(f)) <= 450.0 {
                let damage = self.f(f).damage_done;
                let amount = self.f(f).spell * 0.26;
                self.hurt(&Tgt::of(t), Some(f), amount, "lightning", true);
                if self.f(f).damage_done > damage && p.opening {
                    let e = self.fm(t);
                    e.action = None;
                    e.stagger = max(e.stagger, 0.12);
                }
                let (x, y) = (self.f(t).x, self.f(t).y);
                self.emit_sound(Some(f), x, y, 260.0);
            }
        }
        self.b.lightning_pulses = kept;
        // Singularities.
        for zi in 0..self.b.zones.len() {
            if self.b.zones[zi].singularity != Some(true) {
                continue;
            }
            let z = &mut self.b.zones[zi];
            z.pulse = Some(z.pulse.unwrap_or(f64::NAN) + dt);
            if z.pulse.unwrap() < 0.5 {
                continue;
            }
            z.pulse = Some(0.0);
            let Some(f) = self.fighter_at(Some(self.b.zones[zi].owner)) else { continue };
            for t in self.enemies_of(f) {
                let z = &self.b.zones[zi];
                if d(self.f(t).x, self.f(t).y, z.x, z.y) < z.radius {
                    let amount = z.damage * 0.5;
                    self.hit(f, &Tgt::of(t), amount, "void", None, Tags::default());
                }
            }
        }
        self.drift_wisps(dt);
        // Thunder.
        if self.b.environment.weather == "storm" && self.b.time >= self.b.next_thunder {
            self.b.next_thunder += 8.0;
            let c = (self.b.center.x, self.b.center.y);
            self.emit_sound(None, c.0, c.1, 700.0);
        }
        self.b.obstacles.retain_mut(|o| {
            o.life -= dt;
            o.life > 0.0
        });
        // Zones.
        let count = self.b.zones.len();
        let mut zones_kept = Vec::with_capacity(count);
        for zi in 0..count {
            {
                let z = &mut self.b.zones[zi];
                z.life -= dt;
                z.tick += dt;
            }
            let owner = self.fighter_at(Some(self.b.zones[zi].owner));
            for i in 0..self.b.fighters.len() {
                let f = self.b.fighters[i];
                let z = self.b.zones[zi].clone();
                let fe = self.f(f);
                let Some(owner) = owner else { continue };
                if fe.hp <= 0.0 || d(fe.x, fe.y, z.x, z.y) > z.radius {
                    continue;
                }
                let ally = fe.team == self.f(owner).team;
                if z.type_ == "gravity" && !ally && fe.flight <= 0.0 {
                    let (dx, dy) = (z.x - fe.x, z.y - fe.y);
                    let dd = hypot2(dx, dy);
                    let dd = if dd == 0.0 || dd.is_nan() { 1.0 } else { dd };
                    let pull = z.pull.unwrap_or(35.0);
                    let (x, y) = (self.clamp_x(fe.x + dx / dd * dt * pull), self.clamp_y(fe.y + dy / dd * dt * pull));
                    let e = self.fm(f);
                    e.x = x;
                    e.y = y;
                    e.slow = max(e.slow, 0.1);
                }
                if z.type_ == "shadow" {
                    let e = self.fm(f);
                    if ally {
                        e.invisible = max(e.invisible, 0.12);
                    } else {
                        e.slow = max(e.slow, 0.12);
                    }
                }
                if z.tick >= 0.5 {
                    if (z.type_ == "fire" || z.type_ == "lava") && !ally {
                        self.hit(owner, &Tgt::of(f), z.damage * 0.5, &z.type_, None, Tags::default());
                    }
                    if z.type_ == "life" && ally {
                        self.tr.heal_source = Some(owner);
                        let amount = self.f(owner).spell * 0.12;
                        self.heal(f, amount);
                        self.tr.heal_source = None;
                        let e = self.fm(f);
                        e.nutrition = min(100.0, e.nutrition + 12.0);
                    }
                }
            }
            let z = &mut self.b.zones[zi];
            if z.tick >= 0.5 {
                z.tick = 0.0;
            }
            if z.life > 0.0 {
                zones_kept.push(z.clone());
            }
        }
        self.b.zones = zones_kept;
        // Summons.
        let count = self.b.summons.len();
        let mut summons_kept = Vec::with_capacity(count);
        for si in 0..count {
            {
                let s = &mut self.b.summons[si];
                s.life -= dt;
                s.cooldown -= dt;
            }
            let s = self.b.summons[si].clone();
            let Some(f) = self.fighter_at(Some(s.owner)).filter(|&f| self.f(f).hp > 0.0) else { continue };
            let Some(t) = self.target_or_nearest(f, Some(Pt { x: s.x, y: s.y })) else {
                if s.life > 0.0 {
                    summons_kept.push(s);
                }
                continue;
            };
            if s.type_ == "spirit" {
                let (fx, fy) = (self.f(f).x, self.f(f).y);
                let s = &mut self.b.summons[si];
                let angle = s.angle.unwrap_or(f64::NAN) + dt * 2.0;
                s.angle = Some(angle);
                s.x = fx + jsmath::cos(angle) * 20.0;
                s.y = fy + jsmath::sin(angle) * 20.0;
                if s.cooldown <= 0.0 {
                    s.cooldown = 1.15;
                    let (sx, sy, owner) = (s.x, s.y, s.owner);
                    let (tx, ty) = (self.f(t).x, self.f(t).y);
                    let angle = jsmath::atan2(ty - sy, tx - sx);
                    let damage = self.f(f).spell * 0.3;
                    self.b.projectiles.push(BattleProjectiles {
                        x: sx,
                        y: sy,
                        vx: jsmath::cos(angle) * 185.0,
                        vy: jsmath::sin(angle) * 185.0,
                        owner,
                        damage,
                        type_: "spirit".into(),
                        sprite: 4.0,
                        life: 3.0,
                        radius: 4.0,
                        balance_ability: None,
                        duration: None,
                        molten: None,
                        ordinary_arcane: None,
                        payload: None,
                        tags: None,
                        technique: None,
                        weapon_hit: None,
                    });
                }
            } else {
                let (tx, ty) = (self.f(t).x, self.f(t).y);
                let (dx, dy) = (tx - s.x, ty - s.y);
                let dd = hypot2(dx, dy);
                let dd = if dd == 0.0 || dd.is_nan() { 1.0 } else { dd };
                let (x, y) = (self.clamp_x(s.x + dx / dd * 100.0 * dt), self.clamp_y(s.y + dy / dd * 100.0 * dt));
                let s = &mut self.b.summons[si];
                s.x = x;
                s.y = y;
                if dd < 22.0 && s.cooldown <= 0.0 {
                    s.cooldown = 0.8;
                    let amount = self.f(f).damage * self.b.rules.beast_damage;
                    self.hit(f, &Tgt::of(t), amount, "physical", None, Tags::default());
                }
            }
            let s = &self.b.summons[si];
            if s.life > 0.0 {
                summons_kept.push(s.clone());
            }
        }
        self.b.summons = summons_kept;
        // Projectiles stopped by illusions and rocks.
        let projectiles = std::mem::take(&mut self.b.projectiles);
        let mut kept = Vec::with_capacity(projectiles.len());
        'next: for p in projectiles {
            let (x, y) = (p.x + p.vx * dt, p.y + p.vy * dt);
            let team = self.owner_team(p.owner);
            for i in 0..self.b.fighters.len() {
                let a = self.b.fighters[i];
                let ae = self.f(a);
                if Some(ae.team) != team && ae.illusion_time > 0.0 {
                    if let Some(decoy) = ae.decoy.as_ref().filter(|dc| dc.hp > 0.0) {
                        if segment_distance(decoy.x, decoy.y, p.x, p.y, x, y) < 9.0 + p.radius {
                            let e = self.fm(a);
                            e.illusion_time = 0.0;
                            e.decoy.as_mut().unwrap().hp = 0.0;
                            continue 'next;
                        }
                    }
                }
            }
            if self.b.obstacles.iter().any(|o| segment_distance(o.x, o.y, p.x, p.y, x, y) < o.radius + p.radius) {
                continue;
            }
            if self.wisp_catches(p.x, p.y, x, y, p.radius, p.damage) {
                continue;
            }
            kept.push(p);
        }
        self.b.projectiles = kept;
    }

    /// `objectiveStep(dt)` from the top: d24 (levels and wisps) after d19.
    pub fn objective_step(&mut self, dt: f64) {
        self.objective_step_d19(dt);
        self.level_step();
    }

    /// d19 `objectiveStep(dt)`.
    fn objective_step_d19(&mut self, dt: f64) {
        self.drop_fallen();
        self.objective_step_d11(dt);
        if self.b.done {
            return;
        }
        // d17: plan time, and the brain every 1.5 s.
        for team in 0..2 {
            let plan = self.b.brain[team].plan.clone();
            let seconds = &mut self.b.plan_seconds[team];
            let v = seconds.get(&plan).copied().unwrap_or(f64::NAN) + dt;
            match seconds.0.iter_mut().find(|(k, _)| *k == plan) {
                Some((_, slot)) => *slot = v,
                None => seconds.0.push((plan, v)),
            }
        }
        if self.b.time >= (*self.b.next_brain) {
            (*self.b.next_brain) = self.b.time + brain_rules::INTERVAL;
            self.update_brain();
        }
        if self.b.done {
            return;
        }
        // d19: backdoor duty time, and the Titan's ranged attacks.
        for team in 0..2 {
            let size = self.b.duty[team].len() as f64;
            if size > 0.0 && !self.intruders(team as f64).is_empty() {
                self.b.duty_seconds[team] += dt * size;
            }
        }
        let titan = *self.b.titan;
        let up = self.f(titan).hp > 0.0;
        if up && (!(*self.b.titan_up) || (*self.b.titan_resets) != (*self.b.seen_resets)) {
            (*self.b.next_hurl) = self.b.time + self.b.titan_rules.hurl_interval;
            (*self.b.next_fissure) = self.b.time + self.b.titan_rules.fissure_first;
            self.b.fissure = None;
        }
        (*self.b.titan_up) = up;
        (*self.b.seen_resets) = *self.b.titan_resets;
        if !up {
            self.b.fissure = None;
            return;
        }
        if self.b.fissure.as_ref().is_some_and(|z| self.b.time >= z.at) {
            self.release_fissure();
        }
        if self.f(titan).target.is_none() {
            return;
        }
        if self.b.time >= (*self.b.next_hurl) && self.molten_hurl() {
            (*self.b.next_hurl) = self.b.time + self.b.titan_rules.hurl_interval;
        }
        if self.b.fissure.is_none() && self.b.slam_at.is_none() && self.b.time >= (*self.b.next_fissure) && self.open_fissure() {
            (*self.b.next_fissure) = self.b.time + self.b.titan_rules.fissure_interval;
        }
    }

    /// d11 (after d10's Core pulses): Forgefire time and shields, the Titan's respawn, aggro, walk, swing, reset
    /// and slam.
    fn objective_step_d11(&mut self, dt: f64) {
        // d10: Cores pulse at the nearest enemy in range.
        for ci in 0..self.b.cores.len() {
            let core = self.b.cores[ci];
            {
                let e = self.fm(core);
                e.hit_flash = max(0.0, e.hit_flash - dt);
            }
            let team = self.f(core).team as usize;
            if self.b.time < self.b.next_pulse[team] {
                continue;
            }
            self.b.next_pulse[team] = self.b.time + self.b.objective_rules.pulse_interval;
            let ce = self.f(core);
            let mut targets: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).team != ce.team && self.f(f).hp > 0.0 && de(self.f(f), ce) <= self.b.objective_rules.pulse_range).collect();
            targets.sort_by(|&a, &b| {
                let r = de(self.f(a), ce) - de(self.f(b), ce);
                super::movement::js_cmp(if r != 0.0 && !r.is_nan() { r } else { self.f(a).index - self.f(b).index })
            });
            if let Some(&t) = targets.first() {
                let amount = self.f(t).max_hp * self.b.objective_rules.pulse_damage;
                self.hurt(&Tgt::of(t), Some(core), amount, "arcane", false);
            }
        }
        if self.b.done {
            return;
        }
        if self.b.core_at180.is_none() && self.b.time >= 180.0 {
            self.b.core_at180 = Some(self.b.cores.iter().map(|&c| self.f(c).hp / self.f(c).max_hp).collect());
        }
        for team in 0..2usize {
            if self.has_forgefire(team as f64) {
                self.b.forgefire_seconds[team] += min(dt, self.b.forgefire_until[team] - self.b.time);
                if self.b.time >= self.b.next_shield[team] {
                    self.b.next_shield[team] = self.b.time + self.b.titan_rules.shield_interval;
                    for i in 0..self.combatants().len() {
                        let f = self.combatants()[i];
                        if self.f(f).team == team as f64 && self.f(f).hp > 0.0 && self.empowered(f) {
                            let shield = self.f(f).max_hp * self.b.titan_rules.shield;
                            self.fm(f).forge_shield = Some(shield);
                        }
                    }
                }
            } else {
                for i in 0..self.combatants().len() {
                    let f = self.combatants()[i];
                    if self.f(f).team == team as f64 {
                        self.fm(f).forge_shield = Some(0.0);
                    }
                }
            }
        }
        let t = *self.b.titan;
        let time = self.b.time;
        if self.f(t).hp <= 0.0 {
            if time >= (*self.b.next_titan) {
                let e = self.fm(t);
                e.hp = e.max_hp;
                e.x = 640.0;
                e.y = 300.0;
                *self.b.titan_damage = vec![0.0, 0.0];
                self.b.titan_hits.clear();
                (*self.b.titan_last_hit) = time;
                (*self.b.next_slam) = time + self.b.titan_rules.slam;
            }
            return;
        }
        let reset = self.b.titan_rules.reset;
        self.b.titan_hits.retain(|h| time - h.time <= reset);
        // Aggro by attacker index: an object with integer keys, so its keys come out in ascending order.
        let mut aggro: Vec<(f64, f64)> = Vec::new();
        for h in self.b.titan_hits.iter() {
            if self.actor_for(h.index).is_some_and(|a| self.f(a).hp > 0.0) {
                match aggro.iter_mut().find(|(i, _)| *i == h.index) {
                    Some((_, v)) => *v += h.damage,
                    None => aggro.push((h.index, h.damage)),
                }
            }
        }
        aggro.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        aggro.sort_by(|a, b| {
            let r = b.1 - a.1;
            super::movement::js_cmp(if r != 0.0 && !r.is_nan() { r } else { a.0 - b.0 })
        });
        self.fm(t).target = aggro.first().map(|(i, _)| NumOrStr::Str(js_key(*i)));
        let target = match &self.f(t).target {
            Some(NumOrStr::Str(s)) => s.parse::<f64>().ok().and_then(|i| self.actor_for(i)),
            _ => None,
        };
        if let Some(target) = target.filter(|&a| self.f(a).hp > 0.0) {
            let (te, ge) = (self.f(t), self.f(target));
            let (dx, dy) = (ge.x - te.x, ge.y - te.y);
            let len = hypot2(dx, dy);
            let len = if len == 0.0 || len.is_nan() { 1.0 } else { len };
            if len > 65.0 {
                let (x, y) = (te.x + dx / len * 70.0 * dt, te.y + dy / len * 70.0 * dt);
                let from_pit = hypot2(x - 640.0, y - 300.0);
                if from_pit <= 140.0 && !self.b.obstacles.iter().any(|o| hypot2(o.x - x, o.y - y) < o.radius + te.radius) {
                    let e = self.fm(t);
                    e.x = x;
                    e.y = y;
                }
            }
            if de(self.f(t), self.f(target)) < 80.0 && self.b.time >= (*self.b.next_titan_attack) {
                (*self.b.next_titan_attack) = self.b.time + 1.2;
                let amount = self.f(target).max_hp * self.b.titan_rules.attack_damage;
                self.hurt(&Tgt::of(target), Some(t), amount, "physical", true);
            }
        }
        if self.b.time - (*self.b.titan_last_hit) > self.b.titan_rules.reset && self.f(t).hp < self.f(t).max_hp {
            let e = self.fm(t);
            e.hp = e.max_hp;
            e.x = 640.0;
            e.y = 300.0;
            *self.b.titan_damage = vec![0.0, 0.0];
            self.b.titan_hits.clear();
            self.b.slam_at = None;
            (*self.b.titan_resets) += 1.0;
        }
        if self.b.slam_at.is_some_and(|at| self.b.time >= at) {
            self.b.slam_at = None;
            for i in 0..self.combatants().len() {
                let f = self.combatants()[i];
                if self.f(f).hp > 0.0 && de(self.f(f), self.f(t)) <= self.b.titan_rules.range {
                    let amount = self.f(f).max_hp * self.b.titan_rules.slam_damage;
                    self.hurt(&Tgt::of(f), Some(t), amount, "physical", true);
                }
            }
        }
        if self.b.slam_at.is_none() && self.b.time >= (*self.b.next_slam) && self.f(t).target.is_some() {
            (*self.b.next_slam) = self.b.time + self.b.titan_rules.slam;
            self.b.slam_at = Some(self.b.time + self.b.titan_rules.telegraph);
        }
    }

    /// d19 `releaseFissure()`: the line hits and stuns everyone inside it.
    pub fn release_fissure(&mut self) {
        let z = self.b.fissure.take().expect("an open Fissure");
        let r = self.b.titan_rules.clone();
        for i in 0..self.combatants().len() {
            let f = self.combatants()[i];
            let fe = self.f(f);
            if fe.hp <= 0.0 || !fissure_inside(z.x, z.y, z.angle, z.length, z.width, fe.x, fe.y, fe.radius) {
                continue;
            }
            let amount = fe.max_hp * r.fissure_damage;
            let titan = *self.b.titan;
            self.hurt(&Tgt::of(f), Some(titan), amount, "physical", true);
            if self.f(f).hp > 0.0 && self.titan_stun(Some(f), r.fissure_stun) {
                (*self.b.fissure_stuns) += 1.0;
            }
        }
    }

    /// d10 `finishAtLimit()`: Core health, then total damage, then a seeded coin toss.
    pub fn finish_at_limit(&mut self) {
        let hp: Vec<f64> = self.b.cores.iter().map(|&c| self.f(c).hp / self.f(c).max_hp).collect();
        let damage: Vec<f64> = (0..2)
            .map(|team| {
                self.combatants().iter().filter(|&&f| self.f(f).team == team as f64).fold(0.0, |n, &f| n + self.f(f).damage_done + self.f(f).objective_damage.unwrap_or(f64::NAN))
            })
            .collect();
        let winner = if (hp[0] - hp[1]).abs() > 1e-9 {
            if hp[0] > hp[1] {
                0.0
            } else {
                1.0
            }
        } else if damage[0] != damage[1] {
            if damage[0] > damage[1] {
                0.0
            } else {
                1.0
            }
        } else if self.rng() < 0.5 {
            0.0
        } else {
            1.0
        };
        self.b.winner_team = Some(winner);
        self.b.winner = Some(winner);
        self.b.done = true;
        self.b.reason = Some("Time limit: Core health %, then total damage, then seeded coin toss".into());
    }

    /// d10 `step(dt = 1/60)`
    pub fn step(&mut self, dt: f64) {
        if self.classic {
            return self.step_classic(dt);
        }
        if self.b.done {
            return;
        }
        let dt = clamp(dt, 0.001, 0.05);
        if self.b.time + dt >= self.b.objective_rules.sudden_death && !(*self.b.sudden_death) {
            (*self.b.sudden_death) = true;
        }
        for i in 0..self.combatants().len() {
            let f = self.combatants()[i];
            if self.f(f).hp > 0.0 {
                continue;
            }
            let e = self.fm(f);
            e.down_seconds = Some(e.down_seconds.unwrap_or(f64::NAN) + dt);
            if !(*self.b.sudden_death) && self.f(f).respawn_at.is_some_and(|at| self.b.time >= at) {
                self.respawn(f);
            }
        }
        self.b.fighters = self.combatants().clone();
        self.environment_step(dt);
        let mut burn_states: Vec<(Ent, f64)> = Vec::new();
        for i in 0..self.combatants().len() {
            let f = self.combatants()[i];
            if self.f(f).hp <= 0.0 {
                continue;
            }
            self.upkeep(f, dt);
            burn_states.push((f, self.f(f).burn));
            self.fm(f).burn = 0.0;
        }
        self.b.time += dt;
        self.b.plan_timer -= dt;
        if self.b.plan_timer <= 0.0 {
            self.b.plan_timer = 0.5;
            self.update_plans();
        }
        self.b.fighters = self.combatants().iter().chain(self.b.actors.iter()).copied().collect();
        self.step_fight(dt, &burn_states);
        self.b.fighters = self.combatants().clone();
    }

    /// The part of d10 `step` that runs with the Cores and the Titan among `this.fighters`.
    fn step_fight(&mut self, dt: f64, burn_states: &[(Ent, f64)]) {
        for i in 0..self.combatants().len() {
            if self.b.done {
                break;
            }
            let f = self.combatants()[i];
            if self.f(f).hp <= 0.0 {
                self.fm(f).action = None;
                continue;
            }
            self.fm(f).retarget -= dt;
            let mut t = match &self.f(f).target {
                Some(NumOrStr::Num(i)) => self.actor_for(*i),
                Some(NumOrStr::Str(s)) => s.parse::<f64>().ok().and_then(|i| self.actor_for(i)),
                None => None,
            };
            if t.map_or(true, |t| self.f(t).hp <= 0.0) || self.f(f).retarget <= 0.0 {
                t = self.choose_target(f);
                let index = t.map(|t| self.f(t).index);
                let e = self.fm(f);
                e.target = index.map(NumOrStr::Num);
                e.retarget = 0.35;
            }
            {
                let e = self.fm(f);
                e.cooldown -= dt;
                e.cast -= dt;
                tick_combat_timers(e, dt);
                e.mana = min(e.max_mana, e.mana + dt * (0.6 + e.magic / 45.0));
            }
            let Some(t) = t else { continue };
            let t = Tgt::of(t);
            self.move_team_fighter(f, &t, dt);
            self.start_attack(f, &t);
            self.update_attack(f, &t, dt);
            self.cast_power(f, &t);
        }
        // Separation.
        let living: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).hp > 0.0).collect();
        for i in 0..living.len() {
            for j in i + 1..living.len() {
                let (a, b) = (living[i], living[j]);
                let (ae, be) = (self.f(a), self.f(b));
                let (dx, dy) = (be.x - ae.x, be.y - ae.y);
                let dist = hypot2(dx, dy);
                if dist >= 20.0 {
                    continue;
                }
                let angle = if dist != 0.0 && !dist.is_nan() { jsmath::atan2(dy, dx) } else { (ae.index - be.index) * 0.7 };
                let push = (20.0 - dist) / 2.0;
                let (c, s) = (jsmath::cos(angle), jsmath::sin(angle));
                let (ax, ay) = (self.clamp_x(ae.x - c * push), self.clamp_y(ae.y - s * push));
                let (bx, by) = (self.clamp_x(be.x + c * push), self.clamp_y(be.y + s * push));
                {
                    let e = self.fm(a);
                    e.x = ax;
                    e.y = ay;
                }
                let e = self.fm(b);
                e.x = bx;
                e.y = by;
            }
        }
        // Projectiles.
        let count = self.b.projectiles.len();
        let mut kept = Vec::with_capacity(count);
        for pi in 0..count {
            let (ox, oy) = (self.b.projectiles[pi].x, self.b.projectiles[pi].y);
            {
                let p = &mut self.b.projectiles[pi];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
            }
            let p = self.b.projectiles[pi].clone();
            let Some(owner) = self.actor_for(p.owner) else { continue };
            let mut target = None;
            let mut closest = f64::INFINITY;
            for k in 0..self.b.fighters.len() {
                let t = self.b.fighters[k];
                let te = self.f(t);
                if te.hp <= 0.0 || te.team == self.f(owner).team || segment(te.x, te.y, ox, oy, p.x, p.y) >= te.radius + p.radius {
                    continue;
                }
                let along = d(te.x, te.y, ox, oy);
                if along < closest {
                    closest = along;
                    target = Some(t);
                }
            }
            if let Some(target) = target {
                let before = self.f(target).hp;
                let previous = std::mem::replace(&mut self.tr.hit_context, Some(HitContext::projectile(&p)));
                self.hurt(&Tgt::of(target), Some(owner), p.damage, &p.type_, true);
                self.tr.hit_context = previous;
                let te = self.f(target);
                if te.is_objective != Some(true) && te.hp < before {
                    let duration = p.duration.filter(|d| *d != 0.0 && !d.is_nan()).unwrap_or(2.0);
                    if p.type_ == "ice" || p.type_ == "control" {
                        self.fm(target).slow = duration;
                    }
                    if p.type_ == "fire" {
                        self.fm(target).burn = duration;
                    }
                }
                continue;
            }
            if p.life > 0.0 && p.x >= 0.0 && p.y >= 0.0 && p.x <= self.b.width && p.y <= self.b.height {
                kept.push(p);
            }
        }
        self.b.projectiles = kept;
        for i in 0..self.combatants().len() {
            let f = self.combatants()[i];
            if self.f(f).hp > 0.0 {
                self.push_out_of_terrain(f);
            }
        }
        if !self.b.done {
            self.objective_step(dt);
        }
        for i in 0..self.combatants().len() {
            let f = self.combatants()[i];
            let burn = burn_states.iter().find(|(e, _)| *e == f).map_or(0.0, |&(_, b)| if b != 0.0 && !b.is_nan() { b } else { 0.0 });
            {
                let e = self.fm(f);
                e.burn = max(e.burn, burn);
                if e.ward_time <= 0.0 {
                    e.ward_hits = 0.0;
                }
                if e.future_time <= 0.0 {
                    e.foreseen = 0.0;
                }
            }
            self.rebirth(f);
            if self.f(f).hp <= 0.0 {
                if !self.f(f).downed {
                    let at = self.b.time + self.respawn_delay();
                    let e = self.fm(f);
                    e.downed = true;
                    e.deaths += 1.0;
                    e.action = None;
                    if e.respawn_at.is_none() {
                        e.respawn_at = Some(at);
                    }
                }
                continue;
            }
            let e = self.fm(f);
            e.downed = false;
            e.credited_down = false;
            e.cc_immune = max(0.0, e.cc_immune - dt);
            let hard = e.sleep > 0.0 || e.root > 0.0 || e.amnesia > 0.0 || e.suppressed > 0.0;
            if hard && !e.was_hard && e.cc_immune > 0.0 {
                e.sleep = 0.0;
                e.root = 0.0;
                e.amnesia = 0.0;
                e.suppressed = 0.0;
                continue;
            }
            if hard {
                e.cc_seconds += dt;
            } else if e.was_hard {
                e.cc_immune = CC_IMMUNITY;
            }
            e.was_hard = hard;
        }
        if !self.b.done && self.b.time >= self.b.time_limit {
            self.finish_at_limit();
        }
    }
}

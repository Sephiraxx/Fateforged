//! Classic teamfight (team-2.9, RUST-CORE.md B4): the team-4.0 chain without its Core siege layers. What differs
//! from Core siege is here: the base team layer's `step`, `teamHealth` and `result()` (d6, with d8, d9 and d12's
//! changes to the result), which the Core siege layers replace.
use super::consts::CC_IMMUNITY;
use super::step::tick_combat_timers;
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min, round};
use crate::team::geometry::{clamp, segment_distance};
use crate::team::jsnum::Ent;
use crate::team::state::NumOrStr;
use super::combat::HitContext;
use serde_json::{json, Map, Value};

/// A number as `JSON.stringify` writes it (−0 is written as 0).
fn n(v: f64) -> Value {
    if v == 0.0 {
        json!(0.0)
    } else if v.is_finite() {
        json!(v)
    } else {
        Value::Null
    }
}

impl Engine {
    /// d6 `teamHealth(team)`
    pub fn team_health_classic(&self, team: f64) -> f64 {
        let (mut hp, mut most) = (0.0, 0.0);
        for &f in &self.b.fighters {
            let e = self.f(f);
            if e.team == team {
                hp += max(0.0, e.hp);
                most += e.max_hp;
            }
        }
        if most != 0.0 && !most.is_nan() {
            hp / most
        } else {
            0.0
        }
    }

    /// d6 `step(dt = 1/60)`, reached past d22 (portable math). Its `this.environmentStep` call goes through d14,
    /// which marks the environment as the source of patched-ability effects while it runs.
    pub fn step_classic(&mut self, dt: f64) {
        if self.b.done {
            return;
        }
        let dt = clamp(dt, 0.001, 0.05);
        self.tr.balance_environment = true;
        self.environment_step(dt);
        self.tr.balance_environment = false;
        self.b.balance_environment = Some(false);
        let mut burn_states: Vec<(Ent, f64)> = Vec::new();
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
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
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
            if self.f(f).hp <= 0.0 {
                self.fm(f).action = None;
                continue;
            }
            self.fm(f).retarget -= dt;
            let mut t = match &self.f(f).target {
                Some(NumOrStr::Num(i)) => self.fighter_at(Some(*i)),
                Some(NumOrStr::Str(s)) => self.fighter_at(s.parse::<f64>().ok()),
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
        let living: Vec<Ent> = self.b.fighters.iter().copied().filter(|&f| self.f(f).hp > 0.0).collect();
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
            let owner = self.fighter_at(Some(p.owner)).expect("a projectile's owner is a fighter");
            let mut target = None;
            let mut closest = f64::INFINITY;
            for k in 0..self.b.fighters.len() {
                let t = self.b.fighters[k];
                let te = self.f(t);
                if te.hp <= 0.0 || te.team == self.f(owner).team || segment_distance(te.x, te.y, ox, oy, p.x, p.y) >= te.radius + p.radius {
                    continue;
                }
                let along = hypot2(te.x - ox, te.y - oy);
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
                if self.f(target).hp < before {
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
        // Knockback, pulls, swaps and separation can shove a fighter into terrain: settle everyone last.
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
            if self.f(f).hp > 0.0 {
                self.push_out_of_terrain(f);
            }
        }
        for i in 0..self.b.fighters.len() {
            let f = self.b.fighters[i];
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
                let e = self.fm(f);
                if !e.downed {
                    e.downed = true;
                    e.deaths += 1.0;
                    e.action = None;
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
                self.warn(f, "cc-immune");
                continue;
            }
            let e = self.fm(f);
            if hard {
                e.cc_seconds += dt;
            } else if e.was_hard {
                e.cc_immune = CC_IMMUNITY;
            }
            e.was_hard = hard;
        }
        let up: Vec<bool> = (0..2).map(|team| self.b.fighters.iter().any(|&f| self.f(f).team == team as f64 && self.f(f).hp > 0.0)).collect();
        if !up[0] || !up[1] || self.b.time >= self.b.time_limit {
            self.b.done = true;
            let knockout = !up[0] || !up[1];
            self.b.reason = Some(if knockout { "Team eliminated" } else { "Time limit: team health %, then damage, then seeded coin toss" }.into());
            let health = [self.team_health_classic(0.0), self.team_health_classic(1.0)];
            let damage: Vec<f64> = (0..2).map(|team| self.b.fighters.iter().filter(|&&f| self.f(f).team == team as f64).fold(0.0, |n, &f| n + self.f(f).damage_done)).collect();
            let winner = if !up[0] && up[1] {
                1.0
            } else if !up[1] && up[0] {
                0.0
            } else if (health[0] - health[1]).abs() > 0.00001 {
                if health[0] > health[1] {
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
        }
    }

    /// `result()` of a finished classic game: d6's summary; d8 adds each fighter's team kit, d9 the balance id,
    /// and d12 takes the kits out again.
    pub fn result_classic(&self) -> Value {
        assert!(self.b.done, "Battle is still running.");
        let b = &self.b;
        let tenth = |v: f64| n(round(v * 10.0) / 10.0);
        let teams: Vec<Value> = (0..2).map(|team| Value::Array(b.fighters.iter().filter(|&&f| self.f(f).team == team as f64).map(|&f| json!(self.f(f).id)).collect())).collect();
        let fighters: Vec<Value> = b
            .fighters
            .iter()
            .map(|&f| {
                let e = self.f(f);
                let mut m = Map::new();
                m.insert("id".into(), json!(e.id));
                m.insert("team".into(), n(e.team));
                m.insert("role".into(), json!(e.role));
                m.insert("hp".into(), n(round(max(0.0, e.hp) / e.max_hp * 100.0)));
                m.insert("damage".into(), n(round(e.damage_done)));
                m.insert("healing".into(), n(round(e.healing_done)));
                m.insert("kills".into(), n(e.kills));
                m.insert("deaths".into(), n(e.deaths));
                m.insert("ccSeconds".into(), tenth(e.cc_seconds));
                Value::Object(m)
            })
            .collect();
        let env = &b.environment;
        let mut out = Map::new();
        out.insert("mode".into(), json!("team"));
        out.insert("size".into(), n(b.size));
        out.insert("seed".into(), n(b.seed));
        out.insert("teams".into(), Value::Array(teams));
        out.insert("winnerTeam".into(), b.winner_team.map_or(Value::Null, n));
        out.insert("seconds".into(), tenth(b.time));
        out.insert("reason".into(), b.reason.as_ref().map_or(Value::Null, |r| json!(r)));
        out.insert("hp".into(), Value::Array((0..2).map(|team| n(round(self.team_health_classic(team as f64) * 100.0))).collect()));
        out.insert("combatVersion".into(), json!("team-2.9"));
        out.insert("tactics".into(), json!(b.tactics));
        out.insert("environment".into(), json!({"time": env.time, "weather": env.weather, "ground": env.ground, "map": env.map}));
        out.insert("fighters".into(), Value::Array(fighters));
        out.insert("balanceId".into(), json!(b.balance.id));
        Value::Object(out)
    }
}

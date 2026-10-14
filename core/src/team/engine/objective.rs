//! Core siege: the Titan's attacks, backdoor duty, the team brain's plan scores, team formation plans and
//! respawns (depth in the team-4.0 prototype chain in each doc line).
use super::consts::{self, brain_rules, Posture, CC_IMMUNITY, TEAM_PLANS};
use super::movement::{js_cmp, js_key, truthy};
use super::queries::{d, de, Pt};
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min, JsRandom};
use crate::team::jsnum::{Ent, JsMap};
use crate::team::state::{BattleFissure, BattlePlans, BattlePlansPosture, BattlePlansV, BattleProjectiles, BattlePlansF, BattlePlansSlots, BattlePlansU};

/// `situation(team)` (d5): what the team brain looks at.
#[derive(Clone, Debug)]
pub struct Situation {
    pub alive: f64,
    pub foes_alive: f64,
    pub hp: f64,
    pub foe_hp: f64,
    pub titan_up: bool,
    pub titan_pct: f64,
    pub titan_soon: bool,
    pub own_core: f64,
    pub foe_core: f64,
    pub forgefire: bool,
    pub foe_forgefire: bool,
    pub near_our_core: f64,
    pub core_hit: bool,
    pub foes_in_pit: f64,
    pub foes_on_titan: bool,
    pub stealer: bool,
}

/// Plan scores, in `TEAM_PLANS` order; `None` is a missing key (`undefined`).
pub type Scores = [Option<f64>; 7];
fn plan_index(p: &str) -> usize {
    TEAM_PLANS.iter().position(|q| *q == p).expect("a known plan")
}

impl Engine {
    /// d3 `titanStun(t, duration)`
    pub fn titan_stun(&mut self, t: Option<Ent>, duration: f64) -> bool {
        let Some(t) = t else { return false };
        let te = self.f(t);
        if te.hp <= 0.0 || te.cc_immune > 0.0 || te.sleep > 0.0 || te.root > 0.0 || te.amnesia > 0.0 || te.suppressed > 0.0 || te.taunt_time > 0.0 {
            return false;
        }
        let e = self.fm(t);
        e.kit_stun = duration;
        e.sleep = duration;
        e.action = None;
        e.was_hard = true;
        true
    }

    /// d3 `titanAttackers()`: everyone who hit the Titan recently and is still up, by index.
    pub fn titan_attackers(&self) -> Vec<Ent> {
        let mut seen: Vec<f64> = Vec::new();
        for h in self.b.titan_hits.iter() {
            if !seen.iter().any(|s| *s == h.index || s.is_nan() && h.index.is_nan()) {
                seen.push(h.index);
            }
        }
        let mut out: Vec<Ent> = seen.iter().filter_map(|&i| self.actor_for(i)).filter(|&f| self.f(f).hp > 0.0 && self.f(f).team < 2.0).collect();
        out.sort_by(|&a, &b| js_cmp(self.f(a).index - self.f(b).index));
        out
    }

    /// d3 `openFissure()`: aim the line that catches the most fighters.
    pub fn open_fissure(&mut self) -> bool {
        let t = self.f(*self.b.titan);
        let r = &self.b.titan_rules;
        let mut near: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).hp > 0.0 && de(self.f(f), t) <= r.fissure_length).collect();
        near.sort_by(|&a, &b| js_cmp(self.f(a).index - self.f(b).index));
        let mut best: Option<(f64, f64)> = None; // (angle, count)
        for &aim in &near {
            let ae = self.f(aim);
            let angle = jsmath::atan2(ae.y - t.y, ae.x - t.x);
            let count = near.iter().filter(|&&f| fissure_inside(t.x, t.y, angle, r.fissure_length, r.fissure_width, self.f(f).x, self.f(f).y, self.f(f).radius)).count() as f64;
            if best.is_none_or(|b| count > b.1) {
                best = Some((angle, count));
            }
        }
        let Some((angle, _)) = best else { return false };
        self.b.fissure = Some(BattleFissure { x: t.x, y: t.y, angle, length: r.fissure_length, width: r.fissure_width, start: self.b.time, at: self.b.time + r.fissure_telegraph });
        (*self.b.fissures) += 1.0;
        true
    }

    /// d3 `moltenHurl()`: throw molten rock at the farthest attacker beyond melee reach with a clear line.
    pub fn molten_hurl(&mut self) -> bool {
        let titan = *self.b.titan;
        let (tx, ty) = (self.f(titan).x, self.f(titan).y);
        let r = &self.b.titan_rules;
        let mut targets: Vec<Ent> = self.titan_attackers().into_iter().filter(|&f| {
            let fe = self.f(f);
            let dist = d(fe.x, fe.y, tx, ty);
            dist > r.hurl_min && dist <= r.hurl_range && self.clear_shot(tx, ty, fe.x, fe.y)
        }).collect();
        targets.sort_by(|&a, &b| {
            let (ea, eb) = (self.f(a), self.f(b));
            let v = d(eb.x, eb.y, tx, ty) - d(ea.x, ea.y, tx, ty);
            js_cmp(if truthy(v) { v } else { ea.index - eb.index })
        });
        let Some(&target) = targets.first() else { return false };
        let te = self.f(target);
        let angle = jsmath::atan2(te.y - ty, te.x - tx);
        let dist = d(te.x, te.y, tx, ty);
        let p = BattleProjectiles {
            x: tx,
            y: ty,
            vx: jsmath::cos(angle) * r.hurl_speed,
            vy: jsmath::sin(angle) * r.hurl_speed,
            owner: self.f(titan).index,
            damage: te.max_hp * r.hurl_damage,
            type_: "arcane".into(),
            sprite: 2.0,
            life: dist / r.hurl_speed + 0.25,
            radius: 7.0,
            molten: Some(true),
            balance_ability: None,
            duration: None,
            ordinary_arcane: None,
            payload: None,
            tags: None,
            technique: None,
            weapon_hit: None,
        };
        self.b.projectiles.push(p);
        (*self.b.hurls) += 1.0;
        true
    }

    /// d3 `defendTarget(f)`: the intruder hitting the Core first, else the one closest to it, else by index.
    pub fn defend_target(&self, f: Ent) -> Option<Ent> {
        let team = self.f(f).team;
        let core = self.b.cores[team as usize];
        let ce = self.f(core);
        let mut list = self.intruders(team);
        let hits_core = |e: Ent| matches!(&self.f(e).target, Some(crate::team::state::NumOrStr::Num(i)) if *i == ce.index) as i32 as f64;
        list.sort_by(|&a, &b| {
            let v1 = hits_core(b) - hits_core(a);
            if truthy(v1) {
                return js_cmp(v1);
            }
            let v2 = de(self.f(a), ce) - de(self.f(b), ce);
            if truthy(v2) {
                return js_cmp(v2);
            }
            js_cmp(self.f(a).index - self.f(b).index)
        });
        list.first().copied()
    }

    /// d3 `updateDuty()`: the teammates closest to their Core, one per intruder (never the whole team), unless
    /// the team is already defending.
    pub fn update_duty(&mut self) {
        for team in [0usize, 1] {
            self.b.duty[team].clear();
            if self.b.brain.get(team).is_some_and(|b| b.plan == "defend") {
                continue;
            }
            let core = self.b.cores[team];
            let ce = self.f(core);
            let mut mine: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).team == team as f64 && self.f(f).hp > 0.0).collect();
            let k = min(self.intruders(team as f64).len() as f64, mine.len() as f64 - 1.0);
            mine.sort_by(|&a, &b| {
                let v = de(self.f(a), ce) - de(self.f(b), ce);
                js_cmp(if truthy(v) { v } else { self.f(a).index - self.f(b).index })
            });
            let take = max(0.0, k) as usize;
            let picked: Vec<f64> = mine.iter().take(take).map(|&f| self.f(f).index).collect();
            for i in picked {
                if !self.b.duty[team].contains(&i) {
                    self.b.duty[team].push(i);
                }
            }
        }
    }

    /// d4 `gamePlan(team)`
    pub(crate) fn game_plan(&self, team: usize) -> (&str, &str, &str) {
        let g = &self.b.game_plans[team];
        (g.titan.as_str(), g.style.as_str(), g.siege.as_str())
    }

    /// d5 `situation(team)`
    pub fn situation(&self, team: f64) -> Situation {
        let mine: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).team == team).collect();
        let foes: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).team != team).collect();
        let alive = |l: &[Ent]| -> Vec<Ent> { l.iter().copied().filter(|&f| self.f(f).hp > 0.0).collect() };
        let hp = |l: &[Ent]| l.iter().fold(0.0, |n, &f| n + max(0.0, self.f(f).hp)) / l.iter().fold(0.0, |n, &f| n + self.f(f).max_hp);
        let t = self.f(*self.b.titan);
        let pit = self.pit();
        let own = self.f(self.b.cores[team as usize]);
        let foe = self.f(self.b.cores[1 - team as usize]);
        let alive_foes = alive(&foes);
        Situation {
            alive: alive(&mine).len() as f64,
            foes_alive: alive_foes.len() as f64,
            hp: hp(&mine),
            foe_hp: hp(&foes),
            titan_up: t.hp > 0.0,
            titan_pct: t.hp / t.max_hp,
            titan_soon: t.hp <= 0.0 && (*self.b.next_titan) - self.b.time < 12.0,
            own_core: own.hp / own.max_hp,
            foe_core: foe.hp / foe.max_hp,
            forgefire: self.has_forgefire(team),
            foe_forgefire: self.has_forgefire(1.0 - team),
            near_our_core: alive_foes.iter().filter(|&&e| de(self.f(e), own) < brain_rules::DEFEND_RANGE).count() as f64,
            core_hit: self.b.time - self.b.core_hit_at.as_ref().and_then(|v| v.get(team as usize).copied()).unwrap_or(f64::NEG_INFINITY) < 3.0,
            foes_in_pit: alive_foes.iter().filter(|&&e| d(self.f(e).x, self.f(e).y, pit.x, pit.y) < brain_rules::PIT_RADIUS).count() as f64,
            foes_on_titan: t.hp > 0.0 && self.b.titan_hits.iter().any(|h| self.actor_for(h.index).map(|a| self.f(a).team) != Some(team) && self.b.time - h.time < 3.0),
            stealer: t.hp > 0.0 && alive(&mine).iter().any(|&f| de(self.f(f), t) < brain_rules::STEAL_REACH && (self.f(f).weapon.type_ != "melee" || self.is_skirmisher(&Tgt::of(f)))),
        }
    }

    /// `planScores` chain: d3 (two or more intruders call for defence) → d4 (game plan dials) → d5 (base scores).
    pub fn plan_scores(&self, team: f64) -> Scores {
        // d5
        let s = self.situation(team);
        let edge = max(-2.0, min(2.0, s.alive - s.foes_alive));
        let tactic = &self.b.tactics[team as usize];
        let mut out: Scores = [None; 7];
        let set = |out: &mut Scores, p: &str, v: f64| out[plan_index(p)] = Some(v);
        set(&mut out, "defend", if s.near_our_core >= 2.0 && s.core_hit { 50.0 + 15.0 * s.near_our_core + if s.own_core < 0.5 { 10.0 } else { 0.0 } } else { 0.0 });
        set(&mut out, "regroup", if s.alive <= s.foes_alive - 2.0 || s.hp < 0.35 && s.alive < s.foes_alive { 72.0 } else { 0.0 });
        set(
            &mut out,
            "siege",
            30.0 + if s.forgefire { 40.0 } else { 0.0 } + 16.0 * max(0.0, edge) + max(0.0, min(40.0, (self.b.time - brain_rules::PRESSURE_START) / brain_rules::PRESSURE_RATE)) + if !s.titan_up && !s.titan_soon { 18.0 } else { 0.0 } + if s.foe_core < 0.35 { 15.0 } else { 0.0 }
                - if s.foe_forgefire { 15.0 } else { 0.0 },
        );
        set(&mut out, "contest", if s.titan_up || s.titan_soon { 45.0 + 8.0 * edge - if s.foe_forgefire { 10.0 } else { 0.0 } } else { 0.0 });
        set(&mut out, "hold", if s.titan_up || s.titan_soon { 35.0 + 8.0 * max(0.0, -edge) } else { 0.0 });
        set(&mut out, "flank", if s.titan_up && s.foes_on_titan && s.foes_in_pit != 0.0 && s.titan_pct < 0.6 { 55.0 } else { 0.0 });
        set(&mut out, "steal", if s.titan_up && s.titan_pct < brain_rules::STEAL_HP && s.foes_on_titan && s.stealer { 78.0 } else { 0.0 });
        for p in TEAM_PLANS {
            let i = plan_index(p);
            if out[i].is_some_and(|v| v > 0.0) {
                // `out[p] += style[p] ?? 0`
                out[i] = Some(out[i].unwrap() + consts::plan_style(tactic, p).unwrap_or(0.0));
            }
        }
        // d4
        let (g_titan, g_style, g_siege) = self.game_plan(team as usize);
        let edge4 = s.alive - s.foes_alive;
        let add = |out: &mut Scores, p: &str, n: f64| {
            let i = plan_index(p);
            if out[i].is_some_and(|v| v > 0.0) {
                out[i] = Some(max(1.0, out[i].unwrap() + n));
            }
        };
        let pit = self.pit();
        let lurking = self.combatants().iter().filter(|&&e| self.f(e).team != team && self.f(e).hp > 0.0 && d(self.f(e).x, self.f(e).y, pit.x, pit.y) < brain_rules::PIT_RADIUS + 150.0).count() as f64;
        if s.titan_up && !s.foes_on_titan && lurking >= max(1.0, s.alive - 1.0) && self.b.brain.get(team as usize).map(|b| b.plan.as_str()) != Some("contest") {
            add(&mut out, "contest", -25.0);
        }
        if g_titan == "always" {
            add(&mut out, "contest", 10.0);
        }
        if g_titan == "ahead" && !(edge4 > 0.0 || edge4 == 0.0 && s.hp >= s.foe_hp) {
            set(&mut out, "contest", 0.0);
            add(&mut out, "hold", 10.0);
        }
        if g_titan == "never" {
            set(&mut out, "contest", 0.0);
            set(&mut out, "steal", 0.0);
        }
        if g_style == "flank" {
            add(&mut out, "flank", 15.0);
            add(&mut out, "steal", 5.0);
        } else {
            add(&mut out, "flank", -10.0);
        }
        let siege_allowed = if g_siege == "forgefire" {
            s.forgefire || s.foe_core < 0.2 || edge4 >= 2.0 || self.b.time >= consts::SIEGE_FORGEFIRE_LATE
        } else if g_siege == "late" {
            s.forgefire || edge4 >= 2.0 || self.b.time >= consts::SIEGE_LATE
        } else {
            edge4 > 0.0 || s.forgefire || self.b.time >= brain_rules::PRESSURE_START || !s.titan_up && !s.titan_soon
        };
        if !siege_allowed {
            set(&mut out, "siege", 0.0);
            add(&mut out, "contest", 15.0);
            if !out[plan_index("hold")].is_some_and(|v| v > 0.0) {
                set(&mut out, "hold", 30.0);
            }
        }
        let defend = out[plan_index("defend")];
        if !defend.is_some_and(truthy) && s.near_our_core >= 1.0 && s.core_hit {
            set(&mut out, "defend", 65.0);
        }
        // d3
        let n = self.intruders(team).len() as f64;
        let r = &self.b.backdoor_rules;
        if n >= 2.0 {
            let v = max(out[plan_index("defend")].unwrap_or(0.0), r.defend_base + r.defend_per_intruder * n);
            set(&mut out, "defend", v);
        }
        // d22: siege with an edge, or once the game runs long.
        if out[plan_index("siege")].is_some_and(|v| v > 0.0) {
            let edge = s.alive - s.foes_alive;
            if !(s.forgefire || edge > 0.0 || edge == 0.0 && !s.titan_up && !s.titan_soon || s.foe_core < 0.2 || self.b.time >= super::siege_ai::SIEGE_ANYWAY) {
                set(&mut out, "siege", 0.0);
                if !out[plan_index("hold")].is_some_and(|v| v > 0.0) && !out[plan_index("contest")].is_some_and(|v| v > 0.0) {
                    set(&mut out, "hold", 30.0);
                }
            }
        }
        out
    }

    /// `updateBrain` chain: d3 (then refresh backdoor duty) → d5 (switch plans with commitment and margins).
    pub fn update_brain(&mut self) {
        for team in [0usize, 1] {
            let scores = self.plan_scores(team as f64);
            let score = |p: &str| scores[plan_index(p)];
            let best = TEAM_PLANS.iter().fold(TEAM_PLANS[0], |p, &q| if gt(score(q), score(p)) { q } else { p });
            let b = &self.b.brain[team];
            let current = score(&b.plan.clone());
            let urgent = (best == "defend" || best == "regroup") && gt(score(best), Some(current.unwrap_or(0.0)));
            let scores_map = JsMap(TEAM_PLANS.iter().filter_map(|p| score(p).map(|v| (p.to_string(), v))).collect());
            // b.scores keeps JavaScript's insertion order: defend, regroup, siege, contest, hold, flank, steal.
            let order = ["defend", "regroup", "siege", "contest", "hold", "flank", "steal"];
            let mut ordered = JsMap(Vec::new());
            for p in order {
                if let Some(v) = scores_map.get(p) {
                    ordered.0.push((p.to_string(), *v));
                }
            }
            self.b.brain[team].scores = ordered;
            if best == self.b.brain[team].plan {
                continue;
            }
            let since = self.b.brain[team].since;
            if urgent || self.b.time - since >= brain_rules::COMMIT && gt(score(best), Some(current.unwrap_or(0.0) + brain_rules::SWITCH_MARGIN)) || !current.is_some_and(|v| v > 0.0) {
                let b = &mut self.b.brain[team];
                b.plan = best.to_string();
                b.since = self.b.time;
                self.b.plan_switches[team] += 1.0;
            }
        }
        self.update_duty();
    }

    /// `teleportDestination` chain: d3 (never onto or near the enemy Core) → d16 (a spot near the target at the
    /// preferred range, away from threats and rocks).
    pub fn teleport_destination(&mut self, f: Ent, t: &Tgt) -> Option<Pt> {
        if self.classic {
            return self.teleport_destination_d16(f, t);
        }
        if self.b.cores.contains(&t.ent) && t.is_plain() {
            return None;
        }
        let spot = self.teleport_destination_d16(f, t);
        let team = self.f(f).team;
        let core = self.f(self.b.cores[1 - team as usize]);
        match spot {
            Some(s) if hypot2(s.x - core.x, s.y - core.y) < consts::BACKDOOR_NO_BLINK => None,
            other => other,
        }
    }

    fn teleport_destination_d16(&mut self, f: Ent, t: &Tgt) -> Option<Pt> {
        let fe = self.f(f);
        let seed = jsmath::to_int32(self.b.seed) ^ jsmath::imul(jsmath::to_int32(fe.cast_count + 1.0), 104729) ^ jsmath::imul(jsmath::to_int32(fe.index + 1.0), 7919);
        let mut rng = JsRandom::new(seed as u32 as f64);
        let radius = if fe.weapon.type_ == "melee" { 40.0 } else { 150.0 };
        let desired = self.preferred_range(f);
        let (tx, ty) = (self.tx(t), self.ty(t));
        let fe = self.f(f);
        let current_error = (hypot2(tx - fe.x, ty - fe.y) - desired).abs();
        let fr = fe.radius;
        let threat = self.incoming_threat(f, super::movement::Kind::Any, None);
        let mut best = None;
        let mut best_score = f64::INFINITY;
        for _ in 0..4 {
            let angle = rng.next() * std::f64::consts::PI * 2.0;
            let x = self.clamp_x(tx + jsmath::cos(angle) * radius);
            let y = self.clamp_y(ty + jsmath::sin(angle) * radius);
            let error = (hypot2(tx - x, ty - y) - desired).abs();
            if !threat && current_error - error < 25.0 {
                continue;
            }
            if self.b.obstacles.iter().any(|o| hypot2(o.x - x, o.y - y) < o.radius + fr) {
                continue;
            }
            let score = error + if self.incoming_threat(f, super::movement::Kind::Any, Some(Pt { x, y })) { 200.0 } else { 0.0 };
            if score < best_score {
                best_score = score;
                best = Some(Pt { x, y });
            }
        }
        best
    }

    /// `respawn` chain: d1 (forget unsticking) → d7 (no Forgefire) → d11 (no Forgefire shield) → d12 (back at
    /// base with full health and fresh timers).
    pub fn respawn(&mut self, f: Ent) {
        // d12
        {
            let e = self.fm(f);
            for v in [
                &mut e.exposed, &mut e.wet, &mut e.root, &mut e.sleep, &mut e.poison, &mut e.bleed, &mut e.regeneration, &mut e.absorption, &mut e.flight, &mut e.invisible, &mut e.insight, &mut e.blind,
                &mut e.amnesia, &mut e.suppressed, &mut e.disarmed, &mut e.spirit_armor, &mut e.shape, &mut e.size_time, &mut e.soul, &mut e.chrono, &mut e.death_mark, &mut e.winded, &mut e.illusion_time,
                &mut e.portal_time, &mut e.ward_time, &mut e.future_time, &mut e.mind_time, &mut e.burn, &mut e.slow, &mut e.shield, &mut e.evade, &mut e.hit_flash, &mut e.stagger, &mut e.guard_time,
                &mut e.parry_time, &mut e.perfect_time, &mut e.counter_time, &mut e.last_stand_time, &mut e.crippled, &mut e.bramble_slow, &mut e.mirror_time, &mut e.kit_stun, &mut e.taunt_time,
            ] {
                *v = 0.0;
            }
            e.hp = e.max_hp;
            e.mana = e.max_mana;
            e.energy = e.max_energy;
            e.nutrition = 100.0;
            e.roll = 0.0;
            e.roll_cooldown = 0.0;
            e.periodic = 0.0;
            e.last_attacker = None;
            e.trail = Vec::new();
            e.guard_ready = false;
            e.cooldown = 0.2;
            e.cast = 0.8;
            e.kit_cooldown = 0.8;
            e.action = None;
            e.target = None;
            e.retarget = 0.0;
            e.downed = false;
            e.credited_down = false;
            e.was_hard = false;
            e.cc_immune = CC_IMMUNITY;
            e.ward_hits = 0.0;
            e.foreseen = 0.0;
            e.mirror_hits = 0.0;
            e.wind_remaining = 0.0;
            e.portal_used = false;
            e.gates = None;
            e.respawn_at = None;
            e.diving = Some(false);
            e.intent = None;
        }
        self.place_at_base(f);
        self.update_plans();
        // d11, d7, d1
        let e = self.fm(f);
        e.forge_shield = Some(0.0);
        e.forgefire_until = Some(0.0);
        e.unstick_until = Some(0.0);
        e.unstick_to = None;
        e.still_since = None;
        // d23
        e.statuses = Some(Vec::new());
    }

    /// d11 `settleShield(t, f, before, dealt)`: Forgefire's shield absorbs part of a hit after it lands.
    pub fn settle_shield(&mut self, t: Ent, f: Option<Ent>, before: f64, dealt: f64) {
        let te = self.f(t);
        let shield = te.forge_shield.unwrap_or(0.0);
        let absorbed = min(shield, dealt);
        let overflow = if te.hp <= 0.0 { max(0.0, dealt - before) } else { 0.0 };
        let e = self.fm(t);
        e.forge_shield = Some(max(0.0, e.forge_shield.unwrap_or(0.0) - absorbed));
        e.hp = min(e.max_hp, e.hp + max(0.0, absorbed - overflow));
        let tside = e.side;
        if let Some(f) = f {
            if self.f(f).side != tside {
                let fe = self.fm(f);
                fe.damage_done = max(0.0, fe.damage_done - absorbed);
            }
        }
    }

    /// `updatePlans` chain: d12 (plan over the fighters only) → d16 (formation plans for both teams).
    pub fn update_plans(&mut self) {
        let combatants = self.combatants().clone();
        let all = std::mem::replace(&mut self.b.fighters, combatants);
        let previous = self.b.plans.clone();
        let mut plans = Vec::with_capacity(2);
        for team in [0.0, 1.0] {
            let p = self.plan_for(team, previous.get(team as usize).and_then(|p| p.as_ref()));
            plans.push(p);
        }
        self.b.plans = plans;
        self.b.fighters = all;
    }

    /// The body of d16 `updatePlans` for one team.
    fn plan_for(&mut self, team: f64, old: Option<&BattlePlans>) -> Option<BattlePlans> {
        let mine: Vec<Ent> = self.b.fighters.iter().copied().filter(|&f| self.f(f).team == team && self.f(f).hp > 0.0).collect();
        let foes: Vec<Ent> = self.b.fighters.iter().copied().filter(|&f| self.f(f).team != team && self.f(f).hp > 0.0).collect();
        if mine.is_empty() || foes.is_empty() {
            return None;
        }
        let posture = self.posture(team);
        let c = self.centroid(&mine);
        let ec = self.centroid(&foes);
        let (mut ux, mut uy) = (ec.x - c.x, ec.y - c.y);
        let mut len = hypot2(ux, uy);
        if len < 1.0 {
            ux = if team != 0.0 { -1.0 } else { 1.0 };
            uy = 0.0;
            len = 1.0;
        }
        ux /= len;
        uy /= len;
        if let Some(old) = old {
            ux = ux * 0.5 + old.u.x * 0.5;
            uy = uy * 0.5 + old.u.y * 0.5;
            let n = {
                let l = hypot2(ux, uy);
                if truthy(l) {
                    l
                } else {
                    1.0
                }
            };
            ux /= n;
            uy /= n;
        }
        let u = BattlePlansU { x: ux, y: uy };
        let v = BattlePlansV { x: -uy, y: ux };
        let tanks: Vec<Ent> = mine.iter().copied().filter(|&f| self.f(f).role == "tank").collect();
        let tc = self.centroid(&tanks);
        let ff = if !tanks.is_empty() { tc } else { Pt { x: self.clamp_x(c.x + ux * 60.0), y: self.clamp_y(c.y + uy * 60.0) } };
        let engaged = foes.iter().any(|&e| d(self.f(e).x, self.f(e).y, ff.x, ff.y) < 280.0);
        let hold = posture.hold.map(|h| truthy(h) && !engaged && self.b.time < h);
        let back: Vec<Ent> = mine.iter().copied().filter(|&f| self.f(f).role != "tank" && self.f(f).diving != Some(true)).collect();
        let bb = if !back.is_empty() { self.centroid(&back) } else { ff };
        let threats: Vec<f64> = foes
            .iter()
            .copied()
            .filter(|&e| back.iter().any(|&a| if self.f(a).role != "damage" || self.f(a).weapon.type_ != "melee" { de(self.f(e), self.f(a)) < 130.0 } else { false }))
            .map(|e| self.f(e).index)
            .collect();
        let enemy_tanks: Vec<Ent> = foes.iter().copied().filter(|&e| self.f(e).role == "tank").collect();
        let exposed = |eng: &Engine, e: Ent| eng.f(e).role != "tank" && !enemy_tanks.iter().any(|&t| de(eng.f(t), eng.f(e)) < 110.0);
        let mut called: Option<f64> = None;
        let mut best = f64::NEG_INFINITY;
        for &e in &foes {
            let ee = self.f(e);
            let role_bonus = match ee.role.as_str() {
                "healer" => 1.5,
                "damage" => 1.2,
                "controller" => 0.9,
                "tank" => 0.0,
                _ => f64::NAN,
            };
            let mut score = (1.0 - ee.hp / ee.max_hp) * 2.2 + role_bonus - d(ee.x, ee.y, ff.x, ff.y) / 170.0;
            if !exposed(self, e) && ee.role != "tank" {
                score -= 0.6;
            }
            if posture.call == Some("healer") && ee.role == "healer" {
                score += 1.6;
            }
            if threats.contains(&ee.index) {
                score += 1.5;
            }
            if old.is_some_and(|o| o.called == ee.index) {
                score += 0.5;
            }
            if score > best {
                best = score;
                called = Some(ee.index);
            }
        }
        let posture_state = BattlePlansPosture::from_posture(&posture);
        let enemy_tank_indexes: Vec<f64> = enemy_tanks.iter().map(|&t| self.f(t).index).collect();
        let base = |slots: JsMap<BattlePlansSlots>, hold: Option<bool>, hurt: Option<f64>, alone: Option<bool>| BattlePlans {
            u: u.clone(),
            v: v.clone(),
            f_upper: BattlePlansF { x: ff.x, y: ff.y },
            b_upper: BattlePlansF { x: bb.x, y: bb.y },
            engaged,
            hold,
            called: called.unwrap_or(f64::NAN),
            threats: threats.clone(),
            slots,
            posture: posture_state.clone(),
            enemy_tanks: enemy_tank_indexes.clone(),
            hurt,
            alone,
        };
        if mine.len() == 1 {
            return Some(base(JsMap(Vec::new()), Some(false), None, Some(true)));
        }
        let mut slots: Vec<(f64, BattlePlansSlots)> = Vec::new();
        let spread = if mine.len() > 3 { 1.2 } else { 1.0 };
        let place = |eng: &Engine, slots: &mut Vec<(f64, BattlePlansSlots)>, f: Ent, back: f64, lateral: f64| {
            let s = BattlePlansSlots { x: eng.clamp_x(ff.x - u.x * back + v.x * lateral * spread), y: eng.clamp_y(ff.y - u.y * back + v.y * lateral * spread), back };
            let idx = eng.f(f).index;
            if let Some(slot) = slots.iter_mut().find(|(k, _)| *k == idx) {
                slot.1 = s;
            } else {
                slots.push((idx, s));
            }
        };
        let (mut g_tank, mut g_ranged, mut g_controller, mut g_healer, mut g_skirm) = (vec![], vec![], vec![], vec![], vec![]);
        for &f in &mine {
            match self.f(f).role.as_str() {
                "tank" => g_tank.push(f),
                "healer" => g_healer.push(f),
                "controller" => g_controller.push(f),
                _ if self.is_skirmisher(&Tgt::of(f)) => g_skirm.push(f),
                _ => g_ranged.push(f),
            }
        }
        let fan = |list: &[Ent], width: f64| -> Vec<(Ent, f64)> { list.iter().enumerate().map(|(i, &f)| (f, if list.len() > 1 { (i as f64 / (list.len() as f64 - 1.0) - 0.5) * width } else { 0.0 })).collect() };
        let has_tanks = !g_tank.is_empty();
        for (f, l) in fan(&g_tank, 80.0) {
            place(self, &mut slots, f, 0.0, l);
        }
        for (f, l) in fan(&g_ranged, 140.0) {
            place(self, &mut slots, f, if has_tanks { 95.0 } else { 30.0 }, l);
        }
        for (f, l) in fan(&g_controller, 110.0) {
            place(self, &mut slots, f, if has_tanks { 100.0 } else { 45.0 }, l + if g_ranged.len() == 1 { -50.0 } else { 0.0 });
        }
        for (f, l) in fan(&g_healer, 90.0) {
            place(self, &mut slots, f, if has_tanks { 145.0 } else { 90.0 }, l);
        }
        for (i, &f) in g_skirm.iter().enumerate() {
            place(self, &mut slots, f, 15.0, (if i % 2 != 0 { -1.0 } else { 1.0 }) * (110.0 + 20.0 * (i / 2) as f64));
        }
        for &f in &g_skirm {
            let fe = self.f(f);
            if fe.diving == Some(true) {
                let gone = match fe.dive_target.and_then(|t| super::queries::js_index(t, self.b.fighters.len())) {
                    None => true,
                    Some(i) => self.f(self.b.fighters[i]).hp <= 0.0,
                };
                if fe.hp < fe.max_hp * 0.45 || self.b.time - fe.dive_start.unwrap_or(f64::NAN) > 3.5 || gone {
                    let time = self.b.time;
                    let e = self.fm(f);
                    e.diving = Some(false);
                    e.dive_rest = Some(time + 4.0);
                }
                continue;
            }
            if posture.dive == "none" || self.b.time < fe.dive_rest.unwrap_or(0.0) || fe.hp < fe.max_hp * 0.6 {
                continue;
            }
            let mut prey: Vec<Ent> = foes.iter().copied().filter(|&e| self.f(e).role != "tank").collect();
            prey.sort_by(|&a, &b| {
                let v1 = if posture.dive == "flank" { (self.f(b).role == "healer") as i32 as f64 - (self.f(a).role == "healer") as i32 as f64 } else { 0.0 };
                js_cmp(if truthy(v1) { v1 } else { de(fe, self.f(a)) - de(fe, self.f(b)) })
            });
            let Some(&prey) = prey.first() else { continue };
            let mobile = fe.powers.iter().any(|p| consts::MOBILITY.contains(&p.id.as_str())) && fe.cast <= 0.0 && de(fe, self.f(prey)) < 300.0;
            if posture.dive == "all" || exposed(self, prey) || mobile {
                let (time, pi) = (self.b.time, self.f(prey).index);
                let e = self.fm(f);
                e.diving = Some(true);
                e.dive_start = Some(time);
                e.dive_target = Some(pi);
            }
        }
        // Integer-like keys iterate in ascending order in JavaScript.
        slots.sort_by(|a, b| js_cmp(a.0 - b.0));
        let slots = JsMap(slots.into_iter().map(|(k, s)| (js_key(k), s)).collect());
        let mut hurt: Vec<Ent> = mine.iter().copied().filter(|&f| self.f(f).hp < self.f(f).max_hp * 0.6).collect();
        hurt.sort_by(|&a, &b| js_cmp(self.f(a).hp / self.f(a).max_hp - self.f(b).hp / self.f(b).max_hp));
        let hurt = hurt.first().map(|&f| self.f(f).index);
        Some(base(slots, hold, hurt, None))
    }
}

/// `fissureReach(z, p).inside`
pub fn fissure_inside(zx: f64, zy: f64, angle: f64, length: f64, width: f64, px: f64, py: f64, radius: f64) -> bool {
    let (ux, uy) = (jsmath::cos(angle), jsmath::sin(angle));
    let (rx, ry) = (px - zx, py - zy);
    let along = rx * ux + ry * uy;
    along >= -radius && along <= length + radius && (rx * -uy + ry * ux).abs() <= width / 2.0 + radius
}

/// `a > b` for plan scores, where a missing score is `undefined` (every comparison with it is false).
fn gt(a: Option<f64>, b: Option<f64>) -> bool {
    matches!((a, b), (Some(a), Some(b)) if a > b)
}

impl BattlePlansPosture {
    pub fn from_posture(p: &Posture) -> BattlePlansPosture {
        BattlePlansPosture { dive: p.dive.to_string(), leash: p.leash, peel: p.peel, pull: p.pull, strafe: p.strafe, call: p.call.map(|s| s.to_string()), hold: p.hold }
    }
}

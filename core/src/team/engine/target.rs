//! Targeting: `chooseTarget` and `fight` (depth in the team-4.0 prototype chain in each doc line).
//! With a team brain (always, in team-4.0) `chooseTarget` runs d19 (taunts; defending the Core) → d18 (flank lanes)
//! → d17 (the plan picks fighters, the Titan or the enemy Core); fighters are picked by `fight`, which runs the
//! formation chooser (d8 → d6) with only fighters in view and an optional filter. The d11 and d10 versions never run.
use super::consts::{brain_rules, team_rules};
use super::queries::{d, de, js_index};
use super::{Engine, TargetFilter, Tgt};
use crate::jsmath::max;
use crate::team::jsnum::Ent;
use crate::team::state::{EntityLaneWaypoint, NumOrStr};

impl Engine {
    /// The filters `fight()` is given in d17.
    pub(crate) fn filter_accepts(&self, filter: &TargetFilter, e: Ent) -> bool {
        let ee = self.f(e);
        if ee.is_objective == Some(true) {
            return false;
        }
        match filter {
            &TargetFilter::NearCore(core) => d(ee.x, ee.y, self.f(core).x, self.f(core).y) < brain_rules::DEFEND_RANGE + 60.0,
            TargetFilter::NearPit => {
                let pit = self.pit();
                d(ee.x, ee.y, pit.x, pit.y) < brain_rules::PIT_RADIUS + 60.0
            }
            TargetFilter::SiegeGuard { hitters, core, me } => {
                let (c, m) = (self.f(*core), self.f(*me));
                hitters.contains(&Some(ee.index)) && de(ee, c) < super::siege_ai::GUARD_RANGE || de(ee, m) < super::siege_ai::CLOSE_GUARD
            }
        }
    }

    /// d17 `fight(f, filter = null)`: pick an enemy fighter the formation way.
    pub fn fight(&mut self, f: Ent, filter: Option<TargetFilter>) -> Option<Ent> {
        let previous = (self.tr.selecting_fight, self.tr.target_filter.clone());
        self.tr.selecting_fight = true;
        self.tr.target_filter = filter;
        let t = self.choose_target_d8(f);
        (self.tr.selecting_fight, self.tr.target_filter) = previous;
        t
    }

    /// `chooseTarget(f)` from the top: d22 (fight back) over d19; classic games go straight to d8.
    pub fn choose_target(&mut self, f: Ent) -> Option<Ent> {
        if self.classic {
            return self.choose_target_d8(f);
        }
        let t = self.choose_target_d19(f);
        self.siege_ai_target(f, t)
    }

    /// d19: taunts, defending the Core, then the plan's choice.
    fn choose_target_d19(&mut self, f: Ent) -> Option<Ent> {
        let fe = self.f(f);
        let taunt = fe.taunt_source.and_then(|i| self.actor_for(i));
        if fe.taunt_time > 0.0 && taunt.is_some_and(|t| self.f(t).hp > 0.0) {
            return taunt;
        }
        if self.b.brain[fe.team as usize].plan == "defend" || self.on_duty(f) {
            if let Some(t) = self.defend_target(f) {
                self.fm(f).lane_waypoint = None;
                return Some(t);
            }
        }
        // d18: flankers on a siege approach along a lane.
        let t = self.choose_target_d17(f);
        let fe = self.f(f);
        let team = fe.team as usize;
        let flank = self.game_plan(team).1 == "flank"
            && self.b.brain[team].plan == "siege"
            && t == Some(self.b.cores[1 - team])
            && (self.is_skirmisher(&Tgt::of(f)) || fe.role == "controller");
        if flank {
            let pit = self.pit();
            let lane = if fe.index % 2.0 != 0.0 { 120.0 } else { 480.0 };
            let ahead = if fe.team != 0.0 { fe.x < pit.x } else { fe.x > pit.x };
            let waypoint = if !ahead && (fe.y - lane).abs() > 60.0 { Some(EntityLaneWaypoint { x: pit.x + if fe.team != 0.0 { 120.0 } else { -120.0 }, y: lane }) } else { None };
            self.fm(f).lane_waypoint = waypoint;
        } else {
            self.fm(f).lane_waypoint = None;
        }
        t
    }

    /// d17: the team plan decides what is worth fighting.
    fn choose_target_d17(&mut self, f: Ent) -> Option<Ent> {
        let fe = self.f(f);
        let taunt = fe.taunt_source.and_then(|i| self.actor_for(i));
        if fe.taunt_time > 0.0 && taunt.is_some_and(|t| self.f(t).hp > 0.0) {
            return taunt;
        }
        let team = fe.team;
        let plan = self.b.brain[team as usize].plan.clone();
        let (titan, core, own_core) = ((*self.b.titan), self.b.cores[1 - team as usize], self.b.cores[team as usize]);
        let near = |s: &Engine, r: f64| s.b.combatants.iter().any(|&e| {
            let ee = s.f(e);
            ee.team != team && ee.hp > 0.0 && de(ee, s.f(f)) < r
        });
        match plan.as_str() {
            "defend" => return self.fight(f, Some(TargetFilter::NearCore(own_core))).or_else(|| self.fight(f, None)),
            "regroup" | "hold" => return self.fight(f, None),
            "siege" => {
                let ce = self.f(core);
                let close = fe.role == "damage" && de(fe, ce) < fe.weapon.range + 20.0;
                return if ce.hp > 0.0 && (!near(self, brain_rules::FIGHT_RANGE) || close) { Some(core) } else { self.fight(f, None) };
            }
            "flank" => return self.fight(f, Some(TargetFilter::NearPit)).or_else(|| self.fight(f, None)),
            _ => {}
        }
        let te = self.f(titan);
        if plan == "steal" && te.hp > 0.0 && de(fe, te) < brain_rules::STEAL_REACH && (fe.weapon.type_ != "melee" || self.is_skirmisher(&Tgt::of(f))) {
            return Some(titan);
        }
        if (plan == "contest" || plan == "steal") && te.hp > 0.0 && !near(self, brain_rules::FIGHT_RANGE - 10.0) {
            return Some(titan);
        }
        self.fight(f, None).or_else(|| (self.f(core).hp > 0.0).then_some(core))
    }

    /// d8: a taunted fighter attacks its taunter.
    fn choose_target_d8(&mut self, f: Ent) -> Option<Ent> {
        let fe = self.f(f);
        let taunt = fe.taunt_source.and_then(|i| js_index(i, self.b.fighters.len())).map(|i| self.b.fighters[i]);
        if fe.taunt_time > 0.0 && taunt.is_some_and(|t| self.f(t).hp > 0.0) {
            return taunt;
        }
        self.choose_target_d6(f)
    }

    /// d6: the formation's choice: near, hurt, high-value foes; peel for the back line; focus the called target;
    /// stay within reach of the slot.
    fn choose_target_d6(&mut self, f: Ent) -> Option<Ent> {
        let enemies = self.enemies_of(f);
        if enemies.is_empty() {
            return None;
        }
        let fe = self.f(f);
        let team = fe.team as usize;
        let tactic = self.b.tactics[team].as_str();
        let plan = self.b.plans.get(team).and_then(|p| p.as_ref());
        let index_key = super::movement::js_key(fe.index);
        let slot = plan.and_then(|p| p.slots.get(&index_key)).map(|s| (s.x, s.y)).unwrap_or((fe.x, fe.y));
        let ranged = fe.weapon.type_ != "melee";
        if fe.diving == Some(true) {
            if let Some(t) = fe.dive_target.and_then(|i| js_index(i, self.b.fighters.len())).map(|i| self.b.fighters[i]) {
                if self.f(t).hp > 0.0 {
                    return Some(t);
                }
            }
        }
        let mut best = None;
        let mut best_score = f64::NEG_INFINITY;
        for &e in &enemies {
            let ee = self.f(e);
            let dd = de(fe, ee);
            let mut score = -dd / if tactic == "aggressive" { 90.0 } else { 60.0 } + (1.0 - ee.hp / ee.max_hp) * 2.4;
            if fe.role == "damage" || fe.role == "controller" {
                score += match ee.role.as_str() {
                    "healer" => 1.4,
                    "controller" => 0.8,
                    "damage" => 0.6,
                    "tank" => -1.1,
                    _ => f64::NAN,
                };
            }
            if fe.role == "tank" {
                score += if ee.role == "tank" { -0.4 } else { 0.3 };
            }
            // `this.fighters[e.target]` (a string key indexes the array the same way).
            let victim = match &ee.target {
                Some(NumOrStr::Num(i)) => js_index(*i, self.b.fighters.len()),
                Some(NumOrStr::Str(s)) => s.parse::<f64>().ok().and_then(|i| js_index(i, self.b.fighters.len())),
                None => None,
            }
            .map(|i| self.b.fighters[i]);
            if let Some(v) = victim {
                let ve = self.f(v);
                if ve.team == fe.team && v != f && ve.role != "tank" && de(ee, ve) < ee.weapon.range + 60.0 {
                    score += (if fe.role == "tank" || fe.role == "controller" { 2.0 } else { 0.6 }) + if tactic == "protect-carry" { 1.5 } else { 0.0 };
                }
            }
            if ee.role == "tank" && dd < team_rules::PROVOKE_RANGE {
                score += team_rules::PROVOKE_SCORE;
            }
            if ee.invisible > 0.0 && !(fe.insight != 0.0 && !fe.insight.is_nan()) {
                score -= 1.5;
            }
            if matches!(fe.target, Some(NumOrStr::Num(i)) if i == ee.index) {
                score += 0.8;
            }
            if let Some(p) = plan {
                if ee.index == p.called {
                    score += if fe.role == "tank" { 0.6 } else { 1.2 };
                }
                if p.threats.contains(&ee.index) {
                    score += (if fe.role == "tank" || fe.role == "controller" { 2.5 } else { 1.2 }) * p.posture.peel;
                }
                let reach = if ranged {
                    fe.weapon.range + 40.0
                } else if fe.role == "tank" {
                    p.posture.leash + 60.0
                } else {
                    140.0
                };
                score -= max(0.0, d(slot.0, slot.1, ee.x, ee.y) - reach) / 70.0;
                if ranged && !self.clear_shot(fe.x, fe.y, ee.x, ee.y) {
                    score -= 1.5;
                }
            }
            if score > best_score {
                best_score = score;
                best = Some(e);
            }
        }
        best
    }
}

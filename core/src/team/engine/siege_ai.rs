//! Core siege fighters that fight back (`public/siege-ai-combat.js`, d22 of team-4.0): retaliation, peeling for the
//! back line, sieging with care, and when a team may siege at all.
use super::queries::{de, js_index};
use super::{Engine, TargetFilter, Tgt};
use crate::team::jsnum::Ent;
use crate::team::state::Entity;

const MEMORY: f64 = 1.5;
const REACH: f64 = 120.0;
const PEEL: f64 = 260.0;
const FINISH_CORE: f64 = 0.15;
pub(super) const GUARD_RANGE: f64 = 420.0;
pub(super) const CLOSE_GUARD: f64 = 120.0;
pub(super) const SIEGE_ANYWAY: f64 = 200.0;

fn back_liner(f: &Entity) -> bool {
    f.role == "healer" || f.role == "controller" || f.role == "damage" && f.weapon.type_ != "melee"
}

impl Engine {
    /// d22 `hurt`: a fighter hit by an enemy fighter remembers when.
    pub fn hurt(&mut self, t: &Tgt, f: Option<Ent>, amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        if self.classic {
            return self.cast_hurt(t, f, amount, kind, can_dodge);
        }
        let before = self.thp(t);
        let result = self.cast_hurt(t, f, amount, kind, can_dodge);
        if let Some(fi) = f.filter(|&fi| t.is_plain() && fi != t.ent) {
            let (te, fe) = (self.f(t.ent), self.f(fi));
            if te.is_objective != Some(true) && fe.is_objective != Some(true) && fe.team != te.team && te.hp < before {
                let time = self.b.time;
                self.fm(t.ent).last_hit_at = Some(time);
            }
        }
        result
    }

    /// d22 `attackerOf(f, reach)`: the enemy fighter that hit `f` in the last moments, if alive and within `reach`.
    fn attacker_of(&self, f: Ent, reach: f64) -> Option<Ent> {
        let fe = self.f(f);
        let a = fe.last_attacker.and_then(|i| js_index(i, self.combatants().len())).map(|i| self.combatants()[i])?;
        let ae = self.f(a);
        (ae.hp > 0.0 && ae.team != fe.team && self.b.time - fe.last_hit_at.unwrap_or(f64::NEG_INFINITY) <= MEMORY && de(ae, fe) <= reach).then_some(a)
    }

    /// d22 `chooseTarget(f)`, after d19 picked `t`: retaliate, peel, then siege with care.
    pub(super) fn siege_ai_target(&mut self, f: Ent, t: Option<Ent>) -> Option<Ent> {
        let fe = self.f(f);
        if fe.taunt_time > 0.0 && fe.taunt_source.and_then(|i| self.actor_for(i)).is_some_and(|x| self.f(x).hp > 0.0) {
            return t;
        }
        let team = fe.team;
        let core = self.b.cores[1 - team as usize];
        if t == Some(core) && self.f(core).hp < self.f(core).max_hp * FINISH_CORE {
            return t;
        }
        if fe.role != "healer" {
            if let Some(a) = self.attacker_of(f, fe.weapon.range + REACH) {
                self.fm(f).lane_waypoint = None;
                return Some(a);
            }
        }
        let fe = self.f(f);
        let on_objective = t.is_some_and(|x| self.f(x).is_objective == Some(true));
        if fe.role == "tank" || fe.weapon.type_ == "melee" && fe.role != "healer" && on_objective {
            let mut best = None;
            let mut best_d = f64::INFINITY;
            for i in 0..self.combatants().len() {
                let ally = self.combatants()[i];
                let (ae, fe) = (self.f(ally), self.f(f));
                if ally == f || ae.team != team || ae.hp <= 0.0 || !back_liner(ae) || de(ae, fe) > PEEL {
                    continue;
                }
                if let Some(a) = self.attacker_of(ally, f64::INFINITY) {
                    let dist = de(self.f(a), self.f(f));
                    if dist < best_d {
                        best_d = dist;
                        best = Some(a);
                    }
                }
            }
            if best.is_some() {
                self.fm(f).lane_waypoint = None;
                return best;
            }
        }
        if t == Some(core) {
            let time = self.b.time;
            let hitters: Vec<Option<f64>> = self
                .combatants()
                .iter()
                .filter(|&&a| {
                    let ae = self.f(a);
                    ae.team == team && ae.hp > 0.0 && time - ae.last_hit_at.unwrap_or(f64::NEG_INFINITY) <= MEMORY
                })
                .map(|&a| self.f(a).last_attacker)
                .collect();
            let filter = TargetFilter::SiegeGuard { hitters, core, me: f };
            let guarded = self.combatants().iter().any(|&e| self.f(e).team != team && self.f(e).hp > 0.0 && self.filter_accepts(&filter, e));
            if guarded {
                let pick = self.fight(f, Some(filter)).or(t);
                self.fm(f).lane_waypoint = None;
                return pick;
            }
        }
        t
    }
}

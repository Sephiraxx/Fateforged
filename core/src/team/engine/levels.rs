//! Levels and Ember Wisps in Core siege (`public/level-combat.js`, d24 of team-4.0): XP from kills, assists, the
//! Titan and two neutral wisps; each level adds damage, healing, health and speed.
use super::movement::js_cmp;
use super::queries::{de as d, js_index};
use super::Engine;
use super::Tgt;
use crate::jsmath::min;
use crate::team::jsnum::Ent;

const XP: [f64; 6] = [0.0, 200.0, 450.0, 750.0, 1100.0, 1500.0];
const KILL: f64 = 120.0;
const ASSIST: f64 = 60.0;
const ASSIST_WINDOW: f64 = 5.0;
const TITAN: f64 = 150.0;
const CAMP: f64 = 70.0;
const CATCH_UP: f64 = 0.25;
const DAMAGE: f64 = 0.06;
const HEALING: f64 = 0.06;
const HP: f64 = 0.07;
const MOVE: f64 = 0.02;
const LEVEL_HEAL: f64 = 0.2;
// CAMP_RULES
const RESPAWN: f64 = 45.0;
const HIT: f64 = 0.04;
const INTERVAL: f64 = 1.5;
const RESET: f64 = 6.0;
const MEMORY: f64 = 3.0;
const REACH: f64 = 180.0;
const ENGAGE: f64 = 260.0;
const CALL: f64 = 700.0;
const GUARD: f64 = 400.0;
const HOME: f64 = 400.0;
const TITAN_SOON: f64 = 8.0;
const NEVER: f64 = -1e9;
const CAMP_PLANS: [&str; 3] = ["hold", "flank", "regroup"];

/// `levelFor(xp)`
fn level_for(xp: f64) -> f64 {
    let mut level = 1usize;
    while level < XP.len() && xp >= XP[level] {
        level += 1;
    }
    level as f64
}
/// `bonus(f, per)`: `1 + per * (level - 1)`
fn bonus(level: f64, per: f64) -> f64 {
    1.0 + per * (level - 1.0)
}

impl Engine {
    fn level(&self, f: Ent) -> f64 {
        self.f(f).level.unwrap_or(1.0)
    }
    fn levels_on(&self) -> bool {
        !self.classic && self.b.camps.present().is_some()
    }
    fn camps(&self) -> Vec<Ent> {
        self.b.camps.present().map(|v| v.clone()).unwrap_or_default()
    }

    /// d24 `teamLevel(team)`
    pub fn team_level(&self, team: f64) -> f64 {
        let mine: Vec<Ent> = self.combatants().iter().copied().filter(|&f| self.f(f).team == team).collect();
        mine.iter().fold(0.0, |n, &f| n + self.level(f)) / mine.len() as f64
    }

    /// d24 `gainXp(f, amount)`
    fn gain_xp(&mut self, f: Ent, amount: f64) {
        let xp = self.f(f).xp.unwrap_or(0.0) + amount;
        self.fm(f).xp = Some(xp);
        let level = level_for(xp);
        let old_level = self.level(f);
        if level <= old_level {
            return;
        }
        let e = self.fm(f);
        let old = e.max_hp;
        e.max_hp *= bonus(level, HP) / bonus(old_level, HP);
        e.level = Some(level);
        if e.hp > 0.0 {
            e.hp = min(e.max_hp, e.hp + e.max_hp - old + e.max_hp * LEVEL_HEAL);
        }
    }

    /// d24 `hurt`: fighters deal more damage per level; hits on enemy fighters and wisps are remembered.
    pub fn hurt(&mut self, t: &Tgt, f: Option<Ent>, mut amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        if !self.levels_on() {
            return self.siege_hurt(t, f, amount, kind, can_dodge);
        }
        let fighter = f.filter(|&fi| self.f(fi).is_objective != Some(true));
        if let Some(fi) = fighter {
            amount *= bonus(self.level(fi), DAMAGE);
        }
        let before = self.thp(t);
        let result = self.siege_hurt(t, f, amount, kind, can_dodge);
        if let Some(fi) = fighter {
            if self.thp(t) < before {
                let time = self.b.time;
                if t.is_plain() && self.camps().contains(&t.ent) {
                    let index = self.f(fi).index;
                    let c = self.fm(t.ent);
                    c.last_hit_at = Some(time);
                    c.hitter = Some(index);
                    if before > 0.0 && self.f(t.ent).hp <= 0.0 {
                        self.clear_camp(t.ent, fi);
                    }
                } else if !self.t_is_objective(t) && self.f(t.ent).team != self.f(fi).team {
                    let index = self.f(fi).index as usize;
                    if let Some(slot) = self.fm(t.ent).hit_by.as_mut().and_then(|v| v.get_mut(index)) {
                        *slot = time;
                    }
                }
            }
        }
        result
    }

    /// d24 `clearCamp(c, f)`
    fn clear_camp(&mut self, c: Ent, f: Ent) {
        let time = self.b.time;
        {
            let e = self.fm(c);
            e.respawn_at = Some(time + RESPAWN);
            e.hitter = Some(-1.0);
        }
        let team = self.f(f).team;
        if self.b.camp_kills.is_some() {
            self.b.camp_kills[team as usize] += 1.0;
        }
        for a in self.combatants().clone() {
            if self.f(a).team == team && self.f(a).hp > 0.0 {
                self.gain_xp(a, CAMP);
            }
        }
    }

    /// d24 `heal`: healing grows with the healer's level.
    pub(super) fn level_heal(&self, f: Ent, amount: f64) -> f64 {
        if !self.levels_on() {
            return amount;
        }
        let source = self.tr.heal_source.unwrap_or(f);
        amount * bonus(self.level(source), HEALING)
    }

    /// d24 `upkeep` (after the rest): speed per level.
    pub(super) fn level_upkeep(&mut self, f: Ent) {
        if !self.levels_on() {
            return;
        }
        let level = self.level(f);
        if level > 1.0 {
            self.fm(f).move_ *= bonus(level, MOVE);
        }
    }

    /// d24 `respawn` (after the rest)
    pub(super) fn level_respawn(&mut self, f: Ent) {
        if !self.levels_on() {
            return;
        }
        let e = self.fm(f);
        e.xp_down = Some(false);
        if let Some(v) = e.hit_by.as_mut() {
            for x in v.iter_mut() {
                *x = NEVER;
            }
        }
    }

    /// d24 `objectiveStep` (after the rest, when the game goes on): kill XP, Titan XP, the wisps.
    pub(super) fn level_step(&mut self) {
        if !self.levels_on() || self.b.done {
            return;
        }
        let time = self.b.time;
        let list = self.combatants().clone();
        for &v in &list {
            if self.f(v).hp > 0.0 || self.f(v).xp_down == Some(true) {
                continue;
            }
            self.fm(v).xp_down = Some(true);
            let Some(k) = self.f(v).last_attacker.and_then(|i| js_index(i, list.len())).map(|i| list[i]) else { continue };
            if self.f(k).team == self.f(v).team {
                continue;
            }
            let catch_up = if self.level(v) > self.level(k) { 1.0 + CATCH_UP } else { 1.0 };
            self.gain_xp(k, KILL * catch_up);
            for &a in &list {
                let ae = self.f(a);
                if a != k && ae.team == self.f(k).team && ae.hp > 0.0 {
                    let hit = self.f(v).hit_by.as_ref().and_then(|h| h.get(ae.index as usize).copied()).unwrap_or(f64::NAN);
                    if time - hit <= ASSIST_WINDOW {
                        self.gain_xp(a, ASSIST);
                    }
                }
            }
        }
        while (*self.b.titan_xp) < self.b.titan_deaths.len() as f64 {
            let team = self.b.titan_deaths[(*self.b.titan_xp) as usize].team;
            (*self.b.titan_xp) += 1.0;
            for &a in &list {
                if self.f(a).team == team && self.f(a).hp > 0.0 {
                    self.gain_xp(a, TITAN);
                }
            }
        }
        for c in self.camps() {
            if self.f(c).hp <= 0.0 {
                if time >= self.f(c).respawn_at.unwrap_or(f64::NAN) {
                    let e = self.fm(c);
                    e.hp = e.max_hp;
                    e.last_hit_at = Some(NEVER);
                    e.hitter = Some(-1.0);
                    e.next_pulse = Some(time + INTERVAL);
                }
                continue;
            }
            {
                let e = self.fm(c);
                if time - e.last_hit_at.unwrap_or(f64::NAN) > RESET && e.hp < e.max_hp {
                    e.hp = e.max_hp;
                    e.hitter = Some(-1.0);
                }
            }
            if time < self.f(c).next_pulse.unwrap_or(f64::NAN) {
                continue;
            }
            self.fm(c).next_pulse = Some(time + INTERVAL);
            let hitter = self.f(c).hitter.unwrap_or(-1.0);
            let Some(a) = js_index(hitter, list.len()).map(|i| list[i]) else { continue };
            let (ae, ce) = (self.f(a), self.f(c));
            if ae.hp > 0.0 && d(ae, ce) <= REACH && time - ce.last_hit_at.unwrap_or(f64::NAN) <= MEMORY {
                let amount = ae.max_hp * HIT;
                self.hurt(&Tgt::of(a), Some(c), amount, "arcane", false);
            }
        }
    }

    /// d24 `campTarget(f, t)`: a wisp for this fighter, when nothing presses it and its team sends it.
    fn camp_target(&self, f: Ent, t: Option<Ent>) -> Option<Ent> {
        let fe = self.f(f);
        if fe.role == "healer" || fe.taunt_time > 0.0 {
            return None;
        }
        if let Some(te) = t.map(|x| self.f(x)) {
            if te.is_objective != Some(true) && te.team != fe.team && d(te, fe) <= ENGAGE {
                return None;
            }
        }
        let team = fe.team as usize;
        let dial = self.camp_dial(team);
        let plan = self.b.brain[team].plan.as_str();
        if dial == "never" || plan == "defend" || self.has_forgefire(fe.team) {
            return None;
        }
        if dial == "behind" && self.team_level(fe.team) > self.team_level(1.0 - fe.team) {
            return None;
        }
        let own = self.b.cores[team];
        if self.combatants().iter().any(|&e| self.f(e).team != fe.team && self.f(e).hp > 0.0 && d(self.f(e), self.f(own)) < GUARD) {
            return None;
        }
        let mut up: Vec<Ent> = self.camps().into_iter().filter(|&c| self.f(c).hp > 0.0).collect();
        up.sort_by(|&a, &b| js_cmp(d(self.f(a), fe) - d(self.f(b), fe)).then(js_cmp(self.f(a).index - self.f(b).index)));
        let camp = *up.first()?;
        if d(self.f(camp), fe) > CALL {
            return None;
        }
        let home = (self.f(camp).x - self.f(own).x).abs() < HOME;
        let titan = *self.b.titan;
        let titan_soon = self.f(titan).hp > 0.0 || (*self.b.next_titan) - self.b.time <= TITAN_SOON;
        if !home && !(CAMP_PLANS.contains(&plan) || plan == "contest" && !titan_soon) {
            return None;
        }
        let mut crew: Vec<Ent> = self.combatants().iter().copied().filter(|&a| self.f(a).team == fe.team && self.f(a).hp > 0.0 && self.f(a).role != "healer").collect();
        crew.sort_by(|&a, &b| js_cmp(d(self.f(a), self.f(camp)) - d(self.f(b), self.f(camp))).then(js_cmp(self.f(a).index - self.f(b).index)));
        crew.truncate(if self.b.size == 3.0 { 2 } else { 3 });
        crew.contains(&f).then_some(camp)
    }

    /// d24 `chooseTarget(f)`, after d22: a wisp when the team sends this fighter.
    pub(super) fn level_target(&mut self, f: Ent, t: Option<Ent>) -> Option<Ent> {
        if !self.levels_on() {
            return t;
        }
        match self.camp_target(f, t) {
            None => t,
            Some(camp) => {
                self.fm(f).lane_waypoint = None;
                Some(camp)
            }
        }
    }
}

impl Engine {
    /// The coach's Ember Wisp dial (`gamePlan(team).camp ?? 'behind'`).
    fn camp_dial(&self, team: usize) -> &str {
        self.b.game_plans[team].camp.as_deref().unwrap_or("behind")
    }
}

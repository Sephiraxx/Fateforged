//! Lists, points and simple checks the other methods build on. Each function names the JavaScript layer(s) it ports
//! (depth in the team-4.0 prototype chain).
use super::consts::{self, Posture};
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, min};
use crate::team::geometry::{clamp, segment_distance};
use crate::team::jsnum::Ent;
use crate::team::state::Entity;

/// `d(a, b)` / `dist(a, b)`: `Math.hypot(a.x - b.x, a.y - b.y)`.
#[inline]
pub fn d(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    hypot2(ax - bx, ay - by)
}
#[inline]
pub fn de(a: &Entity, b: &Entity) -> f64 {
    hypot2(a.x - b.x, a.y - b.y)
}

/// A JavaScript array index: an integer-valued number within the array (`arr[i]` is otherwise undefined).
#[inline]
pub fn js_index(v: f64, len: usize) -> Option<usize> {
    if v >= 0.0 && v.fract() == 0.0 && v < len as f64 {
        Some(v as usize)
    } else {
        None
    }
}

/// A point `{x, y}`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Pt {
    pub x: f64,
    pub y: f64,
}

impl Engine {
    /// d12 `actorFor(index)`: `combatants[index] ?? actors.find(a => a.index === index) ?? fighters[index]`.
    pub fn actor_for(&self, index: f64) -> Option<Ent> {
        if let Some(i) = js_index(index, self.combatants().len()) {
            return Some(self.combatants()[i]);
        }
        if let Some(a) = self.b.actors.iter().find(|a| self.f(**a).index == index) {
            return Some(*a);
        }
        js_index(index, self.b.fighters.len()).map(|i| self.b.fighters[i])
    }

    /// `this.combatants`: the fighters without the Cores and the Titan (Core siege); classic battles have only
    /// fighters.
    #[inline]
    pub fn combatants(&self) -> &Vec<Ent> {
        self.b.combatants.present().unwrap_or(&self.b.fighters)
    }

    /// d12 `alliesOf(f, self = false)` over `combatants`.
    pub fn allies_of(&self, f: Ent, include_self: bool) -> Vec<Ent> {
        let team = self.f(f).team;
        self.combatants().iter().copied().filter(|&a| self.f(a).team == team && self.f(a).hp > 0.0 && (include_self || a != f)).collect()
    }

    /// d5 `enemiesOf(f)` → d12: living foes, plus the enemy Cores and the Titan unless a fight is being picked; then
    /// the fight's target filter, when one is installed.
    pub fn enemies_of(&self, f: Ent) -> Vec<Ent> {
        let team = self.f(f).team;
        let mut foes: Vec<Ent> = self.combatants().iter().copied().filter(|&a| self.f(a).team != team && self.f(a).hp > 0.0).collect();
        if !self.classic && *self.b.objective_mode && !self.tr.selecting_fight {
            foes.extend(self.b.actors.iter().copied().filter(|&a| self.f(a).team != team && self.f(a).hp > 0.0));
        }
        match &self.tr.target_filter {
            None => foes,
            Some(filter) => foes.into_iter().filter(|&e| self.target_filter_accepts(filter, e)).collect(),
        }
    }

    pub(crate) fn target_filter_accepts(&self, filter: &super::TargetFilter, e: Ent) -> bool {
        self.filter_accepts(filter, e)
    }

    /// d16 `ownerTeam(object)`: `this.fighters[object.owner]?.team`.
    pub fn owner_team(&self, owner: f64) -> Option<f64> {
        js_index(owner, self.b.fighters.len()).map(|i| self.f(self.b.fighters[i]).team)
    }

    /// d5 `pit()`
    pub fn pit(&self) -> Pt {
        Pt { x: 640.0, y: 300.0 }
    }
    /// d5 `base(team)`
    pub fn base(&self, team: f64) -> Pt {
        Pt { x: if team != 0.0 { self.b.width - 130.0 } else { 130.0 }, y: 300.0 }
    }
    /// d5 `choke(team)`
    pub fn choke(&self, team: f64) -> Pt {
        Pt { x: if team != 0.0 { self.b.width - 420.0 } else { 420.0 }, y: 300.0 }
    }

    /// d16 `centroid(list)`: the mean position (summed left to right), or the field centre for an empty list.
    pub fn centroid(&self, list: &[Ent]) -> Pt {
        if list.is_empty() {
            return Pt { x: self.b.center.x, y: self.b.center.y };
        }
        let n = list.len() as f64;
        let sx = list.iter().fold(0.0, |s, &f| s + self.f(f).x);
        let sy = list.iter().fold(0.0, |s, &f| s + self.f(f).y);
        Pt { x: sx / n, y: sy / n }
    }

    /// d7 `empowered(f)`: alive and holding Forgefire.
    pub fn empowered(&self, f: Ent) -> bool {
        let e = self.f(f);
        e.hp > 0.0 && e.forgefire_until.unwrap_or(0.0) > self.b.time
    }
    /// d7 `hasForgefire(team)`
    pub fn has_forgefire(&self, team: f64) -> bool {
        self.combatants().iter().any(|&f| self.f(f).team == team && self.empowered(f))
    }

    /// d16 `clampX(x)` / `clampY(y)`
    #[inline]
    pub fn clamp_x(&self, x: f64) -> f64 {
        clamp(x, 18.0, self.b.width - 18.0)
    }
    #[inline]
    pub fn clamp_y(&self, y: f64) -> f64 {
        clamp(y, 18.0, self.b.height - 18.0)
    }

    /// d16 `clearShot(a, b)`: no obstacle within 3 of the segment.
    pub fn clear_shot(&self, ax: f64, ay: f64, bx: f64, by: f64) -> bool {
        !self.b.obstacles.iter().any(|o| segment_distance(o.x, o.y, ax, ay, bx, by) < o.radius + 3.0)
    }

    /// d16 `isSkirmisher(f)`: a melee damage dealer (a stand-in's weapon may be turned to melee).
    pub fn is_skirmisher(&self, f: &Tgt) -> bool {
        self.f(f.ent).role == "damage" && self.t_weapon_type(f) == "melee"
    }

    /// d5 `guardCount(core)` → d12: defenders near the Core, or 0 when attackers outnumber them.
    pub fn guard_count(&self, core: Ent) -> f64 {
        let c = self.f(core);
        let r = self.b.objective_rules.guard_radius;
        let near = |team_eq: bool| {
            self.combatants().iter().filter(|&&f| (self.f(f).team == c.team) == team_eq && self.f(f).hp > 0.0 && de(self.f(f), c) <= r).count() as f64
        };
        let defenders = near(true);
        let attackers = near(false);
        if defenders >= attackers {
            defenders
        } else {
            0.0
        }
    }

    /// d3 `intruders(team)`: living foes within the backdoor intrusion radius of the team's Core.
    pub fn intruders(&self, team: f64) -> Vec<Ent> {
        let core = self.f(self.b.cores[team as usize]);
        let r = self.b.backdoor_rules.intrusion;
        self.combatants().iter().copied().filter(|&e| self.f(e).team != team && self.f(e).hp > 0.0 && de(self.f(e), core) < r).collect()
    }

    /// d1 `touching(f)`: the first obstacle the fighter is pressed against.
    pub fn touching(&self, f: Ent) -> Option<usize> {
        let e = self.f(f);
        self.b.obstacles.iter().position(|o| d(e.x, e.y, o.x, o.y) < o.radius + e.radius + consts::unstick::TOUCH)
    }

    /// d12 `respawnDelay()`
    pub fn respawn_delay(&self) -> f64 {
        8.0 + 12.0 * min(1.0, self.b.time / 300.0)
    }

    /// d18 `preferredRange(f)`
    pub fn preferred_range(&self, f: Ent) -> f64 {
        let e = self.f(f);
        if e.weapon.type_ == "melee" {
            e.weapon.range * 0.76
        } else {
            min(e.weapon.range * 0.83, 165.0 + e.tactics * 22.0)
        }
    }

    /// d4 `posture(team)` → d16: the siege posture of the team's tactic.
    pub fn posture(&self, team: f64) -> Posture {
        let tactic = &self.b.tactics[team as usize];
        // Classic teamfight has no d18 (the siege postures).
        if self.classic {
            return consts::team_posture(tactic).expect("a known tactic");
        }
        consts::siege_posture(tactic).or_else(|| consts::team_posture(tactic)).expect("a known tactic")
    }

    /// d20 `aim(f, t, speed)` → d21: lead the target; insight aims at its velocity, blindness and amnesia shake it.
    pub fn aim(&mut self, fx: f64, fy: f64, f: Ent, t: &Tgt, speed: f64) -> f64 {
        let (tx, ty, tvx, tvy) = (self.tx(t), self.ty(t), self.tvx(t), self.tvy(t));
        let fe = self.f(f);
        let mut angle = if fe.insight > 0.0 {
            let lead = hypot2(tx - fx, ty - fy) / speed;
            jsmath::atan2(ty + tvy * lead - fy, tx + tvx * lead - fx)
        } else {
            let lead = hypot2(tx - fx, ty - fy) / speed * (0.45 + 0.5 * fe.tactics);
            jsmath::atan2(ty + tvy * lead - fy, tx + tvx * lead - fx)
        };
        let shaken = fe.blind > 0.0 || fe.amnesia > 0.0 || (self.f(t.ent).invisible > 0.0 && !(fe.insight != 0.0));
        if shaken {
            angle += (self.rng() - 0.5) * 1.1;
        }
        angle
    }

    /// d18 `powerCost(p)` under d17 (`p.cost ?? …`).
    pub fn power_cost(&self, id: &str, cost: Option<f64>, rarity: &str) -> f64 {
        if let Some(c) = cost {
            return c;
        }
        if id == "memory" {
            return self.b.rules.memory_cost;
        }
        if id == "light" || id == "future" {
            return 12.0;
        }
        if ["ember", "frostTouch", "kinetic", "venom", "silence", "mirror", "chainLightning", "phoenix", "rewind", "singularity"].contains(&id) {
            return match rarity {
                "Legendary" => 25.0,
                "Rare" => 15.0,
                _ => 9.0,
            };
        }
        9.0
    }

    /// d16 `pushOutOfTerrain(f)`: up to four passes out of any rock the fighter overlaps.
    pub fn push_out_of_terrain(&mut self, f: Ent) {
        if self.f(f).flight > 0.0 {
            return;
        }
        for _ in 0..4 {
            let mut moved = false;
            for k in 0..self.b.obstacles.len() {
                let (ox, oy, or) = (self.b.obstacles[k].x, self.b.obstacles[k].y, self.b.obstacles[k].radius);
                let e = self.f(f);
                let (dx, dy) = (e.x - ox, e.y - oy);
                let dd = hypot2(dx, dy);
                let mn = or + e.radius;
                if dd < mn - 1e-6 {
                    let angle = if dd != 0.0 { jsmath::atan2(dy, dx) } else { e.team * std::f64::consts::PI };
                    let nx = self.clamp_x(ox + jsmath::cos(angle) * mn);
                    let ny = self.clamp_y(oy + jsmath::sin(angle) * mn);
                    let e = self.fm(f);
                    e.x = nx;
                    e.y = ny;
                    moved = true;
                }
            }
            if !moved {
                return;
            }
        }
    }

    /// d16 `creditDown(t, f)`: the first time a fighter goes down, its attacker gets the kill.
    pub fn credit_down(&mut self, t: Ent, f: Ent) {
        if self.f(t).hp <= 0.0 && !self.f(t).credited_down {
            self.fm(t).credited_down = true;
            self.fm(f).kills += 1.0;
            let idx = self.f(f).index;
            self.fm(t).last_attacker = Some(idx);
        }
    }

    /// d7 `dropFallen()`: fallen fighters lose Forgefire and its shield.
    pub fn drop_fallen(&mut self) {
        for i in 0..self.combatants().len() {
            let f = self.combatants()[i];
            let e = self.fm(f);
            if e.hp <= 0.0 && e.forgefire_until.is_some_and(|v| v != 0.0 && !v.is_nan()) {
                e.forgefire_until = Some(0.0);
                e.forge_shield = Some(0.0);
            }
        }
    }

    /// d3 `onDuty(f)`: on backdoor duty while intruders remain.
    pub fn on_duty(&self, f: Ent) -> bool {
        let e = self.f(f);
        let on = self.b.duty.get(e.team as usize).is_some_and(|d| d.contains(&e.index));
        on && !self.intruders(e.team).is_empty()
    }

    /// d16 `nearestEnemy(f, point = f)`
    pub fn nearest_enemy(&self, f: Ent, point: Option<Pt>) -> Option<Ent> {
        let p = point.unwrap_or(Pt { x: self.f(f).x, y: self.f(f).y });
        let mut best = None;
        let mut bd = f64::INFINITY;
        for e in self.enemies_of(f) {
            let n = d(p.x, p.y, self.f(e).x, self.f(e).y);
            if n < bd {
                bd = n;
                best = Some(e);
            }
        }
        best
    }

    /// d16 `threatened(f)`: an enemy in weapon reach (+35) or a hostile projectile within 130.
    pub fn threatened(&self, f: Ent) -> bool {
        let fe = self.f(f);
        self.enemies_of(f).iter().any(|&e| de(self.f(e), fe) < self.f(e).weapon.range + 35.0)
            || self.b.projectiles.iter().any(|p| self.owner_team(p.owner) != Some(fe.team) && d(p.x, p.y, fe.x, fe.y) < 130.0)
    }

    /// d12 `respawn` helper `placeAtBase(f)`
    pub fn place_at_base(&mut self, f: Ent) {
        let team = self.f(f).team;
        let members: Vec<Ent> = self.combatants().iter().copied().filter(|&a| self.f(a).team == team).collect();
        let slot = members.iter().position(|&a| a == f).map(|i| i as f64).unwrap_or(-1.0);
        let x = if team != 0.0 { self.b.width - 130.0 } else { 130.0 };
        let y = 300.0 + (slot - (members.len() as f64 - 1.0) / 2.0) * 45.0;
        let e = self.fm(f);
        e.x = x;
        e.y = y;
        e.vx = 0.0;
        e.vy = 0.0;
        self.push_out_of_terrain(f);
    }
}

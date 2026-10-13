//! Movement: detours around rocks, steering, dodges, threat checks and the `moveFighter` / `moveTeamFighter` layer
//! chains (depth in the team-4.0 prototype chain in each doc line).
use super::consts::{self, unstick};
use super::queries::{d, Pt};
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::{clamp, segment_distance};
use crate::team::jsnum::Ent;
use crate::team::state::{EntOrEntityIntentLeashRef, EntityIntent, EntityIntentLeash, EntityIntentLeashRef, EntityIntentU};

/// JavaScript truthiness of a number.
#[inline]
pub fn truthy(x: f64) -> bool {
    x != 0.0 && !x.is_nan()
}

/// What `incomingThreat` looks for.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Any,
    Physical,
    Magical,
}

impl Kind {
    pub fn parse(s: &str) -> Kind {
        match s {
            "physical" => Kind::Physical,
            "magical" => Kind::Magical,
            _ => Kind::Any,
        }
    }
    /// `accepts(physical, magical)`
    #[inline]
    fn accepts(self, physical: bool, magical: bool) -> bool {
        self == Kind::Any || self == Kind::Physical && physical || self == Kind::Magical && magical
    }
}

/// A plan leash: `{ref, max}`; `ref` is an entity (a Core) or a point.
#[derive(Clone, Debug)]
pub struct Leash {
    pub r: LeashRef,
    pub max: f64,
}
#[derive(Clone, Copy, Debug)]
pub enum LeashRef {
    Ent(Ent),
    Pt(Pt),
}

impl Engine {
    /// d16 `detour(f, p)`: a waypoint around the first rock between the fighter and `p`, keeping the side it chose.
    pub fn detour(&mut self, f: Ent, px: f64, py: f64) -> Option<Pt> {
        let fe = self.f(f);
        if fe.flight > 0.0 {
            return None;
        }
        let (fx, fy, fr) = (fe.x, fe.y, fe.radius);
        let mut first: Option<usize> = None;
        let mut near = f64::INFINITY;
        for (k, o) in self.b.obstacles.iter().enumerate() {
            if segment_distance(o.x, o.y, fx, fy, px, py) >= o.radius + fr + 2.0 {
                continue;
            }
            let dd = d(fx, fy, o.x, o.y);
            if dd < near {
                near = dd;
                first = Some(k);
            }
        }
        let Some(first) = first else {
            self.fm(f).detour_side = Some(0.0);
            return None;
        };
        let (dx, dy) = (px - fx, py - fy);
        let len = {
            let l = hypot2(dx, dy);
            if truthy(l) {
                l
            } else {
                1.0
            }
        };
        let (nx, ny) = (-dy / len, dx / len);
        let around = |eng: &Engine, side: f64| -> Option<Pt> {
            let mut o = first;
            for _ in 0..10 {
                let ob = &eng.b.obstacles[o];
                let r = ob.radius + fr + 20.0;
                let w = Pt { x: eng.clamp_x(ob.x + nx * r * side), y: eng.clamp_y(ob.y + ny * r * side) };
                let inside = eng.b.obstacles.iter().enumerate().position(|(q, qo)| q != o && hypot2(qo.x - w.x, qo.y - w.y) < qo.radius + fr + 4.0);
                match inside {
                    None => return Some(w),
                    Some(q) => o = q,
                }
            }
            None
        };
        let mut options: Vec<(f64, Pt, f64)> = Vec::new();
        for side in [1.0, -1.0] {
            if let Some(w) = around(self, side) {
                options.push((side, w, d(fx, fy, w.x, w.y) + d(w.x, w.y, px, py)));
            }
        }
        if options.is_empty() {
            return None;
        }
        if options.len() == 2 && options[1].2 < options[0].2 {
            options.swap(0, 1);
        }
        let current = self.f(f).detour_side;
        let kept = options.iter().find(|o| Some(o.0) == current).copied();
        let pick = match kept {
            Some(k) if k.2 < options[0].2 * 1.25 => k,
            _ => options[0],
        };
        self.fm(f).detour_side = Some(pick.0);
        Some(pick.1)
    }

    /// d20 `warn(f, key, text)`: at most one warning per key every 4 seconds (the text goes to the log, which a
    /// headless battle does not keep).
    pub fn warn(&mut self, f: Ent, key: &str) {
        let time = self.b.time;
        let w = &mut self.fm(f).warnings;
        let slot = match key {
            "winded" => &mut w.winded,
            "sunlight" => &mut w.sunlight,
            "sound" => &mut w.sound,
            other => panic!("warning key {other} is not in the schema"),
        };
        if slot.unwrap_or(-10.0) + 4.0 <= time {
            *slot = Some(time);
        }
    }

    /// d16 `enemyAttackThreat(f, t, kind, x, y, accepts)`: whether enemy `t` is about to hit point (x, y).
    fn enemy_attack_threat(&self, t: Ent, kind: Kind, x: f64, y: f64) -> bool {
        let te = self.f(t);
        if te.hp <= 0.0 || te.sleep > 0.0 || te.amnesia > 0.0 || te.stagger > 0.0 || te.roll > 0.0 {
            return false;
        }
        let a = te.action.as_ref();
        let distance = hypot2(x - te.x, y - te.y);
        if let Some(a) = a.filter(|a| a.type_ == "cast") {
            let id = &a.power.as_ref().expect("a cast has a power").id;
            return (kind == Kind::Any || kind.accepts(false, id != "memory")) && a.elapsed < a.windup && distance <= if id == "storm" { 300.0 } else { 220.0 };
        }
        if a.is_some_and(|a| a.released == Some(true)) {
            return false;
        }
        let wt = te.weapon.type_.as_str();
        let melee = wt == "melee";
        let delay = match a {
            Some(a) => max(0.0, a.windup - a.elapsed),
            None => max(0.0, te.cooldown) + if melee { 0.23 } else { 0.22 },
        };
        let props = te.weapon.properties.as_ref();
        let physical = melee || wt == "ranged";
        let magical = wt == "arcane" || props.is_some_and(|p| p.holy == Some(true));
        if !kind.accepts(physical, magical) || te.disarmed > 0.0 && props.is_some_and(|p| p.metal == Some(true)) || wt == "arcane" && (te.suppressed > 0.0 || te.weakness == "silenced casting") {
            return false;
        }
        if melee {
            delay <= 0.75 && distance <= te.weapon.range + 16.0
        } else {
            delay + distance / 290.0 <= 0.75 && distance <= te.weapon.range + 8.0
        }
    }

    /// d16 `incomingThreat(f, t, kind = 'any', x = f.x, y = f.y)`: a hostile projectile on course for (x, y), or an
    /// enemy about to hit it.
    pub fn incoming_threat(&self, f: Ent, kind: Kind, at: Option<Pt>) -> bool {
        let fe = self.f(f);
        let (x, y) = at.map(|p| (p.x, p.y)).unwrap_or((fe.x, fe.y));
        let fvx = if truthy(fe.vx) { fe.vx } else { 0.0 };
        let fvy = if truthy(fe.vy) { fe.vy } else { 0.0 };
        for p in &self.b.projectiles {
            let holy = p.tags.as_ref().is_some_and(|t| t.holy == Some(true));
            if self.owner_team(p.owner) == Some(fe.team) || !kind.accepts(p.type_ == "physical", p.type_ != "physical" || holy) {
                continue;
            }
            let (vx, vy, dx, dy) = (p.vx - fvx, p.vy - fvy, x - p.x, y - p.y);
            let speed2 = vx * vx + vy * vy;
            if !truthy(speed2) {
                continue;
            }
            let arrival = (dx * vx + dy * vy) / speed2;
            if arrival < 0.0 || arrival > 0.75 || arrival > p.life {
                continue;
            }
            if hypot2(dx - vx * arrival, dy - vy * arrival) <= fe.radius + p.radius + 3.0 {
                return true;
            }
        }
        self.enemies_of(f).into_iter().any(|e| self.enemy_attack_threat(e, kind, x, y))
    }

    /// d16 `underFire(ally, kind = 'any')`
    pub fn under_fire(&self, ally: Ent, kind: Kind) -> bool {
        let a = self.f(ally);
        self.enemies_of(ally).into_iter().any(|e| {
            let ee = self.f(e);
            matches!(&ee.target, Some(crate::team::state::NumOrStr::Num(i)) if *i == a.index) && d(ee.x, ee.y, a.x, a.y) < ee.weapon.range + 45.0
        }) || self.incoming_threat(ally, kind, None)
    }

    /// `dodgeThreat` chain: d3 (step out of a Fissure) → d11 (step out of a slam) → d16 (sidestep projectiles and
    /// melee swings).
    pub fn dodge_threat(&mut self, f: Ent) {
        // d3
        if let Some(z) = self.b.fissure.clone() {
            let fe = self.f(f);
            if fe.roll_cooldown <= 0.0 && fe.energy >= 18.0 && fe.raging != Some(true) && fe.weakness != "overconfidence" && fe.action.is_none() && fe.sleep <= 0.0 && fe.root <= 0.0 && fe.stagger <= 0.0 {
                let (ux, uy) = (jsmath::cos(z.angle), jsmath::sin(z.angle));
                let (rx, ry) = (fe.x - z.x, fe.y - z.y);
                let along = rx * ux + ry * uy;
                let side = rx * -uy + ry * ux;
                let r = fe.radius;
                let inside = along >= -r && along <= z.length + r && (rx * -uy + ry * ux).abs() <= z.width / 2.0 + r;
                if inside {
                    let sign = if side >= 0.0 { 1.0 } else { -1.0 };
                    let e = self.fm(f);
                    e.roll_x = -jsmath::sin(z.angle) * sign;
                    e.roll_y = jsmath::cos(z.angle) * sign;
                    e.roll = 0.23;
                    e.roll_cooldown = 3.0;
                    e.evade = 0.25;
                    e.action_label = "Evade fissure".into();
                    return;
                }
            }
        }
        // d11
        if self.b.slam_at.is_some() {
            let titan = self.f(self.b.titan);
            let fe = self.f(f);
            if d(fe.x, fe.y, titan.x, titan.y) < self.b.titan_rules.range + 12.0 && fe.roll_cooldown <= 0.0 && fe.energy >= 18.0 && fe.raging != Some(true) && fe.weakness != "overconfidence" && fe.action.is_none() && fe.sleep <= 0.0 && fe.root <= 0.0 && fe.stagger <= 0.0 {
                let (dx, dy) = (fe.x - titan.x, fe.y - titan.y);
                let len = {
                    let l = hypot2(dx, dy);
                    if truthy(l) {
                        l
                    } else {
                        1.0
                    }
                };
                let e = self.fm(f);
                e.roll_x = dx / len;
                e.roll_y = dy / len;
                e.roll = 0.23;
                e.roll_cooldown = 3.0;
                e.evade = 0.25;
                e.action_label = "Evade slam".into();
                return;
            }
        }
        // d16
        let fe = self.f(f);
        if fe.weakness == "overconfidence" || fe.raging == Some(true) || fe.energy < 18.0 || fe.sleep > 0.0 || fe.root > 0.0 || fe.roll_cooldown > 0.0 || fe.action.as_ref().is_some_and(|a| a.type_ == "melee") || fe.stagger > 0.0 {
            return;
        }
        let mut threat: Option<(f64, f64)> = None;
        for p in &self.b.projectiles {
            if self.owner_team(p.owner) == Some(fe.team) {
                continue;
            }
            let (rx, ry) = (fe.x - p.x, fe.y - p.y);
            let speed2 = p.vx * p.vx + p.vy * p.vy;
            let arrival = (rx * p.vx + ry * p.vy) / speed2;
            if arrival < 0.0 || arrival > 0.5 {
                continue;
            }
            if hypot2(rx - p.vx * arrival, ry - p.vy * arrival) < 22.0 + fe.tactics * 12.0 {
                threat = Some((-p.vy, p.vx));
                break;
            }
        }
        if threat.is_none() {
            for e in self.enemies_of(f) {
                let ee = self.f(e);
                if let Some(a) = ee.action.as_ref() {
                    if a.type_ == "melee" && d(ee.x, ee.y, fe.x, fe.y) < ee.weapon.range + 35.0 && a.elapsed < a.windup {
                        threat = Some((-(fe.y - ee.y), fe.x - ee.x));
                        break;
                    }
                }
            }
        }
        if let Some((tx, ty)) = threat {
            let n = {
                let l = hypot2(tx, ty);
                if truthy(l) {
                    l
                } else {
                    1.0
                }
            };
            let mut sign = fe.orbit;
            if tx * (self.b.center.x - fe.x) + ty * (self.b.center.y - fe.y) < 0.0 {
                sign *= -1.0;
            }
            let tactics = fe.tactics;
            let e = self.fm(f);
            e.roll_x = tx / n * sign;
            e.roll_y = ty / n * sign;
            e.roll = 0.23;
            e.roll_cooldown = 3.4 - tactics * 0.8;
            e.evade = 0.25;
            e.action_label = "Dodge".into();
            self.b.metrics.dodges += 1.0;
        }
    }

    /// d16 `steer(f, t, dt)`: the per-step movement of a fighter towards (or around) its target.
    pub fn steer(&mut self, f: Ent, t: &Tgt, dt: f64) {
        let (tx, ty) = (self.tx(t), self.ty(t));
        let melee = self.f(f).weapon.type_ == "melee";
        let (fx0, fy0) = (self.f(f).x, self.f(f).y);
        let way = if melee || !self.clear_shot(fx0, fy0, tx, ty) { self.detour(f, tx, ty) } else { None };
        let (ax, ay) = way.map(|w| (w.x, w.y)).unwrap_or((tx, ty));
        let fe = self.f(f);
        let (dx, dy) = (tx - fe.x, ty - fe.y);
        let dd = {
            let l = hypot2(dx, dy);
            if truthy(l) {
                l
            } else {
                1.0
            }
        };
        let (wx, wy) = (ax - fe.x, ay - fe.y);
        let wd = {
            let l = hypot2(wx, wy);
            if truthy(l) {
                l
            } else {
                1.0
            }
        };
        let (nx, ny) = (wx / wd, wy / wd);
        let intent = fe.intent.clone();
        let formed = intent.as_ref().is_some_and(|i| i.support != Some(true));
        {
            let e = self.fm(f);
            e.think -= dt;
            e.roll_cooldown -= dt;
        }
        if self.f(f).think <= 0.0 {
            let think = 1.2 + self.rng() * 1.4;
            self.fm(f).think = think;
            if self.rng() < 0.35 {
                self.fm(f).orbit *= -1.0;
            }
        }
        self.dodge_threat(f);
        let t_melee = self.t_weapon_type(t) == "melee";
        {
            let fe = self.f(f);
            if melee && !t_melee && dd > 60.0 && dd < 250.0 && fe.roll_cooldown <= 0.0 && fe.action.is_none() && fe.cooldown <= 0.0 && (!formed || fe.diving == Some(true) || fe.role == "tank" && dd < 170.0) {
                let e = self.fm(f);
                e.roll_x = nx;
                e.roll_y = ny;
                e.roll = 0.22;
                e.roll_cooldown = 2.8;
                e.evade = 0.1;
                self.b.metrics.dashes += 1.0;
            }
        }
        // sway: null when not formed, else intent.strafe (which may itself be undefined).
        let sway: Option<Option<f64>> = if formed { Some(intent.as_ref().unwrap().strafe) } else { None };
        let sway_or = |dflt: f64| sway.flatten().unwrap_or(dflt);
        let (mut radial, strafe);
        let fe = self.f(f);
        let orbit = fe.orbit;
        let label: String;
        if melee {
            let desired = fe.weapon.range * 0.76;
            if let Some(a) = fe.action.as_ref() {
                radial = if !t_melee { if a.elapsed < a.windup { 1.0 } else { 0.65 } } else if a.elapsed < a.windup { 0.38 } else { -0.35 };
                strafe = sway_or(0.32) * orbit;
                label = if a.elapsed < a.windup { "Wind up" } else { "Recover" }.into();
            } else if t_melee && fe.cooldown > 0.2 && dd < fe.weapon.range + 15.0 {
                radial = -0.55;
                strafe = (match sway {
                    None => 0.65,
                    Some(s) => s.map(|s| s * 1.8).unwrap_or(f64::NAN),
                }) * orbit;
                label = "Circle".into();
            } else {
                radial = if dd > desired { 1.0 } else { -0.22 };
                strafe = sway_or(0.32) * orbit;
                label = if dd > 80.0 { "Pursue" } else { "Close in" }.into();
            }
            self.fm(f).action_label = label;
        } else {
            let desired = min(fe.weapon.range * 0.83, 165.0 + fe.tactics * 22.0);
            radial = clamp((dd - desired) / 50.0, -1.0, 1.0);
            let mut st = sway.flatten().unwrap_or(0.62 + 0.2 * fe.tactics) * orbit;
            let mut label = if dd < 85.0 { "Retreat" } else { "Strafe" };
            if way.is_some() {
                radial = 1.0;
                st = 0.0;
                label = "Find a line";
            }
            let disengage = dd < 60.0 && fe.roll_cooldown <= 0.0 && fe.action.is_none();
            let e = self.fm(f);
            e.action_label = label.into();
            if disengage {
                e.roll_x = -nx;
                e.roll_y = -ny;
                e.roll = 0.25;
                e.roll_cooldown = 3.8;
                e.action_label = "Disengage".into();
                self.b.metrics.dashes += 1.0;
            }
            strafe = st;
        }
        let mut strafe = strafe;
        if melee && way.is_some() {
            radial = 1.0;
            strafe = 0.0;
            self.fm(f).action_label = "Go around".into();
        }
        let mut x = nx * radial - ny * strafe;
        let mut y = ny * radial + nx * strafe;
        if formed {
            let i = intent.as_ref().unwrap();
            let slot = i.slot.as_ref().expect("a formed intent has a slot");
            let fe = self.f(f);
            let (sx, sy) = (slot.x - fe.x, slot.y - fe.y);
            let sd = hypot2(sx, sy);
            let pull_v = i.pull.unwrap_or(f64::NAN);
            if sd > 1.0 && pull_v > 0.0 {
                let pull = pull_v * clamp((sd - 22.0) / 70.0, 0.0, 1.6);
                x += sx / sd * pull;
                y += sy / sd * pull;
                if pull > 0.6 && fe.action.is_none() {
                    self.fm(f).action_label = "Formation".into();
                }
            }
            if let Some(leash) = i.leash.as_ref() {
                let u = i.u.as_ref().expect("a leashed intent has a direction");
                let (rx, ry) = self.leash_ref_xy(&leash.ref_);
                let fe = self.f(f);
                let ahead = (fe.x - rx) * u.x + (fe.y - ry) * u.y;
                let forward = x * u.x + y * u.y;
                if ahead > leash.max && forward > 0.0 {
                    let back = min(1.0, (ahead - leash.max) / 40.0) * 0.6;
                    x -= u.x * (forward + back);
                    y -= u.y * (forward + back);
                }
            }
        }
        let fe = self.f(f);
        if fe.flight <= 0.0 {
            let m = hypot2(x, y);
            if m > 0.05 {
                let (hx, hy) = (x / m, y / m);
                for o in &self.b.obstacles {
                    let (ox, oy) = (o.x - fe.x, o.y - fe.y);
                    let ahead = ox * hx + oy * hy;
                    let reach = 70.0 + o.radius;
                    if ahead <= 0.0 || ahead > reach {
                        continue;
                    }
                    let side = hx * oy - hy * ox;
                    if side.abs() > o.radius + fe.radius + 8.0 {
                        continue;
                    }
                    let w = (1.0 - ahead / reach) * 1.3;
                    let sign = if side > 0.0 { -1.0 } else { 1.0 };
                    x += -hy * sign * w;
                    y += hx * sign * w;
                }
            }
        }
        let (w, h) = (self.b.width, self.b.height);
        if fe.x < 65.0 {
            x += (65.0 - fe.x) / 28.0;
        }
        if fe.x > w - 65.0 {
            x -= (fe.x - (w - 65.0)) / 28.0;
        }
        if fe.y < 65.0 {
            y += (65.0 - fe.y) / 28.0;
        }
        if fe.y > h - 65.0 {
            y -= (fe.y - (h - 65.0)) / 28.0;
        }
        if fe.roll > 0.0 {
            x = fe.roll_x * 2.7;
            y = fe.roll_y * 2.7;
            self.fm(f).roll -= dt;
        }
        let fe = self.f(f);
        let mag = hypot2(x, y);
        if mag > 1.0 && fe.roll <= 0.0 {
            x /= mag;
            y /= mag;
        }
        let slow = if fe.slow > 0.0 { 0.6 } else { 1.0 };
        let stamina = if ["exhaustion", "limited stamina", "food"].iter().any(|w| fe.weakness.contains(w)) { max(0.55, 1.0 - self.b.time / 180.0) } else { 1.0 };
        let action_slow = if fe.action.as_ref().is_some_and(|a| a.type_ == "shot") { 0.65 } else { 1.0 };
        let stagger = if fe.stagger > 0.0 { 0.3 } else { 1.0 };
        let t_type = self.t_weapon_type(t);
        let pursuit = if melee && t_type != "melee" && dd > fe.weapon.range + 20.0 && radial > 0.0 && fe.action.is_none() && !truthy(fe.roll) && !truthy(fe.stagger) {
            if t_type == "arcane" {
                self.b.rules.pursuit_arcane
            } else {
                1.10
            }
        } else {
            1.0
        };
        let mv = fe.move_;
        let target_x = x * mv * pursuit * slow * stamina * action_slow * stagger;
        let target_y = y * mv * pursuit * slow * stamina * action_slow * stagger;
        let blend = min(1.0, dt * 12.0);
        let (vx, vy) = (fe.vx + (target_x - fe.vx) * blend, fe.vy + (target_y - fe.vy) * blend);
        let nxp = self.clamp_x(fe.x + vx * dt);
        let nyp = self.clamp_y(fe.y + vy * dt);
        let e = self.fm(f);
        e.vx = vx;
        e.vy = vy;
        e.x = nxp;
        e.y = nyp;
        let angle = jsmath::atan2(ty - e.y, tx - e.x);
        e.angle = angle;
        e.facing = e.action.as_ref().and_then(|a| a.angle).unwrap_or(angle);
    }

    /// The point a leash `ref` stands for (an entity's live position, or a fixed point).
    pub fn leash_ref_xy(&self, r: &EntOrEntityIntentLeashRef) -> (f64, f64) {
        match r {
            EntOrEntityIntentLeashRef::Ent(e) => (self.f(*e).x, self.f(*e).y),
            EntOrEntityIntentLeashRef::Obj(p) => (p.x, p.y),
        }
    }

    /// d12 `targetFor(f, t)` → d20: Cores and the Titan are what they are; otherwise an illusionist's decoy can
    /// fool a fighter without insight.
    pub fn target_for(&self, f: Ent, t: &Tgt) -> Tgt {
        if self.t_is_objective(t) {
            return t.clone();
        }
        let fe = self.f(f);
        let te = self.f(t.ent);
        if self.t_illusion(t) > 0.0 && !truthy(fe.insight) && te.decoy.as_ref().is_some_and(|dc| dc.hp > 0.0) && fe.tactics < 0.85 {
            let dc = te.decoy.as_ref().unwrap();
            let (x, y, hp) = (dc.x, dc.y, dc.hp);
            return t.with(|o| {
                o.x = Some(x);
                o.y = Some(y);
                o.vx = Some(0.0);
                o.vy = Some(0.0);
                o.hp = Some(hp);
                o.decoy = true;
            });
        }
        t.clone()
    }

    /// d18 `usefulPortal(f, t)`: whether stepping through the portal improves the fighter's range or escapes.
    pub fn useful_portal(&self, f: Ent, t: &Tgt) -> bool {
        let desired = self.preferred_range(f);
        let fe = self.f(f);
        let exit = &fe.gates.as_ref().expect("a portal has gates")[1];
        let (tx, ty) = (self.tx(t), self.ty(t));
        let current = hypot2(tx - fe.x, ty - fe.y);
        let next = hypot2(tx - exit.x, ty - exit.y);
        (current - desired).abs() - (next - desired).abs() >= 25.0 || self.threatened(f) && next > current + 25.0
    }

    /// `moveFighter` chain: d4 (side-lane waypoint) → d5 (plan leash) → d10 (stand still while channelling a
    /// support ability) → d16.
    pub fn move_fighter(&mut self, f: Ent, t: &Tgt, dt: f64) {
        // d4
        let t = match &self.f(f).lane_waypoint {
            Some(w) if self.t_is_objective(t) => {
                let (x, y) = (w.x, w.y);
                t.with(|o| {
                    o.x = Some(x);
                    o.y = Some(y);
                    o.is_objective = Some(true);
                })
            }
            _ => t.clone(),
        };
        // d5
        let fe = self.f(f);
        let wants_leash = fe.intent.as_ref().is_some_and(|i| i.support != Some(true)) && !self.t_is_objective(&t);
        if wants_leash {
            if let Some(leash) = self.plan_leash(f) {
                let team = self.f(f).team;
                let plan_u = self.b.plans.get(team as usize).and_then(|p| p.as_ref()).map(|p| EntityIntentU { x: p.u.x, y: p.u.y });
                let intent = self.fm(f).intent.as_mut().unwrap();
                intent.leash = Some(EntityIntentLeash {
                    max: leash.max,
                    ref_: match leash.r {
                        LeashRef::Ent(e) => EntOrEntityIntentLeashRef::Ent(e),
                        LeashRef::Pt(p) => EntOrEntityIntentLeashRef::Obj(EntityIntentLeashRef { x: p.x, y: p.y }),
                    },
                });
                if intent.u.is_none() {
                    intent.u = Some(plan_u.unwrap_or(EntityIntentU { x: if team != 0.0 { -1.0 } else { 1.0 }, y: 0.0 }));
                }
            }
        }
        // d10
        if self.f(f).action.as_ref().is_some_and(|a| a.type_ == "supportAbility") {
            let e = self.fm(f);
            e.vx = 0.0;
            e.vy = 0.0;
            return;
        }
        self.move_fighter_d16(f, &t, dt);
    }

    /// d16 `moveFighter(f, t, dt)`
    fn move_fighter_d16(&mut self, f: Ent, t: &Tgt, dt: f64) {
        let charging = self.f(f).action.as_ref().is_some_and(|a| a.type_ == "technique" && a.power.as_ref().is_some_and(|p| p.id == "charge") && a.released != Some(true));
        if charging {
            let fe = self.f(f);
            if fe.root > 0.0 || fe.sleep > 0.0 || fe.stagger > 0.0 || fe.amnesia > 0.0 {
                return;
            }
            let a = fe.action.as_ref().unwrap();
            let (tx, ty) = (self.tx(t), self.ty(t));
            let remaining = max(0.0, min(90.0 - a.travel.unwrap_or(f64::NAN), d(fe.x, fe.y, tx, ty) - 24.0));
            let step = min(remaining, 360.0 * dt);
            let a_angle = a.angle.unwrap_or(f64::NAN);
            let (dx, dy) = (jsmath::cos(a_angle), jsmath::sin(a_angle));
            let point = Pt { x: self.clamp_x(fe.x + dx * step), y: self.clamp_y(fe.y + dy * step) };
            let blocked = self.b.obstacles.iter().any(|o| segment_distance(o.x, o.y, fe.x, fe.y, point.x, point.y) < o.radius + fe.radius);
            let angle = a_angle;
            let e = self.fm(f);
            let a = e.action.as_mut().unwrap();
            if !blocked {
                e.x = point.x;
                e.y = point.y;
                a.travel = Some(a.travel.unwrap_or(f64::NAN) + step);
            } else {
                a.elapsed = a.windup;
            }
            e.angle = angle;
            e.vx = dx * 360.0;
            e.vy = dy * 360.0;
            e.action_label = "Charge".into();
            return;
        }
        let mv = self.f(f).move_;
        {
            let e = self.fm(f);
            if e.crippled > 0.0 {
                e.move_ *= 0.7;
            } else if e.bramble_slow > 0.0 {
                e.move_ *= 0.75;
            }
        }
        {
            let e = self.fm(f);
            if e.sleep > 0.0 || e.root > 0.0 {
                e.vx = 0.0;
                e.vy = 0.0;
                e.action_label = if e.sleep > 0.0 { "Asleep" } else { "Bound" }.into();
                e.move_ = mv;
                return;
            }
        }
        let target = self.target_for(f, t);
        let fe = self.f(f);
        let hungry = fe.weakness == "needs constant food" && fe.nutrition < 30.0;
        // Food never exists in team battles (battle.food is always empty), so a hungry fighter keeps its target.
        let weapon = fe.weapon.clone();
        if fe.raging == Some(true) || fe.shape > 0.0 || hungry {
            let w = &mut self.fm(f).weapon;
            w.type_ = "melee".into();
            w.range = 24.0;
        }
        let (ox, oy, oroll) = (self.f(f).x, self.f(f).y, self.f(f).roll);
        self.steer(f, &target, dt);
        self.fm(f).weapon = weapon;
        if self.f(f).roll > oroll {
            if self.f(f).energy < 18.0 {
                let e = self.fm(f);
                e.roll = 0.0;
                e.x = ox;
                e.y = oy;
            } else {
                self.fm(f).energy -= 18.0;
                if self.f(f).weakness == "exhaustion" {
                    let e = self.fm(f);
                    e.winded = 0.8;
                    e.cooldown = max(e.cooldown, 0.8);
                    self.warn(f, "winded");
                }
            }
        }
        if hungry {
            self.fm(f).action_label = "Seek food".into();
        }
        self.push_out_of_terrain(f);
        let fe = self.f(f);
        if fe.portal_time > 0.0 && !fe.portal_used {
            if let Some(g) = fe.gates.as_ref() {
                if hypot2(fe.x - g[0].x, fe.y - g[0].y) < 24.0 && self.useful_portal(f, t) {
                    let (gx, gy) = (g[1].x, g[1].y);
                    let exit = self.b.rules.portal_exit;
                    let e = self.fm(f);
                    e.x = gx;
                    e.y = gy;
                    e.portal_used = true;
                    if exit {
                        e.evade = max(e.evade, 0.5);
                        e.cooldown = 0.0;
                    }
                }
            }
        }
        let e = self.fm(f);
        e.move_ = mv;
        if let Some(a) = e.action.as_ref().filter(|a| a.type_ == "cast") {
            e.action_label = format!("Casting {}", a.power.as_ref().expect("a cast has a power").name);
        }
    }

    /// `moveTeamFighter` chain: d1 (walk free of a rock) → d10 → d12 → d14 → d16 (formation intent).
    pub fn move_team_fighter(&mut self, f: Ent, t: &Tgt, dt: f64) {
        // d1
        let fe = self.f(f);
        if fe.unstick_until.unwrap_or(f64::NAN) > self.b.time && fe.sleep <= 0.0 && fe.root <= 0.0 {
            if let Some(to) = fe.unstick_to.clone() {
                if d(fe.x, fe.y, to.x, to.y) < 8.0 {
                    self.fm(f).unstick_until = Some(0.0);
                } else {
                    let weapon = fe.weapon.clone();
                    let intent = fe.intent.clone();
                    {
                        let e = self.fm(f);
                        e.weapon.type_ = "melee".into();
                        e.weapon.range = 4.0;
                        e.intent = None;
                    }
                    let way = t.with(|o| {
                        o.x = Some(to.x);
                        o.y = Some(to.y);
                        o.vx = Some(0.0);
                        o.vy = Some(0.0);
                        o.no_action = true;
                        o.is_objective = Some(true);
                        o.melee = true;
                    });
                    self.move_fighter(f, &way, dt);
                    let (tx, ty) = (self.tx(t), self.ty(t));
                    let e = self.fm(f);
                    e.weapon = weapon;
                    e.intent = intent;
                    e.angle = jsmath::atan2(ty - e.y, tx - e.x);
                    return;
                }
            }
        }
        self.move_team_fighter_d10(f, t, dt);
        let fe = self.f(f);
        let moved = match &fe.still_since {
            None => true,
            Some(c) => d(fe.x, fe.y, c.x, c.y) > unstick::STILL,
        };
        if moved {
            let (x, y, time) = (fe.x, fe.y, self.b.time);
            self.fm(f).still_since = Some(crate::team::state::EntityStillSince { x, y, time });
            return;
        }
        let check_time = fe.still_since.as_ref().unwrap().time;
        let (tx, ty) = (self.tx(t), self.ty(t));
        if self.b.time - check_time < unstick::AFTER || fe.sleep > 0.0 || fe.root > 0.0 || fe.action.is_some() || d(fe.x, fe.y, tx, ty) <= fe.weapon.range + 10.0 {
            return;
        }
        let Some(rock) = self.touching(f) else { return };
        let to = self.escape_from(f, Some(t), rock);
        let until = self.b.time + unstick::ESCAPE;
        let e = self.fm(f);
        e.unstick_to = Some(crate::team::state::EntityUnstickTo { x: to.x, y: to.y });
        e.unstick_until = Some(until);
        e.still_since = None;
        self.b.unsticks += 1.0;
    }

    fn move_team_fighter_d10(&mut self, f: Ent, t: &Tgt, dt: f64) {
        // d10
        if self.f(f).action.as_ref().is_some_and(|a| a.type_ == "supportAbility") {
            let e = self.fm(f);
            e.vx = 0.0;
            e.vy = 0.0;
            return;
        }
        // d12
        let team_kit = self.f(f).action.as_ref().is_some_and(|a| a.type_ == "teamKit");
        if !team_kit && self.t_is_objective(t) {
            self.fm(f).intent = None;
            return self.move_fighter(f, t, dt);
        }
        // d14
        if team_kit {
            let e = self.fm(f);
            e.vx = 0.0;
            e.vy = 0.0;
            return;
        }
        self.move_team_fighter_d16(f, t, dt);
    }

    /// d16 `moveTeamFighter(f, t, dt)`: formation intent, healer anchoring, then `moveFighter`.
    fn move_team_fighter_d16(&mut self, f: Ent, t: &Tgt, dt: f64) {
        let team = self.f(f).team as usize;
        self.fm(f).intent = None;
        let plan = self.b.plans.get(team).cloned().flatten();
        if plan.as_ref().is_some_and(|p| p.alone == Some(true)) {
            self.move_fighter(f, t, dt);
            return;
        }
        let fe = self.f(f);
        let free = fe.raging != Some(true) && !(fe.shape > 0.0);
        if fe.role == "healer" && free {
            let anchor = self.healer_anchor(f, t);
            let weapon = self.f(f).weapon.clone();
            {
                let e = self.fm(f);
                e.weapon.type_ = "melee".into();
                e.weapon.range = 24.0;
                e.intent = Some(EntityIntent { leash: None, pull: None, slot: None, strafe: None, support: Some(true), u: None });
            }
            let stand_in = t.with(|o| {
                o.x = Some(anchor.x);
                o.y = Some(anchor.y);
                o.vx = Some(0.0);
                o.vy = Some(0.0);
                o.no_illusion = true;
                o.no_action = true;
                o.melee = true;
            });
            self.move_fighter(f, &stand_in, dt);
            let (tx, ty) = (self.tx(t), self.ty(t));
            let e = self.fm(f);
            e.weapon = weapon;
            e.angle = jsmath::atan2(ty - e.y, tx - e.x);
            if e.action.is_none() {
                e.facing = e.angle;
            }
            if !["Asleep", "Bound", "Dodge", "Seek food"].contains(&e.action_label.as_str()) {
                e.action_label = "Support".into();
            }
            return;
        }
        if let Some(plan) = plan.as_ref().filter(|_| free) {
            let posture = &plan.posture;
            let fe = self.f(f);
            let slot = plan.slots.get(&js_key(fe.index)).cloned();
            let u = Some(EntityIntentU { x: plan.u.x, y: plan.u.y });
            if fe.role == "tank" {
                let leash = if plan.hold == Some(true) {
                    let hp = self.hold_point(fe.team);
                    EntityIntentLeash { max: 0.0, ref_: EntOrEntityIntentLeashRef::Obj(EntityIntentLeashRef { x: hp.x, y: hp.y }) }
                } else {
                    EntityIntentLeash { max: posture.leash + 20.0, ref_: EntOrEntityIntentLeashRef::Obj(plan.b_upper.clone()) }
                };
                self.fm(f).intent = Some(EntityIntent { slot, pull: Some(0.45 * posture.pull), leash: Some(leash), u, strafe: Some(posture.strafe), support: None });
            } else if fe.diving == Some(true) {
                self.fm(f).intent = Some(EntityIntent { slot, pull: Some(0.0), leash: None, u, strafe: Some(posture.strafe), support: None });
            } else if let Some(slot) = slot {
                let pull = posture.pull * if self.is_skirmisher(&Tgt::of(f)) { 0.8 } else { 1.1 };
                let max = 50.0 - slot.back;
                self.fm(f).intent = Some(EntityIntent { slot: Some(slot), pull: Some(pull), leash: Some(EntityIntentLeash { max, ref_: EntOrEntityIntentLeashRef::Obj(plan.f_upper.clone()) }), u, strafe: Some(posture.strafe), support: None });
            }
        }
        self.move_fighter(f, t, dt);
    }

    /// d16 `holdPoint(team)`
    pub fn hold_point(&self, team: f64) -> Pt {
        Pt { x: if team != 0.0 { self.b.width * 0.66 } else { self.b.width * 0.34 }, y: self.b.center.y }
    }

    /// d1 `escapeFrom(f, t, rock)`: around whatever blocks the way to the target, else sideways around the rock.
    pub fn escape_from(&mut self, f: Ent, t: Option<&Tgt>, rock: usize) -> Pt {
        if let Some(t) = t {
            let (tx, ty) = (self.tx(t), self.ty(t));
            if let Some(w) = self.detour(f, tx, ty) {
                return w;
            }
        }
        let fe = self.f(f);
        let o = &self.b.obstacles[rock];
        let (dx, dy) = (fe.x - o.x, fe.y - o.y);
        let len = {
            let l = hypot2(dx, dy);
            if truthy(l) {
                l
            } else {
                1.0
            }
        };
        let side = match fe.detour_side {
            Some(s) if truthy(s) => s,
            _ => {
                if (fe.index % 2.0) != 0.0 {
                    1.0
                } else {
                    -1.0
                }
            }
        };
        let r = o.radius + fe.radius + unstick::STEP;
        Pt { x: self.clamp_x(o.x + dx / len * r - dy / len * r * side), y: self.clamp_y(o.y + dy / len * r + dx / len * r * side) }
    }

    /// `healerAnchor` chain: d10 (walk towards a hurt ally to land Mending wave) → d16 (support spot, or away from
    /// a nearby threat).
    pub fn healer_anchor(&mut self, f: Ent, t: &Tgt) -> Pt {
        let anchor = self.healer_anchor_d16(f, t);
        let team = self.f(f).team as usize;
        let plan_u = self.b.plans.get(team).and_then(|p| p.as_ref()).map(|p| (p.u.x, p.u.y));
        let threat = self.nearest_enemy(f, None);
        let fe = self.f(f);
        let Some(wave) = fe.powers.iter().find(|p| p.id == "mendingWave") else { return anchor };
        let Some((ux, uy)) = plan_u else { return anchor };
        let night = self.b.night;
        let used = |id: &str| fe.power_used.get(id).copied().unwrap_or(f64::NEG_INFINITY);
        if threat.is_some_and(|e| d(fe.x, fe.y, self.f(e).x, self.f(e).y) < 90.0)
            || fe.mana < wave.cost
            || fe.suppressed > 0.0
            || fe.weakness == "silenced casting"
            || night && fe.weakness == "loses power at night"
            || !night && fe.weakness == "loses power in daylight"
            || fe.weakness == "power needs a sacrifice" && fe.hp <= fe.max_hp * 0.03
            || wave.cooldown.is_some_and(|c| self.b.time - used(&wave.id) < c)
        {
            return anchor;
        }
        if fe.powers.iter().any(|p| ["healing", "regeneration", "life", "chainHeal"].contains(&p.id.as_str()) && fe.mana >= p.cost && self.b.time - used(&p.id) >= p.cooldown.unwrap_or(0.0)) {
            return anchor;
        }
        let mut hurt: Vec<Ent> = self.support_allies(f, false).into_iter().filter(|&a| a != f && self.f(a).hp < self.f(a).max_hp * 0.8).collect();
        hurt.sort_by(|&a, &b| {
            let (ea, eb) = (self.f(a), self.f(b));
            js_cmp(ea.hp / ea.max_hp - eb.hp / eb.max_hp)
        });
        match hurt.first() {
            Some(&h) if d(fe.x, fe.y, self.f(h).x, self.f(h).y) > 95.0 => {
                let he = self.f(h);
                Pt { x: self.clamp_x(he.x - ux * 75.0), y: self.clamp_y(he.y - uy * 75.0) }
            }
            _ => anchor,
        }
    }

    fn healer_anchor_d16(&mut self, f: Ent, _t: &Tgt) -> Pt {
        let team = self.f(f).team as usize;
        let threat = self.nearest_enemy(f, None);
        let fe = self.f(f);
        if let Some(e) = threat {
            let te = self.f(e);
            let dd = d(fe.x, fe.y, te.x, te.y);
            if dd < 90.0 {
                let dd = if truthy(dd) { dd } else { 1.0 };
                return Pt { x: self.clamp_x(fe.x + (fe.x - te.x) / dd * 120.0), y: self.clamp_y(fe.y + (fe.y - te.y) / dd * 120.0) };
            }
        }
        let Some(plan) = self.b.plans.get(team).and_then(|p| p.as_ref()) else { return Pt { x: fe.x, y: fe.y } };
        let hurt = match plan.hurt {
            Some(h) if h != fe.index => super::queries::js_index(h, self.b.fighters.len()).map(|i| self.b.fighters[i]),
            _ => None,
        };
        let slot = plan.slots.get(&js_key(fe.index)).expect("a healer in the plan has a slot");
        if let Some(h) = hurt {
            let he = self.f(h);
            if d(he.x, he.y, slot.x, slot.y) > consts::SUPPORT_RANGE * 0.7 {
                return Pt { x: self.clamp_x(he.x - plan.u.x * 100.0), y: self.clamp_y(he.y - plan.u.y * 100.0) };
            }
        }
        Pt { x: slot.x, y: slot.y }
    }

    /// d10 `supportAllies(f, down = false)`: teammates (alive, or down when `down`), Cores and the Titan excluded.
    pub fn support_allies(&self, f: Ent, down: bool) -> Vec<Ent> {
        let fe = self.f(f);
        let team_mode = self.b.mode == "team";
        self.b.combatants.iter().copied().filter(|&a| {
            let ae = self.f(a);
            ae.is_objective != Some(true) && (if team_mode { ae.team == fe.team } else { a == f }) && (if down { ae.hp <= 0.0 } else { ae.hp > 0.0 })
        }).collect()
    }

    /// d10 `supportEnemies(f)`
    pub fn support_enemies(&self, f: Ent) -> Vec<Ent> {
        let fe = self.f(f);
        let team_mode = self.b.mode == "team";
        self.b.combatants.iter().copied().filter(|&a| {
            let ae = self.f(a);
            ae.is_objective != Some(true) && ae.hp > 0.0 && (if team_mode { ae.team != fe.team } else { a != f })
        }).collect()
    }

    /// `planLeash` chain: d3 (backdoor duty keeps defenders by their Core) → d5 (the team plan's anchor).
    pub fn plan_leash(&self, f: Ent) -> Option<Leash> {
        let team = self.f(f).team;
        if self.on_duty(f) {
            return Some(Leash { r: LeashRef::Ent(self.b.cores[team as usize]), max: 240.0 });
        }
        let plan = self.b.brain.get(team as usize)?.plan.as_str();
        match plan {
            "regroup" => Some(Leash { r: LeashRef::Pt(self.base(team)), max: 60.0 }),
            "defend" => Some(Leash { r: LeashRef::Ent(self.b.cores[team as usize]), max: 240.0 }),
            "hold" => Some(Leash { r: LeashRef::Pt(self.choke(team)), max: 70.0 }),
            "contest" if self.f(self.b.titan).hp <= 0.0 => {
                let pit = self.pit();
                Some(Leash { r: LeashRef::Pt(Pt { x: pit.x + if team != 0.0 { 110.0 } else { -110.0 }, y: pit.y }), max: 40.0 })
            }
            _ => None,
        }
    }
}

/// A number as a JavaScript object key (`slots[f.index]`): integers print without a decimal point.
pub fn js_key(v: f64) -> String {
    if v.fract() == 0.0 && v.abs() < 1e21 {
        format!("{}", v as i64)
    } else {
        format!("{v}")
    }
}

/// A JavaScript sort comparator result as an ordering (NaN and ±0 compare equal; sorts are stable).
#[inline]
pub fn js_cmp(v: f64) -> std::cmp::Ordering {
    if v < 0.0 {
        std::cmp::Ordering::Less
    } else if v > 0.0 {
        std::cmp::Ordering::Greater
    } else {
        std::cmp::Ordering::Equal
    }
}

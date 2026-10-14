//! Neutral wisps and arena rations. Classic teamfight battles (team-2.9) keep the duel arena's two wisps and two
//! food spots; Core siege battles have none, so all of this is idle there.
use super::{Engine, Tgt};
use crate::jsmath::{self, hypot2, max, min};
use crate::team::geometry::{clamp, segment_distance};
use crate::team::jsnum::Ent;
use crate::team::state::EntityPowers;

/// `attackPowers` (combat-v12-base.js)
const ATTACK_POWERS: [&str; 22] = [
    "fire", "ice", "water", "dream", "blood", "void", "custom", "storm", "crystal", "metal", "light", "telekinesis", "sound", "death", "reality", "ember", "frostTouch", "kinetic", "venom", "silence", "chainLightning", "singularity",
];
/// `nature` and `strikes` (combat-v12.js)
const NATURE: [&str; 4] = ["thornBolt", "roots", "bramble", "seedburst"];
const STRIKES: [&str; 5] = ["drivingStrike", "charge", "cleave", "aimedShot", "cripplingStrike"];
const INNOCENT: &str = "cannot harm the innocent";

impl Engine {
    /// d2 `innocentRisk(f, t)`: a fighter who cannot harm the innocent would hit a living wisp: in its swing's arc,
    /// or on the line of its shot.
    pub fn innocent_risk(&self, f: Ent, t: &Tgt) -> bool {
        let w = &self.f(f).weapon;
        self.innocent_risk_with(f, w.type_ == "melee", w.range, self.tx(t), self.ty(t))
    }

    /// `innocentRisk` for fighter `f` holding a weapon of the given kind and range (d4 `copyChoice` asks with the
    /// target's weapon).
    pub fn innocent_risk_with(&self, f: Ent, melee: bool, range: f64, tx: f64, ty: f64) -> bool {
        let fe = self.f(f);
        if fe.weakness != INNOCENT {
            return false;
        }
        let angle = jsmath::atan2(ty - fe.y, tx - fe.x);
        self.b.wisps.iter().any(|w| {
            w.hp > 0.0
                && if melee {
                    let to = jsmath::atan2(w.y - fe.y, w.x - fe.x);
                    hypot2(w.x - fe.x, w.y - fe.y) < range + 14.0 && jsmath::atan2(jsmath::sin(to - angle), jsmath::cos(to - angle)).abs() < 1.2
                } else {
                    segment_distance(w.x, w.y, fe.x, fe.y, tx, ty) < 16.0
                }
        })
    }

    /// Whether a living wisp is within `r` of (x, y).
    fn wisp_near(&self, x: f64, y: f64, r: f64) -> bool {
        self.b.wisps.iter().any(|w| w.hp > 0.0 && hypot2(w.x - x, w.y - y) < r)
    }

    /// A living wisp within 115 of the target or 60 of the caster (d3 and d4: where a blast spell would reach one).
    pub fn wisps_near_cast(&self, f: Ent, t: &Tgt) -> bool {
        let fe = self.f(f);
        self.wisp_near(self.tx(t), self.ty(t), 115.0) || self.wisp_near(fe.x, fe.y, 60.0)
    }

    /// Whether a living wisp is within `r` of the segment from `f` to (tx, ty).
    pub fn wisp_on_line(&self, f: Ent, tx: f64, ty: f64, r: f64) -> bool {
        let fe = self.f(f);
        self.b.wisps.iter().any(|w| w.hp > 0.0 && segment_distance(w.x, w.y, fe.x, fe.y, tx, ty) < r)
    }

    /// `powerUnsafe(f, t, p)` chain: d12 (Stun bolt and Disarm shot count as Thorn bolt) → d5 (techniques, nature
    /// spells) → d4 (attack powers): using `p` on `t` would hurt a wisp, for a fighter who cannot harm the innocent.
    pub fn power_unsafe(&self, f: Ent, t: &Tgt, p: &EntityPowers) -> bool {
        let fe = self.f(f);
        if fe.weakness != INNOCENT {
            return false;
        }
        // d12
        let id = if p.id == "stunBolt" || p.id == "disarmShot" { "thornBolt" } else { p.id.as_str() };
        let (tx, ty) = (self.tx(t), self.ty(t));
        // d5
        if id == "charge" {
            return self.wisp_on_line(f, tx, ty, 18.0);
        }
        if p.kind == "technique" && STRIKES.contains(&id) {
            return self.innocent_risk(f, t);
        }
        if NATURE.contains(&id) {
            return if id == "bramble" || id == "seedburst" { self.wisp_near(tx, ty, 65.0) } else { self.wisp_on_line(f, tx, ty, 18.0) };
        }
        // d4
        if !ATTACK_POWERS.contains(&id) {
            return false;
        }
        if ["light", "silence", "storm"].contains(&id) {
            return self.innocent_risk(f, t);
        }
        if ["ember", "frostTouch", "kinetic", "venom", "chainLightning", "singularity"].contains(&id) {
            return self.wisps_near_cast(f, t);
        }
        self.wisp_on_line(f, tx, ty, 18.0)
    }

    /// The wisps' part of d6 `environmentStep`: they drift on their circles.
    pub fn drift_wisps(&mut self, dt: f64) {
        let (w, h) = (self.b.width, self.b.height);
        for wisp in self.b.wisps.iter_mut() {
            wisp.phase += dt * 0.35;
            wisp.x = clamp(wisp.x + jsmath::cos(wisp.phase) * dt * 8.0, 30.0, w - 30.0);
            wisp.y = clamp(wisp.y + jsmath::sin(wisp.phase) * dt * 8.0, 30.0, h - 30.0);
        }
    }

    /// The wisps' part of d6 `environmentStep`'s projectile pass: a projectile crossing a living wisp hurts it and
    /// stops. True when the projectile `(x, y) → (nx, ny)` was stopped.
    pub fn wisp_catches(&mut self, x: f64, y: f64, nx: f64, ny: f64, radius: f64, damage: f64) -> bool {
        for w in self.b.wisps.iter_mut() {
            if w.hp > 0.0 && segment_distance(w.x, w.y, x, y, nx, ny) < 5.0 + radius {
                w.hp = max(0.0, w.hp - damage);
                return true;
            }
        }
        false
    }

    /// The rations' part of d6 `upkeep(f, dt)`: a fighter on a ready ration eats it.
    pub fn eat_rations(&mut self, f: Ent) {
        let time = self.b.time;
        for i in 0..self.b.food.len() {
            let (fx, fy) = (self.f(f).x, self.f(f).y);
            let food = &mut self.b.food[i];
            if food.ready <= time && hypot2(fx - food.x, fy - food.y) < 20.0 {
                food.ready = time + 10.0;
                let e = self.fm(f);
                e.nutrition = min(100.0, e.nutrition + 70.0);
                e.mana = min(e.max_mana, e.mana + 8.0);
            }
        }
    }
}

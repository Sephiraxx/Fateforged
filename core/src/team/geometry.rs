//! Per-step helpers of the team engines, ported from `public/combat-team-v2.js` (`clamp`, `dist`,
//! `segmentDistance`, `angleGap`, `tickTimers`) and `public/combat-team-v2-1.js` (`segment`). Same arithmetic in
//! the same order, so results match bit for bit (checked by `team-helpers` against recorded JavaScript calls).
use super::state::Entity;
use crate::jsmath::{self, max, min};

/// `Math.max(a, Math.min(b, v))`
#[inline]
pub fn clamp(v: f64, a: f64, b: f64) -> f64 {
    max(a, min(b, v))
}

/// `Math.hypot(a.x - b.x, a.y - b.y)`
#[inline]
pub fn dist(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    jsmath::hypot2(ax - bx, ay - by)
}

/// Distance from point p to segment a–b (`segmentDistance` in combat-team-v2.js).
#[inline]
pub fn segment_distance(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    let dx = bx - ax;
    let dy = by - ay;
    let len = dx * dx + dy * dy;
    let t = clamp(((px - ax) * dx + (py - ay) * dy) / if len == 0.0 || len.is_nan() { 1.0 } else { len }, 0.0, 1.0);
    jsmath::hypot2(px - ax - dx * t, py - ay - dy * t)
}

/// Distance from obstacle o to segment a–b (`segment` in combat-team-v2-1.js): the same formula with its own
/// clamp written as `Math.max(0, Math.min(1, …))`.
#[inline]
pub fn segment(ox: f64, oy: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    let dx = bx - ax;
    let dy = by - ay;
    let len = dx * dx + dy * dy;
    let t = max(0.0, min(1.0, ((ox - ax) * dx + (oy - ay) * dy) / if len == 0.0 || len.is_nan() { 1.0 } else { len }));
    jsmath::hypot2(ox - ax - dx * t, oy - ay - dy * t)
}

/// `Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))` with the engines' portable sin/cos/atan2.
#[inline]
pub fn angle_gap(a: f64, b: f64) -> f64 {
    jsmath::atan2(jsmath::sin(a - b), jsmath::cos(a - b)).abs()
}

/// The per-step timer countdowns (`tickTimers`): each timer drops by `dt`, never below zero, in the same order.
pub fn tick_timers(f: &mut Entity, dt: f64) {
    macro_rules! tick {
        ($($field:ident),*) => { $( f.$field = max(0.0, f.$field - dt); )* };
    }
    tick!(
        exposed, wet, root, sleep, poison, bleed, regeneration, absorption, flight, invisible, insight, blind, amnesia,
        suppressed, disarmed, spirit_armor, shape, size_time, soul, chrono, death_mark, winded, illusion_time,
        portal_time, ward_time, future_time, mind_time
    );
}

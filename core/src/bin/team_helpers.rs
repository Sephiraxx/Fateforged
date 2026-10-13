//! Checks the ported per-step helpers against results recorded in JavaScript (`scripts/rust-parity.mjs`).
//! Usage: `team-helpers <cases.json>`. Prints a JSON summary; exits with status 1 on any mismatch.
use fateforge_core::team::digest::{Digest, Fnv};
use fateforge_core::team::geometry::{angle_gap, clamp, dist, segment, segment_distance, tick_timers};
use fateforge_core::team::jsnum::value_f64;
use fateforge_core::team::state::Entity;
use serde_json::Value;

fn nums(row: &Value) -> Vec<f64> {
    row.as_array().expect("a row of numbers").iter().map(|v| value_f64(v).expect("a number")).collect()
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: team-helpers <cases.json>");
    let cases: Value = serde_json::from_str(&std::fs::read_to_string(path).expect("readable cases")).expect("JSON");
    let mut report = Vec::new();
    let mut total_bad = 0usize;
    let mut check = |name: &str, f: &dyn Fn(&[f64]) -> f64, arity: usize| {
        let rows = cases[name].as_array().map(|a| a.as_slice()).unwrap_or(&[]);
        let bad = rows
            .iter()
            .filter(|row| {
                let n = nums(row);
                let (got, want) = (f(&n[..arity]), n[arity]);
                !(got.to_bits() == want.to_bits() || got.is_nan() && want.is_nan())
            })
            .count();
        total_bad += bad;
        report.push(format!("\"{name}\":{{\"cases\":{},\"mismatches\":{bad}}}", rows.len()));
    };
    check("clamp", &|a| clamp(a[0], a[1], a[2]), 3);
    check("dist", &|a| dist(a[0], a[1], a[2], a[3]), 4);
    check("segmentDistance", &|a| segment_distance(a[0], a[1], a[2], a[3], a[4], a[5]), 6);
    check("segment", &|a| segment(a[0], a[1], a[2], a[3], a[4], a[5]), 6);
    check("angleGap", &|a| angle_gap(a[0], a[1]), 2);
    // tickTimers: an entity before the tick, dt, and the JavaScript digest of the entity after it.
    let ticks = cases["ticks"].as_array().cloned().unwrap_or_default();
    let mut bad_ticks = 0;
    for t in &ticks {
        let mut e: Entity = serde_json::from_value(t["entity"].clone()).expect("an entity");
        tick_timers(&mut e, value_f64(&t["dt"]).expect("dt"));
        let mut h = Fnv::new();
        e.digest(&mut h);
        if h.hex() != t["digest"].as_str().unwrap_or("") {
            bad_ticks += 1;
        }
    }
    total_bad += bad_ticks;
    report.push(format!("\"tickTimers\":{{\"cases\":{},\"mismatches\":{bad_ticks}}}", ticks.len()));
    println!("{{{},\"total\":{total_bad}}}", report.join(","));
    if total_bad > 0 {
        std::process::exit(1);
    }
}

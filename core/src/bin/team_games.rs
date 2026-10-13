//! Full-game parity: plays whole team-4.0 games in Rust from the state JavaScript exported at the start, and checks
//! the battle digest against JavaScript's every `every` steps and at the end. Then plays each game again without
//! digests to time it.
//! Usage: `team-games <dir>`: every `<name>.game` holds `{state, every, digests, steps, jsSeconds}`.
//! Prints a JSON summary; exits with status 1 on any mismatch.
use fateforge_core::team::engine::Engine;
use fateforge_core::team::Snapshot;
use serde_json::{json, Value};
use std::fs;
use std::time::Instant;

fn main() {
    let dir = std::env::args().nth(1).expect("usage: team-games <dir>");
    let mut names: Vec<String> = fs::read_dir(&dir).expect("readable directory").filter_map(|e| e.ok()?.file_name().into_string().ok()).filter(|n| n.ends_with(".game")).collect();
    names.sort();
    let (mut ok, mut failures) = (0usize, Vec::new());
    let (mut js_seconds, mut rust_seconds, mut steps_total) = (0.0, 0.0, 0usize);
    for name in &names {
        let case: Value = serde_json::from_str(&fs::read_to_string(format!("{dir}/{name}")).expect("readable game")).expect("a JSON game");
        let snapshot: Snapshot = serde_json::from_value(case["state"].clone()).expect("a loadable state");
        let every = case["every"].as_u64().unwrap() as usize;
        let want: Vec<&str> = case["digests"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect();
        let want_steps = case["steps"].as_u64().unwrap() as usize;
        let mut eng = Engine::from_snapshot(snapshot.clone());
        let (mut step, mut mismatch) = (0usize, None);
        while !eng.b.done && step <= want_steps + 1 {
            eng.step(1.0 / 60.0);
            step += 1;
            if step % every == 0 || eng.b.done {
                let i = if eng.b.done { want.len() - 1 } else { step / every - 1 };
                if want.get(i).copied() != Some(eng.digest().as_str()) {
                    mismatch = Some(step);
                    break;
                }
            }
        }
        if mismatch.is_none() && step == want_steps {
            ok += 1;
        } else if failures.len() < 10 {
            failures.push(json!({"game": name, "firstMismatchStep": mismatch, "steps": step, "jsSteps": want_steps}));
        }
        // Timing: the same game again, without digests.
        let started = Instant::now();
        let mut eng = Engine::from_snapshot(snapshot);
        while !eng.b.done {
            eng.step(1.0 / 60.0);
        }
        rust_seconds += started.elapsed().as_secs_f64();
        js_seconds += case["jsSeconds"].as_f64().unwrap_or(0.0);
        steps_total += want_steps;
    }
    println!(
        "{}",
        json!({"games": names.len(), "matching": ok, "failures": failures, "steps": steps_total, "jsSeconds": js_seconds, "rustSeconds": rust_seconds, "speedup": if rust_seconds > 0.0 { js_seconds / rust_seconds } else { 0.0 }})
    );
    if ok != names.len() {
        std::process::exit(1);
    }
}

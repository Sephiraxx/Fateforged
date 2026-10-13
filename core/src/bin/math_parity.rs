//! Compares fateforge-core's JavaScript math with vectors recorded from a real JavaScript runtime.
//!
//! Usage: `math-parity <dir> <runtime>`. `<dir>` holds the files written by `scripts/rust-math-vectors.mjs`:
//! `inputs.f64` (x, y pairs), `<runtime>.out` (one row of results per pair, see `COLUMNS`; sin, cos and atan2 come
//! from `public/portable-math.js`, the rest from `Math`), `rng-seeds.f64` and `<runtime>.rng`. Prints a JSON summary; exits
//! with status 1 on any mismatch.
use fateforge_core::jsmath::{self, JsRandom};
use std::fs;

const COLUMNS: [&str; 9] = ["sin", "cos", "atan2", "hypot", "round", "max", "min", "toInt32", "toUint32"];
const RNG_STEPS: usize = 64;

fn read_f64s(path: &str) -> Vec<f64> {
    let bytes = fs::read(path).unwrap_or_else(|e| panic!("{path}: {e}"));
    bytes.chunks_exact(8).map(|c| f64::from_le_bytes(c.try_into().unwrap())).collect()
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("usage: math-parity <dir> <runtime>");
        std::process::exit(2);
    }
    let (dir, runtime) = (&args[1], &args[2]);
    let inputs = read_f64s(&format!("{dir}/inputs.f64"));
    let expected = read_f64s(&format!("{dir}/{runtime}.out"));
    let pairs = inputs.len() / 2;
    assert_eq!(expected.len(), pairs * COLUMNS.len(), "result file does not match the inputs");
    let mut mismatches = [0usize; COLUMNS.len()];
    let mut examples: Vec<String> = Vec::new();
    for i in 0..pairs {
        let (x, y) = (inputs[2 * i], inputs[2 * i + 1]);
        let got = [
            jsmath::sin(x),
            jsmath::cos(x),
            jsmath::atan2(y, x),
            jsmath::hypot2(x, y),
            jsmath::round(x),
            jsmath::max(x, y),
            jsmath::min(x, y),
            jsmath::to_int32(x) as f64,
            jsmath::to_uint32(x) as f64,
        ];
        for (c, value) in got.iter().enumerate() {
            let want = expected[i * COLUMNS.len() + c];
            // NaN payloads may differ between engines; JavaScript cannot observe them.
            let same = value.to_bits() == want.to_bits() || (value.is_nan() && want.is_nan());
            if !same {
                mismatches[c] += 1;
                if examples.len() < 12 {
                    examples.push(format!(
                        "{{\"fn\":\"{}\",\"x\":\"{:016x}\",\"y\":\"{:016x}\",\"want\":\"{:016x}\",\"got\":\"{:016x}\"}}",
                        COLUMNS[c],
                        x.to_bits(),
                        y.to_bits(),
                        want.to_bits(),
                        value.to_bits()
                    ));
                }
            }
        }
    }
    let seeds = read_f64s(&format!("{dir}/rng-seeds.f64"));
    let rng = read_f64s(&format!("{dir}/{runtime}.rng"));
    assert_eq!(rng.len(), seeds.len() * RNG_STEPS, "rng file does not match the seeds");
    let mut rng_mismatches = 0usize;
    for (s, &seed) in seeds.iter().enumerate() {
        let mut r = JsRandom::new(seed);
        for k in 0..RNG_STEPS {
            if r.next().to_bits() != rng[s * RNG_STEPS + k].to_bits() {
                rng_mismatches += 1;
            }
        }
    }
    let total: usize = mismatches.iter().sum::<usize>() + rng_mismatches;
    let per_fn: Vec<String> = COLUMNS.iter().zip(mismatches.iter()).map(|(n, m)| format!("\"{n}\":{m}")).collect();
    println!(
        "{{\"runtime\":\"{runtime}\",\"pairs\":{pairs},\"rngSeeds\":{},\"rngSteps\":{RNG_STEPS},\"mismatches\":{{{},\"rng\":{rng_mismatches}}},\"total\":{total},\"examples\":[{}]}}",
        seeds.len(),
        per_fn.join(","),
        examples.join(",")
    );
    if total > 0 {
        std::process::exit(1);
    }
}

//! Team battles (phase B of RUST-CORE.md). `state` is generated from `core/schema/team.json`
//! (scripts/gen-rust-state.mjs); `digest` and `jsnum` are its hand-written support.
pub mod digest;
pub mod engine;
pub mod geometry;
pub mod jsnum;
pub mod state;

use digest::{Digest, Fnv};
use serde::Deserialize;

/// A battle as exported by `scripts/lib/team-state.mjs` (`exportState`).
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    pub engine: String,
    #[serde(deserialize_with = "jsnum::f64")]
    pub seed: f64,
    #[serde(rename = "rngCalls", deserialize_with = "jsnum::f64")]
    pub rng_calls: f64,
    pub entities: Vec<state::Entity>,
    pub battle: state::Battle,
}

impl Snapshot {
    /// Same bytes and order as `digestState()` in `scripts/lib/team-state.mjs`.
    pub fn digest(&self) -> String {
        let mut h = Fnv::new();
        h.raw_u32(self.entities.len() as u32);
        for e in &self.entities {
            h.raw_u32(e.index as u32);
            e.digest(&mut h);
        }
        self.battle.digest(&mut h);
        h.raw_f64(self.rng_calls);
        h.hex()
    }
}

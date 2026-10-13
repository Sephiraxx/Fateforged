//! The team-4.0 engine in Rust (RUST-CORE.md, phase B). JavaScript builds a battle; this runs it.
//!
//! The JavaScript engine is a chain of 23 class layers. Each ported method keeps that shape: `name` is the version
//! a call reaches first (the most derived layer), and `name_dNN` is the layer at depth NN of the team-4.0 prototype
//! chain (0 = `PortableMathBattle`, 22 = the oldest duel layer), so `super.name(...)` becomes a call to the next
//! deeper layer that defines `name`. Only layer versions that run in team-4.0 games are ported (see
//! `scripts/rust-calls.mjs`, which also proves each method call by call against JavaScript).
use super::digest::{Digest, Fnv};
use super::jsnum::Ent;
use super::state::{Battle, Entity};
use super::Snapshot;
use crate::jsmath::JsRandom;

pub mod consts;
pub mod view;
pub mod movement;
pub mod objective;
pub mod queries;
pub mod effects;

pub use view::Tgt;

pub struct Engine {
    pub b: Battle,
    /// Entities by `index` (fighters, then the two Cores, then the Titan).
    pub e: Vec<Entity>,
    pub seed: f64,
    rng: JsRandom,
    rng_calls: f64,
    /// Fields the JavaScript engine sets and clears within one step (always empty between steps).
    pub tr: Transient,
}

/// Within-step state: `this.healSource`, `this.balanceCast`, `this.selectingFight`, `this.targetFilter`, ...
#[derive(Default, Clone, Debug)]
pub struct Transient {
    pub heal_source: Option<Ent>,
    /// `{fighter, id}` while a patched ability resolves.
    pub balance_cast: Option<(Ent, String)>,
    pub balance_environment: bool,
    pub selecting_fight: bool,
    pub target_filter: Option<TargetFilter>,
}

/// The filters `fight()` installs while a fighter picks a target.
#[derive(Clone, Debug, PartialEq)]
pub enum TargetFilter {}

impl Engine {
    pub fn from_snapshot(s: Snapshot) -> Engine {
        for (i, e) in s.entities.iter().enumerate() {
            assert_eq!(e.index as usize, i, "entity indexes must be 0..n in order");
        }
        assert!(s.battle.headless, "the Rust engine only runs headless battles");
        Engine { rng: JsRandom::resume(s.seed, s.rng_calls), rng_calls: s.rng_calls, seed: s.seed, b: s.battle, e: s.entities, tr: Transient::default() }
    }

    /// `this.rng()`: the battle's seeded generator.
    #[inline]
    pub fn rng(&mut self) -> f64 {
        self.rng_calls += 1.0;
        self.rng.next()
    }

    #[inline]
    pub fn f(&self, i: Ent) -> &Entity {
        &self.e[i.0 as usize]
    }
    #[inline]
    pub fn fm(&mut self, i: Ent) -> &mut Entity {
        &mut self.e[i.0 as usize]
    }

    /// Same as `Snapshot::digest` / `digestState()` in JavaScript.
    pub fn digest(&self) -> String {
        let mut h = Fnv::new();
        h.raw_u32(self.e.len() as u32);
        for e in &self.e {
            h.raw_u32(e.index as u32);
            e.digest(&mut h);
        }
        self.b.digest(&mut h);
        h.raw_f64(self.rng_calls);
        h.hex()
    }
}

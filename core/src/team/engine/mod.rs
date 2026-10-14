//! The team-4.0 (Core siege) and team-2.9 (classic teamfight) engines in Rust (RUST-CORE.md, phases B3 and B4).
//! JavaScript builds a battle; this runs it.
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
pub mod combat;
pub mod attack;
pub mod powers;
pub mod target;
pub mod step;
pub mod result;
pub mod wisps;
pub mod classic;
pub mod siege_ai;
pub mod cast;
pub mod levels;

pub use view::Tgt;

pub struct Engine {
    pub b: Battle,
    /// Entities by `index` (fighters, then the two Cores, then the Titan).
    pub e: Vec<Entity>,
    pub seed: f64,
    /// A classic teamfight (team-2.9): the team-4.0 chain without its Core siege layers (RUST-CORE.md, B4).
    pub classic: bool,
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
    /// `this.hitContext` while a hit resolves.
    pub hit_context: Option<combat::HitContext>,
}

/// The filters `fight()` installs while a fighter picks a target (d17): enemy fighters near our Core (Defend), or
/// near the Titan's pit (Flank).
#[derive(Clone, Debug, PartialEq)]
pub enum TargetFilter {
    NearCore(Ent),
    NearPit,
    /// d22: enemies hitting our team near the enemy Core (`hitters` are their indexes), or close to `me`.
    SiegeGuard { hitters: Vec<Option<f64>>, core: Ent, me: Ent },
}

impl Engine {
    pub fn from_snapshot(s: Snapshot) -> Engine {
        for (i, e) in s.entities.iter().enumerate() {
            assert_eq!(e.index as usize, i, "entity indexes must be 0..n in order");
        }
        assert!(s.battle.headless, "the Rust engine only runs headless battles");
        let classic = match s.engine.as_str() {
            "team-4.0" => false,
            "team-2.9" => true,
            other => panic!("engine {other} is not supported"),
        };
        Engine { classic, rng: JsRandom::resume(s.seed, s.rng_calls), rng_calls: s.rng_calls, seed: s.seed, b: s.battle, e: s.entities, tr: Transient::default() }
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

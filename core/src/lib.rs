//! Fateforge simulation core.
//!
//! See RUST-CORE.md. `jsmath` reproduces every JavaScript math operation the team engines use, bit for bit;
//! `team` holds the battle state (generated from the schema) and, phase by phase, the engine that steps it.
pub mod jsmath;
pub mod team;

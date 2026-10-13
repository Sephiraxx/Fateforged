# Rust simulation core

Season simulations and patch audits spend almost all of their time in the team engines. A 3v3 Core siege game (team-3.9) costs about 1.0 s of CPU in node, a 5v5 game about 1.7 s, and a classic 3v3 game (team-2.8) about 0.33 s. The cost is spread across terrain and line-of-sight geometry (about 30%), steering and movement (about 15%), timers, upkeep and garbage collection. A Rust core can run the same algorithms several times faster per core, with no garbage collector, compact data and no dynamic property lookups. In the app it can use every core natively, and on the web it can run through WebAssembly.

**The rule that shapes everything:** a game simulated in Rust must give a **bit-identical** result to the JavaScript engine of the same version. Season and audit games run in the pool, but watching a recorded game replays it in JavaScript. The server only checks a game's shape. A Rust result that differs by a single rounding would play out differently on screen.

**Scope:** only current and future engines (team-4.0 Core siege and team-2.9 classic onwards). Replays of games played on older engines don't need to stay exact, so nothing older is ported.

## Phases

| Phase | What | Status |
| --- | --- | --- |
| A | JavaScript-exact math, the crate, the state inventory, this plan | **Done** |
| A2 | Portable sin/cos/atan2 in JavaScript; engines team-2.9 and team-4.0 use them, so every device plays the same game | **Done** |
| B1 | Parity harness: the battle-state schema, JavaScript export and digest, the generated Rust state model, per-step helpers | **Done** |
| B2 | The engine skeleton and its low-level methods (queries, movement, the team brain, effects), proven call by call | **Done** |
| B3 | The combat core (damage, impacts, powers, attacks, targeting, the step): full-step parity on Core siege team-4.0, then a speed benchmark | **Done**: whole games bit-identical, about 8.5× faster per core |
| B4 | Classic teamfight team-2.9 (the layers Core siege does not use): full-step parity | |
| D | Wiring: a native batch command in the app (all cores), the pool falls back to JavaScript for anything else; later WebAssembly for the web version | 1–2 PRs |
| E | Duel engine (optional) | Later |

**Go:** the riskiest part, transcendental math, matches exactly (below). Nothing found in phase A blocks the port.

## Phase A results

### JavaScript math, bit for bit (`core/src/jsmath`)
The engines use `Math.sin`/`cos` (about 150 call sites), `atan2` (49), `hypot` (125), `round`, `min`/`max`, `imul` and `| 0`/`>>> 0`, plus the seeded generator `random(seed)` from `public/combat-v1.js`. Plain IEEE-754 arithmetic (+ − × ÷ `%` `sqrt` `floor` `ceil` `abs`) is already identical in Rust.

**`Math.sin` and `Math.cos` are not portable.**
- **Different builds:** node uses V8's fdlibm. Chrome, Edge (WebView2, the Windows app) and Android WebView are built with `v8_use_libm_trig_functions`, a copy of glibc.
- **Size of the difference:** about 2.2% of results differ by one unit in the last place.
- **Effect on games:** the same seeded team-3.9 game ended differently in node and Chromium for 4 of 6 seeds.

**The fix, phase A2:**
- `public/portable-math.js` is V8's fdlibm `sin`, `cos` and `atan2` in plain JavaScript. `atan2` is included because, although every V8 uses the same fdlibm today, it is compiled C++ inside the browser.
- Engines team-2.9 and team-4.0 swap these in while they build or step a battle (`public/portable-combat.js`).
- The same 12 seeded games now finish identically in node and Chromium.
- The portable versions cost about 0.015 µs more per call (about 2 ms per game).
- `hypot` is V8's own builtin (normalised Kahan sum), the same machine code everywhere, so it stays `Math.hypot`.

**Parity:** `scripts/rust-math-vectors.mjs` runs the same inputs in node and in Chromium:
- 1,000,000 input pairs: angles, field coordinates, tiny and huge values, values near multiples of π/2, rounding edges, special values and random bit patterns;
- 2,000 generator seeds × 64 values.

The Rust binary `math-parity` compares every result bit for bit (`validation/rust-math-parity.json`):

| Runtime | Mismatches (portable sin, cos, atan2; hypot, round, max, min, ToInt32, ToUint32, generator) | Differences from the other runtime |
| --- | --- | --- |
| node 22.22 (V8 12.4) | 0 | 0 |
| Chromium 141 (V8 14.1) | 0 | 0 |

The crate is MIT. `fdlibm.rs` keeps Sun's permissive notice, like `portable-math.js`. Rust never fuses floating-point operations, and neither do JavaScript engines, so ARM (Android) and x86 give the same bits.

### What a battle holds (`validation/rust-state-inventory.json`)
`scripts/inspect-battle-state.mjs` plays 20 seeded games per engine (all maps, 3v3 and 5v5) and samples the battle every second.

| Engine | Object kinds | Fields (union) | Fighter fields | Functions in state |
| --- | --- | --- | --- | --- |
| team-3.9 (= team-4.0's rules) | 78 | 1,169 | 163 | `battle.rng`, `plans[].along`, `plans[].exposed` |
| team-2.8 | 49 | 486 | 153 | the same three |

**Consequences for the handoff ("JavaScript builds, Rust steps"):**
- **Constructing stays in JavaScript.** It derives fighter stats from traits, rolls abilities, builds terrain and applies the balance profile. That code is large, already exact, and runs once per game.
- **Rust receives the state at time 0.** It then runs `step` until the game ends and returns `result()`.
- **Object links become ids** in the exported state (leash `ref`, `intent.slot`, `action.power`, Titan/Core actors, projectile tags), and copies that share an object stay shared.
- **The battle generator is a closure.** `battle.rng` hides its counter. The exporter finds how many values the constructor drew by matching the next values against a fresh `random(seed)`, and Rust resumes from there.
- **`plans[].along` and `plans[].exposed`** are rebuilt every plan update, so they become methods in Rust.

## Phase B1: the parity harness

Every later phase is proven against JavaScript with these tools.

- **Schema** (`core/schema/team-4.0.json`, built by `scripts/rust-schema.mjs`):
  - **What it covers:** the type of every field of a running team-4.0 battle, sampled every 10 steps over 48 games. The games span every map, 3v3 and 5v5, every test composition, plus 13 coverage games that force all 74 abilities onto generation-4 fighters, half of them under a league patch.
  - **Result:** 54 object kinds and 537 fields.
  - **Shared kinds:** fighters, Cores and the Titan share one kind, `entity`. An object reached from two places (a fighter's `intent.slot` and its team plan's slot) gets one kind.
  - **Maps:** objects keyed by data (ability ids, team sizes, slots) are maps.
  - **Optional fields:** a field missing on some objects (the Titan lacks some fighter fields) is optional.
- **Export and digest** (`scripts/lib/team-state.mjs`):
  - `exportState(b)` writes the battle as JSON:
    - entities are listed by `index` and linked as `{"$e":index}`;
    - −0, NaN and ±Infinity are written as `{"$f":"<bits>"}`;
    - the battle generator is written as a call count, recovered from an identical twin battle and then counted.
  - A field the schema doesn't know throws, so gaps show up immediately.
  - `digestState(b)` is FNV-1a 64 over a tagged binary walk of the same fields in schema order.
- **Rust state model** (`core/src/team/state.rs`, generated by `scripts/gen-rust-state.mjs`):
  - one struct per kind, loaded with `deny_unknown_fields`, exact number parsing and JavaScript key order (`core/src/team/jsnum.rs`);
  - a `Digest` implementation that writes the same bytes (`core/src/team/digest.rs`).
  - `--check` fails when the committed file no longer matches the schema.
- **Per-step helpers** (`core/src/team/geometry.rs`): `clamp`, `dist`, `segmentDistance`, `segment` (line of sight), `angleGap` and `tickTimers`.
- **Parity run** (`scripts/rust-parity.mjs`, recorded in `validation/rust-parity.json`):
  - 171 snapshots from 25 games (game start, 1 step, 5 s, 30 s, 100 s, 200 s and the end) load in Rust and digest identically. A one-bit change in a coordinate changes the digest.
  - About 83,000 helper calls on values taken from those games, plus edge cases (NaN, ±0, zero-length segments, huge values), match bit for bit.
- **JavaScript quirks the port must keep:**
  - The Titan's target is a string key (`"3"`, from `Object.entries`), so `===` against a fighter index is false. The model keeps `target` as number-or-string.
  - Some fields only exist inside a step (`castPayload`, `selectedPower`, `teleportPlan`, …). They are always null between steps and become locals in Rust.

## Phase B2: the engine and its low-level methods

- **Engine** (`core/src/team/engine`): an `Engine` holds the loaded battle state, the generator (seed plus call count) and the within-step fields (`healSource`, `balanceCast`, …), which are passed in separately.
  - **Methods:** 74 team-4.0 methods are ported, listed in `scripts/lib/rust-ported.mjs`. They cover queries (`queries.rs`), movement and steering (`movement.rs`), the team brain, duties, respawns and the Titan's attacks (`objective.rs`), and healing, crowd control, zones, knockback, cover checks, spell projectiles and support targeting (`effects.rs`).
  - **Inheritance:** each JavaScript method is a chain of overrides across the 23 layers of the prototype chain. The Rust version is that chain written out in order, with only the live layer versions ported. Doc comments name the layers (`d16` is depth 16 of the chain).
  - **Stand-ins:** JavaScript sometimes passes a copy of a fighter (`{...t}`) or a look-alike (`Object.create(t)`) with a few fields replaced. Rust passes a `Tgt`: the entity plus the replaced fields.
- **Call-by-call parity** (`scripts/rust-calls.mjs`, recorded in `validation/rust-calls.json`):
  - **Recording:** JavaScript plays seeded team-4.0 games (31 in the full run: every map, both sizes, varied tactics and game plans, and the coverage games that force every ability). It wraps each ported method; for the first calls and then every 37th, it records the state before the call, the arguments, the return value and the state digest after it. Nested calls are recorded too.
  - **Replay:** the `team-calls` binary loads each recorded state, makes the same call in Rust, and compares the return value and the digest of the whole battle afterwards, bit for bit.
  - **Result:** 31,937 recorded calls, all matching. `holdPoint` (a tank holding a point under a hold posture) never comes up in the recorded games; it is proven when the full-step parity of B3 runs.
- **Schema:** it now also samples inside steps (at every 1500th method call and every power use), so values that only exist while a step runs (a power being weighed, a cast payload) are typed. Games now also vary tactics, flank game plans and league balance patches, so posture, lane and patch fields are covered.
- **JavaScript quirks kept:**
  - integer-like object keys iterate in ascending order (plan slots);
  - `??` against `=== null` are kept apart;
  - comparisons with `undefined` are false, and NaN is falsy;
  - sorts are stable, and comparator `||` chains are kept as written.
- **Always empty in team battles:** wisps, food, portals, visual effects and events. So the neutral-wisp checks are always false, and logs and effects do nothing headless.

## Phase B3: the combat core

- **Damage path** (`core/src/team/engine/combat.rs`), proven call by call like B2, as is everything below:
  - `hit`, `periodicHit`, `connectControl` and `applyImpact` (every spell payload, kit and support control, and a patched ability's context);
  - `hurt` and `fighterHit`.
- **The `hurt` chain:** for team-4.0 it runs d20 → d19 → d17 → d16 → d15 → d12 → d11 → d10:
  - controller and healer output, the Core damage ramp and hit times, role output;
  - Forgefire claims and losses, kit stuns, Forgefire damage and the Titan's bookkeeping;
  - Core damage and the downed and respawn bookkeeping.
- **Fighters:** they go through `fighterHit`: dives, overtime, exposure, the Bulwark guard's share, Forgefire's shield and kill credit. That calls the duel `hurt` directly (d5 parries and counters, d3 Phoenix rebirth, d2 armor, weaknesses, the dodge and critical rolls, absorption, shields, knockback and the payload). So the d9, d8 and d6 versions never run.
- **`hitContext`:** a record or the projectile that hit. Rust keeps one `HitContext`, and the call recorder passes it with the other within-step fields.
- **Not yet called:** `connectControl` only runs for Memory, which the recorded games never cast; full-step parity covers it.
- **Attacks** (`core/src/team/engine/attack.rs`):
  - `startAttack`: abilities first, hold fire behind cover, wind up a swing or aim a shot.
  - `updateAttack` (d20 → d14 → d12 → d8 → d7 → d6 → d5 → d4 → d2 → d1): support abilities resolving, held shots, Cleave's arc, techniques, spell casts, swings and shots, decoys, loud weapons and portal shots.
  - `applySupportAbility`.
- **Powers** (`core/src/team/engine/powers.rs`):
  - `powerUtility`, `powerPriority`, `copyChoice`, `castPower`;
  - `usePower`, for every power a team-4.0 fighter can roll.
- **Dead for team-4.0:** team kits (`teamKit` is always null; rolled support abilities replaced them). Neutral wisps never exist, so `powerUnsafe` and `innocentRisk` are always false.
- **Targeting** (`core/src/team/engine/target.rs`):
  - **`chooseTarget`:** with a team brain (always, in team-4.0) it runs d19 (taunts, defending the Core) → d18 (flank lanes) → d17 (the plan picks fighters, the Titan or the enemy Core). The d11 and d10 versions never run.
  - **`fight`:** the formation chooser (d8 → d6), with only fighters in view and an optional filter (near our Core, or near the pit).
- **The step** (`core/src/team/engine/step.rs`):
  - **`step` (d10):** respawns, the environment, upkeep, plans, each fighter's target, movement, attack and powers, separation, projectiles, terrain, the objectives, control immunity and the time limit.
  - **The layers it calls:** `upkeep`, `environmentStep` (d6: `step` calls it past the d14 wrapper), `objectiveStep` (Core pulses, Forgefire time and shields, the Titan's respawn, aggro, walk, swing, reset, slam, the brain, backdoor duty, Molten Hurl and the Fissure), `releaseFissure` and `finishAtLimit`.
  - **Portable math:** d22 only swaps in the portable math, which Rust always uses.
- **Full-game parity** (`scripts/rust-games.mjs`, recorded in `validation/rust-games.json`):
  - **How it works:** JavaScript plays seeded games and records the battle digest every 60 steps and at the end. The `team-games` binary plays each game in Rust from the same starting state and must reach the same digest at every checkpoint and end on the same step.
  - **Result:** __GAMES__ games (five seeds for every map, size and test composition, plus the coverage games that force every ability), __STEPS__ steps, all bit-identical.
  - **Speed** (one core each, the same games): JavaScript __JS__ s, Rust __RUST__ s, **__SPEEDUP__× faster**.
- **Not yet ported:** `result()`, the summary a finished game reports. The wiring in phase D needs it.

### Port order (team-4.0, 42 modules, about 265 KB of JavaScript)
1. **Duel base the team engines inherit:**
   - `combat-v1` (generator, helpers);
   - `combat-v12-base`, `-profile`, `-contact`, `-environment`, `-powers`, `combat-v12`;
   - the ability catalogs v11–v13, as data.
2. **Team core:**
   - `team-roles`, `team-maps`, `team-kits`;
   - `combat-team-v2` (formations, movement, terrain, targeting), the largest layer;
   - `combat-team-v2-1` to `v2-3` (line of sight, kits, Bulwark).
3. **Objectives:**
   - `objective-maps`, `combat-team-v3-core` (Cores, respawns), `combat-team-v3` (Titan, Forgefire);
   - `support-combat`, `targeted-balance-combat`, `comprehensive-balance-combat`, `role-output-combat`;
   - `combat-team-v3-1` to `v3-4`.
4. **Brain and current rules:**
   - `combat-team-v3-5` (team brain), `team-game-plan` and `combat-team-v3-6`;
   - `combat-team-v3-7` (backdoor duty, Molten Hurl, Fissure), `role-tuning` and `combat-team-v3-8`;
   - `combat-team-v3-9` (spread terrain, unsticking), `combat-team-v4-0` and `portable-combat` (portable math).

B2 and B3 ported every group and proved each method call by call, then whole games with a **trace diff**: both languages hash the battle state every 60 steps, and a mismatch names the first differing step.

### Wiring (phase D)
- **Native batches:** a Tauri command `simulate_batch(games)` runs games on all cores (rayon).
- **Pool routing:** `public/simulation-client.js` sends a batch to Rust only when it runs inside the app, the engine version is in the core's verified list, and a short startup self-test against the WebView's own results passes. Everything else, including every older engine, keeps using the JavaScript pool.
- **Web:** WebAssembly comes after the app, from the same crate.
- **Maintenance rule:** new engine versions ship in JavaScript first and work immediately through the fallback. The Rust core catches up afterwards, and only then do those games run natively.

## Commands
- `node scripts/check-rust-core.mjs`, part of `check-all`:
  - checks the recorded parity and the inventory;
  - with cargo installed, also runs the unit tests and a fresh 200k-input comparison.
- `node scripts/rust-math-vectors.mjs <dir> --chromium --record` re-records the parity file. It needs `playwright-core`; point `PLAYWRIGHT_CORE` at its `index.mjs`. `--compare` only compares.
- `node scripts/inspect-battle-state.mjs` regenerates the state inventory.
- `node scripts/rust-schema.mjs` rebuilds the schema (about 25 minutes); then run `node scripts/gen-rust-state.mjs` to regenerate `core/src/team/state.rs`.
- `node scripts/rust-parity.mjs [--quick] [--record]` checks snapshots and helpers against Rust. `--quick` (7 games) runs in `check-rust-core` and CI; `--record` writes `validation/rust-parity.json`.
- `node scripts/rust-games.mjs [--quick] [--record]` plays whole games in both languages and compares them, and times both. `--quick` (8 games) runs in `check-rust-core` and CI; `--record` writes `validation/rust-games.json`.
- `node scripts/rust-calls.mjs [--quick] [--methods a,b] [--record]` replays recorded engine-method calls in Rust. `--quick` (8 games, 6 calls per method per game) runs in `check-rust-core` and CI; `--record` writes `validation/rust-calls.json`. Add each newly ported method to `scripts/lib/rust-ported.mjs` and to the dispatch in `core/src/bin/team_calls.rs`.
- **CI:** the App builds workflow runs the crate's tests, a 200k math comparison and the quick state, call and game parity runs on Windows, and builds the crate for Android.

# Rust simulation core

Season simulations and patch audits spend almost all of their time in the team engines. A 3v3 Core siege game (team-3.9) costs about 1.0 s of CPU in node, a 5v5 game about 1.7 s, and a classic 3v3 game (team-2.8) about 0.33 s. The cost is spread across terrain and line-of-sight geometry (about 30%), steering and movement (about 15%), timers, upkeep and garbage collection. A Rust core can run the same algorithms several times faster per core, with no garbage collector, compact data and no dynamic property lookups. In the app it can use every core natively, and on the web it can run through WebAssembly.

**The rule that shapes everything:** a game simulated in Rust must give a **bit-identical** result to the JavaScript engine of the same version. Season and audit games run in the pool, but watching a recorded game replays it in JavaScript. The server only checks a game's shape. A Rust result that differs by a single rounding would play out differently on screen.

**Scope:** only current and future engines (team-4.0 Core siege and team-2.9 classic onwards). Replays of games played on older engines don't need to stay exact, so nothing older is ported.

## Phases

| Phase | What | Status |
| --- | --- | --- |
| A | JavaScript-exact math, the crate, the state inventory, this plan | **Done** |
| A2 | Portable sin/cos/atan2 in JavaScript; engines team-2.9 and team-4.0 use them, so every device plays the same game | **Done** |
| B | Port the Core siege engine (team-4.0) step loop with exact parity | Next, about 3–4 PRs |
| C | Classic teamfight (team-2.9), which mostly shares B's layers | 1 PR |
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

Each PR ports a group and proves it with a **trace diff**. Both languages hash the battle state every 60 steps, and a mismatch names the first differing step and field. A group is done when every recorded fingerprint game and 200 random seeded games (3v3 and 5v5, every map) match exactly.

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
- **CI:** the App builds workflow runs the crate's tests and a 200k comparison on Windows, and builds the crate for Android.

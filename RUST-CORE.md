# Rust simulation core

Season simulations and patch audits spend almost all of their time in the team engines. A 3v3 Core siege game (team-3.9) costs about 1.0 s of CPU in node, a 5v5 game about 1.7 s, and a classic 3v3 game (team-2.8) about 0.33 s. The cost is spread across terrain and line-of-sight geometry (about 30%), steering and movement (about 15%), timers, upkeep and garbage collection. A Rust core can run the same algorithms several times faster per core, with no garbage collector, compact data and no dynamic property lookups. In the app it can use every core natively, and on the web it can run through WebAssembly.

**The rule that shapes everything:** a game simulated in Rust must give a **bit-identical** result to the JavaScript engine of the same version. Season and audit games run in the pool, but watching a recorded game replays it in JavaScript. The server only checks a game's shape. A Rust result that differs by a single rounding would play out differently on screen.

## Phases

| Phase | What | Status |
| --- | --- | --- |
| A | JavaScript-exact math, the crate, the state inventory, this plan | **Done** |
| B | Port the Core siege engine (team-3.9) step loop with exact parity | Next, about 3–4 PRs |
| C | Classic teamfight (team-2.8), which mostly shares B's layers | 1 PR |
| D | Wiring: a native batch command in the app (all cores), the pool falls back to JavaScript for anything else; later WebAssembly for the web version | 1–2 PRs |
| E | Duel engine v13 (optional) | Later |

**Go:** the riskiest part, transcendental math, matches exactly (below). Nothing found in phase A blocks the port.

## Phase A results

### JavaScript math, bit for bit (`core/src/jsmath`)
The engines use `Math.sin`/`cos` (about 125 call sites), `atan2` (49), `hypot` (125), `round`, `min`/`max`, `imul` and `| 0`/`>>> 0`, plus the seeded generator `random(seed)` from `public/combat-v1.js`. Plain IEEE-754 arithmetic (+ − × ÷ `%` `sqrt` `floor` `ceil` `abs`) is already identical in Rust.

`scripts/rust-math-vectors.mjs` records 1,000,000 input pairs in node and in Chromium. The inputs cover angles, field coordinates, tiny and huge values, values near multiples of π/2, rounding edges, special values and random bit patterns. It also records 2,000 generator seeds × 64 values. The Rust binary `math-parity` compares every result bit for bit (`validation/rust-math-parity.json`):

| Runtime | sin/cos | Mismatches (sin, cos, atan2, hypot, round, max, min, ToInt32, ToUint32, generator) |
| --- | --- | --- |
| node 22.22 (V8 12.4) | fdlibm | 0 |
| Chromium 141 (V8 14.1) | glibc | 0 |

**Two different sin/cos.** V8 builds disagree. Node uses V8's fdlibm port. Chrome, Edge (WebView2, the Windows app) and Android WebView are built with `v8_use_libm_trig_functions`, which uses V8's copy of glibc's IBM Accurate Mathematical Library.
- The two differ by one unit in the last place for about 2.2% of inputs (22,003 sin and 23,364 cos results of 1,000,000). Every other function is identical.
- The Rust core implements both. `public/js-math-flavor.js` detects which one the JavaScript side uses (`trigFlavor()` → `'fdlibm'`, `'glibc'` or `null`), so Rust always matches the runtime that replays the game. An engine with neither, such as Safari's system libm, stays on JavaScript.
- `atan2` is fdlibm everywhere. `hypot` is V8's own builtin (normalised Kahan sum), the same in every V8 build.

**This already matters today.** The same seeded team-3.9 game run in node and in Chromium finished differently for 2 of 4 seeds (for example 273 s against 329 s), while 4 of 4 classic games matched. So a league simulated in Chrome or the app replays exactly in Chrome or the app, but not necessarily in node or in browsers outside the Chromium family (Firefox and Safari use their own sin/cos). Node-recorded checks such as `validation/team-engine-fingerprints.json` describe node's results.
- A future engine version could remove the difference for new games by calling a JavaScript sin/cos (for example an fdlibm port) instead of `Math.sin`/`Math.cos`.
- Existing versions keep `Math`, so their replays stay exact on the platform that produced them.

**Licence.**
- `core/src/jsmath/glibc.rs` and `glibc_table.rs` are a line-by-line port of glibc's IBM Accurate Mathematical Library as bundled by V8, so they are **LGPL-2.1-or-later** (marked in both files).
- The rest of the crate is MIT, like the repository; `fdlibm.rs` keeps Sun's permissive notice.
- The app links the core statically. LGPL then requires that users can rebuild the app with a modified version of that module. The repository is public and the app builds from it, which provides that.

**Compiler caveat for phase D.** On ARM, a C compiler may fuse `a*b+c` into one instruction. Whether Chromium's Android build does this for its glibc copy cannot be tested here. The app will therefore run a short parity self-test against its own WebView at startup (a few thousand values) before trusting the native core, and fall back to JavaScript on any mismatch.

### What a battle holds (`validation/rust-state-inventory.json`)
`scripts/inspect-battle-state.mjs` plays 20 seeded games per engine (all maps, 3v3 and 5v5) and samples the battle every second.

| Engine | Object kinds | Fields (union) | Fighter fields | Functions in state |
| --- | --- | --- | --- | --- |
| team-3.9 | 78 | 1,169 | 163 | `battle.rng`, `plans[].along`, `plans[].exposed` |
| team-2.8 | 49 | 486 | 153 | the same three |

**Consequences for the handoff ("JavaScript builds, Rust steps"):**
- **Constructing stays in JavaScript.** It derives fighter stats from traits, rolls abilities, builds terrain and applies the balance profile. That code is large, already exact, and runs once per game.
- **Rust receives the state at time 0.** It then runs `step` until the game ends and returns `result()`.
- **Object links become ids** in the exported state (leash `ref`, `intent.slot`, `action.power`, Titan/Core actors, projectile tags), and copies that share an object stay shared.
- **The battle generator is a closure.** `battle.rng` hides its counter. The exporter finds how many values the constructor drew by matching the next values against a fresh `random(seed)`, and Rust resumes from there.
- **`plans[].along` and `plans[].exposed`** are rebuilt every plan update, so they become methods in Rust.

### Port order (team-3.9, 39 modules, about 256 KB of JavaScript)
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
   - `combat-team-v3-9` (spread terrain, unsticking).

Each PR ports a group and proves it with a **trace diff**. Both languages hash the battle state every 60 steps, and a mismatch names the first differing step and field. A group is done when every recorded fingerprint game and 200 random seeded games (3v3 and 5v5, every map, both math flavours) match exactly.

### Wiring (phase D)
- **Native batches:** a Tauri command `simulate_batch(games, flavor)` runs games on all cores (rayon).
- **Pool routing:** `public/simulation-client.js` sends a batch to Rust only when all of these hold:
  - it runs inside the app;
  - the engine version is in the core's verified list;
  - `trigFlavor()` is known;
  - the startup self-test passed.

  Everything else, including every older engine, keeps using the JavaScript pool. Saves and replays are unchanged.
- **Web:** WebAssembly comes after the app, from the same crate.
- **Maintenance rule:** new engine versions ship in JavaScript first and work immediately through the fallback. The Rust core catches up afterwards, and only then do those games run natively.

## Commands
- `node scripts/check-rust-core.mjs`, part of `check-all`:
  - checks the recorded parity and the inventory;
  - with cargo installed, also runs the unit tests and a fresh 200k-input comparison.
- `node scripts/rust-math-vectors.mjs <dir> --chromium --record` re-records the parity file. It needs `playwright-core`; point `PLAYWRIGHT_CORE` at its `index.mjs`.
- `node scripts/inspect-battle-state.mjs` regenerates the state inventory.
- **CI:** the App builds workflow runs the crate's tests and a 200k comparison on Windows, and builds the crate for Android.

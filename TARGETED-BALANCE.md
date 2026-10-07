# Save-specific ability and stat balance

Each team league can automatically adjust its own effective STR, SPD, DUR, IQ and MAG, plus the cooldown of a named ability. Ability cooldown changes affect the shared timer for that cast and any separate cooldown the ability already has. Saved rolls, original fighter roles, scouting ratings and other leagues remain unchanged.

Preseason changes can reach **10% of the current value**. Midseason changes remain limited to **1.5%**. The existing cumulative range of 85%-115% of base rules is retained. A cooldown increase is a nerf; a cooldown reduction is a buff.

## Controlled Monte Carlo audit

Before starting a season, and after the halfway week's final match, the browser runs the audit in background workers. The season waits for the audit before continuing. Reopening a league with an unfinished halfway audit retries it before the next watched or simulated game.

An audit selects at most four candidates from the roster and season observations, reserving a rotating stat slot. All five stats are considered over successive seasons, even if the roster lacks a suitable specialist. Real season results help choose what to investigate; they do not directly trigger a broad role nerf in the new system.

Each candidate is checked in 28 randomized cases, played from both sides:

- Ability controls substitute another ability of the same rarity, type and class-affinity bucket with compatible equipment. Other traits and stats are held constant, and the fighter must keep the same role.
- Stat controls use a different allocation from a fighter of the same role, tier and weapon type. The total stat budget and all other traits are held constant.
- Teammates and team size stay identical between the two sides. Cases vary the actual roster members, formations, terrain, daylight and weather. At least two distinct carriers and controls are required.
- A confidence interval with z=2.5 and the 45%-55% neutral band screens initial results. A suspected imbalance is checked again using different combat seeds. The proposed correction must retain the evidence direction and improve that validation result by at least one paired win, without a substantial overshoot.

The audit uses up to 56 initial games per candidate and another 112 games when a correction needs validation: at most 672 games per checkpoint. Unsuitable controls are recorded as needing assessment. Results that do not repeat, or do not respond to the proposed adjustment, are also held for assessment. Simulation wins are diagnostic comparisons against matched controls, not predictions of the next season's league win rate.

Only the strongest individually confirmed change is applied at a checkpoint. Other confirmed candidates are held for later checks so independently tested changes cannot combine into an untested patch. Future work can add joint-patch validation and additional per-ability effect fields; this release adjusts individual ability cooldowns.

## Persistence and history

Audit reports are checked against the save, season, roster, tactics, patch and deterministic candidate plan. Stale or foreign reports are rejected. Commands retain the existing revision and retry rules. Like normal match simulations, combat runs locally and the API validates the submitted report's provenance and structure; it does not repeat hundreds of fights on the server.

Patches and diagnostics are grouped inside a collapsible dropdown for each season. Old patch snapshots and combat engines remain available for replays. Current teamfight and Core siege engines are 2.5 and 3.2; older ongoing seasons retain their captured rules until the next season starts.

Past champions now record an immutable roster at the final: every fighter's name, role, original stats and abilities, OVR, contract, season totals, and whether they played the deciding game's winning lineup. Those fighters remain inspectable after transfers or retirement. Older seasons without recorded roster data display that limitation instead of showing today's roster as historical fact.

## Checks

`scripts/check-targeted-balance.mjs` checks real deterministic mirrored fights, effective stat and individual cooldown application, role/roll preservation, both current engine families, unchanged base-rule outcomes, adjustment limits, immutable patch snapshots, stale-report rejection, disabled balancing, and synthetic diagnostic feedback. Synthetic results test the controller rather than prove real balance improvement.

Team season checks exercise audited preseason commands, retry-safe saves, halfway audit recording, and championship roster persistence. Additional series, offseason, legacy balance, support ability, arena replay, objective, import graph and Pages storage checks cover regressions. Browser verification uses a disposable league and a full season through its championship roster.

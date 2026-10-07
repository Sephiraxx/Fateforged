# Save-specific role, ability and stat balance

Each team league can automatically adjust its own effective STR, SPD, DUR, IQ and MAG, plus the cooldown of a named ability and the existing role-specific health, healing, control, damage and stacked-tank protection modifiers. Ability cooldown changes affect the shared timer for that cast and any separate cooldown the ability already has. Saved rolls, original fighter roles, scouting ratings and other leagues remain unchanged.

Preseason changes can reach **10% of the current value**. Midseason changes remain limited to **1.5%**. The existing cumulative range of 85%-115% of base rules is retained. A cooldown increase is a nerf; a cooldown reduction is a buff.

## Controlled Monte Carlo audit

Before starting a season, and after the halfway week's final match, the browser runs the audit in background workers. The season waits for the audit before continuing. Reopening a league with an unfinished halfway audit retries it before the next watched or simulated game.

An audit selects at most four candidates from the roster and season observations, reserving a rotating stat slot and a slot for the strongest statistically supported role or composition concern. Priority uses sample size as well as performance, so a widely rolled ability cannot hide a serious tank-composition problem. All five stats are considered over successive seasons, even if the roster lacks a suitable specialist. Real season results help choose what to investigate. A role adjustment still requires independent controlled comparisons and a responsive validation result.

Each candidate is checked in 28 randomized cases, played from both sides:

- Ability controls substitute another ability of the same rarity, type and class-affinity bucket with compatible equipment. Other traits and stats are held constant, and the fighter must keep the same role.
- Stat controls use a different allocation from a fighter of the same role, tier and weapon type. The total stat budget and all other traits are held constant.
- Role controls replace one fighter with a different role of the same tier, within 10 OVR and 20% of the rolled stat budget. Real abilities and equipment stay intact. Single-role tests hold the other members outside the tested role; stacked tests hold exactly the requested count versus one fewer.
- Teammates and team size stay identical between the two sides. Cases vary the actual roster members, formations, terrain, daylight and weather. At least two distinct carriers and controls are required.
- A confidence interval with z=2.5 and the 45%-55% neutral band screens initial results. A suspected imbalance is checked again using different combat seeds. Strong season evidence may supply initial confidence when both discovery and validation simulations independently corroborate its direction outside the neutral band. The correction must improve validation by at least one paired win, or leave wins unchanged while improving fight margin consistently. Margin combines winner and surviving team health (Core health in objective mode); the minimum mean gain is 0.005 and its paired lower bound at z=2.5 must remain positive. No substantial overshoot is allowed.

The audit uses up to 56 initial games per candidate and another 112 games when a correction needs validation: at most 672 games per checkpoint. Unsuitable controls are recorded as needing assessment. Results that do not repeat, or do not respond to the proposed adjustment, are also held for assessment. Simulation wins are diagnostic comparisons against matched controls, not predictions of the next season's league win rate.

Only the strongest individually confirmed change is applied at a checkpoint. Other confirmed candidates are held for later checks so independently tested changes cannot combine into an untested patch. Future work can add joint-patch validation and additional per-ability effect fields; this release adjusts individual ability cooldowns.

## Persistence and history

Audit reports are checked against the save, season, roster, tactics, patch and deterministic candidate plan. Stale or foreign reports are rejected. Commands retain the existing revision and retry rules. Like normal match simulations, combat runs locally and the API validates the submitted report's provenance and structure; it does not repeat hundreds of fights on the server.

Both halves of the season are retained for the next preseason, even after a midseason audit clears its checkpoint samples. All role totals are also retained from the full season report. Older saves can recover the strongest whole-season role observation from their existing offseason report without guessing missing individual ability results.

Unresolved season evidence, missing controls, unresponsive adjustments and cumulative limits are shown as needing assessment instead of being silently labelled stable. Patches and diagnostics are grouped inside a collapsible dropdown for each season. Old patch snapshots and combat engines remain available for replays. Current teamfight and Core siege engines are 2.5 and 3.2; older ongoing seasons retain their captured rules until the next season starts.

Past champions now record an immutable roster at the final: every fighter's name, role, original stats and abilities, OVR, contract, season totals, and whether they played the deciding game's winning lineup. Those fighters remain inspectable after transfers or retirement. Older seasons without recorded roster data display that limitation instead of showing today's roster as historical fact.

## Checks

`scripts/check-targeted-balance.mjs` checks real deterministic mirrored fights, effective stat and individual cooldown application, role/roll preservation, both current engine families, unchanged base-rule outcomes, adjustment limits, immutable patch snapshots, stale-report rejection, disabled balancing, and synthetic diagnostic feedback. Synthetic results test the controller rather than prove real balance improvement.

Team season checks exercise audited preseason commands, retry-safe saves, halfway audit recording, and championship roster persistence. Additional series, offseason, legacy balance, support ability, arena replay, objective, import graph and Pages storage checks cover regressions. Browser verification uses a disposable league and a full season through its championship roster.

## Tank failure reproduced from the October 7 backup

The save started season 4 after three new audits with zero changes. None of those audits investigated roles. The season 3 report recorded tanks winning 8 of 49 comparable matchups (16.3%); only the latter-half samples (1 win in 22) survived in the old audit data. Tank health remained at 1.0654 of base.

The corrected four-candidate audit checks tanks, Taunt shout, Spirit summons and IQ. Across 28 cases mirrored from both sides, the tank health proposal moves 1.0654 to 1.15 (+7.9%, bounded by the existing cumulative cap). Independent validation improves from 12 to 14 paired wins (42.9% to 50%). Taunt shout does not corroborate its season disadvantage, and the proposed Spirit summons adjustment does not help, so both are held for assessment. IQ remains stable. The full check ran 448 games. These comparisons support the adjustment; they do not predict a 50% league win rate.

The read-only reproduction is `scripts/verify-composition-save.mjs <backup.sqlite>`, with aggregate results in `validation/composition-save-audit.json`. The source backup hash is checked before and after. No fighters, matches or settings in the source SQLite file are edited. `scripts/check-composition-balance.mjs` covers crowded candidate selection, role controls, margin-only improvements, noisy/unresponsive/capped adjustments, old-save evidence and full-season retention through an actual rollover.

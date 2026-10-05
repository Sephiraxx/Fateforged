# Balance v11: implemented patch and validation

All 24 approved items from `BALANCE-V11-PROPOSAL.md` are implemented. The approved numbers remain unchanged. This report separates implementation checks from balance outcomes: the patch works, but several matchup targets still need tuning.

## Implemented changes

| ID | Released rule |
| --- | --- |
| C1 | Always retire Dawnrise's actual bottom three, then up to seven other completed careers, oldest eligibility first and fighter ID as the tiebreaker. Overlapping causes count once without using an additional career slot. |
| C2 | Leave unused career slots empty: three to ten departures per season. |
| C3 | Replace each departure exactly once. Take the required prefix of ordinary, Rare, ordinary, Unique, exceptional, ordinary, Rare, ordinary, Unique, exceptional. Exceptional slots stay 85% Legendary / 15% Mythic. No forced SS. |
| W1 | Ordinary arcane shots add 0.05 × spell instead of 0.20. |
| W2 | Ordinary arcane shots use full armor instead of 65%; they remain magical for absorption and weaknesses. Actual powers keep 40% armor. |
| W3 | Arcane weapon range increases from 185 to 200. |
| W4 | Active melee pursuit uses 1.15 against arcane; pursuit against ranged remains 1.10. |
| N1 | Phoenix rebirth restores 30% health, or 15% with Slow recovery, once per fight. |
| N2 | Dream walking deals 0.6 × spell. Base sleep remains 2.8 seconds. |
| N3 | Memory control has 220 reach and a 0.20-second interruptible cast. Dodge, wards and Future sight prevent the entire control effect. It deals no artificial damage. |
| N4 | Memory control lasts 1.8 seconds and costs 12 mana. Its attack/power lock, accuracy penalty, and duration weakness interactions remain. |
| N5 | Metal bending disarms a metal weapon for three seconds only when its shard connects. |
| N6 | Beast command bites for 0.30 × weapon damage instead of 0.35; timing, lifetime and cost remain. |
| U1 | The last accepted power loses 30 selection priority until a different power is cast. This is a preference: urgent healing still wins, and a sole eligible power remains usable. |
| U2 | Teleport requires an incoming threat or at least 25 units of improvement toward preferred range. It chooses the best of four seeded destinations, retains its 0.5-second evasion, and halves the shared casting delay after a successful blink. Eligibility checks do not consume the combat random sequence. |
| U3 | Size shifting gives melee fighters Large and shooters Small for eight seconds. Large adds 15% weapon damage and retains its reach/radius bonus; Small retains its dodge/radius bonus. Repeated casts do not stack. |
| U4 | Mind reading reacts to a credible threat due within 0.75 seconds or a concealed opponent. While active, it adds 0.08 accuracy and dodge without stacking. |
| U5 | Energy absorption casts against credible magical threats; its absorption, mana recovery and healing amounts remain unchanged. |
| U6 | Spirit armor casts against credible physical threats; its protection and rebuke remain unchanged. |
| U7 | Portal passage grants 0.5-second evasion and readies the weapon. It does not reset the power cooldown. |
| U8 | Copying selects an eligible effect using its own nine-mana budget, including Rare/Legendary powers. It commits nothing when no effect is usable. The weapon fallback requires valid reach and no copyable opponent power. |
| E1 | New battles use v11. The released v10 engine and all its dependencies are frozen under a source-hash lock; the v9 lock remains intact. |
| E2 | Career rules are pinned in world/archive metadata. Stored fighter stats, career dates, old results and titles are preserved. |
| E3 | A played v10 season finishes on v10 with its five-departure rules, then adopts v11 at rollover. An unplayed active v10 season may adopt v11 immediately. Existing cups stay pinned to their saved engine. |

Generation remains v2, including the 0.8 second-power factor. Career lengths remain 30–38 seasons. Rewind, Light manipulation, Chain lightning, race/class contributions, Mace and physical ranged damage are unchanged. Character-detail descriptions and formulas now match v11. The removed status banner stays removed; fixtures and phase-end saves remain available.

## Verification

- All 23 automated checks passed on Node 24.19.0. They cover actual combat, league sizes/calendars, cups, all three match formats, watched/quick simulation, Pages storage, imports, archives, retries, competing saves, records, crowns, and character-detail values.
- All 3,000 sampled saved v10 games replayed exactly. Source locks for both v9 and v10 passed.
- The configurable comparison harness reproduced frozen v10 exactly in 2,208 baseline cases before measuring changes. A further 46,368 comparisons measure each combat change independently and the combined patch. Memory counterplay was measured before its duration/cost reduction.
- 19,872 comparisons cover 276 distinct two-power pairings across Sword, Staff and Longbow, with both starting sides.
- 9,000 comparisons replay the same saved-field opponents, seeds and conditions under v10 and v11. Comparable totals use a 0.8–1.25 ratio; totals alone do not equalize stat allocation or powers.
- Generation was sampled across all six forced rarities plus ordinary rolls: 28,000 new fighters. Generation source/weights are unchanged.
- Ten fresh worlds completed 40 seasons each, including all division cups, both qualifiers and both interleague cups. They use single round-robin, Bo1 regular matches, Bo3 qualifiers, Bo5 finals, and random conditions. The real-backup test additionally exercises double round-robin.
- An in-memory copy of the supplied 40-season backup adopted v11 for its unplayed Season 41, completed all six phases, then retired/replaced ten fighters with retry-safe persistence. All prior 40 archives and 640 titles remained unchanged, as did existing stats/career dates. The source backup hash stayed `f911ed4450be74ddb2707e07b3d450e7235e89517e333a32cdd1a5d90935bd0c`.
- Desktop and 390 × 844 mobile views were inspected. The mobile document width matched its viewport; standings scroll inside their panel. Optional screenshots are local in `validation/screenshots/`.

## Balance outcomes

Scores below count a draw as half a win. They are game outcomes, separate from the league's 3/1/0 standings points.

| Same saved-field comparison | v10 | v11 |
| --- | ---: | ---: |
| arcane vs melee | 71.1% | 60.7% |
| ranged vs melee | 59.3% | 58.7% |
| arcane vs ranged | 52.0% | 46.9% |

The saved-field arcane-versus-melee score improves substantially but remains slightly above the 60% target. Arcane-versus-ranged declines rather than satisfying the proposal's preservation target. The approved 0.05 spell contribution remains; no fallback to zero or unapproved range change was applied.

| Fresh-world comparable-total matchup | Games | v11 score | Decisive win rate | Draws |
| --- | ---: | ---: | ---: | ---: |
| arcane vs melee | 29,940 | 59.7% | 59.7% | 0.1% |
| ranged vs melee | 75,425 | 58.4% | 58.4% | 0.1% |
| arcane vs ranged | 15,871 | 47.9% | 47.5% | 15.0% |

Fresh-world populations change through recruitment, selection and retirement; these rows are observational outcomes, not the same-opponent comparison above. No inference of a pure weapon advantage should be made from total stats alone.

### Individual changes

These are the subject's scores under a rule change, with the same synthetic opponents/seeds/conditions. Each rule changes both fighters. W1–W4 use Staff subjects; named-power rows include the power alone and paired with Fire across three weapons. U1 uses the Fire-paired subset. These coarse samples measure direction, not a universal power win rate.

| Change | v10 score | Isolated score | Difference in points |
| --- | ---: | ---: | ---: |
| W1 | 54.0% | 48.0% | -6.0 |
| W2 | 54.0% | 50.8% | -3.2 |
| W3 | 54.0% | 58.7% | +4.7 |
| W4 | 54.0% | 53.7% | -0.3 |
| N1 | 45.3% | 40.1% | -5.2 |
| N2 | 52.1% | 37.5% | -14.6 |
| N3 | 71.9% | 49.0% | -22.9 |
| N3+N4 | 71.9% | 21.9% | -50.0 |
| N5 | 42.7% | 38.5% | -4.2 |
| N6 | 56.2% | 52.6% | -3.6 |
| U1 | 47.8% | 46.3% | -1.4 |
| U2 | 31.2% | 40.6% | +9.4 |
| U3 | 19.3% | 31.2% | +12.0 |
| U4 | 26.0% | 34.4% | +8.3 |
| U5 | 35.4% | 34.9% | -0.5 |
| U6 | 27.1% | 29.2% | +2.1 |
| U7 | 26.6% | 28.6% | +2.1 |
| U8 | 49.0% | 52.1% | +3.1 |

Memory's counterplay alone moves this subset to 49.0%; adding the approved 1.8-second/12-mana rule moves it to 21.9% (-27.1 further points). That is a large combined nerf and belongs on the next audit's watch list.

Across the broader pairing test, U1 alone improves 237 of 828 weapon-specific builds, leaves 242 unchanged, and reduces 349. Its mean subject-score change is -3.3 points against the fixed Fire/Storm opponent, which also benefits from the rule. This does not establish a universal buff. There are only eight games per build/engine, so individual extreme cells should not drive tuning by themselves.

### Rosters and careers

The 400 completed seasons contain 822,000 series and 840,831 games. League sizes stayed 20 / 24 / 24 / 24 / 24 / 24 / 24 with 164 unique fighters throughout.

| Season, before rollover | Mean A+ | Mean S+ | Mean SS | Mean total |
| --- | ---: | ---: | ---: | ---: |
| 1 | 6.2% | 2.0% | 0.0% | 664 |
| 10 | 7.0% | 2.2% | 0.0% | 732 |
| 20 | 7.9% | 2.6% | 0.0% | 799 |
| 30 | 9.0% | 2.9% | 0.0% | 856 |
| 40 | 19.9% | 7.1% | 0.0% | 1053 |

- Departures per season: 3: 290 seasons, 10: 110 seasons. Mean: 4.92.
- Dawnrise cuts: 1,200, exactly three per season. Additional career exits: 770. Overlapping retirement causes: 35.
- Peak deferred-career queue: 47; maximum observed delay: 4 seasons. The ten final queues are [28, 34, 29, 28, 26, 26, 26, 33, 23, 28].
- Of 1,870 recruits with at least one observed season, 279 (14.9%) left after their first season. Among 427 Dawnrise cuts that never reached a higher division, median observed lifetime was 1 season(s). Successful and still-active recruits are excluded from that median; it is not an unconditional survival estimate.
- 1,330 observed recruits remained active at the end. Season-41 arrivals have not played and are excluded from survival rates. Career follow-up stops at 40 seasons.

Three-departure seasons use ordinary/Rare/ordinary, so they have no forced Unique or exceptional slot. Those stronger slots appear only when enough careers also leave. This matters more to long-run tier shares than the proposal's shorthand about preserving exceptional-recruit proportions.

The seven additional career slots do not eliminate the synchronized starting-cohort backlog within 40 seasons: final queues range from 23 to 34. This is a fresh-world cohort effect, separate from the old backup's existing queue. The in-memory Season-41 test ends with 21 deferred careers. Seven remains the approved limit; a permanently clear queue has not been demonstrated.

### Generation, unchanged v2

| Roll | Sample | Mean total | A+ | S+ | SS |
| --- | ---: | ---: | ---: | ---: | ---: |
| ordinary | 10,000 | 647 | 5.6% | 1.8% | 0.010% |
| common | 3,000 | 426 | 0.0% | 0.0% | 0.000% |
| uncommon | 3,000 | 608 | 0.3% | 0.0% | 0.000% |
| rare | 3,000 | 879 | 4.6% | 0.0% | 0.000% |
| unique | 3,000 | 1263 | 26.9% | 2.3% | 0.000% |
| legendary | 3,000 | 1932 | 85.8% | 34.2% | 0.033% |
| mythic | 3,000 | 2287 | 98.5% | 71.6% | 1.133% |

These are Monte Carlo samples, not guaranteed tier outcomes. Stronger wheel rarities change selection probabilities; they add no free stats. No existing fighter is rerolled.

## Evidence and reproduction

Aggregate evidence is in `validation/balance-v11/`: `summary.json`, `worlds.json`, `changes.json`, `pairs.json`, `styles.json`, `generation.json`, `replay.json`, `baseline.json`, and `save-transition.json`. All engine-dependent datasets share the source fingerprint recorded in `summary.json`. Old v10 evidence remains separate.

With Node 24 or later and installed repository dependencies:

```text
node scripts/build.mjs
node scripts/build-pages.mjs
node scripts/build-pages.mjs --output docs
node scripts/check-all.mjs
node scripts/evaluate-balance-v11.mjs baseline
node scripts/evaluate-balance-v11.mjs changes
node scripts/evaluate-balance-v11.mjs pairs
node scripts/evaluate-balance-v11.mjs generation
node scripts/evaluate-balance-v11.mjs worlds
node scripts/evaluate-balance-v11.mjs styles <decoded-v10-worlds.json>
node scripts/evaluate-balance-v11.mjs replay <decoded-v10-worlds.json>
node scripts/verify-v11-save.mjs <backup.sqlite>
node scripts/summarize-balance-v11.mjs
```

The optional backup verifier writes only to an in-memory clone. The field/replay commands require the supplied audit input and do not bundle that backup into the repository. The long evaluator uses up to eight workers by default; `FATEFORGED_REVIEW_WORKERS` can reduce concurrency. Builds regenerate `dist/`, `_site/`, and `docs/` inside the checkout.

The patch is ready for review and fresh-roster play testing. The remaining balance flags are reported above; they are not hidden by passing implementation checks. Merging/deployment remains a separate step.

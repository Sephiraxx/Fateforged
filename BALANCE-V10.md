# Fateforged v10 balance and career patch

October 5, 2026. Implements the approved 99-item proposal, **including O1–O6**. Combat is version 10; new fighter generation is version 2. Existing fighter stats and traits are preserved. This report describes the final candidate and its measured limits, rather than promising that every target band has been reached.

## Starting your 40-season review

Open **Arena → Seven leagues → More controls → Start a fresh league world**. This generates 164 new fighters, assigns 20 to Crownfire Premier and 24 to each other league, starts Season 1, and enables the new generation and career rules. Previous worlds, saved fighters, titles, results and season snapshots are preserved. Completed seasons identify their world as well as their season number.

A fresh start is available after completing a season, or while the current season has no recorded games. A partly played season must finish first. Use the normal **Start next season** control for subsequent rollovers; starting another fresh world would restart the career timeline.

The submitted backup's Season 31 is unplayed, so it can adopt v10 immediately. A partly played older season finishes on its existing engine and adopts v10 at rollover. Old replays use their recorded engine. The original backup remains untouched; verified SHA256: `ad1ca42cb21feb2e72657659c8e5c1a76420929b3096c636aca4bcebccb46397`.

## Final numbers and proposal coverage

The ranges in the ID column cover every individual requirement in that range. Distances are arena units; times are seconds. Damage factors multiply existing combat formulas, not the fighter's stored stats.

### Retirement intake: R1–R7

| IDs | Final behavior |
| --- | --- |
| R1 | Five new recruits per rollover. |
| R2 | Two ordinary rolls, one forced Rare, one forced Unique, one exceptional recruit. |
| R3 | The exceptional slot is seeded **85% Legendary / 15% Mythic**. Ordinary slots retain their own rarity lottery. |
| R4 | Career retirements have priority, as explicitly approved in O1–O6; remaining slots retire Dawnrise's lowest finishers. |
| R5 | League sizes remain **20 / 24 / 24 / 24 / 24 / 24 / 24**. Older seven-by-twenty seasons expand at rollover. |
| R6 | Three normal promotions and relegations among surviving fighters, plus the vacancy promotions in O5. |
| R7 | Existing fighters receive no reroll, stat reduction or stat decay. |

### Generation: G1–G14

| ID | Setting | Final value |
| --- | --- | --- |
| G1 | Common rarity boost | **0** |
| G2 | Uncommon boost | **1.2** |
| G3 | Rare boost | **2.3** |
| G4 | Unique boost | **3.5** |
| G5 | Legendary boost | **5.6**, tuned from the proposed 5.0 |
| G6 | Mythic boost | **7.2**, tuned from the proposed 6.5 |
| G7 | Strength/speed/durability/IQ/magic slot factor | **1.0** |
| G8 | Race/subrace/class/subclass factor | **0.65** |
| G9 | Mastery factor | **0.75** |
| G10 | Weapon factor | **0**, preserving the original pool weights |
| G11 | Weakness factor | **0**, preserving the original pool weights |
| G12 | Power identity boost | Capped at **3.0** in both slots |
| G13 | First-power existence | Existing magic-dependent curve |
| G14 | Second-power existence | **0.8 ×** that curve; distinct second power required |

Ordinary rarity chances remain **50 / 25 / 15 / 6 / 3 / 1%**. Trait stat arrays and tier thresholds are unchanged. Default and custom weapon/weakness pool weights survive exactly. Saved generation-version-1 fighters remain version 1; only new rolls receive version 2.

The initial combined slot changes made Legendary and Mythic rolls weaker than their proposed A/S bands. Increasing their boosts to 5.6 and 7.2 restored those bands while retaining the weapon, weakness and power diversity changes. These are probabilities, with no rejection sampling or tier quotas.

### Melee: M1–M12

| IDs | Final behavior |
| --- | --- |
| M1–M4 | Chase dash against non-melee at **60–250** distance, **2.8s** cooldown, **0.22s** duration, unchanged **18** stamina cost. |
| M5 | **1.10 ×** movement while pursuing a non-melee opponent beyond reach + 20; no multiplier while fleeing, recovering, rolling or unable to move. |
| M6–M7 | Base light/heavy windup **0.14 / 0.23s**. |
| M8 | Track during the first **65%** of windup, capped at **180°/s**; the last 35% is committed. Tracking clips to the exact boundary. |
| M9 | Hit distance is weapon reach + **16**. |
| M10–M12 | Recovery **0.19 / 0.27s**, hit half-angles **1.05 / 1.35 radians**, ordinary dodge costs and invulnerability remain. |

An additional contact repair removes the artificial retreat during a melee fighter's attack cycle against non-melee opponents. Forward movement is 1.0 during windup and 0.65 during recovery; melee mirrors retain their previous attack movement. Cooling-down melee fighters continue closing on non-melee opponents rather than circling away from contact. This uses ordinary movement; it does not apply M5's pursuit-speed bonus during recovery.

### Weapons and shields: W1–W14

| IDs | Final behavior |
| --- | --- |
| W1 | Ordinary arcane shots add **0.20 × spell**, down from 0.30. |
| W2 | Armor contribution against those ordinary shots is **0.65 × armor**. |
| W3 | Actual magical powers retain **0.40 × armor**. Projectile context explicitly distinguishes them from equipment shots. |
| W4 | Arcane base damage **0.90**, range **185**; the approved fallback interval **1.10** is active. |
| W5–W7 | Mace/hammer interval **1.25**, reach **40**, damage **1.40**. |
| W8–W9 | Axe interval **1.25**, reach **38**, damage **1.32**. |
| W10 | Shield attack damage **0.85**, reach **34**. |
| W11 | Shield reduces remaining physical damage by **15%**, magical damage by **5%**. |
| W12 | Tower shield reduces remaining physical damage by **22%**, magical damage by **8%**. |
| W13 | Tower shield movement **0.92 ×**, applied once. |
| W14 | Sword, spear, dagger and ordinary ranged base damage unchanged. |

Equipment defense applies once after the existing armor, reductions and absorption, before health damage. It does not reduce self-sacrifice, environmental hazard damage or direct spirit rebuke. It supplies no random blocking, reflection or cleansing, and remains separate from Force fields' charges.

### Light: L1–L8

Reach **220**, damage **0.70 × spell**, blind **1.5s**, mana **12**, interruptible cast **0.25s**, ordinary dodge check. Selection and execution both check reach. Ward, Future sight and dodge prevent damage and all attached blind/reveal effects. Holy/sunlight tags remain. A committed interrupted or out-of-range cast keeps its paid cost; merely declining an ineligible choice costs nothing.

### Other powers: P1–P19

| ID | Final behavior |
| --- | --- |
| P1 | Portal shots aim from their actual exit coordinates, with travel-time lead. |
| P2 | Traverse only when the exit improves desired engagement distance by **at least 25**, or moves at least 25 farther away from an immediate threat. |
| P3 | Existing roughly **75-unit** exit placement, duration and cost retained. |
| P4 | Arcane silence reach **220**, interruptible cast **0.20s**, ordinary dodge check. |
| P5 | Silence base suppression **1.8s**, with existing duration modifiers and anti-magic weakness ×2. |
| P6 | Silence damage **0.40 × spell**, cost **15**, mana drain **0.60 × spell**. |
| P7 | Silence interrupts only on a connected hit; ward/dodge/Future sight prevent the payload. |
| P8 | Chain lightning pulse **0.26 × spell**, tuned down from the proposed 0.42 after comparison results. |
| P9 | Chain retains three pulses, **0.45s** spacing, **450** reach, **15** mana and opening-hit-only interruption. |
| P10 | Storm reach **300**, interruptible cast **0.25s**, ordinary dodge; damage **0.95 × spell**, existing cost **9**. |
| P11 | Future sight avoids two hits, base protection **2.5s**, derived insight **1.25s**, minimum reuse **5.0s**. |
| P12 | Future sight cost **12**. |
| P13 | Mirror retains three reflections, **4.0s** base duration and **15** mana. |
| P14 | Singularity damage unchanged, radius **105**, pull **28**, cost **25**. |
| P15 | Rewind retains **60%** health and **75%** mana recovery, cleanse and cost **25**. Its anchor still records mana after the original first 9-point payment. |
| P16 | Phoenix retains one rebirth, **45%** health and existing death-mark/weakness interactions. |
| P17 | Mind reading only when insight expires within **0.5s** and a projectile or hidden target makes it useful. |
| P18 | Shapeshift: melee within **90**; non-melee within **60** only if escape is unavailable. |
| P19 | Utility magnitudes retained; unnecessary/redundant casts avoided under A1–A11. |

Chain at 0.42 scored 84.9% in the combined trial field, so keeping that starting value would have left a dominant general damage power. A 0.30 trial scored 73.5%; the final 0.26 scores 67.7%. It remains a three-pulse long-range power.

### Power selection: A1–A11

| IDs | Final behavior |
| --- | --- |
| A1–A3 | Select the most useful eligible power, with stable slot-order ties; skip unusable slots without spending. Check mana, reach, voice/day/night/sacrifice restrictions, one-shot state and redundant effects. |
| A4 | Healing at **≤75% HP**, or meaningful burn/poison/bleed cleansing. |
| A5 | Regeneration at **≤85% HP** and remaining regen **≤0.5s**. |
| A6 | Defensive effects when duration **≤0.5s**, or charges exhausted with a threat. |
| A7 | No Phoenix selection after it is spent or while already armed. |
| A8 | Rewind activation needs **≥8% max-HP** recovery, **≥20% max-mana** recovery, meaningful cleansing or useful escape. |
| A9 | Avoid redundant pure control above **0.5s**; avoid duplicate active summons and unnecessary zones. Damaging control remains eligible when its damage is useful. |
| A10 | Memory loss, sacrifice and cooldown weaknesses charge only actual committed attempts. Original legacy-power costs remain 9; the ten newer powers retain their rarity-based costs, except the explicitly changed Light/Future costs. |
| A11 | Reconsider priorities at most every **0.20s**; recheck eligibility immediately before execution. |

The shared casting action and global cooldown remain **4.2 / (1 + sqrt(MAG)/70)**, with the existing weakness-specific base 7.0. Two powers do not create two simultaneous casting cycles.

### Career turnover: O1–O6 — enabled

| ID | Final behavior |
| --- | --- |
| O1 | New fighters become eligible after a deterministic **30–38 completed seasons**. Career length is derived from world/fighter identity; no rerolls on refresh. |
| O2 | Existing rosters receive **12–24 additional completed seasons** from enabling. Unknown legacy joining dates are not fabricated. |
| O3 | **Five total** retirements each season, including expired careers. |
| O4 | Expired careers first, ordered by eligibility season then fighter ID; Dawnrise finishers fill remaining slots. Excess careers wait in a deterministic queue. |
| O5 | Extra promotions from the next league's final standings fill upper vacancies and cascade downward. Recruits enter Dawnrise. All seven sizes are preserved. |
| O6 | Archived worlds retain full rosters, career records, retired snapshots, results, standings, titles and retirement reasons. |

Eligibility is not a guaranteed departure date. Five slots cannot instantly clear an unusually synchronized group of eligible careers. The table shows completed career seasons and the eligibility season; season information shows the queue and versions. There is no stat decay.

### Compatibility and saving: S1–S8

| IDs | Final behavior |
| --- | --- |
| S1 | v9 and its complete behavior dependency chain are frozen; v10 has separate implementations. A normalized source-hash lock verifies the freeze. |
| S2 | Replay and simulation use recorded versions, including original v1 cups whose results omitted a version. Unsupported/mixed versions are rejected. |
| S3–S4 | Complete archives unchanged; unplayed seasons adopt v10; played seasons finish their pinned engine before rollover. |
| S5 | Generation changes apply to new rolls only; their snapshots record generation version 2. |
| S6 | Browser, workers, persistence validation and replay selection agree on engine versions. |
| S7 | Phase checkpoints, revision/operation retries and exactly-once records/titles remain. Engine/career settings persist with the world. |
| S8 | Season information exposes combat/generation versions and career rules. |

The previous 3/1/0 scoring, timed-out league/group draws, three-win/three-loss Swiss, cup qualification, Bo5 finals, themed cups, collapsible fixtures, round simulation and movement after every cup are retained.

Headless league/cup workers skip combat-log and visual-effect allocations. Full deterministic comparisons confirm the same results with and without headless mode. Simulation continues on the user's device with the existing reusable worker pool; saves happen at completed phases, with explicit early checkpoints available.

## Measured validation

Machine-readable evidence is in [`validation/balance-v10`](validation/balance-v10). Final combat comparisons share fingerprint `17f6e5eddf615f53b2b3bd9e23f830c57a17530cc315f57bc37ff2b1d2d3c3bf`. Scores count a draw as half a win. Historical matched comparisons reuse the same fighters, seeds, environments and starting sides; they do not reroll the submitted roster.

### New generation: 110,000 rolls

50,000 ordinary rolls and 10,000 for each forced rarity, seed 314159265. The mean is stored stat total; A+ and S+ include higher tiers.

| Roll | A+ | S+ | SS | Mean | Two powers |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ordinary | **5.78%** | **1.84%** | 0.014% | 645 | 23.02% |
| Common | 0.03% | 0% | 0% | 420 | 13.75% |
| Uncommon | 0.31% | 0.02% | 0% | 601 | 22.13% |
| Rare | 4.24% | 0.10% | 0% | 867 | 33.14% |
| Unique | 25.90% | 2.21% | 0% | 1251 | 46.86% |
| Legendary | **85.30%** | **33.53%** | 0.13% | 1922 | 65.90% |
| Mythic | **98.49%** | **70.51%** | **1.05%** | 2279 | **72.69%** |

Ordinary, Legendary and Mythic A/S bands and Mythic dual-power bands are met. Mythic SS remains below the suggested 2–8% band; no artificial minimum was introduced. Each exact top primary trait has **52.43%** Mythic selection probability, down from 58.2% but slightly above the suggested 35–50% band. This is the tradeoff from restoring the combined candidate's Mythic A/S results. Weapon weighting no longer increases arcane share with rarity: each forced-rarity sample has 9.77% arcane, versus the old Mythic sample's 43.8%. Weakness rolls preserve the original weights instead of collapsing onto four low-penalty choices.

The moderate intake's sample-based expectation is approximately **25.8% A+ / 9.0% S+ recruits**, compared with the old intake's roughly 80% / 48%. That is an expectation for arrivals, not a cap on the surviving roster.

### Combat comparisons

| Comparison | Matched v9 score | Final v10 score | Interpretation |
| --- | ---: | ---: | --- |
| Arcane vs melee, 1,500 comparable-total historical pairs each | 83.73% | **68.60%** | Large improvement, still above the 45–60% goal |
| Ranged vs melee, same-size matched sample | 65.33% | **59.07%** | Inside the proposed band |
| Arcane vs ranged, same-size matched sample | 52.20% | **39.23%** | Arcane now loses more often to ranged in this field |

The power field contains **98,304 fights**: 16 selected powers including No power, equal stats at totals 500/1500/2500, Sword and Staff, all 32 environments, both starting sides. Chain scores **67.68%**, Storm **67.20%**, Light **62.30%**, Future **59.39%**; every selected power's aggregate score is below 70%. This is a selected controlled field, not an exhaustive ranking of every two-power combination. Median/p90 fight duration is **18.2 / 44.9s**.

The 27,648-fight weapon matrix uses 12 weapons, three stat profiles, all environments and both sides. Bare arcane-versus-melee scores remain very high: **97.92% balanced, 91.93% physical, 99.48% magical**. Removing powers exposes a contact/range advantage that the current patch has reduced insufficiently. These equal-stat/no-power results must not be confused with the historical comparable-total field above.

Historical ability removal checks contain 864 Light fights and 648 Portal fights. Light adds **6.71 percentage points** to score in this sample, versus the original audit's 15.5-point contribution. Portal is near-neutral at **−0.31 points** across its historical carriers, versus the old 15.5-point harm. In the relevant equal-stat Staff mirror, adding Portal beats the otherwise identical no-power opponent **93.75–96.88%** across the three totals. Portal is useful for its projectile role but does not need to be a strong melee damage substitute.

### Fresh worlds and careers

**Ten independently seeded 164-fighter worlds × 30 complete seasons**, with real v10 combat, single round-robin Bo1 leagues, both qualifying stages, seven division cups, both main cups and normal rollovers. Total **616,500 series / 630,427 games**. These runs used the final combat fingerprint, not the intermediate candidates. Raw per-world/per-season results are in `worlds.json`.

| Season snapshot | Mean A+ | Mean S+ | Mean arcane roster share | Mean two-power share |
| --- | ---: | ---: | ---: | ---: |
| 1 | 6.22% | 2.01% | 9.27% | 23.72% |
| 10 | 13.35% | 3.66% | 11.22% | 33.35% |
| 20 | 21.65% | 6.16% | 11.34% | 41.34% |
| 30 | **30.00%** | **9.21%** | **11.65%** | **48.35%** |

Season-30 A+ ranges **28.05–32.93%** across worlds, within the proposed 25–45% band. S+ ranges **6.10–12.80%**; the 9.21% average is slightly below the proposed 10–25% band. One SS fighter is present across the ten Season-30 rosters. The old submitted world's elite population is substantially reduced without restricting fighters to fixed tier quotas.

| Style | Main-cup entries over 300 seasons | Entry share | Titles | Title share |
| --- | ---: | ---: | ---: | ---: |
| Melee | 2,796 | 58.25% | 125 | 41.67% |
| Arcane | 789 | 16.44% | 91 | 30.33% |
| Ranged | 1,215 | 25.31% | 84 | 28.00% |

Arcane's title share exceeds its entrant share by **13.90 points**, within the proposed 15-point tolerance, rather than winning every main cup. Melee is still underrepresented among champions relative to its entries. Strong individual champions can still dominate their own world: two worlds supplied 22 and 24 arcane titles, while other worlds favored melee or ranged. These repeated seasons are not 300 independent fresh rosters.

League draws average **1.48%**, ranging **1.02–1.93%** per world. Starting-side decisive win share averages **50.17%**, ranging **49.69–50.62%**. Per-world median durations range **15.0–16.6s**, with p90 **34.8–43.7s**. Every world's draw, side and duration results meet the proposed review bands. Elapsed evaluation time is machine/load dependent and is not a promise of browser speed.

At Season 30, each world retires its first five eligible career fighters: **50 actual career retirements**, with no duplicate membership or size failures. The largest actual deferred queue is **7**, with no earlier-season overdue fighter yet. This validates the beginning of retirement, not its steady state; the 40-season follow-up remains valuable for the synchronized initial roster's later queue.

### Replay, storage and rules

* **3,000/3,000** sampled saved v9 games replay exactly, comparing the full saved result.
* **22 checks** cover complete seasons, division/interleague cups, scoring/Swiss, persistence/phase retries, backup import, roster safeguards, UI simulation, generation, combat mechanics and version compatibility.
* A full double-round-robin v10 season resolves **3,901 series**, nine cups, Bo5 finals and saved-condition replay checks.
* **20 × 100 seasons** of synthetic career stress checks exercise fresh and legacy transition careers, five retirements, overflow, no repeated retirement and vacancy cascades. The largest synthetic queue was **77** and longest deferral **15 seasons**; these are adversarial standings checks, not population forecasts or 2,000 real combat seasons.
* Headless/visible outcomes match for all 50 catalog powers plus 50 seeded Portal-versus-Light fights. Blocked-hit payloads, paid interrupted casts, Rewind anchor timing and shield/armor formulas have focused checks.
* Fresh-start persistence checks preserve prior worlds and titles, allow same-number seasons in different worlds, reject reused IDs and partial played seasons, and verify retry-safe generation.
* The rebuilt Pages app renders at **1280×900** desktop and **390×844** mobile without page-wide overflow. A disposable local roster shows v10/generation-v2 settings and career eligibility. The browser inspection tool stalled at the native fresh-start confirmation, so that UI confirmation's end-to-end completion is not included in the manual verification claim; the underlying fresh-start persistence tests passed.

## What to inspect in the next 40 seasons

The main remaining combat question is arcane versus melee: its historical score still exceeds the proposed band, while arcane is already weaker against ranged. A further blanket arcane nerf would worsen that second matchup. Track melee contact and style/title shares in your new data before choosing the next change.

Track the A+/S+/SS population, entrants and champions by weapon style, the distribution of both power slots, draws, fight duration, retirement reasons and overdue career queue. Seasons 30–40 are particularly useful because the fresh roster's first natural career retirements become eligible then. Preserve the backup rather than starting another world during that run.

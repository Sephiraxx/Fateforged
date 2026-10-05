# Fateforged: 40-season v10 review and proposed next patch

October 5, 2026. Reviewed the new `fateforge-backup-2026-10-05 (1).sqlite` read-only. **The generation changes are working. The next balance patch should address control-power counterplay, utility decisions, and melee contact against arcane fighters.** The title distribution alone would suggest the wrong changes.

The two requested combat/generation/career status lines have been removed from the league screen in this branch. Career tracking and retirement rules remain active. **All balance changes below are proposals; this branch changes no combat or generation settings.**

## What the backup contains

One fresh generation-v2 world, with Seasons **1–40 completed** and an unplayed Season 41. All **157,889 individual games** used combat v10. There are **156,040 series**, including **147,680 regular league games**, and **640 competition titles**. The roster has 164 fighters: 20 in Premier and 24 in each other division. Across the completed seasons, 359 distinct fighters competed; including Season 41's five newcomers, 364 were generated.

This is a large match sample from **one evolving roster**, rather than 40 independently generated worlds. A fighter appearing for 30 seasons remains one fighter when judging an ability's reliability.

## Roster generation: keep the new system

| Snapshot | Mean total stats | A or higher | S or higher | SS | Two powers |
| --- | ---: | ---: | ---: | ---: | ---: |
| Opening roster | 644.3 | 9.8% | 1.2% | 0 | 22.0% |
| Season 10 | 859.5 | 15.9% | 4.3% | 0 | 30.5% |
| Season 20 | 1,084.3 | 25.6% | 7.3% | 0 | 37.8% |
| Season 30 | 1,263.2 | 31.7% | 8.5% | 0 | 45.1% |
| Season 40 | 1,216.4 | **30.5%** | **9.1%** | **0** | 42.7% |
| All 200 replacement arrivals | 1,089.7 | 25.0% | 8.0% | 0 | 34.5% |

A+ includes S and SS; S+ includes SS. Thresholds are 1,500 / 2,100 / 3,000 total stats.

The initial rise is expected: five recruits include a guaranteed Rare, a guaranteed Unique, and an exceptional slot, while early departures remove the lowest finishers. The important result is that the roster settles near 30% A+ and 9% S+, and average stats fall once the opening cohort starts retiring. Season 40 contains **35 A and 15 S fighters**, rather than an all-elite population. The previous v9 world reached 68.3% A+ and 46.3% S+; that comparison describes two different worlds, rather than a controlled before/after experiment. This run also agrees closely with the earlier ten-world v10 validation at Season 30.

**Recommendation:** keep ordinary rarity chances **50/25/15/6/3/1%**, rarity boosts **0/1.2/2.3/3.5/5.6/7.2**, five recruits, the **85/15 Legendary/Mythic exceptional slot**, and the second-power factor **0.8**. There is no evidence here for another broad generation nerf, tier caps, stat decay, or reducing the exceptional slot.

## Why the titles are misleading

**Aziel Dreamguard won 25 of 40 Premier titles, 27 of 40 Crownfire cups, and 86 titles across all competitions.** Its build was Mace, Dreamwalking, Phoenix rebirth, and Short power duration, with 2,848 total stats: **337 / 678 / 608 / 609 / 616** in strength/speed/durability/IQ/magic order.

I replayed 160 of its Premier opponents with the original seed, conditions, opponent, and side, changing only the indicated trait. Stored stats stayed fixed. Scores count wins as 1 and draws as 0.5; they are not the league's 3/1/0 table points.

| Aziel variant | Mean match score |
| --- | ---: |
| Original | **97.50%** |
| Remove Dreamwalking | 75.63% |
| Remove Phoenix rebirth | 87.50% |
| Remove both powers | **45.63%** |
| Replace Mace with Sword | 98.75% |
| Replace Mace with Longbow | 95.31% |
| Replace Mace with Staff | 94.06% |

This is a powerful combination on an exceptional fighter, with a substantial interaction between the two powers. It is **not sufficient evidence for a Mace nerf**: changing the weapon leaves the fighter dominant. Removing either power alone also understates their combined importance. Weapon replacements are combat experiments with fixed stats, not newly generated builds.

Aziel joined in Season 10, competed in 31 of the 40 seasons, and remains active in Season 41. Its 32-season career becomes eligible after Season 41. Only seven distinct fighters won Premier across the run and seven won Crownfire; those repeated titles should not be counted as dozens of independent demonstrations of a build's strength.

| Competition | Melee title share / entry share | Arcane title share / entry share | Ranged title share / entry share |
| --- | ---: | ---: | ---: |
| Premier | 72.5% / 37.9% | 10.0% / 16.9% | 17.5% / 45.3% |
| Crownfire cup | 77.5% / 49.7% | 2.5% / 9.8% | 20.0% / 40.5% |

**27 of the 31 melee Crownfire titles belong to Aziel alone.** Entry shares count qualification appearances, rather than all roster slots. I would keep Dreamwalking's **2.8s base sleep** and Phoenix's **45% once-per-fight rebirth** for the first candidate patch, and retest their combination across independently generated carriers. Dreamwalking already delivers its sleep through a projectile that can miss or be defended.

## Matchup balance still needs work

For decisive regular league games where total stats differ by no more than 25%:

| Matchup | First style's win rate | Games |
| --- | ---: | ---: |
| Arcane vs melee | **70.11%** | 6,580 |
| Ranged vs melee | 58.26% | 15,921 |
| Arcane vs ranged | 51.72% | 3,364 |

Arcane vs melee improves from **81.27% in Seasons 1–10** to **64.21% in Seasons 31–40**, but still favors arcane substantially. Similar total stats do not guarantee similar stat distributions, powers, weaknesses, or opponent quality. These figures describe this roster; they do not isolate weapon mechanics by themselves.

The combination of these results, the earlier controlled v10 weapon checks, and the movement code supports another small **melee contact improvement against arcane opponents**. Ranged vs melee is closer, so a universal melee damage increase would be poorly targeted. Arcane vs ranged is close in this fresh world; the earlier replay of the old v9 roster differed, which reinforces the need to verify changes across multiple rosters.

## Power checks: effects separated from carrier strength

For every represented power, I sampled up to 24 regular league games per carrier, spread across its history, excluding opponents with the same power. Each game was replayed with and without that power, holding stored stats, seed, conditions, side, and opponent fixed. All **50 powers** were represented. Four leading champions also received eight variants over 160 games each.

The analysis ran **20,960 fights**. **All 8,560 original replay results matched the backup exactly**, including the full saved result. Removing a power also changes shared casting decisions, and may remove an opponent's opportunity to copy it; this measures the power's net combat contribution in those matchups, not just its damage formula. It excludes the stat boost that generated the original fighter.

| Power | Distinct carriers | Paired games | Score contribution | 95% carrier-bootstrap interval |
| --- | ---: | ---: | ---: | ---: |
| Beast command | 8 | 192 | **+23.96 pp** | +10.42 to +36.46 |
| Memory control | 5 | 120 | **+21.25 pp** | +9.16 to +32.50 |
| Metal bending | 7 | 168 | **+19.64 pp** | +1.19 to +39.88 |
| Blood control | 5 | 120 | +24.17 pp | +10.00 to +38.33 |
| Telekinesis | 5 | 120 | +21.67 pp | +8.33 to +36.67 |
| Dreamwalking | 12 | 288 | +10.76 pp | +4.34 to +18.40 |
| Rewind | 6 | 144 | +10.42 pp | +0.69 to +20.83 |
| Light manipulation | 14 | 336 | +9.97 pp | +3.42 to +17.26 |
| Regeneration | 7 | 168 | +9.52 pp | +3.57 to +15.18 |
| Chain lightning | 6 | 144 | +7.64 pp | +1.39 to +16.67 |
| Portal creation | 10 | 240 | +1.46 pp | −1.04 to +4.17 |
| Mind reading | 7 | 168 | +0.30 pp | −1.49 to +2.08 |
| Size shifting | 10 | 240 | 0.00 pp | −7.71 to +7.92 |
| Teleportation | 12 | 288 | **−6.42 pp** | −16.49 to +2.95 |
| Energy absorption | 3 | 72 | **−17.36 pp** | −41.67 to −2.08 |

`pp` means percentage points. Intervals resample whole carriers 10,000 times, not individual games. They cannot capture uncertainty outside these carriers and opponents. Three-carrier results remain especially fragile; one-carrier intervals are omitted from the data rather than implying certainty.

The stat-and-style association model also flags Memory control (**+21.30 pp**), Beast command (**+18.94 pp**), and Metal bending (**+15.50 pp**). These are associations after adjusting five stat axes and weapon styles, not estimates of an isolated mechanic. Conversely, **Rewind has a negative association but a positive paired contribution**. Buffing it because its carriers lose would be a mistake. Telekinesis shows the same danger. Blood control deserves continued tracking, but a large benefit from owning a combat power is not by itself a reason to nerf it.

The earlier Light and Portal changes look healthier. Portal's paired effect is close to neutral rather than clearly harmful; Light contributes without recreating the old title monopoly. Fire control, Earth shaping, Water control, and Healing touch each have only one carrier here. Their results cannot justify sweeping changes.

## Proposed next patch notes

These are **starting candidate values**, not measured post-patch outcomes. Implement the counterplay repairs and utility decisions first, then compare the small numerical changes separately before combining them.

| ID | Change | Current → proposed | Reason / confidence |
| --- | --- | --- | --- |
| P1 | Memory control gains counterplay | Unlimited distance and instant application → **220 reach, 0.20s interruptible cast**, range checked at release; a normal dodge, ward or Future defense prevents the entire payload | High confidence in the current counterplay gap. It currently cancels attacks and blocks new ordinary attacks and powers without first connecting. |
| P2 | Reduce Memory control's lockdown | **3.0 → 1.8s** base amnesia; **9 → 12 mana**; retain accuracy ×0.65 and Memory loss duration ×1.5 | Medium confidence in candidate numbers. Retain its identity as an attack/power lock, with a shorter window. Verify P1 separately to avoid an excessive combined nerf. |
| P3 | Metal bending disarms only on impact | Immediate **3.0s** disarm before launching → disarm only when its shard connects, with an explicit **3.0s base duration** and normal payload defense | High confidence in the ordering problem. Keep damage and **9 mana** initially. The projectile must not damage a ward yet apply disarm anyway. |
| P4 | Modest Beast command damage reduction | Bite **0.35 → 0.30 × weapon damage**; keep **0.8s** bite interval, summon lifetime and **9 mana** | Medium confidence: eight carriers and a large paired benefit. This is a 14.3% bite-damage reduction, not a 14.3% reduction in win rate. |
| P5 | Improve melee pursuit against arcane | Active pursuit **1.10 → 1.15 × movement against arcane only**; retain 1.10 against ranged | Medium confidence. Keep dash, reach, windup, tracking, recovery movement and damage unchanged in the first trial. |
| P6 | Teleport for a useful destination | Unconditional eligible blink → blink for an incoming threat or **at least 25 units of improvement toward preferred weapon range**; choose among **four seeded candidate angles** | Strong code-based reason; its negative paired interval includes zero. Keep existing **40/150** melee/non-melee destination radius, **0.5s evade**, and **9 mana**. Skip a useless cast. |
| P7 | Match defensive casts to threats | Energy absorption only for a credible **magical** threat; Spirit armor only for a credible **physical** threat | Current selector checks duration and broad proximity, allowing defenses to consume casting turns against the wrong attack type. Keep existing effect strengths and costs. |
| P8 | Mind reading reacts to relevant projectiles | Any enemy projectile → predicted collision threat within **0.75s**, or an invisible/illusion opponent | Keep duration, insight strength and **9 mana**. Duskis scored **76.56%** normally but **83.44%** without Mind reading in its 160-game check, suggesting casting opportunity cost. |
| P9 | Power copying chooses a useful effect | Blind alternation through opponent powers → apply the normal eligibility rules to copied candidates; avoid spent rebirth, active redundant buffs, and out-of-range casts | Medium confidence from code inspection. Keep **9 mana** and the existing no-extra-fee copy behavior. Handle no eligible candidate explicitly rather than silently paying for nothing. |
| P10 | Release balance changes as a new engine | Combat v10 → **v11**, with frozen v10 replay dependencies | Required for replay integrity. Preserve saved fighter stats, generation-v2 rules, archived results and titles. |

For P7/P8, predict projectile approach and intersection using current position, velocity and fighter radius rather than merely counting projectiles. Nearby or receding shots should not automatically trigger a defense. Account for an opponent's imminent relevant weapon attack as well, so defenders do not wait until a melee hit has already landed.

**Keep for this candidate:** generation/intake settings; five total retirements; 30–38-season career eligibility; Phoenix 45%; Dreamwalking 2.8s; Rewind 60% health / 75% mana recovery at 25 mana; Light 0.70 spell damage / 1.5s blindness at 12 mana; Chain lightning 0.26 spell per pulse. No broad race, class, mastery, Mace, ranged-damage, or arcane-damage nerf is supported by this audit.

**Watch list:** Dreamwalking + Phoenix across independent carriers; Blood control; Summon spirits and Force fields (three carriers each); Size shifting and Invisibility after utility fixes. If the Dream/Phoenix interaction remains excessive across multiple comparable builds, the first optional trial would be **Dream sleep 2.8 → 2.2s**, retaining 45% rebirth. That trial is not part of the recommended first candidate.

## Careers and data integrity

All **40 rollovers** reproduced the saved next-season roster, division order, career metadata, seed/settings and retirement priority exactly using the current league engine. There were **200 departures: 145 Dawnrise finishers and 55 completed careers**, plus **171 vacancy promotions**. Fourteen original fighters remain in Season 41. Every replacement group contains five fighters with the correct seeded intake composition, and every fresh career has a 30–38-season eligibility length.

The first career departures occur after Season 30. Because the opening 164 fighters were born together, their eligibility dates bunch up. The deferred queue peaks at **29 after Season 38**, then falls to 27 and **25 after Season 40**. The oldest still-waiting career is three seasons overdue; the longest wait among already retired fighters was four seasons. A career length is an eligibility date, not a guaranteed departure date, under the approved five-total-exit rule.

**Keep the five-exit budget for now.** Check Seasons 50 and 60 for whether the queue clears before proposing more departures or widening fresh career lengths. The current queue is a consequence of the configured cap, and is not evidence of an incorrect rollover or an indefinitely growing queue.

Checks found **zero** mismatches between archived series and match records, titles and champion history, recomputed 3/1/0 standings, or double round-robin schedules. All 16 current champion identities and names match Season 40. No fighter's stored stats or traits drifted between snapshots, no fighter retired twice, and all 164 active memberships match Season 41 exactly.

League draws are **2,322 / 147,680 = 1.57%**. Decisive league blue-side wins are **50.25%**, providing no material aggregate side-bias signal. Median simulated fight length is **16.8s**, with a 90th percentile of **42.6s**. These are in-game durations; this backup does not record wall-clock simulation or save timings, so it cannot establish a server or performance bottleneck.

## Evidence and next validation

Compact supporting data are checked in under [`validation/season-40-review`](validation/season-40-review). The full decoded backup and per-game tables remain outside Git. Original backup SHA256:

`f911ed4450be74ddb2707e07b3d450e7235e89517e333a32cdd1a5d90935bd0c`

Audited combat fingerprint, matching the final v10 release:

`17f6e5eddf615f53b2b3bd9e23f830c57a17530cc315f57bc37ff2b1d2d3c3bf`

Before shipping v11, verify Memory/Metal defense and interruption behavior directly, compare each candidate with the same opponents/seeds/conditions, and run independent fresh worlds. Track carrier-level power contributions, similar-stat style matchups, title concentration excluding any one champion, roster tiers, and retirement queue length. A sensible working target is **45–60%** for each similar-stat style matchup, supported by controlled comparisons as well as season outcomes. A single strongest fighter may still win repeatedly; diversity across independent worlds matters more than forcing this one world to distribute every title evenly.

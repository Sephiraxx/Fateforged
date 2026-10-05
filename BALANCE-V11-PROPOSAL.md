# Fateforged v11: merged patch proposal and changelog

October 5, 2026. Original proposal approved for implementation. See `BALANCE-V11.md` for the implemented patch and its validation. The numerical tables below describe the proposal author's earlier experiments; the new release evidence is separate in `validation/balance-v11/`.

This is one patch that merges two sources:

- **The 40-season v10 review** and its ten proposed changes (P1–P10). All ten are in here.
- **My additions**, based on about 60,000 what-if fights on the shipped v10 engine, changing one rule at a time.

Where the review and my tests cover the same thing, the tested version is used and the review's part is kept inside it. Each row says where it came from and whether I measured it. The what-if fights are controlled fights between synthetic or generated fighters, not league seasons: they show which direction a change pushes and roughly how hard. League results still need the validation at the end.

**Your decisions, applied:** unused retirement slots stay empty; no forced SS fighter; the Dream walking nerf stays in.

## Changelog

**Careers and roster**

- Up to **10 fighters leave each season**: the **bottom 3 of Dawnrise**, plus up to **7 completed careers**. If fewer than 7 careers are due, nobody extra is cut.
- Recruits match departures one for one, so league sizes never change.

**Weapons and movement**

- Arcane weapons (staff, wand, orb, spellbook): shots add **0.05 × spell** instead of 0.20, armor counts **in full** instead of 65%, and range rises from **185 to 200**.
- Melee fighters chase arcane opponents at **1.15 ×** speed instead of 1.10.

**Powers: nerfs**

- **Phoenix rebirth** restores **30%** health instead of 45%.
- **Dream walking**: the bolt deals **0.6 × spell** instead of 1.0. Sleep is unchanged.
- **Memory control** must connect (220 reach, 0.20s interruptible cast, can be dodged or warded), lasts **1.8s** instead of 3.0, and costs **12 mana** instead of 9.
- **Metal bending** disarms only when its shard hits.
- **Beast command** bite deals 0.30 × weapon damage instead of 0.35.

**Powers: fixes and buffs**

- Fighters with two powers now **take turns** between them instead of letting one power hog every cast.
- **Teleportation** blinks only when the blink helps, picks the best of four landing spots, and recasts twice as fast afterwards.
- **Size shifting** picks the form that suits the weapon, lasts twice as long, and the large form hits 15% harder.
- **Mind reading** is cast only when there is something to read, and adds +0.08 accuracy and dodge while active.
- **Energy absorption** is cast only against magical threats; **Spirit armor** only against physical ones.
- **Portal creation**: stepping out of a portal grants 0.5s of evasion and a ready weapon.
- **Power copying** picks a usable copied power instead of alternating blindly.

**Engine**

- Combat becomes **v11**. v10 is frozen so every saved v10 game still replays exactly.

## Careers and roster

| ID | Change | Current → proposed | Source |
| --- | --- | --- | --- |
| C1 | Departures per season | 5 total, careers first, Dawnrise fills the rest → **3 Dawnrise bottom finishers always, plus up to 7 completed careers** | Your request |
| C2 | Fewer than 7 careers due | n/a → **the unused slots stay empty** | Your decision |
| C3 | Recruits | Exactly 5 → **one recruit per departure**, taking slots in this order: ordinary, Rare, ordinary, Unique, exceptional, ordinary, Rare, ordinary, Unique, exceptional | Mine, not simulated |

Today a completed career takes a slot away from the Dawnrise bottom, so once five careers queue up, the worst fighters stop leaving. The 7 + 3 split fixes that.

The backlog of 25 overdue careers clears in about four seasons. After that, careers come due at roughly 4–5 per season, so a typical season has 7–8 departures. That is arithmetic from the 30–38 season career length, not a simulation.

C3's order reproduces today's recipe exactly at five departures and doubles it at ten, so the share of exceptional recruits stays about where it is. The exceptional slot keeps its 85% Legendary / 15% Mythic split.

**Not included: a guaranteed SS fighter.** Dropped on your decision. For the record, a forced SS won 89% of its fights against Legendary-roll opponents in my test, so it would have been a title favourite, not a mid-table fighter.

## Arcane against melee

Equal stats, no powers, three stat profiles, 384 fights per cell. Win rate of the shooter:

| Shooter | vs Sword | vs Mace | vs Longbow |
| --- | ---: | ---: | ---: |
| Longbow (reference) | 84% | 70% | n/a |
| Staff as shipped (0.20 magic, 65% armor, range 185) | 96% | 95% | 25% |
| Staff as shipped, range 215 only | 98% | 97% | 62% |
| Staff, 0.10 magic, 80% armor, range 185 | 94% | 90% | 19% |
| **Staff, 0.05 magic, full armor, range 200 (proposed)** | **88%** | **84%** | **27%** |
| Staff, no magic, full armor, range 200 (fallback) | 78% | 72% | 24% |

- A staff beats melee more than a bow does because its shots hit harder: a magic bonus on top of full weapon damage, and armor discounted to 65%. Removing both brings it to bow level.
- A staff loses to a bow because of range. Range alone moves that matchup from 25% to 62%.
- So the patch removes most of the damage edge and gives back just enough range to leave arcane-versus-bow where it is now.

| ID | Change | Current → proposed | Source |
| --- | --- | --- | --- |
| W1 | Magic added to ordinary arcane shots | 0.20 × spell → **0.05 × spell** | Mine, measured |
| W2 | Armor against ordinary arcane shots | 65% → **100%** | Mine, measured |
| W3 | Arcane weapon range | 185 → **200** | Mine, measured |
| W4 | Melee chase speed against arcane | 1.10 → **1.15 ×** (1.10 against ranged stays) | Review P5, measured |

W4 is kept because you liked the review's changes, and it is harmless. In my test it did almost nothing: alone it moved staff-versus-sword from 97.4% to 97.2%, and stacked on W1–W3 it left the result within noise (576 fights per cell). W1–W3 are what move the matchup.

If league arcane-versus-melee is still above 60% after this, the fallback row (no magic bonus at all) is the next step. Magical powers keep their 40% armor rule; only weapon shots change. There is no general melee buff: ranged-versus-melee is already 58% in the league, inside the target band.

## Phoenix rebirth and Dream walking

640 fights per row. The "plain carrier" is a 1,650-total fighter facing 40 Legendary-roll opponents averaging 1,938, so it starts as an underdog.

| Plain carrier | Sword | Longbow |
| --- | ---: | ---: |
| No powers | 16% | 34% |
| Fire control (an ordinary bolt power) | 44% | 67% |
| Dream walking, as shipped | 46% | 69% |
| Dream walking, bolt 0.6 × spell | 39% | 65% |
| Phoenix rebirth 45% | 40% | 54% |
| Phoenix rebirth 30% | 33% | 47% |

| Aziel-like build (Mace, 2,848 total) vs 40 Mythic-roll fighters averaging 2,556 | Win rate |
| --- | ---: |
| Both powers, as shipped | 86% |
| Neither power | 27% |
| Dream bolt 0.6 | 83% |
| Rebirth 30% | 82% |
| **Both changes (proposed)** | **77%** |

| ID | Change | Current → proposed | Source |
| --- | --- | --- | --- |
| N1 | Phoenix rebirth health | 45% → **30%** (slow recovery: 22.5% → 15%) | Your request, measured |
| N2 | Dream walking bolt damage | 1.0 × spell → **0.6 × spell**; sleep stays 2.8s | Your request, measured |

- **Sleep length is not what makes Dream walking strong.** Cutting sleep from 2.8s to 1.4s, or blocking a second sleep for 10 seconds, changed nothing (95–96% either way). The bolt's damage does the work, so N2 targets the bolt and the review's "keep 2.8s" stands.
- **Dream walking performs like any bolt power**, within two points of Fire control. N2 is in on your decision.
- **These trims will not dethrone a build like Aziel.** Its two powers together are worth 59 points on those stats, and owning any damaging power is worth roughly 30 points to a plain fighter. That is too broad for this patch; it is on the watch list.

## Counterplay repairs

All from the review, taken as written. I have not measured these.

| ID | Change | Current → proposed | Source |
| --- | --- | --- | --- |
| N3 | Memory control must connect | Unlimited distance, instant → **220 reach, 0.20s interruptible cast**, range checked at release; dodge, ward or Future sight prevents the whole effect | Review P1 |
| N4 | Memory control lockdown | 3.0s, 9 mana → **1.8s, 12 mana**; accuracy ×0.65 and Memory loss ×1.5 kept | Review P2 |
| N5 | Metal bending disarm | Applied before the shard launches → **applied only when the shard connects**, 3.0s; a warded shard must not disarm | Review P3 |
| N6 | Beast command bite | 0.35 → **0.30 × weapon damage**; interval, lifetime and cost kept | Review P4 |

One caution on N3 and N4, which the review raises itself: they hit the same power twice. Measure N3 alone before adding N4, so Memory control is not left useless.

## Utility powers

What each power adds to win rate, for equal 1,500-total fighters across six weapon pairings (384 fights per cell). "Alone" is the power against a no-power opponent. "With an attack power" is the power added to a fighter who already has Fire control, against an opponent who also has it.

| Power | As shipped: alone | As shipped: with an attack power | Proposed: alone | Proposed: with an attack power |
| --- | ---: | ---: | ---: | ---: |
| Teleportation | +10.3 | **−12.5** | +16.4 | +5.2 |
| Size shifting | +8.6 | **−7.6** | +14.2 | +2.1 |
| Mind reading | +2.3 | **−2.6** | +7.3 | +1.8 |
| Energy absorption | +25.1 | +7.3 | +25.1 | +10.2 |
| Portal creation | −0.5 | 0.0 | +9.9 | +0.8 |

These powers are fine alone and harmful as a second power, because all powers share one cast timer and utility powers outrank attack powers (65–70 against 50). A fighter with Size shifting and Fire control keeps resizing instead of throwing fire. The review's smarter-casting rules fix the wasted casts; the take-turns rule and the buffs are what make the powers worth having.

| ID | Change | Current → proposed | Source |
| --- | --- | --- | --- |
| U1 | Two-power fighters take turns | Highest fixed priority always wins → **the power cast last loses 30 priority until another power is cast** | Mine, measured |
| U2 | Teleportation | Blinks whenever available → **only for an incoming threat or at least 25 units closer to preferred range; best of four seeded landing angles; cast timer halved after a blink** | Review P6 + mine. Measured without the four-angle choice |
| U3 | Size shifting | Alternates small and large → **melee goes large, shooters go small; lasts twice as long; large form deals 15% more weapon damage** | Mine, measured |
| U4 | Mind reading | Cast for any enemy projectile → **only for a projectile on course to hit within 0.75s, or a hidden opponent; +0.08 accuracy and dodge while active** | Review P8 + mine, measured |
| U5 | Energy absorption | Cast whenever its timer runs out → **only against a credible magical threat** | Review P7, measured |
| U6 | Spirit armor | Cast whenever its timer runs out → **only against a credible physical threat** | Review P7, not measured |
| U7 | Portal creation | Exit is neutral → **0.5s evasion and weapon ready on exit** | Mine, measured |
| U8 | Power copying | Alternates blindly → **applies normal eligibility to copied powers; never pays for nothing** | Review P9, not measured |

For U4–U6, use the review's threat rule: predict a projectile's path from its position, velocity and the fighter's radius, and count an opponent's imminent weapon attack too.

U1 is safe for ordinary pairs: Fire with Storm, Fire with Healing and Storm with Regeneration all moved between 0 and +2 points.

Energy absorption gets no number buff. It is narrow, not weak: +50 points against a staff, 0 against a sword or bow. The review's −17 comes from three carriers and from the casting problem that U1 and U5 fix.

## Engine

| ID | Change | Source |
| --- | --- | --- |
| E1 | Combat v10 → **v11**, with v10 and its dependencies frozen under a source-hash lock, the same way v9 was frozen | Review P10 |
| E2 | Career rules are stored with the world; archived seasons, titles and saved fighter stats are untouched | Mine |
| E3 | A season already in progress finishes on v10 and adopts v11 at rollover | Same rule v10 used |

## Kept unchanged

From the review's keep list, still kept: generation and rarity settings, the 85/15 exceptional slot, the second-power factor 0.8, 30–38 season careers, Dream walking's 2.8s sleep, Rewind, Light manipulation, Chain lightning. No race, class, mastery, Mace or ranged-damage changes.

Changed against the review's keep list, on your decisions: five retirements becomes 3 + up to 7, and Phoenix 45% becomes 30%.

## Where each review item went

| Review | In this patch as | Changed? |
| --- | --- | --- |
| P1 Memory control counterplay | N3 | No |
| P2 Memory control duration and cost | N4 | No; measure N3 first |
| P3 Metal bending | N5 | No |
| P4 Beast command | N6 | No |
| P5 Melee pursuit vs arcane | W4 | No; W1–W3 added because P5 alone barely moves the matchup |
| P6 Teleportation | U2 | Yes; half recast added |
| P7 Defensive casts | U5, U6 | No |
| P8 Mind reading | U4 | Yes; +0.08 accuracy and dodge added |
| P9 Power copying | U8 | No |
| P10 New engine version | E1 | No |

## Validation before shipping

1. Replay check: sampled saved v10 games must replay exactly after v10 is frozen.
2. Each change measured alone against the same opponents, seeds and conditions, then all together. N3 before N4.
3. Ten fresh worlds for 40 seasons with the new career rules. Track departures per season, the career queue, tier shares, and how long recruits survive in Dawnrise.
4. Similar-stat style matchups from those worlds. Target 45–60% for each pair, and arcane-versus-ranged no lower than it is now.
5. Two-power builds in general, to confirm U1 helps beyond the pairs I tested.

## Watch list

- Damaging powers as a whole: any bolt power is worth about 30 points to a plain fighter.
- Dream walking with Phoenix rebirth across independent carriers.
- Blood control, Telekinesis, Summon spirits and Force fields, as the review lists.
- Size shifting and Portal creation after U3 and U7, in case the buffs overshoot.

# Class identity and mixed abilities

Fateforge now generates equipment and abilities around a fighter's class and subclass. Fighters still have two slots, but each can hold a spell, a stamina technique, or an empty outcome. There are **54 spells and 10 techniques**, with profiles for **all 56 classes and every existing subclass**.

This release uses combat 12, generation 3 and class-profile 1. Those identifiers belong in saved data and these development notes. The character wheel and league screens do not show engine/generator/retirement status banners.

## Generation

| Class family | Spell discipline | Technique discipline |
|---|---:|---:|
| Martial | 10% | 90% |
| Caster | 90% | 10% |
| Hybrid | 50% | 50% |

Mage / Arcanist uses 95% spells; Runemaster / Rune knight uses 40%. Subclass themes promote relevant abilities into the signature pool and multiply their within-pool weight by two. Shields, dueling blades and Druid specialties also have equipment overrides.

Spell availability retains the Magic-roll curve. Technique availability uses Combat mastery: Untrained 10%, Beginner 30%, Trained 50%, Veteran 65%, Expert 75%, Master 85%, Grandmaster 90%, Legendary 95%, Perfect technique 98%, Combat omniscience 99%. The second slot multiplies availability by 0.8. A failed discipline roll leaves the slot empty; it does not guarantee an ability from the other discipline.

A Veteran Warrior with No magic has a 58.5% first-slot ability chance and 46.8% second-slot chance. Empty slots remain stat-free. Duplicate canonical IDs, including differently capitalized aliases, cannot fill both slots.

| Selection bucket | Ability share within a populated rarity/discipline | Weapon share |
|---|---:|---:|
| Signature | 70% | 80% |
| Related | 25% | 15% |
| Wildcard | 5% | 5% |

The spell rarity-group mass comes from the frozen generation-2 reference, before class affinity is applied. Techniques use that same reference. Technical equipment restrictions are applied before selection. Missing themes redirect probability to the nearest populated bucket within that rarity; missing compatible rarities renormalize the remaining rarity groups. This means sparse technique pools can differ from the reference rarity mix, especially with arcane weapons. The expected redistribution for each class is reported in [affinity.json](validation/class-abilities/affinity.json), separately from observed bucket counts.

Unknown classes use a neutral hybrid pool. Custom spells remain generic arcane bolts; custom weapons keep the previous name-based fallback. All 41 known weapon attack profiles and all pre-existing stat arrays retain their v11 values. There are no extra class damage multipliers or new stat-growth rewards.

## Techniques

W is equipped weapon damage before defenses and critical hits. Techniques occupy the same slots and share the same action lock and ability timer as spells. Their shared cooldown is **4.2 seconds**, independent of Magic. Stamina capacity/regeneration remains 100/11 per second, or 55/5 with Limited stamina. Normal selection reserves 12 stamina; Last stand has an emergency exception. A technique strike replaces the ordinary six-stamina weapon attack cost and consumes its attack opportunity.

| Ability | Rarity | Stamina | Effect |
|---|---|---:|---|
| Guard | Common | 14 | Next connected physical hit takes 30% less damage within 1.2 seconds. |
| Driving strike | Common | 12 | Melee 1.10W, 0.20-second windup, 15-unit push. |
| Charge | Uncommon | 22 | Travel up to 90 units at 360 units/s; 0.25-second windup; connected 0.65W cancels a weapon action and staggers for 0.15 seconds. Shield equipment names it Shield rush and adds a 20-unit push. Pillars block travel. |
| Parry | Uncommon | 18 | A 0.65-second stance blocks one frontal ordinary physical melee hit, then readies a 0.55W riposte for 1.5 seconds. |
| Cleave | Uncommon | 20 | Broad melee 1.25W; 0.30-second windup and 0.35-second recovery. |
| Aimed shot | Uncommon | 18 | Physical ranged 1.25W after a 0.35-second aim; normal projectile defenses. |
| Second wind | Rare | 25 | Once below 45% health, heal 10% maximum health over three seconds. Healing penalties apply. |
| Crippling strike | Rare | 20 | Physical melee/ranged 0.90W; connected hit slows movement 30% for two seconds. |
| Last stand | Legendary | 30 | Once below 30% health, reduce incoming hit damage 35% and strengthen weapon damage 20% for four seconds. No healing or resurrection. |
| Perfect counter | Legendary | 30 | Once, negate one frontal ordinary physical weapon hit within 0.80 seconds, then ready a 1.35W equipped-weapon counter for 1.5 seconds. Requires a physical weapon. |

Strikes can miss or be interrupted. Counters obey range and defenses; neither riposte is guaranteed. Parry excludes projectiles and spells. Perfect counter excludes spells, zones and rear hits. Guard consumes only on a connected hit. Disarm affects weapon-dependent techniques; sleep, amnesia, stagger and committed actions block both disciplines. Magic-specific suppression, silence, sacrifice and time-of-day restrictions affect spells. Power copying copies spells only, with its existing weapon fallback when there is no usable spell.

## Nature spells

P = 12 + 2.3 × square root of Magic. Existing Regeneration, Healing touch, Life creation, Beast command and Shapeshifting supply the nature healing/beast foundation.

| Spell | Rarity | Mana | Effect |
|---|---|---:|---|
| Thorn bolt | Common | 9 | Dodgeable 0.35P projectile; connected bleed 0.04P/s for 1.5 seconds. |
| Entangling roots | Uncommon | 12 | Dodgeable 0.25P projectile; connected root for 1.2 seconds. Attacks and spells remain usable; Flight prevents/releases roots. |
| Bramble patch | Uncommon | 12 | Visible radius-45 zone for three seconds; grounded movement slows 25%, damage pulses at 0.04P every 0.5 seconds. Flight ignores the movement penalty. |
| Seedburst | Rare | 15 | Visible radius-40 marker detonates after 0.70 seconds for 0.80P. Moving out avoids it; wards and Future sight can block it. |

The new stat budgets are Common 10, Uncommon 50, Rare 100 and Legendary 240. Healing and new summons for teammates remain future work; this is still one-versus-one combat.

## Interface and saved worlds

- Power / Second power become Ability / Second ability. Details show spell/technique, rarity, affinity, effect, cost and cooldown.
- Class, Weapon, Magic and Combat mastery precede ability rolls. Changing their inputs clears dependent results before completion. Manual wheels, bulk generation, league recruits, server storage and Pages share the same weighting rules.
- Trait-navigation chips run horizontally so the effect rows remain visible. Rotated SVG corners no longer widen the phone page.
- The forbidden combat/generation/career-status text remains absent, including the fresh-world message. Existing cup fixtures, collapsible league views, phase checkpoints and cup-round simulation remain available.
- Saved builds stay locked. New fighters store generation/profile versions, canonical ability IDs and generated/custom origin. Existing legacy fighters keep their spell-only behavior, even if a custom spell's name matches a newly introduced ability such as Guard.
- Existing v11 seasons and cups stay pinned, including unplayed v11 competitions. The pre-existing adoption rule still prepares an unplayed v10 season for v11. Rollover switches the next season to combat 12/generation 3 after all cups finish. New cups and fresh worlds start on combat 12.
- Old engine source files and original generation-2 data/luck are frozen. Historical archives, titles, stats, earned bonuses and career dates remain intact. Existing fighters are not rerolled at adoption.

## Validation

The deterministic checks cover 6,720 generated fighters across all 56 classes, every subclass profile, the 410 weapon/technique combinations, canonical aliases, legacy-name collisions, resource locks, copying, root defenses, counters, one-use limits, zone escape, watched/headless parity and frozen v11 hashes. Storage checks cover both server and Pages, equipment validation, authoritative IDs, old cups, concurrent tabs, backup import/export, compressed snapshots and retry-safe phase/rollover commands.

The supplied 40-season backup was opened read-only and simulated in an in-memory copy. Six phase checkpoints and rollover preserved all **40 archived seasons and 640 existing titles**. Surviving stats, traits, bonuses and career dates were checked directly. Its source SHA-256 remained `f911ed4450be74ddb2707e07b3d450e7235e89517e333a32cdd1a5d90935bd0c`. See [save-transition.json](validation/class-abilities/save-transition.json).

### Fresh generation comparison

Same seed, 10,000 fighters per generator. Shared wheel-rarity odds remain unchanged; different ability/equipment choices can alter total points.

| Measure | Generation 2 | Generation 3 | Change |
|---|---:|---:|---:|
| Mean total | 645.36 | 656.26 | +10.90 points |
| A+ | 5.78% | 5.82% | +0.04 percentage points |
| S+ | 1.83% | 1.79% | −0.04 percentage points |
| SS | 0.03% | 0.03% | 0 |

These pass the proposal's two-percentage-point high-tier threshold. Full data: [generation.json](validation/class-abilities/generation.json).

### Forty-season worlds

These class-release measurements were recorded at commit `4db78ec`, before the later interleague-format change. They retain the original single-elimination interleague cup schedule. See [INTERLEAGUE-CUPS.md](INTERLEAGUE-CUPS.md) for the subsequent double-elimination rules and validation; combat/generation inputs remain the same.

Three independent seeds, 164 fighters each, 40 complete seasons per world, including division cups, both qualifiers, both interleague cups and rollover. Settings use one round-robin and Bo1 league series; cups use their existing formats. The final run completed **246,600 series / 252,173 games** in about 963 seconds on this machine. All 14 new abilities were actually used.

League style comparisons below restrict total-point ratios to 0.8–1.25. Score is wins plus half a draw divided by games; it is distinct from the league's 3/1/0 table points.

| Matchup | Games | Draw-adjusted score | Target |
|---|---:|---:|---:|
| Arcane versus melee | 26,169 | 58.65% | 45–60% |
| Ranged versus melee | 11,172 | 56.17% | 45–60% |
| Arcane versus ranged | 10,667 | 50.13% | 45–60% |

The run recorded 6,961 drawn games, all in league play: 3.14% of its 221,520 league games. Arcane/ranged comparisons contained 1,633 draws; their score should not be read as a 50.13% outright win rate.

| Season 40 roster | World 1 | World 2 | World 3 |
|---|---:|---:|---:|
| A+ | 16.46% | 20.12% | 19.51% |
| S+ | 5.49% | 4.88% | 6.71% |
| SS | 0 | 0 | 0 |
| Martial fighters | 34 | 35 | 37 |
| Caster fighters | 81 | 83 | 81 |
| Hybrid fighters | 49 | 46 | 46 |
| Deferred eligible careers | 34 | 23 | 33 |

Every final rollover had ten departures; season-40 movement had 38/39/38 promotions, including promotions to fill retirement vacancies, and 18 relegations. Per-season counts and division tier composition are in [worlds.json](validation/class-abilities/worlds.json).

These are screening results, not proof of universal class balance. Alchemist led the raw class score at **61.81% over 17,698 league appearances**, with a mean total of **1,288.36**. It remains a watch item; the raw result includes roster strength, equipment, rarity and repeated surviving careers. Natural league pairings satisfying equal rarity, equal weapon style and all five stats within 25% produced only nine comparisons, so they cannot establish a class conclusion.

A separate controlled toolkit comparison is documented below. Career queues are another continuing watch item from v11; this feature deliberately leaves career intake/retirement rules unchanged. Surviving populations are not expected to reproduce fresh-generation tier shares, since losses, recruitment and retirement select who remains.

### Controlled toolkit comparison and balance flags

The full 56-class round-robin adds **27,720 games / 990 appearances per class**. Each pair plays the same seed with sides swapped, at Common, Rare and Legendary wheel rarity, using the same Longsword, Longbow or Staff. All five combat stats are 225; Combat mastery is Veteran, the Magic roll is Adept, and weakness is neutral. Normal subclass, availability and affinity rules choose each build's two abilities.

This holds the declared controls equal while measuring toolkit differences. It removes normal class stat contributions and gives equal weight to off-theme equipment and to three rarities, so it is not a prediction of generated-roster win rates. Paired games also share their sampled builds and are not independent draws from the full build space.

| Family | All controlled contexts | Longsword | Longbow | Staff |
|---|---:|---:|---:|---:|
| Martial | 40.01% | 41.76% | 36.97% | 41.30% |
| Caster | 59.26% | 57.14% | 62.23% | 58.40% |
| Hybrid | 51.65% | 52.02% | 51.94% | 50.98% |

**The starting technique toolkit is weaker under these controls.** This remains a balance flag despite the passing weapon-style and high-tier screens. Cleric leads the controlled class score at 64.75%, followed by Healer at 62.12% and Psion at 61.31%. Hunter scores 34.65% and Ranger 36.21%; Warrior 41.57%, Mage 58.43% and Druid 57.68%. Alchemist's controlled score is 58.03%, lower than its raw league lead.

The agreed starting costs/effects remain intact. Do not describe this release as universally class-balanced. Gameplay testing should focus on martial resource efficiency and damage opportunity costs, healing/defense-focused caster builds, and ranged techniques before adding more content. Changes should come from those measurements; this release adds no compensating class-wide damage multiplier. Full results are in [controls.json](validation/class-abilities/controls.json), with combined flags in [summary.json](validation/class-abilities/summary.json).

## Reproduction

Use Node 24 and the installed dependencies. Rebuild the shared catalog only when intentionally changing class metadata:

```text
node scripts/prepare-class-catalog.mjs
node scripts/build.mjs
node scripts/build-pages.mjs
node scripts/build-pages.mjs --output docs
node scripts/check-all.mjs
node scripts/evaluate-class-abilities.mjs generation
node scripts/evaluate-class-affinity.mjs
node scripts/evaluate-class-controls.mjs
node scripts/evaluate-class-abilities.mjs worlds
node scripts/summarize-class-evaluation.mjs
node scripts/verify-class-save.mjs "path/to/a/read-only-backup.sqlite"
```

The last command writes only to an in-memory clone and the validation report. The offline fresh-world evaluation never opens user saves. Fingerprints in the generation/world reports identify the exact combat and generation inputs. The approved specification is retained in [CLASS-IDENTITY-PROPOSAL.md](CLASS-IDENTITY-PROPOSAL.md).

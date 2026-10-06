# Class identity and abilities — suggested build

Status: approved design specification. Implementation and measured validation are documented in [CLASS-ABILITIES.md](CLASS-ABILITIES.md). This is a separate feature release after the v11 balance test; v11 remains the comparison baseline.

## Direction

Class determines the fighter's usual toolkit. Subclass sharpens it. Rarity determines how exceptional the fighter can be. Unusual combinations remain possible, while ordinary Druids, Warriors and Mages are recognizable from their equipment and behavior.

Keep the existing two ability slots. Each slot can contain a spell, a technique, or no ability. The current 50 powers remain available as spells, including the silent/innate powers. Physical techniques are a new ability kind, not renamed magical powers.

Start with generation, weapons, martial techniques and a small nature expansion. Team combat can extend the same targeting system later; this release remains a complete one-versus-one game.

## 1. Generation

### Slot discipline and availability

For each ability slot, first choose its discipline from the class profile:

| Profile | Spell | Technique |
|---|---:|---:|
| Martial | 10% | 90% |
| Caster | 90% | 10% |
| Hybrid | 50% | 50% |

Subclass may explicitly change this split: a Rune knight might use 40% spells / 60% techniques; an Arcanist might use 95% / 5%. These are configured values, not accumulated multipliers.

Spell availability keeps the current Magic-roll probability curve. Technique availability uses the existing Combat mastery roll:

| Combat mastery | First-slot technique chance |
|---|---:|
| Untrained | 10% |
| Beginner | 30% |
| Trained | 50% |
| Veteran | 65% |
| Expert | 75% |
| Master | 85% |
| Grandmaster | 90% |
| Legendary | 95% |
| Perfect technique | 98% |
| Combat omniscience | 99% |

Second-slot availability is 80% of its discipline's first-slot chance, matching the current second-power relationship. No duplicate ability IDs. Failure produces an empty slot; it does not reroll into the other discipline or guarantee a consolation ability.

Example: a Veteran Warrior with no Magic has approximately a 58.5% chance of any first-slot ability (90% × 65%), and 46.8% in the second slot. A Mage with no Magic can still occasionally learn a technique, but does not receive guaranteed spells.

### Rarity, affinity and selection

For a successful spell slot, retain the v2 spell rarity-group distribution for the fighter's wheel rarity, then choose within that rarity. For techniques, build an equivalent table from the same reference distribution. Technique rarity is not a separate unlimited lottery for Legendary abilities.

Within the selected discipline and rarity, choose an affinity bucket:

| Bucket | Abilities | Weapons |
|---|---:|---:|
| Signature / core | 70% | 80% |
| Related | 25% | 15% |
| Wildcard | 5% | 5% |

Then use existing base weights inside that bucket. Each candidate belongs to exactly one bucket for a given class/subclass. A subclass can promote relevant candidates into Signature and give its specialty candidates ×2 weight within their bucket.

This refines the earlier ×4/×2/×1 suggestion: group selection makes the desired class identity reliable even when many off-theme abilities exist.

Apply technical compatibility before sampling: shield techniques require a shield; melee strikes require melee equipment; Aimed shot requires a physical ranged weapon. Exclusions are for unusable mechanics, not dislike of unusual builds. If a selected bucket is empty, move to the nearest populated bucket without changing rarity. If the entire selected rarity is incompatible, renormalize over compatible rarity groups and record that fallback for evaluation. A custom/unknown class uses a neutral shared profile.

Preserve existing wheel-rarity odds, career intake rules and all existing trait stat arrays. New ability stat budgets start near existing values: Common 10 total points, Uncommon 50, Rare 100, Legendary 240. The stat distribution should suit the ability; these budgets must be checked against the v11 roster distribution before release.

## 2. Class map

These families provide shared defaults; every named class still receives its own signature list and subclass overrides.

| Family | Existing classes | Default | Main themes |
|---|---|---|---|
| Frontline | Warrior, Berserker, Gladiator, Juggernaut, Samurai | Martial | Charges, committed strikes, endurance, counters |
| Protection and command | Sentinel, Guardian, Warlord, Strategist | Martial | Guards, shield control, defensive timing, self-rallying |
| Arcane and elemental | Mage, Sorcerer, Elementalist, Conjurer, Runemaster | Caster | Elemental spells, wards, arcane attacks, movement magic |
| Mind, time and illusion | Psion, Chronomancer, Illusionist, Oracle | Caster | Mental control, prediction, time, perception |
| Curses and forbidden magic | Witch, Warlock, Hexer, Blood Mage, Necromancer | Caster | Curses, blood, draining, death, dark summons |
| Sacred support | Cleric, Priest, Healer | Caster | Healing, cleansing, holy damage, protection |
| Nature and spirits | Druid, Shaman, Summoner | Caster | Nature, beasts, spirits, terrain, regeneration |
| Stealth and trickery | Rogue, Assassin, Ninja, Shadow, Corsair, Dancer, Trickster, Gambler, Jester | Martial for first six; Hybrid for last three | Evasion, ambushes, poison, counters, misdirection |
| Hunting and marksmanship | Ranger, Sniper, Bounty Hunter, Hunter | Martial | Ranged techniques, tracking and weapon control; nature as related spells |
| Beast and bodily transformation | Beast Master, Shifter | Hybrid | Beasts, transformations, physical pursuit |
| Unarmed | Monk, Brawler | Martial | Close strikes, counters, defensive stance, mobility |
| Weapon-and-magic hybrids | Death Knight, Paladin, Soul Reaper, Void Walker, Spellblade, Inquisitor | Hybrid | Their particular magical theme plus weapon techniques |
| Craft | Artificer, Inventor, Alchemist | Hybrid | Equipment, projectiles, defense; elemental/alchemical spells as related options |
| Performance | Bard | Hybrid | Sound, mind, illusion, physical rhythm and defense |

Do not add a universal class damage bonus. Class identity comes from equipment, ability access and decisions. This avoids stacking another stat multiplier on top of the existing class and subclass contributions.

### Anchor profiles

| Profile | Signature weapons | Signature existing spells | Technique direction |
|---|---|---|---|
| Warrior | Swords, axes, spears, shields | Mostly rare wildcard gifts | Guard, Charge, Driving strike, Cleave, Parry |
| Druid | Quarterstaff, claws | Regeneration, Healing touch, Life creation, Beast command, Shapeshifting; new nature spells | Guard and movement as related training |
| Mage | Staff, Magic wand, Crystal orb, Spellbook | Fire/Ice/Storm, Crystal shaping, Force fields, Teleportation, Energy absorption; specialty-dependent rare magic | Defensive training as related skills |
| Rogue | Daggers, throwing knives, light swords | Invisibility, Shadow shaping, Venom craft, Illusion weaving | Parry, precision and evasive techniques |
| Ranger | Bows, crossbows, spear | Beast command, nature spells, some healing | Aimed shot, Guard, field endurance |
| Paladin | Blessed mace, swords, shields | Light manipulation, Healing touch, Spirit armor | Charge, Guard, shield-based control |

### Subclass examples

- Druid / Moonshifter: Shapeshifting and beast-oriented abilities.
- Druid / Wildkeeper: Beast command, roots, brambles and Life creation.
- Druid / Spore tender: Venom craft, regeneration and persistent nature zones.
- Druid / Star watcher: Light, Future sight and protective/celestial spells; rare temporal gifts remain rare.
- Warrior / Duelist: Parry, Driving strike, light blades; avoids favoring shields.
- Warrior / Guardian: Guard, shield-dependent Charge and defensive endurance.
- Warrior / Warlord: endurance and committed pressure; command effects help the caster in 1v1.
- Mage / Elementalist: elemental spells.
- Mage / Chronomancer: Future sight, Time slowing and temporal/space-related magic.
- Mage / Illusionist: Illusion weaving, Invisibility, Dream walking and Mirror barrier.

## 3. Combat rules for techniques

Techniques use stamina. Spells use mana. Both compete for the same action and share one ability timer; a hybrid cannot activate a spell and technique simultaneously.

- Spell casts retain the v11 shared-cooldown formula.
- Techniques start with a flat 4.2-second shared cooldown. Magic does not improve technique cadence. Teleportation's existing shorter delay still belongs to that spell.
- Existing stamina capacity/regeneration stays at 100 / 11 per second, or 55 / 5 with Limited stamina.
- Technique AI normally keeps 12 stamina in reserve after payment, enough for two ordinary attacks. Last stand can use its emergency exception.
- Technique strikes consume the normal weapon attack opportunity and cooldown. Their listed stamina cost replaces the ordinary 6-stamina attack cost; movement components do not also pay an automatic roll charge.
- Physical damage uses W and normal physical defenses. Spell damage continues to use P. Status duration stays fixed rather than scaling with stats.
- Techniques have interruptible actions where appropriate. No casting during sleep, amnesia, stagger or another committed action.
- Magic-specific suppression, Silenced casting, sacrifice, and daylight/night power restrictions affect spells. Memory loss can disrupt either slot. Short duration affects timed abilities of either discipline; Overconfidence and physical weaknesses keep their normal general effects. Power has a cooldown continues to penalize spells.
- Physical and resource restrictions still matter: disarmed fighters cannot execute weapon-dependent techniques, but may use an equipment-independent technique such as Second wind. Cannot harm the innocent applies to damaging techniques and spells.
- AI selects an ability because its effect is useful, not merely because it is affordable. The existing soft alternation remains, with emergencies allowed to take priority.

Power copying must have an explicit boundary: for this first release it copies spells only. Techniques are learned physical actions, not magical gifts. If an opponent has no spells, the existing weapon-copy fallback applies. Reflectors, wards and counters must distinguish physical projectiles, magical projectiles, direct hits and pure control explicitly.

## 4. Initial content: ten techniques and four nature spells

W means the fighter's weapon damage, including its equipped-weapon multiplier. P means 12 + 2.3 × square root of Magic. Listed damage is before defenses and critical hits.

| Technique | Rarity | Stamina | Suggested effect and limits |
|---|---|---:|---|
| Guard | Common | 14 | Reduce the next physical hit by 30%, within 1.2 seconds. No damage, reflection or status immunity. Equipment-independent defensive stance. |
| Driving strike | Common | 12 | Melee attack for 1.10W and 15-unit push. Reach follows the weapon. 0.20-second windup; dodgeable and interruptible. |
| Charge | Uncommon | 22 | Move up to 90 units toward a reachable foe. If the collision connects, deal 0.65W and cancel the foe's weapon attack with 0.15-second stagger. With an equipped shield, call/display this Shield rush and push 20 units; no extra damage. Cannot cross pillars. |
| Parry | Uncommon | 18 | A 0.65-second window cancels one frontal ordinary physical melee hit, then attempts a 0.55W riposte if in range. No projectile/spell protection and no guaranteed counter hit. Requires suitable melee equipment. |
| Cleave | Uncommon | 20 | Broad melee swing, 1.25W damage, 0.30-second windup, 0.35-second recovery. Existing reach; the wider arc makes tracking more forgiving. Remains one hit per target. |
| Aimed shot | Uncommon | 18 | Physical ranged shot for 1.25W after a 0.35-second aim. Uses existing projectile speed and defenses; leading improves, but accuracy does not become guaranteed. Requires a physical ranged weapon. |
| Second wind | Rare | 25 | Recover 10% maximum health over 3 seconds. Once per fight, usable below 45% health. No cleansing; healing penalties apply. |
| Crippling strike | Rare | 20 | A physical melee strike or ranged shot for 0.90W, applying 30% movement reduction for 2 seconds on connection. Uses equipped reach and normal defenses; no attack-cadence penalty or stun. |
| Last stand | Legendary | 30 | Once per fight below 30% health: 35% less incoming hit damage and +20% weapon damage for 4 seconds. No resurrection or healing. Same-effect refresh is prohibited; combine reductions multiplicatively. |
| Perfect counter | Legendary | 30 | Once per fight: a 0.80-second stance can negate one frontal ordinary physical weapon hit, then readies one 1.35W counterattack with the equipped weapon. Counter must be released within 1.5 seconds, obeys range/defenses, and is not guaranteed. No protection against spells, zones or rear attacks. |

These techniques are not an additional third ability bar. They occupy one of the two existing slots.

Having at least two techniques in each rarity group limits second-slot fallback after duplicate exclusion. Some weapon/subclass combinations may still have sparse groups; report those fallbacks rather than silently inflating Legendary frequency.

| Nature spell | Rarity | Mana | Suggested effect and limits |
|---|---|---:|---|
| Thorn bolt | Common | 9 | Dodgeable projectile: 0.35P damage and a 1.5-second wound at 0.04P per second. Wound uses the existing bleed rules and cleanse. |
| Entangling roots | Uncommon | 12 | Dodgeable projectile: 0.25P damage, then 1.2 seconds rooted. Root prevents movement/dashes but allows attacks and spells; Flight prevents rooting. A blocked hit prevents the root. |
| Bramble patch | Uncommon | 12 | Visible radius-45 patch for 3 seconds. Opponent inside moves 25% slower and takes 0.04P every 0.5 seconds. No pull. Flight ignores the movement penalty. |
| Seedburst | Rare | 15 | A visible radius-40 marker at the opponent's current position detonates after 0.70 seconds for 0.80P. Moving outside avoids it; wards/Future sight can block it. No unavoidable attached control. |

Nature healing uses the existing Regeneration, Healing touch and Life creation. Nature summoning uses Beast command initially. A targetable treant or new totem is deferred until the future multi-character/targeting design, so this release does not quietly become a team-combat rewrite.

Guard and Last stand do not stack with another instance of themselves. Parry prevents the connected ordinary hit and its weapon payload; a successful riposte resolves independently through normal defenses. Exact stacking and interruption cases belong in the implementation acceptance checks.

## 5. Equipment definitions

Replace name-pattern-only classification with explicit catalog profiles for known weapons. Retain a documented fallback for custom weapons.

Preserve v11 attack profiles and numeric values initially, including Rune blade and Arcane gauntlets as melee, Spirit bow as physical ranged, and Chain blade as melee. Their generation affinity can still be magical or hybrid. Class preference and attack type are separate concepts.

Adding elemental weapon enchantments, ammunition types or a fully separate profile for each sword is later content. This avoids changing the entire weapon balance at the same time as class generation.

## 6. Sample generated builds

Examples show coherent possibilities; neither two abilities nor these exact combinations are guaranteed.

| Fighter | Weapon | Slot 1 | Slot 2 | Intended behavior |
|---|---|---|---|---|
| Warrior / Guardian | Shield | Charge | Guard | Close distance and defend against incoming physical hits |
| Warrior / Duelist | Rapier | Parry | Driving strike | Counter a committed attack, then maintain close pressure |
| Druid / Wildkeeper | Quarterstaff | Entangling roots | Beast command | Restrict movement and let the beast create pressure |
| Druid / Moonshifter | Claws | Shapeshifting | Regeneration | Chase in beast form and recover between exchanges |
| Mage / Arcanist | Crystal orb | Crystal shaping | Energy absorption | Projectile offense and threat-aware magical defense |
| Mage / Elementalist | Staff | Water control | Storm calling | Create wetness, then exploit it with lightning |
| Ranger / Beastmaster | Longbow | Aimed shot | Beast command | Keep distance while a companion pressures the opponent |
| Paladin / Lightbringer | Blessed mace | Charge | Healing touch | Close into melee and recover with holy support |
| Rogue / Assassin | Poisoned daggers | Parry | Invisibility | Evasive close combat, poison and concealment |

## 7. Persistence and interface

Plan a new combat version and generation version, provisionally combat v12 / generation v3. Freeze v11 and preserve prior replay routing. Final identifiers depend on the releases that exist when work starts.

- Existing generated fighters retain their traits, stats and ability assignments. No silent rerolls.
- Record generator version, class-profile version and stable ability IDs on new fighters/snapshots.
- New class generation applies to freshly created rosters and recruits generated under the new version. Record both generated and custom-origin builds.
- Played seasons/cups keep their pinned engine. Admit techniques into a world only once its active competitions can use the new engine; do not create recruits an old engine cannot run.
- Old backups remain importable. Old and new spell-only fighters remain replayable. Custom edited pools remain authoritative; apply metadata when known, with neutral fallbacks for unknown entries.
- Rename Power / Second power to Ability / Second ability in the new UI, with Spell or Technique shown on each.
- Show mana or stamina cost, rarity, effect, cooldown and affinity such as Class specialty, Related or Unusual gift. Keep developer version labels out of the main product flow.
- Make manual wheel, bulk generation, league recruits, server and Pages use the same generation rules.

## 8. Build sequence

1. **Catalog and generation foundation:** stable ability kinds/tags, explicit weapon profiles, class/subclass maps, neutral custom fallbacks, reproducible generation previews. Keep live v11 behavior untouched until the new release is complete.
2. **Technique engine:** resources, shared action timing, equipment restrictions, counterplay, copying boundary and version-pinned replays.
3. **Starter content and nature:** ten techniques and four spells, with useful AI selection for every ability. Implement sample profiles, then finish all existing class/subclass assignments before release.
4. **Interface and saves:** ability explanations, wheel odds, generated snapshots, backups, season transitions and recruit integration.
5. **Evaluation and release:** review generation distributions, run combat comparisons and fresh multi-season worlds, document limits, then prepare a reviewable patch.

## 9. Acceptance targets

These are review thresholds, not claims that the feature is balanced in advance.

- Every known class/subclass has a usable profile; no incompatible equipped technique is generated.
- Themed ability and weapon proportions track the specified buckets wherever those buckets exist. Report every fallback rate rather than counting fallback results as proof of the desired odds.
- Wheel-rarity frequencies stay unchanged; spell availability stays on the existing Magic curve, techniques follow the declared mastery table.
- Matched seed/control generation shows no unexplained increase greater than 2 percentage points in A+, S+ or SS shares. Class preference can alter totals through existing stat contributions, so compare distributions rather than assuming preservation.
- Equal-total style comparisons use the v11 45–60% score target as a first screen. Class-family strength is measured after controlling for rarity, stats, equipment and sample size; small subclasses do not receive automatic buffs based on noisy league rankings.
- Validate resource starvation, guarded/parried payloads, immunity and suppression boundaries, interruption, old replays, saved fixtures, worker/direct parity and idempotent retries.
- Run a generation-only sample for every class, then at least three fresh worlds × 40 seasons before proposing release. Summarize promotion, retirement, draw and family representation outcomes alongside win rates.
- All existing v11 replay/archive evidence remains intact. Source backups are read-only.

## Proposed first-release boundary

Two mixed ability slots; class/subclass-aware weapons and abilities; the current 50 spells plus ten techniques and four nature spells; explicit known-weapon metadata; readable generation explanations; preserved historical fighters and replays. Additional class-specific mechanics, targetable new summons, team auras and multi-fighter battles follow after this foundation.

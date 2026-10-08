# Rolled support and control abilities

Support abilities belong to the same two slots as every other fighter ability. There is no extra team kit. Newly generated fighters can roll these options in either slot, using the existing rarity odds, class affinities, magic training and weapon compatibility rules. An ability cannot appear twice on one fighter.

| Ability | Type | Rarity | Resource | Cooldown | Effect |
|---|---|---|---|---|---|
| Mending wave | Spell | Uncommon | 14 mana | 9s | Allies within 110 units recover 75% spell strength. |
| Chain heal | Spell | Rare | 16 mana | 10s | Up to three injured allies recover 80%, 65%, then 50% spell strength; each bounce reaches 120 units. |
| Resurrection | Spell | Legendary | 25 mana | 60s | A 3s interruptible channel revives an ally at 40% health. Once per caster and recipient per game, including Core siege respawns. |
| Cleanse | Spell | Uncommon | 12 mana | 10s | Removes harmful effects from an ally and gives 2.5s control immunity. |
| Barrier | Spell | Uncommon | 18 mana | 12s | Nearby allies receive a one-hit ward lasting 4s. |
| Stun bolt | Spell | Uncommon | 14 mana | 11s | A projectile deals 25% spell strength and stuns for 1.2s. |
| Hamstring | Melee technique | Common | 10 stamina | 9s | Slows a nearby enemy for 4s. |
| Disarm shot | Ranged technique | Uncommon | 14 stamina | 12s | A projectile deals 25% weapon damage and disarms for 2.4s. |
| Taunt shout | Technique | Uncommon | 12 stamina | 12s | Forces nearby enemies to target the caster for 2s. |
| Knock-up | Melee technique | Rare | 14 stamina | 11s | Interrupts nearby enemies for 0.6s. |

These are base values. Existing role scaling, control resistance, overtime and save-specific ability modifiers still apply. All moves share the normal casting action and cooldown, require legal targets, and respect cover. Area healers approach wounded teammates when their spell is ready and their rear formation slot is out of range. Techniques use stamina and retain a 12-stamina reserve; weapon techniques cannot execute while disarmed. Spells require mana and respect casting weaknesses and suppression.

## Healer kits in team generation

Without help, Resurrection (Legendary) almost never rolled: none of 320 generated fighters had it. Team generation (`roleFighter`) now gives about 60% of healers a team healing spell in their **second** slot: Mending wave 3, Chain heal 3, Resurrection 2.5, Cleanse 1 or Barrier 1, by weight. Their first slot still rolls a sustained heal (Healing touch, Life creation or Regeneration), so the kit adds to their healing rather than replacing it. In a 40-game 5v5 sample, kitted healers healed 632 per game against 536 for the rest. This applies to exhibitions, new league pools and rookie classes; fighters already in a league keep their rolls.

## Existing saves and replays

Existing fighters keep both rolled abilities, their original stats and career progress. Their extra kit is removed from active play. A historical copy is retained only for old replays. Contracts keep their current price until the normal offseason update. A watched series already in progress finishes under its original rules before conversion. Migration is saved with the next normal league command.

Generation 4 uses the expanded catalog. Older generations retain their original ability meanings, including custom abilities whose names happen to match a new option. New fights use duel 13, team 2.4 or Core siege 3.1; previous engines remain available for saved replays. Existing solo seasons adopt the new duel rules at rollover. Old pinned cups cannot accept new support abilities.

## Rating correction

The previous linear OVR scale assigned 99 to every raw prediction of 0.75 or higher. Even without kits, six of thirty sampled damage recruits reached that ceiling. Current ratings ignore extra-kit features and use:

`OVR = round(40 + 59 / (1 + exp(-5 * (raw - 0.5))))`

Existing career gains and losses are added after recalibration. This changes the rating display and future contract pricing; it does not change rolled stats or directly multiply combat damage.

A deterministic fresh sample of 160 A/S fighters had 57 fighters with at least one new support/control roll and no 99 ratings. Damage ratings ranged from 61 to 88, averaging 76.9. This is a calibration smoke check, not a substitute for a long season balance audit.

## Validation

`scripts/check-rolled-support.mjs` checks every option in both slots, duplicate and equipment exclusion, actual effect delivery, resources, cooldowns, interruptions, area-healer positioning, Core siege resurrection limits, legacy replay meanings, existing-roster conversion and API persistence. Twelve baseline duel fixtures produce identical results to frozen v12 when no new ability is equipped. Team seasons, series, offseason, automatic balance, objectives, Pages saves and trait details have additional regression checks.

The coach/fighter AI roadmap remains a separate future change in `AI-IMPROVEMENT-PLAN.md`.

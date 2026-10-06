# Team battles (3v3 and 5v5)

Team battles put every fighter on the field at once. This is Phase 1 of the team-league roadmap. It contains the team combat engine and the **3v3** and **5v5** exhibition screens in the Arena rail. Later phases add the generated team pool, AI coaches and the draft (Phase 2), the NFL-style season and playoffs (Phase 3), and the offseason and coach mode (Phase 4).

## Engine

`public/combat-team.js` exports `TeamBattle`, `simulateTeam` and `TEAM_ENGINE_VERSION = 'team-1'`.

- **Same fighter rules as duels.** `TeamBattle` extends the combat 12 duel engine, so stats, weapons, damage, armor, weaknesses and every ability effect behave exactly as in duels. Combat 12 is frozen by `validation/v12-engine-lock.json` and checked by `scripts/check-engine-lock-v12.mjs`. Duel results cannot change.
- **What is new.** Each fighter's `side` is its unique index, because combat 12 stores projectile, zone and summon owners as fighter indexes. A separate `team` field decides friend or foe. Only the two-fighter core is re-implemented:
  - the step loop
  - environment upkeep
  - zone, summon, mirror and lightning targeting
  - projectile hits
  - threat checks
  - ally-targeted support
  - the win check
- **Determinism.** One seeded RNG is used, and fighters always act in index order. Watched and headless runs give identical results.
- **Starting positions.** Teams spawn in formation, mirrored on each side: tanks in front, then damage, then controllers, with healers at the back.

### Roles
`public/team-roles.js` derives one role per fighter from four things: class and subclass identity tags, the fighter's abilities, its weapon, and closed-form combat numbers (effective HP and DPS).

| Role | Behaviour | Team-only rule |
|---|---|---|
| ⛨ Tank | Peels attackers off its carries | **Fortified:** takes 35% less damage. **Provoke:** enemies within 110 units strongly prefer the tank. **Bulwark:** absorbs 25% of the damage dealt to allies within 80 units. |
| ✚ Healer | Holds a point behind the frontline, near whoever is hurt, and backs away from attackers | Healing touch, Regeneration, Force fields and Spirit armor can target teammates (240-unit range). Life creation is placed where injured allies cluster. |
| ◎ Controller | Locks down the enemy threatening its carries | Its spell hits make the target **Exposed** for 3 s: +15% damage from the controller's teammates. |
| ✦ Damage | Focuses reachable, wounded, high-value targets (healers first) | — |

### Rules that apply to everyone
- **Target choice.** Fighters re-pick their target every 0.35 s based on:
  - distance
  - the target's wounds
  - role priority
  - Provoke
  - threats to their own carries
  - sticking with the current target
- **Tactics.** Each team can use one of five tactics, which shift those weights: `balanced`, `protect-carry`, `focus-healer`, `aggressive`, `defensive`.
- **No friendly fire.** Projectiles pass through allies. Fire, lava, bramble, seedburst, gravity and singularity zones only affect enemies. Life and shadow zones help allies.
- **Hard-control diminishing returns.** After a sleep, root, memory lock or suppression ends, the fighter shrugs off new hard control for 2.5 s.
- **Overtime.** From 75 s, healing is halved and damage rises 20%.
- **Winning.** A team loses when all its fighters are down. At 120 s, the winner is decided by team health %, then team damage, then a seeded coin toss.

### Result
```js
{mode:'team', size, seed, teams:[[ids],[ids]], winnerTeam, seconds, reason, hp:[team%, team%],
 combatVersion:'team-1', tactics, environment,
 fighters:[{id, team, role, hp, damage, healing, kills, deaths, ccSeconds}]}
```

## Generation
- `public/tier-generation.js` is a shared, parameterised version of the server's tier-targeted roller.
  - `forceClass` pins the class wheel.
  - `untiltedAbilities` keeps abilities and weakness on their natural odds.
- `public/team-generation.js` builds role-targeted fighters.
  - It forces a class from the role's class list first. Plain S-tier rolls almost never produce tanks or healers.
  - It accepts a fighter only when its derived role matches. For example, a healer must actually roll healing magic.
  - Tiers are roughly 70% A, 28% S and 2% SS.
- Random exhibition teams are generated in the browser and never saved to the roster.

## Balance (validation/team-combat.json)
These results come from `node scripts/evaluate-team-combat.mjs 40`. Each matchup is 40 seeded games with alternating sides.

| Matchup | Win rate (first team) | Time limit |
|---|---:|---:|
| Tank + healer + damage vs 3 damage | 72.5% | 2.5% |
| Tank + 2 damage vs 3 damage | 50% | 0% |
| Healer + 2 damage vs 3 damage | 62.5% | 2.5% |
| Tank + controller + damage vs 3 damage | 57.5% | 5% |
| Balanced 3v3 mirror | 50% | 12.5% |
| Balanced 5v5 vs 5 damage | 65% | 0% |
| Balanced 5v5 mirror | 52.5% | 2.5% |

Every support role adds value, and mixed teams beat pure damage. `scripts/check-team-combat.mjs` enforces three things:
- every matchup's time-limit rate stays under 25%;
- balanced teams win at least 50% against pure damage;
- an average 5v5 battle runs in under 750 ms in node.

Measured runtimes are about 40–330 ms per battle, so whole seasons are practical to simulate.

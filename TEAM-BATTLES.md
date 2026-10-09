# Team battles (2v2, 3v3 and 5v5)

Team battles put every fighter on the field at once. This is Phase 1 of the team-league roadmap. It contains the team combat engine and the **3v3** and **5v5** exhibition screens in the Arena rail. Later phases add the generated team pool, AI coaches and the draft (Phase 2), the NFL-style season and playoffs (Phase 3), and the offseason and coach mode (Phase 4). **Team engine 2** (below) adds formation AI, a wide field with terrain maps, and ranged-first damage dealers.

## Current ability rules

Fighters have two rolled ability slots. Support and control moves are part of those rolls, with class affinities and equipment restrictions. Current engines are duel 13, team 2.5 and Core siege 3.2. Existing extra kits are removed without changing rolled traits; older replays retain their recorded engine and kit. See [ROLLED-SUPPORT-ABILITIES.md](ROLLED-SUPPORT-ABILITIES.md) for the correction and migration details.

Save-specific Monte Carlo audits can tune individual ability cooldowns and effective stats, with up to 10% preseason adjustments. Patch history folds by season, and new championships preserve their winning roster. See [TARGETED-BALANCE.md](TARGETED-BALANCE.md).

The sections below record how the team systems were introduced; references to extra kits describe the earlier implementation.

## Engine

`public/combat-team.js` exports `TeamBattle`, `simulateTeam`, `TEAM_POSTURES` and `TEAM_ENGINE_VERSION = 'team-2'`.

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
- **Starting positions.** Teams spawn in formation on their own third of the 960×600 field, mirrored: tanks in front, then damage, then controllers, with healers at the back.

### Roles
`public/team-roles.js` derives one role per fighter from four things: class and subclass identity tags, the fighter's abilities, its weapon, and closed-form combat numbers (effective HP and DPS).

| Role | Behaviour | Team-only rule |
|---|---|---|
| ⛨ Tank | Peels attackers off its carries | **Fortified:** takes 35% less damage. **Provoke:** enemies within 110 units strongly prefer the tank. **Bulwark:** absorbs 25% of the damage dealt to allies within 80 units. |
| ✚ Healer | Holds its formation slot behind the tanks, moves towards whoever is hurt, and backs away from attackers | Healing touch, Regeneration, Force fields and Spirit armor can target teammates (240-unit range). Life creation is placed where injured allies cluster. |
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
  - the team's called focus target, enemies inside their own back line, whether the target can be reached from the fighter's formation slot, and line of sight (engine 2)
- **Tactics.** Each team can use one of five tactics, which shift those weights and set the team's formation posture (see Team engine 2): `balanced`, `protect-carry`, `focus-healer`, `aggressive`, `defensive`.
- **No friendly fire.** Projectiles pass through allies. Fire, lava, bramble, seedburst, gravity and singularity zones only affect enemies. Life and shadow zones help allies.
- **Hard-control diminishing returns.** After a sleep, root, memory lock or suppression ends, the fighter shrugs off new hard control for 2.5 s.
- **Overtime.** From 75 s, healing is halved and damage rises 20%.
- **Winning.** A team loses when all its fighters are down. At 120 s, the winner is decided by team health %, then team damage, then a seeded coin toss.

### Result
```js
{mode:'team', size, seed, teams:[[ids],[ids]], winnerTeam, seconds, reason, hp:[team%, team%],
 combatVersion:'team-2', tactics, environment:{time, weather, ground, map},
 fighters:[{id, team, role, hp, damage, healing, kills, deaths, ccSeconds}]}
```

## Generation
- `public/tier-generation.js` is a shared, parameterised version of the server's tier-targeted roller.
  - `forceClass` pins the class wheel.
  - `untiltedAbilities` keeps abilities and weakness on their natural odds.
- `public/team-generation.js` builds role-targeted fighters.
  - It forces a class from the role's class list first. Plain S-tier rolls almost never produce tanks or healers.
  - It accepts a fighter only when its derived role matches. For example, a healer must actually roll healing magic.
  - Damage dealers follow `DAMAGE_PLAN` (engine 2): about 60% rangers with a forced bow or gun (Ranger, Sniper, Hunter, Bounty Hunter), 30% casters with an arcane weapon (Mage, Sorcerer, Elementalist, Warlock) and 10% melee (Assassin, Rogue, Samurai, Berserker). Melee damage dealers must roll a mobility move on their first power: Charge, Teleportation, Portal creation or Space folding.
  - Tanks always fight in melee: they are generated with a melee weapon, and `teamRole` never makes a fighter with a bow, gun or spell focus a tank. Tanks can still be health walls, regeneration monsters or life-stealing bruisers.
  - `rollTier` gained two options for this: `forceWeaponType` keeps only weapons of one type, and `requirePower` keeps only the listed abilities on the first power wheel.
  - Tiers are roughly 70% A, 28% S and 2% SS.
- Random exhibition teams are generated in the browser and never saved to the roster.

## Balance (engine 1)
These were engine 1's results (`node scripts/evaluate-team-combat.mjs 40`, 40 seeded games per matchup with alternating sides). Engine 2's numbers are in the Team engine 2 section below.

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

# Team engine 2: formations, a wide field and maps

Engine 1 let every fighter pick a target and circle it with the duel engine's wide strafe, so teams scattered across the arena and fights broke into 2v1s. Engine 2 (`TEAM_ENGINE_VERSION = 'team-2'`) makes each team fight as a unit. Every match from now on uses it; results already recorded under `team-1` stay as they are.

## The field and maps (`public/team-maps.js`)
- **Field.** Team battles play on a 960×600 field (duels keep their 600×600 square). Teams spawn on their own third. Combat 12 clamps positions to its square inside several inherited methods, so `TeamBattle` re-implements those pieces with field bounds: movement (Charge travel, the environment pre-steps and contact steering), `push`, knockback, teleport destinations, and the earth, illusion and portal placements. The locked combat 12 files are untouched (`check-engine-lock-v12`).
- **Maps.** `'random'` picks a map from the battle seed with its own salt, so time, weather and ground rolls are unchanged. The map is stored in the result's `environment.map`, and league games are rejected without a valid one.

  | Map | Weight | Terrain |
  | --- | --- | --- |
  | Open field (`open`) | 40% | none |
  | Pillar hall (`pillars`) | 15% | four to six large pillars |
  | Broken ruins (`ruins`) | 15% | two walls with a central lane, plus centre stones |
  | Crossroads (`crossroads`) | 15% | a central rock and flank rocks |
  | Stone groves (`groves`) | 15% | scattered small rocks |

- **Terrain rules.** Terrain pieces are circles (the engine's obstacle shape; walls are chains of touching circles). Every map is mirrored across the centre line, has a seeded jitter, keeps out of both spawn zones, and never leaves a gap between pieces narrow enough to wedge a fighter (under 40 units). Terrain blocks movement and projectiles; flying fighters pass over it.
- **Line of sight.** Ranged and arcane fighters do not start an attack, and nobody casts an enemy-directed power, without a clear line to the target. Ally support needs a clear line to the ally. Target choice penalises enemies out of sight, and fighters without a line walk around the obstacle.
- **Walking around terrain.** A look-ahead steers fighters past rocks, and a blocked fighter takes a waypoint around the obstacle. Along a wall the waypoint follows the chain to its end, on whichever side is shorter. After every step, anyone pushed into terrain (knockback, pulls, swaps) is settled back outside it.

## Formations
Twice a second each team makes a plan:
- **Axes.** A facing axis towards the enemy (smoothed so it does not jitter) and a lateral axis.
- **Front.** The tanks' centre. A team without tanks uses a point just ahead of the group, so it keeps advancing. A lone survivor fights freely.
- **Slots.** Tanks on the front (spread sideways); ranged and arcane damage dealers about 95 units behind them; controllers about 100 behind; healers about 145 behind; melee damage dealers (skirmishers) on a flank. 5v5 spreads 20% wider.
- **Called target.** One enemy the team focuses: wounded, valuable (healers first), close to the front, preferably exposed (no enemy tank within 110), and with a bonus for anyone inside our back line.
- **Back-line threats.** Enemies within 130 of our healers, controllers or ranged dealers. Tanks and controllers peel for them first.

Movement blends each fighter's fighting moves (approach, kite, attack) with a pull towards its slot that grows with distance. Strafing is cut to 0.14–0.3 of the fighter's speed while in formation; the duel engine's 0.62–0.82 orbit was what scattered engine-1 teams. A leash stops anyone running too far forward: tanks stay within the posture's leash of their back line, and everyone else may get no more than 50 units ahead of their slot's depth behind the front. Healers hold their slot and move towards a hurt ally when one is out of reach.

**Skirmishers** (melee damage dealers) wait on a flank. When the posture allows, they dive onto an exposed back-liner, or whenever their mobility move is ready and a target is within 300. They prefer their Charge, Teleportation, Portal or Space folding on the way in, and fall back to the slot after about 3.5 s or below 45% health, resting 4 s before the next dive.

## Postures (tactics)
| Tactic | Leash | Slot pull | Strafe | Dives | Notes |
| --- | --- | --- | --- | --- | --- |
| Hold the line (`defensive`) | 90 | 1.5 | 0.14 | never | holds its own half for up to 12 s until the enemy engages; strong peel |
| Protect the carry (`protect-carry`) | 100 | 1.25 | 0.16 | never | strongest peel for teammates under attack |
| Balanced (`balanced`) | 130 | 1 | 0.2 | onto exposed targets, or with mobility | the default |
| Focus their healer (`focus-healer`) | 140 | 0.9 | 0.2 | flanks towards healers | the team calls enemy healers |
| All-out aggression (`aggressive`) | 210 | 0.6 | 0.3 | always | the riskiest: fast push, back line left thinner |

AI coaches play their personality's tactic (see phase 4). Coach mode lets you pick any of them.

## Measured (validation/team-combat.json)
`node scripts/evaluate-team-combat.mjs 40` measures formation metrics every 0.25 s while a fighter is engaged (an enemy within 200 units): **isolated** means no ally within 150; **outnumbered** means more enemies than allies nearby; **spread** is the mean distance from the team centre; **healer cover** is the share of time a healer is within support range of a living tank.

| Balanced mirror | Isolated | Outnumbered | Spread | Healer cover |
| --- | ---: | ---: | ---: | ---: |
| 3v3, engine 1 | 33.7% | 17.7% | 93 | 91.8% |
| 3v3, engine 2 | 15.8% | 10.3% | 60 | 98.4% |
| 5v5, engine 1 | 26.8% | 23.9% | 116 | 81.8% |
| 5v5, engine 2 | 7.4% | 13.8% | 63 | 98.4% |

Isolated fighting is less than half what it was, 2v1s are rarer, and healers almost always cover their tanks.

Re-measured after melee-only tanks, the 2v2 format and a tighter tank leash (tanks stay within their posture's leash + 20 of their back line).

| Balanced mirror | Isolated | Outnumbered | Spread | Healer cover |
| --- | ---: | ---: | ---: | ---: |
| 3v3, engine 2 now | 13.8% | 9.7% | 57 | 99.8% |
| 5v5, engine 2 now | 6.7% | 12.2% | 65 | 99.3% |

| Matchup (40 games, alternating sides) | Win rate (first team) | Time limit | Average length |
| --- | ---: | ---: | ---: |
| 2v2 tank + damage vs 2 damage | 57.5% | 5% | 57 s |
| 2v2 healer + damage vs 2 damage | 62.5% | 5% | 59 s |
| 2v2 mirror (tank + damage) | 45% | 5% | 59 s |
| Tank + healer + damage vs 3 damage | 82.5% | 0% | 64 s |
| Tank + 2 damage vs 3 damage | 65% | 0% | 56 s |
| Healer + 2 damage vs 3 damage | 77.5% | 0% | 60 s |
| Tank + controller + damage vs 3 damage | 65% | 0% | 54 s |
| Balanced 3v3 mirror | 60% | 12.5% | 77 s |
| Balanced 5v5 vs 5 damage | 80% | 2.5% | 56 s |
| Balanced 5v5 mirror | 55% | 2.5% | 59 s |

Each tactic against a balanced team (24 games each):

| Tactic | 2v2 win | 3v3 win | 3v3 spread | 5v5 win | 5v5 spread |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hold the line | 25% | 54.2% | 53 | 58.3% | 62 |
| Protect the carry | 41.7% | 33.3% | 53 | 62.5% | 59 |
| Balanced | 37.5% | 58.3% | 56 | 62.5% | 66 |
| Focus their healer | 37.5% | 50% | 60 | 45.8% | 65 |
| All-out aggression | 45.8% | 62.5% | 60 | 66.7% | 65 |

No tactic dominates in 3v3 or 5v5. In 2v2 the cautious postures are weak (Hold the line wins 25%): with only two fighters, waiting simply gives the other side the first hit. Hold the line keeps the tightest shape. Every map stays under 21% time limits (Crossroads is the slowest at 86 s on average), and battles run in about 40–500 ms in node.

`scripts/check-team-combat.mjs` enforces:
- the damage generation mix;
- mirrored, seeded, wedge-free maps;
- audited battles on every map (nobody leaves the field, stands inside terrain or shoots through it);
- half the engine-1 isolation and fewer 2v1s for both balanced mirrors;
- healer cover of at least 80%;
- Hold the line tighter than All-out aggression;
- time limits under 25% everywhere;
- 5v5 battles under 750 ms.

# Team leagues: phase 2 (pool, ratings, coaches, draft)

Each format (3v3 and 5v5) has one franchise league per player. You create it from the **League** tab of the 3v3 or 5v5 screen.

## Founding a league
- **Size.** Choose 8, 16 or 32 teams.
  - 32 teams: the **Sunward** and **Shadeward** conferences, each with four divisions (**Frostmark**, **Emberreach**, **Dawnvale**, **Duskhold**) of four teams.
  - 16 teams: two divisions per conference.
  - 8 teams: one division per conference.
- **Teams and coaches.** Every team gets a themed name and an AI head coach with a seeded personality:

| Personality | Drafting style |
|---|---|
| Bargain hunter | Values rating per salary |
| Star chaser | Pays up for the highest ratings |
| Glass cannon | Favours damage and control |
| Fortress builder | Favours tanks and healers |
| Tactician | Favours controllers and healers |
| Balanced | Fills role needs first |

- **Fighter pool.** The league scouts a fresh pool sized at 1.5× the roster slots:
  - 3v3 rosters hold 5 fighters, so 8/16/32 teams get 60/120/240 fighters.
  - 5v5 rosters hold 8 fighters, so 8/16/32 teams get 96/192/384 fighters.
  - Each pool slot has a seeded role and tier: about 70% A, 28% S and 2% SS.
- **Generation and validation.**
  - The browser generates the pool (`team-generation.js` `poolFighter`) in small chunks so the page stays responsive.
  - The server re-validates every fighter against the canonical wheel pools (`validateSnapshot`) and checks its tier against the seeded pool plan.
  - Ratings, salaries, coaches and draft picks are always computed by the shared rules (`public/team-league.js`). The client never submits them.

## Ratings and salaries
- **OVR (40–99)** is a closed-form rating built from:
  - effective HP and damage per second (the same square-root scaling as combat);
  - spell power and ability rarity;
  - speed and IQ;
  - a small per-role term.
- **Calibration.** The weights are fitted by ridge regression to each fighter's measured win share in 2,560 seeded 3v3 battles: 160 fighters × 16 games (`scripts/evaluate-team-values.mjs`, `validation/team-values.json`).
  - Recalibrated on team engine 2: fighters in the top predicted quarter win 62.7% of their battles, against 43% for the bottom quarter (R² 0.16 with 16 games each; engine 1 gave 67.3% vs 40.6%, R² 0.27). Formation play makes results depend more on the team and less on any one fighter's numbers.
  - Durability (effective HP) and speed matter most, then spell power and IQ. Healers rate highest and damage dealers next, matching their measured team impact. Raw damage per second adds nothing once the rest is known: in formation, a ranged dealer's output depends on staying alive behind the front.
  - A 384-fighter pool spreads from OVR 47 to 95 (median 74). Fighters already in a league keep their stored OVR; offseasons move it with performance.
- **Salary** (millions of crowns) rises steeply with OVR: `0.8 + 13.2 × ((OVR − 50) / 49)^2.3`, capped at 14M. Stars cost several times an average starter.
- **Salary cap.** Every team gets the same cap: the average salary of the fighters who will be drafted, multiplied by roster size. An average team can afford an average roster, but nobody can stack stars.

## The draft
- **Order.** Season 1 uses a seeded random order as a snake draft: round two reverses round one.
- **How a coach picks.** On the clock, a coach scores every affordable fighter by OVR, salary relative to the average roster slot, role need and its personality, plus a small seeded tiebreak. A pick must leave enough cap to fill the remaining slots with the cheapest fighters still available. When open slots equal unmet role needs, only needed roles are considered.
- **Cap reserve.** The reserve is role-aware: a pick must leave room for the cheapest fighter of each still-unmet role plus the cheapest fighters for the other open slots, with a 15% margin because rivals may draft those fighters first.
- **Minimum-contract exception.** If, despite the margin, nothing eligible fits, the coach signs the cheapest eligible fighter past the cap and the pick is marked as an exception. In 20 seeded test leagues this happened once, for 0.1M.
- **Guarantees.** Every roster ends complete, covering its format's needs, and under the cap apart from exceptions:
  - 3v3: tank, healer, two damage.
  - 5v5: two tanks, two healers, a controller, three damage.
- **Starting lineups** fill the format's role slots with the best rated fighters.
- **Free agents.** Undrafted fighters stay in the league as free agents for the offseason (phase 4).
- **Pacing.** The server runs picks one at a time, by round or all at once. Each command is deterministic, revision-checked and retry-safe, using the same operation receipts as the 1v1 league.
- **Scrimmages.** After the draft, any two teams' starters can scrimmage on the arena canvas.

## Storage
- Migration `0013_team_leagues` adds two tables:
  - `team_worlds`: one row per owner per format.
  - `team_operations`: retry receipts.
- Worlds are gzip-encoded (a 384-fighter 5v5 world is about 270 KB raw).
- Browser backups include both tables.

# Team leagues: phase 3 (season and playoffs)

After the draft, **Start season** builds the schedule, which is fixed by the world seed and the season number.

## Schedule
Every week pairs each team exactly once, so there are no byes.

| League | Weeks | Opponents |
|---|---:|---|
| 32 teams | 17 | Division rivals twice (6). A same-conference division, rotating each season (4). A cross-conference division, rotating (4). Same-place teams from the other two divisions in the conference (2). One more cross-conference same-place game (1). |
| 16 teams | 14 | Division rivals twice (6). The other division in the conference (4). A rotating cross-conference division (4). |
| 8 teams | 10 | Division rivals twice (6). The other conference's division (4). |

Regular-season games are Bo1 team battles under random conditions.

## Standings
- Ranked by win percentage.
- Tied teams are separated in order by:
  1. head-to-head record within the tied group;
  2. division record;
  3. conference record;
  4. HP margin (team health % difference summed over games);
  5. a seeded coin.
- The table also shows each team's streak.

## Playoffs
| League | Seeds per conference | Rounds |
|---|---:|---|
| 32 teams | 7 (four division winners as seeds 1–4, then three wildcards) | Wildcard round (2 v 7, 3 v 6, 4 v 5, with seed 1 on a bye), divisional round, conference final, Forgefire Crown |
| 16 teams | 4 (two division winners, then two wildcards) | Conference semifinal (1 v 4, 2 v 3), conference final, Forgefire Crown |
| 8 teams | 2 | Conference final, Forgefire Crown |

- **Re-seeding:** after each round, the best remaining seed in a conference hosts the lowest remaining seed.
- **Series length:** playoff series are Bo3, and the Forgefire Crown is Bo5. The better regular-season record gets the higher position.
- **Awards:** the season ends with a champion, a runner-up and an MVP. The MVP is the fighter with the highest season impact: damage + 1.1 × healing + 120 per KO + 30 per second of hard control.
- **Stat leaders:** impact, damage, healing and KOs.

## Simulation and saving
- **Simulation runs in the browser.** Matches run on worker threads (`team-sim-worker.js` through `simulation-client.js`). The client can sim one game, a week, the rest of the regular season, a playoff round or the remaining playoffs. "Watch next game/series" plays it on the arena canvas instead, with identical results thanks to deterministic seeds.
- **The server checks every result.** Each match must be the exact next match in schedule order (playoff series may arrive in any order within a round). Each game must be a complete, valid team-engine result:
  - the current team engine (`team-2`; results recorded under `team-1` stay as they are);
  - a winner of 0 or 1;
  - seconds within the 120 s limit;
  - health values from 0 to 100;
  - a valid environment, including the map;
  - fighters exactly matching both lineups, with non-negative stats.
  - The series score must reach exactly the required wins.
- **What the server stores:** the server applies standings, seeding, brackets and awards itself. Regular-season results are stored compactly, alongside per-fighter season stats.
- **Size and speed:** a complete 32-team season is about 250 KB raw. In the browser, a 32-team 5v5 season simulates in about 30 s and its playoffs in about 4 s; an 8-team 3v3 season takes about 7 s.
- **After the final:** the season ends at **Season complete**, and **Begin offseason** starts phase 4.

# Team leagues: 2v2 and free compositions

## 2v2
2v2 joins 3v3 and 5v5, with its own rail tab, exhibitions and leagues:

| Format | Starters | Roster | Rookies per team |
| --- | ---: | ---: | ---: |
| 2v2 | 2 | 4 | 1 |
| 3v3 | 3 | 5 | 2 |
| 5v5 | 5 | 8 | 3 |

## No forced compositions
Teams no longer have to field a tank, a healer or any fixed mix. The draft only makes sure a roster can still be filled under the cap. Each coach instead has a **composition plan**: weights over tank, healer, controller and damage, seeded from their personality plus a personal twist.

| Coach style | Leans towards | Typical 3v3 lineup |
| --- | --- | --- |
| Fortress builder | tanks and healers | 2 tanks · 1 healer |
| Glass cannon | damage | 3 damage |
| Star chaser | a carry plus healing | 1 healer · 2 damage |
| Tactician | control | 2 controllers · 1 damage |
| Balanced | the classic mix | 1 tank · 1 healer · 1 damage |
| Bargain hunter | no preference; value first | varies |

The plan shapes how coaches value draft picks, which starters they field (`bestLineup`), whom they release and which trades they accept. The plan's weights are split into slots after sharpening (power 1.8), so strong preferences show even in 2- and 3-fighter lineups. Exhibition "Random S/A" teams draw a random coach-style composition as well.

## Metas
Every result records both lineups' compositions. At the offseason, `seasonMeta` works out:
- the win rate of each composition (with at least 4 games);
- for each role, how often the side fielding more of it than the opponent won.

Each AI coach then moves their weights towards the roles that won, at a personality-based rate:

| Coach style | Adaptation rate |
| --- | ---: |
| Tactician | 0.8 |
| Bargain hunter | 0.7 |
| Balanced | 0.5 |
| Glass cannon | 0.4 |
| Star chaser | 0.2 |
| Fortress builder | 0.15 |

Newly hired coaches start from their template, nudged towards the meta. The offseason report's **Season meta** section lists:
- the role edge;
- the top compositions;
- every coach who changed lineup.

Each team card shows what it **plays**, and its coach's plan when that differs.

Leagues created before this change pick up coach plans from the personality templates.

# Team leagues: phase 4 (offseason and coach mode)

Phase 4 lets you coach one team yourself and adds the offseason between seasons. The rules live in `public/team-league.js`. The server runs every choice through those same rules (`worker/teams.mjs`), and `scripts/check-team-offseason.mjs` covers them.

## Coach mode

- **Taking a team.** Pick a team with **Coach a team** in the league header. You can take over before the first draft pick, or between seasons (rosters set, or season complete). **Hand back** returns the team to its AI coach at any time, except while your keep-or-release or trade decisions are still open. A league with no coached team runs entirely on its own (spectator mode).
- **Draft picks.**
  - AI picks stop when your team is on the clock.
  - The draft board's **Draft** buttons are enabled only for fighters you can sign. Every pick must leave enough cap, with the same 15% reserve the AI uses, to fill your remaining slots and any unmet role. The minimum-contract exception still applies.
  - **Let the scouts pick** makes the pick your AI coach would have made.
- **Lineup.**
  - On your team's card, tick exactly 3 (or 5) starters and press **Save lineup**. You can do this whenever rosters are set, during the season, or during the playoffs.
  - The lineup applies from the next match.
  - **Best lineup** restores the automatic choice: role slots first, then the strongest fighters.
- **Tactics.** Your team plays the tactic you choose. AI teams play their coach's style:

  | Coach style | Tactic |
  | --- | --- |
  | Bargain hunter, balanced | Balanced |
  | Star chaser | Protect the carry |
  | Glass cannon | All-out aggression |
  | Fortress | Hold the line |
  | Tactician | Focus their healer |

  Both teams' tactics are part of every match, including simulated, watched and scrimmage games.

## The offseason

**Begin offseason** (at Season complete) runs these steps:

1. **Rookie class.**
   - The browser rolls 2 rookies per team for 3v3 and 3 per team for 5v5. It uses the same role mix and S/A/SS odds as the founding pool, and the plan is seeded by league and season.
   - The server checks that each rookie is an unedited roll of its planned tier.
2. **Value updates.**
   - A fighter's impact per game is compared with every other fighter in the same role (a z-score). Each standard deviation is worth about 2 OVR, capped at ±4, and scaled down for fighters who played fewer than half the games.
   - A seeded drift of −1 to +1 is added. Fighters who did not play only drift down.
   - Gains above 90 are halved (rounded up), and the total change is capped at ±5 per offseason.
   - Every contract is repriced at the new OVR, so kept fighters cost their **new** salary.
3. **New cap.** The salary cap is recomputed with the founding formula: the average salary of the top roster-worth of fighters, divided by the number of teams.
4. **Free agency and retirement.** Free agents left unsigned for two offseasons retire. Former MVPs never retire. This keeps the pool at a steady size.
5. **Coaching changes.** An AI team that won 25% or fewer of its games fires its coach. A new coach with a fresh personality takes over. Your team is never affected.
6. **Keep or release.**
   - AI coaches release anyone a cheaper free agent of the same role could replace almost as well. How much of a roster a coach will turn over depends on personality:

     | Coach style | Share of roster |
     | --- | --- |
     | Bargain hunter | 3/8 |
     | Most styles | 1/4 |
     | Star chaser, fortress | 1/8 |

   - After that, coaches release whoever is needed to get back under the cap.
   - If you coach a team, you tick your own releases. A roster still over the cap can't be confirmed.
7. **Trade window.**
   - AI coaches make one-for-one swaps of bench or surplus-role fighters. A swap happens only if both teams' roster scores rise by at least 2 and both payrolls stay under the cap. Each team makes at most one trade, and there are at most half as many trades as AI teams.
   - You can offer one or two fighters for the same number from any roster. The other coach accepts only if their roster score rises by their personality's threshold:

     | Coach style | Score gain needed |
     | --- | --- |
     | Bargain hunter | 2 |
     | Star chaser | 0 |
     | Other styles | 1 |

     Both payrolls must also stay under the cap.
   - **Close the trade window** moves on to the draft.
8. **Draft.**
   - Teams fill their open roster spots from rookies and free agents.
   - Order: teams that missed the playoffs pick first, worst record first. Playoff teams follow by how far they went, and the champion picks last.
   - Each round includes only teams with spots still open.
   - The usual cap reserve and role-need rules apply.
9. **Next season.** The season counter advances to the next season, and lineups reset to the best available. Your saved lineup and tactic are kept if they are still valid. The **Offseason report** stays on the next season's start screen. It lists:
   - ratings changed, with the top risers and fallers;
   - releases;
   - trades;
   - coaching changes;
   - retirements;
   - rookies.

Everything above is deterministic from the league seed, the season and the choices made, except the rookies' random roll, which is part of the command.

**Measured offseason churn** (two offseasons each, synthetic results):

| League | Released | Trades | Coaches fired | Offseason rules run time |
| --- | --- | --- | --- | --- |
| 32-team 5v5 | about 60 | 3–4 | 0–3 | under 100 ms |
| 16-team 3v3 | about 18 | 0–1 | 0 | under 100 ms |

Over three seasons, a league stays well under the storage cap.

## Commands

All commands use the same revision and `operationId` protocol as the other team-league commands.

| Command | Payload | Allowed |
| --- | --- | --- |
| `claim` | `team` (or `null`) | before the first pick, rosters set, season complete |
| `pick` | `fighter` | your team on the clock |
| `lineup` | `lineup` (ids) | rosters set, season, playoffs |
| `tactic` | `tactic` | any time while coaching |
| `offseason` | `rookies` | season complete |
| `decide` | `release` (ids) | offseason, keep-or-release step |
| `trade` | `partner`, `give`, `get` | offseason, trade window |
| `closeMarket` | none | offseason, trade window |
| `draft` | `count` | AI picks, which stop at your pick |

## Between-game coaching and cover checks

Watched Bo3/Bo5 games pause at a recap. Team league games save at each break; returning to setup resumes the same series, including its score, starters and tactics. Your team may choose any legal starters from its roster. AI coaches adapt by a shared deterministic rule, used by both watched and quick simulation. A failed save offers a retry of the same result instead of rerunning the battle. Each format keeps a collapsed season/team champions list.

New seasons use team 2.1. Projectile spells and ordinary shots check their actual aim/radius; a shot blocked during its windup is cancelled, resources refunded and its cooldown reduced. Portal shots check the exit path. Earlier team 2 seasons keep their saved engine. Duel 12 stays frozen.

## Team kits

New team pool fighters receive one role-weighted extra slot. Earlier fighters without a kit and saved team 2/2.1 engines remain valid. New seasons use team 2.2. The ten kits are defined independently of the frozen duel catalog. Healers mostly roll Mending wave, Chain heal, Resurrection, Cleanse or Barrier; tanks favour Taunt shout, Barrier and Knock-up; controllers favour Stun bolt, Disarm shot and Knock-up; damage fighters favour Hamstring and Disarm shot.

Kits share the action and mana economy with normal powers. Resurrection channels for three seconds, restores 40% HP and can be interrupted. Each caster and each recipient can use it only once per game. Other heals cannot revive dead fighters. Control respects the immunity window; disarm suspends weapon attacks for any weapon. Stun lasts 1.2 seconds, taunt two seconds, knock-up 0.6 seconds, hamstring four seconds and disarm 2.4 seconds. Barrier provides one ward hit for four seconds to nearby allies.

Rating calibration uses separate regularized kit coefficients, with each subject facing identical opponents and seeds both with and without its kit. The committed report states the sample and model fit; coefficients are estimates, not guarantees for individual matchups.

The kit calibration covers 160 subjects (40 per role), eight paired seeds per subject, 2,560 battles and at least eight subjects per kit. The model explains 26.8% of sampled win-share variance; predicted quartiles won 37.2%, 44.7%, 55.8% and 72.2%. Regression coefficients describe conditional scouting estimates, while the report also records the raw paired kit differences. Those differences can disagree with a coefficient when other features correlate with the kit.

## League-specific patches

Each new league starts at base combat rules. A save owns its own immutable patch history; new seasons use team 2.3, while older active seasons keep their engine. Patches are considered after the complete halfway week and once at the offseason. Each lever changes at most 1.5% at halfway or 3% at the offseason (both relative to its current value and in percentage points of base), with a cumulative ±15% cap per lever. These are per-lever limits; distinct stats can change together.

Evidence compares games where one side fields more of a role, weapon type or kit group than the other; identical compositions add no evidence. The proposer also records role-count categories, such as two-tank lineups. It needs at least 30 comparable games, a win rate outside 45–55%, and a Wilson 95% interval excluding 50%. More tank health / Fortified protection, role healing / control / damage, weapon damage and kit output can be nudged. Supported targeted modifiers also cover healing, control and dive damage. Patches do not alter the original rolled stats or fighter catalog. Observational evidence can be confounded by roster strength; caps limit the response, and synthetic feedback checks test the controller rather than proving real combat causality.

The collapsed League patches panel shows plain-language changes and a per-save switch. Turning it off freezes the current patch. Every match describes its engine and patch snapshot; watched replays retain those options, and saved results retain their patch. A result reporting a different patch ID is rejected. Changes happen between phases, never between games of a series.

Team 2.3 also keeps Bulwark knockback on the wide team field, including shared hits, and preserves an active kit stun when shared damage lands.

## Performance and 2v2 review

The 5v5 check now warms up both engines and alternates eight identical seeded workloads against the frozen team-2 reference in the same run. It limits both whole-match cost and cost per simulated second to 2.5× reference, rather than a machine-dependent 750 ms deadline. The current measurement is 1.25× / 1.42× respectively.

A 100-game, side-alternating neutral-patch comparison after the new kits found Hold the line at 51% wins and 3% timeouts. A shorter opening hold produced identical results. No tactic change is applied on that evidence; repeat the review with long-season save data.

### Faster simulation and patch audits

Patch audits were the slow part of a team league. A preseason audit (and the midseason one) plays 1,500–2,500 test fights. Core siege fights last about 4–5 simulated minutes and took 2–3 s each, and the work was spread badly across the browser's workers. The following changes made it faster without changing any outcome (`scripts/check-team-performance-paths.mjs`):

- **Engine:**
  - Healers move toward their support spot through a stand-in target that reads through to the real fighter, instead of copying all ~150 of its fields every step.
  - The per-step timers are updated field by field, and trails age in place.
  - Every engine gives the same results as before: one recorded game per engine and squad in `validation/team-engine-fingerprints.json`, and 192 seeded games across all 16 engines during development. Overall it is about 1.36× faster, with 3v3 teamfight about 2×.
- **Audit:**
  - Each candidate's comparisons are batches of independent games, and the browser spreads every game across the pool instead of running one candidate's 100–250 fights on a single worker.
  - Discovery reuses the screen's eight pairs (same cases and seeds) instead of replaying them, which is about 14% fewer fights.
  - The reports, and so the patches, are identical. A 16-team 2v2 preseason audit went from 11.6 to 2.7 minutes on a 4-core machine.
- **Pool:**
  - Simulation tasks wait in one queue, and each worker takes the next as soon as it is free.
  - The pool uses all cores but one (up to 8), instead of half of them (up to 4).
  - This speeds up season weeks and cups too.

**Audit rules v4 (lighter audit).** In a 32-team 3v3 Core siege league, a preseason audit still took about 7 minutes on an 8-core desktop, so the audit itself plays fewer fights:
- **Fewer pairs:** full comparisons play 16 pairs at preseason and 12 at midseason, down from 28. A simulated edge alone now needs to be stronger to count (about 78% at 16 pairs and 83% at 12, Wilson z=2.5). Season evidence still drives patches whenever the simulations agree on direction, and the 10% / 1.5% caps are unchanged.
- **No fights for untestable candidates:** a candidate without two distinct carriers and two distinct controls could never be tested, so it is reported as limited without playing its screen.
- **Bigger pool:** up to 15 workers on a 16-thread CPU (8 before).
- Older patch history entries keep their recorded audit version and numbers.

**Audit rules v5 (midseason: outliers only).** A 32-team 3v3 midseason audit played about 3,300 fights and changed nothing: changes were capped at 1.5%, too small to show up in 12 test pairs, and the few that did were dropped by the combined check. Now:
- **Only outliers are tested.** A candidate needs its own season record of at least 30 games, outside 45–55%, with a 95% interval excluding 50%. At most 12 are tested, by priority; one that shares a lever or a role with a higher-priority outlier is covered by it. Everything else is listed under *Not tested* and plays no fights.
- **The season sets the change:** |rate − 50%| × 0.4, up to **10%** (was 1.5%). Every lever can now move up to **30%** from base rules (was 15%).
- **Test fights can only veto.** One comparison of 12 pairs per outlier holds the change back only if the matched fights clearly disagree with the season or the change leaves the carrier worse. One combined check replays just the patched side against the baseline already played and drops a change only if it hurts there.
- **Preseason:** roles and stats are now fully tested only when their screen is extreme or last season flagged them.

Measured on the same saved 32-team 3v3 Core siege league at its midseason checkpoint (real first half-season, 3 workers):

| | v4 | v5 |
| --- | --- | --- |
| Fights | 3,336 | 792 |
| Time | 24.4 min | 6.0 min |
| Changes applied | 0 | 9 (damage dealer damage −10%, melee damage +7.5%, tank health +6.7%, healer healing +7.1%, MAG −6.9%, and four abilities) |
| Held | all | 3 (made matched fights worse) |

## Core siege preview (objective phase 1)

Choose Core siege when founding a new 3v3/5v5 league or in exhibition Battle rules. Normal leagues and 2v2 keep team battles. The future replacement step and full coach brain remain later objective phases; this preview gives the first two phases a playable testing surface.

The field is 1280×600 with reachable mirrored bases, pit and two flank routes on every map. Cores have 6,000 / 9,000 HP. Two living defenders within 160 reduce incoming Core damage by 75%; each Core pulses the nearest enemy within 140 for 2% max HP every two seconds. Cores are static projectile targets, cannot be healed or hit by allies, and destruction ends the current step.

Downed fighters return at their base after 8–20 seconds, increasing linearly until 5:00. Resources, control and cooldowns reset; statistics and once-per-game revival flags persist. Resurrection cancels the pending respawn. At 6:00 respawns stop and Core damage doubles. At 6:30 Core health %, total damage, then a seeded coin toss decides. Results keep objective damage and time spent down. Impact adds 0.4× objective damage and 300 per monster last hit, preparing phase two.

Core leagues pin their own engine each season, preserve patch snapshots, validate objective results and use Core health for standings health margin. Quick exhibitions and leagues simulate in workers. Canvas crystals show health rings; the HUD shows Guarded and respawn countdowns. Measurements live in validation/team-objectives-core.json. Early AI is intentionally simple; full length and strategic balance targets require the later team brain.


## Forge Titan and Forgefire (objective phase 2)

New Core siege exhibitions and new preview league seasons now use team-3. Older active Core seasons and replays stay on team-3-core. The Titan rises at 0:40, with 4,500 / 7,500 HP. It follows its largest damage contributor in the last six seconds, stays within 140 of the pit, resets after six seconds without damage, and warns for 0.8 seconds before its four-second slam. Its killing-blow team claims Forgefire, including steals; it returns 90 seconds later.

Forgefire lasts 60 seconds: +15% outgoing fighter damage, +50% additional Core damage, and bypass of Guarded. It gives living teammates a shield worth 10% max HP that refreshes every 10 seconds. Shields absorb hits after mitigation, including damage shared through Bulwark; overkill penetrates a depleted shield and a shielded survivor is not credited as a KO. Static objective actors use fixed accuracy and no critical hits. The canvas shows the Titan's health and slam warning, and the Forgefire aura thickens while a fighter has a shield. The HUD shows the match timer, Titan timer, buff timers and recent claims/steals. Compact saved results omit the detailed evaluation-only Titan ledger.

The phase-two AI contests a living Titan when no enemy is very close, allows mobile fighters to try a low-health steal, and pushes the Core with Forgefire. It respects taunts. This is the simple phase-two rule set, not the later coach brain. Median length, sudden death, time limits, monster participation, steals and Forgefire correlation are measured in validation/team-objectives-titan.json. Correlation with winning is observational and is not a causal measurement of buff strength. The full brain's length/steal/comeback/buff targets remain to be met before default replacement.


## Role damage, healer kits and tuned Core siege (team-2.7 / team-3.4)

**Only damage dealers deal full damage.**
- **Before:** in 5v5 teamfight, healers dealt about 66% of a damage dealer's damage (293 against 442 per game). Controllers matched damage dealers (445), and tanks reached about 94%. In Core siege, healers dealt more Core damage than anyone.
- **Now:** every hit a tank, healer or controller lands on an enemy fighter, Core or the Titan is scaled (`public/role-output-combat.js`):
  - tanks ×0.5;
  - healers ×0.35;
  - controllers ×0.5.
- Healing and control are unchanged. Tanks trade their damage for toughness: Fortified is 30% stronger (about 45% less damage taken instead of 35%), which keeps balanced lineups ahead of all-damage lineups (5v5: 60%, 3v3: 62.5%).
- **Measured** (20-game 5v5 sample, per game): damage dealer 592, tank 354 (60%), controller 366 (62%), healer 128 (22%). Matches run longer, so per-game totals rise. Per second of fighting, controllers deal about 70% of their old damage.
- **Late game:** weaker non-damage roles make even fights last longer. Classic teamfight therefore adds +5% damage per second from 60 s, on top of the existing overtime rules from 75 s. Every evaluation row now times out at 8.3% or less (`validation/team-combat.json`).

**Healer kits.** See `ROLLED-SUPPORT-ABILITIES.md`: about 60% of newly generated healers carry Mending wave, Chain heal, Resurrection, Cleanse or Barrier in their second slot, on top of a sustained heal.

**Core siege is the default for 3v3/5v5** exhibitions and new leagues; "Classic teamfight" stays selectable.
- **Switching:** existing leagues switch with *Battle rules* in the league header between seasons (`setBattleMode`, worker action `rules`).
- **Engine upgrade:** existing leagues on team-2.6 / team-3.3 move to team-2.7 / team-3.4 from their next series (`prepareRoleRules`). A series already in progress finishes on its old engine.

**Tuned siege rules (team-3.4, per format).** Earlier engines keep their rules. team-3.4 passes its own through `options.objectiveRules` / `options.titanRules`.

| | 3v3 | 5v5 |
| --- | --- | --- |
| Core HP | 7,000 | 7,500 |
| Core pulse | 1.5% max HP | 2% max HP |
| Titan HP | 3,600 | 7,500 |
| Titan hit / slam | 2.5% / 7% max HP | 3.5% / 10% max HP |
| Forgefire | 35 s, +5% damage, 5% shield, +10% Core damage | 40 s, +7% damage, 6% shield, +15% Core damage |
| Guarded against Forgefire | 75% of its protection still applies | same |

- With Forgefire, a fighter keeps fighting enemies within 160 instead of rushing the Core.
- The killing blow claims Forgefire, and steals count. A team taking the Titan has to protect it or beat the other team first.
- Forgefire belongs to each fighter alive when it is claimed. A holder who falls loses it, and fighters who respawn or are revived come back without it. The team has Forgefire while at least one holder is alive (`empowered(f)` / `hasForgefire(team)` in `combat-team-v3-4.js`).

**Measured** with 40 seeded balanced mirrors per size (`validation/team-objectives-siege.json`; before → after):

| | 3v3 | 5v5 |
| --- | --- | --- |
| Median length | 137 s → 284 s | 145 s → 202 s (average 247 s) |
| Sudden death | 0% → 15% | 5% → 15% |
| Steals | 41% → 54% | 51% → 46% |
| Forgefire holder wins | 97% → 84% | 100% → 88% |

- **Steals:** a steal is a killing blow by the team that dealt less of the Titan's damage. With the last hit deciding, contested Titan fights split close to evenly, so protecting the Titan, or beating the other team first, matters.
- **5v5 length:** 5v5 swings between quick stomps and long games, so its median is shorter than its average.
- **Forgefire:** the win rate is mostly correlation. With every Forgefire bonus switched off, the team holding it longer still won 73% (3v3) and 81% (5v5) in an earlier measurement, because the team that wins the pit fight is usually the stronger team. Both this and the 5v5 stomps need the team brain (contest, flank, regroup), objective phase 3.


## Core siege team brain (team-3.5, objective phase 3)

**What it does.** Every 1.5 s each team scores seven plans and commits to the best one for at least 3 s. Defend and Regroup can interrupt, and a plan that stops making sense (Contest once the Titan is dead) is dropped at once. The formation layer still decides how to fight. The plan decides what is worth fighting (enemy fighters, the Titan or the enemy Core) and how far forward the team may push (`public/combat-team-v3-5.js`).

| Plan | When | What the team does |
| --- | --- | --- |
| Contest the Titan | The Titan is up (or spawning within 12 s) and numbers are even or better | Attacks the Titan, switching to any enemy who comes close; waits at the pit edge before it spawns |
| Hold the choke | The Titan is up and the team is behind | Holds a point between its base and the pit and fights whoever comes |
| Flank the pit | The enemy is in the pit hitting a Titan below 60% | Attacks the enemies in the pit |
| Steal the Titan | The Titan is below 20%, the enemy is hitting it, and the team has a shooter or diver in reach | Those fighters go for the last hit; the rest fight |
| Siege the Core | Forgefire, a numbers advantage, no Titan soon, a low enemy Core, and more and more as the match goes on (from 2:30) | Hits the enemy Core; damage dealers in range keep hitting it even with defenders nearby |
| Defend the Core | Two or more attackers near our Core while it is being hit | Fights the attackers near the Core and stays close to it |
| Regroup | Two fighters down, or low health while outnumbered | Falls back to base |

**Coach styles** come from the tactic and add points to plans:
- Hold the line: Defend and Hold.
- All-out aggression: Contest and Siege.
- Focus their healer: Flank and Steal.
- Protect the carry: Contest and a little Regroup.

**Guarded by numbers.** In team-3.5 a Core is Guarded only while its defenders nearby are at least as many as the attackers there, so winning the fight at a Core opens it up.

**Core HP.** Defended Cores fall more slowly than team-3.4's Core races, so Cores have 3,500 HP (3v3) and 5,000 HP (5v5). Everything else uses the team-3.4 rules.

**Status line.** It shows both teams' current plans, and plan switches appear in the combat log.

**Measured** (`validation/team-objectives-brain.json`; 40 balanced mirrors per size; team-3.4 → team-3.5):

| | 3v3 | 5v5 |
| --- | --- | --- |
| Median length | 284 s → 300 s | 202 s → 308 s (average 296 s) |
| Sudden death | 15% → 10% | 15% → 15% |
| Time limit | 15% → 2.5% | 10% → 2.5% |
| Forgefire holder wins | 84% → 50% | 88% → 81.5% |
| Steals | 54% → 39% | 46% → 30% |

Plan share in 3v3: Siege 41%, Contest 23%, Defend 19%, Flank 7%, Regroup 4%, Steal 2.5%, Hold 2%. 5v5 is similar.

**Coach styles against Balanced** (30 games each, same squads, sides alternating):

| Style | 3v3 | 5v5 |
| --- | --- | --- |
| Hold the line | 37% | 30% |
| All-out aggression | 57% | 63% |
| Focus their healer | 33% | 37% |
| Protect the carry | 30% | 30% |

The design target is 35–65%. Balanced is currently the strongest siege style. Tuning the brain's style weights barely moved these numbers, because the gap comes from the formation postures shared with classic teamfight, which stay frozen for replays. Making each style competitive in siege is follow-up work (coach intent, `AI-IMPROVEMENT-PLAN.md` stage A4).


## Coach game plans (team-3.6, objective phase 4)

**Three dials** steer the team brain in Core siege (`public/team-game-plan.js`, `public/combat-team-v3-6.js`):

| Dial | Values | Effect on the plans |
| --- | --- | --- |
| Titan priority | Always contest / Contest when ahead / Never | Always: Contest +10. When ahead: no Contest unless the team has a numbers lead (or even numbers and more health); Hold instead. Never: no Contest or Steal, so the team plays around the Titan and punishes whoever takes it |
| Style | Group up / Flank | Flank: Flank +15 and Steal +5, and when sieging, skirmishers and controllers take the top or bottom lane. Group up: Flank −10 |
| Siege timing | With Forgefire / On a numbers lead / Not before 3:00 | With Forgefire: also sieges with a two-fighter lead or from 3:30. Numbers: sieges with a lead, Forgefire, late-game pressure, or no Titan soon. Not before 3:00: earlier only with Forgefire or a two-fighter lead. A team that waits spends the time on the Titan (Contest +15) |

**Where the dials come from:**
- **AI coaches:** from their personality:
  - Balanced, Glass cannon and Star chaser: always contest, group up, siege on numbers.
  - Fortress builder: contest when ahead, group up, siege on numbers.
  - Tactician: contest when ahead, flank, siege on numbers.
  - Bargain hunter: never contest, flank, siege on numbers.
- **Your team:** set the dials on your team card in a Core siege league (worker action `gamePlan`).
- **Exhibitions:** each side has dials, starting from its tactic's default.
- **Between series games:** you can change yours. An AI coach that lost the last game changes one dial according to its personality, and winners keep theirs. Played games record both plans, and the league validates that AI plans follow the series rules.

**Other team-3.6 changes** (all measured against the dials and styles):
- **Siege postures:** Hold the line's leash goes 90 → 120 with a softer pull, and Protect the carry's leash goes 100 → 120 with dives allowed on exposed targets. Classic teamfight keeps its postures, through a `posture(team)` hook whose default is unchanged.
- **The Titan has half the health and hits half as hard.** With only damage dealers at full damage, contesting a full-health Titan was a trap: teams spent about 130 s per game on it and killed it 0.3 times. Now they kill it about 1.5 times per game, and skipping it no longer wins outright.
- **Smarter contesting:** teams don't start on the Titan while the enemy waits near the pit without hitting it.
- **Defending:** any team answers a single attacker that is hitting its Core, and Core pulses deal twice the damage. Waiting to siege is a real option.
- **Cores:** 4,000 HP in 3v3 and 5,000 HP in 5v5.

**Measured** (`validation/team-objectives-plan.json`; 40 balanced mirrors per size, 30 games per style and dial row):

| | 3v3 | 5v5 |
| --- | --- | --- |
| Median length | 250 s | 259 s |
| Sudden death | 12.5% | 7.5% |
| Time limit | 5% | 0% |
| Titan kills per game | 1.5 | 1.4 |
| Forgefire holder wins | 84% | 76% |

**Coach styles against Balanced** (team-3.5 → team-3.6):

| Style | 3v3 | 5v5 |
| --- | --- | --- |
| Hold the line | 37% → 43% | 30% → 50% |
| All-out aggression | 57% → 57% | 63% → 53% |
| Focus their healer | 33% → 43% | 37% → 43% |
| Protect the carry | 30% → 43% | 30% → 40% |

**Each dial value against the default plan** (Always contest · Group up · On a numbers lead):

| Dial value | 3v3 | 5v5 |
| --- | --- | --- |
| Contest when ahead | 43% | 43% |
| Never contest | 63% | 53% |
| Flank | 43% | 53% |
| Siege with Forgefire | 33% | 43% |
| Siege not before 3:00 | 37% | 40% |

Every style and dial value is a real choice: none wins or loses more than about two games in three. Delaying the siege is still the weakest option in 3v3, because Core damage accumulates. Forgefire matters more again now that the Titan dies.

## Backdoor defense, a tougher Titan and stronger Forgefire (team-3.7)

In team-3.6, about one Core siege game in six was lost to a backdoor: a lone attacker took the Core while the rest of the team was elsewhere. Mages teleported straight onto Cores. `public/combat-team-v3-7.js` changes this; existing leagues move to it from their next series.

- **No teleporting onto Cores:**
  - teleport, charge, portal and space are never used against a Core;
  - no teleport lands within 420 of the enemy Core.
- **Backdoor duty:**
  - Enemies within 300 of a Core are intruders. That radius stops short of the team's own choke (345), so holding the choke is not a backdoor.
  - While the team plan is not Defend, the teammates closest to their Core go back, one per intruder and never the whole team. Ties go to the lower index.
  - Two or more intruders make Defend score (55 + 10 per intruder) without waiting for a Core hit.
- **Defenders pick the right target.** Defenders go for the intruder hitting their Core, otherwise the one closest to it. In team-3.6 they often fought the enemy tank at the back while its damage dealers took the Core.
- **The Forge Titan fights back:**
  - **Molten Hurl:** every 3.5 s, a fire projectile at the farthest attacker beyond melee reach (up to 420). It deals 3.5% (3v3) or 5% (5v5) of the target's max HP, and terrain blocks it.
  - **Fissure:** every 9 s, a 300 × 46 line telegraph toward the most fighters. After 1 s it deals the same damage plus a 1.1 s stun, which respects crowd-control immunity. Fighters in the line step out when they can.
- **Forgefire is a bit stronger:**
  - 3v3: 40 s, ×1.08 damage, 7% shield, ×1.15 Core damage;
  - 5v5: 45 s, ×1.10, 8%, ×1.20.
- **Cores:**
  - 3,600 HP (3v3) and 5,000 HP (5v5);
  - from 3:00, Core damage grows by 1.2% per second, so defended matches don't stall into sudden death.
- **Interface:**
  - The arena draws the Fissure as a red line that fills from the Titan outward, and the Molten Hurl as glowing rock.
  - The gold status box is always three lines (Cores; Titan and Forgefire; team plans), so the arena never moves.
  - The fight clock has a fixed width.
  - In the offseason, each step's main buttons (Confirm roster, Close the trade window, the draft's Sim buttons) sit above the steps.

**Measured** (`validation/team-objectives-v37.json`, `scripts/evaluate-team-backdoor.mjs`; 40 games per size on the same seeds and squads, balanced mirrors every third game and mixed compositions otherwise).

A backdoor loss is a game where the losing Core took most of its last 25% of damage while its defenders nearby were outnumbered and at least two teammates were alive elsewhere.

| | 3v3 team-3.6 | 3v3 team-3.7 | 5v5 team-3.6 | 5v5 team-3.7 |
| --- | --- | --- | --- | --- |
| Backdoor losses | 20% | 7.5% | 15% | 7.5% |
| Teleports near the enemy Core | 85 | 0 | 29 | 0 |
| Median length | 224 s | 276 s | 214 s | 275 s |
| Sudden death | 2.5% | 2.5% | 5% | 7.5% |
| Time limit | 0% | 0% | 0% | 2.5% |
| Titan kills per game | 1.6 | 1.9 | 1.4 | 1.8 |
| Forgefire holder wins | 80% | 75% | 74% | 70% |
| Molten Hurls / Fissure stuns per game | – | 17 / 6.1 | – | 20.7 / 9.8 |

**Coach styles against Balanced on team-3.7** (20 games each):

| Style | 3v3 | 5v5 |
| --- | --- | --- |
| Hold the line | 50% | 35% |
| All-out aggression | 60% | 45% |
| Focus their healer | 55% | 55% |
| Protect the carry | 40% | 55% |

## Stronger controllers and healers (team-2.8 / team-3.8)

A league showed controllers winning 21% of comparable games, and the midseason audit's controller lever (crowd-control duration) was not enough on its own. Measured directly, a lineup with a controller in place of a damage dealer won only 26–46%. In Core siege, even a single healer lost to another damage dealer (26–40%), because sieges are decided by Core damage. `public/role-tuning.js` changes both roles:

| Controllers | Classic teamfight (team-2.8) | Core siege (team-3.8) |
| --- | --- | --- |
| Damage to enemy fighters | 80% of a damage dealer (was 50%) | 90% (was 50%) |
| Damage to Cores and the Titan | 80% | 115% |
| Power and kit cooldowns | 25% faster | 30% faster |
| Crowd control and timed effects on enemies | 25% longer | 30% longer |

| Healers (Core siege only, small on purpose) | team-3.8 |
| --- | --- |
| Health | +10% |
| Mana | 15% of every power or kit cost refunded |
| Power and kit cooldowns | 15% faster |
| Damage to Cores and the Titan | the same as a damage dealer (they still deal 35% to fighters) |

Classic teamfight healers are unchanged: a single healer already won 59–63% there, and the extra sustain pushed classic 3v3 games over the 25% time-limit cap.

Other roles are unchanged, and older engines keep their numbers for saved results and replays; leagues move to the new engines from their next series. An earlier idea, letting a heal give the ally extra Core damage for a few seconds, barely moved results (allies hitting a Core are rarely the ones being healed), so the healer's own objective damage carries the change.

**Measured** (`validation/role-tuning.json`, `scripts/evaluate-role-tuning.mjs`): identical squads and seeds, sides alternating, 80 games per cell, before → after.

| | Controller instead of a damage dealer | One healer instead of a damage dealer | Two healers instead of healer + damage dealer |
| --- | --- | --- | --- |
| Classic 3v3 | 33.8% → 45% | 62.5% → 62.5% | 30% → 30% |
| Classic 5v5 | 46.3% → 55% | 58.8% → 61.3% | 58.8% → 55% |
| Core siege 3v3 | 26.3% → 46.3% | 26.3% → 47.5% | 23.8% → 41.3% |
| Core siege 5v5 | 36.3% → 41.3% | 40% → 60% | 31.3% → 47.5% |

One healer is now worth taking in both modes, while a second healer still loses or breaks even, so the meta does not turn into a sustain battle. Core siege otherwise plays as in team-3.7 (median about 4.6 minutes, sudden death 2.5–7.5%).

## No more fighters stuck on rocks (team-3.9)

Fighters could wedge between rocks in Core siege. The Core siege field rearranges the classic maps (the classic centre pieces move next to the side pillars), which left open gaps of only 7–45 px between rocks on Pillars and Crossroads, while a fighter is 18 px wide. On Ruins, fighters also ground against the long rock walls, because routing around them only kicked in for melee fighters or blocked shots. Classic teamfight maps never go below 30 px and were not affected.

- **Wider gaps** (`public/objective-maps.js`, `spreadTerrain`): every open gap between rocks is at least 50 px. Rocks touching within 4 px count as one wall and stay sealed. A lone rock that sits too close to another moves straight away from it, or is removed if there is no room. The left half is fixed and mirrored, so both teams keep the same layout. About 7% of rocks on Pillars and 15% on Crossroads are removed this way.
- **Unsticking** (`public/combat-team-v3-9.js`): a fighter that wants to move but has moved less than 4 px in a second while touching a rock walks around that rock or wall for 1.2 s, using the same detour as melee fighters.
- Older engines keep their terrain, so saved results and replays are unchanged; leagues move to team-3.9 from their next series.

**Measured** (`validation/team-terrain.json`, `scripts/evaluate-team-terrain.mjs`): balanced 3v3 mirrors, 16 per map. Stuck means alive, free to act, touching a rock, no enemy in reach and moved under 6 px in 2.5 s.

| Seconds stuck per game | team-3.8 | team-3.9 |
| --- | --- | --- |
| Ruins | 6.8 | 0.5 |
| Crossroads | 1.2 | 0.4 |
| Groves | 1.2 | 0 |
| Pillars | 0.3 | 0 |
| Open | 0 | 0 |

Core siege plays as before: 80 games of 5v5 on the same seeds give the same median length (263 s against 269 s) and the same backdoor-loss rate (10%).

## Enhanced renderer (PixiJS, objective phase 5)

Every fight draws with a WebGL renderer, `public/pixi-arena.js`: team battles (2v2, 3v3, 5v5, classic teamfight and Core siege), 1v1 duels and tournament matches. The renderer only reads the battle, so results, replays and server validation don't change. `scripts/check-pixi-arena.mjs` runs seeded team battles and a duel with the renderer's per-frame reads and compares the results.

- **Field:** the floor and grid, terrain rocks with shadows, environment zones, summons, wisps, food, the relic, soul links and weather. It uses the same `effects.webp` / `weapons.webp` sprite sheets as the canvas.
- **Objectives:**
  - Cores are glowing crystals with a health ring and a guard area.
  - The Forge Titan has a rotating rune ring, health bar and label, and its slam telegraph fills in as the slam lands.
  - Forgefire holders pulse gold, with a thicker ring while their shield is up.
- **Fighters:**
  - team-coloured bodies with a soft glow, hit flash, a facing dot, weapon swings, class icons and aim lines;
  - team battles add role glyphs, mini health bars and target lines (duels show health in the HUD);
  - positions are eased toward the simulation for smooth motion at any speed, and respawns and teleports snap.
- **Particles** come from what changed between frames: hit sparks in the attacker's colour, rising green heal motes, death bursts, light columns for revives and respawns, Core shards, a gold burst for a Titan kill, and a shockwave with screen shake for a slam.
- **Camera:** shows the full field by default. **Camera: Follow** frames the fighters who are in combat (and the Titan while someone is hitting it), zooming up to 2.2× and never leaving the field. Phones keep the portrait field from the canvas renderer, with labels and bars upright.
- **Controls:** under the arena, next to Speed. *Graphics* picks Enhanced or Classic, and the Camera button sits next to it. Both are saved in this browser.
- **Fallback:** if WebGL or the PixiJS module can't start, the arena switches to the classic canvas for the session and says so under the controls.
- **Packaging:** PixiJS is pinned (`pixi.js` 8.22.0 in `package.json`) and vendored, never loaded from a CDN. The worker serves `node_modules/pixi.js/dist/pixi.min.mjs` at `/vendor/pixi.min.js`, and the Pages build copies it, with its licence, to `vendor/`. It loads lazily on the first fight.

### Sprite art (objective phase 6)

The renderer uses sprite art from `public/sprites/` wherever a file exists, and keeps the drawn look for anything missing. The names and prompts are in `ART-PROMPTS.md`, and `public/sprite-art.js` has the mapping.

| Art | Used for | Without it |
| --- | --- | --- |
| 10 character archetypes (`char-*`) | each fighter, by class (all 56 classes map to one), mirrored to face its direction, on a team-coloured base ring | team-coloured disc with the class icon |
| 12 weapon props (`prop-*`) | the fighter's weapon, by name (bare hands, claws and arcane gauntlets have none) | the `weapons.webp` sheet |
| 4 Cores (`core-*`) | each Core, cracked below 50% health | drawn crystal |
| 3 Titan poses (`titan-*`) | idle, raised fists during the slam warning, and kneeling for 3 seconds after it falls | drawn body |
| Terrain (`rock-*`, `wall-stone`, `pit-rim`) | rocks by map (pillar hall → pillar, broken ruins → wall stone, crossroads → boulder, stone groves → cluster), and the Titan pit | shaded rocks and a gold ring |
| Effects (`fx-*`) | the Forgefire aura; respawn and revive columns; slam shockwave; Core hits; Titan steals | glows, rings and particles |

- **Adding art:** save files as `<name>.webp` (preferred) or `.png`, under 400 KB each (256 px, 512 px for the Titan and pit), then rebuild. `scripts/sprites.mjs` skips unknown names, duplicates and oversize files with a warning.
- **Builds:** they list the files in a generated `sprite-manifest.js` (empty in source), serve them from `/sprites/` (the worker embeds them like the other images), and add content hashes so updated art isn't cached.
- **Loading:** sprites load in the background, and a fight that starts first switches over as each one arrives.

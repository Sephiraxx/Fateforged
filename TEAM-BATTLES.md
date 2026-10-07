# Team battles (2v2, 3v3 and 5v5)

Team battles put every fighter on the field at once. This is Phase 1 of the team-league roadmap. It contains the team combat engine and the **3v3** and **5v5** exhibition screens in the Arena rail. Later phases add the generated team pool, AI coaches and the draft (Phase 2), the NFL-style season and playoffs (Phase 3), and the offseason and coach mode (Phase 4). **Team engine 2** (below) adds formation AI, a wide field with terrain maps, and ranged-first damage dealers.

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

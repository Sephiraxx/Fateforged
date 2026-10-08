> Phases 1–4 are built. Core siege is the default 3v3/5v5 mode, with the team brain and coach game plans (team-3.6; see TEAM-BATTLES.md). Classic teamfight stays selectable, and existing leagues switch between seasons. The PixiJS renderer and sprites remain future phases.

# Objective mode (design)

This is the design for the next team mode: matches with Cores to destroy and a contested monster. It **replaces** today's teamfight mode for 3v3 and 5v5, in exhibitions and leagues. The first two phases are playable; the later sections remain the design for future phases. The sections below are the spec, and each phase ends with the checks that prove it works, so it can be built one PR at a time.

## Decisions
- **Win condition: destroy the enemy Core.** It gives teams a reason to fight, push and defend.
- **Match length: 4–6 minutes** of simulated time.
- **No lanes and no farming.** Fights happen because of one contested objective: a big neutral monster whose killer gets a strong buff. A team can contest it, wait and flank the team taking it, steal it with a diver, or ignore it and push the enemy Core.
- **It replaces the current mode.** League results recorded under `team-1`/`team-2` stay as they are. New matches use `team-3`.
- **Graphics.** For now, the canvas with class icons on each fighter (plus = healer, hat = caster, bow = ranger, shield = melee; already live). Later, a PixiJS renderer and then generated sprite art (`ART-PROMPTS.md`).

## Architecture: what stays and what is added
- **The fighter engine stays.** It covers stats, weapons, abilities, roles, and engine 2's formation layer (slots, peel, focus fire, dives, line of sight, terrain).
- **A team brain is added on top.** It decides *where* and *why* the team fights. The formation layer still decides *how*.
- **The simulation stays deterministic, headless JavaScript.** The server re-checks results with the same rules, and seasons run on the worker pool. A game engine such as Godot or Unity would break both. Graphics improve through the renderer only, which reads simulation state.

## 1. Map
- **Field.** About 1280×600, with a base at each end (x < 160 and x > 1120) and the monster pit in the centre. The engine already reads every bound from `TEAM_FIELD` (`public/team-maps.js`), so widening the field is a constant change plus new spawn positions.
- **Middle.** The current maps (Open field, Pillar hall, Broken ruins, Crossroads, Stone groves) become the middle section. Their pieces move outward so that every map has:
  - a clear pit area (radius about 110 around the centre);
  - two flank routes (top and bottom) that skip the pit.
- **Bases.** Each base holds the team's Core and spawn point, plus a little mirrored cover near the Core so defenders have something to hold.
- Every map stays mirrored and seeded, with the existing wedge-free gap rule (`check-team-combat`).

**Checks:** maps mirrored and seeded; pit and both flank routes reachable from both bases (path test with the existing detour logic); no terrain in bases or the pit.

## 2. Core
- One per team, a static target at its base, with HP by format:

  | Format | Core HP |
  | --- | --- |
  | 3v3 | 6,000 |
  | 5v5 | 9,000 |

  Tune these so an unopposed full team needs about 25–35 s to destroy it.
- **Guarded.** While **two or more living defenders** stand within 160 of their Core, it takes 75% less damage, unless the attackers hold the Forgefire buff. This stops early backdoors and makes sieges a real decision.
- **Core pulse.** Every 2 s it deals a small hit (2% of an attacker's max HP) to the nearest enemy within 140, so camping under it costs something.
- **Targeting.** The Core is an enemy target for scoring and attacks, with low priority unless the brain is sieging (section 6). Projectiles hit it; it never moves.

**Checks:** a Core never takes friendly damage; Guarded applies exactly when its condition holds; the match ends the step the Core reaches 0.

## 3. Respawns
- Downed fighters respawn at their base after a timer. It is 8 s at the start and grows linearly to 20 s by 5:00 (and stays there).
- On respawn the fighter is at full HP and mana, with cooldowns reset, and walks back. There is no shop and no items.
- The result counts kills, deaths and the respawn time each fighter spent down.

**Checks:** timers follow the curve; nobody acts while down; stats add up across lives.

## 4. The monster: Forge Titan (working name)
- **Spawn.** In the pit at 0:40, then 90 s after each kill. One at a time.
- **HP.** It should take a full team about 12–15 s to kill: about 4,500 in 3v3 and 7,500 in 5v5 (tune with the evaluation).
- **Behaviour.**
  - **Aggro:** attacks whoever has dealt it the most damage in the last 6 s.
  - **Slam:** every 4 s it slams everyone within 90. The slam is telegraphed for 0.8 s, so dodges and the existing threat checks can react.
  - **Leash:** it never leaves the pit (radius 140). If nobody damages it for 6 s, it heals back to full (a reset).
- **Reward (Forgefire, 60 s).** Goes to the team that lands the **killing blow**, so steals are possible and that is where the tension comes from:
  - +15% damage dealt;
  - a shield worth 10% of max HP that regenerates every 10 s;
  - +50% damage to the Core;
  - the enemy Core's Guarded protection is ignored.
- **Feed.** The monster's death is announced in the combat log and HUD ("Red team claims Forgefire", "Stolen by …").

**Checks:**
- the monster takes damage from both teams and never leaves the pit;
- it resets when left alone;
- Forgefire goes to the killing-blow team;
- the buff ends after 60 s;
- steals are possible: a seeded test where the other team lands the final hit.

## 5. Ending, sudden death and the time limit
- A Core at 0 HP ends the match immediately.
- At **6:00, sudden death:** respawns stop and Cores take double damage.
- At **6:30**, if neither Core has fallen, the winner is decided in order by:
  1. higher Core HP %;
  2. more total damage;
  3. a seeded coin toss.
- **Target:** under 15% of matches reach sudden death.

## 6. Team brain
Every 1.5 s each team picks one plan. The formation layer then plays it out: the plan sets the team's front point, its called target and how far forward the leash allows.

| State | When | Front point / target |
| --- | --- | --- |
| Contest | the monster is up and the team is not behind in numbers | the pit; target the monster, but switch to any enemy who arrives |
| Hold choke | the monster is up but the team is weaker or more cautious | a choke between its base and the pit; punish whoever takes the monster |
| Flank | the enemy is committed to the monster (inside the pit, monster under 50%) | skirmishers and controllers take a flank route and hit the enemy back line |
| Steal | the monster is under 15% and the team has a diver with mobility | the diver jumps for the last hit while the team pressures |
| Siege | the team has Forgefire, or 2+ more fighters alive than the enemy | the enemy Core; push with the formation |
| Defend | an enemy siege is near our Core | our Core; peel and hold the Guarded radius |
| Regroup | the team is down 2+ or under 40% team HP | its base, waiting for respawns |

**Inputs:**
- numbers alive and respawn timers;
- team HP;
- monster HP and spawn timer;
- buff timers;
- both Core HP values;
- the coach's personality and game plan.

**Personality preferences** (weights on the states; ties broken by a seeded roll each match, so coaches are not robotic):

| Coach style | Leans towards |
| --- | --- |
| Fortress (Hold the line) | Hold choke, Defend; contests only when ahead |
| Glass cannon (All-out aggression) | Contest, Siege; first to engage |
| Tactician (Focus their healer) | Flank, Steal |
| Bargain hunter | Steal; Siege when the enemy commits to the monster (trading objectives) |
| Star chaser (Protect the carry) | Contest with the carry protected; Regroup early |
| Balanced | Contest when even; Hold choke when behind |

**Checks:**
- deterministic plans;
- every state reachable in an evaluation run;
- a plan never targets something unreachable;
- plans switch with hysteresis (no flip-flopping inside 3 s).

## 7. Coach game plan (coach mode)
On the user's team card, alongside the tactic:
- **Monster priority:** Always contest / When ahead / Never (play around it).
- **Style:** Group up / Flank.
- **Siege:** Only with Forgefire / On a numbers advantage / Never early (wait until after 3:00).

These become extra weights for the team brain. AI teams take them from their personality.

## 8. Results, league and storage
- **Engine version:** `team-3`.
- **Result:** today's fields, plus:
  - `objective: {coreHp:[%,%], monsterKills:[n,n], steals:[n,n], forgefireSeconds:[s,s], suddenDeath:bool}`;
  - per fighter: `objectiveDamage` and `downSeconds`.
- **`validGame`:**
  - `combatVersion === 'team-3'`;
  - `seconds ≤ 390.5`;
  - a valid `objective` block;
  - the winner consistent with `coreHp` (a destroyed Core means the other team won);
  - the existing lineup and stat checks.
- **League:**
  - Bo1, Bo3 and Bo5 stay.
  - Impact and MVP gain an objective term: `objectiveDamage × 0.4`, plus 300 per monster last-hit.
  - The offseason rating update uses the new impact.
- **Cost.** A match is about 3–5× today's simulation time, roughly 1–2 s for 5v5 in node. A 32-team 5v5 season would take about 5–10 minutes in the browser worker pool.
  - Keep "Sim week" responsive by sizing batches to the clock.
  - Record a measured target per phase in `validation/team-combat.json`.

## 9. Measurements (extend `scripts/evaluate-team-combat.mjs`)
| Metric | Target |
| --- | --- |
| Median match length | 4–6 min |
| Sudden-death rate | < 15% |
| Monster ignored (no team ever damages it) | < 10% of matches |
| Steal rate (killing blow by the team that dealt less damage to it) | 5–20% of monster kills |
| Comeback rate (team behind on Core HP at 3:00 still wins) | 15–35% |
| Forgefire value (win rate of the team with more Forgefire time) | 55–70%: it matters but does not decide everything |
| Flank success (fights opened by a flank that the flanking team wins) | above 50% |
| Each coach style vs Balanced | 35–65% |
| Formation metrics (isolated, outnumbered, healer cover) | no worse than engine 2 |

`check-team-combat` enforces the recorded targets once each phase lands.

## 10. Rendering roadmap
1. **Now (canvas):**
   - class icons (done);
   - the Core as a team-coloured crystal with an HP ring;
   - the monster as a large circle with a slam telegraph;
   - the Forgefire aura;
   - respawn countdowns in the HUD;
   - an objective timer bar.
2. **PixiJS renderer (WebGL 2D, from a CDN, so it works on GitHub Pages and phones):**
   - It reads the same simulation state each frame and interpolates between steps.
   - A camera follows the action: it zooms out for teamfights and follows a skirmish.
   - Effects: particles for hits and spells, glow for buffs, screen shake on monster slams.
   - The canvas renderer stays as a fallback.
3. **Sprite art pass:** layered sprites (body family + outfit + weapon prop) from `ART-PROMPTS.md`, loaded from `public/sprites/` with the icon renderer as fallback.

## 11. Phases (one PR each)
1. **Field, bases, Cores, respawns, win condition, sudden death.** No monster and no brain: teams push straight for the Core with today's formation AI. Checks from sections 1–3 and 5.
2. **Monster and Forgefire.** Contested by simple rules (both teams go when it spawns). Checks from section 4; first measurements.
3. **Team brain.** The states, personality weights and hysteresis. Full measurements from section 9.
4. **Replace the mode.**
   - Leagues and exhibitions switch to `team-3`.
   - The coach game plan UI.
   - `validGame` and MVP changes.
   - Docs and help.
5. **PixiJS renderer.**
6. **Sprites.**

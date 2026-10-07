> Implementation approved: deliver the full plan in stages; merge only on request. Earlier planning notes below remain context.

# Coach career roadmap

Planning only. Recorded 2026-10-06 against GitHub main `7babf4d` (through PR #21). No gameplay, UI, save migration or engine changes are authorised by this document. The user asked to add these ideas to the list and defer implementation. Numbers below are suggested starting points, not approved tuning.

## Direction

Fateforged now has a coach-manager loop: scout and draft, build a lineup, choose tactics, play a season, win playoffs, then manage contracts, trades and rookies. Team combat, formations, terrain, coach personalities and changing compositions support that loop.

The next advances should make coaching choices clearer and more varied: reliable combat decisions, meaningful support/control builds, reasons to adapt, and visible career history. Keep the existing objective-mode plan in `OBJECTIVE-MODE.md`; this roadmap adds to it rather than replacing its phases. Do not implement every interacting system at once: establish a measured baseline after each combat expansion.

## Requested backlog

| Item | Requested outcome | Suggested order |
| --- | --- | --- |
| Cover and shooting | Fighters wait for a clear shot rather than wasting attacks and cooldowns into cover. | First |
| Past champions | A compact season/team history inside each 2v2, 3v3 and 5v5 screen. | First |
| Support/control variety | More healing, area healing, ally revival and single-target stuns, with fitting class identities. | After combat reliability |
| Save-specific automatic balance | Each new league starts from the shipped baseline, then may develop its own small buffs/nerfs using evidence from its games. | Build measurement/profile support early; activate after the new combat baseline is stable |
| Optional mid-season patches | Controlled changes at week boundaries, without changing ongoing or recorded matches. | Later, after offseason-only patching proves stable |
| Platform/engine assessment | Keep the browser if it meets measured needs; consider a desktop engine only when evidence or presentation goals justify the migration. | Profile before committing to a rewrite |

## 1. Cover and attack timing

Observed by the user: AI sometimes shoots while in cover, spends its attack, and enters cooldown.

Current team combat already checks `clearShot` in `TeamBattle.startAttack`. The investigation therefore needs to trace the entire attack: target selection, movement, windup, projectile origin and release. Do not assume a missing start check is the sole cause.

Proposed behaviour:

- Check range and actual projectile clearance before committing an attack. Include projectile geometry and spawn position, not just a centre-to-centre ray.
- Recheck at release if the shooter, target or obstacle moved during windup.
- If blocked before release, cancel or hold aim with a short recovery; spend no full attack cooldown or attack resource. Specify this precisely so repeated cancel/restart cycles cannot create a faster attack cadence.
- Move or retarget to regain sight. Avoid repeatedly beginning an attack that cannot be released.
- Do not refund shots that were genuinely released and later hit an obstacle. Taking cover after an enemy commits should remain useful.
- Apply appropriate sight checks to enemy-directed spells and aimed techniques as well. Self buffs and explicitly exceptional abilities keep their defined behaviour.
- Keep watched and headless outcomes identical. Cover ordinary ranged and arcane attacks, windup movement, target changes, large projectiles, map terrain and summoned pillars.

This is a team-engine investigation. The frozen duel engine must retain its recorded behaviour.

## 2. Past champions per format

- Add a collapsed **Past champions** section inside each 2v2, 3v3 and 5v5 screen, available throughout the next season and offseason.
- Show only **season number** and **winning team name**, newest first. No extra stats or crowded awards panel.
- Keep each format's league history separate. Include an empty state before its first completed season.
- Reuse the existing `world.titles` entries where possible: `finishSeason` already stores season and champion team ID.
- Preserve the winning name at award time when necessary, so later team renames/removals do not erase or silently rewrite history. Decide the fresh-world archive behaviour before implementation; a new league should not accidentally display another league's winners.
- Confirm records survive reload, backup export/import and offseason rollover without duplication.

## 3. More healing, revival and control

Introduce a small themed pack with different tactical jobs, not multiple copies of the same heal. These are concepts for a later ability proposal; costs, rarity and final numbers still need approval/evaluation.

| Concept | Tactical job | Natural class affinities |
| --- | --- | --- |
| Lifebloom | Small area heal over time; rewards staying together but makes the group easier to control. | Druid, nature-oriented healers |
| Dawnwell | Delayed ground-targeted healing circle, with limited radius and a clear visual tell. | Cleric, Healer, holy/support subclasses |
| Mend | Fast, modest single-target heal that helps stabilise a damaged ally. | Healer, Cleric, Druid |
| Revival Rite | Interruptible channel to return one fallen ally with partial health. | Cleric, Healer, appropriate rare support builds |
| Arcane Shackles | Short single-target stun that interrupts an attack/cast. | Mage, Psion, controller subclasses |
| Concussive Strike | Short-range physical stun, trading damage for disruption. | Warrior, tank/control subclasses |

Proposed revival limits: start by evaluating a 3–4 second channel, 25–35% restored health, and at most one successful revival per caster per battle. A revived fighter should not restore its own spent revival charge. Cost and range must make revival a real commitment; it must not be the automatic best second slot.

Design requirements:

- Distinguish stun from existing roots: roots stop movement; stuns also prevent actions. Specify interrupts and release timing.
- Respect the existing hard-control immunity/diminishing-return rules. Avoid stun chains that remove meaningful counterplay.
- Healing uses missing health and effective healing in telemetry; overhealing must not inflate ratings, MVP or balance evidence.
- Define area stacking, line of sight, target priority, mana limits and overtime interactions.
- Coordinate revival with objective mode's automatic respawns. A revival may return an ally sooner, but cannot create two copies, duplicate lives, or resurrect someone who already respawned. Keep temporary deaths separate from permanent elimination.
- Teach AI when to heal, where to place areas, when revival is safe, and which enemy action deserves a stun. Check whether the abilities are actually used well, not only whether their effects work.
- Make effects legible while watching: area boundaries, revival channel, restored ally and stun duration.
- New generation should favour fitting classes while preserving unusual builds. Do not silently rewrite existing fighters' ability rolls.
- Version the expanded catalogue and team engine. Keep historical engines/replay behaviour and old custom-name interpretation intact.

## 4. Save-specific automatic patches

This is feasible as a constrained balancing system. Match outcomes alone cannot explain causality: a two-tank composition winning 90% might indicate overtuned tanks, or simply superior ratings, a skilled coach, favourable maps or weak opponents. Coaches adapting to a meta and changing salaries also affect the next season's results.

### Scope and baseline

- Store a balance profile per league/world and format. A new league starts with the shipped baseline; its adjustments carry between its seasons only.
- Do not change global files, another save, the 1v1 leagues, or a different format's profile. Changes in 2v2 are not automatic evidence for changes in 5v5.
- Prefer modifiers on a short approved list of team mechanics: tank mitigation, ally damage sharing, healing efficiency, selected cooldowns or control duration. Never let the system arbitrarily edit any stat or ability.
- Keep generated/rolled fighter stats immutable. Apply the profile during combat, with clear effective values when inspecting an affected mechanic.
- Preserve a fixed-baseline option and allow future patches to be disabled. Resetting to baseline affects future matches only.

### Evidence before action

- Measure composition performance, role contribution, effective healing, damage, control, survival, resource use, map, tactic and opponent strength.
- Use distinct games and distinct rosters. Replaying one matchup hundreds of times is not hundreds of independent observations of the league's meta.
- Suggested first screening gate: at least 50 relevant league games spanning at least five teams, with performance persistently outside roughly 40–60%. These are screening thresholds, not proof or targets every composition must meet.
- Account for strength and matchup mix; low sample size or contradictory results means **no patch**.
- Confirm a suspect mechanic with a bounded batch of controlled simulations using comparable teams, mirrored sides and common seeds. Compare candidate modifiers against the unmodified/current profile; check multiple compositions, maps and tactics.
- A successful well-built team should retain an advantage. The aim is to preserve viable choices, not make every team win 50% or punish the league champion.

### Conservative first version

- Analyse at season end. Publish the proposed change for the next season; apply no changes to an ongoing match, series or playoffs.
- Start with about 2–3% relative changes per affected parameter per patch, at most two affected mechanics, and a cumulative range of roughly 0.85–1.15 of baseline for suitable multipliers.
- Some parameters need bespoke bounds or percentage-point changes. Never automatically multiply everything by the same factor or modify capped probabilities as if they were flat damage.
- Prefer one targeted change over simultaneous compensating buffs and nerfs. Change more only when there is independent evidence for each.
- Require persistent evidence before reversing a change. Keep a cooldown between patches to prevent buffs and nerfs oscillating every few weeks.
- Validate candidate profiles against fixed regression scenarios and established match-length/control targets. Reject harmful candidates; keep the current profile when none is convincingly better.
- Keep the latest safe profile and the patch ledger. Reverting a failed patch changes future matches, never recalculates historical results.
- Reconcile profile changes with OVR, salary updates and coach adaptation. Do not count a patch-driven improvement twice as both a global role buff and a large personal rating gain. Specify which profile offseason decisions use before implementation.

Example: if matched two-tank teams remain dominant across opponents, try a small reduction to Fortified or Bulwark and compare it against the current profile. Do not immediately reduce every melee fighter's STR or DUR because the winning composition happens to be melee.

### Saving, replay and communication

- Every match references an immutable engine and balance profile. Store enough history to reproduce the exact match after later patches and after backup restore.
- Results and server validation use the same profile. Retried commands must not generate a second patch or rerun a different random proposal.
- Save a compact ledger: boundary/season, sample summary, changed mechanic, old/new value, reason and validation outcome. Avoid storing the entire simulation batch or another full fighter catalogue.
- Show optional plain-language league patch notes, such as “Tank protection slightly reduced after sustained dominance.” Never restore the prohibited engine/generation/career status banners.

### Mid-season version, later

- Optional, disabled initially.
- Evaluate only at configured matchweek boundaries after a minimum evidence window; use the same gates, limits and replay guarantees as offseason patches.
- Announce before the affected week. Never change a started series, active simulation batch or playoffs.
- Measure whether it improves variety without making roster investment feel pointless. If it mostly produces churn, keep offseason-only patching.

## 5. Browser, renderer and possible migration

The current project does not yet demonstrate a need for a full engine rewrite. It already separates headless simulation from presentation and uses workers for bulk simulation. That separation is valuable for a manager game, which must simulate many games without rendering them.

- Keep browser simulation for now. Measure real browser/mobile simulation time, memory, input responsiveness, save size and watched frame rate as objectives and new abilities land. Node benchmarks alone are insufficient.
- Follow the existing PixiJS renderer plan when richer 2D visuals are needed. PixiJS provides GPU-accelerated WebGL/WebGPU rendering; start with its production-recommended WebGL renderer. This improves presentation, not the CPU cost of combat decisions. Keep the existing canvas implementation as our own fallback.
- A downloadable version can be considered independently of rewriting the simulation, if durable local saves or desktop convenience become the main need.
- If the project eventually needs a full scene/animation workflow, native deployment or substantially richer presentation, Godot is the first engine to evaluate. Require a small vertical slice before committing to migration.
- Moving to Godot's browser export would still have browser constraints. Its current web documentation describes WebAssembly/WebGL 2, restrictions around threaded exports and no Godot 4 C# web export. A Godot desktop target is a different decision from wrapping the current browser project.
- Any migration must preserve save conversion, reproducible combat, old matches and headless season simulation. Do not mix engine migration, objective combat and automatic balance into one rewrite.

Primary references checked on 2026-10-06:

- [PixiJS renderers](https://pixijs.com/8.x/guides/components/renderers)
- [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

## Suggested delivery sequence

1. Investigate/fix cover attacks and add compact per-format champion history.
2. Add the combat measurements and immutable balance-profile foundation, without enabling automatic changes.
3. Propose and implement the themed support/control pack in small batches; evaluate AI usage and counters.
4. Proceed through the existing objective-mode phases, coordinating respawns with revival.
5. Establish a stable baseline, then trial bounded offseason auto-patches over many seeded seasons.
6. Consider optional mid-season patches only after those trials; advance visuals/profile the browser before any engine migration.

Do not start these implementation steps until the user asks to proceed.

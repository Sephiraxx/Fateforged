# Adaptive fighters and coaches

Status: proposed, awaiting implementation approval. No combat behavior is changed by this document.

Prepared against main at `4994edb` on 2026-10-07.

Ability design correction: support/control additions are random options in the two existing ability slots. Fighters receive no independent team kit or third ability. The separate ability-slot correction is a prerequisite for this AI roadmap; historical kit engines remain only for replay compatibility.

## What the player should see

Coach instructions establish the team's purpose and appetite for risk. Fighters recognize opportunities and dangers, communicate their intentions, and act together within those instructions. Their behavior changes when health, resources, positions, abilities or the objective change.

The central example is a 3v3 team with a melee fighter, controller and healer against two ranged fighters and a healer. Under Hold the line, the melee fighter can identify a safe opening and lead a short, supported counterpush. The controller advances to a useful casting position and the healer follows to a protected support position. Neither follows directly into melee. The group can stop, change focus or withdraw when the opening closes.

An enemy team without tanks is an opportunity to investigate, not an automatic invitation to charge. Two ranged fighters with ready control, a strong firing lane and room to retreat can punish that engage. A good melee fighter recognizes this too.

## Composition strategy: engage, poke/siege and split pressure

The user's strategic direction is a composition triangle inspired by teamfight games: Teamfight (Engage/All-in), Poke & Siege, and Split Push. Use it to identify what each team wants and where the opponent's plan leaves an opening. Its relationships are conditional on positioning, available abilities, map routes and objective timing; they are not automatic win/loss multipliers.

| Composition tendency | Wants | Opportunity for its opponent |
| --- | --- | --- |
| Engage / all-in | Close distance together, control a useful target and convert a short commitment into a kill or decisive fight | Pressure before the engage, spend or evade the initial control, separate the follow-up, or force the group to answer another objective |
| Poke / siege | Maintain usable firing lanes, inflict pressure without accepting an unfavorable close fight, and force defenders away from objectives | Reach an exposed shooter or support, attack through a safer route, or punish an escape/control cooldown that was just used |
| Split pressure | Spread the opposing defense, win or survive a local matchup, and trade pressure between meaningful objectives | Catch the isolated fighter, threaten an objective that demands an immediate answer, or exploit a temporary numbers advantage before the split pays off |

Represent teams with a mixture of these tendencies from their actual fighters, not one compulsory archetype. Assess initiation, burst and sustained damage, control, ranged pressure, healing/sustain, mobility, protection, escape and objective output. The same composition can have different strengths against different opponents. A coach preset expresses intent within those capabilities; selecting All-out aggression does not give a team missing initiation a new gap closer.

Fighters look for specific windows: a ranged enemy uses their escape, a healer loses sight of their front, an engage team spends its control, a split fighter becomes isolated, or defenders rotate away from a Core. They propose a response with a target, route, support requirements and expiry. The team decides whether to engage, counterengage, pressure, intercept, regroup or trade an objective within the coach's instructions. Measure successful recognition and conversion of these windows when evaluating AI quality; no additional stat reward is specified by this proposal.

In ordinary elimination battles, separated pressure means flanking, creating crossfire, drawing a protector away or isolating an opponent. There is no separate base objective to trade. In Core siege, actual split pressure can threaten a Core while another group contests or delays elsewhere. It must obey the current objective rules: two nearby defenders grant Guarded protection, so a lone attacker is not automatically an effective siege threat. Assess achievable pressure before sending them.

In 3v3, splitting removes a large share of the team's combat strength and support; require a strong, short opportunity and a reunion route. In 5v5, a protected main group plus a mobile pressure fighter becomes more practical. Both opponents should adapt: a split is useful only if it creates pressure worth its cost, and a team should not blindly send its entire lineup after one isolated fighter.

Integrate composition tendencies into A1's capability summaries, A3's opportunity assessment, A5's matchup planning and A6's objective allocation. Add scenarios for engage catching poke after a spent escape, poke safely exhausting an engage attempt, split pressure drawing a rotation, and the defending team choosing a useful response. Keep archetype advantages contextual and evaluate hybrid compositions as well.

## Existing foundation and current limits

The current game already has formations, target scoring, focus fire, dives, ally protection, support casting, terrain detours, cover checks and coach personalities. These should support the new AI rather than be discarded.

Code anchors:

- `public/combat-team-v2.js`: plans every 0.5 seconds, target reviews every 0.35 seconds, formation slots, dives, movement and support priorities. Defensive and protect-carry postures currently disable dives. The defensive opening hold lasts at most 12 seconds and ends when opponents engage; it is not a complete defensive strategy.
- The same planner uses a point ahead of the group as the front when no tank exists. This keeps the team moving, but does not establish whether an actual fighter can safely lead that movement.
- `public/combat-team-v2-2.js`: team kits are considered before ordinary powers when eligible. Their target selection and execution should participate in the same tactical action comparison as other abilities.
- `public/team-series.js`: AI coaches generally change tactics after losing according to personality and series score. They do not diagnose how the fight was lost, and the rule does not select a new AI lineup between games.
- `public/team-league.js`: draft and lineup decisions primarily use OVR, salaries and preferred role counts. Seasonal adaptation copies role success; it does not yet distinguish particular partnerships, maps or tactical failures.
- `public/combat-team-v3-core.js` and `public/combat-team-v3.js`: objective decisions are intentionally simple. Nearby enemies, a living Titan and Forgefire trigger target choices, without a complete contest/defend/regroup strategy.
- `OBJECTIVE-MODE.md` already proposes a later team brain. This plan extends that work to ordinary team battles and individual fighters. Core siege stays optional until separately approved for replacement.

These are limits identified from the implementation. Proposed improvements and thresholds below still need measurements; reading the code does not establish their eventual win rates.

## 1. Four connected decision layers

| Layer | Responsibility | Example |
| --- | --- | --- |
| Coach | Set intent, constraints, priorities and initiative allowance | Hold the line, protect the healer, allow supported counterengages |
| Team | Assess the fight, choose a shared plan and allocate jobs | Enemy flank is exposed; prepare a short advance with one leader and two supports |
| Fighter | Choose a useful local action using their actual capabilities | Interrupt a channel, close a gap, cover the healer, reposition or withdraw |
| Execution | Carry out a legal action with the existing combat rules | Check range, sight, resources, channel commitment, suppression and terrain |

Use deterministic rules and scored alternatives in the local simulation. The same decisions must run in watched fights and bulk simulation. External model calls are unnecessary for this system.

A fighter may propose an opportunity. The shared team plan approves or rejects a coordinated response. Urgent local actions such as dodging a telegraphed attack do not wait for that approval.

## 2. Instructions that express intent

Keep the five existing presets as the simple entry point: Hold the line, Protect the carry, Balanced, Focus their healer and All-out aggression. Expand what each preset means internally.

| Instruction | Meaning in the improved AI |
| --- | --- |
| Hold the line | Preserve cover and support connections; punish approaches; allow a brief supported advance when it improves control of the fight |
| Protect the carry | Preserve the designated fighter and their firing opportunities; assign protection and intercept threats; counterpush only when that protection remains viable |
| Balanced | Take favorable trades, regroup when losing cohesion, and commit to credible openings |
| Focus their healer | Seek a reachable route to disrupt healing; use control, pressure or an intermediate kill when a direct dive is unsafe |
| All-out aggression | Commit earlier and accept more risk; still use cover, maintain useful support and react to a collapsing fight |

Suggested advanced controls, collapsed by default:

- **Initiative:** Strict / Adaptive / Opportunistic. Adaptive is the default and enables the user's example. Strict blocks elective departures from the stated plan; Opportunistic allows more risk, not unlimited pursuit.
- **Protect:** Automatic / selected teammate.
- **Pressure:** Automatic / selected enemy. A focus preference does not force shots through cover or an impossible chase.
- **Pursuit:** Short / Normal / Extended, with an optional explicit no-pursuit restriction.
- Objective mode later adds Titan priority and siege conditions, using the existing objective proposal.

Explicit area boundaries and forbidden pursuits are constraints, applied before action scoring. Preset preferences such as maintaining a defensive shape are weighted goals. Forced mechanics, including taunts, rage and crowd control, continue to behave according to their actual rules; they are not removed by coaching instructions.

The player's saved instructions remain theirs. The team may adapt its execution within the permitted initiative, but an AI assistant does not silently replace the player's selected tactic, starters or protected fighter.

## 3. What fighters and teams understand

Build one cached situation assessment for each team. Avoid every fighter independently reconstructing the entire arena every frame.

It should consider:

- Living and disabled fighters; health, shields, mana, stamina, available support and nearby numerical advantages.
- Reachable positions, firing lanes, cover, escape routes, hazards and the time needed to join a fight.
- Effective protection: nearby melee threats, control, shields and interception. A ranged controller can protect a healer even without a tank label.
- Capability readiness: who can engage, interrupt, protect, heal, cleanse, revive, escape or deliver useful damage now.
- A short forecast of pressure over roughly the next 1.5–2 seconds, including committed attacks. Use conservative estimates instead of rolling hypothetical damage until a desirable outcome appears.
- Whether support can actually arrive in time. Being within 240 units is insufficient if a wall blocks the healer or their healing is unavailable.
- Changes since the last assessment: a lost frontline, disabled healer, wasted enemy escape, newly open flank, failed engage or approaching objective deadline.

Separate public information from estimates. Use the existing arena visibility and public roster information. Honor concealment and illusion mechanics. Allied cooldowns can be shared; enemy readiness should be estimated from observable casts and public loadouts, not from reading hidden timers or future random results. Unknown means uncertain, not ready or unavailable with perfect certainty.

All fighters must handle legality, cover and basic movement competently. IQ may modestly affect planning delay and forecast precision using existing tactical scaling, but should not produce broken pathfinding, magical knowledge or instant reactions. New personality/chemistry stats are not required for the first release.

## 4. A team plan with temporary assignments

Normal teamfight states:

1. Establish position.
2. Probe and pressure.
3. Prepare an engage.
4. Commit a coordinated engage or counterengage.
5. Protect a threatened teammate.
6. Pursue a limited advantage.
7. Withdraw and regroup.
8. Finish a favorable endgame.

Each plan specifies an anchor, target or target set, route, start condition, participating fighters, support positions, maximum commitment and abort conditions.

Allocate temporary jobs from capabilities, not just the permanent tank/healer/controller/damage label:

- Engagement leader: the fighter best able to start and survive contact.
- Follow-up attacker: converts an opening into useful damage.
- Protector: intercepts the greatest threat to a teammate.
- Disruptor: interrupts or controls a particular enemy at the right time.
- Support anchor: maintains healing, protection and a safe route for the team.

A melee damage dealer can lead without becoming a tank or gaining tank protection. A controller can temporarily protect the healer. A tank can pressure when another fighter can cover the back line. Team compositions stay unrestricted.

In 2v2, jobs overlap and no fictitious spare protector is assumed. In 3v3, one local threat can change the entire plan. In 5v5, allow a main group and a small supporting flank with explicit reunion/abort conditions. Avoid treating five fighters as five unrelated duels.

## 5. Fighter choices, movement and abilities

Compare candidate actions by likely benefit, risk, time to impact, resource cost, compatibility with instructions and contribution to the shared plan. Some actions, such as moving while an existing attack recovers, can coexist; do not incorrectly turn every decision into one exclusive action per interval.

### Movement and targets

- Melee fighters choose a reachable route, approach behind pressure/control when possible, and stop chasing when support or the exit disappears.
- Ranged fighters kite toward safe allies and usable firing lanes rather than blindly backward into walls or away from support. Closing distance can be correct when their own support is stranded.
- Healers seek positions with useful allied sight and safe exits. They do not walk into the enemy formation merely because the front fighter moved.
- Controllers choose between engagement support, interruption and protection from current danger and ability readiness.
- A shared target is a preference, not a command for everyone to chase. A fighter may attack a reachable alternative or intercept a threat while another fighter pressures the main target.
- Reposition if a target cannot be reached or hit within a bounded interval. Detect lack of progress, change the route, then abandon an impossible pursuit.
- Preserve ongoing action commitments. Do not cancel every windup or channel because the target score changed slightly. Recheck legal execution and use the existing cancellation/resource rules.

### Ability coordination

Use a common candidate selector for all rolled spells and techniques. Choose between these abilities by their usefulness, urgency and actual resource requirements.

- Heal based on missing health, incoming pressure, expected time to death and other committed healing; reduce unnecessary overhealing.
- Use group healing where it can actually reach injured allies. Avoid unsafe clustering into an incoming area attack.
- Use shields before a credible burst, and cleanse effects that are materially preventing a useful action.
- Revive when the existing eligibility rules allow it, the channel has a plausible safe window and the returned fighter can contribute. In objective mode, consider the respawn countdown as well as position and expected time gained. Do not revive every available body automatically.
- Reserve important interrupts for visible channels or meaningful follow-up. Chain control around confirmed hits and current immunity rules; do not assume a travelling stun will connect.
- Briefly reserve a target for committed control, healing, protection or revival so allies do not waste duplicates. Release reservations on failure, cancellation, death or expiry.
- Preserve escape resources when entering danger, unless spending them is the best legal way to escape or finish a credible kill.
- Use debuff, damage-type and weakness interactions already in the engine. Do not invent new elemental counters or give the AI buffs through its decision code.
- Taunt forces the correct response; immunity, silence, disarm and blocked sight invalidate actions immediately.

## 6. The user's 3v3 example, played out

1. Team A starts in a defensive shape. Its melee fighter is the potential engagement leader; the controller can disrupt and the healer supports from cover.
2. The melee fighter detects that Team B's healer is exposed, one ranged fighter has just used their escape, and a route exists outside the second ranged fighter's strongest firing lane.
3. The team assesses whether the controller can affect the fight and the healer can support the proposed contact point. If not, the melee proposes a smaller advance or waits.
4. With Adaptive initiative and a credible advantage, the plan becomes a short counterpush. The controller prepares control, the healer moves to a protected support point, and the melee closes the gap at the agreed trigger.
5. Team B reacts: its threatened ranged fighter kites, the second ranged fighter pressures the controller or covers the healer, and its healer relocates. Their target choice depends on which response is actually useful.
6. If Team B splits, Team A can isolate one fighter and focus them. If Team B successfully disengages, Team A stops at its pursuit limit rather than stretching into three disconnected chases.
7. If Team A's healer is pressured or disabled, the controller protects them and the melee withdraws or contains the closest enemy. The defensive instruction matters throughout.

If Team B has all its control ready and can maintain a dangerous firing lane, Team A should probe, use cover or provoke those cooldowns instead. Strict initiative should keep an elective counterpush inside the stricter instruction boundaries. The example must work in both directions, with Team B adapting as well.

## 7. Coaches before, during and between games

### Before a game

Choose a lineup and plan for the known opponent, map and conditions. Evaluate actual loadout partnerships and counters alongside OVR. Examples include control plus melee follow-up, protection for a vulnerable ranged carry, and a backup support option against observed healer pressure.

The existing roster sizes make exact legal lineup enumeration practical: 4 choose 2 is 6, 5 choose 3 is 10, and 8 choose 5 is 56. Score those candidates using compact capability summaries; do not simulate an entire season to make each selection. Opponent changes that have not been revealed are uncertainty, not information the coach can secretly use.

### During a game

The coach's planner adjusts the team's approach from observed outcomes: maintain a successful approach, find a new route if blocked, protect a repeatedly targeted healer, or regroup if reinforcements are needed. Decisions use the same intent model as player-coached teams.

AI coach personalities influence risk tolerance, target preferences and willingness to regroup. They should not excuse obvious mistakes. Economic personality and combat tendencies should be distinguished where necessary; a Bargain hunter does not automatically become a tactically bad coach.

Player teams adapt locally within saved instructions. New live player commands are a later optional UI extension, with defined simulation timestamps and replay capture; this AI improvement does not depend on adding them.

### Between series games

Use a compact diagnostic report, not just whether the team lost:

- Were useful attacks blocked or out of reach?
- Was the engagement leader unsupported?
- Was the healer repeatedly threatened or interrupted?
- Did control overlap immunity or fail to create follow-up damage?
- Did the group retreat too late, chase too far or neglect an objective?

Compare a few legal alternative plans and lineups against that diagnosis. Change one major instruction or make a justified starter swap, unless the matchup clearly requires a larger response. Winning coaches may also address repeated dangerous failures, but a single unlucky game should not cause a complete tactical reversal. Never alter the player's lineup automatically.

### Across the career

Improve scouting, draft, releases and trades using marginal contribution to the team's intended plans, flexibility and measured partnerships. Separate opponent-specific success from raw role popularity. Maintain small, bounded records with uncertainty and recency weighting; retain coach diversity.

As a starting policy, require roughly 12 comparable games before a persistent preference adjustment and cap that adjustment at 5% of a preference weight per season. These are provisional safeguards, not statistically sufficient proof of superiority. Low-confidence evidence should retain existing preferences. Automatic balance patches change combat rules; coach learning changes decisions. Do not combine their effects into one unexplained roster trend.

## 8. Suggested initial behavior parameters

These are proposed starting values to tune with scenarios. They do not change damage, health or ability rules.

| Parameter | Starting proposal | Reason |
| --- | --- | --- |
| Local decision review | Every 0.20 seconds; events invalidate obsolete choices sooner | Responsive choices without recomputing every frame |
| Shared situation/formation review | Every 0.50 seconds | Reuse the current cadence and keep the team coordinated |
| Strategic plan review | Every 1.50 seconds, plus urgent state changes | Allow a slower coach layer without delaying emergencies |
| Strategic minimum commitment | 3 seconds, waived for danger, invalid targets or completed goals | Prevent repeated engage/retreat flipping |
| Local action/target switch margin | Alternative must improve utility by 15 points on a normalized 0–100 scale | Reduce jitter; invalid actions bypass this margin |
| Engage confidence under Adaptive initiative | Hold the line: 75; Balanced: 65; Aggressive: 55 | Preserve different appetites for risk |
| Support readiness for elective group engagement | At least 70% weighted readiness, with critical assigned support present | An available plan, not just living teammates |
| Short engagement commitment | About 2–4 seconds before reassessment; danger can abort earlier | Create a bounded coordinated push |
| Pursuit budget | Short: 1.5 seconds; Normal: 3; Extended: 5 | Bound chasing; also require reachable support/escape conditions |
| Resource pressure | Below 25% mana/stamina increases conservation priority | Resources affect positioning and ability choice |
| Personal retreat pressure | Strong below 35% HP when threatened; use a short incoming-damage forecast | Avoid a universal health threshold that ruins winning fights |
| Ability reservation | Through the actual committed action and its expected impact, with a bounded expiry | Prevent duplicates without waiting forever on a miss |

Utility confidence and readiness need explicit, inspectable definitions during implementation. Do not call a score a calibrated probability. Validate each preset against matched teams; the most aggressive threshold is not automatically the strongest tactic.

## 9. Objective strategy uses the same system

Add Contest, Hold choke, Flank, Steal, Siege, Defend and Regroup from the existing objective plan. Assess health, resources, reachable combat strength, respawn arrival times, Core danger, Titan pressure and Forgefire duration.

- Contest with enough fighters to finish or fight safely, not because the Titan is simply alive.
- Let a durable fighter manage Titan pressure while allies handle threats and damage; avoid pulling or repeatedly resetting the Titan unintentionally.
- Estimate a steal window from observable health trend, attack travel time and channel/impact timing. Avoid a perfect hidden last-hit oracle.
- Preserve defenders when a Core is in credible danger; taking the Titan is not worth losing the match immediately.
- Use Forgefire for a supported siege if arrival and useful attacking time remain. Its presence does not force everyone to abandon defense.
- Regroup around useful reinforcement arrival times. A 2v3 need not flee if an ally arrives momentarily or the opposing healer is disabled.
- In 5v5, allow a small defending or flanking group only if the remaining assignment can still succeed. In 3v3, splitting has a much higher cost.
- Decline impossible objectives, abort threatened revive channels according to existing mechanics, and stop strategic churn near sudden death.

Normal battles end on elimination and cannot wait for ordinary respawns. Objective decisions must not leak into those battles.

## 10. Implementation sequence and acceptance

| Stage | Deliverable | Required evidence before advancing |
| --- | --- | --- |
| A1: Measurements and contracts | Situation/capability summaries, instruction schema, decision reasons and compact diagnostic counters; existing AI behavior preserved | Baseline results reproduce exactly; reasons/telemetry have bounded cost |
| A2: Individual fundamentals | Useful movement, legal target selection, resource awareness and one selector for abilities/kits | Cover, unreachable targets, suppression, heal/cleanse/revive and threat response scenarios pass |
| A3: Coordinated adaptation | Shared states, temporary jobs, engagement proposals, support positioning and abort conditions | The user's example and its unsafe/Strict variants work for either side; support stays useful |
| A4: Coach intent and controls | Expanded presets and collapsed initiative/protect/pressure/pursuit controls | Instructions materially change behavior; player settings survive saves, series and reloads |
| A5: Opponent-aware coaching | Prematch lineup/plan scoring and diagnosis-driven between-game adjustments | Legal, reproducible starter changes; improved response to recurring tactical failures without reaction to every random loss |
| A6: Objective brain | Integrate Titan/Core states, coordinated siege/defense, respawn-aware regroup and steal attempts | Objective scenarios pass; progress and Core danger are understood; normal teamfights retain their rules |
| A7: Career decisions | Capability/synergy-aware drafting, trades and bounded persistent learning | Long-season audits preserve varied coach styles and do not collapse all rosters into the same composition |
| A8: Tuning and rollout | Paired benchmarks, browser performance review, concise recap explanations and versioned release | Replay/backup/save guarantees and performance gates pass; measured improvements justify enabling the new AI |

Implementation should deliver reviewable increments. A1–A3 come before cosmetic AI indicators or broad career learning: coordination and execution must be trustworthy before coaches learn from them.

## 11. Validation and success criteria

### Scenario checks

Use the same scenario in mirrored team positions and on relevant maps:

1. Supported counterpush against two ranged fighters and a healer.
2. Same roster under Strict instructions; the elective departure is withheld.
3. Same apparent opening with enemy control ready and an exposed allied healer; the push is rejected or limited.
4. Healer pressured during an advance; protection and withdrawal adapt.
5. No tank, no healer, double healer, melee controller and mixed-range teams; assign useful jobs without inventing absent capabilities.
6. Cover changes during a windup; execution respects sight and current refund/cancellation rules.
7. Kiting near a wall and around a choke; find progress without repeatedly reversing direction.
8. Two controllers share a target; avoid wasted control against immunity and coordinate confirmed follow-up.
9. Two supports share a hurt ally; avoid duplicate healing/cleanses and choose useful group healing.
10. A revive opportunity becomes unsafe; legality and channel commitment remain correct.
11. Taunt, silence, rage, disarm, invisibility and resource exhaustion; adapt to the actual mechanics.
12. Outnumbered endgame and a lone survivor; stop obeying an obsolete full-team formation.
13. Objective threat vs Titan temptation; preserve a Core that can otherwise fall.
14. Forgefire with poor arrival time, contested last hits, impending respawns and sudden death; choose a coherent objective response.

Checks should assert the decision, support connections, legal actions and abort behavior. They should not force every scenario to end in a prescribed winner when random attacks can legitimately change the outcome.

### Broad comparison

- Start with at least 600 paired seeds for each format in ordinary battles and for each supported objective format. Reuse identical fighters, conditions and balance profiles, and alternate sides. Compare the new AI against frozen existing AI within a harness using the same combat mechanics.
- Include additional unseen seeds, rare/awkward kits and all supported maps. Report uncertainty, distributions and failures, not just average wins. Follow-up sample size should depend on the observed uncertainty.
- Candidate goals: reduce avoidable unsupported-engage time by at least 20% relative to baseline; reduce wasted healing/control casts by at least 25%; reduce clearly stuck movement incidents by at least 50%. Define these events before counting them. These are proposed goals, not current measurements.
- Require coordinated support in scripted opportunities, and prompt aborts when scripted critical support is lost. Do not reward a policy merely for never engaging.
- Compare effective attack uptime, time with usable support, delayed protection, target/action churn, retreat survival and objective abandonment alongside wins. Increased raw healing or reduced team spread alone does not prove better play.
- Track each preset against other presets using matched squads. Investigate a broad unexplained advantage outside roughly 35–65%; this is a review trigger, not a universal balance law or a reason to force every matchup to 50%.
- Keep duration and timeout distributions under review using separate normal/objective targets. Reassess older objective targets before enforcing them; several are design aspirations, not established current behavior.
- Target at most 25% additional median CPU cost per simulated second and at most 35% at the 95th percentile against the current mode's same-run baseline. Measure whole-match and season costs too, because smarter fights can last longer. Check a real browser; decision evaluation must remain responsive during bulk simulation.
- Finish with at least 40 simulated seasons for each format, first with fixed balance profiles to isolate AI effects, then with automatic patches enabled in separate trial saves. Audit learning drift, composition diversity, salaries and recurring tactical failures.

## 12. Storage, performance and player-facing explanations

- New AI changes receive new immutable engine/policy versions. Preserve `team-2.3`, `team-3-core`, `team-3` and the frozen duel engines for historical replay. Proposed new AI identifiers are `team-2.5` and `team-3.2` (the ability-slot correction uses `team-2.4` and `team-3.1`); finalize the naming before implementation.
- Capture initial coach instructions, policy version, legal lineups, balance profile and required learning snapshot per game. Derive subsequent automatic decisions deterministically. Future live user commands require an ordered, timestamped command log.
- Existing active seasons and partial series keep their pinned policy; move ongoing leagues at an explicit next-season boundary rather than changing the middle of a saved series.
- Propagate the same policy through workers, watched games, authoritative validation, exhibition setup, series breaks, exports and backup restore. Cover both Pages and server asset builds.
- Use simulation time and stable ordering. Evaluate shared decisions from a common snapshot before applying them; avoid privileging whichever team/fighter appears first in an array. Keep decision randomness seeded and separate from presentation timing.
- Cache summaries and geometry, bound candidate actions/routes, and stagger work on fixed simulation ticks. Full debug traces are optional developer output; production saves contain counters and a small number of meaningful events.
- Replanning normally remains in memory. Do not save each decision or each simulation tick. Preserve current result/phase saving behavior and the completed-game saves needed for watched series breaks.
- Explain major decisions in plain language: "Counterpush: enemy healer exposed, support ready", "Regroup: healer disabled", or "Defend: enemy siege threatens our Core". Show an optional collapsed recap and a small current-plan indicator rather than a new permanently open dashboard.
- Never restore the prohibited combat/generation/career retirement banners. This work stays in the existing browser project and does not require an engine or renderer migration.

## Recommended first implementation scope

Approve the full staged roadmap, then begin A1–A3: establish the baseline, fix individual decision quality and implement coordinated initiative. The first playable checkpoint should demonstrate the user's 3v3 example, a sensible enemy response, protected support movement and a convincing refusal of the same engage when it is unsafe. Coach controls, richer matchup decisions, objectives and career learning follow on that foundation.

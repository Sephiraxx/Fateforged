# Save-specific comprehensive balance review

Each team league reviews its own roster and season results, then simulates proposed changes before applying them. This is a measured, bounded patch system. Observational win rates identify questions; they do not establish a cause by themselves.

## Coverage

Every checkpoint includes every named ability present on active rosters, all five effective stats, every present role, feasible stacked-role counts from two to the format size, and weapon families. There is no four-candidate cutoff and no one-change limit.

A struggling or dominant role also triggers focused checks of its five stats and abilities shared by at least two members and 35% of that role. A sufficiently supported conditional ability/stat problem can trigger a focused check even without a broad role problem. Conditional season observations compare a feature only when both opponents field the same positive count of that role. All race, subrace, class, subclass, equipment, mastery, magic and weakness values are counted in a separate watchlist, with comparable season evidence where available. Those associations guide review; races and classes are not automatically rewritten from correlation alone.

The active save supplied on October 7 produces **82 candidates across 128 assigned fighters**. A fresh roster can produce a different inventory. Abilities with only one carrier and features without suitable controls remain visible as limited or needing assessment.

## Adaptive simulations

1. Every candidate is screened in eight randomized cases, mirrored from both sides (16 fights). A screen is explicitly labelled as a screen, not proof that the feature is balanced. A candidate without at least two distinct carriers and two distinct controls can never be tested, so since audit rules v4 it plays no fights and is reported as limited.
2. Roles and stats receive the full comparison: 16 pairs at preseason and 12 at midseason since audit rules v4 (28 before). The full comparison reuses the screened pairs. Abilities and weapon families escalate when season evidence is concerning, the parent role is concerning, or the screening win rate is outside 25%-75%.
3. Suspected advantages/disadvantages require the 45%-55% band and a Wilson interval at z=2.5 that excludes 50%. Supported season evidence can provide confidence when controlled discovery and validation independently corroborate its direction outside the band. Missing conditional history is not invented. Focused intervention checks can use a proven parent-role deficit as their hypothesis: they test whether a role-only ability/stat adjustment fixes that deficit, without claiming that the feature is globally weak.
4. A suspected correction is tested on a second set of combat seeds. Named abilities compare their supported primary effect field and cooldown, choosing one responsive field. A change must repeat and improve at least one paired win, or improve fight margin consistently without worsening wins. Margin combines winner and surviving health, using Core health in objective mode; its mean gain must reach 0.005 and its paired lower bound at z=2.5 must stay positive.
5. The full proposed patch receives a third set of combat seeds. Selected corrections, deferred broad-role corrections and other present roles are checked together. Conflicting corrections are removed or replaced, with up to three combined attempts. An incomplete or unsuccessful combined report cannot apply a patch.

Every initial screen includes all four maps, daylight values and weather values. Full comparisons cover all 16 time/weather and map/weather pairs, avoiding coupled conditions; stone/water ground and five tactics also vary across cases. Combat still uses the real deterministic engine at 60 Hz. Screens reduce the cost of reviewing a large inventory; this is substantially more work than the old four-feature check, especially in 5v5 Core siege.

## Matched controls and attribution

- Ability controls keep the same fighter, stats and other traits, substituting a compatible ability of the same rarity, kind and class-affinity bucket. Its derived role must stay the same.
- Focused interventions for a proven role deficit reuse matched role-versus-other-role lineups, perturbing only that role's ability/stat parameter. This catches a useful STR, SPD or ability correction even when the stat allocation itself was not abnormally successful. The independent response and combined checks still have to pass.
- Stat feature controls keep total stat budget, traits and derived role fixed. They use a compatible real allocation, or a controlled redistribution of 6%-9% of the total budget when no suitable allocation exists. The redistribution cannot remove more than half the original target stat.
- Role comparisons replace one fighter with a different role of the same tier, within 10 OVR and 20% of the rolled stat budget. Real kits stay intact. Stacked comparisons keep the requested number versus one fewer; other members remain identical.
- Weapon-family comparisons match real builds of the same role and tier within those budget/rating bounds. They compare weapon-family builds, not a perfect isolation of a weapon from all other equipment and powers.
- At least two distinct carriers and controls are needed before adjusting anything. Mirrored sides reduce spawn-side bias. No fighter can appear twice in its own test team.

A verified shared ability or stat correction takes precedence over a broad role modifier. The broad modifier is deferred only while independent combined role cases test the narrower proposal. If those cases do not improve, the broad correction can return as a fallback. Thus "tanks lose" can lead to "this shared ability is weak", a tank-only stat adjustment, a broad health adjustment, or a visible assessment when none of those proposals responds reliably.

## Supported patch fields

- Global STR, SPD, DUR, IQ and MAG, plus overrides for each role.
- Existing role health/healing/control/damage and stacked-tank protection modifiers.
- Melee, ranged and arcane weapon-family damage.
- A named ability's cooldown, including its shared casting timer and its existing independent cooldown.
- A named ability's cast power for supported spell/technique magnitudes; healing output for direct heals, regeneration, Second wind, Life aura and resurrection; and effect duration for supported timed control/buffs.
- Role-specific versions of named ability fields.

Scoped values **replace** global values for that role; they do not multiply into a second buff. A named ability uses at most one field across scopes in a checkpoint, so a power increase and cooldown reduction are not stacked into a disguised larger adjustment. Primary fields are listed explicitly in `auditFields`; passive, transformation, percentage and delayed-chain effects without a reliable magnitude scalar use cooldown review. If that field does not change the result, the feature stays under assessment. This system does not claim to edit every hidden coefficient in every power.

Preseason changes can reach **10% of the current effective value**; midseason changes stay within **1.5%**. Every stored factor remains within **85%-115% of base rules**. The cumulative cap is retained from earlier releases. Unresolved imbalance at that cap requires a game-rules/AI review, not an unlimited automatic escalation.

## History, saves and replay

Season dropdowns show the applied changes and coverage counts. A nested full review shows screened, stable, limited, confirmed and unresolved checks; the trait watchlist is another nested dropdown. Large histories stay collapsed by season.

Both halves of a season survive midseason auditing. Observation counters store exact game/win totals rather than repeating every feature row for every game. Legacy nested samples remain readable and are compacted on new observations. The strongest whole-season role result can also be recovered from older offseason reports; missing old ability/class data remains missing. Case-level validation arrays are checked at submission but only aggregate measurements are retained in patch history.

Reports bind save identity, seed, format, season, roster, original stats/tiers/roles/OVR, teams/tactics, prior patch, candidates and census. The API verifies report structure, field choices, relative/cumulative limits and every combined attempt. Combat runs locally; the API does not repeat thousands of fights. Revision, exactly-once operation and retry protections remain in place.

New fights use teamfight **2.6** and Core siege **3.3**. A safe audit checkpoint can upgrade an ongoing season after its current series; previous matches keep their captured engines/profiles. Earlier engines, including 2.5/3.2, remain registered for historical replays. Saved rolls, role identities, contracts and other saves are not edited by a balance profile.

## Review and validation

`check-comprehensive-balance.mjs` verifies complete coverage, conditional role evidence, named cast power/healing/duration, scoped overrides, no weapon-attack leakage, neutral engine parity, preserved historical engines, several combined changes, shared-ability attribution and conflicting-patch rejection.

`check-targeted-balance.mjs` retains effective-stat/cooldown, immutability, limits, stale/foreign/incomplete report, disabled balance and deterministic real-fight checks. `check-composition-balance.mjs` retains matched composition, margin-only response, noisy/unresponsive/capped adjustment, old-save recovery and full-season rollover checks. Synthetic outcomes verify controller decisions; they do not prove live balance improvement.

`check-comprehensive-balance-api.mjs` sends a positive combined patch through both Worker and Pages storage, rejects missing/foreign combined reports without editing the save, and verifies idempotent retry plus backup/reload. Team season, offseason, legacy balance, watched series, rolled support, Core objectives/import graph, arena replay, Pages storage and frozen-v12 checks cover integration. Browser verification uses an isolated disposable fixture, including real background workers, combined validation, persisted patch history and collapsed reports.

`verify-composition-save.mjs <backup.sqlite>` opens the supplied SQLite backup read-only, evaluates every candidate in four local workers, validates the complete patch and writes aggregate results to `validation/comprehensive-save-audit.json`. SHA-256 is compared before and after; the original database is never modified. The earlier four-candidate reproduction remains in `validation/composition-save-audit.json` as the historical failure comparison.

The final supplied-save run evaluated 82 candidates in 5,080 fights. It recovered the previous season's tank result of 8 wins in 49 comparisons (16.3%). Three tank-specific stat proposals passed individual checks, but fresh combined validation rejected STR and MAG, then rejected the remaining DUR correction on a second attempt. No change was applied. The tank concern remains explicitly under assessment: this run demonstrates complete review and rejection of unrepeatable adjustments, not a proven fix for that save's tank deficit.

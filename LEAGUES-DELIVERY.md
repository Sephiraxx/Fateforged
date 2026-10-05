# Fateforged leagues and cup update — October 5

The current updates are committed for testing at the user's request, including the fixture-view and phase-checkpoint follow-up. **No tests, browser checks, or performance benchmarks were run for this update.** Earlier passing results in `validation/checks.json` and `validation/league-combat.json` belong to commit `8cc5277`; they do not validate these changes. Both reports are marked accordingly. The combat engine's mechanics, stat balance and replay versions remain unchanged.

## Generation audit

The rarity mix stays Common 50%, Uncommon 25%, Rare 15%, Unique 6%, Legendary 3%, Mythic 1%. Rarity modifies trait weights, never stat values. Bias values are 0, 1.2, 2.5, 4, 6, 8. Magic-dependent power chances, distinct secondary powers, ancestry and class combinations remain intact. Saved fighters are not rerolled by this adjustment.

10,000 seeded rolls **per row**, seed `123456789`:

| Wheel | E | D | C | B | A | S | SS | Mean points |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mixed | 2367 | 3795 | 1934 | 1068 | 475 | 349 | 12 | 705 |
| Common | 4121 | 4785 | 1011 | 82 | 1 | 0 | 0 | 423 |
| Uncommon | 1048 | 4836 | 3231 | 850 | 35 | 0 | 0 | 632 |
| Rare | 64 | 1623 | 3717 | 3745 | 821 | 30 | 0 | 994 |
| Unique | 1 | 73 | 809 | 3756 | 4380 | 979 | 2 | 1549 |
| Legendary | 0 | 0 | 9 | 304 | 3366 | 6150 | 171 | 2224 |
| Mythic | 0 | 0 | 0 | 7 | 490 | 8233 | 1270 | 2643 |

The same seed against main produced Mixed: E 2873, D 4752, C 1833, B 495, A 46, S 1, SS 0 (mean 518). A/S/SS increased from 47 to 836 in the mixed sample. Common remains unchanged. Legendary has 96.87% A or stronger; Mythic has 99.93%. These are sampled results, not guarantees. Full before/after results for every rarity are in `validation/generation-audit.json`; rerun with `node scripts/audit-generation.mjs` in the Git checkout.

## League roster and season

New starts create 164 random fighters: league 1 has 20; leagues 2–7 have 24 each. Divisions remain independent of power tiers. Single round-robin is 19 weeks for league 1 and 23 for the other leagues; double is 38 and 46 respectively. All available matches alternate between divisions within the same matchweek. The smaller league finishes sooner while the other leagues complete their schedules.

Existing seven-by-twenty seasons retain their roster, schedule, recorded games and original cup format until completion. Their next explicit rollover adds 24 random fighters (four in each of leagues 2–7) in addition to the five normal retirement replacements. New seasons then use the larger roster and two interleague cups. Older archives and backups remain readable.

League scoring is win 3, draw 1, loss 0. Timed-out league games are draws. A drawn series earns one point for each fighter and updates both draw records once. Bo1/3/5 series stop at a majority or their game limit; if drawn games prevent a majority, the final game-win score decides the series, with an equal score drawing. Standings sort by points, game difference, game wins, then seeded season order.

## Cups and qualification

The cycle is league season → seven division cups → Champions qualification and cup → Europa qualification and cup → explicit season rollover.

Division cups include all members with proper preliminary rounds and byes. Cup grand finals are always Bo5. Champions and Europa have separate titles, crowns and streaks.

- **Champions:** first and second in each league qualify automatically (14). Third and fourth in each league enter a Bo3 single-elimination qualifier, played down to two remaining fighters. Those two complete the 16-player field.
- **Europa:** the 12 eliminated Champions qualifier entrants qualify automatically. Fifth and sixth in each league enter another Bo3 single-elimination qualifier, played down to four remaining fighters. Those four complete a separate 16-player field. No fighter appears in both main cups.

Both qualifying stages retain entrants, byes, qualifying fighters and eliminated fighters in history. Qualifiers use Bo3 throughout; main-cup grand finals use Bo5. Neither qualifying stage awards a championship.

Promotions, relegations and retirement wait until every cup is complete and the user explicitly starts the next season. Movement is simultaneous: top three in leagues 2–7 move up, bottom three in leagues 1–6 move down. Dawnrise's bottom five retire and receive exactly two Legendary, two Unique and one Mythic replacement. After expansion, league sizes remain 20/24/24/24/24/24/24. Retired snapshots, results and championships remain archived. Active members remain protected from deletion.

## Cup creator and draws

Group-stage scoring is also win 3, draw 1, loss 0, with timed-out games drawing. Active older group tables normalize their points to this scale when play resumes; recorded outcomes and completed historical stages are retained. Knockout, Swiss and friendly games continue using the existing time-limit adjudication.

New Swiss stages qualify a fighter on three series wins or eliminate them on three series losses, with a maximum of five rounds. Qualified/eliminated fighters stop playing. Rotating byes count as a win; pairings prefer close records and avoid rematches when possible. Every three-win fighter advances, regardless of the old numeric advancement setting. If Swiss is the last configured stage, a single-elimination championship bracket is added. Existing saved Swiss stages retain their original round-based format.

## Simulation and storage improvements

Simulation runs on the user's device in the Pages edition. It is not limited by a game server's combat capacity.

League and ordinary cup simulation reuse a small pool of workers (up to four, based on browser-reported hardware). Independent series run in parallel; games within each series preserve their original ordering and seeds. Simulation buffers results in this tab and saves **once after each completed phase** (once after each cup-creator stage). A full-season run checkpoints between phases. Short one-series/matchweek operations no longer write automatically unless they finish a phase. Pause & save and the explicit Save progress controls can checkpoint early. Partial progress must be checkpointed before a reload to retain it.

League saves accept a complete phase (up to 4,096 series) in one atomic command with revision/operation checks. Successful responses return only the new revision. Large operation receipts are compressed, and retrying a completed checkpoint cannot repeat records or titles. Conflicting checkpoints retain local results and rebase compatible already-saved prefixes. League calendars are cached, simulation avoids repeated whole-world clones, and UI rendering is throttled between computation batches.

The league picker opens a compact view with independently collapsible standings, division-cup fixtures, interleague cups/qualifiers and season champions. Fixture draws are reconstructed from their original seeds without mutating the season. They show byes, completed scores/replays, the next series and labelled future-winner slots. Interleague fixtures highlight selected-league entrants. Cup draws unlock after the league season, and older single-interleague seasons retain their original format. Expanded/collapsed preferences survive redraws and are kept per selected league and season. Archives expose the same fixture views.

Export/import retains both 140-member legacy worlds and 164-member new worlds and checks membership against each world's version. Backups contain the last successful checkpoint, so use the manual Save progress control first if stopping in the middle of a phase.

These changes remove identifiable overhead, but the actual speed improvement has not been measured. Combat still uses the same simulation step and engine.

## Deferred validation and delivery

Check scripts were updated for 20/24 schedules, 164 fighters, two distinct cup fields, qualification stages, draws, Swiss thresholds, legacy roster expansion, full-phase atomic checkpoints and compressed retry receipts. A separate read-only fixture check covers the seeded draws and every next pairing through a full season. They have **not** been executed in this update. The expected series counts are 2,055 for a single season and 3,901 for a double season, including division cups and both qualification/main-cup pairs. There are 16 title categories per new season.

The server and Pages output were rebuilt for delivery. Run the updated checks after the commit with Node 24:

```
npm ci
npm run build
npm run build:pages
node scripts/check-all.mjs
```

The draft PR and ZIP contain changed source, migration/schema metadata, updated checks, the reports and complete rebuilt `docs/` output. Temporary files and dependencies are excluded. No merge or deployment is performed. The generation audit above is unchanged from the previously measured rebalance.

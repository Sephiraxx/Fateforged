# Crownfire Convergence and Emberveil Challenge

Both 16-fighter main cups now use **double elimination**. A fighter is eliminated after two series losses. Winners-bracket and losers-bracket matches, including their bracket finals, are **Bo3**. The grand final is **Bo5**.

The winners-bracket champion enters the grand final unbeaten. If that fighter wins, the cup ends. If the losers-bracket champion wins, both finalists have one loss, so another **Bo5 grand final reset** decides the champion. Each cup therefore has 30 series, or 31 when a reset is needed.

Qualification and division cups retain their formats. Crownfire's third/fourth-place qualifier still supplies two places through Bo3 single elimination; Emberveil's fifth/sixth-place qualifier still supplies four. Regular league match settings do not change the two main cups' fixed Bo3/Bo5 schedule. Promotion, relegation and retirement continue to wait until every cup is complete.

Fixtures show both brackets, the grand final, and a conditional reset. All seeded winner/loser paths, completed scores and replays remain available in the collapsible interleague panel. Simulate matchweek processes one independent cup round at a time; phase saving and retry behavior are unchanged.

New worlds store cup-rules version 2. Older worlds without that version adopt the new format when a main cup starts; an already drawn but unplayed main cup upgrades while preserving its opening pairings. An older main cup with results already recorded finishes its original format. Finished archives retain their original fixture interpretation. Explicit version-1 test/evaluation worlds can still reproduce the older rules.

Validation covers both main cups, both possible reset champions, two-loss elimination, 30/31-series counts, every next fixture, independent round batches, old started/unplayed cups, and a saved/reopened reset checkpoint with idempotent match and championship records. Server and Pages season/archive checks include the new brackets. See [interleague-double.json](validation/interleague-double.json) and [league-combat.json](validation/league-combat.json).

The class-feature 120-season reports remain historical measurements from commit `4db78ec`. This format change adds cup matches without changing combat 12 or generation 3. The frozen v10/v11 evaluators explicitly select the previous cup rules.

Rebuild and verify with:

```text
node scripts/build.mjs
node scripts/build-pages.mjs
node scripts/build-pages.mjs --output docs
node scripts/check-all.mjs
```

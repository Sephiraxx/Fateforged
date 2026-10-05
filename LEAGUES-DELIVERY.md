# Fateforged leagues and generation update

Built from verified GitHub main `8d34194521a7239239417bcb78d4276b31d12911`. The earlier disconnected league workspace was unavailable; this implementation was completed from current main. No combat rules or balance constants were changed.

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

## Playing a league season

Open Arena → Leagues → Start league system. Starting explicitly creates 140 new random fighters, randomly distributed into seven named leagues of 20. It retains unrelated saved fighters. Division and power tier are independent.

Choose 38-week double or 19-week single round-robin, Bo1/Bo3/Bo5 and arena conditions before starting. All seven divisions move through the same matchweek together. A series win earns three points; standings show points, W/L and game difference. Ties use points, game difference, game wins, then seeded season order.

The cycle is league season → seven division cups → interleague cup → explicit rollover. Each division cup uses all 20 fighters: four preliminary series and 12 proper byes reduce the field to 16. All cup grand finals are Bo5. The interleague cup takes each league and cup champion, substitutes the league runner-up for a double champion, then selects two distinct wildcards. Wildcards use best non-qualified league placement, points per series, game difference per series, game wins per series, then seeded order.

Watch or simulate the next series, simulate a matchweek or phase, finish a season, or pause after the current series. Worker simulation keeps the interface responsive and saves every completed series. Replays use original roster snapshots, per-series/game seeds and resolved conditions. A failed save can be retried without losing its completed simulation. A conflicting tab loads the latest committed world before play continues.

Rollover moves the top three in leagues 2–7 up and the bottom three in leagues 1–6 down simultaneously. Dawnrise's bottom five retire; two Legendary, two Unique (purple) and one Mythic replacement enter Dawnrise. Every new season has exactly 140 distinct members and 20 per division. Archives retain standings, series, champions, movements, retired fighters and replacements. Active league members are protected from ordinary individual and bulk removal.

League, division-cup and interleague titles have separate categories, current crowns, totals and streaks. W/L updates once per series. New upset stat awards are retired, including in resumed older cups; existing earned bonuses remain. The historical site-entry reset and rename triggers are disabled so entry cannot erase or rewrite existing records.

## Saves and large rosters

Pages still uses SQL.js SQLite in IndexedDB. The additive `0012_uneven_ink.sql` migration deduplicates old generation catalogs verbatim into shared pools, including custom catalogs. New manual and bulk saves also share identical catalogs; full details hydrate on demand. It preserves trait values, summaries, bonuses, timestamps, tournament history and championship records. Backups include worlds, archives, membership, operations and shared pools. Import migrates older backups and rejects missing catalogs, invalid membership and foreign owners before replacing the destination save.

League actions use revision checks and operation IDs. The revision claim, records, titles, replacements, archive and membership changes commit atomically. Retried actions cannot duplicate effects. Pages also retains its IndexedDB compare-and-swap and Web Locks protections for multiple tabs.

There is no fixed total-character or entrant cap. Bulk generation/removal remains batched, preserves settings when collapsed, and cannot collapse during active work. Saved cards render 80 at a time with Show more; series history renders 40 at a time. Extremely large tournaments remain subject to the existing save/request byte limits and available browser resources.

## Validation and deployment

Run with Node 24 (the existing server checks use `node:sqlite`):

```
npm ci
npm run build
npm run build:pages
node scripts/check-all.mjs
node scripts/audit-generation.mjs
node scripts/build-pages.mjs --output docs
```

`validation/checks.json` records the final check results. The full combat test completed a default double season: 2,808 actual series, 2,826 games, all 32 condition combinations, seven division cups, the interleague cup and deterministic final replays. Rule tests cover both season lengths × Bo1/3/5. Persistence tests cover a complete 1,478-series single season, 15 category awards, rollover and archive import/reopen through the real Pages backup bridge. Other checks cover migration/custom pools, retired bonuses, retry and duplicate prevention, competing tabs, ordinary arena fights, tournament formats, exact-category crowns, bulk controls and roster performance.

Browser checks exercised actual worker simulation, pause, watched league combat, reload and Show more (80 → 140 cards). Desktop 1440×1000 and mobile 390×844 were inspected, including document-width checks and an unobstructed mobile arena. No browser console errors were observed.

The delivered ZIP contains changed source, migration/schema metadata, tests, validation reports and the complete rebuilt `docs/` output, preserving repository paths. It excludes dependencies and temporary artifacts. Apply it at the repository root. The Pages output is rebuilt, but no merge or deployment is performed by this task. Export a browser backup before changing the deployed files.

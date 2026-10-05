# Season 40 audit evidence

Read [`../../BALANCE-V10-40-SEASON-REVIEW.md`](../../BALANCE-V10-40-SEASON-REVIEW.md) for findings and proposed next-patch values. These files describe the released v10 engine and the supplied 40-season backup; they do not contain a v11 implementation.

| File | Contents |
| --- | --- |
| `review-summary.json` | Source SHA256, scope, integrity checks, population, career queue, style contrasts, title concentration and leading fighters' actual career dates. |
| `population-and-careers.csv` | Forty snapshots with roster quality, power prevalence, career eligibility, completed/deferred careers, draws and champions. |
| `leading-fighters.csv` | Twelve leading fighters, ranked by Premier titles, Crownfire titles, then total titles. |
| `counterfactual-summary.json` | All 50 power-removal comparisons, per-style breakdowns and four champions' eight-variant comparisons. |
| `power-ablations.csv` | Flat table of power contributions and whole-carrier bootstrap intervals. |
| `powers-adjusted-for-style.csv` | Descriptive power associations after stat/style adjustment; early means Seasons 1–20, late means Seasons 21–40. |
| `rollover-checks.json` | Exact reconstruction of all 40 next-season rosters and career transitions using the actual league engine. |

Rates are stored as fractions: multiply by 100 for percentages or percentage-point differences. `originalScore` and `removedScore` use win=1, draw=0.5, loss=0. They do not replace the league's 3/1/0 scoring. The bootstrap groups by distinct fighter, with 10,000 resamples; intervals are null/blank for a single carrier.

The paired sample preserves stats, seed, side, opponent and conditions. It samples up to 24 chronologically stratified league matches per power carrier and excludes opponents with the same power. It changes only the power trait, so it also changes shared cast selection and copying opportunities. Four champions have 160 Premier matches each and eight variants. All 8,560 baseline results match the saved results exactly; 20,960 simulations were performed in total. These are historical combat comparisons, not a benchmark of production save or simulation speed.

The association model is ridge-regularized logistic regression on decisive regular-season games, with five log-stat differences, five nonlinear stat terms, and additive arcane/ranged style differences (melee is the reference). It does not independently adjust every power, weapon, weakness or stat interaction. Its residuals must not be read as causal balance effects.

The SQLite backup, decoded rosters and large per-game tables are intentionally outside Git. Full local audit material is in `F:/Fateforged/balance-review-v10`, including extraction, analysis, rollover-reconstruction, paired-replay and aggregation scripts. The supplied backup was opened read-only and its SHA256 was verified unchanged after analysis.

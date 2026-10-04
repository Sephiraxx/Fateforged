# Fateforge Character Wheel

Fantasy character generator, saved roster, top-down combat arena and multi-stage tournaments.

Live site: https://fateforge-character-wheel.sephiraxx.chatgpt.site

## Source snapshot

Imported from the deployed Sites source commit `0336c2da7ff4b315ecb386a9d089a06dd6a28231`.
The repository contains the complete source, generated Worker, art assets, database schema and migration history, and regression checks.
Saved fighters, tournament results and account credentials live outside this repository. They remain in the existing hosted site's database.

## Build

Use Node.js 24, then run:

```sh
npm ci
npm run build
```

The build creates `dist/server/index.js`, a Cloudflare Worker with embedded frontend assets.

## Project layout

- `public/`: wheel, roster, arena, combat simulation, tournament logic and visual assets.
- `worker/`: APIs for saved characters, tournaments, champion history and match records.
- `db/schema.ts`: Drizzle schema for the Cloudflare D1 database.
- `drizzle/`: ordered SQL migrations and their metadata; preserve previously applied migrations.
- `scripts/`: build script and regression checks.
- `dist/`: built Worker and hosting configuration from the imported version.

## Check the core flows

```sh
npm run build
node scripts/check-wheel-ui.cjs
node scripts/check-arena-ui.mjs
node scripts/check-bulk-characters.mjs
node scripts/check-fighter-growth.mjs
node scripts/check-match-records.mjs
node scripts/check-tournament-names.mjs
node scripts/check-trait-details.mjs
node scripts/check-rewind.mjs
```

Database checks use in-memory SQLite. UI checks use a simulated DOM.

## Hosting

The current production site runs through Sites on Cloudflare Workers with a D1 binding named `DB`.
Its APIs rely on the authenticated `oai-authenticated-user-id` header supplied by the hosting system.
GitHub stores this code; pushing here does not automatically deploy or synchronize the hosted site.
GitHub Pages alone cannot run the Worker or persist D1 records. A separate hosting setup requires database migrations and an equivalent trusted authentication layer.

`worker/requested-reset.mjs` and the repair in `worker/tournament-names.mjs` are historical, owner-scoped, once-only maintenance actions. Their completion markers are already present in the existing production database. Review these actions before importing production data into a new database.

# Sprites

Put the sprite art from `ART-PROMPTS.md` here, named exactly as in its checklist, as `.webp` (preferred) or `.png`, for example `char-plate.webp` or `core-blue.webp`.

- Build still sprites (Cores, terrain, `pit-rim`, objective effects) with `node scripts/sprite-sheet.mjs --still <name> <image.png>`, which writes the WebP here at the right size (256 px, 512 px for `pit-rim`). Files over 400 KB are skipped by the build with a warning.
- The build lists the files it finds, and the enhanced renderer uses them. Anything missing keeps today's look: the class icons, sprite-sheet weapons, the drawn Cores and Titan, and the shaded rocks.
- Run `npm run build` (and `node scripts/build-pages.mjs` for GitHub Pages) after adding files.

## Team cast sheets

Animated sheets for the team cast are named `cast-<class>-<subclass>.webp` (for example `cast-mage-blood.webp`, 32 in all; see `ART-PROMPTS.md`). Build them from five row strips with `node scripts/sprite-sheet.mjs <Class> <Subclass> <folder>`, which writes the file here (every character at the same standing height), then check them with `node scripts/audit-sprites.mjs`. Sheets may be up to 2 MB.

## Spell effects

One short effect per subclass ability, drawn in that character's colours, named `fx-<subclass>-<ability id>.webp` (for example `fx-blood-bloodBolt.webp`, 64 in all). Build each from a 4-frame strip with `node scripts/sprite-sheet.mjs --fx <subclass> <ability id> <strip.png>`.

## Core siege creatures

Animated sheets for the Forge Titan, the Ember Wisps and the summons: `creature-titan.webp`, `creature-wisp.webp`, `creature-beast.webp` and `creature-spirit.webp` (see `ART-PROMPTS.md`, "Core siege creatures"). Build each from its row strips with `node scripts/sprite-sheet.mjs --creature <sheet> <folder>` and check it with `node scripts/audit-sprites.mjs`. Sheets may be up to 2 MB.

# Sprites

Put the sprite art from `ART-PROMPTS.md` here, named exactly as in its checklist, as `.webp` (preferred) or `.png`, for example `char-plate.webp` or `titan-slam.webp`.

- Keep each file under 400 KB. Resize to 256 px (512 px for the Titan sprites and `pit-rim`) and export as WebP, for example with squoosh.app. Larger files are skipped by the build with a warning.
- The build lists the files it finds, and the enhanced renderer uses them. Anything missing keeps today's look: the class icons, sprite-sheet weapons, the drawn Cores and Titan, and the shaded rocks.
- Run `npm run build` (and `node scripts/build-pages.mjs` for GitHub Pages) after adding files.

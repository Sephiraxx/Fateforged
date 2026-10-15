# Mage (Blood) sprite delivery

Finished game asset: `F:/Fateforged/public/sprites/cast-mage-blood.webp`.

1536 × 1280 WebP, 235186 bytes, transparent; six 256 px columns and five rows: idle 4, walk 6, attack 5, hit 2, down 4. Unused cells are empty.

Open `preview.html` to review all five animations at enlarged and game sizes. `enhanced-renderer-check.png` shows the sheet in the current game's Enhanced renderer.

## Reproduce

The original equal-column fallback clips these source rows because disconnected characters overlap in horizontal projection. `../sprite-workflow/scripts/assemble-connected.mjs` extracts connected figures and their antialiased edges, attaches nearby spell particles, normalizes standing rows by median figure height, and scales the collapse row separately. A final shared fit factor keeps every frame inside its cell. `assembly.json` stores the settings; `assembly-report.json` records every frame's bounds and scale.

Run from `F:/Fateforged/art/sprite-workflow`:

```powershell
node scripts/assemble-connected.mjs ../mage-blood
Copy-Item ../mage-blood/cast-mage-blood.webp ../../public/sprites/cast-mage-blood.webp
```

The assembler uses the installed Codex Playwright package and Microsoft Edge headlessly. Source PNGs and the original prompts are retained unchanged. No new generated artwork was required for this correction.

## Validation

- All 21 expected figures detected as separate connected components.
- Every nonempty output cell has transparent padding; all nine unused cells are empty.
- Output dimensions and 2 MB size limit pass.
- Current GitHub main was cloned into `../validation-game` because the original local project predates sprite-sheet rendering.
- `npm run build`, `node scripts/build-pages.mjs`, and `node scripts/build-pages.mjs --output docs` passed in that separate copy with this sheet.
- `scripts/check-pixi-arena.mjs` passed using the bundled current Node runtime (the system Node 20 is too old for `Object.groupBy`).
- `check-blood-sprite.mjs` rendered six Mage (Blood) fighters and exercised idle, walk, attack, hit, and down in the actual Enhanced renderer. The sheet returned HTTP 200; no browser page errors.

The main local project's older game code was not replaced. The finished sheet is saved locally, not committed or published to GitHub. The current validation game and its rebuilt Pages outputs are available under `../validation-game`.

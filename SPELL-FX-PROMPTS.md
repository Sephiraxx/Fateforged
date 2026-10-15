# Fateforge spell effects: GPT prompts

One effect per ability: 57 effects. Each is a short 4-frame animation that plays when the ability lands: on the enemy it hits, on the ally it helps, on the caster, or around the caster for area abilities. Each prompt is complete on its own; paste it exactly as written.

## How to use this

1. **One chat per class**, for example all the Mage effects in one chat. Effects of the same class then share a style. You can attach your character sheet's idle image as a style reference and say "match this art style"; the prompt still says to draw no character.
2. Paste a prompt, check the result (see below), and download it as `fx-<id>.png`, using the id from the heading (for example `fx-bloodBolt.png`).
3. **Build:** `node scripts/sprite-sheet.mjs --fx <id> <file.png>`, for example `node scripts/sprite-sheet.mjs --fx bloodBolt art/fx/fx-bloodBolt.png`. It writes `public/sprites/fx-<id>.webp` (4 frames of 256 px). Then rebuild (`npm run build`, `node scripts/build-pages.mjs`).
4. Any ability without an effect file keeps today's look, so add them in any order.

## Quick checks before you save

- The background is transparent.
- There are exactly 4 frames in one row, with space between them.
- There is no character or person, only the effect.
- The effect grows, peaks and fades across frames 1 to 4.
- There is no text, no numbers and no borders.

## Fix-up replies

- **A character appeared:** "Remove the character. Draw only the effect itself, centred where a character would stand. Transparent background."
- **Background not transparent:** "Remove the background completely; transparent PNG. Change nothing else."
- **Wrong number of frames:** "Redo it with exactly 4 frames in a single row, evenly spaced, with empty space between them."
- **Frames overlap or are cut off:** "Leave clear empty space between the frames and keep each fully inside the image; make the effect a little smaller."
- **Too busy to read small:** "Simplify it: fewer, bigger shapes and a stronger glow. It must read at 64 pixels."
- **No change across frames:** "Frame 1 small and faint, frame 2 growing, frame 3 biggest and brightest, frame 4 fading away."

---

## Assassin

### Death command: `fx-death` (Assassin (Executioner))
Plays on the enemy it hits. Save as `fx-death.png` · Build: `node scripts/sprite-sheet.mjs --fx death fx-death.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Death command: a grim skull-shaped wisp mark appearing above. Colours: bone white and dark violet. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Execute: `fx-execute` (Assassin (Executioner))
Plays on the enemy it hits. Save as `fx-execute.png` · Build: `node scripts/sprite-sheet.mjs --fx execute fx-execute.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Execute: a heavy downward blade slash with a dark impact. Colours: bone white and black. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Teleportation: `fx-teleport` (Assassin (Riftwalker))
Plays on the caster. Save as `fx-teleport.png` · Build: `node scripts/sprite-sheet.mjs --fx teleport fx-teleport.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Teleportation: a swirling indigo portal ring opening and snapping shut. Colours: indigo and violet. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Backstab: `fx-backstab` (Assassin (Shadowblade))
Plays on the enemy it hits. Save as `fx-backstab.png` · Build: `node scripts/sprite-sheet.mjs --fx backstab fx-backstab.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Backstab: a shadowy dagger slash X. Colours: violet-black and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Invisibility: `fx-invisible` (Assassin (Shadowblade))
Plays on the caster. Save as `fx-invisible.png` · Build: `node scripts/sprite-sheet.mjs --fx invisible fx-invisible.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Invisibility: dark smoke swirling closed, fading to nothing. Colours: violet-black smoke. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Shadowstep: `fx-shadowstep` (Assassin (Venomblade))
Plays on the enemy it hits. Save as `fx-shadowstep.png` · Build: `node scripts/sprite-sheet.mjs --fx shadowstep fx-shadowstep.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Shadowstep: a burst of shadow smoke with a fading silhouette outline (no detailed character). Colours: violet-black smoke. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Toxic blade: `fx-toxicBlade` (Assassin (Venomblade))
Plays on the enemy it hits. Save as `fx-toxicBlade.png` · Build: `node scripts/sprite-sheet.mjs --fx toxicBlade fx-toxicBlade.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Toxic blade: a poisoned slash leaving green droplets. Colours: toxic green and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Bard

### Discord: `fx-discord` (Bard (Maestro))
Plays on the enemy it hits. Save as `fx-discord.png` · Build: `node scripts/sprite-sheet.mjs --fx discord fx-discord.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Discord: clashing broken musical notes and jagged sound waves. Colours: plum and sickly yellow. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Haste: `fx-haste` (Bard (Maestro))
Plays on the ally it helps. Save as `fx-haste.png` · Build: `node scripts/sprite-sheet.mjs --fx haste fx-haste.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Haste: swirling wind streaks and a fast spiral. Colours: light plum and white. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Charm: `fx-charm` (Bard (Siren))
Plays on the enemy it hits. Save as `fx-charm.png` · Build: `node scripts/sprite-sheet.mjs --fx charm fx-charm.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Charm: floating pink hearts and a soft pull of glittering ribbons. Colours: soft pink and sea green. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Sound control: `fx-sound` (Bard (Siren))
Plays on the enemy it hits. Save as `fx-sound.png` · Build: `node scripts/sprite-sheet.mjs --fx sound fx-sound.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Sound control: concentric sound wave rings. Colours: sea green and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Battle hymn: `fx-battleHymn` (Bard (Skald))
Plays around the caster, as a wide area. Save as `fx-battleHymn.png` · Build: `node scripts/sprite-sheet.mjs --fx battleHymn fx-battleHymn.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Battle hymn: bronze sound rings and musical notes pulsing outward. Colours: bronze and gold. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

### War cry: `fx-warCry` (Bard (Skald))
Plays around the caster, as a wide area. Save as `fx-warCry.png` · Build: `node scripts/sprite-sheet.mjs --fx warCry fx-warCry.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: War cry: a bold shockwave of a war cry with jagged sound lines. Colours: bronze and orange. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

## Cleric

### Healing touch: `fx-healing` (Cleric (Light), Cleric (Mercy), Cleric (Ward))
Plays on the ally it helps. Save as `fx-healing.png` · Build: `node scripts/sprite-sheet.mjs --fx healing fx-healing.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Healing touch: soft healing light: a warm glow with small rising plus-shaped sparkles. Colours: warm gold and white. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Mending wave: `fx-mendingWave` (Cleric (Light))
Plays on the ally it helps. Save as `fx-mendingWave.png` · Build: `node scripts/sprite-sheet.mjs --fx mendingWave fx-mendingWave.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Mending wave: a gentle ring wave of healing light washing outward with soft sparkles. Colours: soft gold and white. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Resurrection: `fx-resurrection` (Cleric (Mercy))
Plays on the ally it helps. Save as `fx-resurrection.png` · Build: `node scripts/sprite-sheet.mjs --fx resurrection fx-resurrection.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Resurrection: a column of holy light descending from above with feathers of light swirling up. Colours: bright white and gold. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Barrier: `fx-barrier` (Cleric (Ward))
Plays on the ally it helps. Save as `fx-barrier.png` · Build: `node scripts/sprite-sheet.mjs --fx barrier fx-barrier.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Barrier: a translucent hexagon-patterned dome forming as a protective ward. Colours: pale ivory and soft blue-white. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

## Druid

### Bramble patch: `fx-bramble` (Druid (Forest))
Plays on the enemy it hits. Save as `fx-bramble.png` · Build: `node scripts/sprite-sheet.mjs --fx bramble fx-bramble.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Bramble patch: a patch of thorny brambles spreading across the ground. Colours: dark green thorns with brown. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Entangling roots: `fx-roots` (Druid (Forest))
Plays on the enemy it hits. Save as `fx-roots.png` · Build: `node scripts/sprite-sheet.mjs --fx roots fx-roots.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Entangling roots: thick roots bursting up from the ground and coiling tight. Colours: dark brown roots with moss green. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Life creation: `fx-life` (Druid (Grove))
Plays on the ally it helps. Save as `fx-life.png` · Build: `node scripts/sprite-sheet.mjs --fx life fx-life.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Life creation: a circle of glowing sprouts and flowers blooming from the ground. Colours: green and soft pink. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Regeneration: `fx-regeneration` (Druid (Grove))
Plays on the ally it helps. Save as `fx-regeneration.png` · Build: `node scripts/sprite-sheet.mjs --fx regeneration fx-regeneration.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Regeneration: green healing motes and small leaves spiralling upward. Colours: fresh leaf green. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Dream walking: `fx-dream` (Druid (Moon))
Plays on the enemy it hits. Save as `fx-dream.png` · Build: `node scripts/sprite-sheet.mjs --fx dream fx-dream.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Dream walking: drifting sleep mist with small stars and a crescent moon. Colours: lavender and pale silver. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Moonfire: `fx-moonfire` (Druid (Moon))
Plays on the enemy it hits. Save as `fx-moonfire.png` · Build: `node scripts/sprite-sheet.mjs --fx moonfire fx-moonfire.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Moonfire: a beam of pale moonlight striking down, leaving a silver flame. Colours: pale silver and soft blue-white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Guardian

### Aegis: `fx-aegisShield` (Guardian (Aegis))
Plays on the ally it helps. Save as `fx-aegisShield.png` · Build: `node scripts/sprite-sheet.mjs --fx aegisShield fx-aegisShield.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Aegis: a shining round shield sigil with a sun emblem forming. Colours: gold and white. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Force fields: `fx-force` (Guardian (Aegis))
Plays on the ally it helps. Save as `fx-force.png` · Build: `node scripts/sprite-sheet.mjs --fx force fx-force.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Force fields: a shimmering spherical force bubble. Colours: soft white-aqua (not strong cyan). Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Last stand: `fx-lastStand` (Guardian (Stoneguard))
Plays on the caster. Save as `fx-lastStand.png` · Build: `node scripts/sprite-sheet.mjs --fx lastStand fx-lastStand.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Last stand: a defiant amber aura flaring up around the body area. Colours: amber and gold. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Spirit armor: `fx-spiritArmor` (Guardian (Stoneguard))
Plays on the ally it helps. Save as `fx-spiritArmor.png` · Build: `node scripts/sprite-sheet.mjs --fx spiritArmor fx-spiritArmor.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Spirit armor: ghostly armour plates shimmering into place. Colours: pale blue-white spectral. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Knock-up: `fx-knockUp` (Guardian (Warden))
Plays on the enemy it hits. Save as `fx-knockUp.png` · Build: `node scripts/sprite-sheet.mjs --fx knockUp fx-knockUp.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Knock-up: an upward burst of rock and dust launching from the ground. Colours: grey stone and dust. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Mage

### Blood bolt: `fx-bloodBolt` (Mage (Blood))
Plays on the enemy it hits. Save as `fx-bloodBolt.png` · Build: `node scripts/sprite-sheet.mjs --fx bloodBolt fx-bloodBolt.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Blood bolt: a dark-red blood orb bursting with trailing red mist. Colours: crimson and dark red. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Venom craft: `fx-venom` (Mage (Blood))
Plays on the enemy it hits. Save as `fx-venom.png` · Build: `node scripts/sprite-sheet.mjs --fx venom fx-venom.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Venom craft: a splash of green venom with bubbling droplets. Colours: toxic green. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Arcane silence: `fx-silence` (Mage (Chrono), Assassin (Riftwalker))
Plays on the enemy it hits. Save as `fx-silence.png` · Build: `node scripts/sprite-sheet.mjs --fx silence fx-silence.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Arcane silence: a sealing rune circle with a closed-mouth glyph. Colours: indigo and pale violet. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Time slowing: `fx-time` (Mage (Chrono))
Plays on the enemy it hits. Save as `fx-time.png` · Build: `node scripts/sprite-sheet.mjs --fx time fx-time.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Time slowing: golden clock-face rings with slowing hands. Colours: brass gold. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Ember spark: `fx-ember` (Mage (Fire))
Plays on the enemy it hits. Save as `fx-ember.png` · Build: `node scripts/sprite-sheet.mjs --fx ember fx-ember.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Ember spark: a cluster of hot embers popping with small sparks. Colours: ember orange and yellow. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Fire control: `fx-fire` (Mage (Fire))
Plays on the enemy it hits. Save as `fx-fire.png` · Build: `node scripts/sprite-sheet.mjs --fx fire fx-fire.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Fire control: a burst of flames erupting. Colours: orange and yellow flame. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Frost touch: `fx-frostTouch` (Mage (Frost))
Plays on the enemy it hits. Save as `fx-frostTouch.png` · Build: `node scripts/sprite-sheet.mjs --fx frostTouch fx-frostTouch.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Frost touch: frost spreading in a ring of small ice shards and cold mist. Colours: pale blue and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Ice control: `fx-ice` (Mage (Frost))
Plays on the enemy it hits. Save as `fx-ice.png` · Build: `node scripts/sprite-sheet.mjs --fx ice fx-ice.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Ice control: jagged ice crystals bursting out. Colours: icy white and pale blue. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Paladin

### Smite: `fx-smite` (Paladin (Crusader))
Plays on the enemy it hits. Save as `fx-smite.png` · Build: `node scripts/sprite-sheet.mjs --fx smite fx-smite.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Smite: a radiant holy strike of light from above. Colours: gold and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Zeal: `fx-zeal` (Paladin (Crusader))
Plays on the caster. Save as `fx-zeal.png` · Build: `node scripts/sprite-sheet.mjs --fx zeal fx-zeal.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Zeal: a fiery golden aura flare with rising sparks. Colours: gold and orange. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Judgment: `fx-judgment` (Paladin (Justiciar))
Plays on the enemy it hits. Save as `fx-judgment.png` · Build: `node scripts/sprite-sheet.mjs --fx judgment fx-judgment.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Judgment: a glowing scales-of-justice sigil marking the target. Colours: deep blue and gold. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Blood control: `fx-blood` (Paladin (Oathbreaker), Warlock (Soulbinder))
Plays on the enemy it hits. Save as `fx-blood.png` · Build: `node scripts/sprite-sheet.mjs --fx blood fx-blood.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Blood control: swirling blood tendrils pulling inward. Colours: crimson. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Dread aura: `fx-dreadAura` (Paladin (Oathbreaker))
Plays around the caster, as a wide area. Save as `fx-dreadAura.png` · Build: `node scripts/sprite-sheet.mjs --fx dreadAura fx-dreadAura.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Dread aura: a dark expanding ring of dread smoke with faint skulls. Colours: ash grey and dark violet. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

## Ranger

### Beast command: `fx-beast` (Ranger (Beastmaster))
Plays on the enemy it hits. Save as `fx-beast.png` · Build: `node scripts/sprite-sheet.mjs --fx beast fx-beast.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Beast command: a ghostly wolf spirit pouncing through. Colours: teal-green spectral. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Aimed shot: `fx-aimedShot` (Ranger (Marksman), Ranger (Beastmaster))
Plays on the enemy it hits. Save as `fx-aimedShot.png` · Build: `node scripts/sprite-sheet.mjs --fx aimedShot fx-aimedShot.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Aimed shot: a sharp arrow impact with a crosshair flash. Colours: white and gold. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Chain shot: `fx-chainShot` (Ranger (Marksman))
Plays on the enemy it hits. Save as `fx-chainShot.png` · Build: `node scripts/sprite-sheet.mjs --fx chainShot fx-chainShot.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Chain shot: an arrow impact with crackling links of light jumping off. Colours: white and gold. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Crippling strike: `fx-cripplingStrike` (Ranger (Trapper))
Plays on the enemy it hits. Save as `fx-cripplingStrike.png` · Build: `node scripts/sprite-sheet.mjs --fx cripplingStrike fx-cripplingStrike.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Crippling strike: a low impact with a heavy chain and shackle flash at foot level. Colours: iron grey and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Disarm shot: `fx-disarmShot` (Ranger (Trapper))
Plays on the enemy it hits. Save as `fx-disarmShot.png` · Build: `node scripts/sprite-sheet.mjs --fx disarmShot fx-disarmShot.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Disarm shot: a sharp impact spark with a small spinning weapon silhouette knocked away. Colours: white and steel. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Warlock

### Curse: `fx-curse` (Warlock (Hexer))
Plays on the enemy it hits. Save as `fx-curse.png` · Build: `node scripts/sprite-sheet.mjs --fx curse fx-curse.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Curse: purple curse sigils circling and binding. Colours: purple. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Enfeeble: `fx-enfeeble` (Warlock (Hexer))
Plays on the enemy it hits. Save as `fx-enfeeble.png` · Build: `node scripts/sprite-sheet.mjs --fx enfeeble fx-enfeeble.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Enfeeble: a sagging grey-purple haze with drooping downward arrows. Colours: dull purple and grey. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Soul link: `fx-soulLink` (Warlock (Soulbinder))
Plays on the enemy it hits. Save as `fx-soulLink.png` · Build: `node scripts/sprite-sheet.mjs --fx soulLink fx-soulLink.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Soul link: ghostly chains linking outward from the centre. Colours: spectral blue-grey. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Dispel: `fx-dispel` (Warlock (Voidcaller))
Plays on the enemy it hits. Save as `fx-dispel.png` · Build: `node scripts/sprite-sheet.mjs --fx dispel fx-dispel.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Dispel: a shattering rune circle breaking into fragments. Colours: white and pale violet. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Singularity: `fx-singularity` (Warlock (Voidcaller))
Plays on the enemy it hits. Save as `fx-singularity.png` · Build: `node scripts/sprite-sheet.mjs --fx singularity fx-singularity.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Singularity: a swirling black-violet singularity pulling particles inward. Colours: black and void violet. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Warrior

### Charge: `fx-charge` (Warrior (Berserker))
Plays on the enemy it hits. Save as `fx-charge.png` · Build: `node scripts/sprite-sheet.mjs --fx charge fx-charge.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Charge: a dust burst and speed streaks from a rushing impact. Colours: dusty brown and white. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Cleave: `fx-cleave` (Warrior (Berserker))
Plays on the enemy it hits. Save as `fx-cleave.png` · Build: `node scripts/sprite-sheet.mjs --fx cleave fx-cleave.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Cleave: a wide curved slash arc of force. Colours: white and steel grey. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Driving strike: `fx-drivingStrike` (Warrior (Duelist))
Plays on the enemy it hits. Save as `fx-drivingStrike.png` · Build: `node scripts/sprite-sheet.mjs --fx drivingStrike fx-drivingStrike.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Driving strike: a piercing thrust impact with a sharp shock cone. Colours: white and steel blue. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Parry: `fx-parry` (Warrior (Duelist))
Plays on the caster. Save as `fx-parry.png` · Build: `node scripts/sprite-sheet.mjs --fx parry fx-parry.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Parry: a bright clash spark star from a deflected blade. Colours: white and gold. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Guard: `fx-guard` (Warrior (Vanguard))
Plays on the caster. Save as `fx-guard.png` · Build: `node scripts/sprite-sheet.mjs --fx guard fx-guard.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Guard: a raised spectral shield outline flashing in front. Colours: steel grey and white. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Taunt shout: `fx-tauntShout` (Warrior (Vanguard), Guardian (Warden), Paladin (Justiciar))
Plays around the caster, as a wide area. Save as `fx-tauntShout.png` · Build: `node scripts/sprite-sheet.mjs --fx tauntShout fx-tauntShout.png`

```
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: cel-shaded, bold readable shapes, a dark outline where useful, soft glow, light from the top-left, same look as a polished fantasy game. Must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of exactly 4 frames, left to right, evenly spaced, each in its own equal-width column with clear empty space between frames. Each frame is centred in its column. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Taunt shout: a bold shockwave ring of a battle shout with angry jagged lines. Colours: orange-red (not team red) and white. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

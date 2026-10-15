# Fateforge spell effects: GPT prompts

One effect per subclass ability: 64 effects. Each is a short 4-frame animation that plays when the ability lands: on the enemy it hits, on the ally it helps, on the caster, or around the caster for area abilities. Every effect is drawn for its own caster, so a shared ability (for example Taunt shout, used by the Vanguard, the Warden and the Justiciar) has one effect per subclass, each in that character's colours.

## How to use this

1. **One chat per character.** Attach that character's `attack.png` (from `art/<class>-<subclass>/`, the row you made for its sheet) before pasting each of its prompts. The prompt tells GPT to copy the colours and magic from it without drawing the character.
2. Paste the prompt exactly as written, check the result (see below), and download it as `fx-<subclass>-<ability>.png`, using the name in the heading (for example `fx-blood-bloodBolt.png`).
3. **Build:** `node scripts/sprite-sheet.mjs --fx <subclass> <ability> <file.png>`, for example `node scripts/sprite-sheet.mjs --fx Blood bloodBolt art/fx/fx-blood-bloodBolt.png`. It writes `public/sprites/fx-blood-bloodBolt.webp` (4 frames of 256 px, one scale, each frame centred). Then check it with `node scripts/audit-sprites.mjs` and rebuild (`npm run build`, `node scripts/build-pages.mjs`).
4. Any effect without a file keeps today's look, so add them in any order.

## Quick checks before you save

- The background is transparent.
- There are exactly 4 frames in one row, with wide space between them and nothing cut off: no boxes, panels or circles around the frames, and no straight edges.
- There is no character or person, only the effect.
- The colours and magic match the character's attack row.
- The effect grows, peaks and fades across frames 1 to 4.
- There is no text, no numbers and no borders.

## Fix-up replies

- **A character appeared:** "Remove the character. Draw only the effect itself, centred where a character would stand. Transparent background."
- **Frames in boxes or cut off:** "Redo it as a brand-new image with no boxes, panels or circles: four separate effects floating on one transparent canvas, nothing cropped, wide gaps between them."
- **Background not transparent:** "Remove the background completely; transparent PNG. Change nothing else."
- **Wrong number of frames:** "Redo it with exactly 4 frames in a single row, evenly spaced, with empty space between them."
- **Colours don't match the character:** "Use exactly the colours and glow of the attached character's magic."
- **Too busy to read small:** "Simplify it: fewer, bigger shapes and a stronger glow. It must read at 64 pixels."
- **No change across frames:** "Frame 1 small and faint, frame 2 growing, frame 3 biggest and brightest, frame 4 fading away."

---

## Cleric

### Cleric (Light)
Attach `art/cleric-light/attack.png` to every prompt in this section.

#### Healing touch: `fx-light-healing`
Plays on the ally it helps. Save as `fx-light-healing.png` · Build: `node scripts/sprite-sheet.mjs --fx Light healing fx-light-healing.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a cleric (light subclass): golden sunlight from a sun-topped staff, gold and white sparkles. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Healing touch: warm golden sunlight motes and a small radiant sun-star blooming over the ally. Colours: warm gold and white, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Mending wave: `fx-light-mendingWave`
Plays on the ally it helps. Save as `fx-light-mendingWave.png` · Build: `node scripts/sprite-sheet.mjs --fx Light mendingWave fx-light-mendingWave.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a cleric (light subclass): golden sunlight from a sun-topped staff, gold and white sparkles. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Mending wave: a ring of golden sunlight washing outward with small sun-star sparkles. Colours: warm gold and white, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Cleric (Mercy)
Attach `art/cleric-mercy/attack.png` to every prompt in this section.

#### Healing touch: `fx-mercy-healing`
Plays on the ally it helps. Save as `fx-mercy-healing.png` · Build: `node scripts/sprite-sheet.mjs --fx Mercy healing fx-mercy-healing.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a cleric (mercy subclass): soft silver-white holy light from a holy-water sprinkler, small silver sparkles. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Healing touch: a gentle sprinkle of glowing holy-water droplets falling with small silver cross glints. Colours: silver-white and pale gold, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Resurrection: `fx-mercy-resurrection`
Plays on the ally it helps. Save as `fx-mercy-resurrection.png` · Build: `node scripts/sprite-sheet.mjs --fx Mercy resurrection fx-mercy-resurrection.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a cleric (mercy subclass): soft silver-white holy light from a holy-water sprinkler, small silver sparkles. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Resurrection: a soft column of silver-white light descending, with drifting holy-water droplets and a small cross of light. Colours: silver-white and pale gold, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Cleric (Ward)
Attach `art/cleric-ward/attack.png` to every prompt in this section.

#### Barrier: `fx-ward-barrier`
Plays on the ally it helps. Save as `fx-ward-barrier.png` · Build: `node scripts/sprite-sheet.mjs --fx Ward barrier fx-ward-barrier.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a cleric (ward subclass): warm cream-gold light bubbles from a spellbook, armour and a round star-emblem shield. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Barrier: a translucent dome of cream-gold hexagon panels with a small star emblem at the top. Colours: cream and warm gold, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Healing touch: `fx-ward-healing`
Plays on the ally it helps. Save as `fx-ward-healing.png` · Build: `node scripts/sprite-sheet.mjs --fx Ward healing fx-ward-healing.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a cleric (ward subclass): warm cream-gold light bubbles from a spellbook, armour and a round star-emblem shield. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Healing touch: soft cream-gold light bubbles rising and popping into sparkles. Colours: cream and warm gold, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

## Druid

### Druid (Grove)
Attach `art/druid-grove/attack.png` to every prompt in this section.

#### Regeneration: `fx-grove-regeneration`
Plays on the ally it helps. Save as `fx-grove-regeneration.png` · Build: `node scripts/sprite-sheet.mjs --fx Grove regeneration fx-grove-regeneration.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a druid (grove subclass): light-green motes and small leaves from a leafy staff. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Regeneration: light-green motes and small fresh leaves spiralling upward. Colours: fresh leaf green, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Life creation: `fx-grove-life`
Plays on the ally it helps. Save as `fx-grove-life.png` · Build: `node scripts/sprite-sheet.mjs --fx Grove life fx-grove-life.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a druid (grove subclass): light-green motes and small leaves from a leafy staff. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Life creation: a ring of fresh green shoots and small white flowers blooming from the ground. Colours: leaf green and white, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Druid (Forest)
Attach `art/druid-forest/attack.png` to every prompt in this section.

#### Entangling roots: `fx-forest-roots`
Plays on the enemy it hits. Save as `fx-forest-roots.png` · Build: `node scripts/sprite-sheet.mjs --fx Forest roots fx-forest-roots.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a druid (forest subclass): bright green magic and twisting wooden tendrils from a gnarled staff with a green gem. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Entangling roots: twisted brown roots with glowing green veins bursting up and coiling tight. Colours: bark brown and bright green, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Bramble patch: `fx-forest-bramble`
Plays on the enemy it hits. Save as `fx-forest-bramble.png` · Build: `node scripts/sprite-sheet.mjs --fx Forest bramble fx-forest-bramble.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a druid (forest subclass): bright green magic and twisting wooden tendrils from a gnarled staff with a green gem. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Bramble patch: a patch of thorny brambles with glowing green buds spreading across the ground. Colours: dark green and bark brown, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Druid (Moon)
Attach `art/druid-moon/attack.png` to every prompt in this section.

#### Dream walking: `fx-moon-dream`
Plays on the enemy it hits. Save as `fx-moon-dream.png` · Build: `node scripts/sprite-sheet.mjs --fx Moon dream fx-moon-dream.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a druid (moon subclass): a glowing lavender-blue crescent-moon orb with soft trails. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Dream walking: drifting lavender sleep mist with small crescent moons and stars circling. Colours: lavender and pale silver, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Moonfire: `fx-moon-moonfire`
Plays on the enemy it hits. Save as `fx-moon-moonfire.png` · Build: `node scripts/sprite-sheet.mjs --fx Moon moonfire fx-moon-moonfire.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a druid (moon subclass): a glowing lavender-blue crescent-moon orb with soft trails. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Moonfire: a pale lavender-blue crescent-moon beam striking down, leaving silver-blue flames. Colours: lavender-blue and silver, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Warrior

### Warrior (Vanguard)
Attach `art/warrior-vanguard/attack.png` to every prompt in this section.

#### Guard: `fx-vanguard-guard`
Plays on the caster. Save as `fx-vanguard-guard.png` · Build: `node scripts/sprite-sheet.mjs --fx Vanguard guard fx-vanguard-guard.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warrior (vanguard subclass): steel plate, a navy tabard with a silver fleur-de-lis, a tower shield and a longsword. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Guard: a spectral navy-blue tower-shield outline with a silver fleur-de-lis flashing in front. Colours: navy blue and steel silver, the same tones as the attached character's magic. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Taunt shout: `fx-vanguard-tauntShout`
Plays around the caster, as a wide area. Save as `fx-vanguard-tauntShout.png` · Build: `node scripts/sprite-sheet.mjs --fx Vanguard tauntShout fx-vanguard-tauntShout.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warrior (vanguard subclass): steel plate, a navy tabard with a silver fleur-de-lis, a tower shield and a longsword. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Taunt shout: a bold navy-and-steel shockwave ring with jagged shout lines. Colours: navy blue and steel silver, the same tones as the attached character's magic. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide flat ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

### Warrior (Berserker)
Attach `art/warrior-berserker/attack.png` to every prompt in this section.

#### Cleave: `fx-berserker-cleave`
Plays on the enemy it hits. Save as `fx-berserker-cleave.png` · Build: `node scripts/sprite-sheet.mjs --fx Berserker cleave fx-berserker-cleave.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warrior (berserker subclass): a huge greataxe, fur and rust-orange cloth. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Cleave: a wide heavy greataxe arc slash. Colours: rust orange and steel, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Charge: `fx-berserker-charge`
Plays on the enemy it hits. Save as `fx-berserker-charge.png` · Build: `node scripts/sprite-sheet.mjs --fx Berserker charge fx-berserker-charge.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warrior (berserker subclass): a huge greataxe, fur and rust-orange cloth. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Charge: rust-orange speed streaks and a burst of dust from a rushing impact. Colours: rust orange and dusty brown, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Warrior (Duelist)
Attach `art/warrior-duelist/attack.png` to every prompt in this section.

#### Parry: `fx-duelist-parry`
Plays on the caster. Save as `fx-duelist-parry.png` · Build: `node scripts/sprite-sheet.mjs --fx Duelist parry fx-duelist-parry.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warrior (duelist subclass): a thin rapier, a wine-red cape and a plumed hat. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Parry: a bright silver clash spark star with a thin rapier flash. Colours: silver and wine red, the same tones as the attached character's magic. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Driving strike: `fx-duelist-drivingStrike`
Plays on the enemy it hits. Save as `fx-duelist-drivingStrike.png` · Build: `node scripts/sprite-sheet.mjs --fx Duelist drivingStrike fx-duelist-drivingStrike.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warrior (duelist subclass): a thin rapier, a wine-red cape and a plumed hat. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Driving strike: a needle-thin rapier thrust line with a sharp silver shock cone. Colours: silver and wine red, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Guardian

### Guardian (Stoneguard)
Attach `art/guardian-stoneguard/attack.png` to every prompt in this section.

#### Last stand: `fx-stoneguard-lastStand`
Plays on the caster. Save as `fx-stoneguard-lastStand.png` · Build: `node scripts/sprite-sheet.mjs --fx Stoneguard lastStand fx-stoneguard-lastStand.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a guardian (stoneguard subclass): granite stone armour cracked with glowing amber runes, a stone warhammer. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Last stand: glowing amber rune cracks flaring in an aura while small stone chips rise. Colours: amber glow and granite grey, the same tones as the attached character's magic. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Spirit armor: `fx-stoneguard-spiritArmor`
Plays on the ally it helps. Save as `fx-stoneguard-spiritArmor.png` · Build: `node scripts/sprite-sheet.mjs --fx Stoneguard spiritArmor fx-stoneguard-spiritArmor.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a guardian (stoneguard subclass): granite stone armour cracked with glowing amber runes, a stone warhammer. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Spirit armor: floating granite plates etched with glowing amber runes locking into place around the ally. Colours: granite grey and amber glow, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Guardian (Warden)
Attach `art/guardian-warden/attack.png` to every prompt in this section.

#### Knock-up: `fx-warden-knockUp`
Plays on the enemy it hits. Save as `fx-warden-knockUp.png` · Build: `node scripts/sprite-sheet.mjs --fx Warden knockUp fx-warden-knockUp.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a guardian (warden subclass): dark iron plate, a horned helm, a spiked flanged mace and a round iron shield. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Knock-up: a burst of dark rock and dust launched upward from a heavy mace impact crack in the ground. Colours: iron grey and dust brown, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Taunt shout: `fx-warden-tauntShout`
Plays around the caster, as a wide area. Save as `fx-warden-tauntShout.png` · Build: `node scripts/sprite-sheet.mjs --fx Warden tauntShout fx-warden-tauntShout.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a guardian (warden subclass): dark iron plate, a horned helm, a spiked flanged mace and a round iron shield. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Taunt shout: a dark iron-grey shockwave ring with jagged lines and swinging chain links. Colours: dark iron grey and dull red, the same tones as the attached character's magic. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide flat ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

### Guardian (Aegis)
Attach `art/guardian-aegis/attack.png` to every prompt in this section.

#### Aegis: `fx-aegis-aegisShield`
Plays on the ally it helps. Save as `fx-aegis-aegisShield.png` · Build: `node scripts/sprite-sheet.mjs --fx Aegis aegisShield fx-aegis-aegisShield.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a guardian (aegis subclass): polished silver plate, a white cape and a kite shield with a glowing sun emblem. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Aegis: a shining kite-shield sigil with a glowing sun emblem forming over the ally. Colours: silver, white and soft gold, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Force fields: `fx-aegis-force`
Plays on the ally it helps. Save as `fx-aegis-force.png` · Build: `node scripts/sprite-sheet.mjs --fx Aegis force fx-aegis-force.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a guardian (aegis subclass): polished silver plate, a white cape and a kite shield with a glowing sun emblem. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Force fields: a shimmering white bubble with a faint glowing sun emblem on top. Colours: white and soft gold, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

## Mage

### Mage (Fire)
Attach `art/mage-fire/attack.png` to every prompt in this section.

#### Fire control: `fx-fire-fire`
Plays on the enemy it hits. Save as `fx-fire-fire.png` · Build: `node scripts/sprite-sheet.mjs --fx Fire fire fx-fire-fire.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (fire subclass): a flame-topped staff and orange-yellow fireballs. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Fire control: an orange-yellow fireball bursting into flames. Colours: orange and yellow flame, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Ember spark: `fx-fire-ember`
Plays on the enemy it hits. Save as `fx-fire-ember.png` · Build: `node scripts/sprite-sheet.mjs --fx Fire ember fx-fire-ember.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (fire subclass): a flame-topped staff and orange-yellow fireballs. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Ember spark: a cluster of hot embers popping with small flame sparks. Colours: ember orange and yellow, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Mage (Blood)
Attach `art/mage-blood/attack.png` to every prompt in this section.

#### Blood bolt: `fx-blood-bloodBolt`
Plays on the enemy it hits. Save as `fx-blood-bloodBolt.png` · Build: `node scripts/sprite-sheet.mjs --fx Blood bloodBolt fx-blood-bloodBolt.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (blood subclass): a red crystal staff and a dark-red blood orb with red mist. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Blood bolt: a dark-red blood orb bursting with red mist and droplets. Colours: crimson and dark red, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Venom craft: `fx-blood-venom`
Plays on the enemy it hits. Save as `fx-blood-venom.png` · Build: `node scripts/sprite-sheet.mjs --fx Blood venom fx-blood-venom.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (blood subclass): a red crystal staff and a dark-red blood orb with red mist. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Venom craft: a splash of dark blood-red venom with black droplets and a faint sickly sheen. Colours: dark crimson and black, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Mage (Frost)
Attach `art/mage-frost/attack.png` to every prompt in this section.

#### Ice control: `fx-frost-ice`
Plays on the enemy it hits. Save as `fx-frost-ice.png` · Build: `node scripts/sprite-sheet.mjs --fx Frost ice fx-frost-ice.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (frost subclass): an ice-crystal wand and a pale-blue ice shard spear with frost mist. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Ice control: jagged pale-blue ice crystals bursting out from a shard impact. Colours: icy white and pale blue, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Frost touch: `fx-frost-frostTouch`
Plays on the enemy it hits. Save as `fx-frost-frostTouch.png` · Build: `node scripts/sprite-sheet.mjs --fx Frost frostTouch fx-frost-frostTouch.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (frost subclass): an ice-crystal wand and a pale-blue ice shard spear with frost mist. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Frost touch: frost spreading in a ring of small ice shards, snowflakes and cold mist. Colours: pale blue and white, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Mage (Chrono)
Attach `art/mage-chrono/attack.png` to every prompt in this section.

#### Time slowing: `fx-chrono-time`
Plays on the enemy it hits. Save as `fx-chrono-time.png` · Build: `node scripts/sprite-sheet.mjs --fx Chrono time fx-chrono-time.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (chrono subclass): a golden armillary orb and a golden clock-face projectile. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Time slowing: golden clock-face rings with hands slowing down. Colours: brass gold and deep navy, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Arcane silence: `fx-chrono-silence`
Plays on the enemy it hits. Save as `fx-chrono-silence.png` · Build: `node scripts/sprite-sheet.mjs --fx Chrono silence fx-chrono-silence.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a mage (chrono subclass): a golden armillary orb and a golden clock-face projectile. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Arcane silence: a golden clockwork seal ring with a closed-mouth glyph in the middle. Colours: brass gold and deep navy, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Ranger

### Ranger (Marksman)
Attach `art/ranger-marksman/attack.png` to every prompt in this section.

#### Aimed shot: `fx-marksman-aimedShot`
Plays on the enemy it hits. Save as `fx-marksman-aimedShot.png` · Build: `node scripts/sprite-sheet.mjs --fx Marksman aimedShot fx-marksman-aimedShot.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a ranger (marksman subclass): a longbow and plain wooden arrows, a forest-green hooded coat. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Aimed shot: a sharp wooden arrow impact with a small crosshair flash. Colours: forest green, white and wood brown, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Chain shot: `fx-marksman-chainShot`
Plays on the enemy it hits. Save as `fx-marksman-chainShot.png` · Build: `node scripts/sprite-sheet.mjs --fx Marksman chainShot fx-marksman-chainShot.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a ranger (marksman subclass): a longbow and plain wooden arrows, a forest-green hooded coat. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Chain shot: an arrow impact with crackling links of pale light jumping outward. Colours: forest green and white, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Ranger (Trapper)
Attach `art/ranger-trapper/attack.png` to every prompt in this section.

#### Crippling strike: `fx-trapper-cripplingStrike`
Plays on the enemy it hits. Save as `fx-trapper-cripplingStrike.png` · Build: `node scripts/sprite-sheet.mjs --fx Trapper cripplingStrike fx-trapper-cripplingStrike.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a ranger (trapper subclass): a crossbow, fur and leather. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Crippling strike: a crossbow bolt impact at foot level with an iron bear trap snapping shut. Colours: iron grey and leather brown, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Disarm shot: `fx-trapper-disarmShot`
Plays on the enemy it hits. Save as `fx-trapper-disarmShot.png` · Build: `node scripts/sprite-sheet.mjs --fx Trapper disarmShot fx-trapper-disarmShot.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a ranger (trapper subclass): a crossbow, fur and leather. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Disarm shot: a crossbow bolt spark with a small weapon silhouette knocked spinning away. Colours: iron grey and tan, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Ranger (Beastmaster)
Attach `art/ranger-beastmaster/attack.png` to every prompt in this section.

#### Beast command: `fx-beastmaster-beast`
Plays on the enemy it hits. Save as `fx-beastmaster-beast.png` · Build: `node scripts/sprite-sheet.mjs --fx Beastmaster beast fx-beastmaster-beast.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a ranger (beastmaster subclass): a glowing teal spirit bow and a teal spectral wolf. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Beast command: a glowing teal spirit wolf pouncing through. Colours: teal-green spectral glow, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Aimed shot: `fx-beastmaster-aimedShot`
Plays on the enemy it hits. Save as `fx-beastmaster-aimedShot.png` · Build: `node scripts/sprite-sheet.mjs --fx Beastmaster aimedShot fx-beastmaster-aimedShot.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a ranger (beastmaster subclass): a glowing teal spirit bow and a teal spectral wolf. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Aimed shot: a glowing teal spirit arrow impact with a crosshair flash. Colours: teal-green spectral glow, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Assassin

### Assassin (Shadowblade)
Attach `art/assassin-shadowblade/attack.png` to every prompt in this section.

#### Invisibility: `fx-shadowblade-invisible`
Plays on the caster. Save as `fx-shadowblade-invisible.png` · Build: `node scripts/sprite-sheet.mjs --fx Shadowblade invisible fx-shadowblade-invisible.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (shadowblade subclass): violet-glowing curved twin daggers trailing black smoke. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Invisibility: violet-black smoke swirling closed around the caster and fading to nothing. Colours: violet and black smoke, the same tones as the attached character's magic. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Backstab: `fx-shadowblade-backstab`
Plays on the enemy it hits. Save as `fx-shadowblade-backstab.png` · Build: `node scripts/sprite-sheet.mjs --fx Shadowblade backstab fx-shadowblade-backstab.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (shadowblade subclass): violet-glowing curved twin daggers trailing black smoke. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Backstab: a violet-glowing dagger X-slash with black smoke. Colours: violet glow and black, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Assassin (Riftwalker)
Attach `art/assassin-riftwalker/attack.png` to every prompt in this section.

#### Teleportation: `fx-riftwalker-teleport`
Plays on the caster. Save as `fx-riftwalker-teleport.png` · Build: `node scripts/sprite-sheet.mjs --fx Riftwalker teleport fx-riftwalker-teleport.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (riftwalker subclass): curved blades crackling with violet lightning, a hood with lightning marks. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Teleportation: a crackling violet lightning rift ring opening and snapping shut. Colours: electric violet and dark indigo, the same tones as the attached character's magic. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Arcane silence: `fx-riftwalker-silence`
Plays on the enemy it hits. Save as `fx-riftwalker-silence.png` · Build: `node scripts/sprite-sheet.mjs --fx Riftwalker silence fx-riftwalker-silence.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (riftwalker subclass): curved blades crackling with violet lightning, a hood with lightning marks. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Arcane silence: a violet lightning seal rune with a closed-mouth glyph. Colours: electric violet and dark indigo, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Assassin (Executioner)
Attach `art/assassin-executioner/attack.png` to every prompt in this section.

#### Death command: `fx-executioner-death`
Plays on the enemy it hits. Save as `fx-executioner-death.png` · Build: `node scripts/sprite-sheet.mjs --fx Executioner death fx-executioner-death.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (executioner subclass): a katana with cream-white slash trails, a black hood and a cream scarf. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Death command: a grim bone-white skull mark appearing above, with a fluttering cream ribbon wisp. Colours: bone white, cream and black, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Execute: `fx-executioner-execute`
Plays on the enemy it hits. Save as `fx-executioner-execute.png` · Build: `node scripts/sprite-sheet.mjs --fx Executioner execute fx-executioner-execute.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (executioner subclass): a katana with cream-white slash trails, a black hood and a cream scarf. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Execute: a heavy downward katana slash with a cream-white trail and a black impact. Colours: cream white and black, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Assassin (Venomblade)
Attach `art/assassin-venomblade/attack.png` to every prompt in this section.

#### Toxic blade: `fx-venomblade-toxicBlade`
Plays on the enemy it hits. Save as `fx-venomblade-toxicBlade.png` · Build: `node scripts/sprite-sheet.mjs --fx Venomblade toxicBlade fx-venomblade-toxicBlade.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (venomblade subclass): lime-green dripping toxic daggers and a green scarf. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Toxic blade: a lime-green poisoned dagger slash leaving dripping toxic droplets. Colours: lime green and dark green, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Shadowstep: `fx-venomblade-shadowstep`
Plays on the enemy it hits. Save as `fx-venomblade-shadowstep.png` · Build: `node scripts/sprite-sheet.mjs --fx Venomblade shadowstep fx-venomblade-shadowstep.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a assassin (venomblade subclass): lime-green dripping toxic daggers and a green scarf. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Shadowstep: a burst of dark smoke streaked with lime-green toxic mist around a fading outline (no detailed character). Colours: black smoke and lime green, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Bard

### Bard (Skald)
Attach `art/bard-skald/attack.png` to every prompt in this section.

#### Battle hymn: `fx-skald-battleHymn`
Plays around the caster, as a wide area. Save as `fx-skald-battleHymn.png` · Build: `node scripts/sprite-sheet.mjs --fx Skald battleHymn fx-skald-battleHymn.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a bard (skald subclass): a rune book, a drinking horn and golden rune sound rings. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Battle hymn: golden rune sound rings pulsing outward with small horn-blast notes. Colours: gold and bronze, the same tones as the attached character's magic. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide flat ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

#### War cry: `fx-skald-warCry`
Plays around the caster, as a wide area. Save as `fx-skald-warCry.png` · Build: `node scripts/sprite-sheet.mjs --fx Skald warCry fx-skald-warCry.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a bard (skald subclass): a rune book, a drinking horn and golden rune sound rings. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: War cry: a bold bronze shockwave with golden runes and jagged sound lines. Colours: bronze and gold, the same tones as the attached character's magic. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide flat ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

### Bard (Maestro)
Attach `art/bard-maestro/attack.png` to every prompt in this section.

#### Haste: `fx-maestro-haste`
Plays on the ally it helps. Save as `fx-maestro-haste.png` · Build: `node scripts/sprite-sheet.mjs --fx Maestro haste fx-maestro-haste.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a bard (maestro subclass): a conductor baton and pink-violet music notes. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Haste: pink-violet music staff lines and notes spiralling fast around the ally. Colours: plum and pink, the same tones as the attached character's magic. Plays on the ally it helps.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the ally stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

#### Discord: `fx-maestro-discord`
Plays on the enemy it hits. Save as `fx-maestro-discord.png` · Build: `node scripts/sprite-sheet.mjs --fx Maestro discord fx-maestro-discord.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a bard (maestro subclass): a conductor baton and pink-violet music notes. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Discord: clashing broken pink-violet notes and jagged sound waves. Colours: plum and sickly yellow, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Bard (Siren)
Attach `art/bard-siren/attack.png` to every prompt in this section.

#### Charm: `fx-siren-charm`
Plays on the enemy it hits. Save as `fx-siren-charm.png` · Build: `node scripts/sprite-sheet.mjs --fx Siren charm fx-siren-charm.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a bard (siren subclass): a pearl wand and aqua music notes and ripples. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Charm: aqua sound ripples with floating pink hearts and pearls drifting toward the centre. Colours: aqua and soft pink, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Sound control: `fx-siren-sound`
Plays on the enemy it hits. Save as `fx-siren-sound.png` · Build: `node scripts/sprite-sheet.mjs --fx Siren sound fx-siren-sound.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a bard (siren subclass): a pearl wand and aqua music notes and ripples. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Sound control: concentric aqua sound-wave rings with small notes. Colours: aqua and sea green, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

## Paladin

### Paladin (Crusader)
Attach `art/paladin-crusader/attack.png` to every prompt in this section.

#### Smite: `fx-crusader-smite`
Plays on the enemy it hits. Save as `fx-crusader-smite.png` · Build: `node scripts/sprite-sheet.mjs --fx Crusader smite fx-crusader-smite.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a paladin (crusader subclass): a longsword with radiant golden light slashes, gold-trimmed white armour. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Smite: a radiant golden light slash striking down from above. Colours: gold and white, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Zeal: `fx-crusader-zeal`
Plays on the caster. Save as `fx-crusader-zeal.png` · Build: `node scripts/sprite-sheet.mjs --fx Crusader zeal fx-crusader-zeal.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a paladin (crusader subclass): a longsword with radiant golden light slashes, gold-trimmed white armour. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Zeal: a fiery golden aura flare around the caster with rising gold sparks. Colours: gold and warm orange, the same tones as the attached character's magic. Plays on the caster.
ANIMATION: exactly 4 frames.
Frame 1: a faint glow appears at the centre.
Frame 2: the effect wraps around the centre where the caster stands (leave that spot empty).
Frame 3: brightest moment, with particles rising.
Frame 4: fading sparkles drifting up and disappearing.
```

### Paladin (Justiciar)
Attach `art/paladin-justiciar/attack.png` to every prompt in this section.

#### Judgment: `fx-justiciar-judgment`
Plays on the enemy it hits. Save as `fx-justiciar-judgment.png` · Build: `node scripts/sprite-sheet.mjs --fx Justiciar judgment fx-justiciar-judgment.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a paladin (justiciar subclass): a glowing golden sun-mace, dark navy and gold armour, a scales emblem. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Judgment: a glowing golden scales-of-justice sigil marking the target with a sun-mace flare. Colours: gold and deep navy, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Taunt shout: `fx-justiciar-tauntShout`
Plays around the caster, as a wide area. Save as `fx-justiciar-tauntShout.png` · Build: `node scripts/sprite-sheet.mjs --fx Justiciar tauntShout fx-justiciar-tauntShout.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a paladin (justiciar subclass): a glowing golden sun-mace, dark navy and gold armour, a scales emblem. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Taunt shout: a navy-and-gold shockwave ring with jagged lines. Colours: deep navy and gold, the same tones as the attached character's magic. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide flat ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

### Paladin (Oathbreaker)
Attach `art/paladin-oathbreaker/attack.png` to every prompt in this section.

#### Blood control: `fx-oathbreaker-blood`
Plays on the enemy it hits. Save as `fx-oathbreaker-blood.png` · Build: `node scripts/sprite-sheet.mjs --fx Oathbreaker blood fx-oathbreaker-blood.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a paladin (oathbreaker subclass): a black warhammer trailing grey smoke, black spiked armour. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Blood control: dark crimson life tendrils pulled out through grey-black smoke. Colours: dark crimson and ash grey, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Dread aura: `fx-oathbreaker-dreadAura`
Plays around the caster, as a wide area. Save as `fx-oathbreaker-dreadAura.png` · Build: `node scripts/sprite-sheet.mjs --fx Oathbreaker dreadAura fx-oathbreaker-dreadAura.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a paladin (oathbreaker subclass): a black warhammer trailing grey smoke, black spiked armour. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Dread aura: a dark ash-grey smoke ring expanding with faint skull shapes. Colours: ash grey and black, the same tones as the attached character's magic. Plays around the caster, as a wide area.
ANIMATION: exactly 4 frames.
Frame 1: a small pulse at the centre.
Frame 2: it expands outward as a wide flat ring.
Frame 3: widest and strongest moment.
Frame 4: fading ring dissolving at the edges.
```

## Warlock

### Warlock (Hexer)
Attach `art/warlock-hexer/attack.png` to every prompt in this section.

#### Curse: `fx-hexer-curse`
Plays on the enemy it hits. Save as `fx-hexer-curse.png` · Build: `node scripts/sprite-sheet.mjs --fx Hexer curse fx-hexer-curse.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warlock (hexer subclass): violet flames, a spellbook and a violet glyph circle. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Curse: a violet-flame glyph circle binding the target. Colours: violet and dark purple, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Enfeeble: `fx-hexer-enfeeble`
Plays on the enemy it hits. Save as `fx-hexer-enfeeble.png` · Build: `node scripts/sprite-sheet.mjs --fx Hexer enfeeble fx-hexer-enfeeble.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warlock (hexer subclass): violet flames, a spellbook and a violet glyph circle. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Enfeeble: a sagging purple-grey haze with drooping violet flames. Colours: dull purple and grey, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Warlock (Soulbinder)
Attach `art/warlock-soulbinder/attack.png` to every prompt in this section.

#### Soul link: `fx-soulbinder-soulLink`
Plays on the enemy it hits. Save as `fx-soulbinder-soulLink.png` · Build: `node scripts/sprite-sheet.mjs --fx Soulbinder soulLink fx-soulbinder-soulLink.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warlock (soulbinder subclass): a crystal orb with trapped spirits and pale blue-grey ghost chains with small skull-faced spirits. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Soul link: spectral blue-grey ghost chains with small skull-faced spirits linking outward from the centre. Colours: spectral blue-grey and pale white, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Soul drain: `fx-soulbinder-blood`
Plays on the enemy it hits. Save as `fx-soulbinder-blood.png` · Build: `node scripts/sprite-sheet.mjs --fx Soulbinder blood fx-soulbinder-blood.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warlock (soulbinder subclass): a crystal orb with trapped spirits and pale blue-grey ghost chains with small skull-faced spirits. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Soul drain: pale blue-white soul wisps drawn out of the centre and pulled away along a ghostly chain. Colours: spectral blue-grey and pale white, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

### Warlock (Voidcaller)
Attach `art/warlock-voidcaller/attack.png` to every prompt in this section.

#### Singularity: `fx-voidcaller-singularity`
Plays on the enemy it hits. Save as `fx-voidcaller-singularity.png` · Build: `node scripts/sprite-sheet.mjs --fx Voidcaller singularity fx-voidcaller-singularity.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warlock (voidcaller subclass): a black orb staff, a starry void-black robe and a swirling black-violet singularity. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Singularity: a swirling black-violet singularity speckled with tiny stars, pulling particles inward. Colours: black and void violet, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

#### Dispel: `fx-voidcaller-dispel`
Plays on the enemy it hits. Save as `fx-voidcaller-dispel.png` · Build: `node scripts/sprite-sheet.mjs --fx Voidcaller dispel fx-voidcaller-dispel.png`

```
REFERENCE: the attached image is the attack animation of the character who casts this effect, a warlock (voidcaller subclass): a black orb staff, a starry void-black robe and a swirling black-violet singularity. Match its art style, outline, colours, glow and magic exactly so the effect clearly belongs to this character, but do NOT draw the character.
Generate a brand-new image from scratch. Do not edit, trim or crop any earlier image.
Clean 2D game VISUAL EFFECT animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: the same art style as the attached character: bold dark outline where useful, cel shading, soft glow, light from the top-left. Bold readable shapes: it must read clearly when shrunk to about 64 pixels.
CAMERA: three-quarter view from slightly above (about 20 degrees).
EFFECT ONLY: do NOT draw any character, person, creature body or weapon (unless the description says so). Draw the effect as it would appear over a character standing in the middle of each frame.
FORMAT: ONE landscape image, 1536x1024, fully TRANSPARENT background. Draw exactly 4 separate effect frames in a single horizontal row, left to right, painted freely on the one transparent canvas with wide empty space around each. Do NOT put the frames in boxes, panels, tiles or circles, and do NOT crop any frame: every glow, spark and wisp must be complete, and no part of one frame may reach the next. Keep a clear margin at all four edges of the image.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a background, or UI.
EFFECT: Dispel: a starry violet rune circle shattering into black-violet shards. Colours: void violet and black, the same tones as the attached character's magic. Plays on the enemy it hits.
ANIMATION: exactly 4 frames.
Frame 1: the effect appears: small and faint at the centre.
Frame 2: it strikes or bursts outward, growing fast.
Frame 3: peak: the largest and brightest moment of the effect.
Frame 4: fading: thin wisps and particles dissolving away.
```

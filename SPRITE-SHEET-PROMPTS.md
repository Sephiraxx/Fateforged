# Fateforge team cast sprite sheets: GPT prompts

One prompt per message. Every prompt is complete on its own; paste it exactly as written.
There are 32 characters (one per subclass), each with 5 rows (idle, walk, attack, hit, down): 160 images.

## How to use this (read once)

1. **One chat per character.** Open a new ChatGPT chat for each character (for example "Mage (Blood)"), so earlier characters never leak into it.
2. **Row 1 (idle) first.** Paste the character's IDLE prompt. Regenerate until you like the character, then download it.
3. **Every later row:** attach the idle image you kept, then paste the next row's prompt. The prompts already tell GPT to copy the attached character exactly.
4. **Save the five images** in one folder per character, named exactly `idle.png`, `walk.png`, `attack.png`, `hit.png` and `down.png`. For example, `art/mage-blood/idle.png`.
5. **Build the sheet:** `node scripts/sprite-sheet.mjs Mage Blood art/mage-blood`. It writes `public/sprites/cast-mage-blood.webp`. Then run `npm run build` (and `node scripts/build-pages.mjs`), and watch a game with Enhanced graphics.
6. Do **Mage (Blood)** first, check it in the game, then the rest one character at a time.

You don't need to resize or crop anything: the build script finds each figure, scales the character to the same height as the rest of the cast and lines up the feet. Never crop the frames into boxes or tiles yourself: a frame cut by a straight edge shows that edge in the game, and `node scripts/audit-sprites.mjs` flags it.

## Quick checks before you save an image

- The background is transparent: no colour, no floor, no shadow.
- The number of figures is exactly right (4, 6, 5, 2 or 4), side by side in one row.
- The same character is in every frame, the same size, facing **right**.
- Nothing is cut off at the image edges, and no figure overlaps its neighbour.
- There is no text, no numbers, no frame borders and no grid lines.

## Fix-up replies (paste one if GPT gets something wrong)

- **Background not transparent:** "Remove the background completely. Transparent PNG, nothing behind the character, no floor, no shadow. Change nothing else."
- **Wrong number of frames:** "Redo it with exactly {N} frames, side by side in a single row, evenly spaced. Same character, same style."
- **Character changed between frames:** "The character must be identical in every frame: same face, outfit, colours, weapon and size. Redo it so all frames show exactly the attached character."
- **Facing left:** "Mirror it so the character faces RIGHT in every frame. Change nothing else."
- **Text, numbers or borders:** "Remove all text, numbers, labels, borders and grid lines. Transparent background only."
- **Frames overlap or are cut off:** "Leave clear empty space between the frames, and keep every frame fully inside the image. Make the character a little smaller if needed."
- **Too detailed to read when small:** "Simplify it: a bolder silhouette, a larger head and weapon, fewer small details, thicker outlines."
- **Feet at different heights:** "Put the feet on the same horizontal ground line in every frame."

---

## 1. Cleric (Light): `cast-cleric-light`

Folder: `art/cleric-light/` · Build: `node scripts/sprite-sheet.mjs Cleric Light art/cleric-light`

### Cleric (Light): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (light subclass) of a fantasy team battle. Look: white-and-gold priest robes, golden sun circlet, calm upright posture. Weapon: a staff topped with a radiant golden sun disc. Accent colour: gold.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Cleric (Light): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (light subclass) of a fantasy team battle. Look: white-and-gold priest robes, golden sun circlet, calm upright posture. Weapon: a staff topped with a radiant golden sun disc. Accent colour: gold.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Cleric (Light): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (light subclass) of a fantasy team battle. Look: white-and-gold priest robes, golden sun circlet, calm upright posture. Weapon: a staff topped with a radiant golden sun disc. Accent colour: gold.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: warm golden holy light taking shape.
Frame 4: arms thrust to the RIGHT, releasing warm golden holy light toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Cleric (Light): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (light subclass) of a fantasy team battle. Look: white-and-gold priest robes, golden sun circlet, calm upright posture. Weapon: a staff topped with a radiant golden sun disc. Accent colour: gold.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Cleric (Light): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (light subclass) of a fantasy team battle. Look: white-and-gold priest robes, golden sun circlet, calm upright posture. Weapon: a staff topped with a radiant golden sun disc. Accent colour: gold.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 2. Cleric (Mercy): `cast-cleric-mercy`

Folder: `art/cleric-mercy/` · Build: `node scripts/sprite-sheet.mjs Cleric Mercy art/cleric-mercy`

### Cleric (Mercy): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (mercy subclass) of a fantasy team battle. Look: soft grey-blue nun-like habit with hood, silver chain necklace, gentle posture. Weapon: a slim silver wand with a small white feather charm. Accent colour: pale silver.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Cleric (Mercy): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (mercy subclass) of a fantasy team battle. Look: soft grey-blue nun-like habit with hood, silver chain necklace, gentle posture. Weapon: a slim silver wand with a small white feather charm. Accent colour: pale silver.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Cleric (Mercy): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (mercy subclass) of a fantasy team battle. Look: soft grey-blue nun-like habit with hood, silver chain necklace, gentle posture. Weapon: a slim silver wand with a small white feather charm. Accent colour: pale silver.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: soft white healing glow taking shape.
Frame 4: arms thrust to the RIGHT, releasing soft white healing glow toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Cleric (Mercy): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (mercy subclass) of a fantasy team battle. Look: soft grey-blue nun-like habit with hood, silver chain necklace, gentle posture. Weapon: a slim silver wand with a small white feather charm. Accent colour: pale silver.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Cleric (Mercy): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (mercy subclass) of a fantasy team battle. Look: soft grey-blue nun-like habit with hood, silver chain necklace, gentle posture. Weapon: a slim silver wand with a small white feather charm. Accent colour: pale silver.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 3. Cleric (Ward): `cast-cleric-ward`

Folder: `art/cleric-ward/` · Build: `node scripts/sprite-sheet.mjs Cleric Ward art/cleric-ward`

### Cleric (Ward): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (ward subclass) of a fantasy team battle. Look: half-armoured cleric: white tabard over light chainmail, steel pauldrons. Weapon: a thick spellbook held open in one hand, a round sigil shield strapped to the back. Accent colour: ivory.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Cleric (Ward): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (ward subclass) of a fantasy team battle. Look: half-armoured cleric: white tabard over light chainmail, steel pauldrons. Weapon: a thick spellbook held open in one hand, a round sigil shield strapped to the back. Accent colour: ivory.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Cleric (Ward): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (ward subclass) of a fantasy team battle. Look: half-armoured cleric: white tabard over light chainmail, steel pauldrons. Weapon: a thick spellbook held open in one hand, a round sigil shield strapped to the back. Accent colour: ivory.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: pale ivory hexagon-pattern ward light taking shape.
Frame 4: arms thrust to the RIGHT, releasing pale ivory hexagon-pattern ward light toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Cleric (Ward): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (ward subclass) of a fantasy team battle. Look: half-armoured cleric: white tabard over light chainmail, steel pauldrons. Weapon: a thick spellbook held open in one hand, a round sigil shield strapped to the back. Accent colour: ivory.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Cleric (Ward): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a cleric (ward subclass) of a fantasy team battle. Look: half-armoured cleric: white tabard over light chainmail, steel pauldrons. Weapon: a thick spellbook held open in one hand, a round sigil shield strapped to the back. Accent colour: ivory.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 4. Druid (Grove): `cast-druid-grove`

Folder: `art/druid-grove/` · Build: `node scripts/sprite-sheet.mjs Druid Grove art/druid-grove`

### Druid (Grove): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (grove subclass) of a fantasy team battle. Look: robe made of leaves and bark, small antler crown, bare feet. Weapon: a wooden staff sprouting fresh green leaves at the top. Accent colour: leaf green.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Druid (Grove): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (grove subclass) of a fantasy team battle. Look: robe made of leaves and bark, small antler crown, bare feet. Weapon: a wooden staff sprouting fresh green leaves at the top. Accent colour: leaf green.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Druid (Grove): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (grove subclass) of a fantasy team battle. Look: robe made of leaves and bark, small antler crown, bare feet. Weapon: a wooden staff sprouting fresh green leaves at the top. Accent colour: leaf green.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: green healing motes and drifting leaves taking shape.
Frame 4: arms thrust to the RIGHT, releasing green healing motes and drifting leaves toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Druid (Grove): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (grove subclass) of a fantasy team battle. Look: robe made of leaves and bark, small antler crown, bare feet. Weapon: a wooden staff sprouting fresh green leaves at the top. Accent colour: leaf green.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Druid (Grove): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (grove subclass) of a fantasy team battle. Look: robe made of leaves and bark, small antler crown, bare feet. Weapon: a wooden staff sprouting fresh green leaves at the top. Accent colour: leaf green.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 5. Druid (Forest): `cast-druid-forest`

Folder: `art/druid-forest/` · Build: `node scripts/sprite-sheet.mjs Druid Forest art/druid-forest`

### Druid (Forest): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (forest subclass) of a fantasy team battle. Look: thorny bark armour, mossy hooded cloak. Weapon: a gnarled dark wooden staff wrapped in thorny vines. Accent colour: moss green.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Druid (Forest): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (forest subclass) of a fantasy team battle. Look: thorny bark armour, mossy hooded cloak. Weapon: a gnarled dark wooden staff wrapped in thorny vines. Accent colour: moss green.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Druid (Forest): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (forest subclass) of a fantasy team battle. Look: thorny bark armour, mossy hooded cloak. Weapon: a gnarled dark wooden staff wrapped in thorny vines. Accent colour: moss green.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: writhing vines and roots taking shape.
Frame 4: arms thrust to the RIGHT, releasing writhing vines and roots toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Druid (Forest): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (forest subclass) of a fantasy team battle. Look: thorny bark armour, mossy hooded cloak. Weapon: a gnarled dark wooden staff wrapped in thorny vines. Accent colour: moss green.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Druid (Forest): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (forest subclass) of a fantasy team battle. Look: thorny bark armour, mossy hooded cloak. Weapon: a gnarled dark wooden staff wrapped in thorny vines. Accent colour: moss green.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 6. Druid (Moon): `cast-druid-moon`

Folder: `art/druid-moon/` · Build: `node scripts/sprite-sheet.mjs Druid Moon art/druid-moon`

### Druid (Moon): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (moon subclass) of a fantasy team battle. Look: night-blue robe with silver crescent-moon patterns, owl-feather mantle. Weapon: a crystal orb glowing with pale moonlight, held in one hand. Accent colour: moon silver.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Druid (Moon): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (moon subclass) of a fantasy team battle. Look: night-blue robe with silver crescent-moon patterns, owl-feather mantle. Weapon: a crystal orb glowing with pale moonlight, held in one hand. Accent colour: moon silver.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Druid (Moon): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (moon subclass) of a fantasy team battle. Look: night-blue robe with silver crescent-moon patterns, owl-feather mantle. Weapon: a crystal orb glowing with pale moonlight, held in one hand. Accent colour: moon silver.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: pale silver moonlight taking shape.
Frame 4: arms thrust to the RIGHT, releasing pale silver moonlight toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Druid (Moon): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (moon subclass) of a fantasy team battle. Look: night-blue robe with silver crescent-moon patterns, owl-feather mantle. Weapon: a crystal orb glowing with pale moonlight, held in one hand. Accent colour: moon silver.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Druid (Moon): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a druid (moon subclass) of a fantasy team battle. Look: night-blue robe with silver crescent-moon patterns, owl-feather mantle. Weapon: a crystal orb glowing with pale moonlight, held in one hand. Accent colour: moon silver.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 7. Warrior (Vanguard): `cast-warrior-vanguard`

Folder: `art/warrior-vanguard/` · Build: `node scripts/sprite-sheet.mjs Warrior Vanguard art/warrior-vanguard`

### Warrior (Vanguard): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (vanguard subclass) of a fantasy team battle. Look: heavy steel plate armour, plumed helm, solid planted stance. Weapon: a longsword in the right hand and a tall rectangular tower shield in the left. Accent colour: steel blue-grey.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Warrior (Vanguard): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (vanguard subclass) of a fantasy team battle. Look: heavy steel plate armour, plumed helm, solid planted stance. Weapon: a longsword in the right hand and a tall rectangular tower shield in the left. Accent colour: steel blue-grey.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Warrior (Vanguard): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (vanguard subclass) of a fantasy team battle. Look: heavy steel plate armour, plumed helm, solid planted stance. Weapon: a longsword in the right hand and a tall rectangular tower shield in the left. Accent colour: steel blue-grey.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a sword thrust from behind the shield).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Warrior (Vanguard): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (vanguard subclass) of a fantasy team battle. Look: heavy steel plate armour, plumed helm, solid planted stance. Weapon: a longsword in the right hand and a tall rectangular tower shield in the left. Accent colour: steel blue-grey.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Warrior (Vanguard): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (vanguard subclass) of a fantasy team battle. Look: heavy steel plate armour, plumed helm, solid planted stance. Weapon: a longsword in the right hand and a tall rectangular tower shield in the left. Accent colour: steel blue-grey.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 8. Warrior (Berserker): `cast-warrior-berserker`

Folder: `art/warrior-berserker/` · Build: `node scripts/sprite-sheet.mjs Warrior Berserker art/warrior-berserker`

### Warrior (Berserker): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (berserker subclass) of a fantasy team battle. Look: bare muscular arms, fur mantle over the shoulders, war paint on the face, wild hair, leather kilt. Weapon: a huge two-handed greataxe. Accent colour: rust orange.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Warrior (Berserker): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (berserker subclass) of a fantasy team battle. Look: bare muscular arms, fur mantle over the shoulders, war paint on the face, wild hair, leather kilt. Weapon: a huge two-handed greataxe. Accent colour: rust orange.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Warrior (Berserker): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (berserker subclass) of a fantasy team battle. Look: bare muscular arms, fur mantle over the shoulders, war paint on the face, wild hair, leather kilt. Weapon: a huge two-handed greataxe. Accent colour: rust orange.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a wide overhead axe chop).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Warrior (Berserker): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (berserker subclass) of a fantasy team battle. Look: bare muscular arms, fur mantle over the shoulders, war paint on the face, wild hair, leather kilt. Weapon: a huge two-handed greataxe. Accent colour: rust orange.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Warrior (Berserker): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (berserker subclass) of a fantasy team battle. Look: bare muscular arms, fur mantle over the shoulders, war paint on the face, wild hair, leather kilt. Weapon: a huge two-handed greataxe. Accent colour: rust orange.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 9. Warrior (Duelist): `cast-warrior-duelist`

Folder: `art/warrior-duelist/` · Build: `node scripts/sprite-sheet.mjs Warrior Duelist art/warrior-duelist`

### Warrior (Duelist): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (duelist subclass) of a fantasy team battle. Look: fitted dark leather coat, short cape over one shoulder, feathered hat, elegant fencing stance. Weapon: a thin rapier in the right hand. Accent colour: wine red.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Warrior (Duelist): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (duelist subclass) of a fantasy team battle. Look: fitted dark leather coat, short cape over one shoulder, feathered hat, elegant fencing stance. Weapon: a thin rapier in the right hand. Accent colour: wine red.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Warrior (Duelist): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (duelist subclass) of a fantasy team battle. Look: fitted dark leather coat, short cape over one shoulder, feathered hat, elegant fencing stance. Weapon: a thin rapier in the right hand. Accent colour: wine red.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a quick forward lunge).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Warrior (Duelist): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (duelist subclass) of a fantasy team battle. Look: fitted dark leather coat, short cape over one shoulder, feathered hat, elegant fencing stance. Weapon: a thin rapier in the right hand. Accent colour: wine red.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Warrior (Duelist): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warrior (duelist subclass) of a fantasy team battle. Look: fitted dark leather coat, short cape over one shoulder, feathered hat, elegant fencing stance. Weapon: a thin rapier in the right hand. Accent colour: wine red.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 10. Guardian (Stoneguard): `cast-guardian-stoneguard`

Folder: `art/guardian-stoneguard/` · Build: `node scripts/sprite-sheet.mjs Guardian Stoneguard art/guardian-stoneguard`

### Guardian (Stoneguard): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (stoneguard subclass) of a fantasy team battle. Look: massive rune-carved stone-like armour with faintly glowing amber rune cracks, very broad silhouette. Weapon: a heavy warhammer and a tall tower shield. Accent colour: granite grey with amber glow.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Guardian (Stoneguard): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (stoneguard subclass) of a fantasy team battle. Look: massive rune-carved stone-like armour with faintly glowing amber rune cracks, very broad silhouette. Weapon: a heavy warhammer and a tall tower shield. Accent colour: granite grey with amber glow.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Guardian (Stoneguard): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (stoneguard subclass) of a fantasy team battle. Look: massive rune-carved stone-like armour with faintly glowing amber rune cracks, very broad silhouette. Weapon: a heavy warhammer and a tall tower shield. Accent colour: granite grey with amber glow.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a slow heavy hammer slam).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Guardian (Stoneguard): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (stoneguard subclass) of a fantasy team battle. Look: massive rune-carved stone-like armour with faintly glowing amber rune cracks, very broad silhouette. Weapon: a heavy warhammer and a tall tower shield. Accent colour: granite grey with amber glow.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Guardian (Stoneguard): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (stoneguard subclass) of a fantasy team battle. Look: massive rune-carved stone-like armour with faintly glowing amber rune cracks, very broad silhouette. Weapon: a heavy warhammer and a tall tower shield. Accent colour: granite grey with amber glow.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 11. Guardian (Warden): `cast-guardian-warden`

Folder: `art/guardian-warden/` · Build: `node scripts/sprite-sheet.mjs Guardian Warden art/guardian-warden`

### Guardian (Warden): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (warden subclass) of a fantasy team battle. Look: layered dark iron plate with hanging chains, horned helm. Weapon: a heavy flanged mace in the right hand and a round iron shield in the left. Accent colour: dark iron.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Guardian (Warden): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (warden subclass) of a fantasy team battle. Look: layered dark iron plate with hanging chains, horned helm. Weapon: a heavy flanged mace in the right hand and a round iron shield in the left. Accent colour: dark iron.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Guardian (Warden): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (warden subclass) of a fantasy team battle. Look: layered dark iron plate with hanging chains, horned helm. Weapon: a heavy flanged mace in the right hand and a round iron shield in the left. Accent colour: dark iron.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a shield bash followed by a mace swing).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Guardian (Warden): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (warden subclass) of a fantasy team battle. Look: layered dark iron plate with hanging chains, horned helm. Weapon: a heavy flanged mace in the right hand and a round iron shield in the left. Accent colour: dark iron.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Guardian (Warden): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (warden subclass) of a fantasy team battle. Look: layered dark iron plate with hanging chains, horned helm. Weapon: a heavy flanged mace in the right hand and a round iron shield in the left. Accent colour: dark iron.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 12. Guardian (Aegis): `cast-guardian-aegis`

Folder: `art/guardian-aegis/` · Build: `node scripts/sprite-sheet.mjs Guardian Aegis art/guardian-aegis`

### Guardian (Aegis): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (aegis subclass) of a fantasy team battle. Look: polished silver plate armour, white cape. Weapon: a longsword and a gleaming kite shield with a sun emblem. Accent colour: white-aqua shimmer (not strong cyan).
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Guardian (Aegis): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (aegis subclass) of a fantasy team battle. Look: polished silver plate armour, white cape. Weapon: a longsword and a gleaming kite shield with a sun emblem. Accent colour: white-aqua shimmer (not strong cyan).
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Guardian (Aegis): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (aegis subclass) of a fantasy team battle. Look: polished silver plate armour, white cape. Weapon: a longsword and a gleaming kite shield with a sun emblem. Accent colour: white-aqua shimmer (not strong cyan).
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a sword strike with a shimmering shield).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Guardian (Aegis): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (aegis subclass) of a fantasy team battle. Look: polished silver plate armour, white cape. Weapon: a longsword and a gleaming kite shield with a sun emblem. Accent colour: white-aqua shimmer (not strong cyan).
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Guardian (Aegis): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a guardian (aegis subclass) of a fantasy team battle. Look: polished silver plate armour, white cape. Weapon: a longsword and a gleaming kite shield with a sun emblem. Accent colour: white-aqua shimmer (not strong cyan).
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 13. Mage (Fire): `cast-mage-fire`

Folder: `art/mage-fire/` · Build: `node scripts/sprite-sheet.mjs Mage Fire art/mage-fire`

### Mage (Fire): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (fire subclass) of a fantasy team battle. Look: flame-trimmed dark red-orange robe, ember-coloured scarf, singed hems. Weapon: a staff whose head is a burning flame. Accent colour: flame orange.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Mage (Fire): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (fire subclass) of a fantasy team battle. Look: flame-trimmed dark red-orange robe, ember-coloured scarf, singed hems. Weapon: a staff whose head is a burning flame. Accent colour: flame orange.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Mage (Fire): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (fire subclass) of a fantasy team battle. Look: flame-trimmed dark red-orange robe, ember-coloured scarf, singed hems. Weapon: a staff whose head is a burning flame. Accent colour: flame orange.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: a fireball taking shape.
Frame 4: arms thrust to the RIGHT, releasing a fireball toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Mage (Fire): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (fire subclass) of a fantasy team battle. Look: flame-trimmed dark red-orange robe, ember-coloured scarf, singed hems. Weapon: a staff whose head is a burning flame. Accent colour: flame orange.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Mage (Fire): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (fire subclass) of a fantasy team battle. Look: flame-trimmed dark red-orange robe, ember-coloured scarf, singed hems. Weapon: a staff whose head is a burning flame. Accent colour: flame orange.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 14. Mage (Blood): `cast-mage-blood`

Folder: `art/mage-blood/` · Build: `node scripts/sprite-sheet.mjs Mage Blood art/mage-blood`

### Mage (Blood): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (blood subclass) of a fantasy team battle. Look: gaunt battle mage in deep crimson and black robes with bone clasps, pale skin, hollow cheeks. Weapon: a dark staff topped with a red crystal. Accent colour: crimson.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Mage (Blood): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (blood subclass) of a fantasy team battle. Look: gaunt battle mage in deep crimson and black robes with bone clasps, pale skin, hollow cheeks. Weapon: a dark staff topped with a red crystal. Accent colour: crimson.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Mage (Blood): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (blood subclass) of a fantasy team battle. Look: gaunt battle mage in deep crimson and black robes with bone clasps, pale skin, hollow cheeks. Weapon: a dark staff topped with a red crystal. Accent colour: crimson.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: a dark-red blood orb with trailing red mist taking shape.
Frame 4: arms thrust to the RIGHT, releasing a dark-red blood orb with trailing red mist toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Mage (Blood): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (blood subclass) of a fantasy team battle. Look: gaunt battle mage in deep crimson and black robes with bone clasps, pale skin, hollow cheeks. Weapon: a dark staff topped with a red crystal. Accent colour: crimson.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Mage (Blood): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (blood subclass) of a fantasy team battle. Look: gaunt battle mage in deep crimson and black robes with bone clasps, pale skin, hollow cheeks. Weapon: a dark staff topped with a red crystal. Accent colour: crimson.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 15. Mage (Frost): `cast-mage-frost`

Folder: `art/mage-frost/` · Build: `node scripts/sprite-sheet.mjs Mage Frost art/mage-frost`

### Mage (Frost): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (frost subclass) of a fantasy team battle. Look: pale blue-white robe with white fur trim, small icicle crown. Weapon: a wand tipped with a sharp ice shard. Accent colour: ice white.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Mage (Frost): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (frost subclass) of a fantasy team battle. Look: pale blue-white robe with white fur trim, small icicle crown. Weapon: a wand tipped with a sharp ice shard. Accent colour: ice white.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Mage (Frost): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (frost subclass) of a fantasy team battle. Look: pale blue-white robe with white fur trim, small icicle crown. Weapon: a wand tipped with a sharp ice shard. Accent colour: ice white.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: an ice shard and frost mist taking shape.
Frame 4: arms thrust to the RIGHT, releasing an ice shard and frost mist toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Mage (Frost): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (frost subclass) of a fantasy team battle. Look: pale blue-white robe with white fur trim, small icicle crown. Weapon: a wand tipped with a sharp ice shard. Accent colour: ice white.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Mage (Frost): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (frost subclass) of a fantasy team battle. Look: pale blue-white robe with white fur trim, small icicle crown. Weapon: a wand tipped with a sharp ice shard. Accent colour: ice white.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 16. Mage (Chrono): `cast-mage-chrono`

Folder: `art/mage-chrono/` · Build: `node scripts/sprite-sheet.mjs Mage Chrono art/mage-chrono`

### Mage (Chrono): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (chrono subclass) of a fantasy team battle. Look: brass-and-deep-blue robe, an hourglass hanging from the belt, small round spectacles. Weapon: a brass clockwork orb that floats above one hand. Accent colour: brass.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Mage (Chrono): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (chrono subclass) of a fantasy team battle. Look: brass-and-deep-blue robe, an hourglass hanging from the belt, small round spectacles. Weapon: a brass clockwork orb that floats above one hand. Accent colour: brass.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Mage (Chrono): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (chrono subclass) of a fantasy team battle. Look: brass-and-deep-blue robe, an hourglass hanging from the belt, small round spectacles. Weapon: a brass clockwork orb that floats above one hand. Accent colour: brass.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: golden clock-face rings of time magic taking shape.
Frame 4: arms thrust to the RIGHT, releasing golden clock-face rings of time magic toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Mage (Chrono): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (chrono subclass) of a fantasy team battle. Look: brass-and-deep-blue robe, an hourglass hanging from the belt, small round spectacles. Weapon: a brass clockwork orb that floats above one hand. Accent colour: brass.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Mage (Chrono): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a mage (chrono subclass) of a fantasy team battle. Look: brass-and-deep-blue robe, an hourglass hanging from the belt, small round spectacles. Weapon: a brass clockwork orb that floats above one hand. Accent colour: brass.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 17. Ranger (Marksman): `cast-ranger-marksman`

Folder: `art/ranger-marksman/` · Build: `node scripts/sprite-sheet.mjs Ranger Marksman art/ranger-marksman`

### Ranger (Marksman): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (marksman subclass) of a fantasy team battle. Look: long forest-green coat, hood up, leather bracers, focused calm face. Weapon: a tall wooden longbow with a quiver of arrows on the back. Accent colour: forest green.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Ranger (Marksman): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (marksman subclass) of a fantasy team battle. Look: long forest-green coat, hood up, leather bracers, focused calm face. Weapon: a tall wooden longbow with a quiver of arrows on the back. Accent colour: forest green.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Ranger (Marksman): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (marksman subclass) of a fantasy team battle. Look: long forest-green coat, hood up, leather bracers, focused calm face. Weapon: a tall wooden longbow with a quiver of arrows on the back. Accent colour: forest green.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: reaching back for an arrow.
Frame 2: nocking the arrow on the string.
Frame 3: drawing the string back.
Frame 4: full draw, aiming to the RIGHT.
Frame 5: release: string snapped forward, the arrow just leaving to the right.
```

### Ranger (Marksman): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (marksman subclass) of a fantasy team battle. Look: long forest-green coat, hood up, leather bracers, focused calm face. Weapon: a tall wooden longbow with a quiver of arrows on the back. Accent colour: forest green.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Ranger (Marksman): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (marksman subclass) of a fantasy team battle. Look: long forest-green coat, hood up, leather bracers, focused calm face. Weapon: a tall wooden longbow with a quiver of arrows on the back. Accent colour: forest green.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 18. Ranger (Trapper): `cast-ranger-trapper`

Folder: `art/ranger-trapper/` · Build: `node scripts/sprite-sheet.mjs Ranger Trapper art/ranger-trapper`

### Ranger (Trapper): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (trapper subclass) of a fantasy team battle. Look: patched brown leathers, fur-lined cap, practical boots. Weapon: a sturdy crossbow, with snares and metal spikes hanging from the belt. Accent colour: tan.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Ranger (Trapper): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (trapper subclass) of a fantasy team battle. Look: patched brown leathers, fur-lined cap, practical boots. Weapon: a sturdy crossbow, with snares and metal spikes hanging from the belt. Accent colour: tan.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Ranger (Trapper): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (trapper subclass) of a fantasy team battle. Look: patched brown leathers, fur-lined cap, practical boots. Weapon: a sturdy crossbow, with snares and metal spikes hanging from the belt. Accent colour: tan.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: crossbow lowered, reaching for a bolt.
Frame 2: loading the bolt into the crossbow.
Frame 3: raising the crossbow.
Frame 4: aiming to the RIGHT, eye along the crossbow.
Frame 5: firing: the bolt just leaving to the right, crossbow kicked up slightly.
```

### Ranger (Trapper): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (trapper subclass) of a fantasy team battle. Look: patched brown leathers, fur-lined cap, practical boots. Weapon: a sturdy crossbow, with snares and metal spikes hanging from the belt. Accent colour: tan.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Ranger (Trapper): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (trapper subclass) of a fantasy team battle. Look: patched brown leathers, fur-lined cap, practical boots. Weapon: a sturdy crossbow, with snares and metal spikes hanging from the belt. Accent colour: tan.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 19. Ranger (Beastmaster): `cast-ranger-beastmaster`

Folder: `art/ranger-beastmaster/` · Build: `node scripts/sprite-sheet.mjs Ranger Beastmaster art/ranger-beastmaster`

### Ranger (Beastmaster): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (beastmaster subclass) of a fantasy team battle. Look: fur hood with animal ears, leather and hide armour, tribal beads. Weapon: a glowing teal spirit bow, with a small ghostly spirit wolf standing at the heels (fully inside the same frame). Accent colour: teal-green.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Ranger (Beastmaster): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (beastmaster subclass) of a fantasy team battle. Look: fur hood with animal ears, leather and hide armour, tribal beads. Weapon: a glowing teal spirit bow, with a small ghostly spirit wolf standing at the heels (fully inside the same frame). Accent colour: teal-green.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Ranger (Beastmaster): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (beastmaster subclass) of a fantasy team battle. Look: fur hood with animal ears, leather and hide armour, tribal beads. Weapon: a glowing teal spirit bow, with a small ghostly spirit wolf standing at the heels (fully inside the same frame). Accent colour: teal-green.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: reaching back for an arrow.
Frame 2: nocking the arrow on the string.
Frame 3: drawing the string back.
Frame 4: full draw, aiming to the RIGHT.
Frame 5: release: string snapped forward, the arrow just leaving to the right (the spirit wolf leaps forward).
```

### Ranger (Beastmaster): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (beastmaster subclass) of a fantasy team battle. Look: fur hood with animal ears, leather and hide armour, tribal beads. Weapon: a glowing teal spirit bow, with a small ghostly spirit wolf standing at the heels (fully inside the same frame). Accent colour: teal-green.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Ranger (Beastmaster): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a ranger (beastmaster subclass) of a fantasy team battle. Look: fur hood with animal ears, leather and hide armour, tribal beads. Weapon: a glowing teal spirit bow, with a small ghostly spirit wolf standing at the heels (fully inside the same frame). Accent colour: teal-green.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 20. Assassin (Shadowblade): `cast-assassin-shadowblade`

Folder: `art/assassin-shadowblade/` · Build: `node scripts/sprite-sheet.mjs Assassin Shadowblade art/assassin-shadowblade`

### Assassin (Shadowblade): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (shadowblade subclass) of a fantasy team battle. Look: black hooded leathers, cloth mask over the lower face, smoky wisps at the edges. Weapon: twin curved daggers, one in each hand. Accent colour: violet-black.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Assassin (Shadowblade): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (shadowblade subclass) of a fantasy team battle. Look: black hooded leathers, cloth mask over the lower face, smoky wisps at the edges. Weapon: twin curved daggers, one in each hand. Accent colour: violet-black.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Assassin (Shadowblade): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (shadowblade subclass) of a fantasy team battle. Look: black hooded leathers, cloth mask over the lower face, smoky wisps at the edges. Weapon: twin curved daggers, one in each hand. Accent colour: violet-black.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a fast double-dagger stab from a crouch).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Assassin (Shadowblade): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (shadowblade subclass) of a fantasy team battle. Look: black hooded leathers, cloth mask over the lower face, smoky wisps at the edges. Weapon: twin curved daggers, one in each hand. Accent colour: violet-black.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Assassin (Shadowblade): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (shadowblade subclass) of a fantasy team battle. Look: black hooded leathers, cloth mask over the lower face, smoky wisps at the edges. Weapon: twin curved daggers, one in each hand. Accent colour: violet-black.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 21. Assassin (Riftwalker): `cast-assassin-riftwalker`

Folder: `art/assassin-riftwalker/` · Build: `node scripts/sprite-sheet.mjs Assassin Riftwalker art/assassin-riftwalker`

### Assassin (Riftwalker): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (riftwalker subclass) of a fantasy team battle. Look: dark leathers with glowing indigo rift seams along the arms, hood, faint portal sparks. Weapon: a short sword. Accent colour: indigo.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Assassin (Riftwalker): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (riftwalker subclass) of a fantasy team battle. Look: dark leathers with glowing indigo rift seams along the arms, hood, faint portal sparks. Weapon: a short sword. Accent colour: indigo.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Assassin (Riftwalker): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (riftwalker subclass) of a fantasy team battle. Look: dark leathers with glowing indigo rift seams along the arms, hood, faint portal sparks. Weapon: a short sword. Accent colour: indigo.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a lunge that bursts out of a small indigo portal).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Assassin (Riftwalker): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (riftwalker subclass) of a fantasy team battle. Look: dark leathers with glowing indigo rift seams along the arms, hood, faint portal sparks. Weapon: a short sword. Accent colour: indigo.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Assassin (Riftwalker): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (riftwalker subclass) of a fantasy team battle. Look: dark leathers with glowing indigo rift seams along the arms, hood, faint portal sparks. Weapon: a short sword. Accent colour: indigo.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 22. Assassin (Executioner): `cast-assassin-executioner`

Folder: `art/assassin-executioner/` · Build: `node scripts/sprite-sheet.mjs Assassin Executioner art/assassin-executioner`

### Assassin (Executioner): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (executioner subclass) of a fantasy team battle. Look: heavy dark hooded cloak, blank bone-white mask with no face. Weapon: a katana held in two hands. Accent colour: bone white.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Assassin (Executioner): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (executioner subclass) of a fantasy team battle. Look: heavy dark hooded cloak, blank bone-white mask with no face. Weapon: a katana held in two hands. Accent colour: bone white.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Assassin (Executioner): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (executioner subclass) of a fantasy team battle. Look: heavy dark hooded cloak, blank bone-white mask with no face. Weapon: a katana held in two hands. Accent colour: bone white.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a single decisive downward katana cut).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Assassin (Executioner): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (executioner subclass) of a fantasy team battle. Look: heavy dark hooded cloak, blank bone-white mask with no face. Weapon: a katana held in two hands. Accent colour: bone white.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Assassin (Executioner): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (executioner subclass) of a fantasy team battle. Look: heavy dark hooded cloak, blank bone-white mask with no face. Weapon: a katana held in two hands. Accent colour: bone white.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 23. Assassin (Venomblade): `cast-assassin-venomblade`

Folder: `art/assassin-venomblade/` · Build: `node scripts/sprite-sheet.mjs Assassin Venomblade art/assassin-venomblade`

### Assassin (Venomblade): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (venomblade subclass) of a fantasy team battle. Look: green-black wrapped leathers, glass vials of poison on the belt, scarf over the face. Weapon: two daggers dripping green venom. Accent colour: toxic green.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Assassin (Venomblade): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (venomblade subclass) of a fantasy team battle. Look: green-black wrapped leathers, glass vials of poison on the belt, scarf over the face. Weapon: two daggers dripping green venom. Accent colour: toxic green.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Assassin (Venomblade): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (venomblade subclass) of a fantasy team battle. Look: green-black wrapped leathers, glass vials of poison on the belt, scarf over the face. Weapon: two daggers dripping green venom. Accent colour: toxic green.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (quick poisoned slashes leaving green droplets).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Assassin (Venomblade): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (venomblade subclass) of a fantasy team battle. Look: green-black wrapped leathers, glass vials of poison on the belt, scarf over the face. Weapon: two daggers dripping green venom. Accent colour: toxic green.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Assassin (Venomblade): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a assassin (venomblade subclass) of a fantasy team battle. Look: green-black wrapped leathers, glass vials of poison on the belt, scarf over the face. Weapon: two daggers dripping green venom. Accent colour: toxic green.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 24. Bard (Skald): `cast-bard-skald`

Folder: `art/bard-skald/` · Build: `node scripts/sprite-sheet.mjs Bard Skald art/bard-skald`

### Bard (Skald): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (skald subclass) of a fantasy team battle. Look: fur-trimmed northern bard: braided beard or braids, leather and fur, bronze armbands. Weapon: a spellbook in one hand and a war horn hanging at the hip. Accent colour: bronze.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Bard (Skald): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (skald subclass) of a fantasy team battle. Look: fur-trimmed northern bard: braided beard or braids, leather and fur, bronze armbands. Weapon: a spellbook in one hand and a war horn hanging at the hip. Accent colour: bronze.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Bard (Skald): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (skald subclass) of a fantasy team battle. Look: fur-trimmed northern bard: braided beard or braids, leather and fur, bronze armbands. Weapon: a spellbook in one hand and a war horn hanging at the hip. Accent colour: bronze.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: a rousing shout with bronze sound waves taking shape.
Frame 4: arms thrust to the RIGHT, releasing a rousing shout with bronze sound waves toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Bard (Skald): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (skald subclass) of a fantasy team battle. Look: fur-trimmed northern bard: braided beard or braids, leather and fur, bronze armbands. Weapon: a spellbook in one hand and a war horn hanging at the hip. Accent colour: bronze.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Bard (Skald): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (skald subclass) of a fantasy team battle. Look: fur-trimmed northern bard: braided beard or braids, leather and fur, bronze armbands. Weapon: a spellbook in one hand and a war horn hanging at the hip. Accent colour: bronze.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 25. Bard (Maestro): `cast-bard-maestro`

Folder: `art/bard-maestro/` · Build: `node scripts/sprite-sheet.mjs Bard Maestro art/bard-maestro`

### Bard (Maestro): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (maestro subclass) of a fantasy team battle. Look: elegant plum tailcoat, white cravat, neat hair, poised posture. Weapon: a slim conductor's wand. Accent colour: plum.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Bard (Maestro): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (maestro subclass) of a fantasy team battle. Look: elegant plum tailcoat, white cravat, neat hair, poised posture. Weapon: a slim conductor's wand. Accent colour: plum.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Bard (Maestro): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (maestro subclass) of a fantasy team battle. Look: elegant plum tailcoat, white cravat, neat hair, poised posture. Weapon: a slim conductor's wand. Accent colour: plum.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: floating musical notes swirling outward taking shape.
Frame 4: arms thrust to the RIGHT, releasing floating musical notes swirling outward toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Bard (Maestro): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (maestro subclass) of a fantasy team battle. Look: elegant plum tailcoat, white cravat, neat hair, poised posture. Weapon: a slim conductor's wand. Accent colour: plum.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Bard (Maestro): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (maestro subclass) of a fantasy team battle. Look: elegant plum tailcoat, white cravat, neat hair, poised posture. Weapon: a slim conductor's wand. Accent colour: plum.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 26. Bard (Siren): `cast-bard-siren`

Folder: `art/bard-siren/` · Build: `node scripts/sprite-sheet.mjs Bard Siren art/bard-siren`

### Bard (Siren): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (siren subclass) of a fantasy team battle. Look: flowing sea-green gown, shell jewellery, long wavy hair. Weapon: a slim wand with a pearl at the tip. Accent colour: sea green.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Bard (Siren): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (siren subclass) of a fantasy team battle. Look: flowing sea-green gown, shell jewellery, long wavy hair. Weapon: a slim wand with a pearl at the tip. Accent colour: sea green.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Bard (Siren): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (siren subclass) of a fantasy team battle. Look: flowing sea-green gown, shell jewellery, long wavy hair. Weapon: a slim wand with a pearl at the tip. Accent colour: sea green.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: singing sound waves rippling outward taking shape.
Frame 4: arms thrust to the RIGHT, releasing singing sound waves rippling outward toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Bard (Siren): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (siren subclass) of a fantasy team battle. Look: flowing sea-green gown, shell jewellery, long wavy hair. Weapon: a slim wand with a pearl at the tip. Accent colour: sea green.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Bard (Siren): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a bard (siren subclass) of a fantasy team battle. Look: flowing sea-green gown, shell jewellery, long wavy hair. Weapon: a slim wand with a pearl at the tip. Accent colour: sea green.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 27. Paladin (Crusader): `cast-paladin-crusader`

Folder: `art/paladin-crusader/` · Build: `node scripts/sprite-sheet.mjs Paladin Crusader art/paladin-crusader`

### Paladin (Crusader): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (crusader subclass) of a fantasy team battle. Look: gold-trimmed white plate armour, white tabard with a gold sun, open helm. Weapon: a longsword. Accent colour: gold.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Paladin (Crusader): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (crusader subclass) of a fantasy team battle. Look: gold-trimmed white plate armour, white tabard with a gold sun, open helm. Weapon: a longsword. Accent colour: gold.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Paladin (Crusader): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (crusader subclass) of a fantasy team battle. Look: gold-trimmed white plate armour, white tabard with a gold sun, open helm. Weapon: a longsword. Accent colour: gold.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a radiant overhead sword strike with golden light).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Paladin (Crusader): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (crusader subclass) of a fantasy team battle. Look: gold-trimmed white plate armour, white tabard with a gold sun, open helm. Weapon: a longsword. Accent colour: gold.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Paladin (Crusader): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (crusader subclass) of a fantasy team battle. Look: gold-trimmed white plate armour, white tabard with a gold sun, open helm. Weapon: a longsword. Accent colour: gold.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 28. Paladin (Justiciar): `cast-paladin-justiciar`

Folder: `art/paladin-justiciar/` · Build: `node scripts/sprite-sheet.mjs Paladin Justiciar art/paladin-justiciar`

### Paladin (Justiciar): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (justiciar subclass) of a fantasy team battle. Look: dark-blue plate armour with a scales-of-justice emblem on the chest, tall helm. Weapon: a blessed mace with a glowing head. Accent colour: deep blue.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Paladin (Justiciar): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (justiciar subclass) of a fantasy team battle. Look: dark-blue plate armour with a scales-of-justice emblem on the chest, tall helm. Weapon: a blessed mace with a glowing head. Accent colour: deep blue.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Paladin (Justiciar): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (justiciar subclass) of a fantasy team battle. Look: dark-blue plate armour with a scales-of-justice emblem on the chest, tall helm. Weapon: a blessed mace with a glowing head. Accent colour: deep blue.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a mace strike that leaves a glowing judgment mark).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Paladin (Justiciar): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (justiciar subclass) of a fantasy team battle. Look: dark-blue plate armour with a scales-of-justice emblem on the chest, tall helm. Weapon: a blessed mace with a glowing head. Accent colour: deep blue.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Paladin (Justiciar): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (justiciar subclass) of a fantasy team battle. Look: dark-blue plate armour with a scales-of-justice emblem on the chest, tall helm. Weapon: a blessed mace with a glowing head. Accent colour: deep blue.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 29. Paladin (Oathbreaker): `cast-paladin-oathbreaker`

Folder: `art/paladin-oathbreaker/` · Build: `node scripts/sprite-sheet.mjs Paladin Oathbreaker art/paladin-oathbreaker`

### Paladin (Oathbreaker): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (oathbreaker subclass) of a fantasy team battle. Look: blackened plate armour, a cracked holy symbol on the chest, tattered grey cape. Weapon: a heavy warhammer. Accent colour: ash grey.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Paladin (Oathbreaker): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (oathbreaker subclass) of a fantasy team battle. Look: blackened plate armour, a cracked holy symbol on the chest, tattered grey cape. Weapon: a heavy warhammer. Accent colour: ash grey.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Paladin (Oathbreaker): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (oathbreaker subclass) of a fantasy team battle. Look: blackened plate armour, a cracked holy symbol on the chest, tattered grey cape. Weapon: a heavy warhammer. Accent colour: ash grey.
ANIMATION: ATTACK, exactly 5 frames.
Frame 1: anticipation: weapon drawn back, body turning away slightly.
Frame 2: wind-up: body coiled, weapon fully back.
Frame 3: swing begins: weapon moving forward with a short motion arc.
Frame 4: strike: weapon fully extended to the RIGHT (a hammer blow trailing dark smoke).
Frame 5: follow-through: weapon past the strike, body recovering.
```

### Paladin (Oathbreaker): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (oathbreaker subclass) of a fantasy team battle. Look: blackened plate armour, a cracked holy symbol on the chest, tattered grey cape. Weapon: a heavy warhammer. Accent colour: ash grey.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Paladin (Oathbreaker): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a paladin (oathbreaker subclass) of a fantasy team battle. Look: blackened plate armour, a cracked holy symbol on the chest, tattered grey cape. Weapon: a heavy warhammer. Accent colour: ash grey.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 30. Warlock (Hexer): `cast-warlock-hexer`

Folder: `art/warlock-hexer/` · Build: `node scripts/sprite-sheet.mjs Warlock Hexer art/warlock-hexer`

### Warlock (Hexer): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (hexer subclass) of a fantasy team battle. Look: tattered dark purple robe with hanging hex charms and small bones. Weapon: a dark leather spellbook held open in one hand. Accent colour: purple.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Warlock (Hexer): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (hexer subclass) of a fantasy team battle. Look: tattered dark purple robe with hanging hex charms and small bones. Weapon: a dark leather spellbook held open in one hand. Accent colour: purple.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Warlock (Hexer): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (hexer subclass) of a fantasy team battle. Look: tattered dark purple robe with hanging hex charms and small bones. Weapon: a dark leather spellbook held open in one hand. Accent colour: purple.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: purple curse sigils taking shape.
Frame 4: arms thrust to the RIGHT, releasing purple curse sigils toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Warlock (Hexer): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (hexer subclass) of a fantasy team battle. Look: tattered dark purple robe with hanging hex charms and small bones. Weapon: a dark leather spellbook held open in one hand. Accent colour: purple.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Warlock (Hexer): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (hexer subclass) of a fantasy team battle. Look: tattered dark purple robe with hanging hex charms and small bones. Weapon: a dark leather spellbook held open in one hand. Accent colour: purple.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 31. Warlock (Soulbinder): `cast-warlock-soulbinder`

Folder: `art/warlock-soulbinder/` · Build: `node scripts/sprite-sheet.mjs Warlock Soulbinder art/warlock-soulbinder`

### Warlock (Soulbinder): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (soulbinder subclass) of a fantasy team battle. Look: pale grey robe wrapped in faint ghostly chains, hollow glowing eyes. Weapon: a crystal orb with a trapped ghostly wisp inside. Accent colour: spectral blue-grey.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Warlock (Soulbinder): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (soulbinder subclass) of a fantasy team battle. Look: pale grey robe wrapped in faint ghostly chains, hollow glowing eyes. Weapon: a crystal orb with a trapped ghostly wisp inside. Accent colour: spectral blue-grey.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Warlock (Soulbinder): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (soulbinder subclass) of a fantasy team battle. Look: pale grey robe wrapped in faint ghostly chains, hollow glowing eyes. Weapon: a crystal orb with a trapped ghostly wisp inside. Accent colour: spectral blue-grey.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: ghostly blue-grey soul chains that lash outward taking shape.
Frame 4: arms thrust to the RIGHT, releasing ghostly blue-grey soul chains that lash outward toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Warlock (Soulbinder): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (soulbinder subclass) of a fantasy team battle. Look: pale grey robe wrapped in faint ghostly chains, hollow glowing eyes. Weapon: a crystal orb with a trapped ghostly wisp inside. Accent colour: spectral blue-grey.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Warlock (Soulbinder): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (soulbinder subclass) of a fantasy team battle. Look: pale grey robe wrapped in faint ghostly chains, hollow glowing eyes. Weapon: a crystal orb with a trapped ghostly wisp inside. Accent colour: spectral blue-grey.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

## 32. Warlock (Voidcaller): `cast-warlock-voidcaller`

Folder: `art/warlock-voidcaller/` · Build: `node scripts/sprite-sheet.mjs Warlock Voidcaller art/warlock-voidcaller`

### Warlock (Voidcaller): idle (4 frames) → save as `idle.png`

```
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (voidcaller subclass) of a fantasy team battle. Look: void-black robe speckled with tiny stars like a night sky. Weapon: a staff topped with a floating black orb. Accent colour: void violet.
ANIMATION: IDLE, exactly 4 frames.
Frame 1: standing ready, weapon held in the normal stance.
Frame 2: slight breath in, shoulders rise a little.
Frame 3: breath out, shoulders settle.
Frame 4: small weight shift, almost the same as frame 1 so the loop is smooth.
```

### Warlock (Voidcaller): walk (6 frames) → save as `walk.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 6 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (voidcaller subclass) of a fantasy team battle. Look: void-black robe speckled with tiny stars like a night sky. Weapon: a staff topped with a floating black orb. Accent colour: void violet.
ANIMATION: WALK, exactly 6 frames.
Frame 1: walking to the right: right foot forward touching the ground.
Frame 2: body slightly lower, weight on the right foot.
Frame 3: left leg passing the right leg, body upright.
Frame 4: left foot forward touching the ground.
Frame 5: body slightly lower, weight on the left foot.
Frame 6: right leg passing the left leg, body upright (loops back to frame 1).
```

### Warlock (Voidcaller): attack (5 frames) → save as `attack.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 5 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (voidcaller subclass) of a fantasy team battle. Look: void-black robe speckled with tiny stars like a night sky. Weapon: a staff topped with a floating black orb. Accent colour: void violet.
ANIMATION: CAST, exactly 5 frames.
Frame 1: hands low, magic starting to gather at the fingers.
Frame 2: hands rising, the glow growing stronger.
Frame 3: the spell forms between the hands: a swirling black-violet singularity taking shape.
Frame 4: arms thrust to the RIGHT, releasing a swirling black-violet singularity toward the right.
Frame 5: follow-through: arms lowering, the magic trail fading.
```

### Warlock (Voidcaller): hit (2 frames) → save as `hit.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 2 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (voidcaller subclass) of a fantasy team battle. Look: void-black robe speckled with tiny stars like a night sky. Weapon: a staff topped with a floating black orb. Accent colour: void violet.
ANIMATION: HIT, exactly 2 frames.
Frame 1: recoil from a hit: head and shoulders snapped back, wincing, weapon still held.
Frame 2: recovering, braced, still slightly leaning back.
```

### Warlock (Voidcaller): down (4 frames) → save as `down.png`
Attach your saved `idle.png` before pasting.

```
REFERENCE: the attached image shows this exact character. Copy the character exactly: same face, body, outfit, colours, weapon, proportions, art style and size. Only the pose changes.
Clean 2D game sprite animation (smooth digital illustration, NOT pixel art) for a top-down fantasy team-battle game.
STYLE: clean cel-shaded digital art, bold dark outline, flat colour blocks with one shade and one highlight per colour, no texture noise, subtle rim light, light from the top-left. Slightly chibi proportions (head about 1/4 of the body height), big readable weapon, minimal small details: it must still read clearly when shrunk to 48 pixels tall.
CAMERA: three-quarter view from slightly above (about 20 degrees), full body visible, character FACING RIGHT in every frame.
COLOURS: dark-fantasy palette, desaturated metals, one strong accent colour (given below). Avoid BRIGHT saturated cyan or BRIGHT saturated red as the main outfit colour, because the game adds team colours itself; deep or dark versions such as crimson or wine are fine.
FORMAT: ONE landscape image, 1536x1024, TRANSPARENT background. A single horizontal row of 4 frames, left to right, evenly spaced, each frame in its own equal-width column with empty space between frames. Every frame shows the SAME character at the SAME size, with the feet on the SAME horizontal ground line. Nothing touches the image edges.
DO NOT include: text, numbers, labels, frame borders, grid lines, a floor, a cast shadow, a background, extra characters, or UI.
CHARACTER: a warlock (voidcaller subclass) of a fantasy team battle. Look: void-black robe speckled with tiny stars like a night sky. Weapon: a staff topped with a floating black orb. Accent colour: void violet.
ANIMATION: DOWN, exactly 4 frames.
Frame 1: knees buckle, weapon starting to drop.
Frame 2: falling sideways toward the ground.
Frame 3: lying on the ground, body still moving.
Frame 4: lying still on the ground, weapon on the ground beside them.
```

---

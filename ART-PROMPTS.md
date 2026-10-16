# Art prompts (for ChatGPT image generation)

These prompts produce sprites for team battles and Core siege. Paste them into ChatGPT one at a time. The game creates fighters from 72 races, 56 classes and 41 weapons, so one sprite per combination is impossible. The plan is a small set of **class-archetype characters**, **weapon props** and **map pieces** that the game combines.

> **Why not separate body and outfit layers?** Image generators cannot reliably produce pieces that line up pixel-perfect when stacked. Each character sprite is therefore a complete figure. The game adds the team colour and the weapon on top, and shows the race through the name and a later race badge.

## How to work
1. **Make the style sheet first** (prompt S1) and save the image. **Attach it to every later prompt** and say: "match the attached style sheet exactly". This is the single most important step for consistency.
2. Generate one asset per message. When one looks right, say "Perfect. Now make the next one with exactly the same style, size, angle and lighting" and paste the next prompt.
3. Ask for a **transparent background PNG** every time. If ChatGPT adds a background, reply: "Remove the background completely; transparent PNG, nothing behind the character."
4. Check each image at small size: shrink it to 48×48 px. If you can't tell the class at that size, ask for "a bolder silhouette, larger head and props, fewer small details".
5. Save files with the names in the checklist, resize them to 256 px (512 px for `pit-rim`), export as WebP under 400 KB (for example with squoosh.app), and put them in `public/sprites/` as `<name>.webp`. Rebuild, and the enhanced renderer uses each sprite that exists, keeping the drawn look for the rest (see `public/sprites/README.md`). You can add them a few at a time.

## Shared style preamble (paste at the start of every prompt)
```
Game sprite for a top-down fantasy team-battle game. Camera: top-down with a slight
three-quarter tilt (about 20 degrees from overhead), character facing RIGHT.
Style: clean cel-shaded digital art, bold dark outline (3px at 256px), flat colour
blocks with one shade and one highlight per colour, no texture noise, no gradients
except subtle rim light. Light comes from the top-left.
Palette: dark-fantasy esports — deep navy/charcoal base tones, desaturated metals,
one strong accent colour per character. Do NOT use team colours (no strong cyan or
red); the game adds team colour itself.
Canvas: 256x256 px, transparent background, character centred with 16px empty margin
on every side, feet/base near the bottom centre. No text, no letters, no logos, no
UI, no ground, no cast shadow (the game draws shadows).
Readability: the silhouette must read clearly at 48x48 px — slightly chibi proportions
(head about 1/4 of body height), large clear props, minimal small detail.
```

## S1: style sheet (do this first)
```
[preamble]
Create a STYLE SHEET image (1024x1024, dark neutral grey background allowed for this
one only) showing 4 example characters side by side in the exact style above:
an armoured knight with a large shield, a robed mage with a pointed hat and staff,
a hooded archer with a longbow, and a healer in white-and-gold vestments with a glowing
hand. Same scale, same angle, same lighting. Below them, a row of 6 colour swatches
of the palette you used. This sheet will be used as the reference for all later sprites.
```

## Class-archetype characters (10 sprites)
Every class in the game maps to one of these archetypes. Template:
```
[preamble]
Match the attached style sheet exactly.
Character archetype: <ARCHETYPE>. Build: medium humanoid, neutral fantasy features
(no specific race). Outfit: <OUTFIT DETAILS>. Accent colour: <ACCENT>.
Pose: ready stance facing right, EMPTY HANDS held slightly forward (the game adds the
weapon separately), feet planted. Keep the outline bold and the silhouette distinctive:
<SILHOUETTE KEY>.
Output: 256x256 transparent PNG.
```

| File | Archetype | Classes it covers | Outfit details | Accent | Silhouette key |
| --- | --- | --- | --- | --- | --- |
| `char-plate.png` | Heavy plate | Warrior, Juggernaut, Sentinel, Guardian, Paladin, Warlord, Death Knight | full plate armour, broad pauldrons, closed helm with a visor slit, tabard | steel blue | very wide shoulders, boxy helm |
| `char-barbarian.png` | Barbarian | Berserker, Gladiator, Brawler | fur mantle, bare arms with leather bracers, belt with skulls/rings, half-helm | rust orange | big arms, wild hair or horns |
| `char-arcane.png` | Arcane robes | Mage, Sorcerer, Elementalist, Chronomancer, Runemaster, Conjurer, Illusionist, Psion, Void Walker | long layered robe with rune trim, wide sleeves, tall pointed hat | violet | the pointed hat |
| `char-occult.png` | Dark robes | Witch, Warlock, Necromancer, Blood Mage, Hexer, Soul Reaper | tattered dark robe, deep hood shadowing the face, bone charms | sickly green | deep pointed hood, ragged hem |
| `char-holy.png` | Holy vestments | Cleric, Healer, Priest, Oracle, Inquisitor | white and gold vestments, stole, small circlet, soft glow at the hands | warm gold | halo-like circlet, flowing stole |
| `char-nature.png` | Nature garb | Druid, Shaman, Summoner, Beast Master, Shifter | leaf and hide layers, antler or branch headdress, feather/bead strands | moss green | antler headdress |
| `char-ranger.png` | Ranger leathers | Ranger, Sniper, Hunter, Bounty Hunter | hooded leather coat, quiver strap across the chest, scarf, gloves | forest teal | hood + quiver on the back |
| `char-rogue.png` | Rogue | Rogue, Assassin, Ninja, Shadow, Trickster, Gambler, Corsair, Jester, Dancer, Bard | fitted dark leathers, mask over the lower face, sash, light cloak | crimson-plum | lean crouched stance, flowing sash |
| `char-martial.png` | Martial | Monk, Samurai, Spellblade | wrapped gi or lamellar, sash belt, topknot or kabuto, arm wraps | saffron | topknot, wide sleeves |
| `char-tinker.png` | Tinker | Artificer, Alchemist, Inventor, Strategist | goggles, apron with pockets and vials, gear-shaped pauldron, tool belt | brass | goggles on the head, backpack contraption |

## Weapon props (12 sprites, drawn separately so the game can rotate them)
Template:
```
[preamble]
Match the attached style sheet exactly.
A single weapon prop: <WEAPON>, shown flat from above, pointing to the RIGHT,
handle/grip at the LEFT edge of the drawing, centred vertically. No hands, no character.
Details: <DETAILS>. Output: 128x128 transparent PNG, 8px margin.
```

| File | Weapon group | Details |
| --- | --- | --- |
| `prop-longbow.png` | Bows (Longbow, Spirit bow) | tall curved wooden bow, string visible, nocked arrow |
| `prop-crossbow.png` | Crossbow | compact crossbow, bolt loaded |
| `prop-gun.png` | Guns (Revolver, Rifle, Silver revolver) | long fantasy rifle with brass fittings |
| `prop-throwing.png` | Throwing (Throwing knives, Chakram, Blowgun) | three fanned throwing knives |
| `prop-staff.png` | Staff | gnarled staff with a glowing crystal head |
| `prop-wand.png` | Wand / orb (Magic wand, Crystal orb) | short wand with a star tip and a floating orb beside it |
| `prop-spellbook.png` | Spellbook | open floating tome with glowing pages |
| `prop-sword.png` | Swords and blades | straight longsword with a cross-guard |
| `prop-dagger.png` | Daggers | pair of curved daggers |
| `prop-heavy.png` | Heavy (axes, hammers, maces) | double-headed battle axe |
| `prop-polearm.png` | Polearms (spear, halberd, glaive) | long spear with a leaf blade and a pennant |
| `prop-shield.png` | Shields | kite shield with a simple emblem, front view |

## Objective mode pieces
**Core (4 sprites).** These two are the only assets that use team colours:
```
[preamble, but replace the palette line with: "This asset IS team-coloured: <cyan
#3ee0ff | red #ff5a6a> glowing energy on dark stone"]
A team Core: a large floating crystal (about 60% of the canvas) above a carved stone
pedestal with runes, energy veins glowing in the team colour, top-down three-quarter
view. <STATE>. Output: 256x256 transparent PNG.
```

| File | Team | State |
| --- | --- | --- |
| `core-blue.png` | blue | healthy, bright steady glow |
| `core-red.png` | red | healthy, bright steady glow |
| `core-blue-cracked.png` | blue | cracked crystal, flickering glow, small floating shards |
| `core-red-cracked.png` | red | cracked crystal, flickering glow, small floating shards |

**Forge Titan:** animated, see "Core siege creatures" below.

**Terrain (5 sprites, 128×128).** Each must read as a solid obstacle from above:
- `rock-pillar.png`: round stone pillar seen from above, with moss and cracks.
- `rock-boulder.png`: rough boulder.
- `wall-stone.png`: one round section of a ruined wall (several are chained in game).
- `rock-cluster.png`: three small rocks.
- `pit-rim.png` (512×512): circular arena pit edge with a scorched centre where the Titan stands.

**Effects (5 sprites, 256×256, glowing, transparent):**
- `fx-forgefire.png`: a ring aura of golden flame (the buff).
- `fx-respawn.png`: a soft column of light.
- `fx-slam.png`: a ground-crack shockwave ring.
- `fx-core-hit.png`: a shard burst.
- `fx-steal.png`: a sharp golden flash with a star.

## Team cast sheets (animated, one per subclass)

Team fighters (2v2, 3v3, 5v5) come from the team cast: 10 classes, 32 subclasses. Each subclass gets one animated **sprite sheet**. A fighter with a sheet is drawn from it; everyone else keeps the archetype sprites above. The race is not drawn (it varies), so describe the class and subclass only.

**Sheet layout** (`public/sprite-art.js`, `SHEET_ROWS`):
- 256×256 frames, facing RIGHT, same camera and style as the preamble;
- five rows: **idle 4 frames, walk 6, attack/cast 5, hit 2, down 4**;
- the weapon is part of the drawing (the game adds no prop on top of a sheet);
- the file is `public/sprites/cast-<class>-<subclass>.webp`, for example `cast-mage-blood.webp`.

**Spell effects:** one 4-frame strip per subclass ability (64), each matched to its caster's attack row; build each with `node scripts/sprite-sheet.mjs --fx <subclass> <ability id> <strip.png>`.

**Workflow (one row per message):**
1. Generate the subclass's **idle row** first, with the prompt below. When it looks right, save it as `idle.png` in a folder for that subclass.
2. For every other row, **attach the idle image** and start with: "Same character, same outfit, colours, proportions, size and camera as the attached image." Then paste the row prompt. Save each as `walk.png`, `attack.png`, `hit.png` and `down.png`.
3. Each row is ONE image: the frames side by side, left to right, evenly spaced, on a transparent background. Ask for "a horizontal strip of N frames, each frame the same width, nothing between them".
4. Build the sheet: `node scripts/sprite-sheet.mjs <Class> <Subclass> <folder>`, for example `node scripts/sprite-sheet.mjs Mage Blood art/mage-blood`. It cuts out every figure (figures that overlap side by side still separate), scales each row so the character stands `SHEET_STANDING` (160 px) tall, the same for the whole cast (hit and down rows by area, since a recoil or a fall changes the height), stands every frame on the same feet line, centres it on its feet and writes the WebP. Then run `node scripts/audit-sprites.mjs` and rebuild.
5. Start with **Mage (Blood)**, check it in a watched game (Enhanced graphics), then do one class at a time.

**Row prompt (paste after the preamble and the subclass description):**
```
Draw a HORIZONTAL STRIP of {N} animation frames of this character, left to right,
evenly spaced, each frame the same width, transparent background, facing right,
feet on the same ground line in every frame, same size in every frame.
Row: {ROW}. Frames: {FRAMES}
```
Use these `{ROW}`/`{FRAMES}` texts (pick the attack line that matches the subclass's **style**: blade, bow or spell):
- **idle (4):** 1 standing ready, weapon held; 2 slight breath in, shoulders up; 3 breath out; 4 small weight shift back to frame 1.
- **walk (6):** a full walk cycle to the right: 1 contact right foot forward; 2 down; 3 passing; 4 contact left foot forward; 5 down; 6 passing. Weapon held steady.
- **attack, blade (5):** 1 anticipation, weapon drawn back; 2 wind-up, body coiled; 3 swing starts, motion arc; 4 strike, weapon fully extended to the right with a short slash trail; 5 follow-through, recovering.
- **attack, bow (5):** 1 reach for an arrow; 2 nock; 3 draw back; 4 full draw, aiming right; 5 release, string snapped forward, arrow gone.
- **attack, spell (5):** 1 hands low, energy gathering; 2 hands rising, glow growing; 3 a ball or sigil of the subclass's magic forms; 4 thrust forward, release toward the right; 5 follow-through with fading trails.
- **hit (2):** 1 recoil, head and shoulders snapped back, wince; 2 recovering, still braced.
- **down (4):** 1 knees buckle; 2 falling sideways; 3 on the ground; 4 lying still, weapon dropped beside them.

**Example: Mage (Blood), attack row.** Description: "a gaunt battle mage in deep crimson and black robes with bone clasps, a staff topped with a red crystal, dark-red blood magic with mist." Frames: 1 hands low as red mist gathers at the fingers; 2 hands rising, mist swirling up the arms; 3 a dark-red blood orb forms between the hands; 4 arms thrust right, the orb flies off with a trailing mist; 5 follow-through, arms lowering, mist fading.

**Subclass descriptions** (accent colour in brackets; never use pure team cyan or red as the main colour):

| Sheet | Style | Description |
| --- | --- | --- |
| `cast-cleric-light` | spell | white-and-gold priest robes, sun circlet, staff with a radiant disc, warm golden light [gold] |
| `cast-cleric-mercy` | spell | soft grey-blue habit, hood, silver chain, wand with a white feather charm, gentle glow [pale silver] |
| `cast-cleric-ward` | spell | half-armoured cleric, white tabard, round sigil shield on the back, spellbook, hexagon ward light [ivory] |
| `cast-druid-grove` | spell | leaf-and-bark robe, antler crown, staff sprouting leaves, green healing motes [leaf green] |
| `cast-druid-forest` | spell | thorny bark armour, mossy cloak, gnarled staff, vines and roots [moss] |
| `cast-druid-moon` | spell | night-blue robe with silver crescents, owl-feather mantle, crystal orb, pale moonlight [moon silver] |
| `cast-warrior-vanguard` | blade | heavy plate, tower shield and longsword, plumed helm, steady stance [steel blue-grey] |
| `cast-warrior-berserker` | blade | bare-armed, fur mantle, war paint, huge two-handed greataxe, wild hair [rust orange] |
| `cast-warrior-duelist` | blade | fitted leather coat, cape over one shoulder, rapier, elegant fencing stance [wine] |
| `cast-guardian-stoneguard` | blade | massive rune-carved stone armour, tower shield, warhammer, glowing rune cracks [granite amber] |
| `cast-guardian-warden` | blade | layered plate with chains, heavy mace and shield, horned helm [iron] |
| `cast-guardian-aegis` | blade | gleaming silver plate, kite shield with a sun emblem, force-field shimmer [aqua-white, not cyan] |
| `cast-mage-fire` | spell | flame-trimmed robe, ember scarf, staff with a flame head, fire [flame orange] |
| `cast-mage-blood` | spell | gaunt mage in crimson and black, bone clasps, red-crystal staff, blood mist [crimson] |
| `cast-mage-frost` | spell | pale fur-trimmed robe, icicle crown, wand with an ice shard, frost [ice white] |
| `cast-mage-chrono` | spell | brass-and-blue robe, hourglass belt, clockwork orb, golden time rings [brass] |
| `cast-ranger-marksman` | bow | long coat, hood, tall longbow, quiver, focused aim [forest green] |
| `cast-ranger-trapper` | bow | patched leathers, crossbow, snares and spikes on the belt [tan] |
| `cast-ranger-beastmaster` | bow | fur hood, spirit bow, a small spirit wolf at the heels (inside the frame) [teal-green] |
| `cast-assassin-shadowblade` | blade | black hooded leathers, mask, twin daggers, smoky edges [violet-black] |
| `cast-assassin-riftwalker` | blade | dark leathers with glowing rift seams, short sword, portal sparks [indigo] |
| `cast-assassin-executioner` | blade | dark heavy hood, katana, grim faceless mask [bone white] |
| `cast-assassin-venomblade` | blade | green-black wraps, poisoned daggers dripping venom, vials on the belt [toxic green] |
| `cast-bard-skald` | spell | fur-trimmed northern bard, war horn at the hip, spellbook, rousing glow [bronze] |
| `cast-bard-maestro` | spell | elegant tailcoat, conductor's wand, floating musical notes [plum] |
| `cast-bard-siren` | spell | flowing sea-green gown, shell jewellery, wand, singing sound waves [sea green] |
| `cast-paladin-crusader` | blade | gold-trimmed white plate, longsword, holy tabard, radiant strikes [gold] |
| `cast-paladin-justiciar` | blade | dark-blue plate with scales emblem, blessed mace, judgment light [deep blue] |
| `cast-paladin-oathbreaker` | blade | blackened plate, cracked holy symbol, warhammer, dark aura [ash grey] |
| `cast-warlock-hexer` | spell | tattered dark robe, hex charms, spellbook, purple curse sigils [purple] |
| `cast-warlock-soulbinder` | spell | pale robe with soul chains, crystal orb with a trapped wisp, ghostly links [spectral blue-grey] |
| `cast-warlock-voidcaller` | spell | starry void-black robe, staff with a black orb, swirling singularity [void violet] |

## Core siege creatures (animated)

The neutral monsters of Core siege and the summons get animated sheets like the cast. Until a sheet exists, the game draws the creature as it does today, so the sheets can arrive one at a time.

**Sheet layout** (`public/sprite-art.js`, `CREATURE_SHEETS`): 256×256 frames, facing RIGHT, same camera and style as the preamble. Each creature has its own rows, listed below. The file is `public/sprites/<name>.webp`.

| Sheet | Creature | Rows (frames) | Stands |
| --- | --- | --- | --- |
| `creature-titan` | the Forge Titan, the Core siege boss | idle 4, walk 6, punch 5, slam 5, hit 2, down 4 | 200 px, feet on the ground line |
| `creature-wisp` | Ember Wisp, the XP camp | idle 4, zap 4, hit 2, fade 4 | 90 px, floating, centred |
| `creature-beast` | the beast Beastmaster calls (Beast command) | idle 4, walk 6, bite 4 | 120 px, feet on the ground line |
| `creature-spirit` | a guardian spirit that orbits its owner | idle 4, cast 4 | 90 px, floating, centred |

**How the game plays them:**
- **Titan:** it walks after its attacker and punches. During the slam warning it winds up through slam frames 1–4, then holds frame 5 (the impact) as the slam lands. It flinches when hit. Down plays once when it falls, and plays in reverse when it rises in the pit.
- **Wisp:** it zaps its attacker and flinches when hit. Fade plays when it is cleared, and in reverse when it returns.
- **Beast:** it walks to its owner's target and bites it.
- **Spirit:** it casts each time it shoots a bolt.

**Workflow** (the same as the cast, one row per message):
1. Generate the **idle row** first with the creature's description. Save it as `art/<sheet>/idle.png`, for example `art/creature-titan/idle.png`.
2. For every other row, **attach the idle image** and start with: "Same creature, same colours, proportions, size and camera as the attached image." Then paste the row prompt. Save each row by its name, for example `art/creature-titan/slam.png`.
3. Build the sheet with `node scripts/sprite-sheet.mjs --creature <sheet> <folder>`, for example `node scripts/sprite-sheet.mjs --creature creature-titan art/creature-titan`. Then run `node scripts/audit-sprites.mjs` and rebuild.

**Row prompt** (paste after the preamble and the creature's description):
```
Draw a HORIZONTAL STRIP of {N} animation frames of this creature, left to right,
evenly spaced, each frame the same width, transparent background, facing right,
same size in every frame, clear empty space between frames, no boxes or borders.
{GROUND}
Row: {ROW}. Frames: {FRAMES}
```
For `{GROUND}`, use "Feet on the same ground line in every frame." for the Titan and the beast. Use "Floating in the middle of each frame, nothing below it." for the wisp and the spirit.

**Forge Titan** (`creature-titan`). Neutral palette, no team colours. Description: "a huge neutral boss monster, the Forge Titan: a hulking molten-iron golem with a furnace glowing in its chest, cooled-slag armour plates, chains hanging from its wrists, ember eyes; charcoal iron with orange-gold molten seams; massive fists, short legs, broad shoulders."
- `creature-titan/idle.png` (4): 1 standing, fists lowered, furnace glowing; 2 chest swells, steam rising from the shoulders; 3 settles, furnace dims a little; 4 small weight shift back toward frame 1.
- `creature-titan/walk.png` (6): a heavy stomping walk cycle to the right: 1 right foot forward, contact; 2 weight drops; 3 passing; 4 left foot forward, contact; 5 weight drops; 6 passing. Fists swing a little.
- `creature-titan/punch.png` (5): 1 right fist drawn back; 2 torso coiled; 3 swing starts; 4 fist fully extended to the right, molten sparks at the knuckles; 5 recovering.
- `creature-titan/slam.png` (5): 1 crouching, both fists pulled in; 2 fists rising; 3 fists above the head, the furnace flaring; 4 at the top, about to slam, body arched back; 5 both fists smashed into the ground in front of it, cracks and a molten burst at its feet.
- `creature-titan/hit.png` (2): 1 recoil, head and shoulders snapped back, slag chips flying; 2 recovering, braced.
- `creature-titan/down.png` (4): 1 staggering, one knee buckling; 2 dropped to one knee, the furnace flickering; 3 falling forward onto its fists; 4 collapsed in a heap, the furnace dark, faint steam.

**Ember Wisp** (`creature-wisp`). Neutral palette, no team colours. Description: "a small floating ember spirit: a bright flame core with two dark coal eyes, a ring of flickering orange-gold flames, and a short tail of cinders and smoke trailing behind it; no body, no arms."
- `creature-wisp/idle.png` (4): 1 floating, core bright; 2 drifting up, the flames licking upward; 3 top of the bob, the tail curling; 4 drifting down.
- `creature-wisp/zap.png` (4): 1 flames drawn inward, the core brightening; 2 the core flaring white-hot; 3 spitting a short crackling ember bolt to the right (inside the frame); 4 settling, sparks fading.
- `creature-wisp/hit.png` (2): 1 squashed, flames blown back to the left, sparks scattering; 2 reforming.
- `creature-wisp/fade.png` (4): 1 flames sputtering; 2 shrinking, the core dimming; 3 a small ember with smoke; 4 a few last sparks and a curl of smoke.

**Beast** (`creature-beast`). Description: "a lean dire wolf companion in teal-green and leather: grey-green fur, a leather harness with a small teal charm, glowing teal eyes, bushy tail; seen from the side, in the same top-down three-quarter camera."
- `creature-beast/idle.png` (4): 1 standing alert; 2 breathing in, ears up; 3 breathing out, tail sways; 4 small head turn back toward frame 1.
- `creature-beast/walk.png` (6): a trotting cycle to the right, legs in clear alternating steps.
- `creature-beast/bite.png` (4): 1 crouched, ears back, lips curled; 2 lunging forward; 3 jaws snapping shut at the right, head fully extended; 4 pulling back.

**Spirit** (`creature-spirit`). Description: "a small pale-blue guardian spirit: a glowing ghostly orb with a calm face, two small wisp arms and a trailing misty tail; soft blue-white light."
- `creature-spirit/idle.png` (4): 1 floating; 2 bobbing up, the tail swaying; 3 top of the bob; 4 bobbing down.
- `creature-spirit/cast.png` (4): 1 gathering light between its arms; 2 glowing bright; 3 shooting a small blue bolt to the right (inside the frame); 4 settling, the glow fading.

## Checklist
- [ ] S1 style sheet
- [ ] 10 class-archetype characters
- [ ] 12 weapon props
- [ ] 4 Core sprites
- [ ] 5 terrain pieces
- [ ] 5 effects
- [ ] Team cast sheets (32, one per subclass; 5 row strips each, built with `scripts/sprite-sheet.mjs`)
- [ ] Spell effects (64, one per subclass ability; one 4-frame strip each, built with `scripts/sprite-sheet.mjs --fx`)
- [ ] Core siege creatures (4 sheets: Titan, Ember Wisp, beast, spirit; one strip per row, built with `scripts/sprite-sheet.mjs --creature`)

That is 37 single images, plus the animated sheets. The class icons already in the game (plus, hat, bow, shield) remain the fallback, so the sprites can arrive gradually.

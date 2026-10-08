# Art prompts (for ChatGPT image generation)

These prompts produce sprites for team battles and the coming objective mode (`OBJECTIVE-MODE.md`). Paste them into ChatGPT one at a time. The game creates fighters from 72 races, 56 classes and 41 weapons, so one sprite per combination is impossible. The plan is a small set of **class-archetype characters**, **weapon props** and **map pieces** that the game combines.

> **Why not separate body and outfit layers?** Image generators cannot reliably produce pieces that line up pixel-perfect when stacked. Each character sprite is therefore a complete figure. The game adds the team colour and the weapon on top, and shows the race through the name and a later race badge.

## How to work
1. **Make the style sheet first** (prompt S1) and save the image. **Attach it to every later prompt** and say: "match the attached style sheet exactly". This is the single most important step for consistency.
2. Generate one asset per message. When one looks right, say "Perfect. Now make the next one with exactly the same style, size, angle and lighting" and paste the next prompt.
3. Ask for a **transparent background PNG** every time. If ChatGPT adds a background, reply: "Remove the background completely; transparent PNG, nothing behind the character."
4. Check each image at small size: shrink it to 48×48 px. If you can't tell the class at that size, ask for "a bolder silhouette, larger head and props, fewer small details".
5. Save files with the names in the checklist and keep them for the sprite pass (phase 6 of `OBJECTIVE-MODE.md`). The PixiJS renderer for team battles (phase 5) is in place; phase 6 teaches it to load `public/sprites/` and fall back to today's class icons when a sprite is missing.

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

**Forge Titan, the monster (3 sprites, 512×512):**
```
[preamble, canvas 512x512]
A huge neutral boss monster, the Forge Titan: a hulking molten-iron golem with a
furnace glowing in its chest, cooling-slag armour plates, chains on its wrists, ember
eyes. Neutral palette (charcoal iron, orange-gold molten glow) — no team colours.
Pose: <POSE>. Output: 512x512 transparent PNG.
```

| File | Pose |
| --- | --- |
| `titan-idle.png` | standing, arms lowered, steam rising |
| `titan-slam.png` | both fists raised high above the head, about to slam the ground |
| `titan-down.png` | collapsed and kneeling, the furnace light fading |

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

## Checklist
- [ ] S1 style sheet
- [ ] 10 class-archetype characters
- [ ] 12 weapon props
- [ ] 4 Core sprites
- [ ] 3 Titan sprites
- [ ] 5 terrain pieces
- [ ] 5 effects

That is 40 images. The class icons already in the game (plus, hat, bow, shield) remain the fallback, so the sprites can arrive gradually.

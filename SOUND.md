# Sound

Every sound in the arena is generated in code with the Web Audio API (`public/sound.js`), in a retro, chiptune style.
Sound only listens to a fight: it reads hp changes, attacks, the Titan and new log lines (`public/sound-model.js`)
and never changes a result. It starts after the first click or key press, as browsers require.

**Controls** (under the arena): *Sound* on/off, *Effects* volume and *Music* volume, remembered in the browser.
At 4× and 8× speed only the important cues play (marked ★ below). At most six sounds start per frame, and each cue
waits a moment before it repeats.

## Replacing a sound with a file

Save a file in `public/sounds/` named after its cue: `<cue>.ogg`, `.mp3` or `.wav`. Effects can be up to 300 KB,
music up to 3 MB. The builds pick the files up (`scripts/sounds.mjs` writes `sound-manifest.js`); cues without a file
keep their generated sound. Free sources: Kenney (kenney.nl, CC0), OpenGameArt and Freesound (check each licence),
or an AI sound-effect tool.

## Cues

| Cue | When | Generated sound |
| --- | --- | --- |
| `hit` | A fighter takes damage (merged per frame) | Short noise burst with a low blip |
| `bigHit` | A hit of 12% max HP or more | Heavier thud |
| `heal` | A fighter is healed (merged per frame) | Three rising triangle notes |
| `death` ★ | A fighter falls | Falling square tone |
| `revive` ★ | A fighter is resurrected where they fell | Rising arpeggio |
| `respawn` | A fighter returns at their base | Soft rising tone |
| `swing` | A melee attack or technique is released | Noise whoosh |
| `shot` | A bow, crossbow or thrown weapon fires | Twang |
| `gunshot` | A revolver or rifle fires | Bang |
| `cast` | A spell is released (pitch by element: fire, ice, lightning, shadow, holy, nature) | Saw and square zap |
| `kit` | A team kit is used | Two quick notes |
| `dodge` | A fighter sidesteps or avoids a hit | Airy swish |
| `parry` | A parry or counter | Metallic ping |
| `block` | A ward blocks or magic is absorbed | Soft rising tone |
| `coreHit` ★ | A Core takes damage | Crystal crack |
| `coreDestroyed` ★ | A Core breaks | Long crash with falling crystal notes |
| `titanRise` ★ | The Forge Titan rises | Low growl and two notes |
| `slamCharge` | The Titan prepares a slam | Rising rumble |
| `slam` ★ | The slam lands | Deep boom |
| `fissureCharge` ★ | A Fissure opens (telegraph) | Rising rumble |
| `fissure` ★ | The Fissure splits | Crack and thud |
| `molten` | The Titan throws molten rock | Fiery whoosh |
| `forgefire` ★ | A team claims Forgefire | Fanfare |
| `steal` ★ | A team steals Forgefire | Sly fanfare |
| `suddenDeath` ★ | Sudden death begins | Alarm |
| `victory` ★ | The fight ends | Victory jingle |
| `click` | A primary button is pressed | Tiny tick |
| `music-battle` | Battle music (loops while a fight runs) | Chiptune loop: bass, arpeggio and drums, key and tempo from the fight's seed |
| `music-sudden-death` | Battle music in sudden death | The same loop, faster |

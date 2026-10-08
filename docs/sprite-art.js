// Sprite art for the enhanced renderer (ART-PROMPTS.md). Every class maps to one of ten character archetypes and
// every weapon to one of twelve props. Images live in public/sprites/ as <name>.webp or <name>.png; the builds list
// the ones present in sprite-manifest.js, and the renderer falls back to today's icons for anything missing.
export const CHARACTER_ART=Object.freeze({
 'char-plate':['Warrior','Juggernaut','Sentinel','Guardian','Paladin','Warlord','Death Knight'],
 'char-barbarian':['Berserker','Gladiator','Brawler'],
 'char-arcane':['Mage','Sorcerer','Elementalist','Chronomancer','Runemaster','Conjurer','Illusionist','Psion','Void Walker'],
 'char-occult':['Witch','Warlock','Necromancer','Blood Mage','Hexer','Soul Reaper'],
 'char-holy':['Cleric','Healer','Priest','Oracle','Inquisitor'],
 'char-nature':['Druid','Shaman','Summoner','Beast Master','Shifter'],
 'char-ranger':['Ranger','Sniper','Hunter','Bounty Hunter'],
 'char-rogue':['Rogue','Assassin','Ninja','Shadow','Trickster','Gambler','Corsair','Jester','Dancer','Bard'],
 'char-martial':['Monk','Samurai','Spellblade'],
 'char-tinker':['Artificer','Alchemist','Inventor','Strategist']
});
// Bare hands, claws and arcane gauntlets have no prop; they keep the sprite-sheet weapon.
export const PROP_ART=Object.freeze({
 'prop-longbow':['Longbow','Spirit bow'],
 'prop-crossbow':['Crossbow'],
 'prop-gun':['Revolver','Rifle','Silver revolver'],
 'prop-throwing':['Throwing knives','Chakram','Blowgun'],
 'prop-staff':['Staff','Quarterstaff'],
 'prop-wand':['Magic wand','Crystal orb'],
 'prop-spellbook':['Spellbook'],
 'prop-sword':['Longsword','Rapier','Shortsword','Katana','Greatsword','Silver longsword','Rune blade','Chain blade','Living weapon'],
 'prop-dagger':['Twin daggers','Poisoned daggers'],
 'prop-heavy':['Battleaxe','Warhammer','Flail','Mace','Greataxe','Blessed mace'],
 'prop-polearm':['Spear','Trident','Scythe','Halberd','Cold-iron spear'],
 'prop-shield':['Shield','Tower shield']
});
// Each team map's terrain pieces use one rock sprite.
export const TERRAIN_ART=Object.freeze({pillars:'rock-pillar',ruins:'wall-stone',crossroads:'rock-boulder',groves:'rock-cluster'});
export const OBJECTIVE_ART=Object.freeze(['core-blue','core-red','core-blue-cracked','core-red-cracked','titan-idle','titan-slam','titan-down','pit-rim']);
export const EFFECT_ART=Object.freeze(['fx-forgefire','fx-respawn','fx-slam','fx-core-hit','fx-steal']);
export const SPRITE_NAMES=Object.freeze([...Object.keys(CHARACTER_ART),...Object.keys(PROP_ART),...OBJECTIVE_ART,...new Set(Object.values(TERRAIN_ART)),...EFFECT_ART]);
export const SPRITE_EXTENSIONS=Object.freeze(['webp','png']);
// Sprites ship inside the worker bundle and the Pages site, so each file must stay small (256 px WebP is ~20–60 KB).
export const SPRITE_MAX_BYTES=400*1024;
const byClass=new Map(Object.entries(CHARACTER_ART).flatMap(([art,list])=>list.map(name=>[name,art])));
const byWeapon=new Map(Object.entries(PROP_ART).flatMap(([art,list])=>list.map(name=>[name,art])));
export const characterArt=className=>byClass.get(className)??null;
export const propArt=weaponName=>byWeapon.get(weaponName)??null;
// The fighter's base class and weapon (rage or shapeshifting never swaps the sprite mid-fight).
export const fighterArt=f=>({character:characterArt(f.traits?.class),prop:propArt(f.original?.weapon?.name??f.weapon?.name)});
export const coreArt=c=>`core-${c.team?'red':'blue'}${c.hp<c.maxHp*.5?'-cracked':''}`;
// Which sprite files are usable: the manifest maps a sprite name to its file; unknown names are ignored.
export function spriteUrls(manifest,base){const out={};for(const name of SPRITE_NAMES)if(typeof manifest?.[name]==='string')out[name]=new URL('sprites/'+manifest[name],base).href;return out;}

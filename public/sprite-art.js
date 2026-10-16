import {TEAM_CLASSES} from './team-classes.js';
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
export const OBJECTIVE_ART=Object.freeze(['core-blue','core-red','core-blue-cracked','core-red-cracked','pit-rim']);
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
// Animated sheets for the team cast (ART-PROMPTS.md, "Team cast sheets"): one per subclass, named
// cast-<class>-<subclass>, with 256 px frames in five rows (idle, walk, attack or cast, hit, down) and as many columns
// as the longest row. A fighter with a sheet is drawn from it; everyone else keeps the archetype art.
export const SHEET_FRAME=256;
export const SHEET_ROWS=Object.freeze([['idle',4],['walk',6],['attack',5],['hit',2],['down',4]]);
export const SHEET_COLUMNS=Math.max(...SHEET_ROWS.map(([,n])=>n));
export const SHEET_MAX_BYTES=2*1024*1024;
// Every sheet's character stands this tall (feet 12 px above the cell's bottom), so the whole cast is drawn at one size.
export const SHEET_STANDING=160,SHEET_FEET=12;
const slug=text=>String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const sheetName=(className,subclass)=>`cast-${slug(className)}-${slug(subclass)}`;
export const SHEET_NAMES=Object.freeze(TEAM_CLASSES.flatMap(c=>c.subclasses.map(s=>sheetName(c.name,s.name))));
export const fighterSheet=f=>{const t=f.traits;if(!t?.subclass)return null;const name=sheetName(t.class,t.subclass);return SHEET_NAMES.includes(name)?name:null;};
// Spell effects for the team cast's abilities: one 4-frame strip per subclass ability,
// fx-<subclass>-<ability id>, drawn in that character's colours (so a shared ability such as Taunt shout looks different
// for each subclass), played where the ability lands when its cast releases. `on` places it: target (the enemy hit),
// ally (the ally helped), self (the caster) or area (around the caster, larger).
export const FX_FRAMES=4;
const fx=(on,...ids)=>ids.map(id=>[id,on]);
export const ABILITY_FX=Object.freeze(Object.fromEntries([
 ...fx('target','moonfire','roots','bramble','dream','cleave','charge','drivingStrike','knockUp','fire','ember','bloodBolt','venom','ice','frostTouch','time','silence','aimedShot','chainShot','cripplingStrike','disarmShot','beast','backstab','death','execute','toxicBlade','shadowstep','discord','charm','sound','smite','judgment','blood','curse','enfeeble','soulLink','singularity','dispel'),
 ...fx('ally','healing','mendingWave','resurrection','barrier','regeneration','life','aegisShield','haste','force','spiritArmor'),
 ...fx('self','guard','parry','lastStand','invisible','teleport','zeal'),
 ...fx('area','tauntShout','battleHymn','warCry','dreadAura')
]));
// Each subclass's two abilities (ids from class-abilities.js; check-pixi-arena keeps this in step with TEAM_CLASSES).
export const CAST_FX=Object.freeze({
 Light:['healing','mendingWave'],Mercy:['healing','resurrection'],Ward:['barrier','healing'],
 Grove:['regeneration','life'],Forest:['roots','bramble'],Moon:['dream','moonfire'],
 Vanguard:['guard','tauntShout'],Berserker:['cleave','charge'],Duelist:['parry','drivingStrike'],
 Stoneguard:['lastStand','spiritArmor'],Warden:['knockUp','tauntShout'],Aegis:['aegisShield','force'],
 Fire:['fire','ember'],Blood:['bloodBolt','venom'],Frost:['ice','frostTouch'],Chrono:['time','silence'],
 Marksman:['aimedShot','chainShot'],Trapper:['cripplingStrike','disarmShot'],Beastmaster:['beast','aimedShot'],
 Shadowblade:['invisible','backstab'],Riftwalker:['teleport','silence'],Executioner:['death','execute'],Venomblade:['toxicBlade','shadowstep'],
 Skald:['battleHymn','warCry'],Maestro:['haste','discord'],Siren:['charm','sound'],
 Crusader:['smite','zeal'],Justiciar:['judgment','tauntShout'],Oathbreaker:['blood','dreadAura'],
 Hexer:['curse','enfeeble'],Soulbinder:['soulLink','blood'],Voidcaller:['singularity','dispel']
});
export const fxName=(subclass,id)=>`fx-${slug(subclass)}-${id}`;
export const FX_NAMES=Object.freeze(TEAM_CLASSES.flatMap(c=>c.subclasses.flatMap(s=>(CAST_FX[s.name]??[]).map(id=>fxName(s.name,id)))));
// The effect a fighter's ability plays: its subclass's version, or null (wheel fighters and unknown abilities).
export const fighterFx=(f,id)=>{const sub=f?.traits?.subclass;if(!sub||!CAST_FX[sub]?.includes(id))return null;return fxName(sub,id);};
// Animated sheets for the Core siege creatures and summons (ART-PROMPTS.md, "Core siege creatures"): 256 px frames,
// facing right, one row per entry and as many columns as the longest row. `standing` is how tall the creature stands in
// its cell (feet SHEET_FEET above the bottom; `centered` floaters sit in the middle instead). `play` names the row for
// each action (pixi-arena-model.js creatureFrame): attack, a telegraphed windup ending on its last frame, hit, death
// (played once; reversed when the creature returns) and walk.
export const CREATURE_SHEETS=Object.freeze({
 'creature-titan':Object.freeze({rows:Object.freeze([['idle',4],['walk',6],['punch',5],['slam',5],['hit',2],['down',4]]),standing:200,play:Object.freeze({attack:'punch',windup:'slam',hit:'hit',death:'down',walk:'walk'})}),
 'creature-wisp':Object.freeze({rows:Object.freeze([['idle',4],['zap',4],['hit',2],['fade',4]]),standing:90,centered:true,play:Object.freeze({attack:'zap',hit:'hit',death:'fade'})}),
 'creature-beast':Object.freeze({rows:Object.freeze([['idle',4],['walk',6],['bite',4]]),standing:120,play:Object.freeze({attack:'bite',walk:'walk'})}),
 'creature-spirit':Object.freeze({rows:Object.freeze([['idle',4],['cast',4]]),standing:90,centered:true,play:Object.freeze({attack:'cast'})})
});
export const CREATURE_NAMES=Object.freeze(Object.keys(CREATURE_SHEETS));
export const creatureColumns=name=>Math.max(...CREATURE_SHEETS[name].rows.map(([,n])=>n));
// Which sprite files are usable: the manifest maps a sprite name to its file; unknown names are ignored.
export function spriteUrls(manifest,base){const out={};for(const name of [...SPRITE_NAMES,...SHEET_NAMES,...FX_NAMES,...CREATURE_NAMES])if(typeof manifest?.[name]==='string')out[name]=new URL('sprites/'+manifest[name],base).href;return out;}

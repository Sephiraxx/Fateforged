// The team cast (TEAM-BATTLES.md, "Team cast"): ten classes, each with subclasses that set the role, the weapon family
// and the two abilities. 2v2, 3v3 and 5v5 fighters come from this cast instead of the duel wheel: races keep their stat
// modifiers, and nobody has a weakness. Every class is equally likely, then every subclass of that class.
// Roles: the cast's roles (shown in the game) and the engine role each one plays (support → controller, bruiser →
// melee damage).
export const CAST_ROLES=Object.freeze({tank:'tank',healer:'healer',controller:'controller',damage:'damage',support:'controller',bruiser:'damage'});
export const CAST_ROLE_LABELS=Object.freeze({tank:'Tank',healer:'Healer',controller:'Controller',damage:'Damage',support:'Support',bruiser:'Bruiser'});
const castSub=(name,role,powers,weapons=null)=>Object.freeze({name,role,powers:Object.freeze(powers),...(weapons?{weapons:Object.freeze(weapons)}:{})});
export const TEAM_CLASSES=Object.freeze([
 {name:'Cleric',weapons:['Staff','Magic wand','Crystal orb','Spellbook'],subclasses:[
  castSub('Light','healer',['Healing touch','Mending wave']),castSub('Mercy','healer',['Healing touch','Resurrection']),castSub('Ward','healer',['Barrier','Healing touch'])]},
 {name:'Druid',weapons:['Staff','Crystal orb'],subclasses:[
  castSub('Grove','healer',['Regeneration','Life creation']),castSub('Forest','controller',['Entangling roots','Bramble patch']),castSub('Moon','controller',['Dream walking','Moonfire'])]},
 {name:'Warrior',weapons:['Longsword','Shield','Tower shield'],subclasses:[
  castSub('Vanguard','tank',['Guard','Taunt shout']),castSub('Berserker','damage',['Cleave','Charge'],['Greataxe','Battleaxe','Warhammer']),castSub('Duelist','damage',['Parry','Driving strike'],['Rapier','Katana','Longsword'])]},
 {name:'Guardian',weapons:['Shield','Tower shield','Warhammer','Mace'],subclasses:[
  castSub('Stoneguard','tank',['Last stand','Spirit armor']),castSub('Warden','tank',['Knock-up','Taunt shout']),castSub('Aegis','tank',['Aegis','Force fields'])]},
 {name:'Mage',weapons:['Staff','Magic wand','Crystal orb','Spellbook'],subclasses:[
  castSub('Fire','damage',['Fire control','Ember spark']),castSub('Blood','damage',['Blood bolt','Venom craft']),castSub('Frost','controller',['Ice control','Frost touch']),castSub('Chrono','controller',['Time slowing','Arcane silence'])]},
 {name:'Ranger',weapons:['Longbow','Crossbow','Spirit bow'],subclasses:[
  castSub('Marksman','damage',['Aimed shot','Chain shot']),castSub('Trapper','damage',['Crippling strike','Disarm shot']),castSub('Beastmaster','damage',['Beast command','Aimed shot'])]},
 {name:'Assassin',weapons:['Twin daggers','Shortsword','Katana'],subclasses:[
  castSub('Shadowblade','damage',['Invisibility','Backstab']),castSub('Riftwalker','damage',['Teleportation','Arcane silence']),castSub('Executioner','damage',['Death command','Execute']),castSub('Venomblade','damage',['Toxic blade','Shadowstep'],['Poisoned daggers'])]},
 {name:'Bard',weapons:['Magic wand','Spellbook','Throwing knives'],subclasses:[
  castSub('Skald','support',['Battle hymn','War cry']),castSub('Maestro','support',['Haste','Discord']),castSub('Siren','support',['Charm','Sound control'])]},
 {name:'Paladin',weapons:['Longsword','Warhammer','Blessed mace','Silver longsword'],subclasses:[
  castSub('Crusader','bruiser',['Smite','Zeal']),castSub('Justiciar','bruiser',['Judgment','Taunt shout']),castSub('Oathbreaker','bruiser',['Blood control','Dread aura'])]},
 {name:'Warlock',weapons:['Spellbook','Crystal orb','Staff'],subclasses:[
  castSub('Hexer','controller',['Curse','Enfeeble']),castSub('Soulbinder','controller',['Soul link','Blood control']),castSub('Voidcaller','controller',['Singularity','Dispel'])]}
].map(c=>Object.freeze({...c,weapons:Object.freeze(c.weapons),subclasses:Object.freeze(c.subclasses)})));
export const CAST_VERSION=5;
export function castSubclass(className,subclassName){const c=TEAM_CLASSES.find(x=>x.name===className);return c?.subclasses.find(s=>s.name===subclassName)??null;}

// A cast fighter's body comes from the wheel (race, subrace, class and stat traits, weapon, mastery); its stats are the
// sum of those options plus the same kit allowance for every subclass, so they can be checked from the traits alone.
export const CAST_BODY=Object.freeze(['race','subrace','class','strength','speed','durability','iq','magic','weapon','mastery']);
export const CAST_KIT=Object.freeze([30,30,30,30,30]);
// Hand balance (TEAM-BATTLES.md, "Hand balance"): extra stats per subclass on top of the kit allowance, tuned with
// scripts/balance-lab.mjs. They count in the fighter's stats but not in its tier, so a tier means the same body budget
// for every subclass. Order: strength, speed, durability, IQ, magic.
export const CAST_BONUS=Object.freeze({'Assassin (Executioner)':[-125,-65,-125,0,0],'Assassin (Riftwalker)':[185,90,185,0,0],'Assassin (Shadowblade)':[150,75,150,0,0],'Assassin (Venomblade)':[90,45,90,0,0],'Bard (Maestro)':[0,15,40,15,50],'Bard (Siren)':[0,-50,-90,-50,-125],'Bard (Skald)':[0,95,195,95,260],'Cleric (Light)':[0,-10,-25,-10,-30],'Cleric (Mercy)':[0,-30,-65,-30,-80],'Cleric (Ward)':[0,-25,-50,-20,-45],'Druid (Forest)':[0,15,30,15,35],'Druid (Grove)':[0,35,80,35,105],'Druid (Moon)':[0,-45,-85,-45,-115],'Guardian (Aegis)':[-100,-50,-100,0,0],'Guardian (Stoneguard)':[-95,-50,-95,0,0],'Guardian (Warden)':[185,90,185,0,0],'Mage (Blood)':[0,-65,-130,-65,-175],'Mage (Chrono)':[0,-65,-135,-65,-185],'Mage (Fire)':[0,-25,-50,-25,-65],'Mage (Frost)':[0,-50,-115,-50,-150],'Paladin (Crusader)':[-10,-5,-10,0,0],'Paladin (Justiciar)':[70,35,70,0,0],'Paladin (Oathbreaker)':[-105,-50,-105,0,0],'Ranger (Beastmaster)':[-115,-115,-95,0,0],'Ranger (Marksman)':[-40,-40,-35,0,0],'Ranger (Trapper)':[165,165,140,0,0],'Warlock (Hexer)':[0,-30,-60,-30,-75],'Warlock (Soulbinder)':[0,-50,-100,-50,-135],'Warlock (Voidcaller)':[0,-100,-195,-100,-260],'Warrior (Berserker)':[180,90,180,0,0],'Warrior (Duelist)':[235,115,235,0,0],'Warrior (Vanguard)':[170,75,170,0,0]});
const CAST_TIERS=[['E',0,349],['D',350,649],['C',650,999],['B',1000,1499],['A',1500,2099],['S',2100,2999],['SS',3000,Infinity]];
const castTierOf=total=>CAST_TIERS.find(([,lo,hi])=>total>=lo&&total<=hi)?.[0]??'E';
// The summary of a cast fighter, after checking its traits against the cast and the wheel pools. Throws on anything
// a cast fighter can't have.
export function castSummary(pools,traits){
 const c=TEAM_CLASSES.find(x=>x.name===traits?.class),s=c?.subclasses.find(x=>x.name===traits.subclass);
 if(!s)throw new Error('Unknown team class or subclass.');
 if(!(s.weapons??c.weapons).includes(traits.weapon))throw new Error(`${c.name} (${s.name}) fighters cannot carry ${traits.weapon}.`);
 if(traits.power!==s.powers[0]||traits.power2!==s.powers[1])throw new Error('Team fighters keep their subclass abilities.');
 if(traits.weakness!=='None')throw new Error('Team fighters have no weakness.');
 const stats=[...CAST_KIT];
 for(const key of CAST_BODY){const list=key==='subrace'?pools.subrace[traits.race]:pools.base[key],option=list?.find(o=>o.name===traits[key]);if(!option)throw new Error(`Invalid ${key}: ${traits[key]}.`);option.stats.forEach((n,i)=>stats[i]+=n);}
 const sum=list=>list.reduce((a,b)=>a+b,0),budget=sum(stats.map(v=>Math.max(0,v))),bonus=CAST_BONUS[`${c.name} (${s.name})`]??[0,0,0,0,0];
 const clean=stats.map((v,i)=>Math.max(0,v+bonus[i])),total=sum(clean);
 return {stats:clean,total,tier:castTierOf(budget),generationVersion:CAST_VERSION,castRole:s.role};
}

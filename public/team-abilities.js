import './support-abilities.js';
// Team abilities built from effect primitives. Each ability is data: what it
// targets and a list of effects; public/cast-ability-combat.js runs them. They join the generation-4 catalog, so a
// fighter whose traits name one of them gets it as a power (powerFor), like any other ability.
//
// Targets: enemy (the fighter's current target), ally (picked by `pick`), self, allies (around the caster, itself
// included), enemies (around the caster).
// Effects:
//   hit      {base:'spell'|'damage', mult, type, ambush?, execute?:{below,mult}, drain?}  a direct hit
//   dot      {base, per, for, type, selfHeal?}         damage over time (per second); selfHeal heals the source
//   status   {on:'target'|'self'|'allies'|'enemies'|'around', radius?, for, dmgOut?, dmgIn?, atk?, move?, acc?, healIn?, link?}
//   bounce   {count, radius, mult}                      the hit jumps to the nearest other enemies
//   control  {for, pull?}                               a stun (through kitControl), optionally pulling toward the caster
//   ward     {hits, for}                                blocks the next hits on the target
//   blink    'behind'                                   steps behind the target
//   evade    seconds of evasion for the caster
//   dispel   true: strips the target's buffs, wards and shields
const rows={
 moonfire:{name:'Moonfire',kind:'spell',cost:12,cooldown:8,windup:.3,range:240,target:'enemy',effects:[{dot:{base:'spell',per:.16,for:6,type:'arcane'}}],description:'Moonlight burns one enemy over six seconds.'},
 bloodBolt:{name:'Blood bolt',kind:'spell',cost:12,cooldown:7,windup:.3,range:260,target:'enemy',effects:[{hit:{base:'spell',mult:.45,type:'blood'}},{dot:{base:'spell',per:.12,for:5,type:'blood',selfHeal:.5}}],description:'A bolt of blood that keeps bleeding the target; half of the bleeding heals the caster.'},
 chainShot:{name:'Chain shot',kind:'technique',weapon:'ranged',cost:14,cooldown:8,windup:.3,range:260,target:'enemy',effects:[{hit:{base:'damage',mult:1,type:'physical'}},{bounce:{count:2,radius:140,mult:.6}}],description:'A shot that ricochets to two more enemies at 60%.'},
 backstab:{name:'Backstab',kind:'technique',weapon:'melee',cost:16,cooldown:7,windup:.2,range:45,target:'enemy',effects:[{hit:{base:'damage',mult:1.5,type:'physical',ambush:2}}],description:'A 150% weapon strike, doubled from stealth or against an enemy looking elsewhere.'},
 execute:{name:'Execute',kind:'technique',weapon:'melee',cost:18,cooldown:9,windup:.25,range:50,target:'enemy',effects:[{hit:{base:'damage',mult:1.1,type:'physical',execute:{below:.35,mult:2.4}}}],description:'A 110% weapon strike, 240% more against an enemy under 35% health.'},
 toxicBlade:{name:'Toxic blade',kind:'technique',weapon:'melee',cost:14,cooldown:8,windup:.2,range:45,target:'enemy',effects:[{hit:{base:'damage',mult:.8,type:'physical'}},{dot:{base:'damage',per:.1,for:5,type:'poison'}},{status:{on:'target',for:5,healIn:-.5}}],description:'A poisoned cut: poison for five seconds and half healing received.'},
 shadowstep:{name:'Shadowstep',kind:'technique',cost:12,cooldown:9,windup:.1,range:220,target:'enemy',effects:[{blink:'behind'},{evade:.3}],description:'Steps behind the target and briefly evades.'},
 battleHymn:{name:'Battle hymn',kind:'spell',cost:16,cooldown:14,windup:.4,range:170,target:'allies',effects:[{status:{on:'allies',radius:170,for:6,dmgOut:.15}}],description:'Nearby allies deal 15% more damage for six seconds.'},
 warCry:{name:'War cry',kind:'technique',cost:14,cooldown:14,windup:.25,range:150,target:'allies',effects:[{status:{on:'allies',radius:150,for:4,move:.2,dmgOut:.08}}],description:'Nearby allies move 20% faster and deal 8% more damage for four seconds.'},
 haste:{name:'Haste',kind:'spell',cost:12,cooldown:10,windup:.25,range:240,target:'ally',pick:'damage',effects:[{status:{on:'target',for:6,atk:.3,move:.2}}],description:'One ally attacks 30% and moves 20% faster for six seconds.'},
 discord:{name:'Discord',kind:'spell',cost:14,cooldown:11,windup:.35,range:240,target:'enemy',effects:[{status:{on:'around',radius:140,for:5,acc:-.2,atk:-.2}}],description:'Enemies around the target lose 20% accuracy and attack speed for five seconds.'},
 charm:{name:'Charm',kind:'spell',cost:16,cooldown:13,windup:.35,range:220,target:'enemy',effects:[{control:{for:1.2,pull:60}}],description:'The target stops fighting for 1.2 seconds and is drawn toward the caster.'},
 smite:{name:'Smite',kind:'spell',cost:12,cooldown:6,windup:.25,range:170,target:'enemy',effects:[{hit:{base:'spell',mult:1,type:'arcane'}}],description:'A holy strike for 100% spell strength.'},
 zeal:{name:'Zeal',kind:'technique',cost:12,cooldown:12,windup:.1,range:120,target:'self',effects:[{status:{on:'self',for:6,atk:.3}}],description:'Attacks 30% faster for six seconds once an enemy is close.'},
 judgment:{name:'Judgment',kind:'spell',cost:14,cooldown:9,windup:.3,range:200,target:'enemy',effects:[{hit:{base:'spell',mult:.6,type:'arcane'}},{status:{on:'target',for:5,dmgIn:.15}}],description:'A holy strike that marks the target: it takes 15% more damage for five seconds.'},
 dreadAura:{name:'Dread aura',kind:'spell',cost:14,cooldown:12,windup:.3,range:150,target:'enemies',effects:[{status:{on:'enemies',radius:150,for:5,dmgOut:-.2}}],description:'Nearby enemies deal 20% less damage for five seconds.'},
 curse:{name:'Curse',kind:'spell',cost:12,cooldown:9,windup:.3,range:240,target:'enemy',effects:[{status:{on:'target',for:6,dmgIn:.2}},{dot:{base:'spell',per:.06,for:6,type:'void'}}],description:'The target takes 20% more damage and withers for six seconds.'},
 enfeeble:{name:'Enfeeble',kind:'spell',cost:12,cooldown:10,windup:.3,range:240,target:'enemy',effects:[{status:{on:'target',for:5,dmgOut:-.25}}],description:'The target deals 25% less damage for five seconds.'},
 soulLink:{name:'Soul link',kind:'spell',cost:14,cooldown:12,windup:.35,range:240,target:'enemy',effects:[{status:{on:'target',for:6,link:.35}}],description:'For six seconds, 35% of the damage the target takes also hits its nearest ally.'},
 dispel:{name:'Dispel',kind:'spell',cost:12,cooldown:9,windup:.25,range:240,target:'enemy',effects:[{dispel:true},{hit:{base:'spell',mult:.3,type:'arcane'}}],description:'Strips the target’s buffs, wards and shields.'},
 aegisShield:{name:'Aegis',kind:'spell',cost:14,cooldown:10,windup:.3,range:220,target:'ally',pick:'threatened',effects:[{ward:{hits:2,for:4}}],description:'A threatened ally is warded against the next two hits for four seconds.'}
};
export const CAST_ABILITIES=Object.freeze(Object.fromEntries(Object.entries(rows).map(([id,a])=>[id,Object.freeze({id,group:'cast',rarity:'Rare',voice:a.kind==='spell',sprite:a.kind==='spell'?14:10,stats:Object.freeze([0,0,0,0,0]),tags:Object.freeze([]),...a})])));

// Join the generation-4 catalog so traits can name these abilities.
const catalog=globalThis.CURRENT_CLASS_ABILITIES;
if(catalog&&!catalog.abilities['Moonfire']){
 const byName=Object.fromEntries(Object.values(CAST_ABILITIES).map(a=>[a.name,a]));
 const definition=name=>byName[name]||Object.values(byName).find(a=>a.name.toLowerCase()===String(name).trim().toLowerCase())||catalog.definition(name);
 const compatible=(a,weapon)=>a.group==='cast'?!a.weapon||catalog.weaponType(weapon)===a.weapon:catalog.compatible(a,weapon);
 globalThis.CURRENT_CLASS_ABILITIES=Object.freeze({...catalog,abilities:Object.freeze(Object.assign(Object.create(null),catalog.abilities,byName)),definition,abilityId:name=>definition(name)?.id??catalog.abilityId(name),compatible});
}

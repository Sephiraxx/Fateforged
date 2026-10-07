// Team roles: tank, healer, controller or damage, derived from class identity, abilities, weapon and stats.
// Pure and deterministic; shared by the team engine, the exhibition UI and (later) coach valuation.
import './class-abilities.js';
import './support-catalog.js';
const CATALOG=globalThis.CURRENT_CLASS_ABILITIES;
const definitions=c=>(c.summary?.generationVersion??c.state?.generationVersion??c.generationVersion??1)>=4?CATALOG:globalThis.CLASS_ABILITIES;
export const TEAM_ROLES=Object.freeze(['tank','healer','controller','damage']);
export const ROLE_LABELS=Object.freeze({tank:'Tank',healer:'Healer',controller:'Controller',damage:'Damage'});
const HEALS={healing:3,life:3,regeneration:2.2,rewind:1,phoenix:.8,secondWind:.4,mendingWave:3,chainHeal:3,resurrection:2};
const HARD_CONTROL={dream:2.4,memory:2.4,silence:2,void:1.8,roots:2,telekinesis:1.6,kinetic:1.2,sound:1.2,metal:1,stunBolt:2,knockUp:1.2,disarmShot:1,tauntShout:1.2,hamstring:.8};
const SOFT_CONTROL={time:1.6,gravity:1.6,singularity:1.4,ice:1.1,frostTouch:.9,light:1,soul:1,cripplingStrike:.8,bramble:.7,shadow:.6};
const TANK_KIT={guard:1.2,parry:1,perfectCounter:1,lastStand:1.2,charge:.8,force:1.2,spiritArmor:1.2,crystal:.6,absorption:.6,mirror:.6};
const ATTACKS=new Set(['fire','storm','chainLightning','lava','blood','venom','thornBolt','seedburst','cleave','drivingStrike','aimedShot','ember','death','water','earth','custom','reality']);
const tagScore={tank:{defense:1.1,shield:1.4,endurance:1,counter:.6},healer:{healing:2.2,holy:.6,celestial:.3,spirit:.2},controller:{control:1.4,mind:1,time:1,illusion:.5,terrain:.4},damage:{strike:.8,elemental:.8,ranged:.6,poison:.5,drain:.5,death:.5,concealment:.5}};
const abilityIds=(traits,character)=>[traits.power,traits.power2].map(name=>name&&definitions(character).definition(name)?.id).filter(Boolean);
const weaponOf=name=>CATALOG.weapons[name]||CATALOG.weapons['Bare hands'];
// Closed-form combat numbers (same square-root scaling as the combat profile).
export function combatNumbers(character){
 const s=(character.summary?.stats||[0,0,0,0,0]).map(v=>Math.sqrt(Math.max(0,Number(v)||0))),traits=character.traits||character.state?.traits||{},w=weaponOf(traits.weapon);
 const maxHp=110+s[2]*13,armor=Math.min(.65,s[2]/(s[2]+70)),interval=Math.max(.26,1.15/(1+s[1]/36))*w.interval,damage=(9+s[0]*1.7)*w.damage;
 return {maxHp,armor,effectiveHp:maxHp/(1-armor),dps:damage/interval*(.76+Math.min(.2,s[3]/130)),spell:12+s[4]*2.3,weaponType:w.type,shield:(w.tags||[]).includes('shield')};
}
export function teamRole(character){
 const traits=character.traits||character.state?.traits||{},profile=CATALOG.profile(traits),ids=abilityIds(traits,character),n=combatNumbers(character);
 const scores={tank:0,healer:0,controller:0,damage:1.2};
 for(const [role,weights]of Object.entries(tagScore)){for(const tag of profile.core||[])scores[role]+=weights[tag]??0;for(const tag of profile.specialty||[])scores[role]+=(weights[tag]??0)*.6;for(const tag of profile.related||[])scores[role]+=(weights[tag]??0)*.25;}
 for(const id of ids){scores.healer+=HEALS[id]??0;scores.controller+=HARD_CONTROL[id]??SOFT_CONTROL[id]??0;scores.tank+=TANK_KIT[id]??0;if(ATTACKS.has(id))scores.damage+=.9;}
 if(!ids.some(id=>['healing','life','regeneration','mendingWave','chainHeal','resurrection'].includes(id)))scores.healer=Math.min(scores.healer,1.4);
 if(n.shield)scores.tank+=1.4;
 scores.tank+=Math.max(-1,Math.min(2.5,(n.effectiveHp-260)/90));
 scores.damage+=Math.max(0,Math.min(2.5,(n.dps-18)/10))+(n.weaponType==='melee'?0:.4);
 // Tanks hold the front line in melee: a bow, gun or spell focus never makes a fighter a tank.
 if(n.weaponType!=='melee')scores.tank=-99;
 const ranked=TEAM_ROLES.map(role=>[role,Math.round(scores[role]*100)/100]).sort((a,b)=>b[1]-a[1]||TEAM_ROLES.indexOf(b[0])-TEAM_ROLES.indexOf(a[0]));
 return {role:ranked[0][0],secondary:ranked[1][0],scores:Object.fromEntries(ranked)};
}

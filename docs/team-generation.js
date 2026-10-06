// Role-aware fighter generation for team play. Classes are forced first so every role appears in S/A pools,
// then a fighter is accepted only when its derived role matches (healers must actually roll healing magic).
import {tierCharacter} from './tier-generation.js';
import {teamRole} from './team-roles.js';
export const ROLE_CLASSES=Object.freeze({
 tank:['Guardian','Sentinel','Juggernaut','Warlord','Warrior','Paladin'],
 healer:['Healer','Cleric','Druid','Priest'],
 controller:['Psion','Illusionist','Oracle','Chronomancer'],
 damage:['Mage','Sorcerer','Elementalist','Ranger','Sniper','Assassin','Berserker','Samurai','Rogue','Death Knight','Spellblade','Warlock','Inquisitor','Monk']
});
// Team compositions for random exhibition teams.
export const COMPOSITIONS=Object.freeze({3:['tank','healer','damage'],5:['tank','healer','controller','damage','damage']});
export function seededRandom(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// Seeded tier odds for team pools: about 70% A, 28% S and 2% SS.
export function poolTier(random){const roll=random();return roll<.02?'SS':roll<.30?'S':'A';}
export function roleFighter(pools,luck,{role,tier,random,id,name}){
 const draw=n=>Math.floor(random()*n),classes=ROLE_CLASSES[role];let fallback=null;
 for(let attempt=0;attempt<40;attempt++){
  const forceClass=classes[Math.floor(random()*classes.length)],character=tierCharacter(pools,tier,{luck,draw,id,forceClass});
  character.name=name?name(character.traits):character.name;
  if(teamRole(character).role===role)return character;fallback??=character;
 }
 return fallback;
}
export function randomTeam(pools,luck,{size,seed,prefix='team',name}){
 const random=seededRandom(seed);
 return COMPOSITIONS[size].map((role,i)=>roleFighter(pools,luck,{role,tier:poolTier(random),random,id:`${prefix}-${seed}-${i}`,name}));
}
// Deterministic version-4-style UUID from a seeded random stream (pool fighters need storage-safe IDs).
export function seededUuid(random){const hex=Array.from({length:32},()=>Math.floor(random()*16).toString(16));hex[12]='4';hex[16]=(8+Math.floor(random()*4)).toString(16);const h=hex.join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
// One fighter per pool-plan slot (team-league.js poolPlan). Each slot has its own seeded stream, so a pool can be
// generated in chunks (keeping the page responsive) and still come out identical.
export function poolFighter(pools,luck,slot,index,seed,name){const random=seededRandom((seed^Math.imul(index+1,0x9e3779b1))>>>0);return roleFighter(pools,luck,{role:slot.role,tier:slot.tier,random,id:seededUuid(random),name});}

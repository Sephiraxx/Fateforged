// Role-aware fighter generation for team play. Classes are forced first so every role appears in S/A pools,
// then a fighter is accepted only when its derived role matches (healers must actually roll healing magic).
import {rollTeamKit} from './team-kits.js';
import {tierCharacter} from './tier-generation.js';
import {teamRole} from './team-roles.js';
export const ROLE_CLASSES=Object.freeze({
 tank:['Guardian','Sentinel','Juggernaut','Warlord','Warrior','Paladin'],
 healer:['Healer','Cleric','Druid','Priest'],
 controller:['Psion','Illusionist','Oracle','Chronomancer'],
 damage:['Ranger','Sniper','Hunter','Bounty Hunter','Mage','Sorcerer','Elementalist','Warlock','Assassin','Rogue','Samurai','Berserker']
});
// Damage dealers fight from behind the front line: mostly rangers with bows or guns (~60%), then casters (~30%).
// The few melee damage dealers (~10%) always carry a mobility move to make up for their thin health.
export const MOBILITY_POWERS=Object.freeze(['charge','teleport','portal','space']);
export const DAMAGE_PLAN=Object.freeze([
 ['Ranger',3,'ranged'],['Sniper',2,'ranged'],['Hunter',2,'ranged'],['Bounty Hunter',1.5,'ranged'],
 ['Mage',1.2,'arcane'],['Sorcerer',1,'arcane'],['Elementalist',1.2,'arcane'],['Warlock',.8,'arcane'],
 ['Assassin',.5,'melee'],['Rogue',.4,'melee'],['Samurai',.3,'melee'],['Berserker',.3,'melee']
].map(([name,weight,weapon])=>Object.freeze({name,weight,weapon})));
const DAMAGE_WEIGHT=DAMAGE_PLAN.reduce((n,x)=>n+x.weight,0);
function damageClass(random){let roll=random()*DAMAGE_WEIGHT;for(const x of DAMAGE_PLAN){roll-=x.weight;if(roll<0)return x;}return DAMAGE_PLAN[0];}
// Team compositions for random exhibition teams.
export const COMPOSITIONS=Object.freeze({2:['tank','damage'],3:['tank','healer','damage'],5:['tank','healer','controller','damage','damage']});
export function seededRandom(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// Seeded tier odds for team pools: about 70% A, 28% S and 2% SS.
export function poolTier(random){const roll=random();return roll<.02?'SS':roll<.30?'S':'A';}
export function roleFighter(pools,luck,{role,tier,random,id,name}){
 const draw=n=>Math.floor(random()*n),classes=ROLE_CLASSES[role];let fallback=null;
 for(let attempt=0;attempt<40;attempt++){
  let forceClass,options={};
  if(role==='damage'){const pick=damageClass(random);forceClass=pick.name;options={forceWeaponType:pick.weapon,...(pick.weapon==='melee'?{requirePower:MOBILITY_POWERS}:{})};}
  else{forceClass=classes[Math.floor(random()*classes.length)];if(role==='tank')options={forceWeaponType:'melee'};}// Tanks always fight in melee.
  const character=tierCharacter(pools,tier,{luck,draw,id,forceClass,...options});
  character.name=name?name(character.traits):character.name;
  if(teamRole(character).role===role){character.teamKit=rollTeamKit(role,random);return character;}fallback??=character;
 }
 if(fallback)fallback.teamKit=rollTeamKit(teamRole(fallback).role,random);return fallback;
}
// Random exhibition teams draw a coach-style composition (like league coaches do), so lineups vary.
const RANDOM_STYLES={fortress:{tank:2.2,healer:1.4,controller:.6,damage:1},glass:{tank:.4,healer:.6,controller:.8,damage:2.6},star:{tank:.8,healer:1.5,controller:.5,damage:1.8},tactician:{tank:.8,healer:1,controller:2,damage:1.2},balanced:{tank:1,healer:1,controller:.7,damage:1.6}};
export function randomComposition(size,random){const styles=Object.values(RANDOM_STYLES),weights=styles[Math.floor(random()*styles.length)],roles=Object.keys(weights),sharp=roles.map(r=>Math.pow(weights[r]*(.75+random()*.55),1.8)),total=sharp.reduce((a,b)=>a+b,0),raw=sharp.map(x=>x/total*size),counts=raw.map(Math.floor);let left=size-counts.reduce((a,b)=>a+b,0);
 for(const i of raw.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).map(x=>x[1])){if(left<=0)break;counts[i]++;left--;}return roles.flatMap((r,i)=>Array(counts[i]).fill(r));}
export function randomTeam(pools,luck,{size,seed,prefix='team',name}){
 const random=seededRandom(seed);
 return randomComposition(size,random).map((role,i)=>roleFighter(pools,luck,{role,tier:poolTier(random),random,id:`${prefix}-${seed}-${i}`,name}));
}
// Deterministic version-4-style UUID from a seeded random stream (pool fighters need storage-safe IDs).
export function seededUuid(random){const hex=Array.from({length:32},()=>Math.floor(random()*16).toString(16));hex[12]='4';hex[16]=(8+Math.floor(random()*4)).toString(16);const h=hex.join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
// One fighter per pool-plan slot (team-league.js poolPlan). Each slot has its own seeded stream, so a pool can be
// generated in chunks (keeping the page responsive) and still come out identical.
export function poolFighter(pools,luck,slot,index,seed,name){const random=seededRandom((seed^Math.imul(index+1,0x9e3779b1))>>>0);return roleFighter(pools,luck,{role:slot.role,tier:slot.tier,random,id:seededUuid(random),name});}

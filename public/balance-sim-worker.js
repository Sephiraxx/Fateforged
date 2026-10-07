import {simulateTeam} from './combat-team.js';
import {teamRole} from './team-roles.js';
import {seededRandom} from './team-generation.js';
import {auditControl,auditFeatures,auditSuggestion,balanceAuditPlan} from './balance-analysis.js';
const auditTactics=['balanced','defensive','aggressive','focus-healer'];
const auditMaps=['open','pillars','ruins','crossroads'];
export function simulateBalanceCandidate({world,plan,key},run=simulateTeam){
 const current=balanceAuditPlan(world,plan.phase);if(current.token!==plan.token||!plan.candidates.some(c=>c.key===key))throw Error('Balance simulation is stale.');
 const salt=key.split('').reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0),random=seededRandom(plan.seed^salt),pick=list=>list[Math.floor(random()*list.length)],roster=Object.values(world.fighters).filter(f=>f.team),carriers=roster.filter(f=>auditFeatures(f).includes(key)),cases=[],controls=new Set(),usedCarriers=new Set();
 for(let attempt=0;attempt<plan.pairs*30&&cases.length<plan.pairs;attempt++){
  const f=pick(carriers);if(!f)break;let control,controlId;
  if(key.startsWith('ability:')){const roll=Math.floor(random()*100000);control=auditControl(f,key,roll);controlId=control&&[control.traits.power,control.traits.power2].join('|');}
  else{const peers=roster.filter(p=>p.id!==f.id&&p.role===f.role&&p.summary.tier===f.summary.tier&&globalThis.CLASS_ABILITIES.weaponType(p.traits.weapon)===globalThis.CLASS_ABILITIES.weaponType(f.traits.weapon)),peer=pick(peers);control=auditControl(f,key,peer);controlId=peer?.id;}
  if(!control)continue;
  const team=pick(world.teams),mateIds=team.lineup.length===world.format?team.lineup:team.roster.slice(0,world.format),mates=mateIds.map(id=>world.fighters[id]).filter(m=>m.id!==f.id).slice(0,world.format-1);
  for(const m of roster)if(mates.length<world.format-1&&!mates.some(x=>x.id===m.id)&&m.id!==f.id)mates.push(m);
  if(mates.length!==world.format-1)continue;
  const clone=(c,i,side)=>({...structuredClone(c),id:`audit-${side}-${i}`,teamKit:null});
  cases.push({teams:[[f,...mates].map((c,i)=>clone(c,i,0)),[control,...mates].map((c,i)=>clone(c,i,1))],seed:Math.floor(random()*4294967296),conditions:{map:auditMaps[cases.length%auditMaps.length],time:cases.length%2?'night':'day',weather:cases.length%3?'clear':'rain',ground:'stone'},tactics:Array(2).fill(auditTactics[cases.length%auditTactics.length])});controls.add(controlId);usedCarriers.add(f.id);
 }
 if(cases.length!==plan.pairs||controls.size<2||usedCarriers.size<2)return {key,status:'unmatched'};
 const compare=(profile,holdout=false)=>cases.reduce((wins,c)=>{const seed=holdout?(c.seed^0x9e3779b9)>>>0:c.seed,opts={engineVersion:plan.engine,balance:profile,conditions:c.conditions,tactics:c.tactics},a=run(c.teams,seed,opts),b=run([c.teams[1],c.teams[0]],seed,opts);return wins+((a.winnerTeam===0?1:0)+(b.winnerTeam===1?1:0))/2;},0);
 const wins=compare(plan.profile),suggestion=auditSuggestion(plan.profile,key,wins,plan.pairs,plan.phase),profile=structuredClone(plan.profile);if(suggestion)profile.multipliers[suggestion.lever]=suggestion.to;
 const validationWins=suggestion?compare(plan.profile,true):wins,patchedWins=suggestion?compare(profile,true):wins;
 return {key,status:'tested',pairs:cases.length,wins,validationWins,patchedWins,controls:Math.min(controls.size,cases.length),carriers:Math.min(usedCarriers.size,cases.length)};
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=({data})=>{try{self.postMessage({id:data.dispatchId,results:simulateBalanceCandidate(data)});}catch(e){self.postMessage({id:data.dispatchId,error:e.message});}};

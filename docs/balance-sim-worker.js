import {simulateTeam} from './combat-team.js';
import {seededRandom} from './team-generation.js';
import {auditControl,auditCarries,auditCandidateSuggestion,balanceAuditPlan} from './balance-analysis.js';
const auditTactics=['balanced','defensive','aggressive','focus-healer'];
const auditMaps=['open','pillars','ruins','crossroads'];
export function simulateBalanceCandidate({world,plan,key},run=simulateTeam){
 const current=balanceAuditPlan(world,plan.phase);if(current.token!==plan.token||!plan.candidates.some(c=>c.key===key))throw Error('Balance simulation is stale.');
 const salt=key.split('').reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0),random=seededRandom(plan.seed^salt),pick=list=>list[Math.floor(random()*list.length)],roster=Object.values(world.fighters).filter(f=>f.team),carriers=roster.filter(f=>auditCarries(f,key)),cases=[],controls=new Set(),usedCarriers=new Set(),roleKey=key.startsWith('role:'),role=key.split(':')[1],count=Number(key.split(':')[3])||1;
 for(let attempt=0;attempt<plan.pairs*30&&cases.length<plan.pairs;attempt++){
  const f=pick(carriers);if(!f)break;let control,controlId;
  if(roleKey){
   // Replace one role while keeping the rest of the composition identical.
   // Match tier and rolled budget; keep real kits rather than inventing a
   // role by editing powers. Role differences are intentional in this test.
   const total=f.summary.stats.reduce((a,b)=>a+b,0),peers=roster.filter(p=>p.role!==role&&p.summary.tier===f.summary.tier&&Math.abs(p.ovr-f.ovr)<=10&&Math.abs(p.summary.stats.reduce((a,b)=>a+b,0)/total-1)<=.2).sort((a,b)=>Math.abs(a.ovr-f.ovr)-Math.abs(b.ovr-f.ovr)||a.id.localeCompare(b.id)).slice(0,8);
   control=pick(peers);controlId=control?.id;
  }else if(key.startsWith('ability:')){const roll=Math.floor(random()*100000);control=auditControl(f,key,roll);controlId=control&&[control.traits.power,control.traits.power2].join('|');}
  else{const peers=roster.filter(p=>p.id!==f.id&&p.role===f.role&&p.summary.tier===f.summary.tier&&globalThis.CLASS_ABILITIES.weaponType(p.traits.weapon)===globalThis.CLASS_ABILITIES.weaponType(f.traits.weapon)),peer=pick(peers);control=auditControl(f,key,peer);controlId=peer?.id;}
  if(!control)continue;
  const team=pick(world.teams),mateIds=team.lineup.length===world.format?team.lineup:team.roster.slice(0,world.format),mates=roleKey?[]:mateIds.map(id=>world.fighters[id]).filter(m=>m.id!==f.id).slice(0,world.format-1);
  const pool=roleKey?roster.map(m=>({m,order:random()})).sort((a,b)=>a.order-b.order).map(x=>x.m):roster;
  for(const m of pool){if(!m||mates.length===world.format-1||mates.some(x=>x.id===m.id)||m.id===f.id||m.id===control.id)continue;if(roleKey&&(m.role===role?mates.filter(x=>x.role===role).length>=count-1:mates.filter(x=>x.role!==role).length>=world.format-count))continue;mates.push(m);}
  if(mates.length!==world.format-1)continue;
  const clone=(c,i,side)=>({...structuredClone(c),id:`audit-${side}-${i}`,teamKit:null});
  cases.push({teams:[[f,...mates].map((c,i)=>clone(c,i,0)),[control,...mates].map((c,i)=>clone(c,i,1))],seed:Math.floor(random()*4294967296),conditions:{map:auditMaps[cases.length%auditMaps.length],time:cases.length%2?'night':'day',weather:cases.length%3?'clear':'rain',ground:'stone'},tactics:Array(2).fill(auditTactics[cases.length%auditTactics.length])});controls.add(controlId);usedCarriers.add(f.id);
 }
 if(cases.length!==plan.pairs||controls.size<2||usedCarriers.size<2)return {key,status:'unmatched'};
 const margin=(r,side)=>{const hp=r.objective?.coreHp??r.hp??[0,0];return (r.winnerTeam===side ? .5 : -.5)+(hp[side]-hp[1-side])/200;};
 const compare=(profile,holdout=false)=>{let wins=0;const margins=[];for(const c of cases){const seed=holdout?(c.seed^0x9e3779b9)>>>0:c.seed,opts={engineVersion:plan.engine,balance:profile,conditions:c.conditions,tactics:c.tactics},a=run(c.teams,seed,opts),b=run([c.teams[1],c.teams[0]],seed,opts);wins+=((a.winnerTeam===0?1:0)+(b.winnerTeam===1?1:0))/2;margins.push((margin(a,0)+margin(b,1))/2);}return {wins,margins,mean:margins.reduce((a,b)=>a+b,0)/cases.length};};
 const discovery=compare(plan.profile),wins=discovery.wins,suggestion=auditCandidateSuggestion(plan,key,wins),profile=structuredClone(plan.profile);if(suggestion)profile.multipliers[suggestion.lever]=suggestion.to;
 const validation=suggestion?compare(plan.profile,true):discovery,patched=suggestion?compare(profile,true):discovery;
 return {key,status:'tested',pairs:cases.length,wins,validationWins:validation.wins,patchedWins:patched.wins,validationMargin:validation.mean,patchedMargin:patched.mean,marginDeltas:patched.margins.map((m,i)=>m-validation.margins[i]),controls:Math.min(controls.size,cases.length),carriers:Math.min(usedCarriers.size,cases.length)};
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=({data})=>{try{self.postMessage({id:data.dispatchId,results:simulateBalanceCandidate(data)});}catch(e){self.postMessage({id:data.dispatchId,error:e.message});}};

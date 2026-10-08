import {simulateTeam} from './combat-team.js';
import {seededRandom} from './team-generation.js';
import {auditControl,auditCarries,auditBaseKey,auditScope,auditCandidateProposals,auditConcern,balanceAuditPlan} from './balance-analysis.js';
const auditTactics=['balanced','defensive','aggressive','focus-healer','protect-carry'];
const auditMaps=['open','pillars','ruins','crossroads'];
// A candidate's simulations come in batches of independent games (a comparison, or the validation and every
// proposal together). Each game result depends only on its own inputs, so a driver may run a batch in any order or
// in parallel: simulateBalanceCandidate runs batches in place, simulateBalanceCandidateAsync hands them to a pool.
function* candidateBatches({world,plan,key,mode='candidate',bundle},current=balanceAuditPlan(world,plan.phase)){if(current.token!==plan.token||!plan.candidates.some(c=>c.key===key))throw Error('Balance simulation is stale.');
 const descriptor=plan.candidates.find(c=>c.key===key),baseKey=auditBaseKey(key),scope=auditScope(key);
 const salt=key.split('').reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0),random=seededRandom(plan.seed^salt),pick=list=>list[Math.floor(random()*list.length)],roster=Object.values(world.fighters).filter(f=>f.team),carriers=roster.filter(f=>auditCarries(f,key)),cases=[],controls=new Set(),usedCarriers=new Set(),roleKey=baseKey.startsWith('role:')||descriptor.method==='role-intervention',role=descriptor.method==='role-intervention'?scope:baseKey.split(':')[1],count=Number(baseKey.split(':')[3])||1;
 for(let attempt=0;attempt<plan.pairs*30&&cases.length<plan.pairs;attempt++){
  const f=pick(carriers);if(!f)break;let control,controlId;
  if(roleKey){
   // Replace one role while keeping the rest of the composition identical.
   // Match tier and rolled budget; keep real kits rather than inventing a
   // role by editing powers. Role differences are intentional in this test.
   const total=f.summary.stats.reduce((a,b)=>a+b,0),peers=roster.filter(p=>p.role!==role&&p.summary.tier===f.summary.tier&&Math.abs(p.ovr-f.ovr)<=10&&Math.abs(p.summary.stats.reduce((a,b)=>a+b,0)/total-1)<=.2).sort((a,b)=>Math.abs(a.ovr-f.ovr)-Math.abs(b.ovr-f.ovr)||a.id.localeCompare(b.id)).slice(0,8);
   control=pick(peers);controlId=control?.id;
  }else if(baseKey.startsWith('weapon:')){const total=f.summary.total,peers=roster.filter(p=>p.role===f.role&&p.summary.tier===f.summary.tier&&globalThis.CLASS_ABILITIES.weaponType(p.traits.weapon)!==baseKey.split(':')[1]&&Math.abs(p.ovr-f.ovr)<=10&&Math.abs(p.summary.total/total-1)<=.2);control=pick(peers);controlId=control?.id;}else if(baseKey.startsWith('ability:')){const roll=Math.floor(random()*100000);control=auditControl(f,key,roll);controlId=control&&[control.traits.power,control.traits.power2].join('|');}
  else{const peers=roster.filter(p=>p.id!==f.id&&p.role===f.role&&p.summary.tier===f.summary.tier&&globalThis.CLASS_ABILITIES.weaponType(p.traits.weapon)===globalThis.CLASS_ABILITIES.weaponType(f.traits.weapon)),peer=pick(peers);control=auditControl(f,key,peer);controlId=peer?.id;if(!control){control=auditControl(f,key,Math.floor(random()*1000));controlId=control&&control.summary.stats.join('|');}}
  if(!control)continue;
  const team=pick(world.teams),mateIds=team.lineup.length===world.format?team.lineup:team.roster.slice(0,world.format),mates=roleKey?[]:mateIds.map(id=>world.fighters[id]).filter(m=>m.id!==f.id&&m.id!==control.id).slice(0,world.format-1);
  const pool=roleKey?roster.map(m=>({m,order:random()})).sort((a,b)=>a.order-b.order).map(x=>x.m):roster;
  for(const m of pool){if(!m||mates.length===world.format-1||mates.some(x=>x.id===m.id)||m.id===f.id||m.id===control.id)continue;if(roleKey&&(m.role===role?mates.filter(x=>x.role===role).length>=count-1:mates.filter(x=>x.role!==role).length>=world.format-count))continue;mates.push(m);}
  if(mates.length!==world.format-1)continue;
  const clone=(c,i,side)=>({...structuredClone(c),id:`audit-${side}-${i}`,teamKit:null});
  cases.push({carrierId:f.id,controlId,teams:[[f,...mates].map((c,i)=>clone(c,i,0)),[control,...mates].map((c,i)=>clone(c,i,1))],seed:Math.floor(random()*4294967296),conditions:{map:auditMaps[(2*cases.length+Math.floor(cases.length/4))%4],time:['day','dusk','night','dawn'][(cases.length+Math.floor(cases.length/4))%4],weather:['clear','rain','frost','storm'][cases.length%4],ground:cases.length%3?'stone':'water'},tactics:Array(2).fill(auditTactics[cases.length%auditTactics.length])});controls.add(controlId);usedCarriers.add(f.id);
 }
 if(cases.length!==plan.pairs)return {key,status:'unmatched'};
 const margin=(r,side)=>{const hp=r.objective?.coreHp??r.hp??[0,0];return (r.winnerTeam===side ? .5 : -.5)+(hp[side]-hp[1-side])/200;};
 // The games of a comparison over cases [from,to): each case is played from both sides with the same seed.
 const games=(profile,salt=0,from=0,to=plan.pairs)=>cases.slice(from,to).flatMap(c=>{const seed=(c.seed^salt)>>>0,options={engineVersion:plan.engine,balance:profile,conditions:c.conditions,tactics:c.tactics};return [{teams:c.teams,seed,options},{teams:[c.teams[1],c.teams[0]],seed,options}];});
 const tally=(results,pairs=results.length/2)=>{let wins=0;const margins=[];for(let i=0;i<results.length;i+=2){const a=results[i],b=results[i+1];wins+=((a.winnerTeam===0?1:0)+(b.winnerTeam===1?1:0))/2;margins.push((margin(a,0)+margin(b,1))/2);}return {wins,margins,mean:margins.reduce((a,b)=>a+b,0)/pairs};};
 const comparison=(baseline,patched)=>({key,status:'tested',pairs:plan.pairs,wins:baseline.wins,patchedWins:patched.wins,validationMargin:baseline.mean,patchedMargin:patched.mean,marginDeltas:patched.margins.map((m,i)=>m-baseline.margins[i])});
 if(mode==='bundle'){
  if(!bundle||!bundle.keys.includes(key))throw Error('Invalid combined patch request.');
  if(controls.size<2||usedCarriers.size<2)return {key,status:'unmatched'};
  const salt=(0x85ebca6b^Math.imul(bundle.index+1,0xc2b2ae35))>>>0,baseline=games(plan.profile,salt),results=yield [...baseline,...games(bundle.profile,salt)];
  return comparison(tally(results.slice(0,baseline.length)),tally(results.slice(baseline.length)));
 }
 // Without two distinct carriers and controls the candidate can never be tested, so it plays no fights.
 if(controls.size<2||usedCarriers.size<2)return {key,status:'limited',pairs:0,controls:Math.min(controls.size,plan.pairs),carriers:Math.min(usedCarriers.size,plan.pairs),feedback:[]};
 const pairs=Math.min(plan.pairs,plan.screenPairs),screenResults=yield games(plan.profile,0,0,pairs),screen=tally(screenResults);
 // A plan no longer than the screen has already played every pair, so it is always confirmed.
 const confirm=(plan.pairs<=plan.screenPairs||baseKey.startsWith('role:')||baseKey.startsWith('stat:')||auditConcern(descriptor.observed)||auditConcern(descriptor.parent)||screen.wins/pairs<=.25||screen.wins/pairs>=.75);
 if(!confirm){const screenedControls=new Set(cases.slice(0,pairs).map(c=>c.controlId)).size,screenedCarriers=new Set(cases.slice(0,pairs).map(c=>c.carrierId)).size;return {key,status:screenedControls<2||screenedCarriers<2?'limited':'screened',pairs,wins:screen.wins,controls:screenedControls,carriers:screenedCarriers,feedback:[]};}
 // Discovery plays every case with the screen's seeds, so the screened pairs are reused rather than replayed.
 const discovery=tally([...screenResults,...(pairs<plan.pairs?yield games(plan.profile,0,pairs):[])]),proposals=auditCandidateProposals(plan,key,discovery.wins),feedback=[];
 let validation=discovery;
 if(proposals.length){
  const profiles=proposals.map(({suggestion})=>{const profile=structuredClone(plan.profile);profile.multipliers[suggestion.lever]=suggestion.to;return profile;}),baseline=games(plan.profile,0x9e3779b9),patched=profiles.map(profile=>games(profile,0x9e3779b9));
  const results=yield [...baseline,...patched.flat()];validation=tally(results.slice(0,baseline.length));
  proposals.forEach(({field},i)=>{const from=baseline.length*(i+1);feedback.push({...comparison(validation,tally(results.slice(from,from+baseline.length))),field});});
 }
 return {key,status:'tested',pairs:plan.pairs,wins:discovery.wins,validationWins:validation.wins,feedback,controls:Math.min(controls.size,plan.pairs),carriers:Math.min(usedCarriers.size,plan.pairs)};
}
export function simulateBalanceCandidate(input,run=simulateTeam){
 const steps=candidateBatches(input);let step=steps.next();
 while(!step.done)step=steps.next(step.value.map(g=>run(g.teams,g.seed,g.options)));
 return step.value;
}
export async function simulateBalanceCandidateAsync(input,runBatch,current){
 const steps=candidateBatches(input,current);let step=steps.next();
 while(!step.done)step=steps.next(await runBatch(step.value));
 return step.value;
}
// Only what the audit reads from a game: the winner and the health left (Cores in objective modes).
export function auditGameResult(r){return {winnerTeam:r.winnerTeam,hp:r.hp,...(r.objective?{objective:{coreHp:r.objective.coreHp}}:{})};}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=({data})=>{try{self.postMessage({id:data.dispatchId,results:data.game?auditGameResult(simulateTeam(data.teams,data.seed,data.options)):simulateBalanceCandidate(data)});}catch(e){self.postMessage({id:data.dispatchId,error:e.message});}};

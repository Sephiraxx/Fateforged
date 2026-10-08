import assert from 'node:assert/strict';
import {squad,generation} from './team-fixtures.mjs';
import {neutralBalance,balanceRates} from '../public/team-balance.js';
import {balanceAuditPlan,applyBalanceAudit,auditSeasonRates,auditLever} from '../public/balance-analysis.js';
import {simulateBalanceCandidate} from '../public/balance-sim-worker.js';
import * as L from '../public/team-league.js';
import {completeAudit} from './balance-fixtures.mjs';

const roster=Array.from({length:6},(_,i)=>squad(['tank','healer','controller','damage'],30+i)).flat().map((f,i)=>({...f,...L.scoutFighter(f),team:'a',id:'f'+i}));
const world={id:'composition-check',seed:77,season:2,phase:'ready',format:2,settings:{battleMode:'teamfight'},fighters:Object.fromEntries(roster.map(f=>[f.id,f])),teams:[{id:'a',lineup:['f0','f3'],roster:roster.map(f=>f.id),coach:{personality:'balanced'}}],balance:neutralBalance()};
world.balance.previousSamples=Array.from({length:60},(_,i)=>[{key:'role:tank',won:i<12}]);
// Even many frequently seen, badly performing abilities cannot crowd out
// the strongest role concern. A rotating stat still gets checked.
for(let i=0;i<600;i++)world.balance.previousSamples.push(...Object.values(globalThis.CURRENT_CLASS_ABILITIES.abilities).map(a=>[{key:'ability:'+a.id,won:false}]));
const plan=balanceAuditPlan(world,'preseason');assert(plan.candidates.some(c=>c.key==='role:tank'));assert(plan.candidates.length>4);assert(plan.candidates.some(c=>c.key.startsWith('stat:')));
assert.equal(auditLever('role:tank:count:2'),'target:fortified');
const snapshot=structuredClone(world),seen={carriers:new Set(),controls:new Set()};
const response=(teams,seed,options,key)=>{if(key!=='role:tank')return {winnerTeam:seed%2,hp:seed%2?[0,50]:[50,0]};
 const side=teams.findIndex(t=>t[0].role==='tank'),buff=options.balance.multipliers['role:tank:health']>1;
 assert.notEqual(side,-1);assert.notEqual(teams[1-side][0].role,'tank');
 assert.equal(teams[0][0].summary.tier,teams[1][0].summary.tier);assert(Math.abs(teams[0][0].ovr-teams[1][0].ovr)<=10);assert(Math.abs(teams[1-side][0].summary.total/teams[side][0].summary.total-1)<=.2);
 assert.deepEqual(teams[0][1].traits,teams[1][1].traits);assert.deepEqual(teams[0][1].summary.stats,teams[1][1].summary.stats);
 seen.carriers.add(teams[side][0].name);seen.controls.add(teams[1-side][0].name);
 // A health improvement with zero flipped winners must be measurable.
 return {winnerTeam:1-side,hp:side===0?[0,buff?50:60]:[buff?50:60,0]};
};
const {report}=completeAudit(world,'preseason',response,['role:tank']),index=report.rows.findIndex(r=>r.key==='role:tank'),row=report.rows[index];
assert.equal(row.status,'tested');assert.equal(row.wins,0);assert.equal(row.feedback[0].patchedWins,0);assert(seen.carriers.size>=2&&seen.controls.size>=2);assert.deepEqual(world,snapshot);
const patched=structuredClone(world),patch=applyBalanceAudit(patched,'preseason',report);assert.equal(patch.changes[0].lever,'role:tank:health');assert.equal(patch.changes[0].to,1.1);
const stale=structuredClone(world);stale.fighters.f0.ovr++;assert.throws(()=>applyBalanceAudit(stale,'preseason',report),/stale/);
const noResponse=structuredClone(report);noResponse.bundles=[];noResponse.rows[index].feedback[0].patchedMargin=noResponse.rows[index].feedback[0].validationMargin;noResponse.rows[index].feedback[0].marginDeltas.fill(0);assert.equal(applyBalanceAudit(structuredClone(world),'preseason',noResponse).changes.length,0);
const noisy=structuredClone(report);noisy.bundles=[];noisy.rows[index].feedback[0].marginDeltas=Array.from({length:noisy.rows[index].pairs},(_,i)=>i%2?.2:-.18);noisy.rows[index].feedback[0].patchedMargin=noisy.rows[index].feedback[0].validationMargin+.01;assert.equal(applyBalanceAudit(structuredClone(world),'preseason',noisy).changes.length,0,'Noisy margin gains require assessment.');
const invalid=structuredClone(report);invalid.rows[index].feedback[0].marginDeltas[0]=NaN;assert.throws(()=>applyBalanceAudit(structuredClone(world),'preseason',invalid),/performance/);
const capped=structuredClone(world);capped.balance.profile.multipliers['role:tank:health']=1.15;const cap=completeAudit(capped,'preseason',response,['role:tank']);assert.equal(applyBalanceAudit(capped,'preseason',cap.report).changes.length,0);
const old=structuredClone(world);old.balance.previousSamples=Array.from({length:22},(_,i)=>[{key:'role:tank',won:i===0}]);old.lastOffseason={meta:{shift:{role:'tank',games:49,winPct:16.3}}};assert.deepEqual(auditSeasonRates(old,'preseason').find(r=>r.key==='role:tank'),{key:'role:tank',games:49,wins:8,rate:8/49});
const lean={...old,lastOffseason:{meta:{shift:old.lastOffseason.meta.shift}},balance:{profile:old.balance.profile,previousSamples:old.balance.previousSamples}};assert.equal(balanceAuditPlan(lean,'preseason').token,balanceAuditPlan(old,'preseason').token,'The worker snapshot and authority use identical season evidence.');
for(const format of [2,3,5]){
 const stacked=structuredClone(snapshot);stacked.format=format;stacked.settings.battleMode=format===2?'teamfight':'core';stacked.balance.previousSamples=Array.from({length:60},(_,i)=>[{key:'role:tank:count:2',won:i<12}]);
 const checked=completeAudit(stacked,'preseason',(teams,seed,options,key)=>{
  if(key!=='role:tank:count:2')return {winnerTeam:seed%2,hp:seed%2?[0,50]:[50,0]};
  const counts=teams.map(t=>t.filter(f=>f.role==='tank').length),side=counts.indexOf(2);assert.deepEqual([...counts].sort(),[1,2]);assert(teams.every(t=>t.length===format));assert.deepEqual(teams[0].slice(1).map(f=>f.traits),teams[1].slice(1).map(f=>f.traits));
  const hp=side===0?[0,options.balance.multipliers['target:fortified']>1?50:60]:[options.balance.multipliers['target:fortified']>1?50:60,0];return {winnerTeam:1-side,hp:[0,0],...(format===2?{hp}:{objective:{coreHp:hp}})};
 },['role:tank:count:2']);
 const result=applyBalanceAudit(stacked,'preseason',checked.report);assert.equal(result.changes[0].lever,'target:fortified');assert.equal(result.changes[0].to,1.1);
}

// Play a full season across a midseason audit, then check rollover retains
// observations from both halves and all role totals from the season report.
const seed=616,slots=L.poolPlan(2,8,seed),w=L.create({id:crypto.randomUUID(),format:2,teams:8,seed,fighters:slots.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`F${i}`))});L.draftPicks(w,1e6);L.startSeason(w);
let gameCount=0,midCount=0;
while(w.phase==='season'||w.phase==='playoffs'){
 const [m]=L.upcoming(w,1),side=m.seed%2,games=Array.from({length:Math.ceil(m.bestOf/2)},()=>({winnerTeam:side,seconds:30,reason:'Team eliminated',hp:side?[0,60]:[60,0],balanceId:m.balance.id,combatVersion:m.engineVersion,environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map(id=>({id,damage:100,healing:0,kills:0,deaths:0,ccSeconds:0}))}));
 L.recordMatch(w,m.id,games);gameCount+=games.length;
 if(w.balance.pendingAudit){midCount=w.balance.sampleGames;const p=balanceAuditPlan(w,'halfway');L.recordBalanceAudit(w,'halfway',{version:p.version,token:p.token,rows:p.candidates.map(c=>({key:c.key,status:'unmatched'}))});assert.equal(w.balance.samples.length,0);assert.equal(w.balance.seasonSampleGames,midCount);}
}
assert(midCount>0);assert.equal(w.balance.seasonSampleGames,gameCount);const full=L.seasonMeta(w),rookies=L.rookiePlan(w).map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,917,()=>`R${i}`));L.startOffseason(w,rookies);assert.equal(w.balance.previousSampleGames,gameCount);assert.deepEqual(w.balance.previousRoleRates,full.roleRates);assert(balanceRates(w.balance.previousSamples).length>0);
console.log('Composition balance passed: role priority despite crowded abilities, matched real kits, mirrored carriers and controls, useful margin gains without flipped winners, noise/no-response/cap guards, old-save evidence recovery and complete season retention across the midseason audit.');

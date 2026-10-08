// The team simulation speed-ups change no outcome: every team engine still produces its recorded games, the batched
// patch audit returns the same rows whichever driver runs it (and reuses the screened games), and the simulation pool
// hands queued tasks to whichever worker is free.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {squad,COMPOSITIONS,generation} from './team-fixtures.mjs';
import {TEAM_ENGINES} from '../public/combat-team.js';
import * as L from '../public/team-league.js';
import {balanceAuditPlan,nextAuditBundle} from '../public/balance-analysis.js';
import {simulateBalanceCandidate,simulateBalanceCandidateAsync,auditGameResult} from '../public/balance-sim-worker.js';
import {simulateTeamTask} from '../public/team-sim-worker.js';
import {createSimulationPool,poolSize,POOL_LIMIT} from '../public/simulation-client.js';

// 1. Recorded games for every engine.
const recorded=JSON.parse(fs.readFileSync('validation/team-engine-fingerprints.json','utf8'));
assert.deepEqual(Object.keys(recorded.fingerprints).map(k=>k.split(' ')[0]).filter((v,i,a)=>a.indexOf(v)===i).sort(),Object.keys(TEAM_ENGINES).sort(),'every team engine has recorded games');
for(const [label,expected]of Object.entries(recorded.fingerprints)){
 const [engine,comp]=label.split(' '),b=new TEAM_ENGINES[engine]([squad(COMPOSITIONS[comp],recorded.seed),squad(COMPOSITIONS[comp],recorded.seed+1)],recorded.seed,{headless:true,map:recorded.map,tactics:recorded.tactics,balance:recorded.balance});
 while(!b.done)b.step(1/60);
 assert.equal(createHash('sha256').update(JSON.stringify({r:b.result(),pos:b.fighters.map(f=>[f.x,f.y,f.hp])})).digest('hex').slice(0,24),expected,`${label} changed`);
}

// 2. The batched audit: the pool driver returns the same rows as the in-place driver (used by the server-side checks),
// and a tested candidate plays the protocol's games minus the screened pairs, which discovery reuses.
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
const fake=(teams,seed,options)=>{const h=hash(teams.map(t=>t.map(f=>f.traits.power+f.role).join('|')).join('#')+seed+JSON.stringify(options.balance.multipliers)),tanks=teams.map(t=>t.filter(f=>f.role==='tank').length),win=(tanks[0]-tanks[1])*.3+(h%1000)/1000-.5>0?0:1;return {winnerTeam:win,hp:win?[0,h%60+10]:[h%60+10,0]};};
function reference({world,plan,key},run){let replayed=0;const counted=(t,s,o)=>{replayed++;return run(t,s,o);};const row=simulateBalanceCandidate({world,plan,key},counted);return {row,replayed};}
const seed=283,pool=L.poolPlan(3,16,seed),fighters=pool.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`F${i}`)),world=L.create({id:'perf',format:3,teams:16,seed,fighters,battleMode:'core'});L.draftPicks(world,1000);
const plan=balanceAuditPlan(world,'preseason');let tested=0,skipped=0,games=0;const rows=[];
assert.equal(plan.pairs,16);assert.equal(balanceAuditPlan(world,'halfway').pairs,12,'midseason audits play fewer pairs');
for(const c of plan.candidates){
 const {row,replayed}=reference({world,plan,key:c.key},fake);games+=replayed;rows.push(row);
 const batched=await simulateBalanceCandidateAsync({world,plan,key:c.key},async batch=>batch.map(g=>auditGameResult(fake(g.teams,g.seed,g.options))),plan);
 assert.deepEqual(batched,row,c.key);
 if(row.status==='limited'&&row.pairs===0){skipped++;assert.equal(replayed,0,`${c.key}: a candidate that can never be tested plays no fights`);}
 if(row.status==='tested'){tested++;const protocol=plan.screenPairs*2+plan.pairs*2*(row.feedback.length?2+row.feedback.length:1);assert.equal(replayed,protocol-plan.screenPairs*2,`${c.key}: discovery reuses the ${plan.screenPairs} screened pairs`);}
}
assert(tested>3,'the fixture exercises tested candidates');assert(skipped>0,'the fixture exercises never-testable candidates');
const report={version:plan.version,token:plan.token,rows,bundles:[]},bundle=nextAuditBundle(world,'preseason',report);
if(!bundle.complete)for(const key of bundle.keys)assert.deepEqual(await simulateBalanceCandidateAsync({world,plan,key,mode:'bundle',bundle},async batch=>batch.map(g=>auditGameResult(fake(g.teams,g.seed,g.options))),plan),simulateBalanceCandidate({world,plan,key,mode:'bundle',bundle},fake),'bundle '+key);
// The team worker's audit game is the real simulation, reduced to what the audit reads.
{const teams=[squad(COMPOSITIONS.balanced3,5),squad(COMPOSITIONS.balanced3,6)],options={engineVersion:'team-3.6',balance:plan.profile,conditions:{map:'open',time:'day',weather:'clear',ground:'stone'},tactics:['balanced','balanced']};
 const r=simulateTeamTask({auditGame:true,teams,seed:9,options}),full=simulateTeamTask({exhibition:true,teams,seed:9,options});assert.deepEqual(r,{winnerTeam:full.winnerTeam,hp:full.hp,objective:{coreHp:full.objective.coreHp}});}

// 3. The pool: one shared queue, at most one task per worker, never more workers than its size.
assert.equal(poolSize(1),1);assert.equal(poolSize(4),3);assert.equal(poolSize(64),POOL_LIMIT);
{const started=[];let busy=0,peak=0;
 globalThis.Worker=class{constructor(){started.push(this);this.inFlight=0;}postMessage(data){this.inFlight++;busy++;peak=Math.max(peak,busy);assert(this.inFlight===1,'one task per worker');const ms=data.ms;setTimeout(()=>{this.inFlight--;busy--;if(data.fail)this.onmessage({data:{id:data.dispatchId,error:'boom'}});else this.onmessage({data:{id:data.dispatchId,results:data.value}});},ms);}terminate(){}};
 const p=createSimulationPool(new URL('file:///worker.js'),{size:3}),tasks=[400,10,10,10,10,10,10,10,10,10].map((ms,i)=>p.simulate({ms,value:i}));
 const failed=p.simulate({ms:5,fail:true}).then(()=>false,e=>e.message==='boom');
 const t=Date.now(),values=await Promise.all(tasks);assert.deepEqual(values,[0,1,2,3,4,5,6,7,8,9]);assert(await failed,'a failed task rejects on its own');
 assert.equal(started.length,3);assert(peak<=3);assert(Date.now()-t<700,'short tasks run beside a long one instead of queueing behind it');
 const closed=p.simulate({ms:50,value:1});p.close();await assert.rejects(closed,/closed/);delete globalThis.Worker;}
console.log(`Team performance paths: ${Object.keys(recorded.fingerprints).length} recorded engine games unchanged, batched audit identical over ${plan.candidates.length} candidates (${tested} tested with screened pairs reused, ${skipped} never-testable skipped), audit game results, and a shared-queue simulation pool passed.`);

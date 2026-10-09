// Midseason patch audit (rules v5): only season outliers are tested, the season sets the change (up to 10%), matched
// fights veto only on a clear contradiction or when the change hurts, the combined check reuses each baseline, levers
// stay within 30%, and both batch drivers agree.
import assert from 'node:assert/strict';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
import {AUDIT_RULES,balanceAuditPlan,auditMidseasonProposal,auditFamily,applyBalanceAudit,validateBalanceAudit} from '../public/balance-analysis.js';
import {simulateBalanceCandidate,simulateBalanceCandidateAsync} from '../public/balance-sim-worker.js';
import {validateBalanceProfile} from '../public/team-balance.js';
import {completeAudit} from './balance-fixtures.mjs';

assert.equal(AUDIT_RULES.version,5);assert.equal(AUDIT_RULES.halfway,.10);assert.equal(AUDIT_RULES.bound,.30);
const seed=919,slots=L.poolPlan(3,8,seed),base=L.create({id:'midseason-audit',format:3,teams:8,seed,fighters:slots.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`Mid ${i}`)),battleMode:'core'});L.draftPicks(base,1e6);
// Season record: controllers and tanks lose, MAG wins; everything else is within the normal range.
const season=[{key:'role:controller',games:60,wins:12},{key:'role:controller:count:2',games:40,wins:8},{key:'role:tank',games:70,wins:21},{key:'stat:MAG',games:60,wins:42},{key:'stat:STR',games:60,wins:31}];
const world=structuredClone(base);world.balance.samples=season;world.balance.pendingAudit='halfway';
const plan=balanceAuditPlan(world,'halfway'),tested=plan.candidates.filter(c=>c.test).map(c=>c.key).sort();

// 1. Only outliers are tested; one per role family; STR (52%) and everything without season evidence are not.
assert.deepEqual(tested,['role:controller','role:tank','stat:MAG'],`tested ${tested}`);assert(plan.candidates.length>10);
assert.equal(auditFamily('role:controller:count:2'),'role:controller');assert.equal(auditFamily('stat:MAG'),null);
// 2. The season sets the change: 20% → +10% (cap), 30% → +8%, 70% → −8%.
const step=key=>auditMidseasonProposal(plan,key)?.suggestion;
assert.deepEqual(step('role:controller'),{lever:'role:controller:control',from:1,to:1.1});assert.deepEqual(step('role:tank'),{lever:'role:tank:health',from:1,to:1.08});assert.deepEqual(step('stat:MAG'),{lever:'stat:MAG',from:1,to:.92});assert.equal(step('stat:STR'),undefined);

// 3. Synthetic matched fights (not evidence of real balance): controllers win half their pairs and all of them when
// buffed, so the change helps;
// MAG carriers always lose, which clearly contradicts the season; buffed tanks lose more, so that change hurts.
const games={};
const run=(teams,seed,options,key)=>{games[key]=(games[key]??0)+1;const carrier=teams.findIndex(t=>t[0].id==='audit-0-0'),m=options.balance.multipliers;
 if(key==='role:controller')return {winnerTeam:(m['role:controller:control']??1)>1||seed%2?carrier:1-carrier,hp:[50,50]};
 if(key==='stat:MAG')return {winnerTeam:1-carrier,hp:[50,50]};
 if(key==='role:tank')return {winnerTeam:(m['role:tank:health']??1)>1?1-carrier:seed%2?carrier:1-carrier,hp:[50,50]};
 return {winnerTeam:seed%2,hp:[50,50]};};
const {report}=completeAudit(world,'halfway',run);
for(const key of Object.keys(games))assert(tested.includes(key),`${key} is not an outlier but played fights`);
assert.equal(report.bundles.length,1,'one combined check');assert.deepEqual(report.bundles[0].rows.map(r=>r.key),['role:controller']);
for(const key of tested)assert.equal(games[key],plan.pairs*4+(key==='role:controller'?plan.pairs*2:0),`${key} games`);
const snapshot=structuredClone(world),entry=applyBalanceAudit(world,'halfway',report);
assert.deepEqual(entry.changes.map(c=>c.key),['role:controller']);assert.equal(world.balance.profile.multipliers['role:controller:control'],1.1);
assert.match(entry.changes[0].note,/season 20% in 60 games/);assert.equal(entry.simulationGames,plan.pairs*4*3+plan.pairs*2);
const diag=key=>entry.diagnostics.find(d=>d.key===key);
assert.equal(diag('stat:MAG').status,'needs-assessment');assert.match(diag('stat:MAG').note,/clearly disagree/);
assert.equal(diag('role:tank').status,'needs-assessment');assert.match(diag('role:tank').note,/worse/);
assert.equal(diag('stat:STR').status,'skipped');assert.match(diag('stat:STR').note,/normal range/);
// The combined check drops a change that hurts together with the others.
{const w=structuredClone(snapshot),hurt=(teams,seed,options,key)=>key==='role:controller'&&options.balance.id.startsWith('audit-bundle')?{winnerTeam:1-teams.findIndex(t=>t[0].id==='audit-0-0'),hp:[50,50]}:run(teams,seed,options,key);
 const r=completeAudit(w,'halfway',hurt).report,e=applyBalanceAudit(w,'halfway',r);assert.equal(e.changes.length,0);assert.match(e.diagnostics.find(d=>d.key==='role:controller').note,/worse together/);}

// 4. Reports are checked: a v4 report is stale, a non-outlier row with fights is rejected, the bundle must reuse the baseline.
assert.throws(()=>validateBalanceAudit(snapshot,'halfway',{...report,version:4}),/stale/);
{const bad=structuredClone(report),i=bad.rows.findIndex(r=>r.key==='stat:STR');bad.rows[i]={key:'stat:STR',status:'unmatched'};assert.throws(()=>validateBalanceAudit(snapshot,'halfway',bad),/Invalid/);}
{const bad=structuredClone(report);bad.bundles[0].rows[0].wins+=.5;assert.throws(()=>applyBalanceAudit(structuredClone(snapshot),'halfway',bad),/Invalid/);}

// 5. Levers stay within 30% of the base rules.
validateBalanceProfile({id:'wide',multipliers:{'role:tank:health':1.3,'stat:MAG':.7}});assert.throws(()=>validateBalanceProfile({id:'wide',multipliers:{'role:tank:health':1.31}}));
{const w=structuredClone(base);w.balance.samples=season;w.balance.pendingAudit='halfway';w.balance.profile={id:'p',multipliers:{'role:controller:control':1.25}};const p=balanceAuditPlan(w,'halfway');assert.equal(auditMidseasonProposal(p,'role:controller').suggestion.to,1.3);
 w.balance.profile.multipliers['role:controller:control']=1.3;assert.equal(auditMidseasonProposal(balanceAuditPlan(w,'halfway'),'role:controller'),null,'at the limit: nothing left to change');}

// 6. Both batch drivers return the same rows (in place and through a pool), including the combined check.
for(const key of tested){const fake=(teams,seed,options)=>run(teams,seed,options,key),input={world:snapshot,plan,key};assert.deepEqual(await simulateBalanceCandidateAsync(input,async batch=>batch.map(g=>fake(g.teams,g.seed,g.options)),plan),simulateBalanceCandidate(input,fake),key);}
{const bundle={...report.bundles[0]},next=(await import('../public/balance-analysis.js')).nextAuditBundle(snapshot,'halfway',{...report,bundles:[]}),fake=(teams,seed,options)=>run(teams,seed,options,'role:controller'),input={world:snapshot,plan,key:'role:controller',mode:'bundle',bundle:next};
 assert.deepEqual(await simulateBalanceCandidateAsync(input,async batch=>batch.map(g=>fake(g.teams,g.seed,g.options)),plan),simulateBalanceCandidate(input,fake));assert.deepEqual(simulateBalanceCandidate(input,fake),bundle.rows[0]);}
console.log(`Midseason audit v5: ${tested.length} outliers tested of ${plan.candidates.length} candidates; season-driven changes, vetoes, combined check, 30% bounds and validation passed.`);

// Read-only backup reproduction. Only an aggregate audit report is written.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
import {balanceAuditPlan,applyBalanceAudit,auditSeasonRates,nextAuditBundle} from '../public/balance-analysis.js';
const path=process.argv[2];if(!path)throw Error('Pass a SQLite backup path.');
const hash=()=>createHash('sha256').update(fs.readFileSync(path)).digest('hex'),before=hash(),db=new DatabaseSync(path,{readOnly:true});
const saved=db.prepare('SELECT state_json FROM team_worlds WHERE format=2').get().state_json;db.close();
const world=JSON.parse(saved.startsWith('gz:')?gunzipSync(Buffer.from(saved.slice(3),'base64')).toString('utf8'):saved),original=structuredClone(world),plan=balanceAuditPlan(world,'preseason');
assert(plan.candidates.some(c=>c.key==='role:tank'),'The observed tank concern is audited.');
const lanes=Array.from({length:4},()=>new Worker(new URL('./balance-evaluation-worker.mjs',import.meta.url),{workerData:{world,plan}})),waiting=new Map();let serial=0,next=0;
for(const lane of lanes){lane.on('message',m=>{const job=waiting.get(m.id);waiting.delete(m.id);m.error?job.reject(Error(m.error)):job.resolve(m.result);});lane.on('error',e=>{for(const job of waiting.values())job.reject(e);waiting.clear();});}
const evaluate=input=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});lanes[next++%lanes.length].postMessage({...input,id});});
console.log(`Full review: ${plan.candidates.length} candidates, ${plan.census.fighters} fighters.`);
let finished=0;const rows=await Promise.all(plan.candidates.map(async c=>{const r=await evaluate({key:c.key});console.log(`${++finished}/${plan.candidates.length} ${c.key}: ${r.status}`);return r;}));
assert.deepEqual(world,original,'Simulation never edits the loaded world.');
const reportData={version:plan.version,token:plan.token,rows,bundles:[]};
for(;;){const bundle=nextAuditBundle(world,'preseason',reportData);if(bundle.complete)break;console.log(`Combined validation ${bundle.index+1}: ${bundle.changes.length} proposed changes, ${bundle.keys.length} comparisons.`);const comparisons=await Promise.all(bundle.keys.map(key=>evaluate({key,mode:'bundle',bundle})));reportData.bundles.push({index:bundle.index,profileToken:bundle.profileToken,rows:comparisons});}
await Promise.all(lanes.map(l=>l.terminate()));
fs.mkdirSync('validation/check-output',{recursive:true});fs.writeFileSync('validation/check-output/comprehensive-raw-report.json',JSON.stringify(reportData));
const patch=applyBalanceAudit(world,'preseason',reportData);
assert(patch.diagnostics.some(d=>d.key==='role:tank'&&d.status!=='stable'),'The tank concern cannot silently disappear.');
assert.equal(hash(),before,'The source SQLite backup is unchanged.');
const report={auditVersion:plan.version,sourceSha256:before,season:original.season,previousSeasonRoleRates:auditSeasonRates(original,'preseason').filter(r=>/^role:\w+$/.test(r.key)),coverage:patch.coverage,newCandidates:plan.candidates.map(c=>c.key),changes:patch.changes,diagnostics:patch.diagnostics,combined:patch.combined,simulationGames:patch.simulationGames,sourceUnchanged:true};
fs.writeFileSync('validation/comprehensive-save-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({coverage:report.coverage,changes:report.changes,simulationGames:report.simulationGames,combinedAttempts:report.combined.length,sourceUnchanged:true},null,2));

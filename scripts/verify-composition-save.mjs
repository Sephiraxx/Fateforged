// Read-only backup reproduction. Only an aggregate audit report is written.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {balanceAuditPlan,applyBalanceAudit,auditSeasonRates} from '../public/balance-analysis.js';
import {simulateBalanceCandidate} from '../public/balance-sim-worker.js';
const path=process.argv[2];if(!path)throw Error('Pass a SQLite backup path.');
const hash=()=>createHash('sha256').update(fs.readFileSync(path)).digest('hex'),before=hash(),db=new DatabaseSync(path,{readOnly:true});
const saved=db.prepare('SELECT state_json FROM team_worlds WHERE format=2').get().state_json;db.close();
const world=JSON.parse(saved.startsWith('gz:')?gunzipSync(Buffer.from(saved.slice(3),'base64')).toString('utf8'):saved),original=structuredClone(world),plan=balanceAuditPlan(world,'preseason');
assert(plan.candidates.some(c=>c.key==='role:tank'),'The observed tank concern is audited.');
const rows=[];for(const c of plan.candidates){console.log('Checking '+c.key);rows.push(simulateBalanceCandidate({world,plan,key:c.key}));}
assert.deepEqual(world,original,'Simulation never edits the loaded world.');
const patch=applyBalanceAudit(world,'preseason',{version:plan.version,token:plan.token,rows});
assert(patch.diagnostics.some(d=>d.key==='role:tank'&&d.status!=='stable'),'The tank concern cannot silently disappear.');
assert.equal(hash(),before,'The source SQLite backup is unchanged.');
const report={sourceSha256:before,season:original.season,previousSeasonRoleRates:auditSeasonRates(original,'preseason').filter(r=>/^role:\w+$/.test(r.key)),oldAudits:original.balance.history.filter(p=>p.diagnostics).map(p=>({season:p.season,phase:p.phase,changes:p.changes.length,checked:p.diagnostics.map(d=>d.key)})),newCandidates:plan.candidates.map(c=>c.key),changes:patch.changes,diagnostics:patch.diagnostics.map(({marginDeltas,...d})=>d),simulationGames:patch.simulationGames,sourceUnchanged:true};
fs.writeFileSync('validation/composition-save-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

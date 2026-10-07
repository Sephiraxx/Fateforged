import assert from 'node:assert/strict';import initSqlJs from 'sql.js';import {indexedDB} from 'fake-indexeddb';
import {heavySave,tableSizes} from './measure-save.mjs';
import * as L from '../public/team-league.js';
import {generation} from './team-fixtures.mjs';
const {createStorage}=await import('../_site/sqlite-store.js'),{default:migrations}=await import('../_site/local-schema.js'),{default:worker}=await import('../_site/local-api.js');
const SQL=await initSqlJs(),fresh=name=>createStorage({SQL,migrations,worker,indexedDB,databaseName:name+Math.random()});

// A full 32-team 5v5 season and an 8-team 3v3 season, simulated week by week, stay small; receipts are hashes.
const bytes=await heavySave(),sizes=tableSizes(bytes),rows=t=>sizes.tables.find(x=>x.table===t)?.rows??0;
assert(sizes.file<1.5*1048576,`A full season of two team leagues stays under 1.5 MB (got ${(sizes.file/1048576).toFixed(2)} MB)`);
const saved=new SQL.Database(bytes);assert.equal(saved.exec("SELECT COUNT(*) FROM team_operations WHERE request_json NOT LIKE 'sha256:%'")[0].values[0][0],0,'Receipts store hashes, not requests.');saved.close();
assert.equal(sizes.freeBytes,0,'Backups are vacuumed.');

// Receipts are capped at the newest 200, and retries still behave: same request accepted, a different one refused.
const storage=fresh('receipts');let revision=0;
let lastBody;const post=async body=>{lastBody=body;const r=await storage.fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(r.ok)revision=data.revision;return {status:r.status,data};};
const send=(body,operationId=crypto.randomUUID())=>post({format:3,revision,operationId,...body});
const seed=77,plan=L.poolPlan(3,8,seed);
assert.equal((await send({action:'start',worldId:crypto.randomUUID(),teams:8,seed,fighters:plan.map((s,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,s,i,seed,()=>'F'+i)).map(f=>({id:f.id,name:f.name,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}}))})).status,200);
assert.equal((await send({action:'draft',count:1000})).status,200);
const team=(await send({action:'claim',team:null})).data.world.teams[0].id;let last;
for(let i=0;i<230;i++)assert.equal((await send({action:'claim',team:i%2?null:team})).status,200);
const sent=lastBody,before=revision;assert.equal((await post(sent)).status,200);assert.equal(revision,before,'A retried command is recognised and not applied twice.');
assert.equal((await post({...sent,team:sent.team===null?team:null})).status,409,'Reusing an operation for a different request is refused.');
const db=new SQL.Database(await storage.exportBackup());assert.equal(db.exec('SELECT COUNT(*) FROM team_operations')[0].values[0][0],200,'Only the newest 200 receipts are kept.');db.close();

// An old, receipt-heavy backup imports, shrinks, and keeps every saved record.
const legacy=new SQL.Database(bytes),filler=JSON.stringify({action:'record',results:Array.from({length:40},(_,i)=>({matchId:'m'+i,games:[{note:'x'.repeat(400)}]}))});
for(let i=0;i<3000;i++)legacy.run('INSERT INTO team_operations(owner_id,operation_id,request_json) VALUES(?,?,?)',['local',crypto.randomUUID(),filler]);
for(let i=0;i<1500;i++)legacy.run('INSERT INTO league_operations(owner_id,operation_id,request_json) VALUES(?,?,?)',['local',crypto.randomUUID(),filler]);
const legacyBytes=legacy.export();legacy.close();
const target=fresh('import'),{before:importedBefore,after}=await target.importBackup(legacyBytes);
assert.equal(importedBefore,legacyBytes.length);assert(after<legacyBytes.length/20,`Import compacts the backup (${legacyBytes.length} → ${after} bytes)`);
const restored=new SQL.Database(await target.exportBackup()),original=new SQL.Database(bytes);
for(const {table}of sizes.tables.filter(t=>!t.table.endsWith('_operations'))){const dump=d=>JSON.stringify(d.exec(`SELECT * FROM ${table} ORDER BY 1,2`));assert.equal(dump(restored),dump(original),`${table} survives the import unchanged`);}
for(const table of ['team_operations','league_operations'])assert.equal(restored.exec(`SELECT COUNT(*) FROM ${table} WHERE request_json NOT LIKE 'sha256:%'`)[0].values[0][0],0,'Stale full-request receipts are dropped on import.');
console.log(`Save size passed: two full team-league seasons save in ${(sizes.file/1024).toFixed(0)} KB with hashed receipts, receipts capped at 200 with retries intact, and a ${(legacyBytes.length/1048576).toFixed(1)} MB receipt-heavy backup imports as ${(after/1024).toFixed(0)} KB with every record unchanged.`);

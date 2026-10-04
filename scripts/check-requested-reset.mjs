import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {applyRequestedReset,REQUESTED_RESET_OWNER as owner,REQUESTED_RESET_KEY as key,RESET_TABLES} from '../worker/requested-reset.mjs';
const db=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const templates={
 saved_characters:{id:'fighter',name:'Fighter',state_json:'{}',summary_json:'{}',created_at:1,updated_at:1},
 saved_tournaments:{id:'cup',name:'Cup',state_json:'{}',summary_json:'{}',created_at:1,updated_at:1},
 current_champions:{division_key:'any|any|any',label:'Open',character_id:'fighter',character_name:'Fighter',tournament_id:'cup',tournament_name:'Cup',completed_at:1},
 champion_history:{tournament_id:'cup',tournament_name:'Cup',division_key:'any|any|any',label:'Open',character_id:'fighter',character_name:'Fighter',completed_at:1},
 tournament_name_claims:{name:'Cup'},
 roster_archives:{batch_key:'old',character_id:'fighter',name:'Fighter',state_json:'{}',summary_json:'{}',created_at:1,updated_at:1,archived_at:1},
 roster_refreshes:{batch_key:'old',nonce:'nonce',template_json:'{}',result_json:'{}',created_at:1},
 match_record_sync:{tournament_id:'cup',matches:1},
 match_records:{event_id:'match',tournament_id:'cup',character_a:'fighter',character_b:'other',winner:'fighter',score_json:'[1,0]',recorded_at:1},
 fighter_growth:{event_id:'growth',character_id:'fighter',opponent_id:'other',axis:'strength',amount:3,earned_at:1},
 fighter_growth_sync:{tournament_id:'cup',matches:1}
};
function seed(who,suffix=''){for(const [table,body] of Object.entries(templates)){const row={owner_id:who,...body};if(table==='saved_characters'||table==='saved_tournaments')row.id+=who+suffix;const cols=Object.keys(row);db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).run(...Object.values(row));}}
seed(owner);seed('another-owner');
let failBatch=true,batchChain=Promise.resolve();
const env={DB:{prepare(sql){let args=[];return{sql,bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},batch(statements){const result=batchChain.then(async()=>{db.exec('BEGIN');try{for(const stmt of statements){if(failBatch&&stmt.sql.startsWith('DELETE FROM saved_tournaments'))throw Error('Simulated database failure');await stmt.run();}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}});batchChain=result.catch(()=>{});return result;}}};
await assert.rejects(applyRequestedReset(env),/Simulated/);
for(const table of RESET_TABLES)assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE owner_id=?`).get(owner).n,1,table+' rollback');
failBatch=false;await Promise.all([applyRequestedReset(env),applyRequestedReset(env)]);
for(const table of RESET_TABLES){assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE owner_id=?`).get(owner).n,table==='roster_refreshes'?1:0,table+' cleared');assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE owner_id=?`).get('another-owner').n,1,table+' owner isolation');}
assert(db.prepare('SELECT result_json FROM roster_refreshes WHERE owner_id=? AND batch_key=?').get(owner,key).result_json.includes('cleanSlate'));
seed(owner,'new');await applyRequestedReset(env);
for(const table of RESET_TABLES)assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE owner_id=?`).get(owner).n,table==='roster_refreshes'?2:1,table+' new data survives');
console.log('Clean slate checks passed: all 11 tables, atomic rollback, concurrent once-only guard, owner isolation, fresh data preserved and no repeated purge.');
// Verify the built Worker executes the requested reset on the actual Site entry
// route, and that a later entry request cannot remove new testing data.
db.prepare('DELETE FROM roster_refreshes WHERE owner_id=? AND batch_key=?').run(owner,key);
const worker=(await import('../dist/server/index.js')).default;
assert.equal((await worker.fetch(new Request('https://fateforge.test/'),env)).status,200);
for(const table of RESET_TABLES)assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE owner_id=?`).get(owner).n,table==='roster_refreshes'?2:0,table+' Worker reset');
seed(owner,'after-worker');assert.equal((await worker.fetch(new Request('https://fateforge.test/arena'),env)).status,200);
assert.equal(db.prepare('SELECT count(*) AS n FROM saved_characters WHERE owner_id=?').get(owner).n,1);
console.log('Built Worker reset trigger passed: first load clears requested data; subsequent loads keep new fighters.');

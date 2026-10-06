import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
import {createTournament,defaultStage,nextMatch,recordMatch} from '../public/tournaments.js';
import {NAME_REPAIR_OWNER as owner,NAME_REPAIR_KEY,NAME_REPAIRS} from '../worker/tournament-names.mjs';
import {REQUESTED_RESET_KEY} from '../worker/requested-reset.mjs';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let failSave=false,queue=Promise.resolve();
const env={DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this;},first:async()=>{if(failSave&&sql.startsWith('INSERT INTO saved_tournaments')){failSave=false;throw Error('Injected save failure');}return db.prepare(sql).get(...args)||null;},all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},batch(stmts){const p=queue.then(async()=>{db.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}});queue=p.catch(()=>{});return p;}}};
const call=(path,body)=>worker.fetch(new Request('https://fateforge.test/api/'+path,{method:body?'PUT':'GET',headers:{'content-type':'application/json','oai-authenticated-user-id':owner},...(body?{body:JSON.stringify(body)}:{})}),env);
const generated=await worker.fetch(new Request('https://fateforge.test/api/characters/bulk-generate',{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':owner},body:JSON.stringify({ids:[crypto.randomUUID(),crypto.randomUUID()]})}),env);
assert.equal(generated.status,200);const roster=(await generated.json()).characters;
const cup=name=>createTournament(name,roster,[defaultStage('single')],123,{shuffle:false});
const save=(id,state)=>call('tournaments/'+id,{name:state.name,state});
const names=async replies=>{const out=[];for(const response of replies){assert.equal(response.status,200,await response.clone().text());out.push((await response.json()).tournament.name);}return out;};
const id=crypto.randomUUID(),state=cup('Retry Cup');
assert.deepEqual(await names(await Promise.all([save(id,state),save(id,state)])),['Retry Cup','Retry Cup']);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tournament_name_claims WHERE tournament_id=?').get(id).n,1);
assert.equal((await names([await save(id,state)]))[0],'Retry Cup');
const collision=await names(await Promise.all([save(crypto.randomUUID(),cup('Collision Cup')),save(crypto.randomUUID(),cup('Collision Cup'))]));
assert.deepEqual(collision.sort(),['Collision Cup','Collision Cup 2']);
const interrupted=crypto.randomUUID(),pending=cup('Interrupted Cup');failSave=true;
const originalError=console.error;console.error=()=>{};try{assert.equal((await save(interrupted,pending)).status,503);}finally{console.error=originalError;}
assert.equal((await names([await save(interrupted,pending)]))[0],'Interrupted Cup');
for(const [tid,name]of NAME_REPAIRS){const t=cup(name+' 2');const m=nextMatch(t);recordMatch(t,m,Array.from({length:3},()=>({winner:m.a,seconds:1,combatVersion:12})));assert.equal((await save(tid,t)).status,200);db.prepare('UPDATE tournament_name_claims SET tournament_id=NULL,display_name=NULL WHERE tournament_id=?').run(tid);db.prepare('INSERT INTO tournament_name_claims (owner_id,name) VALUES (?,?)').run(owner,name.toLowerCase());}
db.prepare('INSERT INTO tournament_name_claims (owner_id,name) VALUES (?,?)').run('other-owner','moonfall clash');
db.prepare('INSERT INTO roster_refreshes (owner_id,batch_key,nonce,template_json,result_json,created_at) VALUES (?,?,?,?,?,?)').run(owner,REQUESTED_RESET_KEY,'completed','{}','{}',1);
const counts=()=>['saved_characters','saved_tournaments','champion_history','current_champions','match_records','fighter_growth'].map(table=>db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n),before=counts();
const completedBefore=db.prepare('SELECT tournament_id,character_id,completed_at FROM champion_history ORDER BY tournament_id').all();
assert.equal((await worker.fetch(new Request('https://fateforge.test/arena'),env)).status,200);
assert.deepEqual(counts(),before);assert.deepEqual(db.prepare('SELECT tournament_id,character_id,completed_at FROM champion_history ORDER BY tournament_id').all(),completedBefore);
for(const [tid,name]of NAME_REPAIRS){const r=await call('tournaments/'+tid);assert.equal(r.status,200);const t=(await r.json()).tournament;assert.equal(t.name,name+' 2');assert.equal(t.state.name,name+' 2');assert.equal(db.prepare('SELECT tournament_name FROM champion_history WHERE tournament_id=?').get(tid).tournament_name,name+' 2');}
assert(db.prepare('SELECT 1 FROM tournament_name_claims WHERE owner_id=?').get('other-owner'));
assert(!db.prepare('SELECT 1 FROM roster_refreshes WHERE owner_id=? AND batch_key=?').get(owner,NAME_REPAIR_KEY));
assert.equal((await names([await save(crypto.randomUUID(),cup('Moonfall Clash'))]))[0],'Moonfall Clash 3');
const after=counts();assert.equal((await worker.fetch(new Request('https://fateforge.test/'),env)).status,200);assert.deepEqual(counts(),after);
console.log('Tournament names passed: simultaneous idempotent claims, distinct-cup suffixes, failed-save retries, owner isolation and unchanged saved names/history on site entry.');

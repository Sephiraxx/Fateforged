import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
import {indexedDB} from 'fake-indexeddb';
import worker from '../_site/local-api.js';
import migrations from '../_site/local-schema.js';
import {createStorage,sqliteAdapter} from '../_site/sqlite-store.js';
import {createTournament,defaultStage,nextMatch,recordMatch} from '../public/tournaments.js';
import {Battle} from '../public/combat.js';

const SQL=await initSqlJs();
const config={SQL,migrations,worker,indexedDB,databaseName:'pages-tests'};
let storage=createStorage(config);
const call=async(path,method='GET',body,instance=storage)=>{
 const response=await instance.fetch('/api/'+path,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();return {status:response.status,...data};
};
const ok=response=>assert.equal(response.status,200,response.error);
assert.deepEqual((await call('characters')).characters,[]);
const batches=Array.from({length:4},()=>Array.from({length:8},()=>crypto.randomUUID()));
// Independent tabs without Web Locks must still never overwrite each other.
const tabs=[storage,createStorage(config)];
for(const response of await Promise.all(batches.map((ids,i)=>call('characters/bulk-generate','POST',{ids},tabs[i%2]))))ok(response);
let roster=(await call('characters')).characters;assert.equal(roster.length,32);
for(const tier of ['E','D','C','B','A','S','SS']){const response=await call('characters/bulk-generate','POST',{ids:[crypto.randomUUID()],tier});ok(response);assert.equal(response.characters[0].summary.tier,tier);}
assert.equal((await call('characters/bulk-generate','POST',{ids:[crypto.randomUUID()],tier:'SSS'})).status,400);
roster=(await call('characters')).characters;
const original=(await call('characters/'+roster[0].id)).character;
assert.equal((await call('characters/'+original.id,'PUT',{name:'Edited',state:original.state})).status,409);
assert.equal((await call('characters/'+original.id)).character.name,original.name);
// A multi-stage cup retains compressed snapshots, titles, records and stage history.
const state=createTournament('Pages Cup',roster.slice(0,8),[{...defaultStage('groups'),groups:2,advance:4},{...defaultStage('swiss'),rounds:3,advance:2},defaultStage('double')],123,{shuffle:false});
const id=crypto.randomUUID();
const save=()=>call('tournaments/'+id,'PUT',{name:state.name,state});
ok(await save());ok(await save());
assert.equal((await call('tournaments/'+id)).tournament.name,'Pages Cup');
let n=0;while(!state.done){assert(++n<150);const m=nextMatch(state);recordMatch(state,m,Array.from({length:Math.floor((m.bestOf||1)/2)+1},()=>({winner:m.a,seconds:1,combatVersion:9})));ok(await save());}
let crowns=await call('champions');ok(crowns);assert(crowns.champions.some(c=>c.characterId===state.champion));
const titlesBefore=JSON.stringify(crowns.records);ok(await save());assert.equal(JSON.stringify((await call('champions')).records),titlesBefore);
assert((await call('characters')).characters.some(c=>c.matchRecord.wins>0&&c.championships>0));
const second=createTournament('Pages Cup',roster.slice(0,2),[defaultStage('single')],9,{shuffle:false});
ok(await call('tournaments/'+crypto.randomUUID(),'PUT',{name:second.name,state:second}));
assert((await call('tournaments')).tournaments.some(t=>t.name==='Pages Cup 2'));
// New upset rewards are retired; immutable rolls remain.
const low=roster.find(c=>c.summary.tier==='C'),high=roster.find(c=>c.summary.tier==='B');
const growth=createTournament('Growth Cup',[low,high],[{...defaultStage('swiss'),rounds:3,advance:1}],41,{shuffle:false}),growthId=crypto.randomUUID();
for(let i=0;i<2;i++){const m=nextMatch(growth);recordMatch(growth,m,[{winner:low.id,seconds:1,combatVersion:9}]);ok(await call('tournaments/'+growthId,'PUT',{name:growth.name,state:growth}));}
assert.equal((await call('characters/'+low.id)).character.summary.growth,undefined);
// Reopen, export, import into a different browser, and reject corrupt/foreign backups.
const before=await call('characters');storage=createStorage(config);
assert.deepEqual((await call('characters')).characters,before.characters);
const backup=await storage.exportBackup(),destination=createStorage({...config,databaseName:'restored-tests'});
await destination.importBackup(backup);
assert.deepEqual((await call('characters','GET',undefined,destination)).characters,before.characters);
assert.deepEqual((await call('tournaments/'+id,'GET',undefined,destination)).tournament.state,(await call('tournaments/'+id)).tournament.state);
assert.equal(JSON.stringify((await call('champions','GET',undefined,destination)).records),JSON.stringify((await call('champions')).records));
await assert.rejects(destination.importBackup(new Uint8Array([1,2,3])));
const foreign=new SQL.Database();await assert.rejects(destination.importBackup(foreign.export()));foreign.close();
assert.deepEqual((await call('characters','GET',undefined,destination)).characters,before.characters);
const remove=before.characters.slice(-3).map(c=>c.id);ok(await call('characters/bulk-remove','POST',{ids:remove}));assert.equal((await call('characters')).characters.length,before.characters.length-3);
// Failed batches roll back completely.
const db=new SQL.Database();db.run('CREATE TABLE checks(id INTEGER PRIMARY KEY)');
const adapter=sqliteAdapter(db);await assert.rejects(adapter.batch([adapter.prepare('INSERT INTO checks VALUES(1)'),adapter.prepare('INSERT INTO checks VALUES(1)')]));assert.equal((await adapter.prepare('SELECT COUNT(*) AS n FROM checks').first()).n,0);db.close();
// A real current-version fight can resolve from a Pages roster snapshot.
const battle=new Battle(roster[0],roster[1],23,{timeOfDay:'day',weather:'clear',ground:'stone'});while(!battle.done)battle.step(1/60);assert(battle.result());
// Every static dependency must resolve under /Fateforged/, never at the domain root.
const files=await readdir('_site');
for(const file of files.filter(f=>/\.(html|css|js)$/.test(f)&&!['local-api.js','local-schema.js'].includes(f))){
 const content=await readFile('_site/'+file,'utf8');
 assert(!/fetch\(['"]\/api\//.test(content.replaceAll('FATEFORGE_STORAGE.fetch','localFetch')),file+' still uses a server API');
 assert(!/(?:src|href)=["']\/(?!\/)|["'`]\/assets\//.test(content),file+' has a domain-root asset');
 for(const match of content.matchAll(/(?:src|href)=["'](?:\.\/)?([\w-]+\.(?:js|css|html))["']/g))assert(files.includes(match[1]),file+' missing '+match[1]);
}
assert(!(await readFile('_site/local-api.js','utf8')).includes('NAME_REPAIR_OWNER'));
// The roster and stage validators accept more than the former 128-entry ceiling.
const large=[];
while(large.length<260){const r=await call('characters/bulk-generate','POST',{ids:Array.from({length:Math.min(10,260-large.length)},()=>crypto.randomUUID())});ok(r);large.push(...r.characters);}
const largeCup=createTournament('Large Cup',large,[{...defaultStage('groups'),groups:65,advance:130},defaultStage('single')],73,{shuffle:false});
const largeId=crypto.randomUUID();ok(await call('tournaments/'+largeId,'PUT',{name:largeCup.name,state:largeCup}));
assert.equal((await call('tournaments/'+largeId)).tournament.state.roster.length,260);
assert.equal(largeCup.runtime.groups.length,65);
assert.equal((await call('tournaments/'+largeId)).tournament.state.stages[0].advance,130);
console.log('Large-field checks passed: 260 entrants, 65 groups, 130 advancing, and a saved/reloaded tournament.');
console.log('Pages checks passed: 39 fighters, all obtainable tiers, simultaneous tabs, immutable rolls, groups → Swiss → double elimination, duplicate names, champions, W/L, retired stat rewards, reload, backup restore, rejected bad backups, bulk removal, rollback, combat and subpath assets.');

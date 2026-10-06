import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {indexedDB} from 'fake-indexeddb';
import worker from '../dist/server/index.js';
import pagesWorker from '../_site/local-api.js';
import migrations from '../_site/local-schema.js';
import {createStorage,sqliteAdapter} from '../_site/sqlite-store.js';
import {LEAGUES} from '../public/leagues.js';

const SQL=await initSqlJs();
for(const [platform,engine]of [['server',worker],['pages',pagesWorker]]){
 const db=new SQL.Database();for(const migration of migrations)db.run(migration);
 db.run('PRAGMA user_version=13');db.run('PRAGMA application_id=1178686533');
 const env={DB:sqliteAdapter(db)},call=async(path,body,method=body?'POST':'GET')=>{
  const r=await engine.fetch(new Request('https://fateforge.test'+path,{method,headers:{'oai-authenticated-user-id':'local','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
  const data=await r.json();assert.equal(r.status,200,data.error);return data;
 };
 let state=await call('/api/leagues',{action:'start',worldId:crypto.randomUUID(),revision:0,operationId:crypto.randomUUID()});
 const former=state.world.roster[0].id;
 // The previous world's fighters remain in the collection. An older backup has
 // no creation markers, so use the archive to prevent their readmission.
 const formerRow=await env.DB.prepare('SELECT summary_json FROM saved_characters WHERE id=?').bind(former).first();
 const oldSummary=JSON.parse(formerRow.summary_json);delete oldSummary.creationSource;
 db.run('UPDATE saved_characters SET summary_json=? WHERE id=?',[JSON.stringify(oldSummary),former]);
 state=await call('/api/leagues',{action:'freshStart',worldId:crypto.randomUUID(),revision:state.revision,operationId:crypto.randomUUID()});
 assert(state.world.roster.every(c=>c.summary.creationSource==='league'));
 const ids=Array.from({length:4},()=>crypto.randomUUID());
 await call('/api/characters/bulk-generate',{ids});
 const template=(await call('/api/characters/'+ids[0])).character;
 const partial=crypto.randomUUID();await call('/api/characters/'+partial,{name:'Unfinished',state:{...template.state,traits:{race:template.state.traits.race}}},'PUT');
 // Include a wheel-saved fighter with non-recipe rarity and a legacy complete
 // fighter. All incoming stats, custom wheels, names and bonuses must survive.
 const manual=crypto.randomUUID(),customPools=structuredClone(template.state.pools);customPools.base.race[0].weight=customPools.base.race[0].weight===1?2:1;await call('/api/characters/'+manual,{name:'My fighter',state:{...template.state,pools:customPools,wheelRarity:'mythic'}},'PUT');
 const boosted=JSON.parse((await env.DB.prepare('SELECT summary_json FROM saved_characters WHERE id=?').bind(manual).first()).summary_json);boosted.stats[0]+=30;boosted.total+=30;boosted.growth={wins:2,bonus:[30,0,0,0,0],levels:{}};db.run('UPDATE saved_characters SET summary_json=? WHERE id=?',[JSON.stringify(boosted),manual]);
 const legacy=crypto.randomUUID();await call('/api/characters/'+legacy,{name:'Legacy player fighter',state:template.state},'PUT');
 const legacySummary=JSON.parse((await env.DB.prepare('SELECT summary_json FROM saved_characters WHERE id=?').bind(legacy).first()).summary_json);delete legacySummary.creationSource;
 db.run('UPDATE saved_characters SET summary_json=? WHERE id=?',[JSON.stringify(legacySummary),legacy]);
 const queue=[manual,legacy,...ids];queue.forEach((id,i)=>db.run('UPDATE saved_characters SET created_at=? WHERE id=?',[100+i,id]));
 const original=(await call('/api/characters/'+manual)).character;
 db.run("UPDATE league_worlds SET state_json=? WHERE owner_id='local'",[JSON.stringify({...state.world,phase:'complete',cup:null})]);
 const rollover={action:'rollover',revision:state.revision,operationId:crypto.randomUUID()};
 state=await call('/api/leagues',rollover);assert.equal(state.world.season,2);LEAGUES.sizes(state.world);
 const archive=(await call('/api/leagues/history/1?worldId='+state.world.id)).archive;
 assert.deepEqual(archive.playerRecruits,queue.slice(0,3));assert.deepEqual(archive.replacements.map(c=>c.id),queue.slice(0,3));
 for(const id of queue.slice(0,3)){assert(state.world.divisions[6].includes(id));assert.equal((await call('/api/characters/'+id)).character.leagueMember.division,6);}
 assert(!state.world.roster.some(c=>[partial,former,...queue.slice(3)].includes(c.id)));
 const saved=(await call('/api/characters/'+manual)).character;
 assert.deepEqual(saved.state,original.state);assert.deepEqual(saved.summary.stats,original.summary.stats);assert.deepEqual(saved.summary.growth,original.summary.growth);assert.equal(saved.summary.origin,'custom');assert.equal(saved.name,original.name);assert.equal(saved.createdAt,original.createdAt);assert.equal(saved.summary.leagueDebut.season,2);
 assert.deepEqual(await call('/api/leagues',rollover),state);assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM league_members').bind().first()).n,164);
 // All-player intake still rewrites league membership; repeat after reopening
 // through the real browser backup bridge, then exhaust the waiting queue.
 const config={SQL,migrations,worker:pagesWorker,indexedDB,databaseName:'player-intake-'+platform},storage=createStorage(config);
 await storage.importBackup(db.export());
 const reopened=createStorage(config);
 assert.deepEqual((await(await reopened.fetch('/api/leagues')).json()).world,state.world);
 for(const season of [2,3]){
  const snapshot=new SQL.Database(await reopened.exportBackup());const current=(await(await reopened.fetch('/api/leagues')).json()).world;
  snapshot.run('UPDATE league_worlds SET state_json=?',[JSON.stringify({...current,phase:'complete',cup:null})]);await reopened.importBackup(snapshot.export());snapshot.close();
  const currentState=await(await reopened.fetch('/api/leagues')).json(),command={action:'rollover',revision:currentState.revision,operationId:crypto.randomUUID()},options={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)};
  const response=await reopened.fetch('/api/leagues',options);assert(response.ok);const next=await response.json();LEAGUES.sizes(next.world);assert.equal(next.world.season,season+1);
  const prior=(await(await reopened.fetch('/api/leagues/history/'+season+'?worldId='+next.world.id)).json()).archive;
  assert.deepEqual(prior.playerRecruits,season===2?queue.slice(3):[]);
  if(season===3){assert(prior.replacements.every(c=>c.summary.creationSource==='league'));assert.equal(prior.replacements[1].summary.wheelRarity,'rare');}
  const retry=await reopened.fetch('/api/leagues',options);assert.deepEqual(await retry.json(),next);
 }
 db.close();console.log(platform+': player-first intake, oldest-first overflow, legacy archive exclusions, incomplete skips, unchanged build, all-player membership, rollover retries, backup reopen and random fallback passed.');
}

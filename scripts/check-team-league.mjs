import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import initSqlJs from 'sql.js';import {indexedDB} from 'fake-indexeddb';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
import worker from '../dist/server/index.js';
import pagesWorker from '../_site/local-api.js';import migrations from '../_site/local-schema.js';import {createStorage} from '../_site/sqlite-store.js';

// Pool plans: sizes, determinism, S/A tiers with rare SS, every role present.
for(const format of [2,3,5])for(const teams of L.LEAGUE_SIZES){
 const plan=L.poolPlan(format,teams,99);assert.equal(plan.length,Math.ceil(teams*L.FORMATS[format].rosterSize*1.5));assert.deepEqual(plan,L.poolPlan(format,teams,99));
 assert(plan.every(s=>['A','S','SS'].includes(s.tier)));for(const role of L.ROLE_KEYS)assert(plan.filter(s=>s.role===role).length>=teams,`${format}v${format} ${teams}: the pool offers every team a ${role}`);
}
assert.throws(()=>L.poolPlan(3,12,1),/8, 16 or 32/);
// The rating model is the recorded calibration (scripts/evaluate-team-values.mjs).
assert.deepEqual(JSON.parse(JSON.stringify(L.RATING_MODEL)),JSON.parse(fs.readFileSync('validation/team-values.json','utf8')).model);
// Ratings and salaries: monotonic, capped, and steeply convex.
assert.equal(L.salaryFor(50),.8);assert.equal(L.salaryFor(99),14);assert(L.salaryFor(90)-L.salaryFor(80)>L.salaryFor(70)-L.salaryFor(60));
for(let ovr=40;ovr<99;ovr++)assert(L.salaryFor(ovr+1)>=L.salaryFor(ovr));
const buildPool=(format,teams,seed)=>L.poolPlan(format,teams,seed).map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`Fighter ${i}`));
const pool=buildPool(3,8,4242),poolAgain=buildPool(3,8,4242);assert.deepEqual(pool.map(f=>f.id),poolAgain.map(f=>f.id),'Pool generation is deterministic.');
// World creation, structure and the AI draft.
const world=L.create({id:crypto.randomUUID(),format:3,teams:8,seed:4242,fighters:pool});
assert.equal(world.teams.length,8);assert.deepEqual(world.conferences.map(c=>c.name),['Sunward','Shadeward']);assert.equal(world.conferences[0].divisions[0].teams.length,4);
assert.equal(new Set(world.teams.map(t=>t.name)).size,8,'Team names are unique.');assert(new Set(world.teams.map(t=>t.coach.personality)).size>=5,'Coaches have varied personalities.');
for(const f of Object.values(world.fighters)){assert(f.ovr>=40&&f.ovr<=99);assert.equal(f.salary,L.salaryFor(f.ovr));}
const ovrs=Object.values(world.fighters).map(f=>f.ovr);assert(Math.max(...ovrs)-Math.min(...ovrs)>=15,'Ratings spread the pool.');
const drafted=structuredClone(world),again=structuredClone(world);L.draftPicks(drafted,1e6);L.draftPicks(again,1e6);assert.deepEqual(drafted,again,'The draft is deterministic.');
assert(drafted.draft.complete);assert.equal(drafted.phase,'ready');assert.equal(drafted.draft.picks.length,40);
for(const team of drafted.teams){
 assert.equal(team.roster.length,5);const exceptions=drafted.draft.picks.filter(p=>p.team===team.id&&p.exception).reduce((n,p)=>n+p.salary,0);assert(L.payroll(drafted,team)-exceptions<=drafted.settings.salaryCap+1e-9,`${team.name} stays under the cap (minimum-contract exceptions aside)`);
 assert(team.coach.comp&&L.ROLE_KEYS.every(r=>team.coach.comp[r]>0),'Every coach has a composition plan.');
 assert.equal(team.lineup.length,3);assert(team.lineup.every(id=>team.roster.includes(id)));
}
assert.equal(L.available(drafted).length,20,'Undrafted fighters become free agents.');
// Free compositions: no role is mandatory, coaches follow their own plans, and lineups vary across the league.
const comps=new Set(drafted.teams.map(t=>L.compKey(L.roleCounts(drafted,{roster:t.lineup}))));assert(comps.size>=3,`Teams field varied lineups (${[...comps].join(', ')})`);
const glassy={...drafted.teams[0],coach:{...drafted.teams[0].coach,comp:L.COMP_TEMPLATES.glass}};assert.equal(L.starterTargets(drafted,glassy).damage,3,'A glass-cannon plan starts three damage dealers in 3v3.');
// 2v2: four-fighter rosters, two starters.
const duo=L.create({id:'duo',format:2,teams:8,seed:31,fighters:buildPool(2,8,31)});L.draftPicks(duo,1e6);assert.equal(duo.phase,'ready');for(const t of duo.teams){assert.equal(t.roster.length,4);assert.equal(t.lineup.length,2);}
// Snake order: round two reverses round one.
assert.deepEqual(drafted.draft.picks.slice(8,16).map(p=>p.team),drafted.draft.picks.slice(0,8).map(p=>p.team).reverse());
// Star chasers spend more on their top pick than bargain hunters, on average over several leagues.
const topSpend={star:[],bargain:[]};
for(const [teams,seed]of [[8,4242],[8,4243],[16,4244],[16,4245]]){const w=L.create({id:'x',format:3,teams,seed,fighters:buildPool(3,teams,seed)});L.draftPicks(w,1e6);for(const t of w.teams)topSpend[t.coach.personality]?.push(Math.max(...w.draft.picks.filter(p=>p.team===t.id).map(p=>p.salary)));}
const mean=list=>list.reduce((a,b)=>a+b,0)/list.length;assert(mean(topSpend.star)>mean(topSpend.bargain),`star ${mean(topSpend.star)} vs bargain ${mean(topSpend.bargain)}`);
assert.throws(()=>L.create({id:'x',format:3,teams:8,seed:4242,fighters:pool.slice(1)}),/must hold/);
assert.throws(()=>L.create({id:'x',format:3,teams:8,seed:4242,fighters:pool.map((f,i)=>i?f:{...f,summary:{...f.summary,tier:f.summary.tier==='A'?'S':'A'}})}),/planned tier/);

// Server commands: create, deterministic picks, revisions, retries and validation.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=async(body,format=3)=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams'+(body?'':'?format='+format),{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'owner','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,...await r.json()};};
const ok=r=>assert.equal(r.status,200,r.error);
const wire=pool.map(f=>({id:f.id,name:f.name,teamKit:f.teamKit,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}}));
assert.equal((await call()).world,null);
const start={action:'start',format:3,revision:0,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),teams:8,seed:4242,fighters:wire};
const tampered=structuredClone(start);tampered.operationId=crypto.randomUUID();tampered.fighters[0].traits.power='Singularity';
assert.equal((await call(tampered)).status,400,'Edited traits that leave the planned tier are rejected.');
const forged=structuredClone(start);forged.operationId=crypto.randomUUID();forged.fighters[1].traits.race='Not a race';assert.equal((await call(forged)).status,400);
let response=await call(start);ok(response);assert.equal(response.revision,1);assert.equal(Object.keys(response.world.fighters).length,60);
for(const [id,f]of Object.entries(response.world.fighters))assert.deepEqual({ovr:f.ovr,salary:f.salary,role:f.role},{ovr:world.fighters[id].ovr,salary:world.fighters[id].salary,role:world.fighters[id].role},'Server ratings match the shared rules.');
ok(await call(start));assert.equal((await call({...start,teams:16})).status,409,'A reused operation with a different body conflicts.');
assert.equal((await call({...start,operationId:crypto.randomUUID(),revision:1})).status,409,'Only one league per format.');
assert.equal((await call({action:'draft',format:3,revision:0,operationId:crypto.randomUUID(),count:1})).status,409,'Stale revisions are rejected.');
response=await call({action:'draft',format:3,revision:1,operationId:crypto.randomUUID(),count:12});ok(response);assert.equal(response.world.draft.picks.length,12);
assert.deepEqual(response.world.draft.picks,drafted.draft.picks.slice(0,12),'Server picks follow the shared AI exactly.');
response=await call({action:'draft',format:3,revision:2,operationId:crypto.randomUUID(),count:1000});ok(response);assert(response.world.draft.complete);assert.deepEqual(response.world.teams,drafted.teams);
assert.equal((await call({action:'draft',format:3,revision:3,operationId:crypto.randomUUID(),count:1})).status,400,'No picks after the draft.');
assert.equal((await call(null,5)).world,null,'3v3 and 5v5 leagues are separate.');
ok(await call({action:'reset',format:3,revision:3,operationId:crypto.randomUUID()}));assert.equal((await call()).world,null);
assert.equal((await worker.fetch(new Request('https://fateforge.test/api/teams?format=3'),env)).status,401);

// Browser storage (GitHub Pages build) runs the same commands.
const SQL=await initSqlJs(),storage=createStorage({SQL,migrations,worker:pagesWorker,indexedDB,databaseName:'team-league-pages'});
const local=async body=>{const r=await storage.fetch('/api/teams'+(body?'':'?format=3'),{...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
ok(await local({...start,operationId:crypto.randomUUID()}));response=await local({action:'draft',format:3,revision:1,operationId:crypto.randomUUID(),count:1000});ok(response);assert.deepEqual(response.world.teams,drafted.teams);
const backup=new SQL.Database(await storage.exportBackup());assert.equal(backup.exec('SELECT COUNT(*) FROM team_worlds')[0].values[0][0],1);backup.close();
console.log(`Team league passed: pool plans for 3v3/5v5 × 8/16/32, ratings and convex salaries, ${drafted.teams.length}-team deterministic snake draft under a ${drafted.settings.salaryCap}M cap with role needs met, server validation/revisions/retries, and browser storage.`);

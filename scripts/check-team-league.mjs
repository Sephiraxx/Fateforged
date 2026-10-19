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
// World creation, structure and the opening auction.
const world=L.create({id:crypto.randomUUID(),format:3,teams:8,seed:4242,fighters:pool});
assert.equal(world.teams.length,8);assert.deepEqual(world.conferences.map(c=>c.name),['Sunward','Shadeward']);assert.equal(world.conferences[0].divisions[0].teams.length,4);
assert.equal(new Set(world.teams.map(t=>t.name)).size,8,'Team names are unique.');assert(new Set(world.teams.map(t=>t.coach.personality)).size>=5,'Coaches have varied personalities.');
assert.equal(world.phase,'market');assert.equal(world.market.kind,'founding');assert.equal(world.contractsVersion,L.CONTRACTS_VERSION);
for(const f of Object.values(world.fighters)){assert(f.ovr>=40&&f.ovr<=99);assert.equal(f.salary,L.salaryFor(f.ovr));assert.equal(f.contract,null);assert(L.TACTICS.includes(f.prefs.style),'Every fighter prefers a team style.');}
assert(new Set(Object.values(world.fighters).map(f=>f.prefs.style)).size>=4,'Preferred styles vary.');
const ovrs=Object.values(world.fighters).map(f=>f.ovr);assert(Math.max(...ovrs)-Math.min(...ovrs)>=15,'Ratings spread the pool.');
const filled=structuredClone(world),again=structuredClone(world);L.marketRounds(filled,1e6);L.marketRounds(again,1e6);assert.deepEqual(filled,again,'The auction is deterministic.');
assert(filled.market.done);assert.equal(filled.phase,'ready');assert(filled.market.round<=L.CONTRACT.rounds);assert.equal(filled.market.log.length,40);
for(const team of filled.teams){
 assert.equal(team.roster.length,5);const exceptions=filled.market.log.filter(l=>l.team===team.id&&l.exception).reduce((n,l)=>n+l.salary,0);assert(L.payroll(filled,team)-exceptions<=filled.settings.salaryCap+1e-9,`${team.name} stays under the cap (minimum-contract exceptions aside)`);
 assert(team.coach.comp&&L.ROLE_KEYS.every(r=>team.coach.comp[r]>0),'Every coach has a composition plan.');
 assert.equal(team.lineup.length,3);assert(team.lineup.every(id=>team.roster.includes(id)));
 for(const id of team.roster){const c=filled.fighters[id].contract;assert(c&&c.years>=1&&c.years<=L.CONTRACT.maxYears&&c.signed===1&&c.until===c.years,'Signings carry a contract from season 1.');assert(c.salary>=filled.fighters[id].salary*L.CONTRACT.lowestFloor-.05,'Nobody signs far below his value.');}
}
assert.equal(L.available(filled).length,20,'Unsigned fighters stay free agents.');assert(L.available(filled).every(f=>f.contract===null));
assert(filled.market.log.some(l=>l.years>=3)&&filled.market.log.some(l=>l.years===1),'Contract lengths vary.');
// Free compositions: no role is mandatory, coaches follow their own plans, and lineups vary across the league.
const comps=new Set(filled.teams.map(t=>L.compKey(L.roleCounts(filled,{roster:t.lineup}))));assert(comps.size>=3,`Teams field varied lineups (${[...comps].join(', ')})`);
const glassy={...filled.teams[0],coach:{...filled.teams[0].coach,comp:L.COMP_TEMPLATES.glass}};assert.equal(L.starterTargets(filled,glassy).damage,3,'A glass-cannon plan starts three damage dealers in 3v3.');
// 2v2: four-fighter rosters, two starters.
const duo=L.create({id:'duo',format:2,teams:8,seed:31,fighters:buildPool(2,8,31)});L.marketRounds(duo,1e6);assert.equal(duo.phase,'ready');for(const t of duo.teams){assert.equal(t.roster.length,4);assert.equal(t.lineup.length,2);}
// What a free agent wants: more money, a starting spot, a team that plays his style; the floor he takes drops each round.
{const probe=structuredClone(filled),f=L.available(probe).sort((a,b)=>b.ovr-a.ovr)[0],[a,b]=probe.teams,offer=(team,salary,years=L.wantedYears(probe,f))=>({team:team.id,salary,years});
 assert(L.offerAppeal(probe,f,offer(a,f.salary*1.2))>L.offerAppeal(probe,f,offer(a,f.salary)),'More money appeals more.');
 assert(L.offerAppeal(probe,f,offer(a,f.salary,L.wantedYears(probe,f)))>=L.offerAppeal(probe,f,offer(a,f.salary,L.CONTRACT.maxYears+1)),'He prefers the length he wants.');
 const style=f.prefs.style==='balanced'?'aggressive':f.prefs.style;f.prefs.style=style;a.tactic=style;b.tactic=L.OPPOSITE_STYLE[style];
 assert.equal(L.fit(probe,f,a),1);assert.equal(L.fit(probe,f,b),-1);delete b.tactic;b.tactic='balanced';assert.equal(L.fit(probe,f,b),0,'Balanced teams fit everyone neutrally.');
 b.tactic=L.OPPOSITE_STYLE[style];const ctx={contenders:new Map(probe.teams.map(t=>[t.id,.5]))};assert(L.offerAppeal(probe,f,offer(a,f.salary),ctx)>L.offerAppeal(probe,f,offer(b,f.salary),ctx),'A team that plays his style appeals more.');
 for(let r=1;r<L.CONTRACT.rounds;r++)assert(L.askFloor(r)<=L.askFloor(r-1));assert(L.askFloor(99)>=L.CONTRACT.lowestFloor);}
// Star chasers spend more on their top signing than bargain hunters, on average over several leagues.
const topSpend={star:[],bargain:[]};
for(const [teams,seed]of [[8,4242],[8,4243],[16,4244],[16,4245]]){const w=L.create({id:'x',format:3,teams,seed,fighters:buildPool(3,teams,seed)});L.marketRounds(w,1e6);for(const t of w.teams)topSpend[t.coach.personality]?.push(Math.max(...w.market.log.filter(l=>l.team===t.id).map(l=>l.salary)));}
const mean=list=>list.reduce((a,b)=>a+b,0)/list.length;assert(mean(topSpend.star)>mean(topSpend.bargain),`star ${mean(topSpend.star)} vs bargain ${mean(topSpend.bargain)}`);
assert.throws(()=>L.create({id:'x',format:3,teams:8,seed:4242,fighters:pool.slice(1)}),/must hold/);
// Team cast leagues: pools must come from the cast, and leagues without castVersion 5 are the old format.
assert.equal(world.castVersion,L.CAST_LEAGUE);assert.equal(L.oldFormat(world),false);assert.equal(L.oldFormat({...world,castVersion:undefined}),true);
assert.throws(()=>L.create({id:'x',format:3,teams:8,seed:4242,fighters:pool.map(f=>({...f,summary:{...f.summary,generationVersion:4}}))}),/team cast/);
assert.throws(()=>L.create({id:'x',format:3,teams:8,seed:4242,fighters:pool.map((f,i)=>i?f:{...f,summary:{...f.summary,tier:f.summary.tier==='A'?'S':'A'}})}),/planned tier/);

// Server commands: create, deterministic picks, revisions, retries and validation.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=async(body,format=3)=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams'+(body?'':'?format='+format),{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'owner','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,...await r.json()};};
const ok=r=>assert.equal(r.status,200,r.error);
const wire=pool.map(f=>({id:f.id,name:f.name,teamKit:f.teamKit,traits:f.traits,summary:{generationVersion:f.summary.generationVersion,wheelRarity:f.summary.wheelRarity}}));
assert.equal((await call()).world,null);
const start={action:'start',format:3,revision:0,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),teams:8,seed:4242,fighters:wire};
const tampered=structuredClone(start);tampered.operationId=crypto.randomUUID();tampered.fighters[0].traits.power='Singularity';
assert.equal((await call(tampered)).status,400,'Edited traits that leave the planned tier are rejected.');
const forged=structuredClone(start);forged.operationId=crypto.randomUUID();forged.fighters[1].traits.race='Not a race';assert.equal((await call(forged)).status,400);
let response=await call(start);ok(response);assert.equal(response.revision,1);assert.equal(Object.keys(response.world.fighters).length,60);
for(const [id,f]of Object.entries(response.world.fighters))assert.deepEqual({ovr:f.ovr,salary:f.salary,role:f.role},{ovr:world.fighters[id].ovr,salary:world.fighters[id].salary,role:world.fighters[id].role},'Server ratings match the shared rules.');
ok(await call(start));assert.equal((await call({...start,teams:16})).status,409,'A reused operation with a different body conflicts.');
assert.equal((await call({...start,operationId:crypto.randomUUID(),revision:1})).status,409,'Only one league per format.');
assert.equal((await call({action:'market',format:3,revision:0,operationId:crypto.randomUUID(),count:1})).status,409,'Stale revisions are rejected.');
response=await call({action:'market',format:3,revision:1,operationId:crypto.randomUUID(),count:1});ok(response);const oneRound=structuredClone(world);L.marketRounds(oneRound,1);
assert.deepEqual(response.world.market.log,oneRound.market.log,'Server signings follow the shared AI exactly.');
response=await call({action:'market',format:3,revision:2,operationId:crypto.randomUUID(),count:100});ok(response);assert(response.world.market.done);assert.deepEqual(response.world.teams,filled.teams);
assert.equal((await call({action:'market',format:3,revision:3,operationId:crypto.randomUUID(),count:1})).status,400,'No rounds after free agency.');
assert.equal((await call({action:'market',format:3,revision:3,operationId:crypto.randomUUID(),count:1000})).status,400,'Round counts are bounded.');
assert.equal((await call(null,5)).world,null,'3v3 and 5v5 leagues are separate.');
// Hand balance: the auto-balance switch is gone and leagues start with it off.
assert.equal(response.world.balance.enabled,false);assert.equal((await call({action:'balance',format:3,revision:3,operationId:crypto.randomUUID(),enabled:true})).status,400);
ok(await call({action:'reset',format:3,revision:3,operationId:crypto.randomUUID()}));assert.equal((await call()).world,null);
assert.equal((await worker.fetch(new Request('https://fateforge.test/api/teams?format=3'),env)).status,401);

// Browser storage (GitHub Pages build) runs the same commands.
const SQL=await initSqlJs(),storage=createStorage({SQL,migrations,worker:pagesWorker,indexedDB,databaseName:'team-league-pages'});
const local=async body=>{const r=await storage.fetch('/api/teams'+(body?'':'?format=3'),{...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
ok(await local({...start,operationId:crypto.randomUUID()}));response=await local({action:'market',format:3,revision:1,operationId:crypto.randomUUID(),count:100});ok(response);assert.deepEqual(response.world.teams,filled.teams);
const backup=new SQL.Database(await storage.exportBackup());assert.equal(backup.exec('SELECT COUNT(*) FROM team_worlds')[0].values[0][0],1);backup.close();
console.log(`Team league passed: pool plans for 3v3/5v5 × 8/16/32, ratings and convex salaries, ${filled.teams.length}-team deterministic opening auction (${filled.market.round} rounds) under a ${filled.settings.salaryCap}M cap with contracts for every signing, what free agents want (money, length, style fit), server validation/revisions/retries, and browser storage.`);

// A preview league pins Core rules, validates objective results, and retains objective impact.
const {simulateTeamSeries}=await import('../public/team-sim-worker.js');
assert.throws(()=>L.create({id:'bad',format:2,teams:8,seed:31,fighters:[],battleMode:'core'}),/3v3/);
let cr=await call({...start,revision:4,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),battleMode:'core'});ok(cr);
cr=await call({action:'market',format:3,revision:cr.revision,operationId:crypto.randomUUID(),count:100});ok(cr);
// Battle rules switch between seasons through the API.
cr=await call({action:'rules',mode:'teamfight',format:3,revision:cr.revision,operationId:crypto.randomUUID()});ok(cr);assert.equal(cr.world.settings.battleMode,'teamfight');cr=await call({action:'rules',mode:'core',format:3,revision:cr.revision,operationId:crypto.randomUUID()});ok(cr);assert.equal(cr.world.settings.battleMode,'core');
cr=await call({action:'startSeason',format:3,revision:cr.revision,operationId:crypto.randomUUID()});ok(cr);assert.equal(cr.world.settings.battleMode,'core');assert.equal(cr.world.teamEngine,L.OBJECTIVE_COMBAT_VERSION);{const r=await call({action:'rules',mode:'teamfight',format:3,revision:cr.revision,operationId:crypto.randomUUID()});assert.equal(r.status,400);assert.match(r.error,/between seasons/);}
const cw=structuredClone(cr.world),cm=L.upcoming(cr.world,1)[0],cg=simulateTeamSeries({match:cm,teams:L.squads(cr.world,cm)}),bad=structuredClone(cg);bad[0].objective.coreHp[bad[0].winnerTeam]=0;
const cmd={action:'record',format:3,revision:cr.revision,operationId:crypto.randomUUID(),results:[{matchId:cm.id,games:bad}]};assert.equal((await call(cmd)).status,400);
cr=await call({...cmd,operationId:crypto.randomUUID(),results:[{matchId:cm.id,games:cg}]});ok(cr);assert.deepEqual(cr.world.results[0].objective,cg[0].objective);assert(cr.world.stats[cg[0].fighters[0].id].downSeconds>=0);assert.equal(L.impact({damage:0,healing:0,kills:0,ccSeconds:0,objectiveDamage:100,monsterLastHits:1}),340);
console.log('Core league API passed: selected rules, real worker result, winner consistency, rejection rollback and persisted objective stats.');

const timed=structuredClone(cg);timed[0].seconds=390;timed[0].winnerTeam=0;timed[0].objective.coreHp=[80,70];timed[0].objective.suddenDeath=true;L.recordMatch(structuredClone(cw),cm.id,timed);
for(const change of [g=>g.seconds=390.6,g=>g.objective.coreHp=[-1,70],g=>g.objective.forgefireSeconds=[NaN,0],g=>g.fighters[0].downSeconds=391,g=>{g.winnerTeam=1;g.objective.coreHp=[80,70];}]){const invalid=structuredClone(timed);change(invalid[0]);assert.throws(()=>L.recordMatch(structuredClone(cw),cm.id,invalid),/Invalid/);}

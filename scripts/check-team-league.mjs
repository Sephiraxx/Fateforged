import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import initSqlJs from 'sql.js';import {indexedDB} from 'fake-indexeddb';
import {circuitPool} from './circuit-fixtures.mjs';
import * as L from '../public/team-league.js';
import worker from '../dist/server/index.js';
import pagesWorker from '../_site/local-api.js';import migrations from '../_site/local-schema.js';import {createStorage} from '../_site/sqlite-store.js';

// Pool plans: six regions of the chosen size, determinism, every role in every region, and each region's talent.
for(const format of [2,3,5])for(const size of L.REGION_SIZES){
 const plan=L.poolPlan(format,size,99),per=Math.ceil(size*L.FORMATS[format].rosterSize*L.POOL_FACTOR);assert.equal(plan.length,per*6);assert.deepEqual(plan,L.poolPlan(format,size,99));
 for(const r of L.REGIONS){const mine=plan.filter(s=>s.region===r.id);assert.equal(mine.length,per);for(const role of L.ROLE_KEYS)assert(mine.filter(s=>s.role===role).length>=size*.5,`${format}v${format} ${size}: ${r.name} offers its teams a ${role}`);
  assert(mine.every(s=>['SS','S','A','B'].includes(s.tier)));if(!r.odds.B)assert(mine.every(s=>s.tier!=='B'),'Only the lower regions grow B-tier fighters.');}
}
assert.throws(()=>L.poolPlan(3,12,1),/6, 8 or 10/);
// Talent by region over many pools: the top regions grow far more S and SS fighters than the emerging ones.
{const share=r=>{let top=0,n=0;for(let seed=1;seed<=30;seed++)for(const s of L.poolPlan(3,8,seed))if(s.region===r){n++;if(s.tier==='S'||s.tier==='SS')top++;}return top/n;};
 const [major,strong,rising,emerging]=['r1','r3','r4','r5'].map(share);assert(major>strong&&strong>rising&&rising>emerging,`S+SS shares ${[major,strong,rising,emerging].map(x=>x.toFixed(2))}`);assert(emerging<.2&&major>.38);}
// The rating model is the recorded calibration (scripts/evaluate-team-values.mjs).
assert.deepEqual(JSON.parse(JSON.stringify(L.RATING_MODEL)),JSON.parse(fs.readFileSync('validation/team-values.json','utf8')).model);
// Ratings and salaries: monotonic, capped, and steeply convex.
assert.equal(L.salaryFor(50),.8);assert.equal(L.salaryFor(99),14);assert(L.salaryFor(90)-L.salaryFor(80)>L.salaryFor(70)-L.salaryFor(60));
for(let ovr=40;ovr<99;ovr++)assert(L.salaryFor(ovr+1)>=L.salaryFor(ovr));
const pool=circuitPool(3,6,4242),poolAgain=circuitPool(3,6,4242);assert.deepEqual(pool.map(f=>f.id),poolAgain.map(f=>f.id),'Pool generation is deterministic.');
// World creation: six regions of six teams, the region lock on every founding fighter, and the opening auction.
const world=L.create({id:crypto.randomUUID(),format:3,regionSize:6,seed:4242,fighters:pool});
assert.equal(world.teams.length,36);assert.equal(world.circuitVersion,L.CIRCUIT_VERSION);for(const r of L.REGIONS)assert.equal(L.regionTeams(world,r.id).length,6);assert.deepEqual(world.regionRank,L.REGION_IDS);
assert.equal(new Set(world.teams.map(t=>t.name)).size,36,'Team names are unique.');assert(new Set(world.teams.map(t=>t.coach.personality)).size>=5,'Coaches have varied personalities.');
assert.equal(world.phase,'market');assert.equal(world.market.kind,'founding');assert.equal(world.contractsVersion,L.CONTRACTS_VERSION);
for(const f of Object.values(world.fighters)){assert(f.ovr>=40&&f.ovr<=99);assert.equal(f.salary,L.salaryFor(f.ovr));assert.equal(f.contract,null);assert(L.TACTICS.includes(f.prefs.style),'Every fighter prefers a team style.');assert(f.prefs.home>=.3&&f.prefs.home<=1);assert(L.REGION_IDS.includes(f.region)&&f.locked===true,'Founding fighters belong to a region and sign only there.');}
assert(new Set(Object.values(world.fighters).map(f=>f.prefs.style)).size>=4,'Preferred styles vary.');
const ovrs=Object.values(world.fighters).map(f=>f.ovr);assert(Math.max(...ovrs)-Math.min(...ovrs)>=15,'Ratings spread the pool.');
for(const r of L.REGIONS)assert.equal(L.capOf(world,{region:r.id}),Math.round(world.settings.salaryCap*r.cap*10)/10,'Region caps scale the market cap.');
const filled=structuredClone(world),again=structuredClone(world);L.marketRounds(filled,1e6);L.marketRounds(again,1e6);assert.deepEqual(filled,again,'The auction is deterministic.');
assert(filled.market.done);assert.equal(filled.phase,'ready');assert(filled.market.round<=L.CONTRACT.rounds);assert.equal(filled.market.log.length,36*5);
for(const team of filled.teams){
 assert.equal(team.roster.length,5);const exceptions=filled.market.log.filter(l=>l.team===team.id&&l.exception).reduce((n,l)=>n+l.salary,0);assert(L.payroll(filled,team)-exceptions<=L.capOf(filled,team)+1e-9,`${team.name} stays under its region's cap (minimum-contract exceptions aside)`);
 assert(team.coach.comp&&L.ROLE_KEYS.every(r=>team.coach.comp[r]>0),'Every coach has a composition plan.');
 assert.equal(team.lineup.length,3);assert(team.lineup.every(id=>team.roster.includes(id)));
 for(const id of team.roster){const f=filled.fighters[id],c=f.contract;assert.equal(f.region,team.region,'The opening auction is domestic: founding fighters sign at home.');assert(c&&c.years>=1&&c.years<=3&&c.signed===1&&c.until===c.years,'Signings carry a 1–3 season contract from season 1.');assert(c.salary>=f.salary*L.CONTRACT.lowestFloor-.05,'Nobody signs far below his value.');}
}
assert.equal(L.CONTRACT.maxYears,3);
assert.equal(L.available(filled).length,pool.length-180,'Unsigned fighters stay free agents.');assert(L.available(filled).every(f=>f.contract===null));
assert(new Set(filled.market.log.map(l=>l.years)).size>=2&&filled.market.log.some(l=>l.years>=3),'Contract lengths vary.');
// Free compositions: no role is mandatory, coaches follow their own plans, and lineups vary across the league.
const comps=new Set(filled.teams.map(t=>L.compKey(L.roleCounts(filled,{roster:t.lineup}))));assert(comps.size>=3,`Teams field varied lineups (${[...comps].join(', ')})`);
const glassy={...filled.teams[0],coach:{...filled.teams[0].coach,comp:L.COMP_TEMPLATES.glass}};assert.equal(L.starterTargets(filled,glassy).damage,3,'A glass-cannon plan starts three damage dealers in 3v3.');
// 2v2: four-fighter rosters, two starters.
const duo=L.create({id:'duo',format:2,regionSize:6,seed:31,fighters:circuitPool(2,6,31)});L.marketRounds(duo,1e6);assert.equal(duo.phase,'ready');for(const t of duo.teams){assert.equal(t.roster.length,4);assert.equal(t.lineup.length,2);}
// What a free agent wants: more money, a starting spot, a team that plays his style, his home region; the floor drops.
{const probe=structuredClone(filled),f=L.available(probe).sort((a,b)=>b.ovr-a.ovr)[0],home=L.regionTeams(probe,f.region),[a,b]=home,away=probe.teams.find(t=>t.region!==f.region),offer=(team,salary,years=L.wantedYears(probe,f))=>({team:team.id,salary,years});
 assert(L.offerAppeal(probe,f,offer(a,f.salary*1.2))>L.offerAppeal(probe,f,offer(a,f.salary)),'More money appeals more.');
 assert(L.offerAppeal(probe,f,offer(a,f.salary,L.wantedYears(probe,f)))>=L.offerAppeal(probe,f,offer(a,f.salary,L.CONTRACT.maxYears+1)),'He prefers the length he wants.');
 const ctx={contenders:new Map(probe.teams.map(t=>[t.id,.5]))};a.tactic='balanced';away.tactic='balanced';
 assert(L.offerAppeal(probe,f,offer(a,f.salary),ctx)>L.offerAppeal(probe,f,offer(away,f.salary),ctx),'A team from his home region appeals more.');
 // Coaches import only fighters clearly better than home talent: depth costs value, stars barely do.
 const depth={...f,ovr:72},star={...f,ovr:L.IMPORT.starFrom};assert.equal(L.importCost(a,depth),0,'No import cost at home.');assert(L.importCost(away,depth)>0);assert.equal(L.importCost(away,star),0,'Stars import freely.');
 const style=f.prefs.style==='balanced'?'aggressive':f.prefs.style;f.prefs.style=style;a.tactic=style;b.tactic=L.OPPOSITE_STYLE[style];
 assert.equal(L.fit(probe,f,a),1);assert.equal(L.fit(probe,f,b),-1);b.tactic='balanced';assert.equal(L.fit(probe,f,b),0,'Balanced teams fit everyone neutrally.');
 b.tactic=L.OPPOSITE_STYLE[style];assert(L.offerAppeal(probe,f,offer(a,f.salary),ctx)>L.offerAppeal(probe,f,offer(b,f.salary),ctx),'A team that plays his style appeals more.');
 for(let r=1;r<L.CONTRACT.rounds;r++)assert(L.askFloor(r)<=L.askFloor(r-1));assert(L.askFloor(99)>=L.CONTRACT.lowestFloor);
 // The region lock: a locked fighter can be signed only at home; once unlocked, anywhere.
 assert.equal(L.canSign(away,f),false);assert.equal(L.canSign(a,f),true);assert(!L.signable(probe,away).includes(f));f.locked=false;assert.equal(L.canSign(away,f),true);f.locked=true;
 probe.market={...probe.market,done:false,offers:[]};probe.phase='market';const loser=probe.teams.find(t=>t.region!==f.region);loser.roster=loser.roster.slice(0,4);probe.settings.userTeam=loser.id;
 assert.throws(()=>L.makeOffer(probe,f.id,f.salary,2),/rookie: only teams there/);}
// Star chasers spend more on their top signing than bargain hunters, on average over a few circuits.
const topSpend={star:[],bargain:[]};
for(const seed of [4242,4243]){const w=L.create({id:'x',format:3,regionSize:6,seed,fighters:circuitPool(3,6,seed)});L.marketRounds(w,1e6);for(const t of w.teams)topSpend[t.coach.personality]?.push(Math.max(...w.market.log.filter(l=>l.team===t.id).map(l=>l.salary)));}
const mean=list=>list.reduce((a,b)=>a+b,0)/list.length;assert(mean(topSpend.star)>mean(topSpend.bargain),`star ${mean(topSpend.star)} vs bargain ${mean(topSpend.bargain)}`);
assert.throws(()=>L.create({id:'x',format:3,regionSize:6,seed:4242,fighters:pool.slice(1)}),/must hold/);
assert.throws(()=>L.create({id:'x',format:3,regionSize:7,seed:4242,fighters:pool}),/6, 8 or 10/);
// Circuits come from the team cast; leagues without circuitVersion (single leagues) are the old format.
assert.equal(world.castVersion,L.CAST_LEAGUE);assert.equal(L.oldFormat(world),false);assert.equal(L.oldFormat({...world,castVersion:undefined}),true);assert.equal(L.oldFormat({...world,circuitVersion:undefined}),true);
assert.throws(()=>L.create({id:'x',format:3,regionSize:6,seed:4242,fighters:pool.map(f=>({...f,summary:{...f.summary,generationVersion:4}}))}),/team cast/);
assert.throws(()=>L.create({id:'x',format:3,regionSize:6,seed:4242,fighters:pool.map((f,i)=>i?f:{...f,summary:{...f.summary,tier:f.summary.tier==='A'?'S':'A'}})}),/planned tier/);

// Server commands: create, deterministic signings, revisions, retries and validation.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=async(body,format=3)=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams'+(body?'':'?format='+format),{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'owner','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,...await r.json()};};
const ok=r=>assert.equal(r.status,200,r.error);
const wire=pool.map(f=>({id:f.id,name:f.name,teamKit:f.teamKit,traits:f.traits,summary:{generationVersion:f.summary.generationVersion,wheelRarity:f.summary.wheelRarity}}));
assert.equal((await call()).world,null);
const start={action:'start',format:3,revision:0,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),regionSize:6,seed:4242,fighters:wire};
const tampered=structuredClone(start);tampered.operationId=crypto.randomUUID();tampered.fighters[0].traits.power='Singularity';
assert.equal((await call(tampered)).status,400,'Edited traits that leave the planned tier are rejected.');
const forged=structuredClone(start);forged.operationId=crypto.randomUUID();forged.fighters[1].traits.race='Not a race';assert.equal((await call(forged)).status,400);
let response=await call(start);ok(response);assert.equal(response.revision,1);assert.equal(Object.keys(response.world.fighters).length,pool.length);
for(const [id,f]of Object.entries(response.world.fighters))assert.deepEqual({ovr:f.ovr,salary:f.salary,role:f.role,region:f.region},{ovr:world.fighters[id].ovr,salary:world.fighters[id].salary,role:world.fighters[id].role,region:world.fighters[id].region},'Server ratings and regions match the shared rules.');
ok(await call(start));assert.equal((await call({...start,regionSize:8})).status,409,'A reused operation with a different body conflicts.');
assert.equal((await call({...start,operationId:crypto.randomUUID(),revision:1})).status,409,'Only one league per format.');
assert.equal((await call({action:'market',format:3,revision:0,operationId:crypto.randomUUID(),count:1})).status,409,'Stale revisions are rejected.');
response=await call({action:'market',format:3,revision:1,operationId:crypto.randomUUID(),count:1});ok(response);const oneRound=structuredClone(world);L.marketRounds(oneRound,1);
assert.deepEqual(response.world.market.log,oneRound.market.log,'Server signings follow the shared AI exactly.');
response=await call({action:'market',format:3,revision:2,operationId:crypto.randomUUID(),count:100});ok(response);assert(response.world.market.done);assert.deepEqual(response.world.teams,filled.teams);
assert.equal((await call({action:'market',format:3,revision:3,operationId:crypto.randomUUID(),count:1})).status,400,'No rounds after free agency.');
assert.equal((await call({action:'market',format:3,revision:3,operationId:crypto.randomUUID(),count:1000})).status,400,'Round counts are bounded.');
assert.equal((await call({action:'advance',format:3,revision:3,operationId:crypto.randomUUID()})).status,400,'Nothing to continue before the season.');
assert.equal((await call(null,5)).world,null,'3v3 and 5v5 leagues are separate.');
// Hand balance: the auto-balance switch is gone and leagues start with it off.
assert.equal(response.world.balance.enabled,false);assert.equal((await call({action:'balance',format:3,revision:3,operationId:crypto.randomUUID(),enabled:true})).status,400);
ok(await call({action:'reset',format:3,revision:3,operationId:crypto.randomUUID()}));assert.equal((await call()).world,null);
assert.equal((await worker.fetch(new Request('https://fateforge.test/api/teams?format=3'),env)).status,401);
// A single league saved before region circuits can only be deleted.
{const legacy={...structuredClone(filled),circuitVersion:undefined};db.prepare('INSERT INTO team_worlds(owner_id,format,revision,last_operation,state_json,updated_at) VALUES(?,?,?,?,?,?)').run('owner',5,1,'legacy',JSON.stringify(legacy),Date.now());
 const r=await call({action:'startSeason',format:5,revision:1,operationId:crypto.randomUUID()});assert.equal(r.status,409);assert.match(r.error,/single-league format/);ok(await call({action:'reset',format:5,revision:1,operationId:crypto.randomUUID()}));}

// Browser storage (GitHub Pages build) runs the same commands.
const SQL=await initSqlJs(),storage=createStorage({SQL,migrations,worker:pagesWorker,indexedDB,databaseName:'team-league-pages'});
const local=async body=>{const r=await storage.fetch('/api/teams'+(body?'':'?format=3'),{...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
ok(await local({...start,operationId:crypto.randomUUID()}));response=await local({action:'market',format:3,revision:1,operationId:crypto.randomUUID(),count:100});ok(response);assert.deepEqual(response.world.teams,filled.teams);
const backup=new SQL.Database(await storage.exportBackup());assert.equal(backup.exec('SELECT COUNT(*) FROM team_worlds')[0].values[0][0],1);backup.close();
console.log(`Team league passed: six-region pool plans for 2v2/3v3/5v5 × 6/8/10 teams with region talent (top regions grow more S and SS), ratings and convex salaries, a ${filled.teams.length}-team domestic opening auction (${filled.market.round} rounds) under region caps with 1–3 season contracts, what free agents want (money, length, style fit, home region), the rookie lock, server validation, old single leagues delete-only, and browser storage.`);

// A preview circuit pins Core rules, validates objective results, and retains objective impact.
const {simulateTeamSeries}=await import('../public/team-sim-worker.js');
assert.throws(()=>L.create({id:'bad',format:2,regionSize:6,seed:31,fighters:[],battleMode:'core'}),/3v3/);
let cr=await call({...start,revision:4,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),battleMode:'core'});ok(cr);
cr=await call({action:'market',format:3,revision:cr.revision,operationId:crypto.randomUUID(),count:100});ok(cr);
// Battle rules switch between seasons through the API.
cr=await call({action:'rules',mode:'teamfight',format:3,revision:cr.revision,operationId:crypto.randomUUID()});ok(cr);assert.equal(cr.world.settings.battleMode,'teamfight');cr=await call({action:'rules',mode:'core',format:3,revision:cr.revision,operationId:crypto.randomUUID()});ok(cr);assert.equal(cr.world.settings.battleMode,'core');
cr=await call({action:'startSeason',format:3,revision:cr.revision,operationId:crypto.randomUUID()});ok(cr);assert.equal(cr.world.settings.battleMode,'core');assert.equal(cr.world.teamEngine,L.OBJECTIVE_COMBAT_VERSION);{const r=await call({action:'rules',mode:'teamfight',format:3,revision:cr.revision,operationId:crypto.randomUUID()});assert.equal(r.status,400);}
const cw=structuredClone(cr.world),cm=L.upcoming(cr.world,1)[0],cg=simulateTeamSeries({match:cm,teams:L.squads(cr.world,cm)}),bad=structuredClone(cg);bad[0].objective.coreHp[bad[0].winnerTeam]=0;
const cmd={action:'record',format:3,revision:cr.revision,operationId:crypto.randomUUID(),results:[{matchId:cm.id,games:bad}]};assert.equal((await call(cmd)).status,400);
cr=await call({...cmd,operationId:crypto.randomUUID(),results:[{matchId:cm.id,games:cg}]});ok(cr);
assert.deepEqual(cr.world.year.matches[cm.id].games[0],[cg[0].winnerTeam,...cg[0].objective.coreHp.map(Math.round),Math.round(cg[0].seconds)],'Each game keeps its winner, the cores\' health and its length.');
assert(cr.world.stats[cg[0].fighters[0].id].downSeconds>=0);assert.equal(L.impact({damage:0,healing:0,kills:0,ccSeconds:0,objectiveDamage:100,monsterLastHits:1}),340);
console.log('Core league API passed: selected rules, real worker result, winner consistency, rejection rollback and persisted objective stats.');

const timed=structuredClone(cg);timed[0].seconds=390;timed[0].winnerTeam=0;timed[0].objective.coreHp=[80,70];timed[0].objective.suddenDeath=true;L.recordMatch(structuredClone(cw),cm.id,timed);
for(const change of [g=>g.seconds=390.6,g=>g.objective.coreHp=[-1,70],g=>g.objective.forgefireSeconds=[NaN,0],g=>g.fighters[0].downSeconds=391,g=>{g.winnerTeam=1;g.objective.coreHp=[80,70];}]){const invalid=structuredClone(timed);change(invalid[0]);assert.throws(()=>L.recordMatch(structuredClone(cw),cm.id,invalid),/Invalid/);}

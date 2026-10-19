import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {circuit,circuitPool,fakeSeries,playStage,playSeason,runOffseason} from './circuit-fixtures.mjs';
import * as L from '../public/team-league.js';
import * as E from '../public/team-events.js';
import {simulateTeamSeries} from '../public/team-sim-worker.js';
import worker from '../dist/server/index.js';

// Round robins: perfect rounds (every team once), every pair once per leg, byes for odd groups.
for(const n of [3,6,8,10])for(const legs of [1,2]){
 const ids=Array.from({length:n},(_,i)=>'t'+i),rounds=E.roundRobinRounds(ids,legs),meet={};
 assert.equal(rounds.length,(n%2?n:n-1)*legs);
 for(const round of rounds){const seen=new Set();for(const [a,b]of round){assert(!seen.has(a)&&!seen.has(b),'A team plays once per round.');seen.add(a);seen.add(b);const k=[a,b].sort().join();meet[k]=(meet[k]??0)+1;}}
 assert.equal(Object.keys(meet).length,n*(n-1)/2);assert(Object.values(meet).every(v=>v===legs),'Every pair meets once per leg.');
}
// The calendar: three splits, First Stand from season 2, MSI after split 2, the qualifiers and Worlds.
assert.deepEqual(L.buildCalendar(1).map(s=>s.key),['split1','split1-playoffs','split2','split2-playoffs','msi','split3','split3-playoffs','qualifiers','worlds']);
assert.deepEqual(L.buildCalendar(2).map(s=>s.key),['split1','split1-playoffs','first-stand','split2','split2-playoffs','msi','split3','split3-playoffs','qualifiers','worlds']);

// A season of an eight-team-per-region circuit, stage by stage.
const w=circuit({regionSize:8,seed:2026});L.marketRounds(w,1e6);
assert.throws(()=>L.recordMatch(w,'x',[]),/playable/);assert.throws(()=>L.advance(w),/still being played/);
L.startSeason(w);assert.equal(w.phase,'season');assert.equal(L.currentStage(w).key,'split1');assert.throws(()=>L.startSeason(w),/Fill every roster/);
// Split 1: one round robin per region, a week at a time in every region.
const first=L.upcoming(w);assert.equal(first.length,6*4,'Week 1 is four games in each of the six regions.');assert(first.every(m=>m.kind==='regular'&&m.bestOf===1&&m.week===1));
assert.deepEqual(first[0].lineups[0],L.teamById(w,first[0].home).lineup);
const bad=fakeSeries(w,first[0]);
for(const broken of [[{...bad[0],combatVersion:12}],[{...bad[0],winnerTeam:2}],[{...bad[0],seconds:500}],[{...bad[0],fighters:bad[0].fighters.slice(1)}],[{...bad[0],environment:{time:'noon',weather:'clear',ground:'stone',map:'open'}}],[bad[0],bad[0]]])
 assert.throws(()=>L.recordMatch(structuredClone(w),first[0].id,broken),/Invalid|decided/);
const later=Object.values(w.year.matches).find(m=>m.round===2);assert.throws(()=>L.recordMatch(structuredClone(w),later.id,fakeSeries(w,{...first[0],id:later.id,home:later.home,away:later.away})),/playable/,'Week 2 waits for week 1.');
playStage(w);assert.equal(w.awaiting.stage,'split1');assert.deepEqual(L.upcoming(w),[],'Nothing plays while a stage summary waits.');
for(const r of L.REGION_IDS){const rows=L.regionTable(w,r,1);assert.equal(rows.length,8);for(const row of rows)assert.equal(row.wins+row.losses,7,'Single round robin: seven games each.');assert.equal(w.awaiting.leaders[r],rows[0].id);}
// Split 1 playoffs: the top four, Bo3 semifinals and a Bo5 final; places, points and a split title per region.
L.advance(w);assert.equal(L.currentStage(w).key,'split1-playoffs');
for(const r of L.REGION_IDS){const b=w.year.splits[1].playoffs[r];assert.equal(b.template,'top4');assert.deepEqual(b.seeds,L.regionTable(w,r,1).slice(0,4).map(x=>x.id));}
assert.deepEqual(L.upcoming(w).map(m=>m.bestOf),Array(12).fill(3),'Two semifinals per region, Bo3.');
playStage(w);assert.equal(w.awaiting.stage,'split1-playoffs');
for(const r of L.REGION_IDS){
 const places=w.year.splits[1].places[r],final=w.year.matches[w.year.splits[1].playoffs[r].matches.final];assert.equal(places.length,8);assert.equal(final.bestOf,5);assert.equal(places[0],final.winner);
 assert.equal(w.awaiting.champions[r],places[0]);assert.equal(w.year.points[places[0]],40);assert.equal(w.year.points[places[1]],30);assert.equal(w.year.points[places[2]],20);assert.equal(w.year.points[places[3]],20);assert.equal(w.year.points[places[4]],10);assert.equal(w.year.points[places[6]],0);
 const t=w.titles.find(x=>x.event==='split'&&x.split===1&&x.region===r);assert.equal(t.champion,places[0]);assert.equal(t.runnerUp,places[1]);assert(w.fighters[t.mvp]&&L.regionOfTeam(w,w.fighters[t.mvp].team)===r,'The split MVP plays in the region.');assert.equal(t.roster.length,w.settings.rosterSize);
}
// Season 1 skips First Stand: Split 2, its playoffs, then MSI.
L.advance(w);assert.equal(L.currentStage(w).key,'split2');playStage(w);L.advance(w);playStage(w);L.advance(w);assert.equal(L.currentStage(w).key,'msi');
playStage(w);const msiChampion=w.awaiting.champion,msiHome=L.regionOfTeam(w,msiChampion);assert.equal(w.year.msiChampion,msiChampion);
assert.equal(w.year.msiBonus,L.regionOfTeam(w,w.year.events.msi.places.flat().find(id=>L.regionOfTeam(w,id)!==msiHome)),'The best region besides the champion\'s earns the MSI bonus seed.');assert.equal(w.awaiting.bonus,w.year.msiBonus);
// Split 3: a double round robin and top-six playoffs for eight-team regions.
L.advance(w);playStage(w);for(const r of L.REGION_IDS)for(const row of L.regionTable(w,r,3))assert.equal(row.wins+row.losses,14,'Split 3 is a double round robin.');
L.advance(w);for(const r of L.REGION_IDS){const b=w.year.splits[3].playoffs[r];assert.equal(b.template,'top6');}
assert.deepEqual(L.upcoming(w).map(m=>m.bestOf),Array(12).fill(3),'Two Bo3 quarterfinals per region.');
playStage(w);for(const r of L.REGION_IDS){const b=w.year.splits[3].playoffs[r],sf=['sf1','sf2'].map(k=>w.year.matches[b.matches[k]]);
 assert.equal(sf[0].home,b.seeds[0]);assert.equal(sf[1].home,b.seeds[1]);const survivors=['qf1','qf2'].map(k=>w.year.matches[b.matches[k]].winner).sort((x,y)=>b.seeds.indexOf(x)-b.seeds.indexOf(y));
 assert.equal(sf[0].away,survivors[1],'The top seed meets the lowest surviving seed.');assert.equal(sf[1].away,survivors[0]);assert(sf.every(m=>m.bestOf===5));}
// Regional qualifiers: the Split 3 champion, the MSI champion (if it reached the Split 3 playoffs), the points leader,
// then a Bo5 ladder for any seeds left. Base seeds 3 (2 for the smallest region), plus the MSI seats.
L.advance(w);assert.equal(L.currentStage(w).key,'qualifiers');
for(const r of L.REGIONS){const q=w.year.qualifiers[r.id],need=r.worlds+(msiHome===r.id?1:0)+(w.year.msiBonus===r.id?1:0),order=L.pointsOrder(w,r.id),champ=w.year.splits[3].places[r.id][0];
 assert.equal(q.need,need);assert.equal(L.worldsSlots(w,r.id),need);assert.equal(q.direct[0],champ);
 const msiSeat=msiHome===r.id&&champ!==msiChampion&&w.year.splits[3].playoffs[r.id].seeds.includes(msiChampion);if(msiSeat)assert.equal(q.direct[1],msiChampion,'The MSI champion takes its own seat.');
 const pinned=q.direct.slice(0,msiSeat?2:1);assert.equal(q.direct[pinned.length],order.find(id=>!pinned.includes(id)),'Then the points leader.');
 if(need>2){assert(q.bracket&&q.bracket.template.startsWith('ladder'));assert.deepEqual(q.bracket.seeds,order.filter(id=>!q.direct.includes(id)).slice(0,q.bracket.seeds.length));}else assert.equal(q.bracket,null);}
playStage(w);const seeds=w.awaiting.seeds;assert.equal(Object.values(seeds).flat().length,19,'Nineteen teams qualify for Worlds.');
for(const r of L.REGIONS)assert.equal(seeds[r.id].length,L.worldsSlots(w,r.id));
L.advance(w);assert.equal(L.currentStage(w).key,'worlds');playStage(w);assert.equal(w.phase,'complete');assert.equal(w.awaiting,undefined);
assert(L.worldsChampion(w));assert.equal(w.awards.at(-1).season,1);assert(w.fighters[w.awards.at(-1).mvp],'A season MVP is named.');
assert.equal(w.titles.filter(t=>t.season===1).length,6*3+2,'Eighteen split titles, MSI and Worlds.');
assert.equal(L.leaders(w,'impact',1)[0].fighter.id,w.awards.at(-1).mvp);
assert.deepEqual([...new Set(w.regionRank)].sort(),[...L.REGION_IDS].sort(),'The region ranking covers every region.');
// Season 2 adds First Stand; six-team regions keep top-four playoffs in Split 3.
runOffseason(w);while(w.phase==='offseason')L.marketRounds(w,1e6);assert.equal(w.phase,'ready');
L.startSeason(w);playStage(w);L.advance(w);playStage(w);L.advance(w);assert.equal(L.currentStage(w).key,'first-stand');
{const six=circuit({regionSize:6,seed:77});L.marketRounds(six,1e6);playSeason(six);assert.equal(six.year.splits[3].playoffs.r1.template,'top4');for(const row of L.regionTable(six,'r1',3))assert.equal(row.wins+row.losses,10);}

// A real simulated series is accepted as-is.
const small=circuit({regionSize:6,seed:99});L.marketRounds(small,1e6);L.startSeason(small);playStage(small);L.advance(small);
const series=L.upcoming(small,1)[0],real=simulateTeamSeries({match:series,teams:L.squads(small,series)});assert(real.length>=2&&real.length<=3);L.recordMatch(small,series.id,real);

// Server: start the season, record batches, reject bad results, continue past stage summaries, finish Worlds.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=async body=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams',{method:'POST',headers:{'oai-authenticated-user-id':'owner','content-type':'application/json'},body:JSON.stringify({format:3,operationId:crypto.randomUUID(),...body})}),env);return {status:r.status,...await r.json()};};
const ok=r=>{assert.equal(r.status,200,r.error);return r;};
const seed=4321,pool=circuitPool(3,6,seed);
let {world,revision}=ok(await call({action:'start',revision:0,worldId:crypto.randomUUID(),regionSize:6,seed,fighters:pool.map(f=>({id:f.id,name:f.name,teamKit:f.teamKit,traits:f.traits,summary:{generationVersion:f.summary.generationVersion,wheelRarity:f.summary.wheelRarity}}))}));
assert.equal((await call({action:'startSeason',revision})).status,400,'The season waits for free agency.');
({world,revision}=ok(await call({action:'market',revision,count:100})));const startSeasonCommand={action:'startSeason',revision,operationId:crypto.randomUUID()};({world,revision}=ok(await call(startSeasonCommand)));assert.deepEqual(ok(await call(startSeasonCommand)).world,world,'A retried start is recognised.');
assert.equal(world.balance.enabled,false);assert.equal((await call({action:'balance',revision,enabled:true})).status,400);
const week=L.upcoming(world);assert.equal((await call({action:'record',revision,results:[{matchId:week[0].id,games:fakeSeries(world,week[0]).map(g=>({...g,combatVersion:12}))}]})).status,400,'Results from another engine are rejected.');
let stages=0;
while(world.phase!=='complete'){
 if(world.awaiting){({world,revision}=ok(await call({action:'advance',revision})));stages++;continue;}
 const matches=L.upcoming(world);({world,revision}=ok(await call({action:'record',revision,results:matches.map(m=>({matchId:m.id,games:fakeSeries(world,m)}))})));
}
assert.equal(stages,8,'Season 1 has eight stage summaries before Worlds.');assert.equal(world.titles.filter(t=>t.event==='worlds').length,1);
assert.equal((await call({action:'record',revision,results:[{matchId:week[0].id,games:[]}]})).status,400,'Nothing to record after Worlds.');
assert.equal((await call({action:'advance',revision})).status,400,'Nothing to continue after Worlds.');
console.log(`Team season passed: perfect round robins, the season calendar (First Stand from season 2), 48 teams through three splits with week-by-week rounds, split tables, top-four and top-six playoffs with re-seeding, championship points and split titles, MSI's bonus Worlds seed, regional qualifier ladders to nineteen Worlds teams (MSI champion seat and bonus seed), a real simulated series, result validation and server batches with stage summaries through Worlds.`);

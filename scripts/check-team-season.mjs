import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
import {simulateTeamSeries} from '../public/team-sim-worker.js';
import worker from '../dist/server/index.js';

const league=(format,teams,seed)=>{const plan=L.poolPlan(format,teams,seed),w=L.create({id:crypto.randomUUID(),format,teams,seed,fighters:plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`F${i}`))});L.draftPicks(w,1e6);return w;};
// Synthetic but valid series results (fast); one real simulated series is checked separately.
const fake=(m,salt=0)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed^salt;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],combatVersion:'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map(id=>({id,damage:n%500,healing:n%97,kills:n%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
const playOut=w=>{let guard=0;while(w.phase==='season'||w.phase==='playoffs'){const [m]=L.upcoming(w,1);L.recordMatch(w,m.id,fake(m));assert(++guard<2000);}};

// Schedules: perfect weekly matchings with the right number of games, for several seasons and every size.
for(const [teams,weeks]of [[8,10],[16,14],[32,17]])for(const season of [1,2,3]){
 const w={seed:7,season,teams:Array.from({length:teams},(_,i)=>({id:'t'+(i+1)})),conferences:L.structure(teams).map(c=>({name:c.name,divisions:c.divisions.map(d=>({name:d.name,teams:d.slots.map(s=>'t'+(s+1))}))}))};
 const schedule=L.buildSchedule(w),meetings={};assert.equal(schedule.length,weeks);
 for(const week of schedule){const seen=new Set();for(const g of week.games){assert(!seen.has(g.home)&&!seen.has(g.away),'A team plays once per week.');seen.add(g.home);seen.add(g.away);const key=[g.home,g.away].sort().join();meetings[key]=(meetings[key]??0)+1;}assert.equal(seen.size,teams,'No byes.');}
 assert(Math.max(...Object.values(meetings))<=2,'Only division rivals meet twice.');assert.deepEqual(schedule,L.buildSchedule(w),'Schedules are deterministic.');
}

// A full 32-team season: standings, seven seeds per conference, re-seeded rounds, champion and MVP.
const big=league(5,32,2026);assert.throws(()=>L.recordMatch(big,'x',[]),/next team-league match/);
L.startSeason(big);assert.equal(big.phase,'season');assert.throws(()=>L.startSeason(big),/Finish the draft/);
const first=L.upcoming(big,1)[0];assert.equal(first.kind,'regular');assert.equal(first.bestOf,1);assert.deepEqual(first.lineups[0],L.teamById(big,first.home).lineup);
const bad=fake(first);
for(const broken of [[{...bad[0],combatVersion:12}],[{...bad[0],winnerTeam:2}],[{...bad[0],seconds:500}],[{...bad[0],fighters:bad[0].fighters.slice(1)}],[{...bad[0],environment:{time:'noon',weather:'clear',ground:'stone'}}],[{...bad[0],environment:{...bad[0].environment,map:'lava pit'}}],[{...bad[0],environment:{time:'day',weather:'clear',ground:'stone'}}],[{...bad[0],combatVersion:'team-1'}],[...bad,...bad]])
 assert.throws(()=>L.recordMatch(structuredClone(big),first.id,broken),/Invalid|decided/);
assert.throws(()=>L.recordMatch(big,L.upcoming(big,2)[1].id,fake(L.upcoming(big,2)[1])),/next team-league match/,'Matches are recorded in order.');
let regular=0;while(big.phase==='season'){const [m]=L.upcoming(big,1);L.recordMatch(big,m.id,fake(m));regular++;}
assert.equal(regular,32*17/2);assert.equal(big.phase,'playoffs');
for(const row of L.standings(big))assert.equal(row.wins+row.losses,17);
for(const conf of ['Sunward','Shadeward']){const seeds=big.playoffs.seeds[conf],leaders=new Set(big.conferences.find(c=>c.name===conf).divisions.map(d=>L.standings(big,d.teams)[0].id));assert.equal(seeds.length,7);assert(seeds.slice(0,4).every(id=>leaders.has(id)),'Division winners take seeds 1–4.');}
const wildcard=big.playoffs.rounds[0];assert.equal(wildcard.key,'wildcard');assert.equal(wildcard.series.length,6);assert(wildcard.series.every(s=>s.bestOf===3));
assert(!wildcard.series.some(s=>[s.home,s.away].includes(big.playoffs.seeds.Sunward[0])),'The top seed has a bye.');
for(const s of wildcard.series){const m=L.upcoming(big).find(x=>x.id===s.id);L.recordMatch(big,m.id,fake(m,1));}
const divisional=big.playoffs.rounds[1];assert.equal(divisional.key,'divisional');assert.equal(divisional.series.length,4);
for(const conf of ['Sunward','Shadeward']){const seeds=big.playoffs.seeds[conf],series=divisional.series.filter(s=>big.teams.find(t=>t.id===s.home).conference===conf),alive=series.flatMap(s=>[s.home,s.away]).sort((a,b)=>seeds.indexOf(a)-seeds.indexOf(b));assert.equal(series[0].home,seeds[0]);assert.equal(series[0].away,alive.at(-1),'The top seed hosts the lowest remaining seed.');}
playOut(big);assert.equal(big.phase,'complete');assert.deepEqual(big.playoffs.rounds.map(r=>r.key),['wildcard','divisional','conference','final']);assert.equal(big.playoffs.rounds.at(-1).series[0].bestOf,5);
const title=big.titles[0];assert.equal(title.champion,big.playoffs.champion);assert(title.runnerUp&&title.champion!==title.runnerUp);assert(big.fighters[title.mvp],'An MVP is named.');
assert.deepEqual(L.leaders(big,'impact',1)[0].fighter.id,title.mvp);assert(JSON.stringify(big).length<1500000,'A full 32-team season stays well under the storage cap.');
// Smaller formats: 4 and 2 seeds per conference.
for(const [teams,keys,format]of [[16,['semifinal','conference','final'],3],[8,['conference','final'],3],[8,['conference','final'],2]]){const w=league(format,teams,teams*11+format);L.startSeason(w);playOut(w);assert.deepEqual(w.playoffs.rounds.map(r=>r.key),keys);assert.equal(w.playoffs.seeds.Sunward.length,L.PLAYOFF_SPOTS[teams]);}

// A real simulated playoff series is accepted as-is.
const small=league(3,8,99);L.startSeason(small);while(small.phase==='season'){const [m]=L.upcoming(small,1);L.recordMatch(small,m.id,fake(m));}
const series=L.upcoming(small,1)[0],real=simulateTeamSeries({match:series,teams:L.squads(small,series)});assert(real.length>=2&&real.length<=3);L.recordMatch(small,series.id,real);

// Server: start the season, record batches in order, reject bad results, finish the playoffs.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=async body=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams',{method:'POST',headers:{'oai-authenticated-user-id':'owner','content-type':'application/json'},body:JSON.stringify({format:3,operationId:crypto.randomUUID(),...body})}),env);return {status:r.status,...await r.json()};};
const ok=r=>{assert.equal(r.status,200,r.error);return r;};
const seed=4321,plan=L.poolPlan(3,8,seed),pool=plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`F${i}`));
let {world,revision}=ok(await call({action:'start',revision:0,worldId:crypto.randomUUID(),teams:8,seed,fighters:pool.map(f=>({id:f.id,name:f.name,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}}))}));
assert.equal((await call({action:'startSeason',revision})).status,400,'The season waits for the draft.');
({world,revision}=ok(await call({action:'draft',revision,count:1000})));({world,revision}=ok(await call({action:'startSeason',revision})));assert.equal(world.phase,'season');
const week=L.upcoming(world,4);assert.equal((await call({action:'record',revision,results:week.slice(1).map(m=>({matchId:m.id,games:fake(m)}))})).status,400,'Out-of-order results are rejected.');
assert.equal((await call({action:'record',revision,results:[{matchId:week[0].id,games:fake(week[0]).map(g=>({...g,combatVersion:12}))}]})).status,400,'Results from another engine are rejected.');
while(world.phase!=='complete'){const matches=L.upcoming(world,world.phase==='season'?4:Infinity);({world,revision}=ok(await call({action:'record',revision,results:matches.map(m=>({matchId:m.id,games:fake(m)}))})));}
assert.equal(world.titles.length,1);assert.equal((await call({action:'record',revision,results:[{matchId:'s1:w1:0',games:[]}]})).status,400,'Nothing to record after the final.');
console.log(`Team season passed: perfect 10/14/17-week schedules, ${regular}-game 32-team season with tiebreak standings, 7-seed re-seeded playoffs to a Bo5 final, 16/8-team brackets, a real simulated series, result validation and server batches through the champion.`);

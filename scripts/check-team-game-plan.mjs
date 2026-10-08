// Core siege coach game plans (team-3.6): dial validation and defaults, dial effects on the team brain, series
// adaptation, league validation, the worker command, determinism and the recorded measurements.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {squad,COMPOSITIONS,generation} from './team-fixtures.mjs';
import {teamEngine,simulateTeam} from '../public/combat-team.js';
import {SIEGE_POSTURES,SIEGE_LATE,SIEGE_FORGEFIRE_LATE} from '../public/combat-team-v3-6.js';
import {TEAM_POSTURES} from '../public/combat-team-v2.js';
import {GAME_PLAN_OPTIONS,validGamePlan,defaultGamePlan,personalityGamePlan,adaptGamePlan,PERSONALITY_PLANS} from '../public/team-game-plan.js';
import {seriesGamePlans,seriesGameOptions} from '../public/team-series.js';
import {compactTeamResult} from '../public/team-sim-worker.js';
import * as L from '../public/team-league.js';
import worker from '../dist/server/index.js';

// 1. The plan model.
const plan=(titan,style,siege)=>({titan,style,siege});
assert(validGamePlan(plan('always','group','numbers')));
for(const bad of [null,[],{},plan('sometimes','group','numbers'),{...plan('always','group','numbers'),extra:1},plan('always','group')])assert(!validGamePlan(bad));
for(const tactic of ['balanced','defensive','aggressive','focus-healer','protect-carry'])assert(validGamePlan(defaultGamePlan(tactic)),tactic);
for(const personality of Object.keys(L.PERSONALITIES))assert(validGamePlan(personalityGamePlan(personality)),personality);
assert.deepEqual(Object.keys(PERSONALITY_PLANS).sort(),Object.keys(L.PERSONALITIES).sort());
assert.deepEqual(Object.keys(GAME_PLAN_OPTIONS),['titan','style','siege']);
const base=plan('always','group','numbers');assert.deepEqual(adaptGamePlan(base,'glass',false),base,'winners keep their plan');
for(const personality of Object.keys(L.PERSONALITIES)){const next=adaptGamePlan(base,personality,true);assert(validGamePlan(next));assert.equal(Object.keys(base).filter(k=>base[k]!==next[k]).length,1,`${personality} changes exactly one dial after a loss`);assert.deepEqual(next,adaptGamePlan(base,personality,true));}

// 2. Dials steer the brain.
const Plan=teamEngine('team-3.6'),make=(plans,seed=81)=>new Plan([squad(COMPOSITIONS.balanced3,seed),squad(COMPOSITIONS.balanced3,seed+1)],seed,{headless:true,map:'open',gamePlans:plans});
const titanUp=b=>{b.time=40;b.objectiveStep(1/60);assert(b.titan.hp>0);};
const team=(b,t)=>b.combatants.filter(f=>f.team===t);
{const b=make([plan('never','group','numbers'),base]);titanUp(b);let s=b.planScores(0);assert.equal(s.contest,0);assert.equal(s.steal,0);assert(s.hold>0,'Never contesting plays around the Titan');assert(b.planScores(1).contest>0);
 b.time=160;s=b.planScores(0);assert.equal(s.contest,0);assert(s.siege>0,'and sieges once a siege is allowed');}
{const b=make([plan('ahead','group','numbers'),base]);titanUp(b);team(b,0)[0].hp=0;const s=b.planScores(0);assert.equal(s.contest,0,'behind, a When-ahead team leaves the Titan');assert(s.hold>0);}
{const b=make([plan('always','group','late'),plan('always','group','forgefire')]);b.time=SIEGE_LATE-60;b.titan.hp=0;b.nextTitan=b.time+80;assert.equal(b.planScores(0).siege,0,'no siege before 3:00');assert.equal(b.planScores(1).siege,0,'no siege without Forgefire');assert(b.planScores(0).hold>0,'a team with nothing to do holds');
 b.time=SIEGE_LATE+1;assert(b.planScores(0).siege>0);assert.equal(b.planScores(1).siege,0);b.time=SIEGE_FORGEFIRE_LATE+1;assert(b.planScores(1).siege>0,'With Forgefire still sieges late in the match');
 b.time=100;b.forgefireUntil[1]=b.time+30;for(const f of team(b,1))f.forgefireUntil=b.time+30;assert(b.planScores(1).siege>0,'Forgefire opens the siege');}
{const flank=make([plan('always','flank','numbers'),plan('always','group','numbers')]);titanUp(flank);for(const t of [0,1]){for(const e of team(flank,1-t)){e.x=650;e.y=300;}}flank.titan.hp=flank.titan.maxHp*.5;flank.titanHits.push({index:team(flank,1)[0].index,damage:50,time:flank.time},{index:team(flank,0)[0].index,damage:50,time:flank.time});const s0=flank.planScores(0),s1=flank.planScores(1);assert(s0.flank>s1.flank+20,'Flank style favours flanking');}
{const b=make([{titan:'bogus'},null]);assert.deepEqual(b.gamePlans,[defaultGamePlan('balanced'),defaultGamePlan('balanced')],'invalid plans fall back to the tactic default');}
{const b=new Plan([squad(COMPOSITIONS.balanced3,90),squad(COMPOSITIONS.balanced3,91)],90,{headless:true,tactics:['defensive','balanced']});assert.deepEqual(b.gamePlans[0],defaultGamePlan('defensive'));assert.equal(b.posture(0),SIEGE_POSTURES.defensive);}
// Siege postures apply only in team-3.6; classic teamfight keeps the classic posture.
{const classic=new (teamEngine('team-2.7'))([squad(COMPOSITIONS.balanced3,92),squad(COMPOSITIONS.balanced3,93)],92,{headless:true,tactics:['defensive','balanced']});assert.equal(classic.posture(0),TEAM_POSTURES.defensive);assert.notEqual(SIEGE_POSTURES.defensive.leash,TEAM_POSTURES.defensive.leash);}

// 3. Deterministic; the watched game matches; the result records both plans.
const plans=[plan('ahead','flank','late'),plan('never','group','forgefire')];
const play=headless=>{const b=new Plan([squad(COMPOSITIONS.balanced3,401),squad(COMPOSITIONS.balanced3,402)],707,{headless,map:'ruins',gamePlans:plans});while(!b.done)b.step(1/60);return b.result();};
const one=play(true);assert.deepEqual(one,play(true));assert.deepEqual(one,play(false));assert.deepEqual(one.gamePlans,plans);assert.equal(one.combatVersion,'team-3.6');

// 4. Series: the user keeps their plan, winners keep theirs, AI losers adjust one dial.
{const match={gamePlans:[base,base],coachStyles:['glass','fortress'],userSide:-1,lineups:[['a'],['b']],tactics:['balanced','balanced'],seriesRulesVersion:2},games=[{winnerTeam:0,gamePlans:[base,base]}];const next=seriesGamePlans(match,games);assert.deepEqual(next[0],base);assert.deepEqual(next[1],adaptGamePlan(base,'fortress',true));
 const user={...match,userSide:1};assert.deepEqual(seriesGamePlans(user,games)[1],base,'the user side is never adjusted');const choice=plan('never','flank','late');assert.deepEqual(seriesGameOptions(user,games,{gamePlan:choice}).gamePlans[1],choice);
 assert.equal(seriesGameOptions({lineups:[[],[]],tactics:['balanced','balanced']},[]).gamePlans,undefined,'older engines carry no plans');}

// 5. League: describe carries plans, user choices validate, AI plans must follow the series plan.
{const seed=515,pool=L.poolPlan(3,8,seed).map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`Fighter ${i}`)),w=L.create({id:crypto.randomUUID(),format:3,teams:8,seed,fighters:pool,battleMode:'core'});L.draftPicks(w,1e6);L.startSeason(w);
 assert.equal(w.teamEngine,'team-3.6');let m=L.upcoming(w,1)[0];w.settings.userTeam=m.home;const mine=plan('never','flank','late');L.setGamePlan(w,mine);assert.throws(()=>L.setGamePlan(w,{titan:'x'}),/Titan priority/);
 m=L.upcoming(w,1)[0];assert.equal(m.userSide,0);assert.deepEqual(m.gamePlans[0],mine);assert.deepEqual(m.gamePlans[1],L.teamGamePlan(w,L.teamById(w,m.away)));
 const options=seriesGameOptions(m,[]),r=simulateTeam(L.squads(w,m),m.seed,{conditions:m.conditions,tactics:options.tactics,gamePlans:options.gamePlans,engineVersion:m.engineVersion,balance:m.balance}),game={...compactTeamResult(r),...options};
 assert.throws(()=>L.recordSeriesGame(structuredClone(w),m.id,{...game,gamePlans:[mine,plan('never','flank','late')]}),/series plan/,'the AI plan cannot be edited');
 assert.throws(()=>L.recordSeriesGame(structuredClone(w),m.id,{...game,gamePlans:[{titan:'x'},game.gamePlans[1]]}),/series plan/);
 const done=L.recordSeriesGame(w,m.id,game);assert(done.complete);}

// 6. Worker command.
{const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
 const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 const call=async body=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams',{method:'POST',headers:{'oai-authenticated-user-id':'planner','content-type':'application/json'},body:JSON.stringify(body)}),env);return {status:r.status,...await r.json()};},ok=r=>assert.equal(r.status,200,r.error);
 const seed=616,pool=L.poolPlan(3,8,seed).map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`Fighter ${i}`)).map(f=>({id:f.id,name:f.name,teamKit:f.teamKit,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}}));
 let r=await call({action:'start',format:3,revision:0,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),teams:8,seed,fighters:pool,battleMode:'core'});ok(r);
 r=await call({action:'draft',format:3,revision:r.revision,operationId:crypto.randomUUID(),count:1000});ok(r);
 r=await call({action:'claim',format:3,revision:r.revision,operationId:crypto.randomUUID(),team:r.world.teams[0].id});ok(r);
 const chosen=plan('ahead','flank','forgefire');r=await call({action:'gamePlan',format:3,revision:r.revision,operationId:crypto.randomUUID(),plan:chosen});ok(r);assert.deepEqual(r.world.teams[0].gamePlan,chosen);
 const bad=await call({action:'gamePlan',format:3,revision:r.revision,operationId:crypto.randomUUID(),plan:{titan:'always'}});assert.equal(bad.status,400);}

// 7. Recorded measurements (validation/team-objectives-plan.json).
const recorded=JSON.parse(fs.readFileSync('validation/team-objectives-plan.json','utf8'));assert.equal(recorded.engine,'team-3.6');
for(const row of recorded.rows){assert(row.medianSeconds>=240&&row.medianSeconds<=360,`${row.size}v${row.size} median ${row.medianSeconds}s`);assert(row.timeLimitRate<=10,`${row.size}v${row.size} time limit ${row.timeLimitRate}%`);assert(row.titanIgnoredRate<10);}
for(const row of recorded.tactics)assert(row.winRate>=30&&row.winRate<=70,`${row.size}v${row.size} ${row.tactic} vs balanced ${row.winRate}%`);
for(const row of recorded.dials??[])assert(row.winRate>=30&&row.winRate<=70,`${row.size}v${row.size} ${row.dial}=${row.value} vs default ${row.winRate}%`);
console.log('Game plans passed: model, dial effects, siege postures, series adaptation, league validation, worker command, determinism and recorded targets.');

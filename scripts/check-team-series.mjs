import assert from 'node:assert/strict';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
import {seriesGameOptions,seriesScore} from '../public/team-series.js';
import {simulateTeamSeries} from '../public/team-sim-worker.js';
import {TeamBattle,TEAM_ENGINE_VERSION,teamEngine} from '../public/combat-team.js';
import {powerFor} from '../public/abilities-v12.js';

const seed=1414,plan=L.poolPlan(3,8,seed),fighters=plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`F${i}`)),w=L.create({id:crypto.randomUUID(),format:3,teams:8,seed,fighters});
L.draftPicks(w,1000);L.claimTeam(w,w.teams[0].id);L.startSeason(w);
const game=(m,previous=[],winnerTeam=0,choice=null)=>{const p=seriesGameOptions(m,previous,choice);return {winnerTeam,seconds:30,hp:winnerTeam?[0,70]:[70,0],reason:'Team eliminated',combatVersion:m.engineVersion,environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:p.lineups.flat().map(id=>({id,damage:100,healing:0,kills:0,deaths:0,ccSeconds:0})),...p};};
while(w.phase==='season'){const m=L.upcoming(w,1)[0];L.recordMatch(w,m.id,[game(m,[],m.away===w.settings.userTeam?1:0)]);}
const m=L.upcoming(w).find(m=>[m.home,m.away].includes(w.settings.userTeam));assert(m);const first=game(m,[],0);L.recordSeriesGame(w,m.id,first);assert.equal(w.pendingSeries.games.length,1);assert.equal(w.stats[first.fighters[0].id].games,10,'Incomplete series do not award stats twice.');
const next=L.upcoming(w,1)[0];assert.equal(next.id,m.id);assert.deepEqual(next.completedGames,[first]);const me=L.teamById(w,w.settings.userTeam),bench=me.roster.find(id=>!m.lineups[m.userSide].includes(id)),choice={lineup:[bench,...m.lineups[m.userSide].slice(0,2)],tactic:'aggressive'},second=game(next,next.completedGames,1,choice);
const wrong=structuredClone(second);wrong.lineups[1-m.userSide]=L.teamById(w,m.home).roster.slice(0,3);assert.throws(()=>L.recordSeriesGame(structuredClone(w),m.id,wrong),/roster|result/);
L.recordSeriesGame(w,m.id,second);assert.deepEqual(seriesScore(w.pendingSeries.games),[1,1]);const final=L.upcoming(w,1)[0],last=game(final,final.completedGames,0);L.recordSeriesGame(w,m.id,last);assert.equal(w.pendingSeries,undefined);const recorded=w.playoffs.rounds[0].series.find(s=>s.id===m.id);assert.equal(recorded.games.length,3);assert(recorded.games[1].lineups[m.userSide].includes(bench));assert.equal(recorded.games[1].tactics[m.userSide],'aggressive');
assert.throws(()=>L.recordSeriesGame(w,m.id,last),/next/);
// The identical adaptation/seed rules drive quick and individually watched games.
const remaining=L.upcoming(w,1)[0],teams=L.squads(w,remaining),quick=simulateTeamSeries({match:remaining,teams}),watched=[],score=[0,0],all=new Map(teams.flat().map(c=>[c.id,c]));
while(Math.max(...score)<Math.ceil(remaining.bestOf/2)){const p=seriesGameOptions(remaining,watched),Engine=teamEngine(remaining.engineVersion),b=new Engine(p.lineups.map(ids=>ids.map(id=>all.get(id))),(remaining.seed+watched.length*65537)>>>0,{conditions:remaining.conditions,tactics:p.tactics,headless:false});while(!b.done)b.step(1/60);const r=b.result();const {compactTeamResult}=await import('../public/team-sim-worker.js');watched.push({...compactTeamResult(r),...p});score[r.winnerTeam]++;}
assert.deepEqual(watched,quick);

const c={id:'a',name:'Archer',traits:{weapon:'Longbow',class:'Ranger',power:'No power',power2:'No second power'},summary:{generationVersion:3,stats:[225,225,225,225,225],total:1125}},e={...c,id:'b',name:'Enemy'};
const b=new TeamBattle([[c],[e]],17,{headless:true,map:'open'}),[a,t]=b.fighters;Object.assign(a,{x:100,y:100,cast:99,cooldown:0,energy:100});Object.assign(t,{x:250,y:100,vx:0,vy:90});b.obstacles=[{x:180,y:130,radius:14}];assert(b.clearShot(a,t));b.startAttack(a,t);assert.equal(a.action,null,'Predicted path clips cover even though the current-position ray is clear.');assert.equal(a.energy,100);
b.obstacles=[];t.vy=0;b.startAttack(a,t);assert.equal(a.action.type,'shot');b.obstacles=[{x:180,y:100,radius:20}];b.updateAttack(a,t,.25);assert.equal(a.action,null);assert.equal(b.projectiles.length,0);assert(a.cooldown<=.12);assert.equal(a.energy,100);
const fire=powerFor('Fire control');assert.equal(b.projectileClear(a,t,fire),false);const mana=a.mana;b.usePower(a,t,fire);assert.equal(b.projectiles.length,0);assert.equal(a.mana,mana);
assert.equal(TEAM_ENGINE_VERSION,'team-2.1');assert.notEqual(teamEngine('team-2'),teamEngine(TEAM_ENGINE_VERSION));
console.log('Team series: durable partial games, user bench/tactic choices, AI restrictions, exactly-once stats, watched/quick parity, predicted-path and windup cover cancellation, preserved legacy engine.');

// A real saved partial series survives browser backup import/reopen and a lost
// response retry. Invalid next-game metadata leaves both revision and games intact.
const {default:initSqlJs}=await import('sql.js'),{indexedDB}=await import('fake-indexeddb'),{default:worker}=await import('../dist/server/index.js'),{default:pagesWorker}=await import('../_site/local-api.js'),{default:migrations}=await import('../_site/local-schema.js'),{sqliteAdapter,createStorage}=await import('../_site/sqlite-store.js'),SQL=await initSqlJs(),db=new SQL.Database();for(const migration of migrations)db.run(migration);db.run('PRAGMA application_id=1178686533');db.run('PRAGMA user_version='+migrations.length);
const state=structuredClone(w),nextMatch=L.upcoming(state,1)[0];db.run('INSERT INTO team_worlds(owner_id,format,revision,last_operation,state_json,updated_at) VALUES(?,?,?,?,?,?)',['local',3,0,'initial',JSON.stringify(state),Date.now()]);
const config={SQL,migrations,worker:pagesWorker,indexedDB,databaseName:'partial-team-series'},storage=createStorage(config);await storage.importBackup(db.export());
const post=async(instance,body)=>{const response=await instance.fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,...await response.json()};},command={action:'seriesGame',format:3,revision:0,operationId:crypto.randomUUID(),matchId:nextMatch.id,game:game(nextMatch)};
const saved=await post(storage,command);assert.equal(saved.status,200,saved.error);assert.equal(saved.world.pendingSeries.games.length,1);assert.deepEqual(await post(storage,command),saved);
const reopened=createStorage(config),restored=await(await reopened.fetch('/api/teams?format=3')).json();assert.deepEqual(restored.world,saved.world);
const before=await reopened.exportBackup(),invalid={...command,revision:1,operationId:crypto.randomUUID(),game:{...command.game,fighters:[]}};assert.equal((await post(reopened,invalid)).status,400);assert.deepEqual((await(await reopened.fetch('/api/teams?format=3')).json()).world,saved.world);
const m2=L.upcoming(saved.world,1)[0],done=await post(reopened,{...command,revision:1,operationId:crypto.randomUUID(),game:game(m2,m2.completedGames)});assert.equal(done.status,200,done.error);assert.equal(done.world.pendingSeries,undefined);
const fs=await import('node:fs');fs.mkdirSync('validation/browser-fixtures',{recursive:true});fs.writeFileSync('validation/browser-fixtures/team-series.sqlite',before);db.close();console.log('Partial team-series browser saves: checkpoint, failed result rollback, idempotent retry, reload and resumed completion passed.');

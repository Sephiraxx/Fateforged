// Season log and balance report (TEAM-BATTLES.md, "Season log and balance report"): every finished season keeps its
// teams, rosters, fighter results and games after the next season resets the stats; the report adds them up.
import assert from 'node:assert/strict';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';

const roll=(plan,seed)=>plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`R${seed}-${i}`));
const fake=(m,salt=0)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed^salt;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],balanceId:m.balance?.id,combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map((id,i)=>({id,damage:(n>>>(i%8))%500,healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
const playOut=w=>{let guard=0;while(w.phase==='season'||w.phase==='playoffs'){const [m]=L.upcoming(w,1);L.recordMatch(w,m.id,fake(m));assert(++guard<2000);}};
const finishDraft=w=>{let guard=0;while(!w.draft.complete){L.draftPicks(w,1e6);assert(++guard<1000);}};
const gamesPlayed=w=>w.results.length+(w.playoffs?.rounds??[]).reduce((n,r)=>n+r.series.reduce((k,s)=>k+(s.games?.length??0),0),0);

const w=L.create({id:crypto.randomUUID(),format:3,teams:8,seed:777,fighters:roll(L.poolPlan(3,8,777),777)});L.draftPicks(w,1e6);
// A league without a log (any save from before it) reports nothing yet.
assert.deepEqual(L.balanceReport(w).seasons,[]);assert.match(L.balanceReportText(w),/no seasons logged yet/);

const size=L.FORMATS[w.format].size,played=[];
for(let season=1;season<=2;season++){
 L.startSeason(w);playOut(w);played.push(gamesPlayed(w));const champion=w.playoffs.champion;
 L.startOffseason(w,roll(L.rookiePlan(w),season*977));finishDraft(w);
 const entry=w.seasonLog.at(-1);assert.equal(entry.season,season);assert.equal(entry.format,w.format);assert.equal(entry.battleMode,w.settings.battleMode);
 assert.equal(entry.teams.length,8);assert.deepEqual(entry.teams.filter(t=>t.champion).map(t=>t.id),[champion]);
 assert(entry.teams.every(t=>t.roster.length&&t.roster.every(label=>/^\w+ \(\w+\) (A|S|SS)$/.test(label))),'Rosters list each fighter as Class (Subclass) tier.');
 assert.equal(entry.teams.reduce((n,t)=>n+t.wins+t.losses,0),w.history.at(-1).standings.reduce((n,r)=>n+r.wins+r.losses,0));
 assert.equal(entry.games.length,played.at(-1),'Every regular-season and playoff game is logged.');
 assert(entry.games.every(([a,b,winner])=>a.length===4&&b.length===4&&(winner===0||winner===1)));
 const fighterGames=entry.fighters.reduce((n,f)=>n+f.games,0),fighterWins=entry.fighters.reduce((n,f)=>n+f.wins,0);
 assert.equal(fighterGames,entry.games.length*2*size,'Every starter of every game is counted.');assert.equal(fighterWins,entry.games.length*size,'One side wins each game.');
 assert(entry.fighters.every(f=>f.subclass&&f.class&&f.tier&&f.role));
}
assert.deepEqual(w.seasonLog.map(s=>s.season),[1,2]);assert.equal(w.season,3);assert.deepEqual(w.stats,{},'The season stats reset while the log keeps them.');

// The report adds the logged seasons up.
const r=L.balanceReport(w),total=w.seasonLog.reduce((n,s)=>n+s.fighters.reduce((k,f)=>k+f.games,0),0);
assert.deepEqual(r.seasons,[1,2]);assert.equal(r.games,played[0]+played[1]);
for(const key of ['subclass','class','role'])assert.equal(r[key].reduce((n,e)=>n+e.games,0),total,`${key} rows cover every fighter game`);
assert(r.subclass.every(e=>e.ci[0]<=e.pct&&e.pct<=e.ci[1]&&/^\w+ \(\w+\)$/.test(e.key)));assert(r.comp.every(e=>e.games>=10));
assert.equal(r.history.length,2);assert(r.history.every(h=>h.teams[0].champion));
const text=L.balanceReportText(w);for(const part of ['seasons 1–2 (2)','Subclasses','Classes','Roles','Compositions','S1 ','S2 ','*'])assert(text.includes(part),`the text report has ${part}`);
assert(text.length<40000,`the text report stays short (${text.length} characters)`);

// At most SEASON_LOG_LIMIT seasons are kept, the newest last.
w.seasonLog=Array.from({length:L.SEASON_LOG_LIMIT},(_,i)=>({...w.seasonLog[0],season:-i}));L.startSeason(w);playOut(w);L.startOffseason(w,roll(L.rookiePlan(w),3*977));
assert.equal(w.seasonLog.length,L.SEASON_LOG_LIMIT);assert.equal(w.seasonLog.at(-1).season,3);

console.log(`Season log passed: 2 seasons logged (${played.join(' + ')} games, ${total} fighter games), stats survive the reset, the report adds up (${r.subclass.length} subclasses, ${text.length} characters of text), and the log keeps the last ${L.SEASON_LOG_LIMIT} seasons.`);

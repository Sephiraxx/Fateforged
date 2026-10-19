// Season log and balance report: every finished circuit season keeps its teams, rosters, fighter results and games,
// every region's split tables, playoffs, points and qualifier, and every international event game by game, after the
// next season resets the stats; the report adds them up.
import assert from 'node:assert/strict';
import * as L from '../public/team-league.js';
import {finalKey} from '../public/team-events.js';
import {circuit,roll,playSeason} from './circuit-fixtures.mjs';

const fake=(w,m)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],balanceId:m.balance?.id,combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map((id,i)=>({id,damage:(n>>>(i%8))%500,healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
const playOut=w=>playSeason(w,fake);
const finishMarket=w=>{let guard=0;while(L.marketOpen(w)){L.marketRounds(w,1e6);assert(++guard<1000);}};
const gamesPlayed=w=>Object.values(w.year.matches).reduce((n,m)=>n+(m.games?.length??0),0);
const regularMatches=w=>Object.values(w.year.matches).filter(m=>/^split\d$/.test(m.stage)).length;
const compactOk=x=>x.games.every(g=>(g[0]===0||g[0]===1)&&g.length===4)&&x.games.filter(g=>g[0]===(x.winner===x.home?0:1)).length===Math.ceil(x.bestOf/2);

const w=circuit({format:3,regionSize:6,seed:777});L.marketRounds(w,1e6);
// A league without a log reports nothing yet.
assert.deepEqual(L.balanceReport(w).seasons,[]);assert.match(L.balanceReportText(w),/no seasons logged yet/);

const size=L.FORMATS[w.format].size,played=[],teams=w.teams.length;
for(let season=1;season<=2;season++){
 L.startSeason(w);playOut(w);played.push(gamesPlayed(w));const champion=L.worldsChampion(w),regular=regularMatches(w),titles=w.titles.filter(t=>t.season===season);
 L.startOffseason(w,roll(L.rookiePlan(w),season*977,'R'));finishMarket(w);
 const entry=w.seasonLog.at(-1);assert.equal(entry.season,season);assert.equal(entry.format,w.format);assert.equal(entry.battleMode,w.settings.battleMode);assert.equal(entry.regionSize,6);
 assert.equal(entry.teams.length,teams);assert.deepEqual(entry.teams.filter(t=>t.champion).map(t=>t.id),[champion]);assert.equal(entry.teams.find(t=>t.champion).finish.worlds,1);
 assert(entry.teams.every(t=>L.REGION_IDS.includes(t.region)&&t.roster.length&&t.roster.every(label=>/^\w+ \(\w+\) (A|S|SS|B)$/.test(label))),'Rosters list each fighter as Class (Subclass) tier.');
 assert.equal(entry.teams.reduce((n,t)=>n+t.wins+t.losses,0),regular*2,'Season records cover every regular-season match.');
 assert.equal(entry.games.length,played.at(-1),'Every split, playoff, qualifier and international game is logged.');
 assert(entry.games.every(([a,b,winner])=>a.length===4&&b.length===4&&(winner===0||winner===1)));
 const fighterGames=entry.fighters.reduce((n,f)=>n+f.games,0),fighterWins=entry.fighters.reduce((n,f)=>n+f.wins,0);
 assert.equal(fighterGames,entry.games.length*2*size,'Every starter of every game is counted.');assert.equal(fighterWins,entry.games.length*size,'One side wins each game.');
 assert(entry.fighters.every(f=>f.subclass&&f.class&&f.tier&&f.role));
 // Every region's three splits: the full table, the playoff bracket and the places, with the split title.
 assert.deepEqual(Object.keys(entry.splits),['1','2','3']);
 for(const [n,split]of Object.entries(entry.splits))for(const r of L.REGION_IDS){const s=split[r],ids=w.teams.filter(t=>t.region===r).map(t=>t.id).sort();
  assert.deepEqual(s.table.map(x=>x.id).sort(),ids,`Split ${n} ${r}: every team in the table once.`);
  assert.equal(s.table.reduce((k,x)=>k+x.wins,0),(n==='3'?2:1)*15,'A single round robin (double in Split 3).');
  const final=s.bracket.matches[finalKey(s.bracket.template)];assert.equal(final.winner,s.places[0]);assert(Object.values(s.bracket.matches).every(compactOk));
  assert.equal(titles.find(t=>t.event==='split'&&t.region===r&&String(t.split)===n)?.champion,s.places[0],'The split title goes to the playoff winner.');}
 // Points and qualifiers: every team has points, and each region sends its Worlds seeds.
 assert.equal(Object.keys(entry.points).length,teams);
 for(const r of L.REGIONS){assert(entry.worldsSeeds[r.id].length>=r.worlds);assert(entry.qualifiers[r.id]);}
 // International events: MSI and Worlds every season, First Stand from season 2; each archived game by game.
 assert.deepEqual(Object.keys(entry.events).sort(),season===1?['msi','worlds']:['first-stand','msi','worlds']);
 for(const [key,ev]of Object.entries(entry.events)){assert(ev.places.flat().length===ev.teams.length,`${key}: every entrant is placed.`);assert.equal(titles.find(t=>t.event===key).champion,ev.places[0][0]);
  for(const ph of ev.phases){const ms=ph.format==='bracket'?Object.values(ph.matches):ph.format==='swiss'?ph.rounds.flat():Object.values(ph.rounds).flat(2);assert(ms.length&&ms.every(compactOk),`${key} ${ph.key}: compact games that add up.`);}}
 const worlds=entry.events.worlds;assert.deepEqual(worlds.phases.map(p=>p.key),['play-in','swiss','knockout']);assert.equal(worlds.teams.length,19);assert.equal(worlds.phases[2].matches[finalKey('knockout8')].winner,champion);
 assert.equal(titles.length,3*L.REGION_IDS.length+(season===1?2:3),'Three split titles per region plus the season\'s international titles.');
 const past=L.pastSeason(w,season);assert.equal(past.entry,entry);assert.equal(past.titles.find(t=>t.event==='worlds').champion,champion);assert.equal(past.names[champion],L.teamById(w,champion).name);assert.equal(past.regions[champion],L.regionOfTeam(w,champion));
}
assert.deepEqual(L.pastSeasons(w),[2,1],'Finished seasons are listed newest first.');
// Beyond the log only the titles are left.
{const old=structuredClone(w);old.seasonLog=[];const p=L.pastSeason(old,1);assert.equal(p.entry,null);assert(p.titles.some(t=>t.event==='worlds'));assert.equal(L.pastSeason(old,9),null);}
// A season just crowned is read live until the offseason logs it.
{const live=structuredClone(w);L.startSeason(live);playOut(live);assert.equal(live.phase,'complete');assert.deepEqual(L.pastSeasons(live),[3,2,1]);const p=L.pastSeason(live,3);
 assert.equal(p.entry.events.worlds.phases[2].matches[finalKey('knockout8')].winner,L.worldsChampion(live));assert.equal(p.entry.teams.length,teams);}
assert.deepEqual(w.seasonLog.map(s=>s.season),[1,2]);assert.equal(w.season,3);assert.deepEqual(w.stats,{},'The season stats reset while the log keeps them.');

// The report adds the logged seasons up.
const r=L.balanceReport(w),total=w.seasonLog.reduce((n,s)=>n+s.fighters.reduce((k,f)=>k+f.games,0),0);
assert.deepEqual(r.seasons,[1,2]);assert.equal(r.games,played[0]+played[1]);
for(const key of ['subclass','class','role'])assert.equal(r[key].reduce((n,e)=>n+e.games,0),total,`${key} rows cover every fighter game`);
assert(r.subclass.every(e=>e.ci[0]<=e.pct&&e.pct<=e.ci[1]&&/^\w+ \(\w+\)$/.test(e.key)));assert(r.comp.every(e=>e.games>=10));
assert.equal(r.history.length,2);assert(r.history.every(h=>h.teams[0].champion),'Each season\'s teams start with the world champion.');
const text=L.balanceReportText(w);for(const part of ['seasons 1–2 (2)','Subclasses','Classes','Roles','Compositions','S1 ','S2 ','*'])assert(text.includes(part),`the text report has ${part}`);
assert(text.length<40000,`the text report stays short (${text.length} characters)`);

// At most SEASON_LOG_LIMIT seasons are kept, the newest last.
w.seasonLog=Array.from({length:L.SEASON_LOG_LIMIT},(_,i)=>({...w.seasonLog[0],season:-i}));L.startSeason(w);playOut(w);L.startOffseason(w,roll(L.rookiePlan(w),3*977,'R'));
assert.equal(w.seasonLog.length,L.SEASON_LOG_LIMIT);assert.equal(w.seasonLog.at(-1).season,3);

console.log(`Season log passed: 2 circuit seasons logged (${played.join(' + ')} games, ${total} fighter games) with every region's split tables, playoffs, points and qualifiers and every international event game by game, titles per split and event, live reading of a crowned season, stats survive the reset, the report adds up (${r.subclass.length} subclasses, ${text.length} characters of text), and the log keeps the last ${L.SEASON_LOG_LIMIT} seasons.`);

import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import initSqlJs from 'sql.js';import {indexedDB} from 'fake-indexeddb';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
import worker from '../dist/server/index.js';
import pagesWorker from '../_site/local-api.js';import migrations from '../_site/local-schema.js';import {createStorage} from '../_site/sqlite-store.js';

const roll=(plan,seed)=>plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`R${seed}-${i}`));
const league=(format,teams,seed)=>L.create({id:crypto.randomUUID(),format,teams,seed,fighters:roll(L.poolPlan(format,teams,seed),seed)});
const fake=(m,salt=0)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed^salt;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map((id,i)=>({id,damage:(n>>>(i%8))%500,healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
const playOut=w=>{let guard=0;while(w.phase==='season'||w.phase==='playoffs'){const [m]=L.upcoming(w,1);L.recordMatch(w,m.id,fake(m));assert(++guard<2000);}};
// Finish a draft: the user's slots take the scouts' choice, every other slot is the AI's.
const finishDraft=w=>{let guard=0;while(!w.draft.complete){const team=L.onTheClock(w);if(team&&team===w.settings.userTeam)L.draftPick(w,L.coachChoice(w,L.teamById(w,team)).id);else L.draftPicks(w,1e6);assert(++guard<1000);}};
const rookies=(w,seed=w.season*977)=>roll(L.rookiePlan(w),seed);
const legal=(w,team)=>L.payroll(w,team)<=w.settings.salaryCap+1e-9;

// Coach mode: claim before the draft, the AI stops at the user's picks, and only eligible picks are accepted.
const w=league(3,8,5150),me=w.teams[3].id;
assert.throws(()=>L.claimTeam(w,'nope'),/Unknown team/);L.claimTeam(w,me);assert.equal(w.settings.userTeam,me);
assert.throws(()=>L.setTactic(structuredClone(w),'reckless'),/Unknown tactic/);
let made=L.draftPicks(w,1e6);assert.equal(L.onTheClock(w),me,'The AI drafts up to the user’s pick.');assert.equal(made.length,L.draftSlot(w).index);
assert.throws(()=>L.draftPick(w),/on the clock/);assert.throws(()=>L.claimTeam(w,w.teams[0].id),/before the draft starts/);
const rich=L.available(w).sort((a,b)=>b.salary-a.salary)[0],{candidates}=L.eligible(w,L.teamById(w,me));
if(!candidates.some(f=>f.id===rich.id))assert.throws(()=>L.draftPick(structuredClone(w),rich.id),/salary cap|required role/);
assert.throws(()=>L.draftPick(structuredClone(w),L.teamById(w,w.teams[0].id).roster[0]),/not available/);
const choice=candidates.at(-1);L.draftPick(w,choice.id);assert.equal(w.fighters[choice.id].team,me);
if(!w.draft.complete&&L.onTheClock(w)!==me)assert.throws(()=>L.draftPick(structuredClone(w),L.available(w)[0].id),/not your pick/);
finishDraft(w);const mine=L.teamById(w,me);assert.equal(w.phase,'ready');assert.equal(mine.roster.length,5);

// Lineups and tactics: validated, then carried into every match description and simulation.
for(const bad of [[],mine.roster.slice(0,2),[mine.roster[0],mine.roster[0],mine.roster[1]],[...mine.roster.slice(0,2),w.teams[0].roster[0]]])assert.throws(()=>L.setLineup(w,bad),/Choose 3/);
const bench=mine.roster.filter(id=>!mine.lineup.includes(id)),custom=[bench[0],...mine.lineup.slice(0,2)];L.setLineup(w,custom);L.setTactic(w,'focus-healer');
L.startSeason(w);const myGame=L.upcoming(w).find(m=>m.home===me||m.away===me),side=myGame.home===me?0:1;
assert.deepEqual(myGame.lineups[side],custom);assert.equal(myGame.tactics[side],'focus-healer');
const rival=L.teamById(w,myGame.home===me?myGame.away:myGame.home);assert.equal(myGame.tactics[1-side],L.COACH_TACTICS[rival.coach.personality],'AI coaches play their personality’s tactic.');
assert.throws(()=>L.claimTeam(structuredClone(w),w.teams[0].id),/between seasons/);
playOut(w);assert.equal(w.phase,'complete');assert.throws(()=>L.setLineup(structuredClone(w),custom),/once the roster/);

// The offseason: rookie class validation, value updates, repriced contracts, a new cap.
const plan=L.rookiePlan(w);assert.equal(plan.length,8*L.ROOKIES_PER_TEAM[3]);assert.deepEqual(plan,L.rookiePlan(structuredClone(w)));
const klass=rookies(w);assert.throws(()=>L.startOffseason(structuredClone(w),klass.slice(1)),/must hold/);
assert.throws(()=>L.startOffseason(structuredClone(w),klass.map((f,i)=>i?f:{...f,summary:{...f.summary,tier:f.summary.tier==='A'?'S':'A'}})),/planned tier/);
assert.throws(()=>L.startOffseason(structuredClone(w),klass.map((f,i)=>i?f:{...f,id:mine.roster[0]})),/Invalid rookie/);
const before=structuredClone(w),twin=structuredClone(w);L.startOffseason(w,klass);L.startOffseason(twin,klass);assert.deepEqual(w,twin,'The offseason is deterministic.');
assert.equal(w.phase,'offseason');assert.equal(w.offseason.step,'decisions','A coached league stops for the user’s decisions.');assert.equal(w.history.length,1);
for(const f of Object.values(w.fighters))assert.equal(f.salary,L.salaryFor(f.ovr),'Every contract is repriced.');
assert(w.offseason.ratingChanges.length>Object.keys(before.fighters).length/3,'Ratings move.');
for(const c of w.offseason.ratingChanges){assert(Math.abs(c.to-c.from)<=L.RATING_CHANGE_CAP,`A rating moves at most ±${L.RATING_CHANGE_CAP}: ${c.from} → ${c.to}`);if(c.to>90&&c.to>c.from)assert(c.to-Math.max(90,c.from)<=3,'Gains above 90 are halved.');}
assert(w.offseason.ratingChanges.some(c=>Math.abs(c.to-c.from)>=3),'Standout seasons still move ratings noticeably.');
// Fighters who outperform their role rise more than those who underperform.
const perGame=Object.entries(before.stats).filter(([,s])=>s.games).map(([id,s])=>({id,role:before.fighters[id].role,v:L.impact(s)/s.games}));
const z=perGame.map(x=>{const same=perGame.filter(y=>y.role===x.role),mean=same.reduce((n,y)=>n+y.v,0)/same.length;return {...x,rel:x.v-mean,d:(w.fighters[x.id]?.ovr??before.fighters[x.id].ovr)-before.fighters[x.id].ovr};}).sort((a,b)=>b.rel-a.rel);
const avg=list=>list.reduce((n,x)=>n+x.d,0)/list.length,q=Math.floor(z.length/4);assert(avg(z.slice(0,q))>avg(z.slice(-q))+2,`Performance drives the value update (${avg(z.slice(0,q)).toFixed(2)} vs ${avg(z.slice(-q)).toFixed(2)}).`);
const top=Object.values(w.fighters).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,8*5);assert.equal(w.settings.salaryCap,Math.round(top.reduce((n,x)=>n+x.salary,0)/8*10)/10,'The cap follows the market.');
for(const c of klass){assert.equal(w.fighters[c.id].team,null);assert.equal(w.fighters[c.id].rookie,2);}
for(const team of w.teams)if(team.id!==me)assert(legal(w,team),`${team.name} released down to the cap`);
assert.equal(w.offseason.releases[me],undefined,'The user’s roster is untouched until they decide.');
assert(Object.values(w.offseason.releases).flat().length>=1,'AI coaches let some fighters go.');
for(const t of before.teams.filter(t=>t.id!==me)){const r=w.history[0].standings.find(x=>x.id===t.id),fired=w.offseason.fired.some(f=>f.team===t.id);assert.equal(fired,r.wins/(r.wins+r.losses)<=.25,'Coaches are fired after a dismal season, and only then.');}
for(const id of before.teams.find(t=>t.id===me).roster)assert.equal(w.fighters[id].team,me);
// Keep or release.
assert.throws(()=>L.decideReleases(structuredClone(w),[w.teams[0].roster[0]]),/your roster/);
const tight=structuredClone(w);tight.settings.salaryCap=1;assert.throws(()=>L.decideReleases(tight,[]),/over the cap/);
assert.throws(()=>L.proposeTrade(structuredClone(w),w.teams[0].id,[mine.roster[0]],[w.teams[0].roster[0]]),/trade window/);
assert.throws(()=>L.claimTeam(structuredClone(w),null),/offseason decisions/);
const cut=L.teamById(w,me).roster.map(id=>w.fighters[id]).sort((a,b)=>a.ovr-b.ovr)[0].id;L.decideReleases(w,[cut]);
assert.equal(w.offseason.step,'market');assert.equal(w.fighters[cut].team,null);assert.equal(w.fighters[cut].freeAgentSince,1);
for(const t of w.offseason.trades){assert.equal(t.sent[0].length,1);for(const id of t.teams)assert(legal(w,L.teamById(w,id)),'AI trades stay cap-legal.');assert(!t.teams.includes(me));}
// User trades: shape checks, AI coaches accept only deals that help them.
const partner=w.teams.find(t=>t.id!==me);
assert.throws(()=>L.proposeTrade(structuredClone(w),me,[L.teamById(w,me).roster[0]],[L.teamById(w,me).roster[1]]),/another team/);
assert.throws(()=>L.proposeTrade(structuredClone(w),partner.id,L.teamById(w,me).roster.slice(0,2),partner.roster.slice(0,1)),/same number/);
assert.throws(()=>L.proposeTrade(structuredClone(w),partner.id,L.teamById(w,me).roster.slice(0,3),partner.roster.slice(0,3)),/same number/);
let accepted=null,rejected=0;
for(const t of w.teams.filter(t=>t.id!==me))for(const give of L.teamById(w,me).roster)for(const get of t.roster){const probe=structuredClone(w);try{L.proposeTrade(probe,t.id,[give],[get]);accepted??={probe,t:t.id,give,get};}catch(e){assert.match(e.message,/turns it down|over the cap/);rejected++;}}
assert(accepted&&rejected,'Some offers are accepted and some turned down.');
L.proposeTrade(w,accepted.t,[accepted.give],[accepted.get]);assert.equal(w.fighters[accepted.get].team,me);assert.equal(w.fighters[accepted.give].team,accepted.t);assert(w.offseason.trades.at(-1).user);
// The draft: worst teams first, the champion last; rookies and free agents fill the open spots.
L.closeMarket(w);assert.equal(w.offseason.step,'draft');const order=L.offseasonOrder(w);assert.equal(order.at(-1),w.playoffs.champion);
const seeded=new Set(Object.values(w.playoffs.seeds).flat()),missed=w.history[0].standings.filter(r=>!seeded.has(r.id));assert.equal(order[0],missed.at(-1).id,'The worst non-playoff team picks first.');
const firstRound=w.draft.slots.filter(s=>s.round===1).map(s=>s.team);assert.deepEqual(firstRound,order.filter(id=>firstRound.includes(id)));
assert.equal(L.totalPicks(w),w.teams.reduce((n,t)=>n+5-t.roster.length,0));
finishDraft(w);assert.equal(w.phase,'ready');assert.equal(w.season,2);assert.equal(w.offseason,null);assert(w.lastOffseason.trades.length>=1);
assert.deepEqual([w.schedule,w.playoffs,w.results],[null,null,[]]);
for(const team of w.teams){assert.equal(team.roster.length,5);assert.equal(team.lineup.length,3);assert(team.lineup.every(id=>team.roster.includes(id)));}
assert.equal(L.teamById(w,me).tactic,'focus-healer','The user’s tactic carries over.');
// Season two runs and its offseason retires long-unsigned free agents (MVPs excepted).
L.startSeason(w);playOut(w);const protectedIds=new Set(w.titles.map(t=>t.mvp));L.startOffseason(w,rookies(w));
for(const f of Object.values(w.fighters))if(!f.team&&!protectedIds.has(f.id))assert(f.freeAgentSince>=2,'Free agents unsigned for two offseasons retire.');
assert(w.offseason.retired>0);L.decideReleases(w,[]);L.closeMarket(w);finishDraft(w);assert.equal(w.season,3);
assert(JSON.stringify(w).length<1500000);

// Metas: if lineups with more healers keep winning, coaches lean towards healers; tacticians fast, fortress builders barely.
const meta=league(3,8,6060);L.draftPicks(meta,1e6);L.startSeason(meta);
const rigged=m=>{const healers=m.lineups.map(ids=>ids.filter(id=>meta.fighters[id].role==='healer').length),side=healers[0]!==healers[1]?(healers[0]>healers[1]?0:1):m.seed%2;return fake(m).slice(0,Math.ceil(m.bestOf/2)).map(g=>({...g,winnerTeam:side,hp:side?[0,50]:[50,0]}));};
let metaGuard=0;while(meta.phase==='season'||meta.phase==='playoffs'){const [m]=L.upcoming(meta,1);L.recordMatch(meta,m.id,rigged(m));assert(++metaGuard<500);}
const report=L.seasonMeta(meta);assert(report.edge.healer>.2,`Healer-heavy lineups won (edge ${report.edge.healer})`);assert.equal(report.shift.role,'healer');assert(report.top.length>0);
const adapted=structuredClone(meta),[tact,fort]=adapted.teams;tact.coach.personality='tactician';fort.coach.personality='fortress';tact.coach.comp={tank:1,healer:1,controller:1,damage:1};fort.coach.comp={...tact.coach.comp};
L.adaptCoaches(adapted,report);assert(tact.coach.comp.healer>fort.coach.comp.healer&&fort.coach.comp.healer>1,'Tacticians copy the meta faster than fortress builders, but both move.');
L.startOffseason(meta,rookies(meta,6161));assert.equal(meta.offseason.meta.shift.role,'healer','The offseason report names the season’s meta.');

// Spectator leagues run the whole offseason without stopping, for every format and size.
const churn=[];
for(const [format,teams]of [[5,32],[3,16]]){
 const s=league(format,teams,teams*31+format);L.draftPicks(s,1e6);
 for(let season=1;season<=2;season++){L.startSeason(s);playOut(s);L.startOffseason(s,rookies(s,season*31+teams));assert.equal(s.offseason.step,'draft','No user, no stops before the draft.');
  L.draftPicks(s,1e6);assert.equal(s.phase,'ready');for(const team of s.teams){assert.equal(team.roster.length,L.FORMATS[format].rosterSize);assert(legal(s,team)||s.draft.picks.some(p=>p.team===team.id&&p.exception),`${team.name} is cap-legal`);}
  churn.push(`${format}v${format}×${teams}: ${Object.values(s.lastOffseason.releases).flat().length} released, ${s.lastOffseason.trades.length} trades, ${s.lastOffseason.fired.length} fired`);}
 assert(JSON.stringify(s).length<1500000);
}

// Server: coach commands and the offseason through the API, then the same commands in browser storage.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const server=async body=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams',{method:'POST',headers:{'oai-authenticated-user-id':'coach','content-type':'application/json'},body:JSON.stringify(body)}),env);return {status:r.status,...await r.json()};};
const pages=createStorage({SQL:await initSqlJs(),migrations,worker:pagesWorker,indexedDB,databaseName:'team-offseason-pages'});
const local=async body=>{const r=await pages.fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
const wire=f=>({id:f.id,name:f.name,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}});
for(const [label,send]of [['server',server],['pages',local]]){
 let world=null,revision=0;const call=async body=>{const r=await send({format:3,revision,operationId:crypto.randomUUID(),...body});if(r.status===200)({world,revision}=r);return r;};
 const ok=async body=>{const r=await call(body);assert.equal(r.status,200,`${label} ${body.action}: ${r.error}`);return r;};
 const seed=777;await ok({action:'start',worldId:crypto.randomUUID(),teams:8,seed,fighters:roll(L.poolPlan(3,8,seed),seed).map(wire)});
 const coached=world.teams[5].id;await ok({action:'claim',team:coached});
 assert.equal((await call({action:'claim',team:'missing'})).status,400);
 await ok({action:'draft',count:1000});assert.equal(L.onTheClock(world),coached,`${label}: the server AI stops at the user’s pick`);
 assert.equal((await call({action:'pick',fighter:'00000000-0000-4000-8000-000000000000'})).status,400);
 while(!world.draft.complete){if(L.onTheClock(world)===coached)await ok({action:'pick',fighter:L.coachChoice(world,L.teamById(world,coached)).id});else await ok({action:'draft',count:1000});}
 const team=L.teamById(world,coached),lineup=[...team.roster].reverse().slice(0,3);
 assert.equal((await call({action:'lineup',lineup:lineup.slice(0,2)})).status,400);await ok({action:'lineup',lineup});await ok({action:'tactic',tactic:'defensive'});
 assert.equal((await call({action:'tactic',tactic:'chaos'})).status,400);
 await ok({action:'startSeason'});assert.deepEqual(L.teamById(world,coached).lineup,lineup);
 while(world.phase!=='complete'){const matches=L.upcoming(world,world.phase==='season'?4:Infinity);assert(matches.every(m=>[m.home,m.away].includes(coached)?m.tactics[m.home===coached?0:1]==='defensive':true));await ok({action:'record',results:matches.map(m=>({matchId:m.id,games:fake(m)}))});}
 const klass=roll(L.rookiePlan(world),4040);
 const forged=klass.map(wire);forged[0]={...forged[0],traits:{...forged[0].traits,race:'Not a race'}};assert.equal((await call({action:'offseason',rookies:forged})).status,400,`${label}: rookies must be canonical rolls`);
 await ok({action:'offseason',rookies:klass.map(wire)});assert.equal(world.offseason.step,'decisions');
 assert.equal((await call({action:'trade',partner:world.teams[0].id,give:[team.roster[0]],get:[world.teams[0].roster[0]]})).status,400,'Trades wait for keep-or-release.');
 await ok({action:'decide',release:[]});assert.equal(world.offseason.step,'market');
 await ok({action:'closeMarket'});
 while(world.phase==='offseason'){if(L.onTheClock(world)===coached)await ok({action:'pick',fighter:L.coachChoice(world,L.teamById(world,coached)).id});else await ok({action:'draft',count:1000});}
 assert.equal(world.season,2);assert.equal(world.phase,'ready');assert(world.teams.every(t=>t.roster.length===5));
 await ok({action:'claim',team:null});assert.equal(world.settings.userTeam,null);
}
console.log(`Team offseason passed: coach claims, user draft picks under the cap reserve, lineups and tactics into every match, deterministic value updates driven by performance, repriced contracts and a market cap, keep-or-release, AI and user trades, reverse-order rookie drafts, coach firings, free-agent retirement, three-season rollovers, server and browser-storage commands. ${churn.join('; ')}.`);

import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import initSqlJs from 'sql.js';import {indexedDB} from 'fake-indexeddb';
import {roll,circuit} from './circuit-fixtures.mjs';
import * as L from '../public/team-league.js';
import worker from '../dist/server/index.js';
import pagesWorker from '../_site/local-api.js';import migrations from '../_site/local-schema.js';import {createStorage} from '../_site/sqlite-store.js';

const league=(format,regionSize,seed)=>circuit({format,regionSize,seed});
const fake=(m,salt=0)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed^salt;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],balanceId:m.balance?.id,combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map((id,i)=>({id,damage:(n>>>(i%8))%500,healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
const playOut=(w,series=(w2,m)=>fake(m))=>{let guard=0;while(w.phase==='season'){if(w.awaiting){L.advance(w);continue;}for(const m of L.upcoming(w))L.recordMatch(w,m.id,series(w,m));assert(++guard<3000);}};
// The user's bids for the round: the best free agents they can afford, at their market value, one per open spot.
const userBids=w=>{const team=L.teamById(w,w.settings.userTeam),open=w.settings.rosterSize-team.roster.length;for(const f of L.signable(w,team).sort((a,b)=>b.ovr-a.ovr||(a.id<b.id?-1:1))){if((w.market.offers??[]).length>=open)break;try{L.makeOffer(w,f.id,f.salary,2);}catch{}}};
// Finish free agency: the user bids each round, every other team is the AI's.
const finishDraft=w=>{let guard=0;while(L.marketOpen(w)){if(w.settings.userTeam)userBids(w);L.marketRounds(w,1e6);assert(++guard<100);}};
const rookies=(w,seed=w.season*977)=>roll(L.rookiePlan(w),seed);
const legal=(w,team)=>L.payroll(w,team)<=L.capOf(w,team)+1e-9;

// Coach mode: claim before the auction; rounds stop for the user's bids; offers are validated against the roster and cap.
const w=league(3,6,5150),me=w.teams[3].id;
assert.throws(()=>L.claimTeam(w,'nope'),/Unknown team/);L.claimTeam(w,me);assert.equal(w.settings.userTeam,me);
assert.throws(()=>L.setTactic(structuredClone(w),'reckless'),/Unknown tactic/);
let ran=L.marketRounds(w,1e6);assert.equal(ran,1,'The auction stops after each round while the user has open spots.');assert.equal(L.teamById(w,me).roster.length,0,'The user signs nobody without offers.');
assert.throws(()=>L.claimTeam(w,w.teams[0].id),/before free agency starts/);
const pool0=L.signable(w,L.teamById(w,me)).sort((a,b)=>b.ovr-a.ovr);
assert.throws(()=>L.makeOffer(structuredClone(w),w.teams[0].roster[0]??'x',5,2),/not a free agent/);
assert.throws(()=>L.makeOffer(structuredClone(w),pool0[0].id,5,9),/1 to 3 seasons/);assert.throws(()=>L.makeOffer(structuredClone(w),pool0[0].id,-1,2),/salary/);
assert.throws(()=>{const t=structuredClone(w);for(const f of pool0.slice(0,6))L.makeOffer(t,f.id,.8,1);},/more offers than open roster spots/);
assert.throws(()=>L.makeOffer(structuredClone(w),pool0[0].id,L.capOf(w,L.teamById(w,me)),2),/no room under the cap/);
{const t=structuredClone(w);L.makeOffer(t,pool0[0].id,pool0[0].salary,2);L.makeOffer(t,pool0[0].id,pool0[0].salary*1.1,3);assert.equal(t.market.offers.length,1,'A new offer to the same fighter replaces the old one.');L.withdrawOffer(t,pool0[0].id);assert.equal(t.market.offers.length,0);}
// A generous offer to the best free agent wins him: money talks.
{const t=structuredClone(w),star=L.signable(t,L.teamById(t,me)).sort((a,b)=>b.ovr-a.ovr)[0];L.makeOffer(t,star.id,Math.min(star.salary*1.6,L.capSpace(t,L.teamById(t,me))-L.reserveRoom(t,L.teamById(t,me),4,new Set([star.id]))),L.wantedYears(t,star));L.marketRounds(t,1);assert.equal(t.fighters[star.id].team,me,'A big enough offer signs a star.');assert(t.market.results.some(r=>r.fighter===star.id&&r.signed===me));}
finishDraft(w);const mine=L.teamById(w,me);assert.equal(w.phase,'ready');assert.equal(mine.roster.length,5);for(const id of mine.roster)assert(w.fighters[id].contract.until>=1);

// Lineups and tactics: validated, then carried into every match description and simulation.
for(const bad of [[],mine.roster.slice(0,2),[mine.roster[0],mine.roster[0],mine.roster[1]],[...mine.roster.slice(0,2),w.teams[0].roster[0]]])assert.throws(()=>L.setLineup(w,bad),/Choose 3/);
const bench=mine.roster.filter(id=>!mine.lineup.includes(id)),custom=[bench[0],...mine.lineup.slice(0,2)];L.setLineup(w,custom);L.setTactic(w,'focus-healer');
L.startSeason(w);const myGame=L.upcoming(w).find(m=>m.home===me||m.away===me),side=myGame.home===me?0:1;
assert.deepEqual(myGame.lineups[side],custom);assert.equal(myGame.tactics[side],'focus-healer');
const rival=L.teamById(w,myGame.home===me?myGame.away:myGame.home);assert.equal(myGame.tactics[1-side],L.COACH_TACTICS[rival.coach.personality],'AI coaches play their personality’s tactic.');
assert.throws(()=>L.claimTeam(structuredClone(w),w.teams[0].id),/between seasons/);
playOut(w);assert.equal(w.phase,'complete');assert.throws(()=>L.setLineup(structuredClone(w),custom),/once the roster/);

// The offseason: rookie class validation, value updates, repriced contracts, a new cap.
const plan=L.rookiePlan(w);assert.equal(plan.length,36*L.ROOKIES_PER_TEAM[3]);assert(plan.every(s=>L.REGION_IDS.includes(s.region)));for(const r of L.REGION_IDS)assert.equal(plan.filter(s=>s.region===r).length,6*L.ROOKIES_PER_TEAM[3],'Each region drafts its own class.');assert.deepEqual(plan,L.rookiePlan(structuredClone(w)));
const klass=rookies(w);assert.throws(()=>L.startOffseason(structuredClone(w),klass.slice(1)),/must hold/);
assert.throws(()=>L.startOffseason(structuredClone(w),klass.map((f,i)=>i?f:{...f,summary:{...f.summary,tier:f.summary.tier==='A'?'S':'A'}})),/planned tier/);
assert.throws(()=>L.startOffseason(structuredClone(w),klass.map((f,i)=>i?f:{...f,id:mine.roster[0]})),/Invalid rookie/);
const before=structuredClone(w),twin=structuredClone(w);L.startOffseason(w,klass);L.startOffseason(twin,klass);assert.deepEqual(w,twin,'The offseason is deterministic.');
assert.equal(w.phase,'offseason');assert.equal(w.offseason.step,'resign','A coached league stops for the user’s re-signing decisions.');assert.equal(w.history.length,1);
for(const f of Object.values(w.fighters)){assert.equal(f.salary,L.salaryFor(f.ovr),'Market values are repriced.');if(f.team&&before.fighters[f.id]?.contract&&before.fighters[f.id].contract.until>1)assert.deepEqual(f.contract,before.fighters[f.id].contract,'Contracts keep their salary and length.');}
// Contracts that ended: AI teams re-signed some and others left; the user's wait for their decisions.
for(const r of w.offseason.resigned){const f=w.fighters[r.id];assert.equal(f.team,r.team);assert.equal(f.contract.signed,2);assert(f.contract.until>=2);}
for(const d of w.offseason.departed)assert.equal(w.fighters[d.id]?.team??null,null,'Departed fighters are free agents.');
const myExpiring=w.offseason.expiring;for(const e of myExpiring){assert.equal(w.fighters[e.id].team,me);assert(['stay','market'].includes(e.stance));assert.equal(e.ask.salary,w.fighters[e.id].salary);}
for(const f of Object.values(w.fighters))if(f.team&&f.team!==me)assert(f.contract.until>=2,'No AI roster keeps an expired contract.');
assert(w.offseason.ratingChanges.length>Object.keys(before.fighters).length/3,'Ratings move.');
for(const c of w.offseason.ratingChanges){assert(Math.abs(c.to-c.from)<=L.RATING_CHANGE_CAP,`A rating moves at most ±${L.RATING_CHANGE_CAP}: ${c.from} → ${c.to}`);if(c.to>90&&c.to>c.from)assert(c.to-Math.max(90,c.from)<=3,'Gains above 90 are halved.');}
assert(w.offseason.ratingChanges.some(c=>Math.abs(c.to-c.from)>=3),'Standout seasons still move ratings noticeably.');
// Fighters who outperform their role rise more than those who underperform.
const perGame=Object.entries(before.stats).filter(([,s])=>s.games).map(([id,s])=>({id,role:before.fighters[id].role,v:L.impact(s)/s.games}));
const z=perGame.map(x=>{const same=perGame.filter(y=>y.role===x.role),mean=same.reduce((n,y)=>n+y.v,0)/same.length;return {...x,rel:x.v-mean,d:(w.fighters[x.id]?.ovr??before.fighters[x.id].ovr)-before.fighters[x.id].ovr};}).sort((a,b)=>b.rel-a.rel);
const avg=list=>list.reduce((n,x)=>n+x.d,0)/list.length,q=Math.floor(z.length/4);assert(avg(z.slice(0,q))>avg(z.slice(-q))+2,`Performance drives the value update (${avg(z.slice(0,q)).toFixed(2)} vs ${avg(z.slice(-q)).toFixed(2)}).`);
const top=Object.values(w.fighters).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,36*5);assert.equal(w.settings.salaryCap,Math.round(top.reduce((n,x)=>n+x.salary,0)/36*10)/10,'The cap follows the market.');
klass.forEach((c,i)=>{const f=w.fighters[c.id];assert.equal(f.team,null);assert.equal(f.rookie,2);assert.equal(f.region,plan[i].region);assert.equal(f.locked,true,'Rookies sign only in their home region.');});
for(const team of w.teams)if(team.id!==me)assert(legal(w,team),`${team.name} released down to the cap`);
assert.equal(w.offseason.releases[me],undefined,'The user’s roster is untouched until they decide.');
assert(Object.values(w.offseason.releases).flat().length+w.offseason.departed.length>=1,'AI teams let some fighters go.');
for(const t of before.teams.filter(t=>t.id!==me)){const r=w.history[0].standings.find(x=>x.id===t.id),fired=w.offseason.fired.some(f=>f.team===t.id);assert.equal(fired,r.wins/(r.wins+r.losses)<=.25,'Coaches are fired after a dismal season, and only then.');}
for(const id of before.teams.find(t=>t.id===me).roster)if(w.fighters[id])assert.equal(w.fighters[id].team,me);
// Re-sign or release. Give the user one willing and one unwilling expiring fighter to decide on.
{const team=L.teamById(w,me),under=team.roster.filter(id=>!myExpiring.some(e=>e.id===id));
 if(myExpiring.length<2){for(const id of team.roster.filter(id=>!myExpiring.some(e=>e.id===id)).slice(0,2-myExpiring.length)){w.fighters[id].contract.until=1;myExpiring.push({id,stance:'stay',ask:{salary:w.fighters[id].salary,years:2}});}}
 myExpiring[0].stance='stay';myExpiring[1].stance='market';}
assert.throws(()=>L.decideOffseason(structuredClone(w),{release:[w.teams[0].roster[0]]}),/fighters under contract on your roster/);
assert.throws(()=>L.decideOffseason(structuredClone(w),{resign:[{fighter:w.teams[0].roster[0],salary:5,years:2}]}),/your expiring fighters/);
assert.throws(()=>L.decideOffseason(structuredClone(w),{resign:[{fighter:myExpiring[0].id,salary:5,years:7}]}),/1 to 3 seasons/);
const tight=structuredClone(w);tight.settings.salaryCap=1;const untouched=structuredClone(tight);assert.throws(()=>L.decideOffseason(tight,{}),/over the cap/);assert.deepEqual(tight,untouched,'A refused plan leaves the league untouched.');
assert.throws(()=>L.proposeTrade(structuredClone(w),w.teams[0].id,[mine.roster[0]],[w.teams[0].roster[0]]),/trade window/);
assert.throws(()=>L.claimTeam(structuredClone(w),null),/offseason decisions/);
{const cheap=structuredClone(w),low=myExpiring[0];L.decideOffseason(cheap,{resign:[{fighter:low.id,salary:cheap.fighters[low.id].salary*.5,years:2}]});assert.equal(cheap.fighters[low.id].team,null,'An offer below his ask is turned down.');}
const keep=myExpiring[0],gone=myExpiring[1],cut=L.teamById(w,me).roster.filter(id=>!myExpiring.some(e=>e.id===id)).map(id=>w.fighters[id]).sort((a,b)=>a.ovr-b.ovr)[0].id;
L.decideOffseason(w,{resign:[{fighter:keep.id,salary:w.fighters[keep.id].salary,years:3},{fighter:gone.id,salary:w.fighters[gone.id].salary*2,years:2}],release:[cut]});
assert.deepEqual([w.fighters[keep.id].team,w.fighters[keep.id].contract.until,w.fighters[keep.id].contract.years],[me,4,3],'A willing fighter re-signs at his ask.');
assert.equal(w.fighters[gone.id].team,null,'A fighter who wants to test the market leaves, whatever the offer.');assert.equal(w.fighters[gone.id].lastTeam,me);
assert(w.offseason.resigned.some(r=>r.id===keep.id&&r.team===me)&&w.offseason.departed.some(d=>d.id===gone.id&&d.team===me),'The coach\'s re-signings and departures count in the offseason report.');
assert.equal(w.offseason.step,'trades');assert.equal(w.fighters[cut].team,null);assert.equal(w.fighters[cut].contract,null);assert.equal(w.fighters[cut].freeAgentSince,1);
for(const t of w.offseason.trades){assert.equal(t.sent[0].length,1);for(const id of t.teams)assert(legal(w,L.teamById(w,id)),'AI trades stay cap-legal.');assert(!t.teams.includes(me));}
// User trades: shape checks, AI coaches accept only deals that help them.
const partner=L.regionTeams(w,L.teamById(w,me).region).find(t=>t.id!==me),abroad=w.teams.find(t=>t.region!==L.teamById(w,me).region);
assert.throws(()=>L.proposeTrade(structuredClone(w),abroad.id,[L.teamById(w,me).roster[0]],[abroad.roster[0]]),/within your region/);
assert.throws(()=>L.proposeTrade(structuredClone(w),me,[L.teamById(w,me).roster[0]],[L.teamById(w,me).roster[1]]),/another team/);
assert.throws(()=>L.proposeTrade(structuredClone(w),partner.id,L.teamById(w,me).roster.slice(0,2),partner.roster.slice(0,1)),/same number/);
assert.throws(()=>L.proposeTrade(structuredClone(w),partner.id,L.teamById(w,me).roster.slice(0,3),partner.roster.slice(0,3)),/same number/);
let accepted=null,rejected=0;
for(const t of L.regionTeams(w,L.teamById(w,me).region).filter(t=>t.id!==me))for(const give of L.teamById(w,me).roster)for(const get of t.roster){const probe=structuredClone(w);try{L.proposeTrade(probe,t.id,[give],[get]);accepted??={probe,t:t.id,give,get};}catch(e){assert.match(e.message,/turns it down|over the cap/);rejected++;}}
assert(accepted&&rejected,'Some offers are accepted and some turned down.');
L.proposeTrade(w,accepted.t,[accepted.give],[accepted.get]);assert.equal(w.fighters[accepted.get].team,me);assert.equal(w.fighters[accepted.give].team,accepted.t);assert(w.offseason.trades.at(-1).user);
// Free agency: rookies, departures and releases sign with the teams that bid; open spots fill.
L.closeTrades(w);assert.equal(w.offseason.step,'freeAgency');assert.equal(w.market.kind,'offseason');assert.equal(w.market.round,0);
finishDraft(w);assert.equal(w.phase,'ready');assert.equal(w.season,2);assert.equal(w.offseason,null);assert(w.lastOffseason.trades.length>=1);assert(w.lastOffseason.signings.length>=1);
for(const l of w.lastOffseason.signings){const f=w.fighters[l.fighter];assert.equal(f.contract.signed,2);assert.equal(f.contract.until,1+l.years);}
for(const f of Object.values(w.fighters))if(f.team)assert(f.contract&&f.contract.until>=2,'Every rostered fighter is under contract for the new season.');
assert.deepEqual([w.year,w.calendar],[null,null]);
for(const team of w.teams){assert.equal(team.roster.length,5);assert.equal(team.lineup.length,3);assert(team.lineup.every(id=>team.roster.includes(id)));}
assert.equal(L.teamById(w,me).tactic,'focus-healer','The user’s tactic carries over.');
// Season two runs and its offseason retires long-unsigned free agents (MVPs excepted).
L.startSeason(w);playOut(w);const protectedIds=new Set((w.awards??[]).map(a=>a.mvp));L.startOffseason(w,rookies(w));
for(const f of Object.values(w.fighters))if(!f.team&&!protectedIds.has(f.id))assert(f.freeAgentSince>=2,'Free agents unsigned for two offseasons retire.');
assert(w.offseason.retired>0);L.decideOffseason(w,{});L.closeTrades(w);finishDraft(w);assert.equal(w.season,3);
assert(JSON.stringify(w).length<1500000);

// Metas: if lineups with more healers keep winning, coaches lean towards healers; tacticians fast, fortress builders barely.
const meta=league(3,6,6060);L.marketRounds(meta,1e6);L.startSeason(meta);
const rigged=m=>{const healers=m.lineups.map(ids=>ids.filter(id=>meta.fighters[id].role==='healer').length),side=healers[0]!==healers[1]?(healers[0]>healers[1]?0:1):m.seed%2;return fake(m).slice(0,Math.ceil(m.bestOf/2)).map(g=>({...g,winnerTeam:side,hp:side?[0,50]:[50,0]}));};
playOut(meta,(w2,m)=>rigged(m));
const report=L.seasonMeta(meta);assert(report.edge.healer>.2,`Healer-heavy lineups won (edge ${report.edge.healer})`);assert.equal(report.shift.role,'healer');assert(report.top.length>0);
const adapted=structuredClone(meta),[tact,fort]=adapted.teams;tact.coach.personality='tactician';fort.coach.personality='fortress';tact.coach.comp={tank:1,healer:1,controller:1,damage:1};fort.coach.comp={...tact.coach.comp};
L.adaptCoaches(adapted,report);assert(tact.coach.comp.healer>fort.coach.comp.healer&&fort.coach.comp.healer>1,'Tacticians copy the meta faster than fortress builders, but both move.');
L.startOffseason(meta,rookies(meta,6161));assert.equal(meta.lastOffseason.meta.shift.role,'healer','The offseason report names the season’s meta.');

// Spectator leagues run the whole offseason without stopping, for every format and size.
const churn=[];
for(const [format,teams]of [[5,8],[3,6]]){
 const s=league(format,teams,teams*31+format);L.marketRounds(s,1e6);
 for(let season=1;season<=2;season++){L.startSeason(s);playOut(s);L.startOffseason(s,rookies(s,season*31+teams));assert.equal(s.phase,'ready','No user, no stops: the offseason and free agency play out at once.');
  for(const team of s.teams){assert.equal(team.roster.length,L.FORMATS[format].rosterSize);assert(legal(s,team)||s.market.log.some(l=>l.team===team.id&&l.exception),`${team.name} is cap-legal`);}
  const o=s.lastOffseason;churn.push(`${format}v${format}×${teams}: ${o.resigned.length} re-signed, ${o.departed.length} left, ${o.signings.filter(l=>l.from).length} changed teams, ${Object.values(o.releases).flat().length} released, ${o.trades.length} trades, ${o.fired.length} fired`);}
 assert(JSON.stringify(s).length<1500000);
}

// Server: coach commands and the offseason through the API, then the same commands in browser storage.
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const server=async body=>{const r=await worker.fetch(new Request('https://fateforge.test/api/teams',{method:'POST',headers:{'oai-authenticated-user-id':'coach','content-type':'application/json'},body:JSON.stringify(body)}),env);return {status:r.status,...await r.json()};};
const pages=createStorage({SQL:await initSqlJs(),migrations,worker:pagesWorker,indexedDB,databaseName:'team-offseason-pages'});
const local=async body=>{const r=await pages.fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
const wire=f=>({id:f.id,name:f.name,teamKit:f.teamKit,traits:f.traits,summary:{generationVersion:f.summary.generationVersion,wheelRarity:f.summary.wheelRarity}});
for(const [label,send]of [['server',server],['pages',local]]){
 let world=null,revision=0;const call=async body=>{const r=await send({format:3,revision,operationId:crypto.randomUUID(),...body});if(r.status===200)({world,revision}=r);return r;};
 const ok=async body=>{const r=await call(body);assert.equal(r.status,200,`${label} ${body.action}: ${r.error}`);return r;};
 const seed=777;await ok({action:'start',worldId:crypto.randomUUID(),regionSize:6,seed,fighters:roll(L.poolPlan(3,6,seed),seed).map(wire)});
 const coached=world.teams[5].id;await ok({action:'claim',team:coached});
 assert.equal((await call({action:'claim',team:'missing'})).status,400);
 await ok({action:'market',count:100});assert.equal(world.market.round,1,`${label}: the server stops after each round for the user’s bids`);
 assert.equal((await call({action:'offer',fighter:'00000000-0000-4000-8000-000000000000',salary:2,years:2})).status,400);
 const marketBids=async()=>{const t=L.teamById(world,coached),open=world.settings.rosterSize-t.roster.length;for(const f of L.signable(world,t).sort((a,b)=>b.ovr-a.ovr||(a.id<b.id?-1:1))){if((world.market.offers??[]).length>=open)break;const probe=structuredClone(world);try{L.makeOffer(probe,f.id,f.salary,2);}catch{continue;}await ok({action:'offer',fighter:f.id,salary:f.salary,years:2});}};
 while(L.marketOpen(world)){await marketBids();if(world.market.offers.length){await ok({action:'withdraw',fighter:world.market.offers[0].fighter});await marketBids();}await ok({action:'market',count:100});}
 const team=L.teamById(world,coached),lineup=[...team.roster].reverse().slice(0,3);
 assert.equal((await call({action:'lineup',lineup:lineup.slice(0,2)})).status,400);await ok({action:'lineup',lineup});await ok({action:'tactic',tactic:'defensive'});
 assert.equal((await call({action:'tactic',tactic:'chaos'})).status,400);
 await ok({action:'startSeason'});assert.deepEqual(L.teamById(world,coached).lineup,lineup);
 while(world.phase!=='complete'){if(world.awaiting){await ok({action:'advance'});continue;}const matches=L.upcoming(world);assert(matches.every(m=>[m.home,m.away].includes(coached)?m.tactics[m.home===coached?0:1]==='defensive':true));await ok({action:'record',results:matches.map(m=>({matchId:m.id,games:fake(m)}))});}
 const klass=roll(L.rookiePlan(world),4040);
 const forged=klass.map(wire);forged[0]={...forged[0],traits:{...forged[0].traits,race:'Not a race'}};assert.equal((await call({action:'offseason',rookies:forged})).status,400,`${label}: rookies must be canonical rolls`);
 await ok({action:'offseason',rookies:klass.map(wire)});assert.equal(world.offseason.step,'resign');
 assert.equal((await call({action:'trade',partner:world.teams[0].id,give:[team.roster[0]],get:[world.teams[0].roster[0]]})).status,400,'Trades wait for re-signing decisions.');
 assert.equal((await call({action:'decide',decisions:null})).status,400);
 const willing=world.offseason.expiring.filter(e=>e.stance==='stay');
 await ok({action:'decide',decisions:{resign:willing.map(e=>({fighter:e.id,salary:e.ask.salary,years:e.ask.years})),release:[]}});assert.equal(world.offseason.step,'trades');for(const e of willing)assert.equal(world.fighters[e.id].team,coached);
 await ok({action:'closeTrades'});assert.equal(world.offseason.step,'freeAgency');
 while(world.phase==='offseason'){await marketBids();await ok({action:'market',count:100});}
 assert.equal(world.season,2);assert.equal(world.phase,'ready');assert(world.teams.every(t=>t.roster.length===5));
 await ok({action:'claim',team:null});assert.equal(world.settings.userTeam,null);
}
console.log(`Team offseason passed: coach claims, user bids under the cap reserve, lineups and tactics into every match, deterministic value updates driven by performance, contracts that keep their terms and expire, region-drafted rookies locked to their home region, trades within a region, AI and user re-signings, AI and user trades, offseason free agency, coach firings, free-agent retirement, three-season rollovers, server and browser-storage commands. ${churn.join('; ')}.`);

// League careers (TEAM-BATTLES.md, "Careers"): founding pools are mixed ages, fighters decline from their 7th
// season (strength, speed, durability and magic, with the OVR) and retire after their 10th, and the rookie class
// grows so every roster refills. Old saves get staggered ages on load.
import assert from 'node:assert/strict';
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';

const roll=(plan,seed)=>plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`R${seed}-${i}`));
const fake=(m,salt=0)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed^salt;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],balanceId:m.balance?.id,combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map((id,i)=>({id,damage:(n>>>(i%8))%500,healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
const playOut=w=>{let guard=0;while(w.phase==='season'||w.phase==='playoffs'){const [m]=L.upcoming(w,1);L.recordMatch(w,m.id,fake(m));assert(++guard<2000);}};
const finishDraft=w=>{let guard=0;while(!w.draft.complete){L.draftPicks(w,1e6);assert(++guard<1000);}};

const w=L.create({id:crypto.randomUUID(),format:3,teams:8,seed:4242,fighters:roll(L.poolPlan(3,8,4242),4242)});L.draftPicks(w,1e6);
const founders=Object.values(w.fighters).map(f=>L.careerSeason(w,f));
assert(founders.every(n=>n>=1&&n<=L.CAREER.founders),'Founders start in career seasons 1–6.');assert(new Set(founders).size>=5,'Founding ages are mixed.');

const size=L.FORMATS[w.format].rosterSize,games=new Map(),extendedIds=new Set();let retiredTotal=0,declinedTotal=0,checkedDecline=false,forcedMvp=null,formKept=0;
for(let season=1;season<=12;season++){
 L.startSeason(w);playOut(w);
 for(const [id,s]of Object.entries(w.stats))games.set(id,(games.get(id)??0)+s.games);
 // Once, make a veteran who would retire this season's MVP: they earn another season.
 if(!forcedMvp){const vet=L.retiringVeterans(w)[0];if(vet){w.titles.at(-1).mvp=vet.id;forcedMvp=vet.id;assert(!L.retiringVeterans(w).includes(vet));}}
 const form=L.seasonPerformance(w),staying=Object.values(w.fighters).filter(f=>L.careerSeason(w,f)>=L.CAREER.retireAfter&&!L.retiringVeterans(w).includes(f));
 for(const f of staying){const p=form.get(f.id);assert(w.titles.at(-1).mvp===f.id||p.z>=L.CAREER.extendForm&&p.share>=L.CAREER.extendShare,'Only the MVP or a veteran in top form stays.');}
 const veterans=L.retiringVeterans(w).map(f=>f.id),aging=Object.values(w.fighters).filter(f=>L.careerSeason(w,f)+1>=L.CAREER.declineFrom&&L.careerSeason(w,f)<L.CAREER.retireAfter),before=new Map(aging.map(f=>[f.id,{stats:[...f.summary.stats],ovr:f.ovr}]));
 const plan=L.rookiePlan(w);assert.equal(plan.length,w.teams.length*L.ROOKIES_PER_TEAM[w.format]+veterans.length,'Every retiring veteran is replaced in the rookie class.');
 L.startOffseason(w,roll(plan,season*977));
 assert.deepEqual(w.offseason.veterans.map(v=>v.id).sort(),[...veterans].sort());
 assert.deepEqual(w.offseason.extended.map(v=>v.id).sort(),staying.map(f=>f.id).sort());for(const v of w.offseason.extended){extendedIds.add(v.id);if(v.id===forcedMvp)assert.equal(v.reason,'mvp');else{assert.equal(v.reason,'form');formKept++;}}retiredTotal+=veterans.length;declinedTotal+=w.offseason.declined.length;
 for(const id of veterans){assert(!w.fighters[id],'Veterans leave the league.');assert(w.teams.every(t=>!t.roster.includes(id)&&!t.lineup.includes(id)));}
 for(const [id,b]of before){const f=w.fighters[id];if(!f)continue;checkedDecline=true;
  f.summary.stats.forEach((v,i)=>L.CAREER.stats.includes(i)?assert.equal(v,Math.round(b.stats[i]*(1-L.CAREER.decline))):assert.equal(v,b.stats[i]));
  assert.equal(f.summary.total,f.summary.stats.reduce((a,c)=>a+c,0));assert(f.ovr<b.ovr+5,'Performance can lift an old fighter, but age always costs at least a point.');assert.equal(f.salary,L.salaryFor(f.ovr));}
 finishDraft(w);
 assert(w.teams.every(t=>t.roster.length===size),'Every roster refills after retirements.');
 assert(Object.values(w.fighters).every(f=>L.careerSeason(w,f)>=1&&(L.careerSeason(w,f)<=L.CAREER.retireAfter||extendedIds.has(f.id))),'Only veterans who earned it play past their 10th season.');
}
assert(retiredTotal>=20,`Veterans retire over the years (${retiredTotal}).`);assert(checkedDecline&&declinedTotal>0);assert(forcedMvp&&extendedIds.has(forcedMvp),'A veteran MVP earns another season.');

// Lifetime totals add up every season, and old saves rebuild the same totals from the season log and titles.
for(const f of Object.values(w.fighters))assert.equal(f.career?.games??0,games.get(f.id)??0,'Lifetime games add up.');
const rebuilt=structuredClone(w);for(const f of Object.values(rebuilt.fighters))delete f.career;L.prepareCareers(rebuilt);
for(const f of Object.values(w.fighters))if(f.career)assert.deepEqual(rebuilt.fighters[f.id].career,f.career,'The season log rebuilds lifetime totals.');
const mvps=new Map();for(const t of w.titles)if(t.mvp)mvps.set(t.mvp,(mvps.get(t.mvp)??0)+1);for(const f of Object.values(w.fighters))assert.equal(f.career?.mvps??0,mvps.get(f.id)??0);

// Hall of Fame: retired MVPs and role standouts, with lifetime numbers and what they excelled at.
assert(w.hallOfFame?.length>=3,`Legends are inducted (${w.hallOfFame?.length}).`);
for(const e of w.hallOfFame){assert(e.reason==='mvp'?e.mvps>=1:e.stats.games>=L.HALL_MIN_GAMES&&e.excelled.some(x=>x.z>=L.HALL_STANDOUT));assert(!w.fighters[e.id],'Only retired fighters are in the Hall of Fame.');assert(e.excelled.every(x=>x.z>=1&&x.top>=1&&x.top<=100));assert(e.teams.every(t=>typeof t==='string'));}
const legends=new Set(w.hallOfFame.map(e=>e.id));for(const t of w.titles)if(t.mvp&&!w.fighters[t.mvp])assert(legends.has(t.mvp)||!w.seasonLog.some(s=>s.fighters.some(x=>x.id===t.mvp)),'Every retired MVP is a legend.');
const peers=Object.values(w.fighters).filter(f=>f.career?.games>=L.HALL_PEER_GAMES);const average=peers.find(f=>!f.career.mvps&&L.hallEntry(w,f)===null);assert(average,'An ordinary career is not Hall of Fame material.');

// Old saves: no careerStart yet. Ages come from seasons played, capped at a seeded 1–8, and loading twice is a no-op.
const old=structuredClone(w);old.season=16;for(const f of Object.values(old.fighters)){delete f.careerStart;}
L.prepareCareers(old);const ages=Object.values(old.fighters).map(f=>L.careerSeason(old,f));
assert(ages.every(n=>n>=1&&n<=L.CAREER.migrated),'Migrated ages stay within 1–8.');assert(new Set(ages).size>=5,'Migrated ages are staggered.');
const again=structuredClone(old);L.prepareCareers(again);assert.deepEqual(again.fighters,old.fighters);
const rookie=Object.values(old.fighters).find(f=>f.rookie===16);if(rookie)assert.equal(L.careerSeason(old,rookie),1,'A rookie of this season is in career season 1.');

console.log(`Careers passed: founders span career seasons ${Math.min(...founders)}–${Math.max(...founders)}, ${retiredTotal} veterans retired, ${extendedIds.size} earned another season (${formKept} on form), ${w.hallOfFame.length} legends inducted and ${declinedTotal} declines over 12 seasons, lifetime totals add up and rebuild from the log, rosters always refilled, and old saves get staggered ages (${Math.min(...ages)}–${Math.max(...ages)}).`);

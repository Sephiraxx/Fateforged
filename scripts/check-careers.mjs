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

const size=L.FORMATS[w.format].rosterSize;let retiredTotal=0,declinedTotal=0,checkedDecline=false;
for(let season=1;season<=12;season++){
 L.startSeason(w);playOut(w);
 const veterans=L.retiringVeterans(w).map(f=>f.id),aging=Object.values(w.fighters).filter(f=>L.careerSeason(w,f)+1>=L.CAREER.declineFrom&&L.careerSeason(w,f)<L.CAREER.retireAfter),before=new Map(aging.map(f=>[f.id,{stats:[...f.summary.stats],ovr:f.ovr}]));
 const plan=L.rookiePlan(w);assert.equal(plan.length,w.teams.length*L.ROOKIES_PER_TEAM[w.format]+veterans.length,'Every retiring veteran is replaced in the rookie class.');
 L.startOffseason(w,roll(plan,season*977));
 assert.deepEqual(w.offseason.veterans.map(v=>v.id).sort(),[...veterans].sort());retiredTotal+=veterans.length;declinedTotal+=w.offseason.declined.length;
 for(const id of veterans){assert(!w.fighters[id],'Veterans leave the league.');assert(w.teams.every(t=>!t.roster.includes(id)&&!t.lineup.includes(id)));}
 for(const [id,b]of before){const f=w.fighters[id];if(!f)continue;checkedDecline=true;
  f.summary.stats.forEach((v,i)=>L.CAREER.stats.includes(i)?assert.equal(v,Math.round(b.stats[i]*(1-L.CAREER.decline))):assert.equal(v,b.stats[i]));
  assert.equal(f.summary.total,f.summary.stats.reduce((a,c)=>a+c,0));assert(f.ovr<b.ovr+5,'Performance can lift an old fighter, but age always costs at least a point.');assert.equal(f.salary,L.salaryFor(f.ovr));}
 finishDraft(w);
 assert(w.teams.every(t=>t.roster.length===size),'Every roster refills after retirements.');
 assert(Object.values(w.fighters).every(f=>L.careerSeason(w,f)>=1&&L.careerSeason(w,f)<=L.CAREER.retireAfter),'Nobody plays past their 10th season.');
}
assert(retiredTotal>=20,`Veterans retire over the years (${retiredTotal}).`);assert(checkedDecline&&declinedTotal>0);

// Old saves: no careerStart yet. Ages come from seasons played, capped at a seeded 1–8, and loading twice is a no-op.
const old=structuredClone(w);old.season=16;for(const f of Object.values(old.fighters)){delete f.careerStart;}
L.prepareCareers(old);const ages=Object.values(old.fighters).map(f=>L.careerSeason(old,f));
assert(ages.every(n=>n>=1&&n<=L.CAREER.migrated),'Migrated ages stay within 1–8.');assert(new Set(ages).size>=5,'Migrated ages are staggered.');
const again=structuredClone(old);L.prepareCareers(again);assert.deepEqual(again.fighters,old.fighters);
const rookie=Object.values(old.fighters).find(f=>f.rookie===16);if(rookie)assert.equal(L.careerSeason(old,rookie),1,'A rookie of this season is in career season 1.');

console.log(`Careers passed: founders span career seasons ${Math.min(...founders)}–${Math.max(...founders)}, ${retiredTotal} veterans retired and ${declinedTotal} declines over 12 seasons, rosters always refilled, and old saves get staggered ages (${Math.min(...ages)}–${Math.max(...ages)}).`);

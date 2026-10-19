// Contracts and free agency in team leagues: contracts run out on time, fighters re-sign or move, stars chase titles,
// team fit changes match stats, and leagues saved before contracts move onto them once.
import assert from 'node:assert/strict';
import * as L from '../public/team-league.js';
import {circuit,roll,playSeason} from './circuit-fixtures.mjs';

const league=(format,regionSize,seed)=>circuit({format,regionSize,seed});
// Results follow lineup strength with a little noise, so contenders mean something.
const fake=(w,m)=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0],str=m.lineups.map(ids=>ids.reduce((a,id)=>a+w.fighters[id].ovr,0)/ids.length);let n=m.seed;
 while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=(n%1000)/1000<1/(1+Math.exp(-(str[0]-str[1])/4))?0:1;score[winnerTeam]++;
  games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],balanceId:m.balance?.id,combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map((id,i)=>({id,damage:Math.round(w.fighters[id].ovr*8+(n>>>(i%8))%200),healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5}))});}
 return games;};
const playOut=w=>playSeason(w,fake);

// Several spectator seasons: every roster stays full and under contract, contracts end on time, players move.
const w=league(3,6,4242);L.marketRounds(w,1e6);
const champions=[],moved=new Set();let checkedExpiry=0;
for(let season=1;season<=6;season++){
 const ending=new Set(Object.values(w.fighters).filter(f=>f.team&&f.contract.until===season).map(f=>f.id));
 L.startSeason(w);playOut(w);champions.push(L.worldsChampion(w));
 const teamsBefore=new Map(Object.values(w.fighters).filter(f=>f.team).map(f=>[f.id,f.team]));
 L.startOffseason(w,roll(L.rookiePlan(w),season*977));const o=w.lastOffseason;
 for(const id of ending){const f=w.fighters[id];if(!f)continue;checkedExpiry++;assert(o.resigned.some(r=>r.id===id)||o.departed.some(d=>d.id===id)||o.veterans.some(v=>v.id===id),'Every ending contract is re-signed or ends.');}
 for(const t of w.teams){assert.equal(t.roster.length,5);for(const id of t.roster)assert(w.fighters[id].contract.until>=season+1,'Rosters carry no expired contract into the new season.');}
 for(const [id,team]of teamsBefore)if(w.fighters[id]?.team&&w.fighters[id].team!==team)moved.add(id);
}
assert(checkedExpiry>=10,`Contracts ended over six seasons (${checkedExpiry}).`);assert(moved.size>=10,`Fighters changed teams (${moved.size}).`);
const stars=Object.values(w.fighters).filter(f=>f.ovr>=80);assert(stars.some(f=>f.career?.teams?.length>=2),'Some stars have played for more than one team.');
// Signings record where a fighter came from.
assert(w.lastOffseason.signings.some(l=>l.from),'Free agency moves fighters between teams.');

// Ring chasers: a titleless star wants to win more each season, so a weak team struggles to keep him.
{const probe=structuredClone(w),f=Object.values(probe.fighters).filter(x=>x.team).sort((a,b)=>b.ovr-a.ovr)[0];f.ovr=Math.max(f.ovr,85);f.career={...f.career,titles:0,trophies:{worlds:0,msi:0,'first-stand':0,split:3}};
 f.careerStart=probe.season;const fresh=L.winningWish(probe,f);f.careerStart=probe.season-6;const veteran=L.winningWish(probe,f);assert(veteran>fresh,`A titleless veteran star wants to win more (${fresh} → ${veteran}).`);
 f.career.trophies.msi=1;assert.equal(L.winningWish(probe,f),f.prefs.winning,'An MSI champion is no longer chasing.');f.career.trophies={worlds:1,msi:0};f.career.titles=1;assert.equal(L.winningWish(probe,f),f.prefs.winning,'A world champion is no longer chasing.');}

// Team fit in matches: his team playing his style lifts strength, speed, durability and magic by 4%; the opposite lowers them.
{const probe=structuredClone(w);L.startSeason(probe);const m=L.upcoming(probe,1)[0],home=L.teamById(probe,m.home),f=probe.fighters[m.lineups[0][0]],base=f.summary.stats;
 const statsWith=tactic=>{home.tactic=tactic;return L.squads(probe,m)[0][0].summary.stats;};
 f.prefs.style='aggressive';const up=statsWith('aggressive'),down=statsWith('defensive'),even=statsWith('balanced');
 assert.deepEqual(even,base,'A balanced team leaves stats alone.');
 for(const i of L.CAREER.stats){assert.equal(up[i],Math.round(base[i]*1.04));assert.equal(down[i],Math.round(base[i]*.96));}
 assert.equal(up[3],base[3],'IQ is not affected by fit.');
 const legacy=structuredClone(probe);delete legacy.contractsVersion;legacy.teams.find(t=>t.id===m.home).tactic='aggressive';assert.deepEqual(L.squads(legacy,m)[0][0].summary.stats,base,'Leagues without contracts play as before.');}

// Leagues saved before contracts: contracts and preferences are filled in, steps are renamed, and loading twice is a no-op.
const strip=x=>{const old=structuredClone(x);delete old.contractsVersion;delete old.market;for(const f of Object.values(old.fighters)){delete f.contract;delete f.prefs;}return old;};
{const old=strip(w);L.prepareContracts(old);assert.equal(old.contractsVersion,L.CONTRACTS_VERSION);
 for(const f of Object.values(old.fighters)){assert(L.TACTICS.includes(f.prefs.style));if(f.team){assert.equal(f.contract.salary,f.salary,'Migrated contracts keep the current salary.');assert(f.contract.years>=1&&f.contract.years<=3&&f.contract.until>=old.season);}else assert.equal(f.contract,null);}
 const again=structuredClone(old);L.prepareContracts(again);assert.deepEqual(again,old,'Loading twice changes nothing.');}
{const founding=league(3,6,5150),old=strip(founding);old.phase='draft';old.draft={order:old.teams.map(t=>t.id),picks:[],complete:false};L.prepareContracts(old);
 assert.equal(old.phase,'market');assert.equal(old.market.kind,'founding');assert.equal(old.draft,undefined);L.marketRounds(old,1e6);assert.equal(old.phase,'ready','A migrated founding draft finishes as an auction.');}
{const off=structuredClone(w);L.startSeason(off);playOut(off);L.claimTeam(off,off.teams[0].id);L.startOffseason(off,roll(L.rookiePlan(off),31337));
 for(const [from,to]of [['decisions','resign'],['market','trades'],['draft','freeAgency']]){const old=strip(off);old.offseason.step=from;delete old.offseason.expiring;L.prepareContracts(old);assert.equal(old.offseason.step,to);if(to==='freeAgency')assert(L.marketOpen(old));if(to==='resign')assert.deepEqual(old.offseason.expiring,[]);}}
// A paused series finishes on the old rules.
{const old=strip(w);old.pendingSeries={games:[{}]};assert.deepEqual(L.prepareContracts(structuredClone(old)),old);}

const titles={};for(const c of champions)titles[c]=(titles[c]??0)+1;
console.log(`Contracts passed: six seasons with full rosters always under contract, ${checkedExpiry} contracts ended on time, ${moved.size} fighters changed teams (champions ${Object.entries(titles).map(([t,n])=>`${t}×${n}`).join(', ')}), ring-chasing stars, ±4% team fit in matches, and migration of leagues saved before contracts.`);

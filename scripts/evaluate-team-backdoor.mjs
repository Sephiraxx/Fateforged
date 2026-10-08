// Core siege team-3.7 against team-3.6 on the same seeds: backdoor losses, match length, sudden death, Titan kills,
// Forgefire, the Titan's new abilities and coach styles against Balanced. Writes validation/team-objectives-v37.json.
// A game is a backdoor loss when the losing Core took most of its last 25% of damage while its defenders nearby were
// outnumbered and at least two teammates were alive elsewhere (nobody went back).
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {BRAIN_RULES} from '../public/combat-team-v3-5.js';
const n=Number(process.argv[2]??40),tacticGames=Number(process.argv[3]??20),out=process.argv[4]??'validation/team-objectives-v37.json';
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),round=v=>Math.round(v*10)/10;
function play(version,size,i){
 const comps=Object.keys(COMPOSITIONS).filter(k=>k.endsWith(String(size))),ca=i%3===0?'balanced'+size:comps[i%comps.length],cb=i%3===0?'balanced'+size:comps[(i*7+3)%comps.length];
 const teams=[squad(COMPOSITIONS[ca],i*7919+1),squad(COMPOSITIONS[cb],i*7919+2)],Engine=teamEngine(version),b=new Engine(i%2?[...teams].reverse():teams,51000+i,{headless:true});
 const lone=[0,0],late=[0,0];let prev=b.cores.map(c=>c.hp),teleports=0;const usePower=b.usePower.bind(b);
 b.usePower=(f,t,p,copied)=>{const used=usePower(f,t,p,copied);if(used&&p.id==='teleport'&&d(f,b.cores[1-f.team])<420)teleports++;return used;};
 while(!b.done){b.step(1/60);for(const c of b.cores){const lost=prev[c.team]-c.hp;if(lost>0&&c.hp<c.maxHp*.25+lost){const mine=b.combatants.filter(f=>f.team===c.team&&f.hp>0),home=mine.filter(f=>d(f,c)<BRAIN_RULES.defendRange).length,attackers=b.combatants.filter(f=>f.team!==c.team&&f.hp>0&&d(f,c)<BRAIN_RULES.defendRange).length;late[c.team]+=lost;if(home<attackers&&mine.length-home>=2)lone[c.team]+=lost;}}prev=b.cores.map(c=>c.hp);}
 const r=b.result(),loser=1-r.winnerTeam,destroyed=r.reason.includes('Core destroyed');
 return {r,backdoor:destroyed&&lone[loser]>late[loser]*.5,teleports};
}
const rows=[];
for(const version of ['team-3.6','team-3.7'])for(const size of [3,5]){
 const games=Array.from({length:n},(_,i)=>play(version,size,i)),lengths=games.map(g=>g.r.seconds).sort((a,b)=>a-b),buff=games.filter(g=>g.r.objective.forgefireSeconds[0]!==g.r.objective.forgefireSeconds[1]),sum=f=>games.reduce((s,g)=>s+f(g),0);
 const row={engine:version,size,games:n,medianSeconds:lengths[Math.floor(n/2)],averageSeconds:Math.round(sum(g=>g.r.seconds)/n),suddenDeathRate:round(games.filter(g=>g.r.objective.suddenDeath).length/n*100),timeLimitRate:round(games.filter(g=>g.r.reason.startsWith('Time')).length/n*100),
  backdoorRate:round(games.filter(g=>g.backdoor).length/n*100),teleportsNearCore:sum(g=>g.teleports),titanKillsPerGame:round(sum(g=>g.r.objective.monsterKills[0]+g.r.objective.monsterKills[1])/n),
  forgefireWinRate:buff.length?round(buff.filter(g=>g.r.winnerTeam===(g.r.objective.forgefireSeconds[0]>g.r.objective.forgefireSeconds[1]?0:1)).length/buff.length*100):null,
  hurlsPerGame:round(sum(g=>g.r.objective.hurls??0)/n),fissureStunsPerGame:round(sum(g=>g.r.objective.fissureStuns??0)/n)};
 rows.push(row);console.log(row);
}
// Coach styles against Balanced on team-3.7, identical squads, sides alternating.
const tactics=[];for(const size of [3,5])for(const tactic of ['defensive','aggressive','focus-healer','protect-carry']){let wins=0;for(let i=0;i<tacticGames;i++){const teams=[squad(COMPOSITIONS['balanced'+size],i*7919+11),squad(COMPOSITIONS['balanced'+size],i*7919+12)],swap=i%2,Engine=teamEngine('team-3.7'),b=new Engine(swap?[...teams].reverse():teams,52000+i,{headless:true,tactics:swap?['balanced',tactic]:[tactic,'balanced']});while(!b.done)b.step(1/60);if(b.result().winnerTeam===(swap?1:0))wins++;}const row={size,tactic,games:tacticGames,winRate:round(wins/tacticGames*100)};tactics.push(row);console.log(row);}
fs.writeFileSync(out,JSON.stringify({phase:'v37',engine:'team-3.7',note:'Core siege team-3.7 (backdoor duty, no teleports onto Cores, Molten Hurl and Fissure, stronger Forgefire) against team-3.6 on the same seeds and squads; balanced mirrors every third game, mixed compositions otherwise; summary rows only.',rows,tactics},null,2)+'\n');

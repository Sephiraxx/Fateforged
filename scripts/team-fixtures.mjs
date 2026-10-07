// Shared setup for team-battle checks and evaluations: loads the wheel data and luck rules into this realm
// and builds seeded, role-targeted fighters exactly as the exhibition's random teams do.
import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../public/',import.meta.url);
await import(new URL('class-abilities.js',root));
if(!globalThis.WHEEL_DATA)vm.runInThisContext(fs.readFileSync(new URL('data.js',root),'utf8')+';globalThis.WHEEL_DATA=WHEEL_DATA;');
if(!globalThis.WHEEL_LUCK)vm.runInThisContext(fs.readFileSync(new URL('luck.js',root),'utf8')+';globalThis.WHEEL_LUCK=WHEEL_LUCK;');
export const engine=await import(new URL('combat-team.js',root));
export const generation=await import(new URL('team-generation.js',root));
export const roles=await import(new URL('team-roles.js',root));
export const COMPOSITIONS={balanced2:['tank','damage'],healer2:['healer','damage'],damage2:['damage','damage'],balanced3:['tank','healer','damage'],damage3:['damage','damage','damage'],tank3:['tank','damage','damage'],healer3:['healer','damage','damage'],control3:['tank','controller','damage'],balanced5:['tank','healer','controller','damage','damage'],damage5:['damage','damage','damage','damage','damage']};
export function squad(roleList,seed){const random=generation.seededRandom(seed);return roleList.map((role,i)=>generation.roleFighter(globalThis.WHEEL_DATA,globalThis.WHEEL_LUCK,{role,tier:generation.poolTier(random),random,id:`fx-${seed}-${i}`,name:()=>`${role} ${seed}-${i}`}));}
// Mirrored sides: each pairing is played once from each side so spawn position cannot decide it.
export function matchup(a,b,games,seedBase=50000){
 const out={games,winsA:0,timeouts:0,seconds:0,healerHealing:0,ccSeconds:0,ms:0};
 for(let s=0;s<games;s++){const A=squad(COMPOSITIONS[a],s*7919+1),B=squad(COMPOSITIONS[b],s*7919+2),swap=s%2===1,start=performance.now();
  const r=engine.simulateTeam(swap?[B,A]:[A,B],seedBase+s);out.ms+=performance.now()-start;
  if((swap?1-r.winnerTeam:r.winnerTeam)===0)out.winsA++;if(r.reason.startsWith('Time'))out.timeouts++;out.seconds+=r.seconds;
  out.healerHealing+=r.fighters.filter(f=>f.role==='healer').reduce((n,f)=>n+f.healing,0);out.ccSeconds+=r.fighters.reduce((n,f)=>n+f.ccSeconds,0);}
 return {games,winRateA:Math.round(out.winsA/games*1000)/10,timeoutRate:Math.round(out.timeouts/games*1000)/10,averageSeconds:Math.round(out.seconds/games*10)/10,healerHealingPerGame:Math.round(out.healerHealing/games),ccSecondsPerGame:Math.round(out.ccSeconds/games*10)/10,averageMs:Math.round(out.ms/games)};
}
// Formation metrics, sampled every 0.25 s while fighters are engaged (an enemy within 200):
// isolated = no living ally within 150; outnumbered = more enemies than allies (self included) within 200;
// spread = mean distance from the team centroid; healerCover = healers within support range of a living tank.
export function measuredBattle(teams,seed,options={}){
 const battle=new engine.TeamBattle(teams,seed,{...options,headless:true}),m={engaged:0,isolated:0,outnumbered:0,spread:0,spreadSamples:0,healer:0,covered:0};let step=0;
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 while(!battle.done){battle.step(1/60);if(++step%15)continue;const living=battle.fighters.filter(f=>f.hp>0);
  for(const team of [0,1]){const mine=living.filter(f=>f.team===team);if(mine.length>1){const c={x:mine.reduce((n,f)=>n+f.x,0)/mine.length,y:mine.reduce((n,f)=>n+f.y,0)/mine.length};m.spread+=mine.reduce((n,f)=>n+d(f,c),0)/mine.length;m.spreadSamples++;}}
  for(const f of living){const foes=living.filter(e=>e.team!==f.team&&d(e,f)<200).length;if(!foes)continue;m.engaged++;const friends=living.filter(a=>a.team===f.team&&a!==f);if(!friends.some(a=>d(a,f)<150))m.isolated++;if(foes>1+friends.filter(a=>d(a,f)<200).length)m.outnumbered++;
   if(f.role==='healer'&&friends.some(a=>a.role==='tank')){m.healer++;if(friends.some(a=>a.role==='tank'&&d(a,f)<240))m.covered++;}}
 }
 return {result:battle.result(),metrics:m};
}
export function formationMatchup(a,b,games,options={},seedBase=50000){
 const sum={engaged:0,isolated:0,outnumbered:0,spread:0,spreadSamples:0,healer:0,covered:0},out={winsA:0,timeouts:0,seconds:0,ms:0,healerHealing:0,ccSeconds:0};
 for(let s=0;s<games;s++){const A=squad(COMPOSITIONS[a],s*7919+1),B=squad(COMPOSITIONS[b],s*7919+2),swap=s%2===1,start=performance.now(),opts={...options,tactics:options.tactics&&(swap?[...options.tactics].reverse():options.tactics)};
  const {result:r,metrics}=measuredBattle(swap?[B,A]:[A,B],seedBase+s,opts);out.ms+=performance.now()-start;for(const k in sum)sum[k]+=metrics[k];
  if((swap?1-r.winnerTeam:r.winnerTeam)===0)out.winsA++;if(r.reason.startsWith('Time'))out.timeouts++;out.seconds+=r.seconds;
  out.healerHealing+=r.fighters.filter(f=>f.role==='healer').reduce((n,f)=>n+f.healing,0);out.ccSeconds+=r.fighters.reduce((n,f)=>n+f.ccSeconds,0);}
 const pct=(x,n)=>n?Math.round(x/n*1000)/10:0;
 return {games,winRateA:pct(out.winsA,games),timeoutRate:pct(out.timeouts,games),averageSeconds:Math.round(out.seconds/games*10)/10,averageMs:Math.round(out.ms/games),healerHealingPerGame:Math.round(out.healerHealing/games),ccSecondsPerGame:Math.round(out.ccSeconds/games*10)/10,isolatedPct:pct(sum.isolated,sum.engaged),outnumberedPct:pct(sum.outnumbered,sum.engaged),spread:Math.round(sum.spread/(sum.spreadSamples||1)),healerCoverPct:pct(sum.covered,sum.healer)};
}

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
export const COMPOSITIONS={balanced3:['tank','healer','damage'],damage3:['damage','damage','damage'],tank3:['tank','damage','damage'],healer3:['healer','damage','damage'],control3:['tank','controller','damage'],balanced5:['tank','healer','controller','damage','damage'],damage5:['damage','damage','damage','damage','damage']};
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

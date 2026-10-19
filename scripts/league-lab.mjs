// League lab: plays whole spectator seasons of a team league on the Rust core (WebAssembly; JavaScript when it is
// missing) and prints the league's balance report. Unlike scripts/balance-lab.mjs, which plays random teams, these are
// the games a league really plays: AI coaches build lineups, adapt to the meta, and sign and trade fighters.
// node scripts/league-lab.mjs [--format 3] [--teams 32] [--seasons 15] [--mode core|teamfight] [--seed S] [--threads N]
import fs from 'node:fs';
import os from 'node:os';
import {Worker,isMainThread,parentPort} from 'node:worker_threads';

if(!isMainThread){
 const {simulateTeamSeries}=await import('../public/team-sim-worker.js');
 const {useNativeSimulator}=await import('../public/combat-team.js');
 const {loadRustCore,nativeSimulate}=await import('../public/rust-core.js');
 if(await loadRustCore(fs.readFileSync(new URL('../public/fateforge-core.wasm',import.meta.url))))useNativeSimulator(nativeSimulate);
 parentPort.on('message',({id,match,teams})=>parentPort.postMessage({id,games:simulateTeamSeries({match,teams})}));
}else{
 const {generation}=await import('./team-fixtures.mjs');
 const L=await import('../public/team-league.js');
 const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
 const format=Number(arg('--format',3)),teams=Number(arg('--teams',32)),seasons=Number(arg('--seasons',15)),mode=arg('--mode','core'),seed=Number(arg('--seed',2026)),threads=Number(arg('--threads',Math.max(1,os.cpus().length-1)));
 const roll=(plan,s)=>plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,s,()=>`L${s}-${i}`));
 const workers=Array.from({length:threads},()=>new Worker(new URL(import.meta.url)));let next=0;const waiting=new Map();
 for(const w of workers)w.on('message',({id,games})=>{waiting.get(id)(games);waiting.delete(id);});
 const simulate=(match,squads)=>new Promise(resolve=>{const id=next++;waiting.set(id,resolve);workers[id%threads].postMessage({id,match,teams:squads});});
 const w=L.create({id:crypto.randomUUID(),format,teams,seed,battleMode:mode,fighters:roll(L.poolPlan(format,teams,seed),seed)});
 L.marketRounds(w,1e6);
 const started=performance.now();
 for(let season=1;season<=seasons;season++){
  L.startSeason(w);
  while(w.phase==='season'||w.phase==='playoffs'){const batch=L.upcoming(w,64),games=await Promise.all(batch.map(m=>simulate(m,L.squads(w,m))));batch.forEach((m,i)=>L.recordMatch(w,m.id,games[i]));}
  L.startOffseason(w,roll(L.rookiePlan(w),seed+season*977));
  process.stderr.write(`season ${season}/${seasons} · ${Math.round((performance.now()-started)/1000)}s\n`);
 }
 for(const worker of workers)worker.terminate();
 const text=L.balanceReportText(w);console.log(args.includes('--full')?text:text.split('\n\nSeasons')[0]);
}

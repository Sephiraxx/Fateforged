// League lab: plays whole spectator seasons of a region circuit on the Rust core (WebAssembly; JavaScript when it is
// missing) and prints the league's balance report and a region report. Unlike scripts/balance-lab.mjs, which plays
// random teams, these are the games a circuit really plays: AI coaches build lineups, adapt to the meta, and sign and
// trade fighters across regions. --fake plays strength-based results instead (fast, for tuning talent and money).
// node scripts/league-lab.mjs [--format 3] [--region-size 8] [--seasons 15] [--mode core|teamfight] [--seed S]
//   [--threads N] [--fake] [--full] [--json file]
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
 const L=await import('../public/team-league.js');
 const {circuit,roll,fakeSeries}=await import('./circuit-fixtures.mjs');
 const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
 const format=Number(arg('--format',3)),regionSize=Number(arg('--region-size',8)),seasons=Number(arg('--seasons',15)),mode=arg('--mode','core'),seed=Number(arg('--seed',2026)),fake=args.includes('--fake'),threads=fake?0:Number(arg('--threads',Math.max(1,os.cpus().length-1)));
 const workers=Array.from({length:threads},()=>new Worker(new URL(import.meta.url)));let next=0;const waiting=new Map();
 for(const w of workers)w.on('message',({id,games})=>{waiting.get(id)(games);waiting.delete(id);});
 const simulate=(match,squads)=>new Promise(resolve=>{const id=next++;waiting.set(id,resolve);workers[id%threads].postMessage({id,match,teams:squads});});
 const w=circuit({format,regionSize,seed,battleMode:mode});
 L.marketRounds(w,1e6);
 const started=performance.now(),rows=[];
 const regionOf=id=>L.regionOfTeam(w,id),placeIn=(ev,id)=>{let k=0;for(const g of ev?.places??[]){if(g.includes(id))return k+1;k+=g.length;}return null;};
 for(let season=1;season<=seasons;season++){
  L.startSeason(w);
  while(w.phase==='season'){
   if(w.awaiting){L.advance(w);continue;}
   const batch=L.upcoming(w),games=fake?batch.map(m=>fakeSeries(w,m)):await Promise.all(batch.map(m=>simulate(m,L.squads(w,m))));batch.forEach((m,i)=>L.recordMatch(w,m.id,games[i]));
  }
  // Where each region's teams finished internationally, and who their rosters are (home region, OVR, tier).
  const row={season,events:{},regions:{}};
  for(const [key,ev]of Object.entries(w.year.events))row.events[key]={champion:regionOf(ev.places[0][0]),runnerUp:regionOf(ev.places[1][0]),top4:ev.places.flat().slice(0,4).map(regionOf),top8:ev.places.flat().slice(0,8).map(regionOf),teams:ev.teams.map(regionOf)};
  for(const r of L.REGION_IDS){const ids=w.teams.filter(t=>t.region===r).flatMap(t=>t.roster),fs=ids.map(id=>w.fighters[id]);
   row.regions[r]={ovr:Math.round(fs.reduce((a,f)=>a+f.ovr,0)/fs.length*10)/10,ss:fs.filter(f=>f.summary?.tier==='SS').length,stars:fs.filter(f=>f.ovr>=85).length,imports:fs.filter(f=>f.region!==r).length,
    homeSS:Object.values(w.fighters).filter(f=>f.region===r&&f.summary?.tier==='SS').length,abroad:Object.values(w.fighters).filter(f=>f.region===r&&f.team&&regionOf(f.team)!==r).length,worlds:placeIn(w.year.events.worlds,w.year.events.worlds.places.flat().find(id=>regionOf(id)===r))};}
  rows.push(row);
  L.startOffseason(w,roll(L.rookiePlan(w),seed+season*977,'R'));
  while(L.marketOpen(w)&&w.phase!=='ready')L.marketRounds(w,1e6);
  process.stderr.write(`season ${season}/${seasons} · Worlds ${L.regionById(row.events.worlds.champion).short} over ${L.regionById(row.events.worlds.runnerUp).short} · ${Math.round((performance.now()-started)/1000)}s\n`);
 }
 for(const worker of workers)worker.terminate();
 if(args.includes('--json'))fs.writeFileSync(arg('--json'),JSON.stringify({format,regionSize,mode,seed,fake,rows}));
 const pct=(n,d)=>d?`${Math.round(n/d*100)}%`:'–',count=(list,r)=>list.filter(x=>x===r).length;
 const lines=[`Region report: ${seasons} seasons, ${format}v${format}, ${regionSize} teams per region, ${mode}${fake?' (fake results)':''}`,
  'Region            Worlds  final  top4  top8 | MSI  final | FS  | OVR   SS  85+ imports abroad'];
 for(const r of L.REGIONS){const ev=k=>rows.filter(x=>x.events[k]),wo=ev('worlds'),msi=ev('msi'),fs1=ev('first-stand'),last=rows.slice(-5),avg=k=>Math.round(last.reduce((a,x)=>a+x.regions[r.id][k],0)/last.length*10)/10;
  lines.push(`${r.name.padEnd(16)} ${pct(count(wo.map(x=>x.events.worlds.champion),r.id),wo.length).padStart(6)} ${String(count(wo.flatMap(x=>[x.events.worlds.champion,x.events.worlds.runnerUp]),r.id)).padStart(6)} ${String(count(wo.flatMap(x=>x.events.worlds.top4),r.id)).padStart(5)} ${String(count(wo.flatMap(x=>x.events.worlds.top8),r.id)).padStart(5)} | ${String(count(msi.map(x=>x.events.msi.champion),r.id)).padStart(3)} ${String(count(msi.flatMap(x=>[x.events.msi.champion,x.events.msi.runnerUp]),r.id)).padStart(6)} | ${String(count(fs1.map(x=>x.events['first-stand'].champion),r.id)).padStart(3)} | ${String(avg('ovr')).padStart(4)} ${String(avg('ss')).padStart(4)} ${String(avg('stars')).padStart(4)} ${String(avg('imports')).padStart(7)} ${String(avg('abroad')).padStart(6)}`);}
 lines.push('(OVR, SS, 85+, imports and abroad: average over the last five seasons; abroad = home-region fighters on other regions\' teams.)');
 if(!fake){const text=L.balanceReportText(w);console.log(args.includes('--full')?text:text.split('\n\nSeasons')[0]);console.log('');}
 console.log(lines.join('\n'));
}

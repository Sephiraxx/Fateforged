// Balance lab for the team cast (TEAM-BATTLES.md, "Hand balance"): plays seeded games between random cast teams on
// the Rust core (WebAssembly; JavaScript when it is missing) and reports win rates with 95% intervals per subclass,
// class and cast role, per-role output, game length and how often the level leader wins.
// node scripts/balance-lab.mjs [--games N] [--mode core|teamfight|both] [--threads N] [--record] [--seed S]
// (--record writes validation/balance-lab.json)
import fs from 'node:fs';
import os from 'node:os';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';

const SIZES=[3,5];
const ENGINE={core:'team-4.0',teamfight:'team-2.9'};

if(!isMainThread){
 const {generation}=await import('./team-fixtures.mjs');
 const {simulateTeam,useNativeSimulator}=await import('../public/combat-team.js');
 const {loadRustCore,nativeSimulate}=await import('../public/rust-core.js');
 const {TEAM_MAPS}=await import('../public/team-maps.js');
 const {teamRole}=await import('../public/team-roles.js');
 if(await loadRustCore(fs.readFileSync(new URL('../public/fateforge-core.wasm',import.meta.url))))useNativeSimulator(nativeSimulate);
 const P=globalThis.WHEEL_DATA,L=globalThis.WHEEL_LUCK,maps=TEAM_MAPS.map(m=>m.id);
 const out=[];
 for(const g of workerData.games){
  const random=generation.seededRandom(g.seed),fighter=k=>generation.castFighter(P,L,{tier:generation.poolTier(random),random,id:`lab-${g.seed}-${k}`});
  const teams=[0,1].map(t=>Array.from({length:g.size},(_,i)=>fighter(t*g.size+i)));
  const r=simulateTeam(teams,g.seed,{headless:true,engineVersion:ENGINE[g.mode],map:maps[g.seed%maps.length]});
  const byId=new Map(teams.flat().map(f=>[f.id,f]));
  out.push({mode:g.mode,size:g.size,seconds:r.seconds,winner:r.winnerTeam,timeout:/^Time/.test(r.reason),levelLead:r.objective?.levelLead??null,
   fighters:r.fighters.map(x=>{const f=byId.get(x.id);return {team:x.team,cls:f.traits.class,sub:f.traits.subclass,role:teamRole(f).castRole,damage:x.damage,healing:x.healing,cc:x.ccSeconds,kills:x.kills,deaths:x.deaths};})});
 }
 parentPort.postMessage(out);
}else{
 const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
 const total=Number(arg('--games',1200)),mode=arg('--mode','both'),threads=Number(arg('--threads',Math.max(1,os.cpus().length-1))),base=Number(arg('--seed',1));
 const modes=mode==='both'?['core','teamfight']:[mode];
 const games=Array.from({length:total},(_,i)=>({seed:base+i*7919,size:SIZES[i%2],mode:modes[Math.floor(i/2)%modes.length]}));
 const started=performance.now();
 const chunks=Array.from({length:threads},(_,t)=>games.filter((_,i)=>i%threads===t));
 const results=(await Promise.all(chunks.map(list=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{games:list}});w.once('message',resolve);w.once('error',reject);})))).flat();
 // Win rates with Wilson 95% intervals. A fighter's game counts once for its group (mirror groups on both sides
 // cancel out: a group on both teams wins exactly once).
 const wilson=(w,n)=>{if(!n)return [0,0];const z=1.96,p=w/n,c=p+z*z/(2*n),m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)),d=1+z*z/n;return [Math.round((c-m)/d*1000)/10,Math.round((c+m)/d*1000)/10];};
 const rate=(key)=>{const g={};for(const r of results){if(r.winner==null)continue;for(const f of r.fighters){const k=key(f,r);if(k==null)continue;const s=g[k]??={wins:0,games:0,damage:0,healing:0,cc:0};s.games++;if(f.team===r.winner)s.wins++;s.damage+=f.damage;s.healing+=f.healing;s.cc+=f.cc;}}
  return Object.fromEntries(Object.entries(g).sort((a,b)=>b[1].wins/b[1].games-a[1].wins/a[1].games).map(([k,s])=>[k,{winRate:Math.round(s.wins/s.games*1000)/10,ci:wilson(s.wins,s.games),games:s.games,damage:Math.round(s.damage/s.games),healing:Math.round(s.healing/s.games),cc:Math.round(s.cc/s.games*10)/10}]));};
 const median=list=>{const s=[...list].sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:null;};
 const summary={games:results.length,seconds:Math.round((performance.now()-started)/100)/10,
  modes:Object.fromEntries(modes.map(m=>{const list=results.filter(r=>r.mode===m);return [m,{games:list.length,medianSeconds:median(list.map(r=>r.seconds)),timeouts:Math.round(list.filter(r=>r.timeout).length/list.length*1000)/10}];})),
  levelLeaderWins:(()=>{const list=results.filter(r=>r.levelLead&&r.winner!=null);return list.length?Math.round(list.filter(r=>(r.levelLead>0?0:1)===r.winner).length/list.length*1000)/10:null;})(),
  subclass:rate(f=>`${f.cls} (${f.sub})`),cls:rate(f=>f.cls),role:rate(f=>f.role),
  subclassBySize:Object.fromEntries(SIZES.map(s=>[s,rate((f,r)=>r.size===s?`${f.cls} (${f.sub})`:null)])),
  subclassByMode:Object.fromEntries(modes.map(m=>[m,rate((f,r)=>r.mode===m?`${f.cls} (${f.sub})`:null)]))};
 if(args.includes('--record'))fs.writeFileSync('validation/balance-lab.json',JSON.stringify(summary,null,1)+'\n');
 const table=g=>Object.entries(g).map(([k,s])=>`${k.padEnd(26)} ${String(s.winRate).padStart(5)}%  [${s.ci.join('–')}]  n=${s.games}  dmg ${s.damage}  heal ${s.healing}  cc ${s.cc}`).join('\n');
 console.log(`${summary.games} games in ${summary.seconds}s · ${JSON.stringify(summary.modes)} · level leader wins ${summary.levelLeaderWins}%\n\nRoles\n${table(summary.role)}\n\nClasses\n${table(summary.cls)}\n\nSubclasses\n${table(summary.subclass)}`);
}

// Calibrates team-league OVR for the team cast (TEAM-BATTLES.md, "Ratings and salaries"). Plays seeded games between
// random cast teams on the Rust core (3v3 and 5v5, per battle mode) and fits a logistic model: a team's chance to win
// follows the difference of its fighters' summed values, where a value is the rating features (team-league.js
// ratingFeatures) plus one offset per subclass. Values are then rescaled so a fresh pool keeps the old OVR spread.
// node scripts/evaluate-cast-values.mjs [--games N per mode] [--threads N] [--seed S]
// Writes validation/cast-values.json; copy "model" into CAST_RATING_MODEL in public/team-league.js.
import fs from 'node:fs';
import os from 'node:os';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';

const FEATURES=['ehp','dps','spell','ability','speed','iq'],SIZES=[3,5],ENGINE={core:'team-4.0',teamfight:'team-2.9'};

if(!isMainThread){
 const {generation}=await import('./team-fixtures.mjs');
 const {simulateTeam,useNativeSimulator}=await import('../public/combat-team.js');
 const {loadRustCore,nativeSimulate}=await import('../public/rust-core.js');
 const {TEAM_MAPS}=await import('../public/team-maps.js');
 const L=await import('../public/team-league.js');
 if(await loadRustCore(fs.readFileSync(new URL('../public/fateforge-core.wasm',import.meta.url))))useNativeSimulator(nativeSimulate);
 const P=globalThis.WHEEL_DATA,W=globalThis.WHEEL_LUCK,maps=TEAM_MAPS.map(m=>m.id),out=[];
 for(const g of workerData.games){
  const random=generation.seededRandom(g.seed),fighter=k=>generation.castFighter(P,W,{tier:generation.poolTier(random),random,id:`value-${g.seed}-${k}`});
  const teams=[0,1].map(t=>Array.from({length:g.size},(_,i)=>fighter(t*g.size+i)));
  const r=simulateTeam(teams,g.seed,{headless:true,engineVersion:ENGINE[g.mode],map:maps[g.seed%maps.length]});
  if(r.winnerTeam==null)continue;
  out.push({mode:g.mode,size:g.size,winner:r.winnerTeam,teams:teams.map(t=>t.map(f=>{const x=L.ratingFeatures(f);return {sub:`${f.traits.class} (${f.traits.subclass})`,x:FEATURES.map(k=>x[k])};}))});
 }
 parentPort.postMessage(out);
}else{
 const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
 const perMode=Number(arg('--games',4000)),threads=Number(arg('--threads',Math.max(1,os.cpus().length-1))),base=Number(arg('--seed',90210));
 const {TEAM_CLASSES}=await import('../public/team-classes.js'),{generation}=await import('./team-fixtures.mjs'),L=await import('../public/team-league.js');
 const subclasses=TEAM_CLASSES.flatMap(c=>c.subclasses.map(s=>`${c.name} (${s.name})`)),columns=[...FEATURES,...subclasses],k=columns.length;
 const started=performance.now(),games=['core','teamfight'].flatMap((mode,m)=>Array.from({length:perMode},(_,i)=>({mode,size:SIZES[i%2],seed:base+m*1e6+i*7919})));
 const chunks=Array.from({length:threads},(_,t)=>games.filter((_,i)=>i%threads===t));
 const results=(await Promise.all(chunks.map(list=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{games:list}});w.once('message',resolve);w.once('error',reject);})))).flat();
 // A game's row is (team A − team B) per column, scaled to a 3-fighter team so 5v5 games weigh each fighter less.
 const row=g=>{const v=Array(k).fill(0),scale=3/g.size;g.teams.forEach((team,t)=>{const sign=t?-1:1;for(const f of team){f.x.forEach((x,i)=>v[i]+=sign*x*scale);v[FEATURES.length+subclasses.indexOf(f.sub)]+=sign*scale;}});return v;};
 // Ridge-penalised logistic regression by Newton steps (no intercept: sides are symmetric).
 function fit(list){
  const X=list.map(row),y=list.map(g=>g.winner===0?1:0),lambda=1;let w=Array(k).fill(0);
  for(let step=0;step<25;step++){
   const H=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>i===j?lambda:0)),grad=w.map(v=>-lambda*v);
   X.forEach((x,n)=>{const p=1/(1+Math.exp(-x.reduce((s,v,i)=>s+v*w[i],0))),r=p*(1-p);for(let i=0;i<k;i++){if(!x[i])continue;grad[i]+=(y[n]-p)*x[i];for(let j=0;j<k;j++)if(x[j])H[i][j]+=r*x[i]*x[j];}});
   // Solve H d = grad (Gauss-Jordan with partial pivoting).
   const A=H.map((r,i)=>[...r,grad[i]]);for(let i=0;i<k;i++){let p=i;for(let r=i+1;r<k;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];for(let r=0;r<k;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<=k;c++)A[r][c]-=f*A[i][c];}}
   const d=A.map((r,i)=>r[k]/r[i]);w=w.map((v,i)=>v+d[i]);if(Math.max(...d.map(Math.abs))<1e-7)break;
  }
  const hits=X.filter((x,n)=>(x.reduce((s,v,i)=>s+v*w[i],0)>0)===(y[n]===1)).length;
  return {w,accuracy:Math.round(hits/X.length*1000)/10};
 }
 // Rescale to the old rating's spread over fresh league pools, so OVRs and salaries keep their range.
 const pool=[11,22,33,44].flatMap(seed=>L.poolPlan(3,32,seed).map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`P${seed}-${i}`)));
 const stats=list=>{const mean=list.reduce((a,b)=>a+b,0)/list.length;return {mean,sd:Math.sqrt(list.reduce((a,b)=>a+(b-mean)**2,0)/list.length)};};
 const old=stats(pool.map(f=>L.rawRating(f)));
 const report={games:results.length,seconds:Math.round((performance.now()-started)/1000),modes:{},model:{}};
 for(const mode of ['core','teamfight']){
  const list=results.filter(g=>g.mode===mode),{w,accuracy}=fit(list);
  const value=f=>{const x=L.ratingFeatures(f);return FEATURES.reduce((s,key,i)=>s+w[i]*x[key],0)+w[FEATURES.length+subclasses.indexOf(`${f.traits.class} (${f.traits.subclass})`)];};
  const now=stats(pool.map(value)),scale=old.sd/now.sd,r=v=>Math.round(v*1000)/1000;
  // Subclass offsets are centred on the pool's mix, which the intercept absorbs.
  const mix=stats(pool.map(f=>w[FEATURES.length+subclasses.indexOf(`${f.traits.class} (${f.traits.subclass})`)])).mean;
  report.model[mode]={intercept:r(old.mean-scale*(now.mean-mix)),...Object.fromEntries(FEATURES.map((key,i)=>[key,r(w[i]*scale)])),subclass:Object.fromEntries(subclasses.map((s,i)=>[s,r((w[FEATURES.length+i]-mix)*scale)]))};
  report.modes[mode]={games:list.length,accuracy,logitPerRating:r(1/scale)};
 }
 fs.writeFileSync('validation/cast-values.json',JSON.stringify(report,null,1)+'\n');
 console.log(JSON.stringify({games:report.games,seconds:report.seconds,modes:report.modes},null,1));
 for(const mode of ['core','teamfight'])console.log(mode,Object.entries(report.model[mode].subclass).sort((a,b)=>b[1]-a[1]).map(([s,v])=>`${s} ${v}`).join(' · '));
}

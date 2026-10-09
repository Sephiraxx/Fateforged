// Controllers before and after team-2.8 / team-3.8: a lineup with a controller against the same lineup with a damage
// dealer (and with a healer) in that slot, same squads and seeds, sides alternating. Writes validation/controller-tuning.json.
// node scripts/evaluate-controllers.mjs [games=80] [workers=4]
import fs from 'node:fs';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
const base=size=>size===3?['tank','healer']:['tank','healer','damage','damage'];
if(!isMainThread){
 const {squad}=await import('./team-fixtures.mjs'),{teamEngine}=await import('../public/combat-team.js');
 const {engine,size,games}=workerData,Engine=teamEngine(engine),row={engine,size,games};
 for(const other of ['damage','healer']){let wins=0,ctl=0,dps=0;
  for(let i=0;i<games;i++){const A=squad([...base(size),'controller'],i*7919+1),B=squad([...base(size),other],i*7919+2),swap=i%2,b=new Engine(swap?[B,A]:[A,B],61000+i,{headless:true});while(!b.done)b.step(1/60);const r=b.result();if(r.winnerTeam===(swap?1:0))wins++;
   for(const f of r.fighters){if(f.role==='controller')ctl+=f.damage+(f.objectiveDamage??0);if(other==='damage'&&f.role==='damage'&&f.team===(swap?0:1))dps+=f.damage+(f.objectiveDamage??0);}}
  row[other==='damage'?'vsDamage':'vsHealer']=Math.round(wins/games*1000)/10;if(other==='damage'){row.controllerOutput=Math.round(ctl/games);row.swappedDamageOutput=Math.round(dps/games);}}
 parentPort.postMessage(row);
}else{
 const games=Number(process.argv[2]??80),workers=Number(process.argv[3]??4),jobs=[];for(const engine of ['team-2.7','team-2.8','team-3.7','team-3.8'])for(const size of [3,5])jobs.push({engine,size,games});
 const rows=[];let next=0;await new Promise(done=>{let running=0;const start=()=>{if(next>=jobs.length){if(!running)done();return;}const job=jobs[next++];running++;const w=new Worker(new URL(import.meta.url),{workerData:job});w.on('message',row=>{rows.push(row);console.log(row);});w.on('exit',()=>{running--;start();});};for(let i=0;i<workers;i++)start();});
 rows.sort((a,b)=>a.engine.localeCompare(b.engine)||a.size-b.size);
 fs.writeFileSync('validation/controller-tuning.json',JSON.stringify({note:'A controller in place of a damage dealer (vsDamage) or a healer (vsHealer), identical squads and seeds, sides alternating. controllerOutput: the controller\'s damage to fighters plus objective damage per game; swappedDamageOutput: the same for all damage dealers of the other lineup combined (one in 3v3, three in 5v5).',rows},null,2)+'\n');
}

// Controllers and healers before and after team-2.8 / team-3.8, same squads and seeds, sides alternating:
// - a controller against a damage dealer (vsDamage) or a second healer (vsHealer) in the same slot;
// - one healer against a damage dealer in that slot (oneHealerVsDamage), and two healers against one healer and a
//   damage dealer (twoHealersVsHealerDamage).
// Writes validation/role-tuning.json. node scripts/evaluate-role-tuning.mjs [games=80] [workers=4]
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
 // Healers: one against a damage dealer, and a stacked second healer.
 const swapWin=(a,b)=>{let wins=0;for(let i=0;i<games;i++){const A=squad(a,i*7919+1),B=squad(b,i*7919+2),swap=i%2,x=new Engine(swap?[B,A]:[A,B],63000+i,{headless:true});while(!x.done)x.step(1/60);if(x.result().winnerTeam===(swap?1:0))wins++;}return Math.round(wins/games*1000)/10;};
 const rest=size===3?['tank','damage']:['tank','controller','damage','damage'],rest2=size===3?['tank']:['tank','controller','damage'];
 row.oneHealerVsDamage=swapWin([...rest,'healer'],[...rest,'damage']);row.twoHealersVsHealerDamage=swapWin([...rest2,'healer','healer'],[...rest2,'healer','damage']);
 parentPort.postMessage(row);
}else{
 const games=Number(process.argv[2]??80),workers=Number(process.argv[3]??4),jobs=[];for(const engine of ['team-2.7','team-2.8','team-3.7','team-3.8'])for(const size of [3,5])jobs.push({engine,size,games});
 const rows=[];let next=0;await new Promise(done=>{let running=0;const start=()=>{if(next>=jobs.length){if(!running)done();return;}const job=jobs[next++];running++;const w=new Worker(new URL(import.meta.url),{workerData:job});w.on('message',row=>{rows.push(row);console.log(row);});w.on('exit',()=>{running--;start();});};for(let i=0;i<workers;i++)start();});
 rows.sort((a,b)=>a.engine.localeCompare(b.engine)||a.size-b.size);
 fs.writeFileSync('validation/role-tuning.json',JSON.stringify({note:'A controller in place of a damage dealer (vsDamage) or a second healer (vsHealer); one healer in place of a damage dealer (oneHealerVsDamage); two healers in place of a healer and a damage dealer (twoHealersVsHealerDamage). Identical squads and seeds, sides alternating. controllerOutput: the controller\'s damage to fighters plus objective damage per game; swappedDamageOutput: the same for all damage dealers of the other lineup combined (one in 3v3, three in 5v5).',rows},null,2)+'\n');
}

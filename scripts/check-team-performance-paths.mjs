// The team simulation speed-ups change no outcome: every team engine still produces its recorded games, and the
// simulation pool hands queued tasks to whichever worker is free.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {TEAM_ENGINES} from '../public/combat-team.js';
import {createSimulationPool,poolSize,POOL_LIMIT} from '../public/simulation-client.js';

// 1. Recorded games for every engine.
const recorded=JSON.parse(fs.readFileSync('validation/team-engine-fingerprints.json','utf8'));
assert.deepEqual(Object.keys(recorded.fingerprints).map(k=>k.split(' ')[0]).filter((v,i,a)=>a.indexOf(v)===i).sort(),Object.keys(TEAM_ENGINES).sort(),'every team engine has recorded games');
for(const [label,expected]of Object.entries(recorded.fingerprints)){
 const [engine,comp]=label.split(' '),b=new TEAM_ENGINES[engine]([squad(COMPOSITIONS[comp],recorded.seed),squad(COMPOSITIONS[comp],recorded.seed+1)],recorded.seed,{headless:true,map:recorded.map,tactics:recorded.tactics,balance:recorded.balance});
 while(!b.done)b.step(1/60);
 assert.equal(createHash('sha256').update(JSON.stringify({r:b.result(),pos:b.fighters.map(f=>[f.x,f.y,f.hp])})).digest('hex').slice(0,24),expected,`${label} changed`);
}

// 2. The pool: one shared queue, at most one task per worker, never more workers than its size.
assert.equal(poolSize(1),1);assert.equal(poolSize(4),3);assert.equal(poolSize(64),POOL_LIMIT);
{const started=[];let busy=0,peak=0;
 globalThis.Worker=class{constructor(){started.push(this);this.inFlight=0;}postMessage(data){this.inFlight++;busy++;peak=Math.max(peak,busy);assert(this.inFlight===1,'one task per worker');const ms=data.ms;setTimeout(()=>{this.inFlight--;busy--;if(data.fail)this.onmessage({data:{id:data.dispatchId,error:'boom'}});else this.onmessage({data:{id:data.dispatchId,results:data.value}});},ms);}terminate(){}};
 const p=createSimulationPool(new URL('file:///worker.js'),{size:3}),tasks=[400,10,10,10,10,10,10,10,10,10].map((ms,i)=>p.simulate({ms,value:i}));
 const failed=p.simulate({ms:5,fail:true}).then(()=>false,e=>e.message==='boom');
 const t=Date.now(),values=await Promise.all(tasks);assert.deepEqual(values,[0,1,2,3,4,5,6,7,8,9]);assert(await failed,'a failed task rejects on its own');
 assert.equal(started.length,3);assert(peak<=3);assert(Date.now()-t<700,'short tasks run beside a long one instead of queueing behind it');
 const closed=p.simulate({ms:50,value:1});p.close();await assert.rejects(closed,/closed/);delete globalThis.Worker;}
console.log(`Team performance paths: ${Object.keys(recorded.fingerprints).length} recorded engine games unchanged and a shared-queue simulation pool passed.`);

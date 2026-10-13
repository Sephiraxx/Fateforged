// Reuse warm workers and spread independent tasks (league/cup series, audit games) across a pool. Tasks wait in one
// queue and each worker takes the next as soon as it is free, so a few long tasks never leave other workers idle.
// Games within a series stay ordered and use their original seeds, so results do not depend on the pool.
// Up to 15 workers, so a 16-thread CPU keeps one thread free for the page.
export const POOL_LIMIT=15;
// Headless Core siege games run on the Rust core (public/rust-core.js) unless the player turned it off.
export const NATIVE_CORE_KEY='fateforge-rust-core';
export function nativeCoreEnabled(){try{return globalThis.localStorage?.getItem(NATIVE_CORE_KEY)!=='off';}catch{return true;}}
export function setNativeCore(on){try{globalThis.localStorage?.setItem(NATIVE_CORE_KEY,on?'on':'off');}catch{}}
export function poolSize(cores=globalThis.navigator?.hardwareConcurrency||4){return Math.max(1,Math.min(POOL_LIMIT,cores-1));}
export function createSimulationPool(workerUrl=new URL('./league-sim-worker.js',import.meta.url),{size=poolSize()}={}){
 const lanes=[],queue=[];let serial=0;
 function start(slot){const worker=new Worker(workerUrl,{type:'module'});slot.worker=worker;
  worker.onmessage=({data})=>{const task=slot.task;if(!task||data.id!==task.id)return;slot.task=null;data.error?task.reject(Error(data.error)):task.resolve(data.results);pump();};
  worker.onerror=event=>{worker.terminate();slot.worker=null;const task=slot.task;slot.task=null;task?.reject(Error(event.message||'Simulation failed. Retry the unsaved series.'));pump();};
 }
 function pump(){
  while(queue.length){
   let slot=lanes.find(s=>!s.task);if(!slot){if(lanes.length>=size)return;slot={worker:null,task:null};lanes.push(slot);}
   if(!slot.worker)start(slot);const task=queue.shift();slot.task=task;
   try{slot.worker.postMessage({...task.input,dispatchId:task.id,nativeCore:nativeCoreEnabled()});}catch(error){slot.task=null;task.reject(error);}
  }
 }
 return {
  size,
  simulate(input){return new Promise((resolve,reject)=>{queue.push({id:++serial,input,resolve,reject});pump();});},
  close(){for(const task of queue.splice(0))task.reject(Error('Simulation closed.'));for(const slot of lanes){slot.worker?.terminate();slot.worker=null;slot.task?.reject(Error('Simulation closed.'));slot.task=null;}}
 };
}

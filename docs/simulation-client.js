// Reuse warm workers and spread independent league/cup series across a small
// pool. Games within a series stay ordered and use their original seeds.
export function createSimulationPool(workerUrl=new URL('./league-sim-worker.js',import.meta.url)){
 const lanes=[],limit=Math.min(4,Math.max(1,Math.floor((globalThis.navigator?.hardwareConcurrency||4)/2)));let serial=0,nextLane=0;
 function lane(index){return lanes[index]??= {worker:null,waiting:new Map()};}
 function start(slot){const worker=new Worker(workerUrl,{type:'module'});slot.worker=worker;
  worker.onmessage=({data})=>{const task=slot.waiting.get(data.id);if(!task)return;slot.waiting.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.results);};
  worker.onerror=event=>{worker.terminate();slot.worker=null;for(const task of slot.waiting.values())task.reject(Error(event.message||'Simulation failed. Retry the unsaved series.'));slot.waiting.clear();};
 }
 return {simulate(input){const slot=lane(nextLane++%limit);if(!slot.worker)start(slot);const dispatchId=++serial;return new Promise((resolve,reject)=>{slot.waiting.set(dispatchId,{resolve,reject});try{slot.worker.postMessage({...input,dispatchId});}catch(error){slot.waiting.delete(dispatchId);reject(error);}});},close(){for(const slot of lanes){slot.worker?.terminate();slot.worker=null;for(const task of slot.waiting.values())task.reject(Error('Simulation closed.'));slot.waiting.clear();}}};
}

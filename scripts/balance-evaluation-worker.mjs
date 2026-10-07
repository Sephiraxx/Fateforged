import {parentPort,workerData} from 'node:worker_threads';
import {simulateBalanceCandidate} from '../public/balance-sim-worker.js';
parentPort.on('message',job=>{try{parentPort.postMessage({id:job.id,result:simulateBalanceCandidate({...workerData,...job})});}catch(e){parentPort.postMessage({id:job.id,error:e.message});}});

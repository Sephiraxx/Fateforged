import {simulate} from './combat.js';
import {seriesComplete} from './series.js';
export function simulateLeagueSeries({match,a,b}){const results=[],score=[0,0];do{const r=simulate(a,b,(match.seed+results.length*65537)>>>0,{conditions:match.conditions});results.push(r);score[r.winner===a.id?0:1]++;}while(!seriesComplete(match,score,results.length,true));return results;}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=({data})=>{try{self.postMessage({id:data.match.id,results:simulateLeagueSeries(data)});}catch(e){self.postMessage({error:e.message});}};

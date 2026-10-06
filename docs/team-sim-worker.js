// Simulates one team-league series off the main thread. Results are compact and deterministic from the seeds.
import {simulateTeam} from './combat-team.js';
export function compactTeamResult(r){return {winnerTeam:r.winnerTeam,seconds:r.seconds,reason:r.reason,hp:r.hp,combatVersion:r.combatVersion,environment:r.environment,fighters:r.fighters.map(f=>({id:f.id,damage:f.damage,healing:f.healing,kills:f.kills,deaths:f.deaths,ccSeconds:f.ccSeconds}))};}
export function simulateTeamSeries({match,teams}){
 const need=Math.ceil(match.bestOf/2),games=[],score=[0,0];
 while(score[0]<need&&score[1]<need){const r=simulateTeam(teams,(match.seed+games.length*65537)>>>0,{conditions:match.conditions});games.push(compactTeamResult(r));score[r.winnerTeam]++;}
 return games;
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=({data})=>{try{self.postMessage({id:data.dispatchId,results:simulateTeamSeries(data)});}catch(e){self.postMessage({id:data.dispatchId,error:e.message});}};

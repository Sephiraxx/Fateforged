// Simulates one team-league series off the main thread. Results are compact and deterministic from the seeds.
import {seriesGameOptions,seriesScore} from './team-series.js';
import {simulateTeam} from './combat-team.js';
export function compactTeamResult(r){return {winnerTeam:r.winnerTeam,seconds:r.seconds,reason:r.reason,hp:r.hp,combatVersion:r.combatVersion,...(r.balanceId?{balanceId:r.balanceId}:{}),environment:r.environment,...(r.objective?{objective:{coreHp:r.objective.coreHp,monsterKills:r.objective.monsterKills,steals:r.objective.steals,forgefireSeconds:r.objective.forgefireSeconds,suddenDeath:r.objective.suddenDeath}}:{}),fighters:r.fighters.map(f=>({id:f.id,damage:f.damage,healing:f.healing,kills:f.kills,deaths:f.deaths,ccSeconds:f.ccSeconds,...(r.objective?{objectiveDamage:f.objectiveDamage,downSeconds:f.downSeconds,monsterLastHits:f.monsterLastHits}:{})}))};}
export function simulateTeamSeries({match,teams}){
 const need=Math.ceil(match.bestOf/2),games=structuredClone(match.completedGames??[]),score=seriesScore(games);
 while(score[0]<need&&score[1]<need){const plan=seriesGameOptions(match,games),all=new Map(teams.flat().map(f=>[f.id,f])),squads=plan.lineups.map(ids=>ids.map(id=>all.get(id))),r=simulateTeam(squads,(match.seed+games.length*65537)>>>0,{conditions:match.conditions,tactics:plan.tactics,engineVersion:match.engineVersion,balance:match.balance});games.push({...compactTeamResult(r),...plan});score[r.winnerTeam]++;}
 return games;
}
export function simulateTeamTask(data){return data.exhibition?simulateTeam(data.teams,data.seed,data.options):simulateTeamSeries(data);}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=({data})=>{try{self.postMessage({id:data.dispatchId,results:simulateTeamTask(data)});}catch(e){self.postMessage({id:data.dispatchId,error:e.message});}};

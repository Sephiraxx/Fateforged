import {validBestOf,seriesComplete,assertSeriesResult,drawAtTimeLimit} from './series.js';
import {normalizeConditions,conditionsFor} from './conditions.js';
import {normalizeFilters,matchesFilters} from './divisions.js';
import {random} from './combat.js';
import {simulationEngine,tournamentEngine} from './combat-engines.js';
export const FORMATS={single:'Single elimination',double:'Double elimination',swiss:'Swiss',groups:'Group stage'};
export const defaultStage=type=>({type,bestOf:1,rounds:type==='swiss'?5:3,groups:2,advance:4,...(type==='swiss'?{swissMode:'threshold'}:{})});
export const thresholdSwiss=(state,stage=state.stageIndex)=>state.stages[stage]?.type==='swiss'&&state.stages[stage].swissMode==='threshold';
const entry=()=>({points:0,wins:0,draws:0,losses:0,legWins:0,legLosses:0,byes:0,opponents:[]});
export function stageStandings(state,stage=state.stageIndex){
 const source=stage===state.stageIndex?state.runtime:state.stageResults[stage];
 if(!source)return null;
 const players=source.players||Object.keys(source.table),table=source.table;
 const rows=players.map(id=>({id,...table[id],buchholz:table[id].opponents.reduce((sum,x)=>sum+(table[x]?.points||0),0)})).sort((a,b)=>b.points-a.points||(b.legWins-b.legLosses)-(a.legWins-a.legLosses)||b.buchholz-a.buchholz||players.indexOf(a.id)-players.indexOf(b.id));
 return {rows,groups:(source.groups||[]).map((g,i)=>({number:i+1,rows:rows.filter(r=>g.includes(r.id))}))};
}
export function standings(state){const r=state.runtime;if(!r)return[];return r.players.map(id=>({id,...r.table[id],buchholz:r.table[id].opponents.reduce((sum,x)=>sum+(r.table[x]?.points||0),0)})).sort((a,b)=>b.points-a.points||(b.legWins-b.legLosses)-(a.legWins-a.legLosses)||b.buchholz-a.buchholz||r.players.indexOf(a.id)-r.players.indexOf(b.id));}
export function createTournament(name,roster,stages,seed=Date.now()>>>0,{shuffle=true,night=false,filters={},conditions}={}){if(roster.length<2)throw new Error('Choose at least two saved characters.');if(!stages.length)throw new Error('Add at least one stage.');const arenaConditions=normalizeConditions(conditions??{time:night?'night':'day'});const division=normalizeFilters(filters);if(roster.some(c=>!matchesFilters(c,division)))throw new Error('An entrant does not match the tournament filters.');const ids=roster.map(x=>x.id);if(new Set(ids).size!==ids.length)throw new Error('Each character can enter once.');for(const s of stages){if(!FORMATS[s.type]||(s.bestOf!==undefined?!validBestOf(s.bestOf):!Number.isInteger(s.legs)||s.legs<1||s.legs>101)||!Number.isInteger(s.rounds)||s.rounds<1||s.rounds>100||!Number.isSafeInteger(s.groups)||s.groups<1||!Number.isSafeInteger(s.advance)||s.advance<1)throw new Error('Check the stage settings.');}
 stages=structuredClone(stages).map(s=>s.type==='swiss'?{...s,swissMode:'threshold',rounds:5}:s);
 // Swiss qualifies a field; a final bracket supplies a single cup champion.
 if(stages.at(-1).type==='swiss'){if(stages.length>=16)throw Error('Leave room for a final championship bracket after Swiss.');stages.push(defaultStage('single'));}
 const players=[...ids];if(shuffle){const rng=random(seed);for(let i=players.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[players[i],players[j]]=[players[j],players[i]];}}
 const state={version:1,engineVersion:12,progressionVersion:2,scoringVersion:2,name,roster,filters:division,stages,seed,night:arenaConditions.time==='night',conditions:arenaConditions,stageIndex:0,nextId:1,history:[],stageResults:[],done:false,champion:null,runtime:null};startStage(state,players);return state;
}
function match(state,a,b,label){const c=state.stages[state.stageIndex],format=label.startsWith('Grand final')?{bestOf:5}:c.bestOf!==undefined?{bestOf:c.bestOf}:{legs:c.legs};return {engineVersion:tournamentEngine(state),id:state.nextId++,stage:state.stageIndex,round:state.runtime.round,a,b,label,...format,...(c.type==='groups'?{allowDraw:true}:{}),seed:(state.seed+state.nextId*104729)>>>0};}
function bye(state,id,label,points=false){const row=state.runtime.table[id];row.byes++;if(points){row.points+=3;if(thresholdSwiss(state))row.wins++;}const m=match(state,id,null,label);state.history.push({...m,winner:id,score:[0,0],results:[],bye:true});}
function startStage(state,players){const config=state.stages[state.stageIndex];state.runtime={players,table:Object.fromEntries(players.map(id=>[id,entry()])),pending:[],round:0,eliminated:[],groups:[],finalPlayed:false};if(config.type==='groups'){
 const count=Math.min(config.groups,Math.max(1,Math.floor(players.length/2)));const groups=Array.from({length:count},()=>[]);players.forEach((id,i)=>groups[i%count].push(id));state.runtime.groups=groups;
 for(let g=0;g<groups.length;g++){let ring=[...groups[g]];if(ring.length%2)ring.push(null);for(let round=1;round<ring.length;round++){state.runtime.round=round;for(let i=0;i<ring.length/2;i++){const a=ring[i],b=ring[ring.length-1-i];if(a&&b)state.runtime.pending.push(match(state,a,b,`Group ${g+1} · round ${round}`));}ring=[ring[0],ring.at(-1),...ring.slice(1,-1)];}}
 orderGroupMatches(state);
 }else nextRound(state);
}
function pairSwiss(state){const r=state.runtime;let ids=standings(state).filter(x=>!thresholdSwiss(state)||x.wins<3&&x.losses<3).map(x=>x.id);if(ids.length%2){let byeId=[...ids].reverse().sort((a,b)=>r.table[a].byes-r.table[b].byes)[0];ids=ids.filter(x=>x!==byeId);bye(state,byeId,`Swiss round ${r.round}`,true);}
 // Try a bounded backtracking pairing so greediness does not cause avoidable rematches.
 let visits=0;function pair(list){if(!list.length)return[];if(++visits>5000)return null;const a=list[0];const candidates=list.slice(1).filter(b=>!r.table[a].opponents.includes(b)).sort((b,c)=>Math.abs(r.table[a].points-r.table[b].points)-Math.abs(r.table[a].points-r.table[c].points));for(const b of candidates){const rest=pair(list.filter(x=>x!==a&&x!==b));if(rest)return[[a,b],...rest];}return null;}
 const clean=pair(ids);if(clean)return clean;const pairs=[];while(ids.length){const a=ids.shift();let i=ids.findIndex(b=>!r.table[a].opponents.includes(b));if(i<0)i=0;const [b]=ids.splice(i,1);pairs.push([a,b]);}return pairs;
}
function nextRound(state){const r=state.runtime,c=state.stages[state.stageIndex];r.round++;r.pending=[];
 if(c.type==='swiss'){
  if(thresholdSwiss(state)){
   const active=r.players.filter(id=>r.table[id].wins<3&&r.table[id].losses<3);
   if(!active.length)return finishSwiss(state);
   if(r.round>5)throw Error('Swiss qualification must resolve within five rounds.');
   for(const [a,b]of pairSwiss(state))r.pending.push(match(state,a,b,`Swiss round ${r.round}`));
   if(!r.pending.length)return nextRound(state);
  }else{if(r.round>c.rounds)return finishStage(state,standings(state).map(x=>x.id));for(const [a,b]of pairSwiss(state))r.pending.push(match(state,a,b,`Swiss round ${r.round}`));}
  return;
 }
 const alive=r.players.filter(id=>r.table[id].losses<(c.type==='double'?2:1));
 if(alive.length===1)return finishStage(state,[...alive,...r.eliminated.slice().reverse()]);
 if(c.type==='single'){const ids=alive;for(let i=0;i<ids.length;i+=2){if(ids[i+1])r.pending.push(match(state,ids[i],ids[i+1],alive.length===2?'Grand final':`Round ${r.round}`));else bye(state,ids[i],`Round ${r.round}`);}return;}
 const upper=alive.filter(id=>r.table[id].losses===0),lower=alive.filter(id=>r.table[id].losses===1);
 if(alive.length===2&&upper.length<=1){r.pending.push(match(state,alive[0],alive[1],r.finalPlayed?'Grand final reset':'Grand final'));r.finalPlayed=true;return;}
 for(const [ids,label]of [[upper,'Winners bracket'],[lower,'Losers bracket']]){const sorted=[...ids].sort((a,b)=>r.table[b].byes-r.table[a].byes||r.players.indexOf(a)-r.players.indexOf(b));for(let i=0;i<sorted.length;i+=2){if(sorted[i+1])r.pending.push(match(state,sorted[i],sorted[i+1],`${label} · round ${r.round}`));else bye(state,sorted[i],`${label} · round ${r.round}`);}}
}
function groupRanking(state){const ranks=standings(state),groups=state.runtime.groups.map(group=>ranks.filter(r=>group.includes(r.id)));const order=[];for(let position=0;position<Math.max(...groups.map(g=>g.length));position++){const tied=groups.map(g=>g[position]).filter(Boolean).sort((a,b)=>(b.points/(b.opponents.length||1))-(a.points/(a.opponents.length||1))||((b.legWins-b.legLosses)/(b.opponents.length||1))-((a.legWins-a.legLosses)/(a.opponents.length||1))||state.runtime.players.indexOf(a.id)-state.runtime.players.indexOf(b.id));order.push(...tied.map(x=>x.id));}return order;}
function finishSwiss(state){const ranked=standings(state),qualified=ranked.filter(r=>r.wins>=3).map(r=>r.id),eliminated=ranked.filter(r=>r.losses>=3).map(r=>r.id);return finishStage(state,[...qualified,...eliminated],qualified);}
function finishStage(state,ranking,qualified=null){const c=state.stages[state.stageIndex];state.stageResults.push({type:c.type,ranking,table:structuredClone(state.runtime.table),groups:state.runtime.groups,...(qualified?{qualified,eliminated:ranking.filter(id=>!qualified.includes(id))}:{})});if(state.stageIndex===state.stages.length-1||ranking.length<2){state.done=true;state.champion=ranking[0];state.runtime.pending=[];return;}
 const advancing=qualified||ranking.slice(0,Math.min(c.advance,ranking.length));if(advancing.length<2){state.done=true;state.champion=advancing[0];state.runtime.pending=[];return;}
 state.stageIndex++;startStage(state,advancing);
}
// Keep IDs and seeds intact, including when resuming older group-first queues.
// Include completed matches when assigning slots so a group's second match
// cannot jump ahead after its first match has been removed from the queue.
export function orderedGroupMatches(matches,groups){
 const groupFor=new Map(groups.flatMap((g,i)=>g.map(id=>[id,i])));
 const counts=new Map(),order=new Map();
 for(const m of [...matches].sort((a,b)=>a.id-b.id)){const group=groupFor.get(m.a),key=`${m.round}:${group}`,slot=counts.get(key)||0;counts.set(key,slot+1);order.set(m.id,{group,slot});}
 return [...matches].sort((a,b)=>a.round-b.round||order.get(a.id).slot-order.get(b.id).slot||order.get(a.id).group-order.get(b.id).group);
}
export function orderGroupMatches(state){
 if(state.done||state.stages[state.stageIndex].type!=='groups')return;
 const r=state.runtime,pending=new Set(r.pending.map(m=>m.id));
 r.pending=orderedGroupMatches([...state.history.filter(m=>m.stage===state.stageIndex),...r.pending],r.groups).filter(m=>pending.has(m.id));
 r.round=r.pending[0]?.round||r.round||1;
}
export function nextMatch(state){if(state.done)return null;orderGroupMatches(state);const type=state.stages[state.stageIndex].type;for(const row of Object.values(state.runtime.table))row.points=row.wins*3+row.draws+(type==='swiss'&&!thresholdSwiss(state)?row.byes*3:0);const m=state.runtime.pending[0]||null;if(m)m.engineVersion=tournamentEngine(state);if(m&&type==='groups')m.allowDraw=true;if(m&&m.b&&(['single','double'].includes(type))&&(m.label.startsWith('Grand final')||(type==='single'&&state.runtime.players.filter(id=>state.runtime.table[id].losses===0).length===2))){m.bestOf=5;delete m.legs;m.label=m.label.startsWith('Grand final')?m.label:'Grand final';}return m;}
export function recordMatch(state,m,results){if(results.some(r=>(r.combatVersion??1)!==tournamentEngine(state)))throw Error('Results must use this cup’s pinned combat engine.');state.engineVersion??=tournamentEngine(state);if(state.done||nextMatch(state)?.id!==m.id)throw new Error('This match is no longer next.');let a=results.filter(x=>x.winner===m.a).length,b=results.filter(x=>x.winner===m.b).length;const config=state.stages[state.stageIndex],knockout=['single','double'].includes(config.type)||thresholdSwiss(state);assertSeriesResult(m,results,m.a,m.b,knockout);const winner=a===b?null:a>b?m.a:m.b,loser=winner?(winner===m.a?m.b:m.a):null;const table=state.runtime.table;for(const [id,other,won,lost]of [[m.a,m.b,a,b],[m.b,m.a,b,a]]){const t=table[id];t.opponents.push(other);t.legWins+=won;t.legLosses+=lost;if(winner===id){t.wins++;t.points+=3;}else if(winner){t.losses++;}else{t.draws++;t.points++;}}
 if(['single','double'].includes(config.type)&&loser&&table[loser].losses>=(config.type==='double'?2:1))state.runtime.eliminated.push(loser);
 state.history.push({...m,results,score:[a,b],winner});state.runtime.pending.shift();if(config.type==='groups'&&state.runtime.pending.length)state.runtime.round=state.runtime.pending[0].round;if(!state.runtime.pending.length){if(config.type==='groups')finishStage(state,groupRanking(state));else nextRound(state);}return state;
}
export const legSeed=(match,index)=>(match.seed+index*65537)>>>0;
export function resolveMatch(state){const m=nextMatch(state);if(!m)return null;const {simulate}=simulationEngine(m.engineVersion??tournamentEngine(state));const a=state.roster.find(c=>c.id===m.a),b=state.roster.find(c=>c.id===m.b),results=[];let score=[0,0];const knockout=['single','double'].includes(state.stages[state.stageIndex].type)||thresholdSwiss(state);do{const result=drawAtTimeLimit(simulate(a,b,legSeed(m,results.length),{conditions:conditionsFor(state)}),m.allowDraw&&!knockout);results.push(result);if(result.winner!==null)score[result.winner===m.a?0:1]++;}while(!seriesComplete(m,score,results.length,knockout));recordMatch(state,m,results);return state.history.find(x=>x.id===m.id);}

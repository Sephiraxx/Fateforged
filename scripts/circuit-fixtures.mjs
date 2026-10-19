// Shared helpers for region circuit checks: roll pools and rookie classes from the shared plans, fake series whose
// results follow lineup strength (with a little seeded noise), and play stages, seasons and offseasons.
import {generation} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';

export const roll=(plan,seed,label='C')=>plan.map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`${label}${seed}-${i}`));
export const circuitPool=(format,regionSize,seed)=>roll(L.poolPlan(format,regionSize,seed),seed);
export function circuit({format=3,regionSize=6,seed=4242,battleMode='teamfight',id=crypto.randomUUID()}={}){return L.create({id,format,regionSize,seed,battleMode,fighters:circuitPool(format,regionSize,seed)});}
// A complete, valid series for a match description (L.upcoming): stronger lineups usually win.
export function fakeSeries(w,m){
 const need=Math.ceil(m.bestOf/2),games=[...(m.completedGames??[])],score=[0,0],str=m.lineups.map(ids=>ids.reduce((a,id)=>a+w.fighters[id].ovr,0)/ids.length);let n=m.seed;
 for(const g of games)score[g.winnerTeam]++;
 const objective=/^team-(3|4)/.test(m.engineVersion??'')&&m.engineVersion!=='team-3';
 while(score[0]<need&&score[1]<need){
  n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=(n%1000)/1000<1/(1+Math.exp(-(str[0]-str[1])/4))?0:1;score[winnerTeam]++;
  const hp=winnerTeam?[0,10+n%80]:[10+n%80,0],seconds=objective?120+n%200:30+n%60;
  games.push({winnerTeam,seconds,reason:'Team eliminated',hp,balanceId:m.balance?.id,combatVersion:m.engineVersion??'team-2',environment:{time:'day',weather:'clear',ground:'stone',map:'open'},
   ...(objective?{objective:{coreHp:hp,monsterKills:[0,0],steals:[0,0],forgefireSeconds:[0,0],suddenDeath:false}}:{}),
   fighters:m.lineups.flat().map((id,i)=>({id,damage:Math.round(w.fighters[id].ovr*8+(n>>>(i%8))%200),healing:(n>>>(i%5))%97,kills:(n>>>i%3)%3,deaths:n%2,ccSeconds:1.5,...(objective?{objectiveDamage:(n>>>i)%300,downSeconds:0,monsterLastHits:0}:{})}))});
 }
 return games;
}
// Plays every match of the current stage (stops when it ends and waits for advance, or the season completes).
export function playStage(w,series=fakeSeries){let guard=0;while(w.phase==='season'&&!w.awaiting){const batch=L.upcoming(w);if(!batch.length)throw new Error('No playable match in '+L.currentStage(w)?.key);for(const m of batch)L.recordMatch(w,m.id,series(w,m));if(++guard>500)throw new Error('Stage did not finish.');}return w;}
// Plays the whole season through Worlds, moving past each stage summary.
export function playSeason(w,series=fakeSeries,{onStage}={}){if(w.phase==='ready')L.startSeason(w);while(w.phase==='season'){playStage(w,series);if(w.awaiting){onStage?.(w);L.advance(w);}}return w;}
export function runOffseason(w,seed=w.season*977){L.startOffseason(w,roll(L.rookiePlan(w),seed,'R'));return w;}

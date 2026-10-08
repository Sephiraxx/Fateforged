// Shared by the worker, watched games and the authoritative league validator.
import {adaptGamePlan} from './team-game-plan.js';
export const SERIES_TACTICS=['balanced','protect-carry','focus-healer','aggressive','defensive'];
export function seriesScore(games=[]){return games.reduce((score,g)=>{score[g.winnerTeam]++;return score;},[0,0]);}
export function seriesTactics(match,games=[]){
 const initial=match.initialTactics??match.tactics,previous=games.at(-1),score=seriesScore(games);
 if(!previous||match.seriesRulesVersion!==2)return [...initial];
 return initial.map((base,side)=>{
  const last=previous.tactics?.[side]??base;
  if(side===match.userSide||previous.winnerTeam===side)return last;
  const style=match.coachStyles?.[side]??'balanced',behind=score[side]<score[1-side];
  if(style==='glass')return 'aggressive';
  if(style==='fortress')return last==='defensive'?'protect-carry':'defensive';
  if(style==='tactician')return last==='focus-healer'?'balanced':'focus-healer';
  if(style==='star')return behind?'focus-healer':'protect-carry';
  if(style==='bargain')return behind?'aggressive':'balanced';
  return last==='balanced'?'protect-carry':'balanced';
 });
}
// Core siege game plans (team-3.6+): winners keep theirs, the user keeps theirs, AI losers adjust one dial.
export function seriesGamePlans(match,games=[]){
 const initial=match.initialGamePlans??match.gamePlans;if(!initial)return null;const previous=games.at(-1);
 return initial.map((base,side)=>{const last=previous?.gamePlans?.[side]??base;return !previous||side===match.userSide||previous.winnerTeam===side?{...last}:adaptGamePlan(last,match.coachStyles?.[side],true);});
}
export function seriesGameOptions(match,games=[],choice=null){
 const tactics=seriesTactics(match,games),lineups=(games.at(-1)?.lineups??match.initialLineups??match.lineups).map(ids=>[...ids]),gamePlans=seriesGamePlans(match,games);
 if(choice&&match.userSide>=0){if(choice.lineup)lineups[match.userSide]=[...choice.lineup];if(choice.tactic)tactics[match.userSide]=choice.tactic;if(choice.gamePlan&&gamePlans)gamePlans[match.userSide]={...choice.gamePlan};}
 return {lineups,tactics,...(gamePlans?{gamePlans}:{})};
}

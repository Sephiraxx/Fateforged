// Shared by the worker, watched games and the authoritative league validator.
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
export function seriesGameOptions(match,games=[],choice=null){
 const tactics=seriesTactics(match,games),lineups=(games.at(-1)?.lineups??match.initialLineups??match.lineups).map(ids=>[...ids]);
 if(choice&&match.userSide>=0){if(choice.lineup)lineups[match.userSide]=[...choice.lineup];if(choice.tactic)tactics[match.userSide]=choice.tactic;}
 return {lineups,tactics};
}

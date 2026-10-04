export function summarizeChampionHistory(history){
 const ordered=[...history].sort((a,b)=>a.completedAt-b.completedAt||a.tournamentId.localeCompare(b.tournamentId));
 const cups=new Map(),records=new Map();
 for(const event of ordered){
  let cup=cups.get(event.divisionKey);if(!cup){cup={divisionKey:event.divisionKey,label:event.label,total:0,lastWinner:null,streak:0};cups.set(event.divisionKey,cup);}
  cup.total++;cup.streak=cup.lastWinner===event.characterId?cup.streak+1:1;cup.lastWinner=event.characterId;cup.lastTournamentId=event.tournamentId;
  const key=event.divisionKey+'|'+event.characterId;let record=records.get(key);
  if(!record){record={divisionKey:event.divisionKey,label:event.label,characterId:event.characterId,characterName:event.characterName,titles:0,currentStreak:0,bestStreak:0,lastWonAt:0};records.set(key,record);}
  record.characterName=event.characterName;record.titles++;record.bestStreak=Math.max(record.bestStreak,cup.streak);record.lastWonAt=event.completedAt;
 }
 for(const record of records.values()){const cup=cups.get(record.divisionKey);record.currentStreak=cup.lastWinner===record.characterId?cup.streak:0;}
 return {records:[...records.values()].sort((a,b)=>b.titles-a.titles||b.lastWonAt-a.lastWonAt||a.characterId.localeCompare(b.characterId)),divisions:[...cups.values()].sort((a,b)=>a.label.localeCompare(b.label))};
}

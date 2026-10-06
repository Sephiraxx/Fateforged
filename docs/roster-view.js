(function(root){
 const winRate=c=>c.matchRecord?.matches>0?100*c.matchRecord.wins/c.matchRecord.matches:null;
 const titles=(c,records=[])=>Math.max(Number.isInteger(c.championships)?c.championships:0,records.filter(r=>r.characterId===c.id).reduce((sum,r)=>sum+r.titles,0));
 function select(characters,{order='recent',minWinRate='',minTitles=''}={},records=[]){
  const rate=minWinRate===''?null:Number(minWinRate),minimum=minTitles===''?null:Number(minTitles);
  const result=characters.filter(c=>(rate===null||!Number.isFinite(rate)||(winRate(c)!==null&&winRate(c)>=rate))&&(minimum===null||!Number.isFinite(minimum)||titles(c,records)>=minimum));
  if(order==='highest'||order==='lowest')result.sort((a,b)=>(order==='highest'?-1:1)*((a.summary?.total||0)-(b.summary?.total||0)));
  if(order==='wins-high'||order==='wins-low')result.sort((a,b)=>{const x=winRate(a),y=winRate(b);return x===null?(y===null?0:1):y===null?-1:(order==='wins-high'?-1:1)*(x-y)||(b.matchRecord.matches-a.matchRecord.matches);});
  if(order==='titles-high'||order==='titles-low')result.sort((a,b)=>(order==='titles-high'?-1:1)*(titles(a,records)-titles(b,records)));
  return result;
 }
 const currentChampionText=(character,champions=[])=>{
  const labels=[...new Set(champions.filter(t=>t.divisionKey!=='latest'&&t.characterId===character.id).map(t=>t.label))];
  return labels.length?'👑 Current champion · '+labels.join(' · '):'';
 };
 const growthText=character=>{const g=character.summary?.growth;return g?`+${(g.bonus||[]).reduce((a,b)=>a+b,0)} previously earned points (retained)`:'';};
 function titleBreakdown(character,records=[]){
  return records.filter(r=>r.characterId===character.id&&r.divisionKey!=='latest'&&r.titles>0).sort((a,b)=>b.titles-a.titles||a.label.localeCompare(b.label));
 }
 function championshipDetails(character,records=[]){
  const details=document.createElement('details');details.className='fighter-trophies';
  const summary=document.createElement('summary');summary.textContent=`${titles(character,records)} championships won`;details.append(summary);
  const breakdown=titleBreakdown(character,records);
  for(const r of breakdown){const item=document.createElement('p');item.className='title-record';item.textContent=`${r.titles}× ${r.label}`;if(r.currentStreak>=2)item.textContent+=` · ${r.currentStreak} in a row 🔥`;details.append(item);}
  if(!breakdown.length){const empty=document.createElement('p');empty.className='muted';empty.textContent=titles(character,records)?'No competition breakdown is available for these older titles.':'No championships yet.';details.append(empty);}
  return details;
 }
 root.ROSTER_VIEW={winRate,titles,select,currentChampionText,growthText,titleBreakdown,championshipDetails};
})(globalThis);

if(typeof document!=='undefined'&&document.head){const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap';document.head.append(fonts);}

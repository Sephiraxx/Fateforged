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
 root.ROSTER_VIEW={winRate,titles,select,currentChampionText,growthText};
})(globalThis);

if(typeof document!=='undefined'&&document.head){const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap';document.head.append(fonts);}

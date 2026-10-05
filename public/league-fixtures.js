import {LEAGUES} from './leagues.js';

const shuffle=(items,seed)=>{const out=[...items],random=LEAGUES.rng(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
const entrant=id=>({id});
const slot=label=>({id:null,label});
const positions=(world,start,end)=>world.divisions.flatMap((_,division)=>LEAGUES.standings(world,division).slice(start,end).map(row=>row.id));

// Reconstruct the original seeded draw, then feed recorded winners forward.
// Unknown winners remain labelled slots; viewing a fixture never starts a cup.
function bracket(world,{key,title,phase,division,entrants,seed,target=1,note=''}){
 const players=shuffle(entrants,seed),size=2**Math.floor(Math.log2(players.length)),preliminary=players.length-size;
 const completed=new Map(world.history.filter(m=>m.phase===phase&&(phase!=='cups'||m.division===division)).map(m=>[m.id,m]));
 const next=LEAGUES.next(world),byes=preliminary?players.slice(preliminary*2):[],rounds=[];
 let pool=players,round=1,played=0;
 while(pool.length>target){
  const prelim=round===1&&preliminary>0,count=prelim?preliminary:pool.length/2;
  const pairs=Array.from({length:count},(_,i)=>[pool[i*2],pool[i*2+1]]),winners=prelim?[...byes]:[];
  const final=!prelim&&count===target,qualifier=phase.endsWith('-qualifier');
  const label=prelim?'Preliminary round':final?(qualifier?'Final qualifying round':'Grand final'):`Round of ${pool.length}`;
  const matches=pairs.map(([a,b],i)=>{
   const id=`s${world.season}:${phase}:${division}:${played++}`,result=completed.get(id);
   const fixture={id,a:result?entrant(result.a):a,b:result?entrant(result.b):b,result:result||null,bestOf:qualifier?3:final?5:world.settings.bestOf,status:result?'completed':next?.id===id?'next':a.id&&b.id?'upcoming':'waiting'};
   winners.push(result?entrant(result.winner):slot(`Winner of ${prelim?'preliminary':label.toLowerCase()} match ${i+1}`));
   return fixture;
  });
  rounds.push({number:round,label,matches});pool=winners;round++;
 }
 const cup=world.cupResults.find(c=>c.division===division&&(phase==='cups'||(c.competition||'interleague')===phase));
 const qualification=world.qualificationResults?.find(q=>q.competition===phase.replace('-qualifier',''));
 return {key,title,phase,division,note,entrants,rounds,byes,champion:cup?.champion||null,qualified:phase.endsWith('-qualifier')?qualification?.qualified||[]:[]};
}

export function leagueCupFixtures(world,division){return bracket(world,{key:`division-${division}`,title:LEAGUES.names[division]+' cup',phase:'cups',division,entrants:world.divisions[division].map(entrant),seed:world.seed^Math.imul(division+1,171)});}

export function interleagueFixtures(world){
 if(world.phase==='league')return {note:'Interleague draws unlock after the league season. Top two enter Crownfire Convergence; third/fourth contest its qualifier, and fifth/sixth contest Emberveil Challenge qualification.',cups:[]};
 if(world.version===1){
  if(world.qualifiers.length!==16)return {note:'This older season draws its interleague cup after all seven division cups finish.',cups:[]};
  return {note:'Original interleague format for this saved season.',cups:[bracket(world,{key:'interleague',title:'Interleague cup',phase:'interleague',division:7,entrants:world.qualifiers.map(c=>entrant(c.id)),seed:world.seed^913})]};
 }
 const automatic=LEAGUES.qualify(world).map(c=>entrant(c.id)),championsStage=world.qualificationResults?.find(q=>q.competition==='champions'),europaStage=world.qualificationResults?.find(q=>q.competition==='europa');
 const champions=world.qualifiers.length===16?world.qualifiers.map(c=>entrant(c.id)):[...automatic,...Array.from({length:2},(_,i)=>slot('Crownfire Convergence qualifier winner '+(i+1)))];
 const europa=world.europaQualifiers?.length===16?world.europaQualifiers.map(c=>entrant(c.id)):[...(championsStage?championsStage.eliminated.map(entrant):Array.from({length:12},(_,i)=>slot('Crownfire Convergence qualifier elimination '+(i+1)))),...(europaStage?europaStage.qualified.map(entrant):Array.from({length:4},(_,i)=>slot('Emberveil Challenge qualifier winner '+(i+1))))];
 return {note:'Your selected league’s fighters are highlighted. All rounds stay visible, including completed results, byes and future winner slots.',cups:[
  bracket(world,{key:'champions-qualifier',title:'Crownfire Convergence qualification',phase:'champions-qualifier',division:7,entrants:positions(world,2,4).map(entrant),seed:world.seed^713,target:2,note:'Third and fourth from each league · Bo3 · two qualify'}),
  bracket(world,{key:'champions',title:LEAGUES.cupNames.champions,phase:'champions',division:7,entrants:champions,seed:world.seed^913,note:'Top two from each league plus two qualification winners · 16 entrants'}),
  bracket(world,{key:'europa-qualifier',title:'Emberveil Challenge qualification',phase:'europa-qualifier',division:7,entrants:positions(world,4,6).map(entrant),seed:world.seed^1713,target:4,note:'Fifth and sixth from each league · Bo3 · four qualify'}),
  bracket(world,{key:'europa',title:LEAGUES.cupNames.europa,phase:'europa',division:8,entrants:europa,seed:world.seed^1913,note:'Twelve Crownfire Convergence qualifier eliminations plus four qualification winners · 16 entrants'})
 ]};
}

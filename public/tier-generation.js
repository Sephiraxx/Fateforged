// Tier-targeted generation shared by team features. It mirrors the server's rollTierCharacter (worker/index.js):
// weights tilt toward a total-score band and every candidate is a normal wheel roll, so stats are never altered.
// Options: forceClass pins the class wheel (role variety); untiltedAbilities keeps abilities and weakness on their
// natural odds so a healer still rolls healing magic. Phase 2 moves the server onto this module.
export const TIER_BANDS=Object.freeze({E:[0,349],D:[350,649],C:[650,999],B:[1000,1499],A:[1500,2099],S:[2100,2999],SS:[3000,Infinity]});
const START_TILT={E:-4,D:-2,C:0,B:2,A:4,S:7,SS:13};
const UNTILTED=new Set(['power','power2','weakness']);
const noPower=name=>!name||/^no (second )?(power|ability)$/i.test(String(name).trim());
export const tierOf=total=>Object.entries(TIER_BANDS).find(([,[lo,hi]])=>total>=lo&&total<=hi)?.[0]??'E';
export function traitStats(pools,traits){
 const raw=[0,0,0,0,0];
 for(const [id,name]of Object.entries(traits)){if(noPower(name))continue;const list=id==='subrace'?pools.subrace[traits.race]:id==='subclass'?pools.subclass[traits.class]:pools.base[id];const option=list?.find(o=>o.name===name);if(option)option.stats.forEach((n,i)=>raw[i]+=n);}
 return raw.map(v=>Math.max(0,v));
}
export function rollTier(pools,target,{luck,draw,forceClass=null,untiltedAbilities=false}={}){
 if(!luck)throw new Error('rollTier needs the wheel luck rules.');
 const base={...pools,base:{...pools.base}};
 if(forceClass){const option=pools.base.class.find(o=>o.name===forceClass);if(!option)throw new Error(`Unknown class: ${forceClass}`);base.base.class=[option];}
 const [lo,hi]=TIER_BANDS[target],aim=(lo+Math.min(hi,3500))/2;let tilt=START_TILT[target];
 for(let block=0;block<30;block++){
  const tilted={};
  for(const group of ['base','subrace','subclass'])tilted[group]=Object.fromEntries(Object.entries(base[group]).map(([key,list])=>{
   if(group==='base'&&untiltedAbilities&&UNTILTED.has(key))return [key,list];
   const scores=list.map(o=>o.stats.reduce((a,b)=>a+b,0)),min=Math.min(...scores),span=Math.max(...scores)-min||1;
   return [key,list.map((o,i)=>({...o,weight:Math.max(1,Math.round(10000*Math.exp(tilt*((scores[i]-min)/span-(tilt>0?1:0)))))}))];
  }));
  let sum=0;
  for(let attempt=0;attempt<100;attempt++){const rolled=luck.rollTraits({...base,...tilted},draw),total=traitStats(pools,rolled.traits).reduce((a,b)=>a+b,0);if(total>=lo&&total<=hi)return rolled;sum+=total;}
  tilt=Math.max(-24,Math.min(24,tilt+(aim-sum/100)/200));
 }
 throw new Error(`Could not roll a ${target}-tier fighter.`);
}
// A complete, unsaved fighter snapshot in the shape combat and team roles expect.
export function tierCharacter(pools,target,{luck,draw,id,name,forceClass,untiltedAbilities=true}={}){
 const rolled=rollTier(pools,target,{luck,draw,forceClass,untiltedAbilities}),stats=traitStats(pools,rolled.traits),total=stats.reduce((a,b)=>a+b,0);
 return {id,name:name??rolled.traits.race,traits:rolled.traits,summary:{generationVersion:luck.generationVersion??3,stats,total,tier:tierOf(total),wheelRarity:rolled.wheelRarity??'common',creationSource:'team'}};
}

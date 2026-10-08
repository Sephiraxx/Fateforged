// Tier-targeted generation shared by team features. It mirrors the server's rollTierCharacter (worker/index.js):
// weights tilt toward a total-score band and every candidate is a normal wheel roll, so stats are never altered.
// Options: forceClass pins the class wheel (role variety); untiltedAbilities keeps abilities and weakness on their
// natural odds so a healer still rolls healing magic. forceWeaponType keeps only weapons of one type (ranged, arcane
// or melee); requirePower keeps only the listed abilities on the first power wheel and rejects rolls without one;
// requirePower2 does the same for the second ability wheel.
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
const catalog=()=>globalThis.CURRENT_CLASS_ABILITIES??globalThis.CLASS_ABILITIES;
export function rollTier(pools,target,{luck,draw,forceClass=null,untiltedAbilities=false,forceWeaponType=null,requirePower=null,requirePower2=null}={}){
 if(!luck)throw new Error('rollTier needs the wheel luck rules.');
 const base={...pools,base:{...pools.base}};
 if(forceClass){const option=pools.base.class.find(o=>o.name===forceClass);if(!option)throw new Error(`Unknown class: ${forceClass}`);base.base.class=[option];}
 if(forceWeaponType){const list=pools.base.weapon.filter(o=>catalog().weaponType(o.name)===forceWeaponType);if(!list.length)throw new Error(`No ${forceWeaponType} weapons.`);base.base.weapon=list;}
 const required=requirePower&&new Set(requirePower);if(required)base.base.power=pools.base.power.filter(o=>required.has(catalog().abilityId(o.name)));
 const required2=requirePower2&&new Set(requirePower2);if(required2)base.base.power2=pools.base.power2.filter(o=>required2.has(catalog().abilityId(o.name)));
 const [lo,hi]=TIER_BANDS[target],aim=(lo+Math.min(hi,3500))/2;let tilt=START_TILT[target];
 for(let block=0;block<30;block++){
  const tilted={};
  for(const group of ['base','subrace','subclass'])tilted[group]=Object.fromEntries(Object.entries(base[group]).map(([key,list])=>{
   if(group==='base'&&untiltedAbilities&&UNTILTED.has(key))return [key,list];
   const scores=list.map(o=>o.stats.reduce((a,b)=>a+b,0)),min=Math.min(...scores),span=Math.max(...scores)-min||1;
   return [key,list.map((o,i)=>({...o,weight:Math.max(1,Math.round(10000*Math.exp(tilt*((scores[i]-min)/span-(tilt>0?1:0)))))}))];
  }));
  let sum=0;
  for(let attempt=0;attempt<100;attempt++){const rolled=luck.rollTraits({...base,...tilted},draw),total=traitStats(pools,rolled.traits).reduce((a,b)=>a+b,0);if(total>=lo&&total<=hi&&(!required||required.has(catalog().abilityId(rolled.traits.power)))&&(!required2||required2.has(catalog().abilityId(rolled.traits.power2))))return rolled;sum+=total;}
  tilt=Math.max(-24,Math.min(24,tilt+(aim-sum/100)/200));
 }
 throw new Error(`Could not roll a ${target}-tier fighter.`);
}
// A complete, unsaved fighter snapshot in the shape combat and team roles expect.
export function tierCharacter(pools,target,{luck,draw,id,name,forceClass,untiltedAbilities=true,forceWeaponType=null,requirePower=null,requirePower2=null}={}){
 const rolled=rollTier(pools,target,{luck,draw,forceClass,untiltedAbilities,forceWeaponType,requirePower,requirePower2}),stats=traitStats(pools,rolled.traits),total=stats.reduce((a,b)=>a+b,0);
 return {id,name:name??rolled.traits.race,traits:rolled.traits,summary:{generationVersion:luck.generationVersion??3,stats,total,tier:tierOf(total),wheelRarity:rolled.wheelRarity??'common',creationSource:'team'}};
}

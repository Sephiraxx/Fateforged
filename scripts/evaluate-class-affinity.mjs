// Report redistribution explicitly; a missing theme/rarity is not proof of 70/25/5.
import fs from 'node:fs';
import vm from 'node:vm';
import {LEAGUES} from '../public/leagues.js';
const context={crypto};vm.createContext(context);
for(const [file,key]of [['data','WHEEL_DATA'],['luck','WHEEL_LUCK']])vm.runInContext(fs.readFileSync('public/'+file+'.js','utf8')+';this.'+file+'='+key,context);
const D=context.data,L=context.luck,C=context.CLASS_ABILITIES,empty=n=>/^no (second )?power$/i.test(n),rng=LEAGUES.rng(20261203),draw=n=>Math.floor(rng()*n);
function fallbacks(traits,slot,rarity){
 const entries=D.base[slot].filter(o=>!empty(o.name)&&(slot!=='power2'||C.abilityId(o.name)!==C.abilityId(traits.power))&&C.compatible(C.definition(o.name),traits.weapon));
 const reference=L.legacy.biasOptions(C.referenceOptions.filter(o=>!empty(o.name)),rarity,slot),masses={};for(const o of reference){const r=C.definition(o.name).rarity;masses[r]=(masses[r]??0)+o.weight;}
 const referenceTotal=Object.values(masses).reduce((a,b)=>a+b,0),out={};
 for(const kind of ['spell','technique']){
  const groups=Object.groupBy(entries.filter(o=>C.definition(o.name).kind===kind),o=>C.definition(o.name).rarity),validMass=Object.keys(groups).reduce((n,r)=>n+masses[r],0);
  let theme=0;for(const [r,rows]of Object.entries(groups)){const present=new Set(rows.map(o=>C.bucket(C.definition(o.name),traits)));theme+=masses[r]/validMass*[.70,.25,.05].reduce((n,p,i)=>n+(present.has(i)?0:p),0);}
  out[kind]={rarityRedistribution:1-validMass/referenceTotal,themeRedistribution:theme,emptyDiscipline:validMass===0};
 }
 return out;
}
const classes=[];
for(const option of D.base.class){const pools=structuredClone(D);pools.base.class=[option];const row={class:option.name,rolls:120,abilityBuckets:[0,0,0],weaponBuckets:[0,0,0],filled:0,empty:0,fallbacks:{spell:{slots:0,rarityMass:0,themeMass:0,emptyDiscipline:0},technique:{slots:0,rarityMass:0,themeMass:0,emptyDiscipline:0}}};
 for(let i=0;i<row.rolls;i++){
  const roll=L.rollTraits(pools,draw),traits=roll.traits;row.weaponBuckets[C.bucket(C.weapons[traits.weapon],traits,true)]++;
  for(const slot of ['power','power2']){const a=C.definition(traits[slot]);if(a){row.filled++;row.abilityBuckets[C.bucket(a,traits)]++;}else row.empty++;
   for(const [kind,f]of Object.entries(fallbacks(traits,slot,roll.wheelRarity))){const total=row.fallbacks[kind];total.slots++;total.rarityMass+=f.rarityRedistribution;total.themeMass+=f.themeRedistribution;total.emptyDiscipline+=f.emptyDiscipline;}
  }
 }
 for(const total of Object.values(row.fallbacks)){total.meanRarityRedistribution=total.rarityMass/total.slots;total.meanThemeRedistribution=total.themeMass/total.slots;delete total.rarityMass;delete total.themeMass;}
 classes.push(row);
}
const report={seed:20261203,rolls:classes.reduce((n,c)=>n+c.rolls,0),meaning:'Bucket counts are observed outcomes. Redistribution values are mean probability mass over sampled slot contexts, separately for each discipline, not counts of sampled fallback events. They include duplicate exclusion and equipment filtering. A rarity fallback renormalizes compatible rarity groups; a theme fallback moves to the nearest populated bucket within its rarity.',classes};
fs.writeFileSync('validation/class-abilities/affinity.json',JSON.stringify(report,null,2)+'\n');
console.log('Reported observed affinity counts and expected redistribution for '+classes.length+' classes.');

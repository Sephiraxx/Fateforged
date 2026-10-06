'use strict';
const LEGACY_LUCK=(()=>{
 const tiers=Object.freeze([
  {id:'common',label:'Common',chance:50,boost:0},
  {id:'uncommon',label:'Uncommon',chance:25,boost:1.2},
  {id:'rare',label:'Rare',chance:15,boost:2.3},
  {id:'unique',label:'Unique',chance:6,boost:3.5},
  {id:'legendary',label:'Legendary',chance:3,boost:5.6},
  {id:'mythic',label:'Mythic',chance:1,boost:7.2}
 ].map(Object.freeze));
 const info=id=>tiers.find(t=>t.id===id)||tiers[0];
 const isNoPower=name=>/^no (second )?power$/i.test(String(name).trim());
 function randomIndex(n){if(!Number.isSafeInteger(n)||n<1)throw new Error('The wheel needs options.');const a=new Uint32Array(n>4294967296?2:1),range=a.length===2?9007199254740992:4294967296,limit=Math.floor(range/n)*n;let value;do{crypto.getRandomValues(a);value=a.length===2?(a[0]&2097151)*4294967296+a[1]:a[0];}while(value>=limit);return value%n;}
 function roll(draw=randomIndex){let ticket=draw(100);for(const tier of tiers){if(ticket<tier.chance)return tier.id;ticket-=tier.chance;}throw new Error('Invalid rarity roll.');}
 // Only effective roll weights change. The original stat arrays and editable pools stay intact.
 const generationVersion=2,slotFactors=Object.freeze({race:.65,subrace:.65,class:.65,subclass:.65,mastery:.75,weapon:0,weakness:0});
 function biasOptions(options,rarity,slot){const boost=['power','power2'].includes(slot)?Math.min(3,info(rarity).boost):info(rarity).boost*(slotFactors[slot]??1);if(!boost||options.length<2)return options;const score=o=>o.stats.reduce((sum,v)=>sum+v,0),scores=options.map(score).sort((a,b)=>a-b),positions=new Map();for(let i=0;i<scores.length;){let end=i+1;while(end<scores.length&&scores[end]===scores[i])end++;positions.set(scores[i],(i+end-1)/2/(scores.length-1));i=end;}return options.map(o=>({...o,weight:Math.max(1,Math.round(o.weight*100*2**((positions.get(score(o))-.5)*2*boost)))}));}
 function magicChance(points){points=Math.max(0,points);const steps=[[0,0],[3,10],[8,20],[15,30],[25,45],[40,60],[65,75],[95,85],[140,92],[200,96],[280,98],[400,99]];for(let i=1;i<steps.length;i++){const[x,y]=steps[i],[px,py]=steps[i-1];if(points<=x)return Math.round(py+(y-py)*(points-px)/(x-px));}return 99;}
 function powerOptions(list,slot,rarity,magicPoints,firstPower){const filtered=list.filter(o=>slot!=='power2'||isNoPower(o.name)||o.name!==firstPower),powers=biasOptions(filtered.filter(o=>!isNoPower(o.name)),rarity,slot),empty=filtered.filter(o=>isNoPower(o.name));if(!empty.length)empty.push({name:slot==='power'?'No power':'No second power',weight:12,stats:[0,0,0,0,0]});const chance=magicChance(magicPoints)*(slot==='power2'?8:10),powerWeight=powers.reduce((s,o)=>s+o.weight,0),emptyWeight=empty.reduce((s,o)=>s+o.weight,0);if(!powerWeight||!chance)return empty.map(o=>({...o,stats:[0,0,0,0,0]}));return [...powers.map(o=>({...o,weight:o.weight*chance*emptyWeight})),...empty.map(o=>({...o,weight:o.weight*(1000-chance)*powerWeight,stats:[0,0,0,0,0]}))].filter(o=>o.weight>0);}
 function pick(options,draw=randomIndex){let ticket=draw(options.reduce((s,o)=>s+o.weight,0));for(const option of options){if(ticket<option.weight)return option;ticket-=option.weight;}throw new Error('Invalid option roll.');}
 function rollTraits(pools,draw=randomIndex,forcedRarity){if(forcedRarity!==undefined&&!tiers.some(t=>t.id===forcedRarity))throw Error('Invalid wheel rarity.');const wheelRarity=forcedRarity??roll(draw),traits={};for(const id of ['race','subrace','class','subclass','strength','speed','durability','iq','magic','weapon','mastery','power','power2','weakness']){const list=id==='subrace'?pools.subrace[traits.race]:id==='subclass'?pools.subclass[traits.class]:pools.base[id];const points=pools.base.magic.find(o=>o.name===traits.magic)?.stats[4]||0,options=['power','power2'].includes(id)?powerOptions(list,id,wheelRarity,points,traits.power):biasOptions(list,wheelRarity,id);traits[id]=pick(options,draw).name;}return {wheelRarity,traits,generationVersion};}
 return Object.freeze({generationVersion,slotFactors,tiers,info,randomIndex,roll,biasOptions,magicChance,powerOptions,pick,rollTraits});
})();

// The same effective weights drive the visible wheel and every generation path.
const WHEEL_LUCK=(()=>{
 const legacy=LEGACY_LUCK,catalog=new Proxy({},{get:(_,key)=>globalThis.CLASS_ABILITIES?.[key]});
 const empty=name=>/^no (second )?(power|ability)$/i.test(String(name).trim());
 const masteryChance=name=>({Untrained:10,Beginner:30,Trained:50,Veteran:65,Expert:75,Master:85,Grandmaster:90,Legendary:95,'Perfect technique':98,'Combat omniscience':99}[name]??50);
 const kind=o=>catalog.definition(o.name)?.kind??'spell';
 const rarity=o=>catalog.definition(o.name)?.rarity??'Uncommon';
 const normalize=rows=>{const sum=rows.reduce((n,r)=>n+r.weight,0);return sum?rows.map(r=>({...r,weight:r.weight/sum})):[];};
 function thematic(rows,traits,weapon=false){
  if(catalog.profile(traits).neutral)return normalize(rows);const probabilities=weapon?[.80,.15,.05]:[.70,.25,.05],groups=[[],[],[]];
  for(const row of rows){const a=weapon?catalog.weapons[row.name]:catalog.definition(row.name);groups[a?catalog.bucket(a,traits,weapon):1].push(row);}
  const out=new Map();for(let i=0;i<3;i++){let target=i;if(!groups[target].length)target=[0,1,2].filter(n=>groups[n].length).sort((a,b)=>Math.abs(a-i)-Math.abs(b-i)||a-b)[0];if(target===undefined)continue;
   for(const row of normalize(groups[target].map(r=>({...r,weight:r.weight*(!weapon&&catalog.definition(r.name)?.tags.some(t=>catalog.profile(traits).specialty.includes(t))?2:1)}))))out.set(row.name,{...row,weight:(out.get(row.name)?.weight??0)+probabilities[i]*row.weight});
  }return [...out.values()];
 }
 function integerWeights(rows){return rows.filter(r=>r.weight>0).map(r=>({...r,weight:Math.max(1,Math.round(r.weight*10000000))}));}
 function compatible(o,traits){const a=catalog.definition(o.name);if(!a)return true;const type=catalog.weaponType(traits.weapon);return catalog.compatible(a,traits.weapon)&&!(a.id==='aimedShot'&&type!=='ranged')&&!(a.id==='cripplingStrike'&&type==='arcane');}
 function abilityOptions(list,slot,wheelRarity,points,firstPower,traits={}){
  const entries=list.filter(o=>!empty(o.name)&&(slot!=='power2'||catalog.abilityId(o.name)!==catalog.abilityId(firstPower))&&compatible(o,traits)),profile=catalog.profile(traits),factor=slot==='power2'?.8:1;
  const reference=legacy.biasOptions(catalog.referenceOptions.filter(o=>!empty(o.name)),wheelRarity,slot),rarityMass={};for(const o of reference)rarityMass[rarity(o)]=(rarityMass[rarity(o)]??0)+o.weight;
  const mixed=[];let success=0;for(const discipline of ['spell','technique']){
   const chance=(discipline==='spell'?profile.spellChance*legacy.magicChance(points):(1-profile.spellChance)*masteryChance(traits.mastery))*factor/100,options=legacy.biasOptions(entries.filter(o=>kind(o)===discipline),wheelRarity,slot),groups=Object.groupBy(options,rarity),mass=Object.keys(groups).reduce((n,r)=>n+(rarityMass[r]??1),0);
   if(!mass)continue;success+=chance;
   for(const [r,group]of Object.entries(groups))for(const row of thematic(group,traits))mixed.push({...row,weight:row.weight*chance*(rarityMass[r]??1)/mass});
  }
  let blanks=list.filter(o=>empty(o.name));if(!blanks.length)blanks=[{name:slot==='power2'?'No second power':'No power',weight:12,stats:[0,0,0,0,0]}];
  return integerWeights([...mixed,...normalize(blanks).map(o=>({...o,stats:[0,0,0,0,0],weight:o.weight*(1-success)}))]);
 }
 function optionsFor(pools,traits,slot,wheelRarity){const list=slot==='subrace'?pools.subrace[traits.race]:slot==='subclass'?pools.subclass[traits.class]:pools.base[slot];if(!list?.length)throw Error('Missing options for '+slot);
  if(['power','power2'].includes(slot)){const points=pools.base.magic.find(o=>o.name===traits.magic)?.stats[4]??0;return abilityOptions(list,slot,wheelRarity,points,traits.power,traits);}
  return slot==='weapon'?integerWeights(thematic(list,traits,true)):legacy.biasOptions(list,wheelRarity,slot);
 }
 function rollTraits(pools,draw=legacy.randomIndex,forcedRarity){if(forcedRarity!==undefined&&!legacy.tiers.some(t=>t.id===forcedRarity))throw Error('Invalid wheel rarity.');const wheelRarity=forcedRarity??legacy.roll(draw),traits={};
  for(const slot of ['race','subrace','class','subclass','strength','speed','durability','iq','magic','weapon','mastery','power','power2','weakness'])traits[slot]=legacy.pick(optionsFor(pools,traits,slot,wheelRarity),draw).name;
  return {wheelRarity,traits,generationVersion:3,classProfileVersion:catalog.version,abilityIds:['power','power2'].map(k=>catalog.abilityId(traits[k])),origin:'generated'};
 }
 return Object.freeze({...legacy,legacy,generationVersion:3,masteryChance,abilityOptions,optionsFor,rollTraits});
})();

'use strict';
const WHEEL_LUCK=(()=>{
 const tiers=Object.freeze([
  {id:'common',label:'Common',chance:50,boost:0},
  {id:'uncommon',label:'Uncommon',chance:25,boost:1.2},
  {id:'rare',label:'Rare',chance:15,boost:2.3},
  {id:'unique',label:'Unique',chance:6,boost:3.5},
  {id:'legendary',label:'Legendary',chance:3,boost:5},
  {id:'mythic',label:'Mythic',chance:1,boost:6.5}
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

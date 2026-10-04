const traitSlots=['power','power2','weakness'];
const emptyPower=name=>/^no (second )?power$/i.test(String(name).trim());
function chooseReplacement(options,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 if(!options.length)throw new Error('No replacement traits are available.');
 let ticket=random()*options.reduce((sum,o)=>sum+o.weight,0);
 for(const o of options){ticket-=o.weight;if(ticket<0)return o.name;}
 return options.at(-1).name;
}
// Saved official-name manifests distinguish retired game options from intentional custom options.
export function reconcileCharacter(input,catalog,random){
 const state=structuredClone(input),repairs=[];
 const official={powers:catalog.power.filter(o=>!emptyPower(o.name)).map(o=>o.name),weaknesses:catalog.weakness.map(o=>o.name)};
 const previous=state.catalog;
 for(const slot of traitSlots){
  const list=catalog[slot],names=new Set(list.map(o=>o.name));
  const oldOfficial=previous?.[slot==='weakness'?'weaknesses':'powers'];
  const retired=name=>!names.has(name)&&!emptyPower(name)&&(!oldOfficial||oldOfficial.includes(name));
  state.pools.base[slot]=state.pools.base[slot].filter(o=>!retired(o.name));
  const selected=state.traits[slot];
  if(selected&&retired(selected)){
   const other=slot==='power'?'power2':'power';
   const eligible=list.filter(o=>slot==='weakness'||!emptyPower(o.name)&&o.name!==state.traits[other]);
   const replacement=chooseReplacement(eligible,random);
   if(!state.pools.base[slot].some(o=>o.name===replacement)){
    // A retired saved selection frees its slot, even in a deliberately restricted custom wheel.
    state.pools.base[slot].push(structuredClone(list.find(o=>o.name===replacement)));
   }
   state.traits[slot]=replacement;repairs.push({slot,from:selected,to:replacement});
  }
  for(const o of list)if((!previous||!emptyPower(o.name)&&!oldOfficial.includes(o.name))&&state.pools.base[slot].length<200&&!state.pools.base[slot].some(saved=>saved.name===o.name))state.pools.base[slot].push(structuredClone(o));
 }
 state.catalog={version:1,...official};
 return {state,repairs,changed:JSON.stringify(state)!==JSON.stringify(input)};
}

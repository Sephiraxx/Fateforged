import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Battle,fighterProfile} from '../public/combat.js';
import {POWERS,WEAKNESSES,powerFor} from '../public/abilities-v11.js';
import {buildTraitDetails,traitContributions,STAT_KEYS} from '../public/trait-details.js';
const fighter={id:'a',name:'Test fighter',summary:{stats:[100,144,225,196,400],total:1065},traits:{race:'Human',weapon:'Poisoned dagger',power:'Singularity',power2:'Blood control',weakness:'Short power duration'}};
const enemy={...fighter,id:'b',name:'Opponent',traits:{weapon:'Longsword'}};
const number=(model,label)=>Number(model.rows.find(r=>r.label===label)?.value.match(/[\d,.]+/)?.[0].replaceAll(',',''));
const close=(a,b)=>assert(Math.abs(a-b)<.011,`${a} ≠ ${b}`);
for(const name of Object.keys(POWERS)){
 const c={...fighter,traits:{...fighter.traits,power:name}},model=buildTraitDetails(c,'power');
 assert(model.rows.length>=4,name+' must have specific mechanics');
 assert(model.rows.some(r=>!['Mana per cast','Shared cooldown','Casting'].includes(r.label)),name);
 assert(!JSON.stringify(model).match(/NaN|Infinity|undefined/),name);
 assert(model.notes.length>0);
 const battle=new Battle(c,enemy,123);battle.usePower(battle.fighters[0],battle.fighters[1],powerFor(name));
 if(name==='Singularity'){close(number(model,'Well duration'),battle.zones[0].life);close(number(model,'Damage per pulse'),battle.zones[0].damage*.5);close(number(model,'Pull strength'),battle.zones[0].pull);}
 if(name==='Chain lightning'){assert.equal(number(model,'Pulses'),battle.lightningPulses.length);close(number(model,'Damage per pulse'),battle.fighters[0].spell*.26);assert.deepEqual(battle.lightningPulses.map(p=>p.due),[0,.45,.9]);}
 if(['Blood control','Fire control','Ice control','Water control','Dream walking','Void manipulation'].includes(name)){close(number(model,'Hit damage'),battle.projectiles[0].damage);const durationLabel={'Blood control':'Bleed duration','Fire control':'Burn / flame duration','Ice control':'Chill duration','Dream walking':'Sleep duration','Void manipulation':'Power suppression'}[name];if(durationLabel)close(number(model,durationLabel),battle.projectiles[0].duration);}
 if(name==='Beast command'){close(number(model,'Lifetime'),battle.summons[0].life);close(number(model,'Bite damage'),battle.fighters[0].damage*.30);}
 if(name==='Summon spirits'){close(number(model,'Lifetime'),battle.summons[0].life);assert.equal(number(model,'Summons'),battle.summons.length);}
 if(name==='Force fields'){close(number(model,'Duration'),battle.fighters[0].wardTime);assert.equal(battle.fighters[0].wardHits,2);}
 if(name==='Gravity control'){close(number(model,'Zone duration'),battle.zones[0].life);assert.equal(number(model,'Direct damage'),0);}
}
for(const weakness of Object.keys(WEAKNESSES)){
 const model=buildTraitDetails({...fighter,traits:{...fighter.traits,weakness}},'weakness');assert(model.rows.length>0,weakness);assert(!JSON.stringify(model).match(/NaN|Infinity|undefined/));
}
for(const key of STAT_KEYS){assert(buildTraitDetails(fighter,key).rows.length>=4);}
const profile=fighterProfile(fighter);
close(number(buildTraitDetails(fighter,'DUR'),'Maximum health'),profile.maxHp);
close(number(buildTraitDetails(fighter,'MAG'),'Maximum mana'),profile.maxMana);
close(number(buildTraitDetails(fighter,'weapon'),'Damage per hit'),profile.damage);
const arcane={...fighter,traits:{...fighter.traits,weapon:'Staff'}};
close(number(buildTraitDetails(arcane,'weapon'),'Damage per hit'),fighterProfile(arcane).damage+profile.spell*.05);
const weakened={...fighter,traits:{...fighter.traits,weakness:'Power has a cooldown'}};
close(number(buildTraitDetails(weakened,'MAG'),'Shared power cooldown'),7/(1+profile.magic/70));
assert.equal(number(buildTraitDetails({...fighter,traits:{power:'No power'}},'power'),'Active effect'),NaN);
assert(buildTraitDetails({...fighter,traits:{power:'No power'}},'power').notes.some(n=>n.includes('no mana')));
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../public/data.js',import.meta.url),'utf8')+';this.pools=WHEEL_DATA',context);
const traits={race:'Human',subrace:'Northern',class:'Mage',weapon:'Longsword'};
const contributions=traitContributions({pools:context.pools,traits});assert.deepEqual([...contributions.race],[...context.pools.base.race.find(o=>o.name==='Human').stats]);
assert.deepEqual(traitContributions({pools:{base:{race:[]},subrace:{},subclass:{}},traits:{race:'Custom',subrace:'Common lineage'}}).subrace,[3,3,3,3,3]);
const race=buildTraitDetails({...fighter,traits},'race',{contributions});assert(race.rows.some(r=>r.label==='Rolled stat contribution'));assert(race.notes.some(n=>n.includes('no separate active')));
// A real shared renderer can navigate between traits, preserve exact values and
// close by button, Escape (native dialog), or outside the dialog rectangle.
class Element{constructor(){this.children=[];this.listeners={};this.textContent='';this.open=false;}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}addEventListener(k,v){this.listeners[k]=v}setAttribute(k,v){this[k]=v}showModal(){this.open=true}close(){this.open=false}getBoundingClientRect(){return{left:10,right:500,top:10,bottom:800}}}
const elements=new Map();for(const id of ['trait-details','trait-detail-picker','close-trait-details','trait-detail-category','trait-detail-title','trait-detail-intro','trait-detail-metrics','trait-detail-notes'])elements.set(id,new Element());
globalThis.document={getElementById:id=>elements.get(id),createElement:()=>new Element()};
const {openTraitDetails}=await import('../public/trait-detail-ui.js');openTraitDetails(fighter,'power');
assert(elements.get('trait-details').open);assert.equal(elements.get('trait-detail-title').textContent,'Singularity');
assert(elements.get('trait-detail-metrics').children.some(e=>e.children.some(x=>x.textContent==='28 units/s')));
const magicButton=elements.get('trait-detail-picker').children.find(b=>b.textContent==='MAG');magicButton.listeners.click();assert.equal(elements.get('trait-detail-title').textContent,'Magic');
elements.get('close-trait-details').listeners.click();assert(!elements.get('trait-details').open);
openTraitDetails(fighter,'power2');assert.equal(elements.get('trait-detail-title').textContent,'Blood control');
elements.get('trait-details').listeners.click({target:elements.get('trait-details'),clientX:0,clientY:0});assert(!elements.get('trait-details').open);
console.log('Trait details passed: all 50 powers, all 26 weaknesses, 5 stats, live engine damage/duration comparisons, weapon formulas, contributions, no-power slots and shared dialog navigation/closing.');

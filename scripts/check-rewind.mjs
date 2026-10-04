import assert from 'node:assert/strict';
import {Battle,simulate,REWIND_HEALTH_RECOVERY,REWIND_MANA_RECOVERY} from '../public/combat.js';
import {Battle as LegacyBattle,simulate as legacySimulate} from '../public/combat-v8.js';
import {powerFor,POWERS} from '../public/abilities.js';
import {buildTraitDetails} from '../public/trait-details.js';
const character=(id,power='Temporal rewind',weakness='None',weapon='Spellbook')=>({id,name:id,summary:{stats:[252,265,323,608,652]},traits:{weapon,power,power2:'No second power',weakness}});
const create=(weakness='None',Engine=Battle)=>new Engine(character('a','Temporal rewind',weakness),character('b','No power'),120);
const rewind=powerFor('Temporal rewind');
assert.equal(REWIND_HEALTH_RECOVERY,.6);assert.equal(REWIND_MANA_RECOVERY,.75);
// User's exact example; mana likewise restores a fraction of the lost amount.
const b=create(),f=b.fighters[0],t=b.fighters[1];f.hp=200;f.mana=100;f.x=100;f.y=150;b.usePower(f,t,rewind);assert.deepEqual(f.anchor,{hp:200,mana:100,x:100,y:150});
f.hp=100;f.mana=40;f.x=450;f.y=400;f.action={};for(const key of ['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul'])f[key]=5;
b.usePower(f,t,rewind);assert.equal(f.hp,160);assert.equal(f.mana,85);assert.equal(f.x,100);assert.equal(f.y,150);assert.equal(f.action,null);assert.equal(f.anchor,null);for(const key of ['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul'])assert.equal(f[key],0);
// An anchor is consumed and the next cast starts a fresh cycle.
b.usePower(f,t,rewind);assert.equal(f.anchor.hp,160);assert.equal(f.anchor.mana,85);
f.hp=190;f.mana=100;b.usePower(f,t,rewind);assert.equal(f.hp,190);assert.equal(f.mana,100);
for(const [weakness,deathMark,expected] of [['Slow recovery',0,130],['None',3,115],['Slow recovery',3,107.5]]){
 const b=create(weakness),f=b.fighters[0];f.hp=200;f.mana=100;b.usePower(f,b.fighters[1],rewind);f.hp=100;f.mana=40;f.deathMark=deathMark;b.usePower(f,b.fighters[1],rewind);assert.equal(f.hp,expected);assert.equal(f.mana,85);
}
// No recovery beyond the anchor, even when all anchored resources were lost.
const depleted=create(),a=depleted.fighters[0];a.hp=200;a.mana=100;depleted.usePower(a,depleted.fighters[1],rewind);a.hp=0;a.mana=0;depleted.usePower(a,depleted.fighters[1],rewind);assert.equal(a.hp,120);assert.equal(a.mana,75);
// Cast costs and snapshot timing are retained; recovery is partial, not free.
const paid=create(),caster=paid.fighters[0];caster.hp=200;caster.mana=100;caster.cast=0;paid.castPower(caster,paid.fighters[1]);assert.equal(caster.mana,75);assert.equal(caster.anchor.mana,91);
caster.hp=100;caster.mana=40;caster.cast=0;paid.castPower(caster,paid.fighters[1]);assert.equal(caster.hp,160);assert.equal(caster.mana,60);assert.equal(caster.anchor,null);
// Power copying applies the same recovery multipliers to the copying fighter.
const copied=new Battle(character('a','Power copying'),character('b'),120),copier=copied.fighters[0];copier.hp=200;copier.mana=100;copied.usePower(copier,copied.fighters[1],powerFor('Power copying'));copier.hp=100;copier.mana=40;copied.usePower(copier,copied.fighters[1],powerFor('Power copying'));assert.equal(copier.hp,160);assert.equal(copier.mana,85);
const old=create('None',LegacyBattle),oldF=old.fighters[0];oldF.hp=200;oldF.mana=100;old.usePower(oldF,old.fighters[1],rewind);oldF.hp=100;oldF.mana=40;old.usePower(oldF,old.fighters[1],rewind);assert.equal(oldF.hp,200);assert.equal(oldF.mana,100);old.done=true;old.winner=0;assert.equal(old.result().combatVersion,8);
const detail=buildTraitDetails(character('a'),'power');assert(detail.rows.some(r=>r.label==='Health recovered'&&r.value==='60% of health lost'));assert(detail.rows.some(r=>r.label==='Mana recovered'&&r.value==='75% of mana lost'));assert(detail.rows.some(r=>r.value==='200 → 100 → 160 HP'));
let unchanged=0;for(const power of Object.keys(POWERS).filter(p=>p!=='Temporal rewind'))for(const [i,weapon] of ['Battleaxe','Blowgun','Spellbook'].entries()){
 const a=character('a',power,'None',weapon),b=character('b','Power copying','None',weapon),seed=66501+i*701,options={conditions:{time:i?'night':'day',weather:i===1?'rain':'clear',ground:'stone'}};
 const current=simulate(a,b,seed,options),old=legacySimulate(a,b,seed,options);assert.equal(current.combatVersion,9);assert.equal(old.combatVersion,8);delete current.combatVersion;delete old.combatVersion;assert.deepEqual(current,old,power+' / '+weapon);unchanged++;
}
console.log(`Rewind checks passed: 200→100→160 HP, 75% missing-mana recovery, healing penalties, cast costs, anchor consumption, higher resources preserved, copying, details, frozen v8 recovery and ${unchanged} unchanged fights.`);

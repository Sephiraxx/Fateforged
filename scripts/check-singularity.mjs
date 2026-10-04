import assert from 'node:assert/strict';
import {Battle,simulate} from '../public/combat.js';
import {Battle as LegacyBattle,simulate as legacySimulate} from '../public/combat-v5.js';
import {Battle as FirstNerfBattle} from '../public/combat-v6.js';
import {Battle as BeforeScalingBattle} from '../public/combat-v7.js';
import {POWERS} from '../public/abilities.js';

const character=(id,power,weakness='None',weapon='Battleaxe')=>({id,name:id,summary:{stats:[169,165.5,147.5,167,164.5]},traits:{weapon,power,power2:'No second power',weakness}});
const battle=(Engine=Battle,power='Singularity',weakness='None',targetWeakness='None')=>new Engine(character('a',power,weakness),character('b','Singularity',targetWeakness),123,{conditions:{time:'day',weather:'clear',ground:'stone'}});
const field=b=>{b.usePower(b.fighters[0],b.fighters[1],b.fighters[0].powers[0]);return b.zones.at(-1);};
const current=battle(),z=field(current);
assert.equal(z.life,3);assert.equal(z.pull,28);assert.equal(z.damage,(12+current.fighters[0].magic*1.7)*.247);
let pulse;current.hit=(f,t,damage,type)=>pulse={damage,type};current.environmentStep(.5);
assert.deepEqual(pulse,{damage:((12+current.fighters[0].magic*1.7)*.247)*.5,type:'void'});
assert.equal(field(battle(Battle,'Singularity','short power duration')).life,3*.45);
assert.equal(field(battle(Battle,'Singularity','None','slow recovery')).life,4.5);
const copied=battle(Battle,'Power copying'),copiedField=field(copied);
assert.equal(copiedField.life,3);assert.equal(copiedField.pull,28);assert.equal(copiedField.damage,(12+copied.fighters[0].magic*1.7)*.247);
const beforeScaling=battle(BeforeScalingBattle),beforeScalingField=field(beforeScaling);assert.equal(beforeScalingField.damage,beforeScaling.fighters[0].spell*.247);
for(const magic of [0,25,164.5,356.5,1000]){const a=character('a','Singularity');a.summary.stats[4]=magic;const b=new Battle(a,character('b','No power'),123);const f=b.fighters[0],z=field(b);assert.equal(z.damage,(12+Math.sqrt(magic)*1.7)*.247);assert(z.damage<=f.spell*.247);assert.equal(f.spell,12+Math.sqrt(magic)*2.3);}
const firstNerf=battle(FirstNerfBattle),firstNerfField=field(firstNerf);assert.equal(firstNerfField.life,3);assert.equal(firstNerfField.pull,28);assert.equal(firstNerfField.damage,firstNerf.fighters[0].spell*.30);
const old=battle(LegacyBattle),oldField=field(old);
assert.equal(oldField.life,4);assert.equal(oldField.damage,old.fighters[0].spell*.38);
const pull=(Engine,power,flight=0)=>{const b=battle(Engine,power),z=field(b),t=b.fighters[1];z.x=300;z.y=300;t.x=340;t.y=300;t.flight=flight;b.environmentStep(.02);return t.x;};
assert.equal(pull(Battle,'Singularity'),340-.02*28);
assert.equal(pull(LegacyBattle,'Singularity'),340-.02*35);
assert.equal(pull(Battle,'Gravity control'),340-.02*35);
assert.equal(pull(Battle,'Singularity',1),340);
const expired=battle();field(expired);for(let i=0;i<61;i++)expired.environmentStep(.05);assert.equal(expired.zones.length,0);
let unchanged=0;
for(const power of Object.keys(POWERS).filter(p=>p!=='Singularity'&&p!=='Temporal rewind'))for(const [i,weapon]of ['Battleaxe','Blowgun','Spellbook'].entries()){
 const a=character('a',power,'None',weapon),b=character('b','Power copying','None',weapon),options={conditions:{time:i?'night':'day',weather:i===1?'rain':'clear',ground:'stone'}},seed=715001+i*701;
 const now=simulate(a,b,seed,options),old=legacySimulate(a,b,seed,options);
 assert.equal(now.combatVersion,9);assert.equal(old.combatVersion,5);
 delete now.combatVersion;delete old.combatVersion;assert.deepEqual(now,old,power+' / '+weapon);unchanged++;
}
console.log(`Singularity checks passed: duration, damage, pull, flight, weaknesses, copied powers, expiry, frozen v5 tuning, and ${unchanged} unchanged non-Singularity fights.`);

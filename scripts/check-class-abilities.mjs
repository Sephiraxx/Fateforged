import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {Battle,simulate,weaponFor} from '../public/combat-v12.js';
import {simulate as simulate11,weaponFor as weapon11} from '../public/combat-v11.js';
import {CATALOG,POWERS,powerFor} from '../public/abilities-v12.js';
import {buildTraitDetails} from '../public/trait-details.js';
import {LEAGUES} from '../public/leagues.js';
import {reconcileCharacter} from '../public/catalog-repair.js';
const context={crypto};vm.createContext(context);for(const [file,key]of [['luck','WHEEL_LUCK'],['data','WHEEL_DATA']])vm.runInContext(fs.readFileSync('public/'+file+'.js','utf8')+';this.'+file+'='+key,context);
const L=context.luck,D=context.data,C=context.CLASS_ABILITIES;
assert.equal(L.generationVersion,3);assert.equal(Object.keys(POWERS).length,64);assert.equal(Object.values(POWERS).filter(p=>p.kind==='technique').length,10);
for(const [file,hash]of Object.entries(JSON.parse(fs.readFileSync('validation/v11-engine-lock.json'))))assert.equal(createHash('sha256').update(fs.readFileSync('public/'+file,'utf8').replaceAll('\r\n','\n')).digest('hex'),hash,file);
for(const o of D.base.weapon)assert.deepEqual(Object.fromEntries(Object.entries(weaponFor(o.name)).filter(([k])=>!['tags','properties'].includes(k))),weapon11(o.name));
for(const o of D.base.class){assert(C.classes[o.name],o.name);for(const sub of D.subclass[o.name])assert(C.subclasses[o.name+'/'+sub.name]);}
const probability=(rows,filter)=>rows.filter(filter).reduce((n,o)=>n+o.weight,0)/rows.reduce((n,o)=>n+o.weight,0),blank=o=>/^no (second )?power$/i.test(o.name),near=(a,b)=>assert(Math.abs(a-b)<.00001,`${a} / ${b}`);
const warrior={class:'Warrior',subclass:'Knight',weapon:'Longsword',mastery:'Veteran',magic:'No magic'};
near(probability(L.abilityOptions(D.base.power,'power','common',0,null,warrior),o=>!blank(o)),.585);
near(probability(L.abilityOptions(D.base.power2,'power2','common',0,'Guard',warrior),o=>!blank(o)),.468);
for(const name of ['Driving strike','Charge','Parry','Cleave'])assert(!L.abilityOptions(D.base.power,'power','common',100,null,{...warrior,weapon:'Staff'}).some(o=>o.name===name));
assert(!L.abilityOptions(D.base.power,'power','common',100,null,{...warrior,weapon:'Custom wand'}).some(o=>o.name==='Cleave'));
assert(!L.abilityOptions(D.base.power,'power','mythic',100,null,{...warrior,weapon:'Staff'}).some(o=>o.name==='Perfect counter'));
assert(C.profile({class:'constructor'}).neutral);assert.equal(powerFor('constructor').id,'custom');
for(const name of ['Guard','guard','Thorn bolt']){assert.equal(powerFor(name,{summary:{generationVersion:2}}).id,'custom');assert.notEqual(powerFor(name,{summary:{generationVersion:3}}).id,'custom');}
assert.equal(C.abilityId('Guard'),C.abilityId('guard'));assert.equal(C.abilityId('Custom spell'),'custom:custom spell');assert.equal(C.abilityId('No second power'),null);
assert(!L.abilityOptions([...D.base.power,{name:'guard',weight:20,stats:[0,0,0,0,0]}],'power2','common',100,'Guard',warrior).some(o=>C.abilityId(o.name)==='guard'));
{const input={version:1,generationVersion:2,traits:{power:'Guard',power2:'No second power',weakness:'None'},pools:{base:structuredClone(D.base)},catalog:{version:1,powers:['Fire control'],weaknesses:D.base.weakness.map(o=>o.name)}};const repaired=reconcileCharacter(input,D.base,()=>0).state;assert.equal(repaired.traits.power,'Guard');assert(!repaired.catalog.powers.includes('Guard'));assert.equal(reconcileCharacter(repaired,D.base,()=>0).state.traits.power,'Guard');}
const mage={class:'Mage',subclass:'Arcanist',weapon:'Staff',mastery:'Veteran'};
const spellWeights=L.abilityOptions(D.base.power,'power','rare',65,null,mage).filter(o=>C.definition(o.name)?.kind==='spell');
const reference=L.legacy.biasOptions(C.referenceOptions.filter(o=>!blank(o)),'rare','power');
for(const rarity of ['Common','Uncommon','Rare','Legendary'])near(probability(spellWeights,o=>C.definition(o.name).rarity===rarity),probability(reference,o=>C.definition(o.name).rarity===rarity));
for(const traits of [mage,{...warrior,subclass:'Guardian'},{class:'Druid',subclass:'Wildkeeper'}]){const rows=L.optionsFor(D,traits,'weapon','mythic');for(let i=0;i<3;i++)near(probability(rows,o=>C.bucket(C.weapons[o.name],traits,true)===i),[.8,.15,.05][i]);}
const random=LEAGUES.rng(20261203),draw=n=>Math.floor(random()*n),perClass=[];
for(const o of D.base.class){const pools=structuredClone(D);pools.base.class=[o];let filled=0,techniques=0;for(let i=0;i<120;i++){const roll=L.rollTraits(pools,draw);assert.equal(roll.traits.class,o.name);assert.equal(roll.classProfileVersion,1);assert.notEqual(roll.traits.power,roll.traits.power2);for(const k of ['power','power2']){const a=C.definition(roll.traits[k]);if(!a)continue;filled++;techniques+=a.kind==='technique';assert(C.compatible(a,roll.traits.weapon));if(a.id==='aimedShot')assert.equal(C.weaponType(roll.traits.weapon),'ranged');if(a.id==='cripplingStrike')assert.notEqual(C.weaponType(roll.traits.weapon),'arcane');}assert.deepEqual(Array.from(roll.abilityIds),['power','power2'].map(k=>C.abilityId(roll.traits[k])));}perClass.push({class:o.name,rolls:120,filled,techniques});}
const character=(id,power='Guard',weapon='Longsword',weakness='None',power2='No second power')=>({id,name:id,traits:{weapon,power,power2,weakness},summary:{stats:[300,300,300,300,300]}});
{const legacy=character('old','Guard');legacy.summary.generationVersion=2;assert.equal(new Battle(legacy,character('new')).fighters[0].powers[0].id,'custom');assert(buildTraitDetails(legacy,'power').category.includes('Custom spell'));}
{const roster=Array.from({length:164},(_,i)=>({...character('legacy-'+i,'No power'),summary:{stats:[300,300,300,300,300],total:1500,wheelRarity:'common'}})),world=LEAGUES.create('legacy-transition',roster,3);world.engineVersion=11;world.generationVersion=2;world.phase='complete';const recruits=LEAGUES.recruitIntake(world).map((wheelRarity,i)=>({...roster[i],id:'recruit-'+i,summary:{...roster[i].summary,wheelRarity,generationVersion:3}})),{archive,world:next}=LEAGUES.rollover(world,recruits);assert(next.roster.filter(c=>c.id.startsWith('legacy')).every(c=>c.summary.generationVersion===2));assert(archive.roster.every(c=>c.summary.generationVersion===undefined));assert.equal(world.roster[0].summary.generationVersion,undefined);}
const fight=(power='Guard',weapon='Longsword',weakness='None')=>{const b=new Battle(character('a',power,weapon,weakness),character('b','No power'));Object.assign(b.fighters[0],{x:200,y:300,angle:0,facing:0,cast:0,cooldown:0});Object.assign(b.fighters[1],{x:230,y:300,facing:Math.PI,angle:Math.PI});b.rng=()=>0;return b;};
// Every known weapon × technique must agree with real combat eligibility,
// given a suitable threat, distance, health and resource state.
for(const weapon of D.base.weapon)for(const a of Object.values(POWERS).filter(p=>p.kind==='technique')){const b=fight(a.name,weapon.name),[f,t]=b.fighters;f.hp=f.maxHp*.2;t.action={type:'melee',elapsed:0,windup:.20};if(a.id==='charge')t.x=f.x+Math.max(90,f.weapon.range+20);const usable=b.powerUtility(f,t,f.powers[0])>=0;assert.equal(usable,C.compatible(C.definition(a.name),weapon.name),weapon.name+' / '+a.name);}
// Techniques pay stamina, ignore magical suppression and respect reserve/action locks.
{const b=fight('Driving strike','Longsword','Silenced casting'),[f,t]=b.fighters;f.suppressed=2;const mana=f.mana,energy=f.energy;b.castPower(f,t);assert.equal(f.mana,mana);assert.equal(f.energy,energy-12);assert.equal(f.cast,4.2);const hp=t.hp;b.updateAttack(f,t,.21);assert(t.hp<hp);}
{const b=fight('Driving strike'),[f,t]=b.fighters;f.energy=23;b.castPower(f,t);assert.equal(f.castCount,0);f.energy=24;f.sleep=1;b.castPower(f,t);assert.equal(f.castCount,0);}
for(const block of ['ward','future','dodge']){const b=fight('Entangling roots'),[f,t]=b.fighters;if(block==='ward')t.wardHits=1;if(block==='future')t.foreseen=1;if(block==='dodge')b.rng=()=>1;b.hitContext={payload:'roots',duration:1.2};b.hurt(t,f,20,'arcane',true);b.hitContext=null;assert.equal(t.root,0);}
{const b=fight('Entangling roots'),[f,t]=b.fighters;t.roll=.2;b.applyImpact('roots',f,t,1,1.2);assert.equal(t.root,1.2);assert.equal(t.roll,0);t.cast=0;t.powers=[powerFor('Healing touch')];t.hp=t.maxHp*.5;b.castPower(t,f);assert.equal(t.castCount,1);}
{const b=fight('Entangling roots'),[f,t]=b.fighters;t.flight=1;b.applyImpact('roots',f,t,1,1.2);assert.equal(t.root,0);}
// Guard consumes only a connected hit; parry/counter prevent payloads.
{const b=fight(),[f,t]=b.fighters;t.guardReady=true;t.guardTime=1.2;b.rng=()=>1;b.hurt(t,f,100,'physical',true);assert(t.guardReady);b.rng=()=>0;b.hurt(t,f,100,'physical',true);assert(!t.guardReady);}
for(const perfect of [false,true]){const b=fight(),[f,t]=b.fighters;t[perfect?'perfectTime':'parryTime']=.65;const hp=t.hp;b.hurt(t,f,100,'physical',true);assert.equal(t.hp,hp);assert.equal(t.counterScale,perfect?1.35:.55);assert.equal(t.counterTime,1.5);}
{const b=fight(),[f,t]=b.fighters;t.parryTime=.65;t.facing=0;const hp=t.hp;b.hurt(t,f,100,'physical',true);assert(t.hp<hp);}
{const b=fight('Charge'),[f,t]=b.fighters;t.x=295;b.obstacles=[{x:245,y:300,radius:18,life:4}];assert.equal(b.powerUtility(f,t,f.powers[0]),-1);b.obstacles=[];b.castPower(f,t);const energy=f.energy;for(let i=0;i<20;i++){b.moveFighter(f,t,.02);b.updateAttack(f,t,.02);}assert(f.x<=290);assert.equal(f.energy,energy);assert(t.hp<t.maxHp);}
{const b=fight('Second wind'),[f,t]=b.fighters;f.hp=f.maxHp*.4;b.castPower(f,t);const hp=f.hp;for(let i=0;i<60;i++)b.environmentStep(.05);near(f.hp-hp,f.maxHp*.1);f.cast=0;f.action=null;assert.equal(b.powerUtility(f,t,f.powers[0]),-1);}
{const b=fight('Last stand'),[f,t]=b.fighters;f.hp=f.maxHp*.2;b.castPower(f,t);assert(f.lastStandUsed);f.cast=0;f.action=null;assert.equal(b.powerUtility(f,t,f.powers[0]),-1);}
{const b=fight('Parry'),[f,t]=b.fighters;f.disarmed=2;t.action={type:'melee',elapsed:0,windup:.3};assert.equal(b.powerUtility(f,t,f.powers[0]),-1);f.parryTime=.65;f.facing=0;t.x=230;const hp=f.hp;b.hurt(f,t,100,'physical',true);assert(f.hp<hp);}
{const b=fight('Charge','Longsword','Cannot harm the innocent'),[f,t]=b.fighters;t.x=295;b.wisps=[{x:265,y:300,hp:24}];assert.equal(b.powerUtility(f,t,f.powers[0]),-1);}
{const b=fight('Flight'),[f,t]=b.fighters;f.root=1;b.usePower(f,t,f.powers[0]);assert.equal(f.root,0);}
{const b=fight('Phoenix rebirth'),[f]=b.fighters;f.crippled=2;f.hp=0;f.phoenixArmed=true;b.rebirth(f);assert.equal(f.crippled,0);}
{const b=fight('Power copying'),[f,t]=b.fighters;t.powers=[powerFor('Last stand')];const choice=b.copyChoice(f,t);assert(choice.weapon);t.powers=[powerFor('Thorn bolt')];f.mana=9;assert.equal(b.copyChoice(f,t).power.id,'thornBolt');b.castPower(f,t);assert.equal(f.mana,0);assert.equal(b.projectiles.at(-1).payload,'thornBolt');}
{const b=fight('Seedburst'),[f,t]=b.fighters;b.castPower(f,t);t.x=500;const hp=t.hp;b.time=.69;b.environmentStep(.02);assert.equal(t.hp,hp);}
// All new ability tooltips identify kind/resource without developer status banners.
for(const o of C.newOptions){const c=character('a',o.name,o.name==='Aimed shot'?'Longbow':'Longsword'),details=buildTraitDetails(c,'power');assert(details.category.includes(C.definition(o.name).kind));assert(details.rows.some(r=>r.label===(C.definition(o.name).kind==='technique'?'Stamina per use':'Mana per cast')));}
for(const f of ['public','docs'].flatMap(dir=>fs.readdirSync(dir).filter(name=>/\.(html|js)$/.test(name)).map(name=>dir+'/'+name))){const text=fs.readFileSync(f,'utf8');assert(!/Combat v\d+ · recruit generation|careers eligible after this season|five total retirements at rollover|career retirement enabled/.test(text),f);}
for(let seed=1;seed<=24;seed++){const a=character('a',C.newOptions[seed%14].name,seed%2?'Longsword':'Longbow'),b=character('b',C.newOptions[(seed+5)%14].name,'Quarterstaff');const watched=new Battle(a,b,seed);while(!watched.done)watched.step();assert.deepEqual(watched.result(),simulate(a,b,seed,{headless:true}));assert.equal(simulate11(character('old-a','Fire control'),character('old-b','Ice control'),seed,{headless:true}).combatVersion,11);}
fs.mkdirSync('validation/class-abilities',{recursive:true});fs.writeFileSync('validation/class-abilities/checks.json',JSON.stringify({classes:perClass,rolls:perClass.length*120,abilities:64,checks:'All class/subclass profiles; deterministic metadata; rarity/affinity odds; compatible equipment; separate resources; root counterplay; timed counters; healing/one-use limits; copied spells; seedburst escape; watched/quick parity; frozen v11 files; prohibited UI text absent'},null,2)+'\n');
console.log('Class abilities passed: '+perClass.length+' classes, '+perClass.length*120+' rolls, 64 ability definitions, combat counterplay and frozen v11.');

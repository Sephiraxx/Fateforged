import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TeamBattle,teamEngine} from '../public/combat-team.js';
import {Battle as LegacyDuel} from '../public/combat-v12.js';
import {Battle as DuelBattle} from '../public/combat-v13.js';
import {SUPPORT_ABILITIES,powerFor} from '../public/abilities-v13.js';
import {roleFighter,seededRandom} from '../public/team-generation.js';
import {overall,prepareSupportRules} from '../public/team-league.js';
import {buildTraitDetails} from '../public/trait-details.js';
const context=vm.createContext({});
for(const file of ['class-abilities.js','support-catalog.js','data.js','luck-v4.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),context);
vm.runInContext('this.pools=supportPools(WHEEL_DATA);this.luck=WHEEL_LUCK;',context);
const pools=context.pools,luck=context.luck;
for(const p of Object.values(SUPPORT_ABILITIES)){
 const traits={class:p.kind==='spell'?'Healer':'Warrior',subclass:p.kind==='spell'?'Field medic':'',weapon:p.id==='disarmShot'?'Longbow':'Longsword',mastery:'Master',magic:'Limitless magic',power:'No power'};
 for(const slot of ['power','power2'])assert(luck.optionsFor(pools,traits,slot,'common').some(o=>o.name===p.name&&o.weight>0),p.name+' should be rollable in '+slot);
 traits.power=p.name;assert(!luck.optionsFor(pools,traits,'power2','common').some(o=>o.name===p.name),'A second slot cannot repeat '+p.name);
 const rolled={name:'Details',traits:{...traits,power:p.name},summary:{generationVersion:4,stats:[100,100,100,100,100]}};
 assert(buildTraitDetails(rolled,'power').rows.some(r=>r.label==='Ability cooldown'));
 assert.equal(powerFor(p.name,{summary:{generationVersion:3}}).id,'custom','Old custom-name collisions retain their original meaning.');
}
const samples=[];
for(const role of ['tank','healer','controller','damage'])for(let i=0;i<40;i++){
 const f=roleFighter(pools,luck,{role,tier:i%4?'A':'S',random:seededRandom(i+4000),id:role+i});
 assert.equal(f.summary.generationVersion,4);assert(!Object.hasOwn(f,'teamKit'));
 assert(!Object.hasOwn(f.traits,'teamKit'));assert.notEqual(f.traits.power,f.traits.power2);
 assert.equal(overall(f),overall({...f,teamKit:'resurrection'}),'An extra kit cannot inflate OVR.');samples.push(f);
}
assert(samples.some(f=>supportAbilityName(f.traits.power)||supportAbilityName(f.traits.power2)),'Fresh rosters should actually obtain the new options.');
assert(samples.filter(f=>overall(f)===99).length<=1,'Ordinary A/S recruits should not saturate the rating ceiling.');
function supportAbilityName(name){return Object.hasOwn(SUPPORT_ABILITIES,name);}
const fighter=(id,power='No power',slot='power',weapon='Longsword')=>({id,name:id,traits:{class:'Warrior',weapon,mastery:'Master',power:'No power',power2:'No second power',weakness:'None',[slot]:power},summary:{generationVersion:4,stats:[200,200,200,200,200],total:1000,tier:'B'}});
function fixture(p,slot){
 const caster=fighter('caster',p.name,slot,p.id==='disarmShot'?'Longbow':'Longsword'),ally=fighter('ally'),foe=fighter('foe'),other=fighter('other');
 const b=new TeamBattle([[caster,ally],[foe,other]],911,{headless:true,map:'open'});b.obstacles=[];
 for(const f of b.fighters)Object.assign(f,{x:f.team?320:250,y:300,move:0,mana:100,maxMana:100,energy:100,maxEnergy:100,cast:999,cooldown:999,hp:f.maxHp*.6,crit:0,dodge:0,accuracy:1,retarget:999,target:f.team?0:2});
 const [f,a,t]=b.fighters;f.cast=0;
 if(p.id==='cleanse')a.root=2;
 if(p.id==='resurrection'){a.hp=0;a.downed=true;a.deaths=1;}
 return {b,f,a,t};
}
for(const p of Object.values(SUPPORT_ABILITIES))for(const slot of ['power','power2']){
 const {b,f,a,t}=fixture(p,slot),hp=b.fighters.map(f=>f.hp),mana=f.mana,energy=f.energy;
 b.castPower(f,t);assert.equal(f.action?.type,'supportAbility',p.name+' in '+slot);assert.equal(f.action.power.id,p.id);assert.equal(f.teamKit,null);
 assert.equal(p.kind==='spell'?mana-f.mana:energy-f.energy,p.cost);assert.equal(p.kind==='spell'?energy-f.energy:mana-f.mana,0);
 b.updateAttack(f,t,p.windup);assert.equal(f.action,null);
 if(p.id==='mendingWave'||p.id==='chainHeal')assert(b.fighters.slice(0,2).every((x,i)=>x.hp>hp[i]));
 if(p.id==='resurrection'){assert.equal(a.hp,a.maxHp*.4);assert.equal(a.deaths,1);a.hp=0;assert.equal(b.supportTargets(f,p,t).length,0);assert.equal(b.supportTargets(b.fighters[1],p,t).length,0);}
 if(p.id==='cleanse')assert.equal(a.root,0);
 if(p.id==='barrier')assert(b.fighters.slice(0,2).every(x=>x.wardHits===1));
 if(p.id==='hamstring')assert(t.slow>0);
 if(p.id==='tauntShout')assert(t.tauntTime>0);
 if(p.id==='knockUp')assert(t.kitStun>0);
 if(p.id==='stunBolt'||p.id==='disarmShot'){assert.equal(b.projectiles.length,1);for(let i=0;i<45;i++)b.step(1/60);assert(b.fighters.slice(2).some(x=>p.id==='stunBolt'?x.kitStun>0:x.disarmed>0),'The control projectile must actually connect.');}
 f.cast=0;assert.equal(b.powerUtility(f,t,p),-1,'Own cooldown remains after the shared cooldown ends.');
}
const resurrection=fixture(SUPPORT_ABILITIES.Resurrection,'power');resurrection.b.castPower(resurrection.f,resurrection.t);resurrection.f.stagger=.1;resurrection.b.updateAttack(resurrection.f,resurrection.t,3);assert.equal(resurrection.a.hp,0);assert.equal(resurrection.f.action,null);
// An area healer must approach injured teammates when the normal rear slot is
// beyond its spell radius; an unavailable spell must not pull it forward.
const wave=fixture(SUPPORT_ABILITIES['Mending wave'],'power');
wave.f.x=100;wave.a.x=280;wave.t.x=500;wave.f.hp=wave.f.maxHp;wave.b.updatePlans();
const anchor=wave.b.healerAnchor(wave.f,wave.t);assert(Math.hypot(anchor.x-wave.a.x,anchor.y-wave.a.y)<=110);
wave.f.suppressed=1;const retreat=wave.b.healerAnchor(wave.f,wave.t);assert.notDeepEqual(retreat,anchor);
wave.f.suppressed=0;wave.f.weakness='loses power in daylight';wave.b.night=false;assert.deepEqual(wave.b.healerAnchor(wave.f,wave.t),retreat);
// Objective respawns must not reset the one-use resurrection restriction.
const core=new (teamEngine('team-3.1'))([[fighter('reviver','Resurrection'),fighter('fallen'),fighter('friend')],[fighter('enemy1'),fighter('enemy2'),fighter('enemy3')]],81,{headless:true,map:'open'});
const [reviver,fallen]=core.combatants;core.obstacles=[];reviver.mana=reviver.maxMana=100;reviver.cast=0;fallen.x=reviver.x+30;fallen.y=reviver.y;fallen.hp=0;fallen.downed=true;fallen.respawnAt=10;
core.castPower(reviver,core.combatants[3]);assert.equal(reviver.action?.power.id,'resurrection');core.updateAttack(reviver,core.combatants[3],3);
assert.equal(fallen.respawnAt,null);assert.equal(fallen.supportRevived,true);assert.equal(reviver.supportReviveSpent,true);
core.respawn(fallen);core.respawn(reviver);fallen.hp=0;assert.equal(core.supportTargets(reviver,SUPPORT_ABILITIES.Resurrection,core.combatants[3]).length,0);while(!core.done)core.step(1/60);assert.equal(core.result().combatVersion,'team-3.1');
const archer=fighter('archer'),enemy=fighter('enemy'),normal=new TeamBattle([[{...archer,teamKit:'stunBolt'}],[enemy]],81,{headless:true}),legacy=new (teamEngine('team-2.2'))([[{...archer,teamKit:'stunBolt'}],[enemy]],81,{headless:true});
assert.equal(normal.fighters[0].teamKit,null);assert.equal(legacy.fighters[0].teamKit,'stunBolt');
const old={...archer,teamKit:'stunBolt',role:'damage',ovr:99,salary:14},w={fighters:{archer:old},settings:{battleMode:'teamfight'},teamEngine:'team-2.3'};const traits=structuredClone(old.traits);prepareSupportRules(w);assert(!Object.hasOwn(old,'teamKit'));assert.equal(old.legacyTeamKit,'stunBolt');assert.equal(old.salary,14,'Existing contracts are unchanged until offseason');assert.deepEqual(old.traits,traits);assert.equal(w.teamEngine,'team-2.6');const once=structuredClone(w);prepareSupportRules(w);assert.deepEqual(w,once);
const partial={fighters:{archer:{...old,teamKit:'stunBolt'}},pendingSeries:{games:[{}]},settings:{battleMode:'teamfight'},teamEngine:'team-2.3'};prepareSupportRules(partial);assert.equal(partial.teamEngine,'team-2.3');assert.equal(partial.fighters.archer.teamKit,'stunBolt');
for(const name of ['Mending wave','Stun bolt','Hamstring','Disarm shot']){const a=fighter('a',name,'power',name==='Disarm shot'?'Longbow':'Longsword'),b=fighter('b'),fight=new DuelBattle(a,b,17,{headless:true});while(!fight.done)fight.step(1/60);assert.equal(fight.result().combatVersion,13);}
const report={fighters:samples.length,newSupportRolls:samples.filter(f=>supportAbilityName(f.traits.power)||supportAbilityName(f.traits.power2)).length,ratings:Object.fromEntries(['tank','healer','controller','damage'].map(role=>{const values=samples.filter(f=>f.id.startsWith(role)).map(f=>overall(f));return [role,{minimum:Math.min(...values),maximum:Math.max(...values),mean:Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10,maxed:values.filter(x=>x===99).length}];}))};
fs.writeFileSync('validation/rolled-support.json',JSON.stringify(report,null,2)+'\n');
console.log('Rolled support passed: ten abilities in either ordinary slot, class/equipment odds, duplicate exclusion, no extra kit, effect delivery, resources/cooldowns, interruption, legacy meanings, migration, ratings and duel execution.');console.log(JSON.stringify(report));

// With no new ability, the new duel engine retains the original fight exactly.
for(let seed=1;seed<=12;seed++){
 const a={...fighter('baseline-a','Fire control'),summary:{generationVersion:3,stats:[100,225,144,196,256]}},b={...fighter('baseline-b','Healing touch'),summary:{generationVersion:3,stats:[144,100,225,256,196]}};
 const run=Engine=>{const battle=new Engine(a,b,seed,{headless:true});while(!battle.done)battle.step(1/60);const {combatVersion,...r}=battle.result();return r;};assert.deepEqual(run(DuelBattle),run(LegacyDuel));
}
console.log('Baseline parity passed: twelve frozen v12 fights retain exactly the same outcomes under v13 when no new ability is equipped.');

// Both normal saves and team-pool commands validate generation 4 from the same
// canonical wheels; no client supplied third ability or rating is accepted.
const {DatabaseSync}=await import('node:sqlite'),worker=(await import('../dist/server/index.js')).default,L=await import('../public/team-league.js'),{createTournament,defaultStage}=await import('../public/tournaments.js');
const db=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=async(path,method='GET',body)=>{const r=await worker.fetch(new Request('https://fateforge.test/api/'+path,{method,headers:{'oai-authenticated-user-id':'support-test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,...await r.json()};};
const seed=128,plan=L.poolPlan(3,8,seed),pool=plan.map((slot,i)=>{const random=seededRandom(seed+i);return roleFighter(pools,luck,{role:slot.role,tier:slot.tier,random,id:crypto.randomUUID(),name:()=>`F${i}`});});
const rolled=pool.find(f=>supportAbilityName(f.traits.power)||supportAbilityName(f.traits.power2));assert(rolled);
const save={name:rolled.name,state:{version:1,generationVersion:4,wheelRarity:rolled.summary.wheelRarity,traits:rolled.traits,pools}};
const saved=await call('characters/'+rolled.id,'PUT',save);assert.equal(saved.status,200,saved.error);assert.equal(saved.character.summary.generationVersion,4);
const loaded=(await call('characters/'+rolled.id)).character;assert.deepEqual(loaded.state.traits,{...rolled.traits});
const cup=createTournament('Support cup',[rolled,pool.find(f=>f.id!==rolled.id)],[defaultStage('single')],17,{shuffle:false});
cup.engineVersion=12;
assert.equal((await call('tournaments/'+crypto.randomUUID(),'PUT',{name:cup.name,state:cup})).status,400,'Old cups cannot accept new support abilities.');
const wire=pool.map(f=>({id:f.id,name:f.name,traits:f.traits,summary:{generationVersion:4,wheelRarity:f.summary.wheelRarity}})),start={action:'start',format:3,revision:0,operationId:crypto.randomUUID(),worldId:crypto.randomUUID(),teams:8,seed,fighters:wire};
const extra=structuredClone(start);extra.operationId=crypto.randomUUID();extra.fighters[0].teamKit='stunBolt';assert.equal((await call('teams','POST',extra)).status,400);
let reply=await call('teams','POST',start);assert.equal(reply.status,200,reply.error);assert(Object.values(reply.world.fighters).every(f=>f.summary.generationVersion===4&&!Object.hasOwn(f,'teamKit')));
const legacyWorld=structuredClone(reply.world);delete legacyWorld.supportRulesVersion;legacyWorld.engine='team-2.3';for(const f of Object.values(legacyWorld.fighters)){f.teamKit='stunBolt';f.ovr=99;delete f.ratingVersion;}const beforeTraits=Object.fromEntries(Object.entries(legacyWorld.fighters).map(([id,f])=>[id,f.traits]));
db.prepare('UPDATE team_worlds SET state_json=? WHERE format=3').run(JSON.stringify(legacyWorld));
reply=await call('teams?format=3');assert.equal(reply.status,200,reply.error);assert.equal(reply.world.supportRulesVersion,1);assert(Object.values(reply.world.fighters).every(f=>!Object.hasOwn(f,'teamKit')&&f.legacyTeamKit==='stunBolt'));assert.deepEqual(Object.fromEntries(Object.entries(reply.world.fighters).map(([id,f])=>[id,f.traits])),beforeTraits);
reply=await call('teams','POST',{action:'draft',format:3,revision:reply.revision,operationId:crypto.randomUUID(),count:1});assert.equal(reply.status,200,reply.error);assert.equal((await call('teams?format=3')).world.supportRulesVersion,1);
console.log('Support API integration passed: generation-4 character save/reload, pinned-cup rejection, validated fresh pools, rejected extra kits and persisted existing-roster conversion without changing rolls.');

// Role tuning (team-2.8 / team-3.8): controllers get more damage, faster cooldowns and longer effects; healers a little
// more health, cheaper casts and faster cooldowns. Only those roles change; determinism; the recorded measurements.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {CONTROLLER_RULES,CONTROLLER_SIEGE_RULES,HEALER_RULES,HEALER_SIEGE_RULES} from '../public/role-tuning.js';
import {ROLE_OUTPUT} from '../public/role-output-combat.js';

const teams=()=>[squad(COMPOSITIONS.balanced5,7101),squad(COMPOSITIONS.balanced5,7102)];
const setup=version=>{const b=new (teamEngine(version))(teams(),33,{headless:true,map:'open'});b.obstacles=[];const f=b.fighters.find(x=>x.team===0&&x.role==='controller'),t=b.fighters.find(x=>x.team===1&&x.role==='damage');t.x=f.x+40;t.y=f.y;for(const a of b.fighters)if(a!==t&&a.team===1){a.x=900;a.y=40+a.index*20;}return {b,f,t};};
const dealt=(version,role='controller')=>{const {b,t}=setup(version),f=b.fighters.find(x=>x.team===0&&x.role===role);const before=f.damageDone;b.hurt(t,f,60,'physical',false);return f.damageDone-before;};

// 1. Damage: controllers only, relative to the previous engine.
for(const [now,before,rules]of [['team-2.8','team-2.7',CONTROLLER_RULES],['team-3.8','team-3.7',CONTROLLER_SIEGE_RULES]]){
 assert(Math.abs(dealt(now)/dealt(before)-rules.damage/ROLE_OUTPUT.controller)<1e-9,`${now} controller damage`);
 for(const role of ['damage','healer','tank'])assert.equal(dealt(now,role),dealt(before,role),`${now} ${role} damage is unchanged`);
}
// Core siege: controllers hit Cores at the objective rate.
{const make=v=>{const b=new (teamEngine(v))([squad(COMPOSITIONS.balanced3,51),squad(COMPOSITIONS.control3,52)],51,{headless:true,map:'open'});const f=b.combatants.find(x=>x.role==='controller');return {b,f,core:b.cores[1-f.team]};};
 const hit=v=>{const {b,f,core}=make(v),hp=core.hp;b.hurt(core,f,100,'physical',false);return hp-core.hp;};assert(Math.abs(hit('team-3.8')/hit('team-3.7')-CONTROLLER_SIEGE_RULES.objective/ROLE_OUTPUT.controller)<1e-9,'controller Core damage');}
// Core siege: healers hit Cores at HEALER_SIEGE_RULES.objective of a damage dealer; classic healers are unchanged there.
{const hit=(v,role)=>{const b=new (teamEngine(v))([squad(COMPOSITIONS.balanced3,51),squad(COMPOSITIONS.balanced3,52)],51,{headless:true,map:'open'}),f=b.combatants.find(x=>x.role===role),core=b.cores[1-f.team],hp=core.hp;b.hurt(core,f,100,'physical',false);return hp-core.hp;};
 assert(Math.abs(hit('team-3.8','healer')/hit('team-3.7','healer')-HEALER_SIEGE_RULES.objective/ROLE_OUTPUT.healer)<1e-9,'healer Core damage');assert.equal(hit('team-3.8','damage'),hit('team-3.7','damage'));
 const {b,t}=setup('team-3.8'),h=b.fighters.find(x=>x.team===0&&x.role==='healer'),before=h.damageDone;b.hurt(t,h,60,'physical',false);const {b:old,t:t0}=setup('team-3.7'),h0=old.fighters.find(x=>x.team===0&&x.role==='healer'),before0=h0.damageDone;old.hurt(t0,h0,60,'physical',false);assert.equal(h.damageDone-before,h0.damageDone-before0,'healer damage to fighters is unchanged');}

// 2. Cooldowns tick faster for controllers only; effects last longer.
for(const [version,rules]of [['team-2.8',CONTROLLER_RULES],['team-3.8',CONTROLLER_SIEGE_RULES]]){
 const {b,f,t}=setup(version),other=b.fighters.find(x=>x.team===0&&x.role==='damage');f.cast=other.cast=f.kitCooldown=other.kitCooldown=3;b.upkeep(f,1);b.upkeep(other,1);
 assert(Math.abs((3-f.cast)-(rules.cooldown-1))<1e-9,`${version} cast cooldown`);assert(Math.abs((3-f.kitCooldown)-rules.cooldown)<1e-9,`${version} kit cooldown`);assert.equal(other.cast,3);assert.equal(other.kitCooldown,2);
 const untuned=Object.getPrototypeOf(Object.getPrototypeOf(b));assert(Math.abs(b.duration(f,t,2)/untuned.duration.call(b,f,t,2)-rules.duration)<1e-9,`${version} effect duration`);assert.equal(b.duration(f,f,2),untuned.duration.call(b,f,f,2),'own buffs are unchanged');assert.equal(b.duration(other,t,2),untuned.duration.call(b,other,t,2),'other roles are unchanged');
 t.ccImmune=0;t.sleep=0;assert(b.kitControl(f,t,'stunBolt',1));assert(Math.abs(t.kitStun-rules.duration)<1e-9,`${version} kit stun`);
}
assert(CONTROLLER_RULES.damage<1&&CONTROLLER_SIEGE_RULES.damage<1,'controllers still deal less than a damage dealer to fighters');

// 2b. Core siege healers: a little more health, part of every cast refunded, faster cooldowns; other roles unchanged.
// Classic teamfight healers are untouched (more sustain made classic games time out).
{const make=v=>new (teamEngine(v))(teams(),33,{headless:true,map:'open'}),a=make('team-2.8'),b=make('team-2.7'),h=a.fighters.find(f=>f.role==='healer');
 assert.deepEqual(a.fighters.map(f=>f.maxHp),b.fighters.map(f=>f.maxHp),'classic health unchanged');h.mana=50;a.healerSpend(h,()=>{h.mana-=20;});assert.equal(h.mana,30,'classic healers pay full price');h.cast=3;a.upkeep(h,1);assert.equal(h.cast,3,'classic healer cooldowns unchanged');}
for(const [now,before]of [['team-3.8','team-3.7']]){
 const make=v=>new (teamEngine(v))(teams(),33,{headless:true,map:'open'}),a=make(now),b=make(before),healers=x=>(x.combatants??x.fighters).filter(f=>f.role==='healer');
 healers(a).forEach((f,i)=>{assert(Math.abs(f.maxHp/healers(b)[i].maxHp-HEALER_RULES.health)<1e-9,`${now} healer health`);assert.equal(f.hp,f.maxHp);});
 for(const role of ['tank','damage','controller'])assert.deepEqual((a.combatants??a.fighters).filter(f=>f.role===role).map(f=>f.maxHp),(b.combatants??b.fighters).filter(f=>f.role===role).map(f=>f.maxHp),`${now} ${role} health`);
 const h=healers(a)[0],d=(a.combatants??a.fighters).find(f=>f.role==='damage');h.mana=d.mana=50;a.healerSpend(h,()=>{h.mana-=20;});a.healerSpend(d,()=>{d.mana-=20;});
 assert(Math.abs(h.mana-(50-20*HEALER_RULES.mana))<1e-9,'healer casts cost less');assert.equal(d.mana,30,'others pay full price');
 h.cast=3;h.kitCooldown=3;a.upkeep(h,1);assert(Math.abs((3-h.cast)-(HEALER_RULES.cooldown-1))<1e-9,`${now} healer cooldown`);assert(Math.abs((3-h.kitCooldown)-HEALER_RULES.cooldown)<1e-9);
}
assert(HEALER_RULES.health<=1.15&&HEALER_RULES.mana>=.8&&HEALER_RULES.cooldown<=1.2,'healer changes stay small');

// 3. Determinism and versions.
for(const version of ['team-2.8','team-3.8']){const play=()=>{const b=new (teamEngine(version))([squad(COMPOSITIONS.control3,81),squad(COMPOSITIONS.balanced3,82)],81,{headless:true});while(!b.done)b.step(1/60);return b.result();};const r=play();assert.deepEqual(r,play());assert.equal(r.combatVersion,version);}

// 4. Recorded measurements (scripts/evaluate-role-tuning.mjs): a controller in place of a damage dealer wins 40-60% and
// no worse than before; one healer does no worse than before; stacking a second healer never wins more than 60%.
{const recorded=JSON.parse(fs.readFileSync('validation/role-tuning.json','utf8')),find=(engine,size)=>recorded.rows.find(r=>r.engine===engine&&r.size===size);
 for(const size of [3,5])for(const [now,before]of [['team-2.8','team-2.7'],['team-3.8','team-3.7']]){const n=find(now,size),b=find(before,size);assert(n&&b,`${now} ${size}v${size}`);
  assert(n.vsDamage>=40&&n.vsDamage<=60&&n.vsDamage>=b.vsDamage,`${now} ${size}v${size} controller vs damage ${n.vsDamage}%`);
  assert(n.oneHealerVsDamage>=b.oneHealerVsDamage-5,`${now} ${size}v${size} one healer ${n.oneHealerVsDamage}% (was ${b.oneHealerVsDamage}%)`);
  assert(n.twoHealersVsHealerDamage<=60,`${now} ${size}v${size} two healers ${n.twoHealersVsHealerDamage}%`);}}
console.log('Role tuning checks passed.');

import assert from 'node:assert/strict';
import {squad,COMPOSITIONS,generation,roles} from './team-fixtures.mjs';
import {TeamBattle,CC_IMMUNITY} from '../public/combat-team-v2-2.js';
import {TEAM_KITS,rollTeamKit,KIT_WEIGHTS} from '../public/team-kits.js';
const fixture=id=>{const mine=squad(COMPOSITIONS.balanced3,991),foes=squad(COMPOSITIONS.balanced3,992);mine[0].teamKit=id;const b=new TeamBattle([mine,foes],112,{headless:true,map:'open'});b.obstacles=[];for(const f of b.fighters){f.powers=[];f.weakness='none';f.move=f.original.move=0;f.cast=f.cooldown=999;f.kitCooldown=999;f.maxMana=f.mana=100;f.accuracy=1;f.dodge=f.crit=0;f.x=f.team?330:250;f.y=300;f.hp=f.maxHp*.6;f.retarget=999;f.target=f.team?0:3;f.stagger=0;}const f=b.fighters[0];f.kitCooldown=f.cast=0;return {b,f,t:b.fighters[3],ally:b.fighters[1]};};
const finish=({b,f,t})=>{b.castPower(f,t);assert.equal(f.action?.type,'teamKit',f.teamKit);const a=f.action;b.updateAttack(f,t,TEAM_KITS[f.teamKit].windup);assert.equal(a.elapsed,a.windup);assert.equal(f.kitCasts,1);return b;};
for(const id of Object.keys(TEAM_KITS)){
 const x=fixture(id),{b,f,t,ally}=x;
 if(id==='resurrection'){ally.hp=0;ally.downed=true;ally.deaths=1;}
 if(id==='cleanse')ally.poison=ally.root=4;
 const health=b.fighters.map(a=>a.hp);finish(x);
 if(id==='mendingWave')assert(b.fighters.filter(a=>a.team===0).every((a,i)=>a.hp>health[i]));
 if(id==='chainHeal')assert(b.fighters.filter(a=>a.team===0&&a.hp>health[a.index]).length>=2);
 if(id==='resurrection'){assert.equal(ally.hp,ally.maxHp*.4);assert.equal(ally.deaths,1);assert(f.reviveSpent);assert(ally.revivedByKit);ally.hp=0;assert.deepEqual(b.kitTargets(f,TEAM_KITS[id],t),[]);const other=b.fighters[2];other.teamKit=id;assert(!b.kitTargets(other,TEAM_KITS[id],t).includes(ally));}
 if(id==='cleanse'){assert.equal(ally.root,0);assert.equal(ally.poison,0);assert.equal(ally.ccImmune,CC_IMMUNITY);}
 if(id==='barrier')assert(b.fighters.filter(a=>a.team===0).every(a=>a.wardHits===1&&a.wardTime===4));
 if(['stunBolt','disarmShot'].includes(id)){assert.equal(b.projectiles.length,1);for(let i=0;i<45;i++)b.step(1/60);assert(b.fighters.some(a=>a.team===1&&(id==='stunBolt'?a.kitStun>0:a.disarmed>0)),'Projectile must reach an enemy and apply control.');}
 if(id==='hamstring')assert.equal(t.slow,4);
 if(id==='tauntShout'){assert.equal(t.tauntTime,2);assert.equal(b.chooseTarget(t),f);}
 if(id==='knockUp')assert.equal(t.kitStun,.6);
 assert(b.fighters.filter(a=>a.team===1).every(a=>a.hp<=health[a.index]),'No kit heals enemies.');
}
// Resurrection is a real interruptible channel, not an instant heal of a dead fighter.
const channel=fixture('resurrection');channel.ally.hp=0;channel.b.castPower(channel.f,channel.t);channel.b.updateAttack(channel.f,channel.t,2);assert.equal(channel.ally.hp,0);channel.f.stagger=.1;channel.b.updateAttack(channel.f,channel.t,1);assert.equal(channel.ally.hp,0);assert.equal(channel.f.action,null);
const deadHeal=fixture('chainHeal');deadHeal.b.castPower(deadHeal.f,deadHeal.t);const chosen=deadHeal.b.fighters[deadHeal.f.action.targets[0]];chosen.hp=0;deadHeal.b.updateAttack(deadHeal.f,deadHeal.t,1);assert.equal(chosen.hp,0,'A heal never becomes an unintended resurrection.');
for(const id of ['stunBolt','disarmShot','hamstring','tauntShout','knockUp']){const {b,f,t}=fixture(id);t.ccImmune=1;assert.equal(b.kitControl(f,t,id,2),false);assert.equal(t.sleep,0);assert.equal(t.slow,0);assert.equal(t.disarmed,0);}
const hold=fixture('stunBolt');hold.b.castPower(hold.f,hold.t);const mana=hold.f.mana;hold.b.obstacles=[{x:300,y:300,radius:20}];hold.b.updateAttack(hold.f,hold.t,1);assert.equal(hold.b.projectiles.length,0);assert(hold.f.mana>mana);assert.equal(hold.f.kitCooldown,.2);
for(const role of Object.keys(KIT_WEIGHTS)){const r=generation.seededRandom(50),seen=new Set();for(let i=0;i<200;i++)seen.add(rollTeamKit(role,r));assert.deepEqual([...seen].sort(),Object.keys(KIT_WEIGHTS[role]).sort());}
const a=squad(COMPOSITIONS.balanced3,119),b=squad(COMPOSITIONS.balanced3,120);const random=generation.seededRandom(990);for(const c of [...a,...b])c.teamKit=rollTeamKit('damage',random);assert(a.every(c=>TEAM_KITS[c.teamKit]));const run=headless=>{const battle=new TeamBattle([a,b],313,{headless});while(!battle.done)battle.step(1/60);return battle.result();};assert.deepEqual(run(true),run(false));
console.log('Team kits: all ten cast/release effects, actual control projectiles, healing safety, interruption, once-only resurrection, immunity, cover refund, role-weighted generation and watched parity passed.');

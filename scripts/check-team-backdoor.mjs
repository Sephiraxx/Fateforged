// Core siege team-3.7: no teleporting onto Cores, backdoor duty, the Titan's Molten Hurl and Fissure, the stronger
// Forgefire, determinism and the recorded measurements.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {FORGE_TITAN_RULES,BACKDOOR_RULES,fissureReach} from '../public/combat-team-v3-7.js';
import {OBJECTIVE_COMBAT_VERSION} from '../public/team-engine-versions.js';

assert.equal(OBJECTIVE_COMBAT_VERSION,'team-3.8','team-3.8 builds on these team-3.7 rules');
const Forge=teamEngine('team-3.7'),make=(size=3,seed=91)=>new Forge([squad(COMPOSITIONS['balanced'+size],seed),squad(COMPOSITIONS['balanced'+size],seed+1)],seed,{headless:true,map:'open'});
const team=(b,t)=>b.combatants.filter(f=>f.team===t),place=(f,x,y)=>{f.x=x;f.y=y;f.vx=f.vy=0;};
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// 1. Nobody teleports onto a Core, and no teleport lands near the enemy Core.
{const b=make(),f=team(b,0)[0],enemyCore=b.cores[1];
 assert.equal(b.teleportDestination(f,enemyCore),null,'no teleport onto the enemy Core');
 for(const id of ['teleport','charge','portal','space'])assert.equal(b.powerUtility(f,enemyCore,{id}),-1,`${id} is never used on a Core`);
 const target=team(b,1)[0];for(let i=0;i<40;i++){place(target,enemyCore.x-60-i*5,250+i*3);f.castCount=i;place(f,640,300);const spot=b.teleportDestination(f,target);if(spot)assert(Math.hypot(spot.x-enemyCore.x,spot.y-enemyCore.y)>=BACKDOOR_RULES.noBlink,'landing too close to the enemy Core');}}

// 2. Backdoor duty: one defender per intruder, the closest to the Core first, never the whole team.
{const b=make(5),mine=team(b,0),foes=team(b,1),core=b.cores[0];
 mine.forEach((f,i)=>place(f,700+i*30,300));foes.forEach((f,i)=>place(f,900+i*20,300));
 b.brain[0]={plan:'siege',since:0,scores:{}};b.updateDuty();assert.equal(b.duty[0].size,0,'no intruders, no duty');
 place(foes[0],core.x+150,300);place(mine[3],400,300);b.updateDuty();
 assert.deepEqual([...b.duty[0]],[mine[3].index],'one intruder draws the closest teammate');
 assert(b.onDuty(mine[3])&&!b.onDuty(mine[0]));const t=b.chooseTarget(mine[3]);assert.equal(t,foes[0],'the defender targets the intruder');
 const leash=b.planLeash(mine[3]);assert.equal(leash.ref,core);
 place(foes[1],core.x+200,340);b.updateDuty();assert.equal(b.duty[0].size,2,'two intruders draw two defenders');
 assert(b.planScores(0).defend>=BACKDOOR_RULES.defendBase+2*BACKDOOR_RULES.defendPerIntruder,'two intruders make Defend score without a Core hit');
 assert.equal(b.defendTarget(mine[0]),foes[0],'defenders go for the intruder closest to the Core');foes[1].target=core.index;assert.equal(b.defendTarget(mine[0]),foes[1],'and first for the one hitting it');
 b.brain[0]={plan:'defend',since:0,scores:{}};assert.equal(b.chooseTarget(mine[0]),foes[1],'Defend uses the same choice');b.brain[0]={plan:'siege',since:0,scores:{}};foes[1].target=null;
 foes.forEach(f=>place(f,core.x+100+f.index*10,300));b.updateDuty();assert.equal(b.duty[0].size,mine.length-1,'never the whole team');
 b.brain[0]={plan:'defend',since:0,scores:{}};b.updateDuty();assert.equal(b.duty[0].size,0,'Defend already brings everyone back');
 // Ties go to the lower index.
 const c=make(3),[a1,a2,a3]=team(c,0),[e1]=team(c,1);place(a1,500,250);place(a2,500,250);place(a3,900,300);place(e1,c.cores[0].x+100,300);c.brain[0]={plan:'siege',since:0,scores:{}};c.updateDuty();assert.deepEqual([...c.duty[0]],[a1.index]);}

// 3. Fissure: only fighters in the line are hit and stunned, and crowd-control immunity holds.
{const b=make(3),t=b.titan;b.time=40;b.objectiveStep(1/60);assert(t.hp>0);
 const [inLine,immune,outside]=team(b,0);place(inLine,t.x+120,t.y);place(immune,t.x+200,t.y+10);place(outside,t.x,t.y+150);immune.ccImmune=1;
 b.fissure={x:t.x,y:t.y,angle:0,length:FORGE_TITAN_RULES[3].fissureLength,width:FORGE_TITAN_RULES[3].fissureWidth,start:b.time,at:b.time};
 assert(fissureReach(b.fissure,inLine).inside&&!fissureReach(b.fissure,outside).inside);
 const hp=[inLine.hp,immune.hp,outside.hp];b.releaseFissure();
 assert(inLine.kitStun>0&&inLine.sleep>0,'a fighter in the line is stunned');assert.equal(immune.kitStun,0,'immunity blocks the stun');assert.equal(outside.sleep,0);
 assert(inLine.hp<hp[0]||inLine.evade>0);assert.equal(outside.hp,hp[2],'the Fissure misses fighters outside the line');assert.equal(b.fissure,null);
 // Fighters standing in a telegraph step out of the line.
 const c=make(3);c.time=40;c.objectiveStep(1/60);const f=team(c,1)[0];place(f,c.titan.x+100,c.titan.y+5);f.rollCooldown=0;f.energy=100;f.action=null;f.sleep=f.root=f.stagger=0;
 c.fissure={x:c.titan.x,y:c.titan.y,angle:0,length:300,width:46,start:c.time,at:c.time+1};c.dodgeThreat(f,c.titan);assert(f.roll>0&&Math.abs(f.rollY)>.9,'sidestep across the line');}

// 4. Molten Hurl: the farthest attacker beyond melee reach, as a Titan projectile that never hurts a Core.
{const b=make(3),t=b.titan;b.time=40;b.objectiveStep(1/60);const [near,far,mid]=team(b,0);
 place(near,t.x+60,t.y);place(mid,t.x-200,t.y);place(far,t.x,t.y+350);b.titanHits=[near,mid,far].map(f=>({index:f.index,damage:10,time:b.time}));
 assert(b.moltenHurl());const p=b.projectiles.at(-1);assert(p.molten&&p.owner===t.index);assert(Math.abs(Math.atan2(p.vy,p.vx)-Math.PI/2)<1e-9,'aimed at the farthest attacker');
 assert.equal(p.damage,far.maxHp*FORGE_TITAN_RULES[3].hurlDamage);
 b.titanHits=[{index:near.index,damage:10,time:b.time}];assert(!b.moltenHurl(),'no hurl at melee range');
 const hp=b.cores[0].hp;assert.equal(b.hurt(b.cores[0],t,500),false);assert.equal(b.cores[0].hp,hp);}

// 5. Titan abilities fire in real games, and Forgefire is a bit stronger than team-3.6's.
{for(const size of [3,5]){const r=FORGE_TITAN_RULES[size],old=teamEngine('team-3.6');const b=make(size);assert.deepEqual(b.titanRules,r);const o=new old([squad(COMPOSITIONS['balanced'+size],91),squad(COMPOSITIONS['balanced'+size],92)],91,{headless:true,map:'open'});
  for(const key of ['forgefire','damage','shield','coreDamage'])assert(r[key]>o.titanRules[key],`${size}v${size} ${key}`);assert(r.damage-o.titanRules.damage<=.05,'not too much');assert.equal(r.hp[size],o.titanRules.hp[size]);}
 const expected={3:{forgefire:40,damage:1.08,shield:.07,coreDamage:1.15},5:{forgefire:45,damage:1.10,shield:.08,coreDamage:1.20}};for(const size of [3,5])for(const [k,v]of Object.entries(expected[size]))assert.equal(FORGE_TITAN_RULES[size][k],v);}

// 6. Determinism: identical seeds give identical games, and the result records the new counters.
{const play=()=>{const b=make(3,4242);while(!b.done)b.step(1/60);return b.result();};const one=play();assert.deepEqual(one,play());assert.equal(one.combatVersion,'team-3.7');
 for(const key of ['hurls','fissures','fissureStuns','dutySeconds'])assert(key in one.objective,key);assert(one.objective.hurls>0||one.objective.titanIgnored);}

// 7. Recorded measurements (scripts/evaluate-team-backdoor.mjs): backdoor losses at most about half of team-3.6's,
// match length and sudden death in range, the Titan still taken, Forgefire not decisive, coach styles close.
{const recorded=JSON.parse(fs.readFileSync('validation/team-objectives-v37.json','utf8'));assert.equal(recorded.engine,'team-3.7');
 for(const size of [3,5]){const now=recorded.rows.find(r=>r.size===size&&r.engine==='team-3.7'),before=recorded.rows.find(r=>r.size===size&&r.engine==='team-3.6');assert(now&&before,size);
  assert(now.backdoorRate<=Math.max(5,before.backdoorRate*.6),`${size}v${size} backdoor losses ${now.backdoorRate}% (team-3.6 ${before.backdoorRate}%)`);
  assert.equal(now.teleportsNearCore,0);assert(now.medianSeconds>=200&&now.medianSeconds<=360,`${size}v${size} median ${now.medianSeconds}s`);
  assert(now.suddenDeathRate<=15,`${size}v${size} sudden death ${now.suddenDeathRate}%`);assert(now.titanKillsPerGame>=.8&&now.titanKillsPerGame<=2,`${size}v${size} Titan kills ${now.titanKillsPerGame}`);
  assert(now.forgefireWinRate<=80,`${size}v${size} Forgefire win rate ${now.forgefireWinRate}%`);assert(now.fissureStunsPerGame>0&&now.hurlsPerGame>0);}
 for(const row of recorded.tactics)assert(row.winRate>=35&&row.winRate<=65,`${row.size}v${row.size} ${row.tactic} ${row.winRate}%`);}
console.log('team backdoor checks passed');

// Levels and Ember Wisps in Core siege: level thresholds and bonuses,
// every XP source, the wisps' spawn, pulse, reset and respawn, the coach dial, results and the status line.
import assert from 'node:assert/strict';
import {generation,engine} from './team-fixtures.mjs';
import {LEVEL_RULES,CAMP_RULES,levelFor} from '../public/level-combat.js';
import {validGamePlan,personalityGamePlan,gamePlanSummary} from '../public/team-game-plan.js';
import {objectiveStatus} from '../public/objective-render.js';

const P=globalThis.WHEEL_DATA,L=globalThis.WHEEL_LUCK;
const teams=(size,seed)=>[generation.randomTeam(P,L,{size,seed}),generation.randomTeam(P,L,{size,seed:seed+1})];
const battle=(size=3,seed=40,options={})=>new (engine.teamEngine('team-4.0'))(teams(size,seed),seed,{headless:true,...options});

// Thresholds.
assert.deepEqual([0,199,200,449,450,750,1100,1499,1500,9999].map(levelFor),[1,1,2,2,3,4,5,5,6,6]);

// Start: everyone level 1, two wisps down until 0:20, one in each half.
let b=battle();
assert(b.combatants.every(f=>f.level===1&&f.xp===0&&f.hitBy.length===b.combatants.length));
assert.equal(b.camps.length,2);assert(b.camps.every(c=>c.hp===0&&c.isObjective&&c.team===2&&b.actors.includes(c)));
assert.deepEqual(b.camps.map(c=>[c.x,c.y]),CAMP_RULES.spots.map(s=>[...s]));
while(b.time<CAMP_RULES.spawn+.05)b.step(1/60);
assert(b.camps.every(c=>c.hp===c.maxHp&&c.maxHp===CAMP_RULES.hp[3]));

// Level-ups: health grows 7% per level and the fighter heals.
b=battle();const f=b.combatants[0],base=f.maxHp;f.hp=base/2;
b.gainXp(f,LEVEL_RULES.xp[2]);assert.equal(f.level,3);assert(Math.abs(f.maxHp-base*(1+2*LEVEL_RULES.hp))<1e-6);
assert(f.hp>base/2+base*2*LEVEL_RULES.hp);

// Kills and assists: the last attacker gets the kill, allies who hurt the victim in the last 5 s an assist; a
// higher-level victim pays 25% more.
b=battle();
{const [k,ally]=b.combatants.filter(x=>x.team===0),v=b.combatants.find(x=>x.team===1);
 v.level=3;v.hp=0;v.lastAttacker=k.index;v.hitBy[ally.index]=b.time-1;b.objectiveStep(1/60);
 assert.equal(k.xp,LEVEL_RULES.kill*(1+LEVEL_RULES.catchUp));assert.equal(ally.xp,LEVEL_RULES.assist);
 assert.equal(v.xpDown,true);b.objectiveStep(1/60);assert.equal(k.xp,LEVEL_RULES.kill*(1+LEVEL_RULES.catchUp),'A kill pays once.');
 b.respawn(v);assert.equal(v.xpDown,false);assert(v.hitBy.every(t=>t<-1e8));}

// The Titan: every living fighter of the team that takes Forgefire.
b=battle();
{const red=b.combatants.filter(x=>x.team===1);red[0].hp=0;red[0].xpDown=true;b.titanDeaths.push({time:b.time,team:1,stolen:false,damage:[0,0]});b.objectiveStep(1/60);
 assert.deepEqual(red.map(x=>x.xp),red.map((x,i)=>i?LEVEL_RULES.titan:0));assert(b.combatants.filter(x=>x.team===0).every(x=>x.xp===0));}

// Wisps: XP for the team that lands the last hit, respawn after 45 s, a pulse at the last attacker, a reset when
// left alone.
b=battle();while(b.time<CAMP_RULES.spawn+.05)b.step(1/60);
{const c=b.camps[0],a=b.combatants.find(x=>x.team===0&&x.hp>0);
 const blue=b.combatants.filter(x=>x.team===0&&x.hp>0),xp=blue.map(x=>x.xp);
 b.hurt(c,a,c.maxHp*10,'physical',false);assert.equal(c.hp,0);assert.deepEqual(b.campKills,[1,0]);
 assert.equal(c.respawnAt,b.time+CAMP_RULES.respawn);assert.deepEqual(blue.map((x,i)=>x.xp-xp[i]),blue.map(()=>LEVEL_RULES.camp));
 const w=b.camps[1];w.hp=w.maxHp-10;w.hitter=a.index;w.lastHitAt=b.time;w.nextPulse=b.time;a.x=w.x+60;a.y=w.y;const before=a.hp;b.objectiveStep(1/60);
 assert(a.hp<before,'The wisp hits back.');w.lastHitAt=b.time-CAMP_RULES.reset-1;b.objectiveStep(1/60);assert.equal(w.hp,w.maxHp,'A wisp left alone heals up.');}

// The dial: optional in a plan, validated when present, set by coach personality.
assert(validGamePlan({titan:'always',style:'group',siege:'numbers'}));
assert(validGamePlan({titan:'always',style:'group',siege:'numbers',camp:'never'}));
assert(!validGamePlan({titan:'always',style:'group',siege:'numbers',camp:'sometimes'}));
assert(!validGamePlan({titan:'always',style:'group',camp:'never'}));
assert.equal(personalityGamePlan('tactician').camp,'always');assert.equal(personalityGamePlan('glass').camp,'never');
assert.match(gamePlanSummary(personalityGamePlan('balanced')),/When not ahead in levels/);
b=battle(3,40,{gamePlans:[{titan:'always',style:'group',siege:'numbers',camp:'never'},{titan:'always',style:'group',siege:'numbers',camp:'always'}]});
while(b.time<CAMP_RULES.spawn+.05)b.step(1/60);
assert(b.combatants.filter(x=>x.team===0).every(x=>b.campTarget(x,null)===null),'Never sends nobody.');

// Full games: levels and wisps in the results, wisps cleared by both sides over a sample, and no levels in
// classic teamfight.
const sides=[0,0];let leveled=0;
for(let s=0;s<8;s++){const size=s%2?5:3,r=engine.simulateTeam(teams(size,300+s*2),900+s,{engineVersion:'team-4.0',headless:true});
 assert(r.fighters.every(x=>x.level>=1&&x.level<=6&&Number.isInteger(x.xp)));assert.equal(r.objective.camps.length,2);assert.equal(typeof r.objective.levelLead,'number');
 r.objective.camps.forEach((n,i)=>sides[i]+=n);leveled+=r.fighters.filter(x=>x.level>1).length;}
assert(sides[0]>0&&sides[1]>0,`Both sides clear wisps (${sides}).`);assert(leveled>0);
const classic=engine.simulateTeam(teams(3,500),77,{engineVersion:'team-2.9',headless:true});
assert(classic.fighters.every(x=>x.level===undefined));assert.equal(classic.objective?.camps,undefined);

// The status line shows the teams' levels.
b=battle();assert.match(objectiveStatus(b),/Levels 1\.0 \/ 1\.0/);

console.log(`Team levels passed: thresholds, level-up health and heal, kill/assist/catch-up/Titan/wisp XP, wisp spawn, pulse, reset and respawn, the Ember Wisps dial, results (${sides[0]}/${sides[1]} wisps over 8 games), no levels in classic teamfight, and the status line.`);

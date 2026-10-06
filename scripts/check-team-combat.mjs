import assert from 'node:assert/strict';import fs from 'node:fs';
import {engine,generation,roles,squad,COMPOSITIONS} from './team-fixtures.mjs';
const {TeamBattle,simulateTeam,TEAM_ENGINE_VERSION,CC_IMMUNITY}=engine;

// Roles: forced tank classes read as tanks, and role-targeted squads deliver the requested roles.
const guardian=generation.roleFighter(WHEEL_DATA,WHEEL_LUCK,{role:'tank',tier:'S',random:generation.seededRandom(7),id:'g'});
assert.equal(roles.teamRole(guardian).role,'tank');
const balanced=squad(COMPOSITIONS.balanced5,11);
assert.deepEqual(balanced.map(c=>roles.teamRole(c).role),COMPOSITIONS.balanced5);
for(const c of balanced)assert(['A','S','SS'].includes(c.summary.tier),'Team pools are S/A tier with rare SS.');

// Instrumented battle: friendly fire and enemy healing must never happen.
const violations=[];let allyHealing=0;
class Audited extends TeamBattle{
 hurt(t,f,amount,type,canDodge){const before=t.hp,result=super.hurt(t,f,amount,type,canDodge);if(f&&f!==t&&!t.isDecoy&&f.team===t.team&&t.hp<before)violations.push(`${f.name} hurt ally ${t.name}`);return result;}
 heal(f,amount){const source=this.healSource,gained=super.heal(f,amount);if(gained>0&&source&&source.team!==f.team)violations.push(`${source.name} healed enemy ${f.name}`);if(gained>0&&source&&source!==f&&source.team===f.team)allyHealing+=gained;return gained;}
}
const run=(teams,seed,options={})=>{const b=new Audited(teams,seed,{headless:true,...options});while(!b.done)b.step(1/60);return b.result();};

// Both sizes finish with a valid result shape.
for(const size of [3,5]){
 const a=squad(COMPOSITIONS[`balanced${size}`],100+size),b=squad(COMPOSITIONS[`balanced${size}`],200+size),r=run([a,b],900+size);
 assert.equal(r.mode,'team');assert.equal(r.size,size);assert.equal(r.combatVersion,TEAM_ENGINE_VERSION);assert([0,1].includes(r.winnerTeam));
 assert.equal(r.fighters.length,size*2);assert.deepEqual(r.teams,[a.map(c=>c.id),b.map(c=>c.id)]);assert(r.seconds>0&&r.seconds<=engine.TEAM_TIME_LIMIT);
 const loser=r.fighters.filter(f=>f.team!==r.winnerTeam);if(r.reason==='Team eliminated')assert(loser.every(f=>f.hp===0&&f.deaths>=1),'An eliminated team is all down.');
 for(const f of r.fighters){for(const k of ['damage','healing','kills','deaths'])assert(Number.isInteger(f[k])&&f[k]>=0,k);assert(f.ccSeconds>=0);}
}

// Determinism: same seed, same battle; watched (non-headless) and headless runs agree.
const a=squad(COMPOSITIONS.balanced3,301),b=squad(COMPOSITIONS.control3,302);
const first=simulateTeam([a,b],4242),second=simulateTeam([a,b],4242);
assert.deepEqual(first,second);
const watched=new TeamBattle([a,b],4242,{headless:false});while(!watched.done)watched.step(1/60);
assert.deepEqual(watched.result(),first,'Watched and headless team battles must match.');
assert.notDeepEqual(simulateTeam([a,b],4243).fighters,first.fighters,'Different seeds give different battles.');

// Healers heal teammates across a batch of healer battles; nobody harms allies or heals enemies.
let games=0,healerWins=0;
for(let s=0;s<16;s++){const h=squad(COMPOSITIONS.healer3,500+s),d=squad(COMPOSITIONS.damage3,600+s),r=run(s%2?[d,h]:[h,d],7000+s);games++;if((s%2?1-r.winnerTeam:r.winnerTeam)===0)healerWins++;}
assert(allyHealing>0,'Healers must land heals on teammates.');
assert.deepEqual(violations,[],violations.slice(0,3).join('; '));

// Hard-control diminishing returns: a fresh lock is shrugged off while immune.
const cc=new TeamBattle([squad(COMPOSITIONS.balanced3,700),squad(COMPOSITIONS.balanced3,701)],77,{headless:true});
const victim=cc.fighters[3];victim.ccImmune=1;victim.sleep=2;cc.step(1/60);
assert.equal(victim.sleep,0,'Sleep is shrugged off during control immunity.');
victim.ccImmune=0;victim.wasHard=false;victim.root=1;cc.step(1/60);assert(victim.root>0,'Control lands when not immune.');
victim.root=0;cc.step(1/60);assert(Math.abs(victim.ccImmune-CC_IMMUNITY)<1e-9,'Immunity starts when control ends.');

// Speed: a 5v5 battle stays fast enough for season simulation.
let total=0;const timings=6;for(let s=0;s<timings;s++){const start=performance.now();simulateTeam([squad(COMPOSITIONS.balanced5,800+s),squad(COMPOSITIONS.damage5,850+s)],9000+s);total+=performance.now()-start;}
assert(total/timings<750,`5v5 battles average ${Math.round(total/timings)} ms`);

// Recorded balance targets (scripts/evaluate-team-combat.mjs).
const evaluation=JSON.parse(fs.readFileSync('validation/team-combat.json','utf8'));
assert.equal(evaluation.engine,TEAM_ENGINE_VERSION);
for(const m of evaluation.matchups)assert(m.timeoutRate<25,`${m.a} vs ${m.b} times out ${m.timeoutRate}%`);
for(const key of ['balanced3 vs damage3','balanced5 vs damage5'])assert(evaluation.matchups.find(m=>`${m.a} vs ${m.b}`===key).winRateA>=50,`${key} should favour the balanced team`);
console.log(`Team combat passed: roles, 3v3/5v5 results, determinism and watched parity, no friendly fire or enemy heals, ally healing ${Math.round(allyHealing)} HP (${healerWins}/${games} healer-comp wins), control immunity, ${Math.round(total/timings)} ms per 5v5.`);

import assert from 'node:assert/strict';import fs from 'node:fs';
import {engine,generation,roles,squad,COMPOSITIONS} from './team-fixtures.mjs';
const {TeamBattle,simulateTeam,TEAM_ENGINE_VERSION,CC_IMMUNITY}=engine;
const {TEAM_FIELD,TEAM_MAPS,MAP_IDS,resolveMap,mapTerrain}=await import('../public/team-maps.js');

// Roles: forced tank classes read as tanks, and role-targeted squads deliver the requested roles.
const guardian=generation.roleFighter(WHEEL_DATA,WHEEL_LUCK,{role:'tank',tier:'S',random:generation.seededRandom(7),id:'g'});
assert.equal(roles.teamRole(guardian).role,'tank');
const balanced=squad(COMPOSITIONS.balanced5,11);
assert.deepEqual(balanced.map(c=>roles.teamRole(c).role),COMPOSITIONS.balanced5);
for(const c of balanced)assert(['A','S','SS'].includes(c.summary.tier),'Team pools are S/A tier with rare SS.');

// Damage dealers are mostly ranged (rangers first, then casters); melee damage dealers always carry a mobility move.
const C=globalThis.CLASS_ABILITIES,types={ranged:0,arcane:0,melee:0};let mobile=0;
for(let i=0;i<80;i++){const random=generation.seededRandom(3100+i),f=generation.roleFighter(WHEEL_DATA,WHEEL_LUCK,{role:'damage',tier:generation.poolTier(random),random,id:'d'+i});const type=C.weaponType(f.traits.weapon);types[type]++;if(type==='melee'&&generation.MOBILITY_POWERS.includes(C.abilityId(f.traits.power)))mobile++;assert.equal(roles.teamRole(f).role,'damage');}
for(let i=0;i<30;i++){const random=generation.seededRandom(4100+i),f=generation.roleFighter(WHEEL_DATA,WHEEL_LUCK,{role:'tank',tier:generation.poolTier(random),random,id:'t'+i});assert.equal(C.weaponType(f.traits.weapon),'melee','Tanks fight in melee.');assert.equal(roles.teamRole(f).role,'tank');}
assert.equal(roles.teamRole({...guardian,traits:{...guardian.traits,weapon:'Longbow'}}).role==='tank',false,'A ranged fighter is never a tank.');
assert(types.ranged>=80*.55,`ranged damage dealers: ${types.ranged}/80`);assert(types.ranged+types.arcane>=80*.85,'Damage dealers fight from range.');assert.equal(mobile,types.melee,'Melee damage dealers carry a mobility move.');

// Maps: seeded, mirrored across the centre line, clear of both spawn zones, and never with wedge-sized gaps.
assert.deepEqual([TEAM_FIELD.width,TEAM_FIELD.height],[960,600]);
const picked=new Set();for(let seed=0;seed<200;seed++)picked.add(resolveMap(seed));assert.deepEqual([...picked].sort(),[...MAP_IDS].sort(),'Random maps reach every layout.');
assert.equal(resolveMap(5,'ruins'),'ruins');assert.equal(resolveMap(5,'nope'),resolveMap(5));
for(const id of MAP_IDS)for(const seed of [1,2,3,99,12345]){
 const terrain=mapTerrain(id,seed);assert.deepEqual(terrain,mapTerrain(id,seed));if(id==='open')assert.equal(terrain.length,0);else assert(terrain.length>=4,id);
 for(const o of terrain){assert(terrain.some(m=>Math.abs(m.x-(960-o.x))<.11&&Math.abs(m.y-o.y)<.11&&m.radius===o.radius),`${id} is mirrored`);assert(o.x-o.radius>=280&&o.x+o.radius<=680&&o.y-o.radius>=20&&o.y+o.radius<=580,`${id} stays out of the spawn zones`);}
 // A gap counts only when no third piece sits in it (stones further along the same wall).
 const bridged=(a,b)=>terrain.some(c=>c!==a&&c!==b&&Math.hypot(c.x-(a.x+b.x)/2,c.y-(a.y+b.y)/2)<c.radius+2);
 for(let i=0;i<terrain.length;i++)for(let j=i+1;j<terrain.length;j++){const a=terrain[i],b=terrain[j],gap=Math.hypot(a.x-b.x,a.y-b.y)-a.radius-b.radius;assert(gap<=3||gap>=40||bridged(a,b),`${id} seed ${seed}: a ${gap.toFixed(1)}-unit gap could wedge a fighter`);}
}

// Instrumented battle: friendly fire and enemy healing must never happen.
const violations=[];let allyHealing=0;
class Audited extends TeamBattle{
 hurt(t,f,amount,type,canDodge){const before=t.hp,result=super.hurt(t,f,amount,type,canDodge);if(f&&f!==t&&!t.isDecoy&&f.team===t.team&&t.hp<before)violations.push(`${f.name} hurt ally ${t.name}`);return result;}
 heal(f,amount){const source=this.healSource,gained=super.heal(f,amount);if(gained>0&&source&&source.team!==f.team)violations.push(`${source.name} healed enemy ${f.name}`);if(gained>0&&source&&source!==f&&source.team===f.team)allyHealing+=gained;return gained;}
}
// The wide field: every fighter stays inside it, nobody on foot ends a step inside terrain, and ranged attacks
// never start without a clear line of sight.
class Field extends Audited{
 auditReleased(f,t,start){for(const p of this.projectiles.slice(start)){const angle=Math.atan2(p.vy,p.vx);if(!this.pathClear({...p,tactics:f.tactics},t,angle,p.radius,Math.hypot(p.vx,p.vy)))violations.push(`${f.name} released a projectile into cover`);}}
 updateAttack(f,t,dt){const count=this.projectiles.length,aimed=this.fighters[f.action?.targetIndex??f.action?.targets?.[0]]??t;super.updateAttack(f,t,dt);this.auditReleased(f,aimed,count);}
 usePower(f,t,p,copied){const count=this.projectiles.length,result=super.usePower(f,t,p,copied);this.auditReleased(f,t,count);return result;}

 startAttack(f,t){const before=f.action;super.startAttack(f,t);if(f.action&&f.action!==before&&f.action.type==='shot'&&!this.clearShot(f,t))violations.push(`${f.name} shot through terrain`);}
 step(dt){super.step(dt);for(const f of this.fighters){if(f.hp<=0)continue;if(f.x<18-1e-9||f.x>this.width-18+1e-9||f.y<18-1e-9||f.y>this.height-18+1e-9)violations.push(`${f.name} left the field`);if(f.flight<=0)for(const o of this.obstacles)if(o.terrain&&Math.hypot(f.x-o.x,f.y-o.y)<o.radius+f.radius-.5)violations.push(`${f.name} stands inside terrain on ${this.environment.map}`);}}
}
const run=(teams,seed,options={})=>{const b=new Audited(teams,seed,{headless:true,...options});while(!b.done)b.step(1/60);return b.result();};

// Both sizes finish with a valid result shape.
for(const size of [2,3,5]){
 const a=squad(COMPOSITIONS[`balanced${size}`],100+size),b=squad(COMPOSITIONS[`balanced${size}`],200+size),r=run([a,b],900+size);
 assert.equal(r.mode,'team');assert.equal(r.size,size);assert.equal(r.combatVersion,TEAM_ENGINE_VERSION);assert([0,1].includes(r.winnerTeam));
 assert.equal(r.fighters.length,size*2);assert.deepEqual(r.teams,[a.map(c=>c.id),b.map(c=>c.id)]);assert(r.seconds>0&&r.seconds<=engine.TEAM_TIME_LIMIT);
 const loser=r.fighters.filter(f=>f.team!==r.winnerTeam);if(r.reason==='Team eliminated')assert(loser.every(f=>f.hp===0&&f.deaths>=1),'An eliminated team is all down.');
 for(const f of r.fighters){for(const k of ['damage','healing','kills','deaths'])assert(Number.isInteger(f[k])&&f[k]>=0,k);assert(f.ccSeconds>=0);}
}

let fieldSteps=0;for(const [i,map]of MAP_IDS.entries())for(const size of [2,3,5]){const b=new Field([squad(COMPOSITIONS[`balanced${size}`],1200+i*2+size),squad(COMPOSITIONS[`balanced${size}`],1300+i*2+size)],61000+i*10+size,{headless:true,map});assert.equal(b.environment.map,map);assert.deepEqual([b.width,b.height],[960,600]);assert(b.fighters.every(f=>f.team?f.x>680:f.x<280),'Teams spawn on their own side.');while(!b.done){b.step(1/60);fieldSteps++;}assert.equal(b.result().environment.map,map);}
assert.deepEqual(violations,[],violations.slice(0,3).join('; '));

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

// Recorded balance targets (scripts/evaluate-team-combat.mjs).
const evaluation=JSON.parse(fs.readFileSync('validation/team-combat.json','utf8'));
assert.equal(evaluation.engine,TEAM_ENGINE_VERSION);
for(const m of evaluation.matchups)assert(m.timeoutRate<25,`${m.a} vs ${m.b} times out ${m.timeoutRate}%`);
for(const key of ['balanced3 vs damage3','balanced5 vs damage5'])assert(evaluation.matchups.find(m=>`${m.a} vs ${m.b}`===key).winRateA>=50,`${key} should favour the balanced team`);
for(const r of [...evaluation.tactics,...evaluation.maps])assert(r.timeoutRate<25,`${r.tactic??r.map} times out ${r.timeoutRate}%`);
assert.deepEqual(evaluation.maps.map(m=>m.map),MAP_IDS);assert.deepEqual([...new Set(evaluation.tactics.map(t=>t.tactic))].sort(),[...engine.TEAM_TACTICS].sort());
// Formations: half as much isolated fighting as the first team engine, healers covering their tanks,
// and Hold the line keeping a tighter shape than All-out aggression.
for(const base of evaluation.baseline.matchups.filter(m=>m.a===m.b)){const now=evaluation.matchups.find(m=>m.a===base.a&&m.b===base.b);assert(now.isolatedPct<=base.isolatedPct/2,`${base.a}: isolated ${now.isolatedPct}% vs ${base.isolatedPct}% before`);assert(now.outnumberedPct<base.outnumberedPct,`${base.a}: outnumbered ${now.outnumberedPct}%`);}
for(const m of evaluation.matchups.filter(m=>m.a.startsWith('balanced')&&COMPOSITIONS[m.a].includes('healer')))assert(m.healerCoverPct>=80,`${m.a} vs ${m.b}: healer cover ${m.healerCoverPct}%`);
for(const size of [3,5]){const spread=t=>evaluation.tactics.find(x=>x.size===size&&x.tactic===t).spread;assert(spread('defensive')<spread('aggressive'),`${size}v${size}: Hold the line should be tighter than All-out aggression`);}
console.log(`Team combat passed: roles, ranged-first damage generation (${types.ranged} ranged, ${types.arcane} arcane, ${types.melee} melee with mobility), mirrored seeded maps, ${fieldSteps} audited field steps on every map (bounds, terrain, line of sight), formation targets, 3v3/5v5 results, determinism and watched parity, no friendly fire or enemy heals, ally healing ${Math.round(allyHealing)} HP (${healerWins}/${games} healer-comp wins), control immunity.`);

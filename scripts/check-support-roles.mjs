// Supports deal reduced damage (team-2.7 / team-3.4), healers arrive with team healing kits, Core siege rules scale
// with the format, and leagues can switch battle rules between seasons.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {ROLE_OUTPUT,OVERTIME_RAMP,FORTIFIED_BONUS} from '../public/role-output-combat.js';
import {roleFighter,seededRandom,HEALER_KITS,HEALER_MAIN_HEALS} from '../public/team-generation.js';
import {teamRole} from '../public/team-roles.js';
import * as L from '../public/team-league.js';
import {TEAM_COMBAT_VERSION,OBJECTIVE_COMBAT_VERSION,engineForMode} from '../public/team-engine-versions.js';

// 1. One hit from each role: the new engine scales it by ROLE_OUTPUT, the previous engine does not.
const teams=()=>[squad(COMPOSITIONS.balanced5,7101),squad(COMPOSITIONS.balanced5,7102)];
const dealt=(version,role,time=0)=>{const b=new (teamEngine(version))(teams(),33,{headless:true,map:'open'});b.obstacles=[];b.time=time;const f=b.fighters.find(x=>x.team===0&&x.role===role),t=b.fighters.find(x=>x.team===1&&x.role==='damage');assert(f&&t,'fixture needs a '+role);t.x=f.x+40;t.y=f.y;for(const a of b.fighters)if(a!==t&&a.team===1){a.x=900;a.y=40+a.index*20;}const before=f.damageDone;b.hurt(t,f,60,'physical',false);return f.damageDone-before;};
for(const role of ['healer','controller','damage','tank']){const ratio=dealt('team-2.7',role)/dealt('team-2.6',role);assert(Math.abs(ratio-(ROLE_OUTPUT[role]??1))<1e-9,`${role} damage ratio ${ratio}`);}
assert(ROLE_OUTPUT.healer<=.4&&ROLE_OUTPUT.controller<1&&ROLE_OUTPUT.tank<1&&!ROLE_OUTPUT.damage);
// Tanks trade damage for toughness.
{const fort=v=>{const b=new (teamEngine(v))(teams(),33,{headless:true,map:'open'});return b.fortified(b.fighters.find(x=>x.role==='tank'));};assert(Math.abs(fort('team-2.7')/fort('team-2.6')-FORTIFIED_BONUS)<1e-9);}
// Classic teamfight ramps damage through overtime so even fights still finish.
{const late=OVERTIME_RAMP.start+20,ratio=dealt('team-2.7','damage',late)/dealt('team-2.6','damage',late);assert(Math.abs(ratio-(1+20*OVERTIME_RAMP.perSecond))<1e-9,`overtime ramp ${ratio}`);}
assert.equal(TEAM_COMBAT_VERSION,'team-2.7');assert.equal(OBJECTIVE_COMBAT_VERSION,'team-3.4');assert.equal(engineForMode('core'),'team-3.4');assert.equal(engineForMode('teamfight'),'team-2.7');

// 2. Core siege scales with the format; earlier siege engines keep their rules.
const core=(version,size)=>new (teamEngine(version))([squad(COMPOSITIONS['balanced'+size],7201),squad(COMPOSITIONS['balanced'+size],7202)],12,{headless:true,map:'open'});
const old3=core('team-3.3',3),new3=core('team-3.4',3),old5=core('team-3.3',5),new5=core('team-3.4',5);
assert.equal(old3.cores[0].maxHp,6000);assert.equal(old3.titan.maxHp,4500);assert.equal(old5.cores[0].maxHp,9000);
assert(new3.cores[0].maxHp<new5.cores[0].maxHp&&new3.titan.maxHp<new5.titan.maxHp,'3v3 objectives are weaker than 5v5');
assert(new3.titanRules.slamDamage<new5.titanRules.slamDamage&&new3.titanRules.damage<new5.titanRules.damage&&new3.titanRules.coreDamage<new5.titanRules.coreDamage,'3v3 Titan hits and Forgefire are smaller');
// A Core pulse (an objective attacking a fighter) is never scaled by role output.
{const f=new3.combatants.find(x=>x.team===1&&x.role==='healer')??new3.combatants.find(x=>x.team===1),hp=f.hp;new3.hurt(f,new3.cores[0],40,'arcane',false);const cut=hp-f.hp;const g=old3.combatants[f.index],hp2=g.hp;old3.hurt(g,old3.cores[0],40,'arcane',false);assert(Math.abs(cut-(hp2-g.hp))<1e-9);}
// Forgefire halves Guarded instead of ignoring it, and the last hit only claims Forgefire with a fair share of the work.
{const b=core('team-3.4',3),[a,r]=[b.combatants.find(x=>x.team===0&&x.role==='damage'),b.combatants.find(x=>x.team===1&&x.role==='damage')];b.time=40;b.objectiveStep(1/60);assert.equal(b.titan.hp,b.titan.maxHp);b.hurt(b.titan,a,b.titan.maxHp-50);b.hurt(b.titan,r,100);assert.deepEqual(b.monsterKills,[1,0],'a tiny last hit does not claim Forgefire');assert.deepEqual(b.steals,[0,0]);assert(b.hasForgefire(0)&&!b.hasForgefire(1));
 const enemyCore=b.cores[1];for(const d of b.combatants.filter(x=>x.team===1)){d.x=enemyCore.x-20;d.y=enemyCore.y;}const hp=enemyCore.hp;b.hurt(enemyCore,a,100,'physical',false);const expected=100*(1-b.objectiveRules.guarded*b.objectiveRules.forgefireGuard)*b.titanRules.damage*b.titanRules.coreDamage*(ROLE_OUTPUT[a.role]??1);assert(Math.abs(hp-enemyCore.hp-expected)<1e-6,`guarded Forgefire hit ${hp-enemyCore.hp} vs ${expected}`);}

// 3. Healers on the expanded wheel usually carry a team healing spell on top of a sustained heal.
const context=vm.createContext({crypto});for(const file of ['class-abilities.js','support-catalog.js','data.js','luck-v4.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),context);
vm.runInContext('this.pools=supportPools(WHEEL_DATA);this.luck=WHEEL_LUCK;',context);
const catalog=globalThis.CURRENT_CLASS_ABILITIES,kits=new Set(HEALER_KITS.map(([id])=>id)),healers=[];
for(let i=0;i<60;i++){const random=seededRandom(9000+i);healers.push(roleFighter(context.pools,context.luck,{role:'healer',tier:'A',random,id:'h'+i}));}
const kitted=healers.filter(c=>kits.has(catalog.abilityId(c.traits.power2)));
assert(kitted.length>=24,`only ${kitted.length} of 60 healers carry a kit`);assert(kitted.some(c=>c.traits.power2==='Resurrection'),'some healers carry Resurrection');
for(const c of kitted)assert.equal(teamRole(c).role,'healer');
// Forced kits come on top of a sustained heal; only the occasional natural roll lacks one.
const sustained=kitted.filter(c=>HEALER_MAIN_HEALS.includes(catalog.abilityId(c.traits.power))).length;assert(sustained>=kitted.length*.8,`${sustained} of ${kitted.length} kitted healers keep a sustained heal`);

// 4. Leagues: the support rules reach existing leagues outside a running series; battle rules change between seasons.
assert.equal(L.prepareRoleRules({teamEngine:'team-2.6'}).teamEngine,'team-2.7');assert.equal(L.prepareRoleRules({teamEngine:'team-3.3'}).teamEngine,'team-3.4');
assert.equal(L.prepareRoleRules({teamEngine:'team-2.6',pendingSeries:{games:[{}]}}).teamEngine,'team-2.6');assert.equal(L.prepareRoleRules({teamEngine:'team-2'}).teamEngine,'team-2');
const w={format:3,phase:'ready',settings:{battleMode:'teamfight'}};L.setBattleMode(w,'core');assert.equal(w.settings.battleMode,'core');
assert.throws(()=>L.setBattleMode({...w,phase:'season'},'teamfight'),/between seasons/);assert.throws(()=>L.setBattleMode({format:2,phase:'ready',settings:{}},'core'),/3v3 or 5v5/);assert.throws(()=>L.setBattleMode(w,'chaos'));

// 5. Recorded Core siege measurements stay inside their targets.
const siege=JSON.parse(fs.readFileSync('validation/team-objectives-siege.json','utf8'));assert.equal(siege.engine,'team-3.4');
for(const row of siege.rows){assert(row.medianSeconds>=180&&row.medianSeconds<=380&&row.averageSeconds>=210,`median ${row.medianSeconds}s, average ${row.averageSeconds}s`);assert(row.timeLimitRate<=30,`time limit ${row.timeLimitRate}%`);assert(row.suddenDeathRate<=25,`sudden death ${row.suddenDeathRate}%`);assert(row.stealRate==null||row.stealRate<=25,`steals ${row.stealRate}%`);assert(row.titanIgnoredRate<10);/* Forgefire holder win rate is recorded but not asserted: it is mostly correlation (see TEAM-BATTLES.md). */}
console.log('Support damage, healer kits, format-scaled Core siege, rule switching and siege targets passed.');

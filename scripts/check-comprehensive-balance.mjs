import assert from 'node:assert/strict';
import fs from 'node:fs';
import {squad} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
import {neutralBalance,validateBalanceProfile,balanceObservations} from '../public/team-balance.js';
import {balanceAuditPlan,auditCarries,auditLever,auditResponse,auditSuggestion,auditCandidateSuggestion,applyBalanceAudit,nextAuditBundle} from '../public/balance-analysis.js';
import {TeamBattle,teamEngine,simulateTeam} from '../public/combat-team.js';
import {TeamBattle as Previous} from '../public/combat-team-v2-5.js';
import {TeamBattle as Comprehensive} from '../public/combat-team-v2-6.js';
import {completeAudit} from './balance-fixtures.mjs';

const roster=Array.from({length:8},(_,i)=>squad(['tank','healer','controller','damage'],30+i)).flat().map((f,i)=>({...f,...L.scoutFighter(f),team:'a',id:'f'+i}));
const w={id:'complete-review',seed:77,season:2,phase:'ready',format:2,settings:{battleMode:'teamfight'},fighters:Object.fromEntries(roster.map(f=>[f.id,f])),teams:[{id:'a',lineup:['f0','f3'],roster:roster.map(f=>f.id),coach:{personality:'balanced'}}],balance:neutralBalance()};
w.balance.previousSamples=Array.from({length:60},(_,i)=>[{key:'role:tank',won:i<12}]);
const plan=balanceAuditPlan(w,'preseason'),abilities=new Set(roster.flatMap(f=>[f.traits.power,f.traits.power2]).map(n=>globalThis.CLASS_ABILITIES.definition(n)?.id).filter(Boolean));
assert.equal(plan.candidates.filter(c=>c.key.startsWith('ability:')).length,abilities.size);assert(plan.candidates.length>4);assert.equal(plan.candidates.filter(c=>c.key.startsWith('stat:')).length,5);assert.equal(plan.candidates.filter(c=>/^role:\w+$/.test(c.key)).length,4);assert(plan.candidates.some(c=>c.key.startsWith('weapon:')));assert.equal(plan.candidates.filter(c=>c.key.startsWith('within:tank:stat:')).length,5);assert(plan.census.traits.some(t=>t.key.startsWith('trait:class:')));assert(plan.census.compositions.length);
assert.equal(auditLever('within:tank:stat:DUR'),'role:tank:stat:DUR');assert(auditCarries(roster[0],'within:tank:stat:DUR'));assert(!auditCarries(roster[1],'within:tank:stat:DUR'));
assert.equal(plan.candidates.find(c=>c.key==='within:tank:stat:STR').method,'role-intervention');assert.equal(auditSuggestion(w.balance.profile,'stat:STR',12,28,'preseason'),null);assert.equal(auditCandidateSuggestion(plan,'within:tank:stat:STR',Math.round(plan.pairs*12/28)).to,1.1,'A useful role-specific intervention need not claim the global stat is imbalanced.');assert.equal(auditCandidateSuggestion(plan,'role:tank',plan.pairs),null,'Conflicting season and simulation directions require assessment.');
const conditional=balanceObservations([{'role:tank':1,'within:tank:ability:fire':1},{'role:tank':1,'within:tank:ability:ice':1}],0);assert(conditional.some(r=>r.key==='within:tank:ability:fire'));assert(!balanceObservations([{'role:tank':1,'within:tank:ability:fire':1},{'role:tank':0}],0).some(r=>r.key.startsWith('within:')));
assert.equal(auditResponse({pairs:28,wins:0,patchedWins:0,validationMargin:-.8,patchedMargin:-.7,marginDeltas:Array(28).fill(.1)},1).improved,true);
assert.equal(auditResponse({pairs:28,wins:0,patchedWins:0,validationMargin:-.8,patchedMargin:-.8,marginDeltas:Array(28).fill(0)},1).improved,false);

// Neutral outcomes cover the entire report without inventing a patch.
const even=(teams,seed)=>({winnerTeam:seed%2,hp:seed%2?[0,50]:[50,0]});
const combinations=new Set(),mapWeather=new Set(),screenConditions=[],neutral=completeAudit(w,'preseason',(teams,seed,options,key)=>{if(key==='stat:STR'){if(screenConditions.length<16)screenConditions.push(options.conditions);combinations.add(options.conditions.time+'|'+options.conditions.weather);mapWeather.add(options.conditions.map+'|'+options.conditions.weather);}return even(teams,seed);}),original=structuredClone(w),entry=applyBalanceAudit(structuredClone(w),'preseason',neutral.report);assert.equal(entry.changes.length,0);assert.equal(new Set(screenConditions.map(c=>c.time)).size,4);assert.equal(new Set(screenConditions.map(c=>c.map)).size,4);assert.equal(new Set(screenConditions.map(c=>c.weather)).size,4);const pairsPlayed=new Set(screenConditions.map(c=>JSON.stringify(c))).size;assert(pairsPlayed>=8);assert.equal(combinations.size,pairsPlayed,'Time and weather must not be coupled.');assert.equal(mapWeather.size,pairsPlayed,'Map and weather must not be coupled.');assert.equal(entry.coverage.abilities,abilities.size);assert.equal(entry.coverage.stats,5);assert.deepEqual(w,original);
// Shape and provenance validation cover both individual and combined reports.
const stale=structuredClone(w);stale.fighters.f0.ovr++;assert.throws(()=>applyBalanceAudit(stale,'preseason',neutral.report),/stale/);
const missing=structuredClone(neutral.report);missing.rows.pop();assert.throws(()=>applyBalanceAudit(structuredClone(w),'preseason',missing),/incomplete/);

const fighter=(id,power,power2='No second power',weapon='Longbow',stats=[200,200,200,200,200])=>({id,name:id,team:'a',traits:{class:'Unknown',weapon,mastery:'Master',magic:'Limitless magic',power,power2,weakness:'None'},summary:{generationVersion:4,stats,total:stats.reduce((a,b)=>a+b,0),tier:'B'},role:power==='Mending wave'?'healer':'damage',ovr:75,salary:3});
const inputs=[[fighter('a','Fire control'),fighter('b','Mending wave')],[fighter('c','Stun bolt'),fighter('d','Fire control')]],saved=structuredClone(inputs),profile={id:'effect-tests',multipliers:{'ability:fire:potency':1.1,'ability:mendingWave:healing':1.1,'ability:stunBolt:duration':1.1,'stat:DUR':1.1,'role:healer:stat:DUR':.9}};
validateBalanceProfile(profile);assert.throws(()=>validateBalanceProfile({id:'bad',multipliers:{'role:typo:stat:DUR':1.1}}));
const base=new TeamBattle(inputs,91,{headless:true,map:'open'}),tuned=new TeamBattle(inputs,91,{headless:true,map:'open',balance:profile});assert.deepEqual(inputs,saved);assert.equal(tuned.fighters[0].stats[2],220.00000000000003);assert.equal(tuned.fighters[1].stats[2],180,'Scoped override replaces the global value.');
for(const battle of [base,tuned]){battle.obstacles=[];const [fire,healer,control,target]=battle.fighters;Object.assign(fire,{x:400,y:300,mana:100,cast:0,action:null});Object.assign(target,{x:500,y:300});const p=fire.powers.find(p=>p.id==='fire');battle.usePower(fire,target,p);fire.testProjectile=battle.projectiles.at(-1);Object.assign(healer,{x:400,y:320});fire.hp=fire.maxHp*.3;healer.hp=healer.maxHp*.3;const before=fire.hp;battle.applySupportAbility(healer,healer.powers.find(p=>p.id==='mendingWave'),[fire]);healer.testHealing=fire.hp-before;Object.assign(control,{x:400,y:350});battle.applySupportAbility(control,control.powers.find(p=>p.id==='stunBolt'),[fire]);control.testDuration=battle.projectiles.at(-1).duration;}
assert(Math.abs(tuned.fighters[0].testProjectile.damage/base.fighters[0].testProjectile.damage-1.1)<1e-10);assert(Math.abs(tuned.fighters[1].testHealing/base.fighters[1].testHealing-1.1)<1e-10);assert(Math.abs(tuned.fighters[2].testDuration/base.fighters[2].testDuration-1.1)<1e-10);assert.equal(tuned.fighters[0].damage,base.fighters[0].damage,'Ability power cannot leak into weapon attacks.');
const parity=Engine=>{const b=new Engine(inputs,18,{headless:true,map:'open'});while(!b.done)b.step(1/60);const {combatVersion,...r}=b.result();return r;};assert.deepEqual(parity(Comprehensive),parity(Previous));assert.equal(teamEngine('team-2.5'),Previous);assert.equal(new (teamEngine('team-3.3'))([squad(['tank','healer','damage'],20),squad(['tank','healer','damage'],21)],81,{headless:true,balance:profile}).titan.id,'forge-titan');
const coreTeams=[squad(['tank','healer','damage'],20),squad(['tank','healer','damage'],21)],coreRun=version=>{const {combatVersion,...r}=simulateTeam(coreTeams,81,{engineVersion:version});return r;};assert.deepEqual(coreRun('team-3.3'),coreRun('team-3.2'),'A complete neutral Core battle preserves historical outcomes.');

// Two independent role corrections are combined and tested on fresh seeds.
const selected=['role:tank','role:controller'],response=(teams,seed,options,key)=>{
 const role=key.split(':')[1];if(!['tank','controller'].includes(role))return even(teams,seed);
 const side=teams.findIndex(t=>t[0].role===role),lever=role==='tank'?'role:tank:health':'role:controller:control',buff=(options.balance.multipliers[lever]??1)>1;
 return {winnerTeam:1-side,hp:side===0?[0,buff?50:60]:[buff?50:60,0]};
};
// Controlled response cases select non-tank/non-controller alternatives to
// isolate the test, while the real matching algorithm is covered separately.
const twoWorld=structuredClone(w);for(const f of Object.values(twoWorld.fighters))if(['tank','controller'].includes(f.role))f.ovr=85;else f.ovr=75;
const two=completeAudit(twoWorld,'preseason',response,selected),twoPatch=applyBalanceAudit(twoWorld,'preseason',two.report);assert.equal(twoPatch.changes.length,2,'The final patch can apply several jointly validated corrections.');;assert(two.report.bundles.length>0);assert(twoPatch.combined.length>0);
const incomplete=structuredClone(two.report);incomplete.bundles=[];assert.throws(()=>applyBalanceAudit(structuredClone({...twoWorld,balance:original.balance}),'preseason',incomplete),/stale|combined/);
// A shared ability can explain a role failure. The broad health adjustment
// must be deferred only when independent combined role cases improve too.
const culpritWorld=structuredClone(w);for(const f of Object.values(culpritWorld.fighters))if(f.role==='tank'){f.traits.power2=f.traits.power;f.traits.power='Fire control';Object.assign(f,L.scoutFighter(f));}
assert(Object.values(culpritWorld.fighters).filter(f=>f.role==='tank'&&f.traits.power==='Fire control').length>=2);
const culpritResponse=(teams,seed,options,key)=>{
 if(!['role:tank','ability:fire'].includes(key))return even(teams,seed);
 const side=teams.findIndex(t=>key==='role:tank'?t[0].role==='tank':t[0].traits.power==='Fire control'),buff=(options.balance.multipliers['role:tank:health']??1)>1||(options.balance.multipliers['ability:fire:potency']??1)>1||(options.balance.multipliers['ability:fire:cooldown']??1)<1;
 return {winnerTeam:1-side,hp:side===0?[0,buff?50:60]:[buff?50:60,0]};
};
const culprit=completeAudit(culpritWorld,'preseason',culpritResponse,['role:tank','ability:fire']),culpritPatch=applyBalanceAudit(culpritWorld,'preseason',culprit.report);assert(culpritPatch.changes.some(c=>c.key==='ability:fire'));assert(!culpritPatch.changes.some(c=>c.key==='role:tank'),'The responsive shared ability replaces the broad tank buff.');assert.match(culpritPatch.diagnostics.find(d=>d.key==='role:tank').note,/narrower shared/);
// Individually helpful changes can conflict. Fresh combined comparisons
// reverse the synthetic response; no such combined patch may be applied.
const conflictWorld=structuredClone(w),conflict=completeAudit(conflictWorld,'preseason',(teams,seed,options,key)=>{const result=response(teams,seed,options,key);if((options.balance.multipliers['role:tank:health']??1)>1&&(options.balance.multipliers['role:controller:control']??1)>1){const role=key.split(':')[1],side=teams.findIndex(t=>t[0].role===role);if(side>=0&&selected.includes(key))return {...result,hp:side===0?[0,90]:[90,0]};}return result;},selected),conflictPatch=applyBalanceAudit(conflictWorld,'preseason',conflict.report);assert(conflict.report.bundles.length>0);assert(conflictPatch.changes.length<2,'Conflicting adjustments are reduced or held; they cannot slip through independently.');
fs.writeFileSync('validation/comprehensive-balance.json',JSON.stringify({coverage:entry.coverage,neutralChanges:entry.changes.length,abilityPowerAndHealingAndDuration:true,scopedOverrides:true,neutralEngineParity:true,oldReplayEnginePreserved:true,combinedChanges:twoPatch.changes,combinedAttempts:two.report.bundles.length},null,2)+'\n');
console.log('Comprehensive balance: complete coverage, conditional role evidence, named cast power/healing/duration, scoped stat overrides, no weapon leakage, old replay preservation, neutral parity, combined validation and stale/incomplete report guards passed.');

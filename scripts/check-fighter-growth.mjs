import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {DatabaseSync} from 'node:sqlite';import worker from '../dist/server/index.js';import {createTournament,nextMatch,recordMatch,defaultStage} from '../public/tournaments.js';import {Battle} from '../public/combat.js';import {Battle as OldBattle} from '../public/combat-v4.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const call=(path,method='GET',body,owner='growth-owner')=>worker.fetch(new Request('https://fateforge.test/api/'+path,{method,headers:{'oai-authenticated-user-id':owner,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
const all=[];
for(const tier of ['E','D','C','B','A','S','SS']){const started=performance.now(),rows=[];for(let batch=0;batch<2;batch++){const response=await call('characters/bulk-generate','POST',{ids:Array.from({length:8},()=>crypto.randomUUID()),tier});assert.equal(response.status,200,await response.clone().text());rows.push(...(await response.json()).characters);}assert(rows.every(c=>c.summary.tier===tier&&Object.keys(c.traits).length===14));assert.equal(new Set(rows.map(c=>JSON.stringify(c.traits))).size,16);all.push(...rows);console.log(`${tier}: 16 randomly rolled fighters, ${Math.round(performance.now()-started)}ms`);}
for(const tier of ['F','SSS'])assert.equal((await call('characters/bulk-generate','POST',{ids:[crypto.randomUUID()],tier})).status,400);
const low=all.find(c=>c.summary.tier==='C'),high=all.find(c=>c.summary.tier==='B');
const original=(await(await call('characters/'+low.id)).json()).character;assert.equal((await call('characters/'+low.id,'PUT',{name:original.name,state:original.state})).status,200);
assert.equal((await call('characters/'+low.id,'PUT',{name:'Cheat',state:original.state})).status,409);const changed=structuredClone(original.state);changed.traits.strength=changed.pools.base.strength.at(-1).name;assert.equal((await call('characters/'+low.id,'PUT',{name:original.name,state:changed})).status,409);
assert.equal((await call('characters/'+low.id,'PUT',{name:original.name,state:original.state},'other-owner')).status,404);
const state=createTournament('Growth cup',[low,high],[{...defaultStage('swiss'),rounds:3,advance:1}],100,{shuffle:false}),id=crypto.randomUUID();assert.equal((await call('tournaments/'+id,'PUT',{name:state.name,state})).status,200);
const complete=winner=>{const m=nextMatch(state);recordMatch(state,m,[{winner,seconds:1,combatVersion:8}]);};complete(low.id);
let response=await call('tournaments/'+id,'PUT',{name:state.name,state});assert.equal(response.status,200,await response.clone().text());const progress=(await response.json()).promotions;assert.equal(progress.length,1);assert.equal(progress[0].amount,0);assert.equal(progress[0].upgraded,false);
let detail=(await(await call('characters/'+low.id)).json()).character;assert.deepEqual(detail.state,original.state);assert.equal(detail.summary.total,original.summary.total);assert.equal(detail.summary.growth.wins,1);assert.deepEqual(detail.summary.promotion,{tier:'C',wins:1,required:2});assert.equal(detail.summary.growth.last,undefined);
assert.equal((await(await call('tournaments/'+id,'PUT',{name:state.name,state})).json()).promotions.length,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fighter_growth').get().n,1);
assert.equal((await call('characters/'+low.id,'PUT',{name:original.name,state:original.state})).status,200);assert.equal((await(await call('characters/'+low.id)).json()).character.summary.growth.wins,1);
// Losses do not erase banked upset wins; friendlies do not count.
complete(high.id);assert.equal((await(await call('tournaments/'+id,'PUT',{name:state.name,state})).json()).promotions.length,0);
assert.equal((await call('match-records/'+crypto.randomUUID(),'PUT',{a:low.id,b:high.id,score:[1,0]})).status,200);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fighter_growth').get().n,1);
assert.equal((await(await call('characters/'+low.id)).json()).character.summary.promotion.wins,1);
complete(low.id);response=await call('tournaments/'+id,'PUT',{name:state.name,state});assert.equal(response.status,200,await response.clone().text());const reward=(await response.json()).promotions;assert.equal(reward.length,1);assert(reward[0].amount>0);assert.equal(reward[0].upgraded,true);
detail=(await(await call('characters/'+low.id)).json()).character;assert.equal(detail.summary.total,original.summary.total+reward[0].amount);assert.equal(detail.summary.growth.wins,2);assert.equal(detail.summary.growth.upgrades,1);assert.equal(detail.summary.promotion.wins,0);assert.deepEqual(detail.state,original.state);
const axis=['strength','speed','durability','iq','magic'].indexOf(reward[0].axis);assert.equal(original.summary.stats[axis],Math.min(...original.summary.stats));const wheel=original.state.pools.base[reward[0].axis],index=wheel.findIndex(o=>o.name===reward[0].from);assert.equal(reward[0].to,wheel[index+1].name);assert.equal(reward[0].amount,wheel[index+1].stats[axis]-wheel[index].stats[axis]);
// Old tournaments keep their historical rules and do not get retroactive buffs.
const legacy=createTournament('Old cup',[all[0],all.at(-1)],[defaultStage('single')],10,{shuffle:false});delete legacy.progressionVersion;const match=nextMatch(legacy);recordMatch(legacy,match,[1,2,3].map(()=>({winner:all[0].id,seconds:1})));assert.equal((await call('tournaments/'+crypto.randomUUID(),'PUT',{name:legacy.name,state:legacy})).status,200);assert.equal((await(await call('characters/'+all[0].id)).json()).character.summary.growth,undefined);
// Two devices can award identical-looking upsets in different cups without losing a step.
let queue=Promise.resolve();const originalBatch=env.DB.batch;env.DB.batch=statements=>{const run=queue.then(()=>originalBatch(statements));queue=run.catch(()=>{});return run;};
const concurrentLow=all.filter(c=>c.summary.tier==='C').at(-1),concurrentHigh=all.find(c=>c.summary.tier==='S'),cups=[];
for(let i=0;i<2;i++){const cup=createTournament('Concurrent cup',[concurrentLow,concurrentHigh],[{...defaultStage('swiss'),rounds:2,advance:1}],i,{shuffle:false}),cupId=crypto.randomUUID();assert.equal((await call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup})).status,200);recordMatch(cup,nextMatch(cup),[{winner:concurrentLow.id,seconds:1}]);cups.push({cup,cupId});}
const concurrent=await Promise.all(cups.map(({cup,cupId})=>call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup})));for(const reply of concurrent)assert.equal(reply.status,200,await reply.clone().text());
const simultaneous=(await(await call('characters/'+concurrentLow.id)).json()).character;assert.equal(simultaneous.summary.growth.wins,2);assert.equal(simultaneous.summary.growth.upgrades,1);assert.equal(simultaneous.summary.promotion.wins,0);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fighter_growth WHERE character_id = ?').get(concurrentLow.id).n,2);
// Every requested threshold is enforced by the production storage path.
for(const [tier,required]of Object.entries({E:1,D:1,C:2,B:4,A:8,S:16})){
 const candidate=all.filter(c=>c.summary.tier===tier)[2],opponent=all.find(c=>c.summary.tier==='SS');
 const cup=createTournament('Threshold '+tier,[candidate,opponent],[{...defaultStage('swiss'),rounds:required,advance:1}],7,{shuffle:false}),cupId=crypto.randomUUID();
 assert.equal((await call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup})).status,200);
 for(let n=1;n<=required;n++){
  recordMatch(cup,nextMatch(cup),[{winner:candidate.id,seconds:1,combatVersion:8}]);const reply=await call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup});assert.equal(reply.status,200,await reply.clone().text());const changes=(await reply.json()).promotions;assert.equal(changes.length,1);
  const current=(await(await call('characters/'+candidate.id)).json()).character;
  assert.equal(current.summary.growth.wins,n);assert.equal(current.summary.growth.upgrades,n===required?1:0);assert.equal(current.summary.promotion.wins,n===required?0:n);
  if(n<required){assert.deepEqual(current.summary.stats,candidate.summary.stats);assert.equal(changes[0].amount,0);assert.equal(current.summary.promotion.required,required);}
  else{assert(changes[0].amount>0);assert.equal(current.summary.total,candidate.summary.total+changes[0].amount);}
  assert.equal((await(await call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup})).json()).promotions.length,0);
 }
 console.log(tier+': upgrade on qualifying win '+required+' only');
}
// Legacy earned stats are preserved; crossing C -> B resets progress to the B quota.
{
 const candidate=all.filter(c=>c.summary.tier==='C')[3],original=(await(await call('characters/'+candidate.id)).json()).character,amount=999-original.summary.total;
 const growth={wins:5,bonus:[amount,0,0,0,0],levels:{},last:{axis:'strength',from:'Previously earned',to:'Previously earned',amount,opponent:'Legacy opponent'}};
 const summary={...original.summary,growth,stats:original.summary.stats.map((v,i)=>v+(i===0?amount:0)),total:999,tier:'C'};
 db.prepare('UPDATE saved_characters SET summary_json = ? WHERE id = ?').run(JSON.stringify(summary),candidate.id);
 const current=(await(await call('characters/'+candidate.id)).json()).character;assert.deepEqual(current.summary.promotion,{tier:'C',wins:0,required:2});
 const opponent=all.find(c=>c.summary.tier==='SS'),cup=createTournament('Boundary',[{...current,traits:current.state.traits},opponent],[{...defaultStage('swiss'),rounds:3,advance:1}],9,{shuffle:false}),cupId=crypto.randomUUID();assert.equal((await call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup})).status,200);
 for(let n=1;n<=3;n++){
  recordMatch(cup,nextMatch(cup),[{winner:candidate.id,seconds:1}]);const reply=await call('tournaments/'+cupId,'PUT',{name:cup.name,state:cup});assert.equal(reply.status,200,await reply.clone().text());const updated=(await(await call('characters/'+candidate.id)).json()).character;
  assert.deepEqual(updated.state,original.state);assert.equal(updated.summary.growth.wins,5+n);assert.equal(updated.summary.growth.upgrades,n===1?5:6);
  if(n===1){assert.equal(updated.summary.total,999);assert.equal(updated.summary.promotion.wins,1);assert.equal(updated.summary.growth.bonus[0],amount);}
  else{assert.equal(updated.summary.tier,'B');assert.equal(updated.summary.promotion.required,4);assert.equal(updated.summary.promotion.wins,n===2?0:1);}
 }
}
// Wards and dodges stop interruptions. Only the opening successful pulse cancels an attack.
const fighter=(id,power)=>({id,name:id,summary:{stats:[100,100,100,100,100]},traits:{weapon:'Longbow',power,power2:'No second power',weakness:'None'}});
const battle=new Battle(fighter('a','Chain lightning'),fighter('b','Force fields'),1,{conditions:{time:'night'}}),[f,t]=battle.fighters;f.x=200;t.x=300;f.y=t.y=300;const action={kind:'shot'};t.action=action;t.wardHits=3;battle.usePower(f,t,f.powers[0]);battle.environmentStep(0);assert.equal(t.action,action);assert.equal(t.wardHits,2);t.wardHits=0;battle.rng=()=>0;battle.time=.45;battle.environmentStep(0);assert.equal(t.action,action);battle.lightningPulses=[];battle.usePower(f,t,f.powers[0]);battle.environmentStep(0);assert.equal(t.action,null);
t.action=action;battle.lightningPulses=[];battle.rng=()=>1;battle.usePower(f,t,f.powers[0]);battle.environmentStep(0);assert.equal(t.action,action);
battle.done=true;battle.winner=0;assert.equal(battle.result().combatVersion,9);const old=new OldBattle(fighter('a','Chain lightning'),fighter('b','No power'),1);old.done=true;old.winner=0;assert.equal(old.result().combatVersion,4);
console.log('Growth and balance checks passed: 16 random fighters per rollable tier, immutable saves and idempotent retries, tier-based upset thresholds and one lowest-stat step per completed quota, original rolls preserved, no duplicate/friendly/legacy rewards, and guarded Chain lightning interruptions with v4 replay support.');

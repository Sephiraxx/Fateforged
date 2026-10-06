import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEAGUES} from '../public/leagues.js';
import {interleagueFixtures} from '../public/league-fixtures.js';
import {resolveConditions} from '../public/conditions.js';
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
const roster=Array.from({length:164},(_,i)=>({id:'double-'+i,name:'Fighter '+i,traits:{},summary:{wheelRarity:'common'}}));
const result=(m,winner=m.a)=>Array.from({length:Math.floor(m.bestOf/2)+1},(_,i)=>({winner,seconds:1,combatVersion:m.engineVersion,environment:resolveConditions((m.seed+i*65537)>>>0,m.conditions)}));
const original=LEAGUES.create('double-cup-test',roster,512,{roundRobin:1,bestOf:1});
while(original.phase!=='champions'){const m=LEAGUES.next(original);LEAGUES.record(original,m.id,result(m));}
const cases=[];
for(const resetWinner of [null,'upper','lower']){
 const world=structuredClone(original),rng=LEAGUES.rng(72),counts={};
 while(LEAGUES.next(world)){
  const m=LEAGUES.next(world),main=['champions','europa'].includes(m.phase);
  if(main){
   assert.equal(world.cup.format,'double');assert.equal(m.bestOf,m.label.startsWith('Grand final')?5:3);
   assert(world.cup.losses[m.a]<2&&world.cup.losses[m.b]<2);assert.throws(()=>LEAGUES.movement(world));
   const before=JSON.stringify(world),view=interleagueFixtures(world).cups.find(c=>c.phase===m.phase),fixture=view.rounds.flatMap(r=>r.matches).find(f=>f.id===m.id);
   assert.equal(fixture.status,'next');assert.deepEqual([fixture.a.id,fixture.b.id,fixture.bestOf],[m.a,m.b,m.bestOf]);assert.equal(JSON.stringify(world),before);
  }else assert.equal(m.bestOf,3); // Qualifiers retain their Bo3 single elimination.
  const winner=m.bracketKey==='GF'?resetWinner?m.b:m.a:m.bracketKey==='GF-reset'?resetWinner==='lower'?m.b:m.a:rng()<.5?m.a:m.b;
  LEAGUES.record(world,m.id,result(m,winner));if(main)counts[m.phase]=(counts[m.phase]??0)+1;
 }
 for(const phase of ['champions','europa']){
  const cup=world.cupResults.find(c=>c.competition===phase);assert.equal(counts[phase],resetWinner?31:30);assert.equal(cup.resetPlayed,!!resetWinner);assert.equal(cup.losses[cup.champion],resetWinner?1:0);
  assert(cup.entrants.filter(id=>id!==cup.champion).every(id=>cup.losses[id]===2));
  const fixture=interleagueFixtures(world).cups.find(c=>c.phase===phase);assert.equal(fixture.rounds.flatMap(r=>r.matches).length,counts[phase]);assert(fixture.rounds.flatMap(r=>r.matches).every(f=>f.status==='completed'));
 }
 cases.push({resetWinner,cupSeries:counts});
}
// Pending cup rounds expose only independent pairings for the matchweek batch.
{const w=structuredClone(original);let rounds=0;while(w.phase==='champions'){const first=LEAGUES.next(w),batch=LEAGUES.upcoming(w,12);assert(batch.every(m=>m.round===first.round&&m.phase===first.phase));assert.equal(new Set(batch.flatMap(m=>[m.a,m.b])).size,batch.length*2);for(const m of batch)LEAGUES.record(w,m.id,result(m));assert(!LEAGUES.next(w)||w.phase!=='champions'||LEAGUES.next(w).round>first.round);rounds++;}assert.equal(rounds,8);}
// An unplayed old draw adopts the format; a started old cup finishes unchanged.
{const old=structuredClone(original);delete old.cupRulesVersion;old.cup={entrants:[...old.cup.entrants],players:[...old.cup.entrants],pending:Array.from({length:8},(_,i)=>old.cup.entrants.slice(i*2,i*2+2)),winners:[],round:1,played:0,byes:[],target:1};const pair=LEAGUES.next(old);LEAGUES.prepare(old);assert.equal(old.cup.format,'double');assert.deepEqual([LEAGUES.next(old).a,LEAGUES.next(old).b],[pair.a,pair.b]);assert.equal(LEAGUES.next(old).bestOf,3);}
{const old=structuredClone(original);old.cupRulesVersion=1;old.cup={entrants:[...old.cup.entrants],players:[...old.cup.entrants],pending:Array.from({length:8},(_,i)=>old.cup.entrants.slice(i*2,i*2+2)),winners:[],round:1,played:0,byes:[],target:1};const first=LEAGUES.next(old);assert.equal(first.bestOf,1);LEAGUES.record(old,first.id,result(first));delete old.cupRulesVersion;const saved=JSON.stringify(old.cup);LEAGUES.prepare(old);assert.equal(JSON.stringify(old.cup),saved);while(old.phase==='champions'){const m=LEAGUES.next(old);LEAGUES.record(old,m.id,result(m));}assert.equal(old.history.filter(m=>m.phase==='champions').length,15);assert.equal(old.cupResults.find(c=>c.competition==='champions').format,'single');assert.equal(interleagueFixtures(old).cups.find(c=>c.phase==='champions').rounds.flatMap(r=>r.matches).length,15);}
// Checkpoint before a reset, reopen, finish, and retry without a duplicate title/result.
{
 const db=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 db.prepare('INSERT INTO league_worlds(owner_id,id,revision,last_operation,state_json,updated_at) VALUES(?,?,?,?,?,?)').run('double-owner',original.id,0,'initial',JSON.stringify(original),1);
 const call=async body=>{const response=await worker.fetch(new Request('https://fateforge.test/api/leagues',{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'double-owner','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env),data=await response.json();assert.equal(response.status,200,data.error);return data;};
 const preview=structuredClone(original),series=[];while(LEAGUES.next(preview).bracketKey!=='GF-reset'){const m=LEAGUES.next(preview),results=result(m,m.bracketKey==='GF'?m.b:m.a);series.push({matchId:m.id,results});LEAGUES.record(preview,m.id,results);}
 const batch={action:'recordBatch',operationId:crypto.randomUUID(),revision:0,series,compact:true},checkpoint=await call(batch);assert.deepEqual(await call(batch),checkpoint);const reopened=await call();assert.deepEqual(reopened.world,preview);assert.equal(reopened.world.cupResults.filter(c=>c.competition==='champions').length,0);
 const reset=LEAGUES.next(reopened.world);assert.equal(reset.bestOf,5);const finish={action:'record',operationId:crypto.randomUUID(),revision:checkpoint.revision,matchId:reset.id,results:result(reset,reset.b)},done=await call(finish);assert.deepEqual(await call(finish),done);assert.equal(done.world.cupResults.find(c=>c.competition==='champions').resetPlayed,true);assert.equal(db.prepare('SELECT COUNT(*) n FROM match_records').get().n,31);assert.equal(db.prepare("SELECT COUNT(*) n FROM champion_history WHERE division_key='interleague-champions'").get().n,1);db.close();
}
fs.mkdirSync('validation',{recursive:true});fs.writeFileSync('validation/interleague-double.json',JSON.stringify({format:'16-entrant double elimination',bracketsBestOf:3,grandFinalBestOf:5,cases,checks:'Two series losses eliminate; 30/31 series; upper/lower reset victories; all seeded fixture pairings; independent round batches; legacy started/unplayed adoption; qualifiers unchanged; persisted reset checkpoint/reopen; retry-safe result and championship'},null,2)+'\n');
console.log('Interleague double elimination passed: both cup finals/reset outcomes, two-loss exits, fixtures, round batches and saved-cup compatibility.');

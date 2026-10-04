import assert from 'node:assert/strict';
import {recommendedStages,stagePlan} from '../public/stage-recommendations.js';
import {defaultStage,createTournament,nextMatch,recordMatch} from '../public/tournaments.js';

const formats=['groups','swiss','double'];
const original=formats.map(defaultStage),copy=structuredClone(original);
const suggested=recommendedStages(128,original);
assert.deepEqual(original,copy,'Reading suggestions must preserve manual settings');
assert.equal(suggested[0].groups,32);
assert.equal(suggested[0].advance,64);
assert.equal(suggested[1].rounds,6);
assert.equal(suggested[1].advance,16);
const plan=stagePlan(128,suggested);
assert.deepEqual(plan.map(s=>s.incoming),[128,64,16]);
assert.deepEqual(plan.map(s=>s.outgoing),[64,16,1]);
assert.deepEqual(plan.map(s=>s.matches),[192,192,'30–31']);
const custom=structuredClone(suggested);custom[0].groups=64;
assert(stagePlan(128,custom)[0].warnings.some(w=>w.includes('only one match')));
custom[0].advance=32;
assert.equal(stagePlan(128,custom)[1].suggestion.rounds,5);
assert.equal(stagePlan(128,custom)[1].incoming,32);
custom[0].advance=NaN;
assert.equal(stagePlan(128,custom)[0].settingsValid,false);
assert.equal(stagePlan(128,custom)[1].active,false);
const uneven=stagePlan(17,[{...defaultStage('groups'),groups:4,advance:6},defaultStage('swiss')]);
assert(uneven[0].details.some(s=>s.includes('4–5')));
assert(uneven[0].details.some(s=>s.includes('plus 2 by cross-group ranking')));
assert(stagePlan(4,[{...defaultStage('swiss'),rounds:4}])[0].warnings.some(s=>s.includes('repeat')));
for(let n=2;n<=128;n++)for(const types of [formats,['groups','single'],['swiss','double'],['single'],['groups','groups','swiss','double']]){
 const stages=recommendedStages(n,types.map(defaultStage)),rows=stagePlan(n,stages);
 assert(rows.every(r=>r.active&&r.settingsValid));
 assert.equal(rows.at(-1).outgoing,1);
 for(const [i,row]of rows.entries()){
  assert(row.outgoing<=row.incoming);
  if(stages[i].type==='swiss')assert(stages[i].rounds<=row.incoming-1);
  if(stages[i].type==='groups')assert(stages[i].groups<=Math.floor(row.incoming/2));
 }
}
// Verify the suggested field sizes against actual advancement, not just the UI.
const roster=Array.from({length:128},(_,i)=>({id:'fighter-'+i,name:'Fighter '+i,traits:{},summary:{total:100,stats:[10,10,10,10,10]}}));
const tournament=createTournament('Suggested cup',roster,suggested,123,{shuffle:false});
let matches=0;
while(!tournament.done){const m=nextMatch(tournament);assert(m);recordMatch(tournament,m,Array.from({length:m.bestOf?Math.floor(m.bestOf/2)+1:m.legs},()=>({winner:m.a})));assert(++matches<500);}
assert.deepEqual(tournament.stageResults.map(r=>r.ranking.length),[128,64,16]);
assert(matches>=414&&matches<=415);
assert(tournament.champion);
console.log('Stage recommendations passed: 128 → 64 → 16 → champion, actual advancement, manual settings, uneven groups, invalid inputs, and all entrant counts 2–128.');

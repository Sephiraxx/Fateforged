import assert from 'node:assert/strict';
import {recommendedStages,stagePlan} from '../public/stage-recommendations.js';
import {defaultStage,createTournament,nextMatch,recordMatch} from '../public/tournaments.js';

const formats=['groups','swiss','double'];
const original=formats.map(defaultStage),copy=structuredClone(original);
const suggested=recommendedStages(128,original);
assert.deepEqual(original,copy,'Reading suggestions must preserve manual settings');
assert.equal(suggested[0].groups,32);
assert.equal(suggested[0].advance,64);
assert.equal(suggested[1].rounds,5);
assert.equal(suggested[1].advance,32);
const plan=stagePlan(128,suggested);
assert.deepEqual(plan.map(s=>s.incoming),[128,64,32]);
assert.deepEqual(plan.map(s=>s.outgoing),[64,32,1]);
assert.deepEqual(plan.map(s=>s.matches),[192,'up to 160','62–63']);
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
assert(stagePlan(4,[defaultStage('swiss')])[0].details.some(s=>s.includes('3 wins qualify')));
for(let n=2;n<=128;n++)for(const types of [formats,['groups','single'],['swiss','double'],['single'],['groups','groups','swiss','double']]){
 const stages=recommendedStages(n,types.map(defaultStage)),rows=stagePlan(n,stages);
 assert(rows.every(r=>r.settingsValid));
 assert(rows.at(-1).outgoing<=1);
 for(const [i,row]of rows.entries()){
  assert(row.outgoing<=row.incoming);
  if(stages[i].type==='swiss')assert.equal(stages[i].rounds,5);
  if(stages[i].type==='groups'&&row.active)assert(stages[i].groups<=Math.floor(row.incoming/2));
 }
}
// Verify the suggested field sizes against actual advancement, not just the UI.
const roster=Array.from({length:128},(_,i)=>({id:'fighter-'+i,name:'Fighter '+i,traits:{},summary:{total:100,stats:[10,10,10,10,10]}}));
const tournament=createTournament('Suggested cup',roster,suggested,123,{shuffle:false});
let matches=0;
while(!tournament.done){const m=nextMatch(tournament);assert(m);recordMatch(tournament,m,Array.from({length:m.bestOf?Math.floor(m.bestOf/2)+1:m.legs},()=>({combatVersion:12,winner:m.a})));assert(++matches<500);}
assert.equal(tournament.stageResults[0].ranking.length,128);assert.equal(tournament.stageResults[1].ranking.length,64);const qualified=tournament.stageResults[1].qualified;assert(qualified.length>0);assert.equal(tournament.stageResults[2].ranking.length,qualified.length);for(const [id,row]of Object.entries(tournament.stageResults[1].table))assert(qualified.includes(id)?row.wins===3:row.losses===3);assert(tournament.history.filter(m=>m.stage===1).every(m=>m.round<=5));
assert(matches>192);
assert(tournament.champion);
console.log('Stage recommendations passed: groups → Swiss three-win qualification → champion, actual advancement, manual settings, uneven groups, invalid inputs, and all entrant counts 2–128.');

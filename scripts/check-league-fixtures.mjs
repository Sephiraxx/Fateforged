// Prepared for the next validation run; fixture viewing is entirely read-only.
import assert from 'node:assert/strict';
import {LEAGUES} from '../public/leagues.js';
import {leagueCupFixtures,interleagueFixtures} from '../public/league-fixtures.js';
import {resolveConditions} from '../public/conditions.js';
const roster=Array.from({length:164},(_,i)=>({id:crypto.randomUUID(),name:'Fixture '+i,summary:{tier:'C',wheelRarity:'common'},traits:{}}));
const world=LEAGUES.create(crypto.randomUUID(),roster,123,{roundRobin:1});
const before=JSON.stringify(world);
for(let d=0;d<7;d++){const cup=leagueCupFixtures(world,d),size=LEAGUES.divisionSizes[d];assert.equal(cup.rounds.flatMap(r=>r.matches).length,size-1);assert.equal(cup.byes.length,32-size);assert(cup.rounds.at(-1).matches.every(m=>m.bestOf===5));assert.equal(new Set(cup.entrants.map(e=>e.id)).size,size);}
assert.equal(interleagueFixtures(world).cups.length,0);assert.equal(JSON.stringify(world),before);
const result=m=>Array.from({length:Math.floor(m.bestOf/2)+1},(_,i)=>({winner:m.a,seconds:1,combatVersion:9,environment:resolveConditions((m.seed+i*65537)>>>0,m.conditions)}));
while(LEAGUES.next(world)){
 const match=LEAGUES.next(world);
 if(match.phase!=='league'){
  const state=JSON.stringify(world),cups=match.phase==='cups'?[leagueCupFixtures(world,match.division)]:interleagueFixtures(world).cups;
  const fixture=cups.flatMap(c=>c.rounds).flatMap(r=>r.matches).find(m=>m.id===match.id);
  assert(fixture);assert.deepEqual([fixture.a.id,fixture.b.id,fixture.bestOf],[match.a,match.b,match.bestOf]);assert.equal(fixture.status,'next');assert.equal(JSON.stringify(world),state);
 }
 LEAGUES.record(world,match.id,result(match));
}
for(const cup of [...world.divisions.map((_,d)=>leagueCupFixtures(world,d)),...interleagueFixtures(world).cups])for(const fixture of cup.rounds.flatMap(r=>r.matches)){const actual=world.history.find(m=>m.id===fixture.id);assert(actual);assert.deepEqual(fixture.result,actual);assert.equal(fixture.status,'completed');}
console.log('League fixtures: seeded draws, 20/24-member byes, every next pairing, qualifiers, two cups, completed results and read-only viewing.');

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
const result=m=>Array.from({length:Math.floor(m.bestOf/2)+1},(_,i)=>({winner:m.a,seconds:1,combatVersion:12,environment:resolveConditions((m.seed+i*65537)>>>0,m.conditions)}));
while(LEAGUES.next(world)){
 const match=LEAGUES.next(world);
 if(match.phase!=='league'){
  const state=JSON.stringify(world),cups=match.phase==='cups'?[leagueCupFixtures(world,match.division)]:interleagueFixtures(world).cups;
  const fixture=cups.flatMap(c=>c.rounds).flatMap(r=>r.matches).find(m=>m.id===match.id);
  assert(fixture);assert.deepEqual([fixture.a.id,fixture.b.id,fixture.bestOf],[match.a,match.b,match.bestOf]);assert.equal(fixture.status,'next');assert.equal(JSON.stringify(world),state);
 }
 LEAGUES.record(world,match.id,result(match));
}
for(const cup of [...world.divisions.map((_,d)=>leagueCupFixtures(world,d)),...interleagueFixtures(world).cups])for(const fixture of cup.rounds.flatMap(r=>r.matches).filter(m=>m.status!=='conditional')){const actual=world.history.find(m=>m.id===fixture.id);assert(actual);assert.deepEqual(fixture.result,actual);assert.equal(fixture.status,'completed');}
console.log('League fixtures: seeded draws, 20/24-member byes, every next pairing, qualifiers, two cups, completed results and read-only viewing.');

// Exercise the actual collapsible renderer, including lazy fixture expansion
// and trophy access from current/archived league rows.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.classes=new Set();this.classList={add:v=>this.classes.add(v),toggle(){}};this.textContent='';}
 append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}setAttribute(k,v){this[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}
}
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.fetch=async path=>({ok:true,json:async()=>path.endsWith('/history')?{seasons:[]}:{world:structuredClone(world),revision:1}});
await import('../public/roster-view.js');const {mountLeagues}=await import('../public/league-ui.js');
const host=new Element('section'),records=[{characterId:world.divisions[0][0],divisionKey:'league:0',label:'Crownfire Premier league',titles:2}],ui=mountLeagues(host,{blocked:()=>false,trophies:c=>globalThis.ROSTER_VIEW.championshipDetails(c,records)});
await ui.load();const walk=e=>[e,...e.children.flatMap(walk)],panel=label=>walk(host).find(e=>e.tag==='details'&&e.children[0]?.textContent===label);
assert(walk(host).some(e=>e.textContent==='2 championships won'));
const divisionPanel=panel('Division cup fixtures');divisionPanel.open=true;divisionPanel.listeners.toggle();
const fixtureText=walk(divisionPanel).map(e=>e.textContent).join(' ');assert(fixtureText.includes('Bo5'));assert(!fixtureText.includes('From this league:'));assert(!fixtureText.includes('First-round byes:'));assert(walk(divisionPanel).some(e=>e.classes.has('league-fixture-own')));
const interPanel=panel('Interleague cups & qualifiers');interPanel.open=true;interPanel.listeners.toggle();
for(const inner of walk(interPanel).filter(e=>e.tag==='details'&&e!==interPanel)){inner.open=true;inner.listeners.toggle();assert(walk(inner).some(e=>e.className==='league-fixture'));}
assert(!walk(host).some(e=>/Could not|undefined|ReferenceError/.test(e.textContent)));
console.log('League UI passed: lazy fixture expansion, selected-league highlights, removed entrant/bye paragraphs and clickable trophy totals.');

import assert from 'node:assert/strict';
import {bracketModel} from '../public/brackets.js';
import {createTournament,defaultStage,nextMatch,recordMatch,orderGroupMatches} from '../public/tournaments.js';

const roster=n=>Array.from({length:n},(_,i)=>({id:'fighter-'+i,name:'Fighter '+i,traits:{},summary:{total:100,stats:[10,10,10,10,10]}}));
const tournament=(n,groups)=>createTournament('Group schedule',roster(n),[{...defaultStage('groups'),groups}],123,{shuffle:false});
const groupOf=(t,m)=>t.runtime.groups.findIndex(g=>g.includes(m.a));
const played=[];
const t=tournament(18,3),original=structuredClone(t.runtime.pending);
assert.deepEqual(bracketModel(t).nodes.map(n=>n.id),original.map(m=>m.id));
while(!t.done){const m=nextMatch(t);played.push({round:m.round,group:groupOf(t,m),id:m.id});recordMatch(t,m,[{combatVersion:11,winner:m.a}]);}
assert.equal(played.length,45); // Three six-fighter round robins.
for(let round=1;round<=5;round++)assert.deepEqual(played.filter(m=>m.round===round).map(m=>m.group),[0,1,2,0,1,2,0,1,2]);
assert.deepEqual(t.history.map(({id,seed,a,b,round,label})=>({id,seed,a,b,round,label})).sort((a,b)=>a.id-b.id),original.map(({id,seed,a,b,round,label})=>({id,seed,a,b,round,label})).sort((a,b)=>a.id-b.id));
assert(t.runtime.players.every(id=>t.runtime.table[id].opponents.length===5));

// Resume an old group-first save after all of group one's matches were played.
const old=tournament(12,3),canonical=old.runtime.pending.map(m=>m.id);
old.runtime.pending.sort((a,b)=>a.id-b.id);
const completed=old.runtime.pending.splice(0,6);
old.history=completed.map(m=>({...m,winner:m.a,score:[1,0],results:[{combatVersion:11,winner:m.a}]}));
old.runtime.round=3;
const historyBefore=structuredClone(old.history),queueBefore=structuredClone(old.runtime.pending);
orderGroupMatches(old);
const expected=canonical.filter(id=>!completed.some(m=>m.id===id));
assert.deepEqual(old.runtime.pending.map(m=>m.id),expected);
assert.equal(old.runtime.round,1);
for(const id of expected){assert.equal(nextMatch(old).id,id);old.history.push(old.runtime.pending.shift());}
assert.deepEqual(old.history.slice(0,6),historyBefore);
assert.deepEqual(old.history.slice(6).sort((a,b)=>a.id-b.id),queueBefore.sort((a,b)=>a.id-b.id));

// Uneven and odd groups retain every pairing without scheduling a fighter twice
// in the same round; groups that finish earlier simply drop out of the rotation.
for(const [n,groups]of [[17,4],[9,2],[5,2],[2,1],[128,32]]){
 const state=tournament(n,groups),seen=new Set(),roundPlayers=new Map();let previousRound=0;
 while(!state.done){
  const m=nextMatch(state),g=groupOf(state,m),key=[m.a,m.b].sort().join(':');
  assert(!seen.has(key));seen.add(key);assert(m.round>=previousRound);previousRound=m.round;
  assert.equal(groupOf(state,{a:m.b}),g);
  const players=roundPlayers.get(m.round)||new Set();assert(!players.has(m.a)&&!players.has(m.b));players.add(m.a);players.add(m.b);roundPlayers.set(m.round,players);
  recordMatch(state,m,[{combatVersion:11,winner:m.a}]);
 }
 assert.equal(seen.size,state.runtime.groups.reduce((sum,g)=>sum+g.length*(g.length-1)/2,0));
}
console.log('Group scheduling passed: interleaved match slots and rounds, old-save resumption, unchanged IDs/seeds/history, odd groups, and 128 fighters.');

import assert from 'node:assert/strict';
import '../public/roster-view.js';
const {select,winRate,titles,currentChampionText}=globalThis.ROSTER_VIEW;
const rows=[
 {id:'a',summary:{total:500},matchRecord:{wins:3,losses:1,draws:0,matches:4},championships:2},
 {id:'b',summary:{total:900},matchRecord:{wins:5,losses:3,draws:2,matches:10},championships:4},
 {id:'c',summary:{total:100},matchRecord:{wins:0,losses:0,draws:0,matches:0},championships:0},
 {id:'d',summary:{total:500},matchRecord:{wins:1,losses:0,draws:0,matches:1},championships:1}
];
const ids=(options,records)=>select(rows,options,records).map(c=>c.id);
assert.equal(winRate(rows[1]),50);assert.equal(winRate(rows[2]),null);
assert.deepEqual(ids({order:'wins-high'}),['d','a','b','c']);
assert.deepEqual(ids({order:'wins-low'}),['b','a','d','c']);
assert.deepEqual(ids({order:'titles-high'}),['b','a','d','c']);
assert.deepEqual(ids({order:'titles-low'}),['c','d','a','b']);
assert.deepEqual(ids({minWinRate:75,minTitles:2}),['a']);
assert.deepEqual(ids({minWinRate:0}),['a','b','d']);
assert.deepEqual(ids({minWinRate:100}),['d']);
assert.deepEqual(ids({minTitles:0}),['a','b','c','d']);
assert.deepEqual(ids({order:'highest'}),['b','a','d','c']);
assert.deepEqual(ids({order:'recent'}),['a','b','c','d']);
assert.equal(titles(rows[0],[{characterId:'a',titles:3},{characterId:'a',titles:2}]),5);
assert.deepEqual(rows.map(c=>c.id),['a','b','c','d']);
assert.equal(currentChampionText(rows[0],[{characterId:'a',divisionKey:'any|any|any',label:'Open'},{characterId:'a',divisionKey:'latest',label:'Latest tournament winner'}]),'👑 Current champion · Open');assert.equal(currentChampionText(rows[1],[{characterId:'a',label:'Open'}]),'');
console.log('Roster filters passed: win rate including draws, unplayed fighters last, championship totals across cups, both sort directions, combined thresholds, and unchanged source order.');

assert.equal(currentChampionText(rows[0],[{characterId:'a',divisionKey:'latest',label:'Latest tournament winner'}]),'');
assert.equal(currentChampionText(rows[0],[{characterId:'a',divisionKey:'any|C|any',label:'Tier C'}]),'👑 Current champion · Tier C');

const pending={summary:{growth:{wins:1,bonus:[0,0,0,0,0]},promotion:{tier:'C',wins:1,required:2}}};assert(globalThis.ROSTER_VIEW.growthText(pending).includes('previously earned points'));assert(!globalThis.ROSTER_VIEW.growthText(pending).includes('undefined'));assert.equal(globalThis.ROSTER_VIEW.growthText({summary:{promotion:{tier:'S',wins:0,required:16}}}), '');

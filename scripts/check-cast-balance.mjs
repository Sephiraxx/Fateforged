// Hand balance (TEAM-BATTLES.md, "Hand balance"): the recorded balance lab (validation/balance-lab.json, from
// node scripts/balance-lab.mjs --record) covers every subclass with enough games, every subclass wins 46–54%, and the
// stat bonuses name real subclasses.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TEAM_CLASSES,CAST_BONUS} from '../public/team-classes.js';
import {formatTeams,TRIO_SIEGE_BONUS} from '../public/combat-team.js';
import {generation} from './team-fixtures.mjs';

const lab=JSON.parse(fs.readFileSync('validation/balance-lab.json','utf8'));
const subclasses=TEAM_CLASSES.flatMap(c=>c.subclasses.map(s=>`${c.name} (${s.name})`));
assert(lab.games>=3000,`The lab needs at least 3000 games (${lab.games}).`);
assert.deepEqual(Object.keys(lab.modes).sort(),['core','teamfight']);
assert.deepEqual(Object.keys(lab.subclass).sort(),[...subclasses].sort(),'Every subclass is measured.');
for(const [key,s]of Object.entries(lab.subclass)){assert(s.games>=300,`${key}: ${s.games} games`);assert(s.winRate>=46&&s.winRate<=54,`${key} wins ${s.winRate}%`);}
for(const [key,v]of Object.entries(CAST_BONUS)){assert(subclasses.includes(key),`Unknown subclass in CAST_BONUS: ${key}`);assert(v.length===5&&v.every(Number.isFinite),key);}
for(const m of Object.values(lab.modes))assert(m.timeouts<=5,`timeouts ${m.timeouts}%`);
// 3v3 Core siege boost: cast tanks and healers gain TRIO_SIEGE_BONUS there and nowhere else; inputs are not changed.
const random=generation.seededRandom(31337),cast=role=>generation.castFighter(WHEEL_DATA,WHEEL_LUCK,{role,tier:'S',random,id:'trio-'+role});
const trio=[['tank','healer','damage'],['controller','damage','controller']].map(t=>t.map(cast)),before=structuredClone(trio),boosted=formatTeams(trio,{engineVersion:'team-4.0'});
assert.deepEqual(trio,before,'formatTeams copies, never edits, its input.');
boosted.flat().forEach((f,i)=>{const role=f.summary.castRole,bonus=TRIO_SIEGE_BONUS[role]??[0,0,0,0,0];assert.deepEqual(f.summary.stats,trio.flat()[i].summary.stats.map((v,k)=>v+bonus[k]),role);});
for(const [teams,options]of [[trio,{engineVersion:'team-2.9'}],[trio,{engineVersion:'team-3.9'}],[[[...trio[0],cast('tank'),cast('damage')],[...trio[1],cast('healer'),cast('damage')]],{engineVersion:'team-4.0'}]])assert.equal(formatTeams(teams,options),teams,'Only 3v3 games on team-4.0 are boosted.');
const rates=Object.values(lab.subclass).map(s=>s.winRate);
console.log(`Cast balance passed: ${lab.games} lab games, ${subclasses.length} subclasses between ${Math.min(...rates)}% and ${Math.max(...rates)}%, ${Object.keys(CAST_BONUS).length} stat bonuses, and the 3v3 Core siege boost reaches only tanks and healers there.`);

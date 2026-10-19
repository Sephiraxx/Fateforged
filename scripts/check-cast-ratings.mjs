// Cast ratings: team-league OVR for cast fighters comes from the model
// fitted on lab games (scripts/evaluate-cast-values.mjs), per battle mode; leagues rated before it move onto it on
// load and keep each fighter's career progress.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generation} from './team-fixtures.mjs';
import {TEAM_CLASSES} from '../public/team-classes.js';
import * as L from '../public/team-league.js';

const recorded=JSON.parse(fs.readFileSync('validation/cast-values.json','utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(L.CAST_RATING_MODEL)),recorded.model,'CAST_RATING_MODEL matches validation/cast-values.json.');
const subclasses=TEAM_CLASSES.flatMap(c=>c.subclasses.map(s=>`${c.name} (${s.name})`));
for(const mode of ['core','teamfight']){
 const m=L.CAST_RATING_MODEL[mode];
 assert.deepEqual(Object.keys(m.subclass).sort(),[...subclasses].sort(),`${mode} rates every subclass`);
 assert([m.intercept,m.ehp,m.dps,m.spell,m.ability,m.speed,m.iq,...Object.values(m.subclass)].every(Number.isFinite));
 assert(recorded.modes[mode].games>=3000&&recorded.modes[mode].accuracy>=65,`${mode} fit predicts winners (${recorded.modes[mode].accuracy}%)`);
}

// A fresh pool keeps the old OVR range, so salaries and the cap stay on the same scale.
const seed=2468,pool=L.poolPlan(3,6,seed).map((slot,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,slot,i,seed,()=>`P${i}`));
const stats=list=>{const mean=list.reduce((a,b)=>a+b,0)/list.length;return {mean,sd:Math.sqrt(list.reduce((a,b)=>a+(b-mean)**2,0)/list.length)};};
const old=stats(pool.map(f=>L.overall(f,L.scoutFighter(f).role))),spread={};
for(const mode of ['core','teamfight']){const now=stats(pool.map(f=>L.scoutFighter(f,mode).ovr));spread[mode]=now;assert(Math.abs(now.mean-old.mean)<2.5&&Math.abs(now.sd-old.sd)<2.5,`${mode} OVR ${now.mean.toFixed(1)}±${now.sd.toFixed(1)} vs ${old.mean.toFixed(1)}±${old.sd.toFixed(1)}`);}

// New leagues store the cast rating for their mode.
const w=L.create({id:crypto.randomUUID(),format:3,regionSize:6,seed,battleMode:'core',fighters:pool});
for(const f of Object.values(w.fighters)){assert.equal(f.ratingVersion,L.CAST_RATING_VERSION);assert.equal(f.ovr,L.overall(f,f.role,'core'));assert.equal(f.salary,L.salaryFor(f.ovr));}

// Old saves: progress over the old base rating carries over, lastOvr records the change, and a second load is a no-op.
const saved=structuredClone(w),progress=new Map();let i=0;
for(const f of Object.values(saved.fighters)){const p=(i++%7)-3;progress.set(f.id,p);f.ratingVersion=2;f.ovr=Math.max(40,Math.min(99,L.overall(f,f.role)+p));}
const moved=L.prepareCastRatings(structuredClone(saved));let changed=0;
for(const f of Object.values(moved.fighters)){const before=saved.fighters[f.id];assert.equal(f.ratingVersion,L.CAST_RATING_VERSION);assert.equal(f.ovr,Math.max(40,Math.min(99,L.overall(f,f.role,'core')+before.ovr-L.overall(before,before.role))));if(f.ovr!==before.ovr){changed++;assert.equal(f.lastOvr,before.ovr);}assert.equal(f.salary,before.salary,'Contracts keep their price until the offseason.');}
assert(changed>50,'Most fighters re-rate.');assert.deepEqual(L.prepareCastRatings(structuredClone(moved)),moved);
const paused=structuredClone(saved);paused.pendingSeries={games:[{}]};assert.deepEqual(L.prepareCastRatings(structuredClone(paused)),paused,'A paused series finishes on the old ratings.');

console.log(`Cast ratings passed: fits predict ${recorded.modes.core.accuracy}% (core) and ${recorded.modes.teamfight.accuracy}% (teamfight) of ${recorded.games} lab games, a fresh pool keeps its range (old ${old.mean.toFixed(1)}±${old.sd.toFixed(1)}, core ${spread.core.mean.toFixed(1)}±${spread.core.sd.toFixed(1)}, teamfight ${spread.teamfight.mean.toFixed(1)}±${spread.teamfight.sd.toFixed(1)}), new leagues store it, and ${changed} saved fighters re-rate once with their progress kept.`);

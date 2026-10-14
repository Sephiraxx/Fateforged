// Rust simulation core: JavaScript math, state, engine-method and whole-game parity (RUST-CORE.md).
// Always: the recorded parity run (1M inputs, node and Chromium) has no mismatches and identical results in both
// runtimes, the portable sin/cos is what node's Math gives and is only swapped in while an engine runs, and the
// battle-state inventory exists. With cargo installed: the crate's unit tests pass and a fresh 200k-input run in this
// node matches the Rust math bit for bit. Without cargo the live part is skipped (the app and CI builds have it).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as portable from '../public/portable-math.js';
import {teamEngine} from '../public/combat-team.js';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {PORTED} from './lib/rust-ported.mjs';

const recorded=JSON.parse(fs.readFileSync('validation/rust-math-parity.json','utf8'));
assert(recorded.pairs>=1_000_000,'record at least a million inputs');
assert.deepEqual(recorded.runtimes.map(r=>r.runtime).sort(),['chromium','node']);
for(const r of recorded.runtimes){assert.equal(r.total,0,`${r.runtime}: ${r.total} mismatches`);assert.equal(r.pairs,recorded.pairs);assert(r.rngSeeds>=1000);}
assert.deepEqual(recorded.nodeVsChromium,{sin:0,cos:0,other:0},'portable math gives the same bits in node and Chromium');
// Node's own Math.sin/cos/atan2 are V8's fdlibm, so the portable versions must agree with them here.
{let x=0.123;for(let i=0;i<100000;i++){x=(x*1103515245+12345)%2147483648;const v=(x/2147483648-.5)*40;assert(Object.is(portable.sin(v),Math.sin(v))&&Object.is(portable.cos(v),Math.cos(v))&&Object.is(portable.atan2(v,v*.37-3),Math.atan2(v,v*.37-3)),`portable trig at ${v}`);}}
// team-4.0 / team-2.9 swap the portable versions in only while they build or step a battle.
{const native=[Math.sin,Math.cos,Math.atan2];for(const v of ['team-4.0','team-2.9']){const E=teamEngine(v),b=new E([squad(COMPOSITIONS.balanced3,7),squad(COMPOSITIONS.balanced3,8)],7,{headless:true,map:'pillars'});assert.deepEqual([Math.sin,Math.cos,Math.atan2],native);
 let saw=null;const step=Object.getPrototypeOf(Object.getPrototypeOf(b)).step;Object.getPrototypeOf(Object.getPrototypeOf(b)).step=function(dt){saw=[Math.sin,Math.atan2];return step.call(this,dt);};try{b.step(1/60);}finally{Object.getPrototypeOf(Object.getPrototypeOf(b)).step=step;}
 assert.deepEqual(saw,[portable.sin,portable.atan2],`${v} steps with portable sin and atan2`);assert.deepEqual([Math.sin,Math.cos,Math.atan2],native,'restored after the step');while(!b.done)b.step(1/60);assert.equal(b.result().combatVersion,v);}}

const inventory=JSON.parse(fs.readFileSync('validation/rust-state-inventory.json','utf8'));
for(const engine of ['team-3.9','team-2.8']){const e=inventory.find(x=>x.engine===engine);assert(e&&e.games>=10&&e.fields.fighter,`${engine} inventory`);assert.deepEqual(Object.keys(e.functions).sort(),['battle.plans[].along','battle.plans[].exposed','battle.rng'],`${engine}: only these functions live in battle state`);}

// Phase B1: the generated state model is current, and the recorded parity run (team-4.0 snapshots and helpers) is clean.
{const gen=spawnSync(process.execPath,['scripts/gen-rust-state.mjs','--check'],{encoding:'utf8'});assert.equal(gen.status,0,gen.stderr);
 const parity=JSON.parse(fs.readFileSync('validation/rust-parity.json','utf8'));assert.equal(parity.engine,'team-4.0');assert(parity.games>=20&&parity.snapshots>=150,'record a full parity run');
 assert.equal(parity.state.matching,parity.snapshots,'every snapshot digests the same in Rust');assert.equal(parity.helpers.total,0,'helpers match bit for bit');
 for(const name of ['clamp','dist','segmentDistance','segment','angleGap','tickTimers'])assert(parity.helpers[name].cases>100,name);}

// Parity policy: the quick runs below (and in CI) are the gate for every change; the recorded full runs are the last
// big proof and are only re-recorded for large ports (RUST-CORE.md, "Commands"). Each worker's self-test also turns the
// core off if it ever disagrees with JavaScript.
// Phase B2: the ported engine methods in the last full call recording were replayed in Rust and matched (return value
// and the battle state afterwards). A method never called in the recorded games has to be listed here.
const NEVER_CALLED=new Set(['holdPoint','connectControl']);
// Only games that reach the time limit call these.
const RARE=new Set(['finishAtLimit']);
{const calls=JSON.parse(fs.readFileSync('validation/rust-calls.json','utf8'));assert.equal(calls.engine,'team-4.0');
 for(const m of Object.keys(calls.methods))assert(PORTED.includes(m),`${m} is recorded but no longer ported`);
 for(const [m,r] of Object.entries(calls.methods)){assert(!r.error,`${m}: ${r.error}`);assert.equal(r.matching??0,r.cases,`${m}: every recorded call matches`);
  if(NEVER_CALLED.has(m))assert.equal(r.cases,0,`${m} is now called; remove it from NEVER_CALLED`);else assert(r.cases>=(RARE.has(m)?1:10),`${m}: record at least ${RARE.has(m)?1:10} calls`);}}

// Phase B3: whole games played in Rust from the starting state stay bit-identical to JavaScript (digest every 60
// steps and at the end), and Rust is faster on the same games.
// Phase B4: the same for classic teamfight (team-2.9).
{const {engines}=JSON.parse(fs.readFileSync('validation/rust-games.json','utf8'));assert.deepEqual(Object.keys(engines),['team-4.0','team-2.9'],'record both engines');
 for(const [engine,games] of Object.entries(engines)){assert(games.games>=150,`${engine}: record a full game run`);
  assert.equal(games.matching,games.games,`${engine}: every game matches JavaScript to the end`);assert(games.speedup>1,`${engine}: Rust is faster than JavaScript`);}}

const cargo=spawnSync('cargo',['--version'],{encoding:'utf8'});
if(cargo.status!==0){console.log('Rust core: recorded parity holds (1M inputs × 9 functions, identical in node and Chromium); portable trig swapped in only while team-4.0 / team-2.9 run; cargo not installed, live run skipped.');process.exit(0);}
const manifest=['--manifest-path','core/Cargo.toml'];
const test=spawnSync('cargo',['test','--quiet',...manifest],{encoding:'utf8'});assert.equal(test.status,0,test.stdout+test.stderr);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fateforge-math-'));
try{const run=spawnSync(process.execPath,['scripts/rust-math-vectors.mjs',dir,'--pairs','200000','--compare'],{encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);assert.match(run.stdout,/node \(.*\): 0 mismatches/);}
finally{fs.rmSync(dir,{recursive:true,force:true});}
const quick=spawnSync(process.execPath,['scripts/rust-parity.mjs','--quick'],{encoding:'utf8'});assert.equal(quick.status,0,quick.stdout+quick.stderr);
{const r=JSON.parse(quick.stdout.trim().split('\n').at(-1));assert.equal(r.state.matching,r.snapshots);assert.equal(r.helpers.total,0);}
const calls=spawnSync(process.execPath,['scripts/rust-calls.mjs','--quick'],{encoding:'utf8',maxBuffer:64<<20});assert.equal(calls.status,0,calls.stdout.slice(-3000)+calls.stderr);
const games=spawnSync(process.execPath,['scripts/rust-games.mjs','--quick'],{encoding:'utf8',maxBuffer:64<<20});assert.equal(games.status,0,games.stdout.slice(-3000)+games.stderr);
console.log(`Rust core: ${cargo.stdout.trim()}; unit tests pass; 200k fresh inputs match node bit for bit; team-4.0 snapshots, helpers and ported engine methods, and whole team-4.0 and team-2.9 games, match (quick runs); recorded parity holds and is identical in node and Chromium; portable trig swapped in only while team-4.0 / team-2.9 run.`);

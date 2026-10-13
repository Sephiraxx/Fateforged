// Rust simulation core, phase A: JavaScript math parity (RUST-CORE.md).
// Always: the recorded parity run (1M inputs, node and Chromium) has no mismatches, flavour detection works, and the
// battle-state inventory exists. With cargo installed: the crate's unit tests pass and a fresh 200k-input run in this
// node matches the Rust math bit for bit. Without cargo the live part is skipped (the app and CI builds have it).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {trigFlavor} from '../public/js-math-flavor.js';

const recorded=JSON.parse(fs.readFileSync('validation/rust-math-parity.json','utf8'));
assert(recorded.pairs>=1_000_000,'record at least a million inputs');
const byRuntime=Object.fromEntries(recorded.runtimes.map(r=>[r.runtime,r]));
assert.equal(byRuntime.node?.flavor,'fdlibm','node uses fdlibm');assert.equal(byRuntime.chromium?.flavor,'glibc','Chromium uses V8\'s glibc copy');
for(const r of recorded.runtimes){assert.equal(r.total,0,`${r.runtime}: ${r.total} mismatches`);assert.equal(r.pairs,recorded.pairs);assert(r.rngSeeds>=1000);}
assert(recorded.nodeVsChromium.sin>0&&recorded.nodeVsChromium.other===0,'the two flavours differ only in sin and cos');
assert.equal(trigFlavor(),'fdlibm','node detects fdlibm');

const inventory=JSON.parse(fs.readFileSync('validation/rust-state-inventory.json','utf8'));
for(const engine of ['team-3.9','team-2.8']){const e=inventory.find(x=>x.engine===engine);assert(e&&e.games>=10&&e.fields.fighter,`${engine} inventory`);assert.deepEqual(Object.keys(e.functions).sort(),['battle.plans[].along','battle.plans[].exposed','battle.rng'],`${engine}: only these functions live in battle state`);}

const cargo=spawnSync('cargo',['--version'],{encoding:'utf8'});
if(cargo.status!==0){console.log('Rust core: recorded parity holds (1M inputs × 9 functions, node and Chromium); cargo not installed, live run skipped.');process.exit(0);}
const manifest=['--manifest-path','core/Cargo.toml'];
const test=spawnSync('cargo',['test','--quiet',...manifest],{encoding:'utf8'});assert.equal(test.status,0,test.stdout+test.stderr);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fateforge-math-'));
try{const run=spawnSync(process.execPath,['scripts/rust-math-vectors.mjs',dir,'--pairs','200000','--compare'],{encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);assert.match(run.stdout,/node \(fdlibm.*\): 0 mismatches/);}
finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(`Rust core: ${cargo.stdout.trim()}; unit tests pass; 200k fresh inputs match node bit for bit; recorded parity holds for node (fdlibm) and Chromium (glibc).`);

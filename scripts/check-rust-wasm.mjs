// The Rust core in the game (RUST-CORE.md, phases D and B4): public/fateforge-core.wasm, loaded by public/rust-core.js inside
// the simulation workers. Checks, in node:
// - the committed public/fateforge-core.wasm was built from the current sources (validation/rust-wasm-source.json);
//   with cargo and the wasm32 target installed, a fresh build plays the same games identically too;
// - simulateTeam gives exactly the same result (as JSON) with the core on and off, for every quick-set game and for a
//   league series, in Core siege (team-4.0) and classic teamfight (team-2.9); older engine versions and watched
//   (non-headless) games stay in JavaScript;
// - a failing core turns itself off and the game still gets the JavaScript result;
// - the core is faster, measured on the same games (validation/rust-wasm.json with --record).
// node scripts/check-rust-wasm.mjs [--record]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {simulateTeam,useNativeSimulator} from '../public/combat-team.js';
import {loadRustCore,nativeSimulate,rustCoreStatus,rustCoreSupports,SELF_TEST_GAMES} from '../public/rust-core.js';
import {gameList,coverageGames,ENGINES} from './rust-schema.mjs';
import {rustSourceHash} from './lib/rust-source-hash.mjs';

const WASM='public/fateforge-core.wasm',BUILT='core/target/wasm32-unknown-unknown/release/fateforge_core.wasm';
// The committed build comes from the current sources.
assert.equal(JSON.parse(fs.readFileSync('validation/rust-wasm-source.json','utf8')).source,rustSourceHash(),`${WASM} is out of date: run node scripts/build-rust-wasm.mjs`);
// With the wasm32 target installed, a fresh build must play the games the same way too.
const targets=spawnSync('rustup',['target','list','--installed'],{encoding:'utf8'});
const rebuilt=targets.status===0&&targets.stdout.includes('wasm32-unknown-unknown')&&spawnSync('cargo',['rustc','--release','--quiet','--target','wasm32-unknown-unknown','--lib','--crate-type','cdylib','--manifest-path','core/Cargo.toml'],{stdio:'inherit'}).status===0;
const fresh=rebuilt?fs.readFileSync(BUILT):null;
assert(await loadRustCore(fs.readFileSync(WASM)),rustCoreStatus().off);

const games=ENGINES.flatMap(e=>[...gameList(1,e).filter((_,i)=>i%4===0),...coverageGames(e).list.filter((_,i)=>i%3===0)]);
let js=0,rust=0;
for(const g of games){
 useNativeSimulator(null);let t=performance.now();const expected=simulateTeam(...g.args());js+=performance.now()-t;
 useNativeSimulator(nativeSimulate);t=performance.now();const got=simulateTeam(...g.args());rust+=performance.now()-t;
 assert.equal(JSON.stringify(got),JSON.stringify(expected),`${g.engine} ${g.map} ${g.comp} seed ${g.seed}: same result with the Rust core`);
}
assert.equal(rustCoreStatus().off,null,'the core stays on');assert.equal(rustCoreStatus().checked,SELF_TEST_GAMES,'the first games were checked against JavaScript');
// The self-test plays the first games in both; the timing above includes it, so time a clean pass too.
let clean=0;for(const g of games){const t=performance.now();simulateTeam(...g.args());clean+=performance.now()-t;}

if(fresh){assert(await loadRustCore(fresh));useNativeSimulator(nativeSimulate);for(const g of games.slice(0,4)){useNativeSimulator(null);const expected=JSON.stringify(simulateTeam(...g.args()));useNativeSimulator(nativeSimulate);assert.equal(JSON.stringify(simulateTeam(...g.args())),expected,'a fresh build plays the same');}assert(await loadRustCore(fs.readFileSync(WASM)));useNativeSimulator(nativeSimulate);}

// Only headless team-4.0 and team-2.9 games go to the core (team-2.9 is also the default engine).
const [teams,seed,options]=games[0].args();
assert(rustCoreSupports(options));
assert(rustCoreSupports({...options,engineVersion:'team-2.9'})&&rustCoreSupports({...options,engineVersion:undefined}),'classic teamfight goes to the core');
assert(!rustCoreSupports({...options,engineVersion:'team-3.9'}),'older Core siege engines stay in JavaScript');
assert(!rustCoreSupports({...options,engineVersion:'team-2.8'}),'older classic engines stay in JavaScript');
assert(!rustCoreSupports({...options,headless:false}),'watched games stay in JavaScript');
const classic=gameList(1,'team-2.9')[0],[ct,cs,co]=classic.args(),plain={...co};delete plain.engineVersion;
useNativeSimulator(null);const classicJs=JSON.stringify(simulateTeam(ct,cs,plain));
useNativeSimulator(nativeSimulate);assert.equal(JSON.stringify(simulateTeam(ct,cs,plain)),classicJs,'a game without an engine version (team-2.9) gives the same result');

// A broken core (a module without the core's exports): the game gets the JavaScript result and the core turns off.
useNativeSimulator(null);const reference=JSON.stringify(simulateTeam(teams,seed,options));
assert(await loadRustCore(new Uint8Array([0,97,115,109,1,0,0,0])),'an empty module loads');
useNativeSimulator(nativeSimulate);assert.equal(JSON.stringify(simulateTeam(teams,seed,options)),reference,'a failing core falls back to JavaScript');
assert(rustCoreStatus().off,'a failing core switches itself off');assert(!rustCoreSupports(options));
useNativeSimulator(null);

const summary={engines:ENGINES,games:games.length,rebuilt,jsSeconds:+(js/1000).toFixed(2),rustSeconds:+(clean/1000).toFixed(2),speedup:+(js/clean).toFixed(2)};
if(process.argv.includes('--record'))fs.writeFileSync('validation/rust-wasm.json',JSON.stringify(summary,null,1)+'\n');
const recorded=JSON.parse(fs.readFileSync('validation/rust-wasm.json','utf8'));assert(recorded.speedup>1.5,'the recorded WebAssembly run is faster than JavaScript');
console.log(`Rust core (WebAssembly): ${games.length} games identical to JavaScript through simulateTeam${rebuilt?'; a fresh build agrees':''}; ${summary.speedup}x faster here (recorded ${recorded.speedup}x); older engines, watched games and a broken core use JavaScript.`);

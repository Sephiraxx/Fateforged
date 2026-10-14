// Full-game parity for the Rust engine (RUST-CORE.md, phases B3 and B4): plays seeded team-4.0 (Core siege) and
// team-2.9 (classic teamfight) games in JavaScript and
// records the battle digest every 60 steps and at the end. The Rust binary `team-games` plays each game from the
// same starting state and must reach the same digest at every checkpoint, end on the same step and report the same
// result(). It also times
// both engines on the same games (one core each).
// node scripts/rust-games.mjs [--quick] [--record] [--engine <version>] [--comp <composition>] [--dir <dir>] [--keep]
// (--comp plays only the games of one composition, such as castteam)
// (--record writes validation/rust-games.json, one summary per engine)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gameList,coverageGames,ENGINES} from './rust-schema.mjs';
import {exportState,digestState,trackRng} from './lib/team-state.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),flag=n=>args.includes(n),quick=flag('--quick');
const dir=flag('--dir')?path.resolve(args[args.indexOf('--dir')+1]):fs.mkdtempSync(path.join(os.tmpdir(),'fateforge-games-'));
fs.mkdirSync(dir,{recursive:true});
const EVERY=60;
// Full run: five seeds for every map, size and test composition, plus the coverage games that force every ability.
// Both engines the core plays (team-4.0 Core siege, team-2.9 classic), or one with --engine.
const engines=flag('--engine')?[args[args.indexOf('--engine')+1]]:ENGINES;
const exe=path.join(root,'core/target/release/team-games'+(process.platform==='win32'?'.exe':''));
const build=spawnSync('cargo',['build','--release','--quiet','--manifest-path',path.join(root,'core/Cargo.toml')],{stdio:'inherit'});if(build.status!==0)process.exit(1);
const summary={engines:{}};let failed=false;
for(const engine of engines){
const games=(quick?[...gameList(1,engine).filter((_,i)=>i%8===0),...coverageGames(engine).list.filter((_,i)=>i%5===0)]:[...gameList(5,engine),...coverageGames(engine).list]).filter(g=>!flag('--comp')||g.comp===args[args.indexOf('--comp')+1]);
const at=path.join(dir,engine);fs.mkdirSync(at,{recursive:true});
const started=performance.now();
for(const [gi,g] of games.entries()){
 const b=trackRng(g.make(),g.make()),state=exportState(b,g.engine),digests=[];let steps=0;
 while(!b.done){b.step(1/60);steps++;if(steps%EVERY===0||b.done)digests.push(digestState(b));}
 // Time the same game untouched (no recording) for the speed comparison.
 const plain=g.make(),t0=performance.now();while(!plain.done)plain.step(1/60);const jsSeconds=(performance.now()-t0)/1000;
 fs.writeFileSync(path.join(at,`g${String(gi).padStart(3,'0')}-${g.map}-${g.comp}.game`),JSON.stringify({state,every:EVERY,digests,steps,jsSeconds,result:JSON.parse(JSON.stringify(b.result()))}));
}
const recordSeconds=(performance.now()-started)/1000;
const run=spawnSync(exe,[at],{encoding:'utf8',maxBuffer:64<<20});
let r;try{r=JSON.parse(run.stdout);}catch{r={error:(run.stderr||run.stdout).slice(-2000)};}
if(run.status!==0)failed=true;
summary.engines[engine]=r;console.log(JSON.stringify({engine,...r,recordSeconds:Math.round(recordSeconds)},null,1));
}
if(flag('--record'))fs.writeFileSync(path.join(root,'validation/rust-games.json'),JSON.stringify(summary,null,1)+'\n');
if(!flag('--keep')&&!flag('--dir'))fs.rmSync(dir,{recursive:true,force:true});
if(failed)process.exit(1);

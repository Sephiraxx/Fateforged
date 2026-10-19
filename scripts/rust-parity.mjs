// Rust core parity: plays seeded team-4.0 games in JavaScript, exports snapshots of their
// state and per-step helper results, and checks the Rust core against them.
// node scripts/rust-parity.mjs [--quick] [--record] [--dir <dir>] [--keep]   (--record writes validation/rust-parity.json)
//   team-state:   every snapshot loads into the Rust state model and digests to the JavaScript value.
//   team-helpers: clamp, dist, segmentDistance, segment, angleGap and tickTimers match bit for bit on values
//                 taken from those games (positions, obstacles, angles, timers) plus edge cases.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gameList,coverageGames} from './rust-schema.mjs';
import {exportState,digestState,trackRng,exportEntity,digestEntity} from './lib/team-state.mjs';
import {clamp,dist,segmentDistance,angleGap,tickTimers} from '../public/combat-team-v2.js';
import {segment} from '../public/combat-team-v2-1.js';
import * as portable from '../public/portable-math.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),quick=args.includes('--quick'),keep=args.includes('--keep');
const dir=args.includes('--dir')?path.resolve(args[args.indexOf('--dir')+1]):fs.mkdtempSync(path.join(os.tmpdir(),'fateforge-parity-'));
fs.mkdirSync(dir,{recursive:true});
const F64=new Float64Array(1),U8=new Uint8Array(F64.buffer),hex=v=>{F64[0]=v;let s='';for(let i=7;i>=0;i--)s+=U8[i].toString(16).padStart(2,'0');return s;};
const num=v=>Number.isFinite(v)&&!Object.is(v,-0)?v:{$f:hex(v)};
// angleGap runs inside team-4.0 with the portable sin/cos/atan2.
const portableGap=(a,b)=>{const saved=[Math.sin,Math.cos,Math.atan2];Math.sin=portable.sin;Math.cos=portable.cos;Math.atan2=portable.atan2;try{return angleGap(a,b);}finally{[Math.sin,Math.cos,Math.atan2]=saved;}};

const games=quick?[...gameList(1).filter((_,i)=>i%12===0),...coverageGames().list.filter((_,i)=>i%4===0)]:[...gameList(1).filter((_,i)=>i%3===0),...coverageGames().list];
const cases={clamp:[],dist:[],segmentDistance:[],segment:[],angleGap:[],ticks:[]};
const TIMER_FIELDS=['exposed','wet','root','sleep','poison','bleed','regeneration','absorption','flight','invisible','insight','blind','amnesia','suppressed','disarmed','spiritArmor','shape','sizeTime','soul','chrono','deathMark','winded','illusionTime','portalTime','wardTime','futureTime','mindTime'];
const record=(name,inputs,fn)=>cases[name].push([...inputs,fn(...inputs)].map(num));
let snapshots=0;const started=performance.now();
for(const [gi,g] of games.entries()){
 const b=trackRng(g.make(),g.make()),marks=new Set([0,1,300,1800,6000,12000]);let step=0;
 while(true){
  if(marks.has(step)||b.done){
   const name=`g${String(gi).padStart(2,'0')}-${g.map}-${g.comp}-s${step}`;
   fs.writeFileSync(path.join(dir,`${name}.json`),JSON.stringify(exportState(b)));fs.writeFileSync(path.join(dir,`${name}.digest`),digestState(b));snapshots++;
   // Helper inputs from this moment of the game.
   const ents=b.combatants,obs=b.obstacles??[];
   for(const f of ents)for(const t of ents){if(f===t)continue;
    record('dist',[f.x,f.y,t.x,t.y],(ax,ay,bx,by)=>dist({x:ax,y:ay},{x:bx,y:by}));
    record('angleGap',[f.angle??0,Math.atan2(t.y-f.y,t.x-f.x)],portableGap);
    for(const o of obs.slice(0,6)){record('segmentDistance',[o.x,o.y,f.x,f.y,t.x,t.y],segmentDistance);record('segment',[o.x,o.y,f.x,f.y,t.x,t.y],(ox,oy,ax,ay,bx,by)=>segment({x:ox,y:oy},{x:ax,y:ay},{x:bx,y:by}));}
    record('clamp',[f.x-t.x,-40,40],clamp);}
   // tickTimers on the live fighter (a copy would turn its links into plain objects), then put the timers back.
   for(const f of ents.slice(0,4)){const before=exportEntity(b,f),saved={...f};tickTimers(f,1/60);const after=digestEntity(b,f);for(const k of TIMER_FIELDS)f[k]=saved[k];cases.ticks.push({entity:before,dt:1/60,digest:after});}
  }
  if(b.done)break;b.step(1/60);step++;
 }
}
// Edge cases: zero-length segments, NaN, ±0, infinities, wrap-around angles.
for(const v of [[0,0,0,0,0,0],[5,5,1,1,1,1],[NaN,1,2,3,4,5],[1,2,-0,0,-0,0],[1e300,1e300,-1e300,0,1e300,0]]){record('segmentDistance',v,segmentDistance);record('segment',v,(ox,oy,ax,ay,bx,by)=>segment({x:ox,y:oy},{x:ax,y:ay},{x:bx,y:by}));}
for(const v of [[0,0],[Math.PI,-Math.PI],[10*Math.PI,-3],[NaN,1],[1e6,-1e6],[-0,0]])record('angleGap',v,portableGap);
for(const v of [[NaN,0,1],[-0,0,1],[5,0,1],[-5,0,1],[Infinity,-1,1]])record('clamp',v,clamp);
fs.writeFileSync(path.join(dir,'helpers.cases'),JSON.stringify(cases));
const exportSeconds=(performance.now()-started)/1000;

const exe=name=>path.join(root,'core/target/release/'+name+(process.platform==='win32'?'.exe':''));
const build=spawnSync('cargo',['build','--release','--quiet','--manifest-path',path.join(root,'core/Cargo.toml')],{stdio:'inherit'});if(build.status!==0)process.exit(1);
const state=spawnSync(exe('team-state'),[dir],{encoding:'utf8'}),helpers=spawnSync(exe('team-helpers'),[path.join(dir,'helpers.cases')],{encoding:'utf8'});
const result={games:games.length,snapshots,exportSeconds:Math.round(exportSeconds),state:JSON.parse(state.stdout||'{}'),helpers:JSON.parse(helpers.stdout||'{}')};
console.log(JSON.stringify(result));
if(args.includes('--record'))fs.writeFileSync(path.join(root,'validation/rust-parity.json'),JSON.stringify({engine:'team-4.0',...result,exportSeconds:undefined},null,1)+'\n');
if(!keep&&!args.includes('--dir'))fs.rmSync(dir,{recursive:true,force:true});
if(state.status!==0||helpers.status!==0){console.error(state.stderr,helpers.stderr);process.exit(1);}

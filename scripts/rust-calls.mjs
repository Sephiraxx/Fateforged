// Call-by-call parity for the Rust engine (RUST-CORE.md, phase B): plays seeded team-4.0 games in JavaScript and, for
// a sample of calls to each ported method, records the battle state before the call, the arguments, the return value
// and the state digest after it. The Rust binary `team-calls` replays every recorded call from the same state and
// must return the same value and leave the same state.
// node scripts/rust-calls.mjs [--quick] [--methods a,b,c] [--per-game N] [--record] [--dir <dir>] [--keep]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gameList,coverageGames,TRANSIENT} from './rust-schema.mjs';
import {exportState,digestState,trackRng,entitiesOf} from './lib/team-state.mjs';
import {PORTED} from './lib/rust-ported.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),flag=n=>args.includes(n),opt=(n,d)=>args.includes(n)?args[args.indexOf(n)+1]:d;
const methods=opt('--methods',PORTED.join(',')).split(','),perGame=Number(opt('--per-game',flag('--quick')?6:25));
const quick=flag('--quick'),dir=args.includes('--dir')?path.resolve(opt('--dir')):fs.mkdtempSync(path.join(os.tmpdir(),'fateforge-calls-'));
fs.mkdirSync(dir,{recursive:true});

// --- value encoding (shared by arguments and return values) -----------------------------------------------------
const F64=new Float64Array(1),U8=new Uint8Array(F64.buffer),hex=v=>{F64[0]=v;let s='';for(let i=7;i>=0;i--)s+=U8[i].toString(16).padStart(2,'0');return s;};
const num=v=>Number.isFinite(v)&&!Object.is(v,-0)?v:{$f:hex(v)};
// A stand-in for an entity (a {...t} copy or an Object.create(t) look-alike), described by what it reads as.
const POINT_KEYS=new Set(['x','y','back','count','time','radius','life','terrain']);
const VIEW_KEYS=new Set(['x','y','vx','vy','hp','illusionTime','action','weapon','isObjective','isDecoy','id','parent']);
function encode(v,ctx){
 if(v===undefined)return {$u:1};if(v===null)return null;
 if(typeof v==='number')return num(v);if(typeof v==='boolean'||typeof v==='string')return v;
 if(typeof v==='function')throw new Skip('function argument');
 if(ctx.entities.has(v))return {$e:v.index};
 if(Array.isArray(v))return v.map(x=>encode(x,ctx));
 if(v instanceof Set)return [...v].map(x=>encode(x,ctx));
 const proto=Object.getPrototypeOf(v),base=ctx.entities.has(proto)?proto:ctx.byId.get(String(v.id).replace(/^decoy-/,''));
 if(base&&(ctx.entities.has(proto)||typeof v.id==='string'&&typeof v.team==='number')){
  for(const k of Object.keys(v))if(!VIEW_KEYS.has(k)&&!Object.is(v[k],base[k])&&!(typeof v[k]==='object'&&JSON.stringify(v[k])===JSON.stringify(base[k])))throw new Skip(`stand-in replaces ${k}`);
  return {$view:base.index,x:num(v.x),y:num(v.y),vx:num(v.vx),vy:num(v.vy),hp:num(v.hp),decoy:!!v.isDecoy,objective:!!v.isObjective,action:!!v.action,melee:v.weapon?.type==='melee',illusion:num(v.illusionTime??0)};
 }
 if(typeof v.id==='string'&&typeof v.kind==='string'&&typeof v.name==='string')return {$power:JSON.parse(JSON.stringify(v))};
 // Points, slots and rocks compare on x and y only; other records (projectiles, plans, ...) field by field.
 if(typeof v.x==='number'&&typeof v.y==='number'&&Object.keys(v).every(k=>POINT_KEYS.has(k)))return {$pt:[num(v.x),num(v.y)]};
 const out={};for(const k of Object.keys(v).sort())out[k]=encode(v[k],ctx);return {$obj:out};
}
class Skip extends Error{}

// --- recording ------------------------------------------------------------------------------------------------
// Within-step fields are recorded separately (tr) and blanked for the export; fields that do not exist stay absent.
const blank=b=>TRANSIENT.filter(k=>Object.hasOwn(b,k)).map(k=>{const v=b[k];b[k]=null;return [k,v];});
const restore=(b,saved)=>{for(const [k,v] of saved)b[k]=v;};
const games=quick?[...gameList(1).filter((_,i)=>i%8===0),...coverageGames().list.filter((_,i)=>i%5===0)]:[...gameList(1).filter((_,i)=>i%2===0),...coverageGames().list];
const out=Object.fromEntries(methods.map(m=>[m,fs.openSync(path.join(dir,`${m}.jsonl`),'w')])),counts=Object.fromEntries(methods.map(m=>[m,{recorded:0,skipped:{}}]));
const started=performance.now();
for(const [gi,g] of games.entries()){
 const b=trackRng(g.make(),g.make());
 const seen=Object.fromEntries(methods.map(m=>[m,0])),taken=Object.fromEntries(methods.map(m=>[m,0]));
 for(const name of methods){
  const original=b[name];if(typeof original!=='function')throw new Error(`no method ${name}`);
  b[name]=function(...a){
   seen[name]++;
   // Spread the sample over the game: the first calls, then every 37th, up to perGame per method.
   const sample=taken[name]<perGame&&(seen[name]<=2||seen[name]%37===0);
   if(!sample)return original.apply(this,a);
   let caseData=null;
   try{
    if(this.targetFilter)throw new Skip('target filter installed');
    const ents=entitiesOf(this),ctx={entities:new Set(ents),byId:new Map(ents.map(e=>[e.id,e]))};
    const tr={healSource:this.healSource?.index??null,balanceCast:this.balanceCast?{fighter:this.balanceCast.fighter.index,id:this.balanceCast.id}:null,balanceEnvironment:!!this.balanceEnvironment,selectingFight:!!this.selectingFight};
    const saved=blank(this);let state;try{state=exportState(this);}finally{restore(this,saved);}
    caseData={method:name,game:gi,call:seen[name],tr,args:a.map(x=>encode(x,ctx)),state};
   }catch(e){if(!(e instanceof Skip))throw e;counts[name].skipped[e.message]=(counts[name].skipped[e.message]??0)+1;}
   const result=original.apply(this,a);
   if(caseData){
    try{
     const ents=entitiesOf(this),ctx={entities:new Set(ents),byId:new Map(ents.map(e=>[e.id,e]))};
     const saved=blank(this);try{caseData.ret=encode(result,ctx);caseData.after=digestState(this);}finally{restore(this,saved);}
     fs.writeSync(out[name],JSON.stringify(caseData)+'\n');taken[name]++;counts[name].recorded++;
    }catch(e){if(!(e instanceof Skip))throw e;counts[name].skipped[e.message]=(counts[name].skipped[e.message]??0)+1;}
   }
   return result;
  };
 }
 while(!b.done)b.step(1/60);
}
for(const fd of Object.values(out))fs.closeSync(fd);
const recordSeconds=(performance.now()-started)/1000;

const exe=path.join(root,'core/target/release/team-calls'+(process.platform==='win32'?'.exe':''));
const build=spawnSync('cargo',['build','--release','--quiet','--manifest-path',path.join(root,'core/Cargo.toml')],{stdio:'inherit'});if(build.status!==0)process.exit(1);
const results={};let failed=false;
for(const m of methods){
 if(!counts[m].recorded){results[m]={cases:0,skipped:counts[m].skipped};continue;}
 const run=spawnSync(exe,[path.join(dir,`${m}.jsonl`)],{encoding:'utf8',maxBuffer:64<<20});
 let r;try{r=JSON.parse(run.stdout);}catch{r={error:(run.stderr||run.stdout).slice(-1500)};}
 results[m]={...r,skipped:Object.keys(counts[m].skipped).length?counts[m].skipped:undefined};if(run.status!==0)failed=true;
}
const summary={engine:'team-4.0',games:games.length,recordSeconds:Math.round(recordSeconds),methods:results};
console.log(JSON.stringify(summary,null,1));
if(flag('--record'))fs.writeFileSync(path.join(root,'validation/rust-calls.json'),JSON.stringify({...summary,recordSeconds:undefined},null,1)+'\n');
if(!flag('--keep')&&!args.includes('--dir'))fs.rmSync(dir,{recursive:true,force:true});
if(failed)process.exit(1);

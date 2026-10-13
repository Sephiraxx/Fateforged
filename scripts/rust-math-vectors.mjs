// Records JavaScript math results for the Rust core's parity test (core/src/bin/math_parity.rs).
// node scripts/rust-math-vectors.mjs <dir> [--pairs N] [--chromium] [--record]
//   Writes <dir>/inputs.f64 (x, y pairs), <dir>/node.out and node.rng, and with --chromium also chromium.out and
//   chromium.rng (computed in Playwright's Chromium, the same V8 build family as Chrome, WebView2 and Android WebView).
//   --compare runs the Rust comparison for each runtime (exit 1 on any mismatch); --record also writes
//   validation/rust-math-parity.json.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {random} from '../public/combat-v1.js';
import {trigFlavor} from '../public/js-math-flavor.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),dir=path.resolve(args[0]??'validation/rust-math-vectors'),flag=name=>args.includes(name),option=(name,fallback)=>{const i=args.indexOf(name);return i>=0?Number(args[i+1]):fallback;};
const PAIRS=option('--pairs',1_000_000),RNG_SEEDS=2000,RNG_STEPS=64;

// Inputs: the ranges the engines use (angles, field coordinates, distances), plus everything a double can be.
function makeInputs(count){
 const rng=random(20261013),out=new Float64Array(count*2),bits=new BigUint64Array(1),view=new Float64Array(bits.buffer);
 const anyDouble=()=>{bits[0]=(BigInt(Math.floor(rng()*2**32))<<32n)|BigInt(Math.floor(rng()*2**32));return view[0];};
 const specials=[0,-0,1,-1,.5,-.5,1.5,-1.5,2.5,-2.5,Math.PI,-Math.PI,Math.PI/2,-Math.PI/2,Math.PI/4,3*Math.PI/4,Infinity,-Infinity,NaN,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,2**31,-(2**31),2**32,2**32-1,2**53,1e-300,0.126,0.855469,2.426265,105414350,105414351];
 const kinds=[
  ()=>(rng()-.5)*4*Math.PI,                                  // angles
  ()=>(rng()-.5)*2600,                                        // field coordinates and offsets
  ()=>(rng()-.5)*2e-3,                                        // tiny steps
  ()=>(rng()-.5)*2e5,                                         // medium
  ()=>(rng()-.5)*2*10**(rng()*12),                            // up to 1e12
  ()=>(rng()<.5?-1:1)*10**(rng()*600-300),                    // any magnitude
  ()=>{const k=Math.floor((rng()-.5)*2e6);return k*Math.PI/2+(rng()-.5)*1e-9;}, // near multiples of pi/2
  ()=>Math.floor((rng()-.5)*2000)+(rng()<.5?.5:-.5)*(1+(rng()-.5)*1e-15), // rounding edges
  anyDouble,
 ];
 for(let i=0;i<count;i++){
  if(i<specials.length*specials.length){out[2*i]=specials[i%specials.length];out[2*i+1]=specials[Math.floor(i/specials.length)];continue;}
  const k=kinds[i%kinds.length];out[2*i]=k();out[2*i+1]=kinds[(i*7+3)%kinds.length]();
 }
 return out;
}
// One row per pair; columns as in math_parity.rs.
const COMPUTE=`(inputs)=>{const n=inputs.length/2,out=new Float64Array(n*9);for(let i=0;i<n;i++){const x=inputs[2*i],y=inputs[2*i+1],o=i*9;out[o]=Math.sin(x);out[o+1]=Math.cos(x);out[o+2]=Math.atan2(y,x);out[o+3]=Math.hypot(x,y);out[o+4]=Math.round(x);out[o+5]=Math.max(x,y);out[o+6]=Math.min(x,y);out[o+7]=x|0;out[o+8]=x>>>0;}return out;}`;
const RNG=`(seeds,steps,randomSource)=>{const random=(0,eval)('('+randomSource+')'),out=new Float64Array(seeds.length*steps);seeds.forEach((s,i)=>{const r=random(s);for(let k=0;k<steps;k++)out[i*steps+k]=r();});return out;}`;
const seeds=Float64Array.from({length:RNG_SEEDS},(_,i)=>i<4?[0,1,4294967295,4294967296+7][i]:(i*2654435761)>>>0);
const write=(file,array)=>fs.writeFileSync(path.join(dir,file),Buffer.from(array.buffer,array.byteOffset,array.byteLength));

fs.mkdirSync(dir,{recursive:true});
const inputs=makeInputs(PAIRS);write('inputs.f64',inputs);write('rng-seeds.f64',seeds);
const compute=(0,eval)(COMPUTE),rngCompute=(0,eval)(RNG);
write('node.out',compute(inputs));write('node.rng',rngCompute(seeds,RNG_STEPS,random.toString()));
const runtimes=[{name:'node',flavor:trigFlavor(),version:`node ${process.versions.node} (V8 ${process.versions.v8})`}];
if(flag('--chromium')){
 // playwright-core is not a project dependency; set PLAYWRIGHT_CORE to its index.mjs when it is installed elsewhere.
 const {chromium}=await import(process.env.PLAYWRIGHT_CORE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const page=await browser.newPage();await page.setContent('<!doctype html><title>math</title>');
 const flavorSource=fs.readFileSync(path.join(root,'public/js-math-flavor.js'),'utf8').replace(/export /g,'');
 const flavor=await page.evaluate(src=>(0,eval)(`${src};trigFlavor()`),flavorSource);
 // Send the inputs in chunks as base64 so large vectors fit through the protocol.
 const chunks=[],size=100_000;
 for(let i=0;i<PAIRS;i+=size){const part=inputs.subarray(2*i,2*Math.min(PAIRS,i+size)),b64=Buffer.from(part.buffer,part.byteOffset,part.byteLength).toString('base64');
  chunks.push(Buffer.from(await page.evaluate(([src,b64])=>{const bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const out=(0,eval)(src)(new Float64Array(bytes.buffer));const u8=new Uint8Array(out.buffer);let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode(...u8.subarray(i,i+8192));return btoa(s);},[COMPUTE,b64]),'base64'));}
 fs.writeFileSync(path.join(dir,'chromium.out'),Buffer.concat(chunks));
 const rngB64=await page.evaluate(([src,seeds,steps,randomSource])=>{const out=(0,eval)(src)(seeds,steps,randomSource);const u8=new Uint8Array(out.buffer);let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode(...u8.subarray(i,i+8192));return btoa(s);},[RNG,[...seeds],RNG_STEPS,random.toString()]);
 fs.writeFileSync(path.join(dir,'chromium.rng'),Buffer.from(rngB64,'base64'));
 runtimes.push({name:'chromium',flavor,version:`Chromium ${browser.version()}`});await browser.close();
}
console.log(`Wrote ${PAIRS} input pairs and ${RNG_SEEDS}×${RNG_STEPS} generator values for ${runtimes.map(r=>`${r.name} (${r.flavor})`).join(', ')} to ${dir}.`);
if(flag('--record')||flag('--compare')){
 const build=spawnSync('cargo',['build','--release','--quiet','--manifest-path',path.join(root,'core/Cargo.toml')],{stdio:'inherit'});if(build.status!==0)process.exit(1);
 const results=runtimes.map(r=>{const run=spawnSync(path.join(root,'core/target/release/math-parity'+(process.platform==='win32'?'.exe':'')),[dir,r.name,r.flavor],{encoding:'utf8'});if(!run.stdout)throw new Error(run.stderr);return {...JSON.parse(run.stdout),version:r.version};});
 // Do the two flavours actually differ? Count pairs where node and Chromium disagree on sin/cos.
 let differ=null;if(runtimes.length>1){const a=new Float64Array(fs.readFileSync(path.join(dir,'node.out')).buffer.slice(0)),b=new Float64Array(fs.readFileSync(path.join(dir,'chromium.out')).buffer.slice(0));differ={sin:0,cos:0,other:0};for(let i=0;i<PAIRS;i++)for(let c=0;c<9;c++){const x=a[i*9+c],y=b[i*9+c];if(Object.is(x,y)||(x!==x&&y!==y))continue;if(c===0)differ.sin++;else if(c===1)differ.cos++;else differ.other++;}}
 const record={pairs:PAIRS,rngSeeds:RNG_SEEDS,rngSteps:RNG_STEPS,runtimes:results,nodeVsChromium:differ};
 if(flag('--record'))fs.writeFileSync(path.join(root,'validation/rust-math-parity.json'),JSON.stringify(record,null,1)+'\n');
 for(const r of results)console.log(`${r.runtime} (${r.flavor}, ${r.version}): ${r.total} mismatches`,JSON.stringify(r.mismatches));
 if(differ)console.log('node vs Chromium differ on',JSON.stringify(differ));
 if(results.some(r=>r.total))process.exit(1);
}

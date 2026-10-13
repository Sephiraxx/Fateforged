// The Rust simulation core, compiled to WebAssembly (RUST-CORE.md, phase D). Simulation workers load it once and
// play headless Core siege games (team-4.0) through it instead of the JavaScript engine. JavaScript still builds each
// battle, so every fighter, ability and map is set up by the same code; the core only steps it to the end. Results
// are bit-identical to the JavaScript engine (proven game by game in RUST-CORE.md), and every worker double-checks
// its first games against JavaScript anyway: any difference or error turns the core off for that worker, and the
// JavaScript result is used. Other engine versions, watched games and replays always run in JavaScript.
import {teamEngine} from './combat-team.js';
import {exportState,trackRng} from './battle-state.js';

export const CORE_ENGINES=Object.freeze(['team-4.0']);
// How many games per worker are also played in JavaScript and compared before the core is trusted on its own.
export const SELF_TEST_GAMES=2;
const state={exports:null,checked:0,off:null};

// Load the core from a URL (the game) or bytes (node checks). Resolves to false when WebAssembly is unavailable.
export async function loadRustCore(source=new URL('./fateforge-core.wasm',import.meta.url)){
 try{
  const bytes=source instanceof URL||typeof source==='string'?await (await fetch(source)).arrayBuffer():source;
  const {instance}=await WebAssembly.instantiate(bytes,{});
  state.exports=instance.exports;state.checked=0;state.off=null;return true;
 }catch(error){state.off=`Could not load the Rust core: ${error.message}`;return false;}
}
export function rustCoreStatus(){return {loaded:!!state.exports,off:state.off,checked:state.checked};}
export function rustCoreSupports(options={}){return !!state.exports&&!state.off&&options.headless!==false&&CORE_ENGINES.includes(options.engineVersion??'team-2.9');}

// The game played by the Rust core; throws when the core reports an error.
export function simulateTeamRust(teams,seed,options={}){
 const Engine=teamEngine(options.engineVersion),settings={...options,headless:true};
 // A twin battle tells how many values the battle's generator drew while it was being built (see trackRng).
 const battle=trackRng(new Engine(teams,seed,settings),new Engine(teams,seed,settings));
 return run(JSON.stringify(exportState(battle)));
}

function run(json){
 const e=state.exports,input=new TextEncoder().encode(json),at=e.ff_alloc(input.length);
 new Uint8Array(e.memory.buffer,at,input.length).set(input);
 let out;try{out=e.ff_simulate(at,input.length);}finally{e.ff_free(at,input.length);}
 const length=new DataView(e.memory.buffer).getUint32(out,true),text=new TextDecoder().decode(new Uint8Array(e.memory.buffer,out+4,length));
 e.ff_free(out,4+length);
 const result=JSON.parse(text);if(result.error)throw new Error(result.error);return result;
}

// simulateTeam's native path: the core's result, or null to play the game in JavaScript. `javascript` plays it there
// (used for the self-test).
export function nativeSimulate(teams,seed,options,javascript){
 if(!rustCoreSupports(options))return null;
 let result;
 try{result=simulateTeamRust(teams,seed,options);}
 catch(error){state.off=`The Rust core failed (${error.message}); using JavaScript.`;state.exports=null;return null;}
 if(state.checked<SELF_TEST_GAMES){
  const reference=javascript();
  if(JSON.stringify(reference)!==JSON.stringify(result)){state.off='The Rust core gave a different result; using JavaScript.';return reference;}
  state.checked++;
 }
 return result;
}

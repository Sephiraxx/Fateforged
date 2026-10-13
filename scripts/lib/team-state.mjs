// The running state of a team battle as plain data, and a digest of it, for the Rust core's parity tests
// (RUST-CORE.md, phase B). Both follow core/schema/team-4.0.json, which core/src/team/state.rs is generated from.
//
// Export (JSON): fighters, Cores and the Titan are "entities", listed by their `index` and referenced as {"$e":index};
// numbers that JSON cannot carry exactly (−0, NaN, ±Infinity) are written as {"$f":"<16 hex digits of the bits>"};
// missing and undefined fields are left out, null stays null, functions (never state) are skipped. A field the schema
// does not know throws, so gaps show.
// Digest: FNV-1a 64 over a binary walk of the same fields in schema order (tag byte, then the value), which
// core/src/team/digest.rs reproduces from the Rust structs.
import fs from 'node:fs';
import {random} from '../../public/combat-v1.js';

export const SCHEMA=JSON.parse(fs.readFileSync(new URL('../../core/schema/team-4.0.json',import.meta.url),'utf8'));
const kinds=SCHEMA.kinds;
export const entitiesOf=b=>{const all=new Set([...(b.combatants??[]),...(b.fighters??[]),...(b.actors??[]),...(b.cores??[]),...(b.titan?[b.titan]:[])]);return [...all].sort((a,b)=>a.index-b.index);};
// Fields that are never state (rebuilt each step, or the generator, which is exported as a call count).
const SKIP={battle:new Set(['rng','__rngCalls']),'battle.plans[]':new Set(['along','exposed'])};

// --- numbers --------------------------------------------------------------------------------------------------
const F64=new Float64Array(1),U8=new Uint8Array(F64.buffer);
const bitsHex=v=>{F64[0]=v;let s='';for(let i=7;i>=0;i--)s+=U8[i].toString(16).padStart(2,'0');return s;};
const num=v=>Number.isFinite(v)&&!Object.is(v,-0)?v:{$f:bitsHex(v)};

// --- types ----------------------------------------------------------------------------------------------------
// Splits "a|b" at the top level only (types nest inside <>).
function alternatives(type){const out=[];let depth=0,start=0;for(let i=0;i<type.length;i++){const c=type[i];if(c==='<')depth++;else if(c==='>')depth--;else if(c==='|'&&depth===0){out.push(type.slice(start,i));start=i+1;}}out.push(type.slice(start));return out;}
const inner=t=>t.slice(t.indexOf('<')+1,-1).replace(/\?$/,'');
function pick(type,v,entities){
 const alts=alternatives(type);if(alts.length===1)return alts[0];
 for(const t of alts){
  if(t==='entity'&&entities.has(v))return t;
  if(t==='f64'&&typeof v==='number'||t==='str'&&typeof v==='string'||t==='bool'&&typeof v==='boolean')return t;
  if(t.startsWith('obj<')&&v&&typeof v==='object'&&!entities.has(v)&&!Array.isArray(v))return t;
  if(t.startsWith('arr<')&&Array.isArray(v))return t;
 }
 throw new Error(`value ${typeof v} does not fit ${type}`);
}

// --- export ---------------------------------------------------------------------------------------------------
function exportValue(type,v,entities,path){
 if(v===null)return null;
 const t=pick(type,v,entities);
 if(t==='f64'){if(typeof v!=='number')throw new Error(`${path}: expected a number`);return num(v);}
 if(t==='bool'||t==='str')return v;
 if(t==='entity'){if(!entities.has(v))throw new Error(`${path}: expected an entity`);return {$e:v.index};}
 if(t.startsWith('arr<')||t.startsWith('set<')){const el=inner(t);return [...v].map((x,i)=>exportValue(el==='?'?'null':el,x,entities,`${path}[${i}]`));}
 if(t.startsWith('obj<'))return exportObject(inner(t),v,entities,path);
 if(t.startsWith('map<')){const kind=inner(t),el=kinds[kind].fields['{}']?.type??'f64',out={};for(const k of Object.keys(v))out[k]=exportValue(el,v[k],entities,`${path}.${k}`);return out;}
 if(t==='null')throw new Error(`${path}: the schema has never seen a value here`);
 throw new Error(`${path}: unknown type ${t}`);
}
function exportObject(kind,o,entities,path){
 const spec=kinds[kind];if(!spec)throw new Error(`${path}: unknown kind ${kind}`);
 const out={},skip=SKIP[kind];
 for(const key of Object.keys(o)){if(skip?.has(key)||typeof o[key]==='function')continue;const f=spec.fields[key];if(!f)throw new Error(`${path}.${key}: not in the schema (kind ${kind})`);const v=o[key];if(v===undefined)continue;
  if(v===null&&!f.nullable)throw new Error(`${path}.${key}: null in a non-nullable field`);out[key]=exportValue(f.type,v,entities,`${path}.${key}`);}
 return out;
}
// The whole battle: entities (by index), the battle object, and how many values the battle generator has drawn.
export function exportState(b){
 const list=entitiesOf(b),entities=new Set(list);
 if(new Set(list.map(e=>e.index)).size!==list.length)throw new Error('entity indexes are not unique');
 return {engine:SCHEMA.engine,seed:b.seed,rngCalls:rngCalls(b),entities:list.map(e=>exportObject('entity',e,entities,`entity#${e.index}`)),battle:exportObject('battle',b,entities,'battle')};
}

// --- digest ---------------------------------------------------------------------------------------------------
const TAG={nil:0,f64:1,true:2,false:3,str:4,entity:5,arr:6,obj:7,map:8};
class Fnv{constructor(){this.h=0xcbf29ce484222325n;}byte(b){this.h=BigInt.asUintN(64,(this.h^BigInt(b))*0x100000001b3n);}
 bytes(arr){for(const b of arr)this.byte(b);}u32(n){for(let i=0;i<4;i++)this.byte((n>>>(8*i))&255);}
 f64(v){F64[0]=v;for(let i=0;i<8;i++)this.byte(U8[i]);}str(s){const b=new TextEncoder().encode(s);this.u32(b.length);this.bytes(b);}
 hex(){return this.h.toString(16).padStart(16,'0');}}
function digestValue(h,type,v,entities){
 if(v===null||v===undefined){h.byte(TAG.nil);return;}
 const t=pick(type,v,entities);
 if(t==='f64'){h.byte(TAG.f64);h.f64(v);}
 else if(t==='bool')h.byte(v?TAG.true:TAG.false);
 else if(t==='str'){h.byte(TAG.str);h.str(v);}
 else if(t==='entity'){h.byte(TAG.entity);h.u32(v.index);}
 else if(t.startsWith('arr<')||t.startsWith('set<')){const el=inner(t),items=[...v];h.byte(TAG.arr);h.u32(items.length);for(const x of items)digestValue(h,el==='?'?'null':el,x,entities);}
 else if(t.startsWith('obj<'))digestObject(h,inner(t),v,entities);
 else if(t.startsWith('map<')){const kind=inner(t),el=kinds[kind].fields['{}']?.type??'f64',keys=Object.keys(v);h.byte(TAG.map);h.u32(keys.length);for(const k of keys){h.str(k);digestValue(h,el,v[k],entities);}}
 else throw new Error(`digest: unknown type ${t}`);
}
// Every schema field in sorted order; a missing field digests as nil, like null.
function digestObject(h,kind,o,entities){const spec=kinds[kind],skip=SKIP[kind];h.byte(TAG.obj);for(const key of Object.keys(spec.fields)){if(skip?.has(key))continue;digestValue(h,spec.fields[key].type,o[key],entities);}}
export function digestState(b){
 const list=entitiesOf(b),entities=new Set(list),h=new Fnv();
 h.u32(list.length);for(const e of list){h.u32(e.index);digestObject(h,'entity',e,entities);}
 digestObject(h,'battle',b,entities);h.f64(rngCalls(b));
 return h.hex();
}

// --- the battle generator -------------------------------------------------------------------------------------
// battle.rng is random(seed): a closure whose counter cannot be read. trackRng(b, twin) finds how many values the
// constructor drew (by drawing one value from an identical twin battle and finding it in a fresh random(seed)
// stream), then wraps b.rng to count every later draw. Wrapping changes no values.
export function trackRng(b,twin){
 const probe=[twin.rng(),twin.rng(),twin.rng()],stream=random(b.seed),seen=[];
 for(let k=0;k<5_000_000;k++){seen.push(stream());if(seen.length>3)seen.shift();if(seen.length===3&&seen.every((v,i)=>Object.is(v,probe[i]))){b.__rngCalls=k-2;break;}}
 if(b.__rngCalls===undefined)throw new Error('could not find the battle generator position');
 const rng=b.rng;b.rng=()=>{b.__rngCalls++;return rng();};return b;
}
export function rngCalls(b){if(b.__rngCalls===undefined)throw new Error('call trackRng(battle, twin) after constructing the battle');return b.__rngCalls;}

// One entity on its own (for helper checks that change a single fighter).
export function exportEntity(b,e){const entities=new Set(entitiesOf(b));return exportObject('entity',e,entities,`entity#${e.index}`);}
export function digestEntity(b,e){const entities=new Set(entitiesOf(b)),h=new Fnv();digestObject(h,'entity',e,entities);return h.hex();}

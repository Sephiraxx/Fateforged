// Inventory of what a team battle holds while it runs, for the Rust core's state handoff.
// node scripts/inspect-battle-state.mjs [engine ...]  → validation/rust-state-inventory.json
// Plays seeded games on every map, samples the battle every second, and records each field's types per object kind
// (battle, fighter, objective, projectile, ...), plus every function, closure, Set/Map and shared object reference.
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {TEAM_MAPS} from '../public/team-maps.js';

const engines=process.argv.slice(2).length?process.argv.slice(2):['team-3.9','team-2.8'];
const kindOf=(path,value)=>{
 if(path==='battle')return 'battle';
 if(/^battle\.(combatants|fighters)\[\]$/.test(path))return value?.isObjective?(value.kind??value.objective??'objective'):'fighter';
 return path.replace(/\[\]/g,'[]');
};
function typeOf(v){
 if(v===null)return 'null';if(Array.isArray(v))return 'array';if(v instanceof Set)return 'Set';if(v instanceof Map)return 'Map';
 if(typeof v==='function')return 'function';if(typeof v==='number')return Number.isInteger(v)?'int':'number';return typeof v;
}
function inventory(engine){
 const kinds={},functions=new Map(),shared=new Map();
 const note=(kind,key,type)=>{const k=kinds[kind]??={};(k[key]??=new Set()).add(type);};
 const walk=(battle)=>{
  const seen=new Map();
  const visit=(value,path,depth)=>{
   if(value===null||typeof value!=='object'&&typeof value!=='function')return;
   if(typeof value==='function'){functions.set(path,(functions.get(path)??0)+1);return;}
   if(seen.has(value)){if(seen.get(value)!==path)shared.set(`${path} → ${seen.get(value)}`,(shared.get(`${path} → ${seen.get(value)}`)??0)+1);return;}
   seen.set(value,path);if(depth>6)return;
   if(Array.isArray(value)){for(const item of value)visit(item,path+'[]',depth+1);return;}
   if(value instanceof Set||value instanceof Map){for(const item of value.values())visit(item,path+'{}',depth+1);return;}
   const kind=kindOf(path,value);
   for(const key of Object.keys(value)){const v=value[key];note(kind,key,typeOf(v));visit(v,`${kind}.${key}`,depth+1);}
  };
  visit(battle,'battle',0);
 };
 let games=0,steps=0;
 for(const map of TEAM_MAPS.map(m=>m.id))for(const size of [3,5])for(let seed=1;seed<=2;seed++){
  const E=teamEngine(engine),b=new E([squad(COMPOSITIONS['balanced'+size],seed),squad(COMPOSITIONS['healer'+size]??COMPOSITIONS['balanced'+size],seed+40)],seed,{headless:true,map});
  walk(b);while(!b.done){b.step(1/60);steps++;if(steps%60===0)walk(b);}walk(b);games++;
 }
 const fields=Object.fromEntries(Object.entries(kinds).sort().map(([kind,keys])=>[kind,Object.fromEntries(Object.entries(keys).sort().map(([k,t])=>[k,[...t].sort().join('|')]))]));
 return {engine,games,steps,kinds:Object.keys(fields).length,fieldCount:Object.values(fields).reduce((n,f)=>n+Object.keys(f).length,0),functions:Object.fromEntries([...functions].sort()),sharedReferences:Object.fromEntries([...shared].sort((a,b)=>b[1]-a[1]).slice(0,40)),fields};
}
const report=engines.map(inventory);
fs.writeFileSync('validation/rust-state-inventory.json',JSON.stringify(report,null,1)+'\n');
for(const r of report){console.log(`${r.engine}: ${r.games} games, ${r.kinds} object kinds, ${r.fieldCount} fields, ${Object.keys(r.functions).length} function slots, ${Object.keys(r.sharedReferences).length} shared-reference paths`);for(const [kind,f] of Object.entries(r.fields))console.log(`  ${kind}: ${Object.keys(f).length}`);console.log('  functions:',Object.keys(r.functions).join(', '));}

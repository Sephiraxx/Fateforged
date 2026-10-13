// Builds core/schema/team-4.0.json: the typed shape of a running team-4.0 battle, for the Rust core's state model
// (RUST-CORE.md, phase B1). node scripts/rust-schema.mjs [--games-per-cell N]
// Plays seeded games (every composition, both sizes, every map), samples the battle every 10 steps and records each
// field's type per object kind. Fighters, Cores and the Titan share one kind, "entity"; links to them become entity
// references. An object reached from two paths (for example a fighter's intent.slot and its team plan's slot) merges
// the two kinds. Map-like objects (keyed by ability ids, sizes or slot numbers) are listed in MAP_KINDS.
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {tierCharacter} from '../public/tier-generation.js';
import {seededRandom} from '../public/team-generation.js';
import {teamEngine,TEAM_TACTICS} from '../public/combat-team.js';
import {TEAM_MAPS} from '../public/team-maps.js';

export const ENGINE='team-4.0';
// Objects whose keys are data (ability ids, team sizes, slot numbers, plan names), not fields.
export const MAP_KINDS=new Set(['entity.abilityUseCounts','entity.powerUsed','battle.plans[].slots','battle.balance.multipliers','battle.titanRules.hp','battle.objectiveRules.coreHp','battle.objectiveRules.coreRamp','battle.brain[].scores','battle.planSeconds[]']);
// Never part of the state: closures rebuilt from other fields, and the battle's random generator (exported separately).
export const TRANSIENT=['healSource','balanceCast','balanceEnvironment','selectingFight','targetFilter','hitContext'];
export const SKIP=new Set(['battle.rng','battle.__rngCalls','battle.plans[].along','battle.plans[].exposed']);

const args=process.argv.slice(2),perCell=Number(args[args.indexOf('--games-per-cell')+1])||1;
export function entitiesOf(b){return new Set([...(b.combatants??[]),...(b.fighters??[]),...(b.actors??[]),...(b.cores??[]),...(b.titan?[b.titan]:[])]);}

export function buildSchema(games){
 const kinds=new Map(),parent=new Map(),objects=new Map(),present=new Map();
 const find=k=>{while(parent.get(k)&&parent.get(k)!==k)k=parent.get(k);return k;};
 // Aliased kinds keep the name of the one seen first, whatever order later samples meet them in.
 const order=new Map(),rank=k=>order.get(k)??order.set(k,order.size).get(k);
 const union=(a,b)=>{a=find(a);b=find(b);if(a===b)return;if(rank(b)<rank(a))[a,b]=[b,a];parent.set(b,a);};
 const field=(kind,key)=>{const k=kinds.get(kind)??kinds.set(kind,new Map()).get(kind);return k.get(key)??k.set(key,new Set()).get(key);};
 const typeOf=(v,path,entities,seen,kindOfObject)=>{
  if(v===null||v===undefined)return 'null';
  if(typeof v==='number')return 'f64';if(typeof v==='boolean')return 'bool';if(typeof v==='string')return 'str';
  if(typeof v==='function')return 'fn';
  if(entities.has(v))return 'entity';
  if(v instanceof Set)return `set<${[...new Set([...v].map(x=>typeOf(x,path+'{}',entities,seen,kindOfObject)))].sort().join('|')||'?'}>`;
  if(Array.isArray(v))return `arr<${[...new Set(v.map(x=>typeOf(x,path+'[]',entities,seen,kindOfObject)))].sort().join('|')||'?'}>`;
  // A plain object: a kind of its own (or merged with the kind it was first seen as).
  const prior=kindOfObject.get(v);if(prior){union(prior,path);return `obj<${path}>`;}
  kindOfObject.set(v,path);if(!seen.has(v)){seen.add(v);walk(v,path,entities,seen,kindOfObject);}
  return MAP_KINDS.has(path)?`map<${path}>`:`obj<${path}>`;
 };
 const walk=(o,kind,entities,seen,kindOfObject)=>{
  if(!kinds.has(kind))kinds.set(kind,new Map());rank(kind);
  objects.set(kind,(objects.get(kind)??0)+1);if(!MAP_KINDS.has(kind))for(const key of Object.keys(o))present.set(`${kind}\u0000${key}`,(present.get(`${kind}\u0000${key}`)??0)+1);
  for(const key of Object.keys(o)){const path=`${kind}.${key}`;if(SKIP.has(path))continue;const v=o[key];if(typeof v==='function')continue;
   const t=typeOf(v,MAP_KINDS.has(kind)?`${kind}{}`:path,entities,seen,kindOfObject);field(MAP_KINDS.has(kind)?kind:kind,MAP_KINDS.has(kind)?'{}':key).add(t);}
 };
 const sample=b=>{const entities=entitiesOf(b),seen=new Set(),kindOfObject=new Map();
  for(const e of entities){seen.add(e);walk(e,'entity',entities,seen,kindOfObject);}
  walk(b,'battle',entities,seen,kindOfObject);};
 // Also sample inside steps, at method-call boundaries (every 1500th call and every power use), so values that only exist while a step
 // runs (a power being weighed, a cast payload, ...) are typed too: the Rust parity tests replay single calls.
 for(const g of games){const b=g();sample(b);let n=0,calls=0;
  const names=new Set();for(let p=Object.getPrototypeOf(b);p&&p!==Object.prototype;p=Object.getPrototypeOf(p))for(const k of Object.getOwnPropertyNames(p))if(k!=='constructor'&&k!=='step'&&k!=='result'&&typeof p[k]==='function')names.add(k);
  // Within-step battle fields (scripts/rust-calls.mjs: TRANSIENT) are passed to Rust separately, so they stay null here.
  const midStep=b=>{const saved=TRANSIENT.filter(k=>Object.hasOwn(b,k)&&b[k]!=null).map(k=>{const v=b[k];b[k]=null;return [k,v];});try{sample(b);}finally{for(const [k,v] of saved)b[k]=v;}};
  // Every power use is sampled too: some fields (a teleport's landing) only exist while a power resolves.
  for(const k of names){const fn=b[k],always=k==='usePower';b[k]=function(...a){if(always||++calls%1500===0)midStep(this);return fn.apply(this,a);};}
  while(!b.done){b.step(1/60);if(++n%10===0)sample(b);}sample(b);
  for(const k of names)delete b[k];}
 // Merge aliased kinds, resolve obj<path> to the merged kind name.
 const merged=new Map(),mergedObjects=new Map(),mergedPresent=new Map();
 for(const [kind,fields] of kinds){const root=find(kind),m=merged.get(root)??merged.set(root,new Map()).get(root);mergedObjects.set(root,(mergedObjects.get(root)??0)+(objects.get(kind)??0));
  for(const [k,ts] of fields){const s=m.get(k)??m.set(k,new Set()).get(k);for(const t of ts)s.add(t);mergedPresent.set(`${root}\u0000${k}`,(mergedPresent.get(`${root}\u0000${k}`)??0)+(present.get(`${kind}\u0000${k}`)??0));}}
 const fix=t=>t.replace(/(obj|map)<([^>]+)>/g,(_,w,p)=>`${w}<${find(p)}>`);
 // "arr<?>|arr<obj<K>>" (sometimes empty) → "arr<obj<K>>"; "arr<null>|arr<obj<K>>" → "arr<obj<K>?>" (null elements).
 // Merge list alternatives at every depth: "arr<set<?>|set<f64>>" → "arr<set<f64>>".
 const split=type=>{const out=[];let depth=0,start=0;for(let i=0;i<type.length;i++){const c=type[i];if(c==='<')depth++;else if(c==='>')depth--;else if(c==='|'&&depth===0){out.push(type.slice(start,i));start=i+1;}}out.push(type.slice(start));return out;};
 const normalize=types=>{let out=[...new Set(types.map(t=>(t.startsWith('arr<')||t.startsWith('set<'))?`${t.slice(0,4)}${normalize(split(t.slice(4,-1).replace(/\?$/,m=>m))).join('|')}>`:t))];
  for(const w of ['arr','set']){const lists=out.filter(t=>t.startsWith(w+'<')),rest=out.filter(t=>!t.startsWith(w+'<'));if(lists.length<2&&!lists.some(t=>split(t.slice(4,-1)).length>1))continue;
   const els=[...new Set(lists.flatMap(t=>split(t.slice(4,-1))))].filter(e=>e!=='?'),nullEl=els.includes('null')||els.some(e=>e.endsWith('?')&&e.length>1&&!e.endsWith('<?>')),real=[...new Set(els.filter(e=>e!=='null').map(e=>e.length>1&&e.endsWith('?')&&!e.endsWith('<?>')?e.slice(0,-1):e))];
   out=[...rest,`${w}<${real.join('|')||'?'}${nullEl?'?':''}>`];}return out;};
 const out={};for(const [kind,fields] of [...merged].sort(([a],[b])=>a.localeCompare(b))){out[kind]={map:MAP_KINDS.has(kind)||[...fields.keys()].every(k=>k==='{}'),fields:Object.fromEntries([...fields].sort(([a],[b])=>a.localeCompare(b)).map(([k,ts])=>{let types=[...new Set([...ts].map(fix))];for(let i=0;i<4;i++)types=normalize(types);const nullable=types.includes('null')||!MAP_KINDS.has(kind)&&(mergedPresent.get(`${kind}\u0000${k}`)??0)<(mergedObjects.get(kind)??0);const rest=types.filter(t=>t!=='null').sort();return [k,{type:rest.join('|')||'null',nullable}];}))};}
 return out;
}

export function gameList(perCell=1,engine=ENGINE){
 const list=[];
 for(const map of TEAM_MAPS.map(m=>m.id))for(const size of [3,5])for(const comp of Object.keys(COMPOSITIONS).filter(c=>c.endsWith(String(size))))for(let k=0;k<perCell;k++){
  const seed=1000+list.length*7,other=Object.keys(COMPOSITIONS).filter(c=>c.endsWith(String(size)));
  // Every tactic plays on each side (game plans follow the tactic), so flanks, holds and dives all show up.
  const tactics=[TEAM_TACTICS[list.length%TEAM_TACTICS.length],TEAM_TACTICS[(list.length*3+1)%TEAM_TACTICS.length]];
  // Every third game, both sides play a flank game plan (side-lane sieges set laneWaypoint).
  const gamePlans=list.length%3===0?[{titan:'always',style:'flank',siege:'numbers'},{titan:'ahead',style:'flank',siege:'late'}]:undefined;
  list.push({map,size,comp,seed,tactics,make:()=>new (teamEngine(engine))([squad(COMPOSITIONS[comp],seed),squad(COMPOSITIONS[other[(list.length+k)%other.length]],seed+1)],seed,{headless:true,map,tactics,...(gamePlans?{gamePlans}:{})})});
 }
 return list;
}

// Generation-4 fighters (support kits included) forced to carry every ability at least once, so rare abilities
// (portals, wisps, resurrection, ...) show up in the schema too.
export function coverageGames(engine=ENGINE){
 const context=vm.createContext({});
 for(const file of ['class-abilities.js','support-catalog.js','data.js','luck-v4.js'])vm.runInContext(fs.readFileSync(new URL(`../public/${file}`,import.meta.url),'utf8'),context);
 vm.runInContext('this.pools=supportPools(WHEEL_DATA);this.luck=WHEEL_LUCK;this.ids=[...new Set([...Object.values(CLASS_ABILITIES.abilities??CLASS_ABILITIES),...Object.values(globalThis.SUPPORT_ABILITIES??{})].map(a=>a.id).filter(Boolean))];',context);
 const ids=[...new Set([...context.ids,...Object.values(globalThis.CURRENT_CLASS_ABILITIES.abilities).map(a=>a.id),...Object.values(globalThis.SUPPORT_ABILITIES??{}).map(a=>a.id)])].sort();
 const fighters=ids.map((power,i)=>{const random=seededRandom(9000+i);const f=tierCharacter(context.pools,i%3?'S':'SS',{luck:context.luck,draw:n=>Math.floor(random()*n),id:`cover-${power}`,requirePower:[power]});f.name=`cover ${power}`;return f;});
 const maps=TEAM_MAPS.map(m=>m.id),list=[];
 for(let i=0;i<fighters.length;i+=6){const group=fighters.slice(i,i+6);while(group.length<6)group.push(fighters[group.length]);const seed=7000+i,map=maps[(i/6)%maps.length];
  // Every other game runs under a league patch that touches abilities, roles and stats (balance-driven state).
  const known=new Set(Object.values(globalThis.CURRENT_CLASS_ABILITIES.abilities).map(a=>a.id)),patched=ids.slice(i,i+6).filter(id=>known.has(id));
  const balance=(i/6)%2?{id:'cover',multipliers:Object.fromEntries([...patched.map(id=>`ability:${id}:potency`),'ability:healing:healing','role:tank:health','role:controller:control','stat:MAG','stat:STR'].map((k,j)=>[k,j%2?1.08:.94]))}:undefined;
  const tactics=[TEAM_TACTICS[(i/6)%TEAM_TACTICS.length],TEAM_TACTICS[(i/6+2)%TEAM_TACTICS.length]];
  list.push({map,size:3,comp:'coverage',seed,tactics,make:()=>new (teamEngine(engine))([structuredClone(group.slice(0,3)),structuredClone(group.slice(3))],seed,{headless:true,map,tactics,...(balance?{balance}:{})})});}
 return {ids,list};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const coverage=coverageGames(),games=[...gameList(perCell),...coverage.list],started=performance.now();
 console.log(`${coverage.ids.length} abilities forced into ${coverage.list.length} coverage games`);
 const schema=buildSchema(games.map(g=>g.make));
 const poly=[];for(const [kind,{fields}] of Object.entries(schema))for(const [k,{type}] of Object.entries(fields))if(type.includes('|')||type==='null'||type.includes('?'))poly.push(`${kind}.${k}: ${type}`);
 fs.mkdirSync('core/schema',{recursive:true});
 fs.writeFileSync('core/schema/team-4.0.json',JSON.stringify({engine:ENGINE,games:games.length,kinds:schema},null,1)+'\n');
 console.log(`${games.length} games in ${((performance.now()-started)/1000).toFixed(0)} s: ${Object.keys(schema).length} kinds, ${Object.values(schema).reduce((n,k)=>n+Object.keys(k.fields).length,0)} fields`);
 console.log('Needs attention (mixed, unknown or always-null types):\n '+poly.join('\n '));
}

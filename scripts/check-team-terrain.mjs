// Core siege terrain (team-3.9): no open gap between rocks narrower than 50 px, walls stay sealed, the layout stays
// mirrored and clear of the pit and Cores, older engines keep their terrain, stuck fighters walk free, and the
// recorded stuck time is near zero on every map.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {objectiveTerrain,spreadTerrain,TERRAIN_RULES,OBJECTIVE_FIELD} from '../public/objective-maps.js';
import {UNSTICK_RULES} from '../public/combat-team-v3-9.js';

const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)-a.radius-b.radius,W=OBJECTIVE_FIELD.width,H=OBJECTIVE_FIELD.height;
// 1. Terrain over many seeds.
for(const map of ['pillars','ruins','crossroads','groves']){let rocks=0,kept=0;
 for(let s=0;s<300;s++){const seed=s*7919+13,old=objectiveTerrain(map,seed),t=objectiveTerrain(map,seed,{minGap:TERRAIN_RULES.minGap});rocks+=old.length;kept+=t.length;
  assert.deepEqual(objectiveTerrain(map,seed,{minGap:TERRAIN_RULES.minGap}),t,'deterministic');
  // Walls: rocks linked by sealed gaps; open gaps between different walls or rocks are at least minGap.
  const wall=t.map((_,i)=>i),find=i=>wall[i]===i?i:(wall[i]=find(wall[i]));for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++)if(gap(t[i],t[j])<=TERRAIN_RULES.sealed)wall[find(i)]=find(j);
  for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++){const g=gap(t[i],t[j]);if(find(i)!==find(j))assert(g>=TERRAIN_RULES.minGap-1e-6,`${map} seed ${seed}: ${g.toFixed(1)} px gap`);}
  for(const o of t){assert(t.some(p=>Math.abs(p.x-(W-o.x))<1e-6&&Math.abs(p.y-o.y)<1e-6&&p.radius===o.radius),`${map} seed ${seed}: mirrored`);
   assert(Math.hypot(o.x-W/2,o.y-H/2)>o.radius+115-1e-6,'clear of the pit');const moved=!old.some(p=>p.x===o.x&&p.y===o.y);if(moved)for(const cx of [75,W-75])assert(Math.hypot(o.x-cx,o.y-H/2)>=o.radius+190-1e-6,'a moved rock stays clear of the Cores');}
  // Old walls are unchanged.
  if(map==='ruins')assert.deepEqual(t.map(o=>[o.x,o.y]).sort(),old.map(o=>[o.x,o.y]).sort());}
 assert(kept>=rocks*.8,`${map} keeps most of its rocks (${kept}/${rocks})`);}
assert.deepEqual(spreadTerrain([]),[]);

// 2. Engines: team-3.9 uses the spread terrain, team-3.8 keeps the old one.
{const teams=()=>[squad(COMPOSITIONS.balanced3,1),squad(COMPOSITIONS.balanced3,2)],seed=77,make=v=>new (teamEngine(v))(teams(),seed,{headless:true,map:'crossroads'});
 const a=make('team-3.9'),b=make('team-3.8');assert.deepEqual(a.obstacles,objectiveTerrain('crossroads',seed,{minGap:TERRAIN_RULES.minGap}));assert.deepEqual(b.obstacles,objectiveTerrain('crossroads',seed));}

// 3. A fighter grinding against a wall with its target behind it walks free.
{const b=new (teamEngine('team-3.9'))([squad(COMPOSITIONS.balanced3,5),squad(COMPOSITIONS.balanced3,6)],5,{headless:true,map:'ruins'}),wall=b.obstacles.filter(o=>o.x<W/2),mid=wall[2];
 const f=b.combatants.find(x=>x.team===0&&x.role==='damage'),t=b.cores[1];for(const e of b.combatants)if(e!==f){e.x=e.team?W-150:150;e.y=60+e.index*10;}
 f.x=mid.x-mid.radius-f.radius-1;f.y=mid.y;b.brain[0]={plan:'siege',since:0,scores:{}};const start={x:f.x,y:f.y};
 let freed=false;for(let i=0;i<60*4&&!freed;i++){b.moveTeamFighter(f,t,1/60);b.pushOutOfTerrain(f);b.time+=1/60;if(Math.abs(f.y-start.y)>mid.radius*3||f.x>mid.x+mid.radius)freed=true;}
 assert(freed,'stuck against a wall: walks around it');}

// 4. Determinism and the recorded measurement.
{const play=()=>{const b=new (teamEngine('team-3.9'))([squad(COMPOSITIONS.balanced3,8),squad(COMPOSITIONS.balanced3,9)],8,{headless:true,map:'ruins'});while(!b.done)b.step(1/60);return b.result();};const r=play();assert.deepEqual(r,play());assert.equal(r.combatVersion,'team-3.9');}
{const recorded=JSON.parse(fs.readFileSync('validation/team-terrain.json','utf8'));for(const map of ['open','pillars','ruins','crossroads','groves']){const now=recorded.rows.find(r=>r.engine==='team-3.9'&&r.map===map),before=recorded.rows.find(r=>r.engine==='team-3.8'&&r.map===map);
 assert(now&&before,map);assert(now.stuckSecondsPerGame<=1,`${map}: ${now.stuckSecondsPerGame} s stuck per game`);assert(now.stuckSecondsPerGame<=before.stuckSecondsPerGame,`${map} no worse than team-3.8`);}}
assert(UNSTICK_RULES.after<=1.5&&UNSTICK_RULES.escape>0);
console.log('Core siege terrain checks passed.');

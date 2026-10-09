// Fighters stuck on rocks in Core siege, team-3.8 against team-3.9, same squads and seeds on every map.
// A fighter counts as stuck while it is alive, free to act, touching a rock, has no enemy in reach and has moved less
// than 6 px over the last 2.5 s. Writes validation/team-terrain.json. node scripts/evaluate-team-terrain.mjs [games=16]
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
const games=Number(process.argv[2]??16),rows=[];
for(const engine of ['team-3.8','team-3.9'])for(const map of ['open','pillars','ruins','crossroads','groves']){
 const Engine=teamEngine(engine);let episodes=0,seconds=0,unsticks=0;
 for(let i=0;i<games;i++){const b=new Engine([squad(COMPOSITIONS.balanced3,i*31+1),squad(COMPOSITIONS.balanced3,i*31+2)],900+i,{headless:true,map}),hist=new Map(),stuck=new Set();let tick=0;
  while(!b.done){b.step(1/60);if(++tick%30)continue;
   for(const f of b.combatants){if(f.hp<=0){hist.delete(f.index);stuck.delete(f.index);continue;}const h=hist.get(f.index)??[];h.push({x:f.x,y:f.y});if(h.length>6)h.shift();hist.set(f.index,h);if(h.length<6)continue;
    const moved=Math.hypot(h[5].x-h[0].x,h[5].y-h[0].y),touching=b.obstacles.some(o=>Math.hypot(o.x-f.x,o.y-f.y)<o.radius+f.radius+6),foe=b.combatants.some(e=>e.team!==f.team&&e.hp>0&&Math.hypot(e.x-f.x,e.y-f.y)<f.weapon.range+60);
    if(moved<6&&touching&&!foe&&f.sleep<=0&&f.root<=0){seconds+=.5;if(!stuck.has(f.index)){episodes++;stuck.add(f.index);}}else stuck.delete(f.index);}}
  unsticks+=b.result().objective.unsticks??0;}
 const row={engine,map,games,stuckEpisodesPerGame:Math.round(episodes/games*100)/100,stuckSecondsPerGame:Math.round(seconds/games*10)/10,unsticksPerGame:Math.round(unsticks/games*10)/10};rows.push(row);console.log(row);
}
fs.writeFileSync('validation/team-terrain.json',JSON.stringify({note:'Core siege, balanced 3v3 mirrors per map. Stuck: alive, free to act, touching a rock, no enemy in reach, moved under 6 px in 2.5 s.',rows},null,2)+'\n');

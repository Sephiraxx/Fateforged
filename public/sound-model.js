// Which sounds a fight makes, read from what the arena already shows: hp changes between frames (pixi-arena-model.js),
// attacks and casts being released, Titan and Fissure state, and new combat-log lines. Pure and deterministic; it never
// writes to the battle, so sound can't change a result. sound.js plays the cues.
import {snapshot,diffEvents} from './pixi-arena-model.js';
// Every cue. important: still plays at 4x/8x and wins the per-frame budget; gap: minimum real time between two plays (ms);
// group: cues that share one gap (a light and a heavy hit never stack).
export const SOUND_CUES=Object.freeze({
 hit:{gap:45,group:'hit'},bigHit:{gap:70,group:'hit'},heal:{gap:120},death:{important:true,gap:60},revive:{important:true,gap:200},respawn:{gap:200},
 swing:{gap:55},shot:{gap:55},gunshot:{gap:70},cast:{gap:80},kit:{gap:120},dodge:{gap:150},parry:{gap:120},block:{gap:120},
 coreHit:{important:true,gap:140},coreDestroyed:{important:true,gap:0},titanRise:{important:true,gap:0},slamCharge:{gap:300},slam:{important:true,gap:200},
 fissureCharge:{important:true,gap:300},fissure:{important:true,gap:200},molten:{gap:150},forgefire:{important:true,gap:0},steal:{important:true,gap:0},
 suddenDeath:{important:true,gap:0},victory:{important:true,gap:0},click:{gap:40}
});
export const SOUND_NAMES=Object.freeze([...Object.keys(SOUND_CUES),'music-battle','music-sudden-death']);
export const CUE_RULES=Object.freeze({perFrame:6,fastSpeed:4,pan:.6});
// Log lines that carry a sound; damage lines are covered by hp changes.
const LOG_CUES=[[/rises in the pit/,'titanRise'],[/prepares a slam/,'slamCharge'],[/fissure opens/,'fissureCharge'],[/Sudden death/,'suddenDeath'],
 [/sidesteps an attack|dodged\.|avoids the hit/,'dodge'],[/parries the attack|counters the attack/,'parry'],[/ward blocks|absorbs magical energy/,'block']];
const GUN=/revolver|rifle|pistol|musket/i;
const ELEMENTS={fire:0,flame:0,burn:0,ice:1,frost:1,water:1,lightning:2,storm:2,shock:2,shadow:3,void:3,death:3,curse:3,holy:4,light:4,heal:4,nature:5,thorn:5,poison:5};
// A cast's pitch family from its power (fire, ice, lightning, shadow, holy, nature; 6 = other).
export function element(power){const id=`${power?.id??''} ${power?.name??''}`.toLowerCase();for(const [word,n]of Object.entries(ELEMENTS))if(id.includes(word))return n;return 6;}
export function createCueTracker(){
 let fight=null,prev=null,actions=new Map(),lastEvent=null,seenShots=new WeakSet(),wasDone=false,hadFissure=false,lastPlayed={};
 const reset=b=>{fight=b;prev=b?snapshot(b):null;actions=new Map();lastEvent=b?.events?.at(-1)??null;seenShots=new WeakSet();for(const p of b?.projectiles??[])seenShots.add(p);wasDone=!!b?.done;hadFissure=!!b?.fissure;};
 // Cues since the last call. speed: playback speed; now: real time in ms (for the per-cue gaps).
 function read(b,{speed=1,now=0}={}){
  if(!b){fight=null;return [];}
  if(b!==fight){reset(b);return [];}
  const W=b.width??600,pan=x=>Math.max(-CUE_RULES.pan,Math.min(CUE_RULES.pan,((x??W/2)/W*2-1)*CUE_RULES.pan)),out=[];
  const add=(name,x,strength=1,extra={})=>out.push({name,pan:pan(x),strength,...extra});
  // Hp changes: hits and heals merge into one louder cue per frame.
  const snap=snapshot(b);let hits=0,hitShare=0,hitX=0,heals=0,healX=0;
  for(const e of diffEvents(prev,snap)){
   if(e.type==='hit'){hits++;hitShare=Math.max(hitShare,e.share);hitX=e.x;}
   else if(e.type==='heal'){heals++;healX=e.x;}
   else if(e.type==='titanKill')add(e.stolen?'steal':'forgefire',e.x,1);
   else add(e.type,e.x,e.type==='coreHit'?Math.min(1,.4+e.amount/400):1);
  }
  prev=snap;
  if(hits)add(hitShare>=.12?'bigHit':'hit',hitX,Math.min(1,.45+hitShare*3+hits*.05),{count:hits});
  if(heals)add('heal',healX,Math.min(1,.5+heals*.1),{count:heals});
  // Attacks and casts at the moment they are released.
  for(const [i,f]of (b.combatants??b.fighters).entries()){
   if(f.isObjective)continue;const a=f.action,key=f.index??i,seen=actions.get(key);
   if(!a){actions.delete(key);continue;}
   if(seen?.action===a&&seen.released)continue;
   const released=!!a.released||a.type==='cast'&&a.elapsed>=a.windup;actions.set(key,{action:a,released});if(!released)continue;
   const weapon=f.weapon?.name??'';
   if(a.type==='melee')add('swing',f.x,.8);
   else if(a.type==='shot')add(GUN.test(weapon)?'gunshot':'shot',f.x,.8);
   else if(a.type==='cast'||a.type==='technique')add(a.type==='technique'&&f.weapon?.type==='melee'?'swing':'cast',f.x,.9,{element:element(a.power)});
   else if(a.type==='teamKit')add('kit',f.x,.8);
  }
  // The Titan's thrown rock and Fissure.
  for(const p of b.projectiles??[]){if(seenShots.has(p))continue;seenShots.add(p);if(p.molten)add('molten',p.x,1);}
  if(hadFissure&&!b.fissure&&b.titan?.hp>0)add('fissure',b.titan.x,1);hadFissure=!!b.fissure;
  // New log lines (the log keeps only the latest lines, so find the last one already read).
  const events=b.events??[];let start=events.length;while(start>0&&events[start-1]!==lastEvent)start--;if(start===0&&lastEvent&&!events.includes(lastEvent))start=Math.max(0,events.length-8);
  for(let i=start;i<events.length;i++){const text=events[i].text??'';for(const [pattern,name]of LOG_CUES)if(pattern.test(text)){add(name,name==='titanRise'||name==='slamCharge'||name==='fissureCharge'?b.titan?.x:W/2,1);break;}}
  lastEvent=events.at(-1)??lastEvent;
  // The end of the fight.
  if(b.done&&!wasDone){if(b.cores&&/Core destroyed/.test(b.reason??''))add('coreDestroyed',b.cores[b.winnerTeam===0?1:0]?.x,1);add('victory',W/2,1,{winner:b.winnerTeam??b.winner??null});}
  wasDone=!!b.done;
  return budget(out,speed,now);
 }
 // Fast playback keeps only important cues; each name waits its gap; at most perFrame cues, important first.
 function budget(cues,speed,now){
  const kept=[];for(const c of cues.filter(c=>speed<CUE_RULES.fastSpeed||SOUND_CUES[c.name]?.important).sort((a,b)=>!!SOUND_CUES[b.name]?.important-!!SOUND_CUES[a.name]?.important)){
   if(kept.length>=CUE_RULES.perFrame)break;const rule=SOUND_CUES[c.name]??{},key=rule.group??c.name,gap=rule.gap??60;if(now-(lastPlayed[key]??-Infinity)<gap||kept.some(k=>(SOUND_CUES[k.name]?.group??k.name)===key))continue;lastPlayed[key]=now;kept.push(c);}
  return kept;
 }
 return {read,reset};
}
// Battle music tempo and key for a fight, stable per seed.
export function musicPlan(seed=0,suddenDeath=false){
 const s=(seed>>>0)%997,roots=[45,47,50,52,43,48],progressions=[[0,-4,-2,-5],[0,3,-2,-4],[0,-2,-4,-5],[0,5,3,-2]];
 return {root:roots[s%roots.length],progression:progressions[Math.floor(s/7)%progressions.length],tempo:(suddenDeath?150:124)+s%3*4,pattern:s%2};
}

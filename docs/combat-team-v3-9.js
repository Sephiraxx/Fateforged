// Core siege, team-3.9: no more fighters stuck on rocks.
// - Terrain: the Core siege field keeps every open gap between rocks at least 50 px wide (objective-maps.js
//   spreadTerrain); fighters are 18 px wide and used to wedge into 7-45 px gaps on Pillars and Crossroads.
// - Unsticking: a fighter that wants to move but has barely moved for a second while touching terrain (grinding on a
//   Ruins wall, or pushed into a rock by its formation) walks around the rock or wall for a moment.
import {TeamBattle as Previous} from './combat-team-v3-8.js';
import {objectiveTerrain,TERRAIN_RULES} from './objective-maps.js';
export * from './combat-team-v3-8.js';
export const TEAM_ENGINE_VERSION='team-3.9';
export const UNSTICK_RULES=Object.freeze({still:4,after:1,escape:1.2,touch:4,step:40});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class TeamBattle extends Previous{
 constructor(teams,seed,options={}){super(teams,seed,options);this.obstacles=objectiveTerrain(this.environment.map,this.seed,{minGap:TERRAIN_RULES.minGap});for(const f of this.combatants)this.pushOutOfTerrain(f);this.unsticks=0;}
 touching(f){return this.obstacles.find(o=>d(f,o)<o.radius+f.radius+UNSTICK_RULES.touch)??null;}
 // Where a stuck fighter goes: around whatever blocks the way to its target, else sideways around the rock it touches.
 escapeFrom(f,t,rock){const way=t?this.detour(f,t):null;if(way)return way;const dx=f.x-rock.x,dy=f.y-rock.y,len=Math.hypot(dx,dy)||1,side=f.detourSide||(f.index%2?1:-1),r=rock.radius+f.radius+UNSTICK_RULES.step;return {x:this.clampX(rock.x+dx/len*r-dy/len*r*side),y:this.clampY(rock.y+dy/len*r+dx/len*r*side)};}
 moveTeamFighter(f,t,dt){
  const r=UNSTICK_RULES;
  if(f.unstickUntil>this.time&&f.unstickTo&&f.sleep<=0&&f.root<=0){
   if(d(f,f.unstickTo)<8){f.unstickUntil=0;}else{const weapon=f.weapon,intent=f.intent;f.weapon={...weapon,type:'melee',range:4};f.intent=null;try{this.moveFighter(f,{...t,x:f.unstickTo.x,y:f.unstickTo.y,vx:0,vy:0,action:null,isObjective:true,weapon:{...t.weapon,type:'melee'}},dt);}finally{f.weapon=weapon;f.intent=intent;}f.angle=Math.atan2(t.y-f.y,t.x-f.x);return;}
  }
  const result=super.moveTeamFighter(f,t,dt),check=f.stillSince;
  if(!check||d(f,check)>r.still){f.stillSince={x:f.x,y:f.y,time:this.time};return result;}
  if(this.time-check.time<r.after||f.sleep>0||f.root>0||f.action||d(f,t)<=f.weapon.range+10)return result;
  const rock=this.touching(f);if(!rock)return result;
  f.unstickTo=this.escapeFrom(f,t,rock);f.unstickUntil=this.time+r.escape;f.stillSince=null;this.unsticks++;return result;
 }
 respawn(f){super.respawn(f);f.unstickUntil=0;f.unstickTo=null;f.stillSince=null;}
 result(){const result=super.result();return {...result,combatVersion:TEAM_ENGINE_VERSION,objective:{...result.objective,unsticks:this.unsticks}};}
}

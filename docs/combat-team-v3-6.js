// Core siege with coach game plans (team-3.6, objective phase 4). Three dials per team steer the team brain:
// Titan priority, Style and Siege timing (team-game-plan.js). Siege postures soften the formation handicaps that
// made cautious coach styles lose to Balanced in Core siege; classic teamfight keeps its own postures.
import {TeamBattle as Previous,BRAIN_RULES,SIEGE_TITAN_RULES,BRAIN_SIEGE_RULES} from './combat-team-v3-5.js';
import {TEAM_POSTURES} from './combat-team-v2.js';
import {validGamePlan,defaultGamePlan} from './team-game-plan.js';
export {OBJECTIVE_RULES,TITAN_RULES,SIEGE_RULES,SIEGE_TITAN_RULES,TEAM_PLANS,PLAN_LABELS,BRAIN_RULES} from './combat-team-v3-5.js';
export const TEAM_ENGINE_VERSION='team-3.6';
// With only damage dealers at full damage, a full-health Titan took too long to kill and contesting it was a trap:
// it has half the health and hits fighters half as hard.
export const PLAN_TITAN_RULES=Object.freeze(Object.fromEntries(Object.entries(SIEGE_TITAN_RULES).map(([size,r])=>[size,Object.freeze({...r,hp:Object.fromEntries(Object.entries(r.hp).map(([k,v])=>[k,v*.5])),attackDamage:r.attackDamage*.5,slamDamage:r.slamDamage*.5})])));
// Defended Cores fight back harder (pulse damage doubled), so a team that waits to siege can still hold its Core;
// 3v3 Cores have 4,000 HP to keep matches near five minutes.
export const PLAN_SIEGE_RULES=Object.freeze(Object.fromEntries(Object.entries(BRAIN_SIEGE_RULES).map(([size,r])=>[size,Object.freeze({...r,pulseDamage:r.pulseDamage*2,...(size==='3'?{coreHp:Object.freeze({3:4000})}:{})})])));
export const SIEGE_LATE=180;
// 'With Forgefire' also sieges with a two-fighter lead or from 3:30, so a team without the buff can still win.
export const SIEGE_FORGEFIRE_LATE=210;
// Siege postures: changes relative to the classic posture of each tactic.
export const SIEGE_POSTURES=Object.freeze(Object.fromEntries(Object.entries(TEAM_POSTURES).map(([tactic,p])=>[tactic,Object.freeze({...p,...({
 defensive:{leash:120,pull:1.2},
 'protect-carry':{leash:120,dive:'exposed'}
})[tactic]})])));
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class TeamBattle extends Previous{
 constructor(teams,seed,options={}){
  super(teams,seed,{...options,objectiveRules:options.objectiveRules??PLAN_SIEGE_RULES[teams?.[0]?.length],titanRules:options.titanRules??PLAN_TITAN_RULES[teams?.[0]?.length]});
  this.gamePlans=[0,1].map(team=>validGamePlan(options.gamePlans?.[team])?{...options.gamePlans[team]}:defaultGamePlan(this.tactics[team]));
  // The brain first ran inside the parent constructor before the plans were known; start it again with them.
  this.brain=[0,1].map(()=>({plan:'contest',since:0,scores:{}}));this.planSwitches=[0,0];this.updateBrain();
 }
 posture(team){return SIEGE_POSTURES[this.tactics[team]]??super.posture(team);}
 gamePlan(team){return this.gamePlans?.[team]??defaultGamePlan(this.tactics[team]);}
 planScores(team){
  const out=super.planScores(team),s=this.situation(team),g=this.gamePlan(team),edge=s.alive-s.foesAlive,add=(p,n)=>{if(out[p]>0)out[p]=Math.max(1,out[p]+n);};
  // Don't start on the Titan while the enemy waits near the pit to punish whoever does.
  const lurking=this.combatants.filter(e=>e.team!==team&&e.hp>0&&d(e,this.pit())<BRAIN_RULES.pitRadius+150).length;
  if(s.titanUp&&!s.foesOnTitan&&lurking>=Math.max(1,s.alive-1)&&this.brain?.[team]?.plan!=='contest')add('contest',-25);
  if(g.titan==='always')add('contest',10);
  if(g.titan==='ahead'&&!(edge>0||edge===0&&s.hp>=s.foeHp)){out.contest=0;add('hold',10);}
  if(g.titan==='never'){out.contest=0;out.steal=0;}
  if(g.style==='flank'){add('flank',15);add('steal',5);}else add('flank',-10);
  const siegeAllowed=g.siege==='forgefire'?s.forgefire||s.foeCore<.2||edge>=2||this.time>=SIEGE_FORGEFIRE_LATE:g.siege==='late'?s.forgefire||edge>=2||this.time>=SIEGE_LATE:edge>0||s.forgefire||this.time>=BRAIN_RULES.pressureStart||!s.titanUp&&!s.titanSoon;
  // A team that waits to siege spends the time on the Titan.
  if(!siegeAllowed){out.siege=0;add('contest',15);if(!(out.hold>0))out.hold=30;}
  // Any team answers a single attacker who is hitting its Core.
  if(!out.defend&&s.nearOurCore>=1&&s.coreHit)out.defend=65;
  return out;
 }
 // Flankers take a side lane on the way to the enemy Core: skirmishers and controllers aim for a waypoint above or
 // below the pit before they head in.
 chooseTarget(f){
  const t=super.chooseTarget(f);
  if(this.gamePlans&&this.gamePlan(f.team).style==='flank'&&this.brain?.[f.team].plan==='siege'&&t===this.cores[1-f.team]&&(this.isSkirmisher(f)||f.role==='controller')){
   const lane=f.index%2?120:480,ahead=f.team?f.x<this.pit().x:f.x>this.pit().x;
   if(!ahead&&Math.abs(f.y-lane)>60)f.laneWaypoint={x:this.pit().x+(f.team?120:-120),y:lane};else f.laneWaypoint=null;
  }else f.laneWaypoint=null;
  return t;
 }
 moveFighter(f,t,dt){if(f.laneWaypoint&&t?.isObjective)return super.moveFighter(f,{...t,x:f.laneWaypoint.x,y:f.laneWaypoint.y,isObjective:true},dt);return super.moveFighter(f,t,dt);}
 result(){return {...super.result(),combatVersion:TEAM_ENGINE_VERSION,gamePlans:this.gamePlans.map(p=>({...p}))};}
}

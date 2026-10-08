// Core siege, team-3.7: teams answer backdoors, the Forge Titan fights back at range, and Forgefire is a bit stronger.
// - Nobody teleports, charges or portals onto a Core, and a teleport never lands within 420 of the enemy Core.
// - Backdoor duty: while the team plan is not Defend, the teammates closest to their Core (one per intruder, never
//   the whole team) go back. Two or more intruders make Defend score without a Core hit, and defenders go for the
//   intruder hitting their Core first.
// - The Titan throws Molten Hurl at the farthest attacker out of melee reach, and opens a Fissure: a telegraphed
//   line that damages and stuns whoever stays in it.
// - Cores take more damage from 3:00, so defended matches still end.
import {TeamBattle as Previous,PLAN_TITAN_RULES,PLAN_SIEGE_RULES} from './combat-team-v3-6.js';
export {OBJECTIVE_RULES,TITAN_RULES,SIEGE_RULES,SIEGE_TITAN_RULES,TEAM_PLANS,PLAN_LABELS,BRAIN_RULES,PLAN_TITAN_RULES,PLAN_SIEGE_RULES} from './combat-team-v3-6.js';
export const TEAM_ENGINE_VERSION='team-3.7';
const MOBILITY=new Set(['charge','teleport','portal','space']);
// noBlink: no teleport lands this close to the enemy Core. intrusion: enemies this close to a Core are intruders; it
// stops short of the team's own choke (345 from the Core), so holding the choke is not a backdoor.
export const BACKDOOR_RULES=Object.freeze({noBlink:420,intrusion:300,defendBase:55,defendPerIntruder:10});
// hurl: Molten Hurl interval, reach and damage (share of the target's max HP); fissure: interval, telegraph, line
// length and width, damage share and stun. Forgefire lasts longer and hits a little harder than in team-3.6.
const TITAN_ABILITIES=Object.freeze({hurlInterval:3.5,hurlRange:420,hurlMin:100,hurlSpeed:300,fissureInterval:9,fissureFirst:6.5,fissureTelegraph:1,fissureLength:300,fissureWidth:46,fissureStun:1.1});
export const FORGE_TITAN_RULES=Object.freeze({
 3:Object.freeze({...PLAN_TITAN_RULES[3],...TITAN_ABILITIES,hurlDamage:.035,fissureDamage:.035,forgefire:40,damage:1.08,shield:.07,coreDamage:1.15}),
 5:Object.freeze({...PLAN_TITAN_RULES[5],...TITAN_ABILITIES,hurlDamage:.05,fissureDamage:.05,forgefire:45,damage:1.10,shield:.08,coreDamage:1.20})
});
// Now that Cores are defended, long matches would stall: from 3:00, damage to Cores grows by 1.2% per second (+72%
// at 4:00, +144% at sudden death). Cores have 3,600 HP in 3v3 and 5,000 in 5v5.
export const FORGE_SIEGE_RULES=Object.freeze({
 3:Object.freeze({...PLAN_SIEGE_RULES[3],coreHp:Object.freeze({3:3600}),coreRamp:Object.freeze({start:180,perSecond:.012})}),
 5:Object.freeze({...PLAN_SIEGE_RULES[5],coreHp:Object.freeze({5:5000}),coreRamp:Object.freeze({start:180,perSecond:.012})})
});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Distance from p to the Fissure line and how far along it p sits.
export function fissureReach(fissure,p){const ux=Math.cos(fissure.angle),uy=Math.sin(fissure.angle),rx=p.x-fissure.x,ry=p.y-fissure.y,along=rx*ux+ry*uy;return {along,side:rx*-uy+ry*ux,inside:along>=-(p.radius??0)&&along<=fissure.length+(p.radius??0)&&Math.abs(rx*-uy+ry*ux)<=fissure.width/2+(p.radius??0)};}
export class TeamBattle extends Previous{
 constructor(teams,seed,options={}){
  const size=teams?.[0]?.length;
  super(teams,seed,{...options,objectiveRules:options.objectiveRules??FORGE_SIEGE_RULES[size],titanRules:options.titanRules??FORGE_TITAN_RULES[size]});
  this.backdoorRules=options.backdoorRules??BACKDOOR_RULES;this.duty=[new Set(),new Set()];this.fissure=null;this.nextHurl=Infinity;this.nextFissure=Infinity;this.titanUp=false;this.seenResets=0;this.hurls=0;this.fissures=0;this.fissureStuns=0;this.dutySeconds=[0,0];
  this.updateDuty();
 }
 // --- Backdoors ---
 intruders(team){const core=this.cores[team],r=this.backdoorRules??BACKDOOR_RULES;return this.combatants.filter(e=>e.team!==team&&e.hp>0&&d(e,core)<r.intrusion);}
 updateDuty(){
  if(!this.duty)return;
  for(const team of [0,1]){
   const duty=this.duty[team];duty.clear();if(this.brain?.[team]?.plan==='defend')continue;
   const core=this.cores[team],mine=this.combatants.filter(f=>f.team===team&&f.hp>0),k=Math.min(this.intruders(team).length,mine.length-1);
   for(const f of mine.sort((a,b)=>d(a,core)-d(b,core)||a.index-b.index).slice(0,Math.max(0,k)))duty.add(f.index);
  }
 }
 onDuty(f){return !!this.duty?.[f.team]?.has(f.index)&&this.intruders(f.team).length>0;}
 updateBrain(){super.updateBrain();this.updateDuty();}
 planScores(team){
  const out=super.planScores(team),n=this.intruders(team).length,r=this.backdoorRules??BACKDOOR_RULES;
  if(n>=2)out.defend=Math.max(out.defend??0,r.defendBase+r.defendPerIntruder*n);
  return out;
 }
 chooseTarget(f){
  const taunt=this.actorFor(f.tauntSource);if(f.tauntTime>0&&taunt?.hp>0)return taunt;
  if(this.brain?.[f.team]?.plan==='defend'||this.onDuty(f)){const t=this.defendTarget(f);if(t){f.laneWaypoint=null;return t;}}
  return super.chooseTarget(f);
 }
 // Defenders go for the enemy hitting their Core, else the one closest to it, instead of whoever stands in front of them
 // (in team-3.6 they often fought the enemy tank at the back while its damage dealers took the Core).
 defendTarget(f){const core=this.cores[f.team];return this.intruders(f.team).sort((a,b)=>(b.target===core.index)-(a.target===core.index)||d(a,core)-d(b,core)||a.index-b.index)[0]??null;}
 planLeash(f){if(this.onDuty(f))return {ref:this.cores[f.team],max:240};return super.planLeash(f);}
 teleportDestination(f,t){
  if(this.cores?.includes(t))return null;const spot=super.teleportDestination(f,t),core=this.cores?.[1-f.team];
  return spot&&core&&Math.hypot(spot.x-core.x,spot.y-core.y)<BACKDOOR_RULES.noBlink?null:spot;
 }
 powerUtility(f,t,p,copied=false){if(MOBILITY.has(p.id)&&this.cores?.includes(t))return -1;return super.powerUtility(f,t,p,copied);}
 // --- Forge Titan abilities ---
 hurt(t,f,amount,...rest){
  if(f&&f===this.titan&&t?.isObjective)return false;
  const ramp=this.objectiveRules.coreRamp;if(ramp&&this.cores?.includes(t)&&this.time>ramp.start)amount*=1+(this.time-ramp.start)*ramp.perSecond;
  return super.hurt(t,f,amount,...rest);
 }
 // Fighters standing in a Fissure telegraph step out of the line.
 dodgeThreat(f,t){
  const z=this.fissure;
  if(z&&f.rollCooldown<=0&&f.energy>=18&&!f.raging&&f.weakness!=='overconfidence'&&!f.action&&f.sleep<=0&&f.root<=0&&f.stagger<=0){const r=fissureReach(z,f);if(r.inside){const sign=r.side>=0?1:-1;f.rollX=-Math.sin(z.angle)*sign;f.rollY=Math.cos(z.angle)*sign;f.roll=.23;f.rollCooldown=3;f.evade=.25;f.actionLabel='Evade fissure';return;}}
  return super.dodgeThreat(f,t);
 }
 titanStun(t,duration){if(!t||t.hp<=0||t.ccImmune>0||t.sleep>0||t.root>0||t.amnesia>0||t.suppressed>0||t.tauntTime>0)return false;t.kitStun=t.sleep=duration;t.action=null;t.wasHard=true;this.effect(10,t.x,t.y,25);return true;}
 // The Titan's attackers, as its aggro table sees them (hits within the reset window).
 titanAttackers(){const seen=new Set();for(const h of this.titanHits)seen.add(h.index);return [...seen].map(i=>this.actorFor(i)).filter(f=>f?.hp>0&&f.team<2).sort((a,b)=>a.index-b.index);}
 moltenHurl(){
  const t=this.titan,r=this.titanRules,target=this.titanAttackers().filter(f=>{const dist=d(f,t);return dist>r.hurlMin&&dist<=r.hurlRange&&this.clearShot(t,f);}).sort((a,b)=>d(b,t)-d(a,t)||a.index-b.index)[0];
  if(!target)return false;const angle=Math.atan2(target.y-t.y,target.x-t.x),dist=d(target,t);
  this.projectiles.push({x:t.x,y:t.y,vx:Math.cos(angle)*r.hurlSpeed,vy:Math.sin(angle)*r.hurlSpeed,owner:t.index,damage:target.maxHp*r.hurlDamage,type:'arcane',sprite:2,life:dist/r.hurlSpeed+.25,radius:7,molten:true});
  this.hurls++;this.log(`Forge Titan hurls molten rock at ${target.name}.`);return true;
 }
 openFissure(){
  const t=this.titan,r=this.titanRules,near=this.combatants.filter(f=>f.hp>0&&d(f,t)<=r.fissureLength).sort((a,b)=>a.index-b.index);let best=null;
  for(const aim of near){const angle=Math.atan2(aim.y-t.y,aim.x-t.x),z={x:t.x,y:t.y,angle,length:r.fissureLength,width:r.fissureWidth},count=near.filter(f=>fissureReach(z,f).inside).length;if(!best||count>best.count)best={z,count};}
  if(!best)return false;this.fissure={...best.z,start:this.time,at:this.time+r.fissureTelegraph};this.fissures++;this.log('Forge Titan splits the ground: a fissure opens.');return true;
 }
 releaseFissure(){
  const z=this.fissure,r=this.titanRules;this.fissure=null;
  for(const f of this.combatants){if(f.hp<=0||!fissureReach(z,f).inside)continue;this.hurt(f,this.titan,f.maxHp*r.fissureDamage,'physical',true);if(f.hp>0&&this.titanStun(f,r.fissureStun))this.fissureStuns++;}
  for(let s=60;s<=z.length;s+=80)this.effect(8,z.x+Math.cos(z.angle)*s,z.y+Math.sin(z.angle)*s,60);
 }
 objectiveStep(dt){
  super.objectiveStep(dt);if(this.done)return;
  for(const team of [0,1])if(this.duty[team].size&&this.intruders(team).length)this.dutySeconds[team]+=dt*this.duty[team].size;
  const t=this.titan,r=this.titanRules,up=t.hp>0;
  if(up&&(!this.titanUp||this.titanResets!==this.seenResets)){this.nextHurl=this.time+r.hurlInterval;this.nextFissure=this.time+r.fissureFirst;this.fissure=null;}
  this.titanUp=up;this.seenResets=this.titanResets;
  if(!up){this.fissure=null;return;}
  if(this.fissure&&this.time>=this.fissure.at)this.releaseFissure();
  if(t.target==null)return;
  if(this.time>=this.nextHurl&&this.moltenHurl())this.nextHurl=this.time+r.hurlInterval;
  if(!this.fissure&&this.slamAt==null&&this.time>=this.nextFissure&&this.openFissure())this.nextFissure=this.time+r.fissureInterval;
 }
 result(){const result=super.result();return {...result,combatVersion:TEAM_ENGINE_VERSION,objective:{...result.objective,hurls:this.hurls,fissures:this.fissures,fissureStuns:this.fissureStuns,dutySeconds:this.dutySeconds.map(n=>Math.round(n*10)/10)}};}
}

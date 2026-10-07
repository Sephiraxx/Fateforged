// Team 2.1: projectile geometry and release-time cover checks. Team 2 and duel 12 remain frozen.
import {TeamBattle as PreviousTeamBattle} from './combat-team-v2.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2.js';
export const TEAM_ENGINE_VERSION='team-2.1';
const bolts=new Set(['fire','ice','water','dream','blood','void','custom','metal','crystal','sound','ember','venom','thornBolt','roots']);
const small=new Set(['crystal','ember','venom','thornBolt','roots']);
const segment=(o,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(o.x-a.x-dx*t,o.y-a.y-dy*t);};
export class TeamBattle extends PreviousTeamBattle{
 pathClear(f,t,angle,radius=3,speed=290){const d=Math.hypot(t.x-f.x,t.y-f.y),time=d/speed*(.45+.5*(f.tactics??.5)),distance=Math.hypot(t.x+(t.vx??0)*time-f.x,t.y+(t.vy??0)*time-f.y),lead={x:f.x+Math.cos(angle)*distance,y:f.y+Math.sin(angle)*distance};return !this.obstacles.some(o=>segment(o,f,lead)<=o.radius+radius||segment(o,f,t)<=o.radius+radius);}
 shotClear(f,t,angle){const origin=f.portalTime>0&&f.gates?{...f,...f.gates[1]}:f;return this.pathClear(origin,t,origin===f?angle:this.aim(origin,t,290),3);}
 projectileClear(f,t,p){if(!bolts.has(p.id)||p.id==='sound'&&Math.hypot(t.x-f.x,t.y-f.y)<130)return true;return (p.id==='crystal'?[-.18,0,.18]:[0]).every(spread=>this.pathClear(f,t,this.aim(f,t,220)+spread,small.has(p.id)?4:7,220));}
 powerUtility(f,t,p,copied=false){if(!this.projectileClear(f,t,p))return -1;if(p.kind==='technique'&&f.weapon.type==='ranged'&&!this.shotClear(f,t,this.aim(f,t,290)))return -1;return super.powerUtility(f,t,p,copied);}
 startAttack(f,t){
  // Self/ally abilities can still be used while a ranged fighter is behind cover.
  if(f.action||f.sleep>0||f.amnesia>0||f.stagger>0||f.roll>0)return;
  const casts=f.castCount;this.castPower(f,t);if(f.castCount!==casts||f.action)return;
  if(f.weapon.type!=='melee'&&!f.raging&&!(f.shape>0)&&!this.shotClear(f,t,this.aim(f,t,290)))return;
  const energy=f.energy;super.startAttack(f,t);if(f.action&&!f.action.released)Object.assign(f.action,{refundEnergy:Math.max(0,energy-f.energy),targetIndex:t.index});
 }
 usePower(f,t,p,copied=false){
  if(!this.projectileClear(f,t,p))return false;
  const result=super.usePower(f,t,p,copied),a=f.action;
  if(a&&!a.released){a.targetIndex=t.index;a.refundEnergy=p.kind==='technique'?p.cost:0;a.refundMana=p.kind==='technique'?0:this.powerCost(p);}
  return result;
 }
 updateAttack(f,t,dt){
  const a=f.action;const aimed=this.fighters[a?.targetIndex]??t,projectile=a?.type==='shot'||a?.type==='technique'&&f.weapon.type==='ranged';
  if(a&&!a.released&&a.elapsed+dt>=a.windup&&(projectile&&(aimed.hp<=0||!this.shotClear(f,aimed,a.angle))||a.type==='cast'&&(aimed.hp<=0||!this.clearShot(f,aimed)))){
   f.energy=Math.min(100,f.energy+(a.refundEnergy??0));f.mana=Math.min(f.maxMana,f.mana+(a.refundMana??0));f.action=null;f.cooldown=Math.min(f.cooldown,.12);if(a.power)f.cast=Math.min(f.cast,.20);f.actionLabel='Find a clear shot';this.log(`${f.name} holds fire behind cover.`);return;
  }
  return super.updateAttack(f,aimed,dt);
 }
 result(){return {...super.result(),combatVersion:TEAM_ENGINE_VERSION};}
}

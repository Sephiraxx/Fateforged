import {TeamBattle as PreviousTeamBattle,CC_IMMUNITY} from './combat-team-v2-1.js';
import {teamKit} from './team-kits.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2-1.js';
export const TEAM_ENGINE_VERSION='team-2.2';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const harmful=['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul','crippled','brambleSlow','tauntTime','kitStun'];
export class TeamBattle extends PreviousTeamBattle{
 constructor(teams,seed,options={}){super(teams,seed,options);const chars=teams.flat();for(const f of this.fighters)Object.assign(f,{teamKit:chars[f.index].teamKit??null,kitCooldown:1+f.index*.1,kitCasts:0,reviveSpent:false,revivedByKit:false,tauntTime:0,tauntSource:null,kitShield:0,kitStun:0});}
 kitTargets(f,k,t){
  const allies=this.alliesOf(f,true).filter(a=>dist(f,a)<=240&&this.clearShot(f,a)),hurt=allies.filter(a=>a.hp<a.maxHp*.8).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.index-b.index);
  if(k.id==='resurrection')return this.fighters.filter(a=>a.team===f.team&&a.hp<=0&&!a.revivedByKit&&dist(f,a)<=240&&this.clearShot(f,a)&&!f.reviveSpent).slice(0,1);
  if(k.id==='cleanse')return allies.filter(a=>harmful.some(key=>a[key]>.25)).slice(0,1);
  if(k.id==='barrier')return allies.filter(a=>dist(f,a)<=110&&a.wardTime<=.5&&this.underFire(a)).length?allies.filter(a=>dist(f,a)<=110):[];
  if(k.id==='mendingWave')return hurt.filter(a=>dist(f,a)<=110);
  if(k.id==='chainHeal')return hurt.slice(0,1);
  if(k.id==='tauntShout'||k.id==='knockUp')return this.enemiesOf(f).filter(a=>dist(f,a)<=(k.id==='tauntShout'?110:85)&&a.ccImmune<=0&&this.clearShot(f,a));
  if(!t||t.hp<=0||t.ccImmune>0||dist(f,t)>(k.id==='hamstring'?100:260)||!this.clearShot(f,t))return [];
  if(k.id==='hamstring'&&t.slow>.5||k.id==='disarmShot'&&t.disarmed>.5)return [];
  if(['stunBolt','disarmShot'].includes(k.id)&&!this.pathClear(f,t,this.aim(f,t,260),4,260))return [];
  return [t];
 }
 powerUtility(f,t,p,copied=false){if(f.disarmed>0&&p.kind==='technique')return -1;return super.powerUtility(f,t,p,copied);}
 hurt(t,...args){const connected=super.hurt(t,...args);if(t.hp>0&&t.kitStun>0)t.sleep=Math.max(t.sleep,t.kitStun);return connected;}
 startAttack(f,t){if(f.disarmed>0){this.castPower(f,t);return;}return super.startAttack(f,t);}
 castPower(f,t){
  const k=teamKit(f.teamKit);
  if(k&&f.kitCooldown<=0&&f.cast<=0&&!f.action&&f.hp>0&&f.sleep<=0&&f.amnesia<=0&&f.suppressed<=0&&f.stagger<=0&&f.roll<=0&&f.mana>=k.cost&&f.weakness!=='silenced casting'&&!(this.night&&f.weakness==='loses power at night')&&!(!this.night&&f.weakness==='loses power in daylight')&&!(f.weakness==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)){
   const targets=this.kitTargets(f,k,t);if(targets.length){f.mana-=k.cost;f.kitCooldown=k.cooldown;f.cast=.5;f.castCount++;f.kitCasts++;if(f.weakness==='power needs a sacrifice')f.hp-=f.maxHp*.03;f.lastCastId=k.id;f.action={type:'teamKit',kit:k.id,targets:targets.map(a=>a.index),elapsed:0,windup:k.windup,angle:Math.atan2(targets[0].y-f.y,targets[0].x-f.x),released:false};f.actionLabel=k.name;this.log(`${f.name} channels ${k.name}.`);return;}
  }
  return super.castPower(f,t);
 }
 updateAttack(f,t,dt){
  const a=f.action;if(a?.type!=='teamKit')return super.updateAttack(f,t,dt);
  const k=teamKit(a.kit);if(f.hp<=0||f.sleep>0||f.amnesia>0||f.suppressed>0||f.stagger>0||f.roll>0){f.action=null;this.log(`${f.name}'s ${k.name} is interrupted.`);return;}
  a.elapsed+=dt;f.actionLabel=k.name;if(a.elapsed<k.windup)return;f.action=null;
  const targets=a.targets.map(i=>this.fighters[i]).filter(Boolean),target=targets[0];
  if(!target||k.id!=='resurrection'&&target.hp<=0||dist(f,target)>260||!this.clearShot(f,target)||['stunBolt','disarmShot'].includes(k.id)&&!this.pathClear(f,target,this.aim(f,target,260),4,260)){f.mana=Math.min(f.maxMana,f.mana+k.cost);f.kitCooldown=.2;return;}
  this.applyTeamKit(f,k,targets);
 }
 applyTeamKit(f,k,targets){
  const heal=(a,n)=>{this.healSource=f;this.heal(a,n);this.healSource=null;this.effect(0,a.x,a.y,25);},t=targets[0];
  if(k.id==='mendingWave')for(const a of targets)if(a.hp>0&&a.team===f.team&&dist(f,a)<=110)heal(a,f.spell*.75);
  if(k.id==='chainHeal'&&t?.hp>0&&t.team===f.team){const used=new Set();let a=t;for(const power of [.8,.65,.5]){if(!a)break;used.add(a.index);heal(a,f.spell*power);a=this.alliesOf(f,true).filter(b=>!used.has(b.index)&&b.hp<b.maxHp*.9&&dist(a,b)<=120&&this.clearShot(a,b)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.index-b.index)[0];}}
  if(k.id==='resurrection'&&t?.hp<=0&&!t.revivedByKit&&!f.reviveSpent&&t.team===f.team&&dist(f,t)<=240){f.reviveSpent=true;t.revivedByKit=true;t.hp=t.maxHp*.4;t.downed=t.creditedDown=false;t.action=null;t.vx=t.vy=0;t.respawnAt=null;for(const key of harmful)t[key]=0;t.ccImmune=CC_IMMUNITY;this.effect(0,t.x,t.y,45);this.updatePlans();this.planTimer=0;this.log(`${f.name} resurrects ${t.name}.`);}
  if(k.id==='cleanse'&&t?.hp>0&&t.team===f.team){for(const key of harmful)t[key]=0;t.action=null;t.ccImmune=CC_IMMUNITY;t.wasHard=false;this.effect(0,t.x,t.y,30);}
  if(k.id==='barrier')for(const a of targets)if(a.hp>0&&a.team===f.team&&dist(f,a)<=110){a.wardHits=Math.max(a.wardHits,1);a.wardTime=Math.max(a.wardTime,4);this.effect(3,a.x,a.y,30);}
  if(['stunBolt','disarmShot'].includes(k.id)&&t?.hp>0){const angle=this.aim(f,t,260);this.projectiles.push({x:f.x,y:f.y,vx:Math.cos(angle)*260,vy:Math.sin(angle)*260,owner:f.index,damage:f.spell*.25,type:'psychic',sprite:10,life:2,radius:4,payload:'kit:'+k.id,duration:k.id==='stunBolt'?1.2:2.4});}
  if(k.id==='hamstring')this.kitControl(f,t,k.id,4);
  if(['tauntShout','knockUp'].includes(k.id))for(const a of targets)if(a.hp>0&&dist(f,a)<=(k.id==='tauntShout'?110:85)&&this.clearShot(f,a))this.kitControl(f,a,k.id,k.id==='tauntShout'?2:.6);
 }
 kitControl(f,t,id,duration){if(!t||t.hp<=0||t.team===f.team||t.ccImmune>0||t.sleep>0||t.root>0||t.amnesia>0||t.suppressed>0||t.tauntTime>0)return false;
  if(id==='stunBolt'||id==='knockUp'){t.kitStun=t.sleep=duration;t.action=null;t.wasHard=true;}
  if(id==='disarmShot'){t.disarmed=duration;t.action=null;t.ccImmune=duration+CC_IMMUNITY;}
  if(id==='hamstring'){t.slow=duration;t.ccImmune=duration+CC_IMMUNITY;}
  if(id==='tauntShout'){t.tauntTime=duration;t.tauntSource=f.index;t.target=f.index;t.retarget=0;}
  this.effect(10,t.x,t.y,25);return true;
 }
 applyImpact(id,f,t,damage,duration){if(id?.startsWith('kit:'))return this.kitControl(f,t,id.slice(4),duration);return super.applyImpact(id,f,t,damage,duration);}
 chooseTarget(f){const taunt=this.fighters[f.tauntSource];return f.tauntTime>0&&taunt?.hp>0?taunt:super.chooseTarget(f);}
 moveTeamFighter(f,t,dt){if(f.action?.type==='teamKit'){f.vx=f.vy=0;return;}return super.moveTeamFighter(f,t,dt);}
 upkeep(f,dt){super.upkeep(f,dt);f.kitStun=Math.max(0,f.kitStun-dt);if(f.kitStun>0)f.sleep=Math.max(f.sleep,f.kitStun);f.kitCooldown=Math.max(0,f.kitCooldown-dt);if(f.tauntTime>0){f.tauntTime=Math.max(0,f.tauntTime-dt);f.ccSeconds+=dt;if(f.tauntTime<=0)f.ccImmune=CC_IMMUNITY;}}
 result(){return {...super.result(),combatVersion:TEAM_ENGINE_VERSION,fighters:super.result().fighters.map((r,i)=>({...r,teamKit:this.fighters[i].teamKit,kitCasts:this.fighters[i].kitCasts}))};}
}

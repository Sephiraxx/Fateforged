import {Battle as BaseBattle,random,weaponFor,fighterProfile,tierFor,TIER_LIMITS,combatStyle,REWIND_HEALTH_RECOVERY,REWIND_MANA_RECOVERY} from './combat-v12-base.js';
import {powerFor,weaponProperties} from './abilities-v12.js';
export {random,weaponFor,fighterProfile,tierFor,TIER_LIMITS,combatStyle,powerFor,REWIND_HEALTH_RECOVERY,REWIND_MANA_RECOVERY};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const nature=new Set(['thornBolt','roots','bramble','seedburst']);
const strikes=new Set(['drivingStrike','charge','cleave','aimedShot','cripplingStrike']);
const timers=['guardTime','parryTime','perfectTime','counterTime','lastStandTime','crippled','brambleSlow'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,s=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-s*dx,p.y-a.y-s*dy);};
export class Battle extends BaseBattle{
 constructor(...args){super(...args);for(const f of this.fighters){for(const key of timers)f[key]=0;Object.assign(f,{guardReady:false,secondWindUsed:false,lastStandUsed:false,perfectUsed:false,windHealing:0,windRemaining:0,counterScale:1,abilityUseCounts:{}});}}
 powerCost(p){return p.cost??super.powerCost(p);}
 copyChoice(f,t){const spells=t.powers.filter(p=>p.kind!=='technique'&&p.id!=='copy');return super.copyChoice(f,{...t,powers:spells});}
 powerUnsafe(f,t,p){if(f.weakness!=='cannot harm the innocent')return false;if(p.id==='charge')return this.wisps.some(w=>w.hp>0&&segmentDistance(w,f,t)<18);if(p.kind==='technique'&&strikes.has(p.id))return this.innocentRisk(f,t);if(nature.has(p.id))return this.wisps.some(w=>w.hp>0&&(p.id==='bramble'||p.id==='seedburst'?distance(w,t)<65:segmentDistance(w,f,t)<18));return super.powerUnsafe(f,t,p);}
 powerUtility(f,t,p,copied=false){
  if(p.kind!=='technique'){
   if(f.suppressed>0||this.powerUnsafe(f,t,p))return -1;
   if(!nature.has(p.id))return super.powerUtility(f,t,p,copied);
   if(f.mana<(copied?9:p.cost)||f.weakness==='silenced casting'&&p.voice||this.night&&f.weakness==='loses power at night'||!this.night&&f.weakness==='loses power in daylight'||f.weakness==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return -1;
   if(p.id==='roots'&&(t.flight>0||t.root>.3))return -1;
   if(['bramble','seedburst'].includes(p.id)&&this.zones.some(z=>z.owner===f.side&&z.type===p.id&&z.life>.3))return -1;
   return 50;
  }
  if(copied||f.energy<p.cost+(p.id==='lastStand'?0:12)||this.powerUnsafe(f,t,p))return -1;
  const d=distance(f,t),melee=f.weapon.type==='melee',physicalWeapon=f.weapon.type!=='arcane';
  if((strikes.has(p.id)||['parry','perfectCounter'].includes(p.id))&&f.disarmed>0&&weaponProperties(f.weapon.name).metal)return -1;
  if(strikes.has(p.id)&&f.cooldown>0)return -1;
  switch(p.id){
   case'guard':return !f.guardReady&&this.incomingThreat(f,t,'physical')?70:-1;
   case'parry':return melee&&f.parryTime<=0&&t.action?.type==='melee'&&d<=t.weapon.range+25&&t.action.elapsed<t.action.windup?80:-1;
   case'perfectCounter':return physicalWeapon&&!f.perfectUsed&&this.incomingThreat(f,t,'physical')?85:-1;
   case'secondWind':return !f.secondWindUsed&&f.hp<f.maxHp*.45?100:-1;
   case'lastStand':return !f.lastStandUsed&&f.hp<f.maxHp*.30?110:-1;
   case'charge':return melee&&f.root<=0&&d>f.weapon.range+16&&d<=110&&!this.obstacles.some(o=>segmentDistance(o,f,t)<o.radius+f.radius)?65:-1;
   case'aimedShot':return f.weapon.type==='ranged'&&d<=f.weapon.range+8?55:-1;
   case'cripplingStrike':return physicalWeapon&&t.crippled<=.3&&d<=f.weapon.range+8?55:-1;
   default:return melee&&d<=f.weapon.range+8?55:-1;
  }
 }
 castPower(f,t){
  if(!f.powers.length||f.cast>0||f.action||f.roll>0||f.stagger>0||f.sleep>0||f.amnesia>0)return;
  if(this.time>=f.nextSelection){f.nextSelection=this.time+.20;f.selectedPower=null;let best=-1;for(const p of f.powers){const value=this.powerPriority(f,t,p);if(value>best){best=value;f.selectedPower=p;}}}
  const p=f.selectedPower;if(!p||this.powerPriority(f,t,p)<0)return;
  const choice=p.id==='copy'?this.copyChoice(f,t):null;if(p.id==='copy'&&!choice)return;
  const effective=choice?.power??p,landing=effective.id==='teleport'?this.teleportDestination(f,t):null;if(effective.id==='teleport'&&!landing)return;
  f.selectedPower=null;f.castCount++;f.powerIndex++;
  if(f.weakness==='memory loss'&&f.castCount%3===0){if(p.kind==='technique')f.energy=Math.max(0,f.energy-4);else f.mana=Math.max(0,f.mana-4);f.cast=1.5;this.log(`${f.name} forgets the attempted ability.`);return;}
  f.abilityUseCounts[p.id]=(f.abilityUseCounts[p.id]??0)+1;const technique=p.kind==='technique';if(technique)f.energy-=p.cost;else f.mana-=p.cost;
  f.cast=technique?4.2:(f.weakness==='power has a cooldown'?7:4.2)/(1+f.magic/70);f.powerUsed[p.id]=f.powerUsed[effective.id]=this.time;f.lastCastId=p.id;f.castPayload=choice;f.teleportPlan=landing;
  if(!technique&&f.weakness==='power needs a sacrifice')f.hp-=f.maxHp*.03;
  this.log(`${f.name} used ${p.id==='charge'&&/shield/i.test(f.weapon.name)?'Shield rush':p.name}.`);this.effect(p.sprite,f.x,f.y,36);this.usePower(f,t,p);f.castPayload=f.teleportPlan=null;
 }
 startAttack(f,t){if(f.sleep>0||f.amnesia>0||f.stagger>0||f.roll>0||f.action)return;const count=f.castCount;this.castPower(f,t);if(f.castCount!==count||f.action)return;super.startAttack(f,t);}
 usePower(f,t,p,copied=false){
  if(p.kind==='technique'){
   if(copied)return false;const selfDuration=n=>this.duration(f,null,n);
   switch(p.id){
    case'guard':f.guardTime=selfDuration(1.2);f.guardReady=true;break;
    case'parry':f.parryTime=selfDuration(.65);break;
    case'perfectCounter':f.perfectUsed=true;f.perfectTime=selfDuration(.80);break;
    case'secondWind':f.secondWindUsed=true;f.windRemaining=selfDuration(3);f.windHealing=f.maxHp*.10/3;break;
    case'lastStand':f.lastStandUsed=true;f.lastStandTime=selfDuration(4);break;
    default:{const shot=f.weapon.type==='ranged',windup=p.id==='charge'?.25:shot?.35:p.id==='cleave'?.30:.20;f.action={type:'technique',power:p,angle:shot?this.aim(f,t,290):f.angle,elapsed:0,windup,recovery:p.id==='cleave'?.35:.19,released:false,origin:{x:f.x,y:f.y},travel:0};f.cooldown=f.interval+windup;f.invisible=0;return true;}
   }
   f.action={type:'technique',power:p,elapsed:0,windup:0,recovery:.10,released:true};return true;
  }
  if(!nature.has(p.id)){const rewind=p.id==='rewind'&&f.anchor,result=super.usePower(f,t,p,copied);if(p.id==='flight')f.root=0;if(rewind)f.crippled=f.brambleSlow=0;return result;}
  if(this.powerUnsafe(f,t,p))return false;f.invisible=0;
  if(p.id==='thornBolt'||p.id==='roots'){this.launch(f,t,p);Object.assign(this.projectiles.at(-1),{type:'arcane',damage:f.spell*(p.id==='thornBolt'?.35:.25),payload:p.id,duration:this.duration(f,t,p.id==='thornBolt'?1.5:1.2),radius:4});}
  if(p.id==='bramble')this.zone(f,'bramble',t.x,t.y,45,this.duration(f,t,3),f.spell*.08);
  if(p.id==='seedburst'){this.zone(f,'seedburst',t.x,t.y,40,.70,f.spell*.8);this.zones.at(-1).due=this.time+.70;}
  return true;
 }
 applyImpact(id,f,t,damage,duration){
  if(id==='thornBolt'){t.bleed=duration;t.bleedDamage=f.spell*.04;return;}
  if(id==='roots'){if(t.flight<=0){t.root=duration;t.roll=0;if(t.action?.power?.id==='charge')t.action=null;}return;}
  if(id==='cripplingStrike'){t.crippled=duration;return;}
  return super.applyImpact(id,f,t,damage,duration);
 }
 updateAttack(f,t,dt){
  const action=f.action;if(action?.type!=='technique'){
   const wasReleased=action?.released,weaponAction=action&&['melee','shot'].includes(action.type),boost=weaponAction?(f.lastStandTime>0?1.2:1)*(f.counterTime>0?f.counterScale:1):1,damage=f.damage;f.damage*=boost;
   super.updateAttack(f,t,dt);f.damage=damage;if(weaponAction&&!wasReleased&&action.released&&f.counterTime>0)f.counterTime=0;return;
  }
  const p=action.power;if(f.hp<=0||f.sleep>0||f.amnesia>0||f.stagger>0||strikes.has(p.id)&&f.disarmed>0&&weaponProperties(f.weapon.name).metal){f.action=null;return;}
  action.elapsed+=dt;
  if(!action.released&&action.elapsed>=action.windup){
   action.released=true;const boost=f.lastStandTime>0?1.2:1,mult={drivingStrike:1.1,charge:.65,cleave:1.25,aimedShot:1.25,cripplingStrike:.9}[p.id]??1;
   if(f.weapon.type==='ranged'){
    this.projectiles.push({x:f.x,y:f.y,vx:Math.cos(action.angle)*290,vy:Math.sin(action.angle)*290,owner:f.side,damage:f.damage*mult*boost,type:'physical',sprite:-1,life:2.5,radius:3,tags:weaponProperties(f.weapon.name),technique:true,weaponHit:true,payload:p.id==='cripplingStrike'?p.id:null,duration:this.duration(f,t,2)});
    if(weaponProperties(f.weapon.name).loud)this.emitSound(f,f.x,f.y,190);
   }else{
    const delta=Math.atan2(Math.sin(Math.atan2(t.y-f.y,t.x-f.x)-action.angle),Math.cos(Math.atan2(t.y-f.y,t.x-f.x)-action.angle)),reach=p.id==='charge'?36:f.weapon.range+16;
    if(distance(f,t)<=reach&&Math.abs(delta)<(p.id==='cleave'?1.6:1.05)){
     this.hitContext={tags:weaponProperties(f.weapon.name),technique:true,weaponHit:true,payload:p.id==='cripplingStrike'?p.id:null,duration:this.duration(f,t,2)};const hit=this.hurt(t,f,f.damage*mult*boost,'physical',true);this.hitContext=null;
     if(hit&&p.id==='drivingStrike')this.push(t,f,15);if(hit&&p.id==='charge'){t.action=null;t.stagger=Math.max(t.stagger,.15);if(/shield/i.test(f.weapon.name))this.push(t,f,20);}
    }else this.log(`${f.name}'s ${p.name} misses.`);
   }
  }
  if(action.elapsed>=action.windup+action.recovery)f.action=null;
 }
 moveFighter(f,t,dt){
  if(f.action?.type==='technique'&&f.action.power.id==='charge'&&!f.action.released){
   const a=f.action;if(f.root>0||f.sleep>0||f.stagger>0||f.amnesia>0)return;const remaining=Math.max(0,Math.min(90-a.travel,distance(f,t)-24)),step=Math.min(remaining,360*dt),dx=Math.cos(a.angle),dy=Math.sin(a.angle),point={x:clamp(f.x+dx*step,18,582),y:clamp(f.y+dy*step,18,582)};
   if(!this.obstacles.some(o=>segmentDistance(o,f,point)<o.radius+f.radius)){f.x=point.x;f.y=point.y;a.travel+=step;}else a.elapsed=a.windup;f.angle=a.angle;f.vx=dx*360;f.vy=dy*360;f.actionLabel='Charge';return;
  }
  const move=f.move;if(f.crippled>0)f.move*=.7;else if(f.brambleSlow>0)f.move*=.75;super.moveFighter(f,t,dt);f.move=move;
 }
 hurt(t,f,amount,type='physical',canDodge=true){
  const context=this.hitContext||{},ordinary=!context.technique&&(context.weaponHit||!this.hitContext&&f.weapon.type==='melee'||type==='physical'&&context.sprite===-1),physical=type==='physical',front=Math.abs(Math.atan2(Math.sin(Math.atan2(f.y-t.y,f.x-t.x)-(t.facing??t.angle)),Math.cos(Math.atan2(f.y-t.y,f.x-t.x)-(t.facing??t.angle))))<=Math.PI/2;
  if(t.hp>0&&!t.isDecoy&&ordinary&&physical&&front&&!(t.disarmed>0&&weaponProperties(t.weapon.name).metal)&&(!t.foreseen&&!t.wardHits)&&(t.perfectTime>0||t.parryTime>0&&f.weapon.type==='melee')){
   const perfect=t.perfectTime>0;t.perfectTime=t.parryTime=0;t.counterScale=perfect?1.35:.55;t.counterTime=this.duration(t,null,1.5);t.cooldown=0;this.effect(14,t.x,t.y,30);this.log(`${t.name} ${perfect?'counters':'parries'} the attack.`);return false;
  }
  const guard=t.guardReady&&t.guardTime>0&&physical&&!t.isDecoy,mult=(guard?.7:1)*(t.lastStandTime>0?.65:1),connected=super.hurt(t,f,amount*mult,type,canDodge);if(connected&&guard)t.guardReady=false;return connected;
 }
 environmentStep(dt){
  for(const f of this.fighters){for(const key of timers)f[key]=Math.max(0,f[key]-dt);if(f.guardTime<=0)f.guardReady=false;if(f.windRemaining>0){const period=Math.min(dt,f.windRemaining);this.heal(f,f.windHealing*period);f.windRemaining-=period;}}
  for(const z of this.zones){const f=this.fighters[z.owner],t=this.fighters[1-z.owner];if(!f||f.hp<=0)continue;
   if(z.type==='seedburst'&&this.time+dt>=z.due){if(distance(z,t)<z.radius)this.periodicHit(f,t,z.damage,'arcane');z.life=0;this.effect(8,z.x,z.y,60);}
   if(z.type==='bramble'&&distance(z,t)<z.radius&&t.flight<=0)t.brambleSlow=Math.max(t.brambleSlow,.10);if(z.type==='bramble'&&z.tick+dt>=.5&&distance(z,t)<z.radius)this.periodicHit(f,t,z.damage*.5,'arcane');
  }
  super.environmentStep(dt);
 }
 rebirth(f){const revived=super.rebirth(f);if(revived)f.crippled=f.brambleSlow=0;return revived;}
 result(){return {...super.result(),combatVersion:12};}
}
export function simulate(a,b,seed,options){const battle=new Battle(a,b,seed,options);while(!battle.done)battle.step(1/60);return battle.result();}

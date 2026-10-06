import {Battle as PreviousBattle,random,weaponFor,fighterProfile,combatStyle} from './combat-v12-powers.js';
export {random,weaponFor,fighterProfile,combatStyle};
export {powerFor} from './abilities-v12.js';
export const TIER_LIMITS=[['E',0],['D',350],['C',650],['B',1000],['A',1500],['S',2100],['SS',3000]];
export const tierFor=total=>TIER_LIMITS.reduce((tier,[name,min])=>total>=min?name:tier,'E');
export const REWIND_HEALTH_RECOVERY=.6;
export const REWIND_MANA_RECOVERY=.75;
const harmful=['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul'];
// Production entry points use these fixed release rules. Offline comparisons
// may replace a battle's rules before its first step to measure one change.
export const V11_RULES=Object.freeze({arcaneSpell:.05,arcaneArmor:1,arcaneRange:200,pursuitArcane:1.15,phoenixHealth:.30,dreamDamage:.6,memoryCounterplay:true,memoryDuration:1.8,memoryCost:12,metalImpact:true,beastDamage:.30,alternation:true,teleportUseful:true,teleportFast:true,sizeBuff:true,mindUseful:true,mindBuff:true,absorptionUseful:true,spiritArmorUseful:true,portalExit:true,copyUseful:true});
const attackPowers=new Set(['fire','ice','water','dream','blood','void','custom','storm','crystal','metal','light','telekinesis','sound','death','reality','ember','frostTouch','kinetic','venom','silence','chainLightning','singularity']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
import {weaponProperties} from './abilities-v12.js';
export class Battle extends PreviousBattle{
 constructor(...args){super(...args);this.rules=V11_RULES;this.headless=!!args[3]?.headless;for(const f of this.fighters)Object.assign(f,{nextSelection:0,selectedPower:null,powerUsed:{},lastCastId:null,castPayload:null,teleportPlan:null});}
 log(text){if(!this.headless)super.log(text);}
 effect(...args){if(!this.headless)super.effect(...args);}
 preferredRange(f){return f.weapon.type==='melee'?f.weapon.range*.76:Math.min(f.weapon.range*.83,165+f.tactics*22);}
 threatened(f,t){return Math.hypot(t.x-f.x,t.y-f.y)<t.weapon.range+35||this.projectiles.some(p=>p.owner!==f.side&&Math.hypot(p.x-f.x,p.y-f.y)<130);}
 usefulPortal(f,t){const desired=this.preferredRange(f),exit=f.gates[1],current=Math.hypot(t.x-f.x,t.y-f.y),next=Math.hypot(t.x-exit.x,t.y-exit.y);return Math.abs(current-desired)-Math.abs(next-desired)>=25||this.threatened(f,t)&&next>current+25;}
 // Relative motion rejects receding or off-course shots; evaluate candidate
 // landing points without advancing the combat random sequence.
 incomingThreat(f,t,kind='any',x=f.x,y=f.y){
  const accepts=(physical,magical)=>kind==='any'||kind==='physical'&&physical||kind==='magical'&&magical;
  for(const p of this.projectiles){
   if(p.owner===f.side||!accepts(p.type==='physical',p.type!=='physical'||!!p.tags?.holy))continue;
   const vx=p.vx-(f.vx||0),vy=p.vy-(f.vy||0),dx=x-p.x,dy=y-p.y,speed2=vx*vx+vy*vy;
   if(!speed2)continue;const arrival=(dx*vx+dy*vy)/speed2;
   if(arrival<0||arrival>.75||p.life!==undefined&&arrival>p.life)continue;
   if(Math.hypot(dx-vx*arrival,dy-vy*arrival)<=f.radius+p.radius+3)return true;
  }
  if(t.hp<=0||t.sleep>0||t.amnesia>0||t.stagger>0||t.roll>0)return false;
  const a=t.action,distance=Math.hypot(x-t.x,y-t.y);
  if(a?.type==='cast')return (kind==='any'||accepts(false,a.power.id!=='memory'))&&a.elapsed<a.windup&&distance<=(a.power.id==='storm'?300:220);
  if(a?.released)return false;
  const melee=t.weapon.type==='melee',delay=a?Math.max(0,a.windup-a.elapsed):Math.max(0,t.cooldown)+(melee?.23:.22),physical=melee||t.weapon.type==='ranged',magical=t.weapon.type==='arcane'||!!weaponProperties(t.weapon.name).holy;
  if(!accepts(physical,magical)||t.disarmed>0&&weaponProperties(t.weapon.name).metal||t.weapon.type==='arcane'&&(t.suppressed>0||t.weakness==='silenced casting'))return false;
  return melee?delay<=.75&&distance<=t.weapon.range+16:delay+distance/290<=.75&&distance<=t.weapon.range+8;
 }
 teleportDestination(f,t){
  const rng=random((this.seed^Math.imul(f.castCount+1,104729)^Math.imul(f.side+1,7919))>>>0),radius=f.weapon.type==='melee'?40:150,desired=this.preferredRange(f),currentError=Math.abs(Math.hypot(t.x-f.x,t.y-f.y)-desired),threat=this.incomingThreat(f,t);
  let best=null,bestScore=Infinity;
  for(let n=0;n<4;n++){const angle=rng()*Math.PI*2,x=clamp(t.x+Math.cos(angle)*radius,18,582),y=clamp(t.y+Math.sin(angle)*radius,18,582),error=Math.abs(Math.hypot(t.x-x,t.y-y)-desired);
   if(!threat&&currentError-error<25)continue;
   const score=error+(this.incomingThreat(f,t,'any',x,y)?200:0);if(score<bestScore){bestScore=score;best={x,y};}
  }return best;
 }
 copyChoice(f,t){
  const available=t.powers.filter(p=>p.id!=='copy');let best=null,score=-1;
  for(const p of available){const value=this.powerUtility(f,t,p,true);if(value>score){score=value;best={power:p,priority:value};}}
  if(best)return best;
  if(!available.length&&Math.hypot(t.x-f.x,t.y-f.y)<=t.weapon.range+16&&!this.innocentRisk({...f,weapon:t.weapon},t))return {weapon:true,priority:50};
  return null;
 }
 powerUnsafe(f,t,p){
  if(f.weakness!=='cannot harm the innocent'||!attackPowers.has(p.id))return false;
  if(['light','silence','storm'].includes(p.id))return this.innocentRisk(f,t);
  if(['ember','frostTouch','kinetic','venom','chainLightning','singularity'].includes(p.id))return this.wisps.some(w=>w.hp>0&&(Math.hypot(w.x-t.x,w.y-t.y)<115||Math.hypot(w.x-f.x,w.y-f.y)<60));
  const dx=t.x-f.x,dy=t.y-f.y;
  return this.wisps.some(w=>{if(w.hp<=0)return false;const along=clamp(((w.x-f.x)*dx+(w.y-f.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(w.x-f.x-dx*along,w.y-f.y-dy*along)<18;});
 }
 connectControl(f,t){
  if(t.hp<=0)return false;
  if(t.foreseen>0){t.foreseen--;this.log(`${t.name} avoids the effect with Future sight.`);return false;}
  if(t.wardHits>0){t.wardHits--;if(!t.wardHits)t.shield=0;this.effect(14,t.x,t.y,35);this.log(`${t.name}'s ward blocks the effect.`);return false;}
  if(this.rng()>Math.max(.35,f.accuracy-t.dodge-(t.evade>0?.2:0))){this.log(`${t.name} dodged.`);return false;}return true;
 }
 applyImpact(id,f,t,damage,duration){
  if(id==='metal'&&this.rules.metalImpact){if(weaponProperties(t.weapon.name).metal){t.disarmed=duration;t.action=null;this.log(`${t.name}'s metal weapon is disarmed.`);}return;}
  return super.applyImpact(id,f,t,damage,duration);
 }
 periodicHit(f,t,amount,type){this.hitContext={periodic:true};const hit=this.hurt(t,f,amount,type,false);this.hitContext=null;return hit;}
 powerCost(p){return p.id==='memory'?this.rules.memoryCost:['light','future'].includes(p.id)?12:['ember','frostTouch','kinetic','venom','silence','mirror','chainLightning','phoenix','rewind','singularity'].includes(p.id)?p.rarity==='Legendary'?25:p.rarity==='Rare'?15:9:9;}
 powerUtility(f,t,p,copied=false){
  const distance=Math.hypot(t.x-f.x,t.y-f.y),threat=this.threatened(f,t),weak=f.weakness;
  if(f.mana<(copied?9:this.powerCost(p))||weak==='silenced casting'&&p.voice||this.night&&weak==='loses power at night'||!this.night&&weak==='loses power in daylight'||weak==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return -1;
  if(copied&&(p.id==='frostTouch'&&distance>=75||p.id==='kinetic'&&distance>=90))return -1;
  if(copied&&this.powerUnsafe(f,t,p))return -1;
  if(p.id==='copy'&&this.rules.copyUseful)return this.copyChoice(f,t)?.priority??-1;
  if(p.id==='teleport'&&this.rules.teleportUseful)return this.teleportDestination(f,t)?50:-1;
  const reach={...(this.rules.memoryCounterplay?{memory:220}:{}),light:220,silence:220,storm:300,chainLightning:450,frostTouch:75,kinetic:90};if(reach[p.id]!==undefined&&distance>reach[p.id])return -1;
  if(p.id==='healing')return f.hp<=f.maxHp*.75||['burn','poison','bleed'].some(k=>f[k]>.5)?100+(1-f.hp/f.maxHp)*20:-1;
  if(p.id==='regeneration')return f.hp<=f.maxHp*.85&&f.regeneration<=.5?75:-1;
  if(p.id==='phoenix')return !f.phoenixSpent&&!f.phoenixArmed?80:-1;
  if(p.id==='future'&&this.time-(f.powerUsed.future??-Infinity)<5)return -1;
  if(p.id==='absorption'&&this.rules.absorptionUseful)return f.absorption<=.5&&this.incomingThreat(f,t,'magical')?70:-1;
  if(p.id==='spiritArmor'&&this.rules.spiritArmorUseful)return f.spiritArmor<=.5&&this.incomingThreat(f,t,'physical')?70:-1;
  const defense={force:['wardTime','wardHits'],future:['futureTime','foreseen'],mirror:['mirrorTime','mirrorHits'],spiritArmor:['spiritArmor'],absorption:['absorption'],flight:['flight'],invisible:['invisible'],illusion:['illusionTime'],size:['sizeTime']};
  if(defense[p.id]){const [timer,charges]=defense[p.id];return f[timer]<=.5||charges&&f[charges]===0&&threat?threat?70:35:-1;}
  if(p.id==='mind')return f.insight<=.5&&(t.invisible>0||t.illusionTime>0||(this.rules.mindUseful?this.incomingThreat(f,t):this.projectiles.some(x=>x.owner!==f.side)))?65:-1;
  if(p.id==='shapeshift')return f.shape<=.5&&(f.weapon.type==='melee'?distance<=90:distance<=60&&(f.rollCooldown>0||f.energy<18))?60:-1;
  if(p.id==='portal')return f.portalTime<=.5?40:-1;
  if(p.id==='life')return (f.hp<=f.maxHp*.85||f.nutrition<60)&&!this.zones.some(z=>z.owner===f.side&&z.type==='life'&&z.life>.5)?70:-1;
  if(p.id==='gravity'&&this.zones.some(z=>z.owner===f.side&&z.type==='gravity'&&z.life>.5&&Math.hypot(t.x-z.x,t.y-z.y)<z.radius))return -1;
  if(['beast','spirits'].includes(p.id)&&this.summons.some(s=>s.owner===f.side&&s.type===(p.id==='beast'?'beast':'spirit')&&s.life>.5))return -1;
  if(p.id==='rewind'&&f.anchor){const a=f.anchor;return Math.max(0,a.hp-f.hp)*REWIND_HEALTH_RECOVERY>=f.maxHp*.08||Math.max(0,a.mana-f.mana)*REWIND_MANA_RECOVERY>=f.maxMana*.20||harmful.some(k=>f[k]>.5)||threat&&Math.hypot(t.x-a.x,t.y-a.y)>distance+50?95:-1;}
  const control={time:'chrono',memory:'amnesia',soul:'soul',shadow:'invisible'};if(control[p.id]&&(p.id==='shadow'?f:t)[control[p.id]]>.5)return -1;
  return p.id==='rewind'?45:50;
 }
 powerPriority(f,t,p){const utility=this.powerUtility(f,t,p);return utility<0?-1:utility-(this.rules.alternation&&f.lastCastId===p.id?30:0);}
 castPower(f,t){
  if(!f.powers.length||f.cast>0||f.action||f.roll>0||f.stagger>0||f.sleep>0||f.amnesia>0||f.suppressed>0)return;
  if(this.time>=f.nextSelection){f.nextSelection=this.time+.20;f.selectedPower=null;let best=-1;for(const p of f.powers){const priority=this.powerPriority(f,t,p);if(priority>best){best=priority;f.selectedPower=p;}}}
  const p=f.selectedPower;if(!p||this.powerPriority(f,t,p)<0)return;
  const choice=p.id==='copy'&&this.rules.copyUseful?this.copyChoice(f,t):null;
  if(p.id==='copy'&&this.rules.copyUseful&&!choice)return;
  const effective=choice?.power??p,landing=effective.id==='teleport'&&this.rules.teleportUseful?this.teleportDestination(f,t):null;
  if(effective.id==='teleport'&&this.rules.teleportUseful&&!landing)return;
  f.selectedPower=null;f.castCount++;f.powerIndex++;
  if(f.weakness==='memory loss'&&f.castCount%3===0){f.mana-=4;f.cast=1.5;this.log(`${f.name} forgets the attempted power.`);return;}
  const cost=this.powerCost(p);f.mana-=9;f.cast=(f.weakness==='power has a cooldown'?7:4.2)/(1+f.magic/70);f.powerUsed[p.id]=f.powerUsed[effective.id]=this.time;f.lastCastId=p.id;f.castPayload=choice;f.teleportPlan=landing;
  if(f.weakness==='power needs a sacrifice')f.hp-=f.maxHp*.03;
  this.log(`${f.name} used ${p.name}.`);this.effect(p.sprite,f.x,f.y,36);this.usePower(f,t,p);f.mana=Math.max(0,f.mana-(cost-9));f.castPayload=f.teleportPlan=null;
 }
 moveFighter(f,t,dt){super.moveFighter(f,t,dt);if(f.action?.type==='cast')f.actionLabel='Casting '+f.action.power.name;}
 updateAttack(f,t,dt){
  const a=f.action;if(a?.type!=='cast')return super.updateAttack(f,t,dt);
  if(f.hp<=0||f.sleep>0||f.amnesia>0||f.suppressed>0||f.stagger>0){f.action=null;return;}
  a.elapsed+=dt;if(a.elapsed<a.windup)return;f.action=null;
  const p=a.power,reach=p.id==='storm'?300:220;if(Math.hypot(t.x-f.x,t.y-f.y)>reach){this.log(`${p.name} dissipates beyond its reach.`);return;}
  if(p.id==='memory'){if(this.connectControl(f,t)){t.amnesia=this.duration(f,t,this.rules.memoryDuration)*(t.weakness==='memory loss'?1.5:1);t.action=null;t.insight=t.mindTime=0;}return;}
  this.hitContext={tags:p.id==='light'?{holy:true,sunlight:true}:{},payload:p.id==='silence'?'void':null,duration:this.duration(f,t,1.8)};
  const connected=this.hurt(t,f,f.spell*(p.id==='light'?.70:p.id==='silence'?.40:.95),p.id==='light'?'holy':p.id==='silence'?'void':'lightning',true);this.hitContext=null;
  if(connected){if(p.id==='light'){t.invisible=t.illusionTime=0;t.blind=this.duration(f,t,1.5);}if(p.id==='silence')t.action=null;}
  if(p.id==='storm'){this.effect(2,t.x,t.y,40);this.emitSound(f,t.x,t.y,260);}
 }
 usePower(f,t,p,copied=false){
  if(p.id==='copy'&&this.rules.copyUseful){const choice=f.castPayload??this.copyChoice(f,t);if(!choice)return false;if(choice.weapon){this.hit(f,t,t.damage*.85,'physical',null,weaponProperties(t.weapon.name));return true;}this.log(`${f.name} copies ${choice.power.name}.`);return this.usePower(f,t,choice.power,true);}
  if(p.id==='teleport'&&this.rules.teleportUseful){const landing=f.teleportPlan??this.teleportDestination(f,t);if(!landing)return false;f.x=landing.x;f.y=landing.y;f.evade=.5;if(this.rules.teleportFast)f.cast*=.5;this.effect(15,f.x,f.y,30);return true;}
  if(p.id==='size'&&this.rules.sizeBuff){f.sizeSmall=f.weapon.type!=='melee';f.sizeTime=this.duration(f,null,8);return true;}
  if(p.id==='mind'){super.usePower(f,t,p,copied);if(this.rules.mindBuff)f.mindTime=this.duration(f,null,4);return true;}
  if(p.id==='metal'&&this.rules.metalImpact){if(this.powerUnsafe(f,t,p))return false;f.invisible=0;this.launch(f,t,p);this.projectiles.at(-1).duration=this.duration(f,t,3);return true;}

  if(['light','silence','storm'].includes(p.id)||p.id==='memory'&&this.rules.memoryCounterplay){
   if(p.voice&&f.weakness==='silenced casting')return;
   if(Math.hypot(t.x-f.x,t.y-f.y)>(p.id==='storm'?300:220))return;
   if(p.id!=='memory'&&this.innocentRisk(f,t)){this.warn(f,'innocent-power',`${f.name} withholds ${p.name} to protect a neutral wisp.`);return;}
   if(p.id!=='memory')f.invisible=0;f.action={type:'cast',power:p,angle:this.aim(f,t,290),elapsed:0,windup:['silence','memory'].includes(p.id)?.20:.25,recovery:0,released:false};return;
  }
  if(p.id==='future'){f.foreseen=2;f.futureTime=this.duration(f,null,2.5);f.insight=f.futureTime*.5;f.powerUsed.future=this.time;return;}
  if(p.id==='phoenix'&&(f.phoenixSpent||f.phoenixArmed))return;
  if(p.id!=='rewind'||!f.anchor)return super.usePower(f,t,p,copied);
  const anchor=f.anchor;
  this.heal(f,Math.max(0,anchor.hp-f.hp)*REWIND_HEALTH_RECOVERY);
  f.mana+=Math.max(0,anchor.mana-f.mana)*REWIND_MANA_RECOVERY;
  f.x=anchor.x;f.y=anchor.y;
  for(const key of harmful)f[key]=0;
  f.anchor=null;f.action=null;
  this.effect(15,f.x,f.y,34);
  this.log(`${f.name} rewinds to the anchored moment.`);
 }
 result(){return {...super.result(),combatVersion:11};}
}
export function simulate(a,b,seed,options){const battle=new Battle(a,b,seed,options);while(!battle.done)battle.step(1/60);return battle.result();}

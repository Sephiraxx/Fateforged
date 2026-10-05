import {Battle as PreviousBattle,random,weaponFor,fighterProfile,combatStyle} from './combat-v10-powers.js';
export {random,weaponFor,fighterProfile,combatStyle};
export {powerFor} from './abilities.js';
export const TIER_LIMITS=[['E',0],['D',350],['C',650],['B',1000],['A',1500],['S',2100],['SS',3000]];
export const tierFor=total=>TIER_LIMITS.reduce((tier,[name,min])=>total>=min?name:tier,'E');
export const REWIND_HEALTH_RECOVERY=.6;
export const REWIND_MANA_RECOVERY=.75;
const harmful=['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul'];
export class Battle extends PreviousBattle{
 constructor(...args){super(...args);this.headless=!!args[3]?.headless;for(const f of this.fighters)Object.assign(f,{nextSelection:0,selectedPower:null,powerUsed:{}});}
 log(text){if(!this.headless)super.log(text);}
 effect(...args){if(!this.headless)super.effect(...args);}
 preferredRange(f){return f.weapon.type==='melee'?f.weapon.range*.76:Math.min(f.weapon.range*.83,165+f.tactics*22);}
 threatened(f,t){return Math.hypot(t.x-f.x,t.y-f.y)<t.weapon.range+35||this.projectiles.some(p=>p.owner!==f.side&&Math.hypot(p.x-f.x,p.y-f.y)<130);}
 usefulPortal(f,t){const desired=this.preferredRange(f),exit=f.gates[1],current=Math.hypot(t.x-f.x,t.y-f.y),next=Math.hypot(t.x-exit.x,t.y-exit.y);return Math.abs(current-desired)-Math.abs(next-desired)>=25||this.threatened(f,t)&&next>current+25;}
 periodicHit(f,t,amount,type){this.hitContext={periodic:true};const hit=this.hurt(t,f,amount,type,false);this.hitContext=null;return hit;}
 powerCost(p){return ['light','future'].includes(p.id)?12:p.rarity==='Legendary'?25:p.rarity==='Rare'?15:9;}
 powerPriority(f,t,p){
  const distance=Math.hypot(t.x-f.x,t.y-f.y),threat=this.threatened(f,t),weak=f.weakness;
  if(f.mana<this.powerCost(p)||weak==='silenced casting'&&p.voice||this.night&&weak==='loses power at night'||!this.night&&weak==='loses power in daylight'||weak==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return -1;
  const reach={light:220,silence:220,storm:300,chainLightning:450,frostTouch:75,kinetic:90};if(reach[p.id]!==undefined&&distance>reach[p.id])return -1;
  if(p.id==='healing')return f.hp<=f.maxHp*.75||['burn','poison','bleed'].some(k=>f[k]>.5)?100+(1-f.hp/f.maxHp)*20:-1;
  if(p.id==='regeneration')return f.hp<=f.maxHp*.85&&f.regeneration<=.5?75:-1;
  if(p.id==='phoenix')return !f.phoenixSpent&&!f.phoenixArmed?80:-1;
  if(p.id==='future'&&this.time-(f.powerUsed.future??-Infinity)<5)return -1;
  const defense={force:['wardTime','wardHits'],future:['futureTime','foreseen'],mirror:['mirrorTime','mirrorHits'],spiritArmor:['spiritArmor'],absorption:['absorption'],flight:['flight'],invisible:['invisible'],illusion:['illusionTime'],size:['sizeTime']};
  if(defense[p.id]){const [timer,charges]=defense[p.id];return f[timer]<=.5||charges&&f[charges]===0&&threat?threat?70:35:-1;}
  if(p.id==='mind')return f.insight<=.5&&(t.invisible>0||t.illusionTime>0||this.projectiles.some(x=>x.owner!==f.side))?65:-1;
  if(p.id==='shapeshift')return f.shape<=.5&&(f.weapon.type==='melee'?distance<=90:distance<=60&&(f.rollCooldown>0||f.energy<18))?60:-1;
  if(p.id==='portal')return f.portalTime<=.5?40:-1;
  if(p.id==='rewind'&&f.anchor){const a=f.anchor;return Math.max(0,a.hp-f.hp)*REWIND_HEALTH_RECOVERY>=f.maxHp*.08||Math.max(0,a.mana-f.mana)*REWIND_MANA_RECOVERY>=f.maxMana*.20||harmful.some(k=>f[k]>.5)||threat&&Math.hypot(t.x-a.x,t.y-a.y)>distance+50?95:-1;}
  const control={time:'chrono',memory:'amnesia',soul:'soul',shadow:'invisible'};if(control[p.id]&&(p.id==='shadow'?f:t)[control[p.id]]>.5)return -1;
  return p.id==='rewind'?45:50;
 }
 castPower(f,t){
  if(!f.powers.length||f.cast>0||f.action||f.roll>0||f.stagger>0||f.sleep>0||f.amnesia>0||f.suppressed>0)return;
  if(this.time>=f.nextSelection){f.nextSelection=this.time+.20;f.selectedPower=null;let best=-1;for(const p of f.powers){const priority=this.powerPriority(f,t,p);if(priority>best){best=priority;f.selectedPower=p;}}}
  const p=f.selectedPower;if(!p||this.powerPriority(f,t,p)<0)return;
  f.selectedPower=null;f.castCount++;f.powerIndex++;
  if(f.weakness==='memory loss'&&f.castCount%3===0){f.mana-=4;f.cast=1.5;this.log(`${f.name} forgets the attempted power.`);return;}
  f.mana-=this.powerCost(p);f.cast=(f.weakness==='power has a cooldown'?7:4.2)/(1+f.magic/70);f.powerUsed[p.id]=this.time;
  if(f.weakness==='power needs a sacrifice')f.hp-=f.maxHp*.03;
  this.log(`${f.name} used ${p.name}.`);this.effect(p.sprite,f.x,f.y,36);this.usePower(f,t,p);
 }
 moveFighter(f,t,dt){super.moveFighter(f,t,dt);if(f.action?.type==='cast')f.actionLabel='Casting '+f.action.power.name;}
 updateAttack(f,t,dt){
  const a=f.action;if(a?.type!=='cast')return super.updateAttack(f,t,dt);
  if(f.hp<=0||f.sleep>0||f.amnesia>0||f.suppressed>0||f.stagger>0){f.action=null;return;}
  a.elapsed+=dt;if(a.elapsed<a.windup)return;f.action=null;
  const p=a.power,reach=p.id==='storm'?300:220;if(Math.hypot(t.x-f.x,t.y-f.y)>reach){this.log(`${p.name} dissipates beyond its reach.`);return;}
  this.hitContext={tags:p.id==='light'?{holy:true,sunlight:true}:{},payload:p.id==='silence'?'void':null,duration:this.duration(f,t,1.8)};
  const connected=this.hurt(t,f,f.spell*(p.id==='light'?.70:p.id==='silence'?.40:.95),p.id==='light'?'holy':p.id==='silence'?'void':'lightning',true);this.hitContext=null;
  if(connected){if(p.id==='light'){t.invisible=t.illusionTime=0;t.blind=this.duration(f,t,1.5);}if(p.id==='silence')t.action=null;}
  if(p.id==='storm'){this.effect(2,t.x,t.y,40);this.emitSound(f,t.x,t.y,260);}
 }
 usePower(f,t,p,copied=false){
  if(['light','silence','storm'].includes(p.id)){
   if(p.voice&&f.weakness==='silenced casting')return;
   if(Math.hypot(t.x-f.x,t.y-f.y)>(p.id==='storm'?300:220))return;
   if(this.innocentRisk(f,t)){this.warn(f,'innocent-power',`${f.name} withholds ${p.name} to protect a neutral wisp.`);return;}
   f.invisible=0;f.action={type:'cast',power:p,angle:this.aim(f,t,290),elapsed:0,windup:p.id==='silence'?.20:.25,recovery:0,released:false};return;
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
 result(){return {...super.result(),combatVersion:10};}
}
export function simulate(a,b,seed,options){const battle=new Battle(a,b,seed,options);while(!battle.done)battle.step(1/60);return battle.result();}

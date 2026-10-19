// Team abilities built from effect primitives (the abilities are data in
// team-abilities.js). They use the ordinary power slots, selection and resources: castPower picks and pays for them,
// usePower starts a short cast ('castAbility'), and updateAttack resolves it after the windup, re-checking the targets
// (an interrupted or lost cast is refunded, like support abilities).
// Timed effects live in each fighter's `statuses`: stat changes (damage dealt and taken, attack and move speed,
// accuracy, healing received), damage over time and soul links. Stat changes stack multiplicatively.
import {CAST_ABILITIES} from './team-abilities.js';
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mod=(f,key)=>{let n=1;for(const s of f?.statuses??[])if(s[key])n*=1+s[key];return n;};
const isBuff=s=>s.dmgOut>0||s.atk>0||s.move>0||s.acc>0||s.healIn>0||s.dmgIn<0;
// How much a fighter wants each kind of ability when it has targets (powerUtility).
const UTILITY={hit:62,control:66,ally:58,debuff:60};

export function withCastAbilities(Base){
 return class CastAbilityBattle extends Base{
  constructor(...args){super(...args);for(const f of this.combatants??this.fighters)f.statuses=[];}
  castActors(){return this.combatants??this.fighters;}
  castAllies(f){return this.castActors().filter(a=>!a.isObjective&&a.team===f.team&&a.hp>0);}
  castEnemies(f){return this.castActors().filter(a=>!a.isObjective&&a.team!==f.team&&a.hp>0);}
  inFight(f,reach=320){return this.castEnemies(f).some(e=>d(e,f)<=reach);}
  // Who an ability would affect right now ([] = it can't be used).
  castTargets(f,p,t){
   if(p.target==='self')return this.inFight(f,p.range)?[f]:[];
   if(p.target==='allies')return this.inFight(f)?this.castAllies(f).filter(a=>d(a,f)<=p.range):[];
   if(p.target==='enemies')return this.castEnemies(f).filter(e=>d(e,f)<=p.range);
   if(p.target==='ally'){
    const allies=this.castAllies(f).filter(a=>d(a,f)<=p.range&&this.clearShot(f,a));
    if(p.pick==='damage')return allies.filter(a=>a!==f&&this.inFight(a,a.weapon.range+60)).sort((a,b)=>b.damage-a.damage||a.index-b.index).slice(0,1);
    return allies.filter(a=>a.wardTime<=.5&&this.underFire(a)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.index-b.index).slice(0,1);
   }
   if(!t||t.isObjective||t.hp<=0||t.team===f.team||d(f,t)>p.range||!this.clearShot(f,t))return [];
   if(p.effects.some(e=>e.control)&&t.ccImmune>0)return [];
   if(p.id==='soulLink'&&!this.castActors().some(a=>a!==t&&!a.isObjective&&a.team===t.team&&a.hp>0&&d(a,t)<=200))return [];
   if(p.id==='dispel'&&!(t.statuses?.some(isBuff)||t.wardTime>0))return [];
   return [t];
  }
  castUtility(f,t,p){
   const e=p.effects;
   if(p.id==='execute')return t.hp<t.maxHp*.35?85:40;
   if(p.id==='backstab')return f.invisible>0||t.target!==f.index?75:55;
   if(e.some(x=>x.control))return UTILITY.control;
   if(e.some(x=>x.hit||x.dot))return UTILITY.hit;
   return p.target==='enemy'||p.target==='enemies'?UTILITY.debuff:UTILITY.ally;
  }
  powerUtility(f,t,p,copied=false){
   if(!CAST_ABILITIES[p.id])return super.powerUtility(f,t,p,copied);
   if(copied||this.time-(f.powerUsed[p.id]??-Infinity)<p.cooldown)return -1;
   if(p.kind==='technique'){if(f.energy<p.cost+12||p.weapon&&(f.weapon.type!==p.weapon||f.disarmed>0))return -1;}
   else if(f.mana<p.cost||f.suppressed>0||p.voice&&f.weakness==='silenced casting'||this.night&&f.weakness==='loses power at night'||!this.night&&f.weakness==='loses power in daylight'||f.weakness==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return -1;
   return this.castTargets(f,p,t).length?this.castUtility(f,t,p):-1;
  }
  usePower(f,t,p,copied=false){
   if(!CAST_ABILITIES[p.id])return super.usePower(f,t,p,copied);
   const targets=this.castTargets(f,p,t);if(!targets.length)return false;
   f.action={type:'castAbility',power:p,targets:targets.map(a=>a.side),elapsed:0,windup:p.windup,cost:p.cost};
   f.actionLabel=p.name;return true;
  }
  updateAttack(f,t,dt){
   const a=f.action;if(a?.type!=='castAbility')return super.updateAttack(f,t,dt);
   const p=a.power,spell=p.kind==='spell';
   if(f.hp<=0||f.sleep>0||f.amnesia>0||spell&&f.suppressed>0||!spell&&p.weapon&&f.disarmed>0||f.stagger>0||f.roll>0){f.action=null;return;}
   a.elapsed+=dt;f.actionLabel=p.name;if(a.elapsed<a.windup)return;f.action=null;
   const first=this.castActors().find(x=>x.side===a.targets[0]),area=p.target==='allies'||p.target==='enemies';
   const legal=this.castTargets(f,p,area?t:first);
   if(area?!legal.length:!first||legal[0]!==first){
    if(spell)f.mana=Math.min(f.maxMana,f.mana+a.cost);else f.energy=Math.min(f.maxEnergy,f.energy+a.cost);
    delete f.powerUsed[p.id];f.cast=Math.min(f.cast,.2);return;
   }
   this.applyCast(f,p,legal);
  }
  addStatus(t,s){t.statuses.push({id:s.id,src:s.src,until:this.time+s.for,dmgOut:s.dmgOut??0,dmgIn:s.dmgIn??0,atk:s.atk??0,move:s.move??0,acc:s.acc??0,healIn:s.healIn??0,link:s.link??0,dot:s.dot??0,type:s.type??'arcane',selfHeal:s.selfHeal??0,tick:0});}
  applyCast(f,p,targets){
   const first=targets[0];let dealt=0,type='physical';
   for(const e of p.effects){
    if(e.hit){
     let amount=(e.hit.base==='spell'?f.spell:f.damage)*e.hit.mult;
     if(e.hit.ambush&&(f.invisible>0||first.target!==f.index))amount*=e.hit.ambush;
     if(e.hit.execute&&first.hp<first.maxHp*e.hit.execute.below)amount*=e.hit.execute.mult;
     f.invisible=0;dealt=amount;type=e.hit.type;this.hit(f,first,amount,type,null);
    }
    if(e.bounce){
     const done=[first];let from=first;
     for(let i=0;i<e.bounce.count;i++){
      const next=this.castEnemies(f).filter(x=>!done.includes(x)&&d(x,from)<=e.bounce.radius).sort((a,b)=>d(a,from)-d(b,from)||a.index-b.index)[0];if(!next)break;
      this.hit(f,next,dealt*e.bounce.mult,type,null);done.push(next);from=next;
     }
    }
    if(e.dot)this.addStatus(first,{id:p.id,src:f.index,for:e.dot.for,dot:(e.dot.base==='spell'?f.spell:f.damage)*e.dot.per,type:e.dot.type,selfHeal:e.dot.selfHeal});
    if(e.status){
     const s=e.status,on=s.on==='self'?[f]:s.on==='allies'?this.castAllies(f).filter(a=>d(a,f)<=s.radius):s.on==='enemies'?this.castEnemies(f).filter(x=>d(x,f)<=s.radius):s.on==='around'?this.castEnemies(f).filter(x=>d(x,first)<=s.radius):[first];
     for(const x of on)this.addStatus(x,{...s,id:p.id,src:f.index});
    }
    if(e.control&&first.hp>0&&this.kitControl(f,first,'stunBolt',this.duration(f,first,e.control.for))&&e.control.pull){
     const angle=Math.atan2(f.y-first.y,f.x-first.x);first.x=this.clampX(first.x+Math.cos(angle)*e.control.pull);first.y=this.clampY(first.y+Math.sin(angle)*e.control.pull);this.pushOutOfTerrain(first);
    }
    if(e.ward){first.wardHits=Math.max(first.wardHits,e.ward.hits);first.wardTime=Math.max(first.wardTime,e.ward.for);}
    if(e.blink==='behind'){
     const angle=Math.atan2(first.y-f.y,first.x-f.x),gap=first.radius+f.radius+4;
     f.x=this.clampX(first.x+Math.cos(angle)*gap);f.y=this.clampY(first.y+Math.sin(angle)*gap);this.pushOutOfTerrain(f);f.angle=Math.atan2(first.y-f.y,first.x-f.x);
    }
    if(e.evade)f.evade=Math.max(f.evade,e.evade);
    if(e.dispel){first.statuses=first.statuses.filter(s=>!isBuff(s));first.wardHits=0;first.wardTime=0;}
   }
   this.effect(p.sprite,first.x,first.y,30);
  }
  // Statuses run out, damage over time ticks every half second, and stat changes apply on top of the upkeep's values.
  upkeep(f,dt){
   super.upkeep(f,dt);
   if(!f.statuses?.length)return;
   f.statuses=f.statuses.filter(s=>s.until>this.time);
   for(const s of f.statuses){
    if(!(s.dot>0))continue;s.tick+=dt;if(s.tick<.5)continue;
    const period=s.tick,src=this.castActors()[s.src]??f,before=f.hp;s.tick=0;
    this.periodicHit(src,f,s.dot*period,s.type);
    if(s.selfHeal>0&&src.hp>0&&f.hp<before){this.healSource=src;this.heal(src,(before-f.hp)*s.selfHeal);this.healSource=null;}
   }
   f.move*=mod(f,'move');f.interval/=mod(f,'atk');f.accuracy*=mod(f,'acc');
  }
  hurt(t,f,amount,type='physical',...rest){
   const fighters=f&&t&&f!==t&&!f.isObjective&&!t.isObjective&&f.team!==t.team;
   if(fighters)amount*=mod(f,'dmgOut')*mod(t,'dmgIn');
   const before=t?.hp,result=super.hurt(t,f,amount,type,...rest);
   const link=fighters?t.statuses?.find(s=>s.link>0):null;
   if(link&&t.hp<before){
    const partner=this.castActors().filter(a=>a!==t&&!a.isObjective&&a.team===t.team&&a.hp>0&&d(a,t)<=200&&!a.statuses?.some(s=>s.link>0)).sort((a,b)=>d(a,t)-d(b,t)||a.index-b.index)[0];
    if(partner)super.hurt(partner,f,(before-t.hp)*link.link,type,false);
   }
   return result;
  }
  heal(f,amount){return super.heal(f,amount*mod(f,'healIn'));}
  respawn(f){super.respawn(f);f.statuses=[];}
 };
}

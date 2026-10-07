import {powerFor,SUPPORT_ABILITIES} from './abilities-v13.js';
const byId=Object.fromEntries(Object.values(SUPPORT_ABILITIES).map(p=>[p.id,p]));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const harmful=['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul','crippled','brambleSlow','tauntTime','kitStun'];
const immunity=2.5;
// These abilities occupy power/power2 and participate in the existing selector,
// shared casting action and resource rules. There is no third ability slot.
export function withSupportAbilities(Base,version){return class extends Base{
 constructor(...args){
  const characters=Array.isArray(args[0])?args[0].flat():args.slice(0,2);
  const clean=c=>({...c,teamKit:null});
  const inputs=Array.isArray(args[0])?[args[0].map(team=>team.map(clean)),...args.slice(1)]:[...args.slice(0,2).map(clean),...args.slice(2)];
  super(...inputs);
  for(const [i,f]of (this.combatants??this.fighters).entries()){
   f.powers=[characters[i].traits?.power??characters[i].state?.traits?.power,characters[i].traits?.power2??characters[i].state?.traits?.power2].map(name=>powerFor(name,characters[i])).filter(Boolean);
   f.teamKit=null;f.supportReviveSpent=false;f.supportRevived=false;
   f.ccImmune??=0;f.kitStun??=0;f.tauntTime??=0;f.ccSeconds??=0;f.healingDone??=0;
  }
 }
 supportAllies(f,down=false){return (this.combatants??this.fighters).filter(a=>!a.isObjective&&(this.mode==='team'?a.team===f.team:a===f)&&(down?a.hp<=0:a.hp>0));}
 supportEnemies(f){return (this.combatants??this.fighters).filter(a=>!a.isObjective&&a.hp>0&&(this.mode==='team'?a.team!==f.team:a!==f));}
 supportLine(f,t){return typeof this.clearShot==='function'?this.clearShot(f,t):!this.obstacles.some(o=>{const dx=t.x-f.x,dy=t.y-f.y,k=Math.max(0,Math.min(1,((o.x-f.x)*dx+(o.y-f.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(o.x-f.x-dx*k,o.y-f.y-dy*k)<=o.radius+3;});}
 supportTargets(f,p,t,committed=false){
  const allies=this.supportAllies(f).filter(a=>dist(f,a)<=240&&this.supportLine(f,a));
  const hurt=allies.filter(a=>a.hp<a.maxHp*.8).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.side-b.side);
  if(p.id==='resurrection')return !f.supportReviveSpent?this.supportAllies(f,true).filter(a=>a!==f&&!a.supportRevived&&dist(f,a)<=240&&this.supportLine(f,a)&&(!committed||a===t)).slice(0,1):[];
  if(p.id==='cleanse')return allies.filter(a=>harmful.some(k=>a[k]>.25)&&(!committed||a===t)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp).slice(0,1);
  if(p.id==='barrier'){const exposed=allies.filter(a=>a.wardTime<=.5&&dist(f,a)<=110&&(this.underFire?.(a)??this.incomingThreat(a,t)));return exposed.length?allies.filter(a=>a.wardTime<=.5&&dist(f,a)<=110):[];}
  if(p.id==='mendingWave')return hurt.filter(a=>dist(f,a)<=110);
  if(p.id==='chainHeal')return hurt.filter(a=>!committed||a===t).slice(0,1);
  if(['tauntShout','knockUp'].includes(p.id))return this.supportEnemies(f).filter(a=>a.ccImmune<=0&&dist(f,a)<=(p.id==='tauntShout'?110:85)&&this.supportLine(f,a));
  if(!t||t.isObjective||t.hp<=0||t.ccImmune>0||dist(f,t)>(p.id==='hamstring'?100:260)||!this.supportLine(f,t))return [];
  if(p.id==='hamstring'&&t.slow>.5||p.id==='disarmShot'&&t.disarmed>.5)return [];
  if(['stunBolt','disarmShot'].includes(p.id)&&this.pathClear&&!this.pathClear(f,t,this.aim(f,t,260),4,260))return [];
  return [t];
 }
 powerUtility(f,t,p,copied=false){
  if(!byId[p.id])return super.powerUtility(f,t,p,copied);
  if(!copied&&this.time-(f.powerUsed[p.id]??-Infinity)<p.cooldown)return -1;
  if(p.kind==='technique'){
   if(copied||f.energy<p.cost+12||!globalThis.CURRENT_CLASS_ABILITIES.compatible(p,f.weapon.name)||['hamstring','disarmShot','knockUp'].includes(p.id)&&f.disarmed>0)return -1;
  }else if(f.mana<(copied?9:p.cost)||f.suppressed>0||p.voice&&f.weakness==='silenced casting'||this.night&&f.weakness==='loses power at night'||!this.night&&f.weakness==='loses power in daylight'||f.weakness==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return -1;
  if(p.group==='control'&&this.powerUnsafe(f,t,p))return -1;
  const targets=this.supportTargets(f,p,t);if(!targets.length)return -1;
  if(p.id==='resurrection')return 95;
  if(p.id==='cleanse')return 90;
  if(p.id==='mendingWave'||p.id==='chainHeal')return 85+Math.min(15,targets.reduce((n,a)=>n+1-a.hp/a.maxHp,0)*10);
  return p.group==='healing'?75:60;
 }
 powerUnsafe(f,t,p){return super.powerUnsafe(f,t,['stunBolt','disarmShot'].includes(p.id)?{...p,id:'thornBolt'}:p);}
 usePower(f,t,p,copied=false){
  if(!byId[p.id])return super.usePower(f,t,p,copied);
  const targets=this.supportTargets(f,p,t);if(!targets.length)return false;
  f.action={type:'supportAbility',power:p,targets:targets.map(a=>a.side),elapsed:0,windup:p.windup,cost:copied?9:p.cost};
  if(p.group==='control')f.invisible=0;
  f.actionLabel=p.name;return true;
 }
 updateAttack(f,t,dt){
  const a=f.action;if(a?.type!=='supportAbility')return super.updateAttack(f,t,dt);
  const p=a.power,spell=p.kind==='spell';
  if(f.hp<=0||f.sleep>0||f.amnesia>0||spell&&f.suppressed>0||!spell&&['hamstring','disarmShot','knockUp'].includes(p.id)&&f.disarmed>0||f.stagger>0||f.roll>0){f.action=null;this.log(`${f.name}'s ${p.name} is interrupted.`);return;}
  a.elapsed+=dt;f.actionLabel=p.name;if(a.elapsed<a.windup)return;f.action=null;
  const actors=this.combatants??this.fighters,targets=a.targets.map(index=>actors.find(x=>x.side===index)).filter(Boolean),first=targets[0];
  const legal=this.supportTargets(f,p,first,true),area=['mendingWave','barrier','tauntShout','knockUp'].includes(p.id);
  if(area?!legal.length:!first||!legal.some(x=>x===first)){
   if(spell)f.mana=Math.min(f.maxMana,f.mana+a.cost);else f.energy=Math.min(f.maxEnergy,f.energy+a.cost);
   delete f.powerUsed[p.id];f.cast=Math.min(f.cast,.2);return;
  }
  this.applySupportAbility(f,p,area?legal:targets.filter(x=>legal.includes(x)));
 }
 applySupportAbility(f,p,targets){
  const first=targets[0],factor=p.group==='healing'?(this.balance?.multipliers?.['ability:healing:output']??1):1;
  const heal=(a,n)=>{const before=a.hp;this.healSource=f;this.heal(a,n*factor);this.healSource=null;if(this.mode!=='team')f.healingDone+=a.hp-before;this.effect(0,a.x,a.y,25);};
  if(p.id==='mendingWave')for(const a of targets)if(a.hp>0&&dist(f,a)<=110)heal(a,f.spell*.75);
  if(p.id==='chainHeal'&&first?.hp>0){const used=new Set();let a=first;for(const power of [.8,.65,.5]){if(!a)break;used.add(a.side);heal(a,f.spell*power);const from=a;a=this.supportAllies(f).filter(b=>!used.has(b.side)&&b.hp<b.maxHp*.9&&dist(from,b)<=120&&this.supportLine(from,b)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.side-b.side)[0];}}
  if(p.id==='resurrection'&&first?.hp<=0&&!first.supportRevived&&!f.supportReviveSpent){f.supportReviveSpent=true;first.supportRevived=true;first.hp=first.maxHp*.4*factor;first.downed=first.creditedDown=false;first.action=null;first.vx=first.vy=0;first.respawnAt=null;for(const k of harmful)first[k]=0;first.ccImmune=immunity;this.planTimer=0;this.updatePlans?.();this.log(`${f.name} resurrects ${first.name}.`);this.effect(0,first.x,first.y,45);}
  if(p.id==='cleanse'&&first?.hp>0){for(const k of harmful)first[k]=0;first.action=null;first.ccImmune=immunity;first.wasHard=false;this.effect(0,first.x,first.y,30);}
  if(p.id==='barrier')for(const a of targets)if(a.hp>0&&dist(f,a)<=110){a.wardHits=Math.max(a.wardHits,1);a.wardTime=Math.max(a.wardTime,this.duration(f,null,4)*factor);this.effect(3,a.x,a.y,30);}
  if(['stunBolt','disarmShot'].includes(p.id)&&first?.hp>0){const angle=this.aim(f,first,260);this.projectiles.push({x:f.x,y:f.y,vx:Math.cos(angle)*260,vy:Math.sin(angle)*260,owner:f.side,damage:(p.kind==='spell'?f.spell:f.damage)*.25,type:p.kind==='spell'?'psychic':'physical',sprite:10,life:2,radius:4,payload:'support:'+p.id,duration:this.duration(f,first,p.id==='stunBolt'?1.2:2.4)});}
  if(p.id==='hamstring')this.supportControl(f,first,p.id,this.duration(f,first,4));
  if(['tauntShout','knockUp'].includes(p.id))for(const a of targets)if(a.hp>0)this.supportControl(f,a,p.id,this.duration(f,a,p.id==='tauntShout'?2:.6));
 }
 supportControl(f,t,id,duration){
  if(!t||t.isObjective||t.hp<=0||t.ccImmune>0)return false;
  duration*=this.balance?.multipliers?.['ability:control:output']??1;
  if(this.mode==='team')return this.kitControl(f,t,id,duration);
  if(['stunBolt','knockUp'].includes(id)){t.kitStun=t.sleep=duration;t.action=null;}
  if(id==='disarmShot'){t.disarmed=duration;t.action=null;t.ccImmune=duration+immunity;}
  if(id==='hamstring'){t.slow=duration;t.ccImmune=duration+immunity;}
  if(id==='tauntShout'){t.tauntTime=duration;t.action=null;}
  return true;
 }
 applyImpact(id,f,t,damage,duration){return id?.startsWith('support:')?this.supportControl(f,t,id.slice(8),duration):super.applyImpact(id,f,t,damage,duration);}
 healerAnchor(f,t){
  const anchor=super.healerAnchor(f,t),plan=this.plans?.[f.team],threat=this.nearestEnemy(f);
  const wave=f.powers.find(p=>p.id==='mendingWave');
  if(!plan||threat&&dist(f,threat)<90||!wave||f.mana<wave.cost||f.suppressed>0||f.weakness==='silenced casting'||this.night&&f.weakness==='loses power at night'||!this.night&&f.weakness==='loses power in daylight'||f.weakness==='power needs a sacrifice'&&f.hp<=f.maxHp*.03||this.time-(f.powerUsed[wave.id]??-Infinity)<wave.cooldown)return anchor;
  if(f.powers.some(p=>['healing','regeneration','life','chainHeal'].includes(p.id)&&f.mana>=p.cost&&this.time-(f.powerUsed[p.id]??-Infinity)>=(p.cooldown??0)))return anchor;
  const hurt=this.supportAllies(f).filter(a=>a!==f&&a.hp<a.maxHp*.8).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  return hurt&&dist(f,hurt)>95?{x:this.clampX(hurt.x-plan.u.x*75),y:this.clampY(hurt.y-plan.u.y*75)}:anchor;
 }
 moveFighter(f,t,dt){if(f.action?.type==='supportAbility'){f.vx=f.vy=0;return;}return super.moveFighter(f,t,dt);}
 moveTeamFighter(f,t,dt){if(f.action?.type==='supportAbility'){f.vx=f.vy=0;return;}return super.moveTeamFighter(f,t,dt);}
 startAttack(f,t){if(this.mode!=='team'&&f.disarmed>0){this.castPower(f,t);return;}return super.startAttack(f,t);}
 upkeep(f,dt){
  super.upkeep(f,dt);
  if(this.mode!=='team'){const controlled=f.kitStun>0;f.kitStun=Math.max(0,f.kitStun-dt);f.ccImmune=Math.max(0,f.ccImmune-dt);f.tauntTime=Math.max(0,f.tauntTime-dt);if(controlled&&f.kitStun<=0)f.ccImmune=immunity;if(f.kitStun>0){f.sleep=Math.max(f.sleep,f.kitStun);f.ccSeconds+=dt;}}
 }
 hurt(t,...args){const connected=super.hurt(t,...args);if(t.hp>0&&t.kitStun>0)t.sleep=Math.max(t.sleep,t.kitStun);return connected;}
 result(){const result=super.result();return {...result,combatVersion:version,...(result.fighters?{fighters:result.fighters.map(({teamKit,kitCasts,...f})=>f)}:{})};}
};}

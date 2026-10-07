import {teamRole} from './team-roles.js';
import {patchFactor} from './team-balance.js';
const statNames=['STR','SPD','DUR','IQ','MAG'];
// Scoped overrides replace a global modifier rather than multiplying it.
export function effectiveBalanceFactor(profile,role,key){return profile?.multipliers?.['role:'+role+':'+key]??patchFactor(profile,key);}
export function withComprehensiveBalance(Base,version){return class extends Base{
 constructor(teams,seed,options={}){
  const profile=options.balance,roles={...options.roles};
  const copies=teams.map(team=>team.map(c=>{const role=roles[c.id]??=teamRole(c).role;return {...c,summary:{...c.summary,stats:c.summary.stats.map((n,i)=>n*effectiveBalanceFactor(profile,role,'stat:'+statNames[i])/patchFactor(profile,'stat:'+statNames[i]))}};}));
  super(copies,seed,{...options,roles});
  this.effectAbilityIds=new Set(Object.keys(this.balance.multipliers).filter(k=>/:(potency|healing|duration)$/.test(k)&&k.includes('ability:')).map(k=>k.split('ability:')[1].split(':')[0]));
  for(const f of this.combatants??this.fighters)f.powers=f.powers.map(p=>p.cooldown?{...p,cooldown:p.cooldown*effectiveBalanceFactor(this.balance,f.role,'ability:'+p.id+':cooldown')/patchFactor(this.balance,'ability:'+p.id+':cooldown')}:p);
 }
 abilityFactor(f,id,field){return effectiveBalanceFactor(this.balance,f.role,'ability:'+id+':'+field);}
 abilityContext(f,p,run){
  if(!this.effectAbilityIds.has(p.id))return run();
  if(this.balanceCast?.fighter===f&&this.balanceCast.id===p.id)return run();
  const previous=this.balanceCast,potency=this.abilityFactor(f,p.id,'potency'),spell=f.spell,damage=f.damage,projectiles=potency!==1?new Set(this.projectiles):null,regens=p.id==='regeneration'?(this.combatants??this.fighters).map(a=>[a,a.regeneration,a.regenSource]):[];
  this.balanceCast={fighter:f,id:p.id};f.spell*=potency;f.damage*=potency;
  try{return run();}finally{
   f.spell=spell;f.damage=damage;
   if(projectiles)for(const projectile of this.projectiles)if(!projectiles.has(projectile))projectile.balanceAbility??=p.id;
   if(p.id==='regeneration')for(const [a,time,source]of regens)if(a.regeneration>time||a.regenSource!==source){a.regenPower=(a.regenPower??spell)*this.abilityFactor(f,p.id,'healing');}
   this.balanceCast=previous;
  }
 }
 usePower(f,t,p,copied=false){return this.abilityContext(f,p,()=>super.usePower(f,t,p,copied));}
 updateAttack(f,t,dt){const p=f.action?.power;return p?this.abilityContext(f,p,()=>super.updateAttack(f,t,dt)):super.updateAttack(f,t,dt);}
 applySupportAbility(f,p,targets){
  const before=targets.map(a=>[a,a.hp]);
  return this.abilityContext(f,p,()=>{const result=super.applySupportAbility(f,p,targets);if(p.id==='resurrection')for(const [a,hp]of before)if(hp<=0&&a.hp>0)a.hp=Math.min(a.maxHp,a.hp*this.abilityFactor(f,p.id,'healing'));return result;});
 }
 applyImpact(id,f,t,damage,duration){const ability=this.hitContext?.balanceAbility;return ability?this.abilityContext(f,{id:ability},()=>super.applyImpact(id,f,t,damage,duration)):super.applyImpact(id,f,t,damage,duration);}
 heal(f,amount){
  const context=this.balanceCast,source=this.healSource??f;
  const id=context?.fighter===source?context.id:this.balanceEnvironment?(this.healSource?'life':f.windRemaining>0?'secondWind':null):null;
  return super.heal(f,amount*(id?this.abilityFactor(source,id,'healing'):1));
 }
 duration(f,t,n){const context=this.balanceCast;return super.duration(f,t,n)*(context?.fighter===f?this.abilityFactor(f,context.id,'duration'):1);}
 environmentStep(dt){this.balanceEnvironment=true;try{return super.environmentStep(dt);}finally{this.balanceEnvironment=false;}}
 castPower(f,t){const count=f.castCount;super.castPower(f,t);if(f.castCount!==count&&f.lastCastId&&f.powerUsed[f.lastCastId]===this.time)f.cast*=this.abilityFactor(f,f.lastCastId,'cooldown')/patchFactor(this.balance,'ability:'+f.lastCastId+':cooldown');}
 result(){return {...super.result(),combatVersion:version};}
};}

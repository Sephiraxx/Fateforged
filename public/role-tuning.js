// Role tuning from team-2.8 / team-3.8.
// Controllers: a lineup that fields a controller instead of a damage dealer won only 26-46% (team-2.7 / team-3.7), so
// they hit harder, recover faster and hold their effects longer:
// - damage: their output to enemy fighters is `damage` of a damage dealer's (was ROLE_OUTPUT.controller, 50%), and
//   `objective` against Cores and the Forge Titan;
// - cooldown: powers and team kits come back `cooldown` times faster;
// - duration: crowd control and timed effects they put on enemies last `duration` times longer.
import {ROLE_OUTPUT} from './role-output-combat.js';
// Classic teamfight (team-2.8) and Core siege (team-3.8). In Core siege, damage dealers carry the Core damage, so a
// controller swapped in for one hits Cores and the Titan harder than its usual output.
export const CONTROLLER_RULES=Object.freeze({damage:.8,objective:.8,cooldown:1.25,duration:1.25});
export const CONTROLLER_SIEGE_RULES=Object.freeze({damage:.9,objective:1.15,cooldown:1.3,duration:1.3});
// Healers: in Core siege even a single healer lost to another damage dealer, so they get a little more health, spend
// less mana (a share of every power or kit cost is refunded) and recover a little faster. Small on purpose: two
// healers should still lose, so the meta never becomes a sustain battle.
export const HEALER_RULES=Object.freeze({health:1.1,mana:.85,cooldown:1.15});
// Core siege: damage dealers carry the Core damage, so a healer in that slot also hits Cores and the Forge Titan at
// `objective` of a damage dealer's damage (healers deal ROLE_OUTPUT.healer, 35%, to everything else).
export const HEALER_SIEGE_RULES=Object.freeze({...HEALER_RULES,objective:1});
export function withRoleTuning(Base,version,{controller=CONTROLLER_RULES,healer=HEALER_RULES}={}){return class extends Base{
 constructor(teams,seed,options={}){super(teams,seed,options);this.controllerRules=options.controllerRules??controller;this.healerRules=options.healerRules??healer;
  for(const f of this.combatants??this.fighters)if(f.role==='healer'&&!f.isObjective){f.maxHp*=this.healerRules.health;f.hp=f.maxHp;}}
 // Mana a healer spends while casting (powers, kits, and the rest of a cost charged on release) is partly refunded.
 healerSpend(f,run){if(f?.role!=='healer')return run();const before=f.mana,result=run();if(f.mana<before)f.mana+=(before-f.mana)*(1-(this.healerRules?.mana??HEALER_RULES.mana));return result;}
 castPower(f,t){return this.healerSpend(f,()=>super.castPower(f,t));}
 updateAttack(f,t,dt){return this.healerSpend(f,()=>super.updateAttack(f,t,dt));}
 hurt(t,f,amount,...rest){
  if(f&&t&&f!==t&&!f.isObjective&&t.team!==f.team){
   if(f.role==='controller'){const r=this.controllerRules??CONTROLLER_RULES;amount*=(t.isObjective?r.objective??r.damage:r.damage)/ROLE_OUTPUT.controller;}
   if(f.role==='healer'&&t.isObjective&&this.healerRules?.objective)amount*=this.healerRules.objective/ROLE_OUTPUT.healer;
  }
  return super.hurt(t,f,amount,...rest);
 }
 upkeep(f,dt){super.upkeep(f,dt);const rate=f.role==='controller'?this.controllerRules?.cooldown??CONTROLLER_RULES.cooldown:f.role==='healer'?this.healerRules?.cooldown??HEALER_RULES.cooldown:1;if(rate!==1){const extra=dt*(rate-1);f.cast-=extra;if(f.kitCooldown>0)f.kitCooldown=Math.max(0,f.kitCooldown-extra);}}
 duration(f,t,n){const result=super.duration(f,t,n);return f?.role==='controller'&&t&&t.team!==f.team?result*(this.controllerRules?.duration??CONTROLLER_RULES.duration):result;}
 kitControl(f,t,id,duration){return super.kitControl(f,t,id,f?.role==='controller'?duration*(this.controllerRules?.duration??CONTROLLER_RULES.duration):duration);}
 result(){return {...super.result(),combatVersion:version};}
};}

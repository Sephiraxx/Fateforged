// Controllers: a lineup that fields a controller instead of a damage dealer won only 30-47% (team-2.7 / team-3.7), so
// from team-2.8 / team-3.8 they hit harder, recover faster and hold their effects longer:
// - damage: their output to enemy fighters is `damage` of a damage dealer's (was ROLE_OUTPUT.controller, 50%), and
//   `objective` against Cores and the Forge Titan;
// - cooldown: powers and team kits come back `cooldown` times faster;
// - duration: crowd control and timed effects they put on enemies last `duration` times longer.
import {ROLE_OUTPUT} from './role-output-combat.js';
// Classic teamfight (team-2.8) and Core siege (team-3.8). In Core siege, damage dealers carry the Core damage, so a
// controller swapped in for one hits Cores and the Titan harder than its usual output.
export const CONTROLLER_RULES=Object.freeze({damage:.8,objective:.8,cooldown:1.25,duration:1.25});
export const CONTROLLER_SIEGE_RULES=Object.freeze({damage:.9,objective:1.15,cooldown:1.3,duration:1.3});
export function withControllerTuning(Base,version,rules=CONTROLLER_RULES){return class extends Base{
 constructor(teams,seed,options={}){super(teams,seed,options);this.controllerRules=options.controllerRules??rules;}
 hurt(t,f,amount,...rest){if(f&&t&&f!==t&&!f.isObjective&&t.team!==f.team&&f.role==='controller'){const r=this.controllerRules??CONTROLLER_RULES;amount*=(t.isObjective?r.objective??r.damage:r.damage)/ROLE_OUTPUT.controller;}return super.hurt(t,f,amount,...rest);}
 upkeep(f,dt){super.upkeep(f,dt);if(f.role==='controller'){const extra=dt*((this.controllerRules?.cooldown??CONTROLLER_RULES.cooldown)-1);f.cast-=extra;if(f.kitCooldown>0)f.kitCooldown=Math.max(0,f.kitCooldown-extra);}}
 duration(f,t,n){const result=super.duration(f,t,n);return f?.role==='controller'&&t&&t.team!==f.team?result*(this.controllerRules?.duration??CONTROLLER_RULES.duration):result;}
 kitControl(f,t,id,duration){return super.kitControl(f,t,id,f?.role==='controller'?duration*(this.controllerRules?.duration??CONTROLLER_RULES.duration):duration);}
 result(){return {...super.result(),combatVersion:version};}
};}

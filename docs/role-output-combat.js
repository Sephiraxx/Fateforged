// Only damage dealers deal full damage. Tanks, healers and controllers keep their protection, healing and control,
// but the damage they deal to enemy fighters, Cores and the Forge Titan is scaled down so they never rival a
// damage dealer.
// Every hit passes through hurt (weapons, projectiles, spells, damage over time), so one multiplier covers them.
// Weaker supports make even teamfights last longer, so classic teamfight (not Core siege) ramps damage up through
// the late game: +5% per second from 60 s, on top of the existing overtime rules (from 75 s).
export const OVERTIME_RAMP=Object.freeze({start:60,perSecond:.05});
// Tanks trade their damage for toughness: Fortified (35% less damage taken) is 30% stronger, about 45%.
export const FORTIFIED_BONUS=1.3;
export const ROLE_OUTPUT=Object.freeze({tank:.5,healer:.35,controller:.5});
export function withRoleOutput(Base,version){return class extends Base{
 hurt(t,f,amount,...rest){if(f&&t&&f!==t&&!f.isObjective&&t.team!==f.team){amount*=ROLE_OUTPUT[f.role]??1;if(!this.objectiveMode&&this.time>OVERTIME_RAMP.start)amount*=1+(this.time-OVERTIME_RAMP.start)*OVERTIME_RAMP.perSecond;}return super.hurt(t,f,amount,...rest);}
 fortified(f){return Math.min(.6,super.fortified(f)*FORTIFIED_BONUS);}
 // Cover: earlier engines let a short-range Sound blast skip the cover check; these engines check it like any bolt.
 projectileClear(f,t,p){return p.id==='sound'?this.pathClear(f,t,this.aim(f,t,220),7,220):super.projectileClear(f,t,p);}
 result(){return {...super.result(),combatVersion:version};}
};}

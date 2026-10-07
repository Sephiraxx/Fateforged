// Supports support. Healers and controllers keep their full healing and control, but the damage they deal
// to enemy fighters, Cores and the Forge Titan is scaled down so they never rival a damage dealer.
// Every hit passes through hurt (weapons, projectiles, spells, damage over time), so one multiplier covers them.
// Weaker supports make even teamfights last longer, so classic teamfight (not Core siege) ramps damage up through
// overtime: +2% per second after 75 s, on top of the existing overtime bonus.
export const OVERTIME_RAMP=Object.freeze({start:75,perSecond:.02});
export const ROLE_OUTPUT=Object.freeze({healer:.35,controller:.6});
export function withRoleOutput(Base,version){return class extends Base{
 hurt(t,f,amount,...rest){if(f&&t&&f!==t&&!f.isObjective&&t.team!==f.team){amount*=ROLE_OUTPUT[f.role]??1;if(!this.objectiveMode&&this.time>OVERTIME_RAMP.start)amount*=1+(this.time-OVERTIME_RAMP.start)*OVERTIME_RAMP.perSecond;}return super.hurt(t,f,amount,...rest);}
 result(){return {...super.result(),combatVersion:version};}
};}

// Core siege, tuned (team-3.4): longer matches, a Forgefire buff that helps a siege without deciding it, and
// objectives scaled to the format so 3v3 (fewer fighters) faces weaker Cores and a weaker Titan. The killing blow
// claims Forgefire (steals count). The buff belongs to each fighter alive at the claim and is lost on death.
import {TeamBattle as Previous} from './combat-team-v3-3.js';
import {OBJECTIVE_RULES,TITAN_RULES} from './combat-team-v3-2.js';
import {withRoleOutput} from './role-output-combat.js';
export {OBJECTIVE_RULES,TITAN_RULES} from './combat-team-v3-2.js';
export const TEAM_ENGINE_VERSION='team-3.4';
const freeze=o=>Object.freeze(Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Object.freeze(v)])));
export const SIEGE_RULES=freeze({
 3:{...OBJECTIVE_RULES,coreHp:{3:7000},pulseDamage:.015,forgefireGuard:.75},
 5:{...OBJECTIVE_RULES,coreHp:{5:7500},forgefireGuard:.75}
});
export const SIEGE_TITAN_RULES=freeze({
 3:{...TITAN_RULES,hp:{3:3600},attackDamage:.025,slamDamage:.07,forgefire:35,damage:1.05,shield:.05,coreDamage:1.1,forgefireFight:160},
 5:{...TITAN_RULES,hp:{5:7500},attackDamage:.035,slamDamage:.1,forgefire:40,damage:1.07,shield:.06,coreDamage:1.15,forgefireFight:160}
});
class SiegeBattle extends Previous{
 constructor(teams,seed,options={}){const size=teams?.[0]?.length;super(teams,seed,{...options,objectiveRules:options.objectiveRules??SIEGE_RULES[size]??OBJECTIVE_RULES,titanRules:options.titanRules??SIEGE_TITAN_RULES[size]??TITAN_RULES});}
 empowered(f){return f.hp>0&&(f.forgefireUntil??0)>this.time;}
 hasForgefire(team){return !!this.combatants?.some(f=>f.team===team&&this.empowered(f));}
 // Fallen fighters drop the buff; respawns and revives come back without it.
 dropFallen(){for(const f of this.combatants??[])if(f.hp<=0&&f.forgefireUntil){f.forgefireUntil=0;f.forgeShield=0;}}
 hurt(t,f,...rest){const kills=this.titanDeaths?.length??0,result=super.hurt(t,f,...rest);this.dropFallen();const claim=this.titanDeaths?.[kills];if(claim)for(const a of this.combatants)if(a.team===claim.team&&a.hp>0)a.forgefireUntil=this.forgefireUntil[claim.team];return result;}
 objectiveStep(dt){this.dropFallen();return super.objectiveStep(dt);}
 respawn(f){super.respawn(f);f.forgefireUntil=0;}
}
export const TeamBattle=withRoleOutput(SiegeBattle,TEAM_ENGINE_VERSION);

// Core siege, tuned (team-3.4): longer matches, a Forgefire buff that helps a siege without deciding it, fewer
// coin-flip steals, and objectives scaled to the format so 3v3 (fewer fighters) faces weaker Cores and a weaker Titan.
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
 3:{...TITAN_RULES,hp:{3:3600},attackDamage:.025,slamDamage:.07,forgefire:35,damage:1.05,shield:.05,coreDamage:1.1,forgefireFight:160,claimShare:.45},
 5:{...TITAN_RULES,hp:{5:7500},attackDamage:.035,slamDamage:.1,forgefire:40,damage:1.07,shield:.06,coreDamage:1.15,forgefireFight:160,claimShare:.45}
});
class SiegeBattle extends Previous{
 constructor(teams,seed,options={}){const size=teams?.[0]?.length;super(teams,seed,{...options,objectiveRules:SIEGE_RULES[size]??OBJECTIVE_RULES,titanRules:SIEGE_TITAN_RULES[size]??TITAN_RULES});}
}
export const TeamBattle=withRoleOutput(SiegeBattle,TEAM_ENGINE_VERSION);

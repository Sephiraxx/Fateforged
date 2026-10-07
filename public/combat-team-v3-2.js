import {TeamBattle as PreviousBattle} from './combat-team-v3-1.js';
import {withTargetedBalance} from './targeted-balance-combat.js';
export {OBJECTIVE_RULES,TITAN_RULES} from './combat-team-v3-1.js';
export const TEAM_ENGINE_VERSION='team-3.2';
export const TeamBattle=withTargetedBalance(PreviousBattle,TEAM_ENGINE_VERSION);

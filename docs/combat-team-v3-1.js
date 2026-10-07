import {TeamBattle as PreviousBattle} from './combat-team-v3.js';
import {withSupportAbilities} from './support-combat.js';
export {OBJECTIVE_RULES,TITAN_RULES} from './combat-team-v3.js';
export const TEAM_ENGINE_VERSION='team-3.1';
export const TeamBattle=withSupportAbilities(PreviousBattle,TEAM_ENGINE_VERSION);

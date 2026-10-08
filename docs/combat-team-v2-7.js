import {TeamBattle as Previous} from './combat-team-v2-6.js';
import {withRoleOutput} from './role-output-combat.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2-6.js';
export {ROLE_OUTPUT} from './role-output-combat.js';
export const TEAM_ENGINE_VERSION='team-2.7';
export const TeamBattle=withRoleOutput(Previous,TEAM_ENGINE_VERSION);

import {TeamBattle as Previous} from './combat-team-v2-5.js';
import {withComprehensiveBalance} from './comprehensive-balance-combat.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2-5.js';
export const TEAM_ENGINE_VERSION='team-2.6';
export const TeamBattle=withComprehensiveBalance(Previous,TEAM_ENGINE_VERSION);

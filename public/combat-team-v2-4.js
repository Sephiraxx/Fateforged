import {TeamBattle as PreviousBattle} from './combat-team-v2-3.js';
import {withSupportAbilities} from './support-combat.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2-3.js';
export const TEAM_ENGINE_VERSION='team-2.4';
export const TeamBattle=withSupportAbilities(PreviousBattle,TEAM_ENGINE_VERSION);

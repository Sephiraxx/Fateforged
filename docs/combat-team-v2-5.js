import {TeamBattle as PreviousBattle} from './combat-team-v2-4.js';
import {withTargetedBalance} from './targeted-balance-combat.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2-4.js';
export const TEAM_ENGINE_VERSION='team-2.5';
export const TeamBattle=withTargetedBalance(PreviousBattle,TEAM_ENGINE_VERSION);

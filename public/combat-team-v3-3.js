import {TeamBattle as Previous} from './combat-team-v3-2.js';
import {withComprehensiveBalance} from './comprehensive-balance-combat.js';
export const TEAM_ENGINE_VERSION='team-3.3';
export const TeamBattle=withComprehensiveBalance(Previous,TEAM_ENGINE_VERSION);

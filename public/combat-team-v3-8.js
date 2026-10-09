// Core siege, team-3.8: team-3.7 with stronger controllers and healers (role-tuning.js).
import {TeamBattle as Previous} from './combat-team-v3-7.js';
import {withRoleTuning,CONTROLLER_SIEGE_RULES} from './role-tuning.js';
export * from './combat-team-v3-7.js';
export const TEAM_ENGINE_VERSION='team-3.8';
export const TeamBattle=withRoleTuning(Previous,TEAM_ENGINE_VERSION,{controller:CONTROLLER_SIEGE_RULES});

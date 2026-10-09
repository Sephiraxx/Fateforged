// Core siege, team-3.8: team-3.7 with stronger controllers (controller-tuning.js).
import {TeamBattle as Previous} from './combat-team-v3-7.js';
import {withControllerTuning,CONTROLLER_SIEGE_RULES} from './controller-tuning.js';
export * from './combat-team-v3-7.js';
export const TEAM_ENGINE_VERSION='team-3.8';
export const TeamBattle=withControllerTuning(Previous,TEAM_ENGINE_VERSION,CONTROLLER_SIEGE_RULES);

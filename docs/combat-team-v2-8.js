// Classic teamfight, team-2.8: team-2.7 with stronger controllers (controller-tuning.js).
import {TeamBattle as Previous} from './combat-team-v2-7.js';
import {withControllerTuning} from './controller-tuning.js';
export * from './combat-team-v2-7.js';
export const TEAM_ENGINE_VERSION='team-2.8';
export const TeamBattle=withControllerTuning(Previous,TEAM_ENGINE_VERSION);

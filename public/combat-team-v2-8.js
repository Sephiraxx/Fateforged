// Classic teamfight, team-2.8: team-2.7 with stronger controllers and healers (role-tuning.js).
import {TeamBattle as Previous} from './combat-team-v2-7.js';
import {withRoleTuning} from './role-tuning.js';
export * from './combat-team-v2-7.js';
export const TEAM_ENGINE_VERSION='team-2.8';
export const TeamBattle=withRoleTuning(Previous,TEAM_ENGINE_VERSION);

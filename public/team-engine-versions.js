// Current team engines and every engine that carries a per-save balance profile. Older versions stay
// registered in combat-team.js so saved results and replays keep the rules they were played under.
export const TEAM_COMBAT_VERSION='team-2.8';
export const OBJECTIVE_COMBAT_VERSION='team-3.8';
export const BALANCED_ENGINES=Object.freeze(['team-2.3','team-2.4','team-2.5','team-2.6','team-2.7','team-3-core','team-3','team-3.1','team-3.2','team-3.3','team-3.4','team-3.5','team-3.6','team-3.7','team-2.8','team-3.8']);
export const engineForMode=battleMode=>battleMode==='core'?OBJECTIVE_COMBAT_VERSION:TEAM_COMBAT_VERSION;
// Engines whose matches carry coach game plans.
export const GAME_PLAN_ENGINES=Object.freeze(['team-3.6','team-3.7','team-3.8']);

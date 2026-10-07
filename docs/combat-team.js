import {TeamBattle as OldTeamBattle} from './combat-team-v2.js';
import {TeamBattle as CoverTeamBattle} from './combat-team-v2-1.js';
import {TeamBattle as KitTeamBattle} from './combat-team-v2-2.js';
import {TeamBattle as CurrentTeamBattle} from './combat-team-v2-3.js';
import {TeamBattle as TitanBattle} from './combat-team-v3.js';
import {TeamBattle as CoreBattle} from './combat-team-v3-core.js';
export * from './combat-team-v2-3.js';
export const TEAM_ENGINES=Object.freeze({'team-2':OldTeamBattle,'team-2.1':CoverTeamBattle,'team-2.2':KitTeamBattle,'team-2.3':CurrentTeamBattle,'team-3-core':CoreBattle,'team-3':TitanBattle});
export function teamEngine(version='team-2.3'){const Engine=TEAM_ENGINES[version];if(!Engine)throw new Error('Unsupported saved team combat engine.');return Engine;}
export function simulateTeam(teams,seed,options={}){const Engine=teamEngine(options.engineVersion),battle=new Engine(teams,seed,{...options,headless:options.headless??true});while(!battle.done)battle.step(1/60);return battle.result();}

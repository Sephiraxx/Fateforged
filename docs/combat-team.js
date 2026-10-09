import {TeamBattle as OldTeamBattle} from './combat-team-v2.js';
import {TeamBattle as CoverTeamBattle} from './combat-team-v2-1.js';
import {TeamBattle as KitTeamBattle} from './combat-team-v2-2.js';
import {TeamBattle as PatchTeamBattle} from './combat-team-v2-3.js';
import {TeamBattle as CurrentTeamBattle} from './combat-team-v2-4.js';
import {TeamBattle as SupportTitanBattle} from './combat-team-v3-1.js';
import {TeamBattle as TargetedTeamBattle} from './combat-team-v2-5.js';
import {TeamBattle as TargetedTitanBattle} from './combat-team-v3-2.js';
import {TeamBattle as TitanBattle} from './combat-team-v3.js';
import {TeamBattle as CoreBattle} from './combat-team-v3-core.js';
import {TeamBattle as ComprehensiveTeamBattle} from './combat-team-v2-6.js';
import {TeamBattle as ComprehensiveCoreBattle} from './combat-team-v3-3.js';
import {TeamBattle as RoleTeamBattle} from './combat-team-v2-7.js';
import {TeamBattle as RoleCoreBattle} from './combat-team-v3-4.js';
import {TeamBattle as BrainCoreBattle} from './combat-team-v3-5.js';
import {TeamBattle as PlanCoreBattle} from './combat-team-v3-6.js';
import {TeamBattle as ForgeCoreBattle} from './combat-team-v3-7.js';
import {TeamBattle as ControllerTeamBattle} from './combat-team-v2-8.js';
import {TeamBattle as ControllerCoreBattle} from './combat-team-v3-8.js';
import {TeamBattle as TerrainCoreBattle} from './combat-team-v3-9.js';
export * from './combat-team-v2-8.js';
export const TEAM_ENGINES=Object.freeze({'team-2.8':ControllerTeamBattle,'team-3.8':ControllerCoreBattle,'team-3.9':TerrainCoreBattle,'team-2.7':RoleTeamBattle,'team-3.7':ForgeCoreBattle,'team-3.6':PlanCoreBattle,'team-3.5':BrainCoreBattle,'team-3.4':RoleCoreBattle,'team-2.6':ComprehensiveTeamBattle,'team-3.3':ComprehensiveCoreBattle,'team-2':OldTeamBattle,'team-2.1':CoverTeamBattle,'team-2.2':KitTeamBattle,'team-2.3':PatchTeamBattle,'team-2.4':CurrentTeamBattle,'team-2.5':TargetedTeamBattle,'team-3.2':TargetedTitanBattle,'team-3.1':SupportTitanBattle,'team-3-core':CoreBattle,'team-3':TitanBattle});
export function teamEngine(version='team-2.8'){const Engine=TEAM_ENGINES[version];if(!Engine)throw new Error('Unsupported saved team combat engine.');return Engine;}
export function simulateTeam(teams,seed,options={}){const Engine=teamEngine(options.engineVersion),battle=new Engine(teams,seed,{...options,headless:options.headless??true});while(!battle.done)battle.step(1/60);return battle.result();}

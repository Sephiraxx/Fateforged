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
import {TeamBattle as PortableTeamBattle} from './combat-team-v2-9.js';
import {TeamBattle as PortableCoreBattle} from './combat-team-v4-0.js';
import {castSubclass} from './team-classes.js';
export * from './combat-team-v2-9.js';
export const TEAM_ENGINES=Object.freeze({'team-2.9':PortableTeamBattle,'team-4.0':PortableCoreBattle,'team-2.8':ControllerTeamBattle,'team-3.8':ControllerCoreBattle,'team-3.9':TerrainCoreBattle,'team-2.7':RoleTeamBattle,'team-3.7':ForgeCoreBattle,'team-3.6':PlanCoreBattle,'team-3.5':BrainCoreBattle,'team-3.4':RoleCoreBattle,'team-2.6':ComprehensiveTeamBattle,'team-3.3':ComprehensiveCoreBattle,'team-2':OldTeamBattle,'team-2.1':CoverTeamBattle,'team-2.2':KitTeamBattle,'team-2.3':PatchTeamBattle,'team-2.4':CurrentTeamBattle,'team-2.5':TargetedTeamBattle,'team-3.2':TargetedTitanBattle,'team-3.1':SupportTitanBattle,'team-3-core':CoreBattle,'team-3':TitanBattle});
export function teamEngine(version='team-2.9'){const Engine=TEAM_ENGINES[version];if(!Engine)throw new Error('Unsupported saved team combat engine.');return Engine;}
// Simulation workers can hand headless games to the Rust core (public/rust-core.js): it returns the same result, or
// null to play the game here.
let nativeSimulator=null;
export function useNativeSimulator(simulate){nativeSimulator=simulate??null;}
// 3v3 Core siege (team-4.0) tuning. In league seasons (scripts/league-lab.mjs, 32 teams × 15 seasons) three-damage
// lineups won 58% and bruisers 58%, while tanks, healers, controllers and supports sat at 43–45%; classic teamfight
// and 5v5 were fine. In that format alone each cast role enters the battle with a stat adjustment (strength, speed,
// durability, IQ, magic), and a few subclasses get a nudge on top. The stats are changed before the battle is built,
// so the Rust core plays the same input.
export const TRIO_SIEGE_BONUS=Object.freeze({tank:Object.freeze([130,80,260,0,0]),healer:Object.freeze([40,90,220,90,220]),controller:Object.freeze([0,25,50,25,50]),support:Object.freeze([0,80,160,80,160]),bruiser:Object.freeze([-30,-15,-45,0,0]),damage:Object.freeze([-25,0,-25,0,-25])});
// On top of the role, a few subclasses that stood out in league seasons (scripts/league-lab.mjs) get their own nudge.
export const TRIO_SIEGE_SUBCLASS=Object.freeze({'Assassin (Executioner)':[14,7,15,0,0],'Assassin (Riftwalker)':[-70,-35,-100,0,0],'Assassin (Shadowblade)':[23,12,24,0,0],'Assassin (Venomblade)':[17,8,17,0,0],'Bard (Maestro)':[0,30,60,30,60],'Bard (Siren)':[0,-60,-120,-60,-120],'Bard (Skald)':[0,7,15,7,17],'Cleric (Mercy)':[0,17,33,17,33],'Cleric (Ward)':[0,8,16,8,16],'Druid (Forest)':[0,33,67,33,67],'Druid (Grove)':[0,10,20,10,27],'Druid (Moon)':[0,-6,-13,-6,-17],'Guardian (Aegis)':[-12,-6,-13,0,0],'Guardian (Stoneguard)':[12,6,11,0,0],'Guardian (Warden)':[22,11,23,0,0],'Mage (Blood)':[0,-15,-30,-15,-47],'Mage (Fire)':[0,5,10,5,11],'Mage (Frost)':[0,-12,-24,-12,-36],'Paladin (Crusader)':[-20,-10,-22,0,0],'Paladin (Oathbreaker)':[11,6,11,0,0],'Ranger (Beastmaster)':[-17,-8,-19,0,0],'Ranger (Marksman)':[50,25,75,0,0],'Ranger (Trapper)':[20,10,25,0,0],'Warlock (Hexer)':[0,33,65,33,65],'Warlock (Soulbinder)':[0,-10,-20,-10,-24],'Warlock (Voidcaller)':[0,5,9,5,9],'Warrior (Berserker)':[14,7,14,0,0],'Warrior (Vanguard)':[100,50,160,0,0]});
const trioBonus=f=>{const s=castSubclass(f.traits?.class,f.traits?.subclass);if(!s||(f.summary?.generationVersion??0)<5)return null;const a=TRIO_SIEGE_BONUS[s.role],b=TRIO_SIEGE_SUBCLASS[`${f.traits.class} (${f.traits.subclass})`];return a||b?[0,1,2,3,4].map(i=>(a?.[i]??0)+(b?.[i]??0)):null;};
export const TRIO_SIEGE_ENGINES=Object.freeze(['team-4.0']);
export function formatTeams(teams,options={}){
 if(!TRIO_SIEGE_ENGINES.includes(options.engineVersion)||teams.length!==2||teams.some(t=>t.length!==3))return teams;
 return teams.map(t=>t.map(f=>{const bonus=trioBonus(f);return bonus?{...f,summary:{...f.summary,stats:f.summary.stats.map((v,i)=>Math.max(0,v+bonus[i]))}}:f;}));
}
export function simulateTeam(teams,seed,options={}){
 teams=formatTeams(teams,options);
 const javascript=()=>{const Engine=teamEngine(options.engineVersion),battle=new Engine(teams,seed,{...options,headless:options.headless??true});while(!battle.done)battle.step(1/60);return battle.result();};
 return nativeSimulator?.(teams,seed,options,javascript)??javascript();
}

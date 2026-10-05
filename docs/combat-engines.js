import {Battle,simulate} from './combat.js';
import {Battle as V10,simulate as simulate10} from './combat-v10.js';
import {Battle as V9,simulate as simulate9} from './combat-v9.js';
export const CURRENT_COMBAT_VERSION=11;
export const tournamentEngine=s=>{const first=s.history.find(m=>m.results?.length);return s.engineVersion??(first?first.results[0].combatVersion??1:11);};
const engines=new Map([[11,{Battle,simulate}],[10,{Battle:V10,simulate:simulate10}],[9,{Battle:V9,simulate:simulate9}]]);
export async function loadCombatEngine(version){
 if(!engines.has(version)){
  if(!Number.isInteger(version)||version<1||version>8)throw Error('Unsupported combat version.');
  engines.set(version,await import(`./combat-v${version}.js`));
 }
 return engines.get(version);
}
// Normal simulation paths use 9, 10 or 11; historical versions load before playback.
export function simulationEngine(version=11){const engine=engines.get(version);if(!engine)throw Error('Load the saved combat engine before simulation.');return engine;}

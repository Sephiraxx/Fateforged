import {Battle as PreviousBattle} from './combat-v12.js';
import {withSupportAbilities} from './support-combat.js';
export {fighterProfile,random,weaponFor,tierFor,TIER_LIMITS,combatStyle,REWIND_HEALTH_RECOVERY,REWIND_MANA_RECOVERY} from './combat-v12.js';
export {powerFor} from './abilities-v13.js';
export const Battle=withSupportAbilities(PreviousBattle,13);
export function simulate(a,b,seed,options){const battle=new Battle(a,b,seed,options);while(!battle.done)battle.step(1/60);return battle.result();}

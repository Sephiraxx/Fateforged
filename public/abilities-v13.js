import {POWERS as legacyPowers,powerFor as legacyPowerFor,WEAKNESSES,weaponProperties} from './abilities-v12.js';
import {SUPPORT_ABILITIES,supportAbility} from './support-abilities.js';
export {WEAKNESSES,weaponProperties};
export const CATALOG=globalThis.CURRENT_CLASS_ABILITIES;
export {SUPPORT_ABILITIES,supportAbility};
export const POWERS={...legacyPowers,...SUPPORT_ABILITIES};
export function powerFor(name,character){return (character?supportAbility(name,character):CATALOG.definition(name)?.group?CATALOG.definition(name):null)||legacyPowerFor(name,character);}

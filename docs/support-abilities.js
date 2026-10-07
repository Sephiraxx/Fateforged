import './class-abilities.js';
import './support-catalog.js';
export const SUPPORT_ABILITIES=globalThis.SUPPORT_ABILITIES;
export function supportAbility(name,character){const version=character?.generationVersion??character?.summary?.generationVersion??character?.state?.generationVersion;if(version<4||version===undefined)return null;const a=globalThis.CURRENT_CLASS_ABILITIES.definition(name);return a?.group?a:null;}

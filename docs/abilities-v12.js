import './class-abilities.js';
import {POWERS as previous,WEAKNESSES,weaponProperties as fallbackProperties} from './abilities-v11.js';
export {WEAKNESSES};
export const CATALOG=globalThis.CLASS_ABILITIES;
export const POWERS=Object.fromEntries(Object.entries(CATALOG.abilities).map(([name,a])=>[name,{...a,description:previous[name]?.description??a.description}]));
export function powerFor(name,character=null){if(!name||/^no (second )?(power|ability)$/i.test(String(name).trim()))return null;const a=CATALOG.definition(name),version=character?.generationVersion??character?.summary?.generationVersion??character?.state?.generationVersion;const legacyCustom=version!==undefined&&version<3&&a&&CATALOG.newOptions.some(o=>o.name===a.name);return a&&!legacyCustom?{...POWERS[a.name]}:{name,id:'custom',sprite:4,description:'A custom spell releases an arcane bolt.',voice:true,kind:'spell',cost:9,tags:[]};}
export function weaponProperties(name){return CATALOG.weapons[name]?.properties??fallbackProperties(name);}

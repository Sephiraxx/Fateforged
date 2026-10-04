import {tierFor,combatStyle} from './combat.js';
export const TIERS=['E','D','C','B','A','S','SS'];
export const RANKS=['Trash','Common','Capable','Elite','Legendary','Mythic','Divine','Cosmic'];
export const DEFAULT_FILTERS={style:'any',tier:'any',rank:'any'};
export function normalizeFilters(input={}){const f={...DEFAULT_FILTERS,...input};if(!['any','melee','ranged','arcane'].includes(f.style)||!['any',...TIERS].includes(f.tier)||!['any',...RANKS].includes(f.rank))throw new Error('Invalid tournament filters.');return {style:f.style,tier:f.tier,rank:f.rank};}
export function rankFor(total){return total>=3000?'Cosmic':total>=2100?'Divine':total>=1500?'Mythic':total>=1000?'Legendary':total>=650?'Elite':total>=350?'Capable':total>=150?'Common':'Trash';}
export function matchesFilters(c,input){const f=normalizeFilters(input),style=combatStyle(c),total=c.summary.stats.reduce((a,b)=>a+b,0);return(f.style==='any'||f.style===style||(f.style==='ranged'&&style==='arcane'))&&(f.tier==='any'||tierFor(total)===f.tier)&&(f.rank==='any'||rankFor(total)===f.rank);}
export const divisionKey=input=>{const f=normalizeFilters(input);return `${f.style}|${f.tier}|${f.rank}`;};
export const divisionLabel=input=>{const f=normalizeFilters(input);return [f.style==='any'?null:f.style==='arcane'?'Arcane':f.style==='ranged'?'Ranged':'Melee',f.tier==='any'?null:`Tier ${f.tier}`,f.rank==='any'?null:f.rank].filter(Boolean).join(' · ')||'Open';};

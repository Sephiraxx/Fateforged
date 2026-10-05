import {random} from './combat-v1.js';
export const TIMES=['dawn','day','dusk','night'],WEATHER=['clear','rain','frost','storm'],GROUNDS=['stone','water'];
export function normalizeConditions(input={}){if(typeof input==='boolean')input={time:input?'night':'day'};const c={time:'day',weather:'clear',ground:'stone',...input};if(![...TIMES,'random'].includes(c.time)||![...WEATHER,'random'].includes(c.weather)||![...GROUNDS,'random'].includes(c.ground))throw new Error('Invalid arena conditions.');return {time:c.time,weather:c.weather,ground:c.ground};}
export function resolveConditions(seed,input={}){const c=normalizeConditions(input),rng=random((seed^0xA791F30B)>>>0);return {time:c.time==='random'?TIMES[Math.floor(rng()*TIMES.length)]:c.time,weather:c.weather==='random'?WEATHER[Math.floor(rng()*WEATHER.length)]:c.weather,ground:c.ground==='random'?GROUNDS[Math.floor(rng()*GROUNDS.length)]:c.ground};}
export const conditionsFor=state=>normalizeConditions(state.conditions??{time:state.night?'night':'day'});
export const conditionsLabel=c=>`${c.time[0].toUpperCase()+c.time.slice(1)} · ${c.weather} · ${c.ground==='water'?'shallow water':'stone'}`;

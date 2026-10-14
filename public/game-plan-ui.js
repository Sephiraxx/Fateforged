// Labelled selects for a Core siege game plan (dials a plan lacks show their default). get() returns the current plan; onchange receives it.
import {GAME_PLAN_OPTIONS,GAME_PLAN_LABELS} from './team-game-plan.js';
export function gamePlanFields(plan,{onchange=null,disabled=false,prefix=''}={}){
 const wrap=document.createElement('div');wrap.className='game-plan-fields';const selects={};
 for(const [dial,options]of Object.entries(GAME_PLAN_OPTIONS)){
  const label=document.createElement('label'),select=document.createElement('select');label.textContent=GAME_PLAN_LABELS[dial];select.setAttribute('aria-label',`${prefix}${GAME_PLAN_LABELS[dial]}`);select.disabled=disabled;
  for(const [value,text]of options){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
  select.value=plan[dial]??options[0][0];if(onchange)select.onchange=()=>onchange(get());label.append(select);wrap.append(label);selects[dial]=select;
 }
 const get=()=>Object.fromEntries(Object.entries(selects).map(([k,s])=>[k,s.value]));
 const set=next=>{for(const [k,s]of Object.entries(selects))s.value=next[k]??GAME_PLAN_OPTIONS[k][0][0];};
 return {element:wrap,get,set};
}

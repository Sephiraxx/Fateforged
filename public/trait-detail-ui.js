import {buildTraitDetails,STAT_KEYS} from './trait-details.js';
const LABELS={race:'Race',subrace:'Subrace',class:'Class',subclass:'Subclass',strength:'Strength roll',speed:'Speed roll',durability:'Durability roll',iq:'IQ roll',magic:'Magic roll',weapon:'Weapon',mastery:'Combat mastery',power:'Ability',power2:'Second ability',weakness:'Weakness'};
const node=(tag,className,text)=>{const e=document.createElement(tag);e.className=className;if(text!==undefined)e.textContent=text;return e;};
let installed=false;
export function openTraitDetails(character,key='overview',options={}){
 const rollStats={strength:'STR',speed:'SPD',durability:'DUR',iq:'IQ',magic:'MAG'};key=rollStats[key]||key;
 const dialog=document.getElementById('trait-details'),picker=document.getElementById('trait-detail-picker');
 if(!installed){document.getElementById('close-trait-details').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});installed=true;}
 const traits=character.traits||character.state?.traits||{};
 picker.replaceChildren();let selectedButton;
 for(const [id,label] of [...STAT_KEYS.map(k=>[k,k]),...Object.entries(LABELS).filter(([id])=>traits[id]&&!['strength','speed','durability','iq','magic'].includes(id))]){
  const button=node('button','detail-picker-button',label);button.type='button';button.setAttribute('aria-pressed',String(key===id));if(key===id)selectedButton=button;button.addEventListener('click',()=>openTraitDetails(character,id,{...options,label:LABELS[id]||'Combat stat',contribution:options.contributions?.[id]}));picker.append(button);
 }
 const model=buildTraitDetails(character,key,{...options,label:options.label||LABELS[key]});
 document.getElementById('trait-detail-category').textContent=key==='overview'?'CHARACTER DETAILS':model.category;
 document.getElementById('trait-detail-title').textContent=key==='overview'?model.fighter:model.title;
 document.getElementById('trait-detail-intro').textContent=key==='overview'?'Choose a stat or trait below to inspect its combat effects.':`${model.fighter} · Starting combat values`;
 const metrics=document.getElementById('trait-detail-metrics');metrics.replaceChildren();
 if(key!=='overview')for(const {label,value,formula} of model.rows){const row=node('div','detail-metric');row.append(node('dt','detail-metric-label',label),node('dd','detail-metric-value',value));if(formula)row.append(node('dd','detail-metric-formula',formula));metrics.append(row);}
 const notes=document.getElementById('trait-detail-notes');notes.replaceChildren();if(key!=='overview')for(const note of model.notes)notes.append(node('li','',note));
 if(!dialog.open)dialog.showModal();else dialog.scrollTop=0;
 selectedButton?.scrollIntoView?.({block:'nearest',inline:'center',behavior:'instant'});
}

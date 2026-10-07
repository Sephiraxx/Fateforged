import {buildCharacterOverview,buildTraitDetails,STAT_KEYS} from './trait-details.js';
const LABELS={race:'Race',subrace:'Subrace',class:'Class',subclass:'Subclass',strength:'Strength roll',speed:'Speed roll',durability:'Durability roll',iq:'IQ roll',magic:'Magic roll',weapon:'Weapon',mastery:'Combat mastery',power:'Ability',power2:'Second ability',weakness:'Weakness'};
const node=(tag,className,text)=>{const e=document.createElement(tag);e.className=className;if(text!==undefined)e.textContent=text;return e;};
const metric=({label,value,formula})=>{const row=node('div','detail-metric');row.append(node('dt','detail-metric-label',label),node('dd','detail-metric-value',value));if(formula)row.append(node('dd','detail-metric-formula',formula));return row;};
function renderOverview(host,model){
 const badges=[model.role,model.tier&&`${model.tier} tier`].filter(Boolean);
 if(badges.length)host.append(node('p','character-overview-badges',badges.join(' · ')));
 for(const section of model.sections){
  const block=node('section','character-overview-section'),heading=node('div','character-overview-heading');heading.append(node('h3','',section.title));
  if(section.kind==='stats')heading.append(node('span','muted',`${model.total.toLocaleString('en-US')} total`));
  block.append(heading);
  if(section.hint)block.append(node('p','character-overview-hint',section.hint));
  const list=node('dl',section.kind==='stats'?'character-overview-stats':'character-overview-grid');
  if(section.kind==='stats')for(const stat of section.rows){
   const row=node('div','character-overview-stat'),label=node('dt','');label.append(node('strong','',stat.label),node('span','',stat.name));
   const value=node('dd','character-overview-stat-value',stat.value.toLocaleString('en-US'));
   const roll=node('dd','character-overview-roll',`Roll: ${stat.roll}${stat.growth?` · +${stat.growth} earned`:''}`);
   row.append(label,value,roll);list.append(row);
  }else for(const row of section.rows)list.append(metric(row));
  block.append(list);host.append(block);
 }
}
let installed=false;
export function openTraitDetails(character,key='overview',options={}){
 const rollStats={strength:'STR',speed:'SPD',durability:'DUR',iq:'IQ',magic:'MAG'};key=rollStats[key]||key;
 const dialog=document.getElementById('trait-details'),picker=document.getElementById('trait-detail-picker');
 if(!installed){document.getElementById('close-trait-details').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});installed=true;}
 const traits=character.traits||character.state?.traits||{};
 picker.replaceChildren();let selectedButton;
 for(const [id,label] of [['overview','Character'],...STAT_KEYS.map(k=>[k,k]),...Object.entries(LABELS).filter(([id])=>traits[id]&&!['strength','speed','durability','iq','magic'].includes(id))]){
  const button=node('button','detail-picker-button',label);button.type='button';button.setAttribute('aria-pressed',String(key===id));if(key===id)selectedButton=button;button.addEventListener('click',()=>openTraitDetails(character,id,{...options,label:id==='overview'?undefined:LABELS[id]||'Combat stat',contribution:options.contributions?.[id]}));picker.append(button);
 }
 const model=key==='overview'?{fighter:character.name||'Current character'}:buildTraitDetails(character,key,{...options,label:options.label||LABELS[key]});
 document.getElementById('trait-detail-category').textContent=key==='overview'?'CHARACTER DETAILS':model.category;
 document.getElementById('trait-detail-title').textContent=key==='overview'?model.fighter:model.title;
 const overview=document.getElementById('trait-detail-overview');overview.replaceChildren();overview.hidden=key!=='overview';
 const characterModel=key==='overview'?buildCharacterOverview(character):null;
 document.getElementById('trait-detail-intro').textContent=characterModel?characterModel.description:`${model.fighter} · Starting combat values`;
 if(characterModel)renderOverview(overview,characterModel);
 const metrics=document.getElementById('trait-detail-metrics');metrics.replaceChildren();
 if(key!=='overview')for(const row of model.rows)metrics.append(metric(row));
 const notes=document.getElementById('trait-detail-notes');notes.replaceChildren();if(key!=='overview')for(const note of model.notes)notes.append(node('li','',note));
 if(!dialog.open)dialog.showModal();else dialog.scrollTop=0;
 dialog.querySelector?.('.detail-body')?.scrollTo?.({top:0});
 selectedButton?.scrollIntoView?.({block:'nearest',inline:'center',behavior:'instant'});
}

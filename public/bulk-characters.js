(function(root){
 const tiers=['E','D','C','B','A','S','SS'];
 const tier=c=>{const n=c.summary?.total||0;return n>=3000?'SS':n>=2100?'S':n>=1500?'A':n>=1000?'B':n>=650?'C':n>=350?'D':'E';};
 function removalMatches(characters,{selectedTiers=[],rule='any',percent=''}={}){
  if(!selectedTiers.length&&rule==='any')return [];
  const value=Number(percent);if(!['any','unplayed','below','at-most','at-least'].includes(rule)||(!['any','unplayed'].includes(rule)&&(percent===''||!Number.isFinite(value)||value<0||value>100)))throw new Error('Enter a win rate from 0 to 100.');
  return characters.filter(c=>{if(selectedTiers.length&&!selectedTiers.includes(tier(c)))return false;const rate=root.ROSTER_VIEW.winRate(c);return rule==='any'||(rule==='unplayed'?rate===null:rate!==null&&(rule==='below'?rate<value:rule==='at-most'?rate<=value:rate>=value));});
 }
 function mount(host,hooks){
  if(!host)return;
  const e=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;},button=(text,cls='quiet')=>{const n=e('button',text,cls);n.type='button';return n;};
  const actions=e('div','','bulk-actions'),openRemove=button('Bulk remove'),openGenerate=button('Bulk generate'),panel=e('div','','bulk-panel'),message=e('p','','bulk-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');panel.hidden=true;actions.append(openRemove,openGenerate);host.append(actions,panel,message);
  let running=false,stop=false,job=null,preview=null,mode='',controls=[];
  panel.id=(host.id||'collection-bulk')+'-panel';
  const collapse=button('Collapse');
  const expanded=()=>{for(const [b,type]of [[openRemove,'remove'],[openGenerate,'generate']]){b.setAttribute('aria-controls',panel.id);b.setAttribute('aria-expanded',String(!panel.hidden&&mode===type));}};
  const close=()=>{if(running)return;panel.hidden=true;expanded();};
  collapse.onclick=close;expanded();
  const lock=value=>{running=value;for(const c of [openRemove,openGenerate,...controls])c.disabled=value||!!c.bulkDisabled?.();};
  const say=(text,error=false)=>{message.textContent=text;message.className='bulk-status'+(error?' error':'');};
  const api=async(action,body)=>{const response=await fetch('/api/characters'+action,{credentials:'same-origin',...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not update characters. Try again.');return data;};
  const refresh=async()=>{const data=await api('');hooks.change({roster:data.characters});};
  const start=()=>{hooks.start?.();lock(true);};
  const finish=async()=>{lock(false);hooks.finish?.();};
  const label=(text,input)=>{const n=e('label',text);n.append(input);return n;};
  function open(next){if(running)return;mode=next;panel.replaceChildren(collapse);panel.hidden=false;controls=[];preview=null;say('');if(next==='generate')generateForm();else removeForm();expanded();}
  function toggle(next){if(running)return;if(mode===next){if(panel.hidden){panel.hidden=false;expanded();}else close();}else open(next);}
  function generateForm(){
   const count=e('input');count.type='number';count.min='1';count.step='1';count.value=job?String(job.total):'128';count.id='bulk-generate-count';count.disabled=!!job;
   const tier=e('select');tier.id='bulk-generate-tier';for(const value of ['any',...tiers]){const option=e('option',value==='any'?'Any tier':'Tier '+value);option.value=value;tier.append(option);}tier.value=job?.tier||'any';tier.disabled=!!job;
   const go=button(job?'Resume generation':'Generate characters','button primary'),pause=button('Pause after this batch');pause.hidden=true;
   const note=e('p','New fighters use the standard wheels, random rarity, all 14 traits and a suggested name. Choose a tier for random fighters whose rolled stats fit that tier. Existing fighters stay in your roster.','dialog-note');
   const discard=button('End paused batch');discard.hidden=!job;
   panel.append(label('How many characters?',count),label('Fighter tier',tier),note,go,pause,discard);controls=[collapse,go,discard];
   go.onclick=async()=>{
    try{if(!job){const n=Number(count.value);if(!Number.isSafeInteger(n)||n<1)throw new Error('Enter a positive whole number of characters.');job={total:n,tier:tier.value,done:0,pending:null};}
     start();stop=false;count.disabled=tier.disabled=true;pause.hidden=false;pause.disabled=false;discard.hidden=true;
     while(job.done<job.total&&!stop){job.pending??=Array.from({length:Math.min(10,job.total-job.done)},()=>crypto.randomUUID());say(`Generating ${job.done} / ${job.total}…`);
      const data=await api('/bulk-generate',{ids:job.pending,tier:job.tier});hooks.change({characters:data.characters});job.done+=job.pending.length;job.pending=null;say(`Generated ${job.done} / ${job.total}.`);
     }
     if(job.done===job.total){const n=job.total;job=null;say(`Generated and saved ${n} random characters.`);}else say(`Paused at ${job.done} / ${job.total}. Resume to continue.`);
    }catch(error){say(error.message+(job?' Resume to retry the same batch.':''),true);}finally{if(running){try{await refresh();}catch(error){say(message.textContent+' '+error.message,true);}await finish();}pause.hidden=true;go.textContent=job?'Resume generation':'Generate characters';count.disabled=tier.disabled=!!job;discard.hidden=!job;}
   };
   pause.onclick=()=>{stop=true;pause.disabled=true;say('Pausing after the current batch…');};
   discard.onclick=()=>{job=null;open('generate');say('Paused batch ended. Already saved characters remain.');};
  }
  function removeForm(){
   const fieldset=e('fieldset'),legend=e('legend','Choose tiers (optional)'),choices=tiers.map(t=>{const input=e('input');input.type='checkbox';input.value=t;const l=label(t,input);l.className='bulk-tier';return {input,l};});fieldset.append(legend,...choices.map(c=>c.l));
   const rule=e('select');rule.id='bulk-remove-rule';for(const [value,text]of [['any','Any win rate'],['below','Win rate below'],['at-most','Win rate at most'],['at-least','Win rate at least'],['unplayed','Unplayed only']]){const o=e('option',text);o.value=value;rule.append(o);}rule.value='any';
   const percent=e('input');percent.type='number';percent.min='0';percent.max='100';percent.step='any';percent.value='50';percent.id='bulk-remove-percent';percent.disabled=true;
   const fields=e('div','','bulk-fields');fields.append(label('Win-rate rule',rule),label('Win rate (%)',percent));
   const note=e('p','Choose tiers, a win-rate rule, or both. When combined, both must match. Unplayed fighters are excluded from percentage rules. This applies to your entire saved roster.','dialog-note'),review=button('Preview removal','button secondary'),confirm=button('Remove these characters','button bulk-danger'),results=e('div','','bulk-preview');confirm.hidden=true;
   const history=e('p','Removal deletes saved fighters. Past tournament results, match records and championship history remain.','dialog-note');
   panel.append(fieldset,fields,note,review,results,confirm,history);percent.bulkDisabled=()=>['any','unplayed'].includes(rule.value);controls=[collapse,review,confirm,rule,percent,...choices.map(c=>c.input)];
   const invalidate=()=>{preview=null;results.replaceChildren();confirm.hidden=true;percent.disabled=['any','unplayed'].includes(rule.value);};for(const input of [...choices.map(c=>c.input),rule,percent])input.addEventListener('input',invalidate);
   review.onclick=async()=>{preview=null;results.replaceChildren();confirm.hidden=true;try{start();await refresh();preview=removalMatches(hooks.roster(),{selectedTiers:choices.filter(c=>c.input.checked).map(c=>c.input.value),rule:rule.value,percent:percent.value});results.replaceChildren(e('p',`${preview.length} characters match.`));
    if(preview.length){const detail=e('details'),summary=e('summary','Review names'),list=e('ul');for(const c of preview)list.append(e('li',`${c.name} · ${tier(c)} · ${root.ROSTER_VIEW.winRate(c)===null?'Unplayed':root.ROSTER_VIEW.winRate(c).toFixed(1)+'% wins'}`));detail.append(summary,list);results.append(detail);confirm.hidden=false;confirm.textContent=`Remove ${preview.length} characters`;say('Review the matching fighters, then confirm removal.');}else{confirm.hidden=true;say('No matches. Choose a tier or adjust the win-rate rule.');}
   }catch(error){say(error.message,true);}finally{if(running)await finish();}};
   confirm.onclick=async()=>{if(!preview?.length)return;let removed=0;const ids=preview.map(c=>c.id);try{start();for(let i=0;i<ids.length;i+=50){say(`Removing ${Math.min(i,ids.length)} / ${ids.length}…`);const data=await api('/bulk-remove',{ids:ids.slice(i,i+50)});removed+=data.deletedIds.length;hooks.change({deletedIds:data.deletedIds});}say(`Removed ${removed} saved characters.`);}catch(error){say(`${removed} removed. ${error.message} Preview again to review the remaining fighters.`,true);}finally{preview=null;results.replaceChildren();confirm.hidden=true;if(running){try{await refresh();}catch(error){say(message.textContent+' '+error.message,true);}await finish();}}};
  }
  openGenerate.onclick=()=>toggle('generate');openRemove.onclick=()=>toggle('remove');
  return {open,get running(){return running;}};
 }
 root.BULK_CHARACTERS={removalMatches,mount};
})(globalThis);

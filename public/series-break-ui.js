export function showSeriesBreak(host,{title,score,result,roster=[],lineup=[],tactic='balanced',tactics=[],canCoach=false,allowLeave=true}){
 const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
 host.hidden=false;host.replaceChildren();host.setAttribute('aria-label','Between games');
 host.append(node('p',title,'eyebrow'),node('h3',`Series ${score.join('–')}`),node('p',`${result.seconds}s · ${result.reason}`,'muted'));
 const boxes=[],selection=node('fieldset'),legend=node('legend',`Choose ${lineup.length} starters`),select=node('select');select.setAttribute('aria-label','Next game tactic');
 if(canCoach){
  selection.append(legend);for(const f of roster){const label=node('label',`${f.name} · ${f.role} · OVR ${f.ovr}`),box=node('input');box.type='checkbox';box.checked=lineup.includes(f.id);box.value=f.id;box.setAttribute('aria-label',f.name);label.prepend(box);selection.append(label);boxes.push(box);}
  for(const [value,label]of tactics){const option=node('option',label);option.value=value;select.append(option);}select.value=tactic;const label=node('label','Tactic');label.append(select);host.append(selection,label);
 }
 const actions=node('div','','team-actions'),play=node('button','Play next game','button primary'),leave=node('button','Return to setup','button secondary'),hint=node('p','','muted');play.type=leave.type='button';leave.hidden=!allowLeave;
 const update=()=>{const chosen=boxes.filter(b=>b.checked).length;play.disabled=canCoach&&chosen!==lineup.length;hint.textContent=play.disabled?`Select exactly ${lineup.length} starters.`:'Both teams return at full health for the next game.';};boxes.forEach(b=>b.onchange=update);update();actions.append(play,leave);host.append(hint,actions);
 return new Promise(resolve=>{const finish=value=>{host.hidden=true;host.replaceChildren();resolve(value);};play.onclick=()=>finish(canCoach?{lineup:boxes.filter(b=>b.checked).map(b=>b.value),tactic:select.value}:{});leave.onclick=()=>finish(null);});
}

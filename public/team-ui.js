// 3v3 / 5v5 exhibition: build two teams from saved fighters or generated S/A squads, then watch or simulate.
import {ROLE_LABELS,teamRole} from './team-roles.js';
import {randomTeam} from './team-generation.js';
import {TEAM_TACTICS,simulateTeam} from './combat-team.js';
import {TEAM_MAPS} from './team-maps.js';
const TACTIC_LABELS={balanced:'Balanced','protect-carry':'Protect the carry','focus-healer':'Focus their healer',aggressive:'All-out aggression',defensive:'Hold the line'};
const ROLE_GLYPH={tank:'⛨',healer:'✚',controller:'◎',damage:'✦'};
const scripts=new Map();
const loadScript=src=>{if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{scripts.delete(src);reject(new Error('Could not load the fighter generator.'));};document.head.append(s);}));return scripts.get(src);};
// The wheel data and luck rules are classic scripts; load them only when a random team is requested.
export async function generator(){
 await loadScript('/data.js');await loadScript('/luck.js');
 /* global WHEEL_DATA, WHEEL_LUCK, suggestFantasyName */
 // names.js draws from a global randomIndex, which the Forge page provides; supply the wheel's here.
 globalThis.randomIndex??=WHEEL_LUCK.randomIndex;await loadScript('/names.js');
 return {pools:WHEEL_DATA,luck:WHEEL_LUCK,name:traits=>suggestFantasyName(traits)};
}
export function mountTeamBattles(host,hooks){
 const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
 const button=(text,className='quiet')=>{const b=el('button',text,className);b.type='button';return b;};
 const select=(options,value)=>{const s=el('select');for(const [v,t]of options){const o=el('option',t);o.value=v;s.append(o);}if(value!==undefined)s.value=value;return s;};
 let size=3,running=false;const generated=new Map(),characters=new Map(),sides=[{ids:[],tactic:'balanced'},{ids:[],tactic:'balanced'}];
 const heading=el('h2'),eyebrow=el('p','Team battle','eyebrow'),info=button('i','info-button');info.dataset.helpOpen='teams';info.setAttribute('aria-label','How team battles work');
 const head=el('div','','mode-head'),headText=el('div');headText.append(eyebrow,heading);head.append(headText,info);
 const intro=el('p','All fighters share the arena. Tanks draw fire, healers keep allies standing, controllers lock down threats.','team-intro');
 const board=el('div','','team-board'),status=el('p','','team-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const conditions=el('fieldset','','conditions'),legend=el('legend','Battle conditions'),row=el('div','','field-row');
 const labelled=(text,control)=>{const l=el('label',text);l.append(control);return l;};
 const format=select([['1','Bo1'],['3','Bo3']],'1'),time=select([['random','Random each game'],['day','Day'],['dawn','Dawn'],['dusk','Dusk'],['night','Night']],'random'),weather=select([['random','Random each game'],['clear','Clear'],['rain','Rain'],['frost','Frost'],['storm','Storm']],'random'),ground=select([['random','Random each game'],['stone','Stone'],['water','Shallow water']],'random'),map=select([['random','Random each game'],...TEAM_MAPS.map(m=>[m.id,m.label])],'random');
 row.append(labelled('Match format',format),labelled('Time of day',time),labelled('Weather',weather),labelled('Ground',ground),labelled('Map',map));conditions.append(legend,row);
 const actions=el('div','','team-actions'),watch=button('Watch battle','button primary start-button'),quick=button('Quick result','button secondary');actions.append(watch,quick);
 const results=el('section','','team-results');results.hidden=true;
 host.append(head,intro,board,conditions,actions,status,results);
 const say=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 const lookup=async id=>{if(generated.has(id))return generated.get(id);if(characters.has(id))return characters.get(id);const c=await hooks.character(id);characters.set(id,c);return c;};
 const roleOf=c=>c?teamRole(c).role:null;
 function renderBoard(){
  board.replaceChildren();
  sides.forEach((side,team)=>{
   const section=el('section','',`team-side ${team?'red':'blue'}`),top=el('div','','team-side-head'),title=el('h3',team?'Red team':'Blue team'),roll=button(`Random S/A ${size}v${size}`),tactic=select(TEAM_TACTICS.map(t=>[t,TACTIC_LABELS[t]]),side.tactic);
   tactic.setAttribute('aria-label',(team?'Red':'Blue')+' team tactic');tactic.onchange=()=>{side.tactic=tactic.value;};roll.onclick=()=>randomize(team);
   top.append(title,roll);const tacticLabel=labelled('Tactic',tactic);tacticLabel.className='team-tactic';
   const list=el('ol','','team-slots');
   for(let i=0;i<size;i++){
    const slot=el('li','','team-slot'),choice=select([['','Choose a fighter'],...[...generated.values()].filter(c=>c.team===team).map(c=>[c.id,`${c.name} · ${c.summary.tier} · generated`]),...hooks.roster().map(c=>[c.id,`${c.name} · ${c.summary.tier}`])],side.ids[i]??'');
    choice.setAttribute('aria-label',`${team?'Red':'Blue'} fighter ${i+1}`);const badge=el('span','','team-slot-role');
    const paint=async()=>{badge.textContent='';badge.removeAttribute('data-role');const id=choice.value;if(!id)return;try{const role=roleOf(await lookup(id));badge.dataset.role=role;badge.textContent=`${ROLE_GLYPH[role]} ${ROLE_LABELS[role]}`;}catch(e){say(e.message,true);}};
    choice.onchange=()=>{side.ids[i]=choice.value||undefined;paint();};paint();
    slot.append(el('span',String(i+1),'team-slot-no'),choice,badge);list.append(slot);
   }
   section.append(top,list,tacticLabel);board.append(section);
  });
 }
 async function randomize(team){
  if(running)return;say('Generating fighters…');
  try{const kit=await generator(),seed=crypto.getRandomValues(new Uint32Array(1))[0];for(const [id,c]of generated)if(c.team===team)generated.delete(id);
   const squad=randomTeam(kit.pools,kit.luck,{size,seed,prefix:team?'red':'blue',name:kit.name});for(const c of squad){c.team=team;generated.set(c.id,c);}
   sides[team].ids=squad.map(c=>c.id);renderBoard();say(`${team?'Red':'Blue'} team generated: ${squad.map(c=>`${c.name} (${c.summary.tier})`).join(', ')}.`);
  }catch(e){say(e.message,true);}
 }
 async function teams(){
  const ids=sides.map(s=>Array.from({length:size},(_,i)=>s.ids[i]));
  if(ids.some(list=>list.some(id=>!id)))throw new Error(`Fill all ${size} slots on both teams.`);
  const all=ids.flat();if(new Set(all).size!==all.length)throw new Error('A fighter can only appear once per battle.');
  return Promise.all(ids.map(list=>Promise.all(list.map(lookup))));
 }
 function options(){return {conditions:{time:time.value,weather:weather.value,ground:ground.value,map:map.value},tactics:sides.map(s=>s.tactic)};}
 async function play(watching){
  if(running||hooks.blocked())return;const squads=await teams(),bestOf=Number(format.value),need=Math.ceil(bestOf/2),seed=crypto.getRandomValues(new Uint32Array(1))[0],games=[],score=[0,0];
  running=true;hooks.busy(true);watch.disabled=quick.disabled=true;say(watching?'Battle in progress…':'Simulating…');
  try{
   while(score[0]<need&&score[1]<need){const game=games.length,gameSeed=(seed+game*65537)>>>0,caption=`${size}v${size} exhibition · Bo${bestOf} · game ${game+1} · ${score.join('–')}`;
    const result=watching?await hooks.watch(squads,gameSeed,{...options(),caption}):simulateTeam(squads,gameSeed,options());games.push(result);score[result.winnerTeam]++;}
   showResults(squads,games,score);say(`${score[0]>score[1]?'Blue':'Red'} team wins ${score[0]}–${score[1]}.`);
  }finally{running=false;hooks.busy(false);watch.disabled=quick.disabled=false;}
 }
 function showResults(squads,games,score){
  results.hidden=false;results.replaceChildren();const names=new Map(squads.flat().map(c=>[c.id,c.name])),totals=new Map();
  for(const game of games)for(const f of game.fighters){const t=totals.get(f.id)??{...f,damage:0,healing:0,kills:0,deaths:0,ccSeconds:0};for(const k of ['damage','healing','kills','deaths','ccSeconds'])t[k]+=f[k];totals.set(f.id,t);}
  const last=games.at(-1),summary=el('div','','team-score');summary.append(el('span',String(score[0]),'blue'),el('span','–'),el('span',String(score[1]),'red'));
  const caption=el('p',`${games.length} game${games.length===1?'':'s'} · last: ${last.reason} after ${last.seconds}s`,'muted');
  const wrap=el('div','','table-scroll'),table=el('table'),thead=el('thead'),hr=el('tr');for(const h of ['Fighter','Role','DMG','Heal','KO','Down','CC s'])hr.append(el('th',h));thead.append(hr);const body=el('tbody');
  for(const f of totals.values()){const tr=el('tr','',f.team?'red':'blue');tr.append(el('td',names.get(f.id)),el('td',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]}`),el('td',String(f.damage)),el('td',String(f.healing)),el('td',String(f.kills)),el('td',String(f.deaths)),el('td',String(Math.round(f.ccSeconds*10)/10)));body.append(tr);}
  table.append(thead,body);wrap.append(table);results.append(el('h3','Battle report'),summary,caption,wrap);
 }
 watch.onclick=()=>play(true).catch(e=>say(e.message,true));quick.onclick=()=>play(false).catch(e=>say(e.message,true));
 return {show(next){if(next!==size){size=next;for(const side of sides)side.ids=side.ids.slice(0,size);results.hidden=true;}heading.textContent=`${size}v${size} exhibition`;renderBoard();}};
}

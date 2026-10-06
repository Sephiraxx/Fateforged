// Team league screen: found a 3v3 / 5v5 league, watch the AI coaches draft, and inspect teams.
import * as LEAGUE from './team-league.js';
import {poolFighter} from './team-generation.js';
import {generator} from './team-ui.js';
import {ROLE_LABELS} from './team-roles.js';
const ROLE_GLYPH={tank:'⛨',healer:'✚',controller:'◎',damage:'✦'};
const money=n=>`${n.toFixed(1)}M`;
export function mountTeamLeague(host,hooks){
 const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
 const button=(text,className='quiet')=>{const b=el('button',text,className);b.type='button';return b;};
 let size=3,world=null,revision=0,busy=false,selected=null;
 const status=el('p','','team-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const body=el('div','','team-league');host.append(status,body);
 const say=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 async function api(method,payload){
  const response=await fetch('/api/teams'+(method==='GET'?'?format='+size:''),{method,credentials:'same-origin',headers:{'content-type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
  let data;try{data=await response.json();}catch{throw new Error('Storage did not respond. Try again.');}
  if(!response.ok){const error=new Error(data.error||'Could not save the team league.');error.status=response.status;throw error;}
  return data;
 }
 const accept=data=>{world=data.world;revision=data.revision;};
 async function load(){try{accept(await api('GET'));render();}catch(e){say(e.message,true);}}
 async function command(payload){
  if(busy)return;busy=true;hooks.busy(true);render();
  try{accept(await api('POST',{...payload,format:size,revision,operationId:crypto.randomUUID()}));}
  catch(e){if(e.status===409){await load();say(e.message,true);}else throw e;}
  finally{busy=false;hooks.busy(false);render();}
 }
 async function found(teams){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{
   const kit=await generator(),seed=crypto.getRandomValues(new Uint32Array(1))[0],plan=LEAGUE.poolPlan(size,teams,seed),fighters=[];
   // Generate in small chunks so the page keeps painting the scouting progress.
   for(let i=0;i<plan.length;i++){fighters.push(poolFighter(kit.pools,kit.luck,plan[i],i,seed,kit.name));if(i%6===5){say(`Scouting fighters… ${i+1} / ${plan.length}`);await new Promise(r=>setTimeout(r,0));}}
   say('Founding the league…');busy=false;
   await command({action:'start',worldId:crypto.randomUUID(),teams,seed,fighters:fighters.map(f=>({id:f.id,name:f.name,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}}))});
   say(`${teams}-team ${size}v${size} league founded with ${plan.length} fighters. The coaches are ready to draft.`);
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 const draft=count=>command({action:'draft',count}).then(()=>{if(world?.draft.complete)say('Draft complete. Every roster is set and cap-legal.');}).catch(e=>say(e.message,true));
 function fighterRow(f,extra=[]){const tr=el('tr','',`role-${f.role}`);tr.append(el('td',f.name),el('td',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]}`),el('td',f.summary.tier),el('td',String(f.ovr),'ovr'),el('td',money(f.salary)),...extra.map(x=>el('td',x)));return tr;}
 function table(headers,rows,caption){const wrap=el('div','','table-scroll'),t=el('table','','team-league-table');if(caption)t.append(el('caption',caption));const head=el('thead'),hr=el('tr');for(const h of headers)hr.append(el('th',h));head.append(hr);const tb=el('tbody');tb.append(...rows);t.append(head,tb);wrap.append(t);return wrap;}
 function renderSetup(){
  const card=el('section','','team-league-setup'),pick=el('div','','team-size-pick');
  card.append(el('h3',`Found a ${size}v${size} league`),el('p',`AI head coaches draft from a fresh pool of S and A tier fighters (rare SS). Rosters hold ${LEAGUE.FORMATS[size].rosterSize} fighters; every pick costs salary under a shared cap.`,'muted'));
  for(const teams of LEAGUE.LEAGUE_SIZES){const b=button(`${teams} teams`,'button secondary');b.disabled=busy;b.onclick=()=>found(teams);const label=el('span',`${LEAGUE.poolSize(size,teams)} fighters · ${teams===32?'2 conferences × 4 divisions':teams===16?'2 conferences × 2 divisions':'2 conferences'}`,'muted');const option=el('div','','team-size-option');option.append(b,label);pick.append(option);}
  card.append(pick);body.append(card);
 }
 function teamCard(team){
  const card=el('button','','team-card');card.type='button';card.dataset.personality=team.coach.personality;if(selected===team.id)card.classList.add('active');
  const pay=LEAGUE.payroll(world,team),bar=el('span','','cap-bar'),fill=el('span');fill.style.width=Math.min(100,pay/world.settings.salaryCap*100)+'%';bar.append(fill);
  const roster=el('span',team.roster.map(id=>ROLE_GLYPH[world.fighters[id].role]).join(' ')||'—','team-card-roster');
  card.append(el('strong',team.name),el('span',`${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label}`,'team-card-coach'),roster,el('span',`${money(pay)} / ${money(world.settings.salaryCap)} · ${team.roster.length}/${world.settings.rosterSize}`,'team-card-pay'),bar);
  card.onclick=()=>{selected=selected===team.id?null:team.id;render();};return card;
 }
 function renderTeams(){
  const wrap=el('section','','team-conferences');
  for(const conference of world.conferences){const c=el('div','','team-conference');c.append(el('h3',conference.name+' conference'));for(const division of conference.divisions){const d=el('div','','team-division');d.append(el('h4',division.name),...division.teams.map(id=>teamCard(LEAGUE.teamById(world,id))));c.append(d);}wrap.append(c);}
  body.append(wrap);
 }
 function renderTeamDetail(){
  const team=LEAGUE.teamById(world,selected);if(!team)return;const section=el('section','','team-detail'),starters=new Set(team.lineup.length?team.lineup:LEAGUE.bestLineup(world,team));
  section.append(el('h3',team.name),el('p',`Head coach ${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label} · ${team.conference} ${team.division} · cap space ${money(LEAGUE.capSpace(world,team))}`,'muted'));
  const rows=team.roster.map(id=>world.fighters[id]).sort((a,b)=>starters.has(b.id)-starters.has(a.id)||b.ovr-a.ovr).map(f=>fighterRow(f,[starters.has(f.id)?'Starter':'Bench']));
  section.append(table(['Fighter','Role','Tier','OVR','Salary','Lineup'],rows,`Roster · team OVR ${LEAGUE.teamOverall(world,team)}`));
  if(world.draft.complete){
   const opponents=world.teams.filter(t=>t.id!==team.id),choice=el('select');choice.setAttribute('aria-label','Scrimmage opponent');for(const t of opponents){const o=el('option',`${t.name} · OVR ${LEAGUE.teamOverall(world,t)}`);o.value=t.id;choice.append(o);}
   const watch=button('Watch scrimmage','button primary');watch.disabled=busy||hooks.blocked();
   watch.onclick=async()=>{try{const rival=LEAGUE.teamById(world,choice.value),squads=[team,rival].map(t=>LEAGUE.starters(world,t)),result=await hooks.watch(squads,crypto.getRandomValues(new Uint32Array(1))[0],{conditions:{time:'random',weather:'random',ground:'random'},tactics:['balanced','balanced'],caption:`Scrimmage · ${team.name} vs ${rival.name}`});say(`${result.winnerTeam?rival.name:team.name} win the scrimmage (${result.reason}).`);}catch(e){say(e.message,true);}};
   const row=el('div','','team-scrimmage');row.append(choice,watch);section.append(el('h4','Scrimmage'),row);
  }
  body.append(section);
 }
 function renderDraft(){
  const d=world.draft,total=LEAGUE.totalPicks(world),made=d.picks.length,panel=el('section','','team-draft');
  if(!d.complete){
   const slot=LEAGUE.draftSlot(world),team=LEAGUE.teamById(world,slot.team),clock=el('div','','draft-clock');
   clock.append(el('span',`Round ${slot.round} · pick ${slot.pick} · ${made+1} of ${total}`,'eyebrow'),el('strong',`On the clock: ${team.name}`),el('span',`${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label} · cap space ${money(LEAGUE.capSpace(world,team))}`,'muted'));
   const actions=el('div','','draft-actions'),remainingRound=world.teams.length-slot.pick+1;
   for(const [text,count,cls]of [['Sim next pick',1,'button primary'],['Sim round',remainingRound,'button secondary'],['Sim full draft',total-made,'quiet']]){const b=button(text,cls);b.disabled=busy||hooks.blocked();b.onclick=()=>draft(count);actions.append(b);}
   panel.append(clock,actions);
  }else panel.append(el('p','Draft complete. Season play and playoffs arrive with the next update; scrimmage any two teams below.','draft-done'));
  const recent=d.picks.slice(-10).reverse().map(p=>{const f=world.fighters[p.fighter],tr=el('tr','',`role-${f.role}`);tr.append(el('td',`${p.round}.${p.pick}`),el('td',LEAGUE.teamById(world,p.team).name),el('td',f.name),el('td',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]}`),el('td',String(f.ovr),'ovr'),el('td',money(f.salary)));return tr;});
  const best=LEAGUE.available(world).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,12).map(f=>fighterRow(f));
  const grid=el('div','','draft-grid');
  if(recent.length)grid.append(table(['Pick','Team','Fighter','Role','OVR','Salary'],recent,'Latest picks'));
  grid.append(table(['Fighter','Role','Tier','OVR','Salary'],best,d.complete?`Free agents (${LEAGUE.available(world).length})`:'Best available'));
  panel.append(grid);body.append(panel);
 }
 function render(){
  body.replaceChildren();
  if(!world){renderSetup();return;}
  const head=el('div','','team-league-head'),info=el('div');info.append(el('p',`Season ${world.season} · ${world.teams.length} teams`,'eyebrow'),el('h3',world.draft.complete?'Rosters set':'Draft day'));
  const meta=el('p',`Salary cap ${money(world.settings.salaryCap)} · ${world.settings.rosterSize}-fighter rosters · ${Object.keys(world.fighters).length} scouted fighters`,'muted');info.append(meta);
  const reset=button('Delete league','quiet danger');reset.disabled=busy;reset.onclick=()=>{if(confirm(`Delete this ${size}v${size} league and all its fighters?`))command({action:'reset'}).then(()=>say('League deleted.')).catch(e=>say(e.message,true));};
  head.append(info,reset);body.append(head);renderDraft();renderTeams();if(selected)renderTeamDetail();
 }
 return {show(next){if(next!==size){size=next;world=null;selected=null;say('');}load();}};
}

// Team league screen: found a 3v3 / 5v5 league, watch the AI coaches draft, and inspect teams.
import * as LEAGUE from './team-league.js';
import {poolFighter} from './team-generation.js';
import {generator} from './team-ui.js';
import {ROLE_LABELS} from './team-roles.js';
import {createSimulationPool} from './simulation-client.js';
import {compactTeamResult} from './team-sim-worker.js';
const ROLE_GLYPH={tank:'⛨',healer:'✚',controller:'◎',damage:'✦'};
const money=n=>`${n.toFixed(1)}M`;
export function mountTeamLeague(host,hooks){
 const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
 const button=(text,className='quiet')=>{const b=el('button',text,className);b.type='button';return b;};
 let size=3,world=null,revision=0,busy=false,selected=null,stopping=false;
 const pool=createSimulationPool(new URL('./team-sim-worker.js',import.meta.url));
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
 // A command owns the busy state unless a longer run (simulation batches) already holds it.
 async function command(payload,inRun=false){
  if(busy&&!inRun)return;const owner=!busy;if(owner){busy=true;hooks.busy(true);render();}
  try{accept(await api('POST',{...payload,format:size,revision,operationId:crypto.randomUUID()}));}
  catch(e){if(e.status===409){await load();say(e.message,true);if(inRun)throw e;}else throw e;}
  finally{if(owner){busy=false;hooks.busy(false);}render();}
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
 const name=id=>LEAGUE.teamById(world,id).name;
 // Season play: simulate in the worker pool, then let the server validate and record each match in order.
 async function simulate(matches){const games=await Promise.all(matches.map(m=>pool.simulate({match:m,teams:LEAGUE.squads(world,m)})));await command({action:'record',results:matches.map((m,i)=>({matchId:m.id,games:games[i]}))},true);}
 const weekLeft=()=>{const next=LEAGUE.upcoming(world,1)[0];return next?LEAGUE.upcoming(world).filter(m=>m.week===next.week).length:0;};
 async function run(mode){
  if(busy||hooks.blocked())return;stopping=false;const phase=world.phase;busy=true;hooks.busy(true);render();
  try{
   do{
    const matches=world.phase==='season'?LEAGUE.upcoming(world,mode==='one'?1:weekLeft()):LEAGUE.upcoming(world,mode==='one'?1:Infinity);if(!matches.length)break;
    say(world.phase==='season'?`Simulating week ${matches[0].week}…`:`Simulating the ${world.playoffs.rounds.at(-1).name}…`);await simulate(matches);
   }while(!stopping&&(mode==='season'&&world.phase==='season'||mode==='all'&&world.phase!=='complete'));
   say(world.phase==='complete'?`${name(world.playoffs.champion)} win the Forgefire Crown!`:world.phase==='playoffs'&&phase==='season'?'Regular season complete. The playoffs are set.':'Results saved.');
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 async function watchNext(){
  if(busy||hooks.blocked())return;const [m]=LEAGUE.upcoming(world,1);if(!m)return;const teams=LEAGUE.squads(world,m),need=Math.ceil(m.bestOf/2),games=[],score=[0,0];busy=true;hooks.busy(true);render();
  try{while(score[0]<need&&score[1]<need){const label=m.kind==='regular'?`Week ${m.week}`:LEAGUE.ROUND_NAMES[m.round]+` · game ${games.length+1}`,result=await hooks.watch(teams,(m.seed+games.length*65537)>>>0,{conditions:m.conditions,tactics:['balanced','balanced'],caption:`${label} · ${name(m.home)} vs ${name(m.away)} · ${score.join('–')}`});games.push(compactTeamResult(result));score[result.winnerTeam]++;}}
  catch(e){busy=false;hooks.busy(false);say(e.message,true);render();return;}
  busy=false;hooks.busy(false);await command({action:'record',results:[{matchId:m.id,games}]}).catch(e=>say(e.message,true));say(`${name(score[0]>score[1]?m.home:m.away)} win ${Math.max(...score)}–${Math.min(...score)}.`);
 }
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
  const recordText=world.results?.length?` · ${LEAGUE.standings(world,[team.id])[0].wins}–${LEAGUE.standings(world,[team.id])[0].losses}`:'';
  card.append(el('strong',team.name+recordText),el('span',`${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label}`,'team-card-coach'),roster,el('span',`${money(pay)} / ${money(world.settings.salaryCap)} · ${team.roster.length}/${world.settings.rosterSize}`,'team-card-pay'),bar);
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
  }
  const recent=d.picks.slice(-10).reverse().map(p=>{const f=world.fighters[p.fighter],tr=el('tr','',`role-${f.role}`);tr.append(el('td',`${p.round}.${p.pick}${p.exception?' · min. exception':''}`),el('td',LEAGUE.teamById(world,p.team).name),el('td',f.name),el('td',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]}`),el('td',String(f.ovr),'ovr'),el('td',money(f.salary)));return tr;});
  const best=LEAGUE.available(world).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,12).map(f=>fighterRow(f));
  const grid=el('div','','draft-grid');
  if(recent.length)grid.append(table(['Pick','Team','Fighter','Role','OVR','Salary'],recent,'Latest picks'));
  grid.append(table(['Fighter','Role','Tier','OVR','Salary'],best,d.complete?`Free agents (${LEAGUE.available(world).length})`:'Best available'));
  panel.append(grid);body.append(panel);
 }
 function seasonActions(){
  const actions=el('div','','draft-actions'),list=world.phase==='ready'?[['Start season',()=>command({action:'startSeason'}).then(()=>say(`Season ${world.season} is underway: ${world.schedule.length} weeks, then the playoffs.`)).catch(e=>say(e.message,true)),'button primary']]:world.phase==='season'?[['Sim next game',()=>run('one'),'button secondary'],['Sim week',()=>run('week'),'button primary'],['Sim to playoffs',()=>run('season'),'quiet'],['Watch next game',watchNext,'quiet']]:world.phase==='playoffs'?[['Sim next series',()=>run('one'),'button secondary'],['Sim round',()=>run('round'),'button primary'],['Sim rest of playoffs',()=>run('all'),'quiet'],['Watch next series',watchNext,'quiet']]:[];
  for(const [text,fn,cls]of list){const b=button(text,cls);b.disabled=busy||hooks.blocked();b.onclick=fn;actions.append(b);}
  if(busy&&world.phase!=='ready'){const stop=button('Stop after this batch','quiet danger');stop.disabled=stopping;stop.onclick=()=>{stopping=true;stop.disabled=true;};actions.append(stop);}
  return actions;
 }
 function renderWeek(){
  const next=LEAGUE.upcoming(world,1)[0],week=next?.week??world.schedule.length,games=world.schedule[week-1].games,results=new Map(world.results.map(r=>[r.id,r]));
  const rows=games.map(g=>{const r=results.get(g.id),tr=el('tr','',r?'played':'');tr.append(el('td',name(g.home),r?.winner===g.home?'won':''),el('td',r?`${r.hp[0]}%–${r.hp[1]}%`:'vs','score'),el('td',name(g.away),r?.winner===g.away?'won':''));return tr;});
  return table(['Home','Health','Away'],rows,`Week ${week} of ${world.schedule.length}`);
 }
 function renderStandings(){
  const wrap=el('section','','team-standings'),seeds=world.playoffs?.seeds;
  for(const conference of LEAGUE.divisionStandings(world)){const c=el('div','','team-conference');c.append(el('h3',conference.name+' conference'));
   for(const division of conference.divisions){const rows=division.rows.map(r=>{const seed=seeds?.[conference.name]?.indexOf(r.id),tr=el('tr','',seed>=0?'seeded':'');tr.append(el('td',(seed>=0?`#${seed+1} `:'')+r.team),el('td',String(r.wins)),el('td',String(r.losses)),el('td',r.pct.toFixed(3).replace(/^0/,'')),el('td',r.division.join('–')),el('td',r.conference.join('–')),el('td',(r.margin>0?'+':'')+r.margin),el('td',r.streak||'—'));return tr;});
    c.append(table(['Team','W','L','PCT','DIV','CONF','±HP','STRK'],rows,division.name));}
   wrap.append(c);}
  return wrap;
 }
 function renderPlayoffs(){
  const wrap=el('section','','team-playoffs');wrap.append(el('h3','Playoffs'));const grid=el('div','','playoff-rounds');
  for(const round of world.playoffs.rounds){const col=el('div','','playoff-round');col.append(el('h4',round.name));
   for(const s of round.series){const wins=[0,1].map(i=>s.games.filter(g=>g.winnerTeam===i).length),card=el('div','',`playoff-series${s.winner?' done':''}`),seedOf=id=>{const conf=LEAGUE.teamById(world,id).conference;return world.playoffs.seeds[conf].indexOf(id)+1;};
    for(const [i,id]of [[0,s.home],[1,s.away]]){const row=el('div','',`playoff-team${s.winner===id?' winner':''}`);row.append(el('span',`#${seedOf(id)}`,'seed'),el('span',name(id)),el('strong',String(wins[i])));card.append(row);}
    card.append(el('small',`Bo${s.bestOf}`));col.append(card);}
   grid.append(col);}
  wrap.append(grid);return wrap;
 }
 function renderChampion(){
  const title=world.titles.at(-1),mvp=title.mvp&&world.fighters[title.mvp],stats=mvp&&world.stats[mvp.id],banner=el('section','','champion-banner');
  banner.append(el('p',`Season ${title.season} · Forgefire Crown`,'eyebrow'),el('h3',`👑 ${name(title.champion)}`),el('p',`Defeated ${name(title.runnerUp)} in the final.`,'muted'));
  if(mvp)banner.append(el('p',`MVP: ${mvp.name} (${name(mvp.team)}) · ${stats.damage} damage · ${stats.healing} healing · ${stats.kills} KOs · ${stats.ccSeconds}s control`,'mvp'));
  banner.append(el('p','The offseason (value updates, keep or release, trades and the rookie draft) arrives with the next update.','muted'));return banner;
 }
 function renderLeaders(){
  const wrap=el('div','','draft-grid');for(const [key,label]of [['impact','Impact'],['damage','Damage'],['healing','Healing'],['kills','KOs']]){const rows=LEAGUE.leaders(world,key).map(x=>{const tr=el('tr','',`role-${x.fighter.role}`);tr.append(el('td',x.fighter.name),el('td',name(x.fighter.team)),el('td',String(x.value)));return tr;});if(rows.length)wrap.append(table(['Fighter','Team',label],rows,label+' leaders'));}
  return wrap;
 }
 function render(){
  body.replaceChildren();
  if(!world){renderSetup();return;}
  const phaseLabel={draft:'Draft day',ready:'Rosters set',season:'Regular season',playoffs:'Playoffs',complete:'Season complete'}[world.phase];
  const head=el('div','','team-league-head'),info=el('div');info.append(el('p',`Season ${world.season} · ${world.teams.length} teams`,'eyebrow'),el('h3',phaseLabel));
  const meta=el('p',`Salary cap ${money(world.settings.salaryCap)} · ${world.settings.rosterSize}-fighter rosters · ${Object.keys(world.fighters).length} scouted fighters`,'muted');info.append(meta);
  const reset=button('Delete league','quiet danger');reset.disabled=busy;reset.onclick=()=>{if(confirm(`Delete this ${size}v${size} league and all its fighters?`))command({action:'reset'}).then(()=>say('League deleted.')).catch(e=>say(e.message,true));};
  head.append(info,reset);body.append(head);
  if(world.phase==='draft'){renderDraft();renderTeams();if(selected)renderTeamDetail();return;}
  const season=el('section','','team-draft');season.append(seasonActions());
  if(world.phase==='complete')season.prepend(renderChampion());
  if(world.phase==='season')season.append(renderWeek());
  body.append(season);
  if(world.playoffs)body.append(renderPlayoffs());
  if(world.results?.length){body.append(renderStandings(),renderLeaders());}
  const recap=el('details','','module draft-recap');recap.append(el('summary','Draft recap & free agents'));const holder=body;const before=body.childNodes.length;renderDraft();const draftPanel=body.lastChild;if(body.childNodes.length>before){recap.append(draftPanel);holder.append(recap);}
  renderTeams();if(selected)renderTeamDetail();
 }
 return {show(next){if(next!==size){size=next;world=null;selected=null;say('');}load();}};
}

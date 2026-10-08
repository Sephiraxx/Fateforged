import {nextAuditBundle,auditBaseKey} from './balance-analysis.js';
import {balanceLabel} from './team-balance.js';
import {seriesGameOptions,seriesScore} from './team-series.js';
// Team league screen: found a 2v2 / 3v3 / 5v5 league, draft, play the season and run the offseason, as a spectator or a coach.
import * as LEAGUE from './team-league.js';
import {poolFighter} from './team-generation.js';
import {generator} from './team-ui.js';
import {ROLE_LABELS} from './team-roles.js';
import {createSimulationPool} from './simulation-client.js';
import {compactTeamResult} from './team-sim-worker.js';
import {openTraitDetails} from './trait-detail-ui.js';
import {STAT_KEYS} from './trait-details.js';
const ROLE_GLYPH={tank:'⛨',healer:'✚',controller:'◎',damage:'✦'};
const money=n=>`${n.toFixed(1)}M`;
const TACTIC_TEXT={balanced:['Balanced','Default target choice.'],'protect-carry':['Protect the carry','Peel harder for teammates under attack.'],'focus-healer':['Focus their healer','Prioritise enemy healers.'],aggressive:['All-out aggression','Chase wounded targets across the arena.'],defensive:['Hold the line','Fight near your own side instead of chasing.']};
const wire=f=>({id:f.id,name:f.name,traits:f.traits,summary:{generationVersion:f.summary.generationVersion??3,wheelRarity:f.summary.wheelRarity}});
export function mountTeamLeague(host,hooks){
 const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
 const button=(text,className='quiet')=>{const b=el('button',text,className);b.type='button';return b;};
 let loadRequest=0,size=3,world=null,revision=0,busy=false,selected=null,stopping=false,partner=null,weekView=null,poolRole='all',poolSort='ovr',poolPage=0,recapOpen=false,resultsOpen=false,historyOpen=false,patchesOpen=false,unsavedGame=null;
 const pool=createSimulationPool(new URL('./team-sim-worker.js',import.meta.url));
 const auditPool=createSimulationPool(new URL('./balance-sim-worker.js',import.meta.url)),patchSeasonsOpen=new Set(),championSeasonsOpen=new Set();
 const status=el('p','','team-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const body=el('div','','team-league'),dialog=el('dialog','','fighter-dialog');dialog.setAttribute('aria-label','Fighter details');host.append(status,body,dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 const say=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 async function api(method,payload){
  const response=await fetch('/api/teams'+(method==='GET'?'?format='+size:''),{method,credentials:'same-origin',headers:{'content-type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
  let data;try{data=await response.json();}catch{throw new Error('Storage did not respond. Try again.');}
  if(!response.ok){const error=new Error(data.error||'Could not save the team league.');error.status=response.status;throw error;}
  return data;
 }
 const accept=data=>{world=data.world;revision=data.revision;};
 async function load(){const request=++loadRequest,format=size;try{const data=await api('GET');if(request!==loadRequest||format!==size)return;accept(data);render();}catch(e){say(e.message,true);}}
 // A command owns the busy state unless a longer run (simulation batches) already holds it.
 async function command(payload,inRun=false){
  if(busy&&!inRun)return;const owner=!busy;if(owner){busy=true;hooks.busy(true);render();}
  try{accept(await api('POST',{...payload,format:size,revision,operationId:crypto.randomUUID()}));}
  catch(e){if(e.status===409){await load();say(e.message,true);if(inRun)throw e;}else throw e;}
  finally{if(owner){busy=false;hooks.busy(false);}render();}
 }
 async function found(teams,battleMode='teamfight'){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{
   const kit=await generator(),seed=crypto.getRandomValues(new Uint32Array(1))[0],plan=LEAGUE.poolPlan(size,teams,seed),fighters=[];
   // Generate in small chunks so the page keeps painting the scouting progress.
   for(let i=0;i<plan.length;i++){fighters.push(poolFighter(kit.pools,kit.luck,plan[i],i,seed,kit.name));if(i%6===5){say(`Scouting fighters… ${i+1} / ${plan.length}`);await new Promise(r=>setTimeout(r,0));}}
   say('Founding the league…');busy=false;
   await command({action:'start',worldId:crypto.randomUUID(),teams,seed,battleMode,fighters:fighters.map(wire)});
   say(`${teams}-team ${size}v${size} league founded with ${plan.length} fighters. The coaches are ready to draft.`);
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 const afterDraft=()=>{if(!world)return;if(world.draft.complete||world.phase==='ready')say(world.season>1&&world.phase==='ready'?`The offseason is over. Season ${world.season} rosters are set.`:'Draft complete. Every roster is set and cap-legal.');else if(mine()&&LEAGUE.onTheClock(world)===mine().id)say('You are on the clock. Pick a fighter.');};
 const draft=count=>command({action:'draft',count}).then(afterDraft).catch(e=>say(e.message,true));
 const pick=fighter=>command({action:'pick',fighter}).then(()=>{say(`You drafted ${world.fighters[fighter].name}.`);afterDraft();}).catch(e=>say(e.message,true));
 const mine=()=>world?.settings.userTeam?LEAGUE.teamById(world,world.settings.userTeam):null;
 const claim=team=>command({action:'claim',team}).then(()=>say(team?`You are now head coach of the ${name(team)}.`:'The AI coach is back in charge.')).catch(e=>say(e.message,true));
 async function simulateAudit(phase){
  const snapshot=structuredClone({id:world.id,seed:world.seed,season:world.season,format:world.format,settings:world.settings,teams:world.teams,fighters:world.fighters,balance:{profile:world.balance.profile,samples:world.balance.samples,previousSamples:world.balance.previousSamples,previousRoleRates:world.balance.previousRoleRates},lastOffseason:world.lastOffseason?{meta:{shift:world.lastOffseason.meta?.shift}}:null}),plan=LEAGUE.auditPlan(snapshot,phase);let finished=0;
  say(`Checking ${phase==='preseason'?'preseason':'midseason'} balance… 0 / ${plan.candidates.length}`);
  const rows=await Promise.all(plan.candidates.map(candidate=>auditPool.simulate({world:snapshot,plan,key:candidate.key}).then(row=>{say(`Checking balance… ${++finished} / ${plan.candidates.length}`);return row;})));
  const report={version:plan.version,token:plan.token,rows,bundles:[]};
  for(;;){const bundle=nextAuditBundle(snapshot,phase,report);if(bundle.complete)break;say(`Validating combined patch… attempt ${bundle.index+1}`);const comparisons=await Promise.all(bundle.keys.map(key=>auditPool.simulate({world:snapshot,plan,key,mode:'bundle',bundle})));report.bundles.push({index:bundle.index,profileToken:bundle.profileToken,rows:comparisons});}
  return report;
 }
 async function pendingAudit(){if(world.balance?.enabled&&world.balance.pendingAudit){const phase=world.balance.pendingAudit,audit=await simulateAudit(phase);await command({action:'balanceAudit',phase,audit},true);}}
 async function beginSeason(){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{const audit=world.balance?.enabled&&world.balance.preseasonSeason!==world.season?await simulateAudit('preseason'):undefined;await command({action:'startSeason',...(audit?{audit}:{})},true);say(`Season ${world.season} is underway: ${world.schedule.length} weeks, then the playoffs.`);}catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 // The offseason's rookie class is rolled here from the shared plan; the server re-checks every roll.
 async function beginOffseason(){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{
   await pendingAudit();
   const kit=await generator(),seed=crypto.getRandomValues(new Uint32Array(1))[0],plan=LEAGUE.rookiePlan(world),rookies=[];
   for(let i=0;i<plan.length;i++){rookies.push(poolFighter(kit.pools,kit.luck,plan[i],i,seed,kit.name));if(i%6===5){say(`Scouting rookies… ${i+1} / ${plan.length}`);await new Promise(r=>setTimeout(r,0));}}
   say('Updating values and contracts…');busy=false;
   await command({action:'offseason',rookies:rookies.map(wire)});
   say(world.phase==='offseason'&&world.offseason.step==='decisions'?'Values are updated. Decide who stays on your roster.':`The offseason is open: ${world.offseason?.trades.length??0} trades so far. The rookie draft is next.`);
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 const name=id=>LEAGUE.teamById(world,id).name;
 // Season play: simulate in the worker pool, then let the server validate and record each match in order.
 async function simulate(matches){const games=await Promise.all(matches.map(m=>pool.simulate({match:m,teams:LEAGUE.squads(world,m)})));await command({action:'record',results:matches.map((m,i)=>({matchId:m.id,games:games[i]}))},true);await pendingAudit();}
 const weekLeft=()=>{const next=LEAGUE.upcoming(world,1)[0];return next?LEAGUE.upcoming(world).filter(m=>m.week===next.week).length:0;};
 async function run(mode){
  if(busy||hooks.blocked()||unsavedGame)return;stopping=false;const phase=world.phase;busy=true;hooks.busy(true);render();
  try{
   await pendingAudit();
   do{
    const matches=world.phase==='season'?LEAGUE.upcoming(world,mode==='one'?1:weekLeft()):LEAGUE.upcoming(world,mode==='one'?1:Infinity);if(!matches.length)break;
    say(world.phase==='season'?`Simulating week ${matches[0].week}…`:`Simulating the ${world.playoffs.rounds.at(-1).name}…`);await simulate(matches);
   }while(!stopping&&(mode==='season'&&world.phase==='season'||mode==='all'&&world.phase!=='complete'));
   say(world.phase==='complete'?`${name(world.playoffs.champion)} win the Forgefire Crown!`:world.phase==='playoffs'&&phase==='season'?'Regular season complete. The playoffs are set.':'Results saved.');
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 async function saveWatchedGame(){
  if(!unsavedGame)return;const data=await api('POST',unsavedGame);accept(data);unsavedGame=null;render();
 }
 async function watchNext(){
  if(busy||hooks.blocked()||unsavedGame)return;let [m]=LEAGUE.upcoming(world,1);if(!m)return;busy=true;hooks.busy(true);render();
  let choice=null;
  try{
   await pendingAudit();[m]=LEAGUE.upcoming(world,1);
   while(m){
    const games=m.completedGames??[],plan=seriesGameOptions(m,games,choice),teams=plan.lineups.map(ids=>ids.map(id=>world.fighters[id])),label=m.kind==='regular'?`Week ${m.week}`:LEAGUE.ROUND_NAMES[m.round];
    const result=await hooks.watch(teams,(m.seed+games.length*65537)>>>0,{conditions:m.conditions,tactics:plan.tactics,engineVersion:m.engineVersion,balance:m.balance,caption:`${label} · game ${games.length+1} · ${name(m.home)} vs ${name(m.away)} · ${seriesScore(games).join('–')}`});
    unsavedGame={action:'seriesGame',format:size,revision,operationId:crypto.randomUUID(),matchId:m.id,game:{...compactTeamResult(result),...plan}};
    await saveWatchedGame();const partial=world.pendingSeries;
    if(!partial){await pendingAudit();say('Series complete and saved.');break;}
    const next=LEAGUE.upcoming(world,1)[0],me=mine(),side=next.userSide,nextPlan=seriesGameOptions(next,partial.games);
    choice=await hooks.intermission({title:`Game ${partial.games.length} saved · ${name(m.home)} vs ${name(m.away)}`,score:seriesScore(partial.games),result,canCoach:side>=0,roster:me?me.roster.map(id=>world.fighters[id]):[],lineup:side>=0?nextPlan.lineups[side]:[],tactic:nextPlan.tactics[side]??'balanced',tactics:Object.entries(TACTIC_TEXT).map(([key,[label]])=>[key,label])});
    if(choice===null){hooks.setup?.();say('Series paused and saved. Resume with Watch next series or simulate the remaining games.');break;}m=next;
   }
  }catch(e){say(e.message+(unsavedGame?' Your finished game is kept here; retry its save.':''),true);}
  finally{busy=false;hooks.busy(false);render();}
 }
 const cell=x=>{if(typeof x==='string')return el('td',x);const td=el('td');td.append(x);return td;};
 const rookie=f=>f.rookie&&f.rookie>=world.season;
 // Any fighter name opens their details: traits, stats, contract and season numbers.
 function fighterLink(f,title){const b=el('button',f.name+(!title&&rookie(f)?' · rookie':''),'fighter-link');b.type='button';b.title='Show fighter details';b.onclick=e=>{e.stopPropagation();showFighter(f.id,title?f:null,title);};return b;}
 function showFighter(id,snapshot,title){
  const f=snapshot??world?.fighters[id];if(!f)return;const t=f.traits,stats=snapshot?f.seasonStats:world.stats?.[id],ability=x=>x&&!/^no (second )?(power|ability)$/i.test(x)?x:null;dialog.replaceChildren();
  const head=el('div','','fighter-dialog-head'),close=button('Close','quiet');close.onclick=()=>dialog.close();
  const info=el('div');info.append(el('p',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]} · ${f.summary.tier} tier${!title&&rookie(f)?' · rookie':''}`,'eyebrow'),el('h3',f.name),el('p',`${title?title.championName:f.team?name(f.team):'Free agent'} · OVR ${snapshot?f.ovr:delta(f)} · ${money(f.salary)} salary`,'muted'));head.append(info,close);
  const traits=el('dl','','fighter-traits');
  for(const [label,value]of [['Race',[t.race,t.subrace].filter(Boolean).join(' · ')],['Class',[t.class,t.subclass].filter(Boolean).join(' · ')],['Weapon',[t.weapon,t.mastery].filter(Boolean).join(' · ')],['Abilities',[ability(t.power),ability(t.power2)].filter(Boolean).join(' · ')||'None'],['Weakness',t.weakness||'None']]){const row=el('div');row.append(el('dt',label),el('dd',value));traits.append(row);}
  const bars=el('div','','fighter-stats'),values=f.summary.stats??[],top=Math.max(800,...values);
  STAT_KEYS.forEach((key,i)=>{const row=el('div','','fighter-stat'),track=el('span','','fighter-stat-track'),fill=el('span');fill.style.width=Math.min(100,(values[i]??0)/top*100)+'%';track.append(fill);row.append(el('span',key),track,el('strong',String(values[i]??0)));bars.append(row);});
  bars.append(el('p',`Total ${f.summary.total} · rolls: ${[t.strength,t.speed,t.durability,t.iq,t.magic].filter(Boolean).join(' · ')}`,'muted'));
  const season=el('div','','fighter-season');
  if(stats?.games){for(const [label,value]of [['Games',stats.games],['Damage',stats.damage],['Healing',stats.healing],['KOs',stats.kills],['Downs',stats.deaths],['Control',`${stats.ccSeconds}s`],['Impact / game',Math.round(LEAGUE.impact(stats)/stats.games)]]){const cell=el('div','','offseason-fact');cell.append(el('strong',String(value)),el('span',label));season.append(cell);}}
  else season.append(el('p',`No games recorded in season ${title?.season??world.season}.`,'muted'));
  const breakdown=button('Full trait breakdown','button secondary');breakdown.onclick=()=>{dialog.close();openTraitDetails({id:f.id,name:f.name,role:f.role,traits:f.traits,summary:f.summary},'overview');};
  dialog.append(head,el('h4','Traits'),traits,el('h4','Stats'),bars,el('h4',`Season ${title?.season??world.season}`),season,breakdown);dialog.showModal();
 }
 function fighterRow(f,extra=[],ovrText=String(f.ovr)){const tr=el('tr','',`role-${f.role}`);tr.append(cell(fighterLink(f)),el('td',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]}`),el('td',f.summary.tier),el('td',ovrText,'ovr'),el('td',money(f.salary)),...extra.map(cell));return tr;}
 const delta=f=>f.lastOvr!==undefined&&f.lastOvr!==f.ovr?`${f.ovr} (${f.ovr>f.lastOvr?'+':''}${f.ovr-f.lastOvr})`:String(f.ovr);
 function check(label,checked=false){const box=el('input');box.type='checkbox';box.checked=checked;box.setAttribute('aria-label',label);return box;}
 function table(headers,rows,caption){const wrap=el('div','','table-scroll'),t=el('table','','team-league-table');if(caption)t.append(el('caption',caption));const head=el('thead'),hr=el('tr');for(const h of headers)hr.append(el('th',h));head.append(hr);const tb=el('tbody');tb.append(...rows);t.append(head,tb);wrap.append(t);return wrap;}
 function diagnosticName(key){const scope=key.startsWith('within:')?ROLE_LABELS[key.split(':')[1]]+' · ':'',base=auditBaseKey(key),parts=base.split(':');return scope+(parts[0]==='role'?ROLE_LABELS[parts[1]]+(parts[2]==='count'?` (${parts[3]} fighters)`:''):parts[0]==='stat'?parts[1]:parts[0]==='weapon'?parts[1]+' weapons':Object.values(globalThis.CURRENT_CLASS_ABILITIES.abilities).find(a=>a.id===parts[1])?.name??base);}
 function renderPatches(){
  const section=el('details','','module past-champions');section.open=patchesOpen;section.ontoggle=()=>{patchesOpen=section.open;};section.append(el('summary','League patches'));
  const toggle=check('Automatic league balance',world.balance?.enabled!==false);toggle.disabled=busy;toggle.onchange=()=>command({action:'balance',enabled:toggle.checked}).catch(e=>say(e.message,true));const label=el('label','Automatic league balance');label.prepend(toggle);section.append(label,el('p','Each review screens every available ability, all five stats, roles, stacked compositions and weapon families. Shared problems are investigated within roles, then the complete patch is tested together. Preseason adjustments stay within 10%; midseason changes within 1.5%.','muted'));
  const history=world.balance?.history??[];if(!history.length)section.append(el('p','Base rules · no league patches yet.','muted'));
  for(const season of [...new Set(history.map(p=>p.season))].sort((a,b)=>b-a)){
   const dropdown=el('details','','patch-season');dropdown.open=patchSeasonsOpen.has(season);dropdown.ontoggle=()=>{dropdown.open?patchSeasonsOpen.add(season):patchSeasonsOpen.delete(season);};
   const patches=history.filter(p=>p.season===season),count=patches.reduce((n,p)=>n+p.changes.length,0);dropdown.append(el('summary',`Season ${season} · ${count} ${count===1?'change':'changes'}`));
   for(const p of patches){
    dropdown.append(el('h4',p.phase==='preseason'?'Preseason':p.phase==='halfway'?'Midseason':'Offseason'));if(!p.changes.length)dropdown.append(el('p','No changes applied.','muted'));for(const c of p.changes)dropdown.append(el('p',c.note,'muted'));
    if(p.coverage){const c=p.coverage,parts=[[c.abilities,'ability','abilities'],[c.stats,'stat','stats'],[c.roles,'role','roles'],[c.compositions,'stacked composition','stacked compositions'],[c.weapons,'weapon family','weapon families'],[c.focused,'focused check','focused checks']];dropdown.append(el('p',parts.map(([n,one,many])=>`${n} ${n===1?one:many}`).join(' · '),'muted'));}
    const diagnostics=p.diagnostics??[];
    if(diagnostics.length){
     const report=el('details','','patch-review'),held=diagnostics.filter(d=>['needs-assessment','limited','unmatched'].includes(d.status)).length;report.append(el('summary',`Full balance review · ${diagnostics.length} checks${held?` · ${held} need review`:''}`));
     for(const d of [...diagnostics].sort((a,b)=>Number(['stable','screened'].includes(a.status))-Number(['stable','screened'].includes(b.status)))){
      const item=el('p',`${diagnosticName(d.key)}: ${d.note}`,'muted');if(d.method==='role-intervention'&&d.parent)item.append(el('span',` Role intervention: ${Math.round(d.parent.rate*100)}% wins for the parent role in ${d.parent.games} comparable games.`));if(d.observed)item.append(el('span',` Season evidence: ${Math.round(d.observed.rate*100)}% wins in ${d.observed.games} comparable games.`));report.append(item);
     }
     if(p.census?.traits?.length){const traits=el('details','','patch-traits');traits.append(el('summary','Race, class, equipment and weakness watchlist'));for(const t of p.census.traits){traits.append(el('p',`${t.key.split(':').slice(1).join(' · ')} · ${t.count} fighters${t.observed?` · ${Math.round(t.observed.rate*100)}% in ${t.observed.games} comparable games`:' · no comparable season evidence yet'}`,'muted'));}traits.append(el('p','These associations help identify shared builds. They do not prove that a race or class caused the result.','muted'));report.append(traits);}
     dropdown.append(report);
    }
   }
   section.append(dropdown);
  }
  body.append(section);
 }
 function renderSetup(){
  const card=el('section','','team-league-setup'),pick=el('div','','team-size-pick');
  card.append(el('h3',`Found a ${size}v${size} league`),el('p',`AI head coaches draft from a fresh pool of S and A tier fighters (rare SS). Rosters hold ${LEAGUE.FORMATS[size].rosterSize} fighters; every pick costs salary under a shared cap.`,'muted'));
  const rules=el('select'),rulesLabel=el('label','Battle rules');rules.setAttribute('aria-label','League battle rules');for(const [value,text]of [...(size===2?[]:[['core','Core siege']]),['teamfight',size===2?'Team battle':'Classic teamfight']]){const o=el('option',text);o.value=value;rules.append(o);}rules.value=size===2?'teamfight':'core';rules.disabled=busy;rulesLabel.append(rules);card.append(rulesLabel);
  for(const teams of LEAGUE.LEAGUE_SIZES){const b=button(`${teams} teams`,'button secondary');b.disabled=busy;b.onclick=()=>found(teams,rules.value);const label=el('span',`${LEAGUE.poolSize(size,teams)} fighters · ${teams===32?'2 conferences × 4 divisions':teams===16?'2 conferences × 2 divisions':'2 conferences'}`,'muted');const option=el('div','','team-size-option');option.append(b,label);pick.append(option);}
  card.append(pick);body.append(card);
 }
 function teamCard(team){
  const card=el('button','','team-card');card.type='button';card.dataset.personality=team.coach.personality;if(selected===team.id)card.classList.add('active');if(world.settings.userTeam===team.id)card.classList.add('mine');
  const pay=LEAGUE.payroll(world,team),bar=el('span','','cap-bar'),fill=el('span');fill.style.width=Math.min(100,pay/world.settings.salaryCap*100)+'%';bar.append(fill);
  const roster=el('span',team.roster.map(id=>ROLE_GLYPH[world.fighters[id].role]).join(' ')||'—','team-card-roster');
  const recordText=world.results?.length?` · ${LEAGUE.standings(world,[team.id])[0].wins}–${LEAGUE.standings(world,[team.id])[0].losses}`:'';
  card.append(el('strong',team.name+recordText),el('span',`${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label}`,'team-card-coach'),roster,el('span',`${money(pay)} / ${money(world.settings.salaryCap)} · ${team.roster.length}/${world.settings.rosterSize}`,'team-card-pay'),bar);
  card.setAttribute('aria-expanded',String(selected===team.id));card.onclick=()=>{selected=selected===team.id?null:team.id;render();};return card;
 }
 function renderTeams(){
  const wrap=el('section','','team-conferences');
  for(const conference of world.conferences){const c=el('div','','team-conference');c.append(el('h3',conference.name+' conference'));for(const division of conference.divisions){const d=el('div','','team-division');d.append(el('h4',division.name));for(const id of division.teams){d.append(teamCard(LEAGUE.teamById(world,id)));if(selected===id)d.append(renderTeamDetail());}c.append(d);}wrap.append(c);}
  body.append(wrap);
 }
 // Opens inline under the team's card, like a dropdown.
 function renderTeamDetail(){
  const team=LEAGUE.teamById(world,selected);if(!team)return el('div');const section=el('section','','team-detail'),starters=new Set(team.lineup.length?team.lineup:LEAGUE.bestLineup(world,team)),coached=world.settings.userTeam===team.id;
  const tactic=LEAGUE.teamTactic(world,team),plays=LEAGUE.compLabel(LEAGUE.roleCounts(world,{roster:[...starters]})),plan=LEAGUE.compLabel(LEAGUE.starterTargets(world,team));
  section.append(el('h3',team.name+(coached?' · your team':'')),el('p',`${coached?'You are head coach':'Head coach '+team.coach.name+' · '+LEAGUE.PERSONALITIES[team.coach.personality].label} · ${team.conference} ${team.division} · cap space ${money(LEAGUE.capSpace(world,team))} · tactic: ${TACTIC_TEXT[tactic][0]}`,'muted'),el('p',`Plays: ${plays||'—'}${plays!==plan?` · coach's plan: ${plan}`:''}`,'team-comp'));
  const editing=coached&&['ready','season','playoffs'].includes(world.phase),size=LEAGUE.FORMATS[world.format].size,boxes=[];
  const rows=team.roster.map(id=>world.fighters[id]).sort((a,b)=>starters.has(b.id)-starters.has(a.id)||b.ovr-a.ovr).map(f=>{if(!editing)return fighterRow(f,[starters.has(f.id)?'Starter':'Bench']);const box=check(`Start ${f.name}`,starters.has(f.id));box.value=f.id;box.disabled=busy;boxes.push(box);return fighterRow(f,[box]);});
  section.append(table(['Fighter','Role','Tier','OVR','Salary',editing?'Start':'Lineup'],rows,`Roster · team OVR ${LEAGUE.teamOverall(world,team)}`));
  if(coached){
   const row=el('div','','coach-tools');
   if(editing){
    const save=button('Save lineup','button secondary'),count=el('span','','muted');
    const update=()=>{const n=boxes.filter(b=>b.checked).length;count.textContent=`${n} / ${size} starters`;save.disabled=busy||n!==size;};
    for(const b of boxes)b.onchange=update;update();
    save.onclick=()=>command({action:'lineup',lineup:boxes.filter(b=>b.checked).map(b=>b.value)}).then(()=>say('Lineup saved. It plays from the next match.')).catch(e=>say(e.message,true));
    const auto=button('Best lineup','quiet');auto.disabled=busy;auto.onclick=()=>{const best=new Set(LEAGUE.bestLineup(world,{...team,lineup:[]}));for(const b of boxes)b.checked=best.has(b.value);update();};
    row.append(count,auto,save);
   }
   const pickTactic=el('select');pickTactic.setAttribute('aria-label','Team tactic');pickTactic.disabled=busy;
   for(const t of LEAGUE.TACTICS){const o=el('option',`${TACTIC_TEXT[t][0]} · ${TACTIC_TEXT[t][1]}`);o.value=t;o.selected=t===tactic;pickTactic.append(o);}
   pickTactic.onchange=()=>command({action:'tactic',tactic:pickTactic.value}).then(()=>say(`Tactic set: ${TACTIC_TEXT[pickTactic.value][0]}.`)).catch(e=>say(e.message,true));
   row.append(pickTactic);section.append(el('h4','Coaching'),row);
  }
  if(world.draft.complete&&team.roster.length>=size){
   const opponents=world.teams.filter(t=>t.id!==team.id),choice=el('select');choice.setAttribute('aria-label','Scrimmage opponent');for(const t of opponents){const o=el('option',`${t.name} · OVR ${LEAGUE.teamOverall(world,t)}`);o.value=t.id;choice.append(o);}
   const watch=button('Watch scrimmage','button primary');watch.disabled=busy||hooks.blocked();
   watch.onclick=async()=>{try{const rival=LEAGUE.teamById(world,choice.value),squads=[team,rival].map(t=>LEAGUE.starters(world,t)),result=await hooks.watch(squads,crypto.getRandomValues(new Uint32Array(1))[0],{conditions:{time:'random',weather:'random',ground:'random',map:'random'},tactics:[LEAGUE.teamTactic(world,team),LEAGUE.teamTactic(world,rival)],caption:`Scrimmage · ${team.name} vs ${rival.name}`});say(`${result.winnerTeam?rival.name:team.name} win the scrimmage (${result.reason}).`);}catch(e){say(e.message,true);}};
   const row=el('div','','team-scrimmage');row.append(choice,watch);section.append(el('h4','Scrimmage'),row);
  }
  return section;
 }
 function renderDraft(){
  const d=world.draft,total=LEAGUE.totalPicks(world),made=d.picks.length,panel=el('section','','team-draft'),coach=mine();let myTurn=false,eligibleIds=new Set();
  if(world.phase==='offseason')panel.append(el('h3',`Season ${world.season+1} draft · rookies and free agents`,'offseason-title'));
  if(!d.complete){
   const slot=LEAGUE.draftSlot(world),team=LEAGUE.teamById(world,slot.team),clock=el('div','','draft-clock');myTurn=coach?.id===team.id;
   clock.append(el('span',`Round ${slot.round} · pick ${slot.pick} · ${made+1} of ${total}`,'eyebrow'),el('strong',myTurn?`You are on the clock: ${team.name}`:`On the clock: ${team.name}`),el('span',myTurn?`Coach plan still wants ${Object.entries(LEAGUE.eligible(world,team).unmet).filter(([,n])=>n).map(([r,n])=>`${n} ${ROLE_LABELS[r].toLowerCase()}`).join(', ')||'filled'} · ${team.roster.length}/${world.settings.rosterSize} signed · cap space ${money(LEAGUE.capSpace(world,team))}`:`${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label} · cap space ${money(LEAGUE.capSpace(world,team))}`,'muted'));
   if(myTurn)clock.classList.add('mine');
   const actions=el('div','','draft-actions');let roundLeft=0;for(let i=made;i<total&&LEAGUE.draftSlot(world,i).round===slot.round;i++)roundLeft++;
   if(myTurn){
    eligibleIds=new Set(LEAGUE.eligible(world,team).candidates.map(f=>f.id));
    const auto=button('Let the scouts pick','button secondary');auto.disabled=busy||hooks.blocked();auto.onclick=()=>pick(LEAGUE.coachChoice(world,team).id);actions.append(auto);
   }else{
    const waiting=!!coach&&(d.slots?d.slots.slice(made).some(s=>s.team===coach.id):coach.roster.length<world.settings.rosterSize);
    for(const [text,count,cls]of [['Sim next pick',1,'button primary'],['Sim round',roundLeft,'button secondary'],[waiting?'Sim to your pick':'Sim full draft',total-made,'quiet']]){const b=button(text,cls);b.disabled=busy||hooks.blocked();b.onclick=()=>draft(count);actions.append(b);}
   }
   panel.append(clock,actions);
  }
  const recent=d.picks.slice(-10).reverse().map(p=>{const f=world.fighters[p.fighter],tr=el('tr','',`role-${f.role}`);tr.append(el('td',`${p.round}.${p.pick}${p.exception?' · min. exception':''}`),el('td',LEAGUE.teamById(world,p.team).name),cell(fighterLink(f)),el('td',`${ROLE_GLYPH[f.role]} ${ROLE_LABELS[f.role]}`),el('td',String(f.ovr),'ovr'),el('td',money(f.salary)));return tr;});
  // The whole pool, filterable by role and sortable, so every fighter can be scouted.
  const pool=LEAGUE.available(world),sorts={ovr:(a,b)=>b.ovr-a.ovr||a.salary-b.salary,value:(a,b)=>b.ovr/b.salary-a.ovr/a.salary||b.ovr-a.ovr,salary:(a,b)=>a.salary-b.salary||b.ovr-a.ovr,stats:(a,b)=>b.summary.total-a.summary.total};
  const filters=el('div','','pool-filters');
  for(const [key,label]of [['all','All'],['tank',`${ROLE_GLYPH.tank} Tanks`],['healer',`${ROLE_GLYPH.healer} Healers`],['controller',`${ROLE_GLYPH.controller} Controllers`],['damage',`${ROLE_GLYPH.damage} Damage`]]){const n=key==='all'?pool.length:pool.filter(f=>f.role===key).length,chip=button(`${label} ${n}`,'pool-chip');chip.setAttribute('aria-pressed',String(poolRole===key));chip.onclick=()=>{poolRole=key;poolPage=0;render();};filters.append(chip);}
  const order=el('select');order.setAttribute('aria-label','Sort fighters');for(const [key,label]of [['ovr','Best OVR'],['value','Best value (OVR per salary)'],['salary','Cheapest'],['stats','Highest total stats']]){const o=el('option',label);o.value=key;o.selected=poolSort===key;order.append(o);}order.onchange=()=>{poolSort=order.value;poolPage=0;render();};filters.append(order);
  // Twelve fighters per page; the arrows page through the rest.
  const shown=pool.filter(f=>poolRole==='all'||f.role===poolRole).sort(sorts[poolSort]),pages=Math.max(1,Math.ceil(shown.length/12)),page=Math.min(poolPage,pages-1);
  const best=shown.slice(page*12,page*12+12).map(f=>{if(!myTurn)return fighterRow(f);const b=button('Draft',eligibleIds.has(f.id)?'button primary small':'quiet small');b.disabled=busy||!eligibleIds.has(f.id);if(!eligibleIds.has(f.id))b.title='Over your cap reserve, or a required role is still open.';b.onclick=()=>pick(f.id);return fighterRow(f,[b]);});
  const grid=el('div','','draft-grid');
  if(recent.length)grid.append(table(['Pick','Team','Fighter','Role','OVR','Salary'],recent,'Latest picks'));
  const poolPanel=el('div','','pool-panel'),list=table(['Fighter','Role','Tier','OVR','Salary',...(myTurn?['']:[])],best,`${d.complete?'Free agents':'Available'} · ${shown.length} of ${pool.length}${myTurn?` · ${eligibleIds.size} you can afford`:''}`);
  const pager=el('div','','pool-pager'),back=button('‹','quiet'),forward=button('›','quiet');back.setAttribute('aria-label','Previous 12 fighters');forward.setAttribute('aria-label','Next 12 fighters');back.disabled=page<=0;forward.disabled=page>=pages-1;back.onclick=()=>{poolPage=page-1;render();};forward.onclick=()=>{poolPage=page+1;render();};
  pager.append(back,el('span',shown.length?`${page*12+1}–${Math.min(shown.length,page*12+12)} of ${shown.length} · page ${page+1} / ${pages}`:'No fighters','muted'),forward);poolPanel.append(filters,list,pager);grid.append(poolPanel);
  panel.append(grid);body.append(panel);
 }
 function seasonActions(){
  const actions=el('div','','draft-actions');if(unsavedGame){const retry=button('Retry game save','button primary');retry.disabled=busy;retry.onclick=()=>saveWatchedGame().then(()=>say('Game saved. Resume the series when ready.')).catch(e=>say(e.message,true));actions.append(retry);return actions;}const list=world.phase==='ready'?[['Start season',beginSeason,'button primary']]:world.phase==='season'?[['Sim next game',()=>run('one'),'button secondary'],['Sim week',()=>run('week'),'button primary'],['Sim to playoffs',()=>run('season'),'quiet'],['Watch next game',watchNext,'quiet']]:world.phase==='playoffs'?[['Sim next series',()=>run('one'),'button secondary'],['Sim round',()=>run('round'),'button primary'],['Sim rest of playoffs',()=>run('all'),'quiet'],['Watch next series',watchNext,'quiet']]:world.phase==='complete'?[['Begin offseason',beginOffseason,'button primary']]:[];
  for(const [text,fn,cls]of list){const b=button(text,cls);b.disabled=busy||hooks.blocked();b.onclick=fn;actions.append(b);}
  if(busy&&['season','playoffs'].includes(world.phase)){const stop=button('Stop after this batch','quiet danger');stop.disabled=stopping;stop.onclick=()=>{stopping=true;stop.disabled=true;};actions.append(stop);}
  return actions;
 }
 // Any week of the regular season can be browsed; by default the view follows the current week.
 function renderWeek(){
  const total=world.schedule.length,next=world.phase==='season'?LEAGUE.upcoming(world,1)[0]:null,current=next?.week??total,week=Math.min(total,Math.max(1,weekView??current)),games=world.schedule[week-1].games,results=new Map(world.results.map(r=>[r.id,r]));
  const wrap=el('div','','week-browser'),nav=el('div','','week-nav'),prev=button('‹ Previous','quiet'),nextButton=button('Next ›','quiet'),pick=el('select');
  pick.setAttribute('aria-label','Week');for(let i=1;i<=total;i++){const o=el('option',`Week ${i}${i===current&&world.phase==='season'?' · current':''}`);o.value=String(i);o.selected=i===week;pick.append(o);}
  prev.disabled=week<=1;nextButton.disabled=week>=total;prev.onclick=()=>{weekView=week-1;render();};nextButton.onclick=()=>{weekView=week+1;render();};pick.onchange=()=>{weekView=Number(pick.value);render();};nav.append(prev,pick,nextButton);
  if(weekView!==null&&week!==current){const back=button('Current week','quiet');back.onclick=()=>{weekView=null;render();};nav.append(back);}
  const rows=games.map(g=>{const r=results.get(g.id),tr=el('tr','',r?'played':'');tr.append(el('td',name(g.home),r?.winner===g.home?'won':''),el('td',r?`${r.hp[0]}%–${r.hp[1]}%`:'vs','score'),el('td',name(g.away),r?.winner===g.away?'won':''));return tr;});
  wrap.append(nav,table(['Home','Health','Away'],rows,`Week ${week} of ${total} · ${games.filter(g=>results.has(g.id)).length}/${games.length} played`));return wrap;
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
  banner.append(el('p','Next: the offseason. Values update from this season\'s stats, coaches keep or release, trade, and draft the rookie class.','muted'));return banner;
 }
 function renderLeaders(){
  const wrap=el('div','','draft-grid');for(const [key,label]of [['impact','Impact'],['damage','Damage'],['healing','Healing'],['kills','KOs']]){const rows=LEAGUE.leaders(world,key).map(x=>{const tr=el('tr','',`role-${x.fighter.role}`);tr.append(cell(fighterLink(x.fighter)),el('td',name(x.fighter.team)),el('td',String(x.value)));return tr;});if(rows.length)wrap.append(table(['Fighter','Team',label],rows,label+' leaders'));}
  return wrap;
 }
 // Coach mode: take over a team before the draft or between seasons, or hand it back to its AI coach.
 function coachControl(){
  const wrap=el('div','','coach-control'),coach=mine(),open=world.phase==='draft'&&!world.draft.picks.length||['ready','complete'].includes(world.phase);
  if(coach){wrap.append(el('span',`Coaching · ${coach.name}`,'coach-badge'));if(!(world.phase==='offseason'&&world.offseason.step!=='draft')){const b=button('Hand back','quiet');b.disabled=busy;b.onclick=()=>claim(null);wrap.append(b);}}
  if(open){
   const choice=el('select');choice.setAttribute('aria-label','Team to coach');choice.disabled=busy;
   for(const t of world.teams.slice().sort((a,b)=>a.name<b.name?-1:1)){if(t.id===coach?.id)continue;const o=el('option',`${t.name} · OVR ${LEAGUE.teamOverall(world,t)}`);o.value=t.id;o.selected=t.id===selected;choice.append(o);}
   const take=button(coach?'Switch team':'Coach a team','button secondary');take.disabled=busy;take.onclick=()=>claim(choice.value);wrap.append(choice,take);
  }else if(!coach)wrap.append(el('span','Spectating · take over a team between seasons','muted'));
  return wrap;
 }
 // Battle rules for the next season (3v3/5v5 only); the running season keeps its rules.
 function rulesControl(){
  const wrap=el('div','','coach-control');if(LEAGUE.FORMATS[world.format].size===2||['season','playoffs'].includes(world.phase))return wrap;
  const rules=el('select');rules.setAttribute('aria-label','Battle rules from next season');rules.disabled=busy;for(const [value,text]of [['core','Core siege'],['teamfight','Classic teamfight']]){const o=el('option',text);o.value=value;rules.append(o);}rules.value=world.settings.battleMode??'teamfight';
  rules.onchange=()=>command({action:'rules',mode:rules.value}).catch(e=>say(e.message,true));const label=el('label','Battle rules');label.append(rules);wrap.append(label);return wrap;
 }
 function offseasonReport(o){
  const box=el('div','','offseason-report'),released=Object.values(o.releases).reduce((n,ids)=>n+ids.length,0);
  box.append(el('h4',`Season ${o.season} offseason report`));
  const facts=el('div','','offseason-facts');
  for(const [value,label]of [[o.ratingChanges.length,'ratings changed'],[released,'released'],[o.trades.length,'trades'],[o.fired.length,'coaches fired'],[o.retired,'retired'],[o.rookies.length,'rookies']]){const f=el('div','','offseason-fact');f.append(el('strong',String(value)),el('span',label));facts.append(f);}
  box.append(facts);
  // The season's meta: which lineups won, which role made the difference, and which coaches changed course.
  if(o.meta?.games){
   const meta=el('div','','offseason-meta'),role={tank:'tanks',healer:'healers',controller:'controllers',damage:'damage dealers'};meta.append(el('h4','Season meta'));
   const lines=el('ul','','offseason-notes');
   if(o.meta.shift){const sh=o.meta.shift;lines.append(el('li',sh.winPct>=50?`Lineups with more ${role[sh.role]} than their opponent won ${sh.winPct}% of ${sh.games} games.`:`Lineups with more ${role[sh.role]} than their opponent lost ${Math.round((100-sh.winPct)*10)/10}% of ${sh.games} games.`));}
   for(const t of o.meta.top)lines.append(el('li',`${t.label}: won ${t.pct}% (${t.games} games).`));
   for(const c of o.meta.changed??[])if(world.teams.some(t=>t.id===c.team))lines.append(el('li',`${name(c.team)} switch from ${c.from} to ${c.to}.`));
   if(!o.meta.changed?.length)lines.append(el('li','Every coach sticks with their composition.'));
   meta.append(lines);box.append(meta);
  }
  const moves=o.ratingChanges.filter(c=>world.fighters[c.id]).map(c=>({...c,f:world.fighters[c.id],d:c.to-c.from})),grid=el('div','','draft-grid');
  const moveRows=list=>list.map(c=>{const tr=el('tr','',`role-${c.f.role}`);tr.append(cell(fighterLink(c.f)),el('td',c.f.team?name(c.f.team):'Free agent'),el('td',`${c.from} → ${c.to}`),el('td',(c.d>0?'+':'')+c.d,c.d>0?'up':'down'));return tr;});
  const risers=moves.filter(c=>c.d>0).sort((a,b)=>b.d-a.d||b.to-a.to).slice(0,5),fallers=moves.filter(c=>c.d<0).sort((a,b)=>a.d-b.d||b.to-a.to).slice(0,5);
  if(risers.length)grid.append(table(['Fighter','Team','OVR','Δ'],moveRows(risers),'Risers'));
  if(fallers.length)grid.append(table(['Fighter','Team','OVR','Δ'],moveRows(fallers),'Fallers'));
  const fighterName=id=>world.fighters[id]?.name??'a retired fighter';
  const notes=[...o.trades.map(t=>`Trade: ${name(t.teams[0])} send ${t.sent[0].map(fighterName).join(' & ')} to ${name(t.teams[1])} for ${t.sent[1].map(fighterName).join(' & ')}${t.user?' (your deal)':''}.`),...o.fired.map(f=>`${name(f.team)} fire ${f.from}; ${f.to} takes over.`)];
  if(notes.length){const ul=el('ul','','offseason-notes');for(const n of notes)ul.append(el('li',n));grid.append(ul);}
  if(grid.childNodes.length)box.append(grid);
  return box;
 }
 function renderDecisions(){
  const team=mine(),wrap=el('div','','offseason-step'),boxes=[];
  wrap.append(el('h4','Keep or release'),el('p','Kept fighters cost their new salary. Released fighters become free agents; open roster spots are filled in the draft.','muted'));
  const rows=team.roster.map(id=>world.fighters[id]).sort((a,b)=>b.ovr-a.ovr).map(f=>{const box=check(`Release ${f.name}`);box.value=f.id;box.disabled=busy;boxes.push(box);return fighterRow(f,[box],delta(f));});
  const payLine=el('p','','offseason-pay'),confirmButton=button('Confirm roster','button primary');
  const update=()=>{const out=boxes.filter(b=>b.checked).map(b=>b.value),pay=LEAGUE.payroll(world,team)-out.reduce((n,id)=>n+world.fighters[id].salary,0),over=pay>world.settings.salaryCap+1e-9;payLine.textContent=`Payroll ${money(pay)} / ${money(world.settings.salaryCap)} cap · ${team.roster.length-out.length} kept, ${out.length} released${over?' · over the cap: release more':''}`;payLine.classList.toggle('over',over);confirmButton.disabled=busy||over;};
  for(const b of boxes)b.onchange=update;update();
  confirmButton.onclick=()=>{const release=boxes.filter(b=>b.checked).map(b=>b.value);command({action:'decide',release}).then(()=>say(`${release.length?`Released ${release.length}.`:'Everyone stays.'} The trade window is open.`)).catch(e=>say(e.message,true));};
  wrap.append(table(['Fighter','Role','Tier','OVR (Δ)','New salary','Release'],rows),payLine,confirmButton);return wrap;
 }
 function renderMarket(){
  const team=mine(),wrap=el('div','','offseason-step'),others=world.teams.filter(t=>t.id!==team.id);if(!others.some(t=>t.id===partner))partner=others[0].id;
  const rival=LEAGUE.teamById(world,partner);
  wrap.append(el('h4','Trade window'),el('p','Swap one or two fighters for the same number. AI coaches accept only deals that make their team better and keep both payrolls under the cap.','muted'));
  const choice=el('select');choice.setAttribute('aria-label','Trade partner');choice.disabled=busy;for(const t of others){const o=el('option',`${t.name} · ${t.coach.name} (${LEAGUE.PERSONALITIES[t.coach.personality].label}) · cap space ${money(LEAGUE.capSpace(world,t))}`);o.value=t.id;o.selected=t.id===partner;choice.append(o);}
  choice.onchange=()=>{partner=choice.value;render();};
  const give=[],get=[],side=(t,list,verb)=>t.roster.map(id=>world.fighters[id]).sort((a,b)=>b.ovr-a.ovr).map(f=>{const box=check(`${verb} ${f.name}`);box.value=f.id;box.disabled=busy;list.push(box);return fighterRow(f,[box],delta(f));});
  const grid=el('div','','draft-grid trade-grid');grid.append(table(['Fighter','Role','Tier','OVR','Salary','Give'],side(team,give,'Give'),`${team.name} · payroll ${money(LEAGUE.payroll(world,team))}`),table(['Fighter','Role','Tier','OVR','Salary','Get'],side(rival,get,'Get'),`${rival.name} · payroll ${money(LEAGUE.payroll(world,rival))}`));
  const propose=button('Propose trade','button primary'),summary=el('p','','offseason-pay');
  const update=()=>{const a=give.filter(b=>b.checked).map(b=>b.value),b=get.filter(x=>x.checked).map(x=>x.value),pay=LEAGUE.payroll(world,team)-a.reduce((n,id)=>n+world.fighters[id].salary,0)+b.reduce((n,id)=>n+world.fighters[id].salary,0),over=pay>world.settings.salaryCap+1e-9;
   summary.textContent=a.length||b.length?`${a.length} for ${b.length} · your payroll after: ${money(pay)} / ${money(world.settings.salaryCap)}${over?' · over the cap':''}`:'Pick fighters from both rosters.';summary.classList.toggle('over',over);propose.disabled=busy||!a.length||a.length!==b.length||a.length>2||over;};
  for(const b of [...give,...get])b.onchange=update;update();
  propose.onclick=()=>{const a=give.filter(b=>b.checked).map(b=>b.value),b=get.filter(x=>x.checked).map(x=>x.value);command({action:'trade',partner,give:a,get:b}).then(()=>say(`Deal! ${b.map(id=>world.fighters[id].name).join(' & ')} join the ${team.name}.`)).catch(e=>say(e.message,true));};
  const done=button('Close the trade window','quiet');done.disabled=busy;done.onclick=()=>command({action:'closeMarket'}).then(()=>{say(world.phase==='offseason'?'The draft is set: worst record picks first, the champion last.':`No open roster spots. Season ${world.season} rosters are set.`);afterDraft();}).catch(e=>say(e.message,true));
  const row=el('div','','draft-actions');row.append(propose,done);wrap.append(choice,grid,summary,row);return wrap;
 }
 function renderOffseason(){
  const o=world.offseason,panel=el('section','','team-draft offseason'),steps=el('ol','','offseason-steps'),order=['decisions','market','draft'];
  for(const [key,label]of [['decisions','Keep or release'],['market','Trade window'],['draft','Draft']]){const li=el('li',label);li.classList.toggle('active',o.step===key);li.classList.toggle('done',order.indexOf(key)<order.indexOf(o.step));steps.append(li);}
  panel.append(steps,offseasonReport(o));
  if(o.step==='decisions')panel.append(renderDecisions());else if(o.step==='market')panel.append(renderMarket());
  body.append(panel);if(o.step==='draft')renderDraft();
 }
 // Re-rendering rebuilds the panel; keep the reader's scroll position (page or scrolling panel).
 const scroller=()=>{if(typeof getComputedStyle!=='function')return null;for(let n=host.parentElement;n;n=n.parentElement){const y=getComputedStyle(n).overflowY;if((y==='auto'||y==='scroll')&&n.scrollHeight>n.clientHeight)return n;}return null;};
 function render(){const box=scroller(),top=box?.scrollTop??0,pageY=globalThis.scrollY??0;draw();if(box)box.scrollTop=top;if(globalThis.scrollTo&&globalThis.scrollY!==pageY)globalThis.scrollTo(0,pageY);}
 function draw(){
  body.replaceChildren();
  if(!world){renderSetup();return;}
  const phaseLabel={draft:'Draft day',ready:'Rosters set',season:'Regular season',playoffs:'Playoffs',complete:'Season complete',offseason:'Offseason'}[world.phase];
  const head=el('div','','team-league-head'),info=el('div');info.append(el('p',`Season ${world.season} · ${world.teams.length} teams`,'eyebrow'),el('h3',phaseLabel));
  const meta=el('p',`${world.settings.battleMode==='core'?'Core siege · ':''}Salary cap ${money(world.settings.salaryCap)} · ${world.settings.rosterSize}-fighter rosters · ${Object.keys(world.fighters).length} scouted fighters`,'muted');info.append(meta);
  const reset=button('Delete league','quiet danger');reset.disabled=busy;reset.onclick=()=>{if(confirm(`Delete this ${size}v${size} league and all its fighters?`))command({action:'reset'}).then(()=>say('League deleted.')).catch(e=>say(e.message,true));};
  const side=el('div','','team-league-side');side.append(coachControl(),rulesControl(),reset);head.append(info,side);body.append(head);const champions=el('details','','module past-champions');champions.open=historyOpen;champions.ontoggle=()=>{historyOpen=champions.open;};champions.append(el('summary','Past champions'));const wins=[...(world.titles??[])].sort((a,b)=>b.season-a.season);if(!wins.length)champions.append(el('p','No champions yet.','muted'));for(const title of wins){const season=el('details','','champion-season');season.open=championSeasonsOpen.has(title.season);season.ontoggle=()=>{season.open?championSeasonsOpen.add(title.season):championSeasonsOpen.delete(title.season);};season.append(el('summary',`Season ${title.season} \u00b7 ${title.championName??name(title.champion)}`));if(title.roster?.length){const rows=[...title.roster].sort((a,b)=>Number(b.starter)-Number(a.starter)||b.ovr-a.ovr).map(f=>{const row=el('tr');row.append(cell(fighterLink(f,title)),el('td',ROLE_LABELS[f.role]),el('td',String(f.ovr)),el('td',f.starter?'Final lineup':'Bench'));return row;});season.append(table(['Fighter','Role','OVR','Lineup'],rows,'Championship roster'));}else season.append(el('p','The winning roster was not recorded for this older season.','muted'));champions.append(season);} body.append(champions);renderPatches();
  if(world.phase==='draft'){renderDraft();renderTeams();return;}
  if(world.phase==='offseason'){renderOffseason();renderTeams();return;}
  const season=el('section','','team-draft');season.append(seasonActions());
  if(world.phase==='complete')season.prepend(renderChampion());
  // Regular season: the current week leads. Playoffs and after: the bracket leads and the weeks fold away below it.
  if(world.phase==='season'&&world.schedule)season.append(renderWeek());
  if(world.playoffs)season.append(renderPlayoffs());
  if(world.schedule&&['playoffs','complete'].includes(world.phase)){const weeks=el('details','','module draft-recap season-results');weeks.open=resultsOpen;weeks.ontoggle=()=>{resultsOpen=weeks.open;};weeks.append(el('summary','Regular season results'),renderWeek());season.append(weeks);}
  if(world.phase==='ready'&&world.lastOffseason)season.append(offseasonReport(world.lastOffseason));
  body.append(season);
  if(world.results?.length){body.append(renderStandings(),renderLeaders());}
  const recap=el('details','','module draft-recap');recap.open=recapOpen;recap.ontoggle=()=>{recapOpen=recap.open;};recap.append(el('summary','Draft recap & free agents'));const holder=body;const before=body.childNodes.length;renderDraft();const draftPanel=body.lastChild;if(body.childNodes.length>before){recap.append(draftPanel);holder.append(recap);}
  renderTeams();
 }
 return {show(next){if(next!==size){size=next;world=null;selected=null;weekView=null;poolRole='all';historyOpen=false;patchesOpen=false;say('');}load();}};
}

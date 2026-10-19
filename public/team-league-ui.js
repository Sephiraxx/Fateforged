import {seriesGameOptions,seriesScore} from './team-series.js';
import {gamePlanFields} from './game-plan-ui.js';
import {engineForMode} from './team-engine-versions.js';
import {gamePlanSummary} from './team-game-plan.js';
// Team league screen: found a 2v2 / 3v3 / 5v5 region circuit, run free agency, play the splits and international events
// and run the offseason, as a spectator or a coach of any team in any region.
import * as LEAGUE from './team-league.js';
import {poolFighter} from './team-generation.js';
import {generator} from './team-ui.js';
import {ROLE_LABELS} from './team-roles.js';
import {createSimulationPool} from './simulation-client.js';
import {compactTeamResult} from './team-sim-worker.js';
import {openTraitDetails} from './trait-detail-ui.js';
import {STAT_KEYS} from './trait-details.js';
import {mountSpritePreview} from './sprite-preview.js';
import {TEMPLATES} from './team-events.js';
const ROLE_GLYPH={tank:'⛨',healer:'✚',controller:'◎',damage:'✦',support:'♪',bruiser:'⚔'};
// Cast fighters show their cast role (Support, Bruiser); the engine role still drives the team's composition.
const roleText=f=>`${ROLE_GLYPH[f.castRole??f.role]} ${ROLE_LABELS[f.castRole??f.role]}`;
const ROLE_PLURAL={tank:'tanks',healer:'healers',controller:'controllers',damage:'damage dealers',support:'supports',bruiser:'bruisers'};
const money=n=>`${n.toFixed(1)}M`;
const TACTIC_TEXT={balanced:['Balanced','Default target choice.'],'protect-carry':['Protect the carry','Peel harder for teammates under attack.'],'focus-healer':['Focus their healer','Prioritise enemy healers.'],aggressive:['All-out aggression','Chase wounded targets across the arena.'],defensive:['Hold the line','Fight near your own side instead of chasing.']};
const wire=f=>({id:f.id,name:f.name,traits:f.traits,summary:{generationVersion:f.summary.generationVersion??3,wheelRarity:f.summary.wheelRarity}});
export function mountTeamLeague(host,hooks){
 const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
 const button=(text,className='quiet')=>{const b=el('button',text,className);b.type='button';return b;};
 let loadRequest=0,size=3,world=null,revision=0,busy=false,selected=null,stopping=false,partner=null,weekView=null,poolRole='all',poolSort='ovr',poolPage=0,recapOpen=false,resultsOpen=false,unsavedGame=null;
 const pool=createSimulationPool(new URL('./team-sim-worker.js',import.meta.url));
 let archiveSeason=null,archiveTab='intl',view='world',regionSplit=null,poolRegion='all';
 const status=el('p','','team-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const body=el('div','','team-league'),dialog=el('dialog','','fighter-dialog'),panel=el('dialog','','fighter-dialog league-panel');dialog.setAttribute('aria-label','Fighter details');panel.setAttribute('aria-label','League records');host.append(status,body,panel,dialog);
 panel.addEventListener('click',e=>{if(e.target===panel)panel.close();});
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
 async function found(regionSize,battleMode='teamfight'){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{
   const kit=await generator(),seed=crypto.getRandomValues(new Uint32Array(1))[0],plan=LEAGUE.poolPlan(size,regionSize,seed),fighters=[];
   // Generate in small chunks so the page keeps painting the scouting progress.
   for(let i=0;i<plan.length;i++){fighters.push(poolFighter(kit.pools,kit.luck,plan[i],i,seed,kit.name));if(i%6===5){say(`Scouting fighters… ${i+1} / ${plan.length}`);await new Promise(r=>setTimeout(r,0));}}
   say('Founding the circuit…');busy=false;
   await command({action:'start',worldId:crypto.randomUUID(),regionSize,seed,battleMode,fighters:fighters.map(wire)});
   say(`${size}v${size} circuit founded: six regions of ${regionSize} teams and ${plan.length} fighters, all free agents. Each region's coaches bid for their own talent.`);
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 // After a free-agency round: who signed with you, who chose another team, and what's next.
 const afterMarket=()=>{
  if(!world)return;if(world.phase==='ready'){say(world.season>1?`Free agency is over. Season ${world.season} rosters are set.`:'The opening auction is over. Every roster is set.');return;}
  const results=world.market?.results??[],signed=results.filter(r=>r.signed===mine()?.id),lost=results.filter(r=>r.signed!==mine()?.id);
  const parts=[...signed.map(r=>`${world.fighters[r.fighter].name} signed with you`),...lost.map(r=>`${world.fighters[r.fighter].name} ${r.signed?`chose the ${name(r.signed)}`:'turned you down'}`)];
  say(`Round ${world.market.round} done.${parts.length?' '+parts.join('; ')+'.':''}${mine()&&openSpots(mine())?` You have ${openSpots(mine())} open spot${openSpots(mine())>1?'s':''}: make your offers.`:''}`);
 };
 const openSpots=team=>world.settings.rosterSize-team.roster.length;
 const marketSim=count=>command({action:'market',count}).then(afterMarket).catch(e=>say(e.message,true));
 const offer=(fighter,salary,years)=>command({action:'offer',fighter,salary,years}).then(()=>say(`Offer made to ${world.fighters[fighter].name}: ${money(salary)} × ${years} season${years>1?'s':''}. It goes out with the next round.`)).catch(e=>say(e.message,true));
 const withdraw=fighter=>command({action:'withdraw',fighter}).then(()=>say(`Offer to ${world.fighters[fighter].name} withdrawn.`)).catch(e=>say(e.message,true));
 const mine=()=>world?.settings.userTeam?LEAGUE.teamById(world,world.settings.userTeam):null;
 const claim=team=>command({action:'claim',team}).then(()=>{view=defaultView();say(team?`You are now head coach of the ${name(team)}.`:'The AI coach is back in charge.');}).catch(e=>say(e.message,true));
 async function beginSeason(){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{await command({action:'startSeason'},true);view=defaultView();say(`Season ${world.season} is underway: Split 1 in all six regions.`);}catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 async function advanceStage(){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{await command({action:'advance'},true);say(`${LEAGUE.stageName(LEAGUE.currentStage(world))} begins.`);}catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 // The offseason's rookie class is rolled here from the shared plan; the server re-checks every roll.
 async function beginOffseason(){
  if(busy||hooks.blocked())return;busy=true;hooks.busy(true);render();
  try{
   const kit=await generator(),seed=crypto.getRandomValues(new Uint32Array(1))[0],plan=LEAGUE.rookiePlan(world),rookies=[];
   for(let i=0;i<plan.length;i++){rookies.push(poolFighter(kit.pools,kit.luck,plan[i],i,seed,kit.name));if(i%6===5){say(`Scouting rookies… ${i+1} / ${plan.length}`);await new Promise(r=>setTimeout(r,0));}}
   say('Updating values and contracts…');busy=false;
   await command({action:'offseason',rookies:rookies.map(wire)});
   const o=world.offseason??world.lastOffseason;say(world.phase==='offseason'&&world.offseason.step==='resign'?`Values are updated. ${world.offseason.expiring.length?`${world.offseason.expiring.length} of your contracts ended: re-sign or let go.`:'None of your contracts ended.'} Then the trade window and free agency.`:`The offseason played out: ${o.resigned.length} re-signed, ${o.departed.length} left their teams, ${(o.signings??[]).filter(l=>l.from).length} changed teams in free agency.`);
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 const name=id=>LEAGUE.teamById(world,id)?.name??id;
 const regionTag=id=>LEAGUE.regionById(id)?.short??'';
 const teamTag=id=>{const t=LEAGUE.teamById(world,id);return t?`${t.name} (${regionTag(t.region)})`:id;};
 const isEventStage=key=>['first-stand','msi','worlds'].includes(key);
 // What a finished stage produced, in one line.
 function summaryText(s){
  if(!s)return world.phase==='complete'?`${teamTag(LEAGUE.worldsChampion(world))} win ${LEAGUE.EVENTS.worlds.name}!`:'Results saved.';
  if(s.leaders)return `${LEAGUE.stageName(world.calendar[world.stageIndex])} is over. Split leaders: ${LEAGUE.REGIONS.map(r=>`${r.short} ${name(s.leaders[r.id])}`).join(' · ')}.`;
  if(s.champions)return `${LEAGUE.stageName(world.calendar[world.stageIndex])} champions: ${LEAGUE.REGIONS.map(r=>`${r.short} ${name(s.champions[r.id])}`).join(' · ')}.`;
  if(s.seeds)return `Worlds is set: ${Object.values(s.seeds).flat().length} teams from six regions.`;
  return `${teamTag(s.champion)} win ${LEAGUE.EVENTS[s.stage].name}!`;
 }
 // Season play: simulate in the worker pool, then let the server validate and record each match.
 async function simulate(matches){const games=await Promise.all(matches.map(m=>pool.simulate({match:m,teams:LEAGUE.squads(world,m)})));await command({action:'record',results:matches.map((m,i)=>({matchId:m.id,games:games[i]}))},true);}
 // one: the next match · day: every match playable now (a week in every region, or a bracket round) · stage: to the
 // end of the stage · international: through the next international event · season: to the end of Worlds.
 async function run(mode){
  if(busy||hooks.blocked()||unsavedGame)return;stopping=false;busy=true;hooks.busy(true);render();
  try{
   let first=true;
   while(world.phase==='season'&&!stopping){
    if(world.awaiting){
     if(['one','day','stage'].includes(mode)&&!first)break;
     const done=world.awaiting.stage;if(mode==='international'&&!first&&isEventStage(done))break;
     await command({action:'advance'},true);first=false;continue;
    }
    const matches=LEAGUE.upcoming(world,mode==='one'?1:Infinity);if(!matches.length)break;
    say(`Simulating ${LEAGUE.stageName(LEAGUE.currentStage(world))} · ${matches.length} match${matches.length>1?'es':''}…`);await simulate(matches);first=false;
    if(mode==='one'||mode==='day')break;
    if(mode==='stage'&&world.awaiting)break;
    if(mode==='international'&&world.awaiting&&isEventStage(world.awaiting.stage))break;
   }
   say(summaryText(world.awaiting));
  }catch(e){say(e.message,true);}finally{busy=false;hooks.busy(false);render();}
 }
 async function saveWatchedGame(){
  if(!unsavedGame)return;const data=await api('POST',unsavedGame);accept(data);unsavedGame=null;render();
 }
 async function watchNext(){
  if(busy||hooks.blocked()||unsavedGame)return;const ready=LEAGUE.upcoming(world);let m=world.pendingSeries?ready[0]:ready.find(x=>x.userSide>=0)??ready[0];if(!m)return;busy=true;hooks.busy(true);render();
  let choice=null;
  try{
   while(m){
    const games=m.completedGames??[],plan=seriesGameOptions(m,games,choice),teams=plan.lineups.map(ids=>ids.map(id=>world.fighters[id])),label=`${LEAGUE.stageName(LEAGUE.currentStage(world))} · ${m.label}`;
    const result=await hooks.watch(teams,(m.seed+games.length*65537)>>>0,{conditions:m.conditions,tactics:plan.tactics,gamePlans:plan.gamePlans,engineVersion:m.engineVersion,balance:m.balance,caption:`${label} · game ${games.length+1} · ${name(m.home)} vs ${name(m.away)} · ${seriesScore(games).join('–')}`});
    unsavedGame={action:'seriesGame',format:size,revision,operationId:crypto.randomUUID(),matchId:m.id,game:{...compactTeamResult(result),...plan}};
    await saveWatchedGame();const partial=world.pendingSeries;
    if(!partial){say('Series complete and saved.');break;}
    const next=LEAGUE.upcoming(world,1)[0],me=mine(),side=next.userSide,nextPlan=seriesGameOptions(next,partial.games);
    choice=await hooks.intermission({title:`Game ${partial.games.length} saved · ${name(m.home)} vs ${name(m.away)}`,score:seriesScore(partial.games),result,canCoach:side>=0,roster:me?me.roster.map(id=>world.fighters[id]):[],lineup:side>=0?nextPlan.lineups[side]:[],tactic:nextPlan.tactics[side]??'balanced',gamePlan:side>=0?nextPlan.gamePlans?.[side]??null:null,tactics:Object.entries(TACTIC_TEXT).map(([key,[label]])=>[key,label])});
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
  const info=el('div');info.append(el('p',`${roleText(f)} · ${f.summary.tier} tier${!title&&rookie(f)?' · rookie':''}`,'eyebrow'),el('h3',f.name),el('p',`${title?title.championName:f.team?name(f.team):'Free agent'} · OVR ${snapshot?f.ovr:delta(f)} · ${title?money(f.salary)+' salary':contractText(f,true)}`,'muted'));
  if(!title&&f.prefs)info.append(el('p',styleText(f),'muted fighter-style'));
  if(!title&&f.region)info.append(el('p',`Home region: ${LEAGUE.regionById(f.region).name}${f.locked?' · rookie: only teams there can sign him until his first contract ends':''}`,'muted'));
  if(!title&&f.careerStart!==undefined){const n=LEAGUE.careerSeason(world,f);info.append(el('p',`Career season ${n} of ${LEAGUE.CAREER.retireAfter}${n>LEAGUE.CAREER.retireAfter?' · earned another season':n===LEAGUE.CAREER.retireAfter?' · retires after this season unless MVP or in top form':n>=LEAGUE.CAREER.declineFrom?' · declining with age':''}`,'muted fighter-career'));}
  const sprite=mountSpritePreview(f),identity=el('div','','fighter-dialog-id');identity.append(...(sprite?[sprite]:[]),info);head.append(identity,close);
  const traits=el('dl','','fighter-traits');
  for(const [label,value]of [['Race',[t.race,t.subrace].filter(Boolean).join(' · ')],['Class',[t.class,t.subclass].filter(Boolean).join(' · ')],['Weapon',[t.weapon,t.mastery].filter(Boolean).join(' · ')],['Abilities',[ability(t.power),ability(t.power2)].filter(Boolean).join(' · ')||'None'],['Weakness',t.weakness||'None']]){const row=el('div');row.append(el('dt',label),el('dd',value));traits.append(row);}
  const bars=el('div','','fighter-stats'),values=f.summary.stats??[],top=Math.max(800,...values);
  STAT_KEYS.forEach((key,i)=>{const row=el('div','','fighter-stat'),track=el('span','','fighter-stat-track'),fill=el('span');fill.style.width=Math.min(100,(values[i]??0)/top*100)+'%';track.append(fill);row.append(el('span',key),track,el('strong',String(values[i]??0)));bars.append(row);});
  bars.append(el('p',`Total ${f.summary.total} · rolls: ${[t.strength,t.speed,t.durability,t.iq,t.magic].filter(Boolean).join(' · ')}`,'muted'));
  const season=el('div','','fighter-season');
  if(stats?.games){for(const [label,value]of [['Games',stats.games],['Damage',stats.damage],['Healing',stats.healing],['KOs',stats.kills],['Downs',stats.deaths],['Control',`${stats.ccSeconds}s`],['Impact / game',Math.round(LEAGUE.impact(stats)/stats.games)]]){const cell=el('div','','offseason-fact');cell.append(el('strong',String(value)),el('span',label));season.append(cell);}}
  else season.append(el('p',`No games recorded in season ${title?.season??world.season}.`,'muted'));
  const c=!title&&f.career?.games?f.career:null,career=el('div','','fighter-season');
  if(c)for(const [label,value]of [['Seasons',c.seasons],['Games',c.games],['Win %',Math.round(c.wins/c.games*100)],['Damage',c.damage],['Healing',c.healing],['KOs',c.kills],['Control',`${Math.round(c.cc)}s`],['Worlds',c.trophies?.worlds??c.titles],['MSI',c.trophies?.msi??0],['First Stand',c.trophies?.['first-stand']??0],['Split titles',c.trophies?.split??0],['Season MVPs',c.mvps]]){const cell=el('div','','offseason-fact');cell.append(el('strong',String(value)),el('span',label));career.append(cell);}
  const breakdown=button('Full trait breakdown','button secondary');breakdown.onclick=()=>{dialog.close();openTraitDetails({id:f.id,name:f.name,role:f.role,traits:f.traits,summary:f.summary},'overview');};
  dialog.append(head,el('h4','Traits'),traits,el('h4','Stats'),bars,el('h4',`Season ${title?.season??world.season}`),season,...(c?[el('h4','Career'),career]:[]),breakdown);dialog.showModal();
 }
 function fighterRow(f,extra=[],ovrText=String(f.ovr)){const tr=el('tr','',`role-${f.role}`);tr.append(cell(fighterLink(f)),el('td',`${roleText(f)}`),el('td',f.summary.tier),el('td',ovrText,'ovr'),el('td',contractText(f)),...extra.map(cell));return tr;}
 // Contracts: the salary a team pays and the last season it covers; free agents show what they ask.
 function contractText(f,long=false){
  if(!world.contractsVersion)return money(f.salary)+(long?' salary':'');
  if(!f.contract)return long?`free agent · asks ${money(f.salary)} for ${LEAGUE.wantedYears(world,f)} season${LEAGUE.wantedYears(world,f)>1?'s':''}`:`asks ${money(f.salary)}`;
  const c=f.contract,last=c.until===world.season&&['ready','season','playoffs','complete'].includes(world.phase);
  return long?`${money(c.salary)} a season through season ${c.until}${last?' (final year)':''} · market value ${money(f.salary)}`:`${money(c.salary)} · to S${c.until}${last?' ⏳':''}`;
 }
 // A fighter's preferred style, and how he fits his team (±4% to strength, speed, durability and magic in games).
 function styleText(f){
  const style=f.prefs.style,label=style==='balanced'?'Adaptable: fits any style':`Prefers ${TACTIC_TEXT[style][0].toLowerCase()} teams`;if(!f.team)return label+'.';
  const team=LEAGUE.teamById(world,f.team),fit=LEAGUE.fit(world,f,team);
  return `${label} · ${fit>0?`fits how the ${team.name} play (+4% in games)`:fit<0?`clashes with how the ${team.name} play (−4% in games)`:`neutral fit with the ${team.name}`}.`;
 }
 const fitMark=(f,team)=>{const n=world.contractsVersion?LEAGUE.fit(world,f,team):0;return n>0?'▲ fits':n<0?'▼ clash':'·';};
 const delta=f=>f.lastOvr!==undefined&&f.lastOvr!==f.ovr?`${f.ovr} (${f.ovr>f.lastOvr?'+':''}${f.ovr-f.lastOvr})`:String(f.ovr);
 function check(label,checked=false){const box=el('input');box.type='checkbox';box.checked=checked;box.setAttribute('aria-label',label);return box;}
 function table(headers,rows,caption){const wrap=el('div','','table-scroll'),t=el('table','','team-league-table');if(caption)t.append(el('caption',caption));const head=el('thead'),hr=el('tr');for(const h of headers)hr.append(el('th',h));head.append(hr);const tb=el('tbody');tb.append(...rows);t.append(head,tb);wrap.append(t);return wrap;}
 function openPanel(title,content){
  const head=el('div','','fighter-dialog-head'),close=button('Close','quiet');close.onclick=()=>panel.close();head.append(el('h3',title),close);
  panel.replaceChildren(head,content);panel.showModal();panel.scrollTop=0;
 }
 // Past seasons: pick a season, then its internationals or any region's three splits, points and qualifier.
 function seasonsPanel(){
  const box=el('div','','past-seasons'),list=LEAGUE.pastSeasons(world);
  if(!list.length){box.append(el('p','No finished seasons yet.','muted'));return box;}
  if(!list.includes(archiveSeason))archiveSeason=list[0];
  const draw=()=>{
   const n=archiveSeason,at=list.indexOf(n),p=LEAGUE.pastSeason(world,n),e=p.entry,nameOf=id=>`${p.names[id]??id}${p.regions[id]?` (${regionTag(p.regions[id])})`:''}`,plain=id=>p.names[id]??id;
   const picker=el('div','','season-picker'),older=button('‹ Older','quiet'),newer=button('Newer ›','quiet'),pick=el('select');
   pick.setAttribute('aria-label','Season');for(const s of list){const w=(world.titles??[]).find(t=>t.season===s&&t.event==='worlds');const o=el('option',`Season ${s}${w?` · ${w.championName}`:''}`);o.value=String(s);o.selected=s===n;pick.append(o);}
   older.disabled=at>=list.length-1;newer.disabled=at<=0;older.onclick=()=>{archiveSeason=list[at+1];draw();};newer.onclick=()=>{archiveSeason=list[at-1];draw();};pick.onchange=()=>{archiveSeason=Number(pick.value);draw();};
   picker.append(older,pick,newer);const parts=[picker],tabRow=el('div','','circuit-tabs');
   for(const [key,label]of [['intl','🌐 Internationals'],...LEAGUE.REGIONS.map(r=>[r.id,r.name])]){const b=button(label,'circuit-tab');b.setAttribute('aria-selected',String(archiveTab===key));b.onclick=()=>{archiveTab=key;draw();};tabRow.append(b);}
   parts.push(tabRow);
   const resolve=x=>x;
   if(archiveTab==='intl'){
    if(p.award?.mvpName)parts.push(el('p',`Season MVP: ${p.award.mvpName}${p.award.mvpTeam?` (${nameOf(p.award.mvpTeam)})`:''}`,'mvp'));
    for(const key of ['worlds','msi','first-stand']){const t=p.titles.find(x=>x.event===key);if(!t&&!e?.events?.[key])continue;
     const banner=el('section','','champion-banner');banner.append(el('p',`Season ${n} · ${LEAGUE.EVENTS[key].name}`,'eyebrow'),el('h3',`👑 ${nameOf(t?.champion)}`),el('p',`Defeated ${nameOf(t?.runnerUp)} in the final.${t?.mvpName?` MVP: ${t.mvpName}.`:''}`,'muted'));parts.push(banner);
     if(e?.events?.[key]){const ev=e.events[key];parts.push(eventView(key,ev,resolve,nameOf,g=>ev.phases[0].tables?.[g]??[]));}}
    if(!e)parts.push(el('p','Only the champions were kept for this season.','muted'));
   }else{
    const r=archiveTab;
    for(const k of [1,2,3]){const t=p.titles.find(x=>x.event==='split'&&x.split===k&&x.region===r),s=e?.splits?.[k]?.[r];if(!t&&!s)continue;
     parts.push(el('h4',`Split ${k}${t?` · 👑 ${plain(t.champion)}${t.mvpName?` · MVP ${t.mvpName}`:''}`:''}`,'bracket-row-label'));
     if(s){parts.push(recordTable(s.table,plain,`Split ${k} table`,{marks:new Map((s.bracket?.seeds??[]).map((id,i)=>[id,`#${i+1}`]))}));if(s.bracket)parts.push(bracketView(s.bracket,resolve,plain,`Split ${k} playoffs`));}}
    if(e){const ids=Object.keys(e.points).filter(id=>p.regions[id]===r).sort((a,b)=>e.points[b]-e.points[a]),seeds=e.worldsSeeds?.[r]??[];
     parts.push(table(['Team','Points','Worlds'],ids.map(id=>{const tr=el('tr','',seeds.includes(id)?'seeded':'');tr.append(el('td',plain(id)),el('td',String(e.points[id])),el('td',seeds.includes(id)?`#${seeds.indexOf(id)+1}`:''));return tr;}),'Championship points'));
     const q=e.qualifiers?.[r];if(q?.bracket)parts.push(bracketView(q.bracket,resolve,plain,'Regional qualifier'));}
   }
   box.replaceChildren(...parts);
  };
  draw();return box;
 }
 // Trophy cabinet: every international and split champion, titles by region and the most decorated teams.
 function trophyPanel(){
  const box=el('div','','past-seasons'),titles=[...(world.titles??[])].sort((a,b)=>b.season-a.season),tag=id=>teamTag(id);
  if(!titles.length){box.append(el('p','No titles yet. Every split, First Stand, MSI and Worlds champion lands here.','muted'));return box;}
  for(const key of ['worlds','msi','first-stand']){const list=titles.filter(t=>t.event===key);if(!list.length)continue;const rows=list.map(t=>{const tr=el('tr');tr.append(el('td',String(t.season)),el('td',tag(t.champion)),el('td',tag(t.runnerUp)),el('td',t.mvpName??'—'));return tr;});box.append(table(['Season','Champion','Runner-up','MVP'],rows,`${LEAGUE.EVENTS[key].name} champions`));}
  const byRegion=LEAGUE.REGIONS.map(r=>{const count=k=>titles.filter(t=>t.event===k&&LEAGUE.regionOfTeam(world,t.champion)===r.id).length;const tr=el('tr');tr.append(el('td',r.name),el('td',String(count('worlds'))),el('td',String(count('msi'))),el('td',String(count('first-stand'))));return tr;});
  box.append(table(['Region','Worlds','MSI','First Stand'],byRegion,'International titles by region'));
  const splitRows=titles.filter(t=>t.event==='split').reduce((m,t)=>{const k=`${t.season}:${t.region}`;(m[k]??={season:t.season,region:t.region,s:{}}).s[t.split]=t;return m;},{}),srows=Object.values(splitRows).sort((a,b)=>b.season-a.season||LEAGUE.REGION_IDS.indexOf(a.region)-LEAGUE.REGION_IDS.indexOf(b.region)).map(x=>{const tr=el('tr');tr.append(el('td',String(x.season)),el('td',LEAGUE.regionById(x.region).name),...[1,2,3].map(k=>el('td',x.s[k]?name(x.s[k].champion):'—')));return tr;});
  box.append(table(['Season','Region','Split 1','Split 2','Split 3'],srows,'Split champions'));
  const weight={worlds:3,msi:2,'first-stand':1},teams=world.teams.map(t=>{const mine=titles.filter(x=>x.champion===t.id),n=k=>mine.filter(x=>x.event===k).length;return {t,n,score:mine.reduce((s,x)=>s+(weight[x.event]??LEAGUE.SPLIT_PRESTIGE[x.split]??.5),0)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,15);
  box.append(table(['Team','Worlds','MSI','First Stand','Splits'],teams.map(({t,n})=>{const tr=el('tr');tr.append(el('td',tag(t.id)),el('td',String(n('worlds'))),el('td',String(n('msi'))),el('td',String(n('first-stand'))),el('td',String(n('split'))));return tr;}),'Most decorated teams'));
  return box;
 }
 // Hall of Fame: retired MVPs and role standouts with their lifetime numbers.
 function hallPanel(){
  const box=el('div');if(!world.hallOfFame?.length)box.append(el('p','No legends yet. Season MVPs, Worlds champions and standout veterans join when they retire.','muted'));
  for(const e of world.hallOfFame??[]){
   const card=el('article','','hall-card'),head=el('div','','hall-card-head');head.append(el('h4',e.name),el('span',[e.mvps?`${'★'.repeat(Math.min(5,e.mvps))} ${e.mvps} MVP`:'',e.trophies?.worlds?`${e.trophies.worlds}× Worlds`:e.titles?`${e.titles}× Worlds`:'',e.trophies?.msi?`${e.trophies.msi}× MSI`:'',e.trophies?.['first-stand']?`${e.trophies['first-stand']}× First Stand`:'',e.trophies?.split?`${e.trophies.split} split title${e.trophies.split>1?'s':''}`:''].filter(Boolean).join(' · '),'hall-honours'));
   card.append(head,el('p',`${e.class} (${e.subclass}) · ${ROLE_LABELS[e.role]??e.role}${e.region?` · from ${LEAGUE.regionById(e.region)?.name??e.region}`:''} · ${e.debut!=null?`seasons ${Math.max(1,e.debut)}–${e.retired}`:`retired season ${e.retired}`} · ${e.teams.join(', ')||'no team'}`,'muted'));
   const facts=el('div','','offseason-facts');for(const [label,value]of [['Games',e.stats.games],['Win %',Math.round(e.stats.wins/Math.max(1,e.stats.games)*100)],['Damage',e.stats.damage],['Healing',e.stats.healing],['KOs',e.stats.kills],['Control',`${e.stats.cc}s`]]){const f=el('div','','offseason-fact');f.append(el('strong',String(value)),el('span',label));facts.append(f);}card.append(facts);
   if(e.excelled.length){const chips=el('div','','hall-excelled');chips.append(el('span','Excelled at','eyebrow'));for(const x of e.excelled.slice(0,3))chips.append(el('span',`${x.label} ${x.perGame}/game · top ${x.top}% of ${ROLE_PLURAL[e.role]??e.role}`,'hall-chip'));card.append(chips);}
   box.append(card);
  }
  return box;
 }
 // Balance report: win rates over every logged season, and a
 // plain-text copy to share.
 function balancePanel(){
  const box=el('div'),report=LEAGUE.balanceReport(world);
  if(!report.seasons.length){box.append(el('p','Finish a season to start the report. Every season from then on is kept here: rosters, results and win rates by class and subclass.','muted'));return box;}
  const copy=button('Copy report'),note=el('p','','muted'),text=el('textarea','','balance-report-text');text.readOnly=true;text.hidden=true;text.rows=8;text.style.width='100%';note.setAttribute('role','status');
  copy.onclick=async()=>{const value=LEAGUE.balanceReportText(world);try{await navigator.clipboard.writeText(value);note.textContent='Balance report copied: paste it into a chat.';}catch{text.value=value;text.hidden=false;text.focus();text.select();note.textContent='Copy the selected report text.';}};
  const rows=list=>list.map(e=>{const row=el('tr');row.append(el('td',e.key),el('td',String(e.games)),el('td',e.pct.toFixed(1)+'%'),el('td',`${e.ci[0].toFixed(1)}–${e.ci[1].toFixed(1)}`));return row;});
  box.append(el('p',`${report.seasons.length} season${report.seasons.length===1?'':'s'} logged (${report.games} games).`,'muted'),copy,note,text,table(['Subclass','Games','Win %','95% range'],rows(report.subclass),'Win rate by subclass (fighter games)'),table(['Class','Games','Win %','95% range'],rows(report.class),'Win rate by class'));
  return box;
 }
 function renderSetup(){
  const card=el('section','','team-league-setup'),pick=el('div','','team-size-pick');
  card.append(el('h3',`Found a ${size}v${size} circuit`),el('p',`Six regions of team cast fighters, each growing its own talent: two top regions with the most S and SS fighters, a strong third, a rising fourth, and two emerging regions where a star is rare. Every season has three splits, then First Stand, MSI and Worlds. Rookies sign only at home until their first contract ends; free agents may sign anywhere. Rosters hold ${LEAGUE.FORMATS[size].rosterSize} fighters on contracts of 1–${LEAGUE.CONTRACT.maxYears} seasons.`,'muted'));
  const rules=el('select'),rulesLabel=el('label','Battle rules');rules.setAttribute('aria-label','League battle rules');for(const [value,text]of [...(size===2?[]:[['core','Core siege']]),['teamfight',size===2?'Team battle':'Classic teamfight']]){const o=el('option',text);o.value=value;rules.append(o);}rules.value=size===2?'teamfight':'core';rules.disabled=busy;rulesLabel.append(rules);card.append(rulesLabel);
  for(const n of LEAGUE.REGION_SIZES){const b=button(`${n} teams per region`,'button secondary');b.disabled=busy;b.onclick=()=>found(n,rules.value);const label=el('span',`${n*LEAGUE.REGIONS.length} teams · ${LEAGUE.poolSize(size,n)*LEAGUE.REGIONS.length} fighters`,'muted');const option=el('div','','team-size-option');option.append(b,label);pick.append(option);}
  card.append(pick);body.append(card);
 }
 function teamCard(team){
  const card=el('button','','team-card');card.type='button';card.dataset.personality=team.coach.personality;if(selected===team.id)card.classList.add('active');if(world.settings.userTeam===team.id)card.classList.add('mine');
  const pay=LEAGUE.payroll(world,team),cap=LEAGUE.capOf(world,team),bar=el('span','','cap-bar'),fill=el('span');fill.style.width=Math.min(100,pay/cap*100)+'%';bar.append(fill);
  const roster=el('span',team.roster.map(id=>ROLE_GLYPH[world.fighters[id].role]).join(' ')||'—','team-card-roster');
  const r=LEAGUE.seasonRecords(world).get(team.id),recordText=r?` · ${r.wins}–${r.losses}`:'';
  card.append(el('strong',team.name+recordText),el('span',`${team.coach.name} · ${LEAGUE.PERSONALITIES[team.coach.personality].label}`,'team-card-coach'),roster,el('span',`${money(pay)} / ${money(cap)} · ${team.roster.length}/${world.settings.rosterSize}`,'team-card-pay'),bar);
  card.setAttribute('aria-expanded',String(selected===team.id));card.onclick=()=>{selected=selected===team.id?null:team.id;render();};return card;
 }
 // A region's teams (the coached team first), each opening its detail inline.
 function renderTeams(region){
  const wrap=el('section','','team-conferences'),d=el('div','','team-division');d.append(el('h4',`${LEAGUE.regionById(region).name} teams`));
  for(const team of LEAGUE.regionTeams(world,region).sort((a,b)=>(b.id===world.settings.userTeam)-(a.id===world.settings.userTeam)||(a.name<b.name?-1:1))){d.append(teamCard(team));if(selected===team.id)d.append(renderTeamDetail());}
  wrap.append(d);body.append(wrap);
 }
 // Opens inline under the team's card, like a dropdown.
 function renderTeamDetail(){
  const team=LEAGUE.teamById(world,selected);if(!team)return el('div');const section=el('section','','team-detail'),starters=new Set(team.lineup.length?team.lineup:LEAGUE.bestLineup(world,team)),coached=world.settings.userTeam===team.id;
  const tactic=LEAGUE.teamTactic(world,team),plays=LEAGUE.compLabel(LEAGUE.roleCounts(world,{roster:[...starters]})),plan=LEAGUE.compLabel(LEAGUE.starterTargets(world,team));
  section.append(el('h3',team.name+(coached?' · your team':'')),el('p',`${coached?'You are head coach':'Head coach '+team.coach.name+' · '+LEAGUE.PERSONALITIES[team.coach.personality].label} · ${LEAGUE.regionById(team.region).name} · cap ${money(LEAGUE.capOf(world,team))}, space ${money(LEAGUE.capSpace(world,team))} · tactic: ${TACTIC_TEXT[tactic][0]}`,'muted'),el('p',`Plays: ${plays||'—'}${plays!==plan?` · coach's plan: ${plan}`:''}`,'team-comp'));if(world.settings.battleMode==='core')section.append(el('p',`Game plan: ${gamePlanSummary(LEAGUE.teamGamePlan(world,team))}`,'team-comp'));
  const editing=coached&&['ready','season','playoffs'].includes(world.phase),size=LEAGUE.FORMATS[world.format].size,boxes=[];
  const rows=team.roster.map(id=>world.fighters[id]).sort((a,b)=>starters.has(b.id)-starters.has(a.id)||b.ovr-a.ovr).map(f=>{if(!editing)return fighterRow(f,[fitMark(f,team),starters.has(f.id)?'Starter':'Bench']);const box=check(`Start ${f.name}`,starters.has(f.id));box.value=f.id;box.disabled=busy;boxes.push(box);return fighterRow(f,[fitMark(f,team),box]);});
  section.append(table(['Fighter','Role','Tier','OVR','Contract','Style fit',editing?'Start':'Lineup'],rows,`Roster · team OVR ${LEAGUE.teamOverall(world,team)}`));
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
   if(world.settings.battleMode==='core'){const fields=gamePlanFields(LEAGUE.teamGamePlan(world,team),{disabled:busy,onchange:plan=>command({action:'gamePlan',plan}).then(()=>say(`Game plan set: ${gamePlanSummary(plan)}.`)).catch(e=>say(e.message,true))});section.append(el('h4','Core siege game plan'),fields.element);}
  }
  if(world.phase!=='market'&&team.roster.length>=size){
   const opponents=world.teams.filter(t=>t.id!==team.id),choice=el('select');choice.setAttribute('aria-label','Scrimmage opponent');for(const t of opponents){const o=el('option',`${t.name} · OVR ${LEAGUE.teamOverall(world,t)}`);o.value=t.id;choice.append(o);}
   const watch=button('Watch scrimmage','button primary');watch.disabled=busy||hooks.blocked();
   watch.onclick=async()=>{try{const rival=LEAGUE.teamById(world,choice.value),squads=[team,rival].map(t=>LEAGUE.starters(world,t)),result=await hooks.watch(squads,crypto.getRandomValues(new Uint32Array(1))[0],{conditions:{time:'random',weather:'random',ground:'random',map:'random'},tactics:[LEAGUE.teamTactic(world,team),LEAGUE.teamTactic(world,rival)],engineVersion:engineForMode(world.settings.battleMode),...(world.settings.battleMode==='core'?{gamePlans:[LEAGUE.teamGamePlan(world,team),LEAGUE.teamGamePlan(world,rival)]}:{}),caption:`Scrimmage · ${team.name} vs ${rival.name}`});say(`${result.winnerTeam?rival.name:team.name} win the scrimmage (${result.reason}).`);}catch(e){say(e.message,true);}};
   const row=el('div','','team-scrimmage');row.append(choice,watch);section.append(el('h4','Scrimmage'),row);
  }
  return section;
 }
 // Free agency (the opening auction and every offseason): rounds of offers; each fighter signs the one he likes best.
 function renderFreeAgency(top=null){
  const m=world.market,live=LEAGUE.marketOpen(world),panel=el('section','','team-draft'),coach=mine(),bidding=live&&!!coach&&openSpots(coach)>0,offers=new Map((m?.offers??[]).map(o=>[o.fighter,o]));
  if(live){
   panel.append(el('h3',m.kind==='founding'?'Opening auction':`Season ${world.season+1} free agency`,'offseason-title'));
   const clock=el('div','','draft-clock');clock.append(el('span',`Round ${m.round+1} of up to ${LEAGUE.CONTRACT.rounds} · ${world.teams.reduce((n,t)=>n+openSpots(t),0)} roster spots open`,'eyebrow'));
   if(bidding){
    const room=LEAGUE.capSpace(world,coach),committed=[...offers.values()].reduce((n,o)=>n+o.salary,0);clock.classList.add('mine');
    clock.append(el('strong',`${coach.name}: ${openSpots(coach)} open spot${openSpots(coach)>1?'s':''} · ${offers.size} offer${offers.size===1?'':'s'} out`),el('span',`Cap space ${money(room)} · offered ${money(committed)} · free agents take less as the rounds go on (now ${Math.round(LEAGUE.askFloor(m.round)*100)}% of their ask). Unfilled spots after the last round get the cheapest free agents on one-season minimum deals.`,'muted'));
   }else clock.append(el('strong',coach?`${coach.name}: roster full`:'Teams from every region bid'),el('span','Each fighter signs the offer he likes best: money, a contender, a starting spot, a team that plays his style, loyalty, his home region and the length he wants. Rookies (🔒) sign only in their home region.','muted'));
   const actions=el('div','','draft-actions');
   if(bidding){const next=button(offers.size?'Send offers · next round':'Pass · next round','button primary');next.disabled=busy||hooks.blocked();next.onclick=()=>marketSim(1);actions.append(next);}
   else for(const [text,count,cls]of [['Sim next round',1,'button primary'],['Sim to the end',100,'button secondary']]){const b=button(text,cls);b.disabled=busy||hooks.blocked();b.onclick=()=>marketSim(count);actions.append(b);}
   (top??panel).append(clock,actions);
   if(offers.size){const rows=[...offers.values()].map(o=>{const f=world.fighters[o.fighter],b=button('Withdraw','quiet small');b.disabled=busy;b.onclick=()=>withdraw(o.fighter);return fighterRow(f,[`${money(o.salary)} × ${o.years}`,b]);});panel.append(table(['Fighter','Role','Tier','OVR','Asks','Your offer',''],rows,'Your offers this round'));}
  }
  const log=m?.log??[],recent=log.slice(-12).reverse().map(l=>{const f=world.fighters[l.fighter];if(!f)return null;const tr=el('tr','',`role-${f.role}`);tr.append(el('td',`R${l.round}${l.exception?' · min. deal':''}`),el('td',name(l.team)),cell(fighterLink(f)),el('td',`${roleText(f)}`),el('td',String(f.ovr),'ovr'),el('td',`${money(l.salary)} × ${l.years}`),el('td',l.from&&world.teams.some(t=>t.id===l.from)?`from ${LEAGUE.regionOfTeam(world,l.from)!==LEAGUE.regionOfTeam(world,l.team)?teamTag(l.from):name(l.from)}`:''));return tr;}).filter(Boolean);
  // The whole pool, filterable by role and sortable, so every fighter can be scouted.
  const pool=LEAGUE.available(world),sorts={ovr:(a,b)=>b.ovr-a.ovr||a.salary-b.salary,value:(a,b)=>b.ovr/b.salary-a.ovr/a.salary||b.ovr-a.ovr,salary:(a,b)=>a.salary-b.salary||b.ovr-a.ovr,stats:(a,b)=>b.summary.total-a.summary.total};
  const filters=el('div','','pool-filters');
  for(const [key,label]of [['all','All'],['tank',`${ROLE_GLYPH.tank} Tanks`],['healer',`${ROLE_GLYPH.healer} Healers`],['controller',`${ROLE_GLYPH.controller} Controllers`],['damage',`${ROLE_GLYPH.damage} Damage`]]){const n=key==='all'?pool.length:pool.filter(f=>f.role===key).length,chip=button(`${label} ${n}`,'pool-chip');chip.setAttribute('aria-pressed',String(poolRole===key));chip.onclick=()=>{poolRole=key;poolPage=0;render();};filters.append(chip);}
  const order=el('select');order.setAttribute('aria-label','Sort fighters');for(const [key,label]of [['ovr','Best OVR'],['value','Best value (OVR per salary)'],['salary','Cheapest'],['stats','Highest total stats']]){const o=el('option',label);o.value=key;o.selected=poolSort===key;order.append(o);}order.onchange=()=>{poolSort=order.value;poolPage=0;render();};filters.append(order);
  const where=el('select');where.setAttribute('aria-label','Home region');for(const [key,label]of [['all','All regions'],...LEAGUE.REGIONS.map(r=>[r.id,r.name])]){const o=el('option',label);o.value=key;o.selected=poolRegion===key;where.append(o);}where.onchange=()=>{poolRegion=where.value;poolPage=0;render();};filters.append(where);
  // Twelve fighters per page; the arrows page through the rest. A coach with open spots makes offers from here.
  const shown=pool.filter(f=>(poolRole==='all'||f.role===poolRole)&&(poolRegion==='all'||f.region===poolRegion)).sort(sorts[poolSort]),pages=Math.max(1,Math.ceil(shown.length/12)),page=Math.min(poolPage,pages-1);
  const offerCell=f=>{const wrap=el('div','','offer-controls'),pay=el('input'),years=el('select'),send=button(offers.has(f.id)?'Update':'Offer','button primary small'),made=offers.get(f.id);
   pay.type='number';pay.min='0.1';pay.step='0.1';pay.value=String(made?.salary??f.salary);pay.setAttribute('aria-label',`Salary offer for ${f.name} (millions)`);pay.disabled=busy;
   years.setAttribute('aria-label',`Seasons for ${f.name}`);years.disabled=busy;for(let y=1;y<=LEAGUE.CONTRACT.maxYears;y++){const o=el('option',`${y} yr${y>1?'s':''}${y===LEAGUE.wantedYears(world,f)?' · wants':''}`);o.value=String(y);o.selected=y===(made?.years??LEAGUE.wantedYears(world,f));years.append(o);}
   send.disabled=busy;send.onclick=()=>offer(f.id,Math.round(Number(pay.value)*10)/10,Number(years.value));wrap.append(pay,years,send);return wrap;};
  // A coach's offer controls sit on their own row under each fighter, so the table stays narrow enough for the side panel.
  const best=shown.slice(page*12,page*12+12).flatMap(f=>{const row=fighterRow(f,[f.prefs?(f.prefs.style==='balanced'?'Any':TACTIC_TEXT[f.prefs.style][0]):'—',`${regionTag(f.region)}${f.locked?' 🔒':''}`]);if(!bidding)return [row];
   const tr=el('tr','',`role-${f.role} offer-row${offers.has(f.id)?' offered':''}`),td=el('td');td.colSpan=7;td.append(LEAGUE.canSign(coach,f)?offerCell(f):el('span',`${LEAGUE.regionById(f.region).name} rookie: only teams there can sign him.`,'muted'));tr.append(td);return [row,tr];});
  const grid=el('div','','draft-grid');
  if(recent.length)grid.append(table(['Round','Team','Fighter','Role','OVR','Contract','Moved'],recent,live?'Latest signings':'Signings'));
  const poolPanel=el('div','','pool-panel'),list=table(['Fighter','Role','Tier','OVR','Asks','Prefers','Region'],best,`Free agents · ${shown.length} of ${pool.length}`);
  const pager=el('div','','pool-pager'),back=button('‹','quiet'),forward=button('›','quiet');back.setAttribute('aria-label','Previous 12 fighters');forward.setAttribute('aria-label','Next 12 fighters');back.disabled=page<=0;forward.disabled=page>=pages-1;back.onclick=()=>{poolPage=page-1;render();};forward.onclick=()=>{poolPage=page+1;render();};
  pager.append(back,el('span',shown.length?`${page*12+1}–${Math.min(shown.length,page*12+12)} of ${shown.length} · page ${page+1} / ${pages}`:'No fighters','muted'),forward);poolPanel.append(filters,list,pager);grid.append(poolPanel);
  panel.append(grid);body.append(panel);
 }
 function seasonActions(){
  const actions=el('div','','draft-actions');if(unsavedGame){const retry=button('Retry game save','button primary');retry.disabled=busy;retry.onclick=()=>saveWatchedGame().then(()=>say('Game saved. Resume the series when ready.')).catch(e=>say(e.message,true));actions.append(retry);return actions;}
  const list=world.phase==='ready'?[['Start season',beginSeason,'button primary']]:world.phase==='season'&&world.awaiting?[['Continue',advanceStage,'button primary'],['Sim through next international',()=>run('international'),'button secondary'],['Sim rest of season',()=>run('season'),'quiet']]:world.phase==='season'?[['Sim next match',()=>run('one'),'button secondary'],['Sim match day',()=>run('day'),'button primary'],['Sim to end of stage',()=>run('stage'),'quiet'],['Sim through next international',()=>run('international'),'quiet'],['Watch next game',watchNext,'quiet']]:world.phase==='complete'?[['Begin offseason',beginOffseason,'button primary']]:[];
  for(const [text,fn,cls]of list){const b=button(text,cls);b.disabled=busy||hooks.blocked();b.onclick=fn;actions.append(b);}
  if(busy&&world.phase==='season'){const stop=button('Stop after this batch','quiet danger');stop.disabled=stopping;stop.onclick=()=>{stopping=true;stop.disabled=true;};actions.append(stop);}
  return actions;
 }
 // The season calendar: done, current and upcoming stages, then the offseason.
 function calendarStrip(){
  const cal=world.calendar??LEAGUE.buildCalendar(world.season),now=world.phase==='season'?world.stageIndex:['complete','offseason'].includes(world.phase)?cal.length:-1,ol=el('ol','','calendar-strip');
  cal.forEach((st,i)=>{const li=el('li',LEAGUE.stageName(st),`stage-${st.kind}`);li.classList.toggle('done',i<now||i===now&&!!world.awaiting);li.classList.toggle('active',i===now&&!world.awaiting);ol.append(li);});
  const off=el('li','Offseason','stage-offseason');off.classList.toggle('active',world.phase==='offseason');ol.append(off);return ol;
 }
 const defaultView=()=>{const t=mine();return t?t.region:'world';};
 function tabs(){
  const row=el('div','','circuit-tabs');row.setAttribute('role','tablist');
  for(const [key,label]of [['world','🌐 World'],...LEAGUE.REGIONS.map(r=>[r.id,r.name])]){const b=button(label,'circuit-tab');b.setAttribute('role','tab');b.setAttribute('aria-selected',String(view===key));if(mine()?.region===key)b.classList.add('mine');b.onclick=()=>{view=key;selected=null;render();};row.append(b);}
  return row;
 }
 const clock=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
 // A series card: both teams (seed numbers when given), the score, the format and each game.
 function seriesCard(m,nameOf,seedOf=()=>'',placeholder=null){
  const card=el('div','',`playoff-series${m?.winner?' done':''}`);
  if(!m){for(let i=0;i<2;i++){const row=el('div','','playoff-team');row.append(el('span','','seed'),el('span','TBD'),el('strong',''));card.append(row);}card.append(el('small',`Bo${placeholder}`));return card;}
  const wins=[0,1].map(i=>m.games.filter(g=>g[0]===i).length);
  for(const [i,id]of [[0,m.home],[1,m.away]]){const row=el('div','',`playoff-team${m.winner===id?' winner':''}`);const s=seedOf(id);row.append(el('span',s?`#${s}`:'','seed'),el('span',nameOf(id)),el('strong',m.games.length?String(wins[i]):''));card.append(row);}
  card.append(el('small',`Bo${m.bestOf}`));
  if(m.games.length>0&&m.bestOf>1){const games=el('ol','','series-games');for(const g of m.games)games.append(el('li',`${nameOf(g[0]?m.away:m.home)} won · ${g[1+g[0]]}%–${g[2-g[0]]}% · ${clock(g[3])}`));card.append(games);}
  else if(m.games.length)card.append(el('small',` · ${m.games[0][1+m.games[0][0]]}%–${m.games[0][2-m.games[0][0]]}% · ${clock(m.games[0][3])}`));
  return card;
 }
 // Any bracket (split playoffs, qualifier ladders, GSL, double elimination, knockouts): columns by round, with the
 // matches still to be decided shown as TBD. Double elimination shows the upper and lower brackets on their own rows.
 function bracketView(b,resolve,nameOf,title){
  const t=TEMPLATES[b.template],wrap=el('section','','team-playoffs');wrap.append(el('h3',title));
  const seedOf=id=>{const i=b.seeds?.indexOf(id)??-1;return i>=0&&!b.template.startsWith('knockout')?i+1:'';};
  const rows=['double8','double4'].includes(b.template)?[['Upper bracket',t.nodes.filter(n=>!n.key.startsWith('l'))],['Lower bracket',t.nodes.filter(n=>n.key.startsWith('l'))]]:[[null,t.nodes]];
  for(const [label,nodes]of rows){if(label)wrap.append(el('h4',label,'bracket-row-label'));const grid=el('div','','playoff-rounds');
   for(const round of [...new Set(nodes.map(n=>n.label))]){const col=el('div','','playoff-round');col.append(el('h4',round));for(const n of nodes.filter(x=>x.label===round))col.append(seriesCard(b.matches[n.key]?resolve(b.matches[n.key]):null,nameOf,seedOf,n.bestOf));grid.append(col);}
   wrap.append(grid);}
  return wrap;
 }
 // A table of series records (groups, splits): wins, losses, game difference, HP margin, streak.
 function recordTable(rows,nameOf,caption,{marks=new Map(),games=false}={}){
  const out=rows.map((r,i)=>{const tr=el('tr','',marks.get(r.id)?'seeded':'');tr.append(el('td',`${i+1}. ${nameOf(r.id)}${marks.get(r.id)?' '+marks.get(r.id):''}`),el('td',String(r.wins)),el('td',String(r.losses)),...(games?[el('td',`${r.gamesWon}–${r.gamesLost}`)]:[]),el('td',(r.margin>0?'+':'')+r.margin),el('td',r.streak||'—'));return tr;});
  return table(['Team','W','L',...(games?['Games']:[]),'±HP','STRK'],out,caption);
 }
 // Swiss stage: every team's record and status, then each round's matches.
 function swissBoard(ph,resolve,nameOf){
  const wrap=el('section','','team-playoffs swiss-board');wrap.append(el('h3','Swiss stage · 3 wins advance, 3 losses go home'));
  const rec=Object.fromEntries(ph.teams.map(id=>[id,[0,0]]));for(const round of ph.rounds)for(const x of round){const m=resolve(x);if(!m.winner)continue;rec[m.winner][0]++;rec[m.winner===m.home?m.away:m.home][1]++;}
  const rows=ph.teams.slice().sort((a,b)=>rec[b][0]-rec[a][0]||rec[a][1]-rec[b][1]||ph.teams.indexOf(a)-ph.teams.indexOf(b)).map(id=>{const [w,l]=rec[id],tr=el('tr','',w>=3?'seeded':l>=3?'out':'');tr.append(el('td',nameOf(id)),el('td',`${w}–${l}`),el('td',w>=3?'Advanced':l>=3?'Eliminated':'Playing'));return tr;});
  const grid=el('div','','playoff-rounds');ph.rounds.forEach((round,i)=>{const col=el('div','','playoff-round');col.append(el('h4',`Round ${i+1}`));for(const x of round){const m=resolve(x);const card=seriesCard(m,nameOf);card.prepend(el('small',m.label?.split('· ').pop()??'','swiss-record'));col.append(card);}grid.append(col);});
  wrap.append(table(['Team','Record','Status'],rows,'Standings'),grid);return wrap;
 }
 const phaseTitle=ph=>({'group-a':'Group A (GSL, Bo5)','group-b':'Group B (GSL, Bo5)',bracket:'Bracket stage (double elimination)',knockout:'Knockout stage'})[ph.key]??(ph.key==='play-in'?(ph.template==='double4'?'Play-in (double elimination, one team advances)':'Play-in (GSL group)'):ph.key);
 // An international event, live or archived: groups, play-ins, the Swiss stage and brackets in order.
 function eventView(key,ev,resolve,nameOf,groupRows){
  const wrap=el('div','','event-view');
  for(const ph of ev.phases){
   if(ph.format==='groups'){const grid=el('div','','draft-grid');for(const g of Object.keys(ph.groups)){const box=el('div');box.append(recordTable(groupRows(g),nameOf,`Group ${g}`,{games:true}));const list=el('div','','playoff-rounds');ph.rounds[g].forEach((round,i)=>{const col=el('div','','playoff-round');col.append(el('h4',`Round ${i+1}`));for(const x of round)col.append(seriesCard(resolve(x),nameOf));list.append(col);});box.append(list);grid.append(box);}wrap.append(el('h4','Group stage','bracket-row-label'),grid);}
   else if(ph.format==='swiss'&&!ph.teams)wrap.append(el('p',`Swiss stage: waiting for the play-in.`,'muted'));
   else if(ph.format==='swiss')wrap.append(swissBoard(ph,resolve,nameOf));
   else if(ph.seeds)wrap.append(bracketView(ph,resolve,nameOf,phaseTitle(ph)));
   else{const before=ev.phases[ev.phases.indexOf(ph)-1];wrap.append(el('p',`${phaseTitle(ph)}: waiting for the ${before.format==='swiss'?'Swiss stage':phaseTitle(before).split(' (')[0].toLowerCase()}.`,'muted'));}
  }
  return wrap;
 }
 const liveResolve=x=>typeof x==='string'?world.year.matches[x]:x;
 // Shown when a stage ends: its champions or qualifiers, with Continue to start the next one.
 function stageBanner(){
  const s=world.awaiting,st=world.calendar[world.stageIndex],banner=el('section','','champion-banner stage-banner');banner.append(el('p',`Season ${world.season} · ${LEAGUE.stageName(st)} complete`,'eyebrow'));
  if(s.champion){banner.append(el('h3',`👑 ${teamTag(s.champion)}`),el('p',`${LEAGUE.EVENTS[s.stage].name} champions.`,'muted'));const t=world.titles.at(-1);if(t?.mvpName)banner.append(el('p',`MVP: ${t.mvpName}`,'mvp'));if(s.bonus)banner.append(el('p',`${name(s.champion)} qualify for ${LEAGUE.EVENTS.worlds.name}; ${LEAGUE.regionById(s.bonus).name} earns an extra Worlds seed.`,'muted'));}
  else if(s.champions||s.leaders){const map=s.champions??s.leaders,ul=el('ul','','offseason-notes');for(const r of LEAGUE.REGIONS)ul.append(el('li',`${r.name}: ${name(map[r.id])}`));banner.append(el('h3',s.champions?'Split champions':'Split leaders'),ul);}
  else if(s.seeds){const ul=el('ul','','offseason-notes');for(const r of LEAGUE.REGIONS)ul.append(el('li',`${r.name}: ${(s.seeds[r.id]??[]).map((id,i)=>`#${i+1} ${name(id)}`).join(' · ')}`));banner.append(el('h3','Worlds qualifiers'),ul);}
  const next=world.calendar[world.stageIndex+1];if(next)banner.append(el('p',`Next: ${LEAGUE.stageName(next)}.`,'muted'));return banner;
 }
 function renderWorld(){
  const sec=el('section','','world-view'),y=world.year,st=LEAGUE.currentStage(world);
  // The international on now, or the latest one played this season.
  const key=st?.kind==='event'?st.event:['worlds','msi','first-stand'].find(k=>y?.events?.[k]);
  if(key&&y?.events?.[key]){const ev=y.events[key],head=el('div','','event-head');head.append(el('h3',LEAGUE.EVENTS[key].name),el('p',`${ev.teams.length} teams · ${ev.places?`champion ${teamTag(ev.places[0][0])}`:'in progress'}`,'muted'));sec.append(head,eventView(key,ev,liveResolve,teamTag,g=>LEAGUE.groupTable(world,ev,g)));}
  else sec.append(el('p',world.season>1?'First Stand follows Split 1; MSI follows Split 2; Worlds closes the season.':'Season 1 has two internationals: MSI after Split 2 and Worlds after Split 3 (First Stand starts in season 2).','muted'));
  // Region power ranking: international results this season and, at half weight, the last.
  const scores=world.regionScores?.at(-1)?.scores??{},rows=world.regionRank.map((r,i)=>{const reg=LEAGUE.regionById(r),tr=el('tr');const lead=y?.splits?.[st?.split??Object.keys(y?.splits??{}).length]?LEAGUE.regionTable(world,r,st?.split??Object.keys(y.splits).length)[0]?.id:null;tr.append(el('td',`${i+1}. ${reg.name}`),el('td',reg.tier),el('td',String(scores[r]??0)),el('td',lead?name(lead):'—'));return tr;});
  sec.append(table(['Region','Tier','Last season score','Split leader'],rows,'Region power ranking'));
  const titles=(world.titles??[]).filter(t=>t.season===world.season&&t.event!=='split');
  if(titles.length){const rows=titles.map(t=>{const tr=el('tr');tr.append(el('td',LEAGUE.EVENTS[t.event].name),el('td',teamTag(t.champion)),el('td',teamTag(t.runnerUp)),el('td',t.mvpName??'—'));return tr;});sec.append(table(['Event','Champion','Runner-up','MVP'],rows,`Season ${world.season} internationals`));}
  body.append(sec);
 }
 function renderRegion(r){
  const reg=LEAGUE.regionById(r),sec=el('section','','region-view'),y=world.year;
  sec.append(el('h3',reg.name),el('p',`${reg.tier[0].toUpperCase()+reg.tier.slice(1)} region · talent odds SS ${Math.round(reg.odds.SS*1000)/10}%, S ${Math.round(reg.odds.S*100)}% · cap ${money(LEAGUE.capOf(world,{region:r}))} · MSI ${reg.msi[0]} bracket + ${reg.msi[1]} play-in · Worlds ${reg.worlds} seed${reg.worlds>1?'s':''}`,'muted'));
  if(y){
   const started=Object.keys(y.splits).map(Number),current=LEAGUE.currentStage(world)?.split??started.at(-1),n=started.includes(regionSplit)?regionSplit:current;
   if(started.length>1){const pick=el('div','','season-picker');for(const k of started){const b=button(`Split ${k}`,'circuit-tab');b.setAttribute('aria-selected',String(k===n));b.onclick=()=>{regionSplit=k;render();};pick.append(b);}sec.append(pick);}
   const s=y.splits[n],rows=LEAGUE.regionTable(world,r,n),seeds=s.playoffs[r]?.seeds??rows.slice(0,n===3&&rows.length>=8?6:4).map(x=>x.id),marks=new Map(seeds.map((id,i)=>[id,`#${i+1}`]));
   sec.append(recordTable(rows,name,`Split ${n} table`,{marks}));
   if(s.playoffs[r])sec.append(bracketView(s.playoffs[r],liveResolve,name,`Split ${n} playoffs`));
   // Any week of the split can be browsed; by default the view follows the current week.
   const rounds=s.regular[r],get=liveResolve,live=rounds.findIndex(ids=>ids.some(id=>!get(id).winner)),week=Math.min(rounds.length,Math.max(1,weekView??(live<0?rounds.length:live+1)));
   const nav=el('div','','week-nav'),prev=button('‹ Previous','quiet'),nextB=button('Next ›','quiet'),wpick=el('select');wpick.setAttribute('aria-label','Week');for(let i=1;i<=rounds.length;i++){const o=el('option',`Week ${i}`);o.value=String(i);o.selected=i===week;wpick.append(o);}
   prev.disabled=week<=1;nextB.disabled=week>=rounds.length;prev.onclick=()=>{weekView=week-1;render();};nextB.onclick=()=>{weekView=week+1;render();};wpick.onchange=()=>{weekView=Number(wpick.value);render();};nav.append(prev,wpick,nextB);
   const games=rounds[week-1].map(get).map(m=>{const tr=el('tr','',m.winner?'played':''),g=m.games[0];tr.append(el('td',name(m.home),m.winner===m.home?'won':''),el('td',g?`${g[1]}%–${g[2]}%`:'vs','score'),el('td',name(m.away),m.winner===m.away?'won':''));return tr;});
   const weeks=el('div','','week-browser');weeks.append(nav,table(['Home','Health','Away'],games,`Split ${n} · week ${week} of ${rounds.length}`));sec.append(weeks);
   // Championship points decide the Worlds seeds after the Split 3 champion.
   const order=LEAGUE.pointsOrder(world,r),qualified=new Set(y.worldsSeeds[r]??[]),prows=order.map(id=>{const tr=el('tr','',qualified.has(id)?'seeded':'');tr.append(el('td',name(id)),el('td',String(y.points[id]??0)),el('td',qualified.has(id)?`Worlds #${y.worldsSeeds[r].indexOf(id)+1}`:''));return tr;});
   sec.append(table(['Team','Points','Worlds'],prows,'Championship points'));
   const q=y.qualifiers[r];if(q){sec.append(el('p',`Worlds: ${q.need} seed${q.need>1?'s':''} · direct ${q.direct.map(name).join(', ')}`,'muted'));if(q.bracket)sec.append(bracketView(q.bracket,liveResolve,name,'Regional qualifier'));}
  }else sec.append(el('p',world.phase==='market'?'The opening auction: each region signs its own founding talent.':'Between seasons.','muted'));
  body.append(sec);
 }
 function renderChampion(){
  const t=(world.titles??[]).filter(x=>x.event==='worlds').at(-1),award=world.awards?.at(-1),mvp=award?.mvp&&world.fighters[award.mvp],stats=mvp&&world.stats[mvp.id],banner=el('section','','champion-banner');
  banner.append(el('p',`Season ${t.season} · ${LEAGUE.EVENTS.worlds.name}`,'eyebrow'),el('h3',`👑 ${teamTag(t.champion)}`),el('p',`Defeated ${teamTag(t.runnerUp)} in the final.${t.mvpName?` Worlds MVP: ${t.mvpName}.`:''}`,'muted'));
  if(mvp)banner.append(el('p',`Season MVP: ${mvp.name} (${teamTag(mvp.team)}) · ${stats.damage} damage · ${stats.healing} healing · ${stats.kills} KOs · ${stats.ccSeconds}s control`,'mvp'));
  banner.append(el('p','Next: the offseason. Values update from this season\'s stats, contracts end and teams re-sign who they can, then the trade window and free agency across every region.','muted'));return banner;
 }
 function renderLeaders(region){
  const wrap=el('div','','draft-grid');for(const [key,label]of [['impact','Impact'],['damage','Damage'],['healing','Healing'],['kills','KOs']]){const rows=LEAGUE.leaders(world,key,5,region).map(x=>{const tr=el('tr','',`role-${x.fighter.role}`);tr.append(cell(fighterLink(x.fighter)),el('td',x.fighter.team?name(x.fighter.team):'—'),el('td',String(x.value)));return tr;});if(rows.length)wrap.append(table(['Fighter','Team',label],rows,label+' leaders'));}
  return wrap;
 }
 // Coach mode: take over a team before the opening auction or between seasons, or hand it back to its AI coach.
 function coachControl(){
  const wrap=el('div','','coach-control'),coach=mine(),open=world.phase==='market'&&world.market?.round===0||['ready','complete'].includes(world.phase);
  if(coach){wrap.append(el('span',`Coaching · ${coach.name}`,'coach-badge'));if(!(world.phase==='offseason'&&world.offseason.step==='resign')){const b=button('Hand back','quiet');b.disabled=busy;b.onclick=()=>claim(null);wrap.append(b);}}
  if(open){
   const choice=el('select');choice.setAttribute('aria-label','Team to coach');choice.disabled=busy;
   for(const r of LEAGUE.REGIONS){const group=el('optgroup');group.label=r.name;for(const t of LEAGUE.regionTeams(world,r.id).sort((a,b)=>a.name<b.name?-1:1)){if(t.id===coach?.id)continue;const o=el('option',`${t.name} · OVR ${LEAGUE.teamOverall(world,t)}`);o.value=t.id;o.selected=t.id===selected;group.append(o);}choice.append(group);}
   const take=button(coach?'Switch team':'Coach a team','button secondary');take.disabled=busy;take.onclick=()=>claim(choice.value);wrap.append(choice,take);
  }else if(!coach)wrap.append(el('span','Spectating · take over a team between seasons','muted'));
  return wrap;
 }
 // Battle rules for the next season (3v3/5v5 only); the running season keeps its rules.
 function rulesControl(){
  const wrap=el('div','','coach-control');if(LEAGUE.FORMATS[world.format].size===2||world.phase==='season')return wrap;
  const rules=el('select');rules.setAttribute('aria-label','Battle rules from next season');rules.disabled=busy;for(const [value,text]of [['core','Core siege'],['teamfight','Classic teamfight']]){const o=el('option',text);o.value=value;rules.append(o);}rules.value=world.settings.battleMode??'teamfight';
  rules.onchange=()=>command({action:'rules',mode:rules.value}).catch(e=>say(e.message,true));const label=el('label','Battle rules');label.append(rules);wrap.append(label);return wrap;
 }
 function offseasonReport(o){
  const box=el('div','','offseason-report'),released=Object.values(o.releases).reduce((n,ids)=>n+ids.length,0);
  box.append(el('h4',`Season ${o.season} offseason report`));
  const facts=el('div','','offseason-facts');
  const moved=(o.signings??[]).filter(l=>l.from);
  for(const [value,label]of [[o.ratingChanges.length,'ratings changed'],...(o.resigned?[[o.resigned.length,'re-signed'],[o.departed.length,'contracts ended'],[moved.length,'changed teams']]:[]),[released,'released'],[o.trades.length,'trades'],[o.fired.length,'coaches fired'],[o.retired,'retired'],...(o.veterans?.length?[[o.veterans.length,'veterans retired']]:[]),[o.rookies.length,'rookies']]){const f=el('div','','offseason-fact');f.append(el('strong',String(value)),el('span',label));facts.append(f);}
  box.append(facts);
  // The biggest moves of free agency: stars who left their team, with their honours.
  const headlines=moved.map(l=>({l,f:world.fighters[l.fighter]})).filter(x=>x.f&&world.teams.some(t=>t.id===x.l.from)).sort((a,b)=>b.f.ovr-a.f.ovr).slice(0,5);
  if(headlines.length){const ul=el('ul','','offseason-notes');for(const {l,f}of headlines){const honours=[f.career?.mvps?`${f.career.mvps}× MVP`:'',f.career?.trophies?.worlds?`${f.career.trophies.worlds}× Worlds`:'',f.career?.trophies?.msi?`${f.career.trophies.msi}× MSI`:''].filter(Boolean).join(', ');ul.append(el('li',`${f.name} (OVR ${f.ovr}${honours?', '+honours:''}) leaves the ${teamTag(l.from)} for the ${teamTag(l.team)}: ${money(l.salary)} × ${l.years}.`));}box.append(el('h4','Free-agency moves'),ul);}
  if(o.veterans?.length)box.append(el('p',`Retired after ${LEAGUE.CAREER.retireAfter}+ seasons: ${o.veterans.map(v=>`${v.name}${v.team?` (${name(v.team)})`:''}`).join(', ')}.`,'muted'));
  if(o.extended?.length)box.append(el('p',`Earned another season: ${o.extended.map(v=>`${v.name} (${v.reason==='mvp'?'season MVP':'top form'})`).join(', ')}.`,'muted'));
  if(o.inducted?.length)box.append(el('p',`Into the Hall of Fame: ${o.inducted.map(v=>v.name).join(', ')}.`,'muted'));
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
 // Re-signing: the coach's expiring contracts (each fighter's ask and whether he wants to stay), plus releases.
 function renderResign(top){
  const team=mine(),wrap=el('div','','offseason-step'),expiring=world.offseason.expiring??[],ending=new Set(expiring.map(e=>e.id)),keepers=[],releases=[];
  wrap.append(el('h4','Re-sign or let go'),el('p','Contracts that ended this season. A fighter who wants to stay re-signs if you meet his ask; one testing free agency leaves whatever you offer, though you can still bid for him there. Fighters under contract can be released (the contract ends).','muted'));
  const rows=expiring.map(e=>{const f=world.fighters[e.id],box=check(`Re-sign ${f.name}`,e.stance==='stay'),pay=el('input'),years=el('select');box.value=f.id;box.disabled=busy||e.stance!=='stay';
   pay.type='number';pay.step='0.1';pay.min='0.1';pay.value=String(e.ask.salary);pay.disabled=busy||e.stance!=='stay';pay.setAttribute('aria-label',`Salary for ${f.name}`);years.disabled=busy||e.stance!=='stay';years.setAttribute('aria-label',`Seasons for ${f.name}`);
   for(let y=1;y<=LEAGUE.CONTRACT.maxYears;y++){const o=el('option',`${y} season${y>1?'s':''}`);o.value=String(y);o.selected=y===e.ask.years;years.append(o);}
   keepers.push({id:f.id,box,pay,years});const offerWrap=el('div','','offer-controls');offerWrap.append(pay,years);
   return fighterRow(f,[e.stance==='stay'?'Wants to stay':'Testing free agency',`${money(e.ask.salary)} × ${e.ask.years}`,offerWrap,box],delta(f));});
  const under=team.roster.filter(id=>!ending.has(id)).map(id=>world.fighters[id]).sort((a,b)=>b.ovr-a.ovr).map(f=>{const box=check(`Release ${f.name}`);box.value=f.id;box.disabled=busy;releases.push(box);return fighterRow(f,[box],delta(f));});
  const payLine=el('p','','offseason-pay'),confirmButton=button('Confirm decisions','button primary');
  const plan=()=>({resign:keepers.filter(k=>k.box.checked).map(k=>({fighter:k.id,salary:Math.round(Number(k.pay.value)*10)/10,years:Number(k.years.value)})),release:releases.filter(b=>b.checked).map(b=>b.value)});
  const update=()=>{const {resign,release}=plan(),pay=team.roster.filter(id=>!ending.has(id)&&!release.includes(id)).reduce((n,id)=>n+LEAGUE.wage(world.fighters[id]),0)+resign.reduce((n,o)=>n+o.salary,0),over=pay>LEAGUE.capOf(world,team)+1e-9;
   payLine.textContent=`Payroll ${money(pay)} / ${money(LEAGUE.capOf(world,team))} cap · ${resign.length} re-signing, ${expiring.length-resign.length} leaving, ${release.length} released${over?' · over the cap: release more or re-sign fewer':''}`;payLine.classList.toggle('over',over);confirmButton.disabled=busy||over;};
  for(const k of keepers){k.box.onchange=update;k.pay.oninput=update;}for(const b of releases)b.onchange=update;update();
  confirmButton.onclick=()=>command({action:'decide',decisions:plan()}).then(()=>{const r=world.offseason?.resignResults??[],kept=r.filter(x=>x.signed).length,turned=r.filter(x=>!x.signed&&x.reason==='ask').length;say(`${kept} re-signed${turned?`, ${turned} turned down your offer`:''}. The trade window is open.`);}).catch(e=>say(e.message,true));
  const row=el('div','','draft-actions');row.append(confirmButton);top.append(payLine,row);
  if(rows.length)wrap.append(table(['Fighter','Role','Tier','OVR (Δ)','Old contract','Mood','Asks','Your offer','Re-sign'],rows,'Expiring contracts'));else wrap.append(el('p','None of your contracts ended this season.','muted'));
  wrap.append(table(['Fighter','Role','Tier','OVR (Δ)','Contract','Release'],under,'Under contract'));return wrap;
 }
 function renderTrades(top){
  const team=mine(),wrap=el('div','','offseason-step'),others=LEAGUE.regionTeams(world,team.region).filter(t=>t.id!==team.id);if(!others.some(t=>t.id===partner))partner=others[0].id;
  const rival=LEAGUE.teamById(world,partner);
  wrap.append(el('h4','Trade window'),el('p','Swap one or two fighters for the same number with a team in your region; contracts move with them. AI coaches accept only deals that make their team better and keep both payrolls under the cap.','muted'));
  const choice=el('select');choice.setAttribute('aria-label','Trade partner');choice.disabled=busy;for(const t of others){const o=el('option',`${t.name} · ${t.coach.name} (${LEAGUE.PERSONALITIES[t.coach.personality].label}) · cap space ${money(LEAGUE.capSpace(world,t))}`);o.value=t.id;o.selected=t.id===partner;choice.append(o);}
  choice.onchange=()=>{partner=choice.value;render();};
  const give=[],get=[],side=(t,list,verb)=>t.roster.map(id=>world.fighters[id]).sort((a,b)=>b.ovr-a.ovr).map(f=>{const box=check(`${verb} ${f.name}`);box.value=f.id;box.disabled=busy;list.push(box);return fighterRow(f,[box],delta(f));});
  const grid=el('div','','draft-grid trade-grid');grid.append(table(['Fighter','Role','Tier','OVR','Contract','Give'],side(team,give,'Give'),`${team.name} · payroll ${money(LEAGUE.payroll(world,team))}`),table(['Fighter','Role','Tier','OVR','Contract','Get'],side(rival,get,'Get'),`${rival.name} · payroll ${money(LEAGUE.payroll(world,rival))}`));
  const propose=button('Propose trade','button primary'),summary=el('p','','offseason-pay');
  const update=()=>{const a=give.filter(b=>b.checked).map(b=>b.value),b=get.filter(x=>x.checked).map(x=>x.value),pay=LEAGUE.payroll(world,team)-a.reduce((n,id)=>n+LEAGUE.wage(world.fighters[id]),0)+b.reduce((n,id)=>n+LEAGUE.wage(world.fighters[id]),0),over=pay>LEAGUE.capOf(world,team)+1e-9;
   summary.textContent=a.length||b.length?`${a.length} for ${b.length} · your payroll after: ${money(pay)} / ${money(LEAGUE.capOf(world,team))}${over?' · over the cap':''}`:'Pick fighters from both rosters.';summary.classList.toggle('over',over);propose.disabled=busy||!a.length||a.length!==b.length||a.length>2||over;};
  for(const b of [...give,...get])b.onchange=update;update();
  propose.onclick=()=>{const a=give.filter(b=>b.checked).map(b=>b.value),b=get.filter(x=>x.checked).map(x=>x.value);command({action:'trade',partner,give:a,get:b}).then(()=>say(`Deal! ${b.map(id=>world.fighters[id].name).join(' & ')} join the ${team.name}.`)).catch(e=>say(e.message,true));};
  const done=button('Close the trade window','quiet');done.disabled=busy;done.onclick=()=>command({action:'closeTrades'}).then(()=>say(world.phase==='offseason'?`Free agency is open: ${LEAGUE.available(world).length} free agents, ${world.teams.reduce((n,t)=>n+openSpots(t),0)} open spots. Make your offers.`:`Season ${world.season} rosters are set.`)).catch(e=>say(e.message,true));
  const row=el('div','','draft-actions'),skip=el('div','','draft-actions');row.append(propose);skip.append(done);top.append(skip);wrap.append(choice,grid,summary,row);return wrap;
 }
 function renderOffseason(){
  const o=world.offseason,panel=el('section','','team-draft offseason'),steps=el('ol','','offseason-steps'),order=['resign','trades','freeAgency'];
  for(const [key,label]of [['resign','Re-sign'],['trades','Trade window'],['freeAgency','Free agency']]){const li=el('li',label);li.classList.toggle('active',o.step===key);li.classList.toggle('done',order.indexOf(key)<order.indexOf(o.step));steps.append(li);}
  // Each step's main actions (confirm, close the window, next round) sit on top, above the steps.
  const top=el('div','','offseason-actions');panel.append(top,steps,offseasonReport(o));
  if(o.step==='resign')panel.append(renderResign(top));else if(o.step==='trades')panel.append(renderTrades(top));
  body.append(panel);if(o.step==='freeAgency')renderFreeAgency(top);if(!top.childElementCount)top.remove?.();
 }
 // Re-rendering rebuilds the panel; keep the reader's scroll position (page or scrolling panel).
 const scroller=()=>{if(typeof getComputedStyle!=='function')return null;for(let n=host.parentElement;n;n=n.parentElement){const y=getComputedStyle(n).overflowY;if((y==='auto'||y==='scroll')&&n.scrollHeight>n.clientHeight)return n;}return null;};
 function render(){const box=scroller(),top=box?.scrollTop??0,pageY=globalThis.scrollY??0;draw();if(box)box.scrollTop=top;if(globalThis.scrollTo&&globalThis.scrollY!==pageY)globalThis.scrollTo(0,pageY);}
 function draw(){
  body.replaceChildren();
  if(!world){renderSetup();return;}
  if(LEAGUE.oldFormat(world)){
   const card=el('div','','team-league-head'),info=el('div'),reset=button('Delete league','quiet danger');reset.disabled=busy;
   info.append(el('p',`Season ${world.season} · ${world.teams.length} teams`,'eyebrow'),el('h3','Single-league format'),el('p','This league was made before region circuits (six regions, three splits, First Stand, MSI and Worlds) and can no longer be played. Delete it to start a region circuit.','muted'));
   reset.onclick=()=>{if(confirm(`Delete this ${size}v${size} league and all its fighters?`))command({action:'reset'}).then(()=>say('League deleted.')).catch(e=>say(e.message,true));};
   card.append(info,reset);body.append(card);return;
  }
  if(view!=='world'&&!LEAGUE.regionById(view))view=defaultView();
  const st=LEAGUE.currentStage(world),phaseLabel={market:'Opening auction',ready:'Rosters set',season:st?LEAGUE.stageName(st)+(world.awaiting?' · complete':''):'Season',complete:'Season complete',offseason:'Offseason'}[world.phase];
  const head=el('div','','team-league-head'),info=el('div');info.append(el('p',`Season ${world.season} · ${world.teams.length} teams in 6 regions`,'eyebrow'),el('h3',phaseLabel));
  const meta=el('p',`${world.settings.battleMode==='core'?'Core siege · ':''}Market cap ${money(world.settings.salaryCap)} · ${world.settings.rosterSize}-fighter rosters · ${Object.keys(world.fighters).length} scouted fighters`,'muted');info.append(meta);
  const reset=button('Delete league','quiet danger');reset.disabled=busy;reset.onclick=()=>{if(confirm(`Delete this ${size}v${size} circuit and all its fighters?`))command({action:'reset'}).then(()=>say('League deleted.')).catch(e=>say(e.message,true));};
  const side=el('div','','team-league-side');side.append(coachControl(),rulesControl(),reset);head.append(info,side);body.append(head);
  // Past seasons, the trophy cabinet, the Hall of Fame and the balance report open in their own window.
  const panels=el('div','','league-panels');
  for(const [label,build]of [[`Past seasons${LEAGUE.pastSeasons(world).length?` (${LEAGUE.pastSeasons(world).length})`:''}`,seasonsPanel],['Trophy cabinet',trophyPanel],[`Hall of Fame${world.hallOfFame?.length?` (${world.hallOfFame.length})`:''}`,hallPanel],['Balance report',balancePanel]]){const b=button(label,'button secondary');b.onclick=()=>openPanel(label.replace(/ \(\d+\)$/,''),build());panels.append(b);}
  body.append(panels);
  if(world.phase==='market'){renderFreeAgency();body.append(tabs());if(view==='world')view=defaultView()==='world'?LEAGUE.REGION_IDS[0]:defaultView();renderTeams(view);return;}
  if(world.phase==='offseason'){renderOffseason();body.append(tabs());if(view==='world')view=defaultView()==='world'?LEAGUE.REGION_IDS[0]:defaultView();renderTeams(view);return;}
  const season=el('section','','team-draft');season.append(calendarStrip(),seasonActions());
  if(world.awaiting)season.append(stageBanner());
  if(world.phase==='complete')season.prepend(renderChampion());
  if(world.phase==='ready'&&world.lastOffseason)season.append(offseasonReport(world.lastOffseason));
  body.append(season,tabs());
  if(view==='world')renderWorld();else{renderRegion(view);if(world.stats&&Object.keys(world.stats).length)body.append(renderLeaders(view));renderTeams(view);}
  if(world.phase==='ready'||world.phase==='complete'){const recap=el('details','','module draft-recap');recap.open=recapOpen;recap.ontoggle=()=>{recapOpen=recap.open;};recap.append(el('summary','Signings & free agents'));const before=body.childNodes.length;renderFreeAgency();const draftPanel=body.lastChild;if(body.childNodes.length>before){recap.append(draftPanel);body.append(recap);}}
 }
 return {show(next){if(next!==size){size=next;world=null;selected=null;weekView=null;regionSplit=null;view='world';poolRole='all';poolRegion='all';if(panel.open)panel.close();say('');}load();}};
}

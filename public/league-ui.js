import {LEAGUES} from './leagues.js';
import {leagueCupFixtures,interleagueFixtures} from './league-fixtures.js';
import {createSimulationPool} from './simulation-client.js';

export function mountLeagues(host,hooks){
 const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
 const button=(text,id)=>{const b=el('button',text,'quiet');b.type='button';if(id)b.id=id;return b;};
 let world=null,revision=0,busy=false,simulating=false,stop=false,pending=null,pendingWorld=null,unsaved=[],conflicted=false;
 let division=0,archived=null,loaded=false,historyPage=0;
 const simulation=createSimulationPool(),openPanels=new Map();
 const heading=el('h2','Seven leagues'),message=el('p','','league-status'),saveState=el('p','','league-save-state');
 const setup=el('div','','league-setup'),controls=el('div','','league-actions'),more=el('details','','league-more-controls'),secondary=el('div','','league-actions');
 const content=el('div','','league-season-summary'),selection=el('label','View league','league-selection'),picker=el('select');
 const tables=el('div'),history=el('details'),historyBody=el('div'),past=el('details'),pastBody=el('div');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 more.append(el('summary','More controls'),secondary);history.append(el('summary','All completed series & replays'),historyBody);past.append(el('summary','Completed seasons'),pastBody);
 picker.id='league-division';LEAGUES.names.forEach((name,d)=>{const option=el('option',`${d+1}. ${name}`);option.value=String(d);picker.append(option);});
 picker.onchange=()=>{division=Number(picker.value);render();};selection.append(picker);
 host.append(heading,message,setup,controls,more,saveState,content,selection,tables,history,past);
 const select=(label,values,id)=>{const l=el('label',label),s=el('select');s.id=id;for(const [value,text]of values){const o=el('option',text);o.value=String(value);s.append(o);}l.append(s);setup.append(l);return s;};
 const robin=select('Season length',[[2,'Double round-robin · 38 / 46 weeks'],[1,'Single round-robin · 19 / 23 weeks']],'league-robin');
 const bestOf=select('Regular matches',[[1,'Bo1'],[3,'Bo3'],[5,'Bo5']],'league-best-of');
 const time=select('Time of day',[['random','Random each game'],...['dawn','day','dusk','night'].map(v=>[v,v])],'league-time');
 const weather=select('Weather',[['random','Random each game'],...['clear','rain','frost','storm'].map(v=>[v,v])],'league-weather');
 const ground=select('Terrain',[['random','Random each game'],['stone','Stone'],['water','Shallow water']],'league-ground');
 setup.append(el('p','164 new fighters: 20 in league 1 and 24 in leagues 2–7, assigned randomly. Existing saved fighters stay in your collection.','muted'));
 const start=button('Start league system','league-start');setup.append(start);
 const definitions=[['Simulate phase','phase',true],['Finish season','season',true],['Start next season','rollover',true],['Retry save','retry',true],['Watch next series','watch'],['Simulate next series','one'],['Simulate matchweek','week'],['Save progress now','save'],['Refresh saved progress','refresh']];
 const actions=definitions.map(([text,mode,primary])=>{const b=button(text,'league-'+mode);(primary?controls:secondary).append(b);b.onclick=()=>guard(()=>mode==='watch'?watch():mode==='rollover'?rollover():mode==='refresh'?load(conflicted):['retry','save'].includes(mode)?saveProgress():run(mode));return {b,mode};});
 const pause=button('Pause & save','league-pause');controls.append(pause);pause.onclick=()=>{stop=true;pause.disabled=true;say('Pausing after the current simulation batch, then saving completed progress.');};
 const rules=el('details');rules.append(el('summary','Rules & saving'),
  el('p','League season → seven division cups → Crownfire Convergence qualifier & cup → Emberveil Challenge qualifier & cup → explicit rollover. Wins 3, draws 1, losses 0. Timed-out league games draw; cup series resolve a winner. Main-cup finals are Bo5. '+LEAGUES.tieRule),
  el('p','Top two from every league enter Crownfire Convergence. Third/fourth contest a Bo3 qualifier for two more places. Its 12 eliminated fighters enter Emberveil Challenge; fifth/sixth contest a Bo3 qualifier for four more places. Both cups have 16 entrants.'),
  el('p','Top three in leagues 2–7 move up; bottom three in leagues 1–6 move down. New seasons retire Dawnrise’s bottom three, then up to seven other completed careers. Unused career slots stay empty. Extra promotions fill vacancies. Each departure gets one recruit from the repeating ordinary, Rare, ordinary, Unique, exceptional sequence (85% Legendary / 15% Mythic for exceptional slots). Earlier seasons finish under their saved rules. New careers become eligible after 30–38 completed seasons; existing rosters get a 12–24 season transition, with overflow deferred. Movement waits for every cup and an explicit rollover. Active league fighters remain protected from deletion.'),
  el('p','Simulation saves once at the end of each phase. Pause & save and Save progress now can checkpoint earlier. Partial progress stays in this tab until saved; reloading before a checkpoint loses that partial progress.'));host.append(rules);
 const say=(text,error=false)=>{message.textContent=text;message.classList.toggle('error',error);};
 const api=async(path='',body)=>{const r=await fetch('/api/leagues'+path,{...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok){const e=Error(d.error||'Could not save league progress.');e.status=r.status;throw e;}return d;};
 const lock=value=>{busy=value;hooks.busy?.(value);render();};
 const guard=async fn=>{try{await fn();}catch(e){say(e.message+(pending?' Completed results are kept here; use Retry save.':unsaved.length?' Local progress is kept in this tab.':''),true);render();}};
 async function flush(){
  if(!pending)return;
  let data;
  try{data=await api('',pending);}catch(error){
   if(error.status===409){
    const latest=await api();
    if(pending.action!=='recordBatch'){world=latest.world;revision=latest.revision;pending=null;pendingWorld=null;unsaved=[];conflicted=false;render();return;}
    try{
     if(!latest.world||latest.world.id!==world.id||latest.world.season!==world.season)throw Error('Season changed');
     const completed=new Map(latest.world.history.map(m=>[m.id,m.results])),remaining=[];
     for(const record of pending.series||[]){if(completed.has(record.matchId)){if(JSON.stringify(completed.get(record.matchId))!==JSON.stringify(record.results))throw Error('Results changed');}else remaining.push(record);}
     const preview=LEAGUES.prepare(structuredClone(latest.world));for(const record of remaining)LEAGUES.record(preview,record.matchId,record.results);
     world=preview;revision=latest.revision;unsaved=remaining;pendingWorld=preview;conflicted=false;
     pending=remaining.length?{action:'recordBatch',operationId:crypto.randomUUID(),revision,series:remaining,compact:true}:null;
     render();if(!remaining.length)return;
     throw Object.assign(Error('Saved progress changed in another tab. Your remaining results are kept; Retry save continues from the latest checkpoint.'),{rebased:true});
    }catch(rebaseError){
     if(rebaseError.rebased)throw rebaseError;
     conflicted=true;render();throw Error('Another tab saved different results. Local results are kept. Retry after resolving the other tab, or use the discard-and-reload control.');
    }
   }
   throw error;
  }
  world=Object.hasOwn(data,'world')?data.world:pendingWorld;revision=data.revision;pending=null;pendingWorld=null;unsaved=[];conflicted=false;archived=null;render();
 }
 async function command(action,extra={}){if(pending||unsaved.length)throw Error('Save the current phase progress first.');pendingWorld=null;pending={action,operationId:crypto.randomUUID(),revision,...extra};await flush();}
 async function checkpoint(){if(pending)return flush();if(!unsaved.length)return;pendingWorld=world;pending={action:'recordBatch',operationId:crypto.randomUUID(),revision,series:unsaved,compact:true};await flush();}
 async function saveProgress(){if(busy||hooks.blocked())return;lock(true);try{await checkpoint();say('Progress saved.');await hooks.refresh();}finally{lock(false);}}
 async function load(discard=false){
  if(busy)throw Error('Pause the current operation first.');
  if(!discard&&(pending||unsaved.length))throw Error('Save progress before refreshing the saved season.');
  const data=await api();world=LEAGUES.prepare(data.world);revision=data.revision;pending=null;pendingWorld=null;unsaved=[];conflicted=false;loaded=true;archived=null;render();await loadHistory();
 }
 async function loadHistory(){const data=await api('/history');pastBody.replaceChildren();for(const season of data.seasons){const b=button('Season '+season.season+' · world '+season.worldId.slice(0,8));b.onclick=()=>guard(async()=>{if(busy)throw Error('Pause simulation before opening history.');const data=await api('/history/'+season.season+'?worldId='+encodeURIComponent(season.worldId));archived=data.archive;historyPage=0;render();});pastBody.append(b);}if(!data.seasons.length)pastBody.append(el('p','No completed seasons yet.','muted'));}
 start.onclick=()=>guard(async()=>{if(busy||hooks.blocked())throw Error('Wait for the current arena operation to finish.');lock(true);try{await command('start',{worldId:crypto.randomUUID(),settings:{roundRobin:Number(robin.value),bestOf:Number(bestOf.value),conditions:{time:time.value,weather:weather.value,ground:ground.value}}});await hooks.refresh();say('164 fighters saved. Season 1 is ready.');}finally{lock(false);}});
 const fresh=button('Start a fresh league world','league-fresh');secondary.append(fresh);fresh.onclick=()=>guard(async()=>{if(busy||hooks.blocked())return;if(!confirm('Generate 164 new fighters and start a new Season 1? Your previous world, records, titles and fighters are preserved.'))return;lock(true);try{await checkpoint();await command('freshStart',{worldId:crypto.randomUUID(),settings:world.settings});await hooks.refresh();await loadHistory();say('Fresh roster generated with v11 combat and generation v2. Season 1 is ready.');}finally{lock(false);}});
 const fighter=(view,id)=>view.roster.find(c=>c.id===id),name=(view,id)=>fighter(view,id)?.name||id;
 const simulate=match=>simulation.simulate({match,a:fighter(world,match.a),b:fighter(world,match.b)});
 function addResults(records){for(const record of records){LEAGUES.record(world,record.matchId,record.results);unsaved.push(record);}}
 async function run(mode){
  if(!world||busy||hooks.blocked()||archived)return;if(pending)await flush();
  const first=LEAGUES.next(world);if(!first)return;const initialPhase=world.phase;
  // Cup rounds are scoped to their competition, since each division starts at round 1.
  const sameRound=match=>!!match&&match.phase===first.phase&&(first.phase==='league'?match.week===first.week:match.division===first.division&&match.round===first.round);
  stop=false;simulating=true;lock(true);let painted=performance.now();
  try{
   do{
    const phase=world.phase;let matches=LEAGUES.upcoming(world,mode==='one'?1:12);
    if(mode==='week')matches=matches.filter(sameRound);if(!matches.length)break;
    const m=matches[0];say(`Simulating season ${world.season} · ${m.phase==='league'?'week '+m.week:(m.phase==='cups'?LEAGUES.names[m.division]+' cup':LEAGUES.phaseNames[m.phase])+' · round '+m.round}…`);
    const results=await Promise.all(matches.map(simulate));addResults(matches.map((match,i)=>({matchId:match.id,results:results[i]})));
    if(world.phase!==phase){say('Phase complete. Saving results…');await checkpoint();}
    if(stop){await checkpoint();break;}
    if(mode==='one'||world.phase==='complete'||mode==='phase'&&world.phase!==initialPhase)break;
    const next=LEAGUES.next(world);if(mode==='week'&&!sameRound(next))break;
    if(performance.now()-painted>750){render();painted=performance.now();}
   }while(true);
   say(stop?'Paused and saved.':world.phase==='complete'?'All cups complete and saved. Review the season before rollover.':unsaved.length?'Progress stays in this tab. It will save when this phase finishes.':'Phase complete and saved.');
   if(!unsaved.length)await hooks.refresh();
  }finally{simulating=false;lock(false);}
 }
 async function watch(){if(!world||busy||hooks.blocked()||pending||archived)return;const m=LEAGUES.next(world);if(!m)return;const phase=world.phase;lock(true);try{const results=await hooks.watch(fighter(world,m.a),fighter(world,m.b),m,m.conditions);addResults([{matchId:m.id,results}]);if(world.phase!==phase){await checkpoint();await hooks.refresh();say('Phase complete and saved.');}else say('Series complete. Progress saves at the end of this phase.');}finally{lock(false);}}
 async function rollover(){if(!world||busy||hooks.blocked()||archived)return;lock(true);try{await checkpoint();await command('rollover');await hooks.refresh();await loadHistory();say(`Season ${world.season} ready. Previous season archived.`);}finally{lock(false);}}
 const panelKey=(view,key)=>`${view.id}:${view.season}:${archived?'archive':'active'}:${division}:${key}`;
 function panel(view,title,key,build,defaultOpen=false){
  const details=el('details','','league-section'),body=el('div','','league-section-body'),identity=panelKey(view,key);details.append(el('summary',title),body);details.open=openPanels.get(identity)??defaultOpen;
  const fill=()=>{body.replaceChildren();build(body);};if(details.open)fill();
  details.addEventListener('toggle',()=>{openPanels.set(identity,details.open);if(details.open)fill();});return details;
 }
 function replayButton(view,result){const b=button('Replay');b.disabled=busy||hooks.blocked();b.onclick=()=>guard(async()=>{lock(true);try{await hooks.watch(fighter(view,result.a),fighter(view,result.b),{...result,engineVersion:result.results[0]?.combatVersion??LEAGUES.engineVersion(view),legs:result.results.length,bestOf:undefined},result.conditions,result.results.map(r=>r.environment));}finally{lock(false);}});return b;}
 function drawFixtures(body,view,cup){
  const selected=new Set(view.divisions[division]);if(cup.note)body.append(el('p',cup.note,'muted'));
  const own=cup.entrants.filter(c=>selected.has(c.id)).map(c=>name(view,c.id));if(own.length)body.append(el('p','From this league: '+own.join(', '),'league-fixture-entrants'));
  if(cup.champion)body.append(el('p','Champion: '+name(view,cup.champion),'league-cup-champion'));
  if(cup.qualified.length)body.append(el('p','Qualified: '+cup.qualified.map(id=>name(view,id)).join(', '),'league-cup-champion'));
  if(cup.byes.length)body.append(el('p','First-round byes: '+cup.byes.map(side=>side.id?name(view,side.id):side.label).join(', '),'muted'));
  for(const round of cup.rounds){
   const group=el('section','','league-fixture-round');group.append(el('h4',round.label));
   for(const fixture of round.matches){
    const row=el('div','','league-fixture'),pair=el('div','','league-fixture-pair');
    const side=(fighterSide,index)=>{const label=el('span',fighterSide.id?name(view,fighterSide.id):fighterSide.label,'league-fixture-name');if(selected.has(fighterSide.id))label.classList.add('league-fixture-own');if(fixture.result?.winner===fighterSide.id)label.classList.add('league-fixture-winner');pair.append(label,el('span',fixture.result?String(fixture.result.score[index]):'—','league-fixture-score'));};
    side(fixture.a,0);side(fixture.b,1);row.append(pair);
    const meta=el('div','','league-fixture-meta');meta.append(el('small',`Bo${fixture.bestOf} · ${fixture.status==='next'?'Next series':fixture.status==='completed'?'Complete':fixture.status==='waiting'?'Awaiting winners':'Scheduled'}`));if(fixture.result)meta.append(replayButton(view,fixture.result));row.append(meta);if(fixture.status==='next')row.classList.add('league-fixture-next');group.append(row);
   }
   body.append(group);
  }
 }
 function drawStandings(body,view){
  const rows=LEAGUES.standings(view,division),leagueTitle=view.phase==='league'?null:rows[0].id,cupTitle=view.cupResults.find(c=>c.division===division)?.champion;
  const wrap=el('div','','league-table-scroll'),table=el('table'),head=el('thead'),header=el('tr'),tbody=el('tbody');table.append(el('caption',LEAGUES.names[division]+' · '+view.divisions[division].length+' fighters'));
  for(const label of ['#','Fighter','Tier','Career','Pts','W','D','L','GD'])header.append(el('th',label));head.append(header);
  rows.forEach((r,i)=>{const row=el('tr');row.className=division>0&&i<3?'promotion-zone':i>=view.divisions[division].length-(division===6?5:3)?'relegation-zone':'';const crown=(r.id===leagueTitle?' 👑 League':'')+(r.id===cupTitle?' 👑 Cup':'');for(const text of [i+1,name(view,r.id)+crown,fighter(view,r.id).summary.tier,view.careers?.[r.id]?`${(view.careers[r.id].transition?view.season-view.careers[r.id].enabledSeason:view.season-view.careers[r.id].joinedSeason)+(view.phase==='complete'?1:0)} seasons · eligible S${view.careers[r.id].eligibleSeason}`:'Legacy career',r.points,r.wins,r.draws,r.losses,r.gameWins-r.gameLosses])row.append(el('td',String(text)));tbody.append(row);});table.append(head,tbody);wrap.append(table);body.append(wrap,el('p','Tie order: points → game difference → game wins → seeded order.','muted'));
 }
 function drawHistory(view){
  historyBody.replaceChildren();if(!view||!history.open)return;const matches=[...view.history].reverse(),pages=Math.max(1,Math.ceil(matches.length/40));historyPage=Math.min(historyPage,pages-1);historyBody.append(el('p',`${matches.length} completed series · page ${historyPage+1} / ${pages}`));
  for(const result of matches.slice(historyPage*40,historyPage*40+40)){const line=el('div','','league-match');line.append(el('span',`${result.phase==='league'?'Week '+result.week:result.phase==='cups'?LEAGUES.names[result.division]+' cup':LEAGUES.phaseNames[result.phase]} · ${name(view,result.a)} ${result.score.join('–')} ${name(view,result.b)}`),replayButton(view,result));historyBody.append(line);}
  for(const [label,delta]of [['Newer',-1],['Older',1]]){const b=button(label);b.disabled=historyPage+delta<0||historyPage+delta>=pages;b.onclick=()=>{historyPage+=delta;drawHistory(view);};historyBody.append(b);}
 }
 function render(){
  const view=archived||world;setup.hidden=!!world;selection.hidden=!view;history.hidden=!view;past.hidden=!world;more.hidden=!world;controls.hidden=!world;start.disabled=busy;fresh.disabled=busy||!!hooks.blocked()||!!archived||!world||world.phase!=='complete'&&world.history.length>0;picker.value=String(division);
  for(const {b,mode}of actions){b.hidden=mode==='rollover'?world?.phase!=='complete':mode==='retry'?!pending:false;b.disabled=busy||!!hooks.blocked()||!!archived||!world;
   if(['watch','one','week','phase','season','rollover'].includes(mode)&&pending)b.disabled=true;
   if(['watch','one','week','phase','season'].includes(mode)&&world?.phase==='complete')b.disabled=true;
   if(mode==='week')b.textContent=world?.phase==='league'?'Simulate matchweek':'Simulate cup round';
   if(mode==='save')b.disabled||=(!unsaved.length||!!pending);
   if(mode==='retry')b.disabled||=!pending;
   if(mode==='refresh'){b.disabled||=!!(unsaved.length||pending)&&!conflicted;b.textContent=conflicted?'Discard local results & load saved season':'Refresh saved progress';}
  }
  pause.hidden=!busy||!simulating;pause.disabled=stop;content.replaceChildren();tables.replaceChildren();saveState.hidden=!world||!!archived;saveState.textContent=pending?'Save pending · completed results are kept in this tab':unsaved.length?`${unsaved.length} series waiting for the phase checkpoint · progress stays in this tab`:'Saved · automatic checkpoints at phase end';
  if(!view){heading.textContent='Seven leagues';drawHistory(null);return;}
  heading.textContent=`Season ${view.season}${archived?' · archive':''}`;const match=LEAGUES.next(view);
  content.append(el('p',view.phase==='league'?`League season · week ${match.week} / ${LEAGUES.weekCount(view)} · Bo${view.settings.bestOf}`:view.phase==='cups'?`Division cups · ${LEAGUES.names[view.cupIndex]}`:LEAGUES.phaseNames[view.phase]||view.phase,'league-phase'));
  if(match)content.append(el('p',`Next: ${name(view,match.a)} vs ${name(view,match.b)} · Bo${match.bestOf}`,'muted'));
  if(view.version===1)content.append(el('p','This saved season keeps its original format until rollover; the next season adds 24 fighters and both interleague cups.','muted'));
  if(archived?.closedWorld)content.append(el('p','World closed and preserved before a fresh start.','muted'));
  if(archived){const back=button('Return to active season');back.onclick=()=>{archived=null;historyPage=0;render();};content.append(back);}
  tables.append(panel(view,'League standings','standings',body=>drawStandings(body,view),true),
   panel(view,'Division cup fixtures','division-cup',body=>drawFixtures(body,view,leagueCupFixtures(view,division))),
   panel(view,'Interleague cups & qualifiers','interleague',body=>{const fixtures=interleagueFixtures(view);body.append(el('p',fixtures.note,'muted'));for(const cup of fixtures.cups)body.append(panel(view,cup.title,cup.key,body=>drawFixtures(body,view,cup)));}));
  if(view.cupResults.length)tables.append(panel(view,'Season champions','champions',body=>{for(const cup of view.cupResults)body.append(el('p',`${cup.division===8?LEAGUES.cupNames.europa:cup.division===7?(cup.competition==='champions'?LEAGUES.cupNames.champions:'Interleague cup'):LEAGUES.names[cup.division]+' cup'} · ${name(view,cup.champion)}`));}));
  if(archived)tables.append(panel(view,'Movement, retirements & replacements','movement',body=>{for(const move of archived.movement)body.append(el('p',`${name(view,move.id)}: ${LEAGUES.names[move.from]} → ${LEAGUES.names[move.to]}${move.type==='vacancy-promotion'?' · retirement vacancy':''}`));for(const c of archived.retired)body.append(el('p','Retired: '+c.name+' · '+(archived.retirementReasons?.[c.id]||'Dawnrise league finish')));if(archived.deferredCareers?.length)body.append(el('p',archived.deferredCareers.length+(LEAGUES.careerRules(archived).version===2?' eligible careers waiting after the seven-career limit.':' eligible careers deferred by the five-retirement limit.')));for(const c of archived.replacements)body.append(el('p','Replacement: '+c.name+' · '+c.summary.wheelRarity));for(const c of archived.expansion||[])body.append(el('p','Additional league fighter: '+c.name));}));
  drawHistory(view);
 }
 history.addEventListener('toggle',()=>drawHistory(archived||world));render();
 return {load:()=>guard(async()=>{if(loaded&&(busy||pending||unsaved.length)){render();return;}await load();}),render,get busy(){return busy;},get loaded(){return loaded;}};
}

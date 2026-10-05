import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));const worker=(await import(pathToFileURL(root+'dist/server/index.js'))).default;const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync(root+'drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync(root+'drizzle/'+f,'utf8'));const env={DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};}}};
let context={};vm.createContext(context);vm.runInContext(fs.readFileSync(root+'public/data.js','utf8')+';this.data=WHEEL_DATA',context);env.DB.batch=async statements=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}};const request=(path,method='GET',body)=>worker.fetch(new Request('https://fateforge.test/api/'+path,{method,headers:{'oai-authenticated-user-id':'ui-owner','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);for(let i=1;i<=3;i++){const id='00000000-0000-4000-8000-'+String(i).padStart(12,'0');assert.equal((await request('characters/'+id,'PUT',{name:'Fighter '+i,state:{version:1,pools:context.data,traits:{race:'Human',weapon:i===1?'Longbow':'Warhammer'}}})).status,200);}
class Element{constructor(tag){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.style={};this.classList={toggle(){}};this.listeners={};this.hidden=false;this.disabled=false;}append(...v){this.children.push(...v);}replaceChildren(...v){this.children=[...v];}addEventListener(name,fn){this.listeners[name]=fn;}setAttribute(k,v){this[k]=v;}showModal(){this.open=true;}close(){this.open=false;}querySelectorAll(selector){const all=[];function visit(e){if(e.tagName==='input'&&(selector!=='input:checked'||e.checked))all.push(e);e.children.forEach(visit);}this.children.forEach(visit);return all;}}
const elements=new Map();for(const m of fs.readFileSync(root+'public/arena.html','utf8').matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element('div'));const canvasContext=new Proxy({},{get(){return()=>{}}});elements.get('arena').getContext=()=>canvasContext;globalThis.matchMedia=()=>({matches:true});globalThis.document={body:Object.assign(new Element('body'),{dataset:{}}),getElementById:id=>{assert(elements.has(id),'Unknown element '+id);return elements.get(id);},createElement:tag=>new Element(tag),createElementNS:(ns,tag)=>new Element(tag)};globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=1254;this.naturalHeight=1254;}};globalThis.requestAnimationFrame=()=>{};globalThis.confirm=()=>true;globalThis.fetch=async(path,options={})=>request(path.replace('/api/',''),options.method||'GET',options.body?JSON.parse(options.body):undefined);elements.get('duel-best-of').value='3';elements.get('duel-night').value='day';elements.get('play-speed').value='8';elements.get('tourney-name').value='UI Cup';elements.get('tourney-order').value='roster';elements.get('tourney-night').value='day';
const {simulateLeagueSeries}=await import(pathToFileURL(root+'public/league-sim-worker.js').href);globalThis.Worker=class{postMessage(data){queueMicrotask(()=>{try{this.onmessage({data:{id:data.dispatchId,results:simulateLeagueSeries(data)}});}catch(error){this.onerror(error);}});}terminate(){}};
let code=fs.readFileSync(root+'public/arena.js','utf8');for(const name of ['combat-engines','combat-v9','simulation-client','league-ui','trait-detail-ui','trait-details','combat','combat-v1','combat-v2','combat-v3','combat-v4','combat-v5','combat-v6','combat-v7','combat-v8','tournaments','brackets','divisions','abilities','conditions','tournament-names','stage-recommendations','roster-view','bulk-characters','series'])code=code.replace(JSON.stringify('./'+name+'.js'),JSON.stringify(pathToFileURL(root+'public/'+name+'.js').href)).replace("'./"+name+".js'",JSON.stringify(pathToFileURL(root+'public/'+name+'.js').href));code+='\nexport {refreshRoster,startDuel,create,watchNext,resolve,frame,renderStages,saveTournament,refreshTournaments,replayMatch,refreshChampions,renderTournament,renderStageResults,loadReplayEngine};export const testReplayEngines=()=>replayEngines;export const testState=()=>({roster,tournament,tournamentId,activeFight,series,config,saveChain});';const ui=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));await new Promise(r=>setTimeout(r,20));await ui.refreshRoster();assert.equal(ui.testState().roster.length,3);
// Profile inspection fetches contribution metadata only on demand and opens the
// shared dialog without starting a fight or changing the selected character.
const statsButtons=elements.get('profile-a').children.find(e=>e.className==='detail-stat-buttons');
await statsButtons.children[0].listeners.click();
assert.equal(elements.get('trait-details').open,true);
assert.equal(elements.get('trait-detail-title').textContent,'Strength');
assert(elements.get('trait-detail-metrics').children.some(e=>e.children.some(c=>c.textContent==='Weapon damage')));
const raceButton=elements.get('trait-detail-picker').children.find(e=>e.textContent==='Race');raceButton.listeners.click();
assert.equal(elements.get('trait-detail-title').textContent,'Human');
assert(elements.get('trait-detail-metrics').children.some(e=>e.children.some(c=>c.textContent==='Rolled stat contribution')));
elements.get('close-trait-details').listeners.click();
console.log('Arena detail UI passed: clickable profile stats, lazy saved trait contributions, trait switching and closing.');
const {defaultStage}=await import(pathToFileURL(root+'public/tournaments.js').href);
ui.testState().config.splice(0,1,...['groups','swiss','double'].map(defaultStage));
ui.testState().config[0].groups=64;ui.testState().config[0].advance=64;
for(const box of elements.get('entrants').querySelectorAll('input'))box.checked=true;
for(let i=3;i<128;i++){const box=new Element('input');box.value='preview-'+i;box.checked=true;elements.get('entrants').append(box);}
ui.renderStages();
assert(elements.get('stage-path').textContent.includes('128 fighters → 64 → ~32 → 1 champion'));
assert.equal(ui.testState().config[0].groups,64,'Suggestions must not silently change settings');
const flatten=e=>[e.textContent,...e.children.flatMap(flatten)].join(' ');
assert(flatten(elements.get('stages')).includes('64 groups of 2'));
assert(flatten(elements.get('stages')).includes('Suggested: 3 wins qualify · 3 losses eliminate · at most 5 rounds'));
elements.get('recommend-stages').onclick();
assert.equal(ui.testState().config[0].groups,32);
assert.equal(ui.testState().config[1].rounds,5);
assert.equal(ui.testState().config[1].advance,32);
assert(elements.get('stage-path').textContent.includes('128 fighters → 64 → ~32 → 1 champion'));
const advance=elements.get('stages').children[0].children[1].children[2].children[0];
advance.value='32';advance.listeners.input();
assert(elements.get('stage-path').textContent.includes('128 fighters → 32 → ~16'));
assert(flatten(elements.get('stages')).includes('Suggested: 3 wins qualify'));
const down=elements.get('stages').children[0].children[0].children[1].children[1];down.listeners.click();
assert.equal(ui.testState().config[0].type,'swiss');
assert(flatten(elements.get('stages')).includes('Suggested: 3 wins qualify'));
ui.testState().config.splice(0,3,defaultStage('single'));
for(const box of elements.get('entrants').querySelectorAll('input'))box.checked=false;
await ui.refreshRoster();ui.renderStages();
assert.equal(elements.get('recommend-stages').disabled,true);
assert(elements.get('stage-path').textContent.includes('Select at least two'));
elements.get('mobile-history').listeners.click();assert.equal(document.body.dataset.arenaView,'history');assert.equal(elements.get('history-panel').hidden,false);assert.equal(elements.get('tourney-panel').hidden,true);elements.get('mobile-setup').listeners.click();assert.equal(document.body.dataset.arenaView,'setup');assert.equal(elements.get('duel-panel').hidden,false);assert.equal(elements.get('choose-a').value,ui.testState().roster[0].id);await ui.startDuel();assert(ui.testState().series);assert.equal(document.body.dataset.arenaView,'live');elements.get('mobile-setup').listeners.click();assert(ui.testState().series);elements.get('mobile-live').listeners.click();elements.get('pause').onclick();assert.equal(elements.get('pause').textContent,'Resume');elements.get('pause').onclick();let time=0;for(let n=0;n<10000&&ui.testState().series;n++)ui.frame(time+=100);assert(!ui.testState().series);assert(elements.get('duel-result').textContent.match(/across [23] games/));
elements.get('tourney-night').value='random';elements.get('tourney-weather').value='random';elements.get('tourney-ground').value='random';ui.testState().config[0].bestOf=3;for(const box of elements.get('entrants').querySelectorAll('input'))box.checked=true;await ui.create();assert(ui.testState().tournament);assert.equal(db.prepare('SELECT count(*) as n FROM saved_tournaments').get().n,1);const before=structuredClone(ui.testState().tournament);const {resolveMatch}=await import(pathToFileURL(root+'public/tournaments.js').href);const expected=resolveMatch(before);await ui.watchNext();for(let n=0;n<10000&&ui.testState().series;n++)ui.frame(time+=100);await ui.testState().saveChain;assert.deepEqual(ui.testState().tournament.history.find(x=>x.id===expected.id),expected);await ui.resolve('all');assert(ui.testState().tournament.done);assert(elements.get('tourney-progress').textContent.includes('Champion'));const loaded=(await(await request('tournaments/'+ui.testState().tournamentId)).json()).tournament.state;assert.deepEqual(loaded,ui.testState().tournament);const recorded=ui.testState().tournament.history.find(m=>m.results?.length>=3);assert(recorded);await ui.replayMatch(recorded);const replayed=[],seen=new Set();for(let n=0;n<15000&&ui.testState().series;n++){const battle=ui.testState().activeFight;ui.frame(time+=100);if(battle.done&&!seen.has(battle)){seen.add(battle);replayed.push(battle.result());}}assert.deepEqual(replayed,recorded.results);await ui.refreshChampions();assert.equal(elements.get('history-records').children.length,1);assert.equal(elements.get('history-events').children.length,1);assert(elements.get('history-summary').textContent.includes('1 completed'));assert.equal(ui.testState().tournament.conditions.time,'random');console.log('Arena UI checks passed: saved random conditions and multi-leg replay, roster pickers, profiles, pause/resume, watched series, deterministic watched/quick match, tournament autosave and completion.');

// The real UI resolver must finish only the requested stage and persist the
// untouched next stage, even when called midway through a group round robin.
ui.testState().config.splice(0,1,{...defaultStage('groups'),groups:1,advance:3},{...defaultStage('swiss'),rounds:5},defaultStage('double'));
for(const box of elements.get('entrants').querySelectorAll('input'))box.checked=true;
await ui.create();
const stageId=ui.testState().tournamentId;
assert.equal(elements.get('resolve-stage').disabled,false);
await ui.resolve('round');
assert.equal(ui.testState().tournament.stageIndex,0);
assert.equal(ui.testState().tournament.history.filter(m=>!m.bye).length,1);
await elements.get('resolve-stage').onclick();
assert.equal(ui.testState().tournament.stageIndex,1);
assert.equal(ui.testState().tournament.stageResults.length,1);
assert(ui.testState().tournament.history.filter(m=>!m.bye).every(m=>m.stage===0));
assert.equal(ui.testState().tournament.history.filter(m=>!m.bye).length,3);
let stageSaved=(await(await request('tournaments/'+stageId)).json()).tournament.state;
assert.equal(stageSaved.stageIndex,1);
assert(stageSaved.history.filter(m=>!m.bye).every(m=>m.stage===0));
assert.equal(stageSaved.runtime.pending.length,1);
await ui.resolve('stage');
assert.equal(ui.testState().tournament.stageIndex,2);
assert.equal(ui.testState().tournament.stageResults.length,2);
assert(ui.testState().tournament.history.filter(m=>m.stage===1).every(m=>m.round<=5));assert.equal(ui.testState().tournament.stageResults[1].qualified.length,2);
assert(ui.testState().tournament.history.every(m=>m.stage<2));
stageSaved=(await(await request('tournaments/'+stageId)).json()).tournament.state;
assert.equal(stageSaved.stageIndex,2);
assert(stageSaved.history.every(m=>m.stage<2));
await ui.resolve('stage');
assert.equal(ui.testState().tournament.done,true);
assert.equal(elements.get('resolve-stage').disabled,true);
assert.equal(ui.testState().tournament.stageResults.length,3);
stageSaved=(await(await request('tournaments/'+stageId)).json()).tournament.state;
assert.equal(stageSaved.champion,ui.testState().tournament.champion);
const finished=structuredClone(stageSaved);await ui.resolve('stage');assert.deepEqual(ui.testState().tournament,finished);
console.log('Stage simulation UI passed: mid-group completion, full Swiss, final double elimination, next-stage boundaries, autosave, disabled buttons, and champion persistence.');

await ui.testState().saveChain;
await ui.refreshRoster();
elements.get('arena-collection').showModal();
const arenaRecords=ui.testState().roster;
arenaRecords[0].matchRecord={wins:3,losses:1,draws:0,matches:4};arenaRecords[0].championships=2;
arenaRecords[1].matchRecord={wins:1,losses:3,draws:0,matches:4};arenaRecords[1].championships=4;
arenaRecords[2].matchRecord={wins:0,losses:0,draws:0,matches:0};arenaRecords[2].championships=0;
elements.get('collection-order').value='wins-high';elements.get('collection-order').listeners.change();
assert.equal(elements.get('arena-saved-list').children.length,3);
assert.equal(elements.get('arena-saved-list').children[0].children[0].children[0].textContent,arenaRecords[0].name);
elements.get('collection-min-winrate').value='50';elements.get('collection-min-titles').value='2';elements.get('collection-min-winrate').listeners.input();assert.equal(elements.get('arena-saved-list').children.length,1);
elements.get('collection-clear').onclick();assert.equal(elements.get('arena-saved-list').children.length,3);
const choose=elements.get('arena-saved-list').children[0].children.at(-1).children.find(b=>b.textContent==='Use as fighter B');await choose.listeners.click();assert.equal(elements.get('choose-b').value,arenaRecords[0].id);assert.equal(elements.get('arena-collection').open,false);
console.log('Arena collection UI passed: saved fighter cards, win-rate sorting, combined filters, clear, and selecting a fighter without leaving the arena.');
const savedRecords=(await(await request('characters')).json()).characters;
assert(savedRecords.some(c=>c.matchRecord.matches>0));
assert.equal(db.prepare("SELECT count(*) as n FROM match_records WHERE tournament_id IS NULL").get().n,1,'Friendly series counts once');
const {createTournament,recordMatch,nextMatch}=await import(pathToFileURL(root+'public/tournaments.js').href);
const fakeRoster=Array.from({length:128},(_,i)=>({id:'group-'+i,name:'Group fighter '+i,traits:{},summary:{total:100,stats:[10,10,10,10,10]}}));
const mock=createTournament('Group cards',fakeRoster,[{...defaultStage('groups'),groups:32,advance:64},{...defaultStage('swiss'),rounds:6,advance:16},defaultStage('double')],123,{shuffle:false});
Object.assign(ui.testState().tournament,mock);ui.renderTournament();
assert.equal(elements.get('group-standings').children.length,32);
assert.equal(elements.get('overall-standings').hidden,true);
for(const card of elements.get('group-standings').children)assert.equal(card.children[1].children[0].children[1].children.length,4);
while(ui.testState().tournament.stageIndex===0){const t=ui.testState().tournament,m=nextMatch(t);recordMatch(t,m,[{winner:m.a,seconds:1,combatVersion:10}]);}
ui.renderTournament();assert.equal(elements.get('overall-standings').hidden,false);assert.equal(elements.get('standings').children.length,64);
elements.get('results-stage').value='0';elements.get('results-stage').onchange();
assert.equal(elements.get('group-standings').children.length,32);
assert.equal(elements.get('match-history').children.length,81);
const firstCompletedGroup=flatten(elements.get('group-standings').children[0]);
const t=ui.testState().tournament,m=nextMatch(t);recordMatch(t,m,[{winner:m.a,seconds:1,combatVersion:10}]);ui.renderTournament();
assert.equal(elements.get('results-stage').value,'0');assert.equal(flatten(elements.get('group-standings').children[0]),firstCompletedGroup);
elements.get('results-stage').value='2';elements.get('results-stage').onchange();assert(elements.get('stage-results-note').textContent.includes('not started'));assert.equal(elements.get('overall-standings').hidden,true);
elements.get('results-stage').value='current';elements.get('results-stage').onchange();assert.equal(elements.get('standings').children.length,64);assert.equal(elements.get('match-history').children.length,1);
console.log('Results UI passed: 32 separate four-fighter group tables, 64-fighter Swiss standings, completed group history, preserved earlier-stage selection, future-stage empty state, and friendly record persistence.');

// The open arena collection must follow champion refreshes without a reopen.
await ui.refreshRoster();elements.get('arena-collection').showModal();
const actualFetch=globalThis.fetch;let leader=ui.testState().roster[0];
globalThis.fetch=async(path,options={})=>path==='/api/champions'?Response.json({champions:[{characterId:leader.id,characterName:leader.name,divisionKey:'any|any|any',label:'Open',tournamentName:'Crown test',titles:1}],records:[],history:[],divisions:[]}):actualFetch(path,options);
await ui.refreshChampions();
const crownedName=leader.name;
assert(flatten(elements.get('arena-saved-list').children.find(c=>c.children[0].children[0].textContent===crownedName)).includes('👑 Current champion · Open'));
leader=ui.testState().roster[1];await ui.refreshChampions();
assert(!flatten(elements.get('arena-saved-list').children.find(c=>c.children[0].children[0].textContent===crownedName)).includes('Current champion'));
assert(flatten(elements.get('arena-saved-list').children.find(c=>c.children[0].children[0].textContent===leader.name)).includes('Current champion'));
globalThis.fetch=actualFetch;
console.log('Arena crown regression passed: visible current champion, live crown transfer, and removal from the former champion.');
for(const bestOf of [1,3,5]){
 elements.get('duel-best-of').value=String(bestOf);elements.get('choose-a').value=ui.testState().roster[0].id;elements.get('choose-b').value=ui.testState().roster[1].id;
 const previousMatches=db.prepare('SELECT COUNT(*) AS n FROM match_records').get().n;
 await ui.startDuel();const wins=Math.floor(bestOf/2)+1;
 for(let game=0;game<wins;game++){const {activeFight,series}=ui.testState();assert(series);assert.equal(series.bestOf,bestOf);activeFight.onComplete({winner:series.a.id,seconds:1});if(game<wins-1)assert(ui.testState().series);}
 assert.equal(ui.testState().series,null);assert(elements.get('duel-result').textContent.includes(`across ${wins} games`));await ui.testState().saveChain;assert.equal(db.prepare('SELECT COUNT(*) AS n FROM match_records').get().n,previousMatches+1);
}
ui.renderStages();const formatSelector=elements.get('stages').children[0].children[1].children[0].children[0];assert.deepEqual(formatSelector.children.map(o=>o.textContent),['Bo1','Bo3','Bo5']);formatSelector.value='5';formatSelector.listeners.change();assert.equal(ui.testState().config[0].bestOf,5);
console.log('Best-of UI passed: Bo1/3/5 selectors, first-to-majority watched completion, and one recorded match per series.');
// A higher-tier win preserves entry and saved stats after stat rewards retire.
{const growthIds=[];for(const tier of ['C','B']){const reply=await request('characters/bulk-generate','POST',{ids:[crypto.randomUUID()],tier});growthIds.push((await reply.json()).characters[0].id);}await ui.refreshRoster();ui.testState().config.splice(0,ui.testState().config.length,{...defaultStage('swiss'),rounds:3,advance:1});for(const box of elements.get('entrants').querySelectorAll('input'))box.checked=growthIds.includes(box.value);await ui.create();const cup=ui.testState().tournament,frozen=structuredClone(cup.roster),{nextMatch,recordMatch}=await import(pathToFileURL(root+'public/tournaments.js').href);recordMatch(cup,nextMatch(cup),[{winner:growthIds[0],seconds:1,combatVersion:10}]);await ui.saveTournament();assert.deepEqual(cup.roster,frozen);assert.equal(ui.testState().roster.find(c=>c.id===growthIds[0]).summary.growth,undefined);console.log('Arena retired-growth UI passed: saved scores and cup snapshots remain unchanged.');

}

// Entrant crowns belong to the exact configured cup, while saved cards retain all cup titles.
{
 await ui.refreshRoster();
 const fighters=ui.testState().roster.slice(0,4);assert.equal(fighters.length,4);
 for(const [i,c]of fighters.entries()){c.summary={...c.summary,stats:[140,140,140,140,140],total:700,rank:'Elite',tier:'C'};c.traits={...c.traits,weapon:['Longbow','Warhammer','Longbow','Staff'][i]};}
 const crowns=[['any|any|any','Open'],['any|C|any','Tier C'],['ranged|C|any','Ranged · Tier C'],['arcane|C|any','Arcane · Tier C']].map(([divisionKey,label],i)=>({divisionKey,label,characterId:fighters[i].id,characterName:fighters[i].name,titles:2,tournamentName:'Cup '+i}));
 const fetchBefore=globalThis.fetch;
 globalThis.fetch=async(path,options={})=>path==='/api/champions'?Response.json({champions:[...crowns,{divisionKey:'latest',characterId:fighters[1].id,characterName:fighters[1].name,label:'Latest tournament winner'}],records:[],history:[],divisions:[]}):fetchBefore(path,options);
 await ui.refreshChampions();
 assert.equal(elements.get('champion-list').children.length,4);
 assert(!flatten(elements.get('champion-list')).includes('Latest tournament winner'));
 const crowned=()=>elements.get('entrants').children.filter(label=>flatten(label).includes('👑')).map(label=>label.children[0].value);
 const setDivision=(style,tier,rank='any')=>{elements.get('filter-style').value=style;elements.get('filter-tier').value=tier;elements.get('filter-rank').value=rank;elements.get('filter-style').onchange();};
 setDivision('any','any');assert.deepEqual(crowned(),[fighters[0].id]);
 setDivision('any','C');assert.deepEqual(crowned(),[fighters[1].id]);
 setDivision('ranged','C');assert.deepEqual(crowned(),[fighters[2].id]);
 setDivision('arcane','C');assert.deepEqual(crowned(),[fighters[3].id]);
 setDivision('any','C','Elite');assert.deepEqual(crowned(),[]);
 setDivision('ranged','any');assert.deepEqual(crowned(),[]);
 // Changing filters preserves selected entrants who remain eligible.
 elements.get('entrants').querySelectorAll('input').find(e=>e.value===fighters[0].id).checked=true;
 setDivision('ranged','C');assert(elements.get('entrants').querySelectorAll('input:checked').some(e=>e.value===fighters[0].id));
 elements.get('arena-collection').showModal();elements.get('collection-min-winrate').value='';elements.get('collection-min-titles').value='';elements.get('collection-order').listeners.change();
 assert(!flatten(elements.get('arena-saved-list')).includes('Latest tournament winner'));
 assert(flatten(elements.get('arena-saved-list')).includes('Current champion · Open'));
 assert(flatten(elements.get('arena-saved-list')).includes('Current champion · Tier C'));
 globalThis.fetch=fetchBefore;
 console.log('Cup crown checks passed: exact Open / tier / ranged / arcane / rank division matching, no crown for an uncrowned combination, live filter switching, selected entrants preserved, all real current titles retained, and latest-winner entries hidden.');
}

await ui.loadReplayEngine(9);await ui.loadReplayEngine(5);await ui.loadReplayEngine(6);await ui.loadReplayEngine(7);await ui.loadReplayEngine(8);
const replayFighter=id=>({id,name:id,summary:{stats:[100,100,100,100,100]},traits:{weapon:'Battleaxe',power:'Singularity',power2:'No second power',weakness:'None'}});
for(const [version,life,pull]of [[5,4,undefined],[6,3,28],[7,3,28],[8,3,28],[9,3,28],[10,3,28]]){
 const Engine=ui.testReplayEngines().get(version),b=new Engine(replayFighter('a'),replayFighter('b'),123);b.usePower(b.fighters[0],b.fighters[1],b.fighters[0].powers[0]);assert.equal(b.zones[0].life,life);assert.equal(b.zones[0].pull,pull);b.done=true;b.winner=0;assert.equal(b.result().combatVersion,version);
}
console.log('Arena replay routing passed: v5 replays retain the original Singularity; current v9 fights retain Singularity tuning and use partial Rewind recovery.');

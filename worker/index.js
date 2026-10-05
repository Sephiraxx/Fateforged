const SITE_ORIGIN='https://fateforge-character-wheel.sephiraxx.chatgpt.site';
const IDS=['race','subrace','class','subclass','strength','speed','durability','iq','magic','weapon','mastery','power','power2','weakness'];
const BASE=IDS.filter(id=>!['subrace','subclass'].includes(id));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const tierFor=n=>n>=3000?'SS':n>=2100?'S':n>=1500?'A':n>=1000?'B':n>=650?'C':n>=350?'D':'E';
const noPower=name=>['no power','no second power'].includes(String(name).toLowerCase().trim());
function validateSnapshot(input){
 if(!plain(input)||input.version!==1||!plain(input.traits)||!plain(input.pools))fail('Invalid character snapshot.');
 if(input.wheelRarity!==undefined&&!WHEEL_LUCK.tiers.some(t=>t.id===input.wheelRarity))fail('Invalid wheel rarity.');const wheelRarity=WHEEL_LUCK.info(input.wheelRarity).id;
 const traits={};for(const [id,value] of Object.entries(input.traits)){if(!IDS.includes(id)||typeof value!=='string'||!value.trim()||value.length>60)fail('Invalid character trait.');traits[id]=value;}
 if(!traits.race)fail('Roll a race before saving.');if(traits.subclass&&!traits.class)fail('Subclass needs a class.');if((traits.power||traits.power2)&&!traits.magic)fail('Powers need a Magic roll.');
 if(traits.power&&traits.power2&&traits.power===traits.power2&&!noPower(traits.power))fail('The two powers must be different.');
 const pools={};for(const group of ['base','subrace','subclass']){const source=input.pools[group];if(!plain(source)||Object.keys(source).length>2000)fail('Invalid wheel settings.');const entries=[];for(const [key,list] of Object.entries(source)){if(!key||key.length>60||(group==='base'&&!BASE.includes(key))||!Array.isArray(list)||!list.length||list.length>200)fail('Invalid wheel options.');const names=new Set();const options=list.map(o=>{if(!plain(o)||typeof o.name!=='string'||!o.name.trim()||o.name.length>60||names.has(o.name)||!Number.isInteger(o.weight)||o.weight<1||o.weight>100||!Array.isArray(o.stats)||o.stats.length!==5||o.stats.some(n=>!Number.isInteger(n)||n< -1000||n>1000))fail('Invalid wheel option or stat.');names.add(o.name);return {name:o.name,weight:o.weight,stats:o.stats};});entries.push([key,options]);}pools[group]=Object.fromEntries(entries);}
 if(BASE.some(id=>!Object.hasOwn(pools.base,id)))fail('Missing wheel settings.');
 const raw=[0,0,0,0,0];for(const [id,name] of Object.entries(traits)){
  if(['power','power2'].includes(id)&&noPower(name))continue;
  const list=id==='subrace'?pools.subrace[traits.race]:id==='subclass'?pools.subclass[traits.class]:pools.base[id];
  const option=list?.find(o=>o.name===name);if(!option)fail('A selected trait is missing from its saved wheel.');option.stats.forEach((v,i)=>raw[i]+=v);
 }
 const stats=raw.map(v=>Math.max(0,v)),total=stats.reduce((a,b)=>a+b,0),rank=total>=3000?'Cosmic':total>=2100?'Divine':total>=1500?'Mythic':total>=1000?'Legendary':total>=650?'Elite':total>=350?'Capable':total>=150?'Common':'Trash';
 const catalog=input.catalog;if(catalog!==undefined&&(!plain(catalog)||catalog.version!==1||['powers','weaknesses'].some(key=>!Array.isArray(catalog[key])||catalog[key].length>200||catalog[key].some(name=>typeof name!=='string'||name.length>60))))fail('Invalid character catalog.');
 return {state:{version:1,wheelRarity,traits,pools,...(catalog?{catalog:{version:1,powers:catalog.powers,weaknesses:catalog.weaknesses}}:{})},summary:{wheelRarity,weapon:traits.weapon||'Bare hands',race:traits.race,subrace:traits.subrace||null,class:traits.class||null,traits: Object.keys(traits).length,stats,total,rank,tier:tierFor(total)}};
}
function storage(env){if(!env.DB?.prepare)fail('Character storage is temporarily unavailable. Please try again.',503);return {list:owner=>env.DB.prepare("SELECT id, name, summary_json, json_extract(state_json, '$.traits') AS traits_json, created_at, updated_at FROM saved_characters WHERE owner_id = ? ORDER BY updated_at DESC").bind(owner).all(),get:(owner,id)=>env.DB.prepare('SELECT id, name, state_json, summary_json, catalog_revision, created_at, updated_at FROM saved_characters WHERE owner_id = ? AND id = ?').bind(owner,id).first(),save:(owner,id,name,state,summary,now)=>env.DB.prepare('INSERT INTO saved_characters (id, owner_id, name, state_json, summary_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING id, name, summary_json, created_at, updated_at').bind(id,owner,name,JSON.stringify(state),JSON.stringify(summary),now,now).first(),remove:(owner,id)=>env.DB.prepare('DELETE FROM saved_characters WHERE owner_id = ? AND id = ?').bind(owner,id).run()};}
function record(row,full=false){const summary=JSON.parse(row.summary_json),traits=row.traits_json?JSON.parse(row.traits_json):row.state_json?JSON.parse(row.state_json).traits:null;return {id:row.id,name:row.name,...(row.repairs?.length?{repairs:row.repairs}:{}),summary:{...summary,promotion:promotionProgress(tierFor(summary.total),summary.growth),wheelRarity:WHEEL_LUCK.info(summary.wheelRarity).id,tier:tierFor(summary.total),weapon:row.weapon||summary.weapon||traits?.weapon||'Bare hands'},...(traits&&!full?{traits}:{}),createdAt:row.created_at,updatedAt:row.updated_at,...(full?{state:JSON.parse(row.state_json)}:{})};}
async function repairRoster(env,owner){
 const rows=await env.DB.prepare('SELECT id, name, state_json, summary_json, catalog_revision, created_at, updated_at FROM saved_characters WHERE owner_id = ? AND (catalog_revision IS NULL OR catalog_revision != ?)').bind(owner,CURRENT_CATALOG_REVISION).all();
 const repairs=new Map();
 for(let i=0;i<rows.results.length;i+=8)for(const row of await Promise.all(rows.results.slice(i,i+8).map(r=>repairSavedCharacter(env,owner,r))))if(row.repairs?.length)repairs.set(row.id,row.repairs);
 return repairs;
}
async function repairSavedCharacter(env,owner,row){
 for(let attempt=0;attempt<4;attempt++){
  if(row.catalog_revision===CURRENT_CATALOG_REVISION)return row;
  const repaired=reconcileCharacter(JSON.parse(row.state_json),CURRENT_CATALOG);
  const validated=repaired.changed?validateSnapshot(repaired.state):null,state=validated?JSON.stringify(validated.state):row.state_json,summary=validated?JSON.stringify(withGrowth(validated.summary,JSON.parse(row.summary_json).growth)):row.summary_json;
  // Compare the original snapshot so simultaneous entry on two devices cannot reroll twice.
  const result=await env.DB.prepare('UPDATE saved_characters SET state_json = ?, summary_json = ?, catalog_revision = ? WHERE owner_id = ? AND id = ? AND state_json = ? AND summary_json = ?').bind(state,summary,CURRENT_CATALOG_REVISION,owner,row.id,row.state_json,row.summary_json).run();
  if(result.meta?.changes)return {...row,state_json:state,summary_json:summary,catalog_revision:CURRENT_CATALOG_REVISION,repairs:repaired.repairs};
  row=await storage(env).get(owner,row.id);if(!row)fail('Character not found.',404);
 }
 fail('Your fighter is being updated on another device. Refresh and try again.',409);
}
async function api(request,env,url){const owner=request.headers.get('oai-authenticated-user-id');if(!owner)fail('Sign in with ChatGPT to save and load your characters.',401);const db=storage(env),suffix=url.pathname.slice('/api/characters'.length),id=suffix.slice(1);if(['/bulk-generate','/bulk-remove'].includes(suffix))return bulkCharacters(request,env,url,owner,suffix);if(suffix&&(!suffix.startsWith('/')||!UUID.test(id)))fail('Character not found.',404);
 if(request.method==='GET'){
  const repairs=!suffix?await repairRoster(env,owner):null;
  await backfillMatchRecords(env,owner);
  const [records,titleRows]=await Promise.all([fighterRecords(env,owner),env.DB.prepare('SELECT character_id, COUNT(*) AS titles FROM champion_history WHERE owner_id = ? GROUP BY character_id').bind(owner).all()]);
  const titles=new Map(titleRows.results.map(r=>[r.character_id,r.titles]));
  const withRecord=c=>({...c,matchRecord:records.get(c.id)||{wins:0,losses:0,draws:0,matches:0},championships:titles.get(c.id)||0});
  if(!suffix){const result=await db.list(owner);return json({characters:result.results.map(row=>withRecord(record({...row,repairs:repairs.get(row.id)})))});}
  const row=await db.get(owner,id);if(!row)fail('Character not found.',404);return json({character:withRecord(record(await repairSavedCharacter(env,owner,row),true))});
 }
 if(!['PUT','DELETE'].includes(request.method)||!id)return json({error:'Method not allowed.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin&&origin!==SITE_ORIGIN)fail('Request origin is not allowed.',403);
 if(request.method==='DELETE'){const result=await db.remove(owner,id);if(!result.meta?.changes)fail('Character not found.',404);return json({deleted:true,id});}
 if(!request.headers.get('content-type')?.includes('application/json'))fail('Send the character as JSON.',415);const length=Number(request.headers.get('content-length')||0);if(length>2000000)fail('Character settings are too large.',413);const text=await request.text();if(new TextEncoder().encode(text).byteLength>2000000)fail('Character settings are too large.',413);let input;try{input=JSON.parse(text);}catch{fail('Invalid JSON.');}if(!plain(input)||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>100)fail('Use a name from 1 to 100 characters.');const {state,summary}=validateSnapshot(input.state),row=await db.save(owner,id,input.name.trim(),state,summary,Date.now());if(!row){const existing=await db.get(owner,id);if(!existing)fail('Character not found.',404);if(existing.name!==input.name.trim()||JSON.stringify(validateSnapshot(JSON.parse(existing.state_json)).state)!==JSON.stringify(state))fail('Saved fighters cannot be edited. Generate a new fighter.',409);return json({character:record(existing)});}return json({character:record(row)});
}
export default {async fetch(request,env){const url=new URL(request.url);try{if(env.DB?.batch&&request.method==='GET'&&['/','/arena'].includes(url.pathname)){await applyRequestedReset(env);await repairRequestedTournamentNames(env);}if(url.pathname.startsWith('/api/match-records/'))return await friendlyRecordApi(request,env,url);if(url.pathname==='/api/champions')return await championApi(request,env);if(url.pathname==='/api/tournaments'||url.pathname.startsWith('/api/tournaments/'))return await tournamentApi(request,env,url);if(url.pathname==='/api/characters'||url.pathname.startsWith('/api/characters/'))return await api(request,env,url);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});if(BINARY_ASSETS[url.pathname])return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(BINARY_ASSETS[url.pathname]),c=>c.charCodeAt(0)),{headers:{'content-type':url.pathname.endsWith('.webp')?'image/webp':'image/png','cache-control':url.searchParams.get('v')===ASSET_VERSION?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate'}});const body=ASSETS[url.pathname];if(body===undefined)return new Response('Not found',{status:404});const type=url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html';return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':type+'; charset=utf-8','cache-control':url.searchParams.get('v')===ASSET_VERSION&&type!=='text/html'?'public, max-age=31536000, immutable':'no-cache','x-content-type-options':'nosniff'}});}catch(e){if(!e.status)console.error('Character storage request failed',e);return json({error:e.status?e.message:'Character storage is temporarily unavailable. Your current character has been kept. Please try again.'},e.status||503);}}};
function validateTournament(input){
 if(!plain(input)||input.version!==1||typeof input.name!=='string'||!input.name.trim()||input.name.length>100||!Array.isArray(input.roster)||input.roster.length<2||!Array.isArray(input.stages)||!input.stages.length||input.stages.length>16)fail('Invalid tournament setup.');
 normalizeArenaConditions(input.conditions??{time:input.night?'night':'day'});const filters=normalizeDivision(input.filters);const ids=new Set();for(const c of input.roster){if(!plain(c)||!UUID.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||c.name.length>100||!plain(c.summary)||!Array.isArray(c.summary.stats)||c.summary.stats.length!==5||c.summary.stats.some(n=>!Number.isInteger(n)||n<0||n>14000)||!plain(c.traits))fail('Invalid entrant.');if(!entrantMatches(c,filters))fail('An entrant does not match the tournament division.');ids.add(c.id);for(const [key,v]of Object.entries(c.traits))if(!IDS.includes(key)||typeof v!=='string'||v.length>60)fail('Invalid entrant trait.');}
 const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;for(const c of input.stages)if(!plain(c)||!['single','double','swiss','groups'].includes(c.type)||(c.bestOf!==undefined?!validBestOf(c.bestOf):!int(c.legs,1,101))||!int(c.rounds,1,100)||!int(c.groups,1,Number.MAX_SAFE_INTEGER)||!int(c.advance,1,Number.MAX_SAFE_INTEGER))fail('Invalid stage settings.');
 if(!int(input.stageIndex,0,input.stages.length-1)||!int(input.seed,0,4294967295)||typeof input.night!=='boolean'||typeof input.done!=='boolean'||!int(input.nextId,1,50000)||!Array.isArray(input.history)||input.history.length>20000||!Array.isArray(input.stageResults)||input.stageResults.length>16)fail('Invalid tournament progress.');
 const r=input.runtime;if(!plain(r)||!Array.isArray(r.players)||r.players.some(id=>!ids.has(id))||new Set(r.players).size!==r.players.length||!plain(r.table)||!Array.isArray(r.pending)||!Array.isArray(r.eliminated)||!Array.isArray(r.groups)||!int(r.round,1,200)||typeof r.finalPlayed!=='boolean')fail('Invalid standings.');
 for(const [id,t]of Object.entries(r.table)){if(!ids.has(id)||!plain(t)||!Array.isArray(t.opponents)||t.opponents.length>20000||t.opponents.some(x=>!ids.has(x))||['points','wins','draws','losses','legWins','legLosses','byes'].some(key=>!Number.isFinite(t[key])||t[key]<0||t[key]>2000000))fail('Invalid standing.');}
 if(r.players.some(id=>!r.table[id])||r.eliminated.some(id=>!ids.has(id))||r.groups.some(g=>!Array.isArray(g)||g.some(id=>!ids.has(id)))||r.pending.length>10000)fail('Invalid stage entrants.');
 for(const m of [...input.history,...r.pending]){if(!plain(m)||!ids.has(m.a)||(m.b!==null&&!ids.has(m.b))||m.a===m.b||!int(m.id,1,50000)||!int(m.stage,0,input.stages.length-1)||!int(m.round,1,200)||(m.bestOf!==undefined?!validBestOf(m.bestOf):!int(m.legs,1,101))||!int(m.seed,0,4294967295)||typeof m.label!=='string'||m.label.length>100)fail('Invalid match.');if(m.results!==undefined){if(!Array.isArray(m.results)||m.results.length>102||m.results.some(x=>!plain(x)||![m.a,m.b].includes(x.winner)||!Number.isFinite(x.seconds)||x.seconds<0||x.seconds>91)||!Array.isArray(m.score)||m.score.length!==2||m.score.some(n=>!int(n,0,102)))fail('Invalid match result.');if(m.bestOf!==undefined&&!m.bye){let score;try{score=assertSeriesResult(m,m.results,m.a,m.b);}catch{fail('Invalid best-of series result.');}if(m.score.some((v,i)=>v!==score[i])||m.winner!==(score[0]>score[1]?m.a:m.b))fail('Invalid series score.');}}}
 if(input.done&&(input.runtime.pending.length||input.stageResults.at(-1)?.ranking[0]!==input.champion))fail('Finish the final stage before crowning a champion.');if(input.done&&!ids.has(input.champion))fail('Invalid champion.');for(const s of input.stageResults)if(!plain(s)||!Array.isArray(s.ranking)||s.ranking.some(id=>!ids.has(id)))fail('Invalid stage result.');return input;
}
async function encodeTournament(state){const raw=new TextEncoder().encode(JSON.stringify(state)),compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(let i=0;i<compressed.length;i+=32768)binary+=String.fromCharCode(...compressed.subarray(i,i+32768));const encoded='gz:'+btoa(binary);if(encoded.length>1800000)fail('This tournament has reached its save size limit. Current progress remains on this page.',413);return encoded;}
async function decodeTournament(text){if(!text.startsWith('gz:'))return JSON.parse(text);const bytes=Uint8Array.from(atob(text.slice(3)),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
const tournamentRecord=row=>({id:row.id,name:row.name,summary:JSON.parse(row.summary_json),createdAt:row.created_at,updatedAt:row.updated_at});
async function tournamentApi(request,env,url){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)fail('Sign in with ChatGPT to save and load tournaments.',401);storage(env);const suffix=url.pathname.slice('/api/tournaments'.length),id=suffix.slice(1);if(suffix&&(!suffix.startsWith('/')||!UUID.test(id)))fail('Tournament not found.',404);
 const get=()=>env.DB.prepare('SELECT * FROM saved_tournaments WHERE owner_id = ? AND id = ?').bind(owner,id).first();
 if(request.method==='GET'){if(!suffix){const rows=await env.DB.prepare('SELECT id, name, summary_json, created_at, updated_at FROM saved_tournaments WHERE owner_id = ? ORDER BY updated_at DESC').bind(owner).all();return json({tournaments:rows.results.map(tournamentRecord)});}const row=await get();if(!row)fail('Tournament not found.',404);return json({tournament:{...tournamentRecord(row),state:await decodeTournament(row.state_json)}});}
 if(!['PUT','DELETE'].includes(request.method)||!id)return json({error:'Method not allowed.'},405);const origin=request.headers.get('origin');if(origin&&origin!==url.origin&&origin!==SITE_ORIGIN)fail('Request origin is not allowed.',403);
 if(request.method==='DELETE'){const old=await get();if(old)await recordTournamentMatches(env,owner,id,await decodeTournament(old.state_json),old.updated_at);if(old?.completed_at&&JSON.parse(old.summary_json).done)await awardChampions(env,owner,id,old.name,await decodeTournament(old.state_json),old.completed_at);const result=await env.DB.prepare('DELETE FROM saved_tournaments WHERE owner_id = ? AND id = ?').bind(owner,id).run();if(!result.meta?.changes)fail('Tournament not found.',404);return json({deleted:true,id});}
 if(!request.headers.get('content-type')?.includes('application/json'))fail('Send the tournament as JSON.',415);if(Number(request.headers.get('content-length')||0)>16000000)fail('Tournament is too large to save.',413);const text=await request.text();if(new TextEncoder().encode(text).byteLength>16000000)fail('Tournament is too large to save.',413);let input;try{input=JSON.parse(text);}catch{fail('Invalid JSON.');}
 if(!plain(input)||typeof input.name!=='string'||!input.name.trim()||input.name.length>100)fail('Choose a tournament name.');const state=validateTournament(input.state),previous=await get(),previousTitle=await env.DB.prepare('SELECT character_id, division_key, completed_at FROM champion_history WHERE owner_id = ? AND tournament_id = ?').bind(owner,id).first();if(previousTitle&&(!state.done||previousTitle.character_id!==state.champion||previousTitle.division_key!==[normalizeDivision(state.filters).style,normalizeDivision(state.filters).tier,normalizeDivision(state.filters).rank].join('|')))fail('A recorded championship cannot be changed.');
 if(!previous){for(const c of state.roster){const saved=await storage(env).get(owner,c.id);if(!saved)fail('An entrant is no longer in your saved collection. Refresh your roster and try again.');const summary=JSON.parse(saved.summary_json),traits=JSON.parse(saved.state_json).traits;if(JSON.stringify(c.summary.stats)!==JSON.stringify(summary.stats)||JSON.stringify(c.traits)!==JSON.stringify(traits)||c.name!==saved.name)fail('An entrant changed since it was loaded. Refresh your roster before creating the tournament.');}}
 else{const before=await decodeTournament(previous.state_json);if(JSON.stringify(normalizeArenaConditions(before.conditions??{time:before.night?'night':'day'}))!==JSON.stringify(normalizeArenaConditions(state.conditions??{time:state.night?'night':'day'})))fail('Tournament conditions are fixed once created.');if(JSON.stringify(normalizeDivision(before.filters))!==JSON.stringify(normalizeDivision(state.filters)))fail('Tournament filters are fixed once created.');if(before.done&&(!state.done||before.champion!==state.champion))fail('A completed tournament result cannot be changed.');for(const key of ['roster','stages','seed','night','progressionVersion'])if(JSON.stringify(before[key])!==JSON.stringify(state[key]))fail('Tournament entrants and stages are fixed once created. Start a new tournament to change them.');if(JSON.stringify(state.history.slice(0,before.history.length))!==JSON.stringify(before.history))fail('Previously saved match results cannot be changed.');}
 if(!previous&&state.progressionVersion!==undefined&&state.progressionVersion!==1)fail('Invalid progression rules.');
 if(!previous)input.name=await claimTournamentName(env,owner,id,input.name.trim());state.name=input.name.trim();
 const division=normalizeDivision(state.filters),completedAt=previousTitle?.completed_at||previous?.completed_at||(state.done?Date.now():null);const summary={division:divisionLabel(division),filters:division,entrants:state.roster.length,matches:state.history.filter(m=>!m.bye).length,stage:state.stageIndex+1,done:state.done,champion:state.champion},encoded=await encodeTournament(state),now=Date.now();const row=await env.DB.prepare('INSERT INTO saved_tournaments (id, owner_id, name, state_json, summary_json, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, state_json = excluded.state_json, summary_json = excluded.summary_json, completed_at = COALESCE(saved_tournaments.completed_at, excluded.completed_at), updated_at = excluded.updated_at WHERE saved_tournaments.owner_id = excluded.owner_id RETURNING id, name, summary_json, created_at, updated_at').bind(id,owner,input.name.trim(),encoded,JSON.stringify(summary),completedAt,now,now).first();if(!row)fail('Tournament not found.',404);await recordTournamentMatches(env,owner,id,state,now);const promotions=state.progressionVersion===1?await awardUpsets(env,owner,id,state,now):[];if(state.done)await awardChampions(env,owner,id,input.name.trim(),state,completedAt);return json({tournament:tournamentRecord(row),promotions});
}

const DIVISION_DEFAULT={style:'any',tier:'any',rank:'any'};
function normalizeDivision(input){const f={...DIVISION_DEFAULT,...input};if(!['any','melee','ranged','arcane'].includes(f.style)||!['any','E','D','C','B','A','S','SS'].includes(f.tier)||!['any','Trash','Common','Capable','Elite','Legendary','Mythic','Divine','Cosmic'].includes(f.rank))fail('Invalid tournament filters.');return {style:f.style,tier:f.tier,rank:f.rank};}
function divisionLabel(f){return [f.style==='any'?null:f.style==='arcane'?'Arcane':f.style==='ranged'?'Ranged':'Melee',f.tier==='any'?null:'Tier '+f.tier,f.rank==='any'?null:f.rank].filter(Boolean).join(' · ')||'Open';}
function entrantMatches(c,f){const n=(c.traits.weapon||'Bare hands').toLowerCase(),style=/bow|gun|rifle|revolver|throwing|chakram/.test(n)?'ranged':/wand|orb|spellbook|^staff$/.test(n)?'arcane':'melee',total=c.summary.stats.reduce((a,b)=>a+b,0),rank=total>=3000?'Cosmic':total>=2100?'Divine':total>=1500?'Mythic':total>=1000?'Legendary':total>=650?'Elite':total>=350?'Capable':total>=150?'Common':'Trash';return(f.style==='any'||f.style===style||(f.style==='ranged'&&style==='arcane'))&&(f.tier==='any'||tierFor(total)===f.tier)&&(f.rank==='any'||rank===f.rank);}
async function awardChampions(env,owner,id,name,state,completedAt){
 const winner=state.roster.find(c=>c.id===state.champion);if(!winner)return;
 const filters=normalizeDivision(state.filters),key=[filters.style,filters.tier,filters.rank].join('|');
 const statements=[env.DB.prepare('INSERT INTO champion_history (owner_id, tournament_id, tournament_name, division_key, label, character_id, character_name, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_id, tournament_id) DO NOTHING').bind(owner,id,name,key,divisionLabel(filters),winner.id,winner.name,completedAt)];
 for(const [division,label]of [[key,divisionLabel(filters)],['latest','Latest tournament winner']])statements.push(env.DB.prepare('INSERT INTO current_champions (owner_id, division_key, label, character_id, character_name, tournament_id, tournament_name, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_id, division_key) DO UPDATE SET label = excluded.label, character_id = excluded.character_id, character_name = excluded.character_name, tournament_id = excluded.tournament_id, tournament_name = excluded.tournament_name, completed_at = excluded.completed_at WHERE excluded.completed_at > current_champions.completed_at OR (excluded.completed_at = current_champions.completed_at AND excluded.tournament_id > current_champions.tournament_id)').bind(owner,division,label,winner.id,winner.name,id,name,completedAt));
 await env.DB.batch(statements);
}
async function championApi(request,env){if(request.method!=='GET')return json({error:'Method not allowed.'},405);const owner=request.headers.get('oai-authenticated-user-id');if(!owner)fail('Sign in with ChatGPT to see current champions.',401);storage(env);
 // Backfill available completed tournaments once. The archive survives tournament deletion.
 const result=await env.DB.prepare('SELECT t.* FROM saved_tournaments t WHERE t.owner_id = ? AND t.completed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM champion_history h WHERE h.owner_id = t.owner_id AND h.tournament_id = t.id) ORDER BY t.completed_at ASC, t.id ASC').bind(owner).all();
 for(const row of result.results){if(!JSON.parse(row.summary_json).done)continue;const state=await decodeTournament(row.state_json);await awardChampions(env,owner,row.id,row.name,state,row.completed_at);}
 // A surviving current crown can also recover one known result from a deleted tournament.
 const crowns=await env.DB.prepare("SELECT * FROM current_champions WHERE owner_id = ? ORDER BY CASE WHEN division_key = 'latest' THEN 0 ELSE 1 END, completed_at DESC, division_key").bind(owner).all();
 await env.DB.prepare("INSERT INTO champion_history (owner_id, tournament_id, tournament_name, division_key, label, character_id, character_name, completed_at) SELECT c.owner_id, c.tournament_id, c.tournament_name, c.division_key, c.label, c.character_id, c.character_name, c.completed_at FROM current_champions c WHERE c.owner_id = ? AND c.division_key != 'latest' AND NOT EXISTS (SELECT 1 FROM champion_history h WHERE h.owner_id = c.owner_id AND h.tournament_id = c.tournament_id) ON CONFLICT(owner_id, tournament_id) DO NOTHING").bind(owner).run();
 const events=await env.DB.prepare('SELECT * FROM champion_history WHERE owner_id = ? ORDER BY completed_at DESC, tournament_id DESC').bind(owner).all();
 const history=events.results.map(r=>({divisionKey:r.division_key,label:r.label,characterId:r.character_id,characterName:r.character_name,tournamentId:r.tournament_id,tournamentName:r.tournament_name,completedAt:r.completed_at})),{records,divisions}=summarizeChampionHistory(history);
 return json({champions:crowns.results.map(r=>{const event=history.find(e=>e.tournamentId===r.tournament_id),record=records.find(e=>e.characterId===r.character_id&&e.divisionKey===(event?.divisionKey||r.division_key));return {divisionKey:r.division_key,label:r.label,characterId:r.character_id,characterName:r.character_name,tournamentId:r.tournament_id,tournamentName:r.tournament_name,completedAt:r.completed_at,titles:record?.titles||1,currentStreak:record?.currentStreak||0,cupLabel:record?.label||r.label};}),history,records,divisions});}

function normalizeArenaConditions(input){const c={time:'day',weather:'clear',ground:'stone',...input};if(!['dawn','day','dusk','night','random'].includes(c.time)||!['clear','rain','frost','storm','random'].includes(c.weather)||!['stone','water','random'].includes(c.ground))fail('Invalid arena conditions.');return {time:c.time,weather:c.weather,ground:c.ground};}

function recordStatement(env,owner,eventId,tournamentId,a,b,score,time){
 const winner=score[0]===score[1]?null:score[0]>score[1]?a:b;
 return env.DB.prepare('INSERT INTO match_records (owner_id, event_id, tournament_id, character_a, character_b, winner, score_json, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_id, event_id) DO NOTHING').bind(owner,eventId,tournamentId,a,b,winner,JSON.stringify(score),time);
}
async function recordTournamentMatches(env,owner,id,state,time){
 const sync=await env.DB.prepare('SELECT matches FROM match_record_sync WHERE owner_id = ? AND tournament_id = ?').bind(owner,id).first();
 const matches=state.history.filter(m=>!m.bye&&m.b&&m.results?.length);
 const fresh=matches.slice(sync?.matches||0);
 for(let i=0;i<fresh.length;i+=100)await env.DB.batch(fresh.slice(i,i+100).map(m=>recordStatement(env,owner,`tournament:${id}:${m.id}`,id,m.a,m.b,m.score,time)));
 await env.DB.prepare('INSERT INTO match_record_sync (owner_id, tournament_id, matches) VALUES (?, ?, ?) ON CONFLICT(owner_id, tournament_id) DO UPDATE SET matches = MAX(matches, excluded.matches)').bind(owner,id,matches.length).run();
}
async function backfillMatchRecords(env,owner){
 const rows=await env.DB.prepare("SELECT t.id, t.state_json, t.updated_at FROM saved_tournaments t LEFT JOIN match_record_sync s ON s.owner_id = t.owner_id AND s.tournament_id = t.id WHERE t.owner_id = ? AND CAST(json_extract(t.summary_json, '$.matches') AS INTEGER) > COALESCE(s.matches, -1)").bind(owner).all();
 for(const row of rows.results)await recordTournamentMatches(env,owner,row.id,await decodeTournament(row.state_json),row.updated_at);
}
async function fighterRecords(env,owner){
 const rows=await env.DB.prepare('SELECT character_id, SUM(won) AS wins, SUM(lost) AS losses, SUM(drawn) AS draws, COUNT(*) AS matches FROM (SELECT character_a AS character_id, CASE WHEN winner = character_a THEN 1 ELSE 0 END AS won, CASE WHEN winner = character_b THEN 1 ELSE 0 END AS lost, CASE WHEN winner IS NULL THEN 1 ELSE 0 END AS drawn FROM match_records WHERE owner_id = ? UNION ALL SELECT character_b AS character_id, CASE WHEN winner = character_b THEN 1 ELSE 0 END AS won, CASE WHEN winner = character_a THEN 1 ELSE 0 END AS lost, CASE WHEN winner IS NULL THEN 1 ELSE 0 END AS drawn FROM match_records WHERE owner_id = ?) GROUP BY character_id').bind(owner,owner).all();
 return new Map(rows.results.map(r=>[r.character_id,{wins:r.wins,losses:r.losses,draws:r.draws,matches:r.matches}]));
}
async function friendlyRecordApi(request,env,url){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)fail('Sign in to save match records.',401);storage(env);
 const id=url.pathname.slice('/api/match-records/'.length);if(!UUID.test(id))fail('Invalid match ID.');
 if(request.method!=='PUT')return json({error:'Method not allowed.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin&&origin!==SITE_ORIGIN)fail('Request origin is not allowed.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))fail('Send the match result as JSON.',415);
 const text=await request.text();if(text.length>10000)fail('Match result is too large.',413);let input;try{input=JSON.parse(text);}catch{fail('Invalid JSON.');}
 if(!plain(input)||!UUID.test(input.a)||!UUID.test(input.b)||input.a===input.b||!Array.isArray(input.score)||input.score.length!==2||input.score.some(n=>!Number.isInteger(n)||n<0||n>102)||input.score[0]+input.score[1]<1||input.score[0]+input.score[1]>102)fail('Invalid match result.');
 const db=storage(env);if(!await db.get(owner,input.a)||!await db.get(owner,input.b))fail('A fighter is no longer in your saved collection.',404);
 const eventId='friendly:'+id;
 await recordStatement(env,owner,eventId,null,input.a,input.b,input.score,Date.now()).run();
 const saved=await env.DB.prepare('SELECT character_a, character_b, score_json FROM match_records WHERE owner_id = ? AND event_id = ?').bind(owner,eventId).first();
 if(saved.character_a!==input.a||saved.character_b!==input.b||saved.score_json!==JSON.stringify(input.score))fail('This match result was already recorded differently.',409);
 return json({saved:true});
}

async function bulkCharacters(request,env,url,owner,action){
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin&&origin!==SITE_ORIGIN)fail('Request origin is not allowed.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))fail('Send the request as JSON.',415);
 const text=await request.text();if(text.length>12000)fail('Bulk request is too large.',413);
 let input;try{input=JSON.parse(text);}catch{fail('Invalid JSON.');}
 const limit=action==='/bulk-generate'?10:50;
 if(!plain(input)||!Array.isArray(input.ids)||!input.ids.length||input.ids.length>limit||input.ids.some(id=>typeof id!=='string'||!UUID.test(id))||new Set(input.ids).size!==input.ids.length)fail(`Use 1–${limit} unique character IDs per batch.`);
 const slots=input.ids.map(()=>'?').join(',');
 if(action==='/bulk-remove'){
  const result=await env.DB.prepare(`DELETE FROM saved_characters WHERE owner_id = ? AND id IN (${slots}) RETURNING id`).bind(owner,...input.ids).all();
  return json({deletedIds:result.results.map(row=>row.id)});
 }
 const target=input.tier??'any';if(!['any','E','D','C','B','A','S','SS'].includes(target))fail('Choose a valid generation tier.');
 // Client-generated IDs make a retried batch safe after an interrupted response.
 const existing=await env.DB.prepare(`SELECT id, owner_id, summary_json FROM saved_characters WHERE id IN (${slots})`).bind(...input.ids).all();
 if(existing.results.some(row=>row.owner_id!==owner))fail('Character ID unavailable. Start a new batch.',409);
 if(target!=='any'&&existing.results.some(row=>tierFor(JSON.parse(row.summary_json).total)!==target))fail('This batch was already generated with a different tier.',409);
 const already=new Set(existing.results.map(row=>row.id)),now=Date.now(),statements=[];
 for(const id of input.ids){if(already.has(id))continue;
  const rolled=rollTierCharacter(target),{state,summary}=validateSnapshot({version:1,...rolled,pools:GENERATION_POOLS,catalog:{version:1,powers:CURRENT_CATALOG.power.map(p=>p.name),weaknesses:CURRENT_CATALOG.weakness.map(p=>p.name)}});
  statements.push(env.DB.prepare('INSERT INTO saved_characters (id, owner_id, name, state_json, summary_json, catalog_revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(id,owner,RANDOM_CHARACTER_NAME(rolled.traits),JSON.stringify(state),JSON.stringify(summary),CURRENT_CATALOG_REVISION,now,now));
 }
 if(statements.length)await env.DB.batch(statements);
 const result=await env.DB.prepare(`SELECT id, name, summary_json, json_extract(state_json, '$.traits') AS traits_json, created_at, updated_at FROM saved_characters WHERE owner_id = ? AND id IN (${slots})`).bind(owner,...input.ids).all();
 if(result.results.length!==input.ids.length)fail('Some character IDs were claimed on another device. Refresh before retrying.',409);
 return json({characters:result.results.map(row=>({...record(row),matchRecord:{wins:0,losses:0,draws:0,matches:0},championships:0}))});
}

// Generation conditions random trait draws on a requested score band; it never alters their stats.
function rollTierCharacter(target){
 if(target==='any')return WHEEL_LUCK.rollTraits(GENERATION_POOLS);
 const ranges={E:[0,349],D:[350,649],C:[650,999],B:[1000,1499],A:[1500,2099],S:[2100,2999],SS:[3000,Infinity]},[lo,hi]=ranges[target],aim=(lo+Math.min(hi,3500))/2;
 let tilt={E:-4,D:-2,C:0,B:2,A:4,S:7,SS:13}[target];
 for(let block=0;block<30;block++){
  const pools={};for(const group of ['base','subrace','subclass'])pools[group]=Object.fromEntries(Object.entries(GENERATION_POOLS[group]).map(([key,list])=>{const scores=list.map(o=>o.stats.reduce((a,b)=>a+b,0)),min=Math.min(...scores),span=Math.max(...scores)-min||1;return [key,list.map((o,i)=>({...o,weight:Math.max(1,Math.round(10000*Math.exp(tilt*((scores[i]-min)/span-(tilt>0?1:0)))))}))];}));
  let sum=0;for(let attempt=0;attempt<100;attempt++){const rolled=WHEEL_LUCK.rollTraits(pools),raw=[0,0,0,0,0];for(const [id,name]of Object.entries(rolled.traits)){if(noPower(name))continue;const list=id==='subrace'?GENERATION_POOLS.subrace[rolled.traits.race]:id==='subclass'?GENERATION_POOLS.subclass[rolled.traits.class]:GENERATION_POOLS.base[id];list.find(o=>o.name===name).stats.forEach((n,i)=>raw[i]+=n);}const total=raw.reduce((n,v)=>n+Math.max(0,v),0);if(total>=lo&&total<=hi)return rolled;sum+=total;}
  tilt=Math.max(-24,Math.min(24,tilt+(aim-sum/100)/200));
 }
 fail('Could not roll this tier in the current batch. Resume to try again.',503);
}
const GROWTH_AXES=['strength','speed','durability','iq','magic'];
function withGrowth(base,growth){if(!growth)return base;const stats=base.stats.map((v,i)=>v+(growth.bonus?.[i]||0)),total=stats.reduce((a,b)=>a+b,0);return {...base,growth,stats,total,tier:tierFor(total),rank:total>=3000?'Cosmic':total>=2100?'Divine':total>=1500?'Mythic':total>=1000?'Legendary':total>=650?'Elite':total>=350?'Capable':total>=150?'Common':'Trash'};}
async function awardUpsets(env,owner,tournamentId,state,time){
 const promotions=[],order=['E','D','C','B','A','S','SS'],entrants=new Map(state.roster.map(c=>[c.id,c]));
 const history=state.history.filter(m=>!m.bye&&m.b&&m.results?.length),sync=await env.DB.prepare('SELECT matches FROM fighter_growth_sync WHERE owner_id = ? AND tournament_id = ?').bind(owner,tournamentId).first();
 for(const m of history.slice(sync?.matches||0)){
  if(m.bye||!m.b||!m.results?.length||!m.winner||m.score[0]===m.score[1])continue;
  const winner=entrants.get(m.winner),opponent=entrants.get(m.winner===m.a?m.b:m.a);if(!winner||!opponent||order.indexOf(tierFor(winner.summary.total))>=order.indexOf(tierFor(opponent.summary.total)))continue;
  const eventId=`tournament:${tournamentId}:${m.id}`;
  if(await env.DB.prepare('SELECT event_id FROM fighter_growth WHERE owner_id = ? AND event_id = ?').bind(owner,eventId).first())continue;
  let resolved=false;for(let retry=0;retry<4;retry++){
   const row=await storage(env).get(owner,winner.id);if(!row){resolved=true;break;}const summary=JSON.parse(row.summary_json),snapshot=JSON.parse(row.state_json);
   if(order.indexOf(tierFor(summary.total))>=order.indexOf(tierFor(opponent.summary.total))){resolved=true;break;}
   const growth=structuredClone(summary.growth||{wins:0,bonus:[0,0,0,0,0],levels:{}}),currentTier=tierFor(summary.total);
   const axes=GROWTH_AXES.map((id,i)=>{const list=GENERATION_POOLS.base[id],name=growth.levels[id]||snapshot.traits[id],index=list.findIndex(o=>o.name===name);return {id,i,list,index};}).filter(a=>a.index>=0&&a.index<a.list.length-1).sort((a,b)=>summary.stats[a.i]-summary.stats[b.i]||a.i-b.i);
   if(!axes.length){resolved=true;break;}
   growth.upgrades??=growth.wins;growth.wins++;growth.progress=promotionProgress(currentTier,growth);growth.progress.wins++;
   const upgraded=growth.progress.wins>=growth.progress.required;
   let axis='progress',amount=0,from=null,to=null;
   if(upgraded){
    const selected=axes[0];axis=selected.id;const i=selected.i;from=selected.list[selected.index];to=selected.list[selected.index+1];amount=to.stats[i]-from.stats[i];growth.bonus[i]+=amount;growth.levels[axis]=to.name;growth.upgrades++;growth.progress.wins=0;growth.last={axis,from:from.name,to:to.name,amount,opponent:opponent.name};
   }
   const next=withGrowth(validateSnapshot(snapshot).summary,growth);growth.progress=promotionProgress(next.tier,growth);next.promotion=growth.progress;const encoded=JSON.stringify(next);
   // D1 batches are transactional. Claim against the current summary first; changes()
   // ties the update to this batch's insert, including simultaneous identical rewards.
   const result=await env.DB.batch([
    env.DB.prepare('INSERT INTO fighter_growth (owner_id,event_id,character_id,opponent_id,axis,amount,earned_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM saved_characters WHERE owner_id = ? AND id = ? AND summary_json = ?) ON CONFLICT(owner_id,event_id) DO NOTHING').bind(owner,eventId,winner.id,opponent.id,axis,amount,time,owner,winner.id,row.summary_json),
    env.DB.prepare('UPDATE saved_characters SET summary_json = ?, updated_at = ? WHERE owner_id = ? AND id = ? AND summary_json = ? AND changes() = 1').bind(encoded,time,owner,winner.id,row.summary_json)
   ]);
   if(result[0].meta?.changes&&result[1].meta?.changes){promotions.push({id:winner.id,name:winner.name,summary:next,axis,amount,...(upgraded?{from:from.name,to:to.name}:{}),upgraded});resolved=true;break;}
   if(await env.DB.prepare('SELECT event_id FROM fighter_growth WHERE owner_id = ? AND event_id = ?').bind(owner,eventId).first()){resolved=true;break;}
  }
  if(!resolved)fail('An earned stat is being updated on another device. Save progress again to finish the reward.',409);
 }
 await env.DB.prepare('INSERT INTO fighter_growth_sync (owner_id,tournament_id,matches) VALUES (?,?,?) ON CONFLICT(owner_id,tournament_id) DO UPDATE SET matches = MAX(matches,excluded.matches)').bind(owner,tournamentId,history.length).run();
 return promotions;
}

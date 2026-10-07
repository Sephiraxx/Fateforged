// The API accepts commands, never client-supplied standings, membership or awards.
async function leagueApi(request,env,url){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)fail('Sign in to save league progress.',401);storage(env);
 const get=()=>env.DB.prepare('SELECT * FROM league_worlds WHERE owner_id = ?').bind(owner).first();
 const response=async(compactOperation=null)=>{const row=await get();return json({...(compactOperation&&row?.last_operation===compactOperation?{}:{world:row?LEAGUES.prepare(await decodeTournament(row.state_json)):null}),revision:row?.revision??0});};
 if(request.method==='GET'){
  if(url.pathname==='/api/leagues')return response();
  if(url.pathname==='/api/leagues/history'){const rows=await env.DB.prepare('SELECT world_id,season,completed_at FROM league_seasons WHERE owner_id = ? ORDER BY completed_at DESC, world_id DESC, season DESC').bind(owner).all();return json({seasons:rows.results.map(r=>({worldId:r.world_id,season:r.season,completedAt:r.completed_at}))});}
  const n=Number(url.pathname.slice('/api/leagues/history/'.length));if(!Number.isSafeInteger(n)||n<1)fail('Season not found.',404);const worldId=url.searchParams.get('worldId');if(worldId&&!UUID.test(worldId))fail('Invalid world ID.');const row=worldId?await env.DB.prepare('SELECT state_json FROM league_seasons WHERE owner_id = ? AND world_id = ? AND season = ?').bind(owner,worldId,n).first():await env.DB.prepare('SELECT state_json FROM league_seasons WHERE owner_id = ? AND season = ? ORDER BY completed_at DESC LIMIT 1').bind(owner,n).first();if(!row)fail('Season not found.',404);return json({archive:await decodeTournament(row.state_json)});
 }
 if(request.method!=='POST'||url.pathname!=='/api/leagues')fail('Method not allowed.',405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin&&origin!==SITE_ORIGIN)fail('Request origin is not allowed.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))fail('Send a league command as JSON.',415);
 const text=await request.text();if(text.length>12000000)fail('League command too large.',413);let input;try{input=JSON.parse(text);}catch{fail('Invalid JSON.');}
 if(!plain(input)||!UUID.test(input.operationId)||!['start','freshStart','record','recordBatch','rollover'].includes(input.action)||!Number.isSafeInteger(input.revision)||input.revision<0)fail('Invalid league command.');
 const requestJson=JSON.stringify(input),previous=await env.DB.prepare('SELECT request_json FROM league_operations WHERE owner_id = ? AND operation_id = ?').bind(owner,input.operationId).first();
 if(previous){if(!await sameReceipt(previous.request_json,requestJson))fail('This league action was already saved differently.',409);return response(input.compact?input.operationId:null);}
 // Full phases contain thousands of games. Keep their retry receipt compact.
 const encodedRequest=await receiptOf(requestJson);
 const row=await get();if((row?.revision??0)!==input.revision)fail('League progress changed in another tab. Refresh before continuing.',409);
 let world=row?LEAGUES.prepare(await decodeTournament(row.state_json)):null,newFighters=[],archive=null,played=[],playerFighters=[];
 if(input.action==='start'||input.action==='freshStart'){
  if(world&&input.action==='start')fail('Your league system already exists. Refresh to continue it.',409);if(input.action==='freshStart'){if(!world)fail('Start the league system first.');if(world.phase!=='complete'&&(world.history.length>0))fail('Finish the current season before starting a fresh world.');archive={...structuredClone(world),standings:world.divisions.map((_,d)=>LEAGUES.standings(world,d)),movement:[],retired:[],replacements:[],closedWorld:true};}if(!UUID.test(input.worldId))fail('Invalid league ID.');
  if(input.action==='freshStart'&&(input.worldId===world.id||await env.DB.prepare('SELECT world_id FROM league_seasons WHERE owner_id = ? AND world_id = ? LIMIT 1').bind(owner,input.worldId).first()))fail('Use a new world ID so previous seasons remain distinct.');
  let settings;try{settings=LEAGUES.settings(input.settings);}catch(e){fail(e.message);}
  for(let i=0;i<LEAGUES.totalFighters;i++)newFighters.push(makeLeagueFighter());world=LEAGUES.create(input.worldId,newFighters.map(f=>f.character),crypto.getRandomValues(new Uint32Array(1))[0],settings);
 }else if(!world)fail('Start the league system first.',409);
 else if(input.action==='record'||input.action==='recordBatch'){
  const records=input.action==='record'?[input]:input.series;
  if(!Array.isArray(records)||!records.length||records.length>4096)fail('Save no more than one league phase at a time.');
  const phase=world.phase;
  try{for(const record of records){if(world.phase!==phase)throw Error('Save each completed phase before the next phase.');played.push(LEAGUES.record(world,record.matchId,record.results));}}catch(e){fail(e.message);}
 }else{
  if(world.phase!=='complete')fail('Finish the season before rollover.');
  const recipe=LEAGUES.recruitIntake(world),extra=LEAGUES.expansionCount(world);
  playerFighters=await waitingLeagueFighters(env,owner,world,recipe.length+extra);
  const recruit=(rarity,index)=>{if(playerFighters[index])return playerFighters[index];const f=makeLeagueFighter(rarity);newFighters.push(f);return f.character;};
  const replacements=recipe.map(recruit),expansion=Array.from({length:extra},(_,i)=>recruit(undefined,recipe.length+i));
  const result=LEAGUES.rollover(world,replacements,expansion,playerFighters.map(c=>c.id));archive=result.archive;world=result.world;
 }
 const revision=input.revision+1,now=Date.now(),state=await encodeTournament(world),op=input.operationId;
 const gate='EXISTS (SELECT 1 FROM league_worlds WHERE owner_id = ? AND last_operation = ?)';
 const statements=[row?
  env.DB.prepare('UPDATE league_worlds SET revision = ?, last_operation = ?, state_json = ?, updated_at = ?, id = ? WHERE owner_id = ? AND revision = ?').bind(revision,op,state,now,world.id,owner,input.revision):
  env.DB.prepare('INSERT INTO league_worlds(owner_id,id,revision,last_operation,state_json,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,world.id,revision,op,state,now)];
 // A revision claim and all its effects commit together, including on D1.
 statements.push(env.DB.prepare(`INSERT INTO league_operations(owner_id,operation_id,request_json) SELECT ?,?,? WHERE ${gate}`).bind(owner,op,encodedRequest,owner,op));
 if(newFighters.length){
  const poolId=await prepareSharedPool(env);
  statements.push(sharedPoolStatement(env,poolId));
  for(const f of newFighters)statements.push(env.DB.prepare(`INSERT INTO saved_characters(id,owner_id,name,state_json,summary_json,catalog_revision,created_at,updated_at,pool_id) SELECT ?,?,?,?,?,?,?,?,? WHERE ${gate}`).bind(f.character.id,owner,f.character.name,JSON.stringify({...f.state,pools:undefined}),JSON.stringify(f.character.summary),CURRENT_CATALOG_REVISION,now,now,poolId,owner,op));
 }
 for(const c of playerFighters)statements.push(env.DB.prepare(`UPDATE saved_characters SET summary_json = ? WHERE owner_id = ? AND id = ? AND ${gate}`).bind(JSON.stringify(c.summary),owner,c.id,owner,op));
 if(newFighters.length||playerFighters.length){
  statements.push(env.DB.prepare(`DELETE FROM league_members WHERE owner_id = ? AND ${gate}`).bind(owner,owner,op));
  world.divisions.forEach((ids,d)=>ids.forEach(id=>statements.push(env.DB.prepare(`INSERT INTO league_members(owner_id,character_id,division) SELECT ?,?,? WHERE ${gate}`).bind(owner,id,d,owner,op))));
 }
 for(const match of played)statements.push(env.DB.prepare(`INSERT INTO match_records(owner_id,event_id,tournament_id,character_a,character_b,winner,score_json,recorded_at) SELECT ?,?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(owner_id,event_id) DO NOTHING`).bind(owner,`league:${world.id}:${match.id}`,world.id,match.a,match.b,match.winner,JSON.stringify(match.score),now,owner,op));
 const titles=[];
 if(played.some(m=>m.phase==='league')&&world.phase!=='league')for(let d=0;d<7;d++)titles.push({key:`league:${d}`,label:LEAGUES.names[d]+' league',champion:LEAGUES.standings(world,d)[0].id});
 if(played.some(m=>m.phase!=='league'))for(const cup of world.cupResults)titles.push({key:cup.division===8?'interleague-europa':cup.division===7?(cup.competition==='champions'?'interleague-champions':'interleague'):`league-cup:${cup.division}`,label:cup.division===8?LEAGUES.cupNames.europa:cup.division===7?(cup.competition==='champions'?LEAGUES.cupNames.champions:'Interleague cup'):LEAGUES.names[cup.division]+' cup',champion:cup.champion});
 for(const title of titles){
  const winner=world.roster.find(c=>c.id===title.champion),event=`league:${world.id}:s${world.season}:${title.key}`,name=`Season ${world.season} · ${title.label}`;
  statements.push(env.DB.prepare(`INSERT INTO champion_history(owner_id,tournament_id,tournament_name,division_key,label,character_id,character_name,completed_at) SELECT ?,?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(owner_id,tournament_id) DO NOTHING`).bind(owner,event,name,title.key,title.label,winner.id,winner.name,now,owner,op));
  // Older completed cups may be visited again; never reset the time/streak of their crown.
  statements.push(env.DB.prepare(`INSERT INTO current_champions(owner_id,division_key,label,character_id,character_name,tournament_id,tournament_name,completed_at) SELECT h.owner_id,h.division_key,h.label,h.character_id,h.character_name,h.tournament_id,h.tournament_name,h.completed_at FROM champion_history h WHERE h.owner_id = ? AND h.tournament_id = ? AND ${gate} ON CONFLICT(owner_id,division_key) DO UPDATE SET character_id=excluded.character_id,character_name=excluded.character_name,tournament_id=excluded.tournament_id,tournament_name=excluded.tournament_name,completed_at=excluded.completed_at WHERE excluded.completed_at>current_champions.completed_at OR (excluded.completed_at=current_champions.completed_at AND excluded.tournament_id>current_champions.tournament_id)`).bind(owner,event,owner,op));
 }
 if(archive){
  statements.push(env.DB.prepare(`INSERT INTO league_seasons(owner_id,world_id,season,state_json,completed_at) SELECT ?,?,?,?,? WHERE ${gate}`).bind(owner,archive.id,archive.season,await encodeTournament(archive),now,owner,op));
  for(const c of archive.retired)statements.push(env.DB.prepare(`DELETE FROM saved_characters WHERE owner_id = ? AND id = ? AND ${gate}`).bind(owner,c.id,owner,op));
 }
 statements.push(pruneReceipts(env,'league_operations',owner));const result=await env.DB.batch(statements);if(!result[0].meta?.changes)fail('League progress changed in another tab. Refresh before continuing.',409);
 return response(input.compact?op:null);
}
function makeLeagueFighter(rarity){const rolled=WHEEL_LUCK.rollTraits(GENERATION_POOLS,undefined,rarity),{state,summary}=validateSnapshot({version:1,...rolled,pools:GENERATION_POOLS,catalog:{version:1,powers:CURRENT_CATALOG.power.map(p=>p.name),weaknesses:CURRENT_CATALOG.weakness.map(p=>p.name)}});summary.creationSource='league';return {state,character:{id:crypto.randomUUID(),name:RANDOM_CHARACTER_NAME(rolled.traits),summary,traits:rolled.traits}};}
// Keep competition IDs and stored awards stable; only presentation names change.
function themedLeagueTitle(row){const label=row.division_key==='interleague-champions'?LEAGUES.cupNames.champions:row.division_key==='interleague-europa'?LEAGUES.cupNames.europa:null;return label?{...row,label,tournament_name:row.tournament_name.replace(/^Season (\d+) · .*$/,'Season $1 · '+label)}:row;}
async function leagueMembership(env,owner){const rows=await env.DB.prepare('SELECT character_id,division FROM league_members WHERE owner_id = ?').bind(owner).all();return new Map(rows.results.map(r=>[r.character_id,{division:r.division,name:LEAGUES.names[r.division]}]));}

// Only complete fighters which have never entered a league can join the queue.
// Older backups have no creation marker: their current/archived rosters identify
// former league fighters, including closed worlds whose saved rows still exist.
async function waitingLeagueFighters(env,owner,world,limit){
 const rows=await env.DB.prepare("SELECT id,name,summary_json,json_extract(state_json,'$.traits') AS traits_json,created_at,updated_at FROM saved_characters WHERE owner_id = ? AND id NOT IN (SELECT character_id FROM league_members WHERE owner_id = ?) ORDER BY created_at,id").bind(owner,owner).all();
 const seen=new Set(world.roster.map(c=>c.id)),candidates=rows.results.filter(row=>{const summary=JSON.parse(row.summary_json),traits=JSON.parse(row.traits_json||'{}');return summary.creationSource!=='league'&&!summary.leagueDebut&&IDS.every(key=>typeof traits[key]==='string')&&!seen.has(row.id);});
 if(candidates.some(row=>!JSON.parse(row.summary_json).creationSource)){
  const archives=await env.DB.prepare('SELECT state_json FROM league_seasons WHERE owner_id = ?').bind(owner).all();
  for(const row of archives.results){const archive=await decodeTournament(row.state_json);for(const c of [...(archive.roster||[]),...(archive.replacements||[]),...(archive.expansion||[])])seen.add(c.id);}
 }
 const chosen=candidates.filter(row=>!seen.has(row.id)).slice(0,limit),fighters=[];
 for(const row of chosen){const full=await repairSavedCharacter(env,owner,await storage(env).get(owner,row.id)),c=record(full);c.traits=JSON.parse(full.state_json).traits;c.summary={...c.summary,creationSource:'player',leagueDebut:{worldId:world.id,season:world.season+1}};fighters.push({id:c.id,name:c.name,summary:c.summary,traits:c.traits});}
 return fighters;
}

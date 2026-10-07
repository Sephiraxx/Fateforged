// Team leagues (2v2 / 3v3 / 5v5). The API accepts commands, never client-supplied ratings, salaries or picks.
// Only the generated fighter pool comes from the client, and every fighter is re-validated against the
// canonical wheel pools here; TEAM_LEAGUE then computes ratings, salaries, coaches and every draft pick.
async function teamApi(request,env,url){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)fail('Sign in to save team leagues.',401);storage(env);
 const formatOf=value=>{const n=Number(value);if(![2,3,5].includes(n))fail('Choose 2v2, 3v3 or 5v5.');return n;};
 const get=format=>env.DB.prepare('SELECT * FROM team_worlds WHERE owner_id = ? AND format = ?').bind(owner,format).first();
 const response=async format=>{const row=await get(format);return json({world:row?TEAM_LEAGUE.prepareRoleRules(TEAM_LEAGUE.prepareSupportRules(await decodeTournament(row.state_json))):null,revision:row?.revision??0});};
 if(request.method==='GET'){if(url.pathname!=='/api/teams')fail('Not found.',404);return response(formatOf(url.searchParams.get('format')));}
 if(request.method!=='POST'||url.pathname!=='/api/teams')fail('Method not allowed.',405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin&&origin!==SITE_ORIGIN)fail('Request origin is not allowed.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))fail('Send a team league command as JSON.',415);
 const text=await request.text();if(text.length>8000000)fail('Team league command too large.',413);let input;try{input=JSON.parse(text);}catch{fail('Invalid JSON.');}
 if(!plain(input)||!UUID.test(input.operationId)||!['start','draft','pick','claim','lineup','tactic','startSeason','balanceAudit','balance','rules','seriesGame','record','offseason','decide','trade','closeMarket','reset'].includes(input.action)||!Number.isSafeInteger(input.revision)||input.revision<0)fail('Invalid team league command.');
 const format=formatOf(input.format),requestJson=JSON.stringify(input);
 const previous=await env.DB.prepare('SELECT request_json FROM team_operations WHERE owner_id = ? AND operation_id = ?').bind(owner,input.operationId).first();
 if(previous){if(!await sameReceipt(previous.request_json,requestJson))fail('This team league action was already saved differently.',409);return response(format);}
 const encodedRequest=await receiptOf(requestJson);
 const row=await get(format);if((row?.revision??0)!==input.revision)fail('This team league changed in another tab. Refresh before continuing.',409);
 let world=row?TEAM_LEAGUE.prepareRoleRules(TEAM_LEAGUE.prepareSupportRules(await decodeTournament(row.state_json))):null;
 if(input.action==='start'){
  if(world)fail('This team league already exists. Refresh to continue it.',409);
  if(!UUID.test(input.worldId)||!Number.isSafeInteger(input.seed)||input.seed<0||input.seed>0xffffffff)fail('Invalid team league setup.');
  if(!Array.isArray(input.fighters)||input.fighters.length>400)fail('Invalid fighter pool.');
  try{world=TEAM_LEAGUE.create({id:input.worldId,format,teams:input.teams,seed:input.seed,fighters:input.fighters.map(teamPoolFighter),battleMode:input.battleMode});}catch(e){fail(e.message);}
 }else if(!world)fail('Create the team league first.',409);
 else if(input.action==='draft'){
  if(!Number.isSafeInteger(input.count)||input.count<1||input.count>1000)fail('Invalid number of draft picks.');
  if(world.draft.complete)fail('The draft is already complete.');TEAM_LEAGUE.draftPicks(world,input.count);
 }else if(input.action==='startSeason'){try{TEAM_LEAGUE.startSeason(world,input.audit);}catch(e){fail(e.message);}}
 else if(['pick','claim','lineup','tactic','offseason','decide','trade','closeMarket'].includes(input.action)){
  // Coach-mode and offseason commands: the shared rules validate every choice.
  if(input.action==='offseason'&&(!Array.isArray(input.rookies)||input.rookies.length>200))fail('Invalid rookie class.');
  const rookies=input.action==='offseason'?input.rookies.map(teamPoolFighter):null;
  try{
   if(input.action==='pick'){if(typeof input.fighter!=='string')throw new Error('Choose a fighter.');TEAM_LEAGUE.draftPick(world,input.fighter);}
   else if(input.action==='claim')TEAM_LEAGUE.claimTeam(world,input.team===null?null:String(input.team));
   else if(input.action==='lineup')TEAM_LEAGUE.setLineup(world,input.lineup);
   else if(input.action==='tactic')TEAM_LEAGUE.setTactic(world,input.tactic);
   else if(input.action==='offseason')TEAM_LEAGUE.startOffseason(world,rookies);
   else if(input.action==='decide')TEAM_LEAGUE.decideReleases(world,input.release);
   else if(input.action==='trade')TEAM_LEAGUE.proposeTrade(world,input.partner,input.give,input.get);
   else TEAM_LEAGUE.closeMarket(world);
  }catch(e){fail(e.message);}
 }
 else if(input.action==='balanceAudit'){try{TEAM_LEAGUE.recordBalanceAudit(world,input.phase,input.audit);}catch(e){fail(e.message);}}
 else if(input.action==='rules'){try{TEAM_LEAGUE.setBattleMode(world,input.mode);}catch(e){fail(e.message);}}
 else if(input.action==='balance'){try{TEAM_LEAGUE.setAutoBalance(world,input.enabled);}catch(e){fail(e.message);}}
 else if(input.action==='seriesGame'){try{TEAM_LEAGUE.recordSeriesGame(world,input.matchId,input.game);}catch(e){fail(e.message);}}
 else if(input.action==='record'){
  // Simulated matches arrive in batches; each must be the next match and a complete, valid series.
  if(!Array.isArray(input.results)||!input.results.length||input.results.length>400)fail('Send between 1 and 400 team-league matches.');
  try{for(const r of input.results){if(!plain(r))throw new Error('Invalid team-league match.');TEAM_LEAGUE.recordMatch(world,r.matchId,r.games);}}catch(e){fail(e.message);}
 }else world=null;
 const revision=input.revision+1,now=Date.now(),state=world?await encodeTournament(world):'null',op=input.operationId;
 const statements=[row?
  env.DB.prepare('UPDATE team_worlds SET revision = ?, last_operation = ?, state_json = ?, updated_at = ? WHERE owner_id = ? AND format = ? AND revision = ?').bind(revision,op,state,now,owner,format,input.revision):
  env.DB.prepare('INSERT INTO team_worlds(owner_id,format,revision,last_operation,state_json,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_id,format) DO NOTHING').bind(owner,format,revision,op,state,now)];
 statements.push(env.DB.prepare('INSERT INTO team_operations(owner_id,operation_id,request_json) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM team_worlds WHERE owner_id = ? AND format = ? AND last_operation = ?)').bind(owner,op,encodedRequest,owner,format,op));
 statements.push(pruneReceipts(env,'team_operations',owner));const result=await env.DB.batch(statements);if(!result[0].meta?.changes)fail('This team league changed in another tab. Refresh before continuing.',409);
 return response(format);
}
// A pool fighter must be an unedited roll from the canonical generation wheels.
function teamPoolFighter(input){
 if(!plain(input)||!UUID.test(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>100||!plain(input.traits))fail('Invalid pool fighter.');
 const {summary}=validateSnapshot({version:1,generationVersion:input.summary?.generationVersion??3,traits:input.traits,pools:GENERATION_POOLS,wheelRarity:input.summary?.wheelRarity});
 if(IDS.some(key=>typeof input.traits[key]!=='string'))fail('Pool fighters need all fourteen traits.');
 if(input.teamKit!=null)fail('Extra team kits are no longer generated. Roll abilities in the two normal slots.');
 return {id:input.id,name:input.name.trim(),traits:input.traits,summary:{stats:summary.stats,total:summary.total,tier:summary.tier,generationVersion:summary.generationVersion,wheelRarity:summary.wheelRarity}};
}

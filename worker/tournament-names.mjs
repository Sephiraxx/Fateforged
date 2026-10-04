// Names belong to tournament IDs, so simultaneous initial saves reuse a claim.
export async function claimTournamentName(env,owner,id,requested){
 for(let attempt=0;attempt<10;attempt++){
  const existing=await env.DB.prepare('SELECT name,display_name FROM tournament_name_claims WHERE owner_id = ? AND tournament_id = ?').bind(owner,id).first();
  if(existing)return existing.display_name||existing.name;
  const used=await env.DB.prepare('SELECT name FROM saved_tournaments WHERE owner_id = ? UNION SELECT tournament_name AS name FROM champion_history WHERE owner_id = ? UNION SELECT name FROM tournament_name_claims WHERE owner_id = ?').bind(owner,owner,owner).all();
  const name=uniqueTournamentName(requested,used.results.map(row=>row.name));
  const claimed=await env.DB.prepare('INSERT INTO tournament_name_claims (owner_id, name, tournament_id, display_name) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING name').bind(owner,name.toLowerCase(),id,name).first();
  if(claimed)return name;
 }
 const retry=await env.DB.prepare('SELECT name,display_name FROM tournament_name_claims WHERE owner_id = ? AND tournament_id = ?').bind(owner,id).first();
 if(retry)return retry.display_name||retry.name;
 fail('Another tournament is reserving this name. Please try again.',409);
}

// Repair the three cups affected after the owner's clean slate. No results,
// fighters, timestamps or championship counts are removed.
export const NAME_REPAIR_OWNER='snrd86ZY2iZCt2ce4Lp8sXsvJePXzSUjinOgrswcoZy42BHK57YrmZ';
export const NAME_REPAIR_KEY='clean-slate-name-repair-2026-10-04';
export const NAME_REPAIRS=[['2ac538f4-52ff-4443-aa8a-ec2a357c6241','Moonfall Clash'],['341363f7-aa09-4aed-ac60-320e1dfb7560','Thunderforge Gauntlet'],['d82c9c15-2b26-41ef-b0c8-8d17aecd3d99','Silver Tempest Grand Prix']];
export async function repairRequestedTournamentNames(env){
 const db=env.DB,owner=NAME_REPAIR_OWNER,key=NAME_REPAIR_KEY;
 if(await db.prepare('SELECT 1 AS done FROM roster_refreshes WHERE owner_id = ? AND batch_key = ?').bind(owner,key).first())return;
 const statements=[],guard='NOT EXISTS (SELECT 1 FROM roster_refreshes WHERE owner_id = ? AND batch_key = ?)';
 for(const [id,name]of NAME_REPAIRS){
  const row=await db.prepare('SELECT name,state_json FROM saved_tournaments WHERE owner_id = ? AND id = ?').bind(owner,id).first();
  if(!row||row.name!==name+' 2')continue;
  const occupied=await db.prepare('SELECT 1 AS used FROM saved_tournaments WHERE owner_id = ? AND lower(name) = ? UNION SELECT 1 FROM champion_history WHERE owner_id = ? AND lower(tournament_name) = ?').bind(owner,name.toLowerCase(),owner,name.toLowerCase()).first();
  if(occupied)continue;
  const state=await decodeTournament(row.state_json);state.name=name;
  statements.push(db.prepare('UPDATE saved_tournaments SET name = ?, state_json = ? WHERE owner_id = ? AND id = ? AND name = ? AND '+guard).bind(name,await encodeTournament(state),owner,id,row.name,owner,key));
  for(const table of ['champion_history','current_champions'])statements.push(db.prepare('UPDATE '+table+' SET tournament_name = ? WHERE owner_id = ? AND tournament_id = ? AND tournament_name = ? AND '+guard).bind(name,owner,id,row.name,owner,key));
 }
 // Legacy reservations without any surviving cup/history cannot affect names.
 statements.push(db.prepare('DELETE FROM tournament_name_claims WHERE owner_id = ? AND tournament_id IS NULL AND lower(name) NOT IN (SELECT lower(name) FROM saved_tournaments WHERE owner_id = ? UNION SELECT lower(tournament_name) FROM champion_history WHERE owner_id = ?) AND '+guard).bind(owner,owner,owner,owner,key));
 statements.push(db.prepare('UPDATE tournament_name_claims SET tournament_id = (SELECT id FROM saved_tournaments WHERE owner_id = ? AND lower(name) = tournament_name_claims.name LIMIT 1) WHERE owner_id = ? AND tournament_id IS NULL AND '+guard).bind(owner,owner,owner,key));
 statements.push(db.prepare('INSERT OR IGNORE INTO tournament_name_claims (owner_id,name,tournament_id,display_name) SELECT owner_id,lower(name),id,name FROM saved_tournaments WHERE owner_id = ? AND '+guard).bind(owner,owner,key));
 statements.push(db.prepare('INSERT OR IGNORE INTO roster_refreshes (owner_id,batch_key,nonce,template_json,result_json,created_at) VALUES (?,?,?,?,?,?)').bind(owner,key,'completed','{}','{"tournamentNamesRepaired":true}',Date.now()));
 await db.batch(statements);
}

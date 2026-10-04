// One-time clean slate explicitly requested by the Site owner on 2026-10-04.
// The durable marker prevents subsequent visits from deleting newly saved data.
export const REQUESTED_RESET_OWNER="snrd86ZY2iZCt2ce4Lp8sXsvJePXzSUjinOgrswcoZy42BHK57YrmZ";
export const REQUESTED_RESET_KEY='clean-slate-2026-10-04T17:03:12Z';
export const RESET_TABLES=['fighter_growth','fighter_growth_sync','match_records','match_record_sync','champion_history','current_champions','saved_tournaments','tournament_name_claims','roster_archives','saved_characters','roster_refreshes'];
export async function applyRequestedReset(env){
 const db=env.DB;
 const done=await db.prepare('SELECT 1 AS done FROM roster_refreshes WHERE owner_id = ? AND batch_key = ?').bind(REQUESTED_RESET_OWNER,REQUESTED_RESET_KEY).first();
 if(done)return;
 const guard='NOT EXISTS (SELECT 1 FROM roster_refreshes WHERE owner_id = ? AND batch_key = ?)';
 const statements=RESET_TABLES.map(table=>db.prepare('DELETE FROM '+table+' WHERE owner_id = ? AND '+guard).bind(REQUESTED_RESET_OWNER,REQUESTED_RESET_OWNER,REQUESTED_RESET_KEY));
 statements.push(db.prepare('INSERT OR IGNORE INTO roster_refreshes (owner_id,batch_key,nonce,template_json,result_json,created_at) VALUES (?,?,?,?,?,?)').bind(REQUESTED_RESET_OWNER,REQUESTED_RESET_KEY,'completed','{}','{"cleanSlate":true}',Date.now()));
 await db.batch(statements);
}

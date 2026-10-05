const SHARED_POOL_ID='standard:'+GENERATION_POOL_REVISION;
async function prepareSharedPool(env){const row=await env.DB.prepare('SELECT id FROM character_pools WHERE pools_json = ? LIMIT 1').bind(JSON.stringify(GENERATION_POOLS)).first();return row?.id||SHARED_POOL_ID;}
const sharedPoolStatement=(env,id=SHARED_POOL_ID)=>env.DB.prepare('INSERT INTO character_pools(id,pools_json) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(id,JSON.stringify(GENERATION_POOLS));
function hydrateRow(row){if(!row)return row;const state=JSON.parse(row.state_json);if(!state.pools){if(!row.pools_json)fail('The saved fighter catalog is missing.',503);state.pools=JSON.parse(row.pools_json);return {...row,stored_state_json:row.state_json,state_json:JSON.stringify(state)};}return row;}
async function saveCharacterSnapshot(env,owner,id,name,state,summary,now){
 const pools=JSON.stringify(state.pools),existing=await env.DB.prepare('SELECT id FROM character_pools WHERE pools_json = ? LIMIT 1').bind(pools).first();
 const poolId=existing?.id||'pool:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pools))),v=>v.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare('INSERT INTO character_pools(id,pools_json) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(poolId,pools).run();
 return env.DB.prepare('INSERT INTO saved_characters(id,owner_id,name,state_json,summary_json,catalog_revision,created_at,updated_at,pool_id) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id,name,summary_json,created_at,updated_at').bind(id,owner,name,JSON.stringify({...state,pools:undefined}),JSON.stringify(summary),CURRENT_CATALOG_REVISION,now,now,poolId).first();
}

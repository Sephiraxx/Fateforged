const SHARED_POOL_ID='standard:'+GENERATION_POOL_REVISION;
function canonicalPools(pools){return JSON.stringify(pools,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);}
const CANONICAL_GENERATION_POOLS=canonicalPools(GENERATION_POOLS);
async function findCharacterPool(env,pools,canonical){const exact=await env.DB.prepare('SELECT id FROM character_pools WHERE pools_json = ? LIMIT 1').bind(pools).first();if(exact)return exact;const rows=await env.DB.prepare('SELECT id,pools_json FROM character_pools').bind().all();return rows.results.find(row=>canonicalPools(JSON.parse(row.pools_json))===canonical);}
async function prepareSharedPool(env){const row=await findCharacterPool(env,JSON.stringify(GENERATION_POOLS),CANONICAL_GENERATION_POOLS);return row?.id||SHARED_POOL_ID;}
const sharedPoolStatement=(env,id=SHARED_POOL_ID)=>env.DB.prepare('INSERT INTO character_pools(id,pools_json) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(id,JSON.stringify(GENERATION_POOLS));
function hydrateRow(row){if(!row)return row;const state=JSON.parse(row.state_json);if(!state.pools){if(!row.pools_json)fail('The saved fighter catalog is missing.',503);state.pools=JSON.parse(row.pools_json);return {...row,stored_state_json:row.state_json,state_json:JSON.stringify(state)};}return row;}
async function packCharacterSnapshot(env,state){
 const pools=JSON.stringify(state.pools),canonical=canonicalPools(state.pools),existing=await findCharacterPool(env,pools,canonical);
 const poolId=existing?.id||(canonical===CANONICAL_GENERATION_POOLS?SHARED_POOL_ID:'pool:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical))),v=>v.toString(16).padStart(2,'0')).join(''));
 await env.DB.prepare('INSERT INTO character_pools(id,pools_json) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(poolId,pools).run();
 return {poolId,stateJson:JSON.stringify({...state,pools:undefined})};
}
async function saveCharacterSnapshot(env,owner,id,name,state,summary,now){
 const packed=await packCharacterSnapshot(env,state);
 return env.DB.prepare('INSERT INTO saved_characters(id,owner_id,name,state_json,summary_json,catalog_revision,created_at,updated_at,pool_id) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id,name,summary_json,created_at,updated_at').bind(id,owner,name,packed.stateJson,JSON.stringify(summary),CURRENT_CATALOG_REVISION,now,now,packed.poolId).first();
}

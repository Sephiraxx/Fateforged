// A small D1 adapter lets Pages use the same validated game rules as the server.
export function sqliteAdapter(database){
 return {
  prepare(sql){let args=[];return {
   bind(...values){args=values;return this;},
   async all(){const s=database.prepare(sql);try{s.bind(args);const results=[];while(s.step())results.push(s.getAsObject());return {results};}finally{s.free();}},
   async first(){return (await this.all()).results[0]??null;},
   async run(){await this.all();return {meta:{changes:database.getRowsModified()}};}
  };},
  async batch(statements){database.run('SAVEPOINT d1_batch');try{const results=[];for(const statement of statements)results.push(await statement.run());database.run('RELEASE d1_batch');return results;}catch(error){database.run('ROLLBACK TO d1_batch');database.run('RELEASE d1_batch');throw error;}}
 };
}

export function createStorage({SQL,migrations,worker,indexedDB,locks,databaseName}){
 const applicationId=0x46415445; // FATE: distinguish backups from arbitrary SQLite files.
 let connectionPromise,queue=Promise.resolve();
 function connection(){return connectionPromise??=new Promise((resolve,reject)=>{
  const request=indexedDB.open(databaseName,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
  request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('Close other Fateforge tabs and try again.'));
 });}
 async function read(){const db=await connection();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly'),request=tx.objectStore('snapshots').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 async function write(bytes,previous){const db=await connection();return new Promise((resolve,reject)=>{
  const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),request=store.get('current');let conflict=false;
  request.onsuccess=()=>{if(request.result?.revision!==previous){conflict=true;tx.abort();return;}store.put({revision:crypto.randomUUID(),bytes},'current');};
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(conflict?Object.assign(Error('Save changed in another tab.'),{conflict:true}):tx.error||Error('Browser storage could not save.'));
 });}
 function migrate(db,backup=false){
  const id=db.exec('PRAGMA application_id')[0].values[0][0];
  let version=db.exec('PRAGMA user_version')[0].values[0][0];
  if(backup&&id!==applicationId)throw Error('Choose a Fateforge browser backup (.sqlite).');
  if(version>migrations.length)throw Error('This backup is from a newer Fateforge version. Update the site first.');
  db.run('BEGIN');try{for(;version<migrations.length;version++){db.run(migrations[version]);db.run(`PRAGMA user_version=${version+1}`);}db.run(`PRAGMA application_id=${applicationId}`);db.run('COMMIT');}catch(error){db.run('ROLLBACK');throw error;}
 }
 // Keep saves small. Receipts only exist to recognise a retried command: the worker stores them as hashes and keeps
 // the newest few, so older full-request receipts are dropped here. The file is vacuumed whenever a quarter of it
 // is free space (and always before a backup), so deleted data really leaves the save.
 function compact(db,force=false){
  for(const table of ['league_operations','team_operations'])db.run(`DELETE FROM ${table} WHERE request_json NOT LIKE 'sha256:%'`);
  const pages=db.exec('PRAGMA page_count')[0].values[0][0],free=db.exec('PRAGMA freelist_count')[0].values[0][0];
  if(force||free>pages*.25)db.run('VACUUM');
 }
 const LABELS={saved_characters:'Fighters',character_pools:'Fighter catalogs',fighter_growth:'Fighter growth',saved_tournaments:'Tournaments',match_records:'Match records',champion_history:'Champion history',league_worlds:'1v1 league',league_seasons:'1v1 league archives',league_operations:'1v1 league receipts',league_members:'1v1 league members',team_worlds:'Team leagues',team_operations:'Team league receipts',roster_archives:'Roster archives'};
 function usage(db){
  const tables=[];for(const [name]of db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0]?.values??[]){
   const cols=db.exec(`PRAGMA table_info(${name})`)[0].values.map(c=>c[1]),size=cols.map(c=>`COALESCE(LENGTH(CAST(${c} AS BLOB)),0)`).join('+'),[[rows,bytes]]=db.exec(`SELECT COUNT(*),COALESCE(SUM(${size}),0) FROM ${name}`)[0].values;
   if(rows)tables.push({table:name,label:LABELS[name]??name.replaceAll('_',' '),rows,bytes});
  }
  return tables.sort((a,b)=>b.bytes-a.bytes);
 }
 function exclusive(action){const task=()=>locks?.request?locks.request(databaseName,action):action();const result=queue.then(task,task);queue=result.catch(()=>{});return result;}
 async function withDatabase(action,{save=true}={}){
  for(let attempt=0;attempt<4;attempt++){
   const snapshot=await read(),db=new SQL.Database(snapshot?.bytes);
   try{migrate(db);const result=await action(db);if(save)await write(db.export(),snapshot?.revision);return result;}catch(error){if(!error.conflict||attempt===3)throw error;}finally{db.close();}
  }
 }
 return {
  fetch(path,options={}){return exclusive(async()=>{
   try{return await withDatabase(async db=>{
    db.run('BEGIN');try{
     const headers=new Headers(options.headers);headers.set('oai-authenticated-user-id','local');headers.delete('origin');
     const response=await worker.fetch(new Request(new URL(path,'https://fateforge.local'),{...options,headers}),{DB:sqliteAdapter(db)});
     db.run(response.ok?'COMMIT':'ROLLBACK');if(response.ok)compact(db);return response;
    }catch(error){db.run('ROLLBACK');throw error;}
   });}catch(error){console.error('Browser save failed',error);return Response.json({error:'Browser storage could not save or load. Keep this tab open and retry. '+error.message},{status:503});}
  });},
  exportBackup(){return exclusive(()=>withDatabase(db=>{compact(db,true);return db.export();},{save:false}));},
  // Current save size and the biggest parts of it, for the Backups dialog.
  usage(){return exclusive(()=>withDatabase(db=>({bytes:db.export().length,tables:usage(db)}),{save:false}));},
  importBackup(bytes){return exclusive(async()=>{
   const db=new SQL.Database(bytes);
   try{
    migrate(db,true);
    if(db.exec('PRAGMA quick_check')[0]?.values[0]?.[0]!=='ok')throw Error('The backup is damaged. Your existing saves were kept.');
    // A backup contains only one local player; reject unrelated server databases.
    for(const table of ['saved_characters','saved_tournaments','champion_history','current_champions','match_records','fighter_growth','tournament_name_claims','league_worlds','league_members','league_seasons','league_operations','team_worlds','team_operations']){
     if(db.exec(`SELECT COUNT(*) FROM ${table} WHERE owner_id != 'local'`)[0].values[0][0])throw Error('This is not a Fateforge browser backup.');
    }
    const env={DB:sqliteAdapter(db)};
    if(db.exec("SELECT COUNT(*) FROM saved_characters c LEFT JOIN character_pools p ON c.pool_id=p.id WHERE json_type(c.state_json,'$.pools') IS NULL AND p.id IS NULL")[0].values[0][0])throw Error('The backup is missing a fighter catalog.');
    const league=await worker.fetch(new Request('https://fateforge.local/api/leagues',{headers:{'oai-authenticated-user-id':'local'}}),env);
    if(!league.ok)throw Error('The backup has invalid league records.');
    const {world}=await league.json();
    if(world){
     const ids=world.divisions?.flat()||[],rosterIds=world.roster?.map(c=>c.id)||[];
     const sizes=world.version===1?[20,20,20,20,20,20,20]:[20,24,24,24,24,24,24],total=sizes.reduce((a,b)=>a+b,0);
     if(![1,2].includes(world.version)||world.divisions.length!==7||world.divisions.some((d,i)=>d.length!==sizes[i])||new Set(ids).size!==total||rosterIds.length!==total||new Set(rosterIds).size!==total||ids.some(id=>!rosterIds.includes(id)))throw Error('The backup has an invalid league roster.');
     const members=(await env.DB.prepare('SELECT character_id,division FROM league_members WHERE owner_id = ?').bind('local').all()).results;
     if(members.length!==total||members.some(m=>!world.divisions[m.division]?.includes(m.character_id)))throw Error('The backup has inconsistent league membership.');
     for(const id of ids)if(!await env.DB.prepare('SELECT id FROM saved_characters WHERE owner_id = ? AND id = ?').bind('local',id).first())throw Error('The backup is missing an active league fighter.');
    }
    for(const path of ['/api/characters','/api/tournaments','/api/champions','/api/leagues']){
     const response=await worker.fetch(new Request('https://fateforge.local'+path,{headers:{'oai-authenticated-user-id':'local'}}),env);
     if(!response.ok)throw Error('The backup has invalid game records.');
    }
    // Old backups can be large: drop stale receipts and compact before saving.
    const before=bytes.length;compact(db,true);const after=db.export(),snapshot=await read();await write(after,snapshot?.revision);
    return {before,after:after.length};
   }finally{db.close();}
  });}
 };
}

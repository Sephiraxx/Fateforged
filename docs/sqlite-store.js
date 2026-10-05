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
     db.run(response.ok?'COMMIT':'ROLLBACK');return response;
    }catch(error){db.run('ROLLBACK');throw error;}
   });}catch(error){console.error('Browser save failed',error);return Response.json({error:'Browser storage could not save or load. Keep this tab open and retry. '+error.message},{status:503});}
  });},
  exportBackup(){return exclusive(()=>withDatabase(db=>db.export(),{save:false}));},
  importBackup(bytes){return exclusive(async()=>{
   const db=new SQL.Database(bytes);
   try{
    migrate(db,true);
    if(db.exec('PRAGMA quick_check')[0]?.values[0]?.[0]!=='ok')throw Error('The backup is damaged. Your existing saves were kept.');
    // A backup contains only one local player; reject unrelated server databases.
    for(const table of ['saved_characters','saved_tournaments','champion_history','current_champions','match_records','fighter_growth','tournament_name_claims']){
     if(db.exec(`SELECT COUNT(*) FROM ${table} WHERE owner_id != 'local'`)[0].values[0][0])throw Error('This is not a Fateforge browser backup.');
    }
    const env={DB:sqliteAdapter(db)};
    for(const path of ['/api/characters','/api/tournaments','/api/champions']){
     const response=await worker.fetch(new Request('https://fateforge.local'+path,{headers:{'oai-authenticated-user-id':'local'}}),env);
     if(!response.ok)throw Error('The backup has invalid game records.');
    }
    const snapshot=await read();await write(db.export(),snapshot?.revision);
   }finally{db.close();}
  });}
 };
}

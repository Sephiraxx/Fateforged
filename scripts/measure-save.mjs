// Measures where a browser save's bytes go. Builds a heavy save through the GitHub Pages storage path
// (sql.js + IndexedDB, exactly like the browser) or reads a backup file, then prints bytes per table.
// Usage: node scripts/measure-save.mjs [backup.sqlite]
import fs from 'node:fs';import initSqlJs from 'sql.js';import {indexedDB} from 'fake-indexeddb';
const SQL=await initSqlJs();
export function tableSizes(bytes){
 const db=new SQL.Database(bytes),out=[];
 for(const [name]of db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values){
  const cols=db.exec(`PRAGMA table_info(${name})`)[0].values.map(c=>c[1]),size=cols.map(c=>`COALESCE(LENGTH(CAST(${c} AS BLOB)),0)`).join('+');
  const [[rows,total]]=db.exec(`SELECT COUNT(*),COALESCE(SUM(${size}),0) FROM ${name}`)[0].values;out.push({table:name,rows,bytes:total});
 }
 const pages=db.exec('PRAGMA page_count')[0].values[0][0],free=db.exec('PRAGMA freelist_count')[0].values[0][0],pageSize=db.exec('PRAGMA page_size')[0].values[0][0];db.close();
 return {file:bytes.length,freeBytes:free*pageSize,pages,tables:out.sort((a,b)=>b.bytes-a.bytes)};
}
export async function heavySave(){
 const {generation}=await import('./team-fixtures.mjs'),L=await import('../public/team-league.js');
 const {createStorage}=await import('../_site/sqlite-store.js'),{default:migrations}=await import('../_site/local-schema.js'),{default:worker}=await import('../_site/local-api.js');
 const storage=createStorage({SQL,migrations,worker,indexedDB,databaseName:'measure-'+Math.random()});
 const fake=m=>{const need=Math.ceil(m.bestOf/2),games=[],score=[0,0];let n=m.seed;while(score[0]<need&&score[1]<need){n=Math.imul(n^n>>>15,2246822507)>>>0;const winnerTeam=n%2;score[winnerTeam]++;games.push({winnerTeam,seconds:30+n%60,reason:'Team eliminated',hp:winnerTeam?[0,10+n%80]:[10+n%80,0],combatVersion:L.TEAM_COMBAT_VERSION,environment:{time:'day',weather:'clear',ground:'stone',map:'open'},fighters:m.lineups.flat().map(id=>({id,damage:n%500,healing:n%97,kills:n%3,deaths:n%2,ccSeconds:1.5}))});}return games;};
 for(const [format,teams]of [[5,32],[3,8]]){
  let world=null,revision=0;const send=async body=>{const r=await storage.fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format,revision,operationId:crypto.randomUUID(),...body})});const data=await r.json();if(!r.ok)throw Error(data.error);({world,revision}=data);};
  const seed=900+format,plan=L.poolPlan(format,teams,seed);
  await send({action:'start',worldId:crypto.randomUUID(),teams,seed,fighters:plan.map((s,i)=>generation.poolFighter(WHEEL_DATA,WHEEL_LUCK,s,i,seed,()=>'F'+i)).map(f=>({id:f.id,name:f.name,traits:f.traits,summary:{wheelRarity:f.summary.wheelRarity}}))});
  await send({action:'draft',count:1000});await send({action:'startSeason'});
  // Week by week, like a player pressing "Sim week".
  while(world.phase!=='complete'){const next=L.upcoming(world,1)[0],batch=world.phase==='season'?L.upcoming(world).filter(m=>m.week===next.week):L.upcoming(world);await send({action:'record',results:batch.map(m=>({matchId:m.id,games:fake(m)}))});}
 }
 return storage.exportBackup();
}
if(process.argv[1]?.endsWith('measure-save.mjs')){
 const bytes=process.argv[2]?new Uint8Array(fs.readFileSync(process.argv[2])):await heavySave(),r=tableSizes(bytes),mb=n=>(n/1048576).toFixed(2)+' MB';
 console.log(`file ${mb(r.file)} · free pages ${mb(r.freeBytes)}`);for(const t of r.tables.filter(t=>t.rows))console.log(`${t.table.padEnd(24)} ${String(t.rows).padStart(7)} rows ${mb(t.bytes).padStart(10)}`);
}

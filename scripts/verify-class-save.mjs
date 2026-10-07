// Optional read-only backup audit. All simulated writes go to an in-memory clone.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import initSqlJs from 'sql.js';
import worker from '../_site/local-api.js';
import {sqliteAdapter} from '../_site/sqlite-store.js';
import {LEAGUES} from '../public/leagues.js';
import {simulateLeagueSeries} from '../public/league-sim-worker.js';
const path=process.argv[2];if(!path)throw Error('Pass a Fateforge SQLite backup.');
const bytes=fs.readFileSync(path),hash=b=>createHash('sha256').update(b).digest('hex'),sourceSHA256=hash(bytes),SQL=await initSqlJs(),db=new SQL.Database(bytes),env={DB:sqliteAdapter(db)};
const decode=s=>JSON.parse(s.startsWith('gz:')?gunzipSync(Buffer.from(s.slice(3),'base64')).toString('utf8'):s);
const row=await env.DB.prepare('SELECT * FROM league_worlds LIMIT 1').first(),original=decode(row.state_json),archives=await env.DB.prepare('SELECT world_id,season,state_json FROM league_seasons ORDER BY world_id,season').all(),titles=await env.DB.prepare('SELECT * FROM champion_history ORDER BY owner_id,tournament_id').all();
const archiveHash=hash(JSON.stringify(archives.results)),titleHash=hash(JSON.stringify(titles.results));
const call=async(body,path='/api/leagues')=>{const response=await worker.fetch(new Request('https://fateforge.local'+path,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':row.owner_id,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);const result=await response.json();assert.equal(response.status,200,result.error);return result;};
let {world,revision}=await call();assert.equal(world.engineVersion,original.history.length?original.engineVersion:11);assert.deepEqual(world.roster,original.roster);assert.deepEqual(world.careers,original.careers);
const metadata={fromEngine:original.engineVersion,toEngine:world.engineVersion,season:world.season,originalCompletedSeasons:archives.results.length,originalTitles:titles.results.length};
let games=0,checkpoints=0;
while(LEAGUES.next(world)){
 const phase=world.phase,series=[],characters=new Map(world.roster.map(c=>[c.id,c]));
 while(world.phase===phase&&LEAGUES.next(world)){const m=LEAGUES.next(world),results=simulateLeagueSeries({match:m,a:characters.get(m.a),b:characters.get(m.b)});series.push({matchId:m.id,results});games+=results.length;LEAGUES.record(world,m.id,results);}
 const command={action:'recordBatch',operationId:crypto.randomUUID(),revision,series,compact:true},saved=await call(command);assert(!Object.hasOwn(saved,'world'));assert.deepEqual(await call(command),saved);revision=saved.revision;checkpoints++;
 assert.equal(hash(JSON.stringify((await env.DB.prepare('SELECT world_id,season,state_json FROM league_seasons ORDER BY world_id,season').all()).results)),archiveHash);
 console.log('Cloned backup checkpoint:',phase,series.length,'series');
}
const exits=LEAGUES.movement(world),expected=LEAGUES.recruitIntake(world),command={action:'rollover',operationId:crypto.randomUUID(),revision},saved=await call(command);assert.deepEqual(await call(command),saved);LEAGUES.sizes(saved.world);assert.equal(saved.world.season,world.season+1);assert.equal(saved.world.engineVersion,13);assert.equal(saved.world.careerRulesVersion,2);assert.equal(saved.world.generationVersion,4);assert(saved.world.roster.filter(c=>!world.careers[c.id]).every(c=>c.summary.generationVersion===4&&c.summary.classProfileVersion===2));
const archive=(await call(null,'/api/leagues/history/'+world.season+'?worldId='+world.id)).archive;assert.equal(archive.retired.length,expected.length);assert.equal(archive.replacements.length,expected.length);assert.equal(new Set(archive.retired.map(c=>c.id)).size,expected.length);assert.equal(archive.deferredCareers.length,exits.deferredCareers.length);
for(const c of saved.world.roster.filter(c=>world.careers[c.id])){assert.deepEqual(saved.world.careers[c.id],world.careers[c.id]);const prior=world.roster.find(old=>old.id===c.id);assert.deepEqual(c.summary.stats,prior.summary.stats);assert.deepEqual(c.traits,prior.traits);assert.deepEqual(c.summary.growth,prior.summary.growth);}
const afterArchives=(await env.DB.prepare('SELECT world_id,season,state_json FROM league_seasons ORDER BY world_id,season').all()).results.filter(r=>r.season!==world.season||r.world_id!==world.id);assert.equal(hash(JSON.stringify(afterArchives)),archiveHash);
const beforeTitleIds=new Set(titles.results.map(t=>t.tournament_id)),afterTitles=(await env.DB.prepare('SELECT * FROM champion_history ORDER BY owner_id,tournament_id').all()).results.filter(t=>beforeTitleIds.has(t.tournament_id));assert.equal(hash(JSON.stringify(afterTitles)),titleHash);
assert.equal(hash(fs.readFileSync(path)),sourceSHA256);db.close();fs.mkdirSync('validation/class-abilities',{recursive:true});fs.writeFileSync('validation/class-abilities/save-transition.json',JSON.stringify({sourceSHA256,...metadata,nextEngine:saved.world.engineVersion,nextGeneration:saved.world.generationVersion,games,checkpoints,departures:archive.retired.length,careerRulesVersion:archive.careerRulesVersion,deferred:archive.deferredCareers.length,preservedArchives:true,preservedTitles:true,preservedStatsAndCareers:true,retrySafe:true,sourceUnchanged:true},null,2)+'\n');console.log('Verified real backup adoption, full season checkpoints, variable rollover, retained history and untouched source backup.');

import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {DatabaseSync} from 'node:sqlite';import worker from '../dist/server/index.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let fullRows=0,writes=0;const env={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},first:async()=>db.prepare(sql).get(...args)||null,all:async()=>{const results=db.prepare(sql).all(...args);if(sql.includes('state_json')&&sql.includes('SELECT'))fullRows+=results.filter(r=>r.state_json).length;return {results};},run:async()=>{if(sql.startsWith('UPDATE saved_characters'))writes++;return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};},async batch(statements){const results=[];for(const s of statements)results.push(await s.run());return results;}}};
const call=(path,method='GET',body)=>worker.fetch(new Request('https://fateforge.test'+path,{method,headers:{'oai-authenticated-user-id':'perf-owner','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/data.js','utf8')+';this.pools=WHEEL_DATA',ctx);
const first='00000000-0000-4000-8000-000000000001';assert.equal((await call('/api/characters/'+first,'PUT',{name:'Fighter 1',state:{version:1,traits:{race:'Human',weapon:'Longbow'},pools:ctx.pools}})).status,200);
const template=db.prepare('SELECT * FROM saved_characters WHERE id = ?').get(first);
for(let i=2;i<=128;i++)db.prepare('INSERT INTO saved_characters (id,owner_id,name,state_json,summary_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run('00000000-0000-4000-8000-'+String(i).padStart(12,'0'),'perf-owner','Fighter '+i,template.state_json,template.summary_json,i,i);
assert.equal((await call('/api/characters')).status,200);assert.equal(writes,128);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM saved_characters WHERE catalog_revision IS NOT NULL').get().n,128);
fullRows=0;writes=0;const started=performance.now(),response=await call('/api/characters'),text=await response.text(),roster=JSON.parse(text).characters;
assert.equal(roster.length,128);assert.equal(fullRows,0);assert.equal(writes,0);
assert(roster.every(c=>!c.state&&c.traits.weapon==='Longbow'&&c.matchRecord.matches===0&&c.championships===0));
const detail=(await(await call('/api/characters/'+first)).json()).character;assert(detail.state.pools.base.race.length>50);assert.equal(writes,0);
// Saved snapshots stay immutable; a rejected edit does not cause repair writes.
assert.equal((await call('/api/characters/'+first,'PUT',{name:'Edited fighter',state:detail.state})).status,409);
assert.equal((await call('/api/characters/'+first,'PUT',{name:'Fighter 1',state:detail.state})).status,200);
writes=0;assert.equal((await call('/api/characters')).status,200);assert.equal(writes,0);
for(const route of ['/','/arena']){const html=await(await call(route)).text();const scripts=[...html.matchAll(/(?:src|href)="([^\"]+\?v=[a-f0-9]+)"/g)];assert(scripts.length>=3);for(const match of scripts){const asset=await call(match[1]);assert.equal(asset.status,200);assert(asset.headers.get('cache-control').includes('immutable'));}}
const arenaJS=await(await call('/arena.js')).text();assert(!/^import .*combat-v[12]/m.test(arenaJS));assert(arenaJS.includes('import(version===1'));
const pngBytes=fs.statSync('public/weapons.png').size+fs.statSync('public/effects.png').size,webpBytes=fs.statSync('public/weapons.webp').size+fs.statSync('public/effects.webp').size;
assert(webpBytes<pngBytes/2);
console.log(`Roster performance passed: 128 fighters, zero full snapshots transferred or repair writes on a warm list; compact response ${Buffer.byteLength(text)} bytes; sprite bytes ${pngBytes} → ${webpBytes}; versioned asset caching and lazy legacy replays verified.`);

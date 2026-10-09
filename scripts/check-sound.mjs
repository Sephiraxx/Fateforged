// Retro sound: the cue model hears hits, attacks, deaths, the Titan, the Fissure, Forgefire and the win; fast playback and
// the per-frame budget keep it bounded; listening never changes a fight (team battles and duels); the sound modules never
// write to a battle; optional sound files are collected like sprites; both builds ship the modules.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {OBJECTIVE_COMBAT_VERSION} from '../public/team-engine-versions.js';
import {Battle} from '../public/combat.js';
import {createCueTracker,SOUND_CUES,SOUND_NAMES,CUE_RULES,musicPlan,element} from '../public/sound-model.js';
import {SOUND_MANIFEST} from '../public/sound-manifest.js';
import {soundUrls} from '../public/sound.js';
import {collectSounds,SOUND_MAX_BYTES} from './sounds.mjs';

// 1. Listening to a fight never changes it, and the fight is heard.
function listen(make,speed=1){
 const plain=make();while(!plain.done)plain.step(1/60);
 const heard=make(),tracker=createCueTracker(),names={};let frames=0,most=0;tracker.read(heard);
 while(!heard.done){for(let i=0;i<speed;i++)if(!heard.done)heard.step(1/60);const cues=tracker.read(heard,{speed,now:frames*1000/60});frames++;most=Math.max(most,cues.length);for(const c of cues){names[c.name]=(names[c.name]??0)+1;assert(c.pan>=-CUE_RULES.pan&&c.pan<=CUE_RULES.pan);assert(SOUND_CUES[c.name],c.name);}}
 tracker.read(heard,{speed,now:frames*1000/60});
 assert.deepEqual(heard.result(),plain.result(),'listening must not change the result');return {names,most,frames};
}
const siege=(size,seed)=>()=>{const Engine=teamEngine(OBJECTIVE_COMBAT_VERSION);return new Engine([squad(COMPOSITIONS['balanced'+size],seed),squad(COMPOSITIONS['balanced'+size],seed+1)],seed,{map:'open'});};
{const {names,most}=listen(siege(3,71));
 for(const name of ['hit','death','titanRise','coreHit','victory'])assert(names[name]>0,`3v3 Core siege plays ${name} (${JSON.stringify(names)})`);
 assert(names.swing||names.shot||names.gunshot||names.cast,'attacks are heard');assert(names.slam||names.fissure||names.molten,'the Titan is heard');
 assert.equal(names.victory,1,'one victory jingle');assert(most<=CUE_RULES.perFrame);}
{const [a,b]=squad(COMPOSITIONS.balanced2,61),{names}=listen(()=>new Battle(a,b,61,{}));assert(names.hit>0&&names.victory===1,`duel is heard (${JSON.stringify(names)})`);}

// 2. Fast playback keeps only important cues.
{const {names}=listen(siege(5,73),8);for(const name of Object.keys(names))assert(SOUND_CUES[name].important,`${name} is not important but played at 8x`);assert(names.victory===1);}

// 3. The per-frame budget and per-cue gaps.
{const t=createCueTracker(),fighters=Array.from({length:10},(_,i)=>({index:i,team:i%2,hp:100,maxHp:100,x:i*60,y:300,weapon:{name:'Longsword',type:'melee'}})),b={width:600,fighters,events:[],projectiles:[]};t.read(b);
 for(const f of fighters){f.hp=50;f.action={type:'melee',released:true};}fighters[0].hp=fighters[1].hp=0;
 b.events.push({time:1,text:'The Forge Titan rises in the pit.'},{time:1,text:'Sudden death: no respawns, double Core damage.'},{time:1,text:'Ana sidesteps an attack.'});
 const cues=t.read(b,{now:1000});assert(cues.length<=CUE_RULES.perFrame);assert.equal(new Set(cues.map(c=>c.name)).size,cues.length,'one cue per name per frame');
 assert(cues.some(c=>c.name==='death')&&cues.some(c=>c.name==='titanRise')&&cues.some(c=>c.name==='suddenDeath'),'important cues win the budget');
 for(const f of fighters)f.hp=Math.max(0,f.hp-10);const again=t.read(b,{now:1010});assert(!again.some(c=>c.name==='hit'||c.name==='bigHit'),'hits wait their gap');
 for(const f of fighters)if(f.hp>0)f.hp-=5;assert(t.read(b,{now:1200}).some(c=>c.name==='hit'),'and play again after it');
 // Log lines are read once, even when the log drops old lines.
 b.events.splice(0,2);b.events.push({time:2,text:'Forge Titan splits the ground: a fissure opens.'});const once=t.read(b,{now:3000});assert.deepEqual(once.filter(c=>c.name==='fissureCharge').length,1);assert(!t.read(b,{now:5000}).some(c=>c.name==='fissureCharge'));}

// 4. Music plans are stable per seed; casts get an element.
assert.deepEqual(musicPlan(42),musicPlan(42));assert(musicPlan(42,true).tempo>musicPlan(42).tempo,'sudden death speeds the music up');
assert.equal(element({id:'fireball',name:'Fireball'}),0);assert.equal(element({id:'frost',name:'Frost nova'}),1);assert.equal(element({id:'x',name:'Odd'}),6);

// 5. The sound modules only read the battle.
for(const file of ['public/sound.js','public/sound-model.js']){const code=fs.readFileSync(file,'utf8');
 assert(!/\b(?:b|f|a|p|fight|battle|activeFight)\.[\w.]+\s*(?:=(?!=)|\+=|-=|\+\+|--)/.test(code),`${file} writes to a battle`);
 assert(!/\.step\(|\.hurt\(|\.heal\(/.test(code),`${file} advances or changes a battle`);}

// 6. Optional sound files: known cue names, allowed formats and sizes; empty by default.
assert.deepEqual(SOUND_MANIFEST,{});assert.deepEqual(soundUrls({hit:'hit.ogg?v=1',nope:'x.ogg'},'https://x.test/a/sound.js'),{hit:'https://x.test/a/sounds/hit.ogg?v=1'});
{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sounds-'));fs.writeFileSync(path.join(dir,'hit.ogg'),Buffer.alloc(10));fs.writeFileSync(path.join(dir,'music-battle.mp3'),Buffer.alloc(SOUND_MAX_BYTES.effect+10));fs.writeFileSync(path.join(dir,'slam.wav'),Buffer.alloc(SOUND_MAX_BYTES.effect+1));fs.writeFileSync(path.join(dir,'boing.ogg'),Buffer.alloc(5));fs.writeFileSync(path.join(dir,'heal.flac'),Buffer.alloc(5));
 const warn=console.warn;console.warn=()=>{};const got=await collectSounds(dir);console.warn=warn;
 assert.deepEqual(Object.keys(got.manifest).sort(),['hit','music-battle'],'music may be larger than an effect');assert.equal(got.skipped.length,3);assert(got.module.includes('SOUND_MANIFEST'));fs.rmSync(dir,{recursive:true});}
for(const name of Object.keys(SOUND_CUES))assert(SOUND_NAMES.includes(name));

// 7. Both builds ship the sound modules.
const worker=fs.readFileSync('dist/server/index.js','utf8');for(const key of ['/sound.js','/sound-model.js','/sound-manifest.js'])assert(worker.includes(JSON.stringify(key))||worker.includes(`'${key}'`),`worker serves ${key}`);
assert(fs.readFileSync('scripts/build-pages.mjs','utf8').includes('collectSounds'),'the Pages build collects sound files');
const docs=fs.readFileSync('SOUND.md','utf8');for(const name of SOUND_NAMES)assert(docs.includes('`'+name+'`'),`SOUND.md lists ${name}`);
console.log('sound checks passed');

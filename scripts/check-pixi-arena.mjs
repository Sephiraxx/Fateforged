// Enhanced renderer (PixiJS): camera framing, particle events, rendering never changes a battle (team battles and
// duels), sprite art mapping and collection, and both builds serve the vendored PixiJS module and the sprite manifest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {OBJECTIVE_COMBAT_VERSION,TEAM_COMBAT_VERSION} from '../public/team-engine-versions.js';
import {CAMERA_RULES,fullView,frameView,stepCamera,actionPoints,snapshot,diffEvents,shakeOffset,ease,teamOf,fighterKey} from '../public/pixi-arena-model.js';
import {Battle} from '../public/combat.js';
import {CHARACTER_ART,PROP_ART,TERRAIN_ART,SPRITE_NAMES,SPRITE_MAX_BYTES,characterArt,propArt,fighterArt,coreArt,spriteUrls} from '../public/sprite-art.js';
import {SPRITE_MANIFEST} from '../public/sprite-manifest.js';
import {collectSprites} from './sprites.mjs';
import {MAP_IDS} from '../public/team-maps.js';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import worker from '../dist/server/index.js';

// 1. Camera: the full field is the identity view; following frames the points and never leaves the field.
const W=1280,H=600,inside=(v,w=W,h=H)=>v.zoom>=CAMERA_RULES.minZoom-1e-9&&v.zoom<=CAMERA_RULES.maxZoom+1e-9&&v.cx-w/2/v.zoom>=-1e-6&&v.cx+w/2/v.zoom<=w+1e-6&&v.cy-h/2/v.zoom>=-1e-6&&v.cy+h/2/v.zoom<=h+1e-6;
const contains=(v,p)=>Math.abs(p.x-v.cx)<=W/2/v.zoom+1e-6&&Math.abs(p.y-v.cy)<=H/2/v.zoom+1e-6;
assert.deepEqual(fullView(W,H),{zoom:1,cx:640,cy:300});
assert.deepEqual(frameView([],W,H),fullView(W,H));
for(const points of [[{x:640,y:300}],[{x:20,y:20},{x:60,y:40}],[{x:1270,y:590}],[{x:100,y:300},{x:1180,y:300}],[{x:500,y:100},{x:700,y:500},{x:620,y:310}]]){
 const v=frameView(points,W,H);assert(inside(v),JSON.stringify(points));for(const p of points)assert(contains(v,p),JSON.stringify({points,v}));}
assert.equal(frameView([{x:640,y:300}],W,H).zoom,Math.min(CAMERA_RULES.maxZoom,H/(CAMERA_RULES.padding*2)),'a single point zooms in as far as its padding allows');
assert.equal(frameView([{x:100,y:300},{x:1180,y:300}],W,H).zoom,1,'a spread fight shows the whole field');
let cam=fullView(W,H);const target=frameView([{x:1200,y:560}],W,H);for(let i=0;i<240;i++){cam=stepCamera(cam,target,1/60,W,H);assert(inside(cam),'the eased camera stays inside the field');}
assert(Math.abs(cam.zoom-target.zoom)<.01&&Math.abs(cam.cx-target.cx)<2&&Math.abs(cam.cy-target.cy)<2,'the camera settles on its target');
assert.equal(ease(0,10,0,3),0);assert(Math.abs(ease(0,10,100,3)-10)<1e-9);
assert.deepEqual(shakeOffset(0,1),{x:0,y:0});assert(Math.hypot(shakeOffset(CAMERA_RULES.shakeTime,1).x,shakeOffset(CAMERA_RULES.shakeTime,1).y)<=CAMERA_RULES.shakeSize*Math.SQRT2+1e-9);

// 2. Particle events from two snapshots.
const fighter=(index,team,hp,x=100,y=100)=>({index,team,hp,maxHp:1000,x,y});
const snap=(time,fighters,extra={})=>({time,fighters,cores:[],titanDeaths:0,titan:null,slamAt:null,...extra});
const types=(a,b)=>diffEvents(a,b).map(e=>e.type);
assert.deepEqual(types(null,snap(0,[fighter(0,0,1000)])),[]);
assert.deepEqual(types(snap(1,[fighter(0,0,1000)]),snap(1.1,[fighter(0,0,900)])),['hit']);
assert.equal(diffEvents(snap(1,[fighter(0,0,1000)]),snap(1.1,[fighter(0,0,900)]))[0].share,.1);
assert.deepEqual(types(snap(1,[fighter(0,0,500)]),snap(1.1,[fighter(0,0,600)])),['heal']);
assert.deepEqual(types(snap(1,[fighter(0,0,50)]),snap(1.1,[fighter(0,0,0)])),['death']);
assert.deepEqual(types(snap(1,[fighter(0,0,0,300,300)]),snap(1.1,[fighter(0,0,400,310,300)])),['revive']);
assert.deepEqual(types(snap(1,[fighter(0,0,0,600,300)]),snap(1.1,[fighter(0,0,1000,130,300)])),['respawn']);
assert.deepEqual(types(snap(1,[fighter(0,0,1000)]),snap(.5,[fighter(0,0,10)])),[],'a replay restart is not a hit');
assert.deepEqual(types(snap(1,[],{cores:[{team:0,hp:4000,x:75,y:300}]}),snap(1.1,[],{cores:[{team:0,hp:3900,x:75,y:300}]})),['coreHit']);
assert.deepEqual(types(snap(1,[],{titan:{x:640,y:300,hp:5}}),snap(1.1,[],{titan:{x:640,y:300,hp:0},titanDeaths:1})),['titanKill']);
assert.deepEqual(types(snap(1,[],{titan:{x:640,y:300,hp:500},slamAt:1.05}),snap(1.1,[],{titan:{x:640,y:300,hp:500}})),['slam']);

// 3. Reading the battle every step (what the renderer does each frame) never changes it.
for(const [version,comp] of [[OBJECTIVE_COMBAT_VERSION,'balanced5'],[OBJECTIVE_COMBAT_VERSION,'balanced3'],[TEAM_COMBAT_VERSION,'balanced2']]){
 const Engine=teamEngine(version),make=()=>new Engine([squad(COMPOSITIONS[comp],41),squad(COMPOSITIONS[comp],42)],41,{headless:true});
 const plain=make();while(!plain.done)plain.step(1/60);
 const watched=make();let prev=null,events=0,followed=0;
 while(!watched.done){const s=snapshot(watched);events+=diffEvents(prev,s).length;prev=s;const v=frameView(actionPoints(watched),watched.width,watched.height);if(v.zoom>1)followed++;assert(inside(v,watched.width,watched.height));watched.step(1/60);}
 assert.deepEqual(watched.result(),plain.result(),`${version} ${comp}: rendering reads must not change the result`);
 assert(events>50,`${version} ${comp}: the particle layer sees the fight (${events} events)`);
 assert(followed>0,`${version} ${comp}: the follow camera zooms in at some point`);
}

// Duels: fighters have a side instead of a team and no index; the reads still leave the result untouched.
{const [a,b]=squad(COMPOSITIONS.balanced2,61),make=()=>new Battle(a,b,61,{});const plain=make();while(!plain.done)plain.step(1/60);
 const watched=make();let prev=null,events=0;assert.deepEqual(watched.fighters.map(teamOf),[0,1]);assert.deepEqual(watched.fighters.map(fighterKey),[0,1]);
 while(!watched.done){const s=snapshot(watched);events+=diffEvents(prev,s).length;prev=s;assert(inside(frameView(actionPoints(watched),600,600),600,600));watched.step(1/60);}
 assert.deepEqual(watched.result(),plain.result(),'duel: rendering reads must not change the result');assert(events>10,`duel: the particle layer sees the fight (${events} events)`);}

// Sprite art: every class and weapon in the game has a sprite or an explicit fallback, and names match ART-PROMPTS.md.
{const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('public/class-abilities.js','utf8')+fs.readFileSync('public/support-catalog.js','utf8')+fs.readFileSync('public/data.js','utf8')+';this.base=WHEEL_DATA.base',context);
 const classes=context.base.class.map(c=>c.name),weapons=context.base.weapon.map(w=>w.name);
 for(const name of classes)assert(characterArt(name),`class ${name} has a character sprite`);
 assert.equal(Object.values(CHARACTER_ART).flat().length,classes.length,'each class is listed once');
 const noProp=['Bare hands','Claws','Arcane gauntlets'];for(const name of weapons)assert(noProp.includes(name)||propArt(name),`weapon ${name} has a prop sprite`);
 for(const list of [Object.values(CHARACTER_ART).flat(),Object.values(PROP_ART).flat()])assert.equal(new Set(list).size,list.length,'no name maps twice');
 for(const name of Object.values(PROP_ART).flat())assert(weapons.includes(name),`prop weapon ${name} exists`);
 for(const id of MAP_IDS.filter(id=>id!=='open'))assert(TERRAIN_ART[id],id);
 const prompts=fs.readFileSync('ART-PROMPTS.md','utf8');assert.equal(SPRITE_NAMES.length,39);for(const name of SPRITE_NAMES)assert(prompts.includes('`'+name+'.png`'),`${name} is in ART-PROMPTS.md`);
 assert.deepEqual(fighterArt({traits:{class:'Priest'},weapon:{name:'Mace'},original:{weapon:{name:'Blessed mace'}}}),{character:'char-holy',prop:'prop-heavy'});
 assert.equal(coreArt({team:0,hp:900,maxHp:1000}),'core-blue');assert.equal(coreArt({team:1,hp:400,maxHp:1000}),'core-red-cracked');
 assert.deepEqual(spriteUrls({'char-plate':'char-plate.webp?v=1',nope:'x.webp'},'https://example.test/Fateforged/pixi-arena.js'),{'char-plate':'https://example.test/Fateforged/sprites/char-plate.webp?v=1'});
 assert.deepEqual(SPRITE_MANIFEST,{},'the source manifest is empty; builds generate it');}

// Sprite collection: known names only, one file per name, size-capped.
{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sprites-'));const warn=console.warn;console.warn=()=>{};
 try{fs.writeFileSync(path.join(dir,'char-plate.webp'),Buffer.alloc(100,1));fs.writeFileSync(path.join(dir,'char-plate.png'),Buffer.alloc(100,2));fs.writeFileSync(path.join(dir,'titan-idle.png'),Buffer.alloc(200,3));
  fs.writeFileSync(path.join(dir,'hero.webp'),Buffer.alloc(10));fs.writeFileSync(path.join(dir,'core-red.gif'),Buffer.alloc(10));fs.writeFileSync(path.join(dir,'core-blue.webp'),Buffer.alloc(SPRITE_MAX_BYTES+1));fs.writeFileSync(path.join(dir,'README.md'),'notes');
  const out=await collectSprites(dir);assert.deepEqual(out.files.map(f=>f.file),['char-plate.png','titan-idle.png']);assert.equal(out.skipped.length,4);assert.match(out.manifest['char-plate'],/^char-plate\.png\?v=[0-9a-f]{10}$/);
  assert(out.module.includes('export const SPRITE_MANIFEST={'));
  assert.deepEqual((await collectSprites(path.join(dir,'missing'))).manifest,{});}
 finally{console.warn=warn;fs.rmSync(dir,{recursive:true,force:true});}}

// 4. The renderer only reads the battle: no assignments to battle (b.) or fighter (f.) properties.
const renderer=fs.readFileSync('public/pixi-arena.js','utf8');
assert(!/\b[bf]\.[\w.]+\s*(?:[-+*/]?=(?!=)|\+\+|--)/.test(renderer),'pixi-arena.js must not write to the battle');
assert(renderer.includes("import('./vendor/pixi.min.js')"),'PixiJS loads lazily from the vendored copy');

// 5. Packaging: an exact pinned version, served by the worker and copied into the Pages build.
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));assert.match(pkg.dependencies['pixi.js'],/^\d+\.\d+\.\d+$/,'pixi.js is pinned exactly');
const vendored=fs.readFileSync('node_modules/pixi.js/dist/pixi.min.mjs','utf8');
const response=await worker.fetch(new Request('https://fateforge.test/vendor/pixi.min.js'),{});
assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);assert.equal(await response.text(),vendored);
for(const file of ['pixi-arena.js','pixi-arena-model.js','sprite-art.js','sprite-manifest.js'])assert.equal((await worker.fetch(new Request('https://fateforge.test/'+file),{})).status,200,file);
const built=await collectSprites();assert.match(await (await worker.fetch(new Request('https://fateforge.test/sprite-manifest.js'),{})).text(),new RegExp(JSON.stringify(built.manifest).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for(const sprite of built.files){const r=await worker.fetch(new Request('https://fateforge.test/sprites/'+sprite.file),{});assert.equal(r.status,200,sprite.file);assert.equal(Buffer.from(await r.arrayBuffer()).length,sprite.data.length);}
if(fs.existsSync('_site')){assert.equal(fs.readFileSync('_site/vendor/pixi.min.js','utf8'),vendored);assert(fs.existsSync('_site/vendor/pixi.js-LICENSE.txt'));for(const file of ['pixi-arena.js','pixi-arena-model.js','sprite-art.js'])assert(fs.existsSync('_site/'+file),file);assert(fs.readFileSync('_site/sprite-manifest.js','utf8').includes(JSON.stringify(built.manifest)));for(const sprite of built.files)assert(fs.existsSync('_site/sprites/'+sprite.file),sprite.file);}
const html=fs.readFileSync('public/arena.html','utf8');for(const id of ['arena-renderer','arena-camera','renderer-note'])assert(html.includes(`id="${id}"`),id);
console.log('Pixi arena checks passed.');

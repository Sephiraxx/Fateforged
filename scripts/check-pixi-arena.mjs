// Enhanced renderer (PixiJS): camera framing, particle events, rendering never changes a battle (team battles and
// duels), sprite art mapping and collection, and both builds serve the vendored PixiJS module and the sprite manifest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {squad,COMPOSITIONS} from './team-fixtures.mjs';
import {teamEngine} from '../public/combat-team.js';
import {OBJECTIVE_COMBAT_VERSION,TEAM_COMBAT_VERSION} from '../public/team-engine-versions.js';
import {CAMERA_RULES,fullView,frameView,stepCamera,actionPoints,snapshot,diffEvents,shakeOffset,ease,teamOf,fighterKey,sheetFrame,SHEET_FPS,newAbilityUses,releaseDelay,fxFrame,FX_DURATION,creatureFrame,titanState,campState,summonState,CREATURE_TIMES} from '../public/pixi-arena-model.js';
import {Battle} from '../public/combat.js';
import {CHARACTER_ART,PROP_ART,TERRAIN_ART,SPRITE_NAMES,SPRITE_MAX_BYTES,characterArt,propArt,fighterArt,coreArt,spriteUrls,SHEET_NAMES,SHEET_ROWS,SHEET_COLUMNS,sheetName,fighterSheet,ABILITY_FX,FX_NAMES,FX_FRAMES,CAST_FX,fighterFx,CREATURE_SHEETS,CREATURE_NAMES,creatureColumns} from '../public/sprite-art.js';
import {CAMP_RULES} from '../public/level-combat.js';
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
 const watched=make();let prev=null,events=0,followed=0;const creatureRows={titan:new Set(),wisp:new Set()},memos=new Map(),memo=o=>memos.get(o)??memos.set(o,{}).get(o);
 while(!watched.done){const s=snapshot(watched);events+=diffEvents(prev,s).length;prev=s;const v=frameView(actionPoints(watched),watched.width,watched.height);if(v.zoom>1)followed++;assert(inside(v,watched.width,watched.height));
  // Creature sheets read the same battle: the Titan's and wisps' rows over the whole game.
  if(watched.titan){const c=creatureFrame(CREATURE_SHEETS['creature-titan'],titanState(watched),memo(watched.titan),watched.time);if(c.since!==Infinity)creatureRows.titan.add(c.row);if(watched.slamAt!=null&&watched.titan.hp>0)assert.equal(c.row,'slam','the Titan winds up through the slam telegraph');}
  for(const camp of watched.camps??[]){const c=creatureFrame(CREATURE_SHEETS['creature-wisp'],campState(watched,camp,CAMP_RULES),memo(camp),watched.time);if(c.since!==Infinity)creatureRows.wisp.add(c.row);}
  watched.step(1/60);}
 if(watched.titan){assert.deepEqual([...creatureRows.titan].sort(),['down','hit','idle','punch','slam','walk'],`${version} ${comp}: the Titan shows every row`);assert.deepEqual([...creatureRows.wisp].sort(),['fade','hit','idle','zap'],`${version} ${comp}: the wisps show every row`);}
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
 const prompts=fs.readFileSync('ART-PROMPTS.md','utf8');assert.equal(SPRITE_NAMES.length,36);for(const name of SPRITE_NAMES)assert(prompts.includes('`'+name+'.png`'),`${name} is in ART-PROMPTS.md`);
 assert.deepEqual(fighterArt({traits:{class:'Priest'},weapon:{name:'Mace'},original:{weapon:{name:'Blessed mace'}}}),{character:'char-holy',prop:'prop-heavy'});
 assert.equal(coreArt({team:0,hp:900,maxHp:1000}),'core-blue');assert.equal(coreArt({team:1,hp:400,maxHp:1000}),'core-red-cracked');
 assert.deepEqual(spriteUrls({'char-plate':'char-plate.webp?v=1',nope:'x.webp'},'https://example.test/Fateforged/pixi-arena.js'),{'char-plate':'https://example.test/Fateforged/sprites/char-plate.webp?v=1'});
 assert.deepEqual(SPRITE_MANIFEST,{},'the source manifest is empty; builds generate it');}
// Team cast sheets: one per subclass, listed in ART-PROMPTS.md, and the frame each fighter state shows.
{const prompts=fs.readFileSync('ART-PROMPTS.md','utf8');assert.equal(SHEET_NAMES.length,32);for(const name of SHEET_NAMES)assert(prompts.includes('`'+name+'`'),`${name} is in ART-PROMPTS.md`);
 assert.deepEqual(SHEET_ROWS.map(([r,n])=>`${r}${n}`),['idle4','walk6','attack5','hit2','down4']);assert.equal(SHEET_COLUMNS,6);
 assert.equal(sheetName('Mage','Blood'),'cast-mage-blood');assert.equal(fighterSheet({traits:{class:'Mage',subclass:'Blood'}}),'cast-mage-blood');assert.equal(fighterSheet({traits:{class:'Mage',subclass:'Fire mastery'}}),null,'wheel subclasses have no sheet');
 assert.equal(spriteUrls({'cast-mage-blood':'cast-mage-blood.webp?v=1'},'https://example.test/a.js')['cast-mage-blood'],'https://example.test/sprites/cast-mage-blood.webp?v=1');
 const f={hp:100,hitFlash:0,action:null},memo={};
 assert.deepEqual(sheetFrame(f,memo,1/SHEET_FPS.idle*5,false),{row:'idle',frame:1});assert.deepEqual(sheetFrame(f,memo,1/SHEET_FPS.walk*7,true),{row:'walk',frame:1});
 assert.deepEqual(sheetFrame({...f,action:{elapsed:.1,windup:.4}},memo,0,true),{row:'attack',frame:1});assert.deepEqual(sheetFrame({...f,action:{elapsed:.5,windup:.4,released:true}},memo,0,false),{row:'attack',frame:4});
 assert.deepEqual(sheetFrame({...f,hitFlash:.1,action:{elapsed:0,windup:.4}},memo,0,false),{row:'hit',frame:0});
 assert.deepEqual(sheetFrame({...f,hp:0},memo,10,false),{row:'down',frame:0});assert.deepEqual(sheetFrame({...f,hp:0},memo,10+1/SHEET_FPS.down*2,false),{row:'down',frame:2});assert.deepEqual(sheetFrame({...f,hp:0},memo,20,false),{row:'down',frame:3},'down holds its last frame');
 sheetFrame(f,memo,21,false);assert.equal(memo.downSince,null,'a respawn resets the fall');}
// Spell effects: one per subclass ability, triggered by new powerUsed stamps when the cast releases.
{const {TEAM_CLASSES}=await import('../public/team-classes.js');const C=globalThis.CURRENT_CLASS_ABILITIES,ids=new Set(TEAM_CLASSES.flatMap(c=>c.subclasses.flatMap(s=>s.powers.map(p=>C.definition(p)?.id))));
 assert.deepEqual([...ids].sort(),Object.keys(ABILITY_FX).sort(),'every subclass ability has an effect entry');assert(Object.values(ABILITY_FX).every(on=>['target','ally','self','area'].includes(on)));
 for(const c of TEAM_CLASSES)for(const s of c.subclasses)assert.deepEqual([...CAST_FX[s.name]].sort(),s.powers.map(p=>C.definition(p).id).sort(),`CAST_FX lists ${s.name}'s abilities`);
 assert.equal(FX_NAMES.length,64);assert.equal(new Set(FX_NAMES).size,64,'one effect per subclass ability');
 assert.equal(fighterFx({traits:{class:'Warlock',subclass:'Soulbinder'}},'blood'),'fx-soulbinder-blood');assert.equal(fighterFx({traits:{class:'Paladin',subclass:'Oathbreaker'}},'blood'),'fx-oathbreaker-blood','a shared ability has one effect per subclass');
 assert.equal(fighterFx({traits:{class:'Warlock',subclass:'Hexer'}},'blood'),null);assert.equal(fighterFx({traits:{class:'Mage'}},'fire'),null,'wheel fighters have no cast effects');
 assert.equal(FX_FRAMES,4);
 const seen={},f={powerUsed:{smite:1}};assert.deepEqual(newAbilityUses(seen,f),[],'the first look only records');f.powerUsed.smite=4;f.powerUsed.zeal=4;assert.deepEqual(newAbilityUses(seen,f).sort(),['smite','zeal']);assert.deepEqual(newAbilityUses(seen,f),[]);
 assert.equal(releaseDelay({action:{power:{id:'smite'},windup:.3,elapsed:.1,released:false}},'smite').toFixed(2),'0.20');assert.equal(releaseDelay({action:{power:{id:'smite'},windup:.3,elapsed:.1,released:true}},'smite'),0);assert.equal(releaseDelay({action:null},'smite'),0);
 assert.equal(fxFrame(0),0);assert.equal(fxFrame(FX_DURATION*.6),2);assert.equal(fxFrame(FX_DURATION),null);assert.equal(fxFrame(-.1),null);}

// Core siege creatures and summons: four sheets listed in ART-PROMPTS.md, rows that name every action, and the frame
// each state shows.
{const prompts=fs.readFileSync('ART-PROMPTS.md','utf8');assert.deepEqual(CREATURE_NAMES,['creature-titan','creature-wisp','creature-beast','creature-spirit']);
 for(const name of CREATURE_NAMES){const sheet=CREATURE_SHEETS[name],rows=Object.fromEntries(sheet.rows);assert(prompts.includes('`'+name+'`'),`${name} is in ART-PROMPTS.md`);assert.equal(sheet.rows[0][0],'idle');
  for(const row of Object.values(sheet.play))assert(rows[row]>=2,`${name} has its ${row} row`);if(sheet.play.windup)assert(rows[sheet.play.windup]>=3);assert(sheet.standing>0&&sheet.standing<=220);
  for(const row of sheet.rows.map(([r])=>r))assert(prompts.includes(`${name}/${row}.png`),`${name} ${row} has a prompt`);
  assert.equal(spriteUrls({[name]:name+'.webp?v=1'},'https://example.test/a.js')[name],`https://example.test/sprites/${name}.webp?v=1`);}
 assert.equal(creatureColumns('creature-titan'),6);assert.equal(creatureColumns('creature-spirit'),4);
 const titan=CREATURE_SHEETS['creature-titan'],m={},at=(state,time)=>creatureFrame(titan,{alive:true,attack:0,windup:null,...state},m,time);
 assert.equal(at({x:0,y:0},0).row,'idle');assert.deepEqual([at({x:5,y:0},.1).row,at({x:10,y:0},.2).row],['walk','walk'],'moving walks');assert.equal(at({x:10,y:0},.3).row,'idle');
 assert.equal(at({x:10,y:0,face:{x:-50,y:0}},.3).dir,Math.PI,'faces its target');
 assert.deepEqual([at({attack:1.2},1).row,at({attack:1.2},1).frame,at({attack:1.2},1+CREATURE_TIMES.attack*.9).frame,at({attack:1.2},1.01+CREATURE_TIMES.attack).row],['punch',0,4,'idle'],'a punch plays once when the next attack time moves');
 assert.deepEqual([0,.3,.6,.99].map(w=>at({windup:w},2).frame),[0,1,2,3],'the slam winds up through frames 1–4 with the telegraph');assert.deepEqual([at({},2.1).row,at({},2.1).frame,at({},2.11+CREATURE_TIMES.impact).row],['slam',4,'idle'],'then lands on frame 5');
 assert.deepEqual(at({hitFlash:.1},3),{row:'hit',frame:0,dir:Math.PI});assert.deepEqual([at({hitFlash:.1},3.15).frame,at({hitFlash:.1},3.3).row,at({hitFlash:.1},3.81).row],[1,'idle','hit'],'a flinch at most every 0.8 s');
 assert.equal(at({hitFlash:.1,windup:.5},3.85).row,'slam','a hit never interrupts the telegraph');
 assert.deepEqual([at({alive:false},4).frame,at({alive:false},4+2/CREATURE_TIMES.death).frame,at({alive:false},9).frame,at({alive:false},9).since],[0,2,3,5],'the fall plays once and holds');
 assert.deepEqual([at({},20).row,at({},20).frame,at({},20+3/CREATURE_TIMES.death).frame,at({},20+4/CREATURE_TIMES.death).row],['down',3,0,'idle'],'rising plays the fall in reverse');
 const fresh={};assert.equal(creatureFrame(titan,{alive:false},fresh,0).since,Infinity,'dead on the first look: nothing to show');assert.equal(creatureFrame(titan,{alive:true},fresh,1).rising,true,'its first appearance rises');
 const wisp=CREATURE_SHEETS['creature-wisp'],wm={},hitter={hp:100,x:10,y:0},b={time:5,combatants:[hitter]},camp={hp:600,x:0,y:0,hitter:0,lastHitAt:4,nextPulse:6};
 creatureFrame(wisp,campState(b,camp,CAMP_RULES),wm,5);camp.nextPulse=7.5;assert.equal(creatureFrame(wisp,campState(b,camp,CAMP_RULES),wm,5.1).row,'zap','a wisp zaps its attacker');
 b.time=20;camp.nextPulse=9;creatureFrame(wisp,campState(b,camp,CAMP_RULES),wm,20);camp.nextPulse=10.5;assert.equal(creatureFrame(wisp,campState(b,camp,CAMP_RULES),wm,20.1).row,'idle','no zap once the fight moved on');
 camp.hp=0;assert.equal(creatureFrame(wisp,campState(b,camp,CAMP_RULES),wm,21).row,'fade');
 for(const [kind,cd,act]of [['beast',.8,'bite'],['spirit',1.15,'cast']]){const sheet=CREATURE_SHEETS['creature-'+kind],sm={},owner={hp:100,x:0,y:0,target:1},foe={hp:100,x:-40,y:0},sb={mode:'team',fighters:[owner,foe],actorFor:i=>sb.fighters[i]},s={type:kind,owner:0,x:0,y:0,cooldown:.3};
  const look=time=>creatureFrame(sheet,summonState(sb,s,sm),sm,time);assert.equal(look(0).row,'idle');s.cooldown=.1;assert.equal(look(.1).row,'idle');s.cooldown=cd;const c=look(.2);assert.equal(c.row,act,`a ${kind} attacks when its cooldown resets`);assert.equal(c.dir,Math.PI,`a ${kind} faces its owner's target`);}}

// Sprite collection: known names only, one file per name, size-capped.
{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sprites-'));const warn=console.warn;console.warn=()=>{};
 try{fs.writeFileSync(path.join(dir,'char-plate.webp'),Buffer.alloc(100,1));fs.writeFileSync(path.join(dir,'char-plate.png'),Buffer.alloc(100,2));fs.writeFileSync(path.join(dir,'pit-rim.png'),Buffer.alloc(200,3));
  fs.writeFileSync(path.join(dir,'hero.webp'),Buffer.alloc(10));fs.writeFileSync(path.join(dir,'core-red.gif'),Buffer.alloc(10));fs.writeFileSync(path.join(dir,'core-blue.webp'),Buffer.alloc(SPRITE_MAX_BYTES+1));fs.writeFileSync(path.join(dir,'README.md'),'notes');
  const out=await collectSprites(dir);assert.deepEqual(out.files.map(f=>f.file),['char-plate.png','pit-rim.png']);assert.equal(out.skipped.length,4);assert.match(out.manifest['char-plate'],/^char-plate\.png\?v=[0-9a-f]{10}$/);
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

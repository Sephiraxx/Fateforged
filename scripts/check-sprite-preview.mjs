// Fighter dialog portrait (public/sprite-preview.js): every subclass's loop shows idle, walk, both of its abilities
// with their effects and a hit; frames stay inside their sheet rows; effects play only while the cast is released.
import assert from 'node:assert/strict';
import {previewScript,previewFrame,scriptLength} from '../public/sprite-preview.js';
import {CAST_FX,ABILITY_FX,SHEET_ROWS,FX_FRAMES} from '../public/sprite-art.js';
const rowLength=Object.fromEntries(SHEET_ROWS);
let frames=0;
for(const [subclass,ids]of Object.entries(CAST_FX)){
 const script=previewScript(ids),total=scriptLength(script);
 assert.deepEqual([...new Set(script.map(s=>s.row))].sort(),['attack','hit','idle','walk'],`${subclass} loops idle, walk, attack and hit`);
 assert(!script.some(s=>s.row==='down'),'No death in the portrait.');
 assert.deepEqual(script.filter(s=>s.fx).map(s=>s.fx.id),ids,`${subclass} casts both of its abilities`);
 for(const s of script)assert(s.frames.every(f=>f>=0&&f<rowLength[s.row]),`${subclass} ${s.row} frames fit the row`);
 const seen=new Set(),fxSeen=new Set();
 for(let t=0;t<total;t+=1/120){
  const v=previewFrame(script,t);frames++;assert(v.frame>=0&&v.frame<rowLength[v.row],`${subclass} at ${t.toFixed(2)}s`);seen.add(v.row);
  if(v.fx){assert.equal(v.row,'attack');assert.equal(v.frame,4,'Effects play on the release frame.');assert(v.fx.frame>=0&&v.fx.frame<FX_FRAMES);assert.equal(v.fx.on,ABILITY_FX[v.fx.id]);fxSeen.add(v.fx.id+':'+v.fx.frame);}
 }
 assert.equal(seen.size,4);for(const id of ids)for(let f=0;f<FX_FRAMES;f++)assert(fxSeen.has(id+':'+f),`${subclass} ${id} shows effect frame ${f}`);
 assert.deepEqual(previewFrame(script,total+.01),previewFrame(script,.01),'The loop wraps.');
 assert(total>5&&total<12,`${subclass} loop is ${total.toFixed(1)} s`);
}
// A fighter without abilities (or unknown ones) still loops, with no effects.
assert(previewScript([]).every(s=>!s.fx));assert.equal(previewFrame(previewScript(['nope']),0).row,'idle');
console.log(`Sprite preview passed: ${Object.keys(CAST_FX).length} subclasses loop idle, walk, both abilities and a hit (${scriptLength(previewScript(CAST_FX.Fire)).toFixed(1)} s), ${frames} sampled frames stay in their rows, and effects play only on the release frame.`);

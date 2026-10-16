// Animated portrait for the fighter details dialog: the fighter's cast sheet loops idle, walk, its two abilities
// (with their effects) and a hit, on a small 2D canvas. Pure timing (previewScript, previewFrame) is tested in
// check-sprite-preview; mountSpritePreview only draws.
import {SPRITE_MANIFEST} from './sprite-manifest.js';
import {spriteUrls,fighterSheet,fighterFx,CAST_FX,ABILITY_FX,SHEET_ROWS,SHEET_COLUMNS,SHEET_FRAME,FX_FRAMES} from './sprite-art.js';
import {SHEET_FPS,FX_DURATION,fxFrame} from './pixi-arena-model.js';
const ATTACK_FPS=8,HIT_FPS=6;
const loop=(row,frames,times,fps)=>({row,frames:Array.from({length:frames*times},(_,i)=>i%frames),fps});
// A cast: windup frames 0–3, then the release frame held while the effect plays (and a beat after).
const cast=(id,on)=>({row:'attack',frames:[0,1,2,3,...Array(Math.ceil((FX_DURATION+.15)*ATTACK_FPS)).fill(4)],fps:ATTACK_FPS,fx:on?{id,on,at:4/ATTACK_FPS}:null});
// `abilities` is the subclass's two ability ids (CAST_FX); an id without a placement (ABILITY_FX) casts with no effect.
export function previewScript(abilities=[]){
 const [a,b]=abilities,idle=n=>loop('idle',4,n,SHEET_FPS.idle),walk=n=>loop('walk',6,n,SHEET_FPS.walk);
 return [idle(2),walk(2),cast(a,ABILITY_FX[a]),idle(2),walk(1),cast(b??a,ABILITY_FX[b??a]),idle(1),{row:'hit',frames:[0,1,1],fps:HIT_FPS},idle(2)];
}
export const scriptLength=script=>script.reduce((n,s)=>n+s.frames.length/s.fps,0);
// What shows `t` seconds in (looping): the sheet row and frame, and the effect frame while one plays.
export function previewFrame(script,t){
 const total=scriptLength(script);let rest=((t%total)+total)%total;
 for(const s of script){const length=s.frames.length/s.fps;if(rest<length){const frame=s.frames[Math.min(s.frames.length-1,Math.floor(rest*s.fps))],age=s.fx?rest-s.fx.at:-1,f=s.fx?fxFrame(age,FX_FRAMES):null;return {row:s.row,frame,fx:f==null?null:{id:s.fx.id,on:s.fx.on,frame:f}};}rest-=length;}
 const last=script.at(-1);return {row:last.row,frame:last.frames.at(-1),fx:null};
}
// The view, in sheet pixels: wider than a cell so an effect on the target (in front, to the right) fits. The cell
// sits with the body at BODY_X; the figure's band (it stands 160 px, feet 12 px up) fills the height.
const VIEW_W=320,VIEW_H=214,BODY_X=110,BODY_Y=164,TARGET_X=242;
const FX_PLACE={target:{x:TARGET_X,y:BODY_Y,size:120},area:{x:BODY_X,y:BODY_Y-6,size:210},ally:{x:BODY_X,y:BODY_Y-8,size:140},self:{x:BODY_X,y:BODY_Y-8,size:140}};
const images=new Map();
const image=url=>{let img=images.get(url);if(!img){img=new Image();img.decoding='async';img.src=url;images.set(url,img);}return img;};
const ready=img=>img?.complete&&img.naturalWidth>0;
export function mountSpritePreview(f,{width=150}={}){
 const sheet=fighterSheet(f),urls=spriteUrls(SPRITE_MANIFEST,import.meta.url);if(!sheet||!urls[sheet])return null;
 const ids=CAST_FX[f.traits.subclass]??[],fx=Object.fromEntries(ids.map(id=>[id,fighterFx(f,id)]).filter(([,name])=>name&&urls[name]).map(([id,name])=>[id,image(urls[name])]));
 const body=image(urls[sheet]),script=previewScript(ids),canvas=document.createElement('canvas'),height=Math.round(width*VIEW_H/VIEW_W),dpr=Math.min(2,globalThis.devicePixelRatio||1);
 canvas.className='fighter-sprite';canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.setAttribute('aria-hidden','true');
 const g=canvas.getContext('2d'),scale=canvas.width/VIEW_W,cellX=BODY_X-SHEET_FRAME/2,cellY=VIEW_H-SHEET_FRAME;
 const draw=t=>{
  g.clearRect(0,0,canvas.width,canvas.height);if(!ready(body))return;g.imageSmoothingEnabled=true;g.setTransform(scale,0,0,scale,0,0);
  const {row,frame,fx:effect}=previewFrame(script,t),size=body.naturalWidth/SHEET_COLUMNS,y=SHEET_ROWS.findIndex(([r])=>r===row);
  g.drawImage(body,frame*size,y*size,size,size,cellX,cellY,SHEET_FRAME,SHEET_FRAME);
  const strip=effect&&fx[effect.id];if(ready(strip)){const p=FX_PLACE[effect.on],w=strip.naturalWidth/FX_FRAMES;g.drawImage(strip,effect.frame*w,0,w,strip.naturalHeight,p.x-p.size/2,p.y-p.size/2,p.size,p.size);}
  g.setTransform(1,0,0,1,0,0);
 };
 // Reduced motion: the first idle frame, drawn once the sheet loads.
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){if(ready(body))draw(0);else body.addEventListener('load',()=>draw(0),{once:true});return canvas;}
 // The loop ends once the canvas leaves the page or its dialog closes (the dialog rebuilds it on every open).
 let start=null;const tick=now=>{if(!canvas.isConnected||canvas.closest('dialog')?.open===false)return;start??=now;draw((now-start)/1000);requestAnimationFrame(tick);};
 requestAnimationFrame(tick);return canvas;
}

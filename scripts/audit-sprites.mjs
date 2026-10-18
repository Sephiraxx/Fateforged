// Audits the team cast sheets, spell effects, Core siege creature sheets and the Core siege field stills (Cores,
// terrain, the pit rim, objective effects) in public/sprites/ before they ship.
// node scripts/audit-sprites.mjs [--out <folder>]
// For every cast-*, fx-* and creature-* file it reports problems a careless generation leaves behind:
// - wrong size, or a name the game does not know;
// - empty frames, art touching the cell edges (cut off), or a frame that is mostly opaque (a background left in);
// - frames cropped by a box in the source strip (long straight vertical edges);
// - the character's height changing between frames of a row (walk, attack, hit) or between rows, or an idle height
//   that is not the cast's (SHEET_STANDING; a creature's own height from CREATURE_SHEETS);
// - a frame whose colours drift from the idle frames (often a different outfit or character; attacks may glow more);
// - frames that repeat the previous one (no motion);
// - in stills: a background left in (opaque corners), rocks too small for their obstacle, effects too dark to show
//   (they are drawn additively), and Core pairs that differ in size or carry the wrong team colour;
// - in effects, frames that do not grow and then fade; a down row that does not end lying down, or a fade row that
//   does not shrink.
// It also writes a contact sheet per file (every frame on a dark and a light background) to the output folder for
// a visual pass. Image work runs in Chromium (Playwright), like scripts/sprite-sheet.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {SHEET_FRAME,SHEET_ROWS,SHEET_COLUMNS,SHEET_STANDING,SHEET_NAMES,FX_NAMES,FX_FRAMES,CREATURE_SHEETS,CREATURE_NAMES,creatureColumns,OBJECTIVE_ART,TERRAIN_ART,EFFECT_ART,stillSize} from '../public/sprite-art.js';

const args=process.argv.slice(2),out=args.includes('--out')?args[args.indexOf('--out')+1]:'validation/sprite-audit';
const STILLS=[...OBJECTIVE_ART,...new Set(Object.values(TERRAIN_ART)),...EFFECT_ART],ROCKS=new Set(Object.values(TERRAIN_ART)),stem=f=>f.replace(/\.(webp|png)$/,'');
const dir='public/sprites',files=fs.readdirSync(dir).filter(f=>/\.(webp|png)$/.test(f)&&(/^(cast|fx|creature)-/.test(f)||STILLS.includes(stem(f)))).sort(),stills={};
if(!files.length){console.log('No team cast sheets, spell effects, creature sheets or field stills in public/sprites/ yet.');process.exit(0);}
fs.mkdirSync(out,{recursive:true});
async function chromium(){
 try{return (await import('playwright')).chromium;}catch{}
 const root=spawnSync('npm',['root','-g'],{encoding:'utf8'}).stdout.trim();
 try{return createRequire(path.join(root,'noop.js'))('playwright').chromium;}catch{console.error('Playwright is needed: npm install -g playwright.');process.exit(2);}
}
const browser=await (await chromium()).launch(),page=await browser.newPage(),report=[];
try{
 for(const file of files){
  const name=stem(file),still=STILLS.includes(name),creature=name.startsWith('creature-'),sheet=name.startsWith('cast-')||creature,known=still||(creature?CREATURE_NAMES.includes(name):sheet?SHEET_NAMES.includes(name):FX_NAMES.includes(name));
  // What a sheet is checked for: rows that keep the idle height, attack rows (taller or shorter poses allowed), the
  // fall (down lies down, fade shrinks) and the standing height.
  const play=creature&&known?CREATURE_SHEETS[name].play:null,rowList=creature?(known?CREATURE_SHEETS[name].rows:[]):SHEET_ROWS;
  const spec=play?{steady:['idle',play.walk,play.hit].filter(Boolean),attack:[play.attack,play.windup].filter(Boolean),fall:play.death,standing:CREATURE_SHEETS[name].standing}:{steady:['idle','walk','hit'],attack:['attack'],fall:'down',standing:SHEET_STANDING};
  const layout=still?[{row:'still',n:1}]:sheet?rowList.map(([row,n])=>({row,n})):[{row:'fx',n:FX_FRAMES}],cols=still?1:creature?(known?creatureColumns(name):1):sheet?SHEET_COLUMNS:FX_FRAMES;
  if(creature&&!known){report.push({file,issues:[`not a name the game uses (see CREATURE_NAMES)`]});continue;}
  const data=`data:image/${file.endsWith('png')?'png':'webp'};base64,`+fs.readFileSync(path.join(dir,file)).toString('base64');
  const r=await page.evaluate(async({data,layout,cols,FRAME,sheet})=>{
   const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(new Error('unreadable'));img.src=data;});
   const size=img.width/cols,c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
   const px=g.getImageData(0,0,img.width,img.height).data,frames=[];
   layout.forEach(({row,n},y)=>{for(let k=0;k<n;k++){
    const x0=Math.round(k*size),y0=Math.round(y*size),s=Math.round(size);let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1,opaque=0,R=0,G=0,B=0;const mask=new Uint8Array(s*s);
    for(let yy=0;yy<s;yy++)for(let xx=0;xx<s;xx++){const i=((y0+yy)*img.width+x0+xx)*4;if(px[i+3]>16){opaque++;mask[yy*s+xx]=1;R+=px[i];G+=px[i+1];B+=px[i+2];if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;}}
    // Straight cuts: the longest run of rows where the art stops at the same column with nothing beside it (a frame
    // cropped by a box in the source); drawn edges wander or fade.
    let cut=0;for(let xx=1;xx<s-1;xx++)for(const side of [-1,1]){let run=0;for(let yy=0;yy<s;yy++){const i=((y0+yy)*img.width+x0+xx)*4,o=i+side*4;if(px[i+3]>96&&px[o+3]<=8){if(++run>cut)cut=run;}else run=0;}}
    const corners=[[0,0],[s-1,0],[0,s-1],[s-1,s-1]].filter(([xx,yy])=>px[((y0+yy)*img.width+x0+xx)*4+3]>16).length;
    frames.push({row,k,corners,opaque:opaque/(s*s),empty:opaque===0,edge:opaque>0&&(minX<=1||minY<=1||maxX>=s-2||maxY>=s-2),h:maxY-minY+1,w:maxX-minX+1,mean:opaque?[R/opaque,G/opaque,B/opaque]:null,cut,mask});
   }});
   // Share of differing pixels between each frame and the previous one in its row (repeats show no motion).
   const same=(a,b)=>{let d=0,n=0;for(let i=0;i<a.length;i++){if(a[i]||b[i]){n++;if(a[i]!==b[i])d++;}}return n?d/n:0;};
   frames.forEach((f,i)=>{const prev=frames[i-1];f.change=prev&&prev.row===f.row&&!f.empty&&!prev.empty?same(f.mask,prev.mask):null;});
   for(const f of frames)delete f.mask;
   // Contact sheet: every cell on dark and on light, scaled to 128 px.
   const cell=128,cs=document.createElement('canvas');cs.width=cols*cell;cs.height=layout.length*cell*2;const q=cs.getContext('2d');
   layout.forEach(({n},y)=>{for(let k=0;k<n;k++)for(const [band,colour]of [[0,'#141826'],[1,'#e8e8e8']]){const dy=(y*2+band)*cell;q.fillStyle=colour;q.fillRect(k*cell,dy,cell,cell);q.drawImage(img,k*size,y*size,size,size,k*cell,dy,cell,cell);q.strokeStyle='#888';q.strokeRect(k*cell+.5,dy+.5,cell-1,cell-1);}});
   return {width:img.width,height:img.height,size,frames,contact:cs.toDataURL('image/png')};
  },{data,layout,cols,FRAME:SHEET_FRAME,sheet});
  const issues=[],warn=(text)=>issues.push(text);
  if(!known)warn(`not a name the game uses (see ${sheet?'SHEET_NAMES':'FX_NAMES'})`);
  const expected=still?[stillSize(name),stillSize(name)]:sheet?[SHEET_FRAME*cols,SHEET_FRAME*layout.length]:[SHEET_FRAME*FX_FRAMES,SHEET_FRAME];
  if(r.width!==expected[0]||r.height!==expected[1])warn(`size ${r.width}×${r.height}, expected ${expected.join('×')} (build it with scripts/sprite-sheet.mjs)`);
  for(const f of r.frames){
   const at=`${f.row} frame ${f.k+1}`;
   if(f.empty){warn(`${at} is empty`);continue;}
   if(f.opaque>.7)warn(`${at} is ${Math.round(f.opaque*100)}% opaque: probably a background was left in`);
   if(f.edge)warn(`${at} touches the cell edge: the art may be cut off`);
  }
  // A straight vertical edge 20 px or longer can be a shield or a staff; several of them, or one of 30 px, is a source
  // strip whose frames were cropped by boxes.
  const cuts=r.frames.filter(f=>f.cut>=20);
  // Stills may have straight edges by design (a pillar, a wall stone).
  if(!still&&(cuts.length>=3||cuts.some(f=>f.cut>=30)))warn(`straight cuts (frames cropped by a box in the source) in ${cuts.map(f=>`${f.row} ${f.k+1}`).join(', ')}: regenerate those rows with clear space around each figure`);
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  if(still){
   const f=r.frames[0],size=stillSize(name),luma=f.mean?.2126*f.mean[0]+.7152*f.mean[1]+.0722*f.mean[2]:0;stills[name]={f,file};
   if(f.corners)warn(`${f.corners} of 4 corners are not transparent: a background was left in`);
   // Rocks are drawn 2.3× their obstacle radius, so the rock should span most of its square to match what blocks.
   if(ROCKS.has(name)&&!f.empty&&Math.max(f.w,f.h)<size*.75)warn(`the rock spans ${Math.round(Math.max(f.w,f.h)/size*100)}% of the square: it will look smaller than the obstacle it marks (rebuild with --still)`);
   // Effects are drawn with additive blending: dark pixels add nothing, so a dark effect barely shows.
   if(EFFECT_ART.includes(name)&&!f.empty&&luma<90)warn(`average brightness ${Math.round(luma)} of 255: effects are drawn additively, so dark parts vanish; make it brighter and glowing`);
  }else if(sheet){
   const idle=r.frames.filter(f=>f.row==='idle'&&!f.empty),idleH=idle.map(f=>f.h).sort((a,b)=>a-b)[Math.floor(idle.length/2)]||1,idleMean=idle.length?idle.map(f=>f.mean).reduce((a,m)=>a.map((v,i)=>v+m[i]/idle.length),[0,0,0]):null;
   // One size for the cast: the idle character stands SHEET_STANDING tall (a staff or a raised weapon adds to the box);
   // each creature stands its own height.
   if(idleH<spec.standing*.92||idleH>spec.standing*1.4)warn(`idle is ${idleH} px tall, ${creature?'this creature':'the cast'} stands ${spec.standing} px: rebuild it with scripts/sprite-sheet.mjs${creature?'':' so it matches the other characters'}`);
   const fallRow=r.frames.filter(f=>f.row===spec.fall),last=fallRow.at(-1);
   for(const f of r.frames.filter(f=>!f.empty)){
    const at=`${f.row} frame ${f.k+1}`;
    if(spec.steady.includes(f.row)&&Math.abs(f.h/idleH-1)>.15)warn(`${at} is ${Math.round(f.h/idleH*100)}% of the idle height: the ${creature?'creature':'character'} changed size`);
    if(spec.attack.includes(f.row)&&(f.h/idleH<.75||f.h/idleH>1.45))warn(`${at} is ${Math.round(f.h/idleH*100)}% of the idle height`);
    if(idleMean&&f.row!=='hit'&&f.row!=='fade'&&dist(f.mean,idleMean)>(spec.attack.includes(f.row)?60:38))warn(`${at} colours drift from the idle frames (distance ${Math.round(dist(f.mean,idleMean))}): check the outfit and character match`);
   }
   if(spec.fall==='down'&&last&&!last.empty&&last.h/idleH>.8)warn(`down frame ${last.k+1} is ${Math.round(last.h/idleH*100)}% of the idle height: the ${creature?'creature':'character'} may not be lying down`);
   if(spec.fall==='fade'&&last&&!fallRow[0].empty&&!last.empty&&last.opaque>fallRow[0].opaque*.6)warn(`fade frame ${last.k+1} is ${Math.round(last.opaque/fallRow[0].opaque*100)}% of frame 1's size: the creature should shrink away`);
   for(const f of r.frames)if(f.change!=null&&f.change<.01)warn(`${f.row} frame ${f.k+1} repeats frame ${f.k}: no motion`);
  }else{
   const areas=r.frames.map(f=>f.empty?0:f.opaque),peak=areas.indexOf(Math.max(...areas));
   if(peak===0)warn('frame 1 is the largest: the effect should start small and grow');
   if(areas[3]>areas[peak]*.95&&peak!==3)warn('frame 4 is as large as the peak: the effect should fade at the end');
   for(const f of r.frames)if(f.change!=null&&f.change<.01)warn(`frame ${f.k+1} repeats frame ${f.k}: no motion`);
  }
  fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.contact.split(',')[1],'base64'));
  report.push({file,issues});
 }
}finally{await browser.close();}
// Core pairs: blue and red, healthy and cracked, should match in size, and each should carry its team colour.
const flag=(name,text)=>{const entry=report.find(x=>x.file===stills[name]?.file);if(entry)entry.issues.push(text);};
for(const [a,b]of [['core-blue','core-red'],['core-blue-cracked','core-red-cracked'],['core-blue','core-blue-cracked'],['core-red','core-red-cracked']]){const p=stills[a]?.f,q=stills[b]?.f;if(!p||!q||p.empty||q.empty)continue;
 if(Math.abs(p.w/q.w-1)>.12||Math.abs(p.h/q.h-1)>.12)flag(b,`${b} is ${q.w}×${q.h} px, ${a} is ${p.w}×${p.h}: the Cores should be the same size and shape`);}
for(const name of ['core-blue','core-blue-cracked','core-red','core-red-cracked']){const f=stills[name]?.f;if(!f?.mean)continue;const [R,,B]=f.mean,blue=name.includes('blue');if(blue?B<=R:R<=B)flag(name,`${name} reads ${blue?'red':'blue'} on average (R ${Math.round(R)}, B ${Math.round(B)}): it should glow in its team colour`);}
const bad=report.filter(x=>x.issues.length);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,1)+'\n');
for(const x of report)console.log(`${x.issues.length?'✗':'✓'} ${x.file}${x.issues.map(i=>'\n    - '+i).join('')}`);
const missing=list=>list.filter(n=>!files.some(f=>f.startsWith(n+'.'))),missingSheets=missing(SHEET_NAMES),missingFx=missing(FX_NAMES),missingCreatures=missing(CREATURE_NAMES),missingStills=missing(STILLS);
console.log(`\n${report.length} files audited, ${bad.length} with issues. Missing: ${missingSheets.length} of ${SHEET_NAMES.length} sheets, ${missingFx.length} of ${FX_NAMES.length} effects, ${missingCreatures.length} of ${CREATURE_NAMES.length} creatures, ${missingStills.length} of ${STILLS.length} field stills. Contact sheets in ${out}/.`);

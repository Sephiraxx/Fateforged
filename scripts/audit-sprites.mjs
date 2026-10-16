// Audits the team cast sheets and spell effects in public/sprites/ before they ship.
// node scripts/audit-sprites.mjs [--out <folder>]
// For every cast-*.webp and fx-*.webp it reports problems a careless generation leaves behind:
// - wrong size, or a name the game does not know;
// - empty frames, art touching the cell edges (cut off), or a frame that is mostly opaque (a background left in);
// - frames cropped by a box in the source strip (long straight vertical edges);
// - the character's height changing between frames of a row (walk, attack, hit) or between rows, or an idle height
//   that is not the cast's (SHEET_STANDING);
// - a frame whose colours drift from the idle frames (often a different outfit or character; attacks may glow more);
// - frames that repeat the previous one (no motion);
// - in effects, frames that do not grow and then fade.
// It also writes a contact sheet per file (every frame on a dark and a light background) to the output folder for
// a visual pass. Image work runs in Chromium (Playwright), like scripts/sprite-sheet.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {SHEET_FRAME,SHEET_ROWS,SHEET_COLUMNS,SHEET_STANDING,SHEET_NAMES,FX_NAMES,FX_FRAMES} from '../public/sprite-art.js';

const args=process.argv.slice(2),out=args.includes('--out')?args[args.indexOf('--out')+1]:'validation/sprite-audit';
const dir='public/sprites',files=fs.readdirSync(dir).filter(f=>/\.(webp|png)$/.test(f)&&/^(cast|fx)-/.test(f)).sort();
if(!files.length){console.log('No team cast sheets or spell effects in public/sprites/ yet.');process.exit(0);}
fs.mkdirSync(out,{recursive:true});
async function chromium(){
 try{return (await import('playwright')).chromium;}catch{}
 const root=spawnSync('npm',['root','-g'],{encoding:'utf8'}).stdout.trim();
 try{return createRequire(path.join(root,'noop.js'))('playwright').chromium;}catch{console.error('Playwright is needed: npm install -g playwright.');process.exit(2);}
}
const browser=await (await chromium()).launch(),page=await browser.newPage(),report=[];
try{
 for(const file of files){
  const name=file.replace(/\.(webp|png)$/,''),sheet=name.startsWith('cast-'),known=sheet?SHEET_NAMES.includes(name):FX_NAMES.includes(name);
  const layout=sheet?SHEET_ROWS.map(([row,n])=>({row,n})):[{row:'fx',n:FX_FRAMES}],cols=sheet?SHEET_COLUMNS:FX_FRAMES;
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
    frames.push({row,k,opaque:opaque/(s*s),empty:opaque===0,edge:opaque>0&&(minX<=1||minY<=1||maxX>=s-2||maxY>=s-2),h:maxY-minY+1,w:maxX-minX+1,mean:opaque?[R/opaque,G/opaque,B/opaque]:null,cut,mask});
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
  const expected=sheet?[SHEET_FRAME*SHEET_COLUMNS,SHEET_FRAME*SHEET_ROWS.length]:[SHEET_FRAME*FX_FRAMES,SHEET_FRAME];
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
  if(cuts.length>=3||cuts.some(f=>f.cut>=30))warn(`straight cuts (frames cropped by a box in the source) in ${cuts.map(f=>`${f.row} ${f.k+1}`).join(', ')}: regenerate those rows with clear space around each figure`);
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  if(sheet){
   const idle=r.frames.filter(f=>f.row==='idle'&&!f.empty),idleH=idle.map(f=>f.h).sort((a,b)=>a-b)[Math.floor(idle.length/2)]||1,idleMean=idle.length?idle.map(f=>f.mean).reduce((a,m)=>a.map((v,i)=>v+m[i]/idle.length),[0,0,0]):null;
   // One size for the cast: the idle character stands SHEET_STANDING tall (a staff or a raised weapon adds to the box).
   if(idleH<SHEET_STANDING*.92||idleH>SHEET_STANDING*1.4)warn(`idle is ${idleH} px tall, the cast stands ${SHEET_STANDING} px: rebuild it with scripts/sprite-sheet.mjs so it matches the other characters`);
   for(const f of r.frames.filter(f=>!f.empty)){
    const at=`${f.row} frame ${f.k+1}`;
    if(['idle','walk','hit'].includes(f.row)&&Math.abs(f.h/idleH-1)>.15)warn(`${at} is ${Math.round(f.h/idleH*100)}% of the idle height: the character changed size`);
    if(f.row==='attack'&&(f.h/idleH<.75||f.h/idleH>1.45))warn(`${at} is ${Math.round(f.h/idleH*100)}% of the idle height`);
    if(f.row==='down'&&f.k===3&&f.h/idleH>.8)warn(`down frame 4 is ${Math.round(f.h/idleH*100)}% of the idle height: the character may not be lying down`);
    if(idleMean&&f.row!=='hit'&&dist(f.mean,idleMean)>(f.row==='attack'?60:38))warn(`${at} colours drift from the idle frames (distance ${Math.round(dist(f.mean,idleMean))}): check the outfit and character match`);
   }
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
const bad=report.filter(x=>x.issues.length);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,1)+'\n');
for(const x of report)console.log(`${x.issues.length?'✗':'✓'} ${x.file}${x.issues.map(i=>'\n    - '+i).join('')}`);
const missingSheets=SHEET_NAMES.filter(n=>!files.some(f=>f.startsWith(n+'.'))),missingFx=FX_NAMES.filter(n=>!files.some(f=>f.startsWith(n+'.')));
console.log(`\n${report.length} files audited, ${bad.length} with issues. Missing: ${missingSheets.length} of ${SHEET_NAMES.length} sheets, ${missingFx.length} of ${FX_NAMES.length} effects. Contact sheets in ${out}/.`);

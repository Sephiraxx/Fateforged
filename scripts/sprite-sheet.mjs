// Builds a team cast sprite sheet (ART-PROMPTS.md, "Team cast sheets") from ChatGPT row strips, or a spell effect
// strip (SPELL-FX-PROMPTS.md).
// node scripts/sprite-sheet.mjs <class> <subclass> <folder>
// node scripts/sprite-sheet.mjs --fx <ability id> <strip.png>
// Effects: one strip of FX_FRAMES frames; each frame is centred on its own box and the strip keeps one scale, so the
// effect's growth stays visible; written to public/sprites/fx-<ability id>.webp (256 px frames in one row).
// The folder holds one PNG per row: idle.png, walk.png, attack.png, hit.png and down.png, each a strip with that row's
// frames side by side on a transparent background (any size, any spacing). Each figure is found by the empty space
// around it and cut out by its opaque pixels, scaled by
// one factor for the whole sheet (so the character keeps its size), set on a shared feet line and centred on its feet,
// then the sheet is written to public/sprites/cast-<class>-<subclass>.webp (256 px frames, rows in SHEET_ROWS order).
// It runs the image work in Chromium (Playwright), so no image library is needed.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {SHEET_FRAME,SHEET_ROWS,SHEET_COLUMNS,SHEET_MAX_BYTES,SPRITE_MAX_BYTES,sheetName,SHEET_NAMES,ABILITY_FX,FX_FRAMES} from '../public/sprite-art.js';

const args=process.argv.slice(2),effect=args[0]==='--fx';
const png=file=>'data:image/png;base64,'+fs.readFileSync(file).toString('base64');
let name,rows,limit;
if(effect){
 const [,id,file]=args;
 if(!id||!file){console.error('Usage: node scripts/sprite-sheet.mjs --fx <ability id> <strip.png>');process.exit(2);}
 if(!ABILITY_FX[id]){console.error(`${id} has no spell effect. Effects: ${Object.keys(ABILITY_FX).join(', ')}`);process.exit(2);}
 if(!fs.existsSync(file)){console.error(`Missing ${file} (${FX_FRAMES} frames).`);process.exit(2);}
 name='fx-'+id;rows=[{row:'fx',frames:FX_FRAMES,data:png(file)}];limit=SPRITE_MAX_BYTES;
}else{
 const [cls,sub,dir]=args;
 if(!cls||!sub||!dir){console.error('Usage: node scripts/sprite-sheet.mjs <class> <subclass> <folder with idle.png walk.png attack.png hit.png down.png>\n       node scripts/sprite-sheet.mjs --fx <ability id> <strip.png>');process.exit(2);}
 name=sheetName(cls,sub);
 if(!SHEET_NAMES.includes(name)){console.error(`${cls} (${sub}) is not in the team cast. Sheets: ${SHEET_NAMES.join(', ')}`);process.exit(2);}
 rows=SHEET_ROWS.map(([row,frames])=>{const file=path.join(dir,row+'.png');if(!fs.existsSync(file)){console.error(`Missing ${file} (${frames} frames).`);process.exit(2);}return {row,frames,data:png(file)};});
 limit=SHEET_MAX_BYTES;
}

async function chromium(){
 try{return (await import('playwright')).chromium;}catch{}
 const root=spawnSync('npm',['root','-g'],{encoding:'utf8'}).stdout.trim();
 try{return createRequire(path.join(root,'noop.js'))('playwright').chromium;}catch{console.error('Playwright is needed: npm install -g playwright (or run where it is installed).');process.exit(2);}
}
const browser=await (await chromium()).launch();
try{
 const page=await browser.newPage();
 const result=await page.evaluate(async({rows,FRAME,COLUMNS,effect})=>{
  const load=src=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(new Error('Unreadable image'));i.src=src;});
  // Cut each strip into equal cells and find each frame's opaque box and the centre of its feet (bottom 15%).
  const frames=[],warnings=[];
  for(const r of rows){
   const img=await load(r.data),cw=img.width/r.frames,c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
   const px=g.getImageData(0,0,img.width,img.height).data,alpha=(x,y)=>px[(y*img.width+x)*4+3];
   // Find the figures by the empty columns between them: runs of columns with opaque pixels, the closest runs merged
   // until there is one per frame (a loose sparkle joins its figure). Figures that touch fall back to equal cells.
   const used=[];for(let x=0;x<img.width;x++){let on=false;for(let y=0;y<img.height&&!on;y++)on=alpha(x,y)>16;used.push(on);}
   let runs=[];for(let x=0;x<img.width;x++)if(used[x]){if(runs.length&&runs.at(-1)[1]===x-1)runs.at(-1)[1]=x;else runs.push([x,x]);}
   while(runs.length>r.frames){let best=1;for(let i=2;i<runs.length;i++)if(runs[i][0]-runs[i-1][1]<runs[best][0]-runs[best-1][1])best=i;runs.splice(best-1,2,[runs[best-1][0],runs[best][1]]);}
   const cells=runs.length===r.frames?runs.map(([a,b])=>[a,b+1]):Array.from({length:r.frames},(_,k)=>[Math.round(k*cw),Math.round((k+1)*cw)]);
   if(runs.length!==r.frames)warnings.push(`${r.row}: found ${runs.length} separate figures for ${r.frames} frames, so the strip was cut into equal parts; leave clear space between the figures if frames look cut.`);
   for(let k=0;k<r.frames;k++){
    const [x0,x1]=cells[k];let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
    for(let y=0;y<img.height;y++)for(let x=x0;x<x1;x++)if(alpha(x,y)>16){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    if(maxX<0)return {error:`${r.row} frame ${k+1} is empty`};
    const footTop=maxY-Math.max(1,Math.round((maxY-minY)*.15));let sum=0,n=0;for(let y=footTop;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(alpha(x,y)>16){sum+=x;n++;}
    frames.push({row:r.row,k,img,minX,minY,maxX,maxY,foot:sum/n});
   }
  }
  // Effects: one scale so the largest frame fills its cell, each frame centred on its own box.
  if(effect){
   const scale=Math.min(...frames.map(f=>(FRAME-16)/Math.max(f.maxX-f.minX+1,f.maxY-f.minY+1)));
   const strip=document.createElement('canvas');strip.width=FRAME*frames.length;strip.height=FRAME;const s=strip.getContext('2d');s.imageSmoothingQuality='high';
   for(const f of frames){const w=f.maxX-f.minX+1,h=f.maxY-f.minY+1;s.drawImage(f.img,f.minX,f.minY,w,h,f.k*FRAME+(FRAME-w*scale)/2,(FRAME-h*scale)/2,w*scale,h*scale);}
   return {webp:strip.toDataURL('image/webp',.9),scale,width:strip.width,height:strip.height,warnings};
  }
  // One scale for the sheet: the idle character stands 200 px tall, unless some frame would not fit its cell.
  const idle=frames.filter(f=>f.row==='idle'),idleH=idle.map(f=>f.maxY-f.minY+1).sort((a,b)=>a-b)[Math.floor(idle.length/2)];
  let scale=200/idleH;
  for(const f of frames){const w=f.maxX-f.minX+1,h=f.maxY-f.minY+1,half=Math.max(f.foot-f.minX,f.maxX-f.foot)+1;scale=Math.min(scale,(FRAME/2-4)/half,(FRAME-16)/h);}
  const sheet=document.createElement('canvas');sheet.width=FRAME*COLUMNS;sheet.height=FRAME*rows.length;const s=sheet.getContext('2d');s.imageSmoothingQuality='high';
  for(const f of frames){
   const y=rows.findIndex(r=>r.row===f.row),w=f.maxX-f.minX+1,h=f.maxY-f.minY+1;
   // Feet line 12 px above the cell's bottom; feet centred in the cell.
   s.drawImage(f.img,f.minX,f.minY,w,h,f.k*FRAME+FRAME/2-(f.foot-f.minX)*scale,y*FRAME+FRAME-12-h*scale,w*scale,h*scale);
  }
  return {webp:sheet.toDataURL('image/webp',.9),scale,width:sheet.width,height:sheet.height,warnings};
 },{rows,FRAME:SHEET_FRAME,COLUMNS:SHEET_COLUMNS,effect});
 if(result.error){console.error(result.error);process.exit(1);}
 if(!result.webp.startsWith('data:image/webp')){console.error('This browser cannot write WebP.');process.exit(1);}
 const data=Buffer.from(result.webp.split(',')[1],'base64');
 if(data.length>limit){console.error(`The ${effect?'effect':'sheet'} is ${Math.round(data.length/1024)} KB, over ${limit/1024} KB. Simplify the art or trim the strips.`);process.exit(1);}
 for(const w of result.warnings)console.warn('Warning: '+w);
 const out=`public/sprites/${name}.webp`;fs.writeFileSync(out,data);
 console.log(`${out}: ${result.width}×${result.height}, ${Math.round(data.length/1024)} KB, scale ${result.scale.toFixed(3)}. Rebuild (npm run build, node scripts/build-pages.mjs) to use it.`);
}finally{await browser.close();}

// Builds a team cast sprite sheet (ART-PROMPTS.md, "Team cast sheets") or a Core siege creature sheet ("Core siege
// creatures") from ChatGPT row strips, or a spell effect strip.
// node scripts/sprite-sheet.mjs <class> <subclass> <folder>
// node scripts/sprite-sheet.mjs --creature <sheet> <folder>
// node scripts/sprite-sheet.mjs --fx <subclass> <ability id> <strip.png>
// Creatures: the rows and standing height come from CREATURE_SHEETS; the death row (down or fade) is scaled like the
// cast's down row, the hit row and a windup (the Titan's slam, fists raised) like hit, and floaters (wisp, spirit) are
// centred in their cells instead of standing on the feet line. Written to public/sprites/<sheet>.webp.
// Effects: one strip of FX_FRAMES frames; each frame is centred on its own box and the strip keeps one scale, so the
// effect's growth stays visible; written to public/sprites/fx-<subclass>-<ability id>.webp (256 px frames in one row).
// The folder holds one PNG per row: idle.png, walk.png, attack.png, hit.png and down.png, each a strip with that row's
// frames side by side on a transparent background (any size, any spacing). ChatGPT draws every strip at its own size,
// so each row is measured and scaled on its own:
// - figures are the connected regions of solid pixels, so figures that overlap side by side still separate; small
//   pieces (sparks, spell bits) join the closest figure and faint edge pixels join the figure they border;
// - idle, walk and attack are scaled so the character's median body height (thin parts such as a raised blade left
//   out) is SHEET_STANDING, the same for the whole cast; down is scaled so the character covers the same area as in
//   idle, and hit halfway between the two measures;
// - each frame sits on the feet line (SHEET_FEET above the cell's bottom), centred on its feet (down frames on their
//   box); a row that would not fit its cells shrinks on its own, never the whole sheet.
// The sheet is written to public/sprites/cast-<class>-<subclass>.webp (256 px frames, rows in SHEET_ROWS order) with a
// per-row summary. It runs the image work in Chromium (Playwright), so no image library is needed.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {SHEET_FRAME,SHEET_ROWS,SHEET_COLUMNS,SHEET_MAX_BYTES,SHEET_STANDING,SHEET_FEET,SPRITE_MAX_BYTES,sheetName,SHEET_NAMES,CAST_FX,fxName,FX_FRAMES,CREATURE_SHEETS,CREATURE_NAMES,creatureColumns} from '../public/sprite-art.js';

const args=process.argv.slice(2),effect=args[0]==='--fx',creature=args[0]==='--creature';
const png=file=>'data:image/png;base64,'+fs.readFileSync(file).toString('base64');
const readRows=(dir,list)=>list.map(([row,frames])=>{const file=path.join(dir,row+'.png');if(!fs.existsSync(file)){console.error(`Missing ${file} (${frames} frames).`);process.exit(2);}return {row,frames,data:png(file)};});
// How rows are laid out: the standing height, the columns, which rows scale by area or halfway, and floating.
let name,rows,limit,layout={STANDING:SHEET_STANDING,COLUMNS:SHEET_COLUMNS,areaRows:['down'],halfRows:['hit'],centered:false};
if(creature){
 const [,which,dir]=args;name=CREATURE_NAMES.find(n=>n===which||n==='creature-'+which);
 if(!name||!dir){console.error(`Usage: node scripts/sprite-sheet.mjs --creature <${CREATURE_NAMES.join('|')}> <folder with one PNG per row>`);process.exit(2);}
 const sheet=CREATURE_SHEETS[name];rows=readRows(dir,sheet.rows);limit=SHEET_MAX_BYTES;
 layout={STANDING:sheet.standing,COLUMNS:creatureColumns(name),areaRows:[sheet.play.death].filter(Boolean),halfRows:[sheet.play.hit,sheet.play.windup].filter(Boolean),centered:!!sheet.centered};
}else if(effect){
 const [,sub,id,file]=args;
 if(!sub||!id||!file){console.error('Usage: node scripts/sprite-sheet.mjs --fx <subclass> <ability id> <strip.png>');process.exit(2);}
 const subclass=Object.keys(CAST_FX).find(k=>k.toLowerCase()===sub.toLowerCase());
 if(!subclass||!CAST_FX[subclass].includes(id)){console.error(`${sub} has no effect for ${id}. Effects: ${Object.entries(CAST_FX).map(([k,ids])=>k+' '+ids.join('/')).join(', ')}`);process.exit(2);}
 if(!fs.existsSync(file)){console.error(`Missing ${file} (${FX_FRAMES} frames).`);process.exit(2);}
 name=fxName(subclass,id);rows=[{row:'fx',frames:FX_FRAMES,data:png(file)}];limit=SPRITE_MAX_BYTES;
}else{
 const [cls,sub,dir]=args;
 if(!cls||!sub||!dir){console.error('Usage: node scripts/sprite-sheet.mjs <class> <subclass> <folder with idle.png walk.png attack.png hit.png down.png>\n       node scripts/sprite-sheet.mjs --creature <sheet> <folder>\n       node scripts/sprite-sheet.mjs --fx <subclass> <ability id> <strip.png>');process.exit(2);}
 name=sheetName(cls,sub);
 if(!SHEET_NAMES.includes(name)){console.error(`${cls} (${sub}) is not in the team cast. Sheets: ${SHEET_NAMES.join(', ')}`);process.exit(2);}
 rows=readRows(dir,SHEET_ROWS);limit=SHEET_MAX_BYTES;
}

async function chromium(){
 try{return (await import('playwright')).chromium;}catch{}
 const root=spawnSync('npm',['root','-g'],{encoding:'utf8'}).stdout.trim();
 try{return createRequire(path.join(root,'noop.js'))('playwright').chromium;}catch{console.error('Playwright is needed: npm install -g playwright (or run where it is installed).');process.exit(2);}
}
const browser=await (await chromium()).launch();
try{
 const page=await browser.newPage();
 const result=await page.evaluate(async({rows,FRAME,FEET,effect,layout:{STANDING,COLUMNS,areaRows,halfRows,centered}})=>{
  const load=src=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(new Error('Unreadable image'));i.src=src;});
  const median=list=>{const s=[...list].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
  const SOLID=32,FAINT=8;
  // Empty-column split (effects, and rows whose figures touch): runs of columns with opaque pixels, the closest runs
  // merged until there is one per frame; equal cells when there are too few.
  function columnFigures(img,px,n,warnings,row){
   const W=img.width,H=img.height,alpha=(x,y)=>px[(y*W+x)*4+3];
   const used=[];for(let x=0;x<W;x++){let on=false;for(let y=0;y<H&&!on;y++)on=alpha(x,y)>16;used.push(on);}
   let runs=[];for(let x=0;x<W;x++)if(used[x]){if(runs.length&&runs.at(-1)[1]===x-1)runs.at(-1)[1]=x;else runs.push([x,x]);}
   while(runs.length>n){let best=1;for(let i=2;i<runs.length;i++)if(runs[i][0]-runs[i-1][1]<runs[best][0]-runs[best-1][1])best=i;runs.splice(best-1,2,[runs[best-1][0],runs[best][1]]);}
   // Figures that overlap side by side (a spark reaching the next frame): cut at the emptiest column near each expected
   // boundary instead.
   let cells;
   if(runs.length===n)cells=runs.map(([a,b])=>[a,b+1]);
   else{const fill=[];for(let x=0;x<W;x++){let c=0;for(let y=0;y<H;y++)if(alpha(x,y)>48)c++;fill.push(c);}
    const r=Math.max(2,Math.round(W/200)),smooth=fill.map((_,x)=>{let t=0;for(let d=-r;d<=r;d++)t+=fill[Math.min(W-1,Math.max(0,x+d))];return t;});
    const cuts=[0];for(let k=1;k<n;k++){let best=Math.round(k*W/n);for(let x=Math.round((k-.4)*W/n);x<=Math.round((k+.4)*W/n);x++)if(smooth[x]<smooth[best])best=x;cuts.push(best);}cuts.push(W);
    cells=Array.from({length:n},(_,k)=>[cuts[k],cuts[k+1]]);
    warnings.push(`${row}: found ${runs.length} separate figures for ${n} frames, so the strip was cut at the emptiest columns between them; leave clear space between the figures if frames look cut.`);}
   return cells.map(([x0,x1],k)=>{let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
    for(let y=0;y<H;y++)for(let x=x0;x<x1;x++)if(alpha(x,y)>16){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    if(maxX<0)return null;
    const footTop=maxY-Math.max(1,Math.round((maxY-minY)*.15));let sum=0,c=0,area=0;for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(alpha(x,y)>SOLID){area++;if(y>=footTop){sum+=x;c++;}}
    return {src:img,ox:0,oy:0,minX,minY,maxX,maxY,foot:sum/c,bodyH:maxY-minY+1,bodyTop:minY,bodyBottom:maxY,bodyX:(minX+maxX)/2,area};});
  }
  // Connected regions: solid pixels (8-connected) grouped into regions; regions of at least a fifth of the largest are
  // figure candidates, merged into the closest neighbour until there is one per frame; smaller ones near a figure join
  // it (far ones are dropped as stray marks); faint edge pixels join the figure within 3 px.
  function regionFigures(img,px,n,warnings,row){
   const W=img.width,H=img.height,N=W*H,a=new Uint8Array(N);for(let i=0;i<N;i++)a[i]=px[i*4+3];
   const lab=new Int32Array(N).fill(-1),regions=[],stack=new Int32Array(N);
   for(let i=0;i<N;i++){if(a[i]<=SOLID||lab[i]>=0)continue;
    const r={id:regions.length,size:0,minX:W,minY:H,maxX:-1,maxY:-1};regions.push(r);let top=0;stack[top++]=i;lab[i]=r.id;
    while(top){const j=stack[--top],x=j%W,y=(j-x)/W;r.size++;if(x<r.minX)r.minX=x;if(x>r.maxX)r.maxX=x;if(y<r.minY)r.minY=y;if(y>r.maxY)r.maxY=y;
     for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=H)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=W)continue;const k=yy*W+xx;if(a[k]>SOLID&&lab[k]<0){lab[k]=r.id;stack[top++]=k;}}}}
   }
   if(!regions.length)return null;
   const gap=(p,q)=>Math.hypot(Math.max(0,p.minX-q.maxX,q.minX-p.maxX),Math.max(0,p.minY-q.maxY,q.minY-p.maxY));
   const largest=Math.max(...regions.map(r=>r.size));
   let figs=regions.filter(r=>r.size>=largest/5).map(r=>({parts:[r],main:r,size:r.size,minX:r.minX,minY:r.minY,maxX:r.maxX,maxY:r.maxY}));
   const join=(f,r)=>{f.parts.push(...(r.parts??[r]));f.size+=r.size;f.minX=Math.min(f.minX,r.minX);f.minY=Math.min(f.minY,r.minY);f.maxX=Math.max(f.maxX,r.maxX);f.maxY=Math.max(f.maxY,r.maxY);if((r.main??r).size>f.main.size)f.main=r.main??r;};
   if(figs.length<n){warnings.push(`${row}: ${figs.length} figures for ${n} frames (some touch), so the strip was split at its empty columns.`);return columnFigures(img,px,n,warnings,row);}
   while(figs.length>n){const small=figs.reduce((m,f)=>f.size<m.size?f:m);const rest=figs.filter(f=>f!==small);join(rest.reduce((m,f)=>gap(f,small)<gap(m,small)?f:m),small);figs=rest;}
   figs.sort((p,q)=>(p.minX+p.maxX)-(q.minX+q.maxX));
   const reach=median(figs.map(f=>f.main.maxY-f.main.minY+1))*.15;let dropped=0;
   const owner=new Int16Array(regions.length).fill(-1);figs.forEach((f,k)=>f.parts.forEach(r=>owner[r.id]=k));
   for(const r of regions){if(owner[r.id]>=0)continue;let best=-1,d=Infinity;figs.forEach((f,k)=>{const g=gap(f,r);if(g<d){d=g;best=k;}});if(d>reach){dropped++;continue;}owner[r.id]=best;join(figs[best],r);}
   if(dropped)warnings.push(`${row}: ${dropped} stray marks away from the figures were left out.`);
   const who=new Int16Array(N).fill(-1);for(let i=0;i<N;i++)if(lab[i]>=0)who[i]=owner[lab[i]];
   for(let i=0;i<N;i++){if(a[i]<=FAINT||a[i]>SOLID)continue;const x=i%W,y=(i-x)/W;let best=-1,d=99;
    for(let dy=-3;dy<=3;dy++){const yy=y+dy;if(yy<0||yy>=H)continue;for(let dx=-3;dx<=3;dx++){const xx=x+dx;if(xx<0||xx>=W)continue;const k=yy*W+xx;if(a[k]>SOLID&&who[k]>=0&&dx*dx+dy*dy<d){d=dx*dx+dy*dy;best=who[k];}}}
    who[i]=best;}
   return figs.map((f,k)=>{let minX=W,minY=H,maxX=-1,maxY=-1;for(let i=0;i<N;i++)if(who[i]===k){const x=i%W,y=(i-x)/W;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    const w=maxX-minX+1,h=maxY-minY+1,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),out=g.createImageData(w,h);
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const i=y*W+x;if(who[i]!==k)continue;const o=((y-minY)*w+x-minX)*4;for(let q=0;q<4;q++)out.data[o+q]=px[i*4+q];}
    g.putImageData(out,0,0);
    // The body: the main region's rows at least a fifth as wide as its typical row, so a raised blade or staff does
    // not count as height; the feet are the bottom 15% of the body.
    const m=f.main,widths=[];for(let y=m.minY;y<=m.maxY;y++){let n=0;for(let x=m.minX;x<=m.maxX;x++)if(lab[y*W+x]===m.id)n++;widths.push(n);}
    const thin=median(widths.filter(n=>n))*.2;let top=widths.findIndex(n=>n>=thin),bot=widths.length-1;while(bot>top&&widths[bot]<thin/2)bot--;top+=m.minY;bot+=m.minY;
    const footTop=bot-Math.max(1,Math.round((bot-top)*.15));let sum=0,cnt=0;
    for(let y=footTop;y<=bot;y++)for(let x=m.minX;x<=m.maxX;x++)if(lab[y*W+x]===m.id){sum+=x;cnt++;}
    return {src:c,ox:minX,oy:minY,minX,minY,maxX,maxY,foot:sum/cnt,bodyH:bot-top+1,bodyTop:top,bodyBottom:bot,bodyX:(m.minX+m.maxX)/2,area:f.size};});
  }
  const frames=[],warnings=[];
  for(const r of rows){
   const img=await load(r.data),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
   const px=g.getImageData(0,0,img.width,img.height).data;
   const found=effect?columnFigures(img,px,r.frames,warnings,r.row):regionFigures(img,px,r.frames,warnings,r.row);
   if(!found)return {error:`${r.row} is empty`};
   for(let k=0;k<r.frames;k++){if(!found[k])return {error:`${r.row} frame ${k+1} is empty`};frames.push({row:r.row,k,...found[k]});}
  }
  const draw=(s,f,x,y,scale)=>{const w=f.maxX-f.minX+1,h=f.maxY-f.minY+1;s.drawImage(f.src,f.minX-f.ox,f.minY-f.oy,w,h,x,y,w*scale,h*scale);};
  // Effects: one scale so the largest frame fills its cell, each frame centred on its own box.
  if(effect){
   const scale=Math.min(...frames.map(f=>(FRAME-16)/Math.max(f.maxX-f.minX+1,f.maxY-f.minY+1)));
   const strip=document.createElement('canvas');strip.width=FRAME*frames.length;strip.height=FRAME;const s=strip.getContext('2d');s.imageSmoothingQuality='high';
   for(const f of frames){const w=f.maxX-f.minX+1,h=f.maxY-f.minY+1;draw(s,f,f.k*FRAME+(FRAME-w*scale)/2,(FRAME-h*scale)/2,scale);}
   return {webp:strip.toDataURL('image/webp',.9),summary:`scale ${scale.toFixed(3)}`,width:strip.width,height:strip.height,warnings};
  }
  // Row scales: idle, walk and attack by the character's median height; down (areaRows) by area (the idle area at the
  // idle scale), since the fall changes the height; hit (halfRows) halfway between the two (geometric mean), since a
  // recoil crouches a little and a flung cape adds area.
  const of=row=>frames.filter(f=>f.row===row),scales={},byArea=row=>scales.idle*Math.sqrt(median(of('idle').map(f=>f.area))/median(of(row).map(f=>f.area)));
  for(const r of rows)if(!areaRows.includes(r.row))scales[r.row]=STANDING/median(of(r.row).map(f=>f.bodyH));
  for(const row of areaRows)scales[row]=byArea(row);for(const row of halfRows)scales[row]=Math.sqrt(scales[row]*byArea(row));
  // Placement: feet on the feet line, centred on the feet (down: on the box), pushed sideways to stay inside the cell;
  // floaters centre their body in the cell. A row that is still too big shrinks.
  const middle=f=>(f.bodyTop+f.bodyBottom)/2;
  const place=(f,scale)=>{const w=(f.maxX-f.minX+1)*scale,top=centered?FRAME/2-(middle(f)-f.minY)*scale:FRAME-FEET-(f.bodyBottom-f.minY+1)*scale,bottom=top+(f.maxY-f.minY+1)*scale;
   let left=areaRows.includes(f.row)?(FRAME-w)/2:FRAME/2-((centered?f.bodyX:f.foot)-f.minX)*scale;left=Math.min(Math.max(left,4),FRAME-4-w);return {left,top,w,bottom};};
  const fits={};
  for(const r of rows){let s=scales[r.row];for(const f of of(r.row)){const w=(f.maxX-f.minX+1)*s,h=(f.maxY-f.minY+1)*s,above=(f.bodyBottom-f.minY+1)*s,below=h-above,reach=Math.max(middle(f)-f.minY,f.maxY-middle(f))*s;
    s*=centered?Math.min(1,(FRAME-8)/w,(FRAME/2-4)/reach):Math.min(1,(FRAME-8)/w,(FRAME-FEET-4)/above,below>FEET-2?(FEET-2)/below:1);}
   fits[r.row]=s/scales[r.row];scales[r.row]=s;if(fits[r.row]<.9)warnings.push(`${r.row}: shrunk to ${Math.round(fits[r.row]*100)}% to fit the cells (a wide or tall pose); check it does not look small next to idle.`);}
  const sheet=document.createElement('canvas');sheet.width=FRAME*COLUMNS;sheet.height=FRAME*rows.length;const s=sheet.getContext('2d');s.imageSmoothingQuality='high';
  const report=[];
  for(const f of frames){const y=rows.findIndex(r=>r.row===f.row),scale=scales[f.row],p=place(f,scale);draw(s,f,f.k*FRAME+p.left,y*FRAME+p.top,scale);
   report.push({row:f.row,frame:f.k,height:Math.round(f.bodyH*scale),box:[p.left,p.top,p.w,p.bottom-p.top].map(Math.round)});}
  const fall=areaRows[0],fallFirst=report.find(x=>x.row===fall&&x.frame===0)?.height;
  const summary=rows.map(r=>`${r.row} ×${(scales[r.row]/scales.idle).toFixed(2)}${fits[r.row]<1?` (fit ${Math.round(fits[r.row]*100)}%)`:''}`).join(', ')+(fallFirst?`; ${fall} frame 1 is ${Math.round(fallFirst/STANDING*100)}% of idle height`:'');
  return {webp:sheet.toDataURL('image/webp',.9),summary,report,width:sheet.width,height:sheet.height,warnings};
 },{rows,FRAME:SHEET_FRAME,FEET:SHEET_FEET,effect,layout});
 if(result.error){console.error(result.error);process.exit(1);}
 if(!result.webp.startsWith('data:image/webp')){console.error('This browser cannot write WebP.');process.exit(1);}
 const data=Buffer.from(result.webp.split(',')[1],'base64');
 if(data.length>limit){console.error(`The ${effect?'effect':'sheet'} is ${Math.round(data.length/1024)} KB, over ${limit/1024} KB. Simplify the art or trim the strips.`);process.exit(1);}
 for(const w of result.warnings)console.warn('Warning: '+w);
 const out=`public/sprites/${name}.webp`;fs.writeFileSync(out,data);
 console.log(`${out}: ${result.width}×${result.height}, ${Math.round(data.length/1024)} KB; ${result.summary}. Rebuild (npm run build, node scripts/build-pages.mjs) to use it.`);
}finally{await browser.close();}

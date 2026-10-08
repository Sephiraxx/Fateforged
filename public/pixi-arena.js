// Enhanced team-battle renderer (PixiJS / WebGL). It only reads the battle: positions are eased for display,
// particles come from state differences, and the camera frames the field or follows the action. The 2D canvas
// renderer in arena.js stays the fallback and the "Classic" option.
import {fullView,frameView,actionPoints,stepCamera,snapshot,diffEvents,shakeOffset,ease,CAMERA_RULES} from './pixi-arena-model.js';
const TEAM_COLORS=[0x3ee0ff,0xff5a6a],GOLD=0xf4c96b,ROLE_GLYPH={tank:'⛨',healer:'✚',controller:'◎',damage:'✦'};
const classKind=f=>f.role==='healer'?'healer':({arcane:'caster',ranged:'ranger'})[f.original?.weapon?.type??f.weapon?.type]??'melee';
function radialCanvas(size,stops){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),grad=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);for(const [o,color]of stops)grad.addColorStop(o,color);g.fillStyle=grad;g.fillRect(0,0,size,size);return c;}
function pool(container,make){const items=[];let used=0;return {begin(){used=0;},get(){let item=items[used];if(!item){item=items[used]=make();container.addChild(item.root??item);}used++;(item.root??item).visible=true;return item;},end(){for(let i=used;i<items.length;i++)(items[i].root??items[i]).visible=false;}};}

export async function createPixiArena(frame,images,{onFail}={}){
 const PIXI=await import('./vendor/pixi.min.js');
 const app=new PIXI.Application();
 await app.init({width:960,height:600,antialias:true,backgroundAlpha:0,preference:'webgl',resolution:Math.min(2,globalThis.devicePixelRatio||1),autoStart:false,sharedTicker:false});
 app.ticker?.stop();
 const canvas=app.canvas;canvas.className='arena-pixi';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;frame.append(canvas);
 canvas.addEventListener('webglcontextlost',()=>onFail?.('WebGL context lost'),{once:true});
 // Textures: the existing sprite sheets plus generated glows.
 const sheet=name=>{const img=images[name];return img?.complete&&img.naturalWidth?PIXI.Texture.from(img):null;};
 const frames={},frameTex=(name,index)=>{const key=name+index;if(frames[key])return frames[key];const base=sheet(name);if(!base)return null;const w=base.source.width/4,h=base.source.height/4;return frames[key]=new PIXI.Texture({source:base.source,frame:new PIXI.Rectangle((index%4)*w,Math.floor(index/4)*h,w,h)});};
 const glowTex=PIXI.Texture.from(radialCanvas(128,[[0,'rgba(255,255,255,1)'],[.35,'rgba(255,255,255,.45)'],[1,'rgba(255,255,255,0)']]));
 const dotTex=PIXI.Texture.from(radialCanvas(32,[[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.8)'],[1,'rgba(255,255,255,0)']]));
 const rockTex=PIXI.Texture.from(radialCanvas(128,[[0,'#6a7488'],[.6,'#3a4150'],[.98,'#1c2029'],[1,'rgba(28,32,41,0)']]));
 const floorImg=images.floor;let floorTex=null;
 // Scene graph: world (camera) > ground, terrain, zones, objectives, trails, effects, projectiles, fighters, particles, overlay.
 const world=new PIXI.Container();app.stage.addChild(world);
 const layer=()=>{const c=new PIXI.Container();world.addChild(c);return c;};
 const ground=layer(),terrain=layer(),zones=layer(),objectives=layer(),trails=layer(),effects=layer(),projectiles=layer(),fighters=layer(),particles=layer(),overlay=layer();
 const groundG=new PIXI.Graphics(),zoneG=new PIXI.Graphics(),objG=new PIXI.Graphics(),trailG=new PIXI.Graphics(),lineG=new PIXI.Graphics(),weatherG=new PIXI.Graphics();
 ground.addChild(groundG);zones.addChild(zoneG);objectives.addChild(objG);trails.addChild(trailG,lineG);overlay.addChild(weatherG);
 const objGlow=pool(objectives,()=>{const s=new PIXI.Sprite(glowTex);s.anchor.set(.5);s.blendMode='add';return s;});
 const sprites=pool(effects,()=>{const s=new PIXI.Sprite();s.anchor.set(.5);return s;});
 const shots=pool(projectiles,()=>{const s=new PIXI.Sprite();s.anchor.set(.5);return s;});
 const labels=pool(overlay,()=>new PIXI.Text({text:'',anchor:.5,resolution:2,style:{fontFamily:'Chakra Petch, system-ui, sans-serif',fontSize:20,fontWeight:'700',fill:0xffffff,stroke:{color:0x05070d,width:4}}}));
 const bars=new PIXI.Graphics();overlay.addChild(bars);
 const bodies=new Map(),shown=new Map(),live=[];let battleRef=null,prevSnap=null,camera=null,shake=0,clock=0,mode='full',view={W:960,H:600,portrait:false},floorSprite=null;
 const body=f=>{let b=bodies.get(f.index);if(b)return b;const root=new PIXI.Container(),glow=new PIXI.Sprite(glowTex),disc=new PIXI.Graphics(),flash=new PIXI.Graphics(),weapon=new PIXI.Sprite(),icon=new PIXI.Graphics();
  glow.anchor.set(.5);glow.blendMode='add';weapon.anchor.set(.5);root.addChild(glow,disc,flash,weapon,icon);fighters.addChild(root);b={root,glow,disc,flash,weapon,icon,kind:null,radius:null};bodies.set(f.index,b);return b;};
 function drawBody(v,f){const r=f.radius||9,color=TEAM_COLORS[f.team]??0xffffff;if(v.radius===r&&v.color===color)return;v.radius=r;v.color=color;
  v.disc.clear().circle(0,0,r).fill({color}).circle(-r*.28,-r*.35,r*.45).fill({color:0xffffff,alpha:.35}).circle(0,0,r).stroke({width:1,color:0xeaf6ff});
  v.flash.clear().circle(0,0,r).fill({color:0xffffff});v.glow.tint=color;v.glow.width=v.glow.height=r*5.2;}
 function drawIcon(g,kind){g.clear();const fill={color:0xf4fbff},line={width:3.2,color:0x05070d,join:'round',cap:'round'};
  if(kind==='healer')g.rect(-2.5,-8,5,16).rect(-8,-2.5,16,5).stroke(line).fill(fill);
  else if(kind==='caster')g.poly([-8,6,8,6,4,3,1,-8,-3,-1,-5,3]).stroke(line).fill(fill);
  else if(kind==='ranger'){g.moveTo(-6+8.5*Math.cos(-1.2),8.5*Math.sin(-1.2)).arc(-6,0,8.5,-1.2,1.2).moveTo(-6+8.5*Math.cos(-1.2),8.5*Math.sin(-1.2)).lineTo(-6+8.5*Math.cos(1.2),8.5*Math.sin(1.2)).stroke(line).stroke({width:1.6,color:0xf4fbff});}
  else g.moveTo(-7,-7).lineTo(7,-7).lineTo(7,0).quadraticCurveTo(6,6,0,9).quadraticCurveTo(-6,6,-7,0).closePath().stroke(line).fill(fill);g.scale.set(.62);}
 function spawn(x,y,{count,color,speed=80,size=6,life=.6,rise=0,add=true}){for(let i=0;i<count;i++){const s=new PIXI.Sprite(dotTex);s.anchor.set(.5);s.tint=color;s.blendMode=add?'add':'normal';const a=Math.random()*Math.PI*2,v=speed*(.4+Math.random()*.8);s.x=x;s.y=y;s.width=s.height=size*(.6+Math.random()*.8);particles.addChild(s);live.push({s,vx:Math.cos(a)*v,vy:Math.sin(a)*v-rise,life,max:life});}}
 function ring(x,y,{color,from=10,to=90,life=.5,width=3}){const g=new PIXI.Graphics();particles.addChild(g);live.push({g,x,y,color,from,to,life,max:life,width});}
 function onEvent(e){const foe=TEAM_COLORS[1-e.team]??0xffe27a;
  if(e.type==='hit')spawn(e.x,e.y,{count:Math.min(14,3+Math.round(e.share*40)),color:foe,speed:110,size:5,life:.35});
  else if(e.type==='heal')spawn(e.x,e.y,{count:Math.min(10,2+Math.round(e.share*30)),color:0x7dffa8,speed:20,size:6,life:.8,rise:40});
  else if(e.type==='death'){spawn(e.x,e.y,{count:22,color:TEAM_COLORS[e.team],speed:150,size:7,life:.7});ring(e.x,e.y,{color:TEAM_COLORS[e.team],to:60});}
  else if(e.type==='revive'||e.type==='respawn'){spawn(e.x,e.y,{count:16,color:e.type==='revive'?GOLD:TEAM_COLORS[e.team],speed:25,size:7,life:1,rise:90});ring(e.x,e.y,{color:e.type==='revive'?GOLD:TEAM_COLORS[e.team],to:45,life:.7});}
  else if(e.type==='coreHit')spawn(e.x,e.y,{count:3,color:TEAM_COLORS[e.team],speed:90,size:5,life:.4});
  else if(e.type==='titanKill'){spawn(e.x,e.y,{count:40,color:GOLD,speed:180,size:9,life:1.1});ring(e.x,e.y,{color:GOLD,to:160,life:.9,width:5});}
  else if(e.type==='slam'){shake=CAMERA_RULES.shakeTime;ring(e.x,e.y,{color:0xff784a,from:20,to:110,life:.45,width:6});}}
 function updateParticles(dt){for(let i=live.length-1;i>=0;i--){const p=live[i];p.life-=dt;const k=Math.max(0,p.life/p.max);
  if(p.s){p.s.x+=p.vx*dt;p.s.y+=p.vy*dt;p.vx*=.92;p.vy*=.92;p.s.alpha=k;}else{p.g.clear().circle(p.x,p.y,p.to-(p.to-p.from)*k).stroke({width:p.width*k+.5,color:p.color,alpha:k});}
  if(p.life<=0){(p.s??p.g).destroy();live.splice(i,1);}}}
 function buildStatic(b){
  groundG.clear();const {W,H}=view,env=b.environment??{};
  groundG.rect(0,0,W,H).fill({color:env.ground==='water'?0x08202b:env.time==='night'?0x070a16:env.time==='dawn'?0x1a1124:0x0a1220});
  if(!floorSprite&&floorImg?.complete&&floorImg.naturalWidth){floorTex=PIXI.Texture.from(floorImg);floorSprite=new PIXI.Sprite(floorTex);floorSprite.alpha=.24;ground.addChildAt(floorSprite,1);}
  if(floorSprite){floorSprite.width=W;floorSprite.height=H;}
  for(let i=0;i<=W;i+=30)groundG.moveTo(i,0).lineTo(i,H);for(let i=0;i<=H;i+=30)groundG.moveTo(0,i).lineTo(W,i);groundG.stroke({width:1,color:0x3ee0ff,alpha:.06});
  groundG.rect(10,10,W-20,H-20).stroke({width:2,color:0x3ee0ff,alpha:.33}).moveTo(W/2,10).lineTo(W/2,H-10).stroke({width:1,color:0xffffff,alpha:.11}).circle(W/2,H/2,60).stroke({width:1,color:0xffffff,alpha:.11});
  terrain.removeChildren().forEach(c=>c.destroy());
  for(const o of b.obstacles??[]){if(!o.terrain)continue;const shadow=new PIXI.Sprite(glowTex);shadow.anchor.set(.5);shadow.tint=0x000000;shadow.alpha=.55;shadow.x=o.x+3;shadow.y=o.y+4;shadow.width=shadow.height=o.radius*3;const rock=new PIXI.Sprite(rockTex);rock.anchor.set(.5);rock.x=o.x;rock.y=o.y;rock.width=rock.height=o.radius*2;const rim=new PIXI.Graphics().circle(o.x,o.y,o.radius).stroke({width:1.5,color:0x9fb0c8,alpha:.33});terrain.addChild(shadow,rock,rim);}
 }
 function placeCamera(){const {W,H,portrait}=view,cam=camera,off=shakeOffset(shake,clock),screenW=portrait?H:W,screenH=portrait?W:H;
  world.pivot.set(cam.cx+off.x,cam.cy+off.y);world.scale.set(cam.zoom);world.rotation=portrait?-Math.PI/2:0;world.position.set(screenW/2,screenH/2);}
 // Pooled labels: text and style changes re-render a texture, so only touch them when they differ.
 const setLabel=(label,text,fill)=>{if(label.text!==text)label.text=text;if(label.fillColor!==fill){label.style.fill=fill;label.fillColor=fill;}};
 const upright=obj=>{obj.rotation=view.portrait?Math.PI/2:0;obj.scale.set((view.portrait?1.35:1)/camera.zoom);};
 return {
  canvas,
  setMode(next){mode=next==='follow'?'follow':'full';},
  get mode(){return mode;},
  show(on){canvas.hidden=!on;},
  // dt is battle time for particles and easing (0 while paused); realDt drives the camera so it still moves when paused.
  render(b,dt,{W,H,portrait},realDt=dt){
   dt=Math.max(0,Math.min(.1,dt||0));realDt=Math.max(0,Math.min(.1,realDt||0));clock+=dt;
   const sw=portrait?H:W,sh=portrait?W:H;if(app.renderer.width!==sw*app.renderer.resolution||app.renderer.height!==sh*app.renderer.resolution||view.W!==W||view.portrait!==portrait){app.renderer.resize(sw,sh);view={W,H,portrait};battleRef=null;}
   if(b!==battleRef){battleRef=b;prevSnap=null;shown.clear();for(const v of bodies.values())v.root.destroy({children:true});bodies.clear();buildStatic(b);camera=fullView(W,H);}
   // Particles from what changed since the last frame.
   const snap=snapshot(b);for(const e of diffEvents(prevSnap,snap))onEvent(e);prevSnap=snap;updateParticles(dt);shake=Math.max(0,shake-dt);
   camera=mode==='follow'?stepCamera(camera,frameView(actionPoints(b),W,H),realDt,W,H):stepCamera(camera,fullView(W,H),realDt*2,W,H);placeCamera();
   // Zones, summons, portals and other environment pieces.
   zoneG.clear();sprites.begin();
   const sheetSprite=(name,index,x,y,size,angle=0,alpha=1)=>{const t=frameTex(name,index);if(!t)return;const s=sprites.get();s.texture=t;s.x=x;s.y=y;s.width=s.height=size;s.rotation=angle+(name==='weapons'&&index===5?Math.PI:0);s.alpha=alpha;s.blendMode='normal';};
   for(const z of b.zones??[]){const idx={fire:0,lava:0,shadow:11,gravity:4,life:12,bramble:8,seedburst:8}[z.type];if(idx!=null)sheetSprite('effects',idx,z.x,z.y,z.radius*2,0,.25);zoneG.circle(z.x,z.y,z.radius).stroke({width:1,color:['life','bramble','seedburst'].includes(z.type)?0x96d7a5:z.type==='gravity'?0xad88d6:0xb57862,alpha:.6});}
   for(const o of b.obstacles??[])if(!o.terrain)sheetSprite('effects',8,o.x,o.y,o.radius*2+5);
   for(const f of b.fighters){if(f.isObjective)continue;if(f.illusionTime>0&&f.decoy?.hp>0)zoneG.circle(f.decoy.x,f.decoy.y,9).fill({color:TEAM_COLORS[f.team],alpha:.5});if(f.portalTime>0&&f.gates)for(const gate of f.gates)sheetSprite('effects',15,gate.x,gate.y,30);if(f.flight>0||f.foreseen>0||f.wardHits>0)sheetSprite('effects',f.flight>0?7:f.foreseen>0?10:14,f.x,f.y,30,0,.45);}
   for(const s of b.summons??[])sheetSprite('effects',s.type==='spirit'?4:7,s.x,s.y,s.type==='spirit'?13:16);
   for(const f of b.fighters)if(!f.isObjective&&f.shield>0)sheetSprite('effects',14,f.x,f.y,33,0,(f.hp>0?.7:.25));
   // Objectives: Cores, the Titan and Forgefire auras.
   objG.clear();objGlow.begin();labels.begin();
   const glowAt=(x,y,size,color,alpha)=>{const s=objGlow.get();s.x=x;s.y=y;s.width=s.height=size;s.tint=color;s.alpha=alpha;};
   for(const c of b.cores??[]){const color=TEAM_COLORS[c.team],pct=Math.max(0,c.hp/c.maxHp),pulse=.85+.15*Math.sin(clock*3+c.team);
    objG.circle(c.x,c.y,b.objectiveRules?.guardRadius??160).fill({color,alpha:.08});glowAt(c.x,c.y,150*pulse,color,c.hitFlash>0?.9:.55);
    objG.poly([c.x,c.y-30,c.x+20,c.y,c.x,c.y+30,c.x-20,c.y]).fill({color}).stroke({width:2,color:0xffffff});if(c.hitFlash>0)objG.poly([c.x,c.y-30,c.x+20,c.y,c.x,c.y+30,c.x-20,c.y]).fill({color:0xffffff,alpha:.4});
    objG.poly([c.x,c.y-30,c.x+8,c.y-6,c.x,c.y+4,c.x-6,c.y-8]).fill({color:0xffffff,alpha:.45});
    objG.moveTo(c.x,c.y-40).arc(c.x,c.y,40,-Math.PI/2,-Math.PI/2+Math.PI*2*pct).stroke({width:5,color,alpha:.95});}
   const t=b.titan,pit=b.pit?.()??{x:640,y:300};if(t){objG.circle(pit.x,pit.y,110).stroke({width:2,color:GOLD,alpha:.3});
    if(t.hp>0){if(b.slamAt!=null){const k=1-Math.max(0,(b.slamAt-b.time)/(b.titanRules?.telegraph??.8));objG.circle(t.x,t.y,(b.titanRules?.range??90)).fill({color:0xff784a,alpha:.12+.25*k}).circle(t.x,t.y,(b.titanRules?.range??90)*k).stroke({width:3,color:0xff784a,alpha:.8});}
     glowAt(t.x,t.y,t.radius*5,0xff9a3c,.45+.15*Math.sin(clock*4));objG.circle(t.x,t.y,t.radius).fill({color:0x806047}).stroke({width:3,color:GOLD});objG.circle(t.x,t.y+4,t.radius*.38).fill({color:0xffb347,alpha:.85});
     for(let i=0;i<6;i++){const a=clock*.6+i*Math.PI/3;objG.moveTo(t.x+Math.cos(a)*(t.radius+6),t.y+Math.sin(a)*(t.radius+6)).arc(t.x,t.y,t.radius+6,a,a+.6);}objG.stroke({width:2,color:0xffc45c,alpha:.7});if(t.hitFlash>0)objG.circle(t.x,t.y,t.radius).fill({color:0xffffff,alpha:.3});
     // In portrait the screen's up is the field's +x, so the bar and label sit on that side to read upright.
     const tp=Math.max(0,t.hp/t.maxHp);if(view.portrait)objG.rect(t.x+t.radius+12,t.y-35,6,70).fill({color:0x171621}).rect(t.x+t.radius+12,t.y-35,6,70*tp).fill({color:GOLD});else objG.rect(t.x-35,t.y-t.radius-18,70,6).fill({color:0x171621}).rect(t.x-35,t.y-t.radius-18,70*tp,6).fill({color:GOLD});
     const label=labels.get();setLabel(label,'FORGE TITAN',GOLD);[label.x,label.y]=view.portrait?[t.x+t.radius+34,t.y]:[t.x,t.y-t.radius-30];upright(label);label.scale.set(label.scale.x*.55);}}
   // Trails, weapon swings and effect sprites.
   trailG.clear();lineG.clear();
   for(const f of b.fighters)for(const p of f.trail??[])trailG.circle(p.x,p.y,7).fill({color:TEAM_COLORS[f.team]??0xffffff,alpha:p.life/.16*.16});
   for(const e of b.effects??[]){if(e.kind==='swing')trailG.moveTo(e.x+Math.cos(e.angle-.9)*e.range,e.y+Math.sin(e.angle-.9)*e.range).arc(e.x,e.y,e.range,e.angle-.9,e.angle+.9).stroke({width:3,color:0xffe27a,alpha:e.life/e.max});else sheetSprite('effects',e.sprite,e.x,e.y,e.size,0,e.life/e.max);}
   sprites.end();
   shots.begin();for(const p of b.projectiles??[]){const owner=b.actorFor?.(p.owner)??b.fighters[p.owner],color=TEAM_COLORS[owner?.team]??0xffe27a;lineG.moveTo(p.x,p.y).lineTo(p.x-p.vx*.06,p.y-p.vy*.06).stroke({width:3,color,alpha:.35});if(p.sprite>=0){const s=shots.get(),tex=frameTex('effects',p.sprite);if(tex)s.texture=tex;s.x=p.x;s.y=p.y;s.width=s.height=18;s.rotation=0;}}shots.end();
   // Fighters, eased toward their simulated positions; respawns and teleports snap.
   bars.clear();
   for(const f of b.fighters){if(f.isObjective)continue;const b2=body(f);drawBody(b2,f);let pos=shown.get(f.index);if(!pos||Math.hypot(pos.x-f.x,pos.y-f.y)>120)pos={x:f.x,y:f.y};pos={x:ease(pos.x,f.x,dt,30),y:ease(pos.y,f.y,dt,30)};shown.set(f.index,pos);
    const r=b2.root;r.x=pos.x;r.y=pos.y;r.alpha=f.hp>0?(f.invisible>0?.35:1):.3;b2.flash.alpha=f.hitFlash>0?.9:0;b2.glow.alpha=f.hp>0?.5:.15;
    if(f.hp>0&&b.empowered?.(f)){const k=.6+.4*Math.sin(clock*6+f.index);glowAt(pos.x,pos.y,(f.radius??9)*6,GOLD,.35*k+.2);objG.circle(pos.x,pos.y,(f.radius??9)+7).stroke({width:f.forgeShield>0?3:1.5,color:0xffc45c,alpha:.85});}
    const angle=(f.facing??f.angle??0)+(f.swing>0?Math.sin(f.swing/.22*Math.PI)*.7:0),wt=f.weapon?frameTex('weapons',f.weapon.sprite):null;
    if(wt){b2.weapon.texture=wt;b2.weapon.visible=true;b2.weapon.width=b2.weapon.height=27;b2.weapon.x=Math.cos(angle)*16;b2.weapon.y=Math.sin(angle)*16;b2.weapon.rotation=angle+(f.weapon.sprite===5?Math.PI:0);}else b2.weapon.visible=false;
    if(f.hp>0&&f.action&&!f.action.released&&f.action.angle!=null)lineG.moveTo(pos.x,pos.y).lineTo(pos.x+Math.cos(f.action.angle)*Math.min(80,f.weapon.range),pos.y+Math.sin(f.action.angle)*Math.min(80,f.weapon.range)).stroke({width:1,color:TEAM_COLORS[f.team],alpha:.45});
    const kind=classKind(f);if(b2.kind!==kind){b2.kind=kind;drawIcon(b2.icon,kind);}b2.icon.visible=f.hp>0;b2.icon.rotation=view.portrait?Math.PI/2:0;
    if(f.hp>0){const target=b.actorFor?.(f.target)??b.fighters[f.target];if(target?.hp>0)lineG.moveTo(pos.x,pos.y).lineTo(target.x,target.y).stroke({width:1,color:TEAM_COLORS[f.team],alpha:.12});
     const k=(view.portrait?1.35:1)/camera.zoom,pct=Math.max(0,f.hp/f.maxHp),color=TEAM_COLORS[f.team],[bx,by]=view.portrait?[pos.x+21*k,pos.y-13*k]:[pos.x-13*k,pos.y-21*k],[bw,bh]=view.portrait?[4*k,26*k]:[26*k,4*k];
     bars.rect(bx,by,bw,bh).fill({color:0x05070d,alpha:.8});if(view.portrait)bars.rect(bx,by,bw,bh*pct).fill({color:pct>.5?color:pct>.25?0xffd23f:0xff5a6a});else bars.rect(bx,by,bw*pct,bh).fill({color:pct>.5?color:pct>.25?0xffd23f:0xff5a6a});
     const glyph=labels.get();setLabel(glyph,ROLE_GLYPH[f.role]||'',color);const [gx,gy]=view.portrait?[pos.x+27*k,pos.y]:[pos.x,pos.y-27*k];glyph.x=gx;glyph.y=gy;upright(glyph);glyph.scale.set(glyph.scale.x*.5);}}
   for(const [index,v]of bodies)if(!b.fighters.some(f=>f.index===index)){v.root.destroy({children:true});bodies.delete(index);}
   objGlow.end();labels.end();
   // Weather.
   weatherG.clear();const env=b.environment??{};if(['rain','storm'].includes(env.weather)){for(let i=0;i<Math.round(40*W*H/360000);i++){const x=(i*137+b.time*25)%W,y=(i*73+b.time*95)%H;weatherG.moveTo(x,y).lineTo(x-3,y+9);}weatherG.stroke({width:1,color:0xb9d5e5,alpha:.16});}if(env.weather==='frost')weatherG.rect(13,13,W-26,H-26).stroke({width:1,color:0xb0d5e9,alpha:.15});
   app.render();
  },
  destroy(){canvas.remove();app.destroy(true,{children:true,texture:false});}
 };
}

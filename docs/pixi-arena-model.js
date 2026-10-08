// Pure helpers for the enhanced (PixiJS) team-battle renderer: camera framing, easing and particle events read
// from successive battle snapshots. Nothing here touches the battle; node checks run these without WebGL.
export const CAMERA_RULES=Object.freeze({minZoom:1,maxZoom:2.2,padding:140,rate:3,engageRange:320,shakeTime:.35,shakeSize:7});
export const ease=(current,target,dt,rate)=>current+(target-current)*(1-Math.exp(-dt*rate));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function fullView(W,H){return {zoom:1,cx:W/2,cy:H/2};}
// Team battles number fighters and teams; duels use the fighter's position in the list and its side.
export const teamOf=f=>f.team??f.side;
export const fighterKey=(f,i)=>f.index??i;
// Which points the follow camera keeps in view: fighters near an enemy, plus the Titan when someone is on it.
export function actionPoints(b){
 const alive=(b.combatants??b.fighters).filter(f=>f.hp>0&&!f.isObjective),points=[];
 for(const f of alive)if(alive.some(e=>teamOf(e)!==teamOf(f)&&Math.hypot(e.x-f.x,e.y-f.y)<CAMERA_RULES.engageRange))points.push({x:f.x,y:f.y});
 if(b.titan?.hp>0&&b.titanHits?.some(h=>b.time-h.time<2))points.push({x:b.titan.x,y:b.titan.y});
 return points.length?points:alive.map(f=>({x:f.x,y:f.y}));
}
// The view that frames the action: zoom so the points fit with padding, clamped so the view never leaves the field.
export function frameView(points,W,H){
 if(!points.length)return fullView(W,H);
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const zoom=clamp(Math.min(W/(maxX-minX+CAMERA_RULES.padding*2),H/(maxY-minY+CAMERA_RULES.padding*2)),CAMERA_RULES.minZoom,CAMERA_RULES.maxZoom);
 const hw=W/2/zoom,hh=H/2/zoom;return {zoom,cx:clamp((minX+maxX)/2,hw,W-hw),cy:clamp((minY+maxY)/2,hh,H-hh)};
}
export function stepCamera(camera,target,dt,W,H){
 const zoom=ease(camera.zoom,target.zoom,dt,CAMERA_RULES.rate),hw=W/2/zoom,hh=H/2/zoom;
 return {zoom,cx:clamp(ease(camera.cx,target.cx,dt,CAMERA_RULES.rate),hw,W-hw),cy:clamp(ease(camera.cy,target.cy,dt,CAMERA_RULES.rate),hh,H-hh)};
}
// A compact copy of what the particle layer compares from frame to frame.
export function snapshot(b){
 return {time:b.time,fighters:(b.combatants??b.fighters).map((f,i)=>({index:fighterKey(f,i),team:teamOf(f),hp:f.hp,maxHp:f.maxHp,x:f.x,y:f.y})),
  cores:(b.cores??[]).map(c=>({team:c.team,hp:c.hp,x:c.x,y:c.y})),titanDeaths:b.titanDeaths?.length??0,titanStolen:!!b.titanDeaths?.at(-1)?.stolen,titan:b.titan?{x:b.titan.x,y:b.titan.y,hp:b.titan.hp}:null,slamAt:b.slamAt??null};
}
// Visual events between two snapshots: hits, heals, deaths, revives/respawns, Core hits, Titan kills and slams.
export function diffEvents(prev,cur){
 const events=[];if(!prev||cur.time<prev.time)return events;
 const before=new Map(prev.fighters.map(f=>[f.index,f]));
 for(const f of cur.fighters){const p=before.get(f.index);if(!p)continue;const delta=f.hp-p.hp;
  if(p.hp>0&&f.hp<=0)events.push({type:'death',x:f.x,y:f.y,team:f.team});
  else if(p.hp<=0&&f.hp>0)events.push({type:Math.hypot(f.x-p.x,f.y-p.y)<60?'revive':'respawn',x:f.x,y:f.y,team:f.team});
  else if(delta<0)events.push({type:'hit',x:f.x,y:f.y,team:f.team,amount:-delta,share:-delta/f.maxHp});
  else if(delta>0&&f.hp>0)events.push({type:'heal',x:f.x,y:f.y,team:f.team,amount:delta,share:delta/f.maxHp});}
 cur.cores.forEach((c,i)=>{const p=prev.cores[i];if(p&&c.hp<p.hp)events.push({type:'coreHit',x:c.x,y:c.y,team:c.team,amount:p.hp-c.hp});});
 if(cur.titanDeaths>prev.titanDeaths&&prev.titan)events.push({type:'titanKill',x:prev.titan.x,y:prev.titan.y,stolen:!!cur.titanStolen});
 if(prev.slamAt!=null&&cur.slamAt==null&&cur.titan&&cur.titan.hp>0)events.push({type:'slam',x:cur.titan.x,y:cur.titan.y});
 return events;
}
// Screen shake: a decaying offset after a slam; deterministic per time so it never needs randomness.
export function shakeOffset(shake,time){if(!(shake>0))return {x:0,y:0};const k=CAMERA_RULES.shakeSize*shake/CAMERA_RULES.shakeTime;return {x:Math.sin(time*91)*k,y:Math.cos(time*73)*k};}

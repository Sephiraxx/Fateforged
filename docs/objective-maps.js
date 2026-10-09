import {mapTerrain} from './team-maps.js';
export const OBJECTIVE_FIELD=Object.freeze({width:1280,height:600});
// minGap (team-3.9): no open gap between rocks narrower than this, so fighters never wedge between two of them.
// Rocks touching within `sealed` px form one wall and stay put; a lone rock that sits too close to another is moved
// straight away from it (or removed if there is no room), clear of the field edges, the pit and the Cores.
export const TERRAIN_RULES=Object.freeze({minGap:50,sealed:4});
export function objectiveTerrain(id,seed,{minGap=0}={}){const pieces=[];for(const o of mapTerrain(id,seed)){if(o.x===480){for(const x of [520,760])pieces.push({...o,x,y:o.y<300?150:450});}else pieces.push({...o,x:o.x<480?o.x+100:o.x+220});}const kept=pieces.filter(o=>Math.hypot(o.x-640,o.y-300)>o.radius+115);return minGap?spreadTerrain(kept,minGap):kept;}
const gapOf=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)-a.radius-b.radius;
function blocked(p){const {width:W,height:H}=OBJECTIVE_FIELD;return p.x-p.radius<40||p.x+p.radius>W-40||p.y-p.radius<30||p.y+p.radius>H-30||Math.hypot(p.x-W/2,p.y-H/2)<p.radius+115||Math.hypot(p.x-75,p.y-H/2)<p.radius+190||Math.hypot(p.x-(W-75),p.y-H/2)<p.radius+190;}
export function spreadTerrain(pieces,minGap=TERRAIN_RULES.minGap){
 // The field is mirrored, so the left half is fixed and mirrored to the right; both teams get the same layout.
 const W=OBJECTIVE_FIELD.width,mirror=o=>({...o,x:W-o.x});
 let left=pieces.filter(o=>o.x<W/2).map(o=>({...o}));const whole=()=>[...left,...left.map(mirror)];
 for(let pass=0;pass<24;pass++){
  const all=whole(),n=left.length,wall=all.map((_,i)=>i),find=i=>wall[i]===i?i:(wall[i]=find(wall[i]));
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if(gapOf(all[i],all[j])<=TERRAIN_RULES.sealed)wall[find(i)]=find(j);
  const lone=i=>all.every((_,k)=>k===i||find(k)!==find(i));let changed=false;
  for(let i=0;i<n&&!changed;i++)for(let j=0;j<all.length&&!changed;j++){
   if(j===i||j<n&&j<i)continue;const g=gapOf(all[i],all[j]);if(g<=TERRAIN_RULES.sealed||g>=minGap||find(i)===find(j))continue;
   // Candidates to move: lone left-half rocks of the pair, the smaller first.
   const movable=[i,j].filter(k=>k<n&&lone(k)).sort((a,b)=>all[a].radius-all[b].radius||b-a);if(!movable.length)continue;
   const tryMove=k=>{const other=all[k===i?j:i],b=all[k],d=Math.hypot(b.x-other.x,b.y-other.y)||1,r=other.radius+b.radius+minGap,next={...b,x:other.x+(b.x-other.x)/d*r,y:other.y+(b.y-other.y)/d*r};
    if(next.x>=W/2||blocked(next))return null;const rest=whole().filter((_,q)=>q!==k&&q!==k+n);return rest.every(o=>gapOf(o,next)>=minGap)&&gapOf(next,mirror(next))>=minGap?next:null;};
   let done=false;for(const k of movable){const next=tryMove(k);if(next){left[k]=next;done=true;break;}}
   if(!done)left.splice(movable[0],1);changed=true;
  }
  if(!changed)break;
 }
 return whole();
}

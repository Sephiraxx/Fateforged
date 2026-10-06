// Team battle fields: a 960×600 arena with optional terrain. Every map is mirrored across the centre line,
// so neither side gains ground, and terrain stays out of both spawn zones (x < 280 and x > 680).
export const TEAM_FIELD=Object.freeze({width:960,height:600});
export const TEAM_MAPS=Object.freeze([
 Object.freeze({id:'open',label:'Open field',weight:4}),
 Object.freeze({id:'pillars',label:'Pillar hall',weight:1.5}),
 Object.freeze({id:'ruins',label:'Broken ruins',weight:1.5}),
 Object.freeze({id:'crossroads',label:'Crossroads',weight:1.5}),
 Object.freeze({id:'groves',label:'Stone groves',weight:1.5})
]);
export const MAP_IDS=Object.freeze(TEAM_MAPS.map(m=>m.id));
export const mapLabel=id=>TEAM_MAPS.find(m=>m.id===id)?.label??'Open field';
function random(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// 'random' picks by weight from the battle seed with its own salt, so time, weather and ground rolls are unchanged.
export function resolveMap(seed,choice='random'){
 if(MAP_IDS.includes(choice))return choice;
 const total=TEAM_MAPS.reduce((n,m)=>n+m.weight,0);let roll=random((seed^0x5bd1e995)>>>0)()*total;
 for(const m of TEAM_MAPS){roll-=m.weight;if(roll<0)return m.id;}return 'open';
}
// Terrain pieces are circles (the engine's obstacle shape). Pieces either touch (walls are chains of circles)
// or leave at least a 40-unit gap, so fighters never wedge between two rocks.
export function mapTerrain(id,seed){
 const r=random((seed^0x2c1b3c6d)>>>0),j=n=>(r()-.5)*2*n,pieces=[],{width,height}=TEAM_FIELD,mid=width/2;
 const add=(x,y,radius)=>{pieces.push({x,y,radius});if(Math.abs(x-mid)>1)pieces.push({x:width-x,y,radius});};
 if(id==='pillars'){for(const y of [150,450])add(340+j(20),y+j(25),22+r()*6);if(r()<.5)add(mid,height/2+j(40),26);else{add(mid,95+j(15),18);add(mid,505+j(15),18);}}
 else if(id==='ruins'){const x=372+j(10),gap=j(18);for(let y=86;y<=226;y+=28)add(x,y+gap,13);for(let y=374;y<=514;y+=28)add(x,y+gap,13);add(mid-42,height/2+j(10),15);}
 else if(id==='crossroads'){const y=height/2+j(12);add(mid,y,32);add(mid-72,y-82,16);add(mid-72,y+82,16);add(395+j(15),70+j(8),20);add(395+j(15),530+j(8),20);}
 else if(id==='groves'){const placed=[];for(let n=0;n<40&&placed.length<6;n++){const p={x:300+r()*138,y:60+r()*480,radius:10+r()*7};if(placed.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>q.radius+p.radius+46)){placed.push(p);add(p.x,p.y,p.radius);}}}
 const round=v=>Math.round(v*10)/10;
 return pieces.map(p=>({x:round(p.x),y:round(p.y),radius:round(p.radius),life:Infinity,terrain:true}));
}

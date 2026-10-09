// Team battles: 3v3 and 5v5 with every fighter on the field.
// TeamBattle extends the frozen combat 12 duel engine (validation/v12-engine-lock.json), so stats, weapons,
// damage maths and ability effects are identical to duels. Each fighter's `side` is its unique index (combat 12
// stores owners as fighter indexes); `team` decides friend or foe. Only the two-fighter core is replaced: the
// step loop, environment upkeep, projectile hits, threat checks, ally-targeted support and the win check.
import {Battle as DuelBattle,random} from './combat-v12.js';
import {weaponProperties} from './abilities-v12.js';
import {teamRole} from './team-roles.js';
import {TEAM_FIELD,resolveMap,mapTerrain} from './team-maps.js';
export const TEAM_ENGINE_VERSION='team-2';
export const TEAM_TIME_LIMIT=120;
export const TEAM_SIZES=Object.freeze([2,3,5]);
export const TEAM_TACTICS=Object.freeze(['balanced','protect-carry','focus-healer','aggressive','defensive']);
export const CC_IMMUNITY=2.5;
// Team-only role mechanics (see TEAM-BATTLES.md).
export const TEAM_RULES=Object.freeze({provokeRange:110,provokeScore:3.5,fortified:.35,bulwarkRange:80,bulwarkShare:.25,exposedTime:3,exposedBonus:.15,overtime:75,overtimeHealing:.5,overtimeDamage:1.2});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segmentDistance=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t);};
// A stand-in target that reads like a copy of t with some fields replaced. Movement only reads its targets, so a
// prototype link gives the same answers as copying all of a fighter's ~150 fields every step.
const lookAlike=(t,fields)=>Object.assign(Object.create(t),fields);
const angleGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
// Timer lists mirror combat 12's environment and technique layers.
const TIMERS=['exposed','wet','root','sleep','poison','bleed','regeneration','absorption','flight','invisible','insight','blind','amnesia','suppressed','disarmed','spiritArmor','shape','sizeTime','soul','chrono','deathMark','winded','illusionTime','portalTime','wardTime','futureTime','mindTime'];
const TECHNIQUE_TIMERS=['guardTime','parryTime','perfectTime','counterTime','lastStandTime','crippled','brambleSlow'];
const HARD_CONTROL=['sleep','root','amnesia','suppressed'];
// The per-step timer updates, written out field by field: the same arithmetic in the same order as looping over the
// lists above, without a keyed property lookup per timer per fighter per step.
export function tickTimers(f,dt){f.exposed=Math.max(0,f.exposed-dt);f.wet=Math.max(0,f.wet-dt);f.root=Math.max(0,f.root-dt);f.sleep=Math.max(0,f.sleep-dt);f.poison=Math.max(0,f.poison-dt);f.bleed=Math.max(0,f.bleed-dt);f.regeneration=Math.max(0,f.regeneration-dt);f.absorption=Math.max(0,f.absorption-dt);f.flight=Math.max(0,f.flight-dt);f.invisible=Math.max(0,f.invisible-dt);f.insight=Math.max(0,f.insight-dt);f.blind=Math.max(0,f.blind-dt);f.amnesia=Math.max(0,f.amnesia-dt);f.suppressed=Math.max(0,f.suppressed-dt);f.disarmed=Math.max(0,f.disarmed-dt);f.spiritArmor=Math.max(0,f.spiritArmor-dt);f.shape=Math.max(0,f.shape-dt);f.sizeTime=Math.max(0,f.sizeTime-dt);f.soul=Math.max(0,f.soul-dt);f.chrono=Math.max(0,f.chrono-dt);f.deathMark=Math.max(0,f.deathMark-dt);f.winded=Math.max(0,f.winded-dt);f.illusionTime=Math.max(0,f.illusionTime-dt);f.portalTime=Math.max(0,f.portalTime-dt);f.wardTime=Math.max(0,f.wardTime-dt);f.futureTime=Math.max(0,f.futureTime-dt);f.mindTime=Math.max(0,f.mindTime-dt);}
export function tickTechniqueTimers(f,dt){f.guardTime=Math.max(0,f.guardTime-dt);f.parryTime=Math.max(0,f.parryTime-dt);f.perfectTime=Math.max(0,f.perfectTime-dt);f.counterTime=Math.max(0,f.counterTime-dt);f.lastStandTime=Math.max(0,f.lastStandTime-dt);f.crippled=Math.max(0,f.crippled-dt);f.brambleSlow=Math.max(0,f.brambleSlow-dt);}
export function tickCombatTimers(f,dt){f.swing=Math.max(0,f.swing-dt);f.slow=Math.max(0,f.slow-dt);f.shield=Math.max(0,f.shield-dt);f.evade=Math.max(0,f.evade-dt);f.hitFlash=Math.max(0,f.hitFlash-dt);f.stagger=Math.max(0,f.stagger-dt);}
// Ages a fighter's movement trail in place (the same points survive as with a filtered copy).
export function ageTrail(f,dt){const trail=f.trail;let kept=0;for(let i=0;i<trail.length;i++){const x=trail[i];if((x.life-=dt)>0)trail[kept++]=x;}trail.length=kept;}
const ALLY_SUPPORT=new Set(['healing','regeneration','force','spiritArmor']);
const ROLE_ORDER={tank:0,damage:1,controller:2,healer:3};
const SPAWN_X={tank:250,damage:190,controller:165,healer:125};
// Powers that need no line of sight to the enemy (self buffs, repositioning, ally support).
const SELF_POWERS=new Set(['teleport','shadow','illusion','invisible','flight','portal','regeneration','absorption','force','spiritArmor','healing','size','mind','future','life','mirror','phoenix','rewind','crystal','guard','parry','secondWind','lastStand','perfectCounter','shapeshift']);
const MOBILITY=new Set(['charge','teleport','portal','space']);
// Formation postures by tactic: leash = how far the front may run ahead of its back line, pull = slot discipline,
// strafe = sideways drift while fighting, dive = when melee damage dealers may leave the formation.
export const TEAM_POSTURES=Object.freeze({
 balanced:Object.freeze({leash:130,pull:1,strafe:.2,dive:'exposed',peel:1}),
 'protect-carry':Object.freeze({leash:100,pull:1.25,strafe:.16,dive:'none',peel:1.6}),
 'focus-healer':Object.freeze({leash:140,pull:.9,strafe:.2,dive:'flank',peel:1,call:'healer'}),
 aggressive:Object.freeze({leash:210,pull:.6,strafe:.3,dive:'all',peel:.6}),
 defensive:Object.freeze({leash:90,pull:1.5,strafe:.14,dive:'none',peel:1.3,hold:12})
});
const SUPPORT_RANGE=240;

export class TeamBattle extends DuelBattle{
 constructor(teams,seed=1,options={}){
  if(!Array.isArray(teams)||teams.length!==2||teams.some(t=>!Array.isArray(t)||!t.length))throw new Error('A team battle needs two non-empty teams.');
  super(teams[0][0],teams[1][0],seed,options);
  this.mode='team';this.size=Math.max(teams[0].length,teams[1].length);this.timeLimit=options.timeLimit??TEAM_TIME_LIMIT;
  this.tactics=[0,1].map(i=>TEAM_TACTICS.includes(options.tactics?.[i])?options.tactics[i]:'balanced');
  this.winnerTeam=null;this.healSource=null;
  const conditions={...this.environment},roster=[];teams.forEach((members,team)=>members.forEach(character=>roster.push({character,team})));
  this.fighters=roster.map(({character,team},index)=>{
   // A throwaway duel builds a fully initialised combat 12 fighter, so every layer's fields exist.
   const f=new DuelBattle(character,character,seed,{conditions,headless:true}).fighters[0];
   const role=options.roles?.[character.id]??teamRole(character).role;
   return Object.assign(f,{side:index,index,team,role,target:null,retarget:.05+index*.03,supportTarget:null,ccImmune:0,wasHard:false,exposed:0,creditedDown:false,ccSeconds:0,kills:0,deaths:0,downed:false,healingDone:0,lastAttacker:null,regenPower:null,regenSource:null,facing:team?Math.PI:0,orbit:team?-1:1,think:.2+index*.07,cooldown:.25+(index%3)*.1,cast:.8+(index%4)*.15});
  });
  // A 960×600 field with a seeded map; neutral features sit on the centre line or point-mirrored.
  this.width=TEAM_FIELD.width;this.height=TEAM_FIELD.height;this.center={x:this.width/2,y:this.height/2};
  this.environment.map=resolveMap(this.seed,options.map??options.conditions?.map??'random');this.obstacles=mapTerrain(this.environment.map,this.seed);
  this.wisps.forEach((w,i)=>{w.x=i?600:360;w.y=i?130:470;});this.food.forEach((x,i)=>{x.x=i?this.width-140:140;x.y=i?490:110;});Object.assign(this.relic,{x:this.center.x,y:this.center.y});
  for(const team of [0,1]){
   // Formation block: tanks in front, damage behind them, controllers and healers at the back.
   const members=this.fighters.filter(f=>f.team===team).sort((a,b)=>ROLE_ORDER[a.role]-ROLE_ORDER[b.role]||a.index-b.index),byRole={};
   for(const f of members)(byRole[f.role]??=[]).push(f);
   for(const list of Object.values(byRole))list.forEach((f,i)=>{const x=SPAWN_X[f.role]+(i%2)*10,y=this.center.y+(i-(list.length-1)/2)*(list.length>2?90:120)+(f.role==='damage'&&list.length===1?40:0);f.x=team?this.width-x:x;f.y=clamp(y,60,this.height-60);});
  }
  this.plans=[null,null];this.planTimer=0;this.updatePlans();
 }
 clampX(x){return clamp(x,18,this.width-18);}
 clampY(y){return clamp(y,18,this.height-18);}
 // Line of sight: terrain and earth pillars block the straight line between two points.
 clearShot(a,b){return !this.obstacles.some(o=>segmentDistance(o.x,o.y,a.x,a.y,b.x,b.y)<o.radius+3);}
 // A waypoint around whatever blocks the straight walk from f to point p. Walls are chains of circles, so the
 // waypoint follows the chain to its end; the shorter way round wins, and the chosen side sticks for a moment.
 detour(f,p){
  if(f.flight>0)return null;let first=null,near=Infinity;for(const o of this.obstacles){if(segmentDistance(o.x,o.y,f.x,f.y,p.x,p.y)>=o.radius+f.radius+2)continue;const d=dist(f,o);if(d<near){near=d;first=o;}}if(!first){f.detourSide=0;return null;}
  const dx=p.x-f.x,dy=p.y-f.y,len=Math.hypot(dx,dy)||1,px=-dy/len,py=dx/len;
  const around=side=>{let o=first;for(let k=0;k<10;k++){const r=o.radius+f.radius+20,w={x:this.clampX(o.x+px*r*side),y:this.clampY(o.y+py*r*side)},inside=this.obstacles.find(q=>q!==o&&Math.hypot(q.x-w.x,q.y-w.y)<q.radius+f.radius+4);if(!inside)return w;o=inside;}return null;};
  const options=[1,-1].map(side=>{const w=around(side);return w&&{side,w,cost:dist(f,w)+dist(w,p)};}).filter(Boolean);if(!options.length)return null;
  options.sort((a,b)=>a.cost-b.cost);const kept=options.find(o=>o.side===f.detourSide);const pick=kept&&kept.cost<options[0].cost*1.25?kept:options[0];f.detourSide=pick.side;return pick.w;
 }
 // Repeat until clear: leaving one stone of a wall can mean stepping into the next.
 pushOutOfTerrain(f){if(f.flight>0)return;for(let pass=0;pass<4;pass++){let moved=false;for(const o of this.obstacles){const dx=f.x-o.x,dy=f.y-o.y,d=Math.hypot(dx,dy),min=o.radius+f.radius;if(d<min-1e-6){const angle=d?Math.atan2(dy,dx):f.team*Math.PI;f.x=this.clampX(o.x+Math.cos(angle)*min);f.y=this.clampY(o.y+Math.sin(angle)*min);moved=true;}}if(!moved)return;}}
 enemiesOf(f){return this.fighters.filter(e=>e.team!==f.team&&e.hp>0);}
 alliesOf(f,self=false){return this.fighters.filter(a=>a.team===f.team&&a.hp>0&&(self||a!==f));}
 ownerTeam(object){return this.fighters[object.owner]?.team;}
 teamHealth(team){let hp=0,max=0;for(const f of this.fighters)if(f.team===team){hp+=Math.max(0,f.hp);max+=f.maxHp;}return max?hp/max:0;}
 centroid(list){if(!list.length)return {...this.center};return {x:list.reduce((n,f)=>n+f.x,0)/list.length,y:list.reduce((n,f)=>n+f.y,0)/list.length};}
 nearestEnemy(f,point=f){let best=null,d=Infinity;for(const e of this.enemiesOf(f)){const n=dist(point,e);if(n<d){d=n;best=e;}}return best;}
 // ---------- Formation: a team plan every 0.5 s ----------
 // Facing axis u (towards the enemy), lateral axis v, a front point F (the tanks), a called focus target,
 // enemies inside our back line, and a slot for every fighter: tanks on F, ranged damage and controllers behind it,
 // healers at the back, melee damage dealers (skirmishers) on a flank.
 isSkirmisher(f){return f.role==='damage'&&f.weapon.type==='melee';}
 // The formation posture for a team's tactic; later engines may adjust it per mode.
 posture(team){return TEAM_POSTURES[this.tactics[team]];}
 updatePlans(){
  const previous=this.plans;this.plans=[0,1].map(team=>{
   const mine=this.fighters.filter(f=>f.team===team&&f.hp>0),foes=this.fighters.filter(f=>f.team!==team&&f.hp>0);if(!mine.length||!foes.length)return null;
   const posture=this.posture(team),c=this.centroid(mine),ec=this.centroid(foes),old=previous?.[team];
   let ux=ec.x-c.x,uy=ec.y-c.y,len=Math.hypot(ux,uy);if(len<1){ux=team?-1:1;uy=0;len=1;}ux/=len;uy/=len;
   if(old){ux=ux*.5+old.u.x*.5;uy=uy*.5+old.u.y*.5;const n=Math.hypot(ux,uy)||1;ux/=n;uy/=n;}
   const u={x:ux,y:uy},v={x:-uy,y:ux},along=f=>(f.x-c.x)*ux+(f.y-c.y)*uy;
   // Without tanks the front is a point ahead of the group, so the formation keeps advancing instead of backing away.
   const tanks=mine.filter(f=>f.role==='tank'),tc=this.centroid(tanks),F=tanks.length?tc:{x:this.clampX(c.x+ux*60),y:this.clampY(c.y+uy*60)},engaged=foes.some(e=>dist(e,F)<280),hold=posture.hold&&!engaged&&this.time<posture.hold;
   // Back line: everyone who is neither a tank nor a skirmisher on a dive.
   const back=mine.filter(f=>f.role!=='tank'&&!f.diving),B=back.length?this.centroid(back):F;
   const threats=new Set(foes.filter(e=>back.some(a=>a.role!=='damage'||a.weapon.type!=='melee'?dist(e,a)<130:false)).map(e=>e.index));
   const enemyTanks=foes.filter(e=>e.role==='tank'),exposed=e=>e.role!=='tank'&&!enemyTanks.some(t=>dist(t,e)<110);
   let called=null,best=-Infinity;
   for(const e of foes){let score=(1-e.hp/e.maxHp)*2.2+{healer:1.5,damage:1.2,controller:.9,tank:0}[e.role]-dist(e,F)/170;if(!exposed(e)&&e.role!=='tank')score-=.6;if(posture.call==='healer'&&e.role==='healer')score+=1.6;if(threats.has(e.index))score+=1.5;if(e.index===old?.called)score+=.5;if(score>best){best=score;called=e.index;}}
   const slots={},spread=mine.length>3?1.2:1,place=(f,back,lateral)=>{slots[f.index]={x:this.clampX(F.x-u.x*back+v.x*lateral*spread),y:this.clampY(F.y-u.y*back+v.y*lateral*spread),back};};
   if(mine.length===1)return {u,v,F,B,engaged,hold:false,called,threats,slots:{},posture,exposed,hurt:null,along,alone:true};
   const groups={tank:[],ranged:[],controller:[],healer:[],skirmisher:[]};for(const f of mine)groups[f.role==='tank'?'tank':f.role==='healer'?'healer':f.role==='controller'?'controller':this.isSkirmisher(f)?'skirmisher':'ranged'].push(f);
   const fan=(list,width)=>list.map((f,i)=>[f,list.length>1?(i/(list.length-1)-.5)*width:0]);
   for(const [f,l]of fan(groups.tank,80))place(f,0,l);
   for(const [f,l]of fan(groups.ranged,140))place(f,groups.tank.length?95:30,l);
   for(const [f,l]of fan(groups.controller,110))place(f,groups.tank.length?100:45,l+(groups.ranged.length===1?-50:0));
   for(const [f,l]of fan(groups.healer,90))place(f,groups.tank.length?145:90,l);
   groups.skirmisher.forEach((f,i)=>place(f,15,(i%2?-1:1)*(110+20*Math.floor(i/2))));
   // Skirmishers dive only when the posture allows it: onto exposed back-liners, or whenever their mobility move is ready.
   for(const f of groups.skirmisher){
    if(f.diving){if(f.hp<f.maxHp*.45||this.time-f.diveStart>3.5||!this.fighters[f.diveTarget]||this.fighters[f.diveTarget].hp<=0){f.diving=false;f.diveRest=this.time+4;}continue;}
    if(posture.dive==='none'||this.time<(f.diveRest??0)||f.hp<f.maxHp*.6)continue;
    const prey=foes.filter(e=>e.role!=='tank').sort((a,b)=>(posture.dive==='flank'?(b.role==='healer')-(a.role==='healer'):0)||dist(f,a)-dist(f,b))[0];if(!prey)continue;
    const mobile=f.powers.some(p=>MOBILITY.has(p.id))&&f.cast<=0&&dist(f,prey)<300;
    if(posture.dive==='all'||exposed(prey)||mobile){f.diving=true;f.diveStart=this.time;f.diveTarget=prey.index;}
   }
   return {u,v,F,B,engaged,hold,called,threats,slots,posture,exposed,hurt:mine.filter(f=>f.hp<f.maxHp*.6).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]?.index??null,along};
  });
 }
 // Who is f fighting? Re-scored every 0.35 s, never every step.
 chooseTarget(f){
  const enemies=this.enemiesOf(f);if(!enemies.length)return null;const tactic=this.tactics[f.team],plan=this.plans[f.team],slot=plan?.slots[f.index]??f,ranged=f.weapon.type!=='melee';let best=null,bestScore=-Infinity;
  if(f.diving&&this.fighters[f.diveTarget]?.hp>0)return this.fighters[f.diveTarget];
  for(const e of enemies){
   const d=dist(f,e);let score=-d/(tactic==='aggressive'?90:60)+(1-e.hp/e.maxHp)*2.4;
   if(f.role==='damage'||f.role==='controller')score+={healer:1.4,controller:.8,damage:.6,tank:-1.1}[e.role];
   if(f.role==='tank')score+=e.role==='tank'?-.4:.3;
   const victim=e.target===null?null:this.fighters[e.target];
   if(victim&&victim.team===f.team&&victim!==f&&victim.role!=='tank'&&dist(e,victim)<e.weapon.range+60)score+=(f.role==='tank'||f.role==='controller'?2:.6)+(tactic==='protect-carry'?1.5:0);
   if(e.role==='tank'&&d<TEAM_RULES.provokeRange)score+=TEAM_RULES.provokeScore;// Provoke: a nearby tank draws attention.
   if(e.invisible>0&&!f.insight)score-=1.5;
   if(e.index===f.target)score+=.8;
   if(plan){
    if(e.index===plan.called)score+=f.role==='tank'?.6:1.2;// Focus fire on the called target.
    if(plan.threats.has(e.index))score+=(f.role==='tank'||f.role==='controller'?2.5:1.2)*plan.posture.peel;// Peel for our back line.
    // Hold the shape: fight what can be reached from the slot instead of chasing across the field.
    const reach=ranged?f.weapon.range+40:f.role==='tank'?plan.posture.leash+60:140;score-=Math.max(0,dist(slot,e)-reach)/70;
    if(ranged&&!this.clearShot(f,e))score-=1.5;
   }
   if(score>bestScore){bestScore=score;best=e;}
  }
  return best;
 }
 // Healers hold their slot behind the tanks, drift towards whoever is hurt, and back off from attackers.
 healerAnchor(f,t){
  const plan=this.plans[f.team],threat=this.nearestEnemy(f);
  if(threat&&dist(f,threat)<90){const d=dist(f,threat)||1;return {x:this.clampX(f.x+(f.x-threat.x)/d*120),y:this.clampY(f.y+(f.y-threat.y)/d*120)};}
  if(!plan)return {x:f.x,y:f.y};const hurt=plan.hurt===null||plan.hurt===f.index?null:this.fighters[plan.hurt],slot=plan.slots[f.index];
  if(hurt&&dist(hurt,slot)>SUPPORT_RANGE*.7)return {x:this.clampX(hurt.x-plan.u.x*100),y:this.clampY(hurt.y-plan.u.y*100)};
  return slot;
 }
 // Movement intent for the shared mover: a formation slot with a pull, and a leash on how far forward to go.
 moveTeamFighter(f,t,dt){
  const plan=this.plans[f.team];f.intent=null;
  if(plan?.alone){this.moveFighter(f,t,dt);return;}// A last survivor fights freely.
  if(f.role==='healer'&&!f.raging&&!(f.shape>0)){
   const anchor=this.healerAnchor(f,t),weapon=f.weapon;f.weapon={...weapon,type:'melee',range:24};f.intent={support:true};
   this.moveFighter(f,lookAlike(t,{x:anchor.x,y:anchor.y,vx:0,vy:0,illusionTime:0,action:null,weapon:{...t.weapon,type:'melee'}}),dt);f.weapon=weapon;
   f.angle=Math.atan2(t.y-f.y,t.x-f.x);if(!f.action)f.facing=f.angle;if(!['Asleep','Bound','Dodge','Seek food'].includes(f.actionLabel))f.actionLabel='Support';return;
  }
  if(plan&&!f.raging&&!(f.shape>0)){
   const posture=plan.posture,slot=plan.slots[f.index];
   if(f.role==='tank')f.intent={slot,pull:.45*posture.pull,leash:plan.hold?{ref:this.holdPoint(f.team),max:0}:{ref:plan.B,max:posture.leash+20},u:plan.u,strafe:posture.strafe};
   else if(f.diving)f.intent={slot,pull:0,leash:null,u:plan.u,strafe:posture.strafe};
   // A fighter back on its feet before the next plan update (Phoenix rebirth) has no slot yet and moves freely.
   else if(slot)f.intent={slot,pull:posture.pull*(this.isSkirmisher(f)?.8:1.1),leash:{ref:plan.F,max:50-slot.back},u:plan.u,strafe:posture.strafe};
  }
  this.moveFighter(f,t,dt);
 }
 holdPoint(team){return {x:team?this.width*.66:this.width*.34,y:this.center.y};}
 // Combat 12's movement layers (Charge travel, environment pre-steps, contact steering), forked for the wide
 // field, terrain avoidance and the formation intent. The duel engine itself is untouched.
 moveFighter(f,t,dt){
  if(f.action?.type==='technique'&&f.action.power.id==='charge'&&!f.action.released){
   const a=f.action;if(f.root>0||f.sleep>0||f.stagger>0||f.amnesia>0)return;const remaining=Math.max(0,Math.min(90-a.travel,dist(f,t)-24)),step=Math.min(remaining,360*dt),dx=Math.cos(a.angle),dy=Math.sin(a.angle),point={x:this.clampX(f.x+dx*step),y:this.clampY(f.y+dy*step)};
   if(!this.obstacles.some(o=>segmentDistance(o.x,o.y,f.x,f.y,point.x,point.y)<o.radius+f.radius)){f.x=point.x;f.y=point.y;a.travel+=step;}else a.elapsed=a.windup;f.angle=a.angle;f.vx=dx*360;f.vy=dy*360;f.actionLabel='Charge';return;
  }
  const move=f.move;if(f.crippled>0)f.move*=.7;else if(f.brambleSlow>0)f.move*=.75;
  if(f.sleep>0||f.root>0){f.vx=f.vy=0;f.actionLabel=f.sleep>0?'Asleep':'Bound';f.move=move;return;}
  let target=this.targetFor(f,t);const hungry=f.weakness==='needs constant food'&&f.nutrition<30;
  if(hungry){const food=this.food.filter(x=>x.ready<=this.time).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0];if(food){target=lookAlike(t,{x:food.x,y:food.y});f.actionLabel='Seek food';f.intent=null;}}
  const weapon=f.weapon;if(f.raging||f.shape>0||hungry)f.weapon={...f.weapon,type:'melee',range:24};const old={x:f.x,y:f.y,roll:f.roll};this.steer(f,target,dt);f.weapon=weapon;
  if(f.roll>old.roll){if(f.energy<18){f.roll=0;f.x=old.x;f.y=old.y;}else{f.energy-=18;if(f.weakness==='exhaustion'){f.winded=.8;f.cooldown=Math.max(f.cooldown,.8);this.warn(f,'winded',`${f.name} is winded after the burst.`);}}}
  if(hungry)f.actionLabel='Seek food';this.pushOutOfTerrain(f);
  if(f.portalTime>0&&!f.portalUsed&&f.gates&&Math.hypot(f.x-f.gates[0].x,f.y-f.gates[0].y)<24&&this.usefulPortal(f,t)){f.x=f.gates[1].x;f.y=f.gates[1].y;f.portalUsed=true;this.effect(15,f.x,f.y,32);if(this.rules?.portalExit){f.evade=Math.max(f.evade,.5);f.cooldown=0;}this.log(`${f.name} passes through a portal.`);}
  f.move=move;if(f.action?.type==='cast')f.actionLabel='Casting '+f.action.power.name;
 }
 steer(f,t,dt){
  // Melee fighters, and ranged fighters without a line, walk around blocking terrain.
  const way=(f.weapon.type==='melee'||!this.clearShot(f,t))?this.detour(f,t):null,aim=way??t;
  const dx=t.x-f.x,dy=t.y-f.y,d=Math.hypot(dx,dy)||1,wx=aim.x-f.x,wy=aim.y-f.y,wd=Math.hypot(wx,wy)||1,nx=wx/wd,ny=wy/wd,melee=f.weapon.type==='melee',intent=f.intent,formed=!!intent&&!intent.support;f.think-=dt;f.rollCooldown-=dt;
  if(f.think<=0){f.think=1.2+this.rng()*1.4;if(this.rng()<.35)f.orbit*=-1;}
  this.dodgeThreat(f,t);if(melee&&t.weapon.type!=='melee'&&d>60&&d<250&&f.rollCooldown<=0&&!f.action&&f.cooldown<=0&&(!formed||f.diving||f.role==='tank'&&d<170)){f.rollX=nx;f.rollY=ny;f.roll=.22;f.rollCooldown=2.8;f.evade=.1;this.metrics.dashes++;this.log(`${f.name} rushes forward.`);}
  // Fighting in formation means little sideways drift: the duel engine's wide orbit is what scattered teams.
  const sway=formed?intent.strafe:null;let radial,strafe,desired;
  if(melee){desired=f.weapon.range*.76;if(f.action){radial=t.weapon.type!=='melee'?(f.action.elapsed<f.action.windup?1:.65):f.action.elapsed<f.action.windup?.38:-.35;strafe=(sway??.32)*f.orbit;f.actionLabel=f.action.elapsed<f.action.windup?'Wind up':'Recover';}else if(t.weapon.type==='melee'&&f.cooldown>.2&&d<f.weapon.range+15){radial=-.55;strafe=(sway===null?.65:sway*1.8)*f.orbit;f.actionLabel='Circle';}else{radial=d>desired?1:-.22;strafe=(sway??.32)*f.orbit;f.actionLabel=d>80?'Pursue':'Close in';}}
  else{desired=Math.min(f.weapon.range*.83,165+f.tactics*22);radial=clamp((d-desired)/50,-1,1);strafe=(sway??.62+.2*f.tactics)*f.orbit;f.actionLabel=d<85?'Retreat':'Strafe';if(way){radial=1;strafe=0;f.actionLabel='Find a line';}if(d<60&&f.rollCooldown<=0&&!f.action){f.rollX=-nx;f.rollY=-ny;f.roll=.25;f.rollCooldown=3.8;f.actionLabel='Disengage';this.metrics.dashes++;}}
  if(melee&&way){radial=1;strafe=0;f.actionLabel='Go around';}
  let x=nx*radial-ny*strafe,y=ny*radial+nx*strafe;
  if(formed){
   // Pull towards the formation slot, harder the further away it is.
   const sx=intent.slot.x-f.x,sy=intent.slot.y-f.y,sd=Math.hypot(sx,sy);if(sd>1&&intent.pull>0){const pull=intent.pull*clamp((sd-22)/70,0,1.6);x+=sx/sd*pull;y+=sy/sd*pull;if(pull>.6&&!f.action)f.actionLabel='Formation';}
   // Leash: never run further forward than the posture allows.
   if(intent.leash){const u=intent.u,ahead=(f.x-intent.leash.ref.x)*u.x+(f.y-intent.leash.ref.y)*u.y,forward=x*u.x+y*u.y;if(ahead>intent.leash.max&&forward>0){const back=Math.min(1,(ahead-intent.leash.max)/40)*.6;x-=u.x*(forward+back);y-=u.y*(forward+back);}}
  }
  // Walk around terrain instead of grinding into it.
  if(f.flight<=0){const m=Math.hypot(x,y);if(m>.05){const hx=x/m,hy=y/m;for(const o of this.obstacles){const ox=o.x-f.x,oy=o.y-f.y,ahead=ox*hx+oy*hy,reach=70+o.radius;if(ahead<=0||ahead>reach)continue;const side=hx*oy-hy*ox;if(Math.abs(side)>o.radius+f.radius+8)continue;const w=(1-ahead/reach)*1.3,sign=side>0?-1:1;x+=-hy*sign*w;y+=hx*sign*w;}}}
  // Steer along the walls instead of backing into them.
  const W=this.width,H=this.height;if(f.x<65)x+=(65-f.x)/28;if(f.x>W-65)x-=(f.x-(W-65))/28;if(f.y<65)y+=(65-f.y)/28;if(f.y>H-65)y-=(f.y-(H-65))/28;
  if(f.roll>0){x=f.rollX*2.7;y=f.rollY*2.7;f.roll-=dt;}const mag=Math.hypot(x,y);if(mag>1&&f.roll<=0){x/=mag;y/=mag;}
  const slow=f.slow>0?.6:1,stamina=/exhaustion|limited stamina|food/.test(f.weakness)?Math.max(.55,1-this.time/180):1,actionSlow=f.action?.type==='shot'?.65:1,stagger=f.stagger>0?.3:1;const pursuit=melee&&t.weapon.type!=='melee'&&d>f.weapon.range+20&&radial>0&&!f.action&&!f.roll&&!f.stagger?(t.weapon.type==='arcane'?(this.rules?.pursuitArcane??1.15):1.10):1;const targetX=x*f.move*pursuit*slow*stamina*actionSlow*stagger,targetY=y*f.move*pursuit*slow*stamina*actionSlow*stagger,blend=Math.min(1,dt*12);f.vx+=(targetX-f.vx)*blend;f.vy+=(targetY-f.vy)*blend;f.x=this.clampX(f.x+f.vx*dt);f.y=this.clampY(f.y+f.vy*dt);if(!this.headless&&f.hp>0&&Math.hypot(f.vx,f.vy)>20){f.trail.push({x:f.x,y:f.y,life:.16});if(f.trail.length>10)f.trail.shift();}
  f.angle=Math.atan2(t.y-f.y,t.x-f.x);f.facing=f.action?.angle??f.angle;
 }
 push(t,f,d){const angle=Math.atan2(t.y-f.y,t.x-f.x);t.x=this.clampX(t.x+Math.cos(angle)*d);t.y=this.clampY(t.y+Math.sin(angle)*d);}
 teleportDestination(f,t){
  const rng=random((this.seed^Math.imul(f.castCount+1,104729)^Math.imul(f.index+1,7919))>>>0),radius=f.weapon.type==='melee'?40:150,desired=this.preferredRange(f),currentError=Math.abs(Math.hypot(t.x-f.x,t.y-f.y)-desired),threat=this.incomingThreat(f,t);
  let best=null,bestScore=Infinity;
  for(let n=0;n<4;n++){const angle=rng()*Math.PI*2,x=this.clampX(t.x+Math.cos(angle)*radius),y=this.clampY(t.y+Math.sin(angle)*radius),error=Math.abs(Math.hypot(t.x-x,t.y-y)-desired);
   if(!threat&&currentError-error<25)continue;if(this.obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.radius+f.radius))continue;
   const score=error+(this.incomingThreat(f,t,'any',x,y)?200:0);if(score<bestScore){bestScore=score;best={x,y};}
  }return best;
 }
 // Ranged weapons need a clear line; enemy-directed powers too (see powerUtility).
 startAttack(f,t){if(f.weapon.type!=='melee'&&!f.raging&&!(f.shape>0)&&!this.clearShot(f,t))return;super.startAttack(f,t);}
 // Threat checks consider every enemy and ignore allied projectiles.
 threatened(f){return this.enemiesOf(f).some(e=>dist(e,f)<e.weapon.range+35)||this.projectiles.some(p=>this.ownerTeam(p)!==f.team&&Math.hypot(p.x-f.x,p.y-f.y)<130);}
 enemyAttackThreat(f,t,kind,x,y,accepts){
  if(t.hp<=0||t.sleep>0||t.amnesia>0||t.stagger>0||t.roll>0)return false;const a=t.action,distance=Math.hypot(x-t.x,y-t.y);
  if(a?.type==='cast')return (kind==='any'||accepts(false,a.power.id!=='memory'))&&a.elapsed<a.windup&&distance<=(a.power.id==='storm'?300:220);
  if(a?.released)return false;
  const melee=t.weapon.type==='melee',delay=a?Math.max(0,a.windup-a.elapsed):Math.max(0,t.cooldown)+(melee?.23:.22),physical=melee||t.weapon.type==='ranged',magical=t.weapon.type==='arcane'||!!weaponProperties(t.weapon.name).holy;
  if(!accepts(physical,magical)||t.disarmed>0&&weaponProperties(t.weapon.name).metal||t.weapon.type==='arcane'&&(t.suppressed>0||t.weakness==='silenced casting'))return false;
  return melee?delay<=.75&&distance<=t.weapon.range+16:delay+distance/290<=.75&&distance<=t.weapon.range+8;
 }
 incomingThreat(f,t,kind='any',x=f.x,y=f.y){
  const accepts=(physical,magical)=>kind==='any'||kind==='physical'&&physical||kind==='magical'&&magical;
  for(const p of this.projectiles){
   if(this.ownerTeam(p)===f.team||!accepts(p.type==='physical',p.type!=='physical'||!!p.tags?.holy))continue;
   const vx=p.vx-(f.vx||0),vy=p.vy-(f.vy||0),dx=x-p.x,dy=y-p.y,speed2=vx*vx+vy*vy;if(!speed2)continue;const arrival=(dx*vx+dy*vy)/speed2;
   if(arrival<0||arrival>.75||p.life!==undefined&&arrival>p.life)continue;if(Math.hypot(dx-vx*arrival,dy-vy*arrival)<=f.radius+p.radius+3)return true;
  }
  return this.enemiesOf(f).some(e=>this.enemyAttackThreat(f,e,kind,x,y,accepts));
 }
 dodgeThreat(f,t){
  if(f.weakness==='overconfidence'||f.raging||f.energy<18||f.sleep>0||f.root>0||f.rollCooldown>0||f.action?.type==='melee'||f.stagger>0)return;let threat=null;
  for(const p of this.projectiles){if(this.ownerTeam(p)===f.team)continue;const rx=f.x-p.x,ry=f.y-p.y,speed2=p.vx*p.vx+p.vy*p.vy,arrival=(rx*p.vx+ry*p.vy)/speed2;if(arrival<0||arrival>.5)continue;if(Math.hypot(rx-p.vx*arrival,ry-p.vy*arrival)<22+f.tactics*12){threat={x:-p.vy,y:p.vx};break;}}
  if(!threat)for(const e of this.enemiesOf(f))if(e.action?.type==='melee'&&dist(e,f)<e.weapon.range+35&&e.action.elapsed<e.action.windup){threat={x:-(f.y-e.y),y:f.x-e.x};break;}
  if(threat){const n=Math.hypot(threat.x,threat.y)||1;let sign=f.orbit;if(threat.x*(this.center.x-f.x)+threat.y*(this.center.y-f.y)<0)sign*=-1;f.rollX=threat.x/n*sign;f.rollY=threat.y/n*sign;f.roll=.23;f.rollCooldown=3.4-f.tactics*.8;f.evade=.25;f.actionLabel='Dodge';this.metrics.dodges++;this.log(`${f.name} sidesteps an attack.`);}
 }
 underFire(ally,kind='any'){return this.enemiesOf(ally).some(e=>e.target===ally.index&&dist(e,ally)<e.weapon.range+45)||this.incomingThreat(ally,ally,kind);}
 // Support spells may land on a teammate instead of the caster.
 supportChoice(f,p){
  const weak=f.weakness;if(f.mana<this.powerCost(p)||f.suppressed>0||weak==='silenced casting'&&p.voice||this.night&&weak==='loses power at night'||!this.night&&weak==='loses power in daylight'||weak==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return null;
  let best=null;
  for(const ally of this.alliesOf(f)){
   if(dist(f,ally)>SUPPORT_RANGE||!this.clearShot(f,ally))continue;const pct=ally.hp/ally.maxHp,tank=ally.role==='tank'?4:0;let value=-1;
   if(p.id==='healing'&&(pct<=.7||['burn','poison','bleed'].some(k=>ally[k]>.5)))value=100+(1-pct)*30+tank;
   if(p.id==='regeneration'&&pct<=.85&&ally.regeneration<=.5)value=74+(1-pct)*10+tank;
   if(p.id==='force'&&ally.wardTime<=.5&&this.underFire(ally))value=72+tank;
   if(p.id==='spiritArmor'&&ally.spiritArmor<=.5&&this.underFire(ally,'physical'))value=72+tank;
   if(value>(best?.value??-1))best={ally,value};
  }
  return best;
 }
 lifeSpot(f){const hurt=this.alliesOf(f,true).filter(a=>a.hp<a.maxHp*.85);if(!hurt.length)return null;let best=null,count=0;for(const a of hurt){const n=hurt.filter(b=>dist(a,b)<110).length;if(n>count){count=n;best=a;}}return count>=2?{...this.centroid(hurt.filter(b=>dist(best,b)<110)),count}:null;}
 powerUtility(f,t,p,copied=false){
  if(!SELF_POWERS.has(p.id)&&!this.clearShot(f,t))return -1;// Enemy-directed powers need a line of sight.
  if(MOBILITY.has(p.id)&&!copied){const own=super.powerUtility(f,t,p,copied);return own>=0&&(f.diving?dist(f,t)>90:this.isSkirmisher(f)&&f.hp<f.maxHp*.45&&this.threatened(f))?own+25:own;}
  if(copied||!(ALLY_SUPPORT.has(p.id)||p.id==='life'))return super.powerUtility(f,t,p,copied);
  const own=super.powerUtility(f,t,p,copied);
  if(p.id==='life'){const spot=f.suppressed>0?null:this.lifeSpot(f);return spot&&f.mana>=this.powerCost(p)&&!this.zones.some(z=>z.owner===f.index&&z.type==='life'&&z.life>.5)?Math.max(own,70+spot.count*4):own;}
  const choice=this.supportChoice(f,p);if(choice&&choice.value>own){f.supportTarget=choice.ally.index;return choice.value;}
  f.supportTarget=null;return own;
 }
 usePower(f,t,p,copied=false){
  const ally=f.supportTarget===null?null:this.fighters[f.supportTarget];f.supportTarget=null;
  if(!copied&&ally&&ally!==f&&ally.hp>0&&ALLY_SUPPORT.has(p.id)){
   const duration=this.duration(f,null,4);
   if(p.id==='healing'){this.healSource=f;this.heal(ally,f.spell*1.15);this.healSource=null;ally.burn=ally.poison=ally.bleed=0;}
   if(p.id==='regeneration'){ally.regeneration=duration;ally.regenPower=f.spell;ally.regenSource=f.index;}
   if(p.id==='force'){ally.wardHits=2;ally.shield=duration;ally.wardTime=duration;}
   if(p.id==='spiritArmor')ally.spiritArmor=duration;
   this.effect(p.sprite,ally.x,ally.y,32);this.log(`${f.name} casts ${p.name} on ${ally.name}.`);return true;
  }
  if(p.id==='regeneration'){f.regenPower=null;f.regenSource=null;}
  if(p.id==='life'&&!copied){const spot=this.lifeSpot(f)??f;this.zone(f,'life',spot.x,spot.y,70,this.duration(f,null,4)+2);return true;}
  if(['earth','illusion','portal'].includes(p.id)&&!copied){
   // Combat 12 clamps these to its 600-unit square; re-place them on the wide field.
   const before=this.obstacles.length,done=super.usePower(f,t,p,copied);
   if(p.id==='earth'&&this.obstacles.length>before){const o=this.obstacles.at(-1);o.x=clamp((f.x+t.x)/2,35,this.width-35);o.y=clamp((f.y+t.y)/2,35,this.height-35);}
   if(p.id==='illusion'&&f.decoy)f.decoy.x=this.clampX(f.x+(f.team?-55:55));
   if(p.id==='portal'&&f.gates){const angle=this.rng()*Math.PI*2;f.gates[0].x=this.clampX(f.x+Math.cos(f.angle)*14);f.gates[1]={x:this.clampX(t.x+Math.cos(angle)*75),y:this.clampY(t.y+Math.sin(angle)*75)};}
   return done;
  }
  if(p.id==='reality'){f.invisible=0;for(const projectile of this.projectiles){if(this.ownerTeam(projectile)===f.team)continue;projectile.owner=f.index;const angle=Math.atan2(t.y-projectile.y,t.x-projectile.x),speed=Math.hypot(projectile.vx,projectile.vy);projectile.vx=Math.cos(angle)*speed;projectile.vy=Math.sin(angle)*speed;}t.wardHits=0;t.shield=t.spiritArmor=0;this.hit(f,t,f.spell*.3,'reality');return true;}
  return super.usePower(f,t,p,copied);
 }
 updateAttack(f,t,dt){
  const action=f.action,cleave=action?.type==='technique'&&action.power?.id==='cleave'&&!action.released;super.updateAttack(f,t,dt);
  // Cleave's wide arc also catches other enemies standing in it.
  if(cleave&&action.released&&f.weapon.type!=='ranged')for(const e of this.enemiesOf(f)){if(e===t||dist(f,e)>f.weapon.range+16||angleGap(Math.atan2(e.y-f.y,e.x-f.x),action.angle)>=1.6)continue;this.hitContext={tags:weaponProperties(f.weapon.name),technique:true,weaponHit:true};this.hurt(e,f,f.damage*.75,'physical',true);this.hitContext=null;}
 }
 hurt(t,f,amount,type='physical',canDodge=true){
  if(f&&t&&f!==t&&f.team===t.team)return false;// No friendly fire.
  const enemy=f&&!t.isDecoy&&f!==t&&f.team!==t.team;
  if(enemy){
   if(this.time>=TEAM_RULES.overtime)amount*=TEAM_RULES.overtimeDamage;
   if(t.exposed>0&&f.role!=='controller')amount*=1+TEAM_RULES.exposedBonus;
   if(t.role==='tank')amount*=1-TEAM_RULES.fortified;
   // Bulwark: a nearby tank takes a share of the blow meant for an ally.
   const guard=t.role==='tank'?null:this.alliesOf(t).find(a=>a.role==='tank'&&dist(a,t)<TEAM_RULES.bulwarkRange&&a.sleep<=0);
   if(guard&&amount>0){const share=amount*TEAM_RULES.bulwarkShare*(1-TEAM_RULES.fortified),context=this.hitContext;amount-=amount*TEAM_RULES.bulwarkShare;this.hitContext={periodic:true};super.hurt(guard,f,share,type,false);this.hitContext=context;this.creditDown(guard,f);}
  }
  const before=t.hp,x0=t.x,y0=t.y,connected=super.hurt(t,f,amount,type,canDodge);
  // Combat 12's knockback clamps x to its 600-unit square; redo it on the wide field.
  if(type==='physical'&&f&&f!==t&&t.x===582&&x0>=567){const angle=Math.atan2(y0-f.y,x0-f.x),push=Math.min(14,3+f.damage/12);t.x=this.clampX(x0+Math.cos(angle)*push);}
  if(enemy){if(t.hp<before){t.lastAttacker=f.index;if(f.role==='controller'&&type!=='physical')t.exposed=TEAM_RULES.exposedTime;}if(before>0&&t.hp<=0)f.kills++;}
  return connected;
 }
 creditDown(t,f){if(t.hp<=0&&!t.creditedDown){t.creditedDown=true;f.kills++;t.lastAttacker=f.index;}}
 heal(f,amount){if(this.time>=TEAM_RULES.overtime)amount*=TEAM_RULES.overtimeHealing;const gained=super.heal(f,amount);if(gained>0)(this.healSource??f).healingDone+=gained;return gained;}
 environmentStep(dt){
  // Technique timers and second wind (combat 12 layer).
  for(const f of this.fighters){tickTechniqueTimers(f,dt);if(f.guardTime<=0)f.guardReady=false;if(f.windRemaining>0){const period=Math.min(dt,f.windRemaining);this.heal(f,f.windHealing*period);f.windRemaining-=period;}}
  for(const z of this.zones){const f=this.fighters[z.owner];if(!f||f.hp<=0)continue;for(const t of this.enemiesOf(f)){
   if(z.type==='seedburst'&&this.time+dt>=z.due&&dist(z,t)<z.radius)this.periodicHit(f,t,z.damage,'arcane');
   if(z.type==='bramble'&&dist(z,t)<z.radius&&t.flight<=0)t.brambleSlow=Math.max(t.brambleSlow,.10);if(z.type==='bramble'&&z.tick+dt>=.5&&dist(z,t)<z.radius)this.periodicHit(f,t,z.damage*.5,'arcane');}
   if(z.type==='seedburst'&&this.time+dt>=z.due){z.life=0;this.effect(8,z.x,z.y,60);}}
  // Mirrors, chain lightning and singularities (powers layer).
  for(const f of this.fighters){f.mirrorTime=Math.max(0,f.mirrorTime-dt);if(f.mirrorTime<=0)f.mirrorHits=0;if(!f.mirrorHits||f.hp<=0)continue;for(const p of this.projectiles){if(this.ownerTeam(p)===f.team)continue;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,dx=nx-p.x,dy=ny-p.y,along=clamp(((f.x-p.x)*dx+(f.y-p.y)*dy)/(dx*dx+dy*dy||1),0,1);if(Math.hypot(p.x+dx*along-f.x,p.y+dy*along-f.y)>f.radius+p.radius+12)continue;const t=this.fighters[f.target]?.hp>0?this.fighters[f.target]:this.nearestEnemy(f);if(!t)break;p.owner=f.index;const angle=Math.atan2(t.y-p.y,t.x-p.x),speed=Math.hypot(p.vx,p.vy);p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;f.mirrorHits--;this.effect(14,f.x,f.y,30);this.log(`${f.name}'s mirror reflects a projectile.`);if(!f.mirrorHits)break;}}
  this.lightningPulses=this.lightningPulses.filter(p=>{if(p.due>this.time)return true;const f=this.fighters[p.owner],t=f&&(this.fighters[f.target]?.hp>0?this.fighters[f.target]:this.nearestEnemy(f));if(f?.hp>0&&t){if(dist(t,f)<=450){const damage=f.damageDone;this.hurt(t,f,f.spell*.26,'lightning',true);if(f.damageDone>damage&&p.opening){t.action=null;t.stagger=Math.max(t.stagger,.12);}this.emitSound(f,t.x,t.y,260);this.effect(2,t.x,t.y,38);}else this.log(`${f.name}'s lightning dissipates beyond its reach.`);}return false;});
  for(const z of this.zones.filter(z=>z.singularity)){z.pulse+=dt;if(z.pulse<.5)continue;z.pulse=0;const f=this.fighters[z.owner];if(!f)continue;for(const t of this.enemiesOf(f))if(dist(t,z)<z.radius)this.hit(f,t,z.damage*.5,'void');}
  // Arena, zones, summons and interception (environment layer).
  for(const w of this.wisps){w.phase+=dt*.35;w.x=clamp(w.x+Math.cos(w.phase)*dt*8,30,this.width-30);w.y=clamp(w.y+Math.sin(w.phase)*dt*8,30,this.height-30);}
  if(this.environment.weather==='storm'&&this.time>=this.nextThunder){this.nextThunder+=8;this.effect(2,this.center.x,this.center.y,60);this.emitSound(null,this.center.x,this.center.y,700);this.log('Thunder rolls over the arena.');}
  this.obstacles=this.obstacles.filter(o=>(o.life-=dt)>0);
  this.zones=this.zones.filter(z=>{z.life-=dt;z.tick+=dt;const owner=this.fighters[z.owner];for(const f of this.fighters){if(f.hp<=0||!owner||dist(f,z)>z.radius)continue;const ally=f.team===owner.team;
   if(z.type==='gravity'&&!ally&&f.flight<=0){const dx=z.x-f.x,dy=z.y-f.y,d=Math.hypot(dx,dy)||1;f.x=this.clampX(f.x+dx/d*dt*(z.pull??35));f.y=this.clampY(f.y+dy/d*dt*(z.pull??35));f.slow=Math.max(f.slow,.1);}
   if(z.type==='shadow'){if(ally)f.invisible=Math.max(f.invisible,.12);else f.slow=Math.max(f.slow,.12);}
   if(z.tick>=.5){if(['fire','lava'].includes(z.type)&&!ally)this.hit(owner,f,z.damage*.5,z.type);if(z.type==='life'&&ally){this.healSource=owner;this.heal(f,owner.spell*.12);this.healSource=null;f.nutrition=Math.min(100,f.nutrition+12);}}}
   if(z.tick>=.5)z.tick=0;return z.life>0;});
  this.summons=this.summons.filter(s=>{s.life-=dt;s.cooldown-=dt;const f=this.fighters[s.owner];if(!f||f.hp<=0)return false;const t=this.fighters[f.target]?.hp>0?this.fighters[f.target]:this.nearestEnemy(f,s);if(!t)return s.life>0;
   if(s.type==='spirit'){s.angle+=dt*2;s.x=f.x+Math.cos(s.angle)*20;s.y=f.y+Math.sin(s.angle)*20;if(s.cooldown<=0){s.cooldown=1.15;const angle=Math.atan2(t.y-s.y,t.x-s.x);this.projectiles.push({x:s.x,y:s.y,vx:Math.cos(angle)*185,vy:Math.sin(angle)*185,owner:s.owner,damage:f.spell*.3,type:'spirit',sprite:4,life:3,radius:4});}}
   else{const dx=t.x-s.x,dy=t.y-s.y,d=Math.hypot(dx,dy)||1;s.x=this.clampX(s.x+dx/d*100*dt);s.y=this.clampY(s.y+dy/d*100*dt);if(d<22&&s.cooldown<=0){s.cooldown=.8;this.hit(f,t,f.damage*(this.rules?.beastDamage??.30),'physical');}}
   return s.life>0;});
  this.projectiles=this.projectiles.filter(p=>{const x=p.x+p.vx*dt,y=p.y+p.vy*dt,team=this.ownerTeam(p);
   for(const actor of this.fighters)if(actor.team!==team&&actor.illusionTime>0&&actor.decoy?.hp>0&&segmentDistance(actor.decoy.x,actor.decoy.y,p.x,p.y,x,y)<9+p.radius){actor.illusionTime=0;actor.decoy.hp=0;this.effect(10,actor.decoy.x,actor.decoy.y,22);this.log('A projectile breaks an illusion.');return false;}
   for(const o of this.obstacles)if(segmentDistance(o.x,o.y,p.x,p.y,x,y)<o.radius+p.radius){this.effect(8,o.x,o.y,22);return false;}
   for(const w of this.wisps)if(w.hp>0&&segmentDistance(w.x,w.y,p.x,p.y,x,y)<5+p.radius){w.hp=Math.max(0,w.hp-p.damage);this.log('A projectile strikes a neutral wisp.');return false;}
   return true;});
 }
 upkeep(f,dt){
  // Per-fighter conditions, mirroring combat 12's environment layer with team-aware credit.
  const base=f.original;tickTimers(f,dt);f.burn=Math.max(0,f.burn-dt);f.periodic+=dt;f.energy=Math.min(f.maxEnergy,f.energy+dt*(f.weakness==='limited stamina'?5:11));
  if(f.weakness==='needs constant food')f.nutrition=Math.max(0,f.nutrition-dt*2.2);
  for(const food of this.food)if(food.ready<=this.time&&Math.hypot(f.x-food.x,f.y-food.y)<20){food.ready=this.time+10;f.nutrition=Math.min(100,f.nutrition+70);f.mana=Math.min(f.maxMana,f.mana+8);this.log(`${f.name} takes an arena ration.`);}
  if(this.environment.weather==='rain'||this.environment.weather==='storm'||this.environment.ground==='water'&&f.flight<=0)f.wet=Math.max(f.wet,.1);
  f.raging=f.weakness==='uncontrollable rage'&&f.hp<f.maxHp*.45;f.move=base.move*(f.shape>0?1.2:1)*(f.chrono>0?.75:1)*(f.winded>0?.55:1)*(f.nutrition<30?.7:1);if(f.weakness==='water'&&f.wet>0)f.move*=.72;if(f.weakness==='extreme cold'&&this.environment.weather==='frost')f.move*=.78;
  f.damage=base.damage*(f.raging?1.15:1)*(f.shape>0?1.15:1)*(this.rules?.sizeBuff&&f.sizeTime>0&&!f.sizeSmall?1.15:1);f.interval=base.interval*(f.chrono>0?1.5:1);f.accuracy=(base.accuracy+(this.rules?.mindBuff&&f.mindTime>0?.08:0))*(f.blind>0||f.amnesia>0?.65:1)*(f.weakness==='water'&&f.wet>0?.8:1);f.dodge=base.dodge+(this.rules?.mindBuff&&f.mindTime>0?.08:0)+(f.sizeTime>0&&f.sizeSmall?.15:0);f.radius=f.sizeTime>0?(f.sizeSmall?7:11):9;f.weapon={...base.weapon,range:base.weapon.range+(f.sizeTime>0&&!f.sizeSmall&&base.weapon.type==='melee'?12:0)};
  if(f.soul>0){const owner=this.fighters[f.soulOwner];if(owner?.hp>0){const d=dist(f,owner);if(d>85){f.move*=.65;const angle=Math.atan2(owner.y-f.y,owner.x-f.x);f.x=this.clampX(f.x+Math.cos(angle)*dt*15);f.y=this.clampY(f.y+Math.sin(angle)*dt*15);}const mana=Math.min(f.mana,dt*4);f.mana-=mana;owner.mana=Math.min(owner.maxMana,owner.mana+mana);}}
  if(f.periodic>=.5){const period=f.periodic;f.periodic=0;const enemy=this.fighters[f.lastAttacker]??this.nearestEnemy(f)??f;
   if(f.burn>0)this.periodicHit(enemy,f,(f.burnDamage||enemy.spell*.065)*period,'fire');if(f.poison>0)this.periodicHit(enemy,f,f.poisonDamage*period,'poison');if(f.bleed>0)this.periodicHit(enemy,f,f.bleedDamage*period,'blood');
   if(f.regeneration>0){this.healSource=this.fighters[f.regenSource]??f;this.heal(f,(f.regenPower??f.spell)*.2*period);this.healSource=null;}
   let environmental=0;if(f.weakness==='extreme cold'&&this.environment.weather==='frost'){environmental+=f.maxHp*.0015*period;this.warn(f,'cold',`${f.name} suffers from the frost.`);}if(f.weakness==='sunlight'&&!this.night&&this.environment.weather==='clear'){environmental+=f.maxHp*.0015*period*(this.environment.time==='day'?1:.5);this.warn(f,'sunlight',`${f.name} is hurt by the sunlight.`);}if(f.weakness==='a cursed relic'&&this.relic.active&&Math.hypot(f.x-this.relic.x,f.y-this.relic.y)<this.relic.radius){environmental+=f.maxHp*.003*period;f.mana=Math.max(0,f.mana-period*5);this.warn(f,'relic',`${f.name} is drained by the cursed relic.`);}f.hp=Math.max(0,f.hp-environmental);}
 }
 step(dt=1/60){
  if(this.done)return;dt=clamp(dt,.001,.05);this.environmentStep(dt);const burnStates=[];
  for(const f of this.fighters){if(f.hp<=0)continue;this.upkeep(f,dt);burnStates[f.index]=f.burn;f.burn=0;}
  this.time+=dt;this.planTimer-=dt;if(this.planTimer<=0){this.planTimer=.5;this.updatePlans();}
  for(const f of this.fighters){
   if(f.hp<=0){f.action=null;continue;}
   f.retarget-=dt;let t=f.target===null?null:this.fighters[f.target];
   if(!t||t.hp<=0||f.retarget<=0){t=this.chooseTarget(f);f.target=t?.index??null;f.retarget=.35;}
   f.cooldown-=dt;f.cast-=dt;tickCombatTimers(f,dt);ageTrail(f,dt);f.mana=Math.min(f.maxMana,f.mana+dt*(.6+f.magic/45));
   if(!t)continue;this.moveTeamFighter(f,t,dt);this.startAttack(f,t);this.updateAttack(f,t,dt);this.castPower(f,t);
  }
  const living=this.fighters.filter(f=>f.hp>0);
  for(let i=0;i<living.length;i++)for(let j=i+1;j<living.length;j++){const a=living[i],b=living[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=20)continue;const angle=d?Math.atan2(dy,dx):(a.index-b.index)*.7,push=(20-d)/2;a.x=this.clampX(a.x-Math.cos(angle)*push);a.y=this.clampY(a.y-Math.sin(angle)*push);b.x=this.clampX(b.x+Math.cos(angle)*push);b.y=this.clampY(b.y+Math.sin(angle)*push);}
  this.projectiles=this.projectiles.filter(p=>{
   const oldX=p.x,oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;const owner=this.fighters[p.owner];let target=null,closest=Infinity;
   for(const t of this.fighters){if(t.hp<=0||t.team===owner.team||segmentDistance(t.x,t.y,oldX,oldY,p.x,p.y)>=t.radius+p.radius)continue;const along=Math.hypot(t.x-oldX,t.y-oldY);if(along<closest){closest=along;target=t;}}
   if(target){const before=target.hp,previous=this.hitContext;this.hitContext=p;this.hurt(target,owner,p.damage,p.type);this.hitContext=previous;if(target.hp<before){if(p.type==='ice'||p.type==='control')target.slow=p.duration||2;if(p.type==='fire')target.burn=p.duration||2;}return false;}
   return p.life>0&&p.x>=0&&p.y>=0&&p.x<=this.width&&p.y<=this.height;});
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  // Knockback, pulls, swaps and separation can all shove a fighter into terrain: settle everyone last.
  for(const f of this.fighters)if(f.hp>0)this.pushOutOfTerrain(f);
  for(const f of this.fighters){f.burn=Math.max(f.burn,burnStates[f.index]||0);if(f.wardTime<=0)f.wardHits=0;if(f.futureTime<=0)f.foreseen=0;this.rebirth(f);
   if(f.hp<=0){if(!f.downed){f.downed=true;f.deaths++;f.action=null;this.log(`${f.name} is down.`);}continue;}f.downed=false;f.creditedDown=false;
   // Hard control diminishing returns: a fresh lock is shrugged off for a moment after the last one ends.
   f.ccImmune=Math.max(0,f.ccImmune-dt);const hard=HARD_CONTROL.some(k=>f[k]>0);
   if(hard&&!f.wasHard&&f.ccImmune>0){for(const k of HARD_CONTROL)f[k]=0;this.warn(f,'cc-immune',`${f.name} shrugs off the control.`);continue;}
   if(hard)f.ccSeconds+=dt;else if(f.wasHard)f.ccImmune=CC_IMMUNITY;f.wasHard=hard;
  }
  const up=[0,1].map(team=>this.fighters.some(f=>f.team===team&&f.hp>0));
  if(!up[0]||!up[1]||this.time>=this.timeLimit){
   this.done=true;const knockout=!up[0]||!up[1];this.reason=knockout?'Team eliminated':'Time limit: team health %, then damage, then seeded coin toss';
   const health=[0,1].map(team=>this.teamHealth(team)),damage=[0,1].map(team=>this.fighters.filter(f=>f.team===team).reduce((n,f)=>n+f.damageDone,0));
   this.winnerTeam=!up[0]&&up[1]?1:!up[1]&&up[0]?0:Math.abs(health[0]-health[1])>.00001?(health[0]>health[1]?0:1):damage[0]!==damage[1]?(damage[0]>damage[1]?0:1):(this.rng()<.5?0:1);this.winner=this.winnerTeam;
   this.log(`${this.winnerTeam?'Red':'Blue'} team wins. ${this.reason}.`);
  }
 }
 result(){
  if(!this.done)throw new Error('Battle is still running.');
  return {mode:'team',size:this.size,seed:this.seed,teams:[0,1].map(team=>this.fighters.filter(f=>f.team===team).map(f=>f.id)),winnerTeam:this.winnerTeam,seconds:Math.round(this.time*10)/10,reason:this.reason,hp:[0,1].map(team=>Math.round(this.teamHealth(team)*100)),combatVersion:TEAM_ENGINE_VERSION,tactics:[...this.tactics],environment:{...this.environment},
   fighters:this.fighters.map(f=>({id:f.id,team:f.team,role:f.role,hp:Math.round(Math.max(0,f.hp)/f.maxHp*100),damage:Math.round(f.damageDone),healing:Math.round(f.healingDone),kills:f.kills,deaths:f.deaths,ccSeconds:Math.round(f.ccSeconds*10)/10}))};
 }
}
export function simulateTeam(teams,seed,options={}){const battle=new TeamBattle(teams,seed,{...options,headless:options.headless??true});while(!battle.done)battle.step(1/60);return battle.result();}

// Team battles: 3v3 and 5v5 with every fighter on the field.
// TeamBattle extends the frozen combat 12 duel engine (validation/v12-engine-lock.json), so stats, weapons,
// damage maths and ability effects are identical to duels. Each fighter's `side` is its unique index (combat 12
// stores owners as fighter indexes); `team` decides friend or foe. Only the two-fighter core is replaced: the
// step loop, environment upkeep, projectile hits, threat checks, ally-targeted support and the win check.
import {Battle as DuelBattle} from './combat-v12.js';
import {weaponProperties} from './abilities-v12.js';
import {teamRole} from './team-roles.js';
export const TEAM_ENGINE_VERSION='team-1';
export const TEAM_TIME_LIMIT=120;
export const TEAM_SIZES=Object.freeze([3,5]);
export const TEAM_TACTICS=Object.freeze(['balanced','protect-carry','focus-healer','aggressive','defensive']);
export const CC_IMMUNITY=2.5;
// Team-only role mechanics (see TEAM-BATTLES.md).
export const TEAM_RULES=Object.freeze({provokeRange:110,provokeScore:3.5,fortified:.35,bulwarkRange:80,bulwarkShare:.25,exposedTime:3,exposedBonus:.15,overtime:75,overtimeHealing:.5,overtimeDamage:1.2});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segmentDistance=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t);};
const angleGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
// Timer lists mirror combat 12's environment and technique layers.
const TIMERS=['exposed','wet','root','sleep','poison','bleed','regeneration','absorption','flight','invisible','insight','blind','amnesia','suppressed','disarmed','spiritArmor','shape','sizeTime','soul','chrono','deathMark','winded','illusionTime','portalTime','wardTime','futureTime','mindTime'];
const TECHNIQUE_TIMERS=['guardTime','parryTime','perfectTime','counterTime','lastStandTime','crippled','brambleSlow'];
const HARD_CONTROL=['sleep','root','amnesia','suppressed'];
const ALLY_SUPPORT=new Set(['healing','regeneration','force','spiritArmor']);
const ROLE_ORDER={tank:0,damage:1,controller:2,healer:3};
const SPAWN_X={tank:215,damage:168,controller:132,healer:100};
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
  for(const team of [0,1]){
   const members=this.fighters.filter(f=>f.team===team).sort((a,b)=>ROLE_ORDER[a.role]-ROLE_ORDER[b.role]||a.index-b.index),gap=members.length>3?92:118;
   members.forEach((f,i)=>{const x=SPAWN_X[f.role]+(i%2)*8,y=300+(i-(members.length-1)/2)*gap;f.x=team?600-x:x;f.y=clamp(y,40,560);});
  }
 }
 enemiesOf(f){return this.fighters.filter(e=>e.team!==f.team&&e.hp>0);}
 alliesOf(f,self=false){return this.fighters.filter(a=>a.team===f.team&&a.hp>0&&(self||a!==f));}
 ownerTeam(object){return this.fighters[object.owner]?.team;}
 teamHealth(team){let hp=0,max=0;for(const f of this.fighters)if(f.team===team){hp+=Math.max(0,f.hp);max+=f.maxHp;}return max?hp/max:0;}
 centroid(list){if(!list.length)return {x:300,y:300};return {x:list.reduce((n,f)=>n+f.x,0)/list.length,y:list.reduce((n,f)=>n+f.y,0)/list.length};}
 nearestEnemy(f,point=f){let best=null,d=Infinity;for(const e of this.enemiesOf(f)){const n=dist(point,e);if(n<d){d=n;best=e;}}return best;}
 // Who is f fighting? Re-scored every 0.35 s, never every step.
 chooseTarget(f){
  const enemies=this.enemiesOf(f);if(!enemies.length)return null;const tactic=this.tactics[f.team],home=this.centroid(this.alliesOf(f,true));let best=null,bestScore=-Infinity;
  for(const e of enemies){
   const d=dist(f,e);let score=-d/(tactic==='aggressive'?90:60)+(1-e.hp/e.maxHp)*2.4;
   if(f.role==='damage'||f.role==='controller')score+={healer:1.4,controller:.8,damage:.6,tank:-1.1}[e.role];
   if(f.role==='tank')score+=e.role==='tank'?-.4:.3;
   const victim=e.target===null?null:this.fighters[e.target];
   if(victim&&victim.team===f.team&&victim!==f&&victim.role!=='tank'&&dist(e,victim)<e.weapon.range+60)score+=(f.role==='tank'||f.role==='controller'?2:.6)+(tactic==='protect-carry'?1.5:0);
   if(e.role==='tank'&&d<TEAM_RULES.provokeRange)score+=TEAM_RULES.provokeScore;// Provoke: a nearby tank draws attention.
   if(tactic==='focus-healer'&&e.role==='healer')score+=2;
   if(tactic==='defensive')score-=Math.hypot(e.x-home.x,e.y-home.y)/120;
   if(e.invisible>0&&!f.insight)score-=1.5;
   if(e.index===f.target)score+=.8;
   if(score>bestScore){bestScore=score;best=e;}
  }
  return best;
 }
 // Healers hold a point behind the frontline, near whoever needs them, and back off from attackers.
 healerAnchor(f,t){
  const allies=this.alliesOf(f),enemies=this.enemiesOf(f),threat=this.nearestEnemy(f);
  if(threat&&dist(f,threat)<90){const d=dist(f,threat)||1;return {x:clamp(f.x+(f.x-threat.x)/d*120,40,560),y:clamp(f.y+(f.y-threat.y)/d*120,40,560)};}
  const hurt=allies.filter(a=>a.hp<a.maxHp*.6).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],front=allies.filter(a=>a.role==='tank'),anchor=hurt??(front.length?this.centroid(front):this.centroid(allies.length?allies:[f])),enemy=this.centroid(enemies.length?enemies:[t]);
  const dx=anchor.x-enemy.x,dy=anchor.y-enemy.y,d=Math.hypot(dx,dy)||1;return {x:clamp(anchor.x+dx/d*80,40,560),y:clamp(anchor.y+dy/d*80,40,560)};
 }
 moveTeamFighter(f,t,dt){
  if(f.role!=='healer'||f.raging||f.shape>0)return this.moveFighter(f,t,dt);
  const anchor=this.healerAnchor(f,t),weapon=f.weapon;f.weapon={...weapon,type:'melee',range:24};
  this.moveFighter(f,{...t,x:anchor.x,y:anchor.y,vx:0,vy:0,illusionTime:0,action:null,weapon:{...t.weapon,type:'melee'}},dt);f.weapon=weapon;
  f.angle=Math.atan2(t.y-f.y,t.x-f.x);if(!f.action)f.facing=f.angle;if(!['Asleep','Bound','Dodge','Seek food'].includes(f.actionLabel))f.actionLabel='Support';
 }
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
  if(threat){const n=Math.hypot(threat.x,threat.y)||1;let sign=f.orbit;if(threat.x*(300-f.x)+threat.y*(300-f.y)<0)sign*=-1;f.rollX=threat.x/n*sign;f.rollY=threat.y/n*sign;f.roll=.23;f.rollCooldown=3.4-f.tactics*.8;f.evade=.25;f.actionLabel='Dodge';this.metrics.dodges++;this.log(`${f.name} sidesteps an attack.`);}
 }
 underFire(ally,kind='any'){return this.enemiesOf(ally).some(e=>e.target===ally.index&&dist(e,ally)<e.weapon.range+45)||this.incomingThreat(ally,ally,kind);}
 // Support spells may land on a teammate instead of the caster.
 supportChoice(f,p){
  const weak=f.weakness;if(f.mana<this.powerCost(p)||f.suppressed>0||weak==='silenced casting'&&p.voice||this.night&&weak==='loses power at night'||!this.night&&weak==='loses power in daylight'||weak==='power needs a sacrifice'&&f.hp<=f.maxHp*.03)return null;
  let best=null;
  for(const ally of this.alliesOf(f)){
   if(dist(f,ally)>SUPPORT_RANGE)continue;const pct=ally.hp/ally.maxHp,tank=ally.role==='tank'?4:0;let value=-1;
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
  const before=t.hp,connected=super.hurt(t,f,amount,type,canDodge);
  if(enemy){if(t.hp<before){t.lastAttacker=f.index;if(f.role==='controller'&&type!=='physical')t.exposed=TEAM_RULES.exposedTime;}if(before>0&&t.hp<=0)f.kills++;}
  return connected;
 }
 creditDown(t,f){if(t.hp<=0&&!t.creditedDown){t.creditedDown=true;f.kills++;t.lastAttacker=f.index;}}
 heal(f,amount){if(this.time>=TEAM_RULES.overtime)amount*=TEAM_RULES.overtimeHealing;const gained=super.heal(f,amount);if(gained>0)(this.healSource??f).healingDone+=gained;return gained;}
 environmentStep(dt){
  // Technique timers and second wind (combat 12 layer).
  for(const f of this.fighters){for(const key of TECHNIQUE_TIMERS)f[key]=Math.max(0,f[key]-dt);if(f.guardTime<=0)f.guardReady=false;if(f.windRemaining>0){const period=Math.min(dt,f.windRemaining);this.heal(f,f.windHealing*period);f.windRemaining-=period;}}
  for(const z of this.zones){const f=this.fighters[z.owner];if(!f||f.hp<=0)continue;for(const t of this.enemiesOf(f)){
   if(z.type==='seedburst'&&this.time+dt>=z.due&&dist(z,t)<z.radius)this.periodicHit(f,t,z.damage,'arcane');
   if(z.type==='bramble'&&dist(z,t)<z.radius&&t.flight<=0)t.brambleSlow=Math.max(t.brambleSlow,.10);if(z.type==='bramble'&&z.tick+dt>=.5&&dist(z,t)<z.radius)this.periodicHit(f,t,z.damage*.5,'arcane');}
   if(z.type==='seedburst'&&this.time+dt>=z.due){z.life=0;this.effect(8,z.x,z.y,60);}}
  // Mirrors, chain lightning and singularities (powers layer).
  for(const f of this.fighters){f.mirrorTime=Math.max(0,f.mirrorTime-dt);if(f.mirrorTime<=0)f.mirrorHits=0;if(!f.mirrorHits||f.hp<=0)continue;for(const p of this.projectiles){if(this.ownerTeam(p)===f.team)continue;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,dx=nx-p.x,dy=ny-p.y,along=clamp(((f.x-p.x)*dx+(f.y-p.y)*dy)/(dx*dx+dy*dy||1),0,1);if(Math.hypot(p.x+dx*along-f.x,p.y+dy*along-f.y)>f.radius+p.radius+12)continue;const t=this.fighters[f.target]?.hp>0?this.fighters[f.target]:this.nearestEnemy(f);if(!t)break;p.owner=f.index;const angle=Math.atan2(t.y-p.y,t.x-p.x),speed=Math.hypot(p.vx,p.vy);p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;f.mirrorHits--;this.effect(14,f.x,f.y,30);this.log(`${f.name}'s mirror reflects a projectile.`);if(!f.mirrorHits)break;}}
  this.lightningPulses=this.lightningPulses.filter(p=>{if(p.due>this.time)return true;const f=this.fighters[p.owner],t=f&&(this.fighters[f.target]?.hp>0?this.fighters[f.target]:this.nearestEnemy(f));if(f?.hp>0&&t){if(dist(t,f)<=450){const damage=f.damageDone;this.hurt(t,f,f.spell*.26,'lightning',true);if(f.damageDone>damage&&p.opening){t.action=null;t.stagger=Math.max(t.stagger,.12);}this.emitSound(f,t.x,t.y,260);this.effect(2,t.x,t.y,38);}else this.log(`${f.name}'s lightning dissipates beyond its reach.`);}return false;});
  for(const z of this.zones.filter(z=>z.singularity)){z.pulse+=dt;if(z.pulse<.5)continue;z.pulse=0;const f=this.fighters[z.owner];if(!f)continue;for(const t of this.enemiesOf(f))if(dist(t,z)<z.radius)this.hit(f,t,z.damage*.5,'void');}
  // Arena, zones, summons and interception (environment layer).
  for(const w of this.wisps){w.phase+=dt*.35;w.x=clamp(w.x+Math.cos(w.phase)*dt*8,30,570);w.y=clamp(w.y+Math.sin(w.phase)*dt*8,30,570);}
  if(this.environment.weather==='storm'&&this.time>=this.nextThunder){this.nextThunder+=8;this.effect(2,300,300,60);this.emitSound(null,300,300,500);this.log('Thunder rolls over the arena.');}
  this.obstacles=this.obstacles.filter(o=>(o.life-=dt)>0);
  this.zones=this.zones.filter(z=>{z.life-=dt;z.tick+=dt;const owner=this.fighters[z.owner];for(const f of this.fighters){if(f.hp<=0||!owner||dist(f,z)>z.radius)continue;const ally=f.team===owner.team;
   if(z.type==='gravity'&&!ally&&f.flight<=0){const dx=z.x-f.x,dy=z.y-f.y,d=Math.hypot(dx,dy)||1;f.x=clamp(f.x+dx/d*dt*(z.pull??35),18,582);f.y=clamp(f.y+dy/d*dt*(z.pull??35),18,582);f.slow=Math.max(f.slow,.1);}
   if(z.type==='shadow'){if(ally)f.invisible=Math.max(f.invisible,.12);else f.slow=Math.max(f.slow,.12);}
   if(z.tick>=.5){if(['fire','lava'].includes(z.type)&&!ally)this.hit(owner,f,z.damage*.5,z.type);if(z.type==='life'&&ally){this.healSource=owner;this.heal(f,owner.spell*.12);this.healSource=null;f.nutrition=Math.min(100,f.nutrition+12);}}}
   if(z.tick>=.5)z.tick=0;return z.life>0;});
  this.summons=this.summons.filter(s=>{s.life-=dt;s.cooldown-=dt;const f=this.fighters[s.owner];if(!f||f.hp<=0)return false;const t=this.fighters[f.target]?.hp>0?this.fighters[f.target]:this.nearestEnemy(f,s);if(!t)return s.life>0;
   if(s.type==='spirit'){s.angle+=dt*2;s.x=f.x+Math.cos(s.angle)*20;s.y=f.y+Math.sin(s.angle)*20;if(s.cooldown<=0){s.cooldown=1.15;const angle=Math.atan2(t.y-s.y,t.x-s.x);this.projectiles.push({x:s.x,y:s.y,vx:Math.cos(angle)*185,vy:Math.sin(angle)*185,owner:s.owner,damage:f.spell*.3,type:'spirit',sprite:4,life:3,radius:4});}}
   else{const dx=t.x-s.x,dy=t.y-s.y,d=Math.hypot(dx,dy)||1;s.x=clamp(s.x+dx/d*100*dt,18,582);s.y=clamp(s.y+dy/d*100*dt,18,582);if(d<22&&s.cooldown<=0){s.cooldown=.8;this.hit(f,t,f.damage*(this.rules?.beastDamage??.30),'physical');}}
   return s.life>0;});
  this.projectiles=this.projectiles.filter(p=>{const x=p.x+p.vx*dt,y=p.y+p.vy*dt,team=this.ownerTeam(p);
   for(const actor of this.fighters)if(actor.team!==team&&actor.illusionTime>0&&actor.decoy?.hp>0&&segmentDistance(actor.decoy.x,actor.decoy.y,p.x,p.y,x,y)<9+p.radius){actor.illusionTime=0;actor.decoy.hp=0;this.effect(10,actor.decoy.x,actor.decoy.y,22);this.log('A projectile breaks an illusion.');return false;}
   for(const o of this.obstacles)if(segmentDistance(o.x,o.y,p.x,p.y,x,y)<o.radius+p.radius){this.effect(8,o.x,o.y,22);return false;}
   for(const w of this.wisps)if(w.hp>0&&segmentDistance(w.x,w.y,p.x,p.y,x,y)<5+p.radius){w.hp=Math.max(0,w.hp-p.damage);this.log('A projectile strikes a neutral wisp.');return false;}
   return true;});
 }
 upkeep(f,dt){
  // Per-fighter conditions, mirroring combat 12's environment layer with team-aware credit.
  const base=f.original;for(const key of TIMERS)f[key]=Math.max(0,f[key]-dt);f.burn=Math.max(0,f.burn-dt);f.periodic+=dt;f.energy=Math.min(f.maxEnergy,f.energy+dt*(f.weakness==='limited stamina'?5:11));
  if(f.weakness==='needs constant food')f.nutrition=Math.max(0,f.nutrition-dt*2.2);
  for(const food of this.food)if(food.ready<=this.time&&Math.hypot(f.x-food.x,f.y-food.y)<20){food.ready=this.time+10;f.nutrition=Math.min(100,f.nutrition+70);f.mana=Math.min(f.maxMana,f.mana+8);this.log(`${f.name} takes an arena ration.`);}
  if(this.environment.weather==='rain'||this.environment.weather==='storm'||this.environment.ground==='water'&&f.flight<=0)f.wet=Math.max(f.wet,.1);
  f.raging=f.weakness==='uncontrollable rage'&&f.hp<f.maxHp*.45;f.move=base.move*(f.shape>0?1.2:1)*(f.chrono>0?.75:1)*(f.winded>0?.55:1)*(f.nutrition<30?.7:1);if(f.weakness==='water'&&f.wet>0)f.move*=.72;if(f.weakness==='extreme cold'&&this.environment.weather==='frost')f.move*=.78;
  f.damage=base.damage*(f.raging?1.15:1)*(f.shape>0?1.15:1)*(this.rules?.sizeBuff&&f.sizeTime>0&&!f.sizeSmall?1.15:1);f.interval=base.interval*(f.chrono>0?1.5:1);f.accuracy=(base.accuracy+(this.rules?.mindBuff&&f.mindTime>0?.08:0))*(f.blind>0||f.amnesia>0?.65:1)*(f.weakness==='water'&&f.wet>0?.8:1);f.dodge=base.dodge+(this.rules?.mindBuff&&f.mindTime>0?.08:0)+(f.sizeTime>0&&f.sizeSmall?.15:0);f.radius=f.sizeTime>0?(f.sizeSmall?7:11):9;f.weapon={...base.weapon,range:base.weapon.range+(f.sizeTime>0&&!f.sizeSmall&&base.weapon.type==='melee'?12:0)};
  if(f.soul>0){const owner=this.fighters[f.soulOwner];if(owner?.hp>0){const d=dist(f,owner);if(d>85){f.move*=.65;const angle=Math.atan2(owner.y-f.y,owner.x-f.x);f.x=clamp(f.x+Math.cos(angle)*dt*15,18,582);f.y=clamp(f.y+Math.sin(angle)*dt*15,18,582);}const mana=Math.min(f.mana,dt*4);f.mana-=mana;owner.mana=Math.min(owner.maxMana,owner.mana+mana);}}
  if(f.periodic>=.5){const period=f.periodic;f.periodic=0;const enemy=this.fighters[f.lastAttacker]??this.nearestEnemy(f)??f;
   if(f.burn>0)this.periodicHit(enemy,f,(f.burnDamage||enemy.spell*.065)*period,'fire');if(f.poison>0)this.periodicHit(enemy,f,f.poisonDamage*period,'poison');if(f.bleed>0)this.periodicHit(enemy,f,f.bleedDamage*period,'blood');
   if(f.regeneration>0){this.healSource=this.fighters[f.regenSource]??f;this.heal(f,(f.regenPower??f.spell)*.2*period);this.healSource=null;}
   let environmental=0;if(f.weakness==='extreme cold'&&this.environment.weather==='frost'){environmental+=f.maxHp*.0015*period;this.warn(f,'cold',`${f.name} suffers from the frost.`);}if(f.weakness==='sunlight'&&!this.night&&this.environment.weather==='clear'){environmental+=f.maxHp*.0015*period*(this.environment.time==='day'?1:.5);this.warn(f,'sunlight',`${f.name} is hurt by the sunlight.`);}if(f.weakness==='a cursed relic'&&this.relic.active&&Math.hypot(f.x-300,f.y-300)<70){environmental+=f.maxHp*.003*period;f.mana=Math.max(0,f.mana-period*5);this.warn(f,'relic',`${f.name} is drained by the cursed relic.`);}f.hp=Math.max(0,f.hp-environmental);}
 }
 step(dt=1/60){
  if(this.done)return;dt=clamp(dt,.001,.05);this.environmentStep(dt);const burnStates=[];
  for(const f of this.fighters){if(f.hp<=0)continue;this.upkeep(f,dt);burnStates[f.index]=f.burn;f.burn=0;}
  this.time+=dt;
  for(const f of this.fighters){
   if(f.hp<=0){f.action=null;continue;}
   f.retarget-=dt;let t=f.target===null?null:this.fighters[f.target];
   if(!t||t.hp<=0||f.retarget<=0){t=this.chooseTarget(f);f.target=t?.index??null;f.retarget=.35;}
   f.cooldown-=dt;f.cast-=dt;for(const k of ['swing','slow','shield','evade','hitFlash','stagger'])f[k]=Math.max(0,f[k]-dt);f.trail=f.trail.filter(x=>(x.life-=dt)>0);f.mana=Math.min(f.maxMana,f.mana+dt*(.6+f.magic/45));
   if(!t)continue;this.moveTeamFighter(f,t,dt);this.startAttack(f,t);this.updateAttack(f,t,dt);this.castPower(f,t);
  }
  const living=this.fighters.filter(f=>f.hp>0);
  for(let i=0;i<living.length;i++)for(let j=i+1;j<living.length;j++){const a=living[i],b=living[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=20)continue;const angle=d?Math.atan2(dy,dx):(a.index-b.index)*.7,push=(20-d)/2;a.x=clamp(a.x-Math.cos(angle)*push,18,582);a.y=clamp(a.y-Math.sin(angle)*push,18,582);b.x=clamp(b.x+Math.cos(angle)*push,18,582);b.y=clamp(b.y+Math.sin(angle)*push,18,582);}
  this.projectiles=this.projectiles.filter(p=>{
   const oldX=p.x,oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;const owner=this.fighters[p.owner];let target=null,closest=Infinity;
   for(const t of this.fighters){if(t.hp<=0||t.team===owner.team||segmentDistance(t.x,t.y,oldX,oldY,p.x,p.y)>=t.radius+p.radius)continue;const along=Math.hypot(t.x-oldX,t.y-oldY);if(along<closest){closest=along;target=t;}}
   if(target){const before=target.hp,previous=this.hitContext;this.hitContext=p;this.hurt(target,owner,p.damage,p.type);this.hitContext=previous;if(target.hp<before){if(p.type==='ice'||p.type==='control')target.slow=p.duration||2;if(p.type==='fire')target.burn=p.duration||2;}return false;}
   return p.life>0&&p.x>=0&&p.y>=0&&p.x<=600&&p.y<=600;});
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
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

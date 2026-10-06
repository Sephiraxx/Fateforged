import {Battle as ThirdBattle,random,weaponFor,fighterProfile,tierFor,TIER_LIMITS,combatStyle} from './combat-v12-environment.js';
export {random,weaponFor,fighterProfile,tierFor,TIER_LIMITS,combatStyle};
export {powerFor} from './abilities-v12.js';
const NEW_IDS=new Set(['ember','frostTouch','kinetic','venom','silence','mirror','chainLightning','phoenix','rewind','singularity']);
const harmful=['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul'];
export class Battle extends ThirdBattle{
 constructor(...args){super(...args);this.lightningPulses=[];for(const f of this.fighters)Object.assign(f,{mirrorTime:0,mirrorHits:0,phoenixArmed:false,phoenixSpent:false,anchor:null});}
 castPower(f,t){const p=f.powers[f.powerIndex%f.powers.length];if(!p||!NEW_IDS.has(p.id))return super.castPower(f,t);const cost=p.rarity==='Legendary'?25:p.rarity==='Rare'?15:9;if(f.mana<cost)return;const casts=f.castCount;super.castPower(f,t);if(f.castCount>casts&&!(f.weakness==='memory loss'&&f.castCount%3===0))f.mana=Math.max(0,f.mana-(cost-9));}
 usePower(f,t,p,copied=false){if(!NEW_IDS.has(p.id))return super.usePower(f,t,p,copied);if(p.voice&&f.weakness==='silenced casting')return;const attack=['ember','frostTouch','kinetic','venom','silence','chainLightning','singularity'].includes(p.id);if(attack){if(f.weakness==='cannot harm the innocent'&&this.wisps.some(w=>w.hp>0&&(Math.hypot(w.x-t.x,w.y-t.y)<115||Math.hypot(w.x-f.x,w.y-f.y)<60))){this.warn(f,'innocent-power',`${f.name} withholds ${p.name} to protect a neutral wisp.`);return;}f.invisible=0;}
 const distance=Math.hypot(t.x-f.x,t.y-f.y),duration=this.duration(f,t,3),selfDuration=this.duration(f,null,4);
 switch(p.id){
 case'ember':{this.launch(f,t,{...p,id:'fire'});const bolt=this.projectiles.at(-1);bolt.damage*=.3;bolt.payload='ember';bolt.duration=this.duration(f,t,1.2)*(t.weakness==='fire'?1.5:1);bolt.radius=4;break;}
 case'frostTouch':this.effect(1,f.x,f.y,40);if(distance<75){this.hit(f,t,f.spell*.3,'ice');t.chrono=t.slow=this.duration(f,t,1.2)*(t.wet>0||t.weakness==='extreme cold'?1.5:1);}break;
 case'kinetic':this.effect(10,f.x,f.y,40);if(distance<90){this.hit(f,t,f.spell*.25,'psychic');this.push(t,f,30);t.action=null;t.stagger=Math.max(t.stagger,.15);}break;
 case'venom':this.launch(f,t,p);Object.assign(this.projectiles.at(-1),{type:'poison',damage:f.spell*.6,radius:4});break;
 case'silence':this.hit(f,t,f.spell*.4,'void','void');t.action=null;break;
 case'mirror':f.mirrorTime=selfDuration;f.mirrorHits=3;break;
 case'chainLightning':for(let i=0;i<3;i++)this.lightningPulses.push({owner:f.side,opening:i===0,due:this.time+i*.45});break;
 case'phoenix':if(!f.phoenixSpent){f.phoenixArmed=true;this.log(`${f.name} arms a phoenix rebirth.`);}else this.log(`${f.name}'s rebirth has already been spent.`);break;
 case'rewind':if(!f.anchor){f.anchor={hp:f.hp,mana:f.mana,x:f.x,y:f.y};this.log(`${f.name} anchors a moment in time.`);}else{const anchor=f.anchor;this.heal(f,Math.max(0,anchor.hp-f.hp));f.mana=Math.max(f.mana,anchor.mana);f.x=anchor.x;f.y=anchor.y;for(const key of harmful)f[key]=0;f.anchor=null;f.action=null;this.effect(15,f.x,f.y,34);this.log(`${f.name} rewinds to the anchored moment.`);}break;
 case'singularity':this.zone(f,'gravity',t.x,t.y,105,duration,(12+f.magic*1.7)*.247);Object.assign(this.zones.at(-1),{singularity:true,pulse:0,pull:28});this.effect(4,t.x,t.y,45);break;
 }
 }
 applyImpact(id,f,t,damage,duration){if(id==='ember'){t.burn=duration;t.burnDamage=f.spell*.035;return;}if(id==='venom'){t.poison=duration*(t.weakness==='poison'?1.5:1);t.poisonDamage=f.spell*.16;return;}super.applyImpact(id,f,t,damage,duration);}
 rebirth(f){if(f.hp>0||!f.phoenixArmed||f.phoenixSpent||f.deathMark>0)return false;f.phoenixArmed=false;f.phoenixSpent=true;f.hp=f.maxHp*(this.rules?.phoenixHealth??.30)*(f.weakness==='slow recovery'?.5:1);for(const key of harmful)f[key]=0;f.action=null;this.effect(0,f.x,f.y,40);this.log(`${f.name} rises again with Phoenix rebirth.`);return true;}
 hurt(t,...args){const connected=super.hurt(t,...args);if(!t.isDecoy)this.rebirth(t);return connected;}
 environmentStep(dt){for(const f of this.fighters){f.mirrorTime=Math.max(0,f.mirrorTime-dt);if(f.mirrorTime<=0)f.mirrorHits=0;if(f.mirrorHits){for(const p of this.projectiles){if(p.owner===f.side)continue;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,dx=nx-p.x,dy=ny-p.y,along=Math.max(0,Math.min(1,((f.x-p.x)*dx+(f.y-p.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(p.x+dx*along-f.x,p.y+dy*along-f.y)>f.radius+p.radius+12)continue;p.owner=f.side;const t=this.fighters[1-f.side],angle=Math.atan2(t.y-p.y,t.x-p.x),speed=Math.hypot(p.vx,p.vy);p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;f.mirrorHits--;this.effect(14,f.x,f.y,30);this.log(`${f.name}'s mirror reflects a projectile.`);if(!f.mirrorHits)break;}}}
 this.lightningPulses=this.lightningPulses.filter(p=>{if(p.due>this.time)return true;const f=this.fighters[p.owner],t=this.fighters[1-p.owner];if(f.hp>0&&t.hp>0){if(Math.hypot(t.x-f.x,t.y-f.y)<=450){const damage=f.damageDone;this.hurt(t,f,f.spell*.26,'lightning',true);if(f.damageDone>damage&&p.opening){t.action=null;t.stagger=Math.max(t.stagger,.12);}this.emitSound(f,t.x,t.y,260);this.effect(2,t.x,t.y,38);}else this.log(`${f.name}'s lightning dissipates beyond its reach.`);}return false;});
 for(const z of this.zones.filter(z=>z.singularity)){z.pulse+=dt;if(z.pulse>=.5){z.pulse=0;const f=this.fighters[z.owner],t=this.fighters[1-z.owner];if(Math.hypot(t.x-z.x,t.y-z.y)<z.radius)this.hit(f,t,z.damage*.5,'void');}}
 super.environmentStep(dt);
 }
 step(dt=1/60){if(this.done)return;super.step(dt);let revived=false;for(const f of this.fighters)revived=this.rebirth(f)||revived;if(revived&&this.time<90&&this.fighters.every(f=>f.hp>0)){this.done=false;this.winner=null;this.reason=null;const last=this.events.at(-2);if(last?.text.includes(' wins. '))this.events.splice(-2,1);}}
 result(){return {...super.result(),combatVersion:8};}
}
export function simulate(a,b,seed,options){const battle=new Battle(a,b,seed,options);while(!battle.done)battle.step(1/60);return battle.result();}

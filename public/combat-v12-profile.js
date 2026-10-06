export const TIER_LIMITS=[['F',0],['E',150],['D',350],['C',650],['B',1000],['A',1500],['S',2100],['SS',3000],['SSS',4500]];
export const tierFor=total=>TIER_LIMITS.reduce((tier,[name,min])=>total>=min?name:tier,'F');
export function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
import {CATALOG} from "./abilities-v12.js";
const fallbackWeapon=name=>{
 const n=(name||'Bare hands').toLowerCase();let sprite=15,range=29,damage=1,interval=1,type='melee';
 if(/bow|gun|rifle|revolver|throwing|chakram/.test(n)){type='ranged';range=230;sprite=/crossbow/.test(n)?6:/gun|rifle|revolver/.test(n)?9:5;damage=.86;interval=1.15;}
 else if(/wand|orb|spellbook|^staff$/.test(n)){type='arcane';range=200;sprite=/wand|orb/.test(n)?8:7;damage=.9;interval=1.10;}
 else if(/shield/.test(n)){sprite=10;damage=.85;range=34;}
 else if(/trident/.test(n)){sprite=14;range=52;}
 else if(/spear|halberd|quarterstaff/.test(n)){sprite=/staff/.test(n)?7:3;range=50;interval=1.08;}
 else if(/dagger|knives/.test(n)){sprite=4;range=27;damage=.72;interval=.62;}
 else if(/axe/.test(n)){sprite=1;damage=1.32;interval=1.25;range=38;}
 else if(/hammer|mace/.test(n)){sprite=2;damage=1.4;interval=1.25;range=40;}
 else if(/scythe/.test(n)){sprite=11;damage=1.2;range=48;interval=1.25;}
 else if(/chain|flail/.test(n)){sprite=13;range=65;interval=1.2;}
 else if(/claw|gauntlet/.test(n)){sprite=12;interval=.8;}
 else if(/sword|blade|rapier|katana|living/.test(n)){sprite=0;range=/great/.test(n)?42:35;damage=/great/.test(n)?1.25:1;}
 return {name:name||'Bare hands',sprite,range,damage,interval,type};
};
export const weaponFor=name=>({...CATALOG.weapons[name]??fallbackWeapon(name)});
export function powerFor(name){const n=(name||'').toLowerCase();if(!n||/^no (second )?power$/.test(n))return null;
 if(/regen|heal|life creation/.test(n))return {name,type:'heal',sprite:12};
 if(/force field|armor|absorption|size|shapeshift/.test(n))return {name,type:'shield',sprite:14};
 if(/teleport|portal|space/.test(n))return {name,type:'teleport',sprite:15};
 if(/flight|invisib|future|mind reading/.test(n))return {name,type:'evasion',sprite:7};
 if(/ice|cold/.test(n))return {name,type:'ice',sprite:1};
 if(/fire|lava/.test(n))return {name,type:'fire',sprite:0};
 if(/storm|lightning/.test(n))return {name,type:'lightning',sprite:2};
 if(/earth|metal|crystal/.test(n))return {name,type:'earth',sprite:8};
 if(/water/.test(n))return {name,type:'water',sprite:9};
 if(/light/.test(n))return {name,type:'holy',sprite:5};
 if(/blood/.test(n))return {name,type:'blood',sprite:6};
 if(/shadow|dream|illusion/.test(n))return {name,type:'shadow',sprite:11};
 if(/gravity|time|sound|mind|memory|telekin/.test(n))return {name,type:'control',sprite:10};
 if(/spirit|soul|beast/.test(n))return {name,type:'spirit',sprite:4};
 return {name,type:'void',sprite:4};
}
export function fighterProfile(character){const s=(character.summary?.stats||[0,0,0,0,0]).map(v=>Math.sqrt(Math.max(0,Number(v)||0))),traits=character.traits||character.state?.traits||{},w=weaponFor(traits.weapon),powers=[traits.power,traits.power2].map(powerFor).filter(Boolean),weak=(traits.weakness||'').toLowerCase();return {id:character.id,name:character.name,generationVersion:character.summary?.generationVersion??character.state?.generationVersion,traits,stats:character.summary?.stats||[0,0,0,0,0],weapon:w,powers,maxHp:110+s[2]*13,armor:Math.min(.65,s[2]/(s[2]+70)),damage:(9+s[0]*1.7)*w.damage,move:(48+s[1]*3.3)*(/tower shield/i.test(w.name)?.92:1),interval:Math.max(.26,1.15/(1+s[1]/36))*w.interval,accuracy:.76+Math.min(.2,s[3]/130),dodge:Math.min(.25,s[1]/190+s[3]/300),crit:Math.min(.3,s[3]/160),tactics:Math.min(1,s[3]/28),spell:12+s[4]*2.3,maxMana:20+s[4]*5,magic:s[4],weakness:weak};}
export class Battle{
 constructor(a,b,seed=1,{night=false}={}){this.seed=seed;this.rng=random(seed);this.time=0;this.done=false;this.winner=null;this.events=[];this.effects=[];this.projectiles=[];this.night=night;this.fighters=[a,b].map((c,i)=>{const p=fighterProfile(c);return {...p,side:i,x:i?440:160,y:300+(i?20:-20),radius:9,hp:p.maxHp,mana:p.maxMana,cooldown:.2+i*.12,cast:1+i*.5,powerIndex:0,slow:0,burn:0,shield:0,evade:0,angle:0,swing:0,damageDone:0};});}
 effect(sprite,x,y,size=32){this.effects.push({sprite,x,y,size,life:.5,max:.5});}
 log(text){this.events.push({time:this.time,text});if(this.events.length>60)this.events.shift();}
 hurt(target,attacker,amount,type='physical',canDodge=true){if(target.hp<=0)return;if(canDodge&&this.rng()>Math.max(.4,attacker.accuracy-target.dodge-(target.evade>0?.2:0))){this.log(`${target.name} dodged.`);return;}let factor=1-target.armor*(type==='physical'?1:.4);if(target.shield>0)factor*=.5;
 const weak=target.weakness;if((type==='fire'&&weak==='fire')||(type==='ice'&&weak==='extreme cold')||(type==='water'&&weak==='water')||(type==='holy'&&/holy|sunlight/.test(weak)))factor*=1.5;
 if(type==='physical'&&/silver|cold iron/.test(weak))factor*=1.15;
 const crit=this.rng()<attacker.crit?1.5:1,damage=Math.max(1,amount*factor*crit);target.hp=Math.max(0,target.hp-damage);attacker.damageDone+=damage;this.effect(type==='physical'?13:powerFor(type)?.sprite??4,target.x,target.y,26);this.log(`${attacker.name}: ${Math.round(damage)} ${type} damage${crit>1?' (critical)':''}.`);}
 castPower(f,t){if(!f.powers.length||!f.magic||f.mana<9||f.cast>0)return;const weak=f.weakness;if(weak==='silenced casting'||(this.night&&weak==='loses power at night')||(!this.night&&weak==='loses power in daylight'))return;
 const p=f.powers[f.powerIndex++%f.powers.length];f.mana-=9;f.cast=(weak==='power has a cooldown'?7:4.2)/(1+f.magic/70);this.log(`${f.name} used ${p.name}.`);this.effect(p.sprite,f.x,f.y,40);
 const duration=weak==='short power duration'?1.2:2.6;
 if(weak==='power needs a sacrifice')f.hp=Math.max(1,f.hp-f.maxHp*.03);
 if(p.type==='heal'){f.hp=Math.min(f.maxHp,f.hp+f.spell*1.2);return;}
 if(p.type==='shield'){f.shield=duration;return;}
 if(p.type==='evasion'){f.evade=duration;return;}
 if(p.type==='teleport'){const a=this.rng()*Math.PI*2;f.x=Math.max(16,Math.min(584,t.x+Math.cos(a)*65));f.y=Math.max(16,Math.min(584,t.y+Math.sin(a)*65));f.evade=1;return;}
 if(p.type==='control'||p.type==='ice')t.slow=duration;
 if(p.type==='fire')t.burn=duration;
 this.projectiles.push({x:f.x,y:f.y,vx:Math.cos(f.angle)*205,vy:Math.sin(f.angle)*205,owner:f.side,damage:f.spell,type:p.type,sprite:p.sprite,life:3,radius:7});
 }
 step(dt=1/60){if(this.done)return;dt=Math.min(.05,Math.max(.001,dt));this.time+=dt;
 for(const f of this.fighters){const t=this.fighters[1-f.side];f.cooldown-=dt;f.cast-=dt;f.swing=Math.max(0,f.swing-dt);for(const k of ['slow','shield','evade'])f[k]=Math.max(0,f[k]-dt);if(f.burn>0){f.burn-=dt;const amount=t.spell*.065*dt;f.hp=Math.max(0,f.hp-amount);t.damageDone+=amount;}
 f.mana=Math.min(f.maxMana,f.mana+dt*(.6+f.magic/45));let dx=t.x-f.x,dy=t.y-f.y,d=Math.hypot(dx,dy)||1;f.angle=Math.atan2(dy,dx);const desired=f.weapon.type==='melee'?f.weapon.range*.8:110+f.tactics*45;const radial=d>desired?1:(d<desired-12?-f.tactics*.65:0);const strafe=Math.sin(this.time*.8+f.side*2)*.35*f.tactics,slow=f.slow>0?.55:1,stamina=/exhaustion|limited stamina|food/.test(f.weakness)?Math.max(.55,1-this.time/180):1;
 f.x+=((dx/d)*radial-(dy/d)*strafe)*f.move*slow*stamina*dt;f.y+=((dy/d)*radial+(dx/d)*strafe)*f.move*slow*stamina*dt;f.x=Math.min(582,Math.max(18,f.x));f.y=Math.min(582,Math.max(18,f.y));
 if(d<=f.weapon.range+8&&f.cooldown<=0){f.cooldown=f.interval;f.swing=.22;if(f.weapon.type==='melee')this.hurt(t,f,f.damage);else this.projectiles.push({x:f.x,y:f.y,vx:dx/d*260,vy:dy/d*260,owner:f.side,damage:f.weapon.type==='arcane'?f.damage+f.spell*.3:f.damage,type:f.weapon.type==='arcane'?'arcane':'physical',sprite:f.weapon.type==='arcane'?4:-1,life:2.5,radius:3});}
 this.castPower(f,t);
 }
 const [a,b]=this.fighters,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<20){const angle=d?Math.atan2(dy,dx):0,push=(20-d)/2;a.x-=Math.cos(angle)*push;a.y-=Math.sin(angle)*push;b.x+=Math.cos(angle)*push;b.y+=Math.sin(angle)*push;for(const f of this.fighters){f.x=Math.min(582,Math.max(18,f.x));f.y=Math.min(582,Math.max(18,f.y));}}
 this.projectiles=this.projectiles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;const t=this.fighters[1-p.owner];if(Math.hypot(p.x-t.x,p.y-t.y)<t.radius+p.radius){this.hurt(t,this.fighters[p.owner],p.damage,p.type);return false;}return p.life>0&&p.x>=0&&p.y>=0&&p.x<=600&&p.y<=600;});
 this.effects=this.effects.filter(e=>(e.life-=dt)>0);
 if(a.hp<=0||b.hp<=0||this.time>=90){this.done=true;this.reason=a.hp<=0||b.hp<=0?'Knockout':'Time limit: health %, then damage, then seeded coin toss';const ratio=a.hp/a.maxHp-b.hp/b.maxHp;this.winner=a.hp<=0&&b.hp>0?1:b.hp<=0&&a.hp>0?0:Math.abs(ratio)>.00001?(ratio>0?0:1):a.damageDone!==b.damageDone?(a.damageDone>b.damageDone?0:1):(this.rng()<.5?0:1);this.log(`${this.fighters[this.winner].name} wins. ${this.reason}.`);}
 }
 result(){if(!this.done)throw new Error('Battle is still running.');return {seed:this.seed,winner:this.fighters[this.winner].id,seconds:Math.round(this.time*10)/10,reason:this.reason,hp:this.fighters.map(f=>Math.round(f.hp/f.maxHp*100))};}
}
export function simulate(a,b,seed,options){const fight=new Battle(a,b,seed,options);while(!fight.done)fight.step(1/60);return fight.result();}

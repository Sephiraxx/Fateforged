import {Battle as DuelBattle} from './combat-v12.js';
import {TeamBattle as PreviousTeamBattle,TEAM_RULES} from './combat-team-v2-2.js';
import {neutralBalance,patchFactor,validateBalanceProfile} from './team-balance.js';
import {teamKit} from './team-kits.js';
export {TEAM_TIME_LIMIT,TEAM_SIZES,TEAM_TACTICS,CC_IMMUNITY,TEAM_RULES,TEAM_POSTURES} from './combat-team-v2-2.js';
export const TEAM_ENGINE_VERSION='team-2.3';
export class TeamBattle extends PreviousTeamBattle{
 constructor(teams,seed,options={}){super(teams,seed,options);this.balance=validateBalanceProfile(options.balance??neutralBalance().profile);for(const f of this.fighters){const hp=patchFactor(this.balance,'role:'+f.role+':health'),damage=patchFactor(this.balance,'role:'+f.role+':damage')*patchFactor(this.balance,'weapon:'+f.weapon.type+':damage');f.maxHp*=hp;f.hp*=hp;f.damage*=damage;f.original.damage*=damage;f.spell*=damage;}}
 heal(f,amount){const source=this.healSource??f,factor=patchFactor(this.balance,'role:'+source.role+':healing')*patchFactor(this.balance,'target:healing');return super.heal(f,amount*factor);}
 duration(f,t,n){const result=super.duration(f,t,n);return t&&t.team!==f.team?result*patchFactor(this.balance,'role:'+f.role+':control')*patchFactor(this.balance,'target:control'):result;}
 kitControl(f,t,id,duration){return super.kitControl(f,t,id,duration*patchFactor(this.balance,'role:'+f.role+':control')*patchFactor(this.balance,'kit:control:output')*patchFactor(this.balance,'target:control'));}
 applyTeamKit(f,k,targets){const revivedBefore=targets[0]?.revivedByKit,downBefore=targets[0]?.hp<=0,spell=f.spell;if(k.group==='healing')f.spell*=patchFactor(this.balance,'kit:healing:output');try{const value=super.applyTeamKit(f,k,targets),factor=patchFactor(this.balance,'kit:healing:output');if(k.id==='barrier')for(const a of targets)if(a.wardTime>0)a.wardTime*=factor;if(k.id==='resurrection'&&!revivedBefore&&downBefore&&targets[0]?.revivedByKit)targets[0].hp=Math.min(targets[0].maxHp,targets[0].hp*factor);return value;}finally{f.spell=spell;}}
 wideKnockback(t,f,type,x,y){if(type==='physical'&&f&&f!==t&&t.x===582&&x>=567){const angle=Math.atan2(y-f.y,x-f.x),push=Math.min(14,3+f.damage/12);t.x=this.clampX(x+Math.cos(angle)*push);}}
 fortified(f){return Math.max(0,Math.min(.6,TEAM_RULES.fortified*patchFactor(this.balance,'target:fortified')));}
 hurt(t,f,amount,type='physical',canDodge=true){
  if(f&&t&&f!==t&&f.team===t.team)return false;const enemy=f&&!t.isDecoy&&f!==t&&f.team!==t.team;
  if(enemy){if(f.diving)amount*=patchFactor(this.balance,'target:dive');if(this.time>=TEAM_RULES.overtime)amount*=TEAM_RULES.overtimeDamage;if(t.exposed>0&&f.role!=='controller')amount*=1+TEAM_RULES.exposedBonus;if(t.role==='tank')amount*=1-this.fortified(t);
   const guard=t.role==='tank'?null:this.alliesOf(t).find(a=>a.role==='tank'&&Math.hypot(a.x-t.x,a.y-t.y)<TEAM_RULES.bulwarkRange&&a.sleep<=0);if(guard&&amount>0){const share=amount*TEAM_RULES.bulwarkShare*(1-this.fortified(guard)),context=this.hitContext;amount-=amount*TEAM_RULES.bulwarkShare;this.hitContext={periodic:true};const gx=guard.x,gy=guard.y;DuelBattle.prototype.hurt.call(this,guard,f,share,type,false);this.wideKnockback(guard,f,type,gx,gy);if(guard.hp>0&&guard.kitStun>0)guard.sleep=Math.max(guard.sleep,guard.kitStun);this.hitContext=context;this.creditDown(guard,f);}}
  const before=t.hp,x0=t.x,y0=t.y,connected=DuelBattle.prototype.hurt.call(this,t,f,amount,type,canDodge);if(t.hp>0&&t.kitStun>0)t.sleep=Math.max(t.sleep,t.kitStun);
  this.wideKnockback(t,f,type,x0,y0);
  if(enemy){if(t.hp<before){t.lastAttacker=f.index;if(f.role==='controller'&&type!=='physical')t.exposed=TEAM_RULES.exposedTime;}if(before>0&&t.hp<=0)f.kills++;}return connected;
 }

 result(){return {...super.result(),combatVersion:TEAM_ENGINE_VERSION,balanceId:this.balance.id};}
}

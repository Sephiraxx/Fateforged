import {Battle as PreviousBattle,random,weaponFor,fighterProfile,combatStyle} from './combat-v8.js';
export {random,weaponFor,fighterProfile,combatStyle};
export {powerFor} from './abilities.js';
export const TIER_LIMITS=[['E',0],['D',350],['C',650],['B',1000],['A',1500],['S',2100],['SS',3000]];
export const tierFor=total=>TIER_LIMITS.reduce((tier,[name,min])=>total>=min?name:tier,'E');
export const REWIND_HEALTH_RECOVERY=.6;
export const REWIND_MANA_RECOVERY=.75;
const harmful=['burn','poison','bleed','sleep','root','chrono','slow','blind','amnesia','suppressed','disarmed','soul'];
export class Battle extends PreviousBattle{
 usePower(f,t,p,copied=false){
  if(p.id!=='rewind'||!f.anchor)return super.usePower(f,t,p,copied);
  const anchor=f.anchor;
  this.heal(f,Math.max(0,anchor.hp-f.hp)*REWIND_HEALTH_RECOVERY);
  f.mana+=Math.max(0,anchor.mana-f.mana)*REWIND_MANA_RECOVERY;
  f.x=anchor.x;f.y=anchor.y;
  for(const key of harmful)f[key]=0;
  f.anchor=null;f.action=null;
  this.effect(15,f.x,f.y,34);
  this.log(`${f.name} rewinds to the anchored moment.`);
 }
 result(){return {...super.result(),combatVersion:9};}
}
export function simulate(a,b,seed,options){const battle=new Battle(a,b,seed,options);while(!battle.done)battle.step(1/60);return battle.result();}

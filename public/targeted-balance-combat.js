import {validateBalanceProfile,patchFactor} from './team-balance.js';
import {teamRole} from './team-roles.js';
const attributes=['STR','SPD','DUR','IQ','MAG'];
// Adjust effective battle stats on copies; saved rolls, contracts and scouting
// ratings remain untouched. Preserve the original roles and historical engines.
export function withTargetedBalance(Base,version){return class extends Base{
 constructor(teams,seed,options={}){
  const profile=validateBalanceProfile(options.balance??{id:'base',multipliers:{}}),roles={...options.roles};
  const adjusted=teams.map(team=>team.map(c=>{roles[c.id]??=teamRole(c).role;return {...c,summary:{...c.summary,stats:c.summary.stats.map((v,i)=>v*patchFactor(profile,'stat:'+attributes[i]))}};}));
  super(adjusted,seed,{...options,roles,balance:profile});
  for(const f of this.combatants??this.fighters)f.powers=f.powers.map(p=>p.cooldown?{...p,cooldown:p.cooldown*patchFactor(profile,'ability:'+p.id+':cooldown')}:p);
 }
 castPower(f,t){const count=f.castCount;super.castPower(f,t);if(f.castCount!==count&&f.lastCastId&&f.powerUsed[f.lastCastId]===this.time)f.cast*=patchFactor(this.balance,'ability:'+f.lastCastId+':cooldown');}
 result(){return {...super.result(),combatVersion:version};}
};}

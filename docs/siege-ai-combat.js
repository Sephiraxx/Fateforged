// Core siege fighters that fight back. Before this layer a team on the siege plan kept
// hitting the enemy Core while defenders hit them, and fighters ignored whoever attacked them.
// - Retaliate: a fighter hit by an enemy fighter in the last 1.5 s turns on that attacker when it is in reach, unless
//   it is finishing a Core that is nearly down. Healers keep healing.
// - Peel: tanks, and melee fighters on an objective, turn on an enemy hitting one of their back-liners nearby.
// - Siege with care: a fighter on the enemy Core first fights the defenders who are hitting its team, and anyone in
//   its face.
// - Plans: a team sieges with an edge (numbers, Forgefire, a weak Core, the Titan down with even numbers) or once the
//   game runs long. Cores carry less health, so a won fight turns into a Core kill.
export const SIEGE_AI=Object.freeze({memory:1.5,reach:120,peel:260,finishCore:.15,guardRange:420,closeGuard:120,siegeAnyway:200,coreHp:Object.freeze({3:2880,5:3250})});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const backLiner=f=>f.role==='healer'||f.role==='controller'||f.role==='damage'&&f.weapon.type!=='melee';

export function withSiegeAi(Base){
 return class SiegeAiBattle extends Base{
  constructor(...args){
   super(...args);
   const hp=SIEGE_AI.coreHp[this.size];if(hp&&this.cores&&!args[2]?.objectiveRules)for(const c of this.cores){c.maxHp=hp;c.hp=hp;}
  }
  hurt(t,f,amount,...rest){
   const before=t?.hp,result=super.hurt(t,f,amount,...rest);
   if(f&&t&&f!==t&&!t.isObjective&&!f.isObjective&&f.team!==t.team&&t.hp<before)t.lastHitAt=this.time;
   return result;
  }
  // The enemy fighter that hit `f` in the last moments, if it is alive and within `reach`.
  attackerOf(f,reach){
   const a=this.combatants?.[f.lastAttacker];
   return a&&a.hp>0&&a.team!==f.team&&this.time-(f.lastHitAt??-Infinity)<=SIEGE_AI.memory&&d(a,f)<=reach?a:null;
  }
  chooseTarget(f){
   const t=super.chooseTarget(f);
   if(!this.brain||f.tauntTime>0&&this.actorFor(f.tauntSource)?.hp>0)return t;
   const team=f.team,core=this.cores[1-team];
   if(t===core&&core.hp<core.maxHp*SIEGE_AI.finishCore)return t;
   const pick=e=>{f.laneWaypoint=null;return e;};
   if(f.role!=='healer'){const a=this.attackerOf(f,f.weapon.range+SIEGE_AI.reach);if(a)return pick(a);}
   if(f.role==='tank'||f.weapon.type==='melee'&&f.role!=='healer'&&t?.isObjective){
    let best=null,bestD=Infinity;
    for(const ally of this.combatants){
     if(ally===f||ally.team!==team||ally.hp<=0||!backLiner(ally)||d(ally,f)>SIEGE_AI.peel)continue;
     const a=this.attackerOf(ally,Infinity);if(a&&d(a,f)<bestD){bestD=d(a,f);best=a;}
    }
    if(best)return pick(best);
   }
   if(t===core){
    const hitters=new Set();for(const a of this.combatants)if(a.team===team&&a.hp>0&&this.time-(a.lastHitAt??-Infinity)<=SIEGE_AI.memory)hitters.add(a.lastAttacker);
    const guard=e=>!e.isObjective&&(hitters.has(e.index)&&d(e,core)<SIEGE_AI.guardRange||d(e,f)<SIEGE_AI.closeGuard);
    if(this.combatants.some(e=>e.team!==team&&e.hp>0&&guard(e)))return pick(this.fight(f,guard)??t);
   }
   return t;
  }
  planScores(team){
   const out=super.planScores(team);
   if(out.siege>0){
    const s=this.situation(team),edge=s.alive-s.foesAlive;
    if(!(s.forgefire||edge>0||edge===0&&!s.titanUp&&!s.titanSoon||s.foeCore<.2||this.time>=SIEGE_AI.siegeAnyway)){out.siege=0;if(!(out.hold>0)&&!(out.contest>0))out.hold=30;}
   }
   return out;
  }
 };
}

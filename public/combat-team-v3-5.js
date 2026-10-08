// Core siege with a team brain (team-3.5, objective phase 3). Every 1.5 s each team scores seven plans from the
// state of the match and its coach's tactic, then commits to the best one for at least 3 s (Defend and Regroup can
// interrupt). The formation layer still decides how to fight; the plan decides what is worth fighting and where the
// team stands: which targets are allowed (enemy fighters, the Titan, the enemy Core) and how far forward it may go.
import {TeamBattle as Previous,SIEGE_RULES} from './combat-team-v3-4.js';
import {TeamBattle as FormationBattle} from './combat-team-v2-3.js';
export {OBJECTIVE_RULES,TITAN_RULES,SIEGE_RULES,SIEGE_TITAN_RULES} from './combat-team-v3-4.js';
export const TEAM_ENGINE_VERSION='team-3.5';
export const TEAM_PLANS=Object.freeze(['contest','hold','flank','steal','siege','defend','regroup']);
export const PLAN_LABELS=Object.freeze({contest:'Contest the Titan',hold:'Hold the choke',flank:'Flank the pit',steal:'Steal the Titan',siege:'Siege the Core',defend:'Defend the Core',regroup:'Regroup'});
export const BRAIN_RULES=Object.freeze({interval:1.5,commit:3,switchMargin:5,defendRange:380,fightRange:170,stealHp:.2,stealReach:300,pitRadius:200,pressureStart:150,pressureRate:4});
// Coach styles, read from the tactic: points added to each plan's score.
// Defended Cores fall more slowly than in team-3.4's Core races, so they carry less health.
export const BRAIN_SIEGE_RULES=Object.freeze({3:Object.freeze({...SIEGE_RULES[3],coreHp:Object.freeze({3:3500})}),5:Object.freeze({...SIEGE_RULES[5],coreHp:Object.freeze({5:5000})})});
export const PLAN_STYLES=Object.freeze({
 defensive:Object.freeze({hold:4,defend:10,siege:-4}),
 aggressive:Object.freeze({contest:6,siege:8,hold:-10,regroup:-6}),
 'focus-healer':Object.freeze({flank:15,steal:12}),
 'protect-carry':Object.freeze({contest:8,regroup:4}),
 balanced:Object.freeze({})
});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),fightTarget=FormationBattle.prototype.chooseTarget;
export class TeamBattle extends Previous{
 constructor(teams,seed,options={}){super(teams,seed,{...options,objectiveRules:options.objectiveRules??BRAIN_SIEGE_RULES[teams?.[0]?.length]});this.brain=[0,1].map(()=>({plan:'contest',since:0,scores:{}}));this.planSeconds=[0,1].map(()=>Object.fromEntries(TEAM_PLANS.map(p=>[p,0])));this.planSwitches=[0,0];this.nextBrain=0;this.updateBrain();}
 pit(){return {x:640,y:300};}
 base(team){return {x:team?this.width-130:130,y:300};}
 choke(team){return {x:team?this.width-420:420,y:300};}
 // What a team can see: numbers, health, the Titan, both Cores and where the enemy is committed.
 situation(team){
  const mine=this.combatants.filter(f=>f.team===team),foes=this.combatants.filter(f=>f.team!==team),alive=l=>l.filter(f=>f.hp>0),t=this.titan,pit=this.pit();
  const hp=l=>l.reduce((n,f)=>n+Math.max(0,f.hp),0)/l.reduce((n,f)=>n+f.maxHp,0);
  return {alive:alive(mine).length,foesAlive:alive(foes).length,hp:hp(mine),foeHp:hp(foes),titanUp:t.hp>0,titanPct:t.hp/t.maxHp,titanSoon:t.hp<=0&&this.nextTitan-this.time<12,
   ownCore:this.cores[team].hp/this.cores[team].maxHp,foeCore:this.cores[1-team].hp/this.cores[1-team].maxHp,forgefire:this.hasForgefire(team),foeForgefire:this.hasForgefire(1-team),
   nearOurCore:alive(foes).filter(e=>d(e,this.cores[team])<BRAIN_RULES.defendRange).length,coreHit:this.time-(this.coreHitAt?.[team]??-Infinity)<3,
   foesInPit:alive(foes).filter(e=>d(e,pit)<BRAIN_RULES.pitRadius).length,
   foesOnTitan:t.hp>0&&this.titanHits.some(h=>this.actorFor(h.index)?.team!==team&&this.time-h.time<3),
   stealer:t.hp>0&&alive(mine).some(f=>d(f,t)<BRAIN_RULES.stealReach&&(f.weapon.type!=='melee'||this.isSkirmisher(f)))};
 }
 planScores(team){
  const s=this.situation(team),edge=Math.max(-2,Math.min(2,s.alive-s.foesAlive)),style=PLAN_STYLES[this.tactics[team]]??PLAN_STYLES.balanced,out={};
  out.defend=s.nearOurCore>=2&&s.coreHit?50+15*s.nearOurCore+(s.ownCore<.5?10:0):0;
  out.regroup=s.alive<=s.foesAlive-2||s.hp<.35&&s.alive<s.foesAlive?72:0;
  out.siege=30+(s.forgefire?40:0)+16*Math.max(0,edge)+Math.max(0,Math.min(40,(this.time-BRAIN_RULES.pressureStart)/BRAIN_RULES.pressureRate))+(!s.titanUp&&!s.titanSoon?18:0)+(s.foeCore<.35?15:0)-(s.foeForgefire?15:0);
  out.contest=s.titanUp||s.titanSoon?45+8*edge-(s.foeForgefire?10:0):0;
  out.hold=s.titanUp||s.titanSoon?35+8*Math.max(0,-edge):0;
  out.flank=s.titanUp&&s.foesOnTitan&&s.foesInPit&&s.titanPct<.6?55:0;
  out.steal=s.titanUp&&s.titanPct<BRAIN_RULES.stealHp&&s.foesOnTitan&&s.stealer?78:0;
  for(const p of TEAM_PLANS)if(out[p]>0)out[p]+=style[p]??0;
  return out;
 }
 // Deterministic choice with hysteresis: a plan is kept for at least 3 s unless the Core is in danger or the team must regroup.
 updateBrain(){
  for(const team of [0,1]){
   const b=this.brain[team],scores=this.planScores(team),best=TEAM_PLANS.reduce((p,q)=>scores[q]>scores[p]?q:p,TEAM_PLANS[0]),urgent=['defend','regroup'].includes(best)&&scores[best]>(scores[b.plan]??0);
   b.scores=scores;if(best===b.plan)continue;
   if(urgent||this.time-b.since>=BRAIN_RULES.commit&&scores[best]>(scores[b.plan]??0)+BRAIN_RULES.switchMargin||!(scores[b.plan]>0)){b.plan=best;b.since=this.time;this.planSwitches[team]++;if(this.time>0)this.log(`${team?'Red':'Blue'} team: ${PLAN_LABELS[best]}.`);}
  }
 }
 objectiveStep(dt){super.objectiveStep(dt);if(this.done)return;for(const team of [0,1])this.planSeconds[team][this.brain[team].plan]+=dt;if(this.time>=this.nextBrain){this.nextBrain=this.time+BRAIN_RULES.interval;this.updateBrain();}}
 hurt(t,f,...rest){const i=this.cores?.indexOf(t)??-1,before=t?.hp,result=super.hurt(t,f,...rest);if(i>=0&&t.hp<before)(this.coreHitAt??=[-Infinity,-Infinity])[i]=this.time;return result;}
 // Guarded holds only while the defenders near their Core are at least as many as the attackers there.
 guardCount(core){const defenders=super.guardCount(core),attackers=this.combatants.filter(f=>f.team!==core.team&&f.hp>0&&d(f,core)<=this.objectiveRules.guardRadius).length;return defenders>=attackers?defenders:0;}
 enemiesOf(f){const all=super.enemiesOf(f);return this.targetFilter?all.filter(this.targetFilter):all;}
 // Fighter-versus-fighter choice from the formation layer, limited to enemies the plan cares about.
 fight(f,filter=null){const previous=[this.selectingFight,this.targetFilter];this.selectingFight=true;this.targetFilter=filter;try{return fightTarget.call(this,f);}finally{[this.selectingFight,this.targetFilter]=previous;}}
 chooseTarget(f){
  const taunt=this.actorFor(f.tauntSource);if(f.tauntTime>0&&taunt?.hp>0)return taunt;
  if(!this.brain)return super.chooseTarget(f);
  const team=f.team,plan=this.brain[team].plan,t=this.titan,core=this.cores[1-team],ownCore=this.cores[team],pit=this.pit();
  const near=r=>this.combatants.some(e=>e.team!==team&&e.hp>0&&d(e,f)<r),fighter=()=>this.fight(f);
  if(plan==='defend')return this.fight(f,e=>!e.isObjective&&d(e,ownCore)<BRAIN_RULES.defendRange+60)??fighter();
  if(plan==='regroup'||plan==='hold')return fighter();
  if(plan==='siege')return core.hp>0&&(!near(BRAIN_RULES.fightRange)||f.role==='damage'&&d(f,core)<f.weapon.range+20)?core:fighter();
  if(plan==='flank')return this.fight(f,e=>!e.isObjective&&d(e,pit)<BRAIN_RULES.pitRadius+60)??fighter();
  if(plan==='steal'&&t.hp>0&&d(f,t)<BRAIN_RULES.stealReach&&(f.weapon.type!=='melee'||this.isSkirmisher(f)))return t;
  if((plan==='contest'||plan==='steal')&&t.hp>0&&!near(BRAIN_RULES.fightRange-10))return t;
  return fighter()??(core.hp>0?core:null);
 }
 // Where the plan lets the formation stand: a directional leash on how far it may push toward the enemy.
 planLeash(f){
  if(!this.brain)return null;const team=f.team,plan=this.brain[team].plan;
  if(plan==='regroup')return {ref:this.base(team),max:60};
  if(plan==='defend')return {ref:this.cores[team],max:240};
  if(plan==='hold')return {ref:this.choke(team),max:70};
  if(plan==='contest'&&this.titan.hp<=0){const pit=this.pit();return {ref:{x:pit.x+(team?110:-110),y:pit.y},max:40};}
  return null;
 }
 moveFighter(f,t,dt){const leash=f.intent&&!f.intent.support&&!t?.isObjective?this.planLeash(f):null;if(leash)f.intent={...f.intent,leash,u:f.intent.u??this.plans?.[f.team]?.u??{x:f.team?-1:1,y:0}};return super.moveFighter(f,t,dt);}
 result(){return {...super.result(),combatVersion:TEAM_ENGINE_VERSION};}
}

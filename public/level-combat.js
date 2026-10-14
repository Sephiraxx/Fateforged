// Levels and XP camps in Core siege (TEAM-BATTLES.md, "Levels and XP camps"). Fighters start at level 1 and earn XP
// from kills (assists too), the Forge Titan and two neutral Ember Wisps, one in each half of the field (mirrored, on
// the bottom lane, clear of every map's rocks). Each level adds damage,
// healing, health and speed; levels last the whole game, through respawns.
// - Kills: XP to the killer, less to every living ally who hurt the victim in the last seconds, and more for killing
//   a fighter of a higher level.
// - Titan: XP to every living fighter of the team that takes Forgefire.
// - Ember Wisps: XP to every living fighter of the team that lands the last hit. A wisp hits back at whoever hurts
//   it, heals up when left alone, and returns a while after it falls.
// - Brain: a few fighters go for a wisp when nothing presses them, as
//   the coach's camp dial allows: always, only when the team is not ahead in levels, or never.
//   (no enemy close, their Core safe, the team not on the Titan, a siege or a defence)
export const LEVEL_RULES=Object.freeze({xp:Object.freeze([0,200,450,750,1100,1500]),kill:120,assist:60,assistWindow:5,titan:150,camp:70,catchUp:.25,damage:.06,healing:.06,hp:.07,move:.02,levelHeal:.2});
export const CAMP_RULES=Object.freeze({spawn:20,titanSoon:8,respawn:45,hp:Object.freeze({3:600,5:800}),hit:.04,interval:1.5,reset:6,memory:3,reach:180,radius:24,spots:Object.freeze([Object.freeze([300,520]),Object.freeze([980,520])]),engage:260,call:700,guard:400,home:400,crew:Object.freeze({3:2,5:3})});
const NEVER=-1e9;
// Team plans (team-3.5 brain) that leave room for a wisp: not while the team steals the Titan, sieges or defends,
// nor while it contests a Titan that is up or about to rise.
const CAMP_PLANS=Object.freeze(['hold','flank','regroup']);
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const levelFor=xp=>{let level=1;while(level<LEVEL_RULES.xp.length&&xp>=LEVEL_RULES.xp[level])level++;return level;};
const bonus=(f,per)=>1+per*((f?.level??1)-1);

export function withLevels(Base){
 return class LevelBattle extends Base{
  constructor(...args){
   super(...args);
   for(const f of this.combatants){f.level=1;f.xp=0;f.hitBy=this.combatants.map(()=>NEVER);f.xpDown=false;}
   this.camps=CAMP_RULES.spots.map(([x,y],i)=>{const c=this.objectiveActor({id:'ember-wisp-'+i,name:'Ember Wisp',team:2,x,y,hp:CAMP_RULES.hp[this.size],radius:CAMP_RULES.radius},this.size*2+3+i);
    Object.assign(c,{hp:0,crit:0,accuracy:1,respawnAt:CAMP_RULES.spawn,lastHitAt:NEVER,hitter:-1,nextPulse:0});return c;});
   this.actors.push(...this.camps);this.campKills=[0,0];this.titanXp=0;
  }
  teamLevel(team){const mine=this.combatants.filter(f=>f.team===team);return mine.reduce((n,f)=>n+f.level,0)/mine.length;}
  gainXp(f,amount){
   f.xp+=amount;const level=levelFor(f.xp);if(level<=f.level)return;
   const old=f.maxHp;f.maxHp*=bonus({level},LEVEL_RULES.hp)/bonus(f,LEVEL_RULES.hp);f.level=level;
   if(f.hp>0){f.hp=Math.min(f.maxHp,f.hp+f.maxHp-old+f.maxHp*LEVEL_RULES.levelHeal);this.effect(9,f.x,f.y,40);}
   this.log(`${f.name} reaches level ${level}.`);
  }
  hurt(t,f,amount,...rest){
   const fighter=f&&!f.isObjective;if(fighter)amount*=bonus(f,LEVEL_RULES.damage);
   const before=t?.hp,result=super.hurt(t,f,amount,...rest);
   if(fighter&&t&&t.hp<before){
    if(this.camps.includes(t)){t.lastHitAt=this.time;t.hitter=f.index;if(before>0&&t.hp<=0)this.clearCamp(t,f);}
    else if(!t.isObjective&&t.team!==f.team)t.hitBy[f.index]=this.time;
   }
   return result;
  }
  clearCamp(c,f){
   c.respawnAt=this.time+CAMP_RULES.respawn;c.hitter=-1;this.campKills[f.team]++;
   for(const a of this.combatants)if(a.team===f.team&&a.hp>0)this.gainXp(a,LEVEL_RULES.camp);
   this.log(`${f.team?'Red':'Blue'} clears an Ember Wisp.`);
  }
  heal(f,amount){return super.heal(f,amount*bonus(this.healSource??f,LEVEL_RULES.healing));}
  upkeep(f,dt){super.upkeep(f,dt);if(f.level>1)f.move*=bonus(f,LEVEL_RULES.move);}
  respawn(f){super.respawn(f);f.xpDown=false;f.hitBy=f.hitBy.map(()=>NEVER);}
  objectiveStep(dt){
   super.objectiveStep(dt);if(this.done)return;
   // Kills: a fighter who went down since the last step pays out to the enemy who hit it last and its helpers.
   for(const v of this.combatants){
    if(v.hp>0||v.xpDown)continue;v.xpDown=true;
    const k=this.combatants[v.lastAttacker];if(!k||k.team===v.team)continue;
    this.gainXp(k,LEVEL_RULES.kill*(v.level>k.level?1+LEVEL_RULES.catchUp:1));
    for(const a of this.combatants)if(a!==k&&a.team===k.team&&a.hp>0&&this.time-v.hitBy[a.index]<=LEVEL_RULES.assistWindow)this.gainXp(a,LEVEL_RULES.assist);
   }
   while(this.titanXp<this.titanDeaths.length){const team=this.titanDeaths[this.titanXp++].team;for(const a of this.combatants)if(a.team===team&&a.hp>0)this.gainXp(a,LEVEL_RULES.titan);}
   for(const c of this.camps){
    if(c.hp<=0){if(this.time>=c.respawnAt){c.hp=c.maxHp;c.lastHitAt=NEVER;c.hitter=-1;c.nextPulse=this.time+CAMP_RULES.interval;this.log('An Ember Wisp appears.');}continue;}
    if(this.time-c.lastHitAt>CAMP_RULES.reset&&c.hp<c.maxHp){c.hp=c.maxHp;c.hitter=-1;}
    if(this.time<c.nextPulse)continue;c.nextPulse=this.time+CAMP_RULES.interval;
    const a=this.combatants[c.hitter];
    if(a&&a.hp>0&&d(a,c)<=CAMP_RULES.reach&&this.time-c.lastHitAt<=CAMP_RULES.memory){this.hurt(a,c,a.maxHp*CAMP_RULES.hit,'arcane',false);this.effect(14,a.x,a.y,24);}
   }
  }
  // A wisp for this fighter, when nothing presses it and its team sends it. The wisp in the team's own half is taken
  // on the way (fighters back from base pass it) unless the team defends; the far one only while the team holds,
  // flanks, regroups or waits for the Titan.
  campTarget(f,t){
   if(f.role==='healer'||f.tauntTime>0)return null;
   if(t&&!t.isObjective&&t.team!==f.team&&d(t,f)<=CAMP_RULES.engage)return null;
   const dial=this.gamePlan(f.team).camp??'behind',plan=this.brain?.[f.team]?.plan;
   if(dial==='never'||plan==='defend'||this.hasForgefire(f.team))return null;
   if(dial==='behind'&&this.teamLevel(f.team)>this.teamLevel(1-f.team))return null;
   const own=this.cores[f.team];if(this.combatants.some(e=>e.team!==f.team&&e.hp>0&&d(e,own)<CAMP_RULES.guard))return null;
   const camp=this.camps.filter(c=>c.hp>0).sort((a,b)=>d(a,f)-d(b,f)||a.index-b.index)[0];
   if(!camp||d(camp,f)>CAMP_RULES.call)return null;
   const home=Math.abs(camp.x-own.x)<CAMP_RULES.home;
   const titanSoon=this.titan?.hp>0||this.nextTitan-this.time<=CAMP_RULES.titanSoon;
   if(!home&&!(CAMP_PLANS.includes(plan)||plan==='contest'&&!titanSoon))return null;
   const crew=this.combatants.filter(a=>a.team===f.team&&a.hp>0&&a.role!=='healer').sort((a,b)=>d(a,camp)-d(b,camp)||a.index-b.index).slice(0,CAMP_RULES.crew[this.size]);
   return crew.includes(f)?camp:null;
  }
  chooseTarget(f){
   const t=super.chooseTarget(f),camp=this.campTarget(f,t);
   if(!camp)return t;f.laneWaypoint=null;return camp;
  }
  result(){
   const result=super.result(),by=new Map(this.combatants.map(f=>[f.id,f]));
   const lead=Math.round((this.teamLevel(0)-this.teamLevel(1))*100)/100;
   return {...result,fighters:result.fighters.map(r=>by.has(r.id)?{...r,level:by.get(r.id).level,xp:Math.round(by.get(r.id).xp)}:r),objective:{...result.objective,camps:[...this.campKills],levelLead:lead}};
  }
 };
}

import {neutralBalance,lineupGroups,balanceObservations,applyBalanceCheckpoint} from './team-balance.js';
import {teamKit,TEAM_KITS} from './team-kits.js';
import {supportAbility} from './support-abilities.js';
import {SERIES_TACTICS,seriesGameOptions,seriesScore} from './team-series.js';
// Team leagues (2v2 / 3v3 / 5v5): world creation, player ratings and salaries, AI head coaches and the draft.
// Pure and deterministic from the world seed, so the server re-runs every rule; clients never submit picks.
import {teamRole,combatNumbers} from './team-roles.js';
import {MAP_IDS} from './team-maps.js';
export const TEAM_LEAGUE_VERSION=1;
export const LEAGUE_SIZES=Object.freeze([8,16,32]);
// mix shapes the scouted pool so every composition is possible; teams are free to build any lineup.
export const FORMATS=Object.freeze({
 2:Object.freeze({size:2,rosterSize:4,mix:Object.freeze({tank:1.1,healer:1.1,controller:.9,damage:2})}),
 3:Object.freeze({size:3,rosterSize:5,mix:Object.freeze({tank:1.2,healer:1.2,controller:.8,damage:2})}),
 5:Object.freeze({size:5,rosterSize:8,mix:Object.freeze({tank:2,healer:2,controller:1.2,damage:2.8})})
});
export const POOL_FACTOR=1.5;
export const CONFERENCES=Object.freeze(['Sunward','Shadeward']);
export const DIVISIONS=Object.freeze(['Frostmark','Emberreach','Dawnvale','Duskhold']);
const PLACES=['Ashhold','Brightwater','Cindermoor','Duskwall','Embervale','Frosthelm','Gloamreach','Hollowmere','Ironcrest','Jadeport','Kingsfall','Lanternfen','Mistral Bay','Nightbloom','Oakenshade','Pyrewatch','Quillmarsh','Ravenspire','Saltcairn','Thornfield','Umberkeep','Vellmoor','Wyrmrest','Yewbridge','Starfall','Coldharbor','Goldmere','Stormhollow','Mooncrest','Sunreach','Briarwood','Deepforge','Highmarch','Rimeholt','Shadowfen','Silverrun'];
const MASCOTS=['Wyverns','Revenants','Ironclads','Stormcallers','Gryphons','Basilisks','Wardens','Phoenixes','Direwolves','Sentinels','Manticores','Valkyries','Juggernauts','Specters','Krakens','Hexblades','Thunderhawks','Golems','Banshees','Chimeras','Dreadnoughts','Lightbringers','Nightstalkers','Runeguard','Sunspears','Frostbites','Emberwings','Shadowfangs','Spellbreakers','Wildhunt','Bloodmoons','Starforged','Grimwalkers','Tidecallers','Ashborn','Oathkeepers'];
const COACH_FIRST=['Aldric','Brienne','Cassius','Delphine','Edric','Fenna','Gareth','Helena','Isolde','Jorah','Kestrel','Lysandra','Magnus','Nerys','Orrin','Petra','Quentin','Rowena','Soren','Tamsin','Ulric','Vesna','Wystan','Ysolde','Zarek','Mirela','Torvald','Anwen','Bastian','Corvina'];
const COACH_LAST=['Ashworth','Blackthorn','Coldwell','Draven','Everhart','Fairwind','Graves','Hollowell','Ironside','Kingsley','Lockhart','Morrow','Northcott','Oakhart','Pendragon','Quill','Ravensworth','Stormont','Thorne','Underhill','Vance','Whitlock','Yarrow','Zephyr','Brightmore','Duskmantle','Embercroft','Frostmane'];
// Coach personalities weigh rating, salary, role need and star power differently.
export const PERSONALITIES=Object.freeze({
 bargain:{label:'Bargain hunter',rating:1,cost:1.7,star:0,need:1,roles:{}},
 star:{label:'Star chaser',rating:1.25,cost:.45,star:1,need:.8,roles:{}},
 glass:{label:'Glass cannon',rating:1,cost:1,star:.35,need:.6,roles:{damage:1.25,controller:1.1,tank:.85}},
 fortress:{label:'Fortress builder',rating:1,cost:1,star:.2,need:1,roles:{tank:1.25,healer:1.2,damage:.88}},
 tactician:{label:'Tactician',rating:1,cost:1.1,star:.2,need:1.2,roles:{controller:1.3,healer:1.12}},
 balanced:{label:'Balanced',rating:1,cost:1,star:.2,need:1.4,roles:{}}
});
export function rng(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(list,seed){const out=[...list],random=rng(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const round1=n=>Math.round(n*10)/10;
export function format(value){const f=FORMATS[Number(value)];if(!f)throw new Error('Choose 2v2, 3v3 or 5v5.');return f;}
// ---------- Team compositions: each coach builds their own, and metas move them season to season ----------
export const ROLE_KEYS=Object.freeze(['tank','healer','controller','damage']);
// Starting composition weights by coach personality (before each coach's own seeded twist).
export const COMP_TEMPLATES=Object.freeze({
 fortress:Object.freeze({tank:2.2,healer:1.4,controller:.6,damage:1}),glass:Object.freeze({tank:.4,healer:.6,controller:.8,damage:2.6}),
 star:Object.freeze({tank:.8,healer:1.5,controller:.5,damage:1.8}),tactician:Object.freeze({tank:.8,healer:1,controller:2,damage:1.2}),
 balanced:Object.freeze({tank:1,healer:1,controller:.7,damage:1.6}),bargain:Object.freeze({tank:1,healer:1,controller:1,damage:1})
});
// How strongly each personality copies what won last season.
export const META_ADAPTATION=Object.freeze({tactician:.8,bargain:.7,balanced:.5,glass:.4,star:.2,fortress:.15});
export function coachComp(style,random,lean=null){const base=COMP_TEMPLATES[style]??COMP_TEMPLATES.balanced,comp={};for(const r of ROLE_KEYS)comp[r]=Math.round(base[r]*(.75+random()*.55)*(lean?Math.exp(.5*2.5*(lean[r]??0)):1)*100)/100;return comp;}
// Split n slots by weight (largest remainder; ties follow ROLE_KEYS order). Weights are sharpened (power 1.8) so a
// coach's strong preferences show up even in a 2- or 3-fighter lineup instead of always rounding to one of each.
export function compTargets(comp,n){const sharp=r=>Math.pow(comp?.[r]??1,1.8),total=ROLE_KEYS.reduce((a,r)=>a+sharp(r),0),raw=ROLE_KEYS.map(r=>sharp(r)/total*n),out=Object.fromEntries(ROLE_KEYS.map((r,i)=>[r,Math.floor(raw[i])]));let left=n-Object.values(out).reduce((a,b)=>a+b,0);
 for(const i of raw.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).map(x=>x[1])){if(left<=0)break;out[ROLE_KEYS[i]]++;left--;}return out;}
const teamComp=team=>team.coach.comp??COMP_TEMPLATES[team.coach.personality]??COMP_TEMPLATES.balanced;
export const rosterTargets=(w,team)=>compTargets(teamComp(team),w.settings.rosterSize);
export const starterTargets=(w,team)=>compTargets(teamComp(team),FORMATS[w.format].size);
const ROLE_LETTER={tank:'T',healer:'H',controller:'C',damage:'D'};
export function compKey(counts){return ROLE_KEYS.filter(r=>counts[r]).map(r=>`${counts[r]}${ROLE_LETTER[r]}`).join('·')||'—';}
export function compLabel(counts){const names={tank:['tank','tanks'],healer:['healer','healers'],controller:['controller','controllers'],damage:['damage','damage']};return ROLE_KEYS.filter(r=>counts[r]).map(r=>`${counts[r]} ${names[r][counts[r]>1?1:0]}`).join(' · ');}
const lineupCounts=(w,ids)=>{const c={tank:0,healer:0,controller:0,damage:0};for(const id of ids){const f=w.fighters[id];if(f)c[f.role]++;}return c;};
export function poolSize(formatSize,teams){return Math.ceil(teams*format(formatSize).rosterSize*POOL_FACTOR);}
// Pool plan: the role and tier of every fighter to generate, fixed by the seed so the server can verify tiers.
export function poolPlan(formatSize,teams,seed){
 if(!LEAGUE_SIZES.includes(teams))throw new Error('Choose 8, 16 or 32 teams.');
 const f=format(formatSize),total=poolSize(formatSize,teams),weight=Object.values(f.mix).reduce((a,b)=>a+b,0),counts={};
 for(const role of ['tank','healer','controller'])counts[role]=Math.round(total*f.mix[role]/weight);counts.damage=total-counts.tank-counts.healer-counts.controller;
 return planSlots(counts,seed);
}
function planSlots(counts,seed){const random=rng(seed^0x9e3779b9),slots=[];for(const [role,count]of Object.entries(counts))for(let i=0;i<count;i++){const roll=random();slots.push({role,tier:roll<.02?'SS':roll<.30?'S':'A'});}return shuffle(slots,seed^0x51ed270b);}
// Overall rating (OVR, 40–99) from closed-form combat numbers, weighted by measured team-battle impact
// (scripts/evaluate-team-values.mjs, validation/team-values.json).
export const RATING_MODEL=Object.freeze({"intercept":-2.386,"ehp":0.391,"dps":-0.047,"spell":0.151,"ability":0.046,"speed":0.259,"iq":0.158,"kits":{"mendingWave":-0.02,"chainHeal":-0.042,"resurrection":0.109,"cleanse":-0.027,"barrier":-0.02,"stunBolt":-0.049,"hamstring":-0.024,"disarmShot":0.062,"tauntShout":-0.064,"knockUp":0.022},"roles":{"tank":0,"healer":-0.003,"controller":-0.029,"damage":0.085}});
const ABILITY_WEIGHT={Common:.5,Uncommon:1,Rare:1.6,Legendary:2.4};
export function ratingFeatures(character){
 const n=combatNumbers(character),s=(character.summary?.stats||[0,0,0,0,0]).map(v=>Math.sqrt(Math.max(0,Number(v)||0))),traits=character.traits||{},catalog=(character.summary?.generationVersion??1)>=4?globalThis.CURRENT_CLASS_ABILITIES:globalThis.CLASS_ABILITIES;
 const ability=[traits.power,traits.power2].reduce((sum,name)=>sum+(ABILITY_WEIGHT[name&&catalog.definition(name)?.rarity]??0),0);
 return {ehp:Math.log(n.effectiveHp),dps:Math.log(Math.max(1,n.dps)),spell:n.spell/50,ability,speed:s[1]/20,iq:s[3]/20,...Object.fromEntries(Object.keys(TEAM_KITS).map(id=>['kit_'+id,character.teamKit===id?1:0]))};
}
export function rawRating(character,role=teamRole(character).role){const x=ratingFeatures(character),m=RATING_MODEL;return m.intercept+m.ehp*x.ehp+m.dps*x.dps+m.spell*x.spell+m.ability*x.ability+m.speed*x.speed+m.iq*x.iq+(m.roles[role]??0);}
// A smooth scale preserves differences between strong recruits instead of
// flattening every prediction above .75 to 99. Career progression still applies.
export function overall(character,role){return Math.max(40,Math.min(99,Math.round(40+59/(1+Math.exp(-5*(rawRating(character,role)-.5))))));}
function previousOverall(character,role){const x=ratingFeatures(character),kit=Object.entries(RATING_MODEL.kits).reduce((n,[id,weight])=>n+weight*x['kit_'+id],0);return Math.max(40,Math.min(99,Math.round(40+(rawRating(character,role)+kit-.25)*118)));}
export function prepareSupportRules(w){
 if(!w||w.supportRulesVersion===1||w.pendingSeries)return w;
 for(const f of Object.values(w.fighters)){
  const progress=f.ovr-previousOverall(f,f.role),before=f.ovr;
  if(f.teamKit)f.legacyTeamKit=f.teamKit;
  delete f.teamKit;
  if(f.ratingVersion!==2)f.ovr=Math.max(40,Math.min(99,overall(f,f.role)+progress));f.ratingVersion=2;
  // Existing contracts keep their price until the normal offseason update.
  if(f.ovr!==before)f.lastOvr=before;
 }
 w.supportRulesVersion=1;w.engine=TEAM_COMBAT_VERSION;
 if(w.balance)w.balance.samples=[];
 if(w.teamEngine)w.teamEngine=w.settings.battleMode==='core'?OBJECTIVE_COMBAT_VERSION:TEAM_COMBAT_VERSION;
 return w;
}
// Salaries (millions of crowns) rise steeply with OVR, so nobody can afford a roster of stars.
export function salaryFor(ovr){return round1(Math.max(.8,.8+13.2*Math.pow(Math.max(0,ovr-50)/49,2.3)));}
export function scoutFighter(character){const {role,secondary}=teamRole(character),ovr=overall(character,role);return {role,secondary,ovr,salary:salaryFor(ovr)};}
export function structure(teams){
 const divisions=teams===32?4:teams===16?2:1,perDivision=teams/(2*divisions);
 return CONFERENCES.map((name,c)=>({name,divisions:DIVISIONS.slice(0,divisions).map((division,d)=>({name:division,slots:Array.from({length:perDivision},(_,i)=>c*divisions*perDivision+d*perDivision+i)}))}));
}
function teamIdentities(teams,seed){
 const places=shuffle(PLACES,seed^0xa11ce),mascots=shuffle(MASCOTS,seed^0xb0b),firsts=shuffle(COACH_FIRST,seed^0xc0ac4),lasts=shuffle(COACH_LAST,seed^0xd00d),styles=shuffle(Object.keys(PERSONALITIES),seed^0xe1e1);
 return Array.from({length:teams},(_,i)=>({name:`${places[i%places.length]} ${mascots[i%mascots.length]}`,coach:{name:`${firsts[i%firsts.length]} ${lasts[(i*7)%lasts.length]}`,personality:styles[i%styles.length]}}));
}
const FIGHTER_KEYS=['race','subrace','class','subclass','strength','speed','durability','iq','magic','weapon','mastery','power','power2','weakness'];
export function create({id,format:formatSize,teams,seed,fighters,battleMode='teamfight'}){
 const f=format(formatSize);if(!['teamfight','core'].includes(battleMode)||battleMode==='core'&&f.size===2)throw new Error('Core siege requires 3v3 or 5v5.');if(!LEAGUE_SIZES.includes(teams))throw new Error('Choose 8, 16 or 32 teams.');
 const plan=poolPlan(formatSize,teams,seed);if(!Array.isArray(fighters)||fighters.length!==plan.length)throw new Error(`The fighter pool must hold ${plan.length} fighters.`);
 const roster={},seen=new Set();
 fighters.forEach((c,i)=>{
  if(!c||typeof c.id!=='string'||!c.id||c.id.length>80||seen.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)throw new Error('Invalid pool fighter.');seen.add(c.id);
  if(!c.traits||FIGHTER_KEYS.some(k=>typeof c.traits[k]!=='string'))throw new Error('Pool fighters need all fourteen traits.');
  if(c.summary?.tier!==plan[i].tier)throw new Error('A pool fighter does not match its planned tier.');
  roster[c.id]={id:c.id,name:c.name.trim(),traits:{...c.traits},summary:{stats:[...c.summary.stats],total:c.summary.total,tier:c.summary.tier,generationVersion:c.summary.generationVersion??3},...scoutFighter(c),ratingVersion:2,team:null};
 });
 const layout=structure(teams),identities=teamIdentities(teams,seed),list=[];
 identities.forEach((x,i)=>{x.coach.comp=coachComp(x.coach.personality,rng((seed^Math.imul(i+1,0x85ebca6b))>>>0));});
 layout.forEach(conference=>conference.divisions.forEach(division=>division.slots.forEach(slot=>list.push({id:`t${slot+1}`,name:identities[slot].name,conference:conference.name,division:division.name,coach:identities[slot].coach,roster:[],lineup:[]}))));
 list.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
 // Cap: an average team can afford the average salary of the fighters who will be drafted.
 const drafted=Object.values(roster).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,teams*f.rosterSize),cap=round1(drafted.reduce((n,x)=>n+x.salary,0)/teams);
 return {version:TEAM_LEAGUE_VERSION,engine:TEAM_COMBAT_VERSION,format:f.size,id,seed:seed>>>0,season:1,phase:'draft',
  supportRulesVersion:1,balance:neutralBalance(),settings:{teams,battleMode,rosterSize:f.rosterSize,salaryCap:cap,minSalary:Math.min(...Object.values(roster).map(x=>x.salary))},
  conferences:layout.map(c=>({name:c.name,divisions:c.divisions.map(d=>({name:d.name,teams:d.slots.map(s=>`t${s+1}`)}))})),
  teams:list,fighters:roster,draft:{order:shuffle(list.map(t=>t.id),seed^0x5eed),picks:[],complete:false}};
}
export const teamById=(w,id)=>w.teams.find(t=>t.id===id);
export const payroll=(w,team)=>round1(team.roster.reduce((n,id)=>n+w.fighters[id].salary,0));
export const capSpace=(w,team)=>round1(w.settings.salaryCap-payroll(w,team));
export const available=w=>Object.values(w.fighters).filter(f=>!f.team);
export function roleCounts(w,team){const counts={tank:0,healer:0,controller:0,damage:0};for(const id of team.roster)counts[w.fighters[id].role]++;return counts;}
// Season-1 drafts snake through a seeded order; offseason drafts list their slots (worst record first, every round).
export function draftSlot(w,index=w.draft.picks.length){
 if(w.draft.slots){const slot=w.draft.slots[index];return slot&&{index,round:slot.round,pick:slot.pick,team:slot.team};}
 const n=w.teams.length,round=Math.floor(index/n),position=index%n;return {index,round:round+1,pick:position+1,team:w.draft.order[round%2?n-1-position:position]};
}
export const totalPicks=w=>w.draft.slots?w.draft.slots.length:w.teams.length*w.settings.rosterSize;
// Coaches budget a margin because rivals may draft the cheap fighters they were counting on.
export const RESERVE_MARGIN=1.15;
// Who a team may draft: affordable after reserving room to fill every remaining slot and unmet role.
export function eligible(w,team){
 const slotsLeft=w.settings.rosterSize-team.roster.length,space=capSpace(w,team),pool=available(w);
 // No role is mandatory: "unmet" is only the coach's own plan, used to value fighters, never to restrict picks.
 const counts=roleCounts(w,team),plan=rosterTargets(w,team),unmet=Object.fromEntries(ROLE_KEYS.map(r=>[r,Math.max(0,plan[r]-counts[r])]));
 const bySalary=pool.slice().sort((a,b)=>a.salary-b.salary||(a.id<b.id?-1:1));
 const reserveFor=x=>{let total=0,free=slotsLeft-1;for(const y of bySalary){if(free<=0)break;if(y.id!==x.id){total+=y.salary;free--;}}return free>0?Infinity:total*RESERVE_MARGIN;};
 const candidates=pool.filter(x=>x.salary+reserveFor(x)<=space+1e-9);
 // Minimum-contract exception: when nothing fits, the cheapest fighter may be signed past the cap.
 const exception=candidates.length?null:bySalary[0];
 return {candidates:exception?[exception]:candidates,counts,unmet};
}
export function coachValue(w,team,x,counts,unmet,noise=()=>.5){
 const style=PERSONALITIES[team.coach.personality],average=w.settings.salaryCap/w.settings.rosterSize,plan=rosterTargets(w,team);
 const need=unmet[x.role]>0?1+.35*style.need:counts[x.role]>=plan[x.role]+1?.7:.9;
 return Math.pow(x.ovr/70,1+style.star)*70*style.rating*(style.roles[x.role]??1)*need-style.cost*(x.salary/average)*9+(noise()-.5)*2;
}
// AI head coach: weigh OVR, salary, role needs and personality; never break the cap or the ability to fill the roster.
export function coachChoice(w,team){
 const {candidates,counts,unmet}=eligible(w,team),noise=rng(w.seed^(w.season>1?Math.imul(w.season,0x2545f491):0)^Math.imul(w.draft.picks.length+1,2654435761));
 let best=null,score=-Infinity;
 for(const x of candidates.slice().sort((a,b)=>a.id<b.id?-1:1)){const value=coachValue(w,team,x,counts,unmet,noise);if(value>score){score=value;best=x;}}
 return best;
}
const isUser=(w,teamId)=>!!teamId&&w.settings.userTeam===teamId;
export function onTheClock(w){return w.draft.complete?null:draftSlot(w).team;}
// One pick. A user-coached team must name its fighter; every AI team picks for itself.
export function draftPick(w,fighterId=null){
 if(w.draft.complete)throw new Error('The draft is complete.');
 const slot=draftSlot(w),team=teamById(w,slot.team);let choice;
 if(isUser(w,team.id)){
  if(!fighterId)throw new Error('Your team is on the clock. Make your pick.');
  choice=eligible(w,team).candidates.find(x=>x.id===fighterId);
  if(!choice)throw new Error(w.fighters[fighterId]?.team===null?'That pick would break the salary cap or leave a required role unfilled.':'That fighter is not available.');
 }else{if(fighterId)throw new Error('It is not your pick.');choice=coachChoice(w,team);}
 const exception=choice.salary>capSpace(w,team)+1e-9;choice.team=team.id;team.roster.push(choice.id);delete choice.freeAgentSince;
 w.draft.picks.push({n:slot.index+1,round:slot.round,pick:slot.pick,team:team.id,fighter:choice.id,salary:choice.salary,ovr:choice.ovr,...(exception?{exception:true}:{})});
 if(w.draft.picks.length>=totalPicks(w)){w.draft.complete=true;if(w.phase==='offseason')newSeason(w);else{w.phase='ready';for(const t of w.teams)t.lineup=bestLineup(w,t);}}
 return w.draft.picks.at(-1);
}
// AI picks stop when the user-coached team comes on the clock.
export function draftPicks(w,count){const made=[];for(let i=0;i<count&&!w.draft.complete;i++){if(isUser(w,onTheClock(w)))break;made.push(draftPick(w));}return made;}
// Starters follow the coach's composition plan with the best fighters per role, then the strongest remaining.
export function bestLineup(w,team){
 const f=FORMATS[w.format],left=team.roster.map(id=>w.fighters[id]).sort((a,b)=>b.ovr-a.ovr||(a.id<b.id?-1:1)),lineup=[],plan=starterTargets(w,team);
 for(const role of ROLE_KEYS)for(let n=0;n<plan[role];n++){const i=left.findIndex(x=>x.role===role);if(i>=0)lineup.push(left.splice(i,1)[0].id);}
 while(lineup.length<f.size&&left.length)lineup.push(left.shift().id);
 return lineup;
}
export const teamOverall=(w,team)=>{const ids=team.lineup.length?team.lineup:bestLineup(w,team);return ids.length?Math.round(ids.reduce((n,id)=>n+w.fighters[id].ovr,0)/ids.length):0;};
export const starters=(w,team)=>(team.lineup.length?team.lineup:bestLineup(w,team)).map(id=>w.fighters[id]);

// ---------- Season and playoffs (phase 3) ----------
export const SEASON_CONDITIONS=Object.freeze({time:'random',weather:'random',ground:'random',map:'random'});
// Results must come from the current team engine (combat-team.js TEAM_ENGINE_VERSION); recorded games are never re-checked.
export const TEAM_COMBAT_VERSION='team-2.4';
export const OBJECTIVE_COMBAT_VERSION='team-3.1';
export const PLAYOFF_SPOTS=Object.freeze({8:2,16:4,32:7});
export const ROUND_NAMES=Object.freeze({wildcard:'Wildcard round',divisional:'Divisional round',semifinal:'Conference semifinal',conference:'Conference final',final:'Forgefire Crown'});
const DIVISION_ROUNDS=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
const DIVISION_PAIRINGS=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
const grid=w=>w.conferences.map(c=>c.divisions.map(d=>d.teams));
// Every round is a perfect matching (each team plays exactly once), so weeks have no byes.
export function buildSchedule(w){
 const C=grid(w),divisions=C[0].length,season=w.season,rounds=[],home=(a,b,flip)=>flip?[b,a]:[a,b];
 for(const leg of [0,1])for(const pairs of DIVISION_ROUNDS)rounds.push(C.flatMap(conf=>conf.flatMap(div=>pairs.map(([a,b])=>home(div[a],div[b],leg)))));
 const bipartite=(groups,offsetSame=false)=>{for(let k=0;k<(offsetSame?1:4);k++)rounds.push(groups.flatMap(([A,B])=>A.map((team,i)=>home(team,B[(i+k)%4],(k+i)%2))));};
 if(divisions===4){
  const pairing=DIVISION_PAIRINGS[(season-1)%3];
  bipartite(C.flatMap(conf=>pairing.map(([x,y])=>[conf[x],conf[y]])));
  bipartite(C[0].map((div,d)=>[div,C[1][(d+season-1)%4]]));
  const [[a,b],[c,d]]=pairing;for(const pairs of [[[a,c],[b,d]],[[a,d],[b,c]]])bipartite(C.flatMap(conf=>pairs.map(([x,y])=>[conf[x],conf[y]])),true);
  bipartite(C[0].map((div,d)=>[div,C[1][(d+season+1)%4]]),true);
 }else if(divisions===2){bipartite(C.map(conf=>[conf[0],conf[1]]));bipartite(C[0].map((div,d)=>[div,C[1][(d+season-1)%2]]));}
 else bipartite([[C[0][0],C[1][0]]]);
 return shuffle(rounds.map((games,i)=>({games,i})),w.seed^Math.imul(season,0x632be5ab)).map(({games},week)=>({week:week+1,games:games.map(([homeTeam,away],n)=>({id:`s${season}:w${week+1}:${n}`,home:homeTeam,away}))}));
}
const matchSeed=(w,id)=>{let h=w.seed^Math.imul(w.season,0x632be5ab);for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
export function startSeason(w){
 if(w.phase!=='ready')throw new Error('Finish the draft before the season.');
 w.teamEngine=w.settings.battleMode==='core'?OBJECTIVE_COMBAT_VERSION:TEAM_COMBAT_VERSION;w.balance??=neutralBalance();w.balance.samples=[];delete w.pendingSeries;w.schedule=buildSchedule(w);w.results=[];w.stats={};w.playoffs=null;w.phase='season';for(const t of w.teams)if(!t.lineup.length)t.lineup=bestLineup(w,t);return w;
}
const record=(results,id)=>{let wins=0,losses=0;for(const r of results){if(r.home!==id&&r.away!==id)continue;if(r.winner===id)wins++;else losses++;}return [wins,losses];};
const pct=([wins,losses])=>wins+losses?wins/(wins+losses):0;
const tiebreak=(w,id)=>matchSeed(w,'tiebreak:'+id);
export function standings(w,ids=w.teams.map(t=>t.id)){
 const results=w.results??[],team=id=>teamById(w,id),rows=ids.map(id=>{const t=team(id),overall=record(results,id),div=record(results.filter(r=>team(r.home===id?r.away:r.home).division===t.division&&team(r.home===id?r.away:r.home).conference===t.conference),id),conf=record(results.filter(r=>team(r.home===id?r.away:r.home).conference===t.conference),id);let margin=0,streak='';for(const r of results){if(r.home!==id&&r.away!==id)continue;margin+=(r.home===id?1:-1)*(r.hp[0]-r.hp[1]);}
  for(const r of results.filter(r=>r.home===id||r.away===id).reverse()){const won=r.winner===id;if(!streak)streak=(won?'W':'L')+'1';else if(streak[0]===(won?'W':'L'))streak=streak[0]+(Number(streak.slice(1))+1);else break;}
  return {id,team:t.name,wins:overall[0],losses:overall[1],pct:pct(overall),division:div,conference:conf,margin,streak};});
 const compare=(a,b)=>b.pct-a.pct;rows.sort(compare);
 // Tied groups: head-to-head within the group, then division, conference, HP margin and a seeded coin.
 const out=[];for(let i=0;i<rows.length;){let j=i;while(j<rows.length&&rows[j].pct===rows[i].pct)j++;const group=rows.slice(i,j),members=new Set(group.map(r=>r.id)),h2h=Object.fromEntries(group.map(r=>[r.id,pct(record(results.filter(x=>members.has(x.home)&&members.has(x.away)),r.id))]));
  group.sort((a,b)=>h2h[b.id]-h2h[a.id]||pct(b.division)-pct(a.division)||pct(b.conference)-pct(a.conference)||b.margin-a.margin||tiebreak(w,a.id)-tiebreak(w,b.id));out.push(...group);i=j;}
 return out;
}
export function divisionStandings(w){return w.conferences.map(c=>({name:c.name,divisions:c.divisions.map(d=>({name:d.name,rows:standings(w,d.teams)}))}));}
export function playoffSeeds(w){
 const spots=PLAYOFF_SPOTS[w.teams.length];
 return Object.fromEntries(w.conferences.map(c=>{const leaders=standings(w,c.divisions.map(d=>standings(w,d.teams)[0].id)),rest=standings(w,c.divisions.flatMap(d=>d.teams).filter(id=>!leaders.some(l=>l.id===id)));const seeded=c.divisions.length>1?[...leaders,...rest]:standings(w,c.divisions[0].teams);return [c.name,seeded.slice(0,spots).map(r=>r.id)];}));
}
const seriesFor=(w,round,pairs,bestOf)=>pairs.map(([a,b],n)=>({id:`s${w.season}:p:${round}:${n}`,round,home:a,away:b,bestOf,games:[],winner:null}));
function openRound(w){
 const p=w.playoffs,spots=PLAYOFF_SPOTS[w.teams.length],done=p.rounds.at(-1),winners=done?done.series.map(s=>s.winner):null,seedOf=(conf,id)=>p.seeds[conf].indexOf(id);
 const confOf=id=>teamById(w,id).conference,next=[];
 if(!done){
  const key=spots===7?'wildcard':spots===4?'semifinal':'conference';
  for(const conf of w.conferences.map(c=>c.name)){const s=p.seeds[conf];next.push(...(spots===7?[[s[1],s[6]],[s[2],s[5]],[s[3],s[4]]]:spots===4?[[s[0],s[3]],[s[1],s[2]]]:[[s[0],s[1]]]));}
  p.rounds.push({key,name:ROUND_NAMES[key],series:seriesFor(w,key,next,3)});return;
 }
 if(done.key==='conference'){const [a,b]=winners,order=standings(w,[a,b]);p.rounds.push({key:'final',name:ROUND_NAMES.final,series:seriesFor(w,'final',[[order[0].id,order[1].id]],5)});return;}
 const key=done.key==='wildcard'?'divisional':'conference';
 for(const conf of w.conferences.map(c=>c.name)){
  const alive=[...(done.key==='wildcard'?[p.seeds[conf][0]]:[]),...winners.filter(id=>confOf(id)===conf)].sort((a,b)=>seedOf(conf,a)-seedOf(conf,b));
  // Re-seed: the best remaining seed hosts the lowest.
  next.push(...(alive.length===4?[[alive[0],alive[3]],[alive[1],alive[2]]]:[[alive[0],alive[1]]]));
 }
 p.rounds.push({key,name:ROUND_NAMES[key],series:seriesFor(w,key,next,3)});
}
function startPlayoffs(w){w.phase='playoffs';w.playoffs={seeds:playoffSeeds(w),rounds:[],champion:null};openRound(w);}
// The next matches to simulate, in the order the server will accept them.
export function upcoming(w,limit=Infinity){
 const out=[];if(w.phase==='season'){const played=w.results.length;let n=0;for(const week of w.schedule)for(const g of week.games){if(n++<played)continue;out.push({...g,kind:'regular',week:week.week,bestOf:1});}}
 else if(w.phase==='playoffs'){for(const s of w.playoffs.rounds.at(-1).series){if(s.winner)continue;out.push({...s,kind:'playoff'});}}
 if(w.pendingSeries)out.sort((a,b)=>(b.id===w.pendingSeries.matchId)-(a.id===w.pendingSeries.matchId));return out.slice(0,limit).map(m=>describe(w,m));
}
function describe(w,m){const home=teamById(w,m.home),away=teamById(w,m.away);const partial=w.pendingSeries?.matchId===m.id?w.pendingSeries:null;return {...m,engineVersion:w.teamEngine??'team-2',...(['team-2.3','team-2.4','team-3-core','team-3','team-3.1'].includes(w.teamEngine)?{balance:structuredClone(w.balance?.profile??neutralBalance().profile)}:{}),seriesRulesVersion:2,coachStyles:[home.coach.personality,away.coach.personality],userSide:[home.id,away.id].indexOf(w.settings.userTeam),...(partial?{initialLineups:partial.lineups,initialTactics:partial.tactics,completedGames:partial.games}:{}),seed:matchSeed(w,m.id),conditions:SEASON_CONDITIONS,lineups:[home.lineup,away.lineup],tactics:[teamTactic(w,home),teamTactic(w,away)]};}
export const squads=(w,match)=>seriesGameOptions(match,match.completedGames??[]).lineups.map(ids=>ids.map(id=>{const f=w.fighters[id];return {id:f.id,name:f.name,teamKit:['team-2.2','team-2.3','team-3-core','team-3'].includes(match.engineVersion)?f.teamKit??f.legacyTeamKit:null,traits:f.traits,summary:f.summary};}));
const ENVIRONMENT={time:['dawn','day','dusk','night'],weather:['clear','rain','frost','storm'],ground:['stone','water'],map:MAP_IDS};
function validGame(game,lineups,engineVersion){
 const ids=lineups.flat(),count=n=>Number.isInteger(n)&&n>=0&&n<=1e7;
 if(!game||game.combatVersion!==engineVersion||![0,1].includes(game.winnerTeam)||!Number.isFinite(game.seconds)||game.seconds<=0||game.seconds>(engineVersion.startsWith('team-3')?390.5:120.5))return false;
 if(!Array.isArray(game.hp)||game.hp.length!==2||game.hp.some(h=>!Number.isInteger(h)||h<0||h>100))return false;
 if(!game.environment||Object.entries(ENVIRONMENT).some(([k,v])=>!v.includes(game.environment[k])))return false;
 if(!Array.isArray(game.fighters)||game.fighters.length!==ids.length||game.fighters.some((f,i)=>f?.id!==ids[i]||!count(f.damage)||!count(f.healing)||!count(f.kills)||!count(f.deaths)||!(f.ccSeconds>=0&&Number.isFinite(f.ccSeconds)&&f.ccSeconds<=game.seconds*2+1)))return false;
 if(engineVersion.startsWith('team-3')){
  const o=game.objective,pair=(a,test)=>Array.isArray(a)&&a.length===2&&a.every(test),finite=n=>Number.isFinite(n)&&n>=0;
  if(!o||!pair(o.coreHp,n=>finite(n)&&n<=100)||!pair(o.monsterKills,count)||!pair(o.steals,count)||!pair(o.forgefireSeconds,n=>finite(n)&&n<=game.seconds+.1)||typeof o.suddenDeath!=='boolean')return false;
  if(o.steals.some((n,i)=>n>o.monsterKills[i])||o.coreHp.every(n=>n===0)||o.coreHp[game.winnerTeam]===0||o.coreHp[1-game.winnerTeam]>0&&game.seconds<389.9)return false;
  if(o.suddenDeath&&game.seconds<359.9||!o.suddenDeath&&game.seconds>=360.1)return false;
  if(game.seconds>=389.9&&o.coreHp[game.winnerTeam]<o.coreHp[1-game.winnerTeam])return false;
  if(engineVersion==='team-3-core'&&[...o.monsterKills,...o.steals,...o.forgefireSeconds].some(n=>n!==0))return false;
  if(game.fighters.some(f=>!count(f.objectiveDamage)||!count(f.monsterLastHits)||!finite(f.downSeconds)||f.downSeconds>game.seconds+.1))return false;
 }
 return true;
}
function addStats(w,games,lineups){for(const game of games){const winners=new Set(lineups[game.winnerTeam]);for(const f of game.fighters){const s=w.stats[f.id]??={games:0,wins:0,damage:0,healing:0,kills:0,deaths:0,ccSeconds:0};s.games++;if(winners.has(f.id))s.wins++;s.damage+=f.damage;s.healing+=f.healing;s.kills+=f.kills;s.deaths+=f.deaths;s.ccSeconds=Math.round((s.ccSeconds+f.ccSeconds)*10)/10;if(game.objective)for(const key of ['objectiveDamage','downSeconds','monsterLastHits'])s[key]=(s[key]??0)+(f[key]??0);}}}
// Records one simulated match. Only the exact next match is accepted, with a complete, valid series.
export function recordMatch(w,matchId,games){
 const [m]=upcoming(w,w.phase==='playoffs'?Infinity:1).filter(x=>w.phase==='season'||x.id===matchId);
 if(!m||m.id!==matchId)throw new Error('That is not the next team-league match.');
 const need=Math.ceil(m.bestOf/2);if(!Array.isArray(games)||!games.length||games.length>m.bestOf)throw new Error('Invalid team-league series.');
 const partial=w.pendingSeries?.matchId===matchId?w.pendingSeries:null;
 if(w.pendingSeries&&!partial)throw new Error('Finish the paused series first.');
 if(partial&&JSON.stringify(games.slice(0,partial.games.length))!==JSON.stringify(partial.games))throw new Error('Completed series games cannot be changed.');
 const score=[0,0],accepted=[];games.forEach((g,i)=>{if(score[0]>=need||score[1]>=need)throw new Error('The series was already decided.');const plan=validateSeriesGame(w,m,g,accepted);accepted.push({...g,...plan});score[g.winnerTeam]++;});
 if(Math.max(...score)!==need)throw new Error('The series is not complete.');
 const winner=score[0]>score[1]?m.home:m.away;if(m.balance){w.balance??=neutralBalance();for(const g of accepted)w.balance.samples.push(balanceObservations(g.lineups.map(ids=>lineupGroups(ids.map(id=>w.fighters[id]))),g.winnerTeam));}for(const g of accepted)addStats(w,[g],g.lineups);delete w.pendingSeries;
 const countsFor=lineups=>lineups.map(ids=>{const c=lineupCounts(w,ids);return ROLE_KEYS.map(r=>c[r]);}),comps=countsFor(accepted[0].lineups);
 if(m.kind==='regular'){const g=games[0];w.results.push({id:m.id,week:m.week,home:m.home,away:m.away,winner,hp:g.objective?g.objective.coreHp.map(Math.round):g.hp,seconds:g.seconds,comps,objective:g.objective,engineVersion:m.engineVersion,balance:m.balance,lineups:accepted[0].lineups});balanceCheckpoint(w,'halfway');if(w.results.length===w.schedule.reduce((n,x)=>n+x.games.length,0))startPlayoffs(w);}
 else{const s=w.playoffs.rounds.at(-1).series.find(x=>x.id===m.id);s.games=accepted.map(g=>({winnerTeam:g.winnerTeam,hp:g.hp,seconds:g.seconds,lineups:g.lineups,tactics:g.tactics,objective:g.objective,engineVersion:m.engineVersion,balance:m.balance,comps:countsFor(g.lineups)}));s.comps=comps;s.winner=winner;
  if(w.playoffs.rounds.at(-1).series.every(x=>x.winner)){if(s.round==='final'){w.playoffs.champion=winner;finishSeason(w,s);}else openRound(w);}}
 return {id:m.id,winner,score};
}
function validateSeriesGame(w,m,g,previous){
 const plan=seriesGameOptions(m,previous),lineups=g.lineups??plan.lineups,tactics=g.tactics??plan.tactics;
 if(!Array.isArray(lineups)||lineups.length!==2||!Array.isArray(tactics)||tactics.length!==2)throw new Error('Invalid game lineup or tactic.');
 for(const side of [0,1]){const team=teamById(w,side?m.away:m.home),ids=lineups[side];
  if(!Array.isArray(ids)||ids.length!==w.format||new Set(ids).size!==ids.length||ids.some(id=>!team.roster.includes(id))||side!==m.userSide&&JSON.stringify(ids)!==JSON.stringify(plan.lineups[side]))throw new Error('Choose starters from the coached team roster only.');
  if(!SERIES_TACTICS.includes(tactics[side])||side!==m.userSide&&tactics[side]!==plan.tactics[side])throw new Error('The AI coach tactic must follow the series plan.');
 }
 if(m.balance&&g.balanceId!==m.balance.id)throw new Error('This result used a different league patch.');
 if(!validGame(g,lineups,m.engineVersion))throw new Error('Invalid team-league game result.');
 return {lineups:lineups.map(ids=>[...ids]),tactics:[...tactics]};
}
export function recordSeriesGame(w,matchId,game){
 const m=upcoming(w,w.phase==='playoffs'?Infinity:1).find(x=>x.id===matchId);if(!m)throw new Error('That is not the next team-league match.');
 if(w.pendingSeries&&w.pendingSeries.matchId!==matchId)throw new Error('Finish the paused series first.');
 const partial=w.pendingSeries??{matchId,lineups:structuredClone(m.lineups),tactics:[...m.tactics],games:[]},plan=validateSeriesGame(w,m,game,partial.games),games=[...partial.games,{...game,...plan}],score=seriesScore(games);
 if(Math.max(...score)===Math.ceil(m.bestOf/2)){recordMatch(w,matchId,games);return {complete:true,score};}
 w.pendingSeries={...partial,games};return {complete:false,score};
}
export function impact(s){return s.damage+s.healing*1.1+s.kills*120+s.ccSeconds*30+(s.objectiveDamage??0)*.4+(s.monsterLastHits??0)*300;}
function finishSeason(w,final){
 const runnerUp=final.home===final.winner?final.away:final.home,best=Object.entries(w.stats).sort((a,b)=>impact(b[1])-impact(a[1])||(a[0]<b[0]?-1:1))[0];
 const mvp=best?.[0]??null;w.titles=[...(w.titles??[]),{season:w.season,champion:final.winner,championName:teamById(w,final.winner).name,runnerUp,mvp,mvpName:mvp&&w.fighters[mvp].name,mvpTeam:mvp&&w.fighters[mvp].team}];w.phase='complete';
}
export function leaders(w,key,limit=5){return Object.entries(w.stats??{}).map(([id,s])=>({fighter:w.fighters[id],value:key==='impact'?Math.round(impact(s)):s[key],stats:s})).sort((a,b)=>b.value-a.value||(a.fighter.id<b.fighter.id?-1:1)).slice(0,limit);}

// ---------- Coach mode and the offseason (phase 4) ----------
export const TACTICS=Object.freeze(['balanced','protect-carry','focus-healer','aggressive','defensive']);
export const COACH_TACTICS=Object.freeze({bargain:'balanced',star:'protect-carry',glass:'aggressive',fortress:'defensive',tactician:'focus-healer',balanced:'balanced'});
export const ROOKIES_PER_TEAM=Object.freeze({2:1,3:2,5:3});
export const FREE_AGENT_SEASONS=2;
export function teamTactic(w,team){return team.tactic??COACH_TACTICS[team.coach.personality]??'balanced';}
function userTeam(w){const team=w.settings.userTeam&&teamById(w,w.settings.userTeam);if(!team)throw new Error('Take control of a team first.');return team;}
// Coach mode: take over any team before the draft starts or between seasons; hand it back at any time.
export function claimTeam(w,teamId){
 if(w.pendingSeries)throw new Error('Finish the paused series before changing coaches.');
 if(teamId===null){if(w.phase==='offseason'&&w.offseason.step!=='draft')throw new Error('Finish your offseason decisions first.');w.settings.userTeam=null;return w;}
 if(!teamById(w,teamId))throw new Error('Unknown team.');
 if(!(w.phase==='draft'&&!w.draft.picks.length||['ready','complete'].includes(w.phase)))throw new Error('Take over a team before the draft starts or between seasons.');
 w.settings.userTeam=teamId;return w;
}
export function setLineup(w,ids){
 const team=userTeam(w),size=FORMATS[w.format].size;if(!['ready','season','playoffs'].includes(w.phase))throw new Error('Set lineups once the roster is drafted.');
 if(!Array.isArray(ids)||ids.length!==size||new Set(ids).size!==size||ids.some(id=>!team.roster.includes(id)))throw new Error(`Choose ${size} different fighters from your roster.`);
 team.lineup=[...ids];return w;
}
export function setTactic(w,tactic){const team=userTeam(w);if(!TACTICS.includes(tactic))throw new Error('Unknown tactic.');team.tactic=tactic;return w;}
export function rookiePlan(w){const f=FORMATS[w.format],total=w.teams.length*ROOKIES_PER_TEAM[w.format],weight=Object.values(f.mix).reduce((a,b)=>a+b,0),counts={};for(const role of ['tank','healer','controller'])counts[role]=Math.round(total*f.mix[role]/weight);counts.damage=total-counts.tank-counts.healer-counts.controller;return planSlots(counts,(w.seed^Math.imul(w.season+1,0x7feb352d))>>>0);}
// Ratings move with performance: per-game impact compared with others in the same role, plus a small seeded drift.
// Offseason value updates move a fighter at most ±RATING_CHANGE_CAP OVR.
export const RATING_CHANGE_CAP=5;
function updateRatings(w){
 const byRole={};for(const [id,s]of Object.entries(w.stats??{}))if(s.games){const f=w.fighters[id];(byRole[f.role]??=[]).push(impact(s)/s.games);}
 const spread=Object.fromEntries(Object.entries(byRole).map(([role,list])=>{const mean=list.reduce((a,b)=>a+b,0)/list.length,sd=Math.sqrt(list.reduce((n,x)=>n+(x-mean)**2,0)/list.length)||1;return [role,{mean,sd}];}));
 const changes=[],maxGames=Math.max(1,...Object.values(w.stats??{}).map(s=>s.games||0));
 for(const f of Object.values(w.fighters)){
  const s=w.stats?.[f.id],drift=Math.floor(rng(matchSeed(w,'drift:'+f.id))()*3)-1,z=s?.games&&spread[f.role]?(impact(s)/s.games-spread[f.role].mean)/spread[f.role].sd:0;
  // About 2 OVR per standard deviation (at most ±4), scaled down for fighters who played few games; drift −1..+1.
  const share=s?.games?Math.min(1,s.games/(maxGames*.5)):0,performance=Math.max(-4,Math.min(4,Math.round(z*2*share)));
  const delta=Math.max(-RATING_CHANGE_CAP,Math.min(RATING_CHANGE_CAP,performance+(s?.games?drift:Math.min(0,drift))));
  // Gains above 90 are halved (rounded up), so elite ratings stay rare.
  let target=f.ovr+delta;if(delta>0&&target>90){const base=Math.max(90,f.ovr);target=base+Math.ceil((target-base)/2);}
  const ovr=Math.max(40,Math.min(99,target));
  if(ovr!==f.ovr)changes.push({id:f.id,from:f.ovr,to:ovr});f.lastOvr=f.ovr;f.ovr=ovr;f.salary=salaryFor(ovr);
 }
 return changes;
}
function scoreTeam(w,team,roster=team.roster){
 const f=FORMATS[w.format],members=roster.map(id=>w.fighters[id]),probe={...team,roster,lineup:[]},lineup=bestLineup(w,probe).map(id=>w.fighters[id]),counts={tank:0,healer:0,controller:0,damage:0};for(const m of members)counts[m.role]++;
 const pay=members.reduce((n,m)=>n+m.salary,0);return lineup.reduce((n,m)=>n+m.ovr,0)+Object.entries(rosterTargets(w,team)).reduce((n,[role,want])=>n+Math.min(counts[role],want)*6,0)+members.reduce((n,m)=>n+m.ovr*.15,0)-Math.max(0,pay-w.settings.salaryCap)*4;
}
// Share of a roster each personality is willing to turn over in one offseason.
export const ROSTER_CHURN=Object.freeze({bargain:.375,glass:.25,tactician:.25,balanced:.25,fortress:.125,star:.125});
// AI keep/release: let go of anyone a free agent of the same role could replace for less, and get back under the cap.
function aiReleases(w,team){
 const f=FORMATS[w.format],counts=roleCounts(w,team),free=available(w),released=[];
 const plan=rosterTargets(w,team),keepValue=x=>{const unmet=Object.fromEntries(ROLE_KEYS.map(r=>[r,0]));unmet[x.role]=Math.max(0,plan[x.role]-(counts[x.role]-1));return coachValue(w,team,x,counts,unmet);};
 const replacement=x=>Math.max(-Infinity,...free.filter(y=>y.role===x.role&&y.salary<=x.salary&&!released.includes(y.id)).map(y=>coachValue(w,team,y,counts,{[x.role]:Math.max(0,plan[x.role]-(counts[x.role]-1))})));
 const ranked=team.roster.map(id=>w.fighters[id]).map(x=>({x,surplus:keepValue(x)-replacement(x)})).sort((a,b)=>a.surplus-b.surplus||(a.x.id<b.x.id?-1:1));
 const limit=Math.max(1,Math.round(f.rosterSize*(ROSTER_CHURN[team.coach.personality]??.25)));for(const {x,surplus}of ranked){if(released.length>=limit)break;if(surplus<1.5){released.push(x.id);counts[x.role]--;}}
 let pay=payroll(w,team)-released.reduce((n,id)=>n+w.fighters[id].salary,0);
 for(const {x}of ranked){if(pay<=w.settings.salaryCap+1e-9)break;if(released.includes(x.id))continue;released.push(x.id);pay-=x.salary;}
 return released;
}
function release(w,team,ids){for(const id of ids){const f=w.fighters[id];f.team=null;f.freeAgentSince=w.season;team.roster=team.roster.filter(x=>x!==id);team.lineup=team.lineup.filter(x=>x!==id);}}
// The season's meta: win rate by starting composition, and for each role whether fielding more of it than the
// opponent won games. Coaches lean towards what worked, each at their own pace (META_ADAPTATION).
export function seasonMeta(w){
 const games=[],toCounts=a=>Object.fromEntries(ROLE_KEYS.map((r,i)=>[r,a[i]])),byKey=new Map(),more=Object.fromEntries(ROLE_KEYS.map(r=>[r,{wins:0,games:0}])),edge={};
 for(const r of w.results??[])if(r.comps)games.push({comps:r.comps,winner:r.winner===r.home?0:1});
 for(const round of w.playoffs?.rounds??[])for(const s of round.series)if(s.comps)for(const g of s.games??[])games.push({comps:g.comps??s.comps,winner:g.winnerTeam});
 for(const g of games){
  g.comps.forEach((a,side)=>{const counts=toCounts(a),key=compKey(counts),e=byKey.get(key)??{key,label:compLabel(counts),wins:0,games:0};e.games++;if(g.winner===side)e.wins++;byKey.set(key,e);});
  ROLE_KEYS.forEach((r,i)=>{const d=g.comps[0][i]-g.comps[1][i];if(!d)return;more[r].games++;if(g.winner===(d>0?0:1))more[r].wins++;});
 }
 for(const r of ROLE_KEYS)edge[r]=more[r].games>=4?Math.round((more[r].wins/more[r].games-.5)*1000)/1000:0;
 const top=[...byKey.values()].filter(e=>e.games>=4).map(e=>({...e,pct:Math.round(e.wins/e.games*1000)/10})).sort((a,b)=>b.pct-a.pct||b.games-a.games||(a.key<b.key?-1:1)).slice(0,3);
 const role=ROLE_KEYS.slice().sort((a,b)=>Math.abs(edge[b])-Math.abs(edge[a]))[0];
 return {games:games.length,top,edge,shift:edge[role]?{role,winPct:Math.round((edge[role]+.5)*1000)/10,games:more[role].games}:null};
}
export function adaptCoaches(w,meta){
 const changed=[];
 for(const team of w.teams){if(isUser(w,team.id))continue;const rate=META_ADAPTATION[team.coach.personality]??.4,before=compKey(starterTargets(w,team)),comp={...teamComp(team)};
  for(const r of ROLE_KEYS)comp[r]=Math.round(Math.max(.15,Math.min(4,comp[r]*Math.exp(rate*2.5*(meta.edge[r]??0))))*100)/100;
  team.coach.comp=comp;const after=compKey(starterTargets(w,team));if(after!==before)changed.push({team:team.id,from:before,to:after});}
 return changed;
}
export function startOffseason(w,rookies){
 if(w.phase!=='complete')throw new Error('Finish the season before the offseason.');
 const plan=rookiePlan(w);if(!Array.isArray(rookies)||rookies.length!==plan.length)throw new Error(`The rookie class must hold ${plan.length} fighters.`);
 const seen=new Set();rookies.forEach((c,i)=>{if(!c||typeof c.id!=='string'||w.fighters[c.id]||seen.has(c.id)||typeof c.name!=='string'||!c.name.trim()||!c.traits||FIGHTER_KEYS.some(k=>typeof c.traits[k]!=='string'))throw new Error('Invalid rookie.');if(c.summary?.tier!==plan[i].tier)throw new Error('A rookie does not match its planned tier.');seen.add(c.id);});
 balanceCheckpoint(w,'offseason');const history={season:w.season,champion:w.playoffs.champion,standings:standings(w).map(r=>({id:r.id,wins:r.wins,losses:r.losses}))};
 const meta=seasonMeta(w);meta.changed=adaptCoaches(w,meta);
 const changes=updateRatings(w),protectedIds=new Set((w.titles??[]).map(t=>t.mvp));
 for(const f of Object.values(w.fighters)){if(f.team)continue;f.freeAgentSince??=w.season;}
 const retired=Object.values(w.fighters).filter(f=>!f.team&&f.freeAgentSince<=w.season-FREE_AGENT_SEASONS+1&&f.freeAgentSince<w.season&&!protectedIds.has(f.id)).map(f=>f.id);
 for(const id of retired)delete w.fighters[id];
 for(const c of rookies)w.fighters[c.id]={id:c.id,name:c.name.trim(),traits:{...c.traits},summary:{stats:[...c.summary.stats],total:c.summary.total,tier:c.summary.tier,generationVersion:c.summary.generationVersion??3},...scoutFighter(c),ratingVersion:2,team:null,rookie:w.season+1,freeAgentSince:w.season};
 // The cap follows the market: the average salary of the best roster-worth of fighters.
 const top=Object.values(w.fighters).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,w.teams.length*w.settings.rosterSize);w.settings.salaryCap=round1(top.reduce((n,x)=>n+x.salary,0)/w.teams.length);
 // Coaches with dismal seasons are replaced (never the user's team).
 const fired=[],records=new Map(history.standings.map(r=>[r.id,r]));
 for(const team of w.teams){const r=records.get(team.id);if(isUser(w,team.id)||!r||r.wins/(r.wins+r.losses||1)>.25)continue;const random=rng(matchSeed(w,'coach:'+team.id)),style=Object.keys(PERSONALITIES)[Math.floor(random()*6)],coach={name:`${COACH_FIRST[Math.floor(random()*COACH_FIRST.length)]} ${COACH_LAST[Math.floor(random()*COACH_LAST.length)]}`,personality:style,hired:w.season+1,comp:coachComp(style,random,meta.edge)};fired.push({team:team.id,from:team.coach.name,to:coach.name});team.coach=coach;delete team.tactic;}
 const releases={};for(const team of w.teams){if(isUser(w,team.id))continue;const ids=aiReleases(w,team);release(w,team,ids);if(ids.length)releases[team.id]=ids;}
 w.history=[...(w.history??[]),history];w.phase='offseason';w.offseason={season:w.season,meta,step:w.settings.userTeam?'decisions':'market',ratingChanges:changes,retired:retired.length,rookies:rookies.map(c=>c.id),fired,releases,trades:[]};
 if(!w.settings.userTeam){aiTrades(w);startOffseasonDraft(w);}
 return w;
}
export function decideReleases(w,ids){
 const team=userTeam(w);if(w.phase!=='offseason'||w.offseason.step!=='decisions')throw new Error('Keep-or-release decisions are not open.');
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!team.roster.includes(id)))throw new Error('Release only fighters on your roster.');
 if(payroll(w,team)-ids.reduce((n,id)=>n+w.fighters[id].salary,0)>w.settings.salaryCap+1e-9)throw new Error('Your payroll would still be over the cap. Release more fighters.');
 release(w,team,ids);if(ids.length)w.offseason.releases[team.id]=ids;aiTrades(w);w.offseason.step='market';return w;
}
const legalRoster=(w,roster)=>roster.reduce((n,id)=>n+w.fighters[id].salary,0)<=w.settings.salaryCap+1e-9;
// AI-to-AI trades: one-for-one swaps that improve both teams and keep both under the cap; each team trades once.
function aiTrades(w){
 const ai=w.teams.filter(t=>!isUser(w,t.id)),traded=new Set(),limit=Math.floor(ai.length/2);
 for(let n=0;n<limit;n++){
  let best=null;
  // Only bench fighters or surplus roles are on the block, which keeps the search small and the trades sensible.
  const block=new Map(ai.map(t=>{const counts=roleCounts(w,t),starters=new Set(bestLineup(w,t));return [t.id,t.roster.filter(id=>!starters.has(id)||counts[w.fighters[id].role]>rosterTargets(w,t)[w.fighters[id].role])];}));
  for(let i=0;i<ai.length;i++)for(let j=i+1;j<ai.length;j++){const A=ai[i],B=ai[j];if(traded.has(A.id)||traded.has(B.id))continue;const baseA=scoreTeam(w,A),baseB=scoreTeam(w,B);
   for(const x of block.get(A.id))for(const y of block.get(B.id)){if(w.fighters[x].role===w.fighters[y].role)continue;const rA=A.roster.map(id=>id===x?y:id),rB=B.roster.map(id=>id===y?x:id);if(!legalRoster(w,rA)||!legalRoster(w,rB))continue;const gainA=scoreTeam(w,A,rA)-baseA,gainB=scoreTeam(w,B,rB)-baseB,gain=Math.min(gainA,gainB);if(gain>=2&&(!best||gain>best.gain||gain===best.gain&&`${A.id}${x}`<`${best.A.id}${best.x}`))best={A,B,x,y,gain};}}
  if(!best)break;swap(w,best.A,best.B,[best.x],[best.y]);traded.add(best.A.id);traded.add(best.B.id);w.offseason.trades.push({teams:[best.A.id,best.B.id],sent:[[best.x],[best.y]]});
 }
}
function swap(w,A,B,give,get){A.roster=[...A.roster.filter(id=>!give.includes(id)),...get];B.roster=[...B.roster.filter(id=>!get.includes(id)),...give];for(const id of give)w.fighters[id].team=B.id;for(const id of get)w.fighters[id].team=A.id;A.lineup=A.lineup.filter(id=>A.roster.includes(id));B.lineup=B.lineup.filter(id=>B.roster.includes(id));}
// The user proposes; the AI coach accepts only if its team gets better and both payrolls stay legal.
export function proposeTrade(w,partnerId,give,get){
 const team=userTeam(w),partner=teamById(w,partnerId);if(w.phase!=='offseason'||w.offseason.step!=='market')throw new Error('The trade window is closed.');
 if(!partner||partner.id===team.id)throw new Error('Choose another team.');
 if(!Array.isArray(give)||!Array.isArray(get)||!give.length||give.length!==get.length||give.length>2||give.some(id=>!team.roster.includes(id))||get.some(id=>!partner.roster.includes(id))||new Set([...give,...get]).size!==give.length*2)throw new Error('Trade the same number of fighters (one or two) from each roster.');
 const mine=[...team.roster.filter(id=>!give.includes(id)),...get],theirs=[...partner.roster.filter(id=>!get.includes(id)),...give];
 if(!legalRoster(w,mine))throw new Error('That trade would put your payroll over the cap.');
 if(!legalRoster(w,theirs))throw new Error(`${partner.coach.name} turns it down: it would break their cap.`);
 const gain=scoreTeam(w,partner,theirs)-scoreTeam(w,partner),style=PERSONALITIES[partner.coach.personality],threshold=style.cost>1.5?2:style.star>.5?0:1;
 if(gain<threshold)throw new Error(`${partner.coach.name} turns it down: it doesn't make the ${partner.name} better.`);
 swap(w,team,partner,give,get);w.offseason.trades.push({teams:[team.id,partner.id],sent:[give,get],user:true});return w;
}
export function closeMarket(w){if(w.phase!=='offseason'||w.offseason.step!=='market')throw new Error('The trade window is not open.');userTeam(w);startOffseasonDraft(w);return w;}
// Draft order: non-playoff teams worst first, then playoff teams by exit round; the champion picks last.
export function offseasonOrder(w){
 const last=w.history.at(-1),rank=new Map(last.standings.map((r,i)=>[r.id,i])),exit=new Map();
 w.playoffs.rounds.forEach((round,i)=>round.series.forEach(s=>{for(const id of [s.home,s.away])exit.set(id,s.winner===id?i+1:i);}));exit.set(w.playoffs.champion,99);
 return w.teams.map(t=>t.id).sort((a,b)=>(exit.get(a)??-1)-(exit.get(b)??-1)||rank.get(b)-rank.get(a));
}
function startOffseasonDraft(w){
 const order=offseasonOrder(w),open=id=>w.settings.rosterSize-teamById(w,id).roster.length,slots=[];
 for(let round=0;round<w.settings.rosterSize;round++){let pick=0;for(const id of order)if(open(id)>round)slots.push({team:id,round:round+1,pick:++pick});}
 w.offseason.step='draft';w.draft={order,slots,picks:[],complete:false,season:w.season+1};if(!slots.length){w.draft.complete=true;newSeason(w);}
}
function newSeason(w){
 const size=FORMATS[w.format].size;w.lastOffseason=w.offseason;w.offseason=null;w.season++;w.phase='ready';w.schedule=null;w.results=[];w.stats={};w.playoffs=null;
 for(const t of w.teams){const keep=isUser(w,t.id)&&t.lineup.length===size&&t.lineup.every(id=>t.roster.includes(id));if(!keep)t.lineup=bestLineup(w,t);}
}

export function setAutoBalance(w,enabled){if(typeof enabled!=='boolean')throw new Error('Choose whether auto-balance is enabled.');w.balance??=neutralBalance();w.balance.enabled=enabled;return w;}
function balanceCheckpoint(w,phase){if(!w.balance||!['team-2.3','team-2.4','team-3-core','team-3','team-3.1'].includes(w.teamEngine))return;const halfway=Math.ceil(w.schedule.length/2),week=w.schedule[halfway-1],key=phase==='halfway'?'halfwaySeason':'offseasonSeason';if(w.balance[key]===w.season)return;if(phase==='halfway'&&w.results.filter(r=>r.week===halfway).length!==week.games.length)return;w.balance[key]=w.season;applyBalanceCheckpoint(w.balance,{season:w.season,phase});}

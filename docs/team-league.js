// Team leagues (3v3 / 5v5): world creation, player ratings and salaries, AI head coaches and the draft.
// Pure and deterministic from the world seed, so the server re-runs every rule; clients never submit picks.
import {teamRole,combatNumbers} from './team-roles.js';
export const TEAM_LEAGUE_VERSION=1;
export const LEAGUE_SIZES=Object.freeze([8,16,32]);
export const FORMATS=Object.freeze({
 3:Object.freeze({size:3,rosterSize:5,starters:['tank','healer','damage'],needs:Object.freeze({tank:1,healer:1,controller:0,damage:2}),mix:Object.freeze({tank:1.2,healer:1.2,controller:.6,damage:2})}),
 5:Object.freeze({size:5,rosterSize:8,starters:['tank','healer','controller','damage','damage'],needs:Object.freeze({tank:2,healer:2,controller:1,damage:3}),mix:Object.freeze({tank:2,healer:2,controller:1.2,damage:2.8})})
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
export function format(value){const f=FORMATS[Number(value)];if(!f)throw new Error('Choose 3v3 or 5v5.');return f;}
export function poolSize(formatSize,teams){return Math.ceil(teams*format(formatSize).rosterSize*POOL_FACTOR);}
// Pool plan: the role and tier of every fighter to generate, fixed by the seed so the server can verify tiers.
export function poolPlan(formatSize,teams,seed){
 if(!LEAGUE_SIZES.includes(teams))throw new Error('Choose 8, 16 or 32 teams.');
 const f=format(formatSize),total=poolSize(formatSize,teams),weight=Object.values(f.mix).reduce((a,b)=>a+b,0),counts={};
 for(const role of ['tank','healer','controller'])counts[role]=Math.round(total*f.mix[role]/weight);counts.damage=total-counts.tank-counts.healer-counts.controller;
 const random=rng(seed^0x9e3779b9),slots=[];for(const [role,count]of Object.entries(counts))for(let i=0;i<count;i++){const roll=random();slots.push({role,tier:roll<.02?'SS':roll<.30?'S':'A'});}
 return shuffle(slots,seed^0x51ed270b);
}
// Overall rating (OVR, 40–99) from closed-form combat numbers, weighted by measured team-battle impact
// (scripts/evaluate-team-values.mjs, validation/team-values.json).
export const RATING_MODEL=Object.freeze({intercept:-1.384,ehp:0.203,dps:0.062,spell:0.148,ability:-0.01,speed:0.211,iq:0.029,roles:Object.freeze({tank:0,healer:0.1,controller:-0.067,damage:0.015})});
const ABILITY_WEIGHT={Common:.5,Uncommon:1,Rare:1.6,Legendary:2.4};
export function ratingFeatures(character){
 const n=combatNumbers(character),s=(character.summary?.stats||[0,0,0,0,0]).map(v=>Math.sqrt(Math.max(0,Number(v)||0))),traits=character.traits||{},catalog=globalThis.CLASS_ABILITIES;
 const ability=[traits.power,traits.power2].reduce((sum,name)=>sum+(ABILITY_WEIGHT[name&&catalog.definition(name)?.rarity]??0),0);
 return {ehp:Math.log(n.effectiveHp),dps:Math.log(Math.max(1,n.dps)),spell:n.spell/50,ability,speed:s[1]/20,iq:s[3]/20};
}
export function rawRating(character,role=teamRole(character).role){const x=ratingFeatures(character),m=RATING_MODEL;return m.intercept+m.ehp*x.ehp+m.dps*x.dps+m.spell*x.spell+m.ability*x.ability+m.speed*x.speed+m.iq*x.iq+(m.roles[role]??0);}
// Map the model's predicted win share onto a familiar 40–99 scale.
export function overall(character,role){return Math.max(40,Math.min(99,Math.round(40+(rawRating(character,role)-.25)*118)));}
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
export function create({id,format:formatSize,teams,seed,fighters}){
 const f=format(formatSize);if(!LEAGUE_SIZES.includes(teams))throw new Error('Choose 8, 16 or 32 teams.');
 const plan=poolPlan(formatSize,teams,seed);if(!Array.isArray(fighters)||fighters.length!==plan.length)throw new Error(`The fighter pool must hold ${plan.length} fighters.`);
 const roster={},seen=new Set();
 fighters.forEach((c,i)=>{
  if(!c||typeof c.id!=='string'||!c.id||c.id.length>80||seen.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)throw new Error('Invalid pool fighter.');seen.add(c.id);
  if(!c.traits||FIGHTER_KEYS.some(k=>typeof c.traits[k]!=='string'))throw new Error('Pool fighters need all fourteen traits.');
  if(c.summary?.tier!==plan[i].tier)throw new Error('A pool fighter does not match its planned tier.');
  roster[c.id]={id:c.id,name:c.name.trim(),traits:{...c.traits},summary:{stats:[...c.summary.stats],total:c.summary.total,tier:c.summary.tier,generationVersion:c.summary.generationVersion??3},...scoutFighter(c),team:null};
 });
 const layout=structure(teams),identities=teamIdentities(teams,seed),list=[];
 layout.forEach(conference=>conference.divisions.forEach(division=>division.slots.forEach(slot=>list.push({id:`t${slot+1}`,name:identities[slot].name,conference:conference.name,division:division.name,coach:identities[slot].coach,roster:[],lineup:[]}))));
 list.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
 // Cap: an average team can afford the average salary of the fighters who will be drafted.
 const drafted=Object.values(roster).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,teams*f.rosterSize),cap=round1(drafted.reduce((n,x)=>n+x.salary,0)/teams);
 return {version:TEAM_LEAGUE_VERSION,engine:'team-1',format:f.size,id,seed:seed>>>0,season:1,phase:'draft',
  settings:{teams,rosterSize:f.rosterSize,salaryCap:cap,minSalary:Math.min(...Object.values(roster).map(x=>x.salary))},
  conferences:layout.map(c=>({name:c.name,divisions:c.divisions.map(d=>({name:d.name,teams:d.slots.map(s=>`t${s+1}`)}))})),
  teams:list,fighters:roster,draft:{order:shuffle(list.map(t=>t.id),seed^0x5eed),picks:[],complete:false}};
}
export const teamById=(w,id)=>w.teams.find(t=>t.id===id);
export const payroll=(w,team)=>round1(team.roster.reduce((n,id)=>n+w.fighters[id].salary,0));
export const capSpace=(w,team)=>round1(w.settings.salaryCap-payroll(w,team));
export const available=w=>Object.values(w.fighters).filter(f=>!f.team);
export function roleCounts(w,team){const counts={tank:0,healer:0,controller:0,damage:0};for(const id of team.roster)counts[w.fighters[id].role]++;return counts;}
export function draftSlot(w,index=w.draft.picks.length){const n=w.teams.length,round=Math.floor(index/n),position=index%n;return {index,round:round+1,pick:position+1,team:w.draft.order[round%2?n-1-position:position]};}
export const totalPicks=w=>w.teams.length*w.settings.rosterSize;
// AI head coach: weigh OVR, salary, role needs and personality; never break the cap or the ability to fill the roster.
// Coaches budget a margin because rivals may draft the cheap fighters they were counting on.
export const RESERVE_MARGIN=1.15;
export function coachChoice(w,team){
 const f=FORMATS[w.format],style=PERSONALITIES[team.coach.personality],slotsLeft=w.settings.rosterSize-team.roster.length,space=capSpace(w,team),pool=available(w);
 const counts=roleCounts(w,team),unmet=Object.fromEntries(Object.entries(f.needs).map(([role,need])=>[role,Math.max(0,need-counts[role])])),unmetTotal=Object.values(unmet).reduce((a,b)=>a+b,0);
 const bySalary=pool.slice().sort((a,b)=>a.salary-b.salary||(a.id<b.id?-1:1));
 // Room this pick must leave: the cheapest fighter for each role still needed, then the cheapest for open slots.
 const reserveFor=x=>{const need={...unmet};if(need[x.role]>0)need[x.role]--;const taken=new Set([x.id]);let total=0,filled=0;
  for(const [role,count]of Object.entries(need)){let left=count;for(const y of bySalary){if(!left)break;if(y.role===role&&!taken.has(y.id)){taken.add(y.id);total+=y.salary;left--;filled++;}}if(left)return Infinity;}
  let free=slotsLeft-1-filled;for(const y of bySalary){if(free<=0)break;if(!taken.has(y.id)){taken.add(y.id);total+=y.salary;free--;}}return free>0?Infinity:total*RESERVE_MARGIN;};
 let candidates=pool.filter(x=>x.salary+reserveFor(x)<=space+1e-9);
 if(slotsLeft<=unmetTotal){const needed=candidates.filter(x=>unmet[x.role]>0);if(needed.length)candidates=needed;}
 // Minimum-contract exception: when nothing fits, sign the cheapest eligible fighter even past the cap.
 if(!candidates.length)return bySalary.find(x=>unmet[x.role]>0)??bySalary[0];
 const average=w.settings.salaryCap/w.settings.rosterSize,noise=rng(w.seed^Math.imul(w.draft.picks.length+1,2654435761));
 let best=null,score=-Infinity;
 for(const x of candidates.slice().sort((a,b)=>a.id<b.id?-1:1)){
  const need=unmet[x.role]>0?1+.35*style.need:counts[x.role]>=f.needs[x.role]+1?.7:.9;
  const value=Math.pow(x.ovr/70,1+style.star)*70*style.rating*(style.roles[x.role]??1)*need-style.cost*(x.salary/average)*9+(noise()-.5)*2;
  if(value>score){score=value;best=x;}
 }
 return best;
}
export function draftPick(w){
 if(w.draft.complete)throw new Error('The draft is complete.');
 const slot=draftSlot(w),team=teamById(w,slot.team),choice=coachChoice(w,team);
 const exception=choice.salary>capSpace(w,team)+1e-9;choice.team=team.id;team.roster.push(choice.id);w.draft.picks.push({n:slot.index+1,round:slot.round,pick:slot.pick,team:team.id,fighter:choice.id,salary:choice.salary,ovr:choice.ovr,...(exception?{exception:true}:{})});
 if(w.draft.picks.length>=totalPicks(w)){w.draft.complete=true;w.phase='ready';for(const t of w.teams)t.lineup=bestLineup(w,t);}
 return w.draft.picks.at(-1);
}
export function draftPicks(w,count){const made=[];for(let i=0;i<count&&!w.draft.complete;i++)made.push(draftPick(w));return made;}
// Starters fill the format's role slots with the best available fighters, then the strongest remaining.
export function bestLineup(w,team){
 const f=FORMATS[w.format],left=team.roster.map(id=>w.fighters[id]).sort((a,b)=>b.ovr-a.ovr||(a.id<b.id?-1:1)),lineup=[];
 for(const role of f.starters){const i=left.findIndex(x=>x.role===role);if(i>=0)lineup.push(left.splice(i,1)[0].id);}
 while(lineup.length<f.size&&left.length)lineup.push(left.shift().id);
 return lineup;
}
export const teamOverall=(w,team)=>{const ids=team.lineup.length?team.lineup:bestLineup(w,team);return ids.length?Math.round(ids.reduce((n,id)=>n+w.fighters[id].ovr,0)/ids.length):0;};
export const starters=(w,team)=>(team.lineup.length?team.lineup:bestLineup(w,team)).map(id=>w.fighters[id]);

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

// ---------- Season and playoffs (phase 3) ----------
export const SEASON_CONDITIONS=Object.freeze({time:'random',weather:'random',ground:'random'});
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
 w.schedule=buildSchedule(w);w.results=[];w.stats={};w.playoffs=null;w.phase='season';for(const t of w.teams)if(!t.lineup.length)t.lineup=bestLineup(w,t);return w;
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
 const out=[];if(w.phase==='season'){const played=w.results.length;let n=0;for(const week of w.schedule)for(const g of week.games){if(n++<played)continue;if(out.length>=limit)return out;out.push(describe(w,{...g,kind:'regular',week:week.week,bestOf:1}));}}
 else if(w.phase==='playoffs'){for(const s of w.playoffs.rounds.at(-1).series){if(s.winner)continue;if(out.length>=limit)break;out.push(describe(w,{...s,kind:'playoff'}));}}
 return out;
}
function describe(w,m){return {...m,seed:matchSeed(w,m.id),conditions:SEASON_CONDITIONS,lineups:[teamById(w,m.home).lineup,teamById(w,m.away).lineup]};}
export const squads=(w,match)=>match.lineups.map(ids=>ids.map(id=>{const f=w.fighters[id];return {id:f.id,name:f.name,traits:f.traits,summary:f.summary};}));
const ENVIRONMENT={time:['dawn','day','dusk','night'],weather:['clear','rain','frost','storm'],ground:['stone','water']};
function validGame(game,lineups){
 const ids=lineups.flat(),count=n=>Number.isInteger(n)&&n>=0&&n<=1e7;
 if(!game||game.combatVersion!=='team-1'||![0,1].includes(game.winnerTeam)||!Number.isFinite(game.seconds)||game.seconds<=0||game.seconds>120.5)return false;
 if(!Array.isArray(game.hp)||game.hp.length!==2||game.hp.some(h=>!Number.isInteger(h)||h<0||h>100))return false;
 if(!game.environment||Object.entries(ENVIRONMENT).some(([k,v])=>!v.includes(game.environment[k])))return false;
 if(!Array.isArray(game.fighters)||game.fighters.length!==ids.length||game.fighters.some((f,i)=>f?.id!==ids[i]||!count(f.damage)||!count(f.healing)||!count(f.kills)||!count(f.deaths)||!(f.ccSeconds>=0&&f.ccSeconds<=200)))return false;
 return true;
}
function addStats(w,games,lineups){for(const game of games){const winners=new Set(lineups[game.winnerTeam]);for(const f of game.fighters){const s=w.stats[f.id]??={games:0,wins:0,damage:0,healing:0,kills:0,deaths:0,ccSeconds:0};s.games++;if(winners.has(f.id))s.wins++;s.damage+=f.damage;s.healing+=f.healing;s.kills+=f.kills;s.deaths+=f.deaths;s.ccSeconds=Math.round((s.ccSeconds+f.ccSeconds)*10)/10;}}}
// Records one simulated match. Only the exact next match is accepted, with a complete, valid series.
export function recordMatch(w,matchId,games){
 const [m]=upcoming(w,w.phase==='playoffs'?Infinity:1).filter(x=>w.phase==='season'||x.id===matchId);
 if(!m||m.id!==matchId)throw new Error('That is not the next team-league match.');
 const need=Math.ceil(m.bestOf/2);if(!Array.isArray(games)||!games.length||games.length>m.bestOf)throw new Error('Invalid team-league series.');
 const score=[0,0];games.forEach((g,i)=>{if(!validGame(g,m.lineups))throw new Error('Invalid team-league game result.');if(score[0]>=need||score[1]>=need)throw new Error('The series was already decided.');score[g.winnerTeam]++;});
 if(Math.max(...score)!==need)throw new Error('The series is not complete.');
 const winner=score[0]>score[1]?m.home:m.away;addStats(w,games,m.lineups);
 if(m.kind==='regular'){const g=games[0];w.results.push({id:m.id,week:m.week,home:m.home,away:m.away,winner,hp:g.hp,seconds:g.seconds});if(w.results.length===w.schedule.reduce((n,x)=>n+x.games.length,0))startPlayoffs(w);}
 else{const s=w.playoffs.rounds.at(-1).series.find(x=>x.id===m.id);s.games=games.map(g=>({winnerTeam:g.winnerTeam,hp:g.hp,seconds:g.seconds}));s.winner=winner;
  if(w.playoffs.rounds.at(-1).series.every(x=>x.winner)){if(s.round==='final'){w.playoffs.champion=winner;finishSeason(w,s);}else openRound(w);}}
 return {id:m.id,winner,score};
}
export function impact(s){return s.damage+s.healing*1.1+s.kills*120+s.ccSeconds*30;}
function finishSeason(w,final){
 const runnerUp=final.home===final.winner?final.away:final.home,best=Object.entries(w.stats).sort((a,b)=>impact(b[1])-impact(a[1])||(a[0]<b[0]?-1:1))[0];
 w.titles=[...(w.titles??[]),{season:w.season,champion:final.winner,runnerUp,mvp:best?.[0]??null}];w.phase='complete';
}
export function leaders(w,key,limit=5){return Object.entries(w.stats??{}).map(([id,s])=>({fighter:w.fighters[id],value:key==='impact'?Math.round(impact(s)):s[key],stats:s})).sort((a,b)=>b.value-a.value||(a.fighter.id<b.fighter.id?-1:1)).slice(0,limit);}

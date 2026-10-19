import {neutralBalance,lineupGroups,balanceObservations,addBalanceObservations,applyBalanceCheckpoint} from './team-balance.js';
import {teamKit,TEAM_KITS} from './team-kits.js';
import {supportAbility} from './support-abilities.js';
import {SERIES_TACTICS,seriesGameOptions,seriesScore} from './team-series.js';
// Team leagues (2v2 / 3v3 / 5v5): world creation, player ratings and salaries, AI head coaches, contracts and free agency.
// Pure and deterministic from the world seed, so the server re-runs every rule; clients never submit picks.
import {teamRole,combatNumbers} from './team-roles.js';
import {MAP_IDS} from './team-maps.js';
import {TEAM_COMBAT_VERSION,OBJECTIVE_COMBAT_VERSION,BALANCED_ENGINES,GAME_PLAN_ENGINES,engineForMode,isObjectiveEngine} from './team-engine-versions.js';
import {validGamePlan,personalityGamePlan} from './team-game-plan.js';
import {table,coin,seededOrder,roundRobinRounds,openBracket,bracketDone,bracketPlaces,swissPairs,swissRecords,swissRoundDone,swissDone,swissKnockoutSeeds} from './team-events.js';
export const TEAM_LEAGUE_VERSION=1;
// Leagues from the team cast (team-classes.js) carry castVersion 5 and region circuits circuitVersion 1. Older leagues,
// and single leagues from before region circuits, are the old format: they can only be deleted.
export const CAST_LEAGUE=5;
export const oldFormat=w=>!!w&&(w.castVersion!==CAST_LEAGUE||w.circuitVersion!==CIRCUIT_VERSION);
const castFighters=list=>list.every(c=>c?.summary?.generationVersion===CAST_LEAGUE);
// ---------- Region circuits ----------
// A league is a circuit of six regions, each with the same number of teams (6, 8 or 10). Every region grows its own
// talent: the odds of SS, S, A and B fighters in its founding pool and in every rookie class. Rookies (and the founding
// pool) sign only in their home region until their first contract ends; after that any team may sign them. The cap
// factor scales the market cap for the region's teams. `msi` is [bracket slots, play-in slots]; `worlds` the base
// Worlds seeds (the MSI champion's region gets one more). Names are placeholders.
export const CIRCUIT_VERSION=1;
export const REGION_SIZES=Object.freeze([6,8,10]);
export const REGIONS=Object.freeze([
 {id:'r1',name:'Dragonspire',short:'DRG',tier:'major',odds:{SS:.04,S:.40,A:.56,B:0},cap:1.1,msi:[2,0],worlds:4},
 {id:'r2',name:'Ironcrown',short:'IRC',tier:'major',odds:{SS:.04,S:.40,A:.56,B:0},cap:1.1,msi:[2,0],worlds:4},
 {id:'r3',name:'Emberwest',short:'EMW',tier:'strong',odds:{SS:.02,S:.30,A:.68,B:0},cap:1,msi:[1,1],worlds:3},
 {id:'r4',name:'Stormreach',short:'STR',tier:'rising',odds:{SS:.012,S:.22,A:.66,B:.108},cap:1.05,msi:[1,1],worlds:2},
 {id:'r5',name:'Tidewater Isles',short:'TWI',tier:'emerging',odds:{SS:.006,S:.14,A:.62,B:.234},cap:.8,msi:[0,1],worlds:1},
 {id:'r6',name:'Sunvale',short:'SUN',tier:'emerging',odds:{SS:.006,S:.14,A:.62,B:.234},cap:.8,msi:[0,1],worlds:1}
].map(r=>Object.freeze({...r,odds:Object.freeze(r.odds),msi:Object.freeze(r.msi)})));
export const REGION_IDS=Object.freeze(REGIONS.map(r=>r.id));
export const regionById=id=>REGIONS.find(r=>r.id===id);
// mix shapes the scouted pool so every composition is possible; teams are free to build any lineup.
export const FORMATS=Object.freeze({
 2:Object.freeze({size:2,rosterSize:4,mix:Object.freeze({tank:1.1,healer:1.1,controller:.9,damage:2})}),
 3:Object.freeze({size:3,rosterSize:5,mix:Object.freeze({tank:1.2,healer:1.2,controller:.8,damage:2})}),
 5:Object.freeze({size:5,rosterSize:8,mix:Object.freeze({tank:2,healer:2,controller:1.2,damage:2.8})})
});
export const POOL_FACTOR=1.3;
const PLACES=['Ashhold','Brightwater','Cindermoor','Duskwall','Embervale','Frosthelm','Gloamreach','Hollowmere','Ironcrest','Jadeport','Kingsfall','Lanternfen','Mistral Bay','Nightbloom','Oakenshade','Pyrewatch','Quillmarsh','Ravenspire','Saltcairn','Thornfield','Umberkeep','Vellmoor','Wyrmrest','Yewbridge','Starfall','Coldharbor','Goldmere','Stormhollow','Mooncrest','Sunreach','Briarwood','Deepforge','Highmarch','Rimeholt','Shadowfen','Silverrun','Amberglen','Blackmoor','Coralhaven','Dawnmere','Eastwatch','Fallowmarch','Glimmerdeep','Highcliff','Ivoryspire','Jasperfall','Kelpstone','Lionsreach','Moonhollow','Northgale','Oldspring','Pinecrest','Quartzridge','Redwater','Silverbay','Tallowmere','Underpeak','Violetmoor','Westerhold','Yarrowdale'];
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
// In 2v2 and 3v3 a second tank or healer costs a lineup dearly (3v3 Core siege lab, random teams: 1D·2T 37%,
// 1C·2T 28%, 1C·2H 34%, against 54% for 2D·1T), so coaches start at most one of each there and give the spare slot
// to whichever of damage and control they like more. Rosters may still carry a spare.
export const SOLO_ROLES=Object.freeze(['tank','healer']);
export const starterTargets=(w,team)=>{
 const size=FORMATS[w.format].size,comp=teamComp(team),out=compTargets(comp,size);if(size>3)return out;
 const next=(comp.damage??1)>=(comp.controller??1)?'damage':'controller';for(const r of SOLO_ROLES)while(out[r]>1){out[r]--;out[next]++;}
 return out;
};
const ROLE_LETTER={tank:'T',healer:'H',controller:'C',damage:'D'};
export function compKey(counts){return ROLE_KEYS.filter(r=>counts[r]).map(r=>`${counts[r]}${ROLE_LETTER[r]}`).join('·')||'—';}
export function compLabel(counts){const names={tank:['tank','tanks'],healer:['healer','healers'],controller:['controller','controllers'],damage:['damage','damage']};return ROLE_KEYS.filter(r=>counts[r]).map(r=>`${counts[r]} ${names[r][counts[r]>1?1:0]}`).join(' · ');}
const lineupCounts=(w,ids)=>{const c={tank:0,healer:0,controller:0,damage:0};for(const id of ids){const f=w.fighters[id];if(f)c[f.role]++;}return c;};
export function poolSize(formatSize,regionSize){return Math.ceil(regionSize*format(formatSize).rosterSize*POOL_FACTOR);}
const mixCounts=(f,total)=>{const weight=Object.values(f.mix).reduce((a,b)=>a+b,0),counts={};for(const role of ['tank','healer','controller'])counts[role]=Math.round(total*f.mix[role]/weight);counts.damage=total-counts.tank-counts.healer-counts.controller;return counts;};
// Pool plan: the role, tier and home region of every fighter to generate, fixed by the seed so the server can verify
// tiers. Each region's founding pool follows its own talent odds.
export function poolPlan(formatSize,regionSize,seed){
 if(!REGION_SIZES.includes(regionSize))throw new Error('Choose 6, 8 or 10 teams per region.');
 const f=format(formatSize),per=poolSize(formatSize,regionSize);
 return REGIONS.flatMap((r,i)=>planSlots(mixCounts(f,per),(seed^Math.imul(i+1,0x2f6b9a1d))>>>0,r));
}
const TIER_ORDER=['SS','S','A','B'];
function planSlots(counts,seed,region){
 const random=rng(seed^0x9e3779b9),slots=[];
 for(const [role,count]of Object.entries(counts))for(let i=0;i<count;i++){let roll=random(),tier='B';for(const t of TIER_ORDER){if(roll<region.odds[t]){tier=t;break;}roll-=region.odds[t];}slots.push({role,tier,region:region.id});}
 return shuffle(slots,seed^0x51ed270b);
}
// Overall rating (OVR, 40–99) from closed-form combat numbers, weighted by measured team-battle impact
// (scripts/evaluate-team-values.mjs, validation/team-values.json).
export const RATING_MODEL=Object.freeze({"intercept":-2.386,"ehp":0.391,"dps":-0.047,"spell":0.151,"ability":0.046,"speed":0.259,"iq":0.158,"kits":{"mendingWave":-0.02,"chainHeal":-0.042,"resurrection":0.109,"cleanse":-0.027,"barrier":-0.02,"stunBolt":-0.049,"hamstring":-0.024,"disarmShot":0.062,"tauntShout":-0.064,"knockUp":0.022},"roles":{"tank":0,"healer":-0.003,"controller":-0.029,"damage":0.085}});
const ABILITY_WEIGHT={Common:.5,Uncommon:1,Rare:1.6,Legendary:2.4};
export function ratingFeatures(character){
 const n=combatNumbers(character),s=(character.summary?.stats||[0,0,0,0,0]).map(v=>Math.sqrt(Math.max(0,Number(v)||0))),traits=character.traits||{},catalog=(character.summary?.generationVersion??1)>=4?globalThis.CURRENT_CLASS_ABILITIES:globalThis.CLASS_ABILITIES;
 const ability=[traits.power,traits.power2].reduce((sum,name)=>sum+(ABILITY_WEIGHT[name&&catalog.definition(name)?.rarity]??0),0);
 return {ehp:Math.log(n.effectiveHp),dps:Math.log(Math.max(1,n.dps)),spell:n.spell/50,ability,speed:s[1]/20,iq:s[3]/20,...Object.fromEntries(Object.keys(TEAM_KITS).map(id=>['kit_'+id,character.teamKit===id?1:0]))};
}
// OVR for the team cast, per battle mode (scripts/evaluate-cast-values.mjs, validation/cast-values.json): rating
// features plus one value per subclass, fitted on lab games so a fighter's rating follows what it adds to a team's
// chance to win, and scaled to the spread above. Leagues pass their battle mode; without one the model above applies.
export const CAST_RATING_MODEL=Object.freeze({core:Object.freeze({"intercept":-3.48,"ehp":0.302,"dps":0.351,"spell":0.244,"ability":0.051,"speed":0.267,"iq":0.13,"subclass":{"Cleric (Light)":0.078,"Cleric (Mercy)":0.083,"Cleric (Ward)":0.116,"Druid (Grove)":-0.047,"Druid (Forest)":0.134,"Druid (Moon)":0.183,"Warrior (Vanguard)":-0.048,"Warrior (Berserker)":-0.272,"Warrior (Duelist)":-0.245,"Guardian (Stoneguard)":-0.04,"Guardian (Warden)":-0.128,"Guardian (Aegis)":0.099,"Mage (Fire)":0.099,"Mage (Blood)":0.131,"Mage (Frost)":0.214,"Mage (Chrono)":0.193,"Ranger (Marksman)":0.077,"Ranger (Trapper)":-0.122,"Ranger (Beastmaster)":0.121,"Assassin (Shadowblade)":-0.25,"Assassin (Riftwalker)":-0.18,"Assassin (Executioner)":-0.018,"Assassin (Venomblade)":-0.276,"Bard (Skald)":-0.166,"Bard (Maestro)":-0.005,"Bard (Siren)":0.135,"Paladin (Crusader)":-0.187,"Paladin (Justiciar)":-0.195,"Paladin (Oathbreaker)":-0.069,"Warlock (Hexer)":0.105,"Warlock (Soulbinder)":0.126,"Warlock (Voidcaller)":0.256}}),teamfight:Object.freeze({"intercept":-3.352,"ehp":0.298,"dps":0.332,"spell":0.287,"ability":0.026,"speed":0.233,"iq":0.157,"subclass":{"Cleric (Light)":0.162,"Cleric (Mercy)":0.205,"Cleric (Ward)":0.157,"Druid (Grove)":0,"Druid (Forest)":-0.061,"Druid (Moon)":0.064,"Warrior (Vanguard)":-0.077,"Warrior (Berserker)":-0.192,"Warrior (Duelist)":-0.209,"Guardian (Stoneguard)":0.048,"Guardian (Warden)":-0.109,"Guardian (Aegis)":0.009,"Mage (Fire)":0.084,"Mage (Blood)":0.22,"Mage (Frost)":0.195,"Mage (Chrono)":0.111,"Ranger (Marksman)":0.079,"Ranger (Trapper)":-0.13,"Ranger (Beastmaster)":0.207,"Assassin (Shadowblade)":-0.151,"Assassin (Riftwalker)":-0.189,"Assassin (Executioner)":-0.056,"Assassin (Venomblade)":-0.174,"Bard (Skald)":-0.312,"Bard (Maestro)":-0.128,"Bard (Siren)":0.109,"Paladin (Crusader)":-0.146,"Paladin (Justiciar)":-0.139,"Paladin (Oathbreaker)":-0.03,"Warlock (Hexer)":0.037,"Warlock (Soulbinder)":0.127,"Warlock (Voidcaller)":0.271}})});
export const CAST_RATING_VERSION=3;
const castModel=(character,mode)=>mode&&(character.summary?.generationVersion??0)>=5?CAST_RATING_MODEL[mode==='core'?'core':'teamfight']??null:null;
export function rawRating(character,role=teamRole(character).role,mode=null){const x=ratingFeatures(character),c=castModel(character,mode);if(c)return c.intercept+c.ehp*x.ehp+c.dps*x.dps+c.spell*x.spell+c.ability*x.ability+c.speed*x.speed+c.iq*x.iq+(c.subclass[`${character.traits?.class} (${character.traits?.subclass})`]??0);const m=RATING_MODEL;return m.intercept+m.ehp*x.ehp+m.dps*x.dps+m.spell*x.spell+m.ability*x.ability+m.speed*x.speed+m.iq*x.iq+(m.roles[role]??0);}
// A smooth scale preserves differences between strong recruits instead of
// flattening every prediction above .75 to 99. Career progression still applies.
export function overall(character,role,mode=null){return Math.max(40,Math.min(99,Math.round(40+59/(1+Math.exp(-5*(rawRating(character,role,mode)-.5))))));}
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
 if(w.teamEngine)w.teamEngine=engineForMode(w.settings.battleMode);
 return w;
}
// Current rules (team-2.9 / team-4.0: the same game on every device; no fighters stuck on rocks; stronger controllers; siege team brain with coach game plans, backdoor defense, Titan abilities): leagues on an earlier current engine move up from their next
// series. A series already in progress finishes under its original rules; recorded games keep their own engine.
const ROLE_RULE_UPGRADES=Object.freeze({'team-2.6':'team-2.9','team-2.7':'team-2.9','team-2.8':'team-2.9','team-3.3':'team-4.0','team-3.4':'team-4.0','team-3.5':'team-4.0','team-3.6':'team-4.0','team-3.7':'team-4.0','team-3.8':'team-4.0','team-3.9':'team-4.0'});
export function prepareRoleRules(w){if(w&&!w.pendingSeries&&ROLE_RULE_UPGRADES[w.teamEngine])w.teamEngine=ROLE_RULE_UPGRADES[w.teamEngine];return w;}
// Salaries (millions of crowns) rise steeply with OVR, so nobody can afford a roster of stars.
export function salaryFor(ovr){return round1(Math.max(.8,.8+13.2*Math.pow(Math.max(0,ovr-50)/49,2.3)));}
export function scoutFighter(character,mode=null){const {role,secondary,castRole}=teamRole(character),ovr=overall(character,role,mode);return {role,secondary,...(castRole?{castRole}:{}),ovr,salary:salaryFor(ovr)};}
function teamIdentities(count,seed){
 const places=shuffle(PLACES,seed^0xa11ce),mascots=shuffle(MASCOTS,seed^0xb0b),firsts=shuffle(COACH_FIRST,seed^0xc0ac4),lasts=shuffle(COACH_LAST,seed^0xd00d),styles=shuffle(Object.keys(PERSONALITIES),seed^0xe1e1);
 return Array.from({length:count},(_,i)=>({name:`${places[i%places.length]} ${mascots[i%mascots.length]}`,coach:{name:`${firsts[i%firsts.length]} ${lasts[(i*7)%lasts.length]}`,personality:styles[i%styles.length]}}));
}
const FIGHTER_KEYS=['race','subrace','class','subclass','strength','speed','durability','iq','magic','weapon','mastery','power','power2','weakness'];
export function create({id,format:formatSize,regionSize,seed,fighters,battleMode='teamfight'}){
 const f=format(formatSize);if(!['teamfight','core'].includes(battleMode)||battleMode==='core'&&f.size===2)throw new Error('Core siege requires 3v3 or 5v5.');if(!REGION_SIZES.includes(regionSize))throw new Error('Choose 6, 8 or 10 teams per region.');
 const plan=poolPlan(formatSize,regionSize,seed);if(!Array.isArray(fighters)||fighters.length!==plan.length)throw new Error(`The fighter pool must hold ${plan.length} fighters.`);if(!castFighters(fighters))throw new Error('Team leagues draw their fighters from the team cast.');
 const roster={},seen=new Set();
 fighters.forEach((c,i)=>{
  if(!c||typeof c.id!=='string'||!c.id||c.id.length>80||seen.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)throw new Error('Invalid pool fighter.');seen.add(c.id);
  if(!c.traits||FIGHTER_KEYS.some(k=>typeof c.traits[k]!=='string'))throw new Error('Pool fighters need all fourteen traits.');
  if(c.summary?.tier!==plan[i].tier)throw new Error('A pool fighter does not match its planned tier.');
  roster[c.id]={id:c.id,name:c.name.trim(),traits:{...c.traits},summary:{stats:[...c.summary.stats],total:c.summary.total,tier:c.summary.tier,generationVersion:c.summary.generationVersion??3},...scoutFighter(c,battleMode),ratingVersion:CAST_RATING_VERSION,team:null,contract:null,careerStart:founderStart(seed,c.id),region:plan[i].region,locked:true};roster[c.id].prefs=fighterPrefs(seed,roster[c.id]);
 });
 const count=REGIONS.length*regionSize,identities=teamIdentities(count,seed);
 const list=identities.map((x,i)=>({id:`t${i+1}`,name:x.name,region:REGIONS[Math.floor(i/regionSize)].id,coach:{...x.coach,comp:coachComp(x.coach.personality,rng((seed^Math.imul(i+1,0x85ebca6b))>>>0))},roster:[],lineup:[]}));
 // Market cap: an average team can afford the average salary of the fighters who will be signed (scaled per region).
 const drafted=Object.values(roster).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,count*f.rosterSize),cap=round1(drafted.reduce((n,x)=>n+x.salary,0)/count);
 return {version:TEAM_LEAGUE_VERSION,castVersion:CAST_LEAGUE,circuitVersion:CIRCUIT_VERSION,contractsVersion:CONTRACTS_VERSION,engine:TEAM_COMBAT_VERSION,format:f.size,id,seed:seed>>>0,season:1,phase:'market',
  supportRulesVersion:1,hallRulesVersion:HALL_RULES_VERSION,balance:{...neutralBalance(),enabled:false},settings:{regionSize,teams:count,battleMode,rosterSize:f.rosterSize,salaryCap:cap,minSalary:Math.min(...Object.values(roster).map(x=>x.salary))},
  regionRank:[...REGION_IDS],teams:list,fighters:roster,titles:[],awards:[],market:newMarket('founding')};
}
// Leagues rated before the cast model move every cast fighter onto it, keeping the career progress each one earned
// (OVR above or below its old base rating). Contracts keep their price until the next offseason re-prices them.
export function prepareCastRatings(w){
 if(!w?.fighters||w.pendingSeries)return w;
 for(const f of Object.values(w.fighters)){
  if(f.ratingVersion===CAST_RATING_VERSION||(f.summary?.generationVersion??0)<5)continue;
  const before=f.ovr,progress=f.ovr-overall(f,f.role);f.ovr=Math.max(40,Math.min(99,overall(f,f.role,w.settings?.battleMode)+progress));f.ratingVersion=CAST_RATING_VERSION;
  if(f.ovr!==before)f.lastOvr=before;
 }
 return w;
}
export const teamById=(w,id)=>w.teams.find(t=>t.id===id);
export const regionTeams=(w,region)=>w.teams.filter(t=>t.region===region);
export const regionOfTeam=(w,id)=>teamById(w,id)?.region??null;
// Each region's cap is the market cap times its cap factor.
export const capOf=(w,team)=>round1(w.settings.salaryCap*(regionById(team.region)?.cap??1));
export const payroll=(w,team)=>round1(team.roster.reduce((n,id)=>n+wage(w.fighters[id]),0));
export const capSpace=(w,team)=>round1(capOf(w,team)-payroll(w,team));
export const available=w=>Object.values(w.fighters).filter(f=>!f.team);
// Rookies and the founding pool sign only in their home region until their first contract ends.
export const canSign=(team,f)=>!f.locked||f.region===team.region;
export const signable=(w,team)=>available(w).filter(f=>canSign(team,f));
export function roleCounts(w,team){const counts={tank:0,healer:0,controller:0,damage:0};for(const id of team.roster)counts[w.fighters[id].role]++;return counts;}
// ---------- Contracts and the free-agent market (replacing the draft) ----------
// Every signed fighter has a contract: a salary fixed for its length and the last season it covers. Market value
// (f.salary, from OVR) still moves every offseason; payroll and the cap count contract salaries. A contract ends
// after its last season: the fighter may re-sign or test free agency, where teams bid in rounds and each fighter
// signs the offer he likes best (money, a contender, a starting spot, a team that plays his style, loyalty, length).
// Leagues open with the same auction instead of a draft.
export const CONTRACTS_VERSION=1;
export const CONTRACT=Object.freeze({maxYears:3,fit:.04,rounds:8,floor:1,floorDrop:.07,lowestFloor:.6});
export const wage=f=>f.contract?.salary??f.salary;
// The season a signing made now starts in: next season during the offseason, otherwise this one.
export const startSeasonOf=w=>w.phase==='offseason'||w.phase==='complete'?w.season+1:w.season;
// Leagues from before contracts: every rostered fighter gets a contract at his current salary with 1–3 seeded seasons
// left, everyone gets preferences, and a draft in progress becomes free agency (picks already made stay signed).
export function prepareContracts(w){
 if(!w?.fighters||w.contractsVersion||w.pendingSeries||oldFormat(w))return w;
 const next=startSeasonOf(w);
 for(const f of Object.values(w.fighters)){f.prefs??=fighterPrefs(w.seed,f);if(f.team&&!f.contract){const years=1+Math.floor(rng(idSeed(w.seed,'contract:'+f.id))()*3);f.contract={salary:f.salary,years,signed:next,until:next+years-1};}if(!f.team)f.contract=null;}
 if(w.phase==='draft'){w.phase='market';w.market=newMarket('founding');w.market.round=w.draft?.picks?.length?1:0;delete w.draft;}
 if(w.phase==='offseason'&&w.offseason){const step={decisions:'resign',market:'trades',draft:'freeAgency'}[w.offseason.step]??w.offseason.step;w.offseason.step=step;w.offseason.expiring??=[];
  if(step==='freeAgency'){delete w.draft;w.market=newMarket('offseason');}}
 if(w.phase!=='offseason')delete w.draft;
 w.contractsVersion=CONTRACTS_VERSION;return w;
}
const idSeed=(seed,key)=>{let h=(seed^0x2c1b3c6d)>>>0;for(const ch of key)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
// Team styles are the coach tactics. A fighter leans to his role's style; some prefer another, a few any (balanced).
const STYLE_LEAN=Object.freeze({tank:'defensive',healer:'protect-carry',controller:'focus-healer',damage:'aggressive'});
export const OPPOSITE_STYLE=Object.freeze({aggressive:'defensive',defensive:'aggressive','protect-carry':'focus-healer','focus-healer':'protect-carry'});
export function fighterPrefs(seed,f){
 const r=rng(idSeed(seed,'prefs:'+f.id)),roll=r(),style=roll<.55?STYLE_LEAN[f.role]??'balanced':TACTICS[Math.floor(r()*TACTICS.length)];
 return {style,money:round2(.6+r()*.8),winning:round2(.6+r()*.8),role:round2(.6+r()*.8),loyalty:round2(.2+r()*.8),home:round2(.3+r()*.7)};
}
const round2=n=>Math.round(n*100)/100;
// Fit with a team's style: +1 when it plays his style, −1 when it plays the opposite, otherwise 0 (a balanced team or
// a fighter who prefers balanced always fits neutrally). In league matches it moves strength, speed, durability and
// magic by ±CONTRACT.fit.
export function fit(w,f,team){const style=f?.prefs?.style,tactic=team?teamTactic(w,team):null;if(!style||!tactic||style==='balanced'||tactic==='balanced')return 0;return style===tactic?1:OPPOSITE_STYLE[style]===tactic?-1:0;}
export const fitStats=(stats,f)=>!f?stats:stats.map((v,i)=>CAREER.stats.includes(i)?Math.round(v*(1+CONTRACT.fit*f)):v);
// How strong a team looks to a free agent (0..1): this season's regular-season record (last season's during the
// offseason) and the current starters' rating, ranked across every region, so the strongest regions draw imports.
function contenders(w){
 const now=seasonRecords(w),last=w.history?.at(-1),pctOf=new Map(now.size?[...now].map(([id,r])=>[id,r.wins/((r.wins+r.losses)||1)]):(last?.standings??[]).map(r=>[r.id,r.wins/((r.wins+r.losses)||1)])),all=Object.values(w.fighters),avg=all.reduce((n,f)=>n+f.ovr,0)/(all.length||1);
 const strength=t=>{const ids=bestLineup(w,t),size=FORMATS[w.format].size;return (ids.reduce((n,id)=>n+w.fighters[id].ovr,0)+(size-ids.length)*avg)/size;};
 const ranked=w.teams.map(t=>({id:t.id,s:strength(t)})).sort((a,b)=>a.s-b.s||(a.id<b.id?-1:1)),n=Math.max(1,w.teams.length-1),out=new Map();
 ranked.forEach((x,i)=>out.set(x.id,pctOf.size?.5*(pctOf.get(x.id)??.5)+.5*(i/n):i/n));return out;
}
const wouldStart=(w,team,f)=>bestLineup(w,{...team,roster:[...team.roster.filter(id=>id!==f.id),f.id],lineup:[]}).includes(f.id);
// Stars without a Worlds or MSI title chase one: the wish to win grows with every titleless season after their third.
export function winningWish(w,f){const base=f.prefs?.winning??1,titles=(f.career?.trophies?.worlds??f.career?.titles??0)+(f.career?.trophies?.msi??0),chase=f.ovr>=78&&!titles?Math.max(0,careerSeason(w,f)-3)*.15:0;return Math.min(2.2,base+chase);}
// The length a fighter wants: long for young players, short near the end of a career.
export function wantedYears(w,f){const age=careerSeason(w,f)+(startSeasonOf(w)>w.season?1:0);return age<=3?3:age<=6?2:1;}
// How much a fighter likes an offer (higher is better). Money and a starting spot can beat a contender: that is what
// lets rebuilding teams with cap room sign stars. Most fighters like staying in their home region.
export const APPEAL=Object.freeze({money:2.5,winning:.8,start:.6,bench:-.5,fit:.35,loyalty:.4,years:.12,room:.1,home:.6});
export function offerAppeal(w,f,offer,ctx={}){
 const team=teamById(w,offer.team),strength=(ctx.contenders??contenders(w)).get(offer.team)??.5,p=f.prefs??fighterPrefs(w.seed,f),ask=Math.max(.8,f.salary);
 return p.money*(offer.salary/ask-1)*APPEAL.money+winningWish(w,f)*(strength-.5)*APPEAL.winning+p.role*(wouldStart(w,team,f)?APPEAL.start:APPEAL.bench)+APPEAL.fit*fit(w,f,team)+(f.lastTeam===offer.team?p.loyalty*APPEAL.loyalty:0)+(team.region===f.region?(p.home??.6)*APPEAL.home:0)-APPEAL.years*Math.abs(offer.years-wantedYears(w,f));
}
// The lowest share of his market value a free agent takes this round; it drops as the market drags on.
export const askFloor=round=>Math.max(CONTRACT.lowestFloor,CONTRACT.floor-CONTRACT.floorDrop*round);
// Coaches budget a margin because rivals may sign the cheap fighters they were counting on.
export const RESERVE_MARGIN=1.15;
// Room to keep for `spots` more signings: the cheapest free agents (not in `skip`) at the lowest price they take.
export function reserveRoom(w,team,spots,skip=new Set()){
 if(spots<=0)return 0;const cheapest=signable(w,team).filter(x=>!skip.has(x.id)).map(x=>x.salary).sort((a,b)=>a-b).slice(0,spots);
 return cheapest.length<spots?Infinity:cheapest.reduce((n,v)=>n+v,0)*askFloor(CONTRACT.rounds)*RESERVE_MARGIN;
}
// Who a team can afford now: after reserving room to fill its other open spots with the cheapest free agents.
export function eligible(w,team,committed=0,openLeft=w.settings.rosterSize-team.roster.length,skip=new Set()){
 const space=capSpace(w,team)-committed,pool=signable(w,team).filter(x=>!skip.has(x.id));
 // No role is mandatory: "unmet" is only the coach's own plan, used to value fighters, never to restrict signings.
 const counts=roleCounts(w,team),plan=rosterTargets(w,team),unmet=Object.fromEntries(ROLE_KEYS.map(r=>[r,Math.max(0,plan[r]-counts[r])]));
 // Room for the other open spots: the cheapest `openLeft-1` free agents other than x (one extra in case x is one).
 const spots=openLeft-1,cheapest=pool.slice().sort((a,b)=>a.salary-b.salary||(a.id<b.id?-1:1)).slice(0,spots+1),scale=askFloor(CONTRACT.rounds)*RESERVE_MARGIN;
 const reserveFor=x=>{if(spots<=0)return 0;const others=cheapest.filter(y=>y.id!==x.id).slice(0,spots);return others.length<spots?Infinity:others.reduce((n,y)=>n+y.salary,0)*scale;};
 return {candidates:pool.filter(x=>x.salary*askFloor(w.market?.round??0)+reserveFor(x)<=space+1e-9),counts,unmet,reserveFor,space};
}
export function coachValue(w,team,x,counts,unmet,noise=()=>.5){
 const style=PERSONALITIES[team.coach.personality],average=capOf(w,team)/w.settings.rosterSize,plan=rosterTargets(w,team);
 const need=unmet[x.role]>0?1+.35*style.need:counts[x.role]>=plan[x.role]+1?.7:.9;
 return Math.pow(x.ovr/70,1+style.star)*70*style.rating*(style.roles[x.role]??1)*need-style.cost*(x.salary/average)*9+(noise()-.5)*2;
}
// Contract length an AI coach offers: star chasers lock stars up long, bargain hunters keep deals short.
function offerYears(w,team,f){const want=wantedYears(w,f),style=team.coach.personality;return Math.max(1,Math.min(CONTRACT.maxYears,style==='star'&&f.ovr>=80?want+1:style==='bargain'?Math.min(want,2):want));}
// One AI team's offers this round: its best targets it can afford, one per open spot, priced by personality and how
// long the market has run.
function aiOffers(w,team,round,ctx){
 const open=w.settings.rosterSize-team.roster.length,out=[];if(open<=0)return out;
 const noise=rng(w.seed^Math.imul(startSeasonOf(w),0x2545f491)^Math.imul(round+1,2654435761)^idSeed(w.seed,team.id)),style=PERSONALITIES[team.coach.personality],taken=new Set();
 let committed=0;
 for(let k=0;k<open;k++){
  const {candidates,counts,unmet,reserveFor,space}=eligible(w,team,committed,open-k,taken);if(!candidates.length)break;
  let best=null,score=-Infinity;for(const x of candidates.slice().sort((a,b)=>a.id<b.id?-1:1)){const v=coachValue(w,team,x,counts,unmet,noise)-(ctx.claimed.get(x.id)??0)*3;if(v>score){score=v;best=x;}}
  // Teams with room to spare per open spot bid more: rebuilding teams can outbid contenders.
  const room=(space-committed)/Math.max(1,open-k)/(capOf(w,team)/w.settings.rosterSize),premium=1+.04*round+Math.max(0,Math.min(.3,(room-1)*APPEAL.room))+(best.ovr>=82?.12*style.star:0)-(style.cost>1.5?.05:0),cap=space-reserveFor(best);
  const salary=round1(Math.max(best.salary*askFloor(round),Math.min(best.salary*premium,cap)));
  if(salary>cap+1e-9)break;
  out.push({team:team.id,fighter:best.id,salary,years:offerYears(w,team,best)});committed+=salary;taken.add(best.id);ctx.claimed.set(best.id,(ctx.claimed.get(best.id)??0)+1);
 }
 return out;
}
function sign(w,f,team,salary,years,exception=false){
 const start=startSeasonOf(w);f.team=team.id;f.contract={salary:round1(salary),years,signed:start,until:start+years-1};delete f.freeAgentSince;team.roster.push(f.id);
 w.market.log.push({round:w.market.round+1,fighter:f.id,team:team.id,salary:f.contract.salary,years,...(f.lastTeam&&f.lastTeam!==team.id?{from:f.lastTeam}:{}),...(exception?{exception:true}:{})});
}
const isUser=(w,teamId)=>!!teamId&&w.settings.userTeam===teamId;
export const marketOpen=w=>!!w.market&&!w.market.done;
const openSpots=(w,team)=>w.settings.rosterSize-team.roster.length;
// The user's pending offers: one per fighter, at most one per open spot, all affordable together.
export function makeOffer(w,fighterId,salary,years){
 const team=userTeam(w);if(!marketOpen(w))throw new Error('Free agency is not open.');
 const f=w.fighters[fighterId];if(!f||f.team)throw new Error('That fighter is not a free agent.');if(!canSign(team,f))throw new Error(`${f.name} is a ${regionById(f.region).name} rookie: only teams there can sign him until his first contract ends.`);
 if(!Number.isFinite(salary)||salary<=0||salary>99)throw new Error('Offer a salary in millions.');if(!Number.isInteger(years)||years<1||years>CONTRACT.maxYears)throw new Error(`Offer 1 to ${CONTRACT.maxYears} seasons.`);
 const offers=[...(w.market.offers??[]).filter(o=>o.fighter!==fighterId),{fighter:fighterId,salary:round1(salary),years}];
 if(offers.length>openSpots(w,team))throw new Error('You have more offers than open roster spots. Withdraw one first.');
 const total=offers.reduce((n,o)=>n+o.salary,0),room=reserveRoom(w,team,openSpots(w,team)-offers.length,new Set(offers.map(o=>o.fighter)));
 if(total+room>capSpace(w,team)+1e-9)throw new Error('Those offers would leave no room under the cap to fill your roster.');
 w.market.offers=offers;return w;
}
export function withdrawOffer(w,fighterId){userTeam(w);if(!marketOpen(w))throw new Error('Free agency is not open.');w.market.offers=(w.market.offers??[]).filter(o=>o.fighter!==fighterId);return w;}
// One round: every team's offers, then each free agent takes the offer he likes best if it meets his floor.
export function marketRound(w){
 if(!marketOpen(w))throw new Error('Free agency is not open.');
 const m=w.market,round=m.round,ctx={claimed:new Map()},offers=[];
 const user=w.settings.userTeam&&teamById(w,w.settings.userTeam);
 for(const team of w.teams){if(user&&team.id===user.id)continue;offers.push(...aiOffers(w,team,round,ctx));}
 if(user)offers.push(...(m.offers??[]).filter(o=>!w.fighters[o.fighter]?.team).map(o=>({...o,team:user.id})));
 const byFighter=new Map();for(const o of offers)(byFighter.get(o.fighter)??byFighter.set(o.fighter,[]).get(o.fighter)).push(o);
 ctx.contenders=contenders(w);const results=[];
 for(const id of [...byFighter.keys()].sort((a,b)=>w.fighters[b].ovr-w.fighters[a].ovr||(a<b?-1:1))){
  const f=w.fighters[id],floor=round1(f.salary*askFloor(round))-1e-9;
  const ranked=byFighter.get(id).filter(o=>o.salary>=floor).map(o=>({o,appeal:offerAppeal(w,f,o,ctx)})).sort((a,b)=>b.appeal-a.appeal||(a.o.team<b.o.team?-1:1));
  // A team can't sign more fighters than it has room (or cap) for; the fighter moves on to his next choice.
  const pick=ranked.find(({o})=>{const t=teamById(w,o.team);return openSpots(w,t)>0&&o.salary<=capSpace(w,t)+1e-9;});
  if(pick)sign(w,f,teamById(w,pick.o.team),pick.o.salary,pick.o.years);
  if(user&&byFighter.get(id).some(o=>o.team===user.id))results.push({fighter:id,signed:pick?.o.team??null});
 }
 m.round++;m.offers=(m.offers??[]).filter(o=>!w.fighters[o.fighter]?.team);if(user)m.results=results;
 if(w.teams.every(t=>openSpots(w,t)<=0))finishMarket(w);
 else if(m.round>=CONTRACT.rounds)fillByException(w);
 return w;
}
// Past the last round, open spots go to the cheapest free agents on one-season minimum deals (allowed past the cap).
function fillByException(w){
 for(const team of w.teams)while(openSpots(w,team)>0){const f=signable(w,team).sort((a,b)=>a.salary-b.salary||(a.id<b.id?-1:1))[0];if(!f)break;sign(w,f,team,f.salary,1,true);}
 finishMarket(w);
}
function finishMarket(w){
 const m=w.market;m.done=true;m.offers=[];
 if(m.kind==='founding'){w.phase='ready';for(const t of w.teams)t.lineup=bestLineup(w,t);}
 else{w.offseason.signings=m.log;newSeason(w);}
}
// Runs up to `count` rounds; a coached team with open spots stops the run after each round so its coach can bid.
export function marketRounds(w,count){let n=0;while(n<count&&marketOpen(w)){marketRound(w);n++;const user=w.settings.userTeam&&teamById(w,w.settings.userTeam);if(user&&marketOpen(w)&&openSpots(w,user)>0)break;}return n;}
const newMarket=kind=>({kind,round:0,log:[],offers:[],done:false});
// Starters follow the coach's composition plan with the best fighters per role, then the strongest remaining.
export function bestLineup(w,team){
 const f=FORMATS[w.format],left=team.roster.map(id=>w.fighters[id]).sort((a,b)=>b.ovr-a.ovr||(a.id<b.id?-1:1)),lineup=[],plan=starterTargets(w,team);
 for(const role of ROLE_KEYS)for(let n=0;n<plan[role];n++){const i=left.findIndex(x=>x.role===role);if(i>=0)lineup.push(left.splice(i,1)[0].id);}
 // The rest by OVR, skipping a second tank or healer in 2v2 and 3v3 while anyone else is left.
 const doubled=x=>f.size<=3&&SOLO_ROLES.includes(x.role)&&lineup.some(id=>w.fighters[id].role===x.role);
 while(lineup.length<f.size&&left.length){const i=left.findIndex(x=>!doubled(x));lineup.push(left.splice(Math.max(0,i),1)[0].id);}
 return lineup;
}
export const teamOverall=(w,team)=>{const ids=team.lineup.length?team.lineup:bestLineup(w,team);return ids.length?Math.round(ids.reduce((n,id)=>n+w.fighters[id].ovr,0)/ids.length):0;};
export const starters=(w,team)=>(team.lineup.length?team.lineup:bestLineup(w,team)).map(id=>w.fighters[id]);

// ---------- The season: three splits in every region and three international events ----------
export const SEASON_CONDITIONS=Object.freeze({time:'random',weather:'random',ground:'random',map:'random'});
// Results must come from the current team engine (combat-team.js TEAM_ENGINE_VERSION); recorded games are never re-checked.
export {TEAM_COMBAT_VERSION,OBJECTIVE_COMBAT_VERSION} from './team-engine-versions.js';
// International events, from the least to the most prestigious. Names are placeholders.
export const EVENTS=Object.freeze({'first-stand':Object.freeze({name:'First Forging',prestige:1}),msi:Object.freeze({name:'Midseason Crucible',prestige:2}),worlds:Object.freeze({name:'Forgefire Worlds',prestige:3})});
export const SPLIT_PRESTIGE=Object.freeze({1:.5,2:.5,3:.75});
// Championship points by final place (index 0 = champion) in each split and in the two earlier events; every other
// event entrant gets EVENT_ENTRY_POINTS.
export const SPLIT_POINTS=Object.freeze({1:Object.freeze([40,30,20,20,10,10]),2:Object.freeze([60,45,30,30,15,15]),3:Object.freeze([90,70,50,50,30,30])});
export const EVENT_POINTS=Object.freeze({'first-stand':Object.freeze([20,10]),msi:Object.freeze([40,25,15,15])});
export const EVENT_ENTRY_POINTS=5;
// The season, in order: each split's regular season and playoffs, First Stand (from season 2), MSI after split 2,
// the regional qualifiers and Worlds.
export function buildCalendar(season){
 const out=[];
 for(const n of [1,2,3]){out.push({key:`split${n}`,kind:'split',split:n},{key:`split${n}-playoffs`,kind:'playoffs',split:n});if(n===1&&season>1)out.push({key:'first-stand',kind:'event',event:'first-stand'});if(n===2)out.push({key:'msi',kind:'event',event:'msi'});}
 out.push({key:'qualifiers',kind:'qualifiers'},{key:'worlds',kind:'event',event:'worlds'});return out;
}
export function stageName(stage){return !stage?'':stage.kind==='split'?`Split ${stage.split}`:stage.kind==='playoffs'?`Split ${stage.split} playoffs`:stage.kind==='qualifiers'?'Regional qualifiers':EVENTS[stage.event].name;}
export const currentStage=w=>w.phase==='season'&&w.calendar?w.calendar[w.stageIndex]:null;
const matchSeed=(w,id)=>{let h=w.seed^Math.imul(w.season,0x632be5ab);for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
const getter=w=>id=>w.year.matches[id];
function addMatch(w,{stage,group,key,home,away,bestOf,round=0,label=''}){const id=`s${w.season}:${stage}:${group}:${key}`;w.year.matches[id]={id,stage,group,key,label,round,home,away,bestOf,games:[],winner:null};return id;}
// Balance is set by hand for the team cast: leagues play the base rules and never audit or patch themselves.
export function startSeason(w){
 if(w.phase!=='ready')throw new Error('Fill every roster in free agency before the season.');
 w.balance??=neutralBalance();w.balance.enabled=false;delete w.balance.pendingAudit;w.balance.rulesVersion=3;w.balance.samples=[];w.balance.seasonSamples=[];w.balance.sampleGames=w.balance.seasonSampleGames=0;
 w.teamEngine=engineForMode(w.settings.battleMode);delete w.pendingSeries;delete w.awaiting;
 w.calendar=buildCalendar(w.season);w.stageIndex=0;w.stats={};w.stageStats={};w.phase='season';
 w.year={season:w.season,matches:{},splits:{},points:Object.fromEntries(w.teams.map(t=>[t.id,0])),qualifiers:{},worldsSeeds:{},events:{},msiBonus:null};
 for(const t of w.teams)if(!t.lineup.length)t.lineup=bestLineup(w,t);
 startStage(w);return w;
}
// Moves past a finished stage (its summary was shown) and starts the next one.
export function advance(w){
 if(w.phase!=='season'||!w.awaiting)throw new Error('The current stage is still being played.');
 delete w.awaiting;w.stageIndex++;startStage(w);return w;
}
function startStage(w){
 const st=w.calendar[w.stageIndex];
 if(st.kind==='split')startSplit(w,st.split);
 else if(st.kind==='playoffs')startSplitPlayoffs(w,st.split);
 else if(st.kind==='qualifiers')startQualifiers(w);
 else{w.stageStats={};({'first-stand':startFirstStand,msi:startMsi,worlds:startWorlds})[st.event](w);}
 if(stageDone(w,st))finishStage(w,st);
}
// A region's split table from its regular-season games.
export function regionTable(w,region,split,year=w.year){
 const s=year?.splits?.[split];if(!s?.regular?.[region])return [];
 return table(regionTeams(w,region).map(t=>t.id),s.regular[region].flat().map(id=>year.matches[id]),matchSeed(w,`table:${split}`),`${split}:${region}`);
}
// Regular-season records over every split played so far this season.
export function seasonRecords(w){
 const out=new Map();for(const m of Object.values(w.year?.matches??{})){if(!/^split\d$/.test(m.stage)||!m.winner)continue;for(const id of [m.home,m.away]){const r=out.get(id)??{wins:0,losses:0};if(m.winner===id)r.wins++;else r.losses++;out.set(id,r);}}
 return out;
}
function startSplit(w,n){
 const y=w.year;y.splits[n]={regular:{},playoffs:{},places:{}};w.stageStats={};
 for(const r of REGION_IDS){const ids=seededOrder(regionTeams(w,r).map(t=>t.id),matchSeed(w,`order:${n}`),r);
  y.splits[n].regular[r]=roundRobinRounds(ids,n===3?2:1).map((pairs,round)=>pairs.map(([home,away],i)=>addMatch(w,{stage:`split${n}`,group:r,key:`r${round+1}m${i}`,home,away,bestOf:1,round:round+1,label:`Week ${round+1}`})));}
}
function openStageBracket(w,b){return openBracket(b,getter(w),(node,home,away)=>addMatch(w,{stage:b.stage,group:b.group,key:node.key,home,away,bestOf:node.bestOf,label:node.label}));}
function newBracket(w,stage,group,template,seeds){const b={format:'bracket',stage,group,template,seeds,matches:{}};openStageBracket(w,b);return b;}
// Split playoffs: the top four (top six in Split 3 for regions of eight or more) by the split table.
function startSplitPlayoffs(w,n){
 const s=w.year.splits[n];
 for(const r of REGION_IDS){const rows=regionTable(w,r,n),template=n===3&&rows.length>=8?'top6':'top4';s.playoffs[r]=newBracket(w,`split${n}-playoffs`,r,template,rows.slice(0,template==='top6'?6:4).map(x=>x.id));}
}
// Teams by championship points; ties go to the better Split 3, 2 and 1 finish, then a seeded coin.
export function pointsOrder(w,region,year=w.year){
 const placeOf=(n,id)=>{const p=year.splits[n]?.places?.[region];const i=p?p.indexOf(id):-1;return i<0?99:i;};
 return regionTeams(w,region).map(t=>t.id).sort((a,b)=>(year.points[b]??0)-(year.points[a]??0)||placeOf(3,a)-placeOf(3,b)||placeOf(2,a)-placeOf(2,b)||placeOf(1,a)-placeOf(1,b)||coin(matchSeed(w,'points'),a)-coin(matchSeed(w,'points'),b));
}
// Worlds qualification per region: the Split 3 champion, then the points leader, then a gauntlet ladder of the next
// four teams by points for any seeds left (its winner, then its finalist, then the next ladder loser).
function startQualifiers(w){
 const y=w.year;
 for(const r of REGIONS){
  const need=r.worlds+(y.msiBonus===r.id?1:0),champ=y.splits[3].places[r.id][0],order=pointsOrder(w,r.id).filter(id=>id!==champ);
  const direct=[champ,...order.slice(0,need>=2?1:0)],rest=need-direct.length,pool=order.slice(direct.length-1),q={need,direct,bracket:null};
  if(rest>0){const n=Math.min(4,pool.length);if(n>=2)q.bracket=newBracket(w,'qualifiers',r.id,`ladder${n}`,pool.slice(0,n));else q.direct.push(...pool.slice(0,rest));}
  y.qualifiers[r.id]=q;
 }
}
function startFirstStand(w){
 const y=w.year,rank=w.regionRank,champ=r=>y.splits[1].places[r][0],groups={A:[0,2,4].map(i=>champ(rank[i])),B:[1,3,5].map(i=>champ(rank[i]))},rounds={};
 for(const [g,ids]of Object.entries(groups))rounds[g]=roundRobinRounds(ids,1).map((pairs,round)=>pairs.map(([home,away],i)=>addMatch(w,{stage:'first-stand',group:g,key:`r${round+1}m${i}`,home,away,bestOf:3,round:round+1,label:`Group ${g} · round ${round+1}`})));
 y.events['first-stand']={key:'first-stand',teams:[...groups.A,...groups.B],current:0,phases:[{key:'groups',format:'groups',groups,rounds},{key:'knockout',format:'bracket',stage:'first-stand',group:'knockout',template:'knockout4',seeds:null,matches:{}}]};
}
// MSI: each region's Split 2 champion and runner-up. Regions with bracket slots send teams straight to the bracket;
// the rest play a GSL play-in for the last two places.
function startMsi(w){
 const y=w.year,rank=w.regionRank,firsts=[],seconds=[],playin=[];
 for(const r of rank){const [direct,via]=regionById(r).msi,picks=y.splits[2].places[r].slice(0,2);if(direct>=1)firsts.push(picks[0]);if(direct>=2)seconds.push(picks[1]);picks.slice(direct,direct+via).forEach((id,k)=>playin.push({id,rank:rank.indexOf(r),place:direct+k}));}
 const seeds=playin.sort((a,b)=>a.rank-b.rank||a.place-b.place).map(x=>x.id),direct=[...firsts,...seconds];
 y.events.msi={key:'msi',teams:[...direct,...seeds],current:0,phases:[newBracket(w,'msi','play-in','gsl',seeds),{format:'bracket',stage:'msi',group:'bracket',template:'double8',seeds:null,direct,matches:{}}].map((p,i)=>({key:i?'bracket':'play-in',...p}))};
}
// Worlds: every qualified seed, ordered by seed number and region rank; the top half meets the bottom half in round 1.
function startWorlds(w){
 const y=w.year,rank=w.regionRank,entries=[];for(const r of rank)(y.worldsSeeds[r]??[]).forEach((id,seed)=>entries.push({id,seed,rank:rank.indexOf(r)}));
 const teams=entries.sort((a,b)=>a.seed-b.seed||a.rank-b.rank).map(e=>e.id),swiss={key:'swiss',format:'swiss',teams,rounds:[]};
 y.events.worlds={key:'worlds',teams,current:0,phases:[swiss,{key:'knockout',format:'bracket',stage:'worlds',group:'knockout',template:'knockout8',seeds:null,matches:{}}]};
 openSwissRound(w,swiss);
}
function openSwissRound(w,s){
 const get=getter(w),{rec}=swissRecords(s,get),round=s.rounds.length+1;
 s.rounds.push(swissPairs(s,get,id=>regionOfTeam(w,id),matchSeed(w,'swiss')).map((p,i)=>addMatch(w,{stage:'worlds',group:'swiss',key:`r${round}m${i}`,home:p.home,away:p.away,bestOf:p.bestOf,round,label:`Swiss round ${round} · ${rec[p.home].join('–')}`})));
}
export function groupTable(w,ev,g,year=w.year){const ph=ev.phases[0];return table(ph.groups[g],ph.rounds[g].flat().map(id=>year.matches[id]),matchSeed(w,'group:'+ev.key),g);}
function phaseDone(w,ph){const get=getter(w);return ph.format==='groups'?Object.values(ph.rounds).flat(2).every(id=>get(id).winner):ph.format==='swiss'?swissDone(ph,get):!!ph.seeds&&bracketDone(ph,get);}
// The next phase of an event takes its seeds from the one before.
function seedPhase(w,ev){
 const get=getter(w),prev=ev.phases[ev.current-1],ph=ev.phases[ev.current];
 if(ev.key==='first-stand'){const [A,B]=['A','B'].map(g=>groupTable(w,ev,g).map(r=>r.id));ph.seeds=[A[0],B[1],B[0],A[1]];}
 else if(ev.key==='msi')ph.seeds=[...ph.direct,...bracketPlaces(prev,get).flat().slice(0,2)];
 else ph.seeds=swissKnockoutSeeds(prev,get,id=>regionOfTeam(w,id),matchSeed(w,'knockout'));
 openStageBracket(w,ph);
}
function stageDone(w,st){
 const y=w.year,get=getter(w);
 if(st.kind==='split')return Object.values(y.splits[st.split].regular).flat(2).every(id=>get(id).winner);
 if(st.kind==='playoffs')return Object.values(y.splits[st.split].playoffs).every(b=>bracketDone(b,get));
 if(st.kind==='qualifiers')return Object.values(y.qualifiers).every(q=>!q.bracket||bracketDone(q.bracket,get));
 const ev=y.events[st.event];return ev.current===ev.phases.length-1&&phaseDone(w,ev.phases[ev.current]);
}
// After every recorded match: open whatever became playable, move events to their next phase, finish the stage.
function progress(w){
 const st=w.calendar[w.stageIndex],y=w.year,get=getter(w);
 if(st.kind==='playoffs')for(const b of Object.values(y.splits[st.split].playoffs))openStageBracket(w,b);
 if(st.kind==='qualifiers')for(const q of Object.values(y.qualifiers))if(q.bracket)openStageBracket(w,q.bracket);
 if(st.kind==='event'){
  const ev=y.events[st.event],ph=ev.phases[ev.current];
  if(ph.format==='bracket')openStageBracket(w,ph);
  if(ph.format==='swiss'&&swissRoundDone(ph,get)&&!swissDone(ph,get))openSwissRound(w,ph);
  if(phaseDone(w,ph)&&ev.current<ev.phases.length-1){ev.current++;seedPhase(w,ev);}
 }
 if(stageDone(w,st))finishStage(w,st);
}
const stageMvp=(w,ok)=>{const best=Object.entries(w.stageStats??{}).filter(([id])=>w.fighters[id]&&ok(w.fighters[id])).sort((a,b)=>impact(b[1])-impact(a[1])||(a[0]<b[0]?-1:1))[0];return best?best[0]:null;};
// A title: the champion's roster as it stands, the runner-up and the stage's most impactful fighter.
function award(w,{event,split=null,region=null,champion,runnerUp,mvp}){
 const team=teamById(w,champion),f=mvp&&w.fighters[mvp];
 const roster=team.roster.map(id=>{const x=w.fighters[id];return {id,name:x.name,role:x.role,castRole:x.castRole,ovr:x.ovr,class:x.traits.class,subclass:x.traits.subclass,tier:x.summary.tier,starter:team.lineup.includes(id)};});
 const title={season:w.season,event,...(split?{split}:{}),...(region?{region}:{}),champion,championName:team.name,runnerUp,mvp:mvp??null,mvpName:f?.name??null,mvpTeam:f?.team??null,roster};
 w.titles=[...(w.titles??[]),title];return title;
}
function addPoints(w,groups,table,entry=0){
 let k=0;for(const group of groups){const at=k;for(const id of group){w.year.points[id]=(w.year.points[id]??0)+(table[at]??entry);k++;}}
}
function finishStage(w,st){
 const y=w.year,get=getter(w),summary={stage:st.key};
 if(st.kind==='split')summary.leaders=Object.fromEntries(REGION_IDS.map(r=>[r,regionTable(w,r,st.split)[0]?.id??null]));
 else if(st.kind==='playoffs'){
  const s=y.splits[st.split];summary.champions={};
  for(const r of REGION_IDS){
   const groups=bracketPlaces(s.playoffs[r],get),inBracket=new Set(groups.flat()),rest=regionTable(w,r,st.split).map(x=>x.id).filter(id=>!inBracket.has(id));
   s.places[r]=[...groups.flat(),...rest];addPoints(w,[...groups,...rest.map(id=>[id])],SPLIT_POINTS[st.split]);
   const t=award(w,{event:'split',split:st.split,region:r,champion:groups[0][0],runnerUp:groups[1][0],mvp:stageMvp(w,f=>regionOfTeam(w,f.team)===r)});summary.champions[r]=t.champion;
  }
 }
 else if(st.kind==='qualifiers'){
  for(const [r,q]of Object.entries(y.qualifiers))y.worldsSeeds[r]=[...q.direct,...(q.bracket?bracketPlaces(q.bracket,get).flat():[])].slice(0,q.need);
  summary.seeds=structuredClone(y.worldsSeeds);
 }
 else{
  const ev=y.events[st.event],final=ev.phases.at(-1),groups=bracketPlaces(final,get),placed=new Set(groups.flat()),others=ev.teams.filter(id=>!placed.has(id));
  ev.places=[...groups,...(others.length?[others]:[])];
  if(EVENT_POINTS[st.event])addPoints(w,ev.places,EVENT_POINTS[st.event],EVENT_ENTRY_POINTS);
  const t=award(w,{event:st.event,champion:groups[0][0],runnerUp:groups[1][0],mvp:stageMvp(w,f=>!!f.team)});summary.champion=t.champion;
  if(st.event==='msi')y.msiBonus=regionOfTeam(w,t.champion);
  if(st.event==='worlds'){finishSeason(w);return;}
 }
 w.awaiting=summary;
}
// International results by region (Worlds counts three times, MSI twice, First Stand once): the region ranking that
// orders seeds and groups follows this season and, at half weight, the season before.
const PLACE_SCORE=[8,6,4,4,2,2,2,2];
function finishSeason(w){
 const y=w.year,best=Object.entries(w.stats??{}).filter(([id])=>w.fighters[id]).sort((a,b)=>impact(b[1])-impact(a[1])||(a[0]<b[0]?-1:1))[0],mvp=best?.[0]??null;
 w.awards=[...(w.awards??[]),{season:w.season,mvp,mvpName:mvp&&w.fighters[mvp].name,mvpTeam:mvp&&w.fighters[mvp].team}];
 const scores=Object.fromEntries(REGION_IDS.map(r=>[r,0]));
 for(const [key,ev]of Object.entries(y.events)){let k=0;for(const group of ev.places??[])for(const id of group){scores[regionOfTeam(w,id)]+=EVENTS[key].prestige*(PLACE_SCORE[k]??1);k++;}}
 const prev=w.regionScores?.at(-1)?.scores??{};w.regionScores=[...(w.regionScores??[]),{season:w.season,scores}].slice(-3);
 w.regionRank=[...REGION_IDS].sort((a,b)=>(scores[b]+.5*(prev[b]??0))-(scores[a]+.5*(prev[a]??0))||REGION_IDS.indexOf(a)-REGION_IDS.indexOf(b));
 w.phase='complete';
}
export const worldsChampion=(w,year=w.year)=>year?.events?.worlds?.places?.[0]?.[0]??null;
function readyMatches(w){
 const st=w.calendar[w.stageIndex],y=w.year,get=getter(w),out=[],open=b=>Object.values(b.matches).map(get).filter(m=>!m.winner);
 if(st.kind==='split'){for(const r of REGION_IDS){const round=y.splits[st.split].regular[r].find(ids=>ids.some(id=>!get(id).winner));if(round)out.push(...round.map(get).filter(m=>!m.winner));}}
 else if(st.kind==='playoffs'){for(const r of REGION_IDS)out.push(...open(y.splits[st.split].playoffs[r]));}
 else if(st.kind==='qualifiers'){for(const q of Object.values(y.qualifiers))if(q.bracket)out.push(...open(q.bracket));}
 else{const ev=y.events[st.event],ph=ev.phases[ev.current];
  if(ph.format==='groups')for(const rounds of Object.values(ph.rounds)){const round=rounds.find(ids=>ids.some(id=>!get(id).winner));if(round)out.push(...round.map(get).filter(m=>!m.winner));}
  else if(ph.format==='swiss')out.push(...(ph.rounds.at(-1)??[]).map(get).filter(m=>!m.winner));
  else out.push(...open(ph));}
 return out;
}
// The matches that can be played now: the next round of every region's split, or every series whose teams are known.
export function upcoming(w,limit=Infinity){
 if(w.phase!=='season'||w.awaiting)return [];
 const out=readyMatches(w);if(w.pendingSeries)out.sort((a,b)=>(b.id===w.pendingSeries.matchId)-(a.id===w.pendingSeries.matchId));
 return out.slice(0,limit).map(m=>describe(w,m));
}
function describe(w,m){const home=teamById(w,m.home),away=teamById(w,m.away);const partial=w.pendingSeries?.matchId===m.id?w.pendingSeries:null;return {id:m.id,stage:m.stage,group:m.group,label:m.label,round:m.round,home:m.home,away:m.away,bestOf:m.bestOf,kind:/^split\d$/.test(m.stage)?'regular':'series',week:m.round,engineVersion:w.teamEngine??'team-2',...(BALANCED_ENGINES.includes(w.teamEngine)?{balance:structuredClone(w.balance?.profile??neutralBalance().profile)}:{}),seriesRulesVersion:2,coachStyles:[home.coach.personality,away.coach.personality],userSide:[home.id,away.id].indexOf(w.settings.userTeam),...(partial?{initialLineups:partial.lineups,initialTactics:partial.tactics,...(partial.gamePlans?{initialGamePlans:partial.gamePlans}:{}),completedGames:partial.games}:{}),seed:matchSeed(w,m.id),conditions:SEASON_CONDITIONS,lineups:[home.lineup,away.lineup],tactics:[teamTactic(w,home),teamTactic(w,away)],...(GAME_PLAN_ENGINES.includes(w.teamEngine)?{gamePlans:[teamGamePlan(w,home),teamGamePlan(w,away)]}:{})};}
// Match squads. With contracts, each fighter's fit with his team's style moves his strength, speed, durability and
// magic (CONTRACT.fit) for the game.
export const squads=(w,match)=>seriesGameOptions(match,match.completedGames??[]).lineups.map((ids,side)=>{const team=w.contractsVersion?teamById(w,[match.home,match.away][side]):null;return ids.map(id=>{const f=w.fighters[id],shift=team?fit(w,f,team):0,summary=shift?{...f.summary,stats:fitStats(f.summary.stats,shift)}:f.summary;return {id:f.id,name:f.name,teamKit:['team-2.2','team-2.3','team-3-core','team-3'].includes(match.engineVersion)?f.teamKit??f.legacyTeamKit:null,traits:f.traits,summary};});});
const ENVIRONMENT={time:['dawn','day','dusk','night'],weather:['clear','rain','frost','storm'],ground:['stone','water'],map:MAP_IDS};
function validGame(game,lineups,engineVersion){
 const ids=lineups.flat(),count=n=>Number.isInteger(n)&&n>=0&&n<=1e7;
 if(!game||game.combatVersion!==engineVersion||![0,1].includes(game.winnerTeam)||!Number.isFinite(game.seconds)||game.seconds<=0||game.seconds>(isObjectiveEngine(engineVersion)?390.5:120.5))return false;
 if(!Array.isArray(game.hp)||game.hp.length!==2||game.hp.some(h=>!Number.isInteger(h)||h<0||h>100))return false;
 if(!game.environment||Object.entries(ENVIRONMENT).some(([k,v])=>!v.includes(game.environment[k])))return false;
 if(!Array.isArray(game.fighters)||game.fighters.length!==ids.length||game.fighters.some((f,i)=>f?.id!==ids[i]||!count(f.damage)||!count(f.healing)||!count(f.kills)||!count(f.deaths)||!(f.ccSeconds>=0&&Number.isFinite(f.ccSeconds)&&f.ccSeconds<=game.seconds*2+1)))return false;
 if(isObjectiveEngine(engineVersion)){
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
// Season stats (w.stats) and the current stage's (w.stageStats, which picks split and event MVPs).
function addStats(w,games,lineups){w.stageStats??={};for(const game of games){const winners=new Set(lineups[game.winnerTeam]);for(const f of game.fighters)for(const book of [w.stats,w.stageStats]){const s=book[f.id]??={games:0,wins:0,damage:0,healing:0,kills:0,deaths:0,ccSeconds:0};s.games++;if(winners.has(f.id))s.wins++;s.damage+=f.damage;s.healing+=f.healing;s.kills+=f.kills;s.deaths+=f.deaths;s.ccSeconds=Math.round((s.ccSeconds+f.ccSeconds)*10)/10;if(game.objective)for(const key of ['objectiveDamage','downSeconds','monsterLastHits'])s[key]=(s[key]??0)+(f[key]??0);}}}
// Records one simulated match: any playable match, with a complete, valid series.
export function recordMatch(w,matchId,games){
 const m=upcoming(w).find(x=>x.id===matchId);
 if(!m)throw new Error('That is not a playable team-league match.');
 const need=Math.ceil(m.bestOf/2);if(!Array.isArray(games)||!games.length||games.length>m.bestOf)throw new Error('Invalid team-league series.');
 const partial=w.pendingSeries?.matchId===matchId?w.pendingSeries:null;
 if(w.pendingSeries&&!partial)throw new Error('Finish the paused series first.');
 if(partial&&JSON.stringify(games.slice(0,partial.games.length))!==JSON.stringify(partial.games))throw new Error('Completed series games cannot be changed.');
 const score=[0,0],accepted=[];games.forEach((g,i)=>{if(score[0]>=need||score[1]>=need)throw new Error('The series was already decided.');const plan=validateSeriesGame(w,m,g,accepted);accepted.push({...g,...plan});score[g.winnerTeam]++;});
 if(Math.max(...score)!==need)throw new Error('The series is not complete.');
 const winner=score[0]>score[1]?m.home:m.away;if(m.balance){w.balance??=neutralBalance();w.balance.seasonSamples??=structuredClone(w.balance.samples);w.balance.sampleGames??=w.balance.samples.length;w.balance.seasonSampleGames??=w.balance.seasonSamples.length;for(const g of accepted){const observations=balanceObservations(g.lineups.map(ids=>lineupEvidence(w,ids)),g.winnerTeam);if(w.balance.rulesVersion>=2){addBalanceObservations(w.balance.samples,observations);addBalanceObservations(w.balance.seasonSamples,observations);}else{w.balance.samples.push(observations);w.balance.seasonSamples.push(structuredClone(observations));}w.balance.sampleGames++;w.balance.seasonSampleGames++;}}for(const g of accepted)addStats(w,[g],g.lineups);delete w.pendingSeries;
 const countsFor=lineups=>lineups.map(ids=>{const c=lineupCounts(w,ids);return ROLE_KEYS.map(r=>c[r]);}),match=w.year.matches[matchId];
 // Each game is kept as [winning side, home HP, away HP, seconds] (the cores' health in Core siege), with both
 // starting compositions for the meta and the balance log.
 match.games=accepted.map(g=>[g.winnerTeam,...(g.objective?g.objective.coreHp:g.hp).map(Math.round),Math.round(g.seconds)]);match.comps=accepted.map(g=>countsFor(g.lineups));match.winner=winner;match.engineVersion=m.engineVersion;
 progress(w);
 return {id:m.id,winner,score};
}
function validateSeriesGame(w,m,g,previous){
 const plan=seriesGameOptions(m,previous),lineups=g.lineups??plan.lineups,tactics=g.tactics??plan.tactics,gamePlans=plan.gamePlans?g.gamePlans??plan.gamePlans:null;
 if(!Array.isArray(lineups)||lineups.length!==2||!Array.isArray(tactics)||tactics.length!==2)throw new Error('Invalid game lineup or tactic.');
 for(const side of [0,1]){const team=teamById(w,side?m.away:m.home),ids=lineups[side];
  if(!Array.isArray(ids)||ids.length!==w.format||new Set(ids).size!==ids.length||ids.some(id=>!team.roster.includes(id))||side!==m.userSide&&JSON.stringify(ids)!==JSON.stringify(plan.lineups[side]))throw new Error('Choose starters from the coached team roster only.');
  if(!SERIES_TACTICS.includes(tactics[side])||side!==m.userSide&&tactics[side]!==plan.tactics[side])throw new Error('The AI coach tactic must follow the series plan.');
 }
 if(gamePlans&&(!Array.isArray(gamePlans)||gamePlans.length!==2||gamePlans.some((p,side)=>!validGamePlan(p)||side!==m.userSide&&JSON.stringify(p)!==JSON.stringify(plan.gamePlans[side]))))throw new Error('The game plans must follow the series plan.');
 if(m.balance&&g.balanceId!==m.balance.id)throw new Error('This result used a different league patch.');
 if(!validGame(g,lineups,m.engineVersion))throw new Error('Invalid team-league game result.');
 return {lineups:lineups.map(ids=>[...ids]),tactics:[...tactics],...(gamePlans?{gamePlans:gamePlans.map(p=>({titan:p.titan,style:p.style,siege:p.siege,...(p.camp?{camp:p.camp}:{})}))}:{})};
}
export function recordSeriesGame(w,matchId,game){
 const m=upcoming(w).find(x=>x.id===matchId);if(!m)throw new Error('That is not a playable team-league match.');
 if(w.pendingSeries&&w.pendingSeries.matchId!==matchId)throw new Error('Finish the paused series first.');
 const partial=w.pendingSeries??{matchId,lineups:structuredClone(m.lineups),tactics:[...m.tactics],...(m.gamePlans?{gamePlans:structuredClone(m.gamePlans)}:{}),games:[]},plan=validateSeriesGame(w,m,game,partial.games),games=[...partial.games,{...game,...plan}],score=seriesScore(games);
 if(Math.max(...score)===Math.ceil(m.bestOf/2)){recordMatch(w,matchId,games);return {complete:true,score};}
 w.pendingSeries={...partial,games};return {complete:false,score};
}
export function impact(s){return s.damage+s.healing*1.1+s.kills*120+s.ccSeconds*30+(s.objectiveDamage??0)*.4+(s.monsterLastHits??0)*300;}
// Season leaders, optionally one region's (by the fighter's current team).
export function leaders(w,key,limit=5,region=null){return Object.entries(w.stats??{}).filter(([id])=>w.fighters[id]&&(!region||regionOfTeam(w,w.fighters[id].team)===region)).map(([id,s])=>({fighter:w.fighters[id],value:key==='impact'?Math.round(impact(s)):s[key],stats:s})).sort((a,b)=>b.value-a.value||(a.fighter.id<b.fighter.id?-1:1)).slice(0,limit);}

// ---------- Coach mode and the offseason (phase 4) ----------
export const TACTICS=Object.freeze(['balanced','protect-carry','focus-healer','aggressive','defensive']);
export const COACH_TACTICS=Object.freeze({bargain:'balanced',star:'protect-carry',glass:'aggressive',fortress:'defensive',tactician:'focus-healer',balanced:'balanced'});
export const ROOKIES_PER_TEAM=Object.freeze({2:1,3:2,5:3});
export const FREE_AGENT_SEASONS=2;
// ---------- Careers: fighters age, decline from their 7th season and retire after their 10th ----------
// A career season counts every league season since the fighter's debut, on any team. Each offseason that starts a
// 7th or later season costs 6% of strength, speed, durability and magic (IQ stays), and the OVR drops with them.
// After the 10th season the fighter retires; the rookie class grows to replace them.
export const CAREER=Object.freeze({declineFrom:7,retireAfter:10,decline:.06,stats:Object.freeze([0,1,2,4]),founders:6,migrated:8,extendForm:1,extendShare:.5});
export const careerSeason=(w,f)=>w.season-(f.careerStart??w.season)+1;
// A veteran past their 10th season stays one more season if they were this season's MVP, or in top form: impact
// per game at least one standard deviation above their role, over at least half the busiest fighter's games.
export function earnedExtension(w,f,form=seasonPerformance(w)){
 if(careerSeason(w,f)<CAREER.retireAfter)return null;const award=(w.awards??[]).find(a=>a.season===w.season);
 if(award?.mvp===f.id)return 'mvp';
 const p=form.get(f.id);return p&&p.z>=CAREER.extendForm&&p.share>=CAREER.extendShare?'form':null;
}
export const retiringVeterans=w=>{const form=seasonPerformance(w);return Object.values(w.fighters).filter(f=>careerSeason(w,f)>=CAREER.retireAfter&&!earnedExtension(w,f,form));};
// ---------- Lifetime stats and the Hall of Fame ----------
// Trophies count every title by event (Worlds, MSI, First Stand, split titles); `titles` is Worlds titles and `mvps`
// season MVP awards.
const newTrophies=()=>({worlds:0,msi:0,'first-stand':0,split:0});
const newCareer=()=>({seasons:0,games:0,wins:0,damage:0,healing:0,kills:0,deaths:0,cc:0,titles:0,mvps:0,trophies:newTrophies(),teams:[],best:null});
export const lifetimeImpact=c=>c.damage+c.healing*1.1+c.kills*120+c.cc*30;
function addSeason(c,s,season,team){
 if(!s?.games)return;const r={cc:Math.round(s.cc??s.ccSeconds??0)};for(const k of ['games','wins','damage','healing','kills','deaths'])r[k]=Math.round(s[k]??0);
 c.seasons++;for(const k in r)c[k]+=r[k];if(team&&!c.teams.includes(team))c.teams.push(team);
 const per=Math.round(lifetimeImpact(r)/r.games);if(!c.best||per>c.best.impact)c.best={season,impact:per};
}
function addTitle(c,title,id){if(!title.roster?.some(r=>r.id===id))return;const event=title.event??'worlds';c.trophies??=newTrophies();c.trophies[event]=(c.trophies[event]??0)+1;if(event==='worlds')c.titles++;}
function addAward(c,award,id){if(award.mvp===id)c.mvps++;}
// Each offseason adds the season to every fighter's lifetime totals, before the stats reset.
function recordCareers(w){
 const titles=(w.titles??[]).filter(t=>t.season===w.season),awards=(w.awards??[]).filter(a=>a.season===w.season);
 for(const f of Object.values(w.fighters)){f.career??=newCareer();addSeason(f.career,w.stats?.[f.id],w.season,f.team);for(const t of titles)addTitle(f.career,t,f.id);for(const a of awards)addAward(f.career,a,f.id);}
}
// Old saves rebuild lifetime totals from the season log and the title history.
function backfillCareer(w,f){
 const c=newCareer();for(const entry of w.seasonLog??[]){const s=entry.fighters?.find(x=>x.id===f.id);if(s)addSeason(c,s,entry.season,s.team);}
 for(const title of w.titles??[])if(title.season<w.season||w.phase==='offseason')addTitle(c,title,f.id);
 for(const award of w.awards??[])if(award.season<w.season||w.phase==='offseason')addAward(c,award,f.id);
 return c;
}
const HALL_STATS=Object.freeze([['damage','Damage'],['healing','Healing'],['kills','KOs'],['cc','Control seconds'],['impact','Impact']]);
// What each cast role is for: only these numbers (and overall impact) count toward the Hall of Fame and show as
// "Excelled at", so a damage dealer's incidental healing never qualifies them.
export const HALL_ROLE_STATS=Object.freeze({damage:['damage','kills'],bruiser:['damage','kills'],healer:['healing'],tank:['cc','kills'],controller:['cc','damage'],support:['cc','healing']});
// A non-MVP needs a long, winning career (120+ games, 52%+ wins) and a real standout: impact 1.5 SD above their role,
// or one role stat 2 SD above it (about the top 2%).
export const HALL_OF_FAME_LIMIT=200,HALL_MIN_GAMES=120,HALL_MIN_WIN=.52,HALL_PEER_GAMES=20,HALL_STANDOUT=1.5,HALL_SPECIALIST=2,HALL_RULES_VERSION=2;
const roleStat=(role,stat)=>stat==='impact'||(HALL_ROLE_STATS[role]??[]).includes(stat);
const hallWorthy=(e,role)=>e.games>=HALL_MIN_GAMES&&e.wins/e.games>=HALL_MIN_WIN&&e.excelled.some(x=>x.stat==='impact'?x.z>=HALL_STANDOUT:roleStat(role,x.stat)&&x.z>=HALL_SPECIALIST);
const perGame=(c,key)=>(key==='impact'?lifetimeImpact(c):c[key])/c.games;
const careerRole=f=>f.castRole??f.role;
// Role peers: every fighter in the league with 20 or more career games, per cast role.
function careerPeers(w){const peers={};for(const f of Object.values(w.fighters))if(f.career?.games>=HALL_PEER_GAMES)(peers[careerRole(f)]??=[]).push(f.career);return peers;}
export function hallEntry(w,f,peers=careerPeers(w)){
 const c=f.career;if(!c?.games)return null;const role=careerRole(f),group=peers[role]??[];
 const excelled=group.length>=3?HALL_STATS.filter(([key])=>roleStat(role,key)).map(([key,label])=>{const values=group.map(x=>perGame(x,key)),mean=values.reduce((a,b)=>a+b,0)/values.length,sd=Math.sqrt(values.reduce((n,x)=>n+(x-mean)**2,0)/values.length)||1,mine=perGame(c,key),z=(mine-mean)/sd,below=values.filter(v=>v<mine).length;return {stat:key,label,perGame:Math.round(mine*10)/10,z:Math.round(z*100)/100,top:Math.max(1,Math.round((1-below/values.length)*100))};}).filter(x=>x.z>=1).sort((a,b)=>b.z-a.z):[];
 // Season MVPs and Worlds champions with a full career are in; anyone else needs the standout bar.
 const reason=c.mvps>0?'mvp':c.trophies?.worlds>0&&c.games>=HALL_MIN_GAMES?'champion':hallWorthy({games:c.games,wins:c.wins,excelled},role)?'great':null;if(!reason)return null;
 return {id:f.id,name:f.name,class:f.traits.class,subclass:f.traits.subclass,role,tier:f.summary.tier,debut:f.careerStart??null,retired:w.season,careerSeasons:careerSeason(w,f),teams:c.teams.map(id=>teamById(w,id)?.name??id),titles:c.titles,mvps:c.mvps,trophies:{...newTrophies(),...c.trophies},region:f.region??null,best:c.best,
  stats:{games:c.games,wins:c.wins,damage:c.damage,healing:c.healing,kills:c.kills,deaths:c.deaths,cc:Math.round(c.cc)},excelled,reason};
}
function induct(w,retirees,peers){const entries=retirees.map(f=>hallEntry(w,f,peers)).filter(Boolean);if(entries.length)w.hallOfFame=[...entries,...(w.hallOfFame??[])].slice(0,HALL_OF_FAME_LIMIT);return entries;}
const careerRoll=(seed,id,n)=>{let h=(seed^0x51ed270b)>>>0;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return Math.floor(rng(h>>>0)()*n);};
// A founding pool is a mix of ages (career seasons 1–6 in season 1), so the first generation does not retire at once.
const founderStart=(seed,id)=>1-careerRoll(seed,id,CAREER.founders);
// Leagues saved before careers give each fighter the seasons they have played, at most a seeded 1–8, so veterans
// retire over several offseasons instead of all together.
// Halls built under the first, looser rules keep their MVPs and re-check everyone else against today's bar.
export function prepareHallOfFame(w){
 if(!w||w.pendingSeries||w.hallRulesVersion===HALL_RULES_VERSION)return w;
 if(w.hallOfFame)w.hallOfFame=w.hallOfFame.map(e=>({...e,excelled:(e.excelled??[]).filter(x=>roleStat(e.role,x.stat))})).filter(e=>e.reason==='mvp'||e.mvps>0||hallWorthy({games:e.stats.games,wins:e.stats.wins,excelled:e.excelled},e.role));
 w.hallRulesVersion=HALL_RULES_VERSION;return w;
}
export function prepareCareers(w){
 if(!w?.fighters||w.pendingSeries)return w;
 for(const f of Object.values(w.fighters)){f.career??=backfillCareer(w,f);if(f.careerStart!==undefined)continue;const played=Math.max(1,w.season-(f.rookie??1)+1);f.careerStart=w.season-Math.min(played,1+careerRoll(w.seed,f.id,CAREER.migrated))+1;}
 return w;
}
function ageFighters(w,peers){
 const retired=[],declined=[],mode=w.settings.battleMode,form=seasonPerformance(w),leaving=retiringVeterans(w);
 const extended=Object.values(w.fighters).filter(f=>careerSeason(w,f)>=CAREER.retireAfter&&!leaving.includes(f)).map(f=>({id:f.id,name:f.name,team:f.team,seasons:careerSeason(w,f),reason:earnedExtension(w,f,form)}));
 const inducted=induct(w,leaving,peers);
 for(const f of leaving){
  const team=f.team&&teamById(w,f.team);if(team){team.roster=team.roster.filter(id=>id!==f.id);team.lineup=team.lineup.filter(id=>id!==f.id);}
  retired.push({id:f.id,name:f.name,team:f.team,seasons:careerSeason(w,f)});delete w.fighters[f.id];
 }
 for(const f of Object.values(w.fighters)){
  if(careerSeason(w,f)+1<CAREER.declineFrom)continue;
  const before=overall(f,f.role,mode),stats=f.summary.stats.map((v,i)=>CAREER.stats.includes(i)?Math.round(v*(1-CAREER.decline)):v);
  f.summary={...f.summary,stats,total:stats.reduce((a,b)=>a+b,0)};
  const from=f.ovr;f.ovr=Math.max(40,f.ovr-Math.max(1,before-overall(f,f.role,mode)));f.salary=salaryFor(f.ovr);declined.push({id:f.id,from,to:f.ovr});
 }
 return {retired,declined,extended,inducted};
}
export function teamTactic(w,team){return team.tactic??COACH_TACTICS[team.coach.personality]??'balanced';}
function userTeam(w){const team=w.settings.userTeam&&teamById(w,w.settings.userTeam);if(!team)throw new Error('Take control of a team first.');return team;}
// Coach mode: take over any team before the opening auction starts or between seasons; hand it back at any time.
export function claimTeam(w,teamId){
 if(w.pendingSeries)throw new Error('Finish the paused series before changing coaches.');
 if(teamId===null){if(w.phase==='offseason'&&w.offseason.step==='resign')throw new Error('Finish your offseason decisions first.');w.settings.userTeam=null;if(w.market)w.market.offers=[];return w;}
 if(!teamById(w,teamId))throw new Error('Unknown team.');
 if(!(w.phase==='market'&&w.market.round===0||['ready','complete'].includes(w.phase)))throw new Error('Take over a team before free agency starts or between seasons.');
 w.settings.userTeam=teamId;return w;
}
export function setLineup(w,ids){
 const team=userTeam(w),size=FORMATS[w.format].size;if(!['ready','season'].includes(w.phase))throw new Error('Set lineups once the roster is full.');
 if(!Array.isArray(ids)||ids.length!==size||new Set(ids).size!==size||ids.some(id=>!team.roster.includes(id)))throw new Error(`Choose ${size} different fighters from your roster.`);
 team.lineup=[...ids];return w;
}
// Core siege game plan: the coached team's dials, otherwise the coach's personality.
export function teamGamePlan(w,team){return team.gamePlan?{...team.gamePlan}:personalityGamePlan(team.coach.personality);}
export function setGamePlan(w,plan){const team=userTeam(w);if(!validGamePlan(plan))throw new Error('Choose a Titan priority, a style and a siege timing.');team.gamePlan={titan:plan.titan,style:plan.style,siege:plan.siege,...(plan.camp?{camp:plan.camp}:{})};return w;}
export function setTactic(w,tactic){const team=userTeam(w);if(!TACTICS.includes(tactic))throw new Error('Unknown tactic.');team.tactic=tactic;return w;}
// Each region's rookie class: two or three per team (by format) plus one for every veteran from the region about to
// retire, drawn with the region's talent odds.
export function rookiePlan(w){
 const f=FORMATS[w.format],leaving=w.phase==='complete'?retiringVeterans(w):[];
 return REGIONS.flatMap((r,i)=>{const total=regionTeams(w,r.id).length*ROOKIES_PER_TEAM[w.format]+leaving.filter(x=>x.region===r.id).length;return planSlots(mixCounts(f,total),(w.seed^Math.imul(w.season+1,0x7feb352d)^Math.imul(i+1,0x2f6b9a1d))>>>0,r);});
}
// Ratings move with performance: per-game impact compared with others in the same role, plus a small seeded drift.
// Offseason value updates move a fighter at most ±RATING_CHANGE_CAP OVR.
export const RATING_CHANGE_CAP=5;
// This season's form per fighter: impact per game as a z-score within their role, and the share of the busiest
// fighter's games they played (full share at half of it).
export function seasonPerformance(w){
 const byRole={};for(const [id,s]of Object.entries(w.stats??{}))if(s.games&&w.fighters[id]){const f=w.fighters[id];(byRole[f.role]??=[]).push(impact(s)/s.games);}
 const spread=Object.fromEntries(Object.entries(byRole).map(([role,list])=>{const mean=list.reduce((a,b)=>a+b,0)/list.length,sd=Math.sqrt(list.reduce((n,x)=>n+(x-mean)**2,0)/list.length)||1;return [role,{mean,sd}];}));
 const maxGames=Math.max(1,...Object.values(w.stats??{}).map(s=>s.games||0)),out=new Map();
 for(const f of Object.values(w.fighters)){const s=w.stats?.[f.id];if(!s?.games||!spread[f.role])continue;out.set(f.id,{z:(impact(s)/s.games-spread[f.role].mean)/spread[f.role].sd,share:Math.min(1,s.games/(maxGames*.5))});}
 return out;
}
function updateRatings(w){
 const form=seasonPerformance(w),changes=[],maxGames=Math.max(1,...Object.values(w.stats??{}).map(s=>s.games||0));
 for(const f of Object.values(w.fighters)){
  const s=w.stats?.[f.id],drift=Math.floor(rng(matchSeed(w,'drift:'+f.id))()*3)-1,z=form.get(f.id)?.z??0;
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
 const pay=members.reduce((n,m)=>n+wage(m),0);return lineup.reduce((n,m)=>n+m.ovr,0)+Object.entries(rosterTargets(w,team)).reduce((n,[role,want])=>n+Math.min(counts[role],want)*6,0)+members.reduce((n,m)=>n+m.ovr*.15,0)-Math.max(0,pay-capOf(w,team))*4;
}
// Share of a roster each personality is willing to turn over in one offseason.
export const ROSTER_CHURN=Object.freeze({bargain:.375,glass:.25,tactician:.25,balanced:.25,fortress:.125,star:.125});
// AI keep/release: let go of anyone a free agent of the same role could replace for less, and get back under the cap.
// Fighters just re-signed (keep) are never cut for churn, and only last when the payroll is over the cap.
function aiReleases(w,team,keep=new Set()){
 const f=FORMATS[w.format],counts=roleCounts(w,team),free=available(w),released=[];
 const plan=rosterTargets(w,team),keepValue=x=>{const unmet=Object.fromEntries(ROLE_KEYS.map(r=>[r,0]));unmet[x.role]=Math.max(0,plan[x.role]-(counts[x.role]-1));return coachValue(w,team,x,counts,unmet);};
 const replacement=x=>Math.max(-Infinity,...free.filter(y=>y.role===x.role&&y.salary<=x.salary&&!released.includes(y.id)).map(y=>coachValue(w,team,y,counts,{[x.role]:Math.max(0,plan[x.role]-(counts[x.role]-1))})));
 const ranked=team.roster.map(id=>w.fighters[id]).map(x=>({x,surplus:keepValue(x)-replacement(x)})).sort((a,b)=>a.surplus-b.surplus||(a.x.id<b.x.id?-1:1));
 const limit=Math.max(1,Math.round(f.rosterSize*(ROSTER_CHURN[team.coach.personality]??.25)));for(const {x,surplus}of ranked){if(released.length>=limit)break;if(surplus<1.5&&!keep.has(x.id)){released.push(x.id);counts[x.role]--;}}
 let pay=payroll(w,team)-released.reduce((n,id)=>n+wage(w.fighters[id]),0);
 for(const {x}of [...ranked.filter(r=>!keep.has(r.x.id)),...ranked.filter(r=>keep.has(r.x.id))]){if(pay<=capOf(w,team)+1e-9)break;if(released.includes(x.id))continue;released.push(x.id);pay-=wage(x);}
 return released;
}
function release(w,team,ids){for(const id of ids){const f=w.fighters[id];f.lastTeam=team.id;f.team=null;f.contract=null;f.locked=false;f.freeAgentSince=w.season;team.roster=team.roster.filter(x=>x!==id);team.lineup=team.lineup.filter(x=>x!==id);}}
// The season's meta: win rate by starting composition, and for each role whether fielding more of it than the
// opponent won games. Coaches lean towards what worked, each at their own pace (META_ADAPTATION).
// Every game of the season with both starting compositions (role counts, ROLE_KEYS order) and the winning side.
function seasonGames(w){
 const games=[];
 for(const m of Object.values(w.year?.matches??{}))(m.comps??[]).forEach((comps,k)=>games.push({comps,winner:m.games[k][0]}));
 return games;
}
export function seasonMeta(w){
 const games=seasonGames(w),toCounts=a=>Object.fromEntries(ROLE_KEYS.map((r,i)=>[r,a[i]])),byKey=new Map(),more=Object.fromEntries(ROLE_KEYS.map(r=>[r,{wins:0,games:0}])),edge={};
 for(const g of games){
  g.comps.forEach((a,side)=>{const counts=toCounts(a),key=compKey(counts),e=byKey.get(key)??{key,label:compLabel(counts),wins:0,games:0};e.games++;if(g.winner===side)e.wins++;byKey.set(key,e);});
  ROLE_KEYS.forEach((r,i)=>{const d=g.comps[0][i]-g.comps[1][i];if(!d)return;more[r].games++;if(g.winner===(d>0?0:1))more[r].wins++;});
 }
 for(const r of ROLE_KEYS)edge[r]=more[r].games>=4?Math.round((more[r].wins/more[r].games-.5)*1000)/1000:0;
 const top=[...byKey.values()].filter(e=>e.games>=4).map(e=>({...e,pct:Math.round(e.wins/e.games*1000)/10})).sort((a,b)=>b.pct-a.pct||b.games-a.games||(a.key<b.key?-1:1)).slice(0,3);
 const role=ROLE_KEYS.slice().sort((a,b)=>Math.abs(edge[b])-Math.abs(edge[a]))[0];
 return {games:games.length,top,edge,roleRates:ROLE_KEYS.filter(r=>more[r].games).map(r=>({key:'role:'+r,...more[r],rate:more[r].wins/more[r].games})),shift:edge[role]?{role,winPct:Math.round((edge[role]+.5)*1000)/10,games:more[role].games}:null};
}
// Season log: each finished season's teams and rosters, every fighter who played with their results, every game's
// compositions (what balance checks across many seasons read, balanceReport), and the full record of the season:
// every region's split tables, playoffs, points and qualifier, and every international event game by game.
export const SEASON_LOG_LIMIT=20;
const castLabel=f=>f?.traits?.subclass?`${f.traits.class} (${f.traits.subclass})`:f?.traits?.class??'?';
const archiveMatch=m=>({home:m.home,away:m.away,bestOf:m.bestOf,winner:m.winner,games:m.games,label:m.label});
function archiveBracket(y,b){return b?{template:b.template,seeds:b.seeds,matches:Object.fromEntries(Object.entries(b.matches).map(([k,id])=>[k,archiveMatch(y.matches[id])]))}:null;}
function archivePhase(w,y,ev,ph){
 if(ph.format==='groups')return {key:ph.key,format:'groups',groups:ph.groups,rounds:Object.fromEntries(Object.entries(ph.rounds).map(([g,rounds])=>[g,rounds.map(ids=>ids.map(id=>archiveMatch(y.matches[id])))])),tables:Object.fromEntries(Object.keys(ph.groups).map(g=>[g,groupTable(w,ev,g,y)]))};
 if(ph.format==='swiss')return {key:ph.key,format:'swiss',teams:ph.teams,rounds:ph.rounds.map(ids=>ids.map(id=>archiveMatch(y.matches[id])))};
 return {key:ph.key,format:'bracket',...archiveBracket(y,ph)};
}
// How far a team went this season: its Worlds, MSI and First Stand place (1-based) and its Split 3 place.
function finishOf(w,id){
 const y=w.year,placeIn=ev=>{if(!ev?.places)return null;let k=0;for(const g of ev.places){if(g.includes(id))return k+1;k+=g.length;}return null;};
 return {worlds:placeIn(y.events.worlds),msi:placeIn(y.events.msi),firstStand:placeIn(y.events['first-stand']),split3:(y.splits[3]?.places?.[regionOfTeam(w,id)]?.indexOf(id)??-1)+1||null};
}
export function seasonLogEntry(w){
 const y=w.year,records=seasonRecords(w),champion=worldsChampion(w);
 return {season:w.season,format:w.format,battleMode:w.settings.battleMode,engine:w.teamEngine,regionSize:w.settings.regionSize,regionRank:[...w.regionRank],
  teams:w.teams.map(t=>({id:t.id,name:t.name,region:t.region,wins:records.get(t.id)?.wins??0,losses:records.get(t.id)?.losses??0,finish:finishOf(w,t.id),champion:t.id===champion,roster:t.roster.map(id=>`${castLabel(w.fighters[id])} ${w.fighters[id]?.summary?.tier??''}`.trim())})),
  fighters:Object.entries(w.stats??{}).filter(([,s])=>s.games).map(([id,s])=>{const f=w.fighters[id]??{};return {id,team:f.team??null,class:f.traits?.class??null,subclass:f.traits?.subclass??null,race:f.traits?.race??null,tier:f.summary?.tier??null,role:f.castRole??f.role??null,games:s.games,wins:s.wins,damage:Math.round(s.damage),healing:Math.round(s.healing),kills:s.kills,deaths:s.deaths,cc:Math.round(s.ccSeconds)};}),
  games:seasonGames(w).map(g=>[g.comps[0],g.comps[1],g.winner]),
  splits:Object.fromEntries(Object.entries(y.splits).map(([n,s])=>[n,Object.fromEntries(REGION_IDS.map(r=>[r,{table:regionTable(w,r,Number(n)),bracket:archiveBracket(y,s.playoffs[r]),places:s.places[r]??[]}]))])),
  points:{...y.points},qualifiers:Object.fromEntries(Object.entries(y.qualifiers).map(([r,q])=>[r,{need:q.need,direct:q.direct,bracket:archiveBracket(y,q.bracket)}])),worldsSeeds:structuredClone(y.worldsSeeds),
  events:Object.fromEntries(Object.entries(y.events).map(([k,ev])=>[k,{teams:ev.teams,places:ev.places??[],phases:ev.phases.map(ph=>archivePhase(w,y,ev,ph))}]))};
}
// One past season for the archive: its log entry (read live for a season just crowned, which the offseason logs),
// its titles and season MVP, and team names. Seasons past the log keep only their titles.
export function pastSeason(w,season){
 const live=season===w.season&&w.phase==='complete'&&w.year?seasonLogEntry(w):null;
 const entry=live??(w.seasonLog??[]).find(e=>e.season===season)??null,titles=(w.titles??[]).filter(t=>t.season===season),award=(w.awards??[]).find(a=>a.season===season)??null;
 if(!entry&&!titles.length)return null;
 const names=Object.fromEntries(w.teams.map(t=>[t.id,t.name]));for(const t of entry?.teams??[])names[t.id]=t.name;
 const regions=Object.fromEntries(w.teams.map(t=>[t.id,t.region]));for(const t of entry?.teams??[])regions[t.id]=t.region;
 return {season,entry,titles,award,names,regions};
}
// Every season that can be browsed, newest first.
export function pastSeasons(w){return [...new Set([...(w.seasonLog??[]).map(e=>e.season),...(w.titles??[]).map(t=>t.season)])].filter(n=>n<w.season||n===w.season&&['complete','offseason'].includes(w.phase)).sort((a,b)=>b-a);}
// Win rates over the logged seasons, with Wilson 95% intervals: per subclass, class and role (fighter games), per
// starting composition (team games, at least 10), and each season's teams.
function wilson(wins,n){if(!n)return [0,0];const z=1.96,p=wins/n,c=p+z*z/(2*n),m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)),d=1+z*z/n;return [Math.round((c-m)/d*1000)/10,Math.round((c+m)/d*1000)/10];}
export function balanceReport(w){
 const log=w.seasonLog??[],rate=()=>new Map(),add=(m,k,win)=>{const e=m.get(k)??{key:k,games:0,wins:0};e.games++;if(win)e.wins++;m.set(k,e);};
 const subclass=rate(),cls=rate(),role=rate(),comp=rate();
 for(const season of log){
  for(const f of season.fighters){for(const [m,k]of [[subclass,f.subclass?`${f.class} (${f.subclass})`:f.class],[cls,f.class],[role,f.role]]){const e=m.get(k)??{key:k,games:0,wins:0};e.games+=f.games;e.wins+=f.wins;m.set(k,e);}}
  for(const [a,b,winner]of season.games){add(comp,compKey(Object.fromEntries(ROLE_KEYS.map((r,i)=>[r,a[i]]))),winner===0);add(comp,compKey(Object.fromEntries(ROLE_KEYS.map((r,i)=>[r,b[i]]))),winner===1);}
 }
 const rows=(m,min=1)=>[...m.values()].filter(e=>e.games>=min).map(e=>({...e,pct:Math.round(e.wins/e.games*1000)/10,ci:wilson(e.wins,e.games)})).sort((a,b)=>b.pct-a.pct||b.games-a.games||(a.key<b.key?-1:1));
 const worldsPlace=t=>t.finish?.worlds??99;
 return {format:w.format,seasons:log.map(s=>s.season),games:log.reduce((n,s)=>n+s.games.length,0),subclass:rows(subclass),class:rows(cls),role:rows(role),comp:rows(comp,10),
  history:log.map(s=>({season:s.season,battleMode:s.battleMode,teams:[...s.teams].sort((a,b)=>worldsPlace(a)-worldsPlace(b)||b.wins-a.wins||(a.name<b.name?-1:1))}))};
}
// The report as plain text, compact enough to paste into a chat.
export function balanceReportText(w){
 const r=balanceReport(w),span=r.seasons.length?`seasons ${r.seasons[0]}–${r.seasons.at(-1)} (${r.seasons.length})`:'no seasons logged yet';
 const table=(title,list)=>[title,...list.map(e=>`${String(e.key).padEnd(26)} ${String(e.games).padStart(5)}  ${e.pct.toFixed(1).padStart(5)}%  [${e.ci[0].toFixed(1)}–${e.ci[1].toFixed(1)}]`)].join('\n');
 const modes=[...new Set(r.history.map(h=>h.battleMode))].join('/');
 return [`Fateforge balance report · ${r.format}v${r.format} · ${modes||'—'} · ${span} · ${r.games} games`,
  table('Subclasses (fighter games, win %, 95% interval)',r.subclass),table('Classes',r.class),table('Roles',r.role),table('Compositions (team games, at least 10)',r.comp),
  'Seasons (region, W-L over the splits, Worlds place, roster; * Worlds champion)',...r.history.map(h=>`S${h.season} ${h.battleMode}: `+h.teams.map(t=>`${t.champion?'*':''}${t.name} (${regionById(t.region)?.short??t.region}) ${t.wins}-${t.losses}${t.finish?.worlds?' W'+t.finish.worlds:''} [${t.roster.join(', ')}]`).join('; '))].join('\n\n');
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
 const plan=rookiePlan(w);if(!Array.isArray(rookies)||rookies.length!==plan.length)throw new Error(`The rookie class must hold ${plan.length} fighters.`);if(!castFighters(rookies))throw new Error('Rookies come from the team cast.');
 const seen=new Set();rookies.forEach((c,i)=>{if(!c||typeof c.id!=='string'||w.fighters[c.id]||seen.has(c.id)||typeof c.name!=='string'||!c.name.trim()||!c.traits||FIGHTER_KEYS.some(k=>typeof c.traits[k]!=='string'))throw new Error('Invalid rookie.');if(c.summary?.tier!==plan[i].tier)throw new Error('A rookie does not match its planned tier.');seen.add(c.id);});
 const records=seasonRecords(w),history={season:w.season,champion:worldsChampion(w),standings:w.teams.map(t=>({id:t.id,wins:records.get(t.id)?.wins??0,losses:records.get(t.id)?.losses??0}))};
 w.seasonLog=[...(w.seasonLog??[]),seasonLogEntry(w)].slice(-SEASON_LOG_LIMIT);
 const meta=seasonMeta(w);meta.changed=adaptCoaches(w,meta);
 recordCareers(w);
 // Titles older than the log keep their roster only for Worlds; the rest keep champion, runner-up and MVP.
 w.titles=(w.titles??[]).map(t=>t.roster&&t.event!=='worlds'&&t.season<=w.season-SEASON_LOG_LIMIT?(({roster,...rest})=>rest)(t):t);const peers=careerPeers(w);
 const changes=updateRatings(w),protectedIds=new Set((w.awards??[]).map(a=>a.mvp));
 const aging=ageFighters(w,peers);
 for(const f of Object.values(w.fighters)){if(f.team)continue;f.freeAgentSince??=w.season;}
 const retired=Object.values(w.fighters).filter(f=>!f.team&&f.freeAgentSince<=w.season-FREE_AGENT_SEASONS+1&&f.freeAgentSince<w.season&&!protectedIds.has(f.id)).map(f=>f.id);
 const inducted=[...aging.inducted,...induct(w,retired.map(id=>w.fighters[id]),peers)];
 for(const id of retired)delete w.fighters[id];
 // Rookies belong to the region that drafted them and sign only there until their first contract ends.
 rookies.forEach((c,i)=>{w.fighters[c.id]={id:c.id,name:c.name.trim(),traits:{...c.traits},summary:{stats:[...c.summary.stats],total:c.summary.total,tier:c.summary.tier,generationVersion:c.summary.generationVersion??3},...scoutFighter(c,w.settings.battleMode),ratingVersion:CAST_RATING_VERSION,team:null,contract:null,rookie:w.season+1,careerStart:w.season+1,freeAgentSince:w.season,region:plan[i].region,locked:true};w.fighters[c.id].prefs=fighterPrefs(w.seed,w.fighters[c.id]);});
 // The market cap follows the market: the average salary of the best roster-worth of fighters (scaled per region).
 const top=Object.values(w.fighters).sort((a,b)=>b.ovr-a.ovr||a.salary-b.salary).slice(0,w.teams.length*w.settings.rosterSize);w.settings.salaryCap=round1(top.reduce((n,x)=>n+x.salary,0)/w.teams.length);
 // Coaches with dismal seasons are replaced (never the user's team).
 const fired=[];
 for(const team of w.teams){const r=records.get(team.id);if(isUser(w,team.id)||!r||r.wins/(r.wins+r.losses||1)>.25)continue;const random=rng(matchSeed(w,'coach:'+team.id)),style=Object.keys(PERSONALITIES)[Math.floor(random()*6)],coach={name:`${COACH_FIRST[Math.floor(random()*COACH_FIRST.length)]} ${COACH_LAST[Math.floor(random()*COACH_LAST.length)]}`,personality:style,hired:w.season+1,comp:coachComp(style,random,meta.edge)};fired.push({team:team.id,from:team.coach.name,to:coach.name});team.coach=coach;delete team.tactic;}
 w.history=[...(w.history??[]),history].slice(-SEASON_LOG_LIMIT);w.phase='offseason';
 // Contracts that ended this season: AI teams re-sign the fighters they want back who want to stay; everyone else
 // tests free agency. The coached team's expiring fighters wait for the coach.
 const {resigned,departed,expiring}=expireContracts(w);
 const releases={},fresh=new Set(resigned.map(r=>r.id));for(const team of w.teams){if(isUser(w,team.id))continue;const ids=aiReleases(w,team,fresh);release(w,team,ids);if(ids.length)releases[team.id]=ids;}
 // A re-signing the cap undid counts as a release, not a re-signing.
 for(const r of resigned.filter(r=>!w.fighters[r.id].team)){resigned.splice(resigned.indexOf(r),1);departed.push({id:r.id,team:r.team,reason:'released'});}
 w.offseason={season:w.season,meta,step:w.settings.userTeam?'resign':'trades',ratingChanges:changes,retired:retired.length,veterans:aging.retired,declined:aging.declined,extended:aging.extended,inducted:inducted.map(e=>({id:e.id,name:e.name,reason:e.reason})),rookies:rookies.map(c=>c.id),fired,releases,trades:[],resigned,departed,expiring};
 if(!w.settings.userTeam){aiTrades(w);startFreeAgency(w);}
 return w;
}
// Whether a fighter wants to stay with his team: a contender for a ring chaser, a starting spot, a team that plays his
// style, and loyalty, with a little seeded mood.
export function stance(w,f,team,ctx={}){
 const p=f.prefs??fighterPrefs(w.seed,f),strength=(ctx.contenders??contenders(w)).get(team.id)??.5,mood=rng(idSeed(w.seed,`stance:${w.season}:${f.id}`))()-.5;
 const score=winningWish(w,f)*(strength-.5)*APPEAL.winning+p.role*(wouldStart(w,team,f)?APPEAL.start:APPEAL.bench)+APPEAL.fit*fit(w,f,team)+p.loyalty*.5+mood*.6;
 return score>=0?'stay':'market';
}
// A team wants a fighter back when no cheaper free agent in his role is worth as much to its coach.
function wantsBack(w,team,f){
 const counts=roleCounts(w,team),plan=rosterTargets(w,team),unmet=Object.fromEntries(ROLE_KEYS.map(r=>[r,0]));unmet[f.role]=Math.max(0,plan[f.role]-(counts[f.role]-1));
 const keep=coachValue(w,team,f,counts,unmet),best=Math.max(-Infinity,...available(w).filter(y=>y.role===f.role&&y.salary<=f.salary).map(y=>coachValue(w,team,y,counts,unmet)));
 return keep-best>=0;
}
function leave(w,team,f){f.lastTeam=team.id;f.team=null;f.contract=null;f.locked=false;f.freeAgentSince=w.season;team.roster=team.roster.filter(id=>id!==f.id);team.lineup=team.lineup.filter(id=>id!==f.id);}
function renew(w,f,salary,years){const start=w.season+1;f.contract={salary:round1(salary),years,signed:start,until:start+years-1};}
function expireContracts(w){
 const ctx={contenders:contenders(w)},resigned=[],departed=[],expiring=[];
 const ending=Object.values(w.fighters).filter(f=>f.team&&f.contract&&f.contract.until<=w.season).sort((a,b)=>b.ovr-a.ovr||(a.id<b.id?-1:1));
 for(const f of ending){
  // A first contract ending frees a rookie to sign anywhere later.
  f.locked=false;const team=teamById(w,f.team),mind=stance(w,f,team,ctx);
  if(isUser(w,team.id)){expiring.push({id:f.id,stance:mind,ask:{salary:f.salary,years:wantedYears(w,f)}});continue;}
  if(mind==='stay'&&wantsBack(w,team,f)){const years=offerYears(w,team,f);renew(w,f,f.salary,years);resigned.push({id:f.id,team:team.id,salary:f.contract.salary,years});}
  else{departed.push({id:f.id,team:team.id,reason:mind==='stay'?'released':'market'});leave(w,team,f);}
 }
 return {resigned,departed,expiring};
}
// Free agency opens after the trade window; without a coach it plays out at once.
function startFreeAgency(w){w.offseason.step='freeAgency';w.market=newMarket('offseason');if(!w.settings.userTeam)marketRounds(w,Infinity);}
// The coach's offseason decisions: re-sign expiring fighters (each accepts if he wants to stay and the offer meets his
// ask) and release anyone else. Expiring fighters not re-signed leave for free agency.
export function decideOffseason(w,{resign=[],release:ids=[]}={}){
 const team=userTeam(w);if(w.phase!=='offseason'||w.offseason.step!=='resign')throw new Error('Re-signing decisions are not open.');
 const expiring=new Map((w.offseason.expiring??[]).map(e=>[e.id,e]));
 if(!Array.isArray(resign)||resign.some(o=>!o||!expiring.has(o.fighter)||!Number.isFinite(o.salary)||o.salary<=0||o.salary>99||!Number.isInteger(o.years)||o.years<1||o.years>CONTRACT.maxYears)||new Set(resign.map(o=>o.fighter)).size!==resign.length)throw new Error(`Re-sign only your expiring fighters, for 1 to ${CONTRACT.maxYears} seasons.`);
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!team.roster.includes(id)||expiring.has(id)))throw new Error('Release only fighters under contract on your roster.');
 // Decide first and check the cap before anything changes, so a refused plan leaves the league as it was.
 const outcome=[...expiring.values()].map(e=>{const f=w.fighters[e.id],offer=resign.find(o=>o.fighter===e.id);
  return offer&&e.stance==='stay'&&round1(offer.salary)>=round1(f.salary*.95)?{id:f.id,signed:true,salary:round1(offer.salary),years:offer.years}:{id:f.id,signed:false,reason:!offer?'let go':e.stance!=='stay'?'market':'ask'};});
 const after=payroll(w,team)-[...expiring.keys(),...ids].reduce((n,id)=>n+wage(w.fighters[id]),0)+outcome.reduce((n,o)=>n+(o.signed?o.salary:0),0);
 if(after>capOf(w,team)+1e-9)throw new Error('Your payroll would still be over the cap. Release more fighters or re-sign fewer.');
 for(const o of outcome){const f=w.fighters[o.id];
  if(o.signed){renew(w,f,o.salary,o.years);w.offseason.resigned.push({id:f.id,team:team.id,salary:f.contract.salary,years:o.years});}
  else{w.offseason.departed.push({id:f.id,team:team.id,reason:o.reason==='market'?'market':'released'});leave(w,team,f);}}
 release(w,team,ids);if(ids.length)w.offseason.releases[team.id]=ids;w.offseason.resignResults=outcome;aiTrades(w);w.offseason.step='trades';return w;
}
const legalRoster=(w,team,roster)=>roster.reduce((n,id)=>n+wage(w.fighters[id]),0)<=capOf(w,team)+1e-9;
// AI-to-AI trades within a region: one-for-one swaps that improve both teams and keep both under the cap; each team
// trades once.
function aiTrades(w){
 const ai=w.teams.filter(t=>!isUser(w,t.id)),traded=new Set(),limit=Math.floor(ai.length/2);
 for(let n=0;n<limit;n++){
  let best=null;
  // Only bench fighters or surplus roles are on the block, which keeps the search small and the trades sensible.
  const block=new Map(ai.map(t=>{const counts=roleCounts(w,t),starters=new Set(bestLineup(w,t));return [t.id,t.roster.filter(id=>!starters.has(id)||counts[w.fighters[id].role]>rosterTargets(w,t)[w.fighters[id].role])];}));
  for(let i=0;i<ai.length;i++)for(let j=i+1;j<ai.length;j++){const A=ai[i],B=ai[j];if(A.region!==B.region||traded.has(A.id)||traded.has(B.id))continue;const baseA=scoreTeam(w,A),baseB=scoreTeam(w,B);
   for(const x of block.get(A.id))for(const y of block.get(B.id)){if(w.fighters[x].role===w.fighters[y].role)continue;const rA=A.roster.map(id=>id===x?y:id),rB=B.roster.map(id=>id===y?x:id);if(!legalRoster(w,A,rA)||!legalRoster(w,B,rB))continue;const gainA=scoreTeam(w,A,rA)-baseA,gainB=scoreTeam(w,B,rB)-baseB,gain=Math.min(gainA,gainB);if(gain>=2&&(!best||gain>best.gain||gain===best.gain&&`${A.id}${x}`<`${best.A.id}${best.x}`))best={A,B,x,y,gain};}}
  if(!best)break;swap(w,best.A,best.B,[best.x],[best.y]);traded.add(best.A.id);traded.add(best.B.id);w.offseason.trades.push({teams:[best.A.id,best.B.id],sent:[[best.x],[best.y]]});
 }
}
function swap(w,A,B,give,get){A.roster=[...A.roster.filter(id=>!give.includes(id)),...get];B.roster=[...B.roster.filter(id=>!get.includes(id)),...give];for(const id of give)w.fighters[id].team=B.id;for(const id of get)w.fighters[id].team=A.id;A.lineup=A.lineup.filter(id=>A.roster.includes(id));B.lineup=B.lineup.filter(id=>B.roster.includes(id));}
// The user proposes; the AI coach accepts only if its team gets better and both payrolls stay legal.
export function proposeTrade(w,partnerId,give,get){
 const team=userTeam(w),partner=teamById(w,partnerId);if(w.phase!=='offseason'||w.offseason.step!=='trades')throw new Error('The trade window is closed.');
 if(!partner||partner.id===team.id)throw new Error('Choose another team.');if(partner.region!==team.region)throw new Error('Trades stay within your region.');
 if(!Array.isArray(give)||!Array.isArray(get)||!give.length||give.length!==get.length||give.length>2||give.some(id=>!team.roster.includes(id))||get.some(id=>!partner.roster.includes(id))||new Set([...give,...get]).size!==give.length*2)throw new Error('Trade the same number of fighters (one or two) from each roster.');
 const mine=[...team.roster.filter(id=>!give.includes(id)),...get],theirs=[...partner.roster.filter(id=>!get.includes(id)),...give];
 if(!legalRoster(w,team,mine))throw new Error('That trade would put your payroll over the cap.');
 if(!legalRoster(w,partner,theirs))throw new Error(`${partner.coach.name} turns it down: it would break their cap.`);
 const gain=scoreTeam(w,partner,theirs)-scoreTeam(w,partner),style=PERSONALITIES[partner.coach.personality],threshold=style.cost>1.5?2:style.star>.5?0:1;
 if(gain<threshold)throw new Error(`${partner.coach.name} turns it down: it doesn't make the ${partner.name} better.`);
 swap(w,team,partner,give,get);w.offseason.trades.push({teams:[team.id,partner.id],sent:[give,get],user:true});return w;
}
export function closeTrades(w){if(w.phase!=='offseason'||w.offseason.step!=='trades')throw new Error('The trade window is not open.');userTeam(w);startFreeAgency(w);return w;}
function newSeason(w){
 const size=FORMATS[w.format].size;w.lastOffseason=w.offseason;w.offseason=null;w.season++;w.phase='ready';w.year=null;w.calendar=null;w.stageIndex=null;delete w.awaiting;w.stats={};w.stageStats={};
 for(const t of w.teams){const keep=isUser(w,t.id)&&t.lineup.length===size&&t.lineup.every(id=>t.roster.includes(id));if(!keep)t.lineup=bestLineup(w,t);}
}

// Battle rules change only between seasons; startSeason picks the engine from settings.battleMode.
export function setBattleMode(w,mode){if(!['teamfight','core'].includes(mode))throw new Error('Choose Core siege or classic teamfight.');if(mode==='core'&&FORMATS[w.format].size===2)throw new Error('Core siege requires 3v3 or 5v5.');if(w.phase==='season'||w.pendingSeries)throw new Error('Battle rules change between seasons.');w.settings.battleMode=mode;return w;}

function lineupEvidence(w,ids){return lineupGroups(ids.map(id=>w.fighters[id]));}

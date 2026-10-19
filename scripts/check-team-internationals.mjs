// International events and tournament formats: GSL groups, double elimination and the Swiss stage under random
// results, then First Stand, MSI and Worlds inside real circuit seasons (entrants, seeding, formats, points, titles).
import assert from 'node:assert/strict';
import * as E from '../public/team-events.js';
import * as L from '../public/team-league.js';
import {circuit,playStage,runOffseason} from './circuit-fixtures.mjs';

const lab=()=>{const M={};let n=0;return {M,get:id=>M[id],make:(node,home,away)=>{const id='m'+(n++);M[id]={id,home,away,bestOf:node.bestOf,games:[],winner:null};return id;},add:p=>{const id='m'+(n++);M[id]={id,...p,games:[],winner:null};return id;}};};
const rand=seed=>{let s=seed>>>0;return()=>{s=Math.imul(s^s>>>15,2246822507)>>>0;return s/4294967296;};};
const play=(m,r)=>{m.winner=r()<.5?m.home:m.away;m.games=[[m.winner===m.home?0:1,50,0,100]];};
// Brackets under random results: every node is played once, nobody plays after being knocked out, places add up.
for(const [template,n]of [['top4',4],['top6',6],['ladder2',2],['ladder3',3],['ladder4',4],['gsl',4],['double8',8],['knockout8',8],['knockout4',4]])for(let seed=1;seed<=40;seed++){
 const {get,make}=lab(),r=rand(seed),b={template,seeds:Array.from({length:n},(_,i)=>'t'+i),matches:{}};let open=E.openBracket(b,get,make),guard=0;
 while(open.length){for(const id of open)play(get(id),r);open=E.openBracket(b,get,make);assert(++guard<20);}
 assert(E.bracketDone(b,get));assert.equal(Object.keys(b.matches).length,E.TEMPLATES[template].nodes.length);
 const places=E.bracketPlaces(b,get).flat();assert.equal(new Set(places).size,places.length);
 if(!template.startsWith('top'))assert.deepEqual(places.slice().sort(),b.seeds.slice().sort(),`${template}: every entrant is placed`);
 const losses={};for(const id of Object.values(b.matches)){const m=get(id),l=E.loserOf(m);losses[l]=(losses[l]??0)+1;}
 const limit=template==='double8'||template==='gsl'?2:1;assert(Object.values(losses).every(v=>v<=limit),`${template}: knocked-out teams stop playing`);
 if(template==='double8'){const twice=Object.values(losses).filter(v=>v===2).length;assert(twice===6||twice===7,'The six lower-bracket losers (and a lower-bracket grand finalist) go out on their second loss.');assert((losses[places[0]]??0)<=1,'The champion lost at most once.');}
 if(template==='gsl'){const [q1,q2]=places;assert((losses[q1]??0)===0,'The winners\' match winner qualifies unbeaten.');assert((losses[q2]??0)===1);}
}
// The Swiss stage under random results: three wins or three losses, no rematches, Bo3 only for decisive matches.
for(let seed=1;seed<=60;seed++){
 const {get,add}=lab(),r=rand(seed),teams=Array.from({length:16},(_,i)=>'t'+i),region=id=>'r'+(Number(id.slice(1))%6),s={teams,rounds:[]};
 while(!E.swissDone(s,get)){const {rec}=E.swissRecords(s,get),pairs=E.swissPairs(s,get,region,seed);assert(pairs.length);
  for(const p of pairs){const [a,b]=[rec[p.home],rec[p.away]];assert.deepEqual(a,b,'Swiss pairs share a record.');assert.equal(p.bestOf,a[0]===2||a[1]===2?3:1,'Decisive Swiss matches are Bo3.');}
  if(!s.rounds.length)for(const p of pairs){assert(teams.indexOf(p.home)<8&&teams.indexOf(p.away)>=8,'Round 1 pairs the top half with the bottom half.');assert.notEqual(region(p.home),region(p.away),'Round 1 avoids same-region pairs.');}
  s.rounds.push(pairs.map(add));for(const id of s.rounds.at(-1))play(get(id),r);}
 const {rec,met}=E.swissRecords(s,get);assert(s.rounds.length<=5);assert.equal(teams.filter(t=>rec[t][0]===3).length,8);
 for(const t of teams){assert(rec[t][0]===3||rec[t][1]===3);assert.equal(new Set(met[t]).size,met[t].length,'No Swiss rematches.');}
 const ko=E.swissKnockoutSeeds(s,get,region,seed);assert.equal(new Set(ko).size,8);const lossesOf=id=>rec[id][1];
 assert.deepEqual([0,4].map(i=>lossesOf(ko[i])),[0,0],'The 3–0 teams lead each half.');assert.deepEqual([1,5,7].map(i=>lossesOf(ko[i])).sort(),[2,2,2],'The 3–2 teams meet the 3–0 teams and a 3–1 team.');assert.deepEqual([2,3,6].map(i=>lossesOf(ko[i])),[1,1,1]);
}

// Real circuit seasons: season 1 (MSI and Worlds) and season 2 (with First Stand).
const w=circuit({regionSize:6,seed:5150});L.marketRounds(w,1e6);
const stageOf=key=>{while(L.currentStage(w)?.key!==key){if(w.awaiting)L.advance(w);else playStage(w);}};
L.startSeason(w);stageOf('msi');
{const ev=w.year.events.msi,[playin,bracket]=ev.phases,y=w.year;
 assert.equal(ev.teams.length,10);for(const r of L.REGIONS){const mine=ev.teams.filter(id=>L.regionOfTeam(w,id)===r.id),top=y.splits[2].places[r.id].slice(0,2);assert.equal(mine.length,r.msi[0]+r.msi[1]);assert(mine.every(id=>top.includes(id)),'MSI takes each region\'s Split 2 champion and runner-up.');}
 assert.equal(playin.template,'gsl');assert.equal(playin.seeds.length,4);for(const id of playin.seeds){const r=L.regionById(L.regionOfTeam(w,id));assert(r.msi[1]>0,'Only regions with play-in slots play the play-in.');}
 assert.equal(bracket.direct.length,6);assert.equal(bracket.seeds,null,'The bracket waits for the play-in.');
 assert.deepEqual(L.upcoming(w).map(m=>m.bestOf),[3,3],'The play-in opens with two Bo3 matches.');
 playStage(w);assert.equal(bracket.seeds.length,8);assert.deepEqual(bracket.seeds.slice(0,6),bracket.direct);const gsl=E.bracketPlaces(playin,id=>y.matches[id]).flat();assert.deepEqual(bracket.seeds.slice(6),gsl.slice(0,2));
 for(const k of ['u1','u2','u3','u4']){const m=y.matches[bracket.matches[k]];assert.notEqual(L.regionOfTeam(w,m.home),L.regionOfTeam(w,m.away),'Upper round 1 avoids same-region pairs.');assert.equal(m.bestOf,5);}
 assert.equal(ev.places.flat().length,10);const t=w.titles.at(-1);assert.equal(t.event,'msi');assert.equal(t.champion,ev.places[0][0]);assert.equal(y.msiBonus,L.regionOfTeam(w,t.champion));
}
stageOf('worlds');
{const ev=w.year.events.worlds,y=w.year,[swiss,ko]=ev.phases;assert.equal(ev.teams.length,16);
 for(const r of L.REGIONS)assert.equal(ev.teams.filter(id=>L.regionOfTeam(w,id)===r.id).length,r.worlds+(y.msiBonus===r.id?1:0),`${r.name} sends its seeds (plus the MSI bonus).`);
 assert.deepEqual(swiss.teams,ev.teams);assert.equal(swiss.rounds.length,1);assert.equal(L.upcoming(w).length,8);
 const firstSeeds=swiss.teams.slice(0,8);for(const r of L.REGION_IDS){const s1=y.worldsSeeds[r][0];if(L.regionById(r).worlds>=3)assert(firstSeeds.includes(s1),'Top seeds of strong regions are in the top half.');}
 playStage(w);assert.equal(w.phase,'complete');assert.equal(ko.seeds.length,8);assert.equal(Object.keys(ko.matches).length,7);
 const {rec}=E.swissRecords(swiss,id=>y.matches[id]);assert(ko.seeds.every(id=>rec[id][0]===3),'Only Swiss qualifiers reach the knockout stage.');
 assert.equal(ev.places.flat().length,16);assert.equal(L.worldsChampion(w),ev.places[0][0]);const t=w.titles.at(-1);assert.equal(t.event,'worlds');assert.equal(t.runnerUp,ev.places[1][0]);
}
assert(w.regionScores.at(-1).scores[L.regionOfTeam(w,L.worldsChampion(w))]>=24,'The Worlds champion\'s region scores at least the title\'s worth.');
// Season 2: First Stand with the six Split 1 champions in two groups that keep the top two regions apart.
runOffseason(w);while(w.phase==='offseason')L.marketRounds(w,1e6);L.startSeason(w);stageOf('first-stand');
{const ev=w.year.events['first-stand'],[groups,ko]=ev.phases,y=w.year,rank=w.regionRank;
 assert.deepEqual([...ev.teams].sort(),L.REGION_IDS.map(r=>y.splits[1].places[r][0]).sort(),'First Stand takes the six Split 1 champions.');
 const regionsOf=g=>groups.groups[g].map(id=>L.regionOfTeam(w,id));assert(regionsOf('A').includes(rank[0])&&regionsOf('B').includes(rank[1]),'The two top-ranked regions are in different groups.');
 assert(Object.values(groups.rounds).flat(2).every(id=>y.matches[id].bestOf===3),'Group matches are Bo3.');
 const before=structuredClone(y.points);playStage(w);
 const A=L.groupTable(w,ev,'A').map(r=>r.id),B=L.groupTable(w,ev,'B').map(r=>r.id);assert.deepEqual(ko.seeds,[A[0],B[1],B[0],A[1]],'Crossed semifinals: A1 v B2 and B1 v A2.');
 for(const id of Object.values(ko.matches))assert.equal(y.matches[id].bestOf,5);
 const [[champ],[runner]]=ev.places;assert.equal(y.points[champ]-before[champ],20);assert.equal(y.points[runner]-before[runner],10);for(const id of ev.places.slice(2).flat())assert.equal(y.points[id]-before[id],5);
 assert.equal(w.titles.at(-1).event,'first-stand');assert.equal(w.titles.at(-1).champion,champ);
}
console.log('Team internationals passed: GSL groups, double elimination, ladders and knockouts under random results (every node once, nobody plays after elimination, places add up), the Swiss stage (3 wins or 3 losses, no rematches, Bo3 for decisive matches, region-aware first round, 3–0/3–1/3–2 knockout slots), MSI entrants, play-in and seeding, Worlds entrants with the MSI bonus and the Swiss-to-knockout path, the region ranking, and First Stand groups, crossed semifinals, points and title.');

// International events and tournament formats: GSL groups, double elimination and the Swiss stage under random
// results, then First Stand, MSI and Worlds inside real circuit seasons (entrants, seeding, formats, points, titles).
import assert from 'node:assert/strict';
import * as E from '../public/team-events.js';
import * as L from '../public/team-league.js';
import {circuit,playStage,runOffseason,fakeSeries} from './circuit-fixtures.mjs';
// Plays an event until it leaves its current phase.
const playPhase=(w,ev)=>{const at=ev.current;while(ev.current===at&&!w.awaiting)for(const m of L.upcoming(w))L.recordMatch(w,m.id,fakeSeries(w,m));};

const lab=()=>{const M={};let n=0;return {M,get:id=>M[id],make:(node,home,away)=>{const id='m'+(n++);M[id]={id,home,away,bestOf:node.bestOf,games:[],winner:null};return id;},add:p=>{const id='m'+(n++);M[id]={id,...p,games:[],winner:null};return id;}};};
const rand=seed=>{let s=seed>>>0;return()=>{s=Math.imul(s^s>>>15,2246822507)>>>0;return s/4294967296;};};
const play=(m,r)=>{m.winner=r()<.5?m.home:m.away;m.games=[[m.winner===m.home?0:1,50,0,100]];};
// Brackets under random results: every node is played once, nobody plays after being knocked out, places add up.
for(const [template,n]of [['top4',4],['top6',6],['ladder2',2],['ladder3',3],['ladder4',4],['gsl',4],['gsl5',4],['double4',4],['double8',8],['knockout8',8],['knockout4',4]])for(let seed=1;seed<=40;seed++){
 const {get,make}=lab(),r=rand(seed),b={template,seeds:Array.from({length:n},(_,i)=>'t'+i),matches:{}};let open=E.openBracket(b,get,make),guard=0;
 while(open.length){for(const id of open)play(get(id),r);open=E.openBracket(b,get,make);assert(++guard<20);}
 assert(E.bracketDone(b,get));assert.equal(Object.keys(b.matches).length,E.TEMPLATES[template].nodes.length);
 const places=E.bracketPlaces(b,get).flat();assert.equal(new Set(places).size,places.length);
 if(!template.startsWith('top'))assert.deepEqual(places.slice().sort(),b.seeds.slice().sort(),`${template}: every entrant is placed`);
 const losses={};for(const id of Object.values(b.matches)){const m=get(id),l=E.loserOf(m);losses[l]=(losses[l]??0)+1;}
 const limit=/^(double|gsl)/.test(template)?2:1;assert(Object.values(losses).every(v=>v<=limit),`${template}: knocked-out teams stop playing`);
 if(template==='double8'){const twice=Object.values(losses).filter(v=>v===2).length;assert(twice===6||twice===7,'The six lower-bracket losers (and a lower-bracket grand finalist) go out on their second loss.');assert((losses[places[0]]??0)<=1,'The champion lost at most once.');}
 if(template==='double4'){assert.equal(places.length,4);assert((losses[places[0]]??0)<=1,'The play-in winner lost at most once.');assert(Object.values(b.matches).every(id=>get(id).bestOf===5));}
 if(template.startsWith('gsl')){const [q1,q2]=places;assert((losses[q1]??0)===0,'The winners\' match winner qualifies unbeaten.');assert((losses[q2]??0)===1);}
}
// The tiered MSI draw: tier 1 meets tier 4 and tier 2 meets tier 3, tier-1 teams in opposite halves, same-region pairs
// avoided when the draw allows it.
for(let seed=1;seed<=40;seed++){const region=id=>id.split(':')[0],tiers=[['r1:a','r2:a'],['r3:a','r4:a'],['r5:a','r6:a'],['r1:b',seed%2?'r2:b':'r3:b']],seeds=E.tieredDouble8(tiers,region,seed);
 assert.deepEqual(seeds.slice().sort(),tiers.flat().sort());const tierOf=id=>tiers.findIndex(t=>t.includes(id)),pairs=[[0,7],[3,4],[1,6],[2,5]].map(([a,b])=>[seeds[a],seeds[b]]);
 for(const [a,b]of pairs){assert.equal(tierOf(a)+tierOf(b),3,'Tier 1 meets tier 4, tier 2 meets tier 3.');assert.notEqual(region(a),region(b));}assert.deepEqual([tierOf(seeds[0]),tierOf(seeds[1])],[0,0]);}
// The Swiss stage under random results: three wins or three losses, no rematches, Bo3 only for decisive matches.
for(let seed=1;seed<=60;seed++){
 const {get,add}=lab(),r=rand(seed),teams=Array.from({length:16},(_,i)=>'t'+i),region=id=>'r'+(Number(id.slice(1))%6),pooled=seed%2===0,s={teams,rounds:[],...(pooled?{pools:[teams.slice(0,6),teams.slice(6,10),teams.slice(10)]}:{})};
 while(!E.swissDone(s,get)){const {rec}=E.swissRecords(s,get),pairs=E.swissPairs(s,get,region,seed);assert(pairs.length);
  for(const p of pairs){const [a,b]=[rec[p.home],rec[p.away]];assert.deepEqual(a,b,'Swiss pairs share a record.');assert.equal(p.bestOf,a[0]===2||a[1]===2?3:1,'Decisive Swiss matches are Bo3.');}
  if(!s.rounds.length)for(const p of pairs){const [a,b]=[p.home,p.away].map(id=>teams.indexOf(id));
   if(pooled)assert(a<6&&b>=10||a>=6&&a<10&&b>=6&&b<10,'Round 1 draws pool 1 against pool 3 and pool 2 within itself.');else assert(a<8&&b>=8,'Round 1 pairs the top half with the bottom half.');
   assert.notEqual(region(p.home),region(p.away),'Round 1 avoids same-region pairs.');}
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
{const ev=w.year.events.msi,[playin,bracket]=ev.phases,y=w.year,order=L.firstStandOrder(w),bye=order[0];
 assert.deepEqual(order,w.regionRank,'Without a First Stand, the region ranking orders MSI.');
 assert.equal(ev.teams.length,11);for(const r of L.REGIONS){const mine=ev.teams.filter(id=>L.regionOfTeam(w,id)===r.id),top=y.splits[2].places[r.id].slice(0,r.msi);assert.deepEqual(mine.sort(),top.sort(),'MSI takes each region\'s Split 2 champion (and runner-up).');}
 assert.equal(playin.template,'double4');assert.equal(playin.seeds.length,4);assert.deepEqual(bracket.direct,[...order.map(r=>y.splits[2].places[r][0]),y.splits[2].places[bye][1]],'Every Split 2 champion and the top region\'s runner-up skip the play-in.');
 for(const id of playin.seeds)assert.equal(y.splits[2].places[L.regionOfTeam(w,id)][1],id,'The play-in is the other runners-up.');
 assert.equal(bracket.seeds,null,'The bracket waits for the play-in.');assert.deepEqual(L.upcoming(w).map(m=>m.bestOf),[5,5],'The play-in opens with two Bo5 matches.');
 playStage(w);assert.equal(bracket.seeds.length,8);const qualifier=E.bracketPlaces(playin,id=>y.matches[id])[0][0],d=bracket.direct,tiers=[[d[0],d[1]],[d[2],d[3]],[d[4],d[5]],[d[6],qualifier]];
 for(const [a,b]of [[0,7],[3,4],[1,6],[2,5]]){const ta=tiers.findIndex(t=>t.includes(bracket.seeds[a])),tb=tiers.findIndex(t=>t.includes(bracket.seeds[b]));assert.equal(ta+tb,3,'Tier 1 meets tier 4 and tier 2 meets tier 3.');}
 for(const k of ['u1','u2','u3','u4']){const m=y.matches[bracket.matches[k]];assert.notEqual(L.regionOfTeam(w,m.home),L.regionOfTeam(w,m.away),'Upper round 1 avoids same-region pairs.');assert.equal(m.bestOf,5);}
 assert.equal(ev.places.flat().length,11);const t=w.titles.at(-1);assert.equal(t.event,'msi');assert.equal(t.champion,ev.places[0][0]);assert.equal(y.msiChampion,t.champion);
 const home=L.regionOfTeam(w,t.champion);assert.equal(y.msiBonus,L.regionOfTeam(w,ev.places.flat().find(id=>L.regionOfTeam(w,id)!==home)));assert.notEqual(y.msiBonus,home);
}
stageOf('worlds');
{const ev=w.year.events.worlds,y=w.year,[playin,swiss,ko]=ev.phases;assert.equal(ev.teams.length,19);
 for(const r of L.REGIONS){const n=ev.teams.filter(id=>L.regionOfTeam(w,id)===r.id).length;assert.equal(n,L.worldsSlots(w,r.id),`${r.name} sends its seeds.`);assert.equal(n,r.worlds+(L.regionOfTeam(w,y.msiChampion)===r.id?1:0)+(y.msiBonus===r.id?1:0));}
 assert.equal(playin.template,'double4');assert.equal(playin.seeds.length,4);
 for(const id of playin.seeds){const r=L.regionOfTeam(w,id),seeds=y.worldsSeeds[r],n=L.regionById(r).playIn+(y.msiBonus===r?1:0);assert(n>0&&seeds.slice(-n).includes(id),'The play-in is the last seeds of play-in regions and the MSI bonus seed.');}
 assert.equal(swiss.teams,null,'The Swiss stage waits for the play-in.');playPhase(w,ev);
 const qualifier=E.bracketPlaces(playin,id=>y.matches[id])[0][0],[p1,p2,p3]=swiss.pools;assert.deepEqual([p1.length,p2.length,p3.length],[6,4,6]);assert(p3.includes(qualifier));
 assert.deepEqual(p1.sort(),L.REGION_IDS.map(r=>y.worldsSeeds[r][0]).sort(),'Pool 1 is every region\'s first seed.');assert.deepEqual(p2.map(id=>L.regionOfTeam(w,id)).sort(),w.regionRank.slice(0,4).sort(),'Pool 2 is the second seeds of the four best regions.');
 assert.equal(swiss.rounds.length,1);for(const id of swiss.rounds[0]){const m=y.matches[id];assert(p1.includes(m.home)&&p3.includes(m.away)||p2.includes(m.home)&&p2.includes(m.away));assert.notEqual(L.regionOfTeam(w,m.home),L.regionOfTeam(w,m.away));}
 playStage(w);assert.equal(w.phase,'complete');assert.equal(ko.seeds.length,8);assert.equal(Object.keys(ko.matches).length,7);
 const {rec}=E.swissRecords(swiss,id=>y.matches[id]);assert(ko.seeds.every(id=>rec[id][0]===3),'Only Swiss qualifiers reach the knockout stage.');
 assert.equal(ev.places.flat().length,19);assert.equal(new Set(ev.places.flat()).size,19);assert.equal(L.worldsChampion(w),ev.places[0][0]);const t=w.titles.at(-1);assert.equal(t.event,'worlds');assert.equal(t.runnerUp,ev.places[1][0]);
 assert(playin.seeds.filter(id=>id!==qualifier).every(id=>ev.places.at(-1).includes(id)||ev.places.slice(-3).flat().includes(id)),'Play-in losers place last.');
}
assert(w.regionScores.at(-1).scores[L.regionOfTeam(w,L.worldsChampion(w))]>=24,'The Worlds champion\'s region scores at least the title\'s worth.');
// Season 2: First Stand with eight teams in two GSL groups that keep each region's teams apart.
runOffseason(w);while(w.phase==='offseason')L.marketRounds(w,1e6);L.startSeason(w);stageOf('first-stand');
{const ev=w.year.events['first-stand'],[A,B,ko]=ev.phases,y=w.year,rank=w.regionRank,expected=L.REGIONS.flatMap(r=>y.splits[1].places[r.id].slice(0,r.fs));
 assert.deepEqual([...ev.teams].sort(),expected.sort(),'First Stand takes the majors\' Split 1 champions and runners-up and every other Split 1 champion.');assert.equal(ev.teams.length,8);
 for(const g of [A,B]){assert.equal(g.template,'gsl5');assert.equal(new Set(g.seeds.map(id=>L.regionOfTeam(w,id))).size,4,'A group never has two teams from one region.');}
 const majors=rank.filter(r=>L.regionById(r).fs>=2);assert.equal(A.seeds[0],y.splits[1].places[majors[0]][0]);assert.equal(B.seeds[0],y.splits[1].places[majors[1]][0],'Each major\'s champion leads a group, with the other major\'s runner-up.');assert.equal(A.seeds[1],y.splits[1].places[majors[1]][1]);
 assert(L.upcoming(w).every(m=>m.stage==='first-stand'&&m.group==='A'&&m.bestOf===5),'Group A plays first, all Bo5.');
 const before=structuredClone(y.points);playStage(w);const get=id=>y.matches[id],top=b=>E.bracketPlaces(b,get).flat().slice(0,2);
 const [A1,A2]=top(A),[B1,B2]=top(B);assert.deepEqual(ko.seeds,[A1,B2,B1,A2],'Crossed semifinals: A1 v B2 and B1 v A2.');
 for(const id of Object.values(ko.matches))assert.equal(y.matches[id].bestOf,5);
 const [[champ],[runner]]=ev.places;assert.equal(ev.places.flat().length,8);assert.equal(y.points[champ]-before[champ],20);assert.equal(y.points[runner]-before[runner],10);for(const id of ev.places.slice(2).flat())assert.equal(y.points[id]-before[id],5);
 assert.equal(w.titles.at(-1).event,'first-stand');assert.equal(w.titles.at(-1).champion,champ);
 // The First Stand winner's region sends its MSI runner-up straight to the bracket.
 stageOf('msi');const msi=y.events.msi,order=L.firstStandOrder(w);assert.equal(order[0],L.regionOfTeam(w,champ));assert.equal(msi.phases[1].direct[6],y.splits[2].places[order[0]][1]);
}
console.log('Team internationals passed: GSL groups (Bo3 and Bo5), four- and eight-team double elimination, ladders and knockouts under random results (every node once, nobody plays after elimination, places add up), the tiered MSI draw, the Swiss stage (3 wins or 3 losses, no rematches, Bo3 for decisive matches, pooled and region-aware first round, 3–0/3–1/3–2 knockout slots), MSI with 11 teams (champions and the top region\'s runner-up in the bracket, a double-elimination play-in), Worlds with 19 teams (MSI champion seat and bonus seed, the play-in, Swiss pools, the knockout), the region ranking, and First Stand with 8 teams in two Bo5 GSL groups, crossed semifinals, points, title and the MSI bracket bye.');

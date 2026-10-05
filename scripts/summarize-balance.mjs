import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const folder='validation/balance-v10/';
const read=name=>JSON.parse(fs.readFileSync(folder+name+'.json','utf8'));
const datasets=Object.fromEntries(['generation','powers','weapons','styles','history','worlds','careers'].map(name=>[name,read(name)]));
const engineFiles=['combat-v10.js','combat-v10-profile.js','combat-v10-contact.js','combat-v10-environment.js','combat-v10-powers.js','abilities.js','conditions.js'];
const fingerprint=createHash('sha256').update(engineFiles.map(file=>fs.readFileSync('public/'+file,'utf8').replaceAll('\r\n','\n')).join('\n')).digest('hex');
for(const name of ['generation','powers','weapons','styles','history','worlds'])assert.equal(datasets[name].engineFingerprint,fingerprint,'Stale comparison: '+name);
const checks=JSON.parse(fs.readFileSync('validation/checks.json','utf8'));
assert(checks.checks.every(c=>c.passed),'A required check failed');
const worlds=datasets.worlds.worlds;
assert.equal(worlds.length,10);assert(worlds.every(w=>w.seasons.length===30));
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const range=values=>[Math.min(...values),Math.max(...values)];
const population=[1,10,20,30].map(season=>{const rows=worlds.map(w=>w.seasons[season-1]);return {season,...Object.fromEntries(['Aplus','Splus','SS','arcane','twoPowers'].map(key=>[key,{mean:mean(rows.map(r=>r[key])),range:range(rows.map(r=>r[key]))}]))};});
const titles=Object.fromEntries(['melee','arcane','ranged'].map(style=>{const wins=worlds.reduce((n,w)=>n+w.styleTitles[style],0),entrants=worlds.reduce((n,w)=>n+w.styleEntrants[style],0);return [style,{titles:wins,titleShare:wins/300,entrants,entrantShare:entrants/4800,gapPoints:100*(wins/300-entrants/4800)}];}));
const powerRows=new Map();for(const g of datasets.powers.groups){const value=powerRows.get(g.ability)||{fights:0,score:0};value.fights+=g.fights;value.score+=g.score*g.fights;powerRows.set(g.ability,value);}
const powerScores=[...powerRows].map(([ability,r])=>({ability,fights:r.fights,score:r.score/r.fights})).sort((a,b)=>b.score-a.score);
const styles=Object.fromEntries(['arcane vs melee','ranged vs melee','arcane vs ranged'].map(key=>[key,Object.fromEntries(datasets.styles.groups.filter(g=>g.comparison===key).map(g=>[g.variant,g.score]))]));
const final=population.at(-1),generation=datasets.generation.samples;
const summary={
 combatVersion:10,generationVersion:2,engineFingerprint:fingerprint,
 sourceBackupSHA256:'ad1ca42cb21feb2e72657659c8e5c1a76420929b3096c636aca4bcebccb46397',
 approvedProposalItems:99,careerTurnoverEnabled:true,
 checks:{node:checks.node,passed:checks.checks.length,total:checks.checks.length},
 comparisons:{generationRolls:Object.values(generation).reduce((n,g)=>n+g.fighters,0),powerFights:datasets.powers.fights,weaponFights:datasets.weapons.fights,matchedStyleFights:datasets.styles.fights,historicalFights:datasets.history.fights,exactHistoricalReplays:datasets.history.replayMatches},
 freshWorlds:{worlds:10,seasonsEach:30,series:2055*300,games:worlds.reduce((n,w)=>n+w.games,0),population,titles,leagueDraws:{mean:mean(worlds.map(w=>w.leagueDraws)),range:range(worlds.map(w=>w.leagueDraws))},startingSide:{meanOfWorldShares:mean(worlds.map(w=>w.startingSide)),range:range(worlds.map(w=>w.startingSide))},medianSeconds:range(worlds.map(w=>w.medianSeconds)),p90Seconds:range(worlds.map(w=>w.p90Seconds)),careerExits:worlds.reduce((n,w)=>n+w.seasons.reduce((n,s)=>n+s.careerExits,0),0),peakDeferred:Math.max(...worlds.flatMap(w=>w.seasons.map(s=>s.deferred))),maxOverdueSeasons:Math.max(...worlds.flatMap(w=>w.seasons.map(s=>s.oldestDeferred)))},
 syntheticCareers:{runs:datasets.careers.runs,seasonsEach:datasets.careers.seasonsPerRun,peakDeferred:Math.max(...datasets.careers.careerRuns.map(r=>r.peakDeferred)),maxWait:Math.max(...datasets.careers.careerRuns.map(r=>r.maxWait))},
 styles,powerScores,
 flags:[
  {metric:'Comparable-total arcane vs melee',value:styles['arcane vs melee'].v10,band:[.45,.60],withinBand:styles['arcane vs melee'].v10>=.45&&styles['arcane vs melee'].v10<=.60},
  {metric:'Comparable-total ranged vs melee',value:styles['ranged vs melee'].v10,band:[.45,.60],withinBand:styles['ranged vs melee'].v10>=.45&&styles['ranged vs melee'].v10<=.60},
  {metric:'Arcane main-cup title/entrant gap in points',value:titles.arcane.gapPoints,band:[-15,15],withinBand:Math.abs(titles.arcane.gapPoints)<=15},
  {metric:'Season-30 mean A+',value:final.Aplus.mean,band:[.25,.45],withinBand:final.Aplus.mean>=.25&&final.Aplus.mean<=.45},
  {metric:'Season-30 mean S+',value:final.Splus.mean,band:[.10,.25],withinBand:final.Splus.mean>=.10&&final.Splus.mean<=.25},
  {metric:'Mythic SS rolls',value:generation.mythic.SS,band:[.02,.08],withinBand:generation.mythic.SS>=.02&&generation.mythic.SS<=.08},
  {metric:'Mythic exact top primary-trait probability',value:generation.mythic.topPrimary.speed.exactShare,band:[.35,.50],withinBand:generation.mythic.topPrimary.speed.exactShare>=.35&&generation.mythic.topPrimary.speed.exactShare<=.50},
  {metric:'Highest selected power score',value:powerScores[0].score,band:[0,.70],withinBand:powerScores[0].score<=.70}
 ]
};
fs.writeFileSync(folder+'summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({checks:summary.checks,freshWorlds:{seasons:300,games:summary.freshWorlds.games},remainingFlags:summary.flags.filter(f=>!f.withinBand)},null,2));

// Reproducible offline evidence; never reads or writes the live application save.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {availableParallelism} from 'node:os';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {Battle,V11_RULES,combatStyle,tierFor,simulate} from '../public/combat-v11.js';
import {simulate as simulate10} from '../public/combat-v10.js';
import {LEAGUES} from '../public/leagues.js';
import {simulateLeagueSeries} from '../public/league-sim-worker.js';
import {drawAtTimeLimit} from '../public/series.js';
const mode=workerData?.mode??process.argv[2]??'worlds',seedBase=20264005;
const files=['combat-v11.js','combat-v11-profile.js','combat-v11-contact.js','combat-v11-environment.js','combat-v11-powers.js','combat-v1.js','abilities-v11.js','abilities.js','conditions.js'];
const engineFingerprint=createHash('sha256').update(files.map(f=>fs.readFileSync(new URL('../public/'+f,import.meta.url),'utf8').replaceAll('\r\n','\n')).join('\n')).digest('hex');
const oldRules={arcaneSpell:.2,arcaneArmor:.65,arcaneRange:185,pursuitArcane:1.1,phoenixHealth:.45,dreamDamage:1,memoryCounterplay:false,memoryDuration:3,memoryCost:9,metalImpact:false,beastDamage:.35,alternation:false,teleportUseful:false,teleportFast:false,sizeBuff:false,mindUseful:false,mindBuff:false,absorptionUseful:false,spiritArmorUseful:false,portalExit:false,copyUseful:false};
const variants={v10:null,baseline:oldRules,W1:{arcaneSpell:.05},W2:{arcaneArmor:1},W3:{arcaneRange:200},W4:{pursuitArcane:1.15},N1:{phoenixHealth:.30},N2:{dreamDamage:.6},N3:{memoryCounterplay:true},'N3+N4':{memoryCounterplay:true,memoryDuration:1.8,memoryCost:12},N5:{metalImpact:true},N6:{beastDamage:.30},U1:{alternation:true},U2:{teleportUseful:true,teleportFast:true},U3:{sizeBuff:true},U4:{mindUseful:true,mindBuff:true},U5:{absorptionUseful:true},U6:{spiritArmorUseful:true},U7:{portalExit:true},U8:{copyUseful:true},v11:V11_RULES};
function prototype(a,b,seed,options,rules){const battle=new Battle(a,b,seed,options);battle.rules=rules;for(const f of battle.fighters)if(f.weapon.type==='arcane'){f.weapon.range=rules.arcaneRange;f.original.weapon.range=rules.arcaneRange;}while(!battle.done)battle.step(1/60);return battle.result();}
function generator(seed){const context={crypto};vm.createContext(context);for(const [file,name]of [['luck','WHEEL_LUCK'],['data','WHEEL_DATA']])vm.runInContext(fs.readFileSync(new URL('../public/'+file+'.js',import.meta.url),'utf8')+';this.'+file+'='+name,context);const random=LEAGUES.rng(seed);let serial=0;return rarity=>{const roll=context.luck.rollTraits(context.data,n=>Math.floor(random()*n),rarity),stats=[0,0,0,0,0];for(const [slot,name]of Object.entries(roll.traits)){if(/^no (second )?power$/i.test(name))continue;const list=slot==='subrace'?context.data.subrace[roll.traits.race]:slot==='subclass'?context.data.subclass[roll.traits.class]:context.data.base[slot];list.find(o=>o.name===name).stats.forEach((n,i)=>stats[i]+=n);}const clamped=stats.map(n=>Math.max(0,n)),total=clamped.reduce((a,b)=>a+b,0);return {id:`${seed}-${++serial}`,name:`Fighter ${serial}`,traits:roll.traits,summary:{stats:clamped,total,tier:tierFor(total),wheelRarity:roll.wheelRarity,generationVersion:roll.generationVersion}};};}
const describe=roster=>({fighters:roster.length,Aplus:roster.filter(c=>c.summary.total>=1500).length/roster.length,Splus:roster.filter(c=>c.summary.total>=2100).length/roster.length,SS:roster.filter(c=>c.summary.total>=3000).length/roster.length,mean:roster.reduce((n,c)=>n+c.summary.total,0)/roster.length,twoPowers:roster.filter(c=>![c.traits.power,c.traits.power2].some(p=>/^no (second )?power$/i.test(p))).length/roster.length,arcane:roster.filter(c=>combatStyle(c)==='arcane').length/roster.length});
function aggregate(rows,keys){const map=new Map();for(const row of rows){const key=keys.map(k=>row[k]).join('|');let g=map.get(key);if(!g)map.set(key,g={...Object.fromEntries(keys.map(k=>[k,row[k]])),games:0,score:0,draws:0,seconds:0});g.games++;g.score+=row.score;g.draws+=row.draw?1:0;g.seconds+=row.seconds;}return [...map.values()].map(g=>({...g,score:g.score/g.games,draws:g.draws/g.games,seconds:g.seconds/g.games}));}
function output(data){fs.mkdirSync('validation/balance-v11',{recursive:true});fs.writeFileSync('validation/balance-v11/'+mode+'.json',JSON.stringify({combatVersion:11,engineFingerprint,generationVersion:2,careerRulesVersion:2,seed:seedBase,...data},null,2)+'\n');}
if(!isMainThread){
 if(mode==='worlds')for(const index of workerData.indices){
  const seed=seedBase+index*7919,generate=generator(seed);let w=LEAGUES.create('review-v11-world-'+index,Array.from({length:164},()=>generate()),seed,{roundRobin:1,bestOf:1});
  const seasons=[],styles={},titles={},powerTitles={},recruitExits=[],recruits=new Map();let games=0,draws=0,leagueGames=0,firstWins=0,decisive=0,totalSeconds=0;const durations=[];
  for(let season=1;season<=40;season++){
   const characters=new Map(w.roster.map(c=>[c.id,c]));while(LEAGUES.next(w)){
    const m=LEAGUES.next(w),a=characters.get(m.a),b=characters.get(m.b),results=simulateLeagueSeries({match:m,a,b});
    for(const r of results){games++;durations.push(r.seconds);totalSeconds+=r.seconds;if(r.winner){decisive++;firstWins+=r.winner===m.a?1:0;}if(m.phase==='league'){leagueGames++;draws+=r.winner===null?1:0;const ratio=a.summary.total/b.summary.total,sa=combatStyle(a),sb=combatStyle(b);if(ratio>=.8&&ratio<=1.25&&sa!==sb){const priority={arcane:2,ranged:1,melee:0},subject=priority[sa]>priority[sb]?a:b,key=combatStyle(subject)+' vs '+(subject===a?sb:sa);const g=styles[key]??={games:0,wins:0,draws:0};g.games++;g.wins+=r.winner===subject.id?1:0;g.draws+=r.winner===null?1:0;}}}
    LEAGUES.record(w,m.id,results);
   }
   for(const cup of w.cupResults){titles[cup.champion]=(titles[cup.champion]||0)+1;const c=characters.get(cup.champion);for(const p of [c.traits.power,c.traits.power2])if(!/^no (second )?power$/i.test(p))powerTitles[p]=(powerTitles[p]||0)+1;}
   const exits=LEAGUES.movement(w),dawnrise=exits.retired.filter(id=>exits.retirementCauses[id].includes('dawnrise')),career=exits.retired.filter(id=>exits.retirementCauses[id].includes('career'));
   for(const id of exits.retired)if(recruits.has(id)){const r=recruits.get(id),length=season-r.joined+1;recruitExits.push({...r,id,exitSeason:season,seasons:length,causes:exits.retirementCauses[id],highestDivision:r.highestDivision});recruits.delete(id);}
   for(const [id,r]of recruits){const division=w.divisions.findIndex(d=>d.includes(id));r.highestDivision=Math.min(r.highestDivision,division);}
   const recipe=LEAGUES.recruitIntake(w),replacements=recipe.map(generate);seasons.push({season,...describe(w.roster),departures:exits.retired.length,dawnriseExits:dawnrise.length,careerExits:career.length,overlap:dawnrise.filter(id=>career.includes(id)).length,additionalCareerExits:exits.retired.length-3,deferred:exits.deferredCareers.length,oldestDeferred:exits.deferredCareers.length?Math.max(...exits.deferredCareers.map(id=>season-w.careers[id].eligibleSeason)):0,recruitRarities:replacements.map(c=>c.summary.wheelRarity)});
   assert.equal(exits.retired.length,replacements.length);assert.equal(dawnrise.length,3);assert(exits.retired.length>=3&&exits.retired.length<=10);
   w=LEAGUES.rollover(w,replacements).world;LEAGUES.sizes(w);for(const c of replacements)recruits.set(c.id,{joined:w.season,rarity:c.summary.wheelRarity,total:c.summary.total,highestDivision:6});
   if(season%5===0)parentPort.postMessage({progress:`World ${index+1}: season ${season}/40`});
  }
  durations.sort((a,b)=>a-b);parentPort.postMessage({world:{index,seasons,styles,titles,powerTitles,recruitExits,activeRecruits:[...recruits.values()],leagueDraws:draws/leagueGames,startingSide:firstWins/decisive,medianSeconds:durations[Math.floor(durations.length*.5)],p90Seconds:durations[Math.floor(durations.length*.9)],games,meanSeconds:totalSeconds/games}});
 }
 else{
  const rows=[];for(const t of workerData.tasks){const options={headless:true,conditions:t.environment},a=t.reverse?t.b:t.a,b=t.reverse?t.a:t.b;
   const raw=t.variant==='v10'||t.variant==='replay'?simulate10(a,b,t.seed,options):prototype(a,b,t.seed,options,{...oldRules,...variants[t.variant]});const result=drawAtTimeLimit(raw,t.allowDraw??true);
   if(t.variant==='baseline'){const expected=drawAtTimeLimit(simulate10(a,b,t.seed,options),true);assert.deepEqual({...result,combatVersion:10},expected,'Ablation baseline must match frozen v10');}
   rows.push({variant:t.variant,build:t.build,comparison:t.comparison,reverse:t.reverse,score:result.winner===null?.5:result.winner===t.a.id?1:0,draw:result.winner===null,seconds:result.seconds,replayMatches:t.expected?JSON.stringify(result)===JSON.stringify(t.expected):undefined});
  }parentPort.postMessage({rows});
 }
}else{
 const began=performance.now(),tasks=[];
 if(mode==='generation'){
  const samples={};for(const rarity of ['ordinary','common','uncommon','rare','unique','legendary','mythic']){const generate=generator(314159265),count=rarity==='ordinary'?10000:3000,roster=Array.from({length:count},()=>generate(rarity==='ordinary'?undefined:rarity));samples[rarity]={...describe(roster),tiers:roster.reduce((r,c)=>(r[c.summary.tier]=(r[c.summary.tier]||0)+1,r),{})};}output({seconds:(performance.now()-began)/1000,sampleSeed:314159265,samples});console.log('Saved generation evidence.');process.exit(0);
 }
 if(mode==='replay'||mode==='styles'){
  if(!process.argv[3])throw Error('Pass the decoded saved-v10 worlds.json.');const worlds=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).filter(w=>w.phase==='complete'),matches=worlds.flatMap(w=>w.history.map(m=>({w,m})));
  if(mode==='replay')for(let i=0;i<3000;i++){const {w,m}=matches[Math.floor(i*matches.length/3000)],leg=i%m.results.length;tasks.push({variant:'replay',seed:(m.seed+leg*65537)>>>0,environment:m.results[leg].environment,a:w.roster.find(c=>c.id===m.a),b:w.roster.find(c=>c.id===m.b),allowDraw:!!m.allowDraw,expected:m.results[leg]});}
  else{const groups=new Map();for(const {w,m}of matches){if(m.phase!=='league')continue;let a=w.roster.find(c=>c.id===m.a),b=w.roster.find(c=>c.id===m.b);const ratio=a.summary.total/b.summary.total;if(ratio<.8||ratio>1.25||combatStyle(a)===combatStyle(b))continue;const priority={arcane:2,ranged:1,melee:0};if(priority[combatStyle(a)]<priority[combatStyle(b)])[a,b]=[b,a];const key=combatStyle(a)+' vs '+combatStyle(b);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({a,b,seed:m.seed,environment:m.results[0].environment,reverse:m.b===a.id,comparison:key});}for(const list of groups.values())for(let i=0;i<1500;i++){const t=list[Math.floor(i*list.length/1500)];for(const variant of ['v10','v11'])tasks.push({...t,variant});}}
 }
 if(mode==='changes'||mode==='baseline'){
  const powers=['Phoenix rebirth','Dream walking','Memory control','Metal bending','Beast command','Teleportation','Size shifting','Mind reading','Energy absorption','Spirit armor','Portal creation','Power copying','Healing touch','Force fields','Summon spirits','Blood control','Temporal rewind','Future sight','Light manipulation','Chain lightning','Singularity','Regeneration'];
  const fighter=(id,power,power2,weapon)=>({id,name:id,summary:{stats:[300,300,300,300,300],total:1500},traits:{weapon,power,power2,weakness:'None'}});
  for(const power of ['No power',...powers])for(const secondary of ['No second power','Fire control'])for(const weapon of ['Sword','Staff','Longbow'])for(let i=0;i<8;i++)for(const reverse of [false,true]){
   const t={a:fighter('subject',power,secondary,weapon),b:fighter('opponent',powers[i*3%powers.length],i%2?'No second power':'Storm calling',['Sword','Staff','Longbow'][i%3]),seed:seedBase+i*104729,environment:{time:['day','night','dawn','dusk'][i%4],weather:['clear','rain','storm','frost'][Math.floor(i/2)%4],ground:i%2?'stone':'water'},reverse,build:power+' / '+secondary+' / '+weapon};
   for(const variant of mode==='baseline'?['baseline']:Object.keys(variants))tasks.push({...t,variant});
  }
 }
 if(mode==='pairs'){
  const powers=['Fire control','Storm calling','Phoenix rebirth','Dream walking','Memory control','Metal bending','Beast command','Teleportation','Size shifting','Mind reading','Energy absorption','Spirit armor','Portal creation','Power copying','Healing touch','Force fields','Summon spirits','Blood control','Temporal rewind','Future sight','Light manipulation','Chain lightning','Singularity','Regeneration'];
  const fighter=(id,power,power2,weapon)=>({id,name:id,summary:{stats:[300,300,300,300,300],total:1500},traits:{weapon,power,power2,weakness:'None'}});
  for(let a=0;a<powers.length;a++)for(let b=a+1;b<powers.length;b++)for(const weapon of ['Sword','Staff','Longbow'])for(let i=0;i<4;i++)for(const reverse of [false,true])for(const variant of ['v10','U1','v11'])tasks.push({a:fighter('subject',powers[a],powers[b],weapon),b:fighter('opponent','Fire control','Storm calling',['Sword','Staff','Longbow'][i%3]),seed:seedBase+i*104729,environment:{time:i%2?'day':'night',weather:['clear','rain','storm','frost'][i],ground:i%2?'stone':'water'},reverse,build:powers[a]+' / '+powers[b]+' / '+weapon,variant});
 }
 const lanes=Math.min(8,Math.max(1,Number(process.env.FATEFORGED_REVIEW_WORKERS)||Math.floor(availableParallelism()/2))),chunks=Array.from({length:lanes},()=>[]);tasks.forEach((t,i)=>chunks[i%lanes].push(t));const worlds=[],rows=[];
 console.log(`${mode}: ${mode==='worlds'?'10 worlds × 40 seasons':tasks.length+' fights'} · ${lanes} workers`);
 await Promise.all(chunks.map((chunk,i)=>new Promise((resolve,reject)=>{const indices=Array.from({length:10},(_,n)=>n).filter(n=>n%lanes===i),worker=new Worker(new URL(import.meta.url),{workerData:{mode,tasks:chunk,indices}});worker.on('message',data=>{if(data.progress)console.log(data.progress);if(data.world)worlds.push(data.world);if(data.rows)rows.push(...data.rows);});worker.on('error',reject);worker.on('exit',code=>code?reject(Error('Evaluation failed: '+code)):resolve());})));
 if(mode==='worlds')output({seconds:(performance.now()-began)/1000,settings:{roundRobin:1,bestOf:1,conditions:'random'},worlds:worlds.sort((a,b)=>a.index-b.index)});
 else output({seconds:(performance.now()-began)/1000,fights:rows.length,replayMatches:rows.filter(r=>r.replayMatches).length,baselineChecks:rows.filter(r=>r.variant==='baseline').length,groups:aggregate(rows,['changes','baseline','pairs'].includes(mode)?['build','variant']:['comparison','variant'])});
 if(mode==='replay')assert.equal(rows.filter(r=>r.replayMatches).length,rows.length,'Saved v10 replay mismatch');
 console.log('Saved '+mode+' evidence.');
}

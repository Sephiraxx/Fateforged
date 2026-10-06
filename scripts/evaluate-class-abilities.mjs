// Offline deterministic worlds. This script never imports or modifies a user save.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {Battle,tierFor,combatStyle} from '../public/combat-v12.js';
import {CATALOG} from '../public/abilities-v12.js';
import {LEAGUES} from '../public/leagues.js';
import {drawAtTimeLimit,seriesComplete} from '../public/series.js';
const files=['combat-v12.js','combat-v12-base.js','combat-v12-profile.js','combat-v12-contact.js','combat-v12-environment.js','combat-v12-powers.js','abilities-v12.js','class-abilities.js','class-generation.js','luck.js','data.js','combat-v1.js','abilities-v11.js','abilities.js','conditions.js'];
const fingerprint=createHash('sha256').update(files.map(f=>fs.readFileSync('public/'+f,'utf8').replaceAll('\r\n','\n')).join('\n')).digest('hex');
export function generator(seed,version=3){const c={crypto};vm.createContext(c);for(const [file,key]of [['data','WHEEL_DATA'],['luck','WHEEL_LUCK']])vm.runInContext(fs.readFileSync('public/'+file+(version===2?'-v2':'')+'.js','utf8')+';this.'+file+'='+key,c);const rng=LEAGUES.rng(seed);let serial=0;return rarity=>{const roll=c.luck.rollTraits(c.data,n=>Math.floor(rng()*n),rarity),raw=[0,0,0,0,0];for(const [slot,name]of Object.entries(roll.traits)){if(/^no (second )?power$/i.test(name))continue;const rows=slot==='subrace'?c.data.subrace[roll.traits.race]:slot==='subclass'?c.data.subclass[roll.traits.class]:c.data.base[slot];rows.find(o=>o.name===name).stats.forEach((v,i)=>raw[i]+=v);}const stats=raw.map(v=>Math.max(0,v)),total=stats.reduce((n,v)=>n+v,0);return {id:`${seed}-${++serial}`,name:'Fighter '+serial,traits:roll.traits,summary:{stats,total,tier:tierFor(total),wheelRarity:roll.wheelRarity,generationVersion:version,classProfileVersion:version===3?1:undefined,abilityIds:Array.from(roll.abilityIds??[])}};};}
const describe=roster=>({fighters:roster.length,mean:roster.reduce((n,c)=>n+c.summary.total,0)/roster.length,Aplus:roster.filter(c=>c.summary.total>=1500).length/roster.length,Splus:roster.filter(c=>c.summary.total>=2100).length/roster.length,SS:roster.filter(c=>c.summary.total>=3000).length/roster.length});
function output(mode,report){fs.mkdirSync('validation/class-abilities',{recursive:true});fs.writeFileSync('validation/class-abilities/'+mode+'.json',JSON.stringify({combatVersion:12,generationVersion:3,fingerprint,...report},null,2)+'\n');}
if(isMainThread){
 const mode=process.argv[2]??'worlds';
 if(mode==='generation'){
  const samples={};for(const version of [2,3]){const generate=generator(20261203,version),roster=Array.from({length:10000},()=>generate());samples['v'+version]=describe(roster);}
  output(mode,{seed:20261203,samples,delta:Object.fromEntries(['Aplus','Splus','SS','mean'].map(k=>[k,samples.v3[k]-samples.v2[k]]))});console.log(samples);
 }else{
  const began=performance.now(),worlds=[];await Promise.all(Array.from({length:3},(_,index)=>new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{index}});worker.on('message',data=>{if(data.progress)console.log(data.progress);if(data.world)worlds.push(data.world);});worker.on('error',reject);worker.on('exit',code=>code?reject(Error('Evaluation failed: '+code)):resolve());})));
  output('worlds',{seconds:(performance.now()-began)/1000,seasonsPerWorld:40,worlds:worlds.sort((a,b)=>a.index-b.index)});console.log('Saved three full forty-season worlds.');
 }
}else{
 const index=workerData.index,seed=20261203+index*7919,generate=generator(seed),seasons=[],styles={},abilityUses={},classResults={},controlledClassResults={};let w=LEAGUES.create('class-review-'+index,Array.from({length:164},()=>generate()),seed,{roundRobin:1,bestOf:1}),games=0,series=0,draws=0;
 for(let season=1;season<=40;season++){
  const characters=new Map(w.roster.map(c=>[c.id,c]));while(LEAGUES.next(w)){
   const match=LEAGUES.next(w),a=characters.get(match.a),b=characters.get(match.b),results=[],score=[0,0];do{
    const fight=new Battle(a,b,(match.seed+results.length*65537)>>>0,{conditions:match.conditions,headless:true});while(!fight.done)fight.step(1/60);const r=drawAtTimeLimit(fight.result(),!!match.allowDraw);results.push(r);games++;draws+=r.winner===null;if(r.winner)score[r.winner===a.id?0:1]++;
    for(const f of fight.fighters)for(const [id,uses]of Object.entries(f.abilityUseCounts))abilityUses[id]=(abilityUses[id]??0)+uses;
    if(match.phase==='league'){
     for(const c of [a,b]){const g=classResults[c.traits.class]??={games:0,wins:0,draws:0,total:0};g.games++;g.wins+=r.winner===c.id;g.draws+=r.winner===null;g.total+=c.summary.total;}
     const sa=combatStyle(a),sb=combatStyle(b),ratio=a.summary.total/b.summary.total;const comparable=a.summary.wheelRarity===b.summary.wheelRarity&&sa===sb&&a.summary.stats.every((v,i)=>v===0&&b.summary.stats[i]===0||v>0&&b.summary.stats[i]>0&&v/b.summary.stats[i]>=.8&&v/b.summary.stats[i]<=1.25);if(comparable)for(const c of [a,b]){const g=controlledClassResults[c.traits.class]??={games:0,wins:0,draws:0};g.games++;g.wins+=r.winner===c.id;g.draws+=r.winner===null;}if(sa!==sb&&ratio>=.8&&ratio<=1.25){const priority={arcane:2,ranged:1,melee:0},subject=priority[sa]>priority[sb]?a:b,key=combatStyle(subject)+' vs '+(subject===a?sb:sa),g=styles[key]??={games:0,wins:0,draws:0};g.games++;g.wins+=r.winner===subject.id;g.draws+=r.winner===null;}
    }
   }while(!seriesComplete(match,score,results.length,!match.allowDraw));LEAGUES.record(w,match.id,results);series++;
  }
  const exits=LEAGUES.movement(w),recipe=LEAGUES.recruitIntake(w),replacements=recipe.map(generate);assert.equal(exits.retired.length,replacements.length);assert.equal(w.engineVersion,12);assert.equal(w.roster.length,164);seasons.push({season,...describe(w.roster),departures:exits.retired.length,deferred:exits.deferredCareers.length,promotions:exits.moves.filter(m=>m.to<m.from).length,demotions:exits.moves.filter(m=>m.to>m.from).length,families:Object.fromEntries(Object.entries(Object.groupBy(w.roster,c=>CATALOG.profile(c.traits).discipline)).map(([k,v])=>[k,v.length])),divisionTiers:w.divisions.map(ids=>Object.fromEntries(Object.entries(Object.groupBy(ids,id=>characters.get(id).summary.tier)).map(([k,v])=>[k,v.length])))});w=LEAGUES.rollover(w,replacements).world;LEAGUES.sizes(w);if(season%5===0)parentPort.postMessage({progress:`World ${index+1}: ${season}/40 seasons · ${games} games`});
 }
 parentPort.postMessage({world:{index,seasons,styles,abilityUses,classResults,controlledClassResults,games,series,draws}});
}

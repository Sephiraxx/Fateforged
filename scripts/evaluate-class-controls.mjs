// Equal stats, equipment, rarity, mastery and Magic roll; class/subclass toolkit varies.
import fs from 'node:fs';
import vm from 'node:vm';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {Battle} from '../public/combat-v12.js';
import {CATALOG} from '../public/abilities-v12.js';
import {LEAGUES} from '../public/leagues.js';
import {drawAtTimeLimit} from '../public/series.js';
if(isMainThread){
 const rows=[];await Promise.all(['Longsword','Longbow','Staff'].map(weapon=>new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{weapon}});worker.on('message',r=>rows.push(r));worker.on('error',reject);worker.on('exit',n=>n?reject(Error('Controlled comparison failed')):resolve());})));
 const classes={},families={};for(const row of rows)for(const [name,v]of Object.entries(row.classes)){for(const [map,key]of [[classes,name],[families,CATALOG.classes[name].discipline]]){const group=map[key]??={games:0,wins:0,draws:0};for(const field of Object.keys(group))group[field]+=v[field];}}
 const report={fingerprint:JSON.parse(fs.readFileSync('validation/class-abilities/generation.json')).fingerprint,seed:20261203,stats:[225,225,225,225,225],mastery:'Veteran',magicRoll:'Adept',rarities:['common','rare','legendary'],weapons:['Longsword','Longbow','Staff'],opponentsPerClass:55,method:'A complete 55-round, 56-class round-robin schedule, in each rarity/weapon context. Builds are sampled with the real affinity/availability rules and their normal subclass probabilities. Each pair plays the same seed with sides swapped. All five combat stats are fixed; class stat contributions and preferred weapon sampling are deliberately excluded. This measures toolkit differences under controlled equipment, not complete generated-build strength. Classes have 990 games each and repeated paired builds; rankings are descriptive.',games:rows.reduce((n,r)=>n+r.games,0),classes,families,byWeapon:rows.sort((a,b)=>a.weapon.localeCompare(b.weapon))};
 fs.writeFileSync('validation/class-abilities/controls.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({games:report.games,families,leaders:Object.entries(classes).map(([name,v])=>({name,score:100*(v.wins+v.draws*.5)/v.games,...v})).sort((a,b)=>b.score-a.score).slice(0,6)},null,2));
}else{
 const context={crypto};vm.createContext(context);for(const [file,key]of [['data','WHEEL_DATA'],['luck','WHEEL_LUCK']])vm.runInContext(fs.readFileSync('public/'+file+'.js','utf8')+';this.'+file+'='+key,context);
 const D=context.data,L=context.luck,names=D.base.class.map(o=>o.name),rng=LEAGUES.rng(20261203),draw=n=>Math.floor(rng()*n),weapon=workerData.weapon,classes={};let games=0,serial=0;
 function build(name,rarity){const traits={class:name,subclass:L.pick(L.optionsFor(D,{class:name},'subclass',rarity),draw).name,weapon,mastery:'Veteran',magic:'Adept',weakness:'None'};for(const slot of ['power','power2'])traits[slot]=L.pick(L.optionsFor(D,traits,slot,rarity),draw).name;return {id:'control-'+serial++,name,traits,summary:{stats:[225,225,225,225,225],total:1125,generationVersion:3,wheelRarity:rarity}};}
 // The same circle-method schedule used by leagues, extended to the full class field.
 let ring=[...names];const rounds=[];for(let r=0;r<names.length-1;r++){rounds.push(Array.from({length:names.length/2},(_,i)=>[ring[i],ring[names.length-1-i]]));ring=[ring[0],ring.at(-1),...ring.slice(1,-1)];}
 for(const rarity of ['common','rare','legendary'])for(const pairs of rounds)for(const [na,nb]of pairs){const a=build(na,rarity),b=build(nb,rarity),seed=Math.floor(rng()*4294967296);for(const [first,second]of [[a,b],[b,a]]){const battle=new Battle(first,second,seed,{conditions:{time:'random',weather:'random',ground:'random'},headless:true});while(!battle.done)battle.step(1/60);const result=drawAtTimeLimit(battle.result(),true);games++;for(const c of [first,second]){const row=classes[c.name]??={games:0,wins:0,draws:0};row.games++;row.wins+=result.winner===c.id;row.draws+=result.winner===null;}}}
 parentPort.postMessage({weapon,games,classes});
}

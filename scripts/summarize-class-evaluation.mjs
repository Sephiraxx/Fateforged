import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CATALOG} from '../public/abilities-v12.js';
const read=name=>JSON.parse(fs.readFileSync('validation/class-abilities/'+name+'.json'));
const worlds=read('worlds'),generation=read('generation'),controls=read('controls');
const files=['combat-v12.js','combat-v12-base.js','combat-v12-profile.js','combat-v12-contact.js','combat-v12-environment.js','combat-v12-powers.js','abilities-v12.js','class-abilities.js','class-generation.js','luck.js','data.js','combat-v1.js','abilities-v11.js','abilities.js','conditions.js'];
const fingerprint=createHash('sha256').update(files.map(f=>fs.readFileSync('public/'+f,'utf8').replaceAll('\r\n','\n')).join('\n')).digest('hex');
for(const report of [worlds,generation,controls])assert.equal(report.fingerprint,fingerprint,'Evaluation is stale; rerun against the current inputs.');
assert.equal(worlds.worlds.length,3);assert(worlds.worlds.every(w=>w.seasons.length===40));
const styles={},classes={},uses={};
function add(map,key,value){const row=map[key]??=Object.fromEntries(Object.keys(value).map(k=>[k,0]));for(const k of Object.keys(value))row[k]+=value[k];}
const score=v=>100*(v.wins+v.draws*.5)/v.games;
const rank=map=>Object.entries(map).map(([name,v])=>({name,...v,score:score(v),...(v.total===undefined?{}:{meanTotal:v.total/v.games})})).sort((a,b)=>b.score-a.score);
for(const w of worlds.worlds){for(const [k,v]of Object.entries(w.styles))add(styles,k,v);for(const [k,v]of Object.entries(w.classResults))add(classes,k,v);for(const [k,v]of Object.entries(w.abilityUses))uses[k]=(uses[k]??0)+v;}
assert(Object.values(styles).every(v=>score(v)>=45&&score(v)<=60));assert(['Aplus','Splus','SS'].every(k=>generation.delta[k]<=.02));
assert(CATALOG.newOptions.every(o=>uses[CATALOG.definition(o.name).id]>0));assert.equal(controls.games,27720);assert(Object.values(controls.classes).every(v=>v.games===990));
const controlledFamilies=Object.fromEntries(Object.entries(controls.families).map(([k,v])=>[k,{...v,score:score(v)}]));
const byWeapon=controls.byWeapon.map(w=>{const families={};for(const [name,v]of Object.entries(w.classes))add(families,CATALOG.classes[name].discipline,v);return {weapon:w.weapon,families:Object.fromEntries(Object.entries(families).map(([k,v])=>[k,{...v,score:score(v)}]))};});
const report={fingerprint,seconds:worlds.seconds,series:worlds.worlds.reduce((n,w)=>n+w.series,0),games:worlds.worlds.reduce((n,w)=>n+w.games,0),draws:worlds.worlds.reduce((n,w)=>n+w.draws,0),styles:Object.fromEntries(Object.entries(styles).map(([k,v])=>[k,{...v,score:score(v)}])),season40:worlds.worlds.map(w=>w.seasons.at(-1)),generation: generation.samples,rawClassLeaders:rank(classes).slice(0,8),strictNaturalComparableGames:worlds.worlds.reduce((n,w)=>n+Object.values(w.controlledClassResults).reduce((a,v)=>a+v.games,0),0)/2,controlledFamilies,controlledByWeapon:byWeapon,controlledClassLeaders:rank(controls.classes).slice(0,8),controlledClassLowest:rank(controls.classes).slice(-8),newAbilityUses:Object.fromEntries(CATALOG.newOptions.map(o=>[o.name,uses[CATALOG.definition(o.name).id]])),screeningPassed:{styles:true,generationTiers:true},watchItems:['Controlled toolkits favor casters; martial techniques need follow-up measurement/tuning. Equal equipment includes off-theme builds and removes normal class stat contributions.','Cleric leads controlled toolkit score; Alchemist leads raw league score with stronger average stats.','Eligible-career queues remain; retirement rules are unchanged.','Sparse technique/theme pools redirect probability; see affinity.json.']};
fs.writeFileSync('validation/class-abilities/summary.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified final fingerprints and screening targets; saved class-family watch items.');

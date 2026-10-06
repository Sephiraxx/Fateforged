// Calibrates team-league OVR: each sampled fighter plays seeded 3v3 battles inside random role-correct squads,
// and its win share is regressed on the closed-form rating features (team-league.js ratingFeatures).
// Usage: node scripts/evaluate-team-values.mjs [fighters-per-role=40] [games-per-fighter=16]
// Writes validation/team-values.json; copy "model" into RATING_MODEL in public/team-league.js.
import fs from 'node:fs';
import {engine,generation,roles} from './team-fixtures.mjs';
import * as L from '../public/team-league.js';
const perRole=Number(process.argv[2]||40),games=Number(process.argv[3]||16),random=generation.seededRandom(20261006),ROLES=['tank','healer','controller','damage'];
const make=(role,tag)=>generation.roleFighter(WHEEL_DATA,WHEEL_LUCK,{role,tier:generation.poolTier(random),random,id:`${role}-${tag}`});
const reference=Object.fromEntries(ROLES.map(role=>[role,Array.from({length:24},(_,i)=>make(role,'ref'+i))]));
const subjects=ROLES.flatMap(role=>Array.from({length:perRole},(_,i)=>make(role,i)));
const pick=role=>reference[role][Math.floor(random()*reference[role].length)];
const samples=[];const started=performance.now();
for(const [n,fighter]of subjects.entries()){
 const role=roles.teamRole(fighter).role;let wins=0;
 for(let k=0;k<games;k++){
  const comp=role==='controller'?['tank','controller','damage']:['tank','healer','damage'],mine=comp.map(r=>r===role?fighter:pick(r));if(!mine.includes(fighter))mine[2]=fighter;
  const theirs=(random()<.5?['tank','healer','damage']:['tank','controller','damage']).map(pick),swap=k%2===1,result=engine.simulateTeam(swap?[theirs,mine]:[mine,theirs],(n*1000+k)>>>0);
  if((swap?1-result.winnerTeam:result.winnerTeam)===0)wins++;
 }
 samples.push({role,features:L.ratingFeatures(fighter),impact:wins/games});
 if(n%40===39)console.log(`${n+1} / ${subjects.length} fighters · ${Math.round((performance.now()-started)/1000)}s`);
}
// Ridge regression: impact ~ intercept + features + role offsets (tank is the baseline).
const names=['ehp','dps','spell','ability','speed','iq'],columns=['intercept',...names,'healer','controller','damage'];
const row=s=>[1,...names.map(k=>s.features[k]),s.role==='healer'?1:0,s.role==='controller'?1:0,s.role==='damage'?1:0];
const k=columns.length,A=Array.from({length:k},()=>Array(k).fill(0)),b=Array(k).fill(0);
for(const s of samples){const x=row(s);for(let i=0;i<k;i++){b[i]+=x[i]*s.impact;for(let j=0;j<k;j++)A[i][j]+=x[i]*x[j];}}
for(let i=1;i<k;i++)A[i][i]+=samples.length*.002;
for(let i=0;i<k;i++){let p=i;for(let r=i+1;r<k;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let r=0;r<k;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<k;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
const w=b.map((v,i)=>Math.round(v/A[i][i]*1000)/1000),coef=Object.fromEntries(columns.map((c,i)=>[c,w[i]]));
const model={intercept:coef.intercept,ehp:coef.ehp,dps:coef.dps,spell:coef.spell,ability:coef.ability,speed:coef.speed,iq:coef.iq,roles:{tank:0,healer:coef.healer,controller:coef.controller,damage:coef.damage}};
const predict=s=>row(s).reduce((n,x,i)=>n+x*w[i],0),mean=samples.reduce((n,s)=>n+s.impact,0)/samples.length;
const ssTot=samples.reduce((n,s)=>n+(s.impact-mean)**2,0),ssRes=samples.reduce((n,s)=>n+(s.impact-predict(s))**2,0);
const ranked=samples.map(s=>({p:predict(s),impact:s.impact})).sort((a,b)=>a.p-b.p),quarter=Math.floor(ranked.length/4),avg=list=>Math.round(list.reduce((n,x)=>n+x.impact,0)/list.length*1000)/10;
const report={fightersPerRole:perRole,gamesPerFighter:games,samples:samples.length,model,r2:Math.round((1-ssRes/ssTot)*1000)/1000,winShareByPredictedQuartile:[avg(ranked.slice(0,quarter)),avg(ranked.slice(quarter,2*quarter)),avg(ranked.slice(2*quarter,3*quarter)),avg(ranked.slice(3*quarter))]};
fs.writeFileSync('validation/team-values.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,1));

import './class-abilities.js';
import './support-catalog.js';
import {teamRole} from './team-roles.js';
import {balanceRates,balanceEvidence,balanceLabel} from './team-balance.js';
export const AUDIT_RULES=Object.freeze({version:1,pairs:28,maxCandidates:4,preseason:.10,halfway:.015});
export const AUDIT_STATS=['STR','SPD','DUR','IQ','MAG'];
export function auditHash(value){let n=2166136261;for(const ch of JSON.stringify(value))n=Math.imul(n^ch.charCodeAt(0),16777619);return (n>>>0).toString(16);}
export function auditDefinition(f,name){const catalog=(f.summary?.generationVersion??1)>=4?globalThis.CURRENT_CLASS_ABILITIES:globalThis.CLASS_ABILITIES;return catalog.definition(name);}
export function auditFeatures(f){const keys=[...new Set([f.traits.power,f.traits.power2].map(name=>auditDefinition(f,name)?.id).filter(Boolean))].map(id=>'ability:'+id);const total=f.summary.stats.reduce((a,b)=>a+b,0);AUDIT_STATS.forEach((key,i)=>{if(total&&f.summary.stats[i]/total>.24)keys.push('stat:'+key);});return keys;}
export function auditControl(f,key,peer){
 const copy=structuredClone(f),parts=key.split(':');
 if(parts[0]==='ability'){
  const slot=['power','power2'].find(k=>auditDefinition(f,f.traits[k])?.id===parts[1]);if(!slot)return null;
  const original=auditDefinition(f,f.traits[slot]),other=slot==='power'?'power2':'power',catalog=globalThis.CURRENT_CLASS_ABILITIES;
  const candidates=Object.values(catalog.abilities).filter(p=>p.id!==original.id&&p.kind===original.kind&&p.rarity===original.rarity&&p.id!==auditDefinition(f,f.traits[other])?.id&&catalog.compatible(p,f.traits.weapon)&&catalog.bucket(p,f.traits)===catalog.bucket(original,f.traits)&&(!p.group||(f.summary.generationVersion??1)>=4));
  const choice=candidates[peer%candidates.length];if(!choice)return null;copy.traits[slot]=choice.name;
 }else{
  const i=AUDIT_STATS.indexOf(parts[1]);if(!peer||i<0)return null;
  const before=f.summary.stats,total=before.reduce((a,b)=>a+b,0),otherTotal=peer.summary.stats.reduce((a,b)=>a+b,0);
  if(!total||!otherTotal||before[i]/total-peer.summary.stats[i]/otherTotal<.04)return null;
  copy.summary.stats=peer.summary.stats.map(v=>v/otherTotal*total);copy.summary.total=total;
 }
 return teamRole(copy).role===teamRole(f).role?copy:null;
}
export function balanceAuditPlan(w,phase){
 if(!['preseason','halfway'].includes(phase))throw Error('Invalid balance audit phase.');
 const roster=Object.values(w.fighters).filter(f=>f.team).sort((a,b)=>a.id.localeCompare(b.id)),counts={},rates=new Map(balanceRates(w.balance?.samples?.length?w.balance.samples:w.balance?.previousSamples??[]).map(r=>[r.key,r]));
 for(const f of roster)for(const key of auditFeatures(f))counts[key]=(counts[key]??0)+1;
 for(const stat of AUDIT_STATS)counts['stat:'+stat]??=0;
 const candidates=Object.entries(counts).map(([key,count])=>({key,count,priority:Math.abs((rates.get(key)?.rate??.5)-.5)*100+Math.log2(count+1)})).sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key));
 // Reserve a rotating stat slot so the audit can find stat problems even when
 // popular abilities dominate the historical observations.
 const stat=candidates.filter(c=>c.key.startsWith('stat:'))[(w.season-1)%Math.max(1,candidates.filter(c=>c.key.startsWith('stat:')).length)];
 const chosen=candidates.filter(c=>c.key!==stat?.key).slice(0,AUDIT_RULES.maxCandidates-(stat?1:0));if(stat)chosen.push(stat);
 const engine=w.settings.battleMode==='core'?'team-3.2':'team-2.5',profile=w.balance?.profile??{id:'base',multipliers:{}},snapshot={id:w.id,season:w.season,phase,engine,profile,roster:roster.map(f=>[f.id,f.traits,f.summary.stats,f.role]),teams:w.teams.map(t=>[t.id,t.lineup,t.roster,t.tactic,t.coach.personality]),candidates:chosen};
 return {version:AUDIT_RULES.version,token:auditHash(snapshot),season:w.season,phase,engine,profile:structuredClone(profile),pairs:AUDIT_RULES.pairs,candidates:chosen.map(c=>({key:c.key,count:c.count})),seed:parseInt(auditHash([w.seed,w.season,phase]),16)};
}
export function auditLever(key){return key.startsWith('ability:')?key+':cooldown':key;}
function auditPercent(from,to){const n=Math.round((to/from-1)*1000)/10;return (n>0?'+':'')+n+'%';}
export function auditSuggestion(profile,key,wins,pairs,phase){
 const rate=wins/pairs,[lo,hi]=balanceEvidence({games:pairs,rate},2.5);if(pairs<AUDIT_RULES.pairs||rate>=.45&&rate<=.55||lo<=.5&&hi>=.5)return null;
 const lever=auditLever(key),before=profile.multipliers[lever]??1,limit=phase==='preseason'?AUDIT_RULES.preseason:AUDIT_RULES.halfway,direction=(key.startsWith('ability:')?1:-1)*Math.sign(rate-.5),step=direction*Math.min(limit,Math.abs(rate-.5)*.4);
 const bounded=Math.max(.85,Math.min(1.15,before*(1+step))),after=(step<0?Math.ceil((bounded-1e-9)*10000):Math.floor((bounded+1e-9)*10000))/10000;return after===before?null:{lever,from:before,to:after};
}
export function validateBalanceAudit(w,phase,report){
 const plan=balanceAuditPlan(w,phase);if(!report||report.token!==plan.token||report.version!==plan.version||!Array.isArray(report.rows)||report.rows.length!==plan.candidates.length)throw Error('Balance audit is stale or incomplete. Run it again.');
 return report.rows.map((r,i)=>{if(!r||r.key!==plan.candidates[i].key||!['tested','unmatched'].includes(r.status))throw Error('Invalid balance diagnostic.');if(r.status==='unmatched')return {key:r.key,status:r.status};
  if(r.pairs!==plan.pairs||![r.wins,r.validationWins,r.patchedWins].every(n=>Number.isFinite(n)&&n>=0&&n<=r.pairs&&Number.isInteger(n*2))||!Number.isInteger(r.controls)||r.controls<2||r.controls>r.pairs||!Number.isInteger(r.carriers)||r.carriers<2||r.carriers>r.pairs)throw Error('Invalid balance simulation results.');
  return {key:r.key,status:r.status,pairs:r.pairs,wins:r.wins,validationWins:r.validationWins,patchedWins:r.patchedWins,controls:r.controls,carriers:r.carriers};
 });
}
export function applyBalanceAudit(w,phase,report){
 const balance=w.balance;if(!balance?.enabled)return null;const rows=validateBalanceAudit(w,phase,report),profile=structuredClone(balance.profile),changes=[],diagnostics=[];
 for(const r of rows){let status='needs-assessment',note='No suitable matched controls were available.',suggestion=null;
  if(r.status==='tested'){
   suggestion=auditSuggestion(profile,r.key,r.wins,r.pairs,phase);status='stable';note='No confident advantage or disadvantage was found.';
   if(suggestion){const before=Math.abs(r.validationWins/r.pairs-.5),after=Math.abs(r.patchedWins/r.pairs-.5),overshot=(r.validationWins-r.pairs/2)*(r.patchedWins-r.pairs/2)<0&&after>.05,repeated=(r.wins-r.pairs/2)*(r.validationWins-r.pairs/2)>0&&!!auditSuggestion(balance.profile,r.key,r.validationWins,r.pairs,phase);
    if(repeated&&before-after>=1/r.pairs&&!overshot){profile.multipliers[suggestion.lever]=suggestion.to;status='adjusted';note=`${balanceLabel(suggestion.lever)} ${auditPercent(suggestion.from,suggestion.to)} (${Math.round(r.validationWins/r.pairs*100)}% → ${Math.round(r.patchedWins/r.pairs*100)}% in validation simulations)`;changes.push({...suggestion,games:r.pairs*2,winRate:Math.round(r.wins/r.pairs*1000)/10,note});}
    else{status='needs-assessment';note='The proposed adjustment did not clearly improve the matched comparison; no change was applied.';}
   }
  }
  diagnostics.push({...r,status,note});
 }
 // Apply at most one confirmed change so separate diagnostics cannot combine
 // into an untested patch. Other confirmed candidates remain visible.
 changes.sort((a,b)=>Math.abs(b.winRate-50)-Math.abs(a.winRate-50)||a.lever.localeCompare(b.lever));
 const selected=changes.slice(0,1);profile.multipliers={...balance.profile.multipliers};for(const c of selected)profile.multipliers[c.lever]=c.to;
 for(const d of diagnostics)if(d.status==='adjusted'&&!selected.some(c=>c.lever===auditLever(d.key))){d.status='monitor';d.note='Confirmed candidate held for a later checkpoint to avoid stacking untested changes.';}
 const id=`${w.season}.${phase}.${balance.history.length+1}`;profile.id=selected.length?id:balance.profile.id;
 const simulationGames=rows.filter(r=>r.status==='tested').reduce((n,r)=>n+r.pairs*2*(auditSuggestion(balance.profile,r.key,r.wins,r.pairs,phase)?3:1),0);
 const entry={id,season:w.season,phase,changes:selected,profile:structuredClone(profile),diagnostics,simulationGames,token:report.token};
 balance.profile=profile;balance.history.push(entry);balance.samples=[];if(phase==='preseason')balance.preseasonSeason=w.season;else balance.halfwaySeason=w.season;delete balance.pendingAudit;return entry;
}

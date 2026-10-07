import './class-abilities.js';
import './support-catalog.js';
import {teamRole} from './team-roles.js';
import {engineForMode} from './team-engine-versions.js';
import {balanceRates,balanceEvidence,balanceLabel,balanceLever} from './team-balance.js';
export const AUDIT_RULES=Object.freeze({version:3,pairs:28,screenPairs:8,maxCandidates:null,maxBundleAttempts:3,preseason:.10,halfway:.015});
export const AUDIT_STATS=['STR','SPD','DUR','IQ','MAG'];
const auditRoles=['tank','healer','controller','damage'];
const healIds=new Set(['healing','life','regeneration','rewind','secondWind','mendingWave','chainHeal','resurrection']);
const durationIds=new Set(['dream','memory','silence','void','roots','telekinesis','kinetic','sound','metal','time','gravity','singularity','ice','frostTouch','light','soul','cripplingStrike','bramble','shadow','stunBolt','knockUp','disarmShot','tauntShout','hamstring','barrier','guard','parry','lastStand','spiritArmor','mind','size','spirits','beast']);
// Passive/percentage/transformation effects and delayed chain pulses have no
// reliable cast-power scalar. Their cooldown is reviewed; unsupported effects
// remain visible for assessment rather than receiving a fictitious buff.
const cooldownOnly=new Set(['phoenix','copy','reality','teleport','force','absorption','mirror','perfectCounter','future','shape','flight','chainLightning']);
export function auditHash(value){let n=2166136261;for(const ch of JSON.stringify(value))n=Math.imul(n^ch.charCodeAt(0),16777619);return (n>>>0).toString(16);}
export function auditDefinition(f,name){const catalog=(f.summary?.generationVersion??1)>=4?globalThis.CURRENT_CLASS_ABILITIES:globalThis.CLASS_ABILITIES;return catalog.definition(name);}
export function auditBaseKey(key){return key.startsWith('within:')?key.split(':').slice(2).join(':'):key;}
export function auditScope(key){return key.startsWith('within:')?key.split(':')[1]:null;}
export function auditFeatures(f){const keys=[...new Set([f.traits.power,f.traits.power2].map(name=>auditDefinition(f,name)?.id).filter(Boolean))].map(id=>'ability:'+id);const total=f.summary.stats.reduce((a,b)=>a+b,0);AUDIT_STATS.forEach((key,i)=>{if(total&&f.summary.stats[i]/total>.24)keys.push('stat:'+key);});return keys;}
export function auditObservations(f){const features=auditFeatures(f);return [...features,...features.map(k=>'within:'+f.role+':'+k),...['race','subrace','class','subclass','weapon','mastery','magic','weakness'].filter(k=>f.traits[k]).map(k=>'trait:'+k+':'+f.traits[k])];}
export function auditCarries(f,key){const scope=auditScope(key),base=auditBaseKey(key);if(scope&&f.role!==scope)return false;if(base.startsWith('role:'))return f.role===base.split(':')[1];if(base.startsWith('weapon:'))return globalThis.CLASS_ABILITIES.weaponType(f.traits.weapon)===base.split(':')[1];if(base.startsWith('stat:'))return f.summary.stats[AUDIT_STATS.indexOf(base.split(':')[1])]>0;return auditFeatures(f).includes(base);}
export function auditSeasonRates(w,phase){
 const rates=balanceRates(phase==='preseason'?(w.balance?.previousSamples??[]):(w.balance?.samples??[]));
 if(phase==='preseason')for(const row of w.balance?.previousRoleRates??[]){const existing=rates.find(r=>r.key===row.key);if(!existing||existing.games<row.games){if(existing)Object.assign(existing,row);else rates.push({...row});}}
 const shift=phase==='preseason'?w.lastOffseason?.meta?.shift:null;
 if(shift?.games>=30){const key='role:'+shift.role,existing=rates.find(r=>r.key===key);if(!existing||existing.games<shift.games){const wins=Math.round(shift.winPct*shift.games/100),rate={key,games:shift.games,wins,rate:wins/shift.games};if(existing)Object.assign(existing,rate);else rates.push(rate);}}
 return rates;
}
export function auditConcern(rate){if(!rate||rate.games<30)return false;const [lo,hi]=balanceEvidence(rate);return (rate.rate<.45||rate.rate>.55)&&(hi<.5||lo>.5);}
export function auditControl(f,key,peer){
 const copy=structuredClone(f),parts=auditBaseKey(key).split(':');
 if(parts[0]==='ability'){
  const slot=['power','power2'].find(k=>auditDefinition(f,f.traits[k])?.id===parts[1]);if(!slot)return null;
  const original=auditDefinition(f,f.traits[slot]),other=slot==='power'?'power2':'power',catalog=globalThis.CURRENT_CLASS_ABILITIES;
  const candidates=Object.values(catalog.abilities).filter(p=>p.id!==original.id&&p.kind===original.kind&&p.rarity===original.rarity&&p.id!==auditDefinition(f,f.traits[other])?.id&&catalog.compatible(p,f.traits.weapon)&&catalog.bucket(p,f.traits)===catalog.bucket(original,f.traits)&&(!p.group||(f.summary.generationVersion??1)>=4));
  const choice=candidates[peer%candidates.length];if(!choice)return null;copy.traits[slot]=choice.name;
 }else{
  const i=AUDIT_STATS.indexOf(parts[1]);if(i<0)return null;if(typeof peer==='number'){const before=f.summary.stats,total=before.reduce((a,b)=>a+b,0),shift=Math.min(before[i]*.5,total*(.06+(peer%4)*.01)),rest=total-before[i];if(!rest||shift<total*.04)return null;copy.summary.stats=before.map((v,j)=>j===i?v-shift:v+shift*v/rest);return teamRole(copy).role===teamRole(f).role?copy:null;}if(!peer)return null;
  const before=f.summary.stats,total=before.reduce((a,b)=>a+b,0),otherTotal=peer.summary.stats.reduce((a,b)=>a+b,0);
  if(!total||!otherTotal||before[i]/total-peer.summary.stats[i]/otherTotal<.04)return null;
  copy.summary.stats=peer.summary.stats.map(v=>v/otherTotal*total);copy.summary.total=total;
 }
 return teamRole(copy).role===teamRole(f).role?copy:null;
}

export function auditFields(key){const base=auditBaseKey(key);if(!base.startsWith('ability:'))return ['value'];const id=base.split(':')[1],primary=healIds.has(id)?'healing':durationIds.has(id)?'duration':cooldownOnly.has(id)?'cooldown':'potency';return primary==='cooldown'?['cooldown']:[primary,'cooldown'];}
export function auditLever(key,field='cooldown'){const scope=auditScope(key),base=auditBaseKey(key),lever=base.startsWith('role:')?balanceLever(base):base.startsWith('weapon:')?base+':damage':base.startsWith('ability:')?base+':'+field:base;return scope?'role:'+scope+':'+lever:lever;}
export function auditCurrentValue(profile,lever){const base=lever.startsWith('role:')&&['stat','ability'].includes(lever.split(':')[2])?lever.split(':').slice(2).join(':'):lever;return profile.multipliers[lever]??profile.multipliers[base]??1;}
export function balanceAuditPlan(w,phase){
 if(!['preseason','halfway'].includes(phase))throw Error('Invalid balance audit phase.');
 const roster=Object.values(w.fighters).filter(f=>f.team).sort((a,b)=>a.id.localeCompare(b.id)),rates=new Map(auditSeasonRates(w,phase).map(r=>[r.key,r])),keys=new Set(AUDIT_STATS.map(s=>'stat:'+s));
 for(const f of roster){keys.add('role:'+f.role);keys.add('weapon:'+globalThis.CLASS_ABILITIES.weaponType(f.traits.weapon));for(const k of auditFeatures(f))if(k.startsWith('ability:'))keys.add(k);}
 for(const role of auditRoles){const members=roster.filter(f=>f.role===role);for(let n=2;n<=w.format&&n<=members.length;n++)keys.add('role:'+role+':count:'+n);
  const concern=auditConcern(rates.get('role:'+role));for(const key of [...keys])if(key.startsWith('ability:')||key.startsWith('stat:')){const carriers=members.filter(f=>auditCarries(f,key)),within='within:'+role+':'+key;if(carriers.length>=2&&(concern&&(key.startsWith('stat:')||carriers.length/members.length>=.35)||auditConcern(rates.get(within))))keys.add(within);}
 }
 const candidates=[...keys].map(key=>{const carriers=roster.filter(f=>auditCarries(f,key)),base=auditBaseKey(key),scope=auditScope(key),observed=rates.get(key)??null,roles=auditRoles.map(role=>{const members=roster.filter(f=>f.role===role),count=carriers.filter(f=>f.role===role).length;return {role,count,share:members.length?count/members.length:0,observed:rates.get('within:'+role+':'+base)??null};}).filter(r=>r.count),parent=scope?rates.get('role:'+scope)??null:null;
  return {key,count:carriers.length,fields:auditFields(key),observed,roles,parent,method:scope&&auditConcern(parent)?'role-intervention':'feature-comparison',priority:(auditConcern(observed)?100:0)+(auditConcern(parent)?80:0)+Math.abs((observed?.rate??.5)-.5)*Math.sqrt(observed?.games??0)*10+Math.log2(carriers.length+1)};
 }).sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key));
 const traits={};for(const f of roster)for(const key of auditObservations(f).filter(k=>k.startsWith('trait:'))){const row=traits[key]??={key,count:0,observed:rates.get(key)??null};row.count++;}
 const compositions=new Map();for(const t of w.teams){const counts=auditRoles.map(r=>t.lineup.filter(id=>w.fighters[id]?.role===r).length),key=counts.join('-'),row=compositions.get(key)??{key,counts,teams:0};row.teams++;compositions.set(key,row);}
 const census={fighters:roster.length,traits:Object.values(traits),compositions:[...compositions.values()]},engine=engineForMode(w.settings.battleMode),profile=w.balance?.profile??{id:'base',multipliers:{}};
 const snapshot={id:w.id,seed:w.seed,format:w.format,season:w.season,phase,engine,profile,roster:roster.map(f=>[f.id,f.traits,f.summary.stats,f.summary.tier,f.role,f.ovr]),teams:w.teams.map(t=>[t.id,t.lineup,t.roster,t.tactic,t.coach.personality]),candidates,census};
 return {version:AUDIT_RULES.version,token:auditHash(snapshot),season:w.season,phase,engine,profile:structuredClone(profile),pairs:AUDIT_RULES.pairs,screenPairs:AUDIT_RULES.screenPairs,candidates,census,seed:parseInt(auditHash([w.seed,w.season,phase]),16)};
}
function auditPercent(from,to){const n=Math.round((to/from-1)*1000)/10;return (n>0?'+':'')+n+'%';}
export function auditSuggestion(profile,key,wins,pairs,phase,field='cooldown'){
 const rate=wins/pairs,[lo,hi]=balanceEvidence({games:pairs,rate},2.5);if(pairs<AUDIT_RULES.pairs||rate>=.45&&rate<=.55||lo<=.5&&hi>=.5)return null;
 const lever=auditLever(key,field),before=auditCurrentValue(profile,lever),limit=phase==='preseason'?AUDIT_RULES.preseason:AUDIT_RULES.halfway,direction=(auditBaseKey(key).startsWith('ability:')&&field==='cooldown'?1:-1)*Math.sign(rate-.5),step=direction*Math.min(limit,Math.abs(rate-.5)*.4);
 const bounded=Math.max(.85,Math.min(1.15,before*(1+step))),after=(step<0?Math.ceil((bounded-1e-9)*10000):Math.floor((bounded+1e-9)*10000))/10000;return after===before?null:{lever,from:before,to:after};
}
export function auditCandidateSuggestion(plan,key,wins,field='cooldown'){
 const descriptor=plan.candidates.find(c=>c.key===key),observed=descriptor?.method==='role-intervention'?descriptor.parent:descriptor?.observed,rate=wins/plan.pairs;
 // Conflicting season and controlled evidence is a diagnostic, not a reason
 // to reverse the direction of an already concerning meta.
 if(auditConcern(observed)&&(rate-.5)*(observed.rate-.5)<=0)return null;
 const simulated=auditSuggestion(plan.profile,key,wins,plan.pairs,plan.phase,field);if(simulated)return simulated;
 if(!auditConcern(observed)||rate>=.45&&rate<=.55)return null;
 return auditSuggestion(plan.profile,key,observed.wins,observed.games,plan.phase,field);
}
export function auditCandidateProposals(plan,key,wins){return plan.candidates.find(c=>c.key===key).fields.map(field=>({field,suggestion:auditCandidateSuggestion(plan,key,wins,field)})).filter(p=>p.suggestion);}
function auditValidateComparison(r,pairs){
 if(r.pairs!==pairs||![r.wins,r.patchedWins].every(n=>Number.isFinite(n)&&n>=0&&n<=pairs&&Number.isInteger(n*2))||![r.validationMargin,r.patchedMargin].every(n=>Number.isFinite(n)&&Math.abs(n)<=1)||!Array.isArray(r.marginDeltas)||r.marginDeltas.length!==pairs||!r.marginDeltas.every(n=>Number.isFinite(n)&&Math.abs(n)<=2))throw Error('Invalid balance simulation/performance results.');
 if(Math.abs(r.marginDeltas.reduce((a,b)=>a+b,0)/pairs-(r.patchedMargin-r.validationMargin))>1e-8)throw Error('Inconsistent balance performance results.');
}
export function validateBalanceAudit(w,phase,report){
 const plan=balanceAuditPlan(w,phase);if(!report||report.token!==plan.token||report.version!==plan.version||!Array.isArray(report.rows)||report.rows.length!==plan.candidates.length)throw Error('Balance audit is stale or incomplete. Run it again.');
 return report.rows.map((r,i)=>{
  if(!r||r.key!==plan.candidates[i].key||!['tested','screened','limited','unmatched'].includes(r.status))throw Error('Invalid balance diagnostic.');if(r.status==='unmatched')return {key:r.key,status:r.status};
  const pairs=r.status==='tested'?plan.pairs:Math.min(plan.pairs,plan.screenPairs);
  if(r.pairs!==pairs||!Number.isFinite(r.wins)||r.wins<0||r.wins>pairs||!Number.isInteger(r.wins*2)||!Number.isInteger(r.controls)||r.controls<1||r.controls>pairs||!Number.isInteger(r.carriers)||r.carriers<1||r.carriers>pairs||r.status!=='limited'&&(r.controls<2||r.carriers<2))throw Error('Invalid balance simulation results.');
  if(r.status!=='tested')return {...r,feedback:[]};
  const proposals=auditCandidateProposals(plan,r.key,r.wins);if(!Number.isFinite(r.validationWins)||r.validationWins<0||r.validationWins>pairs||!Number.isInteger(r.validationWins*2)||!Array.isArray(r.feedback)||r.feedback.length!==proposals.length)throw Error('Invalid balance validation results.');
  r.feedback.forEach((f,j)=>{if(f.field!==proposals[j].field||f.wins!==r.validationWins)throw Error('Invalid balance field comparison.');auditValidateComparison(f,pairs);});return structuredClone(r);
 });
}
export function auditResponse(r,direction){
 const deltas=r.marginDeltas.map(d=>d*direction),mean=deltas.reduce((a,b)=>a+b,0)/r.pairs,se=Math.sqrt(deltas.reduce((n,d)=>n+(d-mean)**2,0)/(r.pairs-1)/r.pairs),winGain=(r.patchedWins-r.wins)*direction,overshot=direction>0?r.patchedWins/r.pairs>.55:r.patchedWins/r.pairs<.45;
 return {mean,se,winGain,improved:!overshot&&(winGain>=1||winGain>=0&&mean>=.005&&mean-2.5*se>0),regressed:winGain<=-2&&mean+2.5*se<0};
}
export function balanceAuditProposal(w,phase,report){
 const plan=balanceAuditPlan(w,phase),rows=validateBalanceAudit(w,phase,report),changes=[],diagnostics=[];
 for(const r of rows){const descriptor=plan.candidates.find(c=>c.key===r.key);let status=r.status,note=r.status==='unmatched'?'No suitable matched controls were available.':r.status==='limited'?'Too few distinct carriers or controls to separate this feature from individual fighters.':r.status==='screened'?'Screened against matched controls; no strong signal. This is a screen, not proof of perfect balance.':'No confident advantage or disadvantage was found.',change=null;
  if(r.status==='tested'){
   const direction=-Math.sign(r.wins-r.pairs/2),confirmed=r.feedback.map(f=>{const suggestion=auditCandidateSuggestion(plan,r.key,r.wins,f.field),repeat=auditCandidateSuggestion(plan,r.key,r.validationWins,f.field),response=auditResponse(f,direction);return {f,suggestion,response,valid:repeat&&(r.wins-r.pairs/2)*(r.validationWins-r.pairs/2)>0&&response.improved};}).filter(x=>x.valid).sort((a,b)=>b.response.winGain-a.response.winGain||b.response.mean-a.response.mean||descriptor.fields.indexOf(a.f.field)-descriptor.fields.indexOf(b.f.field));
   if(confirmed.length){const {f,suggestion}=confirmed[0];change={...suggestion,key:r.key,field:f.field,games:r.pairs*2,winRate:Math.round(r.wins/r.pairs*1000)/10,direction,priority:descriptor.priority,note:`${balanceLabel(suggestion.lever)} ${auditPercent(suggestion.from,suggestion.to)} (${Math.round(r.validationWins/r.pairs*100)}% → ${Math.round(f.patchedWins/r.pairs*100)}% in individual validation${r.validationWins===f.patchedWins?'; fights became consistently closer':''})`};changes.push(change);status='confirmed';note='Individually responsive; awaiting combined patch validation.';}
   else if(r.feedback.length){status='needs-assessment';note='The tested adjustments did not repeat or clearly improve the comparison.';}
   else if(auditConcern(descriptor.observed)||descriptor.method==='role-intervention'&&auditConcern(descriptor.parent)){status='needs-assessment';note='Season results remain uneven, but controlled fights did not confirm a responsive adjustment. Matchups or tactics may be involved.';}
   else status='stable';
  }
  diagnostics.push({...r,status,note,roles:descriptor.roles,observed:descriptor.observed,parent:descriptor.parent,method:descriptor.method,change});
 }
 // One field per named ability in each scope; one proposal per effective lever.
 const unique=[],abilityFields=new Map();for(const c of changes.sort((a,b)=>b.priority-a.priority||Math.abs(b.winRate-50)-Math.abs(a.winRate-50)||a.key.localeCompare(b.key))){const base=auditBaseKey(c.key),field=abilityFields.get(base);if(unique.some(x=>x.lever===c.lever)||base.startsWith('ability:')&&field&&field!==c.field)continue;unique.push(c);if(base.startsWith('ability:'))abilityFields.set(base,c.field);}
 // Shared-feature tests take precedence. A broad role adjustment is retained
 // as a fallback until the combined test demonstrates the narrower fix helps.
 const deferred=unique.filter(c=>c.key.startsWith('role:')&&unique.some(n=>!auditBaseKey(n.key).startsWith('role:')&&n.direction===c.direction&&plan.candidates.find(d=>d.key===n.key).roles.some(r=>r.role===c.key.split(':')[1]&&r.share>=.35)));
 return {plan,rows,diagnostics,allChanges:unique,changes:unique.filter(c=>!deferred.includes(c)),deferred};
}
function auditBundleProfile(plan,changes,index){const profile=structuredClone(plan.profile);profile.id='audit-bundle-'+index;for(const c of changes)profile.multipliers[c.lever]=c.to;return profile;}
export function auditBundleResult(proposal,changes,bundle){
 const checks=[];for(const c of [...changes,...proposal.deferred.filter(d=>!changes.includes(d))]){const row=bundle.rows.find(r=>r.key===c.key);checks.push({key:c.key,change:c,missing:row?.status!=='tested',...(row?.status==='tested'?auditResponse(row,c.direction):{})});}
 const guards=bundle.rows.filter(r=>r.status==='tested'&&auditBaseKey(r.key).startsWith('role:')&&!checks.some(c=>c.key===r.key)).map(r=>({key:r.key,...auditResponse(r,-Math.sign(r.wins-r.pairs/2)||-Math.sign(r.patchedWins-r.pairs/2))}));
 const failed=checks.filter(c=>c.missing||(changes.includes(c.change)?!c.improved:c.regressed||!(c.winGain>0||c.mean>.005)));
 return {passed:!failed.length&&!guards.some(g=>g.regressed),failed,guards};
}
export function nextAuditBundle(w,phase,report){
 const proposal=balanceAuditProposal(w,phase,report),{plan}=proposal;let changes=[...proposal.changes];
 if(!changes.length&&proposal.deferred.length)changes=[...proposal.deferred];
 const bundles=report.bundles??[];if(!Array.isArray(bundles)||bundles.length>AUDIT_RULES.maxBundleAttempts)throw Error('Invalid combined patch report.');
 for(let index=0;index<bundles.length;index++){
  const expected=auditBundleProfile(plan,changes,index),keys=[...new Set([...changes.map(c=>c.key),...proposal.deferred.map(c=>c.key),...plan.candidates.filter(c=>/^role:\w+$/.test(c.key)).map(c=>c.key)])].sort(),bundle=bundles[index];
  if(bundle.index!==index||bundle.profileToken!==auditHash(expected)||!Array.isArray(bundle.rows)||bundle.rows.length!==keys.length||!changes.length)throw Error('Combined patch report is stale or incomplete.');
  bundle.rows.forEach((r,i)=>{if(r.key!==keys[i]||!['tested','unmatched'].includes(r.status))throw Error('Invalid combined patch diagnostic.');if(r.status==='tested')auditValidateComparison(r,plan.pairs);});
  const outcome=auditBundleResult(proposal,changes,bundle);if(outcome.passed){if(index!==bundles.length-1)throw Error('The combined patch was already validated.');return {complete:true,passed:true,changes,proposal,bundle,outcome};}
  // Restore a broad role fallback when the narrower changes fail to improve
  // that role; discard changes whose own combined comparison fails.
  const failedKeys=new Set(outcome.failed.filter(c=>changes.includes(c.change)).map(c=>c.key));changes=changes.filter(c=>!failedKeys.has(c.key));
  for(const c of proposal.deferred)if(outcome.failed.some(f=>f.key===c.key)&&!changes.includes(c))changes.push(c);
  if(outcome.guards.some(g=>g.regressed)&&changes.length)changes=changes.slice(0,-1);
 }
 if(!changes.length||bundles.length===AUDIT_RULES.maxBundleAttempts)return {complete:true,passed:false,changes:[],proposal};
 const index=bundles.length,profile=auditBundleProfile(plan,changes,index),keys=[...new Set([...changes.map(c=>c.key),...proposal.deferred.map(c=>c.key),...plan.candidates.filter(c=>/^role:\w+$/.test(c.key)).map(c=>c.key)])].sort();
 return {complete:false,index,profile,profileToken:auditHash(profile),keys,changes};
}
export function applyBalanceAudit(w,phase,report){
 const balance=w.balance;if(!balance?.enabled)return null;const final=nextAuditBundle(w,phase,report);if(!final.complete)throw Error('Validate the combined balance patch before applying it.');
 const {proposal}=final,selected=final.passed?final.changes:[],profile=structuredClone(balance.profile),diagnostics=structuredClone(proposal.diagnostics);
 for(const c of selected)profile.multipliers[c.lever]=c.to;
 for(const d of diagnostics)if(d.status==='confirmed'){const change=selected.find(c=>c.key===d.key);d.status=change?'adjusted':'needs-assessment';d.note=change?change.note:proposal.deferred.some(c=>c.key===d.key)&&final.passed?'A narrower shared ability or stat adjustment improved this role in combined validation; no broad role modifier was added.':'The combined patch did not confirm this adjustment; held for assessment.';}
 const id=`${w.season}.${phase}.${balance.history.length+1}`;if(selected.length)profile.id=id;
 const simulationGames=proposal.rows.reduce((n,r)=>n+(r.status==='unmatched'?0:r.status==='tested'?proposal.plan.screenPairs*2+proposal.plan.pairs*2*(r.feedback.length?2+r.feedback.length:1):r.pairs*2),0)+(report.bundles??[]).reduce((n,b)=>n+b.rows.filter(r=>r.status==='tested').length*proposal.plan.pairs*4,0);
 const coverage={candidates:diagnostics.length,abilities:proposal.plan.candidates.filter(c=>c.key.startsWith('ability:')).length,stats:5,roles:proposal.plan.candidates.filter(c=>/^role:\w+$/.test(c.key)).length,compositions:proposal.plan.candidates.filter(c=>c.key.includes(':count:')).length,weapons:proposal.plan.candidates.filter(c=>c.key.startsWith('weapon:')).length,focused:proposal.plan.candidates.filter(c=>c.key.startsWith('within:')).length};
 for(const d of diagnostics)if(d.feedback)d.feedback=d.feedback.map(({marginDeltas,...f})=>({...f,marginMean:marginDeltas.reduce((a,b)=>a+b,0)/marginDeltas.length}));
 const combined=(report.bundles??[]).map(b=>({...b,rows:b.rows.map(({marginDeltas,...r})=>r)}));
 const entry={id,auditVersion:AUDIT_RULES.version,season:w.season,phase,engine:proposal.plan.engine,changes:selected,profile:structuredClone(profile),diagnostics,coverage,census:proposal.plan.census,combined,simulationGames,token:report.token};
 balance.profile=profile;balance.history.push(entry);balance.samples=[];balance.sampleGames=0;if(phase==='preseason')balance.preseasonSeason=w.season;else balance.halfwaySeason=w.season;delete balance.pendingAudit;return entry;
}

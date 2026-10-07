import {nextAuditBundle,balanceAuditPlan} from '../public/balance-analysis.js';
import {simulateBalanceCandidate} from '../public/balance-sim-worker.js';
// Complete the exact same report protocol as the browser. A caller can inject
// deterministic combat to exercise controller decisions without pretending
// those outcomes demonstrate real game balance.
export function completeAudit(world,phase,run,keys=null){
 const plan=balanceAuditPlan(world,phase),rows=plan.candidates.map(c=>!keys||keys.includes(c.key)?simulateBalanceCandidate({world,plan,key:c.key},run?((teams,seed,options)=>run(teams,seed,options,c.key)):undefined):{key:c.key,status:'unmatched'}),report={version:plan.version,token:plan.token,rows,bundles:[]};
 for(;;){const bundle=nextAuditBundle(world,phase,report);if(bundle.complete)break;report.bundles.push({index:bundle.index,profileToken:bundle.profileToken,rows:bundle.keys.map(key=>simulateBalanceCandidate({world,plan,key,mode:'bundle',bundle},run?((teams,seed,options)=>run(teams,seed,options,key)):undefined))});}
 return {plan,report};
}

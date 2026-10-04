// Suggestions favor groups of four, enough Swiss rounds to sort the field,
// and a final bracket of at most sixteen. These are editable starting points.
const powerOfTwo=n=>2**Math.floor(Math.log2(Math.max(2,n)));
const valid=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const bracket=type=>type==='single'||type==='double';

export function suggestedStage(count,stage,next){
  const result={...stage};
  if(count<2)return result;
  if(stage.type==='groups')result.groups=Math.min(64,Math.floor(count/2),Math.ceil(count/4));
  if(stage.type==='swiss')result.rounds=Math.min(count-1,Math.ceil(Math.log2(count)));
  if(next){
    let target=powerOfTwo(Math.floor(count/2));
    if(bracket(next.type))target=Math.min(16,target);
    if(stage.type==='groups'){
      const groups=result.groups;
      target=Math.max(groups,groups*Math.floor(target/groups));
    }
    result.advance=Math.min(count,Math.max(2,target));
  }
  return result;
}

export function recommendedStages(count,stages){
  let incoming=count;
  return stages.map((s,i)=>{
    const suggestion=suggestedStage(incoming,s,stages[i+1]);
    if(i<stages.length-1)incoming=Math.min(incoming,suggestion.advance);
    return suggestion;
  });
}

export function stagePlan(count,stages){
  let incoming=count;
  return stages.map((s,i)=>{
    const final=i===stages.length-1,active=incoming>=2;
    const suggestion=suggestedStage(incoming,s,stages[i+1]);
    const warnings=[],details=[];
    const settingsValid=(s.bestOf!==undefined?[1,3,5].includes(s.bestOf):valid(s.legs,1,101))&&(final||valid(s.advance,2,128))&&
      (s.type!=='groups'||valid(s.groups,1,64))&&(s.type!=='swiss'||valid(s.rounds,1,100));
    let outgoing=active?(final?1:Math.min(incoming,s.advance)):0;
    let matches=null;
    if(active&&settingsValid){
      if(s.type==='groups'){
        const groups=Math.min(s.groups,Math.max(1,Math.floor(incoming/2))),small=Math.floor(incoming/groups),large=Math.ceil(incoming/groups),larger=incoming%groups;
        details.push(`${groups} groups of ${small===large?small:small+'–'+large} · ${small===large?small-1:(small-1)+'–'+(large-1)} matches per fighter`);
        matches=(groups-larger)*small*(small-1)/2+larger*large*(large-1)/2;
        if(s.groups!==groups)warnings.push(`Only ${groups} groups can be used with ${incoming} fighters; each group needs at least two.`);
        if(!final){
          if(outgoing%groups===0)details.push(`${outgoing/groups} advance per group`);
          else details.push(`${Math.floor(outgoing/groups)} advance per group, plus ${outgoing%groups} by cross-group ranking`);
          if(outgoing<groups)warnings.push('Not every group winner will advance; group winners are compared across groups.');
        }
        if(final&&groups>1)details.push('Champion chosen by cross-group ranking');
        if(large===2)warnings.push('Groups of two give each fighter only one match. Groups of four give three matches each.');
      }else if(s.type==='swiss'){
        matches=Math.floor(incoming/2)*s.rounds;
        details.push(`${s.rounds} rounds · ${Math.floor(incoming/2)} matches per round${incoming%2?' + one rotating bye':''}`);
        if(s.rounds<suggestion.rounds)warnings.push(`A short Swiss stage may leave many fighters tied. Suggested: ${suggestion.rounds} rounds.`);
        if(s.rounds>incoming-1)warnings.push('There are more rounds than distinct opponents, so repeat matchups are unavoidable.');
      }else if(s.type==='single')matches=incoming-1;
      else if(s.type==='double')matches=`${incoming*2-2}–${incoming*2-1}`;
      if(!final&&s.advance>incoming)warnings.push(`Only ${incoming} fighters are available; all will advance.`);
      if(!final&&outgoing===incoming)warnings.push('This stage eliminates nobody. Lower the total advancing to narrow the field.');
    }else if(count>=2&&!settingsValid)warnings.push('Enter whole numbers within the limits to preview this stage.');
    const row={incoming,outgoing,suggestion,details,warnings,matches,active,settingsValid};
    incoming=settingsValid?outgoing:0;
    return row;
  });
}

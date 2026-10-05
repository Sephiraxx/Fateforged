// New series stop at the first majority; legacy recordings retain their original length.
export const validBestOf=n=>[1,3,5].includes(n);
export const seriesComplete=(format,score,games,knockout=false)=>format.bestOf!==undefined?Math.max(...score)>=Math.floor(format.bestOf/2)+1||format.allowDraw&&!knockout&&games>=format.bestOf:games>=format.legs&&(!knockout||score[0]!==score[1]);
// Keep the combat engine and old replays intact; competition rules decide
// whether an otherwise adjudicated time-limit result is a draw.
export const drawAtTimeLimit=(result,allowDraw)=>allowDraw&&result.reason?.startsWith('Time limit:')?{...result,winner:null,reason:'Time limit: draw'}:result;
export const seriesLabel=format=>format.bestOf!==undefined?`Bo${format.bestOf}`:`Legacy series · ${format.legs} games`;
export function assertSeriesResult(format,results,a,b,knockout=false){
 const score=[0,0];if(!results.length)throw new Error('Finish the match series.');
 for(const [index,result]of results.entries()){if(result.winner!==a&&result.winner!==b&&!(format.allowDraw&&!knockout&&result.winner===null&&result.seconds>=90))throw new Error('Invalid game winner.');if(format.bestOf!==undefined&&seriesComplete(format,score,index,knockout))throw new Error('The series already ended.');if(result.winner!==null)score[result.winner===a?0:1]++;}
 if(!seriesComplete(format,score,results.length,knockout))throw new Error('Finish the match series.');
 return score;
}

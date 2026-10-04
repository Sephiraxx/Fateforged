// New series stop at the first majority; legacy recordings retain their original length.
export const validBestOf=n=>[1,3,5].includes(n);
export const seriesComplete=(format,score,games,knockout=false)=>format.bestOf!==undefined?Math.max(...score)>=Math.floor(format.bestOf/2)+1:games>=format.legs&&(!knockout||score[0]!==score[1]);
export const seriesLabel=format=>format.bestOf!==undefined?`Bo${format.bestOf}`:`Legacy series · ${format.legs} games`;
export function assertSeriesResult(format,results,a,b,knockout=false){
 const score=[0,0];if(!results.length)throw new Error('Finish the match series.');
 for(const result of results){if(result.winner!==a&&result.winner!==b)throw new Error('Invalid game winner.');if(format.bestOf!==undefined&&seriesComplete(format,score,score[0]+score[1],knockout))throw new Error('The series already ended.');score[result.winner===a?0:1]++;}
 if(!seriesComplete(format,score,results.length,knockout))throw new Error('Finish the match series.');
 return score;
}

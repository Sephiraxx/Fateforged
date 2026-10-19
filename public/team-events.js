// Tournament formats for region circuits: round robins, bracket graphs (single and double elimination, GSL groups,
// gauntlet ladders) and Swiss stages. Pure and deterministic. Every match is a series
// {id, home, away, bestOf, games, winner}; a game is [winning side, home HP, away HP, seconds] once recorded.

const hash=(seed,key)=>{let h=(seed^0x9e3779b9)>>>0;for(const ch of String(key))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
export function coin(seed,key){return hash(seed,key)/4294967296;}
export function seededOrder(list,seed,key){return [...list].sort((a,b)=>coin(seed,`${key}:${a}`)-coin(seed,`${key}:${b}`)||(a<b?-1:1));}
export const loserOf=m=>m.winner?m.winner===m.home?m.away:m.home:null;
export const seriesWins=m=>[0,1].map(side=>m.games.filter(g=>g[0]===side).length);

// Circle method: every team meets every other once per leg; an odd group gets a bye each round.
export function roundRobinRounds(ids,legs=1){
 const list=ids.length%2?[...ids,null]:[...ids],n=list.length,rounds=[];
 for(let leg=0;leg<legs;leg++){
  const ring=[...list];
  for(let r=0;r<n-1;r++){
   const pairs=[];for(let i=0;i<n/2;i++){const a=ring[i],b=ring[n-1-i];if(a&&b)pairs.push((r+i+leg)%2?[b,a]:[a,b]);}
   rounds.push(pairs);ring.splice(1,0,ring.pop());
  }
 }
 return rounds;
}

// A table from finished series: series wins, then head-to-head among the tied, game difference, HP margin and a
// seeded coin. Rows carry the record, games, margin and streak.
export function table(ids,matches,seed,key='table'){
 const done=matches.filter(m=>m.winner),rows=ids.map(id=>{
  let wins=0,losses=0,gw=0,gl=0,margin=0;const form=[];
  for(const m of done){if(m.home!==id&&m.away!==id)continue;const side=m.home===id?0:1;if(m.winner===id)wins++;else losses++;form.push(m.winner===id?'W':'L');
   for(const g of m.games){if(g[0]===side)gw++;else gl++;margin+=(side?-1:1)*(g[1]-g[2]);}}
  let streak='';for(const r of form.slice().reverse()){if(!streak)streak=r+'1';else if(streak[0]===r)streak=r+(Number(streak.slice(1))+1);else break;}
  return {id,wins,losses,gamesWon:gw,gamesLost:gl,margin,streak};
 });
 const pct=r=>r.wins+r.losses?r.wins/(r.wins+r.losses):0;rows.sort((a,b)=>pct(b)-pct(a)||b.wins-a.wins);
 const out=[];
 for(let i=0;i<rows.length;){let j=i;while(j<rows.length&&pct(rows[j])===pct(rows[i])&&rows[j].wins===rows[i].wins)j++;
  const group=rows.slice(i,j),members=new Set(group.map(r=>r.id)),h2h={};
  for(const r of group){let w=0,n=0;for(const m of done)if(members.has(m.home)&&members.has(m.away)&&(m.home===r.id||m.away===r.id)){n++;if(m.winner===r.id)w++;}h2h[r.id]=n?w/n:0;}
  group.sort((a,b)=>h2h[b.id]-h2h[a.id]||(b.gamesWon-b.gamesLost)-(a.gamesWon-a.gamesLost)||b.margin-a.margin||coin(seed,`${key}:${a.id}`)-coin(seed,`${key}:${b.id}`));out.push(...group);i=j;}
 return out;
}

// ---------- Bracket graphs ----------
// A template node is {key, label, bestOf, a, b}; a source is {seed: i}, {winner: key}, {loser: key}, or
// {reseed: [keys], pick: 'low'|'high'}: the lowest or highest seed among the winners of those matches.
// Side a is home. The bracket opens a match as soon as both its teams are known.
const node=(key,label,bestOf,a,b)=>({key,label,bestOf,a,b});
const gsl=bo=>({nodes:[node('o1','Opening match',bo,{seed:0},{seed:3}),node('o2','Opening match',bo,{seed:1},{seed:2}),node('wm','Winners\' match',bo,{winner:'o1'},{winner:'o2'}),
  node('em','Elimination match',bo,{loser:'o1'},{loser:'o2'}),node('dm','Decider match',bo,{loser:'wm'},{winner:'em'})],
  places:[[{winner:'wm'}],[{winner:'dm'}],[{loser:'dm'}],[{loser:'em'}]]});
export const TEMPLATES=Object.freeze({
 // Split playoffs, top 4: semifinals Bo3 (1v4, 2v3), Bo5 final.
 top4:{nodes:[node('sf1','Semifinal',3,{seed:0},{seed:3}),node('sf2','Semifinal',3,{seed:1},{seed:2}),node('final','Final',5,{winner:'sf1'},{winner:'sf2'})],
  places:[[{winner:'final'}],[{loser:'final'}],[{loser:'sf1'},{loser:'sf2'}]]},
 // Split 3 playoffs, top 6: quarterfinals Bo3 (3v6, 4v5); the top two seeds meet the lowest and highest survivors.
 top6:{nodes:[node('qf1','Quarterfinal',3,{seed:2},{seed:5}),node('qf2','Quarterfinal',3,{seed:3},{seed:4}),
  node('sf1','Semifinal',5,{seed:0},{reseed:['qf1','qf2'],pick:'low'}),node('sf2','Semifinal',5,{seed:1},{reseed:['qf1','qf2'],pick:'high'}),node('final','Final',5,{winner:'sf1'},{winner:'sf2'})],
  places:[[{winner:'final'}],[{loser:'final'}],[{loser:'sf1'},{loser:'sf2'}],[{loser:'qf1'},{loser:'qf2'}]]},
 // Regional qualifier ladders: the lowest seeds play first, the winner climbs.
 ladder4:{nodes:[node('g1','Qualifier round 1',5,{seed:3},{seed:2}),node('g2','Qualifier round 2',5,{seed:1},{winner:'g1'}),node('g3','Qualifier final',5,{seed:0},{winner:'g2'})],
  places:[[{winner:'g3'}],[{loser:'g3'}],[{loser:'g2'}],[{loser:'g1'}]]},
 ladder3:{nodes:[node('g1','Qualifier round 1',5,{seed:2},{seed:1}),node('g2','Qualifier final',5,{seed:0},{winner:'g1'})],
  places:[[{winner:'g2'}],[{loser:'g2'}],[{loser:'g1'}]]},
 ladder2:{nodes:[node('g1','Qualifier final',5,{seed:0},{seed:1})],places:[[{winner:'g1'}],[{loser:'g1'}]]},
 // GSL group (four teams, double elimination): two qualify. Bo3 (older MSI play-ins) or Bo5 (First Stand groups).
 gsl:gsl(3),gsl5:gsl(5),
 // Four-team double elimination, Bo5, that qualifies one team (MSI and Worlds play-ins).
 double4:{nodes:[node('u1','Upper semifinal',5,{seed:0},{seed:3}),node('u2','Upper semifinal',5,{seed:1},{seed:2}),node('uf','Upper final',5,{winner:'u1'},{winner:'u2'}),
  node('l1','Lower semifinal',5,{loser:'u1'},{loser:'u2'}),node('lf','Lower final',5,{loser:'uf'},{winner:'l1'}),node('gf','Play-in final',5,{winner:'uf'},{winner:'lf'})],
  places:[[{winner:'gf'}],[{loser:'gf'}],[{loser:'lf'}],[{loser:'l1'}]]},
 // Eight-team double elimination, Bo5: losers cross over so early rematches are avoided.
 double8:{nodes:[node('u1','Upper round 1',5,{seed:0},{seed:7}),node('u2','Upper round 1',5,{seed:3},{seed:4}),node('u3','Upper round 1',5,{seed:1},{seed:6}),node('u4','Upper round 1',5,{seed:2},{seed:5}),
  node('u5','Upper semifinal',5,{winner:'u1'},{winner:'u2'}),node('u6','Upper semifinal',5,{winner:'u3'},{winner:'u4'}),node('u7','Upper final',5,{winner:'u5'},{winner:'u6'}),
  node('l1','Lower round 1',5,{loser:'u1'},{loser:'u2'}),node('l2','Lower round 1',5,{loser:'u3'},{loser:'u4'}),node('l3','Lower round 2',5,{loser:'u6'},{winner:'l1'}),node('l4','Lower round 2',5,{loser:'u5'},{winner:'l2'}),
  node('l5','Lower round 3',5,{winner:'l3'},{winner:'l4'}),node('l6','Lower final',5,{loser:'u7'},{winner:'l5'}),node('gf','Grand final',5,{winner:'u7'},{winner:'l6'})],
  places:[[{winner:'gf'}],[{loser:'gf'}],[{loser:'l6'}],[{loser:'l5'}],[{loser:'l3'},{loser:'l4'}],[{loser:'l1'},{loser:'l2'}]]},
 // Single elimination, eight teams in fixed slots (seeds 0..7 are the quarterfinal pairs in order), all Bo5.
 knockout8:{nodes:[node('q1','Quarterfinal',5,{seed:0},{seed:1}),node('q2','Quarterfinal',5,{seed:2},{seed:3}),node('q3','Quarterfinal',5,{seed:4},{seed:5}),node('q4','Quarterfinal',5,{seed:6},{seed:7}),
  node('s1','Semifinal',5,{winner:'q1'},{winner:'q2'}),node('s2','Semifinal',5,{winner:'q3'},{winner:'q4'}),node('f','Final',5,{winner:'s1'},{winner:'s2'})],
  places:[[{winner:'f'}],[{loser:'f'}],[{loser:'s1'},{loser:'s2'}],[{loser:'q1'},{loser:'q2'},{loser:'q3'},{loser:'q4'}]]},
 // Four teams in fixed slots (0v1, 2v3), Bo5 semifinals and final.
 knockout4:{nodes:[node('s1','Semifinal',5,{seed:0},{seed:1}),node('s2','Semifinal',5,{seed:2},{seed:3}),node('f','Final',5,{winner:'s1'},{winner:'s2'})],
  places:[[{winner:'f'}],[{loser:'f'}],[{loser:'s1'},{loser:'s2'}]]}
});
export const finalKey=template=>TEMPLATES[template].places[0][0].winner;
// A bracket: {format:'bracket', template, seeds, matches: {nodeKey: matchId}}. `create(node, home, away)` makes the
// series and returns its id; `get(id)` reads one. Opens every match whose teams are known; returns the new ids.
export function openBracket(b,get,create){
 const t=TEMPLATES[b.template],made=[];
 const resolve=src=>{
  if(src.seed!=null)return b.seeds[src.seed]??null;
  if(src.winner||src.loser){const id=b.matches[src.winner??src.loser],m=id&&get(id);return m?.winner?(src.winner?m.winner:loserOf(m)):null;}
  if(src.reseed){const ms=src.reseed.map(k=>b.matches[k]&&get(b.matches[k]));if(ms.some(m=>!m?.winner))return null;const ws=ms.map(m=>m.winner).sort((x,y)=>b.seeds.indexOf(x)-b.seeds.indexOf(y));return src.pick==='low'?ws.at(-1):ws[0];}
  return null;
 };
 for(const n of t.nodes){if(b.matches[n.key])continue;const home=resolve(n.a),away=resolve(n.b);if(!home||!away)continue;b.matches[n.key]=create(n,home,away);made.push(b.matches[n.key]);}
 return made;
}
export const bracketDone=(b,get)=>TEMPLATES[b.template].nodes.every(n=>b.matches[n.key]&&get(b.matches[n.key])?.winner);
// Final placings, best first: groups of tied places (e.g. both semifinal losers), each ordered by seed.
// Seeds for double8 from four tiers of two: tier 1 meets tier 4 and tier 2 meets tier 3 in upper round 1, the two
// tier-1 teams in opposite halves. The draw inside each tier is seeded and avoids same-region pairs where it can.
const DOUBLE8_ROUND1=[[0,7],[3,4],[1,6],[2,5]];
export function tieredDouble8(tiers,regionOf,seed){
 const tries=[];for(let mask=0;mask<16;mask++){const t=tiers.map((pair,i)=>mask>>i&1?[pair[1],pair[0]]:pair),seeds=[t[0][0],t[0][1],t[1][0],t[1][1],t[2][0],t[2][1],t[3][1],t[3][0]];
  tries.push({seeds,c:DOUBLE8_ROUND1.filter(([a,b])=>regionOf(seeds[a])===regionOf(seeds[b])).length,r:coin(seed,'draw:'+mask)});}
 return tries.sort((a,b)=>a.c-b.c||a.r-b.r)[0].seeds;
}
export function bracketPlaces(b,get){
 return TEMPLATES[b.template].places.map(group=>group.map(src=>{const m=get(b.matches[src.winner??src.loser]);return src.winner?m?.winner:m&&loserOf(m);}).filter(Boolean).sort((x,y)=>b.seeds.indexOf(x)-b.seeds.indexOf(y)));
}

// ---------- Swiss stage ----------
// Sixteen teams; three wins advance, three losses eliminate. Round 1 pairs pool 1 with pool 3 and pool 2 within itself
// when the stage has `pools` (otherwise the top half of the seeding with the bottom half); later rounds pair equal records. Pairings avoid rematches always and the same region where they can.
// Matches deciding advancement or elimination (either team on two wins or two losses) are Bo3, the rest Bo1.
export const SWISS_TARGET=3;
export function swissRecords(s,get){
 const rec=Object.fromEntries(s.teams.map(id=>[id,[0,0]])),met=Object.fromEntries(s.teams.map(id=>[id,[]]));
 for(const round of s.rounds)for(const id of round){const m=get(id);met[m.home].push(m.away);met[m.away].push(m.home);if(!m.winner)continue;rec[m.winner][0]++;rec[loserOf(m)][1]++;}
 return {rec,met};
}
function matchGroup(list,ok){
 // Depth-first perfect matching; the first team takes the first acceptable partner in order.
 if(!list.length)return [];
 const [a,...rest]=list;
 for(let i=0;i<rest.length;i++){if(!ok(a,rest[i]))continue;const sub=matchGroup(rest.filter((_,j)=>j!==i),ok);if(sub)return [[a,rest[i]],...sub];}
 return null;
}
export function swissPairs(s,get,regionOf,seed){
 const {rec,met}=swissRecords(s,get),round=s.rounds.length,alive=s.teams.filter(id=>rec[id][0]<SWISS_TARGET&&rec[id][1]<SWISS_TARGET);
 if(!alive.length)return [];
 const rules=[(a,b)=>!met[a].includes(b)&&regionOf(a)!==regionOf(b),(a,b)=>!met[a].includes(b),()=>true];
 if(round===0){
  const [top,middle,low]=s.pools??[s.teams.slice(0,s.teams.length/2),[],s.teams.slice(s.teams.length/2)],bottom=seededOrder(low,seed,'swiss:r1');
  const cross=ok=>{const pairs=[],used=new Set();
   const pick=i=>{if(i===top.length)return true;for(const b of bottom){if(used.has(b)||!ok(top[i],b))continue;used.add(b);pairs.push([top[i],b]);if(pick(i+1))return true;pairs.pop();used.delete(b);}return false;};
   return pick(0)?pairs:null;};
  const within=ok=>middle.length?matchGroup(seededOrder(middle,seed,'swiss:r1:pool2'),ok):[];
  let a=null,b=null;for(const ok of rules){a??=cross(ok);b??=within(ok);}
  if(!a||!b)return [];
  return [...a,...b.map(([x,y])=>s.teams.indexOf(x)<=s.teams.indexOf(y)?[x,y]:[y,x])].map(([home,away])=>({home,away,bestOf:1}));
 }
 const groups=new Map();for(const id of alive){const k=rec[id].join('-');(groups.get(k)??groups.set(k,[]).get(k)).push(id);}
 const out=[];
 for(const [k,ids]of [...groups.entries()].sort((a,b)=>a[0]<b[0]?-1:1)){
  const order=ids.slice().sort((a,b)=>s.teams.indexOf(a)-s.teams.indexOf(b)),[w,l]=k.split('-').map(Number),bestOf=w===SWISS_TARGET-1||l===SWISS_TARGET-1?3:1;
  let pairs=null;for(const ok of rules){pairs=matchGroup(seededOrder(order,seed,`swiss:${round}:${k}`),ok);if(pairs)break;}
  for(const [a,b]of pairs??[]){const [home,away]=s.teams.indexOf(a)<=s.teams.indexOf(b)?[a,b]:[b,a];out.push({home,away,bestOf});}
 }
 return out;
}
export const swissRoundDone=(s,get)=>!s.rounds.length||s.rounds.at(-1).every(id=>get(id).winner);
export function swissDone(s,get){const {rec}=swissRecords(s,get);return s.teams.every(id=>rec[id][0]>=SWISS_TARGET||rec[id][1]>=SWISS_TARGET);}
// Quarterfinal slots for knockout8 from the Swiss records: each 3–0 team against a 3–2 team, the third 3–2 team against
// a 3–1 team, and the other two 3–1 teams together. Same-region pairs are avoided where possible.
export function swissKnockoutSeeds(s,get,regionOf,seed){
 const {rec}=swissRecords(s,get),by=l=>s.teams.filter(id=>rec[id][0]>=SWISS_TARGET&&rec[id][1]===l);
 const z=by(0),o=by(1),t=by(2);
 const tries=[];for(const tp of permutations(t))for(const op of permutations(o))tries.push([[z[0],tp[0]],[op[0],op[1]],[z[1],tp[1]],[op[2],tp[2]]]);
 const conflicts=pairs=>pairs.filter(([a,b])=>a&&b&&regionOf(a)===regionOf(b)).length;
 const best=tries.map((p,i)=>({p,c:conflicts(p),r:coin(seed,'ko:'+i)})).sort((a,b)=>a.c-b.c||a.r-b.r)[0];
 return best?best.p.flat():[];
}
function permutations(list){if(list.length<=1)return [list.slice()];const out=[];list.forEach((x,i)=>{for(const p of permutations(list.filter((_,j)=>j!==i)))out.push([x,...p]);});return out;}

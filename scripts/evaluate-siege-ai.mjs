// How Core siege fighters react in a fight (TEAM-BATTLES.md, "Siege AI"): plays seeded 3v3 and 5v5 games and measures
// - retaliation: of the fighters hit by an enemy fighter (healers aside), the share that target that attacker within
//   2 s;
// - contested Core damage: the share of all Core damage taken while a living defender stood within 350 of the Core;
// - game length, sudden death and kills per game.
// node scripts/evaluate-siege-ai.mjs [games per size] [--engine team-4.0] [--record]
// (--record writes validation/siege-ai.json: team-3.9, the same rules without the siege AI, against team-4.0)
import fs from 'node:fs';
import {gameList} from './rust-schema.mjs';

const args=process.argv.slice(2),flag=n=>args.includes(n),value=(n,d)=>flag(n)?args[args.indexOf(n)+1]:d;
const perSize=Number(args.find(a=>/^\d+$/.test(a))??24),engine=value('--engine','team-4.0');
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function measure(b){
 const fighters=b.combatants,open=new Map(),stats={hits:0,answered:0,coreDamage:0,contested:0};
 let hp=fighters.map(f=>f.hp),cores=b.cores.map(c=>c.hp);
 const close=f=>{const e=open.get(f.index);if(e){stats.hits++;if(e.answered)stats.answered++;open.delete(f.index);}};
 while(!b.done){
  b.step(1/60);
  for(const f of fighters){
   const e=open.get(f.index);
   if(e){if(f.target===e.by)e.answered=true;if(b.time-e.at>2||f.hp<=0)close(f);}
   const a=fighters[f.lastAttacker];
   if(f.hp<hp[f.index]&&f.hp>0&&f.role!=='healer'&&a&&a.team!==f.team&&a.hp>0&&!open.has(f.index))open.set(f.index,{by:a.index,at:b.time,answered:f.target===a.index});
  }
  b.cores.forEach((c,i)=>{const lost=Math.max(0,cores[i]-c.hp);if(lost>0){stats.coreDamage+=lost;if(fighters.some(f=>f.team===c.team&&f.hp>0&&d(f,c)<350))stats.contested+=lost;}});
  hp=fighters.map(f=>f.hp);cores=b.cores.map(c=>c.hp);
 }
 for(const f of fighters)close(f);
 const r=b.result();
 return {...stats,seconds:r.seconds,suddenDeath:!!r.objective?.suddenDeath,kills:r.fighters.reduce((n,f)=>n+f.kills,0)};
}

function summary(engine){
 const rows={};
 for(const size of [3,5]){
  const all=gameList(4,engine).filter(g=>g.size===size).slice(0,perSize).map(g=>measure(g.make()));
  const sum=k=>all.reduce((n,x)=>n+x[k],0),sorted=all.map(x=>x.seconds).sort((a,b)=>a-b);
  rows[size]={games:all.length,retaliation:+(sum('answered')/Math.max(1,sum('hits'))).toFixed(3),contestedCoreDamage:+(sum('contested')/Math.max(1,sum('coreDamage'))).toFixed(3),
   medianSeconds:sorted[Math.floor(sorted.length/2)],suddenDeath:+(all.filter(x=>x.suddenDeath).length/all.length).toFixed(3),killsPerGame:+(sum('kills')/all.length).toFixed(1)};
 }
 return rows;
}
if(import.meta.url===`file://${process.argv[1]}`){
 // --record compares team-3.9 (the same rules without this AI) with the current team-4.0 on the same seeds.
 const out=flag('--record')?{games:perSize,before:{engine:'team-3.9',rows:summary('team-3.9')},after:{engine:'team-4.0',rows:summary('team-4.0')}}:{engine,rows:summary(engine)};
 console.log(JSON.stringify(out,null,1));
 if(flag('--record'))fs.writeFileSync('validation/siege-ai.json',JSON.stringify(out,null,1)+'\n');
}

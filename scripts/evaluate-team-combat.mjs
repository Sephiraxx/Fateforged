// Seeded evaluation of team battles. Writes validation/team-combat.json (read by check-team-combat).
// Usage: node scripts/evaluate-team-combat.mjs [games-per-matchup=40]
// Formation metrics are sampled every 0.25 s while a fighter is engaged (an enemy within 200):
// isolated = no ally within 150, outnumbered = more enemies than allies nearby, spread = mean distance from the
// team centroid, healer cover = healers within support range of a living tank.
import fs from 'node:fs';
import {engine,formationMatchup} from './team-fixtures.mjs';
const {TEAM_MAPS}=await import('../public/team-maps.js');
const games=Number(process.argv[2]||40),short=Math.max(12,Math.round(games*.6));
const line=(label,r)=>console.log(`${label}: ${r.winRateA}% · timeouts ${r.timeoutRate}% · ${r.averageSeconds}s · isolated ${r.isolatedPct}% · outnumbered ${r.outnumberedPct}% · spread ${r.spread} · healer cover ${r.healerCoverPct}% · ${r.averageMs} ms`);
const pairs=[['balanced2','damage2'],['healer2','damage2'],['balanced2','balanced2'],['balanced3','damage3'],['tank3','damage3'],['healer3','damage3'],['control3','damage3'],['balanced3','balanced3'],['balanced5','damage5'],['balanced5','balanced5']];
const matchups=[];for(const [a,b]of pairs){const r={a,b,...formationMatchup(a,b,games)};matchups.push(r);line(`${a} vs ${b}`,r);}
// Each coach tactic against a balanced opponent with identical squads.
const tactics=[];for(const size of [2,3,5])for(const tactic of engine.TEAM_TACTICS){const comp=`balanced${size}`,r={size,tactic,...formationMatchup(comp,comp,short,{tactics:[tactic,'balanced']})};tactics.push(r);line(`${size}v${size} ${tactic} vs balanced`,r);}
// Every map, balanced 3v3 mirror.
const maps=[];for(const m of TEAM_MAPS){const r={map:m.id,...formationMatchup('balanced3','balanced3',short,{map:m.id})};maps.push(r);line(`map ${m.id}`,r);}
// Team-1 baseline (the first team engine, before formations, measured with the same sampler on its 600×600 arena).
const baseline={engine:'team-1',note:'20 games per pairing, measured before team-2.',matchups:[{a:'balanced3',b:'balanced3',isolatedPct:33.7,outnumberedPct:17.7,spread:93,healerCoverPct:91.8},{a:'balanced5',b:'balanced5',isolatedPct:26.8,outnumberedPct:23.9,spread:116,healerCoverPct:81.8},{a:'balanced3',b:'damage3',isolatedPct:41.7,outnumberedPct:20.5,spread:93,healerCoverPct:91.9}]};
fs.writeFileSync('validation/team-combat.json',JSON.stringify({engine:engine.TEAM_ENGINE_VERSION,rules:engine.TEAM_RULES,postures:engine.TEAM_POSTURES,gamesPerMatchup:games,note:'Squads are seeded role-targeted S/A fighters (2% SS); each pairing alternates sides; maps are random unless named.',matchups,tactics,maps,baseline},null,2)+'\n');

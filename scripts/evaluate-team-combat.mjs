// Seeded composition matrix for team battles. Writes validation/team-combat.json (read by check-team-combat).
// Usage: node scripts/evaluate-team-combat.mjs [games-per-matchup=40]
import fs from 'node:fs';
import {engine,matchup} from './team-fixtures.mjs';
const games=Number(process.argv[2]||40);
const pairs=[['balanced3','damage3'],['tank3','damage3'],['healer3','damage3'],['control3','damage3'],['balanced3','balanced3'],['balanced5','damage5'],['balanced5','balanced5']];
const matchups=[];
for(const [a,b]of pairs){const result={a,b,...matchup(a,b,games)};matchups.push(result);console.log(`${a} vs ${b}: ${result.winRateA}% · timeouts ${result.timeoutRate}% · ${result.averageSeconds}s · healer ${result.healerHealingPerGame} HP · CC ${result.ccSecondsPerGame}s · ${result.averageMs} ms`);}
fs.writeFileSync('validation/team-combat.json',JSON.stringify({engine:engine.TEAM_ENGINE_VERSION,rules:engine.TEAM_RULES,gamesPerMatchup:games,note:'Squads are seeded role-targeted S/A fighters (2% SS); each pairing alternates sides.',matchups},null,2)+'\n');

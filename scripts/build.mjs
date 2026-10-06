import {readFile,mkdir,rm,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {moduleBundle} from './module-bundle.mjs';
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/luck.js':'luck.js','/data.js':'data.js','/names.js':'names.js','/style.css':'style.css','/forge.css':'forge.css','/roster.css':'roster.css','/shell.js':'shell.js','/arena':'arena.html','/arena.html':'arena.html','/arena.js':'arena.js','/arena.css':'arena.css','/combat.js':'combat.js','/combat-v1.js':'combat-v1.js','/combat-v2.js':'combat-v2.js','/combat-v3.js':'combat-v3.js','/abilities.js':'abilities.js','/conditions.js':'conditions.js','/divisions.js':'divisions.js','/brackets.js':'brackets.js','/stage-recommendations.js':'stage-recommendations.js','/tournaments.js':'tournaments.js','/tournament-names.js':'tournament-names.js','/champion-history.js':'champion-history.js'};
files['/combat-v4.js']='combat-v4.js';
files['/combat-v5.js']='combat-v5.js';files['/combat-v6.js']='combat-v6.js';files['/combat-v7.js']='combat-v7.js';files['/combat-v8.js']='combat-v8.js';files['/combat-base-v6.js']='combat-base-v6.js';
files['/roster-view.js']='roster-view.js';files['/bulk-characters.js']='bulk-characters.js';files['/series.js']='series.js';files['/promotion-rules.js']='promotion-rules.js';
for(const file of ['trait-details.js','trait-detail-ui.js'])files['/'+file]=file;
for(const file of ['combat-team.js','team-roles.js','team-generation.js','tier-generation.js','team-ui.js','team.css','team-league.js','team-league-ui.js'])files['/'+file]=file;
for(const file of ['leagues.js','league-fixtures.js','league-ui.js','league-sim-worker.js','simulation-client.js','leagues.css'])files['/'+file]=file;
for(const file of ['combat-v9.js','combat-v10-profile.js','combat-v10-contact.js','combat-v10-environment.js','combat-v10-powers.js','combat-engines.js'])files['/'+file]=file;
for(const file of ['abilities-v11.js','combat-v10.js','combat-v11.js','combat-v11-profile.js','combat-v11-contact.js','combat-v11-environment.js','combat-v11-powers.js'])files['/'+file]=file;
for(const file of ['class-abilities.js','abilities-v12.js','data-v2.js','luck-v2.js','combat-v12.js','combat-v12-base.js','combat-v12-profile.js','combat-v12-contact.js','combat-v12-environment.js','combat-v12-powers.js'])files['/'+file]=file;
const assets={};for(const [url,file] of Object.entries(files))assets[url]=await readFile(`public/${file}`,'utf8');
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const binary={};for(const name of ['weapons','effects'])binary['/assets/'+name+'.webp']=(await readFile('public/'+name+'.webp')).toString('base64');
binary['/assets/obsidian.webp']=(await readFile('public/obsidian.webp')).toString('base64');
const context={};vm.createContext(context);vm.runInContext(assets['/class-abilities.js']+assets['/data.js']+';this.catalog=WHEEL_DATA.base;this.generationPools=WHEEL_DATA',context);
const catalog=Object.fromEntries(['power','power2','weakness'].map(slot=>[slot,context.catalog[slot]]));
const reconciliation=(await readFile('public/catalog-repair.js','utf8')).replace('export function reconcileCharacter','function reconcileCharacter');
const seriesHelpers=(await readFile('public/series.js','utf8')).replaceAll('export const','const').replaceAll('export function','function');
const resetHelpers=(await readFile('worker/requested-reset.mjs','utf8')).replaceAll('export const','const').replaceAll('export async function','async function');
const tournamentNameStorage=(await readFile('worker/tournament-names.mjs','utf8')).replaceAll('export const','const').replaceAll('export async function','async function');
const promotionHelpers=(await readFile('public/promotion-rules.js','utf8')).replaceAll('export const','const').replaceAll('export function','function');
const characterNames=await readFile('public/names.js','utf8');
const nameHelpers=(await readFile('public/tournament-names.js','utf8')).replaceAll('export function','function');
const historyHelpers=(await readFile('public/champion-history.js','utf8')).replaceAll('export function','function');
const version=createHash('sha256').update(JSON.stringify(assets)+JSON.stringify(binary)).digest('hex').slice(0,16);
const revision=createHash('sha256').update(JSON.stringify(catalog)+reconciliation).digest('hex');
const leagueHelpers=(await readFile('public/leagues.js','utf8')).replaceAll('export const','const');
const leagueStorage=await readFile('worker/leagues.mjs','utf8');
const teamLeague=moduleBundle('TEAM_LEAGUE',[await readFile('public/team-roles.js','utf8'),await readFile('public/team-league.js','utf8')])+'\n'+await readFile('worker/teams.mjs','utf8');
const poolHelpers=await readFile('worker/pools.mjs','utf8');
const paths=[...Object.keys(files).filter(p=>/\.(js|css)$/.test(p)),...Object.keys(binary)];
for(const path of Object.keys(assets)){
 if(!/\.(js|css|html)$/.test(path)&&path!=='/'&&path!=='/arena')continue;
 for(const asset of paths){const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),local=asset.slice(1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assets[path]=assets[path].replace(new RegExp(`(["'])(?:${escaped}|(?:\\./)?${local})\\1`,'g'),`$1${asset}?v=${version}$1`);}
 assets[path]=assets[path].replaceAll('${name}.webp','${name}.webp?v='+version);
}
await writeFile('dist/server/index.js',`${assets['/class-abilities.js']}\n${assets['/luck.js']}\n${resetHelpers}\n${tournamentNameStorage}\n${nameHelpers}\n${historyHelpers}\n${seriesHelpers}\n${promotionHelpers}\n${leagueHelpers}\n${leagueStorage}\n${teamLeague}\nconst GENERATION_POOL_REVISION=${JSON.stringify(createHash('sha256').update(JSON.stringify(context.generationPools)).digest('hex'))};\nconst GENERATION_POOLS=${JSON.stringify(context.generationPools)};\nconst RANDOM_CHARACTER_NAME=(()=>{const randomIndex=WHEEL_LUCK.randomIndex;${characterNames};return suggestFantasyName;})();\nconst CURRENT_CATALOG=${JSON.stringify(catalog)};\nconst CURRENT_CATALOG_REVISION=${JSON.stringify(revision)};\n${poolHelpers}\nconst ASSET_VERSION=${JSON.stringify(version)};\n${reconciliation}\nconst ASSETS=${JSON.stringify(assets)};\nconst BINARY_ASSETS=${JSON.stringify(binary)};\n`+await readFile('worker/index.js','utf8'));
try{await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
console.log('Built Fateforge Worker with embedded assets.');

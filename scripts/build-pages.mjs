import {readFile,writeFile,mkdir,readdir,cp,rm} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {moduleBundle} from './module-bundle.mjs';

const output=process.argv[2]==='--output'?process.argv[3]:'_site';
if(!['_site','docs'].includes(output))throw Error('Output must be _site or docs.');
await rm(output,{recursive:true,force:true});
await mkdir(`${output}/vendor`,{recursive:true});
await mkdir(`${output}/assets`,{recursive:true});
const context={};vm.createContext(context);
vm.runInContext(await readFile('public/class-abilities.js','utf8')+await readFile('public/support-catalog.js','utf8')+await readFile('public/data.js','utf8')+';this.pools=supportPools(WHEEL_DATA)',context);
const catalog=Object.fromEntries(['power','power2','weakness'].map(slot=>[slot,context.pools.base[slot]]));
const strip=code=>code.replaceAll('export const','const').replaceAll('export async function','async function').replaceAll('export function','function');
const reconciliation=strip(await readFile('public/catalog-repair.js','utf8'));
const helpers=[];
for(const file of ['public/class-abilities.js','public/support-catalog.js','public/luck-v4.js','public/tournament-names.js','public/champion-history.js','public/series.js','public/promotion-rules.js','public/leagues.js','worker/leagues.mjs'])helpers.push(strip(await readFile(file,'utf8')));
helpers.push(strip((await readFile('worker/tournament-names.mjs','utf8')).split('// Repair the three cups')[0]));
helpers.push(moduleBundle('TEAM_LEAGUE',[await readFile('public/team-kits.js','utf8'),await readFile('public/support-abilities.js','utf8'),await readFile('public/team-balance.js','utf8'),await readFile('public/team-roles.js','utf8'),await readFile('public/team-engine-versions.js','utf8'),await readFile('public/team-game-plan.js','utf8'),await readFile('public/balance-analysis.js','utf8'),await readFile('public/team-maps.js','utf8'),await readFile('public/team-series.js','utf8'),await readFile('public/team-league.js','utf8')]),await readFile('worker/teams.mjs','utf8'));
const names=await readFile('public/names.js','utf8');
const revision=createHash('sha256').update(JSON.stringify(catalog)+reconciliation).digest('hex');
let backend=await readFile('worker/index.js','utf8');
backend=backend.replace(/if\(env\.DB\?\.batch&&request\.method==='GET'&&\['\/','\/arena'\]\.includes\(url\.pathname\)\)\{await applyRequestedReset\(env\);await repairRequestedTournamentNames\(env\);\}/,'');
backend=backend.replace('https://fateforge-character-wheel.sephiraxx.chatgpt.site','https://fateforge.local');
await writeFile(`${output}/local-api.js`,`${helpers.join('\n')}\nconst GENERATION_POOL_REVISION=${JSON.stringify(createHash('sha256').update(JSON.stringify(context.pools)).digest('hex'))};\nconst GENERATION_POOLS=${JSON.stringify(context.pools)};\nconst RANDOM_CHARACTER_NAME=(()=>{const randomIndex=WHEEL_LUCK.randomIndex;${names};return suggestFantasyName;})();\nconst CURRENT_CATALOG=${JSON.stringify(catalog)};\nconst CURRENT_CATALOG_REVISION=${JSON.stringify(revision)};\nconst ASSETS={},BINARY_ASSETS={},ASSET_VERSION='pages';\n${reconciliation}\n${strip(await readFile('worker/pools.mjs','utf8'))}\n${backend}`);
const migrations=[];
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())migrations.push(await readFile('drizzle/'+file,'utf8'));
await writeFile(`${output}/local-schema.js`,`export default ${JSON.stringify(migrations)};\n`);
for(const file of await readdir('public')){
 if(!/\.(html|js|css)$/.test(file))continue;
 let content=await readFile('public/'+file,'utf8');
 // Relative assets work on both /Fateforged/ and a custom domain.
 content=content.replace(/(["'`])\/assets\//g,'$1./assets/').replace(/(["'])\/([\w-]+\.(?:css|js))/g,'$1./$2');
 content=content.replaceAll('fetch(\'/api/','globalThis.FATEFORGE_STORAGE.fetch(\'/api/');
 if(file.endsWith('.html')){
  content=content.replace(/href="\/arena(#[\w-]+)?"/g,'href="./arena.html$1"').replaceAll('href="/"','href="./index.html"');
  content=content.replaceAll('Sign in with ChatGPT','Saved on this browser').replace(/href="\/signin-with-chatgpt[^\"]*"/g,'href="#"');
  content=content.replace('</head>','<link rel="stylesheet" href="./pages-storage.css"><script src="./pages-storage.js" defer></script></head>');
  // The classic bridge must exist before deferred app scripts and modules run.
  content=content.replace('<script src="./pages-storage.js" defer></script>','');
  content=content.replace('<head>','<head><script src="./pages-storage.js" defer></script>');
  content=content.replace('</header>','</header><div class="storage-bar"><span>Saved on this browser</span><button class="quiet" type="button" id="storage-backups">Backups</button><span id="storage-notice" role="status" aria-live="polite"></span></div>');
  content=content.replace('</body>',`<dialog id="storage-dialog" aria-labelledby="storage-title"><div class="dialog-heading"><h2 id="storage-title">Your Fateforge saves</h2><button type="button" class="quiet" id="storage-close">Close</button></div><p>Fighters, tournaments, records and champions are saved in this browser. Export a backup to keep them safe or move them to another device. Clearing browser data removes these saves.</p><div id="storage-usage" class="storage-usage" aria-live="polite"></div><div class="dialog-actions"><button type="button" class="button primary" id="storage-export">Export backup</button><label class="button secondary" for="storage-import">Import backup</label><input type="file" id="storage-import" accept=".sqlite,.db" hidden></div><p id="storage-result" role="status" aria-live="polite"></p></dialog></body>`);
 }
 await writeFile(`${output}/${file}`,content);
}
for(const name of ['weapons','effects','obsidian'])await cp(`public/${name}.webp`,`${output}/assets/${name}.webp`);
for(const file of await readdir('pages'))await cp(`pages/${file}`,`${output}/${file}`);
for(const file of ['sql-wasm.js','sql-wasm.wasm'])await cp(`node_modules/sql.js/dist/${file}`,`${output}/vendor/${file}`);
await cp('node_modules/sql.js/LICENSE',`${output}/vendor/sql.js-LICENSE.txt`);
await cp('node_modules/pixi.js/dist/pixi.min.mjs',`${output}/vendor/pixi.min.js`);await cp('node_modules/pixi.js/LICENSE',`${output}/vendor/pixi.js-LICENSE.txt`);
await writeFile(`${output}/.nojekyll`,'');
console.log(`Built GitHub Pages app in ${output} (browser storage; no server or account required).`);

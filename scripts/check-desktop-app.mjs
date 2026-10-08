// The desktop/Android app (desktop/): its Tauri project wraps the offline Pages build, and the save is mirrored to a
// file so it survives the WebView's storage being cleared. Native builds run on GitHub Actions (.github/workflows/app.yml).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import {indexedDB} from 'fake-indexeddb';
import worker from '../_site/local-api.js';
import migrations from '../_site/local-schema.js';
import {createStorage} from '../_site/sqlite-store.js';

// 1. The Tauri project serves the Pages build and registers the save-file commands.
const conf=JSON.parse(fs.readFileSync('desktop/src-tauri/tauri.conf.json','utf8'));
assert.equal(conf.build.frontendDist,'../../_site');assert.equal(conf.build.beforeBuildCommand.script,'node scripts/build-pages.mjs');
assert.equal(conf.identifier,'com.fateforge.game');assert.equal(conf.app.withGlobalTauri,true,'the pages call the save commands through window.__TAURI__');
assert.equal(conf.app.windows[0].url,'index.html');assert(fs.existsSync('_site/index.html'));
for(const icon of conf.bundle.icon)assert(fs.existsSync('desktop/src-tauri/'+icon),icon);
for(const icon of ['mipmap-mdpi/ic_launcher.png','mipmap-xxxhdpi/ic_launcher_round.png'])assert(fs.existsSync('desktop/src-tauri/icons/android/'+icon),icon);
const lib=fs.readFileSync('desktop/src-tauri/src/lib.rs','utf8');assert.match(lib,/generate_handler!\[save_read, save_write, save_location\]/);assert.match(lib,/mobile_entry_point/);
const pinned=JSON.parse(fs.readFileSync('desktop/package.json','utf8')).devDependencies['@tauri-apps/cli'];assert.match(pinned,/^2\.\d+\.\d+$/,'the Tauri CLI is pinned');
const workflow=fs.readFileSync('.github/workflows/app.yml','utf8');for(const needle of ['windows-latest','tauri build','android build','upload-artifact'])assert(workflow.includes(needle),needle);
// The app pages read the mirror only when Tauri is present; the Pages site keeps working without it.
assert.match(fs.readFileSync('_site/local-storage.js','utf8'),/__TAURI__\?\.core\?\.invoke/);

// 2. The save mirror: every save refreshes the file copy, and an empty browser store is restored from it.
const SQL=await initSqlJs();let file=null,saves=0;
const mirror={async load(){return file;},async save(bytes){saves++;file=new Uint8Array(bytes);}};
const call=async(storage,path,method='GET',body)=>{const r=await storage.fetch('/api/'+path,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
const first=createStorage({SQL,migrations,worker,indexedDB,databaseName:'desktop-a',mirror});
assert.equal((await call(first,'characters/bulk-generate','POST',{ids:[crypto.randomUUID(),crypto.randomUUID()]})).status,200);
await new Promise(r=>setTimeout(r,20));assert(saves>=1&&file?.length,'saving writes the file copy');
// A fresh WebView store (another database name) starts from the file.
const restored=createStorage({SQL,migrations,worker,indexedDB,databaseName:'desktop-b',mirror});
assert.equal((await call(restored,'characters')).characters.length,2,'the save comes back from the file');
// A store that already has data keeps it; the file only seeds an empty store.
const before=file;file=null;const kept=createStorage({SQL,migrations,worker,indexedDB,databaseName:'desktop-b',mirror});assert.equal((await call(kept,'characters')).characters.length,2);file=before;
// A failing file write never breaks a save.
const failing=createStorage({SQL,migrations,worker,indexedDB,databaseName:'desktop-c',mirror:{async load(){return null;},async save(){throw Error('disk full');}}});const warn=console.warn;console.warn=()=>{};
assert.equal((await call(failing,'characters/bulk-generate','POST',{ids:[crypto.randomUUID()]})).status,200);await new Promise(r=>setTimeout(r,20));console.warn=warn;
// Without a mirror (the Pages site) nothing changes.
assert.equal((await call(createStorage({SQL,migrations,worker,indexedDB,databaseName:'desktop-d'}),'characters')).characters.length,0);
console.log('Desktop app: Tauri project wraps the Pages build with icons, save commands and CI builds; the save file mirrors every save, restores an empty store, and never blocks saving.');

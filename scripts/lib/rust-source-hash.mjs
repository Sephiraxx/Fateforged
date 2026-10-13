// A hash of everything the Rust core is built from, so a stale public/fateforge-core.wasm is caught on any machine
// (the wasm bytes themselves embed local paths and differ between machines).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function rustSourceHash(root='core'){
 const files=['Cargo.toml','Cargo.lock'].map(f=>path.join(root,f)).filter(f=>fs.existsSync(f));
 const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.rs'))files.push(p);}};
 walk(path.join(root,'src'));
 const h=createHash('sha256');for(const f of files){h.update(f.split(path.sep).join('/'));h.update('\0');h.update(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'));h.update('\0');}
 return h.digest('hex');
}

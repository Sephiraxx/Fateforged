import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
// Combat 12 is the live 1v1 engine. Team battles fork it; nothing may edit its frozen sources.
// combat-engines.js is listed so a new engine is registered deliberately (re-lock it when adding one).
const lock=JSON.parse(fs.readFileSync('validation/v12-engine-lock.json','utf8')).normalizedSHA256;
for(const [file,expected]of Object.entries(lock))assert.equal(createHash('sha256').update(fs.readFileSync('public/'+file,'utf8').replaceAll('\r\n','\n')).digest('hex'),expected,`Frozen combat 12 dependency changed: ${file}`);
console.log(`Combat 12 lock holds for ${Object.keys(lock).length} files.`);

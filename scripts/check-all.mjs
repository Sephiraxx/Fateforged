import {spawnSync} from 'node:child_process';import fs from 'node:fs';
const files=fs.readdirSync('scripts').filter(f=>/^check-/.test(f)&&/\.(mjs|cjs)$/.test(f)&&f!=='check-all.mjs');
fs.mkdirSync('validation/check-output',{recursive:true});const report=[];
for(const file of files){const started=performance.now(),result=spawnSync(process.execPath,['scripts/'+file],{encoding:'utf8',maxBuffer:8*1024*1024});fs.writeFileSync('validation/check-output/'+file+'.txt',result.stdout+result.stderr);const item={file,passed:result.status===0,seconds:Math.round((performance.now()-started)/100)/10};report.push(item);console.log((item.passed?'PASS':'FAIL')+' '+file+' ('+item.seconds+'s)');if(!item.passed)console.log((result.stdout+result.stderr).slice(-4000));}
fs.writeFileSync('validation/checks.json',JSON.stringify({node:process.version,checks:report},null,2)+'\n');if(report.some(r=>!r.passed))process.exitCode=1;

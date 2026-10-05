import fs from 'node:fs';
import vm from 'node:vm';
import {LEAGUES} from '../public/leagues.js';
import {execFileSync} from 'node:child_process';
const count=Number(process.env.AUDIT_COUNT||10000),seed=123456789;
function sample(code){const c={crypto};vm.createContext(c);vm.runInContext(code+';this.luck=WHEEL_LUCK;',c);vm.runInContext(fs.readFileSync('public/data.js','utf8')+';this.pools=WHEEL_DATA;',c);const rows={};for(const rarity of ['mixed',...c.luck.tiers.map(t=>t.id)]){const rand=LEAGUES.rng(seed),draw=n=>Math.floor(rand()*n),tiers=Object.fromEntries(['E','D','C','B','A','S','SS'].map(t=>[t,0]));let totalSum=0;for(let i=0;i<count;i++){const r=c.luck.rollTraits(c.pools,draw,rarity==='mixed'?undefined:rarity),stats=[0,0,0,0,0];for(const [id,name]of Object.entries(r.traits)){if(/^no (second )?power$/i.test(name))continue;const list=id==='subrace'?c.pools.subrace[r.traits.race]:id==='subclass'?c.pools.subclass[r.traits.class]:c.pools.base[id];list.find(o=>o.name===name).stats.forEach((v,k)=>stats[k]+=v);}const total=stats.reduce((sum,v)=>sum+Math.max(0,v),0),tier=total>=3000?'SS':total>=2100?'S':total>=1500?'A':total>=1000?'B':total>=650?'C':total>=350?'D':'E';tiers[tier]++;totalSum+=total;}rows[rarity]={...tiers,mean:Math.round(totalSum/count)};}return rows;}
const baselineCommit='8d34194521a7239239417bcb78d4276b31d12911';
const baseline=execFileSync('git',['-c','safe.directory=F:/Fateforged/upstream','show',baselineCommit+':public/luck.js'],{encoding:'utf8'}).replace('function rollTraits(pools,draw=randomIndex){const wheelRarity=roll(draw)','function rollTraits(pools,draw=randomIndex,forcedRarity){const wheelRarity=forcedRarity??roll(draw)');
const before=sample(baseline),after=sample(fs.readFileSync('public/luck.js','utf8'));
console.log(JSON.stringify({baselineCommit,seed,countPerRow:count,before,after},null,2));
fs.mkdirSync('validation',{recursive:true});fs.writeFileSync('validation/generation-audit.json',JSON.stringify({baselineCommit,seed,countPerRow:count,before,after},null,2)+'\n');

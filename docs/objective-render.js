// The renderer reads simulation state; it never advances or changes the battle.
import {PLAN_LABELS} from './combat-team-v3-5.js';
export function drawCores(ctx,b){
 for(const c of b.cores){const color=c.team?'#ff5a6a':'#3ee0ff';ctx.save();ctx.strokeStyle=color;ctx.fillStyle=c.hitFlash>0?'#fff':color;ctx.globalAlpha=.12;ctx.beginPath();ctx.arc(c.x,c.y,160,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.lineWidth=5;ctx.beginPath();ctx.arc(c.x,c.y,39,-Math.PI/2,-Math.PI/2+Math.PI*2*c.hp/c.maxHp);ctx.stroke();ctx.beginPath();ctx.moveTo(c.x,c.y-28);ctx.lineTo(c.x+19,c.y);ctx.lineTo(c.x,c.y+28);ctx.lineTo(c.x-19,c.y);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
 if(!b.titan)return;const t=b.titan;ctx.save();ctx.strokeStyle='#f4c96b55';ctx.lineWidth=2;ctx.beginPath();ctx.arc(640,300,110,0,Math.PI*2);ctx.stroke();
 if(t.hp>0){if(b.slamAt!=null){ctx.fillStyle='#ff784a';ctx.globalAlpha=.2+.2*(1-Math.max(0,(b.slamAt-b.time)/.8));ctx.beginPath();ctx.arc(t.x,t.y,90,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#ff784a';ctx.stroke();}if(b.fissure)drawFissure(ctx,b);ctx.fillStyle=t.hitFlash>0?'#fff':'#806047';ctx.strokeStyle='#f4c96b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#171621';ctx.fillRect(t.x-35,t.y-49,70,6);ctx.fillStyle='#f4c96b';ctx.fillRect(t.x-35,t.y-49,70*t.hp/t.maxHp,6);}
 for(const f of b.fighters)if(f.hp>0&&!f.isObjective&&b.empowered(f)){ctx.strokeStyle='#ffc45c';ctx.lineWidth=f.forgeShield>0?3:1;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(f.x,f.y,(f.radius??9)+7,0,Math.PI*2);ctx.stroke();}ctx.restore();
}
// Fissure telegraph (team-3.7): a red line that fills from the Titan outward until it splits.
function drawFissure(ctx,b){const z=b.fissure,k=Math.min(1,Math.max(0,(b.time-z.start)/((z.at-z.start)||1)));ctx.save();ctx.translate(z.x,z.y);ctx.rotate(z.angle);ctx.fillStyle='#ff3b2f';ctx.globalAlpha=.12+.25*k;ctx.fillRect(0,-z.width/2,z.length,z.width);ctx.globalAlpha=.85;ctx.strokeStyle='#ff784a';ctx.lineWidth=2;ctx.strokeRect(0,-z.width/2,z.length,z.width);ctx.strokeStyle='#ffc45c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(z.length*k,0);ctx.stroke();ctx.restore();}
// Molten Hurl projectiles thrown by the Titan.
export function drawMolten(ctx,p){ctx.save();ctx.strokeStyle='#ff7a2a';ctx.globalAlpha=.5;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.06,p.y-p.vy*.06);ctx.stroke();ctx.globalAlpha=.35;ctx.fillStyle='#ffb347';ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ff6a1a';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.restore();}
// Labels are drawn upright in screen space (the field turns to portrait on phones).
export function drawObjectiveLabels(ctx,b,toScreen){const t=b.titan;if(!t||t.hp<=0)return;const [x,cy]=toScreen(t.x,t.y),y=cy-t.radius-22;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.font=`700 ${Math.round(Math.max(ctx.canvas.width,ctx.canvas.height)/64)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#05070dcc';ctx.strokeText('FORGE TITAN',x,y);ctx.fillStyle='#f4c96b';ctx.fillText('FORGE TITAN',x,y);ctx.restore();}
// Always three short lines (Cores · Titan and Forgefire · team plans), so the box never changes height.
export function objectiveStatus(b){
 const hp=c=>`${Math.ceil(c.hp/c.maxHp*100)}%${b.guardCount(c)>=2?' (guarded)':''}`,lines=[`Blue Core ${hp(b.cores[0])}  ·  Red Core ${hp(b.cores[1])}`],second=[];
 if(b.suddenDeath)second.push('Sudden death');
 if(b.titan){
  second.push(b.titan.hp>0?`Titan ${Math.ceil(b.titan.hp/b.titan.maxHp*100)}%${b.slamAt!=null?' · Slam!':''}${b.fissure?' · Fissure!':''}`:`Titan in ${Math.max(0,Math.ceil(b.nextTitan-b.time))}s`);
  const death=b.titanDeaths.at(-1);if(death&&b.time-death.time<6)second.push(`${death.team?'Red':'Blue'} ${death.stolen?'steals':'claims'} Forgefire!`);
  else for(const team of [0,1])if(b.hasForgefire(team))second.push(`${team?'Red':'Blue'} Forgefire ${Math.ceil(b.forgefireUntil[team]-b.time)}s`);
 }else if(!b.suddenDeath)second.push('Destroy the enemy Core');
 lines.push(second.join('  ·  '),b.brain&&!b.done?`Blue: ${PLAN_LABELS[b.brain[0].plan]}  ·  Red: ${PLAN_LABELS[b.brain[1].plan]}`:'');
 return lines.join('\n');
}

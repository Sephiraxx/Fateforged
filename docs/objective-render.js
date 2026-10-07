// The renderer reads simulation state; it never advances or changes the battle.
export function drawCores(ctx,b){
 for(const c of b.cores){const color=c.team?'#ff5a6a':'#3ee0ff';ctx.save();ctx.strokeStyle=color;ctx.fillStyle=c.hitFlash>0?'#fff':color;ctx.globalAlpha=.12;ctx.beginPath();ctx.arc(c.x,c.y,160,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.lineWidth=5;ctx.beginPath();ctx.arc(c.x,c.y,39,-Math.PI/2,-Math.PI/2+Math.PI*2*c.hp/c.maxHp);ctx.stroke();ctx.beginPath();ctx.moveTo(c.x,c.y-28);ctx.lineTo(c.x+19,c.y);ctx.lineTo(c.x,c.y+28);ctx.lineTo(c.x-19,c.y);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
}
export function objectiveStatus(b){const hp=c=>`${Math.ceil(c.hp/c.maxHp*100)}%${b.guardCount(c)>=2?' · Guarded':''}`;return `Blue Core ${hp(b.cores[0])}  |  Red Core ${hp(b.cores[1])}  ·  ${b.suddenDeath?'Sudden death · no respawns':'Destroy the enemy Core'}`;}

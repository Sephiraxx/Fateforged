// Team-only abilities; separate from the frozen duel wheel catalog.
export const TEAM_KITS=Object.freeze(Object.fromEntries([
 ['mendingWave','Mending wave','healing',14,9,.45,'Heals nearby allies for 75% spell power.'],
 ['chainHeal','Chain heal','healing',16,10,.5,'Heals up to three hurt allies, with weaker bounces.'],
 ['resurrection','Resurrection','healing',25,60,3,'Revives one downed ally at 40% health. Once per caster and recipient each game; interruptible channel.'],
 ['cleanse','Cleanse','healing',12,10,.25,'Removes control and damage over time from an ally; grants control immunity.'],
 ['barrier','Barrier','healing',18,12,.5,'Nearby allies gain a four-second ward that blocks one hit.'],
 ['stunBolt','Stun bolt','control',14,11,.35,'A projectile stuns one enemy for 1.2 seconds.'],
 ['hamstring','Hamstring','control',10,9,.25,'Slows a nearby enemy for four seconds.'],
 ['disarmShot','Disarm shot','control',14,12,.35,'A projectile disarms one enemy for 2.4 seconds.'],
 ['tauntShout','Taunt shout','control',12,12,.3,'Nearby enemies must target the caster for two seconds.'],
 ['knockUp','Knock-up','control',14,11,.4,'Lifts nearby enemies, briefly interrupting them.']
].map(([id,name,group,cost,cooldown,windup,description])=>[id,Object.freeze({id,name,group,cost,cooldown,windup,description})])));
export const KIT_WEIGHTS=Object.freeze({tank:{tauntShout:5,barrier:3,knockUp:3,hamstring:2,cleanse:1},healer:{mendingWave:4,chainHeal:4,resurrection:2,cleanse:3,barrier:3},controller:{stunBolt:4,knockUp:3,disarmShot:3,hamstring:2,cleanse:1},damage:{hamstring:3,disarmShot:3,stunBolt:2,barrier:1}});
export function teamKit(id){return TEAM_KITS[id]??null;}
export function rollTeamKit(role,random){const entries=Object.entries(KIT_WEIGHTS[role]??KIT_WEIGHTS.damage);let n=random()*entries.reduce((a,[,w])=>a+w,0);for(const [id,w]of entries){n-=w;if(n<0)return id;}return entries[0][0];}

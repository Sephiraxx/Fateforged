// Generation 4 extends the two ordinary ability wheels. The v3 catalog remains
// untouched so saved combat engines still resolve their original abilities.
if(!globalThis.CURRENT_CLASS_ABILITIES){
 const legacy=globalThis.CLASS_ABILITIES;
 if(!legacy)throw Error('Load the class catalog before support abilities.');
 const rows=[
  ['mendingWave','Mending wave','healing','spell','Uncommon',14,9,.45,[0,0,8,8,20],['healing','nature','holy'],'Heals nearby allies for 75% spell strength.'],
  ['chainHeal','Chain heal','healing','spell','Rare',16,10,.5,[0,0,15,20,60],['healing','nature','holy'],'Heals up to three injured allies, with weaker bounces.'],
  ['resurrection','Resurrection','healing','spell','Legendary',25,60,3,[0,0,35,45,160],['healing','spirit','holy'],'Revives one downed ally at 40% health. Once per caster and recipient per game; the channel can be interrupted.'],
  ['cleanse','Cleanse','healing','spell','Uncommon',12,10,.25,[0,0,5,15,16],['healing','holy','spirit'],'Removes control and damage over time from an ally and briefly protects against control.'],
  ['barrier','Barrier','healing','spell','Uncommon',18,12,.5,[0,0,20,5,11],['healing','defense','shield'],'Nearby allies receive a four-second ward that blocks one hit.'],
  ['stunBolt','Stun bolt','control','spell','Uncommon',14,11,.35,[0,4,0,12,20],['control','mind','arcane'],'A projectile briefly stuns one enemy. Damage does not end the stun.'],
  ['hamstring','Hamstring','control','technique','Common',10,9,.25,[2,3,0,5,0],['control','strike','melee'],'Slows a nearby enemy for four seconds. Requires a melee weapon.'],
  ['disarmShot','Disarm shot','control','technique','Uncommon',14,12,.35,[5,20,0,25,0],['control','ranged'],'A physical projectile disarms one enemy for 2.4 seconds. Requires a ranged weapon.'],
  ['tauntShout','Taunt shout','control','technique','Uncommon',12,12,.3,[0,5,30,15,0],['control','defense','shield'],'Nearby enemies must target the caster for two seconds.'],
  ['knockUp','Knock-up','control','technique','Rare',14,11,.4,[25,15,20,40,0],['control','strike','melee'],'Briefly lifts and interrupts nearby enemies. Requires a melee weapon.']
 ];
 const support=Object.fromEntries(rows.map(([id,name,group,kind,rarity,cost,cooldown,windup,stats,tags,description])=>[name,Object.freeze({id,name,group,kind,rarity,cost,cooldown,windup,stats:Object.freeze(stats),tags:Object.freeze(tags),description,voice:kind==='spell',sprite:group==='healing'?12:10})]));
 Object.setPrototypeOf(support,null);
 const definition=name=>support[name]||Object.values(support).find(a=>a.name.toLowerCase()===String(name).trim().toLowerCase())||legacy.definition(name);
 const compatible=(a,weapon)=>a.id==='disarmShot'?legacy.weaponType(weapon)==='ranged':['hamstring','knockUp'].includes(a.id)?legacy.weaponType(weapon)==='melee':legacy.compatible(a,weapon);
 globalThis.SUPPORT_ABILITIES=Object.freeze(support);
 globalThis.CURRENT_CLASS_ABILITIES=Object.freeze({...legacy,version:2,abilities:Object.freeze(Object.assign(Object.create(null),legacy.abilities,support)),definition,abilityId:name=>definition(name)?.id??legacy.abilityId(name),compatible});
 globalThis.supportPools=pools=>({...pools,base:{...pools.base,...Object.fromEntries(['power','power2'].map(slot=>[slot,[...pools.base[slot],...Object.values(support).filter(a=>!pools.base[slot].some(o=>o.name===a.name)).map(a=>({name:a.name,stats:[...a.stats],weight:{Common:20,Uncommon:6,Rare:3,Legendary:1}[a.rarity]}))]]))}});
}

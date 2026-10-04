const ARENA_THEMES=['Ashen Crown','Moonfall','Iron Fang','Crimson Eclipse','Stormbound','Obsidian Gate','Celestial Rift','Frostfire','Twilight Blade','Dragonheart','Silver Tempest','Emerald Throne','Voidborn','Emberfall','Wild Hunt','Crystal Dawn','Thunderforge','Shadowspire','Golden Phoenix','Runestone','Bloodmoon','Starfall','Winter Warden','Shattered Realm'];
const ARENA_EVENTS=['Cup','Clash','Championship','Trials','Tournament','Grand Prix','Gauntlet','Open'];
export function uniqueTournamentName(requested,usedNames=[]){
 const used=new Set(usedNames.map(name=>name.trim().toLowerCase()));let base=requested.trim()||'Fateforge Cup';
 if(!used.has(base.toLowerCase()))return base;
 const numbered=/^(.*) (\d+)$/.exec(base);if(numbered&&used.has(numbered[1].toLowerCase()))base=numbered[1];
 for(let n=2;;n++){const suffix=' '+n,candidate=base.slice(0,100-suffix.length)+suffix;if(!used.has(candidate.toLowerCase()))return candidate;}
}
export function randomTournamentName(usedNames=[],randomIndex=n=>{const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}){
 return uniqueTournamentName(ARENA_THEMES[randomIndex(ARENA_THEMES.length)]+' '+ARENA_EVENTS[randomIndex(ARENA_EVENTS.length)],usedNames);
}

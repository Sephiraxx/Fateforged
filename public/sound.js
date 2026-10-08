// Retro sound for the arena, generated with the Web Audio API: effects for the cues in sound-model.js and a small
// chiptune loop while a fight runs. Any cue (or the music) with a file in public/sounds/ plays that file instead
// (sound-manifest.js, written by the builds). It only listens to the fight; nothing here writes to a battle.
import {createCueTracker,musicPlan,SOUND_NAMES} from './sound-model.js';
import {SOUND_MANIFEST} from './sound-manifest.js';
const MAX_VOICES=24;
export function soundUrls(manifest,base){const out={};for(const name of SOUND_NAMES)if(typeof manifest?.[name]==='string')out[name]=new URL('sounds/'+manifest[name],base).href;return out;}
export function createSound({stored=()=>null,store=()=>{}}={}){
 const settings={enabled:stored('fateforge-sound','on')!=='off',effects:clampVolume(stored('fateforge-sound-effects','70')),music:clampVolume(stored('fateforge-sound-music','35'))};
 const tracker=createCueTracker(),files=soundUrls(SOUND_MANIFEST,import.meta.url),buffers={};
 let ctx=null,master=null,sfx=null,musicBus=null,noise=null,voices=0,music=null,fight=null;
 function clampVolume(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;}
 // Browsers only allow audio after the player interacts with the page.
 function unlock(){
  const AC=globalThis.AudioContext??globalThis.webkitAudioContext;if(!AC)return false;
  if(!ctx){ctx=new AC();master=ctx.createDynamicsCompressor();master.threshold.value=-14;master.ratio.value=6;master.connect(ctx.destination);
   sfx=ctx.createGain();musicBus=ctx.createGain();sfx.connect(master);musicBus.connect(master);applyVolume();
   noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=noise.getChannelData(0);let seed=12345;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1103515245)+12345)>>>0;data[i]=seed/2147483648-1;}
   for(const [name,url]of Object.entries(files))fetch(url).then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).then(buf=>{buffers[name]=buf;}).catch(()=>{});}
  if(ctx.state==='suspended'&&settings.enabled)ctx.resume().catch(()=>{});return true;
 }
 function applyVolume(){if(!ctx)return;const on=settings.enabled?1:0,t=ctx.currentTime;sfx.gain.setTargetAtTime(on*(settings.effects/100)**1.5*.9,t,.02);musicBus.gain.setTargetAtTime(on*(settings.music/100)**1.5*.5,t,.05);}
 // --- Building blocks ---
 function out(pan,bus=sfx){if(!ctx.createStereoPanner)return bus;const panner=ctx.createStereoPanner();panner.pan.value=pan??0;panner.connect(bus);return panner;}
 function tone({type='square',freq=440,to=null,dur=.12,vol=.3,attack=.004,pan=0,when=0,bus=sfx,detune=0}){
  if(voices>=MAX_VOICES)return;const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);o.detune.value=detune;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(out(pan,bus));voices++;o.onended=()=>voices--;o.start(t);o.stop(t+dur+.02);
 }
 function hiss({dur=.1,vol=.3,filter='bandpass',freq=2000,to=null,q=1,pan=0,when=0,bus=sfx}){
  if(voices>=MAX_VOICES)return;const t=ctx.currentTime+when,s=ctx.createBufferSource(),bq=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;bq.type=filter;bq.frequency.setValueAtTime(freq,t);if(to)bq.frequency.exponentialRampToValueAtTime(to,t+dur);bq.Q.value=q;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(bq).connect(g).connect(out(pan,bus));voices++;s.onended=()=>voices--;s.start(t,Math.random()*.5);s.stop(t+dur+.02);
 }
 function sample(name,pan,vol=1){const buf=buffers[name];if(!buf||voices>=MAX_VOICES)return false;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;g.gain.value=vol;s.connect(g).connect(out(pan));voices++;s.onended=()=>voices--;s.start();return true;}
 const note=n=>440*2**((n-69)/12);
 // --- Effects, one per cue ---
 const ELEMENT_NOTES=[[64,40],[88,76],[96,52],[45,33],[84,91],[60,67],[72,60]];
 const effects={
  hit:c=>{hiss({dur:.07,vol:.35*c.strength,freq:1800,q:.8,pan:c.pan});tone({type:'square',freq:180,to:90,dur:.06,vol:.12*c.strength,pan:c.pan});},
  bigHit:c=>{hiss({dur:.14,vol:.5*c.strength,freq:900,to:300,q:.7,pan:c.pan});tone({type:'square',freq:140,to:50,dur:.14,vol:.22*c.strength,pan:c.pan});},
  heal:c=>{for(const [i,n]of [72,76,79].entries())tone({type:'triangle',freq:note(n),dur:.16,vol:.12,when:i*.05,pan:c.pan});},
  death:c=>{tone({type:'square',freq:330,to:55,dur:.45,vol:.22,pan:c.pan});hiss({dur:.25,vol:.18,filter:'lowpass',freq:1200,to:200,pan:c.pan});},
  revive:c=>{for(const [i,n]of [60,64,67,72,76].entries())tone({type:'triangle',freq:note(n),dur:.18,vol:.14,when:i*.06,pan:c.pan});},
  respawn:c=>{tone({type:'triangle',freq:note(60),to:note(72),dur:.25,vol:.1,pan:c.pan});},
  swing:c=>{hiss({dur:.09,vol:.22,filter:'bandpass',freq:700,to:2600,q:2,pan:c.pan});},
  shot:c=>{tone({type:'triangle',freq:900,to:300,dur:.08,vol:.14,pan:c.pan});hiss({dur:.05,vol:.1,freq:3000,pan:c.pan});},
  gunshot:c=>{hiss({dur:.18,vol:.45,filter:'lowpass',freq:2500,to:300,pan:c.pan});tone({type:'square',freq:120,to:40,dur:.1,vol:.2,pan:c.pan});},
  cast:c=>{const [a,b]=ELEMENT_NOTES[c.element??6];tone({type:'sawtooth',freq:note(a),to:note(b),dur:.2,vol:.1,pan:c.pan});tone({type:'square',freq:note(a+12),to:note(b+12),dur:.16,vol:.05,pan:c.pan,detune:8});},
  kit:c=>{tone({type:'square',freq:note(67),dur:.07,vol:.1,pan:c.pan});tone({type:'square',freq:note(74),dur:.1,vol:.1,when:.06,pan:c.pan});},
  dodge:c=>{hiss({dur:.12,vol:.15,filter:'highpass',freq:2000,to:5000,pan:c.pan});},
  parry:c=>{tone({type:'square',freq:1400,to:1100,dur:.12,vol:.12,pan:c.pan});tone({type:'square',freq:2100,dur:.06,vol:.06,pan:c.pan});},
  block:c=>{tone({type:'sine',freq:600,to:900,dur:.15,vol:.14,pan:c.pan});},
  coreHit:c=>{tone({type:'triangle',freq:note(88),to:note(76),dur:.18,vol:.18*c.strength,pan:c.pan});hiss({dur:.12,vol:.22*c.strength,freq:5000,q:3,pan:c.pan});},
  coreDestroyed:c=>{tone({type:'square',freq:220,to:30,dur:1.1,vol:.3,pan:c.pan});hiss({dur:1,vol:.4,filter:'lowpass',freq:3000,to:100,pan:c.pan});for(let i=0;i<4;i++)tone({type:'triangle',freq:note(88-i*5),dur:.2,vol:.12,when:i*.08,pan:c.pan});},
  titanRise:c=>{tone({type:'sawtooth',freq:40,to:80,dur:1,vol:.25,attack:.3,pan:c.pan});tone({type:'square',freq:note(45),dur:.5,vol:.1,when:.5,pan:c.pan});tone({type:'square',freq:note(52),dur:.6,vol:.1,when:.7,pan:c.pan});},
  slamCharge:c=>{tone({type:'sawtooth',freq:60,to:140,dur:.75,vol:.12,attack:.5,pan:c.pan});},
  slam:c=>{tone({type:'sine',freq:90,to:30,dur:.5,vol:.55,pan:c.pan});hiss({dur:.4,vol:.4,filter:'lowpass',freq:900,to:120,pan:c.pan});},
  fissureCharge:c=>{hiss({dur:1,vol:.25,filter:'lowpass',freq:120,to:600,q:4,pan:c.pan});tone({type:'sawtooth',freq:45,to:70,dur:1,vol:.12,attack:.6,pan:c.pan});},
  fissure:c=>{hiss({dur:.5,vol:.55,filter:'bandpass',freq:1600,to:180,q:.6,pan:c.pan});tone({type:'square',freq:110,to:35,dur:.4,vol:.3,pan:c.pan});},
  molten:c=>{hiss({dur:.35,vol:.25,filter:'bandpass',freq:400,to:1400,q:1.5,pan:c.pan});tone({type:'sawtooth',freq:90,to:60,dur:.3,vol:.08,pan:c.pan});},
  forgefire:c=>{for(const [i,n]of [60,64,67,72,67,72,76].entries())tone({type:'square',freq:note(n),dur:i===6?.4:.12,vol:.13,when:i*.09,pan:c.pan});},
  steal:c=>{for(const [i,n]of [72,71,67,72,79].entries())tone({type:'square',freq:note(n),dur:i===4?.35:.08,vol:.14,when:i*.07,pan:c.pan});},
  suddenDeath:()=>{for(let i=0;i<3;i++){tone({type:'square',freq:note(81),dur:.14,vol:.14,when:i*.32});tone({type:'square',freq:note(76),dur:.14,vol:.14,when:i*.32+.16});}},
  victory:()=>{const line=[[67,.12],[72,.12],[76,.12],[79,.24],[76,.12],[79,.5]];let t=0;for(const [n,d]of line){tone({type:'square',freq:note(n),dur:d,vol:.15,when:t});tone({type:'triangle',freq:note(n-12),dur:d,vol:.12,when:t});t+=d*.9;}},
  click:()=>{tone({type:'square',freq:1200,to:900,dur:.03,vol:.05});}
 };
 function play(cue){if(!ctx||!settings.enabled||ctx.state!=='running')return;if(sample(cue.name,cue.pan,cue.strength??1))return;effects[cue.name]?.(cue);}
 // --- Battle music: bass, arpeggio and drums on a 16-step grid, scheduled slightly ahead of the audio clock ---
 function startMusic(seed,sudden){stopMusic();if(!ctx)return;const plan=musicPlan(seed,sudden),file=buffers[sudden&&buffers['music-sudden-death']?'music-sudden-death':'music-battle'];
  if(file){const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=file;s.loop=true;g.gain.value=1;s.connect(g).connect(musicBus);s.start();music={file:s,gain:g,sudden};return;}
  music={plan,step:0,next:ctx.currentTime+.1,sudden};}
 function stopMusic(fade=.4){if(!music)return;if(music.file&&ctx){const t=ctx.currentTime;music.gain.gain.setTargetAtTime(0,t,fade/3);music.file.stop(t+fade);}music=null;}
 function scheduleMusic(){
  if(!music||music.file||!ctx)return;const {plan}=music,step=60/plan.tempo/4;
  while(music.next<ctx.currentTime+.25){
   const i=music.step,t=music.next-ctx.currentTime,bar=Math.floor(i/16)%4,root=plan.root+plan.progression[bar],beat=i%16;
   if(beat%4===0)tone({type:'triangle',freq:note(root),dur:step*3,vol:.5,when:t,bus:musicBus});
   if(beat%4===2&&plan.pattern)tone({type:'triangle',freq:note(root+12),dur:step,vol:.3,when:t,bus:musicBus});
   const arp=[0,3,7,12,7,3][beat%6]+(bar%2?0:12);tone({type:'square',freq:note(root+24+arp),dur:step*.8,vol:.08,when:t,bus:musicBus});
   if(beat%8===0)tone({type:'sine',freq:120,to:45,dur:.12,vol:.45,when:t,bus:musicBus});
   if(beat%8===4)hiss({dur:.08,vol:.18,freq:1800,q:.7,when:t,bus:musicBus});
   if(beat%2===1)hiss({dur:.03,vol:.06,filter:'highpass',freq:7000,when:t,bus:musicBus});
   music.step++;music.next+=step;
  }
 }
 // Called every animation frame by the arena.
 function update(b,{paused=false,speed=1}={}){
  if(!ctx)return;
  if(paused||document.hidden){if(ctx.state==='running')ctx.suspend().catch(()=>{});return;}
  if(settings.enabled&&ctx.state==='suspended')ctx.resume().catch(()=>{});
  if(b!==fight){fight=b;stopMusic(.2);if(b&&!b.done)startMusic(b.seed??0,!!b.suddenDeath);}
  for(const cue of tracker.read(b,{speed,now:performance.now()}))play(cue);
  if(b&&music&&!!b.suddenDeath!==music.sudden&&!b.done)startMusic(b.seed??0,true);
  if(b?.done&&music)stopMusic(.6);
  if(settings.enabled&&settings.music>0)scheduleMusic();else if(music&&!music.file)music.next=ctx.currentTime+.05;
 }
 function set(key,value){
  if(key==='enabled'){settings.enabled=!!value;store('fateforge-sound',value?'on':'off');if(value)unlock();}
  else{settings[key]=clampVolume(value);store('fateforge-sound-'+key,String(settings[key]));}
  applyVolume();
 }
 return {settings,unlock,update,set,play:name=>play({name,pan:0,strength:1}),get state(){return ctx?.state??'locked';},get voices(){return voices;}};
}

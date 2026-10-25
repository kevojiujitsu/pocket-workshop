// Original synthesized workshop music and effects; no external audio or tracking.
const STORAGE='pocket-workshop-audio-v1';
export function readAudioSettings(storage){
 try{const value=JSON.parse(storage.getItem(STORAGE)||'{}');return {music:value.music!==false,sounds:value.sounds!==false};}
 catch{return {music:true,sounds:true};}
}
export function createWorkshopAudio(){
 const settings=readAudioSettings(globalThis.localStorage);
 let context,musicBus,effectsBus,timer,nextBeat=0,beat=0,started=false;
 const notes=[62,null,69,66,null,74,69,null,64,null,71,67,null,76,71,null,66,null,73,69,null,78,73,null,64,null,71,67,null,69,66,null];
 const frequency=midi=>440*2**((midi-69)/12);
 function tone(midi,time,length,volume,bus,type='sine'){
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type=type;oscillator.frequency.value=frequency(midi);
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,time+length);
  oscillator.connect(gain);gain.connect(bus);oscillator.start(time);oscillator.stop(time+length+.02);
 }
 function schedule(){
  if(!context||context.state!=='running'||document.hidden)return;
  if(nextBeat<context.currentTime)nextBeat=context.currentTime+.06;
  while(nextBeat<context.currentTime+.2){
   if(settings.music){
    const note=notes[beat%notes.length];
    if(note!==null)tone(note,nextBeat,1.7,.065,musicBus,'triangle');
    if(beat%8===0){const chord=[[50,57,62],[52,59,64],[54,61,66],[55,62,67]][Math.floor(beat/8)%4];for(const n of chord)tone(n,nextBeat,4.8,.026,musicBus);}
   }
   beat++;nextBeat+=.55;
  }
 }
 function volumes(){
  if(!context)return;
  musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setTargetAtTime(settings.music? .55:0,context.currentTime,.045);
  effectsBus.gain.cancelScheduledValues(context.currentTime);effectsBus.gain.setTargetAtTime(settings.sounds? .5:0,context.currentTime,.02);
 }
 async function unlock(){
  if(document.hidden)return;
  try{
   if(!context){const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return;context=new AudioContext();musicBus=context.createGain();effectsBus=context.createGain();musicBus.connect(context.destination);effectsBus.connect(context.destination);volumes();}
   if(context.state==='suspended')await context.resume();
   if(context.state!=='running')return;
   started=true;
   if(!timer){nextBeat=context.currentTime+.08;timer=setInterval(schedule,100);schedule();}
  }catch{/* Audio unavailable: the puzzle remains playable. */}
 }
 function save(){try{localStorage.setItem(STORAGE,JSON.stringify(settings));}catch{}}
 function set(kind,value){if(!['music','sounds'].includes(kind))return;settings[kind]=!!value;save();volumes();if(settings[kind])void unlock();}
 function slide(distance=1){
  if(!settings.sounds||!context||context.state!=='running'||document.hidden)return;
  const time=context.currentTime,length=Math.min(.2,.07+distance*.025),buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=850;
  gain.gain.setValueAtTime(.15,time);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
  source.connect(filter);filter.connect(gain);gain.connect(effectsBus);source.start(time);source.stop(time+length);
  tone(57,time+length*.45,.1,.075,effectsBus);
 }
 function celebrate(){if(!settings.sounds||!context||context.state!=='running'||document.hidden)return;[62,66,69,74].forEach((n,i)=>tone(n,context.currentTime+i*.12,.8,.09,effectsBus));}
 function pause(){if(timer){clearInterval(timer);timer=null;}if(context?.state==='running')void context.suspend().catch(()=>{});}
 document.addEventListener('pointerdown',()=>void unlock(),{passive:true});
 document.addEventListener('keydown',()=>void unlock());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(started)void unlock();});
 window.addEventListener('pagehide',pause);
 window.addEventListener('pageshow',()=>{if(started)void unlock();});
 return {settings,set,slide,celebrate};
}

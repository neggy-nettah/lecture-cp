const fs=require("fs");
const vm=require("vm");
const assert=require("node:assert/strict");

const app=fs.readFileSync("app.js","utf8");
const start=app.indexOf("let speechVoiceCache=");
const end=app.indexOf("function tone(",start);
if(start<0||end<0)throw new Error("Audio engine block not found in app.js");
const audioSource=app.slice(start,end);

let voices=[];
let spoken=[];
let cancelCount=0;
let resumeCount=0;
let toastMessages=[];
let timerId=0;
const timers=new Map();
const listeners=new Map();

class Utterance{
 constructor(text){
  this.text=text;
  this.lang="";
  this.rate=1;
  this.pitch=1;
  this.volume=1;
  this.voice=null;
  this.onend=null;
  this.onerror=null;
 }
}

const synth={
 speaking:false,
 pending:false,
 getVoices:()=>voices,
 addEventListener:(type,fn)=>{
  const set=listeners.get(type)||new Set();
  set.add(fn);listeners.set(type,set)
 },
 removeEventListener:(type,fn)=>listeners.get(type)?.delete(fn),
 speak:u=>spoken.push(u),
 cancel:()=>{cancelCount++},
 resume:()=>{resumeCount++}
};

const sandbox={
 window:{speechSynthesis:synth},
 speechSynthesis:synth,
 SpeechSynthesisUtterance:Utterance,
 toast:message=>toastMessages.push(message),
 setTimeout:(fn)=>{const id=++timerId;timers.set(id,fn);return id},
 clearTimeout:id=>timers.delete(id),
 console
};
const context=vm.createContext(sandbox);
vm.runInContext(audioSource,context,{filename:"audio-engine-from-app.js"});

const runTimers=()=>{
 const pending=[...timers.entries()];
 timers.clear();
 for(const [,fn] of pending)fn();
};
const emit=type=>{for(const fn of [...(listeners.get(type)||[])])fn()};

vm.runInContext('speak("bonjour",.7)',context);
assert.equal(spoken.length,0,"speech should wait while the voice list is empty");
assert.equal((listeners.get("voiceschanged")||new Set()).size,1,"voice readiness listener should be installed");

voices=[{name:"Amélie",lang:"fr-FR",default:true}];
emit("voiceschanged");
assert.equal(spoken.length,1,"speech should start once voices become available");
assert.equal(spoken[0].voice?.name,"Amélie","French voice should be assigned explicitly");
assert.equal(spoken[0].lang,"fr-FR");
assert.equal(resumeCount,1,"speech engine should be resumed before playback");

voices=[{name:"System default",lang:"en-US",default:true}];
vm.runInContext('speechVoiceCache=[];speak("test",.8)',context);
assert.equal(spoken.length,2,"a non-French default voice should remain a usable fallback");
assert.equal(spoken[1].voice?.name,"System default");

synth.speaking=true;
vm.runInContext('speak("suite",.8)',context);
assert.equal(cancelCount,1,"busy speech should be cancelled once before replacement");
assert.equal(spoken.length,2,"replacement speech should wait briefly after cancellation");
runTimers();
assert.equal(spoken.length,3,"replacement speech should start after the cancellation gap");
synth.speaking=false;

voices=[];
vm.runInContext('speechVoiceCache=[];speak("secours",.8)',context);
assert.equal(spoken.length,3,"empty voice list should wait before falling back");
runTimers();
assert.equal(spoken.length,4,"engines without an exposed voice list should still receive a default utterance");
assert.equal(spoken[3].voice,null);

spoken[3].onerror?.({error:"network"});
assert.equal(toastMessages.length,1,"non-cancelled speech errors should be surfaced to the user");

console.log("Audio engine check OK");
console.log("- waits for voiceschanged when voices are initially empty");
console.log("- explicitly assigns a French voice when available");
console.log("- falls back to the device default voice");
console.log("- avoids unnecessary cancellation while idle");
console.log("- delays replacement speech after cancelling a busy utterance");

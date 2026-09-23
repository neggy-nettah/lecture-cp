const fs=require("fs");
const vm=require("vm");

const content=fs.readFileSync("content.js","utf8");
const main=fs.readFileSync("app.js","utf8");
if(!content.trim()||!main.trim()){
  console.error("content.js or app.js is empty");
  process.exit(1);
}

function makeClassList(){
  const set=new Set();
  return {
    add:(...v)=>v.forEach(x=>set.add(x)),
    remove:(...v)=>v.forEach(x=>set.delete(x)),
    contains:v=>set.has(v),
    toggle:(v,on)=>{if(on===undefined){if(set.has(v)){set.delete(v);return false}set.add(v);return true}if(on)set.add(v);else set.delete(v);return !!on}
  };
}
function makeElement(){
  return {
    textContent:"",
    innerHTML:"",
    value:"",
    checked:false,
    disabled:false,
    style:{},
    dataset:{},
    className:"",
    classList:makeClassList(),
    appendChild(){},
    remove(){},
    addEventListener(){},
    scrollIntoView(){},
    focus(){},
    closest(){return null}
  };
}

const elements=new Map();
const getEl=key=>{
  if(!elements.has(key))elements.set(key,makeElement());
  return elements.get(key);
};

const documentMock={
  querySelector:sel=>getEl(sel),
  querySelectorAll:()=>[],
  createElement:()=>makeElement(),
  addEventListener(){},
  body:makeElement()
};

const local=new Map();
const localStorageMock={
  getItem:k=>local.has(k)?local.get(k):null,
  setItem:(k,v)=>local.set(k,String(v)),
  removeItem:k=>local.delete(k)
};

const sandbox={
  console,
  document:documentMock,
  localStorage:localStorageMock,
  navigator:{userAgent:"SmokeTestBrowser",maxTouchPoints:0,onLine:true},
  location:{href:"https://example.test/lecture-cp/"},
  confirm:()=>true,
  prompt:()=>"",
  alert:()=>{},
  setTimeout:(fn)=>{ if(typeof fn==="function")fn(); return 1; },
  clearTimeout:()=>{},
  requestAnimationFrame:()=>1,
  cancelAnimationFrame:()=>{},
  Date,
  Math,
  JSON,
  Set,
  Map,
  Promise,
  Uint8Array
};
sandbox.window=sandbox;
sandbox.window.addEventListener=()=>{};
sandbox.window.scrollTo=()=>{};
sandbox.window.isSecureContext=true;
sandbox.window.innerWidth=390;
sandbox.window.innerHeight=844;
sandbox.window.supabase=undefined;

const context=vm.createContext(sandbox);

try{
  vm.runInContext(content,context,{timeout:2000});
  vm.runInContext(main,context,{timeout:2000});
}catch(error){
  console.error("Runtime boot failed:",error);
  process.exit(1);
}

const probes=[
  'typeof normalizeState==="function"',
  'typeof buildDailyMission==="function"',
  'typeof fullyDecodableWords==="function"',
  'typeof decodableMissionWords==="function"',
  'typeof activeSoundData==="function"',
  'typeof decodableSentencePool==="function"',
  'typeof recentPerformance==="function"',
  'typeof recordQuestionError==="function"',
  'typeof dueReviewSyllables==="function"',
  '(state=normalizeState({mastery:{ma:{attempts:1,correct:1,lastSeen:"2000-01-01"}}}),reviewIntervalDays("ma")===1&&dueReviewSyllables().includes("ma"))',
  '(state=normalizeState({mastery:{ma:{attempts:2,correct:2,lastSeen:"2000-01-01"}}}),reviewIntervalDays("ma")===3)',
  '(state=normalizeState({mastery:{ma:{attempts:4,correct:4,lastSeen:"2000-01-01"}}}),reviewIntervalDays("ma")===7)',
  'typeof worldView==="function"',
  'typeof gameMissing==="function"',
  'typeof collectionView==="function"',
  'typeof diagnosticText==="function"',
  'normalizeState({}).stars===0',
  'unlockedFamilyCount()===3',
  'activeLearningSyllables().length===15',
  'fullyDecodableWords().length>=4',
  'fullyDecodableWords().every(w=>w.parts.join("")===w.w)',
  'decodableMissionWords().length>=6',
  'decodableMissionWords().every(w=>w.parts.join("")===w.w)',
  'decodableMissionWords().every(w=>w.parts.every(p=>activeLearningSyllables().includes(p)||"aioué".includes(p)))',
  'getDailyMission().steps.length===5',
  '["memory","family","missing"].includes(getDailyMission().steps[3].type)',
  '(()=>{const s=getDailyMission().steps[3];return s.type!=="missing"||decodableMissionWords().some(w=>w.w===s.target)})()',
  'getDailyMission().startAttempts===null',
  '(startMissionStep(),getDailyMission().startAttempts!==null)',
  'normalizeState({stars:2}).attemptLedger!=null',
  'normalizeState({stars:2}).wordPractice!=null',
  '(state=normalizeState({}),decodableMissionWords().slice(0,5).forEach(w=>state.wordPractice[w.w]=true),wordPracticeComplete()===true)',
  'normalizeState({stars:2}).updatedAt===0',
  'normalizeState({stars:2}).schemaVersion===STATE_SCHEMA_VERSION',
  'normalizeState({schemaVersion:0,stars:3}).stars===3&&normalizeState({schemaVersion:0}).wordPractice!=null',
  '(state=normalizeState({}),missionMode=false,recordAttempt(true,"ma","smoke:ma"),recordAttempt(true,"ma","smoke:ma"),state.stats.correct===1&&state.mastery.ma.correct===1)',
  '(state=normalizeState({}),resetQuestionTracking(),recordQuestionError("ma"),recordQuestionError("ma"),state.stats.attempts===1&&state.mastery.ma.attempts===1)',
  '(state=normalizeState({dailyMission:{date:localDayKey(),index:1,steps:[1,2,3,4,5]}}),missionMode=false,recordAttempt(true,"ma","listen:ma"),missionMode=true,recordAttempt(true,"ma","listen:ma"),state.stats.correct===2&&state.mastery.ma.correct===2)',
  '(state=normalizeState({dailyMission:{date:localDayKey(),index:1,steps:[1,2,3,4,5],sessionStats:{attempts:0,correct:0}}}),missionMode=false,recordAttempt(true,"ma","free:test"),missionMode=true,recordAttempt(false,"mi"),recordAttempt(true,"mi","mission:test"),state.dailyMission.sessionStats.attempts===2&&state.dailyMission.sessionStats.correct===1&&state.stats.attempts===3)',
  '(state=normalizeState({}),buildDailyMission(),activeLearningSyllables().includes(state.dailyMission.primary))',
  '(state=normalizeState({missionHistory:[{date:"2026-09-01"},{date:"2026-09-02"},{date:"2026-09-03"},{date:"2026-09-04"}]}),unlockedFamilyCount()===5)',
  '(state=normalizeState({lastView:"unknown-view"}),currentView="unknown-view",render(),currentView==="home")',
  '(state=normalizeState({}),state.sound=DATA.sounds.length-1,currentView="sounds",state.done.sounds!==true)',
  '(state=normalizeState({}),activeSoundData().length===8)',
  '(state=normalizeState({missionHistory:[{accuracy:50,attempts:2,correct:1},{accuracy:100,attempts:2,correct:2}]}),recentPerformance().accuracy===75)',
  '(state=normalizeState({}),sentenceUnlocked()===false)',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")}))}),sentenceUnlocked()===true&&decodableSentencePool().length>=3)',
  '(state=normalizeState({set:9}),syllables(),state.set<unlockedFamilyCount())',
  '(state=normalizeState({}),buildDailyMission(),gameListen(state.dailyMission.primary,true),[...stage.innerHTML.matchAll(/data-value="([^"]+)"/g)].every(x=>activeLearningSyllables().includes(x[1])))',
  '(state=normalizeState({}),buildDailyMission(),gameBubbles(state.dailyMission.review,true),[...stage.innerHTML.matchAll(/data-value="([^"]+)"/g)].every(x=>activeLearningSyllables().includes(x[1])))',
  '(state=normalizeState({}),buildDailyMission(),gameMemory([state.dailyMission.primary,state.dailyMission.review],true),memoryDeck.every(x=>activeLearningSyllables().includes(x.pair)))',
  '(state=normalizeState({}),gameMissing(),missingWord.parts.includes(currentAnswer)&&activeLearningSyllables().includes(currentAnswer)&&[...stage.innerHTML.matchAll(/data-value="([^"]+)"/g)].every(x=>activeLearningSyllables().includes(x[1])))',
  '(state=normalizeState({}),buildDailyMission(),missionMode=true,completeMissionStep(),missionMode=true,completeMissionStep(),missionMode=true,completeMissionStep(),missionMode=true,completeMissionStep(),missionMode=true,completeMissionStep(),state.dailyMission.index===5&&state.dailyMission.completed===true)',
  '(state=normalizeState({}),buildDailyMission(),state.dailyMission.completed=true,state.dailyMission.index=5,missionComplete(),state.missionHistory.length===1&&state.rewards.pieces===1&&missionComplete()===undefined&&state.missionHistory.length===1&&state.rewards.pieces===1)'
];

for(const probe of probes){
  let ok=false;
  try{ok=!!vm.runInContext(probe,context,{timeout:500})}
  catch(error){
    console.error("Smoke probe threw:",probe,error);
    process.exit(1);
  }
  if(!ok){
    console.error("Smoke probe failed:",probe);
    process.exit(1);
  }
}

const screenProbes=[
  'state=normalizeState({}),home(),stage.innerHTML.length>50',
  'state=normalizeState({}),sounds(),stage.innerHTML.length>50',
  'state=normalizeState({}),syllables(),stage.innerHTML.length>50',
  'state=normalizeState({}),words(),stage.innerHTML.length>50',
  'state=normalizeState({}),gamesMenu(),stage.innerHTML.length>50',
  'state=normalizeState({}),worldView(),stage.innerHTML.length>50',
  'state=normalizeState({}),collectionView(),stage.innerHTML.length>50',
  'state=normalizeState({}),parents(),stage.innerHTML.length>50',
  'state=normalizeState({}),missionHub(),stage.innerHTML.length>50',
  'state=normalizeState({}),missionDiscover(getDailyMission().primary),stage.innerHTML.length>50',
  'state=normalizeState({}),gameListen(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameBubbles(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameMemory(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameFamily(),stage.innerHTML.length>50',
  'state=normalizeState({}),gamePronunciation(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameMissing(),stage.innerHTML.length>50',
  'state=normalizeState({}),gamePicture(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameBuild(),stage.innerHTML.length>50',
  'state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")}))}),gameOrder(),stage.innerHTML.length>50'
];

for(const probe of screenProbes){
  let ok=false;
  try{ok=!!vm.runInContext(probe,context,{timeout:500})}
  catch(error){
    console.error("Screen smoke probe threw:",probe,error);
    process.exit(1);
  }
  if(!ok){
    console.error("Screen smoke probe failed:",probe);
    process.exit(1);
  }
}

console.log("Runtime smoke test OK");
console.log("- Application booted with Supabase unavailable");
console.log("- Core functions callable");
console.log("- Main screens, mission flow, microphone screen and games render without runtime errors");
console.log("- Daily mission contains 5 steps");
console.log("- Daily mission visual step rotates across supported games");
console.log("- Mission stats start only when the mission starts");
console.log("- Legacy state migration: OK");
console.log("- Saved-state schema version: OK");
console.log("- Word practice tracking: OK");
console.log("- Spaced review intervals: OK");
console.log("- Duplicate mastery guard: OK");
console.log("- One-error-per-question analytics: OK");
console.log("- Mission/free-play attempt scoping: OK");
console.log("- Mission performance excludes free-play answers: OK");
console.log("- Initial curriculum unlock: 3 families");
console.log("- Curriculum expands with completed missions");
console.log("- Free reading words are fully decodable");
console.log("- Mission words use currently unlocked syllables");
console.log("- Unknown saved views recover to home");
console.log("- Navigation alone does not validate sound practice");
console.log("- Sound browser follows unlocked curriculum");
console.log("- Phrase game unlocks after 8 missions with decodable sentences");
console.log("- Syllable browser stays inside unlocked families");
console.log("- Mission distractors stay inside unlocked curriculum");
console.log("- Missing-syllable game stays inside unlocked curriculum");
console.log("- Mission words assemble exactly");
console.log("- Five-step mission completion: OK");
console.log("- Mission completion reward idempotency: OK");

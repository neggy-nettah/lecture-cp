const fs=require("fs");
const vm=require("vm");

const content=fs.readFileSync("content.js","utf8");
const modules=["progression.js","rewards.js","exercises.js","missions.js","app.js"].map(file=>({file,source:fs.readFileSync(file,"utf8")}));
const main=modules.map(x=>x.source).join("\n");
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
    setAttribute(name,value){this[name]=String(value)},
    getAttribute(name){return this[name]??null},
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
  for(const module of modules)vm.runInContext(module.source,context,{timeout:2000,filename:module.file});
}catch(error){
  console.error("Runtime boot failed:",error);
  process.exit(1);
}

const probes=[
  'normalizeState({stars:27,rewards:{collection:{bad:true}}}).stars===27',
  'normalizeState({stats:{attempts:"12",correct:99}}).stats.correct===12',
  'normalizeState({sound:-3,set:"bad",word:null}).sound===0',
  'normalizeState({mastery:{ma:{attempts:"bad",correct:3,lastSeen:"2026-02-31"}}}).mastery.ma.lastSeen===null',
  '(()=>{const s=normalizeState({mastery:{ma:{attempts:1,correct:1},"word:silo":{attempts:2,correct:1},"sentence:Lili a un vélo.":{attempts:3,correct:2},fake:{attempts:1,correct:1}}});return !!s.mastery.ma&&!!s.mastery["word:silo"]&&!s.mastery["sentence:Lili a un vélo."]&&!s.mastery.fake})()',
  '(()=>{const s=normalizeState({mastery:{"structure:il":{attempts:2,correct:2},"structure:zz":{attempts:2,correct:2}}});return s.mastery["structure:il"]?.correct===2&&!s.mastery["structure:zz"]})()',
  'normalizeState({missionHistory:[null,false]}).missionHistory.length===0',
  '(()=>{const a=normalizeState({}),b=normalizeState({});a.done.listen=true;return !b.done.listen})()',
  '(()=>{const s=parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{mastery:{"word:moto":{attempts:4,correct:3}}}}));return s.mastery["word:moto"].correct===3})()',
  '(()=>{try{parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{stats:{attempts:1,correct:3}}}));return false}catch(e){return true}})()',
  'typeof normalizeState==="function"',
  'normalizedView("word-encode")==="word-encode"&&normalizedView("vc-structures")==="vc-structures"&&normalizedView("cvc-structures")==="cvc-structures"&&normalizedView("not-a-view")==="home"',
  'normalizeState({lastView:"not-a-view"}).lastView==="home"',
  '(()=>{const old=localStorage.setItem;try{localStorage.setItem=()=>{throw Error("blocked")};state=normalizeState({stars:3});return saveLocal()===false&&state.stars===3&&localSaveFailed===true}finally{localStorage.setItem=old;localSaveFailed=false}})()',
  '(()=>{const old=localStorage.getItem;try{localStorage.getItem=()=>{throw Error("blocked")};return storedLargeTextPreference()===false&&localSaveFailed===true}finally{localStorage.getItem=old;localSaveFailed=false}})()',
  'typeof mergeProgressStates==="function"',
  'typeof mergeReviewQueues==="function"',
  'typeof rewardProgressUnits==="function"',
  'typeof buildDailyMission==="function"&&typeof missionStructureTarget==="function"',
  'typeof missionWordMatchesFocus==="function"',
  'typeof missionFocusedWords==="function"',
  'typeof fullyDecodableWords==="function"',
  'typeof decodableMissionWords==="function"',
  'typeof activeSoundData==="function"',
  'typeof decodableSentencePool==="function"',
  'typeof comprehensionSentencePool==="function"',
  'typeof gameComprehension==="function"',
  'typeof gameMiniText==="function"',
  'typeof miniTextPool==="function"&&typeof textComprehensionUnlocked==="function"',
  'typeof gameReadAloud==="function"',
  'typeof gameEncode==="function"',
  'typeof gameVC==="function"&&typeof gameCVC==="function"&&typeof structureMasteryKey==="function"',
  'typeof gameWordEncode==="function"',
  'typeof pickLearningWord==="function"&&typeof wordMasteryLevel==="function"',
  'typeof wordLearningWeight==="function"',
  '(()=>{state=normalizeState({mastery:{"word:silo":{attempts:2,correct:0,lastSeen:localDayKey()},"word:solo":{attempts:4,correct:4,lastSeen:localDayKey()}}});const weak=DATA.words.find(w=>w.w==="silo"),mastered=DATA.words.find(w=>w.w==="solo"),unseen=DATA.words.find(w=>w.w==="menu");return wordLearningWeight(weak)>wordLearningWeight(unseen)&&wordLearningWeight(unseen)>wordLearningWeight(mastered)})()',
  'typeof wordMasterySummary==="function"',
  '(()=>{const mastery=Object.fromEntries(DATA.sets.flat().map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]));state=normalizeState({missionHistory:Array.from({length:20},(_,i)=>({date:"2026-08-"+String(i+1).padStart(2,"0")})),mastery});return learningCourseCompleted()===false})()',
  '(()=>{const mastery=Object.fromEntries(DATA.sets.flat().map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]));for(const id of ["vc","cvc"])for(const item of structureStage(id).items.slice(0,4))mastery[structureMasteryKey(item.text)]={attempts:2,correct:2,lastSeen:localDayKey()};state=normalizeState({missionHistory:Array.from({length:20},(_,i)=>({date:"2026-08-"+String(i+1).padStart(2,"0")})),mastery});return learningCourseCompleted()===true})()',
  '(()=>{state=normalizeState({mastery:{"word:silo":{attempts:4,correct:4,lastSeen:localDayKey()},"word:solo":{attempts:2,correct:1,lastSeen:localDayKey()}}});const s=wordMasterySummary();return s.evaluated>=2&&s.mastered>=1&&s.learning>=1})()',
  'typeof wordEncodePool==="function"',
  'typeof updateWordEncode==="function"',
  'typeof encodeLetterPool==="function"',
  'typeof phraseToolHelpHTML==="function"',
  'typeof recentPerformance==="function"',
  'typeof recordQuestionError==="function"',
  'typeof parseProgressImport==="function"',
  '(()=>{const p={app:"La Fabrique des Syllabes",state:{mastery:{ma:{attempts:"oops",correct:"999",lastSeen:"not-a-date"}},rewards:{pieces:"oops",puzzles:"Infinity"}}};const x=parseProgressImport(JSON.stringify(p));return x.mastery.ma.attempts===0&&x.mastery.ma.correct===0&&x.mastery.ma.lastSeen===null&&x.rewards.pieces===0&&x.rewards.puzzles===0})()',
  'typeof importProgressFile==="function"',
  'typeof registerServiceWorker==="function"',
  '(()=>{let checks=0;serviceWorkerRegistration={update:()=>{checks++;return Promise.resolve()}};lastServiceWorkerCheck=0;checkForAppUpdate(true);checkForAppUpdate(false);serviceWorkerRegistration=null;return checks===1})()',
  'typeof updateConnectivityUI==="function"',
  'typeof dueReviewSyllables==="function"',
  '(state=normalizeState({mastery:{ma:{attempts:1,correct:1,lastSeen:"2000-01-01"}}}),reviewIntervalDays("ma")===1&&dueReviewSyllables().includes("ma"))',
  '(state=normalizeState({mastery:{ma:{attempts:2,correct:2,lastSeen:"2000-01-01"}}}),reviewIntervalDays("ma")===3)',
  '(state=normalizeState({mastery:{ma:{attempts:4,correct:4,lastSeen:"2000-01-01"}}}),reviewIntervalDays("ma")===7)',
  'typeof worldView==="function"',
  'typeof gameMissing==="function"',
  'typeof collectionView==="function"',
  'typeof diagnosticText==="function"',
  '(()=>{const oldSession=session,oldChild=currentChild;try{session={user:{id:"parent-secret",email:"secret@example.test"}};currentChild={id:"child-secret",nickname:"Caly"};const d=diagnosticText();return !d.includes("secret@example.test")&&!d.includes("parent-secret")&&!d.includes("child-secret")}finally{session=oldSession;currentChild=oldChild}})()',
  'normalizeState({}).stars===0',
  '(()=>{delete navigator.serviceWorker;registerServiceWorker();return true})()',
  '(()=>{navigator.onLine=false;updateConnectivityUI();const ok=$("#syncStatus").textContent.includes("Hors ligne");navigator.onLine=true;return ok})()',
  '(state=normalizeState({}),unlockedFamilyCount()===3&&!vcStructureUnlocked()&&!cvcStructureUnlocked())',
  '(()=>{const base=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,VC_STRUCTURE_MIN_SECURE),mastery=Object.fromEntries(base.map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));state=normalizeState({mastery});return vcStructureUnlocked()&&!cvcStructureUnlocked()&&availableStructureItems("vc").length>=4})()',
  '(()=>{const base=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,CVC_STRUCTURE_MIN_CV_SECURE),mastery=Object.fromEntries(base.map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));state=normalizeState({mastery});return vcStructureUnlocked()&&!cvcStructureUnlocked()})()',
  '(()=>{const base=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,CVC_STRUCTURE_MIN_CV_SECURE),mastery=Object.fromEntries(base.map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));for(const x of structureStage("vc").items.slice(0,CVC_STRUCTURE_MIN_VC_SECURE))mastery[structureMasteryKey(x.text)]={attempts:2,correct:2,lastSeen:localDayKey()};state=normalizeState({mastery});return cvcStructureUnlocked()&&availableStructureItems("cvc").length>=4})()',
  '(()=>{const base=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,VC_STRUCTURE_MIN_SECURE),mastery=Object.fromEntries(base.map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));mastery[structureMasteryKey("il")]={attempts:4,correct:4,lastSeen:localDayKey()};state=normalizeState({mastery});const target=missionStructureTarget("vc");return !!target&&target!=="il"&&structureMasteryLevel(target)===0})()',
  '(()=>{const old=localDayKey;try{localDayKey=()=>"2026-09-28";const base=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,VC_STRUCTURE_MIN_SECURE),mastery=Object.fromEntries(base.map(x=>[x,{attempts:2,correct:2,lastSeen:"2026-09-28"}]));state=normalizeState({mastery});const m=buildDailyMission();return m.steps[3].type==="vc"&&availableStructureItems("vc").some(x=>x.text===m.steps[3].target)}finally{localDayKey=old;state=normalizeState({})}})()',
  '(()=>{const old=localDayKey;try{localDayKey=()=>"2026-09-28";const base=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,CVC_STRUCTURE_MIN_CV_SECURE),mastery=Object.fromEntries(base.map(x=>[x,{attempts:2,correct:2,lastSeen:"2026-09-28"}]));for(const x of structureStage("vc").items.slice(0,CVC_STRUCTURE_MIN_VC_SECURE))mastery[structureMasteryKey(x.text)]={attempts:2,correct:2,lastSeen:"2026-09-28"};state=normalizeState({mastery});const m=buildDailyMission();return m.steps[3].type==="cvc"&&availableStructureItems("cvc").some(x=>x.text===m.steps[3].target)}finally{localDayKey=old;state=normalizeState({})}})()',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")}))}),unlockedFamilyCount()===3)',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")}))}),sentenceUnlocked()===false&&sentenceReadiness().remainingPoints===12)',
  '(state=normalizeState({missionHistory:Array.from({length:12},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")}))}),textComprehensionUnlocked()===false&&textComprehensionReadiness().remainingPoints===20)',
  '(()=>{state=normalizeState({missionHistory:Array.from({length:12},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))});const pool=miniTextPool();return textComprehensionUnlocked()&&pool.length>=2&&!pool.some(x=>x.id==="domino-radio")&&pool.every(item=>item.sentences.every(sentence=>decodableSentencePool().some(valid=>valid.join("\u0000")===sentence.join("\u0000"))))})()',
  '(()=>{state=normalizeState({missionHistory:Array.from({length:12},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:{ma:{attempts:4,correct:4,lastSeen:localDayKey()},mi:{attempts:4,correct:4,lastSeen:localDayKey()},mo:{attempts:4,correct:4,lastSeen:localDayKey()},mu:{attempts:4,correct:4,lastSeen:localDayKey()},mé:{attempts:4,correct:4,lastSeen:localDayKey()},la:{attempts:4,correct:4,lastSeen:localDayKey()},li:{attempts:4,correct:4,lastSeen:localDayKey()},da:{attempts:1,correct:1,lastSeen:localDayKey()}}});return miniTextPool().some(x=>x.id==="domino-radio")})()',
  '(state=normalizeState({missionHistory:Array.from({length:4},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")}))}),wordEncodingUnlocked()===false&&wordEncodingReadiness().remainingPoints===10)',
  '(state=normalizeState({missionHistory:Array.from({length:2},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),unlockedFamilyCount()===4)',
  '(state=normalizeState({mastery:{ba:{attempts:1,correct:1,lastSeen:localDayKey()}}}),unlockedFamilyCount()===10)',
  '(state=normalizeState({soundPractice:{b:true}}),unlockedFamilyCount()===3)',
  '(state=normalizeState({wordPractice:{bobo:true}}),unlockedFamilyCount()===10)',
  '(state=normalizeState({}),activeLearningSyllables().length===18)',
  '(state=normalizeState({}),!activeLearningSyllables().includes("da")&&!decodableMissionWords().some(w=>w.w==="domino"))',
  '(state=normalizeState({mastery:{da:{attempts:1,correct:1,lastSeen:localDayKey()}}}),unlockedFamilyCount()===11&&activeLearningSyllables().includes("da")&&["domino","dodo","midi","radio","défi","dino"].every(word=>decodableMissionWords().some(w=>w.w===word)))',
  '(state=normalizeState({mastery:{cha:{attempts:1,correct:1,lastSeen:localDayKey()}}}),unlockedFamilyCount()===BASIC_CV_FAMILY_COUNT&&!silentEUnlocked())',
  '(()=>{const simple=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat(),needed=Math.ceil(simple.length*.60),mastery=Object.fromEntries(simple.slice(0,needed).map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));mastery.cha={attempts:1,correct:1,lastSeen:localDayKey()};state=normalizeState({mastery});return simpleCvReadiness().ready&&unlockedFamilyCount()===DATA.sets.length&&!silentEUnlocked()})()',
  '(()=>{const simple=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat(),needed=Math.ceil(simple.length*.60),mastery=Object.fromEntries(simple.slice(0,needed).map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));for(const x of ["cha","che","chi"])mastery[x]={attempts:1,correct:1,lastSeen:localDayKey()};state=normalizeState({mastery});return silentEUnlocked()&&silentEWordPool().length>=5})()',
  '(state=normalizeState({mastery:{ja:{attempts:1,correct:1,lastSeen:localDayKey()}}}),unlockedFamilyCount()===12&&activeLearningSyllables().includes("ja")&&["judo","joli"].every(word=>decodableMissionWords().some(w=>w.w===word)))',
  '(()=>{state=normalizeState({});const pool=wordEncodePool();return pool.length>0&&pool.every(w=>w.parts.length>=2&&w.parts.length<=4&&w.parts.join("")===w.w&&!DEFERRED_WORDS.includes(w.w))})()',
  '(()=>{state=normalizeState({missionHistory:Array.from({length:4},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","la"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))});const word=DATA.words.find(w=>w.w==="silo");gameWordEncode(word);return wordEncodingUnlocked()&&currentView==="word-encode"&&currentAnswer.w==="silo"&&!stage.innerHTML.includes("silo")&&stage.innerHTML.includes("Écouter le mot")})()',
  '(()=>{state=normalizeState({missionHistory:Array.from({length:4},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","la"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))});const word=DATA.words.find(w=>w.w==="silo");gameWordEncode(word,true);return currentView==="word-encode"&&state.lastView==="parents"&&stage.innerHTML.includes("Retour au bilan")})()',
  '(()=>{const a={updatedAt:100,stars:8,done:{listen:true},mastery:{ma:{attempts:2,correct:1,lastSeen:"2026-09-20"}},missionHistory:[{date:"2026-09-20",attempts:2,correct:1,word:"moto"}]},b={updatedAt:200,stars:6,done:{memory:true},mastery:{mi:{attempts:4,correct:4,lastSeen:"2026-09-21"}},missionHistory:[{date:"2026-09-21",attempts:1,correct:1,word:"lune"}]};const m=mergeProgressStates(a,b);return m.stars===8&&m.done.listen&&m.done.memory&&m.mastery.ma.attempts===2&&m.mastery.mi.correct===4&&m.missionHistory.length===2})()',
  '(()=>{const a={updatedAt:100,dailyMission:{date:localDayKey(),index:4,steps:[1,2,3,4,5]}},b={updatedAt:200,dailyMission:{date:localDayKey(),index:2,steps:[1,2,3,4,5]}};return mergeProgressStates(a,b).dailyMission.index===4})()',
  '(()=>{const a={updatedAt:300,dailyMission:{date:localDayKey(),index:2,steps:[1,2,3,4,5],marker:"local"}},b={updatedAt:200,dailyMission:{date:localDayKey(),index:2,steps:[1,2,3,4,5],marker:"remote"}};return mergeProgressStates(a,b).dailyMission.marker==="local"})()',
  '(()=>{const a={updatedAt:100,missionHistory:[{date:"2026-09-20",attempts:1,correct:0,word:"moto"}]},b={updatedAt:200,missionHistory:[{date:"2026-09-20",attempts:3,correct:2,word:"moto"}]};const m=mergeProgressStates(a,b);return m.missionHistory.length===1&&m.missionHistory[0].attempts===3&&m.missionHistory[0].correct===2})()',
  '(()=>{const m=mergeProgressStates({updatedAt:100,reviewQueue:["ma","ma"]},{updatedAt:200,reviewQueue:["ma","mi","mi"]});return m.reviewQueue.filter(x=>x==="ma").length===2&&m.reviewQueue.filter(x=>x==="mi").length===2&&m.reviewQueue.at(-1)==="mi"})()',
  '(()=>{const m=mergeProgressStates({updatedAt:100,rewards:{puzzles:1,pieces:0,collection:[]}},{updatedAt:200,rewards:{puzzles:0,pieces:3,collection:[]}});return m.rewards.puzzles===1&&m.rewards.pieces===0})()',
  '(()=>{const m=mergeProgressStates({updatedAt:100,stars:1,rewardLedger:{a:1}},{updatedAt:200,stars:1,rewardLedger:{b:1}});return m.stars===2&&m.rewardLedger.a&&m.rewardLedger.b})()',
  'fullyDecodableWords().length>=4',
  'fullyDecodableWords().every(w=>w.parts.join("")===w.w)',
  'fullyDecodableWords().length>=40',
  '["menu","poli","puni","revu","relu","pari","rami","vomi"].every(w=>fullyDecodableWords().some(x=>x.w===w))',
  'SILENT_FINAL_E_WORDS.every(w=>!fullyDecodableWords().some(x=>x.w===w))',
  '["maman","robot","tapis","miso"].every(w=>!fullyDecodableWords().some(x=>x.w===w))&&fullyDecodableWords().some(x=>x.w==="domino")',
  'DATA.sets.every((set,i)=>set.length===6&&["a","e","i","o","u","é"].every(v=>set.includes(DATA.familyGraphemes[i]+v)))',
  'familyGraphemeAt(0)==="m"&&familyGraphemeForSyllable("ma")==="m"&&syllableRemainder("ma")==="a"',
  'familyGraphemeForSet(["ma","me","mi","mo","mu","mé"])==="m"',
  'JSON.stringify(syllableGraphemes("ma"))===JSON.stringify(["m","a"])',
  '(()=>{SYLLABLE_GRAPHEME_OVERRIDES.lou=["l","ou"];try{const parts=syllableGraphemes("lou"),choices=encodeLetterPool("lou");return parts[0]==="l"&&parts[1]==="ou"&&choices.includes("l")&&choices.includes("ou")&&colorSyl("lou").includes(">ou<")}finally{delete SYLLABLE_GRAPHEME_OVERRIDES.lou}})()',
  '(()=>{DATA.familyGraphemes.push("ch");DATA.sets.push(["cha","che","chi","cho","chu","ché"]);try{return familyGraphemeForSyllable("cha")==="ch"&&syllableRemainder("cha")==="a"}finally{DATA.sets.pop();DATA.familyGraphemes.pop()}})()',
  '(state=normalizeState({}),decodableMissionWords().length>=6)',
  '(state=normalizeState({}),decodableMissionWords().every(w=>w.parts.join("")===w.w))',
  '(state=normalizeState({}),decodableMissionWords().every(w=>w.parts.every(p=>activeLearningSyllables().includes(p)||"aioué".includes(p))))',
  'getDailyMission().steps.length===5',
  '["memory","family","missing"].includes(getDailyMission().steps[3].type)',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li","lo"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),buildDailyMission(),["memory","family","missing","encode","comprehension"].includes(state.dailyMission.steps[3].type))',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li","lo"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}])),dailyMission:{date:localDayKey(),index:3,completed:false,primary:"ma",review:"la",word:"polo",sessionStats:{attempts:0,correct:0},steps:[{type:"discover",target:"ma"},{type:"listen",target:"ma"},{type:"bubbles",target:"la"},{type:"comprehension",target:"polo"},{type:"build",target:"polo"}]}}),startMissionStep(),missionMode===true&&currentView==="comprehension"&&currentAnswer==="polo")',
  '(state=normalizeState({missionHistory:Array.from({length:4},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la"].map(s=>[s,{attempts:2,correct:2,lastSeen:localDayKey()}])),dailyMission:{date:localDayKey(),index:3,completed:false,primary:"ma",review:"la",word:"polo",sessionStats:{attempts:0,correct:0},steps:[{type:"discover",target:"ma"},{type:"listen",target:"ma"},{type:"bubbles",target:"la"},{type:"encode",target:"la"},{type:"build",target:"polo"}]}}),startMissionStep(),missionMode===true&&currentView==="encode"&&currentAnswer==="la")',
  '(()=>{const s=getDailyMission().steps[3];return s.type!=="missing"||decodableMissionWords().some(w=>w.w===s.target)})()',
  '(state=normalizeState({}),buildDailyMission(),getDailyMission().startAttempts===null)',
  '(state=normalizeState({}),buildDailyMission(),startMissionStep(),getDailyMission().startAttempts!==null)',
  'normalizeState({stars:2}).attemptLedger!=null',
  'normalizeState({stars:2}).wordPractice!=null',
  '(state=normalizeState({}),decodableMissionWords().slice(0,5).forEach(w=>state.wordPractice[w.w]=true),wordPracticeComplete()===true)',
  'normalizeState({stars:2}).updatedAt===0',
  'normalizeState({stars:2}).schemaVersion===STATE_SCHEMA_VERSION',
  'normalizeState({schemaVersion:0,stars:3}).stars===3&&normalizeState({schemaVersion:0}).wordPractice!=null',
  '(state=normalizeState({}),missionMode=false,recordAttempt(true,"ma","smoke:ma"),recordAttempt(true,"ma","smoke:ma"),state.stats.correct===1&&state.mastery.ma.correct===1)',
  '(state=normalizeState({}),resetQuestionTracking(),recordQuestionError("ma"),recordQuestionError("ma"),state.stats.attempts===1&&state.mastery.ma.attempts===1)',
  '(state=normalizeState({}),missionMode=false,memoryMissedPairs=new Set(["ma"]),recordAttempt(true,memoryMissedPairs.has("ma")?null:"ma","memory:ma"),state.stats.correct===1&&!state.mastery.ma)',
  '(()=>{const s=parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{stars:4,stats:{attempts:2,correct:1}}}));return s.stars===4&&s.stats.attempts===2&&s.stats.correct===1})()',
  '(()=>{try{parseProgressImport(JSON.stringify({app:"Autre application",state:{stars:1}}));return false}catch(e){return true}})()',
  '(()=>{try{parseProgressImport("{bad json");return false}catch(e){return true}})()',
  '(()=>{const s=parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{mastery:{ma:{attempts:2,correct:1},zz:{attempts:9,correct:9}},dailyMission:{date:"2000-01-01"}}}));return !!s.mastery.ma&&!s.mastery.zz&&s.dailyMission===null})()',
  '(()=>{const s=parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{missionHistory:[{date:"2026-09-01",word:"a"},{date:"2026-09-01",word:"b"}],mastery:{ma:{attempts:2,correct:9}},rewards:{pieces:99,puzzles:-2,collection:[{id:"dragon"},{id:"dragon"},{id:"fake"}]}}}));return s.missionHistory.length===1&&s.missionHistory[0].word==="b"&&s.mastery.ma.correct===2&&s.rewards.pieces===3&&s.rewards.puzzles===0&&s.rewards.collection.length===1})()',
  '(()=>{const s=parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{rewards:{pieces:0,puzzles:8,collection:[{id:"dragon"},{id:"fairy"},{id:"knight"},{id:"unicorn"},{id:"dino"},{id:"fox"}]}}}));return s.rewards.puzzles===8&&s.rewards.collection.length===8&&s.rewards.collection[6].id==="panda"&&s.rewards.collection[7].id==="astronaut"})()',
  '(()=>{const s=parseProgressImport(JSON.stringify({app:"La Fabrique des Syllabes",state:{soundPractice:{a:true,q:true},wordPractice:{moto:true,fauxmot:true},attemptLedger:{a:1,b:0},rewardLedger:{x:1,y:0}}}));return s.soundPractice.a===true&&!s.soundPractice.q&&s.wordPractice.moto===true&&!s.wordPractice.fauxmot&&Object.keys(s.attemptLedger).length===1&&Object.keys(s.rewardLedger).length===1})()',
  '(state=normalizeState({dailyMission:{date:localDayKey(),index:1,steps:[1,2,3,4,5]}}),missionMode=false,recordAttempt(true,"ma","listen:ma"),missionMode=true,recordAttempt(true,"ma","listen:ma"),state.stats.correct===2&&state.mastery.ma.correct===2)',
  '(state=normalizeState({dailyMission:{date:localDayKey(),index:1,steps:[1,2,3,4,5],sessionStats:{attempts:0,correct:0}}}),missionMode=false,recordAttempt(true,"ma","free:test"),missionMode=true,recordAttempt(false,"mi"),recordAttempt(true,"mi","mission:test"),state.dailyMission.sessionStats.attempts===2&&state.dailyMission.sessionStats.correct===1&&state.stats.attempts===3)',
  '(state=normalizeState({}),buildDailyMission(),activeLearningSyllables().includes(state.dailyMission.primary))',
  'missionWordMatchesFocus({parts:["ma","mi"]},"ma","lu")===true&&missionWordMatchesFocus({parts:["pa"]},"ma","lu")===false',
  'missionFocusedWords([{w:"mami",parts:["ma","mi"]},{w:"papi",parts:["pa","pi"]}],"ma","lu").length===1',
  '(()=>{state=normalizeState({reviewQueue:["ma","mi"]});const m=buildDailyMission(),w=DATA.words.find(x=>x.w===m.word),related=missionFocusedWords(decodableMissionWords(),m.primary,m.review);return !related.length||missionWordMatchesFocus(w,m.primary,m.review)})()',
  '(()=>{state=normalizeState({reviewQueue:["ma","mi"]});const m=buildDailyMission(),s=m.steps[3];if(s.type!=="missing")return true;const w=DATA.words.find(x=>x.w===s.target),focused=missionFocusedWords(missingSyllableWords(),m.primary,m.review);return !focused.length||missionWordMatchesFocus(w,m.primary,m.review)})()',
  '(()=>{state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li","lo"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}])),reviewQueue:["ma","mi"]});const m=buildDailyMission(),s=m.steps[3];if(s.type!=="comprehension")return true;const item=comprehensionSentencePool().find(x=>x.word.w===s.target),focused=comprehensionSentencePool().filter(x=>missionWordMatchesFocus(x.word,m.primary,m.review));return !focused.length||missionWordMatchesFocus(item?.word,m.primary,m.review)})()',
  '(()=>{const random=Math.random;try{Math.random=()=>0;state=normalizeState({reviewQueue:["mi","ma"],missionHistory:[{primary:"mi"},{primary:"mi"}]});return pickLearningSyllable()==="ma"}finally{Math.random=random}})()',
  '(state=normalizeState({missionHistory:[{date:"2026-09-01"},{date:"2026-09-02"},{date:"2026-09-03"},{date:"2026-09-04"}],mastery:Object.fromEntries(["ma","mi","mo","mu"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),unlockedFamilyCount()===5)',
  '(state=normalizeState({lastView:"unknown-view"}),currentView="unknown-view",render(),currentView==="home")',
  '(state=normalizeState({}),state.sound=DATA.sounds.length-1,currentView="sounds",state.done.sounds!==true)',
  '(state=normalizeState({}),activeSoundData().length===9&&activeSoundData().some(x=>x.g==="e"))',
  '(state=normalizeState({missionHistory:[{accuracy:50,attempts:2,correct:1},{accuracy:100,attempts:2,correct:2}]}),recentPerformance().accuracy===75)',
  '(state=normalizeState({}),sentenceUnlocked()===false)',
  '(state=normalizeState({}),gameReadAloud(),currentView==="games")',

  '(()=>{const h=phraseToolHelpHTML(["Papa","a","une","moto."]);return h.includes("data-text=\\\"a\\\"")&&h.includes("data-text=\\\"une\\\"")&&!h.includes("data-text=\\\"moto\\\"")&&!h.includes("data-text=\\\"Papa\\\"")})()',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li","lo"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),sentenceUnlocked()===true&&unlockedFamilyCount()===7&&decodableSentencePool().length>=3)',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li","lo"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),comprehensionSentencePool().length>=3&&comprehensionSentencePool().every(x=>x.word&&x.sentence.length>=3))',
  '(state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la","li","lo"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),new Set(comprehensionSentencePool().map(x=>x.word.w)).size>=3)',
  '(state=normalizeState({set:9}),syllables(),state.set<unlockedFamilyCount())',
  '(state=normalizeState({}),buildDailyMission(),gameListen(state.dailyMission.primary,true),[...stage.innerHTML.matchAll(/data-value="([^"]+)"/g)].every(x=>activeLearningSyllables().includes(x[1])))',
  '(state=normalizeState({}),gameEncode("ma"),currentView==="encode"&&currentAnswer==="ma"&&stage.innerHTML.includes("data-value=\\\"m\\\"")&&stage.innerHTML.includes("data-value=\\\"a\\\""))',
  '(()=>{state=normalizeState({});gameEncode("ma");encodeMade=["m","a"];updateEncode();const once=state.mastery.ma?.correct===1&&state.stars===1;gameEncode("ma");encodeMade=["m","a"];updateEncode();return once&&state.mastery.ma.correct===1&&state.stars===1})()',
  '(()=>{state=normalizeState({});gameEncode("ma");encodeMade=["l","a"];updateEncode();return state.mastery.ma?.correct===0&&state.reviewQueue.filter(x=>x==="ma").length===2})()',
  '(state=normalizeState({}),buildDailyMission(),gameBubbles(state.dailyMission.review,true),[...stage.innerHTML.matchAll(/data-value="([^"]+)"/g)].every(x=>activeLearningSyllables().includes(x[1])))',
  '(state=normalizeState({}),buildDailyMission(),gameMemory([state.dailyMission.primary,state.dailyMission.review],true),memoryDeck.every(x=>activeLearningSyllables().includes(x.pair)))',
  '(state=normalizeState({}),gameMissing(),missingWord.parts.includes(currentAnswer)&&activeLearningSyllables().includes(currentAnswer)&&[...stage.innerHTML.matchAll(/data-value="([^"]+)"/g)].every(x=>activeLearningSyllables().includes(x[1])))',
  '(state=normalizeState({}),gameMissing({w:"legacy",parts:["zz"],emoji:"?"}),missingWord.w!=="legacy"&&missingWord.parts.includes(currentAnswer)&&activeLearningSyllables().includes(currentAnswer))',
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
  'state=normalizeState({}),gameEncode(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameBubbles(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameMemory(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameFamily(),stage.innerHTML.length>50',
  'state=normalizeState({}),gamePronunciation(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameMissing(),stage.innerHTML.length>50',
  'state=normalizeState({}),gamePicture(),stage.innerHTML.length>50',
  'state=normalizeState({}),gameBuild(),stage.innerHTML.length>50',
  'state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),gameOrder(),stage.innerHTML.length>50',
  '(()=>{state=normalizeState({});missionMode=false;orderTarget=["Lili","a","un","vélo."];orderMade=[...orderTarget];locked=false;resetQuestionTracking();updateOrder();return state.stats.attempts===1&&state.stats.correct===1&&!Object.keys(state.mastery).some(k=>k.startsWith("sentence:"))})()',
  'state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),gameReadAloud(),stage.innerHTML.length>50&&readAloudSentence.length>=3&&stage.innerHTML.includes("readaloudModel")',
  'state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:"2026-09-"+String(i+1).padStart(2,"0")})),mastery:Object.fromEntries(["ma","mi","mo","mu","mé","la"].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))}),gameComprehension(),stage.innerHTML.length>50&&currentAnswer.length>0'
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
console.log("- Memory mistakes do not inflate syllable mastery: OK");
console.log("- Portable progress import validation: OK");
console.log("- Service Worker unsupported-browser fallback: OK");
console.log("- Mission/free-play attempt scoping: OK");
console.log("- Cross-device monotonic progress merge: OK");
console.log("- Review weighting and puzzle reconciliation across devices: OK");
console.log("- Mission performance excludes free-play answers: OK");
console.log("- Initial curriculum unlock: 3 families");
console.log("- Curriculum expands only when missions and mastery are both ready");
console.log("- Previously practiced later families remain accessible");
console.log("- Free reading words are fully decodable");
console.log("- Schwa e families and expanded decodable word coverage: OK");
console.log("- Mission words use currently unlocked syllables");
console.log("- Adaptive word, missing-syllable and comprehension focus: OK");
console.log("- Unknown saved views recover to home");
console.log("- Navigation alone does not validate sound practice");
console.log("- Sound browser follows unlocked curriculum");
console.log("- Phrase game unlocks after 8 missions with decodable sentences");
console.log("- Sentence comprehension game: OK");
console.log("- Tool-word audio help without answer leakage: OK");
console.log("- Unscored read-aloud practice and delayed model: OK");
console.log("- Advanced missions can rotate comprehension into step 4: OK");
console.log("- Syllable browser stays inside unlocked families");
console.log("- Mission distractors stay inside unlocked curriculum");
console.log("- Syllable encoding game: verified mastery, review on error and duplicate guard OK");
console.log("- Missing-syllable game stays inside unlocked curriculum");
console.log("- Mission words assemble exactly");
console.log("- Five-step mission completion: OK");
console.log("- Mission completion reward idempotency: OK");

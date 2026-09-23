const fs=require("fs");

const html=fs.readFileSync("index.html","utf8");
const main=html.match(/<script>\s*"use strict";([\s\S]*?)<\/script>/);

function fail(message,details=""){
  console.error("VALIDATION FAILED:",message,details);
  process.exit(1);
}

if(!main)fail("Main application script not found.");

try{
  new Function('"use strict";'+main[1]);
}catch(error){
  fail("JavaScript syntax error:",error.message);
}

const requiredFunctions=[
  "function normalizeState(",
  "function buildDailyMission(",
  "function getDailyMission(",
  "function completeMissionStep(",
  "function missionComplete(",
  "function rewardVerified(",
  "function rewardMissionPiece(",
  "function masteryLevel(",
  "function recordAttempt(",
  "function scopedChallengeKey(",
  "function activeLearningSyllables(",
  "function activeSoundData(",
  "function fullyDecodableWords(",
  "function decodableSentencePool(",
  "function gameMemory(",
  "function gameFamily(",
  "function worldView(",
  "function collectionView(",
  "function parents("
];

const missingFunctions=requiredFunctions.filter(token=>!html.includes(token));
if(missingFunctions.length)fail("Missing required app functions:",missingFunctions.join(", "));

const version=html.match(/const APP_VERSION="([^"]+)"/)?.[1];
if(!version)fail("APP_VERSION is missing.");

if(!html.includes('function speakMission(text,rate=.60){speak(text,rate)}')){
  fail("Audio engine changed. Review the known Safari macOS issue before merging.");
}

if(/service[_-]?role/i.test(html)){
  fail("Possible Supabase service-role credential found in client code.");
}
if(!/sb_publishable_/.test(html)){
  fail("Expected Supabase publishable key is missing.");
}

const wordBlock=html.match(/words:\[([\s\S]*?)\],\n sentences:/)?.[1]||"";
const words=[...wordBlock.matchAll(/\{w:"([^"]+)",parts:\[([^\]]*)\],emoji:"([^"]+)"\}/g)].map(m=>({
  word:m[1],
  parts:[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1])
}));
if(words.length<30)fail("Unexpectedly low reading content:",String(words.length));

const duplicateWords=words.map(x=>x.word).filter((w,i,a)=>a.indexOf(w)!==i);
if(duplicateWords.length)fail("Duplicate words:",[...new Set(duplicateWords)].join(", "));

const invalidWords=words.filter(x=>!x.word||!x.parts.length);
if(invalidWords.length)fail("Word entries with missing parts found.");

if(!html.includes('w.parts.every(p=>allowed.has(p))&&w.parts.join("")===w.w')){
  fail("Mission build pool no longer guarantees exact decodable word assembly.");
}
if(!html.includes('nextRandom(activeLearningSyllables(),currentAnswer,4)')||!html.includes('nextRandom(activeLearningSyllables(),currentAnswer,6)')){
  fail("Core syllable distractors are no longer constrained to unlocked syllables.");
}
if(!html.includes('extraBase=activeLearningSyllables()')){
  fail("Build distractors can escape the unlocked curriculum.");
}
if(!html.includes('const pool=decodableSentencePool()')){
  fail("Phrase game no longer filters its sentence pool.");
}

const requiredViews=["home","sounds","syllables","words","games","world","collection","parents"];
for(const view of requiredViews){
  if(!html.includes('data-view="'+view+'"'))fail("Navigation view missing:",view);
}
for(const route of ["world","collection","parents"]){
  if(!html.includes('currentView==="'+route+'"'))fail("Render route missing:",route);
}

const literalActions=[...new Set([...html.matchAll(/data-action="([a-z0-9-]+)"/gi)].map(m=>m[1]))];
const handled=new Set([...html.matchAll(/a==="([^"]+)"/g)].map(m=>m[1]));
const missingActions=literalActions.filter(action=>!handled.has(action));
if(missingActions.length)fail("Buttons without click handlers:",missingActions.join(", "));

if(!html.includes("rewardLedger")||!html.includes("reviewQueue")){
  fail("Adaptive/reward state protections are missing.");
}

if(!html.includes("missionHistory")||!html.includes("startAttempts")||!html.includes("startCorrect")){
  fail("Per-mission tracking is incomplete.");
}
if(!html.includes("startAttempts:null")||!html.includes("if(m.startAttempts==null)")){
  fail("Mission performance timing guard is missing.");
}
if(!html.includes("updatedAt")||!html.includes("localTs>remoteTs")){
  fail("Newest-state sync protection is missing.");
}
if(!html.includes("window.supabase?.createClient")){
  fail("Supabase offline fallback is missing.");
}

console.log("App validation OK");
console.log("- Version:",version);
console.log("- JavaScript syntax: OK");
console.log("- Core functions: OK");
console.log("- Navigation/actions: OK");
console.log("- Reading words:",words.length);
console.log("- Mission decodability guard: OK");
console.log("- Client credential guard: OK");
console.log("- Audio guard: unchanged");

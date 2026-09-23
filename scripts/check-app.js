const fs=require("fs");

const html=fs.readFileSync("index.html","utf8");
const content=fs.readFileSync("content.js","utf8");
const app=fs.readFileSync("app.js","utf8");
const css=fs.readFileSync("styles.css","utf8");
const manifestText=fs.readFileSync("manifest.webmanifest","utf8");
const sw=fs.readFileSync("sw.js","utf8");
const icon=fs.readFileSync("icon.svg","utf8");
const source=html+"\n"+content+"\n"+app;

function fail(message,details=""){
  console.error("VALIDATION FAILED:",message,details);
  process.exit(1);
}

if(!html.includes('href="./styles.css?v='))fail("index.html is not loading styles.css.");
if(!html.includes('src="./content.js?v='))fail("index.html is not loading content.js.");
if(!html.includes('src="./app.js?v='))fail("index.html is not loading app.js.");
if(!html.includes('rel="manifest" href="./manifest.webmanifest"'))fail("index.html is not loading the web app manifest.");
if(!html.includes('rel="icon" href="./icon.svg"'))fail("index.html is not loading the app icon.");
if(html.includes("<style>"))fail("Large inline style block returned to index.html.");
if(/<script>\s*"use strict"/.test(html))fail("Large inline application script returned to index.html.");
if(css.length<5000)fail("styles.css looks unexpectedly small.");
if(content.length<3000)fail("content.js looks unexpectedly small.");
if(app.length<20000)fail("app.js looks unexpectedly small.");

try{
  new Function(app);
}catch(error){
  fail("JavaScript syntax error:",error.message);
}
try{
  new Function(sw);
}catch(error){
  fail("Service Worker syntax error:",error.message);
}
let manifest;
try{manifest=JSON.parse(manifestText)}catch(error){fail("Manifest JSON is invalid:",error.message)}
if(manifest.name!=="La Fabrique des Syllabes"||manifest.display!=="standalone")fail("Manifest identity/display is invalid.");
if(manifest.start_url!=="./"||manifest.scope!=="./")fail("Manifest start_url/scope is invalid.");
if(!Array.isArray(manifest.icons)||!manifest.icons.some(x=>x.src==="./icon.svg"))fail("Manifest icon is missing.");
if(!icon.includes("<svg")||!icon.includes('viewBox="0 0 512 512"'))fail("App icon SVG is invalid.");

const requiredFunctions=[
  "function migrateState(",
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
  "function curriculumMasteryPoints(",
  "function knownFamilyFloor(",
  "function activeLearningSyllables(",
  "function dueReviewSyllables(",
  "function activeSoundData(",
  "function fullyDecodableWords(",
  "function decodableSentencePool(",
  "function comprehensionSentencePool(",
  "function gameMemory(",
  "function missingSyllableWords(",
  "function gameMissing(",
  "function gameComprehension(",
  "function gameFamily(",
  "function worldView(",
  "function collectionView(",
  "function parents(",
  "function parseProgressImport(",
  "function importProgressFile("
];

const missingFunctions=requiredFunctions.filter(token=>!app.includes(token));
if(missingFunctions.length)fail("Missing required app functions:",missingFunctions.join(", "));

const version=app.match(/const APP_VERSION="([^"]+)"/)?.[1];
if(!version)fail("APP_VERSION is missing.");
if(!html.includes('styles.css?v='+version)||!html.includes('content.js?v='+version)||!html.includes('app.js?v='+version)){
  fail("Asset cache-busting version does not match APP_VERSION:",version);
}
if(!sw.includes('lecture-cp-shell-v'+version))fail("Service Worker cache version does not match APP_VERSION:",version);
for(const asset of ['styles.css?v='+version,'content.js?v='+version,'app.js?v='+version]){
  if(!sw.includes(asset))fail("Service Worker shell is missing versioned asset:",asset);
}
if(!app.includes('navigator.serviceWorker.register("./sw.js")'))fail("Service Worker registration is missing.");
if(!app.includes('"controllerchange"')||!app.includes("reg.update()"))fail("Installed-app update notification/check is missing.");
if(!sw.includes('response.ok&&type.includes("text/html")'))fail("Navigation cache can accept invalid HTML responses.");

if(!app.includes('function speakMission(text,rate=.60){speak(text,rate)}')){
  fail("Audio engine changed. Review the known Safari macOS issue before merging.");
}

if(/service[_-]?role/i.test(app)){
  fail("Possible Supabase service-role credential found in client code.");
}
if(!/sb_publishable_/.test(app)){
  fail("Expected Supabase publishable key is missing.");
}
if(!app.includes('.eq("parent_id",session.user.id)')){
  fail("Child profile query is missing the explicit parent_id filter.");
}
if(!app.includes('x.parent_id===session?.user?.id')){
  fail("Child selection ownership guard is missing.");
}

const wordBlock=content.match(/words:\[([\s\S]*?)\],\n sentences:/)?.[1]||"";
const words=[...wordBlock.matchAll(/\{w:"([^"]+)",parts:\[([^\]]*)\],emoji:"([^"]+)"\}/g)].map(m=>({
  word:m[1],
  parts:[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1])
}));
if(words.length<35)fail("Unexpectedly low reading content:",String(words.length));

const duplicateWords=words.map(x=>x.word).filter((w,i,a)=>a.indexOf(w)!==i);
if(duplicateWords.length)fail("Duplicate words:",[...new Set(duplicateWords)].join(", "));

const invalidWords=words.filter(x=>!x.word||!x.parts.length);
if(invalidWords.length)fail("Word entries with missing parts found.");

if(!app.includes('w.parts.every(p=>allowed.has(p))&&w.parts.join("")===w.w')){
  fail("Mission build pool no longer guarantees exact decodable word assembly.");
}
if(!app.includes('nextRandom(activeLearningSyllables(),currentAnswer,4)')||!app.includes('nextRandom(activeLearningSyllables(),currentAnswer,6)')){
  fail("Core syllable distractors are no longer constrained to unlocked syllables.");
}
if(!app.includes('extraBase=activeLearningSyllables()')){
  fail("Build distractors can escape the unlocked curriculum.");
}
if(!app.includes('const pool=decodableSentencePool()')){
  fail("Phrase game no longer filters its sentence pool.");
}
if(!app.includes('Math.min(missionCap,readinessCap)')||!app.includes('Math.max(knownFamilyFloor()')){
  fail("Family unlocks are no longer gated by both mission cadence and learning readiness.");
}
if(app.includes('!!state.soundPractice?.[initial]'))fail("Sound practice alone can unlock an entire legacy family.");
if(!app.includes('practicedWords.has(w.w)&&w.parts.some(p=>set.includes(p))'))fail("Legacy word practice no longer preserves previously worked families.");
if(!app.includes('s.type==="missing"')||!app.includes('s.type==="comprehension"')||!app.includes('["memory","family","missing",...(comprehensionPool.length?["comprehension"]:[])]')){
  fail("Daily mission is missing the adaptive visual/comprehension rotation.");
}
if(!app.includes('sentence=item.sentence;currentAnswer=item.word.w')){
  fail("Comprehension game is not assigning its answer to shared state.");
}
if(!app.includes('memoryMissedPairs.has(a.card.pair)?null:a.card.pair')){
  fail("Memory mistakes can inflate syllable mastery again.");
}

const requiredViews=["home","sounds","syllables","words","games","world","collection","parents"];
for(const view of requiredViews){
  if(!html.includes('data-view="'+view+'"'))fail("Navigation view missing:",view);
}
for(const route of ["world","collection","parents"]){
  if(!app.includes('currentView==="'+route+'"'))fail("Render route missing:",route);
}

const literalActions=[...new Set([...source.matchAll(/data-action="([a-z0-9-]+)"/gi)].map(m=>m[1]))];
const handled=new Set([...app.matchAll(/a==="([^"]+)"/g)].map(m=>m[1]));
const missingActions=literalActions.filter(action=>!handled.has(action));
if(missingActions.length)fail("Buttons without click handlers:",missingActions.join(", "));

if(!app.includes("rewardLedger")||!app.includes("reviewQueue")||!app.includes("soundPractice")||!app.includes("wordPractice")){
  fail("Adaptive/reward state protections are missing.");
}
if(!app.includes("missionHistory")||!app.includes("startAttempts")||!app.includes("startCorrect")){
  fail("Per-mission tracking is incomplete.");
}
if(!app.includes("startAttempts:null")||!app.includes("if(m.startAttempts==null)")){
  fail("Mission performance timing guard is missing.");
}
if(!app.includes("sessionStats")||!app.includes("state.dailyMission.sessionStats")){
  fail("Mission-only performance tracking is missing.");
}
if(!app.includes("STATE_SCHEMA_VERSION")||!app.includes("schemaVersion")){
  fail("Saved-state schema versioning is missing.");
}
if(!app.includes("updatedAt")||!app.includes("localTs>remoteTs")){
  fail("Newest-state sync protection is missing.");
}
if(!app.includes("window.supabase?.createClient")){
  fail("Supabase offline fallback is missing.");
}

console.log("App validation OK");
console.log("- Version:",version);
console.log("- Split architecture: index.html + styles.css + content.js + app.js");
console.log("- JavaScript syntax: OK");
console.log("- Core functions: OK");
console.log("- Navigation/actions: OK");
console.log("- Reading words:",words.length);
console.log("- Curriculum guards: OK");
console.log("- Client credential/ownership guards: OK");
console.log("- Audio guard: unchanged");
console.log("- PWA manifest/service worker: OK");

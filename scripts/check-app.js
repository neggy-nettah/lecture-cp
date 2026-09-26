const fs=require("fs");

const html=fs.readFileSync("index.html","utf8");
const content=fs.readFileSync("content.js","utf8");
const scriptFiles=["progression.js","rewards.js","exercises.js","missions.js","app.js"];
const app=scriptFiles.map(file=>fs.readFileSync(file,"utf8")).join("\n");
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
if(!html.includes('http-equiv="Content-Security-Policy"')||!html.includes("object-src 'none'")||!html.includes("base-uri 'self'")||!html.includes('name="referrer" content="no-referrer"'))fail("Browser security policy headers are missing from the static shell.");
const supabaseUrl=app.match(/const SUPABASE_URL="([^"]+)"/)?.[1]||"",supabaseHost=supabaseUrl.replace(/^https:\/\//,"");
if(!supabaseHost||!html.includes("https://"+supabaseHost)||!html.includes("wss://"+supabaseHost)||html.includes("https://*.supabase.co"))fail("CSP is not restricted to the configured Supabase project.");

if(!html.includes('@supabase/supabase-js@2.117.1')||html.includes('@supabase/supabase-js@2"></script>'))fail("Supabase JS CDN dependency is not pinned to the reviewed version.");
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
if(manifest.id!=="./"||manifest.start_url!=="./"||manifest.scope!=="./")fail("Manifest id/start_url/scope is invalid.");
if(!Array.isArray(manifest.icons)||!manifest.icons.some(x=>x.src==="./icon.svg"))fail("Manifest icon is missing.");
if(!icon.includes("<svg")||!icon.includes('viewBox="0 0 512 512"'))fail("App icon SVG is invalid.");

const requiredFunctions=[
  "function migrateState(",
  "function normalizeState(",
  "function mergeProgressStates(",
  "function mergeMissionHistory(",
  "function mergeDailyMission(",
  "function mergeReviewQueues(",
  "function rewardProgressUnits(",
  "function buildDailyMission(",
  "function missionStructureTarget(",
  "function missionWordMatchesFocus(",
  "function missionFocusedWords(",
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
  "function simpleCvReadiness(",
  "function activeLearningSyllables(",
  "function structureStage(",
  "function structureMasteryKey(",
  "function structureMasterySummary(",
  "function vcStructureReadiness(",
  "function vcStructureUnlocked(",
  "function cvcStructureReadiness(",
  "function cvcStructureUnlocked(",
  "function silentEReadiness(",
  "function silentEUnlocked(",
  "function silentEWordPool(",
  "function dueReviewSyllables(",
  "function activeSoundData(",
  "function fullyDecodableWords(",
  "function decodableSentencePool(",
  "function comprehensionSentencePool(",
  "function gameMemory(",
  "function gameStructure(",
  "function gameVC(",
  "function gameCVC(",
  "function missingSyllableWords(",
  "function gameMissing(",
  "function gameSilentE(",
  "function gameComprehension(",
  "function gameReadAloud(",
  "function gameEncode(",
  "function encodeLetterPool(",
  "function updateEncode(",
  "function phraseToolHelpHTML(",
  "function gameFamily(",
  "function instructionAudio(",
  "function playInstruction(",
  "function silentEWordHTML(",
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
let previousScript=-1;
for(const file of ["content.js",...scriptFiles]){
 const index=html.indexOf('src="./'+file+'?v='+version+'"');
 if(index<0||index<=previousScript)fail("Missing, outdated or misordered script:",file);
 previousScript=index;
 try{new Function(fs.readFileSync(file,"utf8"))}catch(error){fail("Script syntax error:",file+": "+error.message)}
}
const declarations=[...app.matchAll(/^(?:async )?function ([A-Za-z0-9_]+)\(/gm)].map(m=>m[1]);
if(new Set(declarations).size!==declarations.length)fail("Duplicate function declarations across scripts.");
if(!sw.includes('lecture-cp-shell-v'+version))fail("Service Worker cache version does not match APP_VERSION:",version);
for(const asset of ['styles.css?v='+version,'content.js?v='+version,...scriptFiles.map(file=>file+'?v='+version)]){
  if(!sw.includes(asset))fail("Service Worker shell is missing versioned asset:",asset);
}
if(!app.includes('navigator.serviceWorker.register("./sw.js")'))fail("Service Worker registration is missing.");
if(!app.includes('"controllerchange"')||!app.includes("function checkForAppUpdate(")||!app.includes("serviceWorkerRegistration.update()")||!app.includes('document.addEventListener("visibilitychange"'))fail("Installed-app update notification/check is missing.");
// Network fallback and offline HTML coherence are exercised by check-service-worker.js.

if(!app.includes('"silent-e":gameSilentE')||!app.includes('data-action="game-silent-e"')||!app.includes('data-action="silent-e-answer"')){
  fail("Silent-e discovery route/actions are missing.");
}
if(!css.includes("silent-letter.revealed")||!app.includes("SILENT_FINAL_E_WORDS.includes(text)")){
  fail("Silent-letter visual distinction is missing.");
}
if(!app.includes("simpleCvReadiness()")||!app.includes("BASIC_CV_FAMILY_COUNT")){
  fail("Advanced syllable families are no longer mastery-gated.");
}
if(!app.includes('"vc-structures":gameVC')||!app.includes('"cvc-structures":gameCVC')||!app.includes('data-action="structure-answer"')){
  fail("VC/CVC games are not fully routed.");
}
if(!app.includes('else if(s.type==="vc")gameVC(s.target,true)')||!app.includes('else if(s.type==="cvc")gameCVC(s.target,true)')||!app.includes('structurePriority&&day%2===0')){
  fail("VC/CVC stages are not integrated into daily missions.");
}
if(!app.includes('key.startsWith("structure:")')||!app.includes("CVC_STRUCTURE_MIN_CV_SECURE")){
  fail("VC/CVC mastery persistence or gating is missing.");
}

if(!app.includes("function refreshSpeechVoices(")||!app.includes("function speakNow(")||!app.includes('addEventListener?.("voiceschanged",tryVoices)')){
  fail("Speech synthesis voice-loading safeguards are missing.");
}
if(!app.includes('function speakMission(text,rate=.60,cb){speak(text,rate,cb)}')){
  fail("Mission audio wrapper changed unexpectedly.");
}
if((app.match(/instructionAudio\(/g)||[]).length<10||!app.includes('if(fromMission)playInstruction(')){
  fail("Replayable spoken instructions are missing from the autonomous reading flow.");
}
if(!app.includes("blendAudio=first.length>1")||!app.includes('DATA.sounds.find(x=>x.g===first)?.say')){
  fail("Multi-letter grapheme blend audio safeguard is missing.");
}
if(app.includes("=>speak(item.question,.78)")||!app.includes("Quand tu as fini, touche le bouton pour écouter la question")){
  fail("Mini-text question must wait for the child to request it.");
}
if(!app.includes('id="miniTextQuestion"')||!app.includes('if(q)q.hidden=false')){
  fail("Mini-text question needs a visible fallback when requested.");
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
if(!app.includes('<option value="CP">CP — disponible</option>')||!app.includes('<option disabled>Grande section — à venir</option>')||!app.includes('<option disabled>CE1 — à venir</option>')){
  fail("New child profiles expose unsupported school levels.");
}
if(!app.includes("aucun nom complet n’est nécessaire")||!app.includes('autocomplete="off"')){
  fail("Child profile form no longer encourages data minimization.");
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
if(!app.includes("function syllableGraphemes(")||!app.includes("const parts=syllableGraphemes(target)")||!app.includes("activeLearningSyllables().map(syllableGraphemes)")||!app.includes("SYLLABLE_GRAPHEME_OVERRIDES")){
  fail("Encoding bank is no longer based on explicit grapheme composition.");
}
if(!app.includes('recordQuestionSuccess(currentAnswer,"encode:"+currentAnswer)')||!app.includes('recordQuestionError(currentAnswer)')){
  fail("Encoding answers are no longer connected to verified mastery/review tracking.");
}
if(!app.includes("function gameEncode(forcedTarget=null,fromMission=false)")||!app.includes('gameEncode(s.target,true)')){
  fail("Mission encoding must preserve mission context.");
}
if(!app.includes("function gameWordEncode(")||!app.includes("function wordEncodePool(")||!app.includes("function updateWordEncode(")||!app.includes('data-action="game-word-encode"')){
  fail("Dictated word encoding practice is missing.");
}
if(!app.includes('"word-encode":gameWordEncode')||!app.includes('GAME_VIEWS=new Set([')||!app.includes('"word-encode"')){
  fail("Word encoding view no longer restores through the centralized router.");
}
if(!app.includes("WORD_ENCODING_MIN_MISSIONS=4,WORD_ENCODING_MIN_MASTERY_POINTS=10")||!app.includes("function wordEncodingReadiness()")||!app.includes("if(!wordEncodingUnlocked()){activate(\"games\");return}")){
  fail("Word encoding is no longer protected by its readiness gate.");
}
if(!app.includes('wordEncodePool().filter')&&!app.includes('decodableMissionWords().filter(word=>word.parts.length>=2')){
  fail("Word encoding no longer uses the decodable curriculum.");
}
if(!app.includes('wordEncodeMade.join("")===currentAnswer.parts.join("")')||!app.includes('recordQuestionSuccess("word:"+currentAnswer.w,key)')||!app.includes('recordQuestionError("word:"+currentAnswer.w)')){
  fail("Word encoding is no longer verified as word-level mastery evidence.");
}
if(!app.includes("function wordLearningWeight(")||!app.includes("needsHelp?4:0")||!app.includes("stale?2:0")){
  fail("Adaptive word weighting no longer prioritizes weak and stale words.");
}
if(!app.includes("function wordMasterySummary()")||!app.includes("Mots évalués")||!app.includes("wm.evaluated")){
  fail("Parent dashboard no longer exposes word mastery.");
}
if(!app.includes("Mots à renforcer")||!app.includes("wm.weakest")){
  fail("Parent dashboard no longer separates weak words from syllables.");
}
if(!app.includes('data-action="parent-word-review"')||!app.includes('gameWordEncode(word,true)')||!app.includes("fromParent=false")){
  fail("Parent weak-word practice is no longer actionable.");
}
if(!app.includes('const pool=decodableSentencePool()')){
  fail("Phrase game no longer filters its sentence pool.");
}
if(!app.includes('Math.min(missionCap,readinessCap)')||!app.includes('Math.max(knownFamilyFloor()')){
  fail("Family unlocks are no longer gated by both mission cadence and learning readiness.");
}
if(!app.includes("Math.ceil(DATA.sets.flat().length*2/3)")||!app.includes("unlockedFamilyCount()>=DATA.sets.length")){
  fail("Course completion no longer expands with the curriculum.");
}
if(!app.includes("SENTENCE_MIN_MISSIONS=8,SENTENCE_MIN_MASTERY_POINTS=12")||!app.includes("function sentenceReadiness()")||!app.includes("missions>=SENTENCE_MIN_MISSIONS&&points>=SENTENCE_MIN_MASTERY_POINTS")){
  fail("Sentence activities are no longer gated by both practice cadence and demonstrated mastery.");
}
if(!app.includes("TEXT_COMPREHENSION_MIN_MISSIONS=12,TEXT_COMPREHENSION_MIN_MASTERY_POINTS=20")||!app.includes("function miniTextPool()")||!app.includes("function gameMiniText(")||!app.includes('data-action="game-mini-text"')){
  fail("Mini-text comprehension progression is missing.");
}
if(!app.includes('"mini-text":gameMiniText')||!app.includes('GAME_VIEWS=new Set([')||!app.includes('"mini-text"')){
  fail("Mini-text view no longer restores through the centralized router.");
}
if(app.includes('recordQuestionSuccess("sentence:"')||app.includes('recordQuestionError("sentence:"'))fail("Sentence ordering must not create unused mastery keys.");
if(!app.includes("function validMasteryKey(")||!app.includes("validMasteryKey(k)&&v")){
  fail("Saved mastery is no longer pruned to known syllable and word keys.");
}
if(app.includes('!!state.soundPractice?.[initial]'))fail("Sound practice alone can unlock an entire legacy family.");
if(!app.includes('practicedWords.has(w.w)&&w.parts.some(p=>set.includes(p))'))fail("Legacy word practice no longer preserves previously worked families.");
if(!app.includes('s.type==="missing"')||!app.includes('s.type==="encode"')||!app.includes('s.type==="comprehension"')||!app.includes('visualModes=["memory","family","missing"')||!app.includes('["encode"]')||!app.includes('["comprehension"]')){
  fail("Daily mission is missing the adaptive visual/encoding/comprehension rotation.");
}
if(!app.includes('if(!hideable.length){word=pick(pool)')||!app.includes('if(!word||!hideable.length)')){
  fail("Missing-syllable game no longer recovers safely from invalid legacy targets.");
}
if(!app.includes("missionFocusedWords(missingCandidates,primary,review)")||!app.includes("focusedComprehension=comprehensionPool.filter")){
  fail("Mission word/context steps no longer reinforce the current learning focus.");
}
if(!app.includes('sentence=item.sentence;currentAnswer=item.word.w')){
  fail("Comprehension game is not assigning its answer to shared state.");
}
if(!app.includes("phraseToolHelpHTML(sentence)")||!app.includes("phraseToolHelpHTML(arr)")){
  fail("Phrase exercises are missing autonomous audio help for tool words.");
}
const readAloudBlock=app.match(/function gameReadAloud\([\s\S]*?\n}\n\nfunction gameOrder\(/)?.[0]||"";
if(!readAloudBlock||/recordAttempt\(|recordQuestionSuccess\(|recordQuestionError\(|rewardVerified\(|setDone\(/.test(readAloudBlock)){
  fail("Read-aloud practice must remain unscored and outside mastery tracking.");
}
if(!app.includes('if(a==="readaloud-done")')||!app.includes('if(a==="readaloud-model")')){
  fail("Read-aloud completion/model actions are missing.");
}
if(!app.includes('const UI_TEXT_SIZE_KEY="lectureCpLargeText"')||!app.includes("function storedLargeTextPreference(")||!app.includes("function applyTextSizePreference(")){
  fail("Safe local large-text preference is missing.");
}
if(!app.includes("function safeStorageGet(")||!app.includes("function safeStorageSet(")||app.includes('localStorage.getItem("lastChildId")')){
  fail("Local storage access is not fully routed through resilient helpers.");
}
if((app.match(/localStorage\.getItem\(/g)||[]).length!==1||(app.match(/localStorage\.setItem\(/g)||[]).length!==1||(app.match(/localStorage\.removeItem\(/g)||[]).length!==0){
  fail("Direct localStorage access escaped the resilient storage helpers.");
}
if(!html.includes('id="textSizeBtn"')||!css.includes(".large-text .titlebar h2")){
  fail("Large-text control or styles are missing.");
}
if(!html.includes('id="progressBarWrap" role="progressbar"')||!html.includes('id="syncStatus" role="status" aria-live="polite"')||!app.includes('setAttribute("aria-valuenow",String(pct))')){
  fail("Progress or synchronization accessibility semantics are missing.");
}
if(!app.includes('setAttribute("aria-current",active?"page":"false")'))fail("Active navigation is not exposed with aria-current.");
if(!app.includes('memoryMissedPairs.has(a.card.pair)?null:a.card.pair')){
  fail("Memory mistakes can inflate syllable mastery again.");
}

const requiredViews=["home","sounds","syllables","words","games","world","collection","parents"];
for(const view of requiredViews){
  if(!html.includes('data-view="'+view+'"'))fail("Navigation view missing:",view);
}
if(!app.includes("RESTORABLE_VIEWS=new Set(")||!app.includes("function normalizedView(")||!app.includes("const views={")){
  fail("Centralized view registry is missing.");
}
for(const route of ["world:worldView","collection:collectionView","parents"]){
  if(!app.includes(route))fail("Render route missing:",route);
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
if(!app.includes("function flushPendingProgress()")||!app.includes('"visibilitychange"')||!app.includes('"pagehide"')){
  fail("Background progress flush protection is missing.");
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
if(!app.includes("updatedAt")||!app.includes("mergeProgressStates(local,remote)")){
  fail("Cross-device sync merge protection is missing.");
}
if(!app.includes("Math.max(local.stars||0,remote.stars||0)")||!app.includes("mergeMissionHistory(local.missionHistory,remote.missionHistory)")){
  fail("Monotonic progress fields are no longer merged across devices.");
}
if(!app.includes("mergeReviewQueues(local.reviewQueue,remote.reviewQueue,preferred.reviewQueue)")){
  fail("Cross-device merge no longer preserves review-queue weighting.");
}
if(!app.includes("rewardUnits%4")||!app.includes("Math.floor(rewardUnits/4)")){
  fail("Puzzle progress is no longer reconciled as one monotonic reward counter.");
}
if(!app.includes("window.supabase?.createClient")){
  fail("Supabase offline fallback is missing.");
}

console.log("App validation OK");
console.log("- Version:",version);
console.log("- Split architecture: index.html + styles.css + content.js + progression.js + rewards.js + exercises.js + missions.js + app.js");
console.log("- JavaScript syntax: OK");
console.log("- Core functions: OK");
console.log("- Navigation/actions: OK");
console.log("- Reading words:",words.length);
console.log("- Curriculum guards: OK");
console.log("- Client credential/ownership guards: OK");
console.log("- Replayable audio instructions: OK");
console.log("- PWA manifest/service worker: OK");

if(/super lectrice/i.test(html+app))fail("Gendered default reading copy has returned.");

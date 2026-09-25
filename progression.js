"use strict";
// Learning rules and answer tracking. Loaded after content.js, before app.js.
// Functions read the active state at call time; persistence/UI remain in app.js.

function masteryLevel(key){
 const m=(state.mastery||{})[key];if(!m||!m.attempts)return 0;
 const accuracy=m.correct/m.attempts;
 if(m.correct>=4&&accuracy>=.75)return 3;
 if(m.correct>=2&&accuracy>=.60)return 2;
 if(m.correct>=1)return 1;
 return 0
}
function masteryStars(key){const n=masteryLevel(key);return "★".repeat(n)+"☆".repeat(3-n)}
function resetQuestionTracking(){
 questionAssisted=false;
 questionErrorRecorded=!!(missionMode&&state.dailyMission?.failedSteps?.[state.dailyMission.index])
}
function recordQuestionSuccess(key=null,challengeKey=""){
 // Correcting a previously failed question earns encouragement, not mastery.
 return recordAttempt(true,questionErrorRecorded||questionAssisted?null:key,challengeKey)
}
function recordQuestionError(key=null){
 if(questionErrorRecorded)return false;
 questionErrorRecorded=true;
 if(missionMode&&state.dailyMission){
  const m=state.dailyMission;m.failedSteps=m.failedSteps||{};m.failedSteps[m.index]=true
 }
 recordAttempt(false,key);return true
}
function scopedChallengeKey(challengeKey=""){
 if(!challengeKey)return "";
 if(missionMode){
  const m=state.dailyMission||{},step=Number.isInteger(m.index)?m.index:0;
  return "mission:"+(m.date||localDayKey())+":"+step+":"+challengeKey
 }
 return "free:"+challengeKey
}
function recordAttempt(correct,key=null,challengeKey=""){
 state.attemptLedger=state.attemptLedger||{};
 const scoped=scopedChallengeKey(challengeKey),ledgerKey=correct&&scoped?localDayKey()+"|"+scoped:"";
 if(ledgerKey&&state.attemptLedger[ledgerKey])return false;
 if(ledgerKey){
  state.attemptLedger[ledgerKey]=1;
  const keys=Object.keys(state.attemptLedger);if(keys.length>700)keys.slice(0,keys.length-400).forEach(k=>delete state.attemptLedger[k])
 }
 state.stats=state.stats||{attempts:0,correct:0};
 const beforeAttempts=state.stats.attempts||0,beforeCorrect=state.stats.correct||0;
 state.stats.attempts++;if(correct)state.stats.correct++;
 if(missionMode&&state.dailyMission){
  let ss=state.dailyMission.sessionStats;
  if(!ss){
   const legacy=typeof state.dailyMission.startAttempts==="number"&&typeof state.dailyMission.startCorrect==="number";
   ss={attempts:legacy?Math.max(0,beforeAttempts-state.dailyMission.startAttempts):0,correct:legacy?Math.max(0,beforeCorrect-state.dailyMission.startCorrect):0}
  }
  ss.attempts++;if(correct)ss.correct++;state.dailyMission.sessionStats=ss
 }
 if(key){
  state.mastery=state.mastery||{};const m=state.mastery[key]||{attempts:0,correct:0};
  m.attempts++;if(correct)m.correct++;m.lastSeen=localDayKey();if(correct)m.lastCorrect=localDayKey();state.mastery[key]=m;
  if(DATA.sets.flat().includes(key)){
   state.reviewQueue=Array.isArray(state.reviewQueue)?state.reviewQueue:[];
   if(correct){const i=state.reviewQueue.indexOf(key);if(i>=0)state.reviewQueue.splice(i,1)}
   else{state.reviewQueue.push(key,key);state.reviewQueue=state.reviewQueue.slice(-24)}
  }
 }
 save();return true
}
function daysSinceDayKey(key){
 if(!key)return 0;
 const d=new Date(key+"T00:00:00"),today=new Date();today.setHours(0,0,0,0);
 return Math.max(0,Math.round((today-d)/86400000))
}
function reviewIntervalDays(key){
 const level=masteryLevel(key);
 return level===1?1:level===2?3:level===3?7:0
}
function reviewDueInfo(key){
 const m=state.mastery?.[key],interval=reviewIntervalDays(key),age=m?.lastSeen?daysSinceDayKey(m.lastSeen):0;
 return {interval,age,due:!!m?.lastSeen&&interval>0&&age>=interval,overdue:Math.max(0,age-interval)}
}
function dueReviewSyllables(){
 return activeLearningSyllables().filter(s=>reviewDueInfo(s).due).sort((a,b)=>reviewDueInfo(b).overdue-reviewDueInfo(a).overdue)
}
function curriculumMasteryPoints(){return DATA.sets.flat().reduce((sum,s)=>sum+masteryLevel(s),0)}
function familyGraphemeAt(index){
 return DATA.familyGraphemes?.[index]||((DATA.sets?.[index]?.[0]||"")[0]||"")
}
function familyGraphemeForSet(set){
 const index=DATA.sets.indexOf(set);
 if(index>=0)return familyGraphemeAt(index);
 const first=Array.isArray(set)?set[0]:"";
 return first?familyGraphemeForSyllable(first):""
}
function familyGraphemeForSyllable(syllable){
 const index=DATA.sets.findIndex(set=>set.includes(syllable));return index>=0?familyGraphemeAt(index):""
}
function syllableRemainder(syllable){
 const grapheme=familyGraphemeForSyllable(syllable);
 return grapheme&&String(syllable).startsWith(grapheme)?String(syllable).slice(grapheme.length):""
}
function knownFamilyFloor(){
 let floor=3;
 const practicedWords=new Set(Object.entries(state.wordPractice||{}).filter(([,v])=>!!v).map(([w])=>w));
 DATA.sets.forEach((set,i)=>{
  const syllableWorked=set.some(s=>(state.mastery?.[s]?.attempts||0)>0);
  const wordWorked=DATA.words.some(w=>practicedWords.has(w.w)&&w.parts.some(p=>set.includes(p)));
  if(syllableWorked||wordWorked)floor=Math.max(floor,i+1)
 });
 return Math.min(DATA.sets.length,floor)
}
function completedMissionCount(snapshot=state){
 const dates=new Set((snapshot.missionHistory||[]).map(x=>stateDay(x?.date)).filter(Boolean));
 return Math.max(stateCount(snapshot.missionCount),dates.size)
}
function missionDates(snapshot=state){return [...new Set((snapshot.missionHistory||[]).map(x=>stateDay(x?.date)).filter(d=>d&&d<=localDayKey()))].sort()}
function bestMissionStreak(snapshot=state){
 let best=0,run=0,previous=null;
 for(const day of missionDates(snapshot)){
  const timestamp=Date.parse(day);run=previous!==null&&timestamp-previous===86400000?run+1:1;best=Math.max(best,run);previous=timestamp
 }
 return Math.min(completedMissionCount(snapshot),Math.max(stateCount(snapshot.bestMissionStreak),best))
}
function unlockedFamilyCount(){
 const missions=completedMissionCount(),points=curriculumMasteryPoints();
 const missionCap=Math.min(DATA.sets.length,3+Math.floor(missions/2)),readinessCap=Math.min(DATA.sets.length,3+Math.floor(points/6));
 return Math.min(DATA.sets.length,Math.max(knownFamilyFloor(),Math.min(missionCap,readinessCap)))
}
function activeLearningSyllables(){
 const unlocked=DATA.sets.slice(0,unlockedFamilyCount()).flat(),known=Object.keys(state.mastery||{}).filter(k=>DATA.sets.flat().includes(k));
 return [...new Set([...unlocked,...known])]
}
function activeSoundGraphemes(){
 const consonants=DATA.familyGraphemes.slice(0,unlockedFamilyCount());
 return new Set(["a","e","i","o","u","é",...consonants])
}
function activeSoundData(){const allowed=activeSoundGraphemes();return DATA.sounds.filter(x=>allowed.has(x.g))}
const WORD_ENCODING_MIN_MISSIONS=4,WORD_ENCODING_MIN_MASTERY_POINTS=10;
function wordEncodingReadiness(){
 const missions=completedMissionCount(),points=curriculumMasteryPoints();
 return {missions,points,ready:missions>=WORD_ENCODING_MIN_MISSIONS&&points>=WORD_ENCODING_MIN_MASTERY_POINTS,remainingMissions:Math.max(0,WORD_ENCODING_MIN_MISSIONS-missions),remainingPoints:Math.max(0,WORD_ENCODING_MIN_MASTERY_POINTS-points)}
}
function wordEncodingUnlocked(){return wordEncodingReadiness().ready}
function wordEncodingUnlockText(){
 const s=wordEncodingReadiness();
 if(s.ready)return "Encodage de mots disponible";
 if(s.remainingMissions>0&&s.remainingPoints>0)return "Encore "+s.remainingMissions+" mission(s) et un peu de consolidation";
 if(s.remainingMissions>0)return "Encore "+s.remainingMissions+" mission(s)";
 return "Consolide encore les syllabes"
}

const SENTENCE_MIN_MISSIONS=8,SENTENCE_MIN_MASTERY_POINTS=12;
function sentenceReadiness(){
 const missions=completedMissionCount(),points=curriculumMasteryPoints();
 return {missions,points,ready:missions>=SENTENCE_MIN_MISSIONS&&points>=SENTENCE_MIN_MASTERY_POINTS,remainingMissions:Math.max(0,SENTENCE_MIN_MISSIONS-missions),remainingPoints:Math.max(0,SENTENCE_MIN_MASTERY_POINTS-points)}
}
function sentenceUnlocked(){return sentenceReadiness().ready}
function sentenceUnlockText(){
 const s=sentenceReadiness();
 if(s.ready)return "Phrases disponibles";
 if(s.remainingMissions>0&&s.remainingPoints>0)return "Encore "+s.remainingMissions+" mission(s) et un peu de consolidation";
 if(s.remainingMissions>0)return "Encore "+s.remainingMissions+" mission(s)";
 return "Consolide encore les syllabes"
}
function curriculumStatus(){
 const count=unlockedFamilyCount(),missions=completedMissionCount(),points=curriculumMasteryPoints();
 if(count>=DATA.sets.length)return {count,complete:true,next:null,remainingMissions:0,remainingPoints:0};
 const next=DATA.sets[count],missionThreshold=2*(count-2),pointThreshold=6*(count-2);
 return {count,complete:false,next,nextInitial:familyGraphemeAt(count).toUpperCase()||"?",remainingMissions:Math.max(0,missionThreshold-missions),remainingPoints:Math.max(0,pointThreshold-points)}
}
function curriculumNextText(){
 const s=curriculumStatus();if(s.complete)return "Toutes les familles sont ouvertes.";
 if(s.remainingMissions>0&&s.remainingPoints>0)return "Prochaine famille "+s.nextInitial+" : encore "+s.remainingMissions+" mission(s) et un peu de consolidation.";
 if(s.remainingMissions>0)return "Prochaine famille "+s.nextInitial+" dans "+s.remainingMissions+" mission(s).";
 if(s.remainingPoints>0)return "Prochaine famille "+s.nextInitial+" : consolide encore les syllabes actuelles.";
 return "Prochaine famille "+s.nextInitial+" bientôt."
}
function familyRoadmapHTML(){
 const status=curriculumStatus(),count=status.count;
 return '<div class="family-roadmap">'+DATA.sets.map((set,i)=>{const initial=familyGraphemeAt(i).toUpperCase()||"?",open=i<count,isNext=i===count,nextLabel=status.remainingMissions>0?"dans "+status.remainingMissions+" mission(s)":status.remainingPoints>0?"à consolider":"bientôt";return '<div class="family-chip '+(open?"open":"locked")+'"><div>'+(open?initial:"🔒")+'</div><small>'+(open?"famille "+initial:isNext?nextLabel:"à venir")+'</small></div>'}).join("")+'</div>'
}
function soundPracticeComplete(){const practiced=state.soundPractice||{};return activeSoundData().every(x=>!!practiced[x.g])}
function wordPracticeComplete(){const pool=decodableMissionWords(),practiced=state.wordPractice||{},target=Math.min(5,pool.length);return target>0&&pool.filter(w=>practiced[w.w]).length>=target}
function learningCourseCompleted(){return completedMissionCount()>=14&&masterySummary().mastered>=40}
const PHRASE_NAME_PARTS={papa:["pa","pa"],lili:["li","li"],nina:["ni","na"],papi:["pa","pi"],"mémé":["mé","mé"]};
function phraseTokenParts(token){
 const clean=String(token||"").toLowerCase().replace(/[.!?,;:]/g,"");
 if(["a","un","une","le"].includes(clean))return [];
 const word=DATA.words.find(w=>w.w===clean);return word?.parts||PHRASE_NAME_PARTS[clean]||null
}
function decodableSentencePool(){
 const allowed=new Set([...activeLearningSyllables(),..."aioueé"]);
 return DATA.sentences.filter(arr=>arr.every(token=>{
  const parts=phraseTokenParts(token);if(parts===null)return false;if(parts.length===0)return true;
  const clean=String(token).toLowerCase().replace(/[.!?,;:]/g,"");
  return !DEFERRED_WORDS.includes(clean)&&parts.join("")===clean&&parts.every(p=>allowed.has(p))
 }))
}
function comprehensionSentencePool(){
 return decodableSentencePool().map(sentence=>{
  const targetToken=[...sentence].reverse().find(token=>DATA.words.some(w=>w.w===String(token).toLowerCase().replace(/[.!?,;:]/g,"")));
  const clean=targetToken?String(targetToken).toLowerCase().replace(/[.!?,;:]/g,""):"",word=DATA.words.find(w=>w.w===clean);
  return word&&PICTURE_WORDS.includes(word.w)?{sentence,word}:null
 }).filter(Boolean)
}
function pickLearningSyllable(){
 const all=activeLearningSyllables(),weighted=[];
 const recentPrimary=new Set((state.missionHistory||[]).slice(-2).map(m=>m.primary));
 const errors=[...new Set((state.reviewQueue||[]).slice(-12).reverse())].filter(s=>all.includes(s));
 // A recent mistake should be revisited soon, while avoiding the same mission focus every day.
 const priority=errors.find(s=>!recentPrimary.has(s));
 if(priority&&Math.random()<.5)return priority;
 all.forEach(s=>{
  const level=masteryLevel(s),due=reviewDueInfo(s).due?3:0,weight=Math.max(1,[5,4,2,1][level]+due-(recentPrimary.has(s)?3:0));
  for(let i=0;i<weight;i++)weighted.push(s)
 });
 (state.reviewQueue||[]).forEach(s=>{if(all.includes(s))for(let i=0;i<3;i++)weighted.push(s)});
 return pick(weighted.length?weighted:all)
}
function localDayKey(){
 const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
 return y+"-"+m+"-"+day
}
function weakestSyllable(exclude=""){
 const all=activeLearningSyllables().filter(s=>s!==exclude),attempted=all.filter(s=>(state.mastery?.[s]?.attempts||0)>0);
 if(attempted.length){
  return [...attempted].sort((a,b)=>{
   const ma=state.mastery[a],mb=state.mastery[b],aa=(ma.correct||0)/Math.max(1,ma.attempts),ab=(mb.correct||0)/Math.max(1,mb.attempts);
   return aa-ab || (ma.correct||0)-(mb.correct||0)
  })[0]
 }
 return pick(all)
}
function fullyDecodableWords(){
 const allowed=new Set([...DATA.sets.flat(),...DATA.sounds.filter(x=>"aioueé".includes(x.g)).map(x=>x.g)]);
 return DATA.words.filter(w=>w.parts.every(p=>allowed.has(p))&&w.parts.join("")===w.w&&!DEFERRED_WORDS.includes(w.w))
}
function decodableMissionWords(){
 const allowed=new Set([...activeLearningSyllables(),...DATA.sounds.filter(x=>"aioueé".includes(x.g)).map(x=>x.g)]);
 return DATA.words.filter(w=>w.parts.every(p=>allowed.has(p))&&w.parts.join("")===w.w&&!DEFERRED_WORDS.includes(w.w))
}
function missingSyllableWords(){const active=new Set(activeLearningSyllables());return decodableMissionWords().filter(w=>w.parts.some(p=>active.has(p)))}
function pickReviewSyllable(exclude=""){
 const all=activeLearningSyllables(),recent=[...(state.reviewQueue||[])].reverse().filter(s=>s!==exclude&&all.includes(s));
 if(recent.length)return recent[0];
 const due=dueReviewSyllables().filter(s=>s!==exclude);
 if(due.length)return due[0];
 return weakestSyllable(exclude)
}
function masterySummary(){
 const syllables=DATA.sets.flat(),levels=syllables.map(s=>({s,level:masteryLevel(s),m:state.mastery?.[s]||{attempts:0,correct:0}}));
 const mastered=levels.filter(x=>x.level===3).length,learning=levels.filter(x=>x.level===1||x.level===2).length,unseen=levels.filter(x=>!x.m.attempts).length,needsReview=levels.filter(x=>x.level===0&&x.m.attempts>0).length;
 const attempted=levels.filter(x=>x.m.attempts>0).sort((a,b)=>{
  const aa=a.m.correct/Math.max(1,a.m.attempts),ab=b.m.correct/Math.max(1,b.m.attempts);
  return aa-ab || b.m.attempts-a.m.attempts
 });
 return {total:syllables.length,mastered,learning,unseen,needsReview,weakest:attempted.filter(x=>x.level<3).slice(0,6)}
}

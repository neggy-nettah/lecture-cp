"use strict";
const SUPABASE_URL="https://dqxwwxzpvxroiueqursc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_uyKC1ioxc2-1MgOscqyDlQ_0AMqbOli";
const APP_URL="https://neggy-nettah.github.io/lecture-cp/";
const APP_VERSION="0.39.0";
const STATE_SCHEMA_VERSION=1;
const incomingAuthLinkError=/(?:#|&)error(?:_code)?=/.test(window.location?.hash||"");
const sb=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
const DEFAULT_STATE={schemaVersion:STATE_SCHEMA_VERSION,updatedAt:0,stars:0,streak:0,name:"",done:{},stats:{attempts:0,correct:0},mastery:{},reviewQueue:[],attemptLedger:{},rewardLedger:{},soundPractice:{},wordPractice:{},rewards:{towardPiece:0,pieces:0,puzzles:0,collection:[]},dailyMission:null,missionHistory:[],sound:0,set:0,word:0,gameWins:0,lastView:"home"};
let session=null,currentChild=null,children=[],saveTimer=null,remoteSaveInFlight=false;
const pendingProfileSaves=new Map();
let profileLoadSequence=0,localSaveFailed=false,profileLoading=false;
const UI_TEXT_SIZE_KEY="lectureCpLargeText";
function storedLargeTextPreference(){
 try{return localStorage.getItem(UI_TEXT_SIZE_KEY)==="1"}catch(error){return false}
}
function applyTextSizePreference(enabled=storedLargeTextPreference()){
 document.body.classList.toggle("large-text",!!enabled);
 const button=document.querySelector("#textSizeBtn");if(button&&typeof button.setAttribute==="function"){button.setAttribute("aria-pressed",enabled?"true":"false");button.textContent=enabled?"Aa−":"Aa+";button.title=enabled?"Revenir à la taille normale":"Agrandir les textes"}
 return !!enabled
}

function migrateState(raw){const src=raw&&typeof raw==="object"?{...raw}:{};src.schemaVersion=STATE_SCHEMA_VERSION;return src}
function stateObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function stateCount(value){const n=typeof value==="number"||typeof value==="string"?Number(value):NaN;return Number.isFinite(n)?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(n))):0}
function stateStats(value){const v=stateObject(value),attempts=stateCount(v.attempts);return {attempts,correct:Math.min(attempts,stateCount(v.correct))}}
function stateDay(value){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:null}
function stateFlags(value){return Object.fromEntries(Object.entries(stateObject(value)).filter(([k,v])=>!["__proto__","constructor","prototype"].includes(k)&&(v===true||v===1)).map(([k])=>[k,true]))}
function newerState(a,b){return Number(a?.updatedAt||0)>=Number(b?.updatedAt||0)?a:b}
function strongerMastery(a,b){
 if(!a)return b;if(!b)return a;
 const aa=stateStats(a),bb=stateStats(b);
 if(aa.attempts!==bb.attempts)return aa.attempts>bb.attempts?a:b;
 if(aa.correct!==bb.correct)return aa.correct>bb.correct?a:b;
 const aSeen=stateDay(a.lastSeen)||"",bSeen=stateDay(b.lastSeen)||"";
 return aSeen>=bSeen?a:b
}
function mergeMissionHistory(a,b){
 const byDay=new Map();
 for(const item of [...(a||[]),...(b||[])]){
  const day=stateDay(item?.date);if(!day)continue;
  const prev=byDay.get(day);
  if(!prev||stateCount(item?.attempts)>stateCount(prev?.attempts)||(stateCount(item?.attempts)===stateCount(prev?.attempts)&&stateCount(item?.correct)>stateCount(prev?.correct)))byDay.set(day,item)
 }
 return [...byDay.values()].sort((x,y)=>String(x.date).localeCompare(String(y.date))).slice(-60)
}
function mergeDailyMission(a,b,preferred){
 const ma=stateObject(a),mb=stateObject(b),da=stateDay(ma.date),db=stateDay(mb.date);
 if(!da&&!db)return null;if(!da)return mb;if(!db)return ma;
 if(da!==db)return da>db?ma:mb;
 const ia=stateCount(ma.index),ib=stateCount(mb.index);
 if(ia!==ib)return ia>ib?ma:mb;
 return preferred===a?ma:mb
}
function mergeReviewQueues(a,b,preferred){
 const allowed=new Set(DATA.sets.flat()),qa=(a||[]).filter(s=>allowed.has(s)),qb=(b||[]).filter(s=>allowed.has(s)),preferredQueue=preferred===a?qa:qb,otherQueue=preferred===a?qb:qa;
 const counts=new Map();
 for(const s of new Set([...qa,...qb]))counts.set(s,Math.max(qa.filter(x=>x===s).length,qb.filter(x=>x===s).length));
 const recency=[];
 for(const s of [...otherQueue,...preferredQueue]){const i=recency.indexOf(s);if(i>=0)recency.splice(i,1);recency.push(s)}
 const out=[];for(const s of recency)for(let i=0;i<(counts.get(s)||0);i++)out.push(s);
 return out.slice(-24)
}
function rewardProgressUnits(snapshot){
 const r=snapshot?.rewards||{};
 return Math.max(completedMissionCount(snapshot),stateCount(r.puzzles)*4+Math.min(3,stateCount(r.pieces)))
}
function mergeProgressStates(localRaw,remoteRaw){
 const local=normalizeState(localRaw),remote=normalizeState(remoteRaw),preferred=newerState(local,remote),other=preferred===local?remote:local;
 const merged=normalizeState({...other,...preferred});
 merged.updatedAt=Math.max(local.updatedAt||0,remote.updatedAt||0);
 merged.stars=Math.max(local.stars||0,remote.stars||0);
 merged.gameWins=Math.max(local.gameWins||0,remote.gameWins||0);
 merged.missionHistory=mergeMissionHistory(local.missionHistory,remote.missionHistory);
 merged.missionCount=Math.max(completedMissionCount(local),completedMissionCount(remote),merged.missionHistory.length);
 merged.bestMissionStreak=Math.max(bestMissionStreak(local),bestMissionStreak(remote),bestMissionStreak({...merged,missionHistory:merged.missionHistory}));
 for(const key of ["done","attemptLedger","rewardLedger","soundPractice","wordPractice"])merged[key]={...(local[key]||{}),...(remote[key]||{})};
 const masteryKeys=new Set([...Object.keys(local.mastery||{}),...Object.keys(remote.mastery||{})]);
 merged.mastery={};for(const key of masteryKeys)merged.mastery[key]=strongerMastery(local.mastery?.[key],remote.mastery?.[key]);
 merged.reviewQueue=mergeReviewQueues(local.reviewQueue,remote.reviewQueue,preferred.reviewQueue);
 const collectionIds=new Set(),collection=[];
 for(const item of [...(local.rewards?.collection||[]),...(remote.rewards?.collection||[])]){const known=COLLECTIBLES.find(x=>x.id===item?.id);if(known&&!collectionIds.has(known.id)){collection.push({...known});collectionIds.add(known.id)}}
 const rewardUnits=Math.max(rewardProgressUnits(local),rewardProgressUnits(remote),merged.missionCount);
 merged.rewards={towardPiece:0,pieces:rewardUnits%4,puzzles:Math.floor(rewardUnits/4),collection};
 merged.stars=Math.max(merged.stars,Object.keys(merged.rewardLedger||{}).length);
 merged.dailyMission=mergeDailyMission(local.dailyMission,remote.dailyMission,preferred.dailyMission);
 merged.stats={attempts:Math.max(local.stats?.attempts||0,remote.stats?.attempts||0),correct:Math.max(local.stats?.correct||0,remote.stats?.correct||0)};
 if(merged.stats.correct>merged.stats.attempts)merged.stats.correct=merged.stats.attempts;
 return normalizeState(merged)
}

function normalizeState(raw){
 raw=migrateState(stateObject(raw));
 const out={...DEFAULT_STATE,...raw,schemaVersion:STATE_SCHEMA_VERSION};
 for(const key of ["updatedAt","stars","streak","sound","set","word","gameWins"])out[key]=stateCount(raw[key]);
 out.name=typeof raw.name==="string"?raw.name:"";
 out.lastView=typeof raw.lastView==="string"?raw.lastView:"home";
 out.stats=stateStats(raw.stats);
 for(const key of ["done","attemptLedger","rewardLedger","soundPractice","wordPractice"])out[key]=stateFlags(raw[key]);
 out.mastery=Object.fromEntries(Object.entries(stateObject(raw.mastery)).filter(([,v])=>v&&typeof v==="object"&&!Array.isArray(v)).map(([k,v])=>[k,{...stateStats(v),lastSeen:stateDay(v.lastSeen),lastCorrect:stateDay(v.lastCorrect)}]));
 out.reviewQueue=Array.isArray(raw.reviewQueue)?raw.reviewQueue.filter(s=>typeof s==="string"&&DATA.sets.flat().includes(s)):[];
 out.missionHistory=Array.isArray(raw.missionHistory)?raw.missionHistory.filter(x=>x&&typeof x==="object"&&!Array.isArray(x)).map(x=>{
  const stats=stateStats(x);return {...x,...stats,date:stateDay(x.date)||"",primary:typeof x.primary==="string"?x.primary:"",review:typeof x.review==="string"?x.review:"",word:typeof x.word==="string"?x.word:"",accuracy:x.accuracy==null?null:(stats.attempts?Math.round(stats.correct/stats.attempts*100):100)}
 }):[];
 out.missionCount=completedMissionCount(out);out.bestMissionStreak=bestMissionStreak(out);
 const rewards=stateObject(raw.rewards),ids=new Set();
 out.rewards={towardPiece:0,pieces:Math.min(3,stateCount(rewards.pieces)),puzzles:stateCount(rewards.puzzles),collection:[]};
 for(const item of Array.isArray(rewards.collection)?rewards.collection:[]){
  const known=COLLECTIBLES.find(x=>x.id===item?.id);
  if(known&&!ids.has(known.id)){out.rewards.collection.push({...known});ids.add(known.id)}
 }
 const m=stateObject(raw.dailyMission);
 out.dailyMission=Object.keys(m).length?{...m,index:Math.min(5,stateCount(m.index)),completed:stateCount(m.index)>=5,failedSteps:stateFlags(m.failedSteps)}:null;
 if(out.dailyMission&&m.sessionStats)out.dailyMission.sessionStats=stateStats(m.sessionStats);
 return out
}
function guestKey(){return "fabriqueSyllabesGuestV4"}
function childKey(id){return "fabriqueSyllabesChild_"+id}
let state;try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}
let currentView=state.lastView||"home",locked=false,currentAnswer=null,orderTarget=[],orderMade=[],encodeMade=[],wordEncodeMade=[],readAloudSentence=[],memoryDeck=[],memoryOpen=[],memoryMatches=0,memoryMissedPairs=new Set(),memoryMatchedPairs=new Set(),missionMode=false,questionErrorRecorded=false,questionAssisted=false,missingWord=null,missingIndex=0;
const $=s=>document.querySelector(s);
const stage=$("#stage"),nav=$("#nav"),fx=$("#fx");
let runtimeErrorShown=false;
function showRuntimeError(error){
 console.error("Application runtime error",error);
 if(runtimeErrorShown||!stage)return;runtimeErrorShown=true;
 stage.innerHTML='<div class="card center"><div class="hero-emoji">🛠️</div><h2>Petit problème technique</h2><p style="color:var(--muted)">Ta progression est conservée. Retourne à l’accueil ou copie le diagnostic pour nous aider à retrouver le problème.</p><div class="actions"><button class="btn primary" data-action="recover-home">🏠 Retour à l’accueil</button><button class="btn gray" data-action="copy-diagnostic">📋 Copier diagnostic</button></div></div>'
}
window.addEventListener("error",e=>showRuntimeError(e.error||e.message));
window.addEventListener("unhandledrejection",e=>showRuntimeError(e.reason||"Promise error"));
function updateConnectivityUI(){
 const s=$("#syncStatus");if(!s)return;
 if(localSaveFailed){s.textContent="⚠️ Sauvegarde locale indisponible • exporte ta progression dans Parents";s.className="sync err";return}
 if(!navigator.onLine){s.textContent="📴 Hors ligne • l’app reste utilisable et la progression est gardée sur cet appareil";s.className="sync err";return}
 if(!session){s.textContent="Mode invité • sauvegarde locale";s.className="sync";return}
 if(!currentChild){s.textContent="Compte connecté • choisissez un profil enfant";s.className="sync";return}
}
window.addEventListener("offline",updateConnectivityUI);
window.addEventListener("online",()=>{if(sb&&session&&currentChild)loadRemoteState();else updateConnectivityUI()});
function saveLocal(){
 try{localStorage.setItem(currentChild?childKey(currentChild.id):guestKey(),JSON.stringify(state));localSaveFailed=false;return true}
 catch(e){console.error("Local save error",e);localSaveFailed=true;return false}
}
async function saveRemoteNow(){
 saveLocal();topUI();if(!sb||!session||!currentChild)return;
 const profileId=currentChild.id,ownerId=session.user.id;
 const snapshot=normalizeState(JSON.parse(JSON.stringify(state)));
 pendingProfileSaves.set(profileId,{profileId,ownerId,snapshot,completed:learningCourseCompleted()});
 if(remoteSaveInFlight)return;
 remoteSaveInFlight=true;
 try{
  while(pendingProfileSaves.size){
   const [key,job]=pendingProfileSaves.entries().next().value;
   pendingProfileSaves.delete(key);
   if(session?.user?.id!==job.ownerId)continue;
   if(currentChild?.id===job.profileId){$("#syncStatus").textContent="☁️ Synchronisation…";$("#syncStatus").className="sync"}
   let error=null;
   try{
    ({error}=await sb.from("progress").upsert({child_id:job.profileId,lesson_id:"app_state",stars:job.snapshot.stars||0,completed:job.completed,attempts:job.snapshot.stats?.attempts||0,correct_answers:job.snapshot.stats?.correct||0,lesson_state:job.snapshot},{onConflict:"child_id,lesson_id"}));
   }catch(e){error=e}
   if(currentChild?.id===job.profileId&&session?.user?.id===job.ownerId){
    if(error){console.error("Remote save error",error);$("#syncStatus").textContent=localSaveFailed?"⚠️ Sauvegarde indisponible • exporte la progression depuis Parents":"⚠️ Sauvegardé sur cet appareil • synchronisation à réessayer";$("#syncStatus").className="sync err"}
    else{$("#syncStatus").textContent="☁️ Progression synchronisée";$("#syncStatus").className="sync ok"}
   }
  }
 }finally{remoteSaveInFlight=false}
}
function save(touch=true){
 if(touch)state.updatedAt=Date.now();
 saveLocal();topUI();
 if(!touch)return;
 clearTimeout(saveTimer);saveTimer=setTimeout(saveRemoteNow,450)
}
function cachedProfileState(child){
 try{return normalizeState(JSON.parse(localStorage.getItem(childKey(child.id))||"null")||{name:child.nickname})}
 catch(e){return normalizeState({name:child.nickname})}
}
function enterChildProfile(child){
 stopPronunciationSession();
 clearTimeout(saveTimer);
 // Queue the outgoing child's snapshot before changing the active profile.
 if(currentChild&&currentChild!==child&&session&&!profileLoading)void saveRemoteNow();
 profileLoadSequence++;currentChild=child;state=cachedProfileState(child);state.name=child.nickname;
 missionMode=false;currentView=state.lastView||"home";
 try{localStorage.setItem("lastChildId",child.id)}catch(e){console.error("Profile preference save error",e)}
 profileLoading=true;stage.innerHTML='<div class="card center" role="status"><h2>On retrouve ta progression…</h2><p>Encore un petit instant.</p></div>';topUI()
}
async function loadRemoteState(){
 if(!sb||!session||!currentChild)return;
 const child=currentChild,ownerId=session.user.id,requestId=++profileLoadSequence;
 $("#syncStatus").textContent="☁️ Chargement…";
 let data=null,error=null;
 try{({data,error}=await sb.from("progress").select("lesson_state").eq("child_id",child.id).eq("lesson_id","app_state").maybeSingle())}catch(e){error=e}
 if(requestId!==profileLoadSequence||currentChild?.id!==child.id||session?.user?.id!==ownerId)return;
 const wasLoading=profileLoading;profileLoading=false;
 if(error){if(wasLoading)render();console.error("Remote load error",error);$("#syncStatus").textContent=localSaveFailed?"⚠️ Sauvegarde indisponible • exporte la progression depuis Parents":"📴 Progression locale conservée • synchronisation à réessayer";$("#syncStatus").className="sync err";return}
 // Re-read the cache after the request: the child may have answered while it was in flight.
 const cached=cachedProfileState(child);
 const local=Number(state.updatedAt||0)>=Number(cached.updatedAt||0)?state:cached,remote=data?.lesson_state||null;
 const remoteTs=Number(remote?.updatedAt||0),localTs=Number(local.updatedAt||0);
 if(!remote){state=normalizeState(local);state.name=child.nickname;if(wasLoading)render();await saveRemoteNow();return}
 if(remoteTs===localTs&&localTs>0){if(wasLoading)render();topUI();$("#syncStatus").textContent="☁️ Progression synchronisée";$("#syncStatus").className="sync ok";return}
 const merged=mergeProgressStates(local,remote);
 const localChanged=JSON.stringify(normalizeState(local))!==JSON.stringify(merged),remoteChanged=JSON.stringify(normalizeState(remote))!==JSON.stringify(merged);
 if(localChanged)saveSnapshotBackup(normalizeState(local));
 state=merged;state.name=child.nickname;
 missionMode=false;currentView=state.lastView||"home";saveLocal();render();topUI();
 if(remoteChanged){state.updatedAt=Math.max(state.updatedAt,Date.now());saveLocal();await saveRemoteNow();return}
 $("#syncStatus").textContent="☁️ Progression synchronisée";$("#syncStatus").className="sync ok"
}

function topUI(){
 const version=$("#appVersion");if(version)version.textContent="v"+APP_VERSION;
 $("#stars").textContent=state.stars||0;$("#streak").textContent=(state.streak||0)>=2?`🔥${state.streak}`:"";
 const displayName=currentChild?currentChild.nickname:(state.name||"");
 $("#hello").textContent=displayName?`Allez ${displayName} ! Mission lecture 🌟`:"Mission : devenir une super lectrice 🌟";
 $("#childLabel").textContent=currentChild?`${currentChild.avatar||"🦊"} ${currentChild.nickname}`:"Invité";
 $("#accountBtn").textContent=session?"👤 Mon compte":"👤 Se connecter";
 const keys=["sounds","syllables","words","listen","encoding","bubbles","memory","families","missing","pictures",...(sentenceUnlocked()?["order","comprehension"]:[])],done=keys.filter(k=>k==="sounds"?soundPracticeComplete():k==="words"?wordPracticeComplete():state.done[k]).length;const syllables=DATA.sets.flat(),masteryPoints=syllables.reduce((sum,s)=>sum+masteryLevel(s),0),masteryPct=masteryPoints/(syllables.length*3),activityPct=done/keys.length,pct=Math.round((masteryPct*.7+activityPct*.3)*100);$("#progressBar").style.width=pct+"%";$("#progressText").textContent=pct+" %";
 if(localSaveFailed||!navigator.onLine){updateConnectivityUI()}else if(!session){$("#syncStatus").textContent="Mode invité • sauvegarde locale";$("#syncStatus").className="sync"}else if(!currentChild){$("#syncStatus").textContent="Compte connecté • choisissez un profil enfant";$("#syncStatus").className="sync"}
}
function setDone(k){state.done[k]=true;save()}
function shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function colorSyl(s){const text=String(s||""),parts=syllableGraphemes(text);if(parts.length<2)return `<span class="purple">${esc(text)}</span>`;return `<span class="red">${esc(parts[0])}</span><span class="blue">${esc(parts.slice(1).join(""))}</span>`}
function wordHTML(parts){return parts.map((p,i)=>`<span>${esc(p)}</span>`).join("·")}

let speechVoiceCache=[],speechRequestId=0;
function refreshSpeechVoices(){
 const vs=window.speechSynthesis?.getVoices?.()||[];
 if(vs.length)speechVoiceCache=vs;
 return speechVoiceCache
}
function voice(){
 const vs=refreshSpeechVoices();
 return vs.find(v=>/^fr[-_]/i.test(v.lang)&&/France|French|fr-FR/i.test(v.lang+" "+v.name))||vs.find(v=>/^fr/i.test(v.lang))||vs.find(v=>v.default)||vs[0]||null
}
function speakNow(text,rate=.72,cb,requestId=speechRequestId){
 if(requestId!==speechRequestId||!("speechSynthesis" in window))return;
 const synth=window.speechSynthesis,busy=!!(synth.speaking||synth.pending);
 if(busy)synth.cancel();
 synth.resume?.();
 const u=new SpeechSynthesisUtterance(text);u.lang="fr-FR";u.rate=rate;u.pitch=1.06;u.volume=1;
 const v=voice();if(v)u.voice=v;
 if(cb)u.onend=cb;
 u.onerror=e=>{if(e?.error!=="canceled")toast("🔈 L’audio n’a pas démarré. Réessaie dans un instant.")};
 const launch=()=>{if(requestId===speechRequestId)synth.speak(u)};
 if(busy)setTimeout(launch,24);else launch()
}
function speak(text,rate=.72,cb){
 if(!("speechSynthesis" in window)){toast("🔈 Audio non disponible sur ce navigateur.");return}
 const synth=window.speechSynthesis,requestId=++speechRequestId;
 if(voice()){speakNow(text,rate,cb,requestId);return}
 let finished=false;
 const tryVoices=()=>{
  if(finished||requestId!==speechRequestId)return;
  if(!voice())return;
  finished=true;synth.removeEventListener?.("voiceschanged",tryVoices);speakNow(text,rate,cb,requestId)
 };
 synth.addEventListener?.("voiceschanged",tryVoices);
 setTimeout(()=>{
  if(finished||requestId!==speechRequestId)return;
  finished=true;synth.removeEventListener?.("voiceschanged",tryVoices);
  // Some engines expose no list at all but can still use their internal default.
  speakNow(text,rate,cb,requestId)
 },450)
}
function speakMission(text,rate=.60,cb){speak(text,rate,cb)}
function instructionAudio(text){
 const safe=esc(text);
 return `<div class="instruction-audio"><span>🎧 ${safe}</span><button class="btn yellow instruction-replay" data-action="speak" data-text="${safe}" data-rate=".76" aria-label="Réécouter la consigne">🔊 Réécouter la consigne</button></div>`
}
function playInstruction(text,after){screenTask(()=>speakMission(text,.76,after),160)}
function tone(kind="ok"){
 try{
  const AC=window.AudioContext||window.webkitAudioContext,ctx=new AC();
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);
  osc.type="sine";osc.frequency.value=kind==="ok"?660:220;gain.gain.setValueAtTime(.001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);
  osc.onended=()=>{void ctx.close()};osc.start();osc.stop(ctx.currentTime+.24)
 }catch(e){}
}
function starFx(){
 const d=document.createElement("div");d.className="star-pop";d.textContent="⭐";fx.appendChild(d);setTimeout(()=>d.remove(),780)
}
function confetti(){
 const box=document.createElement("div");box.className="confetti";
 const bits=["⭐","✨","🎉","💜","🟡","🔵"];
 for(let i=0;i<20;i++){const x=document.createElement("i");x.textContent=pick(bits);x.style.left=Math.random()*100+"%";x.style.animationDelay=Math.random()*.35+"s";x.style.fontSize=(14+Math.random()*17)+"px";box.appendChild(x)}
 fx.appendChild(box);setTimeout(()=>box.remove(),1900)
}
function toast(msg,type="ok"){
 const f=$("#feedback");if(f)f.innerHTML=`<div class="${type}">${msg}</div>`
}
function title(t,p,pill){return `<div class="titlebar"><div><h2>${t}</h2><p>${p}</p></div>${pill?`<span class="pill">${pill}</span>`:""}</div>`}
function mission(ico,b,txt){return `<div class="mission"><div class="mission-icon">${ico}</div><div><b>${b}</b><span>${txt}</span></div></div>`}
function activate(v){stopPronunciationSession();currentView=v;state.lastView=v;save(false);document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===v));render();stage.focus({preventScroll:true})}
function nextRandom(arr,answer,n=4){let a=shuffle(arr.filter(x=>x!==answer)).slice(0,n-1);return shuffle([answer,...a])}

function weeklyRhythmHTML(){
 const weekly=Math.min(5,missionsLast7Days()),streak=missionDayStreak();
 return `<div class="card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><b>📅 Mon rythme</b><p style="color:var(--muted);font-size:13px;margin:4px 0 0">Une petite mission par jour, sans obligation de tout faire d’un coup.</p></div><span class="pill">🔥 ${streak} jour(s)</span></div><div class="mission-progress" style="margin-bottom:5px">${[0,1,2,3,4].map(i=>`<span class="mission-dot ${i<weekly?"done":""}"></span>`).join("")}</div><small style="color:var(--muted)">${weekly} / 5 missions sur les 7 derniers jours</small></div>`
}
function home(){
 stage.innerHTML=title("Prête pour la mission ?","On apprend en jouant, quelques minutes à la fois.","CP • syllabique")+
 `<div class="card center">
   <div class="hero-emoji">🦊📚✨</div>
   <h3 style="font-size:25px;margin:5px 0">Le renard Léo a perdu ses étoiles !</h3>
   <p style="color:var(--muted);max-width:560px;margin:7px auto 14px">Lis les sons, fabrique des syllabes et réussis les mini-jeux pour les retrouver.</p>
   <div class="actions"><button class="btn primary" data-action="mission-start">🚀 Ma mission du jour</button><button class="btn yellow" data-action="speak" data-text="Prête pour la mission lecture ?">🔊 Écouter</button></div>
 </div>
 ${missionCardHTML()}
 ${weeklyRhythmHTML()}
 ${(()=>{const r=state.rewards||DEFAULT_STATE.rewards;const next=COLLECTIBLES[r.puzzles%COLLECTIBLES.length];return `<div class="card"><div class="puzzle-wrap"><div class="puzzle-grid">${[0,1,2,3].map(i=>`<div class="puzzle-piece ${i<r.pieces?"on":""}">${i<r.pieces?"✨":"?"}</div>`).join("")}</div><div><b style="font-size:18px">🧩 Puzzle magique</b><p style="color:var(--muted);font-size:13px;line-height:1.45">Chaque mission du jour terminée donne un morceau. 4 morceaux complètent le puzzle et débloquent une nouvelle découverte.</p><div style="font-weight:900">Prochaine découverte : ${next.emoji} ???</div>${r.collection.length?`<div class="collection-row">${r.collection.map(x=>`<span class="collectible">${x.emoji} ${x.name}</span>`).join("")}</div>`:""}</div></div></div>`})()}
 <details class="card"><summary style="cursor:pointer;font-weight:1000;font-size:17px">🎮 Jouer librement</summary><p style="color:var(--muted);font-size:13px">Pour rejouer à un exercice en dehors de la mission du jour.</p><div class="levels">
   <button class="level" data-action="go" data-to="sounds"><div class="ico">🔤</div><b>Les sons</b><small>J'écoute et je reconnais</small></button>
   <button class="level" data-action="go" data-to="syllables"><div class="ico">🧩</div><b>Les syllabes</b><small>Je combine les sons</small></button>
   <button class="level" data-action="go" data-to="words"><div class="ico">🐾</div><b>Les mots</b><small>Je lis par morceaux</small></button>
   <button class="level" data-action="game-listen"><div class="ico">👂</div><b>J'écoute</b><small>Je trouve ce que j'entends</small></button>
   <button class="level" data-action="game-encode"><div class="ico">✍️</div><b>J’écris</b><small>Je fabrique la syllabe entendue</small></button>
   <button class="level" data-action="game-pronunciation"><div class="ico">🎤</div><b>Je répète <span class="beta-pill">BÊTA</span></b><small>Entraînement vocal seulement</small></button>
   <button class="level" data-action="game-picture"><div class="ico">🖼️</div><b>Image-mot</b><small>Je relie mot et image</small></button>
   <button class="level" data-action="game-order" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"🧠":"🔒"}</div><b>La phrase</b><small>${sentenceUnlocked()?"Je remets les mots en ordre":"Se débloque après 8 missions"}</small></button>
   <button class="level" data-action="game-readaloud" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"🗣️":"🔒"}</div><b>Je lis à voix haute</b><small>${sentenceUnlocked()?"Je lis puis j’écoute le modèle":"Se débloque après 8 missions"}</small></button>
   <button class="level" data-action="game-comprehension" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"📖":"🔒"}</div><b>Je comprends</b><small>${sentenceUnlocked()?"Je lis puis je choisis l’image":"Se débloque après 8 missions"}</small></button>
 </div></details>`;
}
function speechRecognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)}
function isSafariBrowser(){return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent)}
function screenTask(fn,ms){
 const screen=stage.firstElementChild;
 return setTimeout(()=>{if(stage.firstElementChild===screen)fn()},ms)
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function openMicrophone(status,isCurrent=()=>true){
 if(!window.isSecureContext){
  if(status&&isCurrent()){status.className="mic-status error";status.textContent="Le micro nécessite une connexion sécurisée HTTPS."}
  return null
 }
 if(!navigator.mediaDevices?.getUserMedia){
  if(status&&isCurrent()){status.className="mic-status error";status.textContent="Ce navigateur ne donne pas accès au microphone."}
  return null
 }
 try{
  if(status&&isCurrent()){status.className="mic-status listening";status.innerHTML='<span class="mic-pulse">🎙️</span> Activation du micro…'}
  return await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false})
 }catch(e){
  console.error("Micro permission error",e);
  let msg="Impossible d’accéder au microphone.";
  if(e?.name==="NotAllowedError"||e?.name==="SecurityError")msg="Micro refusé. Autorise le microphone dans les réglages Safari puis recharge la page.";
  else if(e?.name==="NotFoundError")msg="Aucun microphone détecté sur cet appareil.";
  if(status&&isCurrent()){status.className="mic-status error";status.textContent=msg}
  return null
 }
}
function createVoiceGate(stream){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return {heardVoice:()=>false,stop:()=>{}};
 const ctx=new AC();
 try{
 const src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();
 an.fftSize=1024;an.smoothingTimeConstant=.15;src.connect(an);
 const buf=new Uint8Array(an.fftSize);
 let baseline=.008,peak=0,voicedFrames=0,frames=0,running=true;
 const sample=()=>{
  if(!running)return;
  an.getByteTimeDomainData(buf);
  let sum=0;
  for(let i=0;i<buf.length;i++){const v=(buf[i]-128)/128;sum+=v*v}
  const rms=Math.sqrt(sum/buf.length);peak=Math.max(peak,rms);frames++;
  if(frames<10)baseline=baseline*.75+rms*.25;
  const threshold=Math.max(.018,baseline*2.2);
  if(rms>threshold)voicedFrames++;
  requestAnimationFrame(sample)
 };
 sample();
 return {
  heardVoice:()=>voicedFrames>=3&&peak>=Math.max(.022,baseline*2.1),
  stop:()=>{running=false;try{src.disconnect()}catch(e){}try{void ctx.close().catch(()=>{})}catch(e){}}
 }
 }catch(e){try{void ctx.close().catch(()=>{})}catch(closeError){}throw e}
}
function normalizeHeard(s){
 return String(s||"").toLowerCase().normalize("NFC").replace(/[^a-zàâçéèêëîïôùûüÿ]/g,"")
}
function pronunciationMatches(expected,heard){
 const e=normalizeHeard(expected),h=normalizeHeard(heard);
 if(!e||!h)return false;
 if(h===e)return true;
 const aliases={
  mi:["mie","mis"],mo:["mot","mots"],mu:["mue","mues"],
  la:["là"],li:["lit","lis"],lo:["lot","lots","l’eau"],lu:["lue","lus"],
  sa:["ça"],si:["six"],so:["sot","saut"],su:["sue","sues"],se:["ce"],
  ri:["riz","rit"],ru:["rue"],fi:["fie"],fo:["faux","faut"],fu:["fut"],
  vi:["vie","vis"],vo:["vos","vaux"],vu:["vue","vues"],
  pa:["pas"],pi:["pie"],po:["pot","peau"],pu:["pue"],
  ta:["tas"],to:["tôt","taux"],tu:["tue"],ni:["nid"],no:["nos"],nu:["nue"],
  ba:["bas"],bi:["bis"],bo:["beau","beaux"],bu:["bue"],
  mé:["mes"],lé:["les"],sé:["ses","ces"],fé:["fée","fées"],té:["thé"],né:["nez"]
 };
 return (aliases[e]||[]).some(x=>normalizeHeard(x)===h);
}
function gamePronunciation(){
 stopPronunciationSession();
 missionMode=false;currentView="pronunciation";state.lastView="pronunciation";save(false);currentAnswer=pickLearningSyllable();locked=false;
 const micAvailable=!!navigator.mediaDevices?.getUserMedia;
 stage.innerHTML=title("Écoute & répète","Écoute la syllabe, puis dis-la dans le micro.","Jeu micro")+
 instructionAudio("Écoute la syllabe, puis répète-la dans le micro.")+
 `<div class="card center"><div class="hero-emoji">🎤</div><div class="big purple" style="font-size:82px">${colorSyl(currentAnswer)}</div>
 <div class="actions"><button class="btn yellow" data-action="pronunciation-listen">🔊 Écouter</button><button class="btn primary" data-action="pronunciation-record" ${micAvailable?"":"disabled"}>🎙️ À toi !</button><button class="btn gray" data-action="pronunciation-stop" hidden>Arrêter l’écoute</button></div>
 <div style="margin-top:8px;font-weight:900;color:var(--muted)">Maîtrise : ${masteryStars(currentAnswer)}</div><div id="micStatus" class="mic-status">${micAvailable?"Appuie sur « À toi ! ». Le micro restera actif pendant l’écoute et aucune réponse ne sera validée sans voix détectée.":"Le microphone n’est pas disponible sur ce navigateur."}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-pronunciation">Nouvelle syllabe →</button></div>`;
 playInstruction("Écoute la syllabe, puis répète-la dans le micro.",()=>{if(!pronunciationSession)speak(currentAnswer,.60)})
}
let pronunciationSession=null;
function closePronunciationRun(run,message=""){
 if(!run||run.closed)return;
 const show=run.isCurrent();run.closed=true;
 if(pronunciationSession===run)pronunciationSession=null;
 clearTimeout(run.watchdog);run.observer?.disconnect();
 if(run.recognition){
  run.recognition.onstart=run.recognition.onresult=run.recognition.onerror=run.recognition.onend=null;
  try{run.recognition.abort()}catch(e){}
 }
 try{run.gate?.stop()}catch(e){}
 run.stream?.getTracks().forEach(track=>track.stop());
 run.buttons.forEach(({button,disabled})=>{button.disabled=disabled});
 if(run.stopButton)run.stopButton.hidden=true;
 if(show&&message){run.status.className="mic-status";run.status.textContent=message}
}
function stopPronunciationSession(message=""){closePronunciationRun(pronunciationSession,message)}
window.addEventListener("pagehide",()=>stopPronunciationSession());
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopPronunciationSession("Écoute interrompue. Appuie sur « À toi ! » pour recommencer.")});
async function startPronunciationRecognition(){
 if(locked||pronunciationSession||currentView!=="pronunciation")return;
 const status=$("#micStatus");if(!status)return;
 const expected=currentAnswer,profile=currentChild?.id||null,owner=session?.user?.id||null;
 const run={status,closed:false,stream:null,gate:null,recognition:null,buttons:[...stage.querySelectorAll('[data-action="pronunciation-record"], [data-action="pronunciation-listen"]')].map(button=>({button,disabled:button.disabled})),stopButton:stage.querySelector('[data-action="pronunciation-stop"]')};
 run.isCurrent=()=>!run.closed&&pronunciationSession===run&&$("#micStatus")===status&&currentView==="pronunciation"&&currentAnswer===expected&&(currentChild?.id||null)===profile&&(session?.user?.id||null)===owner;
 pronunciationSession=run;window.speechSynthesis?.cancel?.();run.buttons.forEach(({button})=>button.disabled=true);if(run.stopButton)run.stopButton.hidden=false;
 if(typeof MutationObserver!=="undefined"){
  run.observer=new MutationObserver(()=>{if(!run.isCurrent())closePronunciationRun(run)});
  run.observer.observe(stage,{childList:true})
 }
 const timeout=()=>closePronunciationRun(run,"L’écoute n’a pas abouti. Vérifie l’autorisation du micro puis réessaie.");
 run.watchdog=setTimeout(timeout,12000);
 try{
  const stream=await openMicrophone(status,run.isCurrent);
  if(!run.isCurrent()){stream?.getTracks().forEach(track=>track.stop());closePronunciationRun(run);return}
  if(!stream){closePronunciationRun(run);return}
  run.stream=stream;run.gate=createVoiceGate(stream);
  await sleep(550);if(!run.isCurrent()){closePronunciationRun(run);return}
  const Ctor=speechRecognitionCtor();
  if(!Ctor){closePronunciationRun(run,isIOS()&&!isSafariBrowser()?"Le micro fonctionne, mais la reconnaissance vocale est bloquée dans ce navigateur sur iPhone. Ouvre l’app dans Safari.":"Ce navigateur ne propose pas la reconnaissance vocale.");return}
  window.speechSynthesis?.cancel?.();
  await sleep(250);if(!run.isCurrent()){closePronunciationRun(run);return}
  const recognition=run.recognition=new Ctor();recognition.lang="fr-FR";recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=5;
  clearTimeout(run.watchdog);run.watchdog=setTimeout(timeout,8000);
  recognition.onstart=()=>{
   if(!run.isCurrent()){closePronunciationRun(run);return}
   status.className="mic-status listening";status.textContent="🎙️ J’écoute… dis seulement la syllabe"
  };
  recognition.onresult=e=>{
   if(!run.isCurrent()){closePronunciationRun(run);return}
   const voiceDetected=run.gate.heardVoice(),alternatives=Array.from(e.results?.[0]||[],x=>x.transcript||"");
   const heard=alternatives[0]||"",ok=voiceDetected&&alternatives.some(x=>pronunciationMatches(expected,x));
   closePronunciationRun(run);
   if(!voiceDetected){status.className="mic-status error";status.textContent="Aucune voix détectée. Tu peux réessayer.";return}
   if(ok){locked=true;practiceDone("Très bien prononcé !");status.className="mic-status success";status.textContent='✅ J’ai entendu « '+heard+' »';confetti()}
   else{status.className="mic-status error";status.textContent='J’ai entendu « '+(heard||"…")+' ». Écoute encore et réessaie.';screenTask(()=>speak(expected,.60),250)}
  };
  recognition.onerror=e=>{
   if(!run.isCurrent()){closePronunciationRun(run);return}
   const messages={"not-allowed":"Micro refusé. Vérifie les autorisations du navigateur.","service-not-allowed":"La reconnaissance vocale est bloquée par le navigateur.","no-speech":"Je n’ai rien entendu. Tu peux réessayer.","audio-capture":"Aucun microphone disponible.",network:"La reconnaissance vocale a besoin d’Internet sur ce navigateur."};
   closePronunciationRun(run,messages[e.error]||"La reconnaissance vocale n’a pas abouti. Tu peux réessayer.")
  };
  recognition.onend=()=>closePronunciationRun(run,"Je n’ai pas bien entendu. Tu peux réessayer.");
  recognition.start()
 }catch(e){console.error("Microphone session error",e);closePronunciationRun(run,"L’écoute n’a pas démarré. Vérifie les réglages du micro puis réessaie.")}
}

function parentReviewSuggestions(){
 const active=activeLearningSyllables(),queued=new Set(state.reviewQueue||[]),due=new Set(dueReviewSyllables());
 return active.filter(s=>queued.has(s)||due.has(s)||(state.mastery?.[s]?.attempts>0&&masteryLevel(s)<3))
 .map(s=>({s,priority:queued.has(s)?0:due.has(s)?1:2,reason:queued.has(s)?"À revoir après une erreur":due.has(s)?"Révision espacée arrivée à échéance":"En cours d’apprentissage"}))
 .sort((a,b)=>a.priority-b.priority||masteryLevel(a.s)-masteryLevel(b.s)||active.indexOf(a.s)-active.indexOf(b.s)).slice(0,3)
}
function parentSyllableStatus(s){
 if(!activeLearningSyllables().includes(s))return "À découvrir plus tard";
 if(!state.mastery?.[s]?.attempts)return "Pas encore évaluée";
 return ["À reprendre", "Découverte", "En progression", "Maîtrisée"][masteryLevel(s)]
}
function parentReviewHTML(){
 const suggestions=parentReviewSuggestions();
 const cards=suggestions.map(x=>`<div class="parent-box"><h3>${esc(x.s.toUpperCase())} <span aria-label="${masteryLevel(x.s)} étoiles sur 3">${masteryStars(x.s)}</span></h3><p>${x.reason}</p><button class="btn good" data-action="parent-review" data-target="${esc(x.s)}">Revoir ${esc(x.s.toUpperCase())}</button></div>`).join("");
 return `<div class="card"><h3>📌 Quoi travailler maintenant ?</h3><p>Une proposition à la fois suffit. Arrêtez si l’enfant se fatigue.</p>${suggestions.length?`<div class="parent-grid">${cards}</div>`:`<p>${Object.keys(state.mastery||{}).length?"Aucune révision prioritaire pour le moment. La mission du jour poursuit le parcours.":"Commencez par la mission du jour : les premières réponses permettront de proposer des révisions adaptées."}</p><button class="btn primary" data-action="go" data-to="home">Voir la mission du jour</button>`}<p style="color:var(--muted);font-size:13px">Ces exercices sont libres : ils ne remplacent pas une étape de la mission en cours.</p></div>`
}
function parentSyllableGridHTML(){
 const active=new Set(activeLearningSyllables());
 return DATA.sets.flat().map(s=>{
  const available=active.has(s),status=parentSyllableStatus(s),label=s.toUpperCase();
  return `<button class="mastery-chip" data-action="parent-syllable-review" data-target="${esc(s)}" ${available?"":"disabled"} aria-label="${esc(label+' : '+status+'. '+(available?'Lancer un entraînement.':'Famille non débloquée.'))}">${esc(label)}<small>${masteryStars(s)}</small><small>${status}</small>${available?'<small class="practice-link">S’entraîner →</small>':''}</button>`
 }).join("")
}
function missionDayStreak(){
 const dates=missionDates().reverse();
 if(!dates.length)return 0;
 const fmt=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 let cursor=new Date(),today=fmt(cursor);
 if(dates[0]!==today){cursor.setDate(cursor.getDate()-1);if(dates[0]!==fmt(cursor))return 0}
 let streak=0;
 for(const d of dates){if(d!==fmt(cursor))break;streak++;cursor.setDate(cursor.getDate()-1)}
 return streak
}
function recentPerformance(){
 const rows=(state.missionHistory||[]).filter(x=>x.accuracy!=null&&Number.isFinite(Number(x.attempts))).slice(-7);
 const attempts=rows.reduce((sum,x)=>sum+Number(x.attempts||0),0),correct=rows.reduce((sum,x)=>sum+Number(x.correct||0),0);
 return {missions:rows.length,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null}
}
function recentMissionHTML(){
 const hist=(state.missionHistory||[]).slice(-7).reverse();
 if(!hist.length)return '<p style="color:var(--muted);font-size:13px">Aucune mission terminée pour le moment.</p>';
 return '<div class="mission-steps">'+hist.map(x=>{const label=x.accuracy!=null?(x.accuracy+" %"):"ancien suivi";return '<div class="mission-step"><span class="num">✓</span><div><b>'+esc(x.date)+' • '+label+'</b><small>'+esc((x.primary||"").toUpperCase())+' • révision '+esc((x.review||"").toUpperCase())+' • '+esc((x.word||"").toUpperCase())+'</small></div></div>'}).join("")+'</div>'
}
function missionsLast7Days(){
 const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-6);
 const key=start.getFullYear()+"-"+String(start.getMonth()+1).padStart(2,"0")+"-"+String(start.getDate()).padStart(2,"0");
 return missionDates().filter(date=>date>=key).length
}
function badgeData(){
 const missions=completedMissionCount(),ms=masterySummary(),stars=state.stars||0,streak=bestMissionStreak();
 return [
  {emoji:"🌟",name:"Première étoile",desc:"Gagner une étoile",ok:stars>=1},
  {emoji:"🏁",name:"Première mission",desc:"Terminer une mission",ok:missions>=1},
  {emoji:"🔥",name:"3 jours de suite",desc:"Faire 3 jours consécutifs",ok:streak>=3},
  {emoji:"🧩",name:"Puzzle magique",desc:"Terminer un puzzle",ok:(state.rewards?.puzzles||0)>=1},
  {emoji:"📚",name:"10 syllabes",desc:"Maîtriser 10 syllabes",ok:ms.mastered>=10},
  {emoji:"💫",name:"50 étoiles",desc:"Gagner 50 étoiles",ok:stars>=50},
  {emoji:"🗺️",name:"Grande aventure",desc:"Terminer 10 missions",ok:missions>=10},
  {emoji:"👑",name:"Super lectrice",desc:"Maîtriser 30 syllabes",ok:ms.mastered>=30}
 ]
}
function companionLevel(){
 const n=completedMissionCount();
 if(n>=14)return {emoji:"🦊👑",name:"Léo, gardien des étoiles",level:5};
 if(n>=9)return {emoji:"🦊🚀",name:"Léo, explorateur",level:4};
 if(n>=5)return {emoji:"🦊🛡️",name:"Léo, aventurier",level:3};
 if(n>=2)return {emoji:"🦊🎒",name:"Léo, apprenti",level:2};
 return {emoji:"🦊",name:"Léo, petit renard",level:1}
}
function worldView(){
 const missions=completedMissionCount(),comp=companionLevel();
 let current=0;WORLD_ZONES.forEach((z,i)=>{if(missions>=z.need)current=i});
 const next=WORLD_ZONES[current+1]||null;
 const nextText=next?'<div class="tip">Encore <b>'+Math.max(0,next.need-missions)+'</b> mission(s) pour atteindre <b>'+next.name+'.</b></div>':'<div class="tip">🏆 Toutes les zones sont débloquées !</div>';
 const zones=WORLD_ZONES.map((z,i)=>{
  const unlocked=missions>=z.need,isCurrent=i===current;
  const status=unlocked?(isCurrent?"Ici ✨":"Débloqué"):(z.need+" missions");
  return '<div class="world-zone '+(unlocked?"unlocked":"locked")+(isCurrent?" current":"")+'"><div class="world-emoji">'+(unlocked?z.emoji:"🔒")+'</div><div><h3>'+z.name+'</h3><p>'+z.desc+'</p></div><span class="zone-badge">'+status+'</span></div>'
 }).join("");
 stage.innerHTML=title("Mon monde","Chaque mission terminée fait avancer l’aventure.","Carte")+
 '<div class="card companion-card center"><div class="hero-emoji">'+comp.emoji+'</div><b style="font-size:21px">'+comp.name+'</b><p style="color:var(--muted)">Niveau '+comp.level+' • '+missions+' mission(s) terminée(s)</p>'+nextText+'</div><div class="world-path">'+zones+'</div>'
}
function collectionView(){
 const r=state.rewards||DEFAULT_STATE.rewards,unlocked=new Set((r.collection||[]).map(x=>x.id)),badges=badgeData();
 stage.innerHTML=title("Ma collection","Chaque puzzle terminé débloque une nouvelle découverte.","Trésors")+
 `<div class="card center"><div class="hero-emoji">🎁✨</div><b style="font-size:20px">${unlocked.size} découverte(s) débloquée(s)</b><p style="color:var(--muted);font-size:13px">Termine les missions du jour pour gagner des morceaux de puzzle.</p>
 <div class="puzzle-grid" style="margin:12px auto">${[0,1,2,3].map(i=>`<div class="puzzle-piece ${i<(r.pieces||0)?"on":""}">${i<(r.pieces||0)?"✨":"?"}</div>`).join("")}</div><b>${r.pieces||0} / 4 morceaux</b></div>
 <div class="collection-grid">${COLLECTIBLES.map(x=>`<div class="treasure-card ${unlocked.has(x.id)?"":"locked"}"><div class="treasure-emoji">${unlocked.has(x.id)?x.emoji:"❓"}</div><b>${unlocked.has(x.id)?x.name:"À découvrir"}</b><small style="display:block;color:var(--muted);margin-top:5px">${unlocked.has(x.id)?"Débloqué ✨":"Continue les missions"}</small></div>`).join("")}</div>
 <div class="card"><b>🏅 Mes badges</b><div class="badge-grid">${badges.map(x=>`<div class="badge-card ${x.ok?"":"locked"}"><div class="badge-emoji">${x.ok?x.emoji:"🔒"}</div><b>${x.name}</b><small>${x.ok?"Débloqué !":x.desc}</small></div>`).join("")}</div></div>`
}
function backupKey(){return (currentChild?childKey(currentChild.id):guestKey())+"_backup"}
function stateMeaningful(snapshot=state){return (snapshot?.stars||0)>0||(snapshot?.stats?.attempts||0)>0||stateCount(snapshot?.missionCount)>0||(snapshot?.missionHistory||[]).length>0||Object.keys(snapshot?.mastery||{}).length>0}
function saveSnapshotBackup(snapshot=state){
 try{
  if(!stateMeaningful(snapshot)&&hasBackup())return true;
  localStorage.setItem(backupKey(),JSON.stringify(snapshot));return true
 }catch(e){console.error("Backup error",e);return false}
}
function saveBackup(){return saveSnapshotBackup(state)}
function hasBackup(){try{return !!localStorage.getItem(backupKey())}catch(e){return false}}
function restoreBackup(){
 let raw=null;try{raw=localStorage.getItem(backupKey())}catch(e){}
 if(!raw){alert("Aucune sauvegarde locale à restaurer.");return}
 if(!confirm("Restaurer la dernière progression sauvegardée ?"))return;
 try{const restored=normalizeState(JSON.parse(raw));if(!saveSnapshotBackup(state)){alert("Impossible de préserver la progression actuelle. Exporte-la avant de réessayer.");return}state=restored;state.updatedAt=Date.now();missionMode=false;currentView="home";state.lastView="home";save();render();alert("Progression restaurée.")}
 catch(e){console.error(e);alert("La sauvegarde locale est illisible.")}
}
function diagnosticText(){
 const m=state.dailyMission||{};
 const voices=("speechSynthesis" in window&&speechSynthesis.getVoices)?speechSynthesis.getVoices():[];
 return [
  "La Fabrique des Syllabes "+APP_VERSION,
  "Schéma sauvegarde: "+STATE_SCHEMA_VERSION,
  "Navigateur: "+navigator.userAgent,
  "En ligne: "+navigator.onLine,
  "Écran: "+window.innerWidth+"x"+window.innerHeight,
  "speechSynthesis: "+("speechSynthesis" in window),
  "Voix disponibles: "+voices.length,
  "Voix françaises: "+voices.filter(v=>/^fr/i.test(v.lang||"")).length,
  "Session parent: "+!!session,
  "Profil enfant: "+!!currentChild,
  "Vue: "+currentView,
  "Mission date: "+(m.date||"aucune"),
  "Mission étape: "+(m.index??"-")+"/"+((m.steps||[]).length||"-"),
  "Mission terminée: "+!!m.completed,
  "Missions terminées: "+completedMissionCount()+" • historique conservé: "+(state.missionHistory||[]).length,
  "Dernière sauvegarde: "+(state.updatedAt?new Date(state.updatedAt).toISOString():"ancienne sauvegarde"),
  "Étoiles: "+(state.stars||0)
 ].join("\n")
}
async function copyDiagnostic(){
 const txt=diagnosticText();
 try{await navigator.clipboard.writeText(txt);alert("Diagnostic copié.")}
 catch(e){prompt("Copie ce diagnostic :",txt)}
}
function exportProgress(){
 const payload={app:"La Fabrique des Syllabes",version:APP_VERSION,exportedAt:new Date().toISOString(),profile:currentChild?{nickname:currentChild.nickname,school_level:currentChild.school_level,avatar:currentChild.avatar}:null,state};
 const json=JSON.stringify(payload,null,2);
 try{
  const blob=new Blob([json],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  const label=(currentChild?.nickname||state.name||"progression").toLowerCase().replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||"progression";
  a.href=url;a.download="lecture-cp-"+label+"-"+localDayKey()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
 }catch(e){console.error("Export progress error",e);prompt("Copie cette sauvegarde :",json)}
}
function parseProgressImport(text){
 let payload;
 try{payload=JSON.parse(String(text||""))}catch(e){throw new Error("JSON invalide")}
 if(!payload||typeof payload!=="object"||payload.app!=="La Fabrique des Syllabes"||!payload.state||typeof payload.state!=="object")throw new Error("Fichier non reconnu");
 if(Array.isArray(payload.state))throw new Error("Progression invalide");
 const numbers=[payload.state.stars??0,payload.state.streak??0,payload.state.stats?.attempts??0,payload.state.stats?.correct??0];
 if(numbers.some(x=>!Number.isFinite(Number(x))||Number(x)<0))throw new Error("Progression invalide");
 if(Number(numbers[3])>Number(numbers[2]))throw new Error("Statistiques incohérentes");
 const imported=normalizeState(payload.state);
 imported.stars=Math.floor(Number(imported.stars||0));imported.streak=Math.floor(Number(imported.streak||0));
 imported.stats={attempts:Math.floor(Number(imported.stats?.attempts||0)),correct:Math.floor(Number(imported.stats?.correct||0))};
 if(imported.stats.correct>imported.stats.attempts)throw new Error("Statistiques incohérentes");
 const historyMap=new Map();
 (imported.missionHistory||[]).filter(x=>x&&typeof x==="object"&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))).forEach(x=>historyMap.set(String(x.date),x));
 imported.missionHistory=[...historyMap.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-365);
 const validSyllables=new Set(DATA.sets.flat()),validMastery=new Set([...validSyllables,...DATA.words.map(w=>"word:"+w.w)]),cleanMastery={};
 Object.entries(imported.mastery||{}).forEach(([k,v])=>{
  if(!validMastery.has(k)||!v||typeof v!=="object")return;
  const attempts=Math.max(0,Math.floor(Number(v.attempts||0))),correct=Math.min(attempts,Math.max(0,Math.floor(Number(v.correct||0))));
  cleanMastery[k]={attempts,correct,lastSeen:v.lastSeen||null,lastCorrect:v.lastCorrect||null}
 });
 imported.mastery=cleanMastery;
 imported.reviewQueue=(imported.reviewQueue||[]).filter(s=>validSyllables.has(s)).slice(-50);
 const validSounds=new Set(DATA.sounds.map(x=>x.g)),validWords=new Set(DATA.words.map(x=>x.w));
 imported.soundPractice=Object.fromEntries(Object.entries(imported.soundPractice||{}).filter(([k,v])=>validSounds.has(k)&&!!v));
 imported.wordPractice=Object.fromEntries(Object.entries(imported.wordPractice||{}).filter(([k,v])=>validWords.has(k)&&!!v));
 imported.attemptLedger=Object.fromEntries(Object.entries(imported.attemptLedger||{}).filter(([,v])=>!!v).slice(-400));
 imported.rewardLedger=Object.fromEntries(Object.entries(imported.rewardLedger||{}).filter(([,v])=>!!v).slice(-300));
 const rewardIds=new Set(COLLECTIBLES.map(x=>x.id)),seenRewards=new Set(),collection=[];
 (imported.rewards?.collection||[]).forEach(x=>{if(x&&rewardIds.has(x.id)&&!seenRewards.has(x.id)){collection.push(COLLECTIBLES.find(c=>c.id===x.id));seenRewards.add(x.id)}});
 imported.rewards={towardPiece:0,pieces:Math.min(3,Math.max(0,Math.floor(Number(imported.rewards?.pieces||0)))),puzzles:Math.max(0,Math.floor(Number(imported.rewards?.puzzles||0))),collection};
 if(!validDailyMission(imported.dailyMission)||imported.dailyMission.date!==localDayKey())imported.dailyMission=null;
 return imported
}
async function importProgressFile(file){
 if(!file)return;
 const profileId=currentChild?.id||null,ownerId=session?.user?.id||null;
 if(file.size>2*1024*1024){alert("Ce fichier est trop volumineux pour une sauvegarde de progression.");return}
 let imported;
 try{imported=parseProgressImport(await file.text())}catch(e){console.error("Import progress error",e);alert("Impossible d’importer ce fichier : "+e.message+".");return}
 if(profileId!==(currentChild?.id||null)||ownerId!==(session?.user?.id||null)){alert("Le profil a changé pendant la lecture du fichier. Sélectionne le bon enfant puis recommence l’import.");return}
 if(!confirm("Remplacer la progression actuelle par celle de ce fichier ? Une sauvegarde locale de l’état actuel sera conservée."))return;
 if(!saveBackup()){alert("La copie de sécurité n’a pas pu être créée. Exporte d’abord la progression actuelle avant de réessayer.");return}imported.updatedAt=Date.now();if(currentChild)imported.name=currentChild.nickname;
 state=imported;missionMode=false;currentView="home";state.lastView="home";save();render();alert("Progression importée ✅")
}
function resetDailyMission(){
 if(!confirm("Recréer seulement la mission du jour ? La progression générale sera conservée."))return;
 state.dailyMission=null;missionMode=false;currentView="home";save();render();alert("Nouvelle mission créée.")
}
function parents(){
 const ms=masterySummary(),wm=wordMasterySummary(),attempts=state.stats?.attempts||0,correct=state.stats?.correct||0,accuracy=attempts?Math.round(correct/attempts*100):0,recent=recentPerformance(),dueCount=dueReviewSyllables().length;
 const weak=ms.weakest.length?ms.weakest.map(x=>`<span class="collectible">${x.s.toUpperCase()} ${masteryStars(x.s)} • ${x.m.correct}/${x.m.attempts}</span>`).join(""):`<span style="color:var(--muted);font-size:13px">Aucune difficulté repérée dans les réponses enregistrées. Les syllabes non évaluées restent à découvrir.</span>`;
 const weakWords=wm.weakest.length?wm.weakest.map(x=>`<button class="collectible" data-action="parent-word-review" data-word="${esc(x.word.w)}">${esc(x.word.w.toUpperCase())} ${masteryStars(x.key)} • ${x.m.correct}/${x.m.attempts}</button>`).join(""):`<span style="color:var(--muted);font-size:13px">Pas encore assez de réponses sur les mots pour repérer une difficulté.</span>`;
 stage.innerHTML=title("Coin parent","Suivi simple de la progression réelle.","Tableau de bord")+
 `<div class="parent-grid">
  <div class="parent-box"><h3>🎯 Réussite des tentatives</h3><p><b style="font-size:26px">${recent.accuracy==null?"—":recent.accuracy+" %"}</b><br>${recent.missions?recent.missions+" dernière(s) mission(s) mesurée(s)":"Pas encore de mission mesurée"}.<br><small>Depuis le début : ${attempts?accuracy+" % ("+correct+"/"+attempts+")":"pas encore de réponse"}</small></p></div>
  <div class="parent-box"><h3>🏆 Syllabes maîtrisées</h3><p><b style="font-size:26px">${ms.mastered} / ${ms.total}</b><br>★★★ = maîtrisée dans les exercices de l’app.</p></div>
  <div class="parent-box"><h3>📝 Mots évalués</h3><p><b style="font-size:26px">${wm.evaluated} / ${wm.total}</b><br>${wm.mastered} mot(s) à ★★★ parmi les mots actuellement décodables.<br><small>${wm.needsReview} à reprendre • ${wm.learning} en apprentissage.</small></p></div>
  <div class="parent-box"><h3>🌱 En apprentissage</h3><p><b style="font-size:26px">${ms.learning}</b><br>Syllabes à ★ ou ★★ • ${unlockedFamilyCount()} / ${DATA.sets.length} familles débloquées.<br>${curriculumNextText()}</p></div>
  <div class="parent-box"><h3>🔁 À reprendre</h3><p><b style="font-size:26px">${ms.needsReview}</b><br>Syllabes déjà évaluées, sans réussite autonome enregistrée.</p></div>
  <div class="parent-box"><h3>🔎 Pas encore évaluées</h3><p><b style="font-size:26px">${ms.unseen}</b><br>Aucune réponse évaluée pour ces syllabes. Ce n’est pas une difficulté constatée.</p></div>
  <div class="parent-box"><h3>📅 Missions terminées</h3><p><b style="font-size:26px">${completedMissionCount()}</b><br>🔥 Série : ${missionDayStreak()} jour(s) • ${missionsLast7Days()} cette semaine.<br><small>Meilleure série : ${bestMissionStreak()} jour(s).</small></p></div>
 </div>
 ${parentReviewHTML()}
 <div class="card"><b>🔎 À renforcer</b><p style="color:var(--muted);font-size:13px">Les syllabes les moins solides reviennent davantage dans les missions. <b>${dueCount}</b> syllabe(s) sont aussi prévues en révision espacée aujourd’hui.</p><div class="collection-row">${weak}</div></div>
 <div class="card"><b>📝 Mots à renforcer</b><p style="color:var(--muted);font-size:13px">Les mots évalués dans « J’écris le mot » sont suivis séparément des syllabes.</p><div class="collection-row">${weakWords}</div></div>
 <details class="card"><summary style="cursor:pointer;font-weight:900">🔤 Voir les ${DATA.sets.flat().length} syllabes en détail</summary><p>Choisissez une syllabe disponible pour un entraînement court, sans modifier la mission en cours.</p><div class="mastery-grid">${parentSyllableGridHTML()}</div></details>
 <div class="card"><b>Comment lire ce bilan ?</b><p>Le pourcentage de réussite compte les tentatives, y compris les réponses corrigées après une erreur. Il ne mesure pas à lui seul l’autonomie.</p><p>Les étoiles de maîtrise suivent les réponses vérifiées. Depuis la version 0.17, corriger une erreur dans la même question ne les fait plus monter. Les résultats plus anciens sont conservés.</p><p>☆☆☆ peut signifier « pas encore évaluée » : ce n’est pas un échec. Les récompenses valorisent l’effort et sont distinctes de la maîtrise.</p></div>
 <div class="card"><b>📚 7 dernières missions</b>${recentMissionHTML()}</div>
 <div class="parent-grid">
  <div class="parent-box"><h3>📅 Routine simple</h3><p>Une mission courte par jour suffit. On s’arrête avant la fatigue et on privilégie la régularité.</p></div>
  <div class="parent-box"><h3>👂 Comment aider</h3><p>Laisser quelques secondes pour décoder. Si ça bloque, redonner le son puis fusionner : <b>mmm…a → ma</b>.</p></div>
  <div class="parent-box"><h3>🎯 Priorité</h3><p>La précision avant la vitesse. L’image sert de vérification, pas à deviner le mot.</p></div>
  <div class="parent-box"><h3>🌟 Motivation</h3><p>Valoriser l’effort et les progrès. Une courte réussite quotidienne vaut mieux qu’une longue séance tendue.</p></div>
 </div>
 <div class="card"><b>🛠️ Outils parent</b><p style="color:var(--muted);font-size:13px">En cas de souci, tu peux recréer uniquement la mission du jour, exporter ou restaurer une progression, ou copier un diagnostic technique sans email.</p><input id="progressImportInput" type="file" accept=".json,application/json" hidden><div class="actions"><button class="btn gray" data-action="reset-mission">↻ Recréer la mission</button><button class="btn good" data-action="export-progress">⬇️ Exporter la progression</button><button class="btn good" data-action="import-progress">⬆️ Importer une progression</button><button class="btn gray" data-action="copy-diagnostic">📋 Copier diagnostic</button></div></div>
 <div class="card"><b>💾 Sauvegarde automatique</b><p style="color:var(--muted);font-size:13px">En mode invité, la progression reste sur cet appareil. Avec un compte parent et un profil enfant, elle est aussi synchronisée en ligne. Une copie locale est conservée avant toute remise à zéro.</p><div class="actions">${hasBackup()?'<button class="btn good" data-action="restore-backup">↩ Restaurer la dernière sauvegarde</button>':''}<button class="btn gray" data-action="reset">Réinitialiser toute la progression</button></div></div>`;
}
function render(){
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView || (["listen","encode","word-encode","bubbles","memory","family","missing","pronunciation","pictures","build","order","readaloud","comprehension"].includes(currentView) && b.dataset.view==="games") || (["mission","mission-discover","mission-complete"].includes(currentView) && b.dataset.view==="home")));
 if(currentView==="home")home();
 else if(currentView==="sounds")sounds();
 else if(currentView==="syllables")syllables();
 else if(currentView==="words")words();
 else if(currentView==="games")gamesMenu();
 else if(currentView==="world")worldView();
 else if(currentView==="collection")collectionView();
 else if(currentView==="mission")missionHub();
 else if(currentView==="mission-complete")missionComplete();
 else if(currentView==="listen")gameListen();
 else if(currentView==="encode")gameEncode();
 else if(currentView==="word-encode")gameWordEncode();
 else if(currentView==="bubbles")gameBubbles();
 else if(currentView==="memory")gameMemory();
 else if(currentView==="family")gameFamily();
 else if(currentView==="missing")gameMissing();
 else if(currentView==="pronunciation")gamePronunciation();
 else if(currentView==="pictures")gamePicture();
 else if(currentView==="build")gameBuild();
 else if(currentView==="order")gameOrder();
 else if(currentView==="readaloud")gameReadAloud();
 else if(currentView==="comprehension")gameComprehension();
 else if(currentView==="parents")parents();
 else{currentView="home";state.lastView="home";save(false);home()}
 topUI();window.scrollTo({top:0,behavior:"smooth"});
}

function checkChoice(btn,value,kind){
 if(locked)return;
 if(value===currentAnswer){
   locked=true;btn.classList.add("correct");recordQuestionSuccess(kind==="pictures"?"word:"+currentAnswer:currentAnswer,kind+":"+value);rewardVerified("Bonne réponse !",kind+":"+value);
   if(kind==="listen")setDone("listen");if(kind==="pictures")setDone("pictures");if(kind==="syllables")setDone("syllables");
   speak(value,.64);if(state.streak>0&&state.streak%5===0)confetti();completeMissionStep()
 }else{
   btn.classList.add("wrong","wiggle");recordQuestionError(kind==="pictures"?"word:"+currentAnswer:currentAnswer);btn.disabled=true;miss();speak(currentAnswer,.60);setTimeout(()=>btn.classList.remove("wrong","wiggle"),650)
 }
}


let authOpener=null,authViewId=0,authBusy=false,passwordRecovery=false,authBootstrapping=true,authEventSequence=0;
function closeAuth(){
 authViewId++;
 $("#authModal").classList.add("hidden");
 if(authOpener?.isConnected)authOpener.focus();authOpener=null
}
document.addEventListener("keydown",e=>{
 const modal=$("#authModal");if(modal.classList.contains("hidden"))return;
 if(e.key==="Escape"){e.preventDefault();closeAuth();return}
 if(e.key==="Enter"&&e.target.tagName==="INPUT"){
  const id=e.target.id,action=id.startsWith("recovery")?"update-password":id.startsWith("signup")?"signup":id.startsWith("login")?"login":id==="newChildName"?"create-child":null;
  if(action){e.preventDefault();modal.querySelector('[data-action="'+action+'"]:not(:disabled)')?.click()}return
 }
 if(e.key!=="Tab")return;
 const fields=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>!el.hidden);
 const first=fields[0],last=fields[fields.length-1];if(!first)return;
 if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus()}
});
function authMsg(text,type=""){const el=$("#authMsg");if(el){el.textContent=text;el.className="auth-msg "+type}}
function renderAuthForm(mode){authViewId++;const f=$("#authForm");if(!f)return;if(mode==="signup")f.innerHTML=`<div class="form"><div class="field"><label for="signupName">Votre prénom</label><input id="signupName" autocomplete="given-name"></div><div class="field"><label for="signupEmail">Email</label><input id="signupEmail" type="email" autocomplete="email" inputmode="email"></div><div class="field"><label for="signupPassword">Mot de passe (8 caractères minimum)</label><input id="signupPassword" type="password" autocomplete="new-password"></div><button class="btn primary" data-action="signup">Créer mon compte</button></div>`;else f.innerHTML=`<div class="form"><div class="field"><label for="loginEmail">Email</label><input id="loginEmail" type="email" autocomplete="username" inputmode="email"></div><div class="field"><label for="loginPassword">Mot de passe</label><input id="loginPassword" type="password" autocomplete="current-password"></div><button class="btn primary" data-action="login">Se connecter</button><button class="btn gray" data-action="forgot">Mot de passe oublié</button></div>`}
function openAuth(mode="login"){if(passwordRecovery&&session){openPasswordRecovery();return}const modal=$("#authModal"),content=$("#authContent");authOpener=document.activeElement;modal.classList.remove("hidden");if(session){renderAccountPanel();content.querySelector("button")?.focus();return}content.innerHTML=`<h2>Compte parent</h2><p>Connectez-vous pour synchroniser la progression entre plusieurs appareils.</p><div class="tabs"><button class="tab ${mode==="login"?"active":""}" data-auth-tab="login">Connexion</button><button class="tab ${mode==="signup"?"active":""}" data-auth-tab="signup">Créer un compte</button></div><div id="authForm"></div><div class="auth-msg" id="authMsg" role="status" aria-live="polite"></div><div class="actions" style="margin-top:10px"><button class="btn gray" data-action="close-modal">Continuer en invité</button></div>`;renderAuthForm(mode);content.querySelector("input")?.focus()}
function authErrorMessage(error){
 const code=error?.code||"";
 const messages={invalid_credentials:"Email ou mot de passe incorrect.",email_not_confirmed:"Confirme ton email avec le lien reçu avant de te connecter.",over_email_send_rate_limit:"Un email vient déjà d’être demandé. Patiente un peu avant de réessayer.",over_request_rate_limit:"Trop de tentatives rapprochées. Patiente un peu avant de réessayer.",same_password:"Choisis un mot de passe différent du précédent.",weak_password:"Ce mot de passe est trop simple. Choisis un mot de passe plus long et moins prévisible.",session_not_found:"Le lien a expiré. Demande un nouveau lien de réinitialisation.",otp_expired:"Le lien a expiré. Demande un nouveau lien de réinitialisation."};
 return messages[code]||"La demande n’a pas abouti. Vérifie ta connexion puis réessaie."
}
async function authRequest(task){
 if(authBusy)return;
 if(!sb){authMsg("Service de connexion indisponible. Le mode invité reste utilisable.","error");return}
 authBusy=true;const view=authViewId,isCurrent=()=>view===authViewId;
 const buttons=[...$("#authContent").querySelectorAll('button:not([data-action="close-modal"])')];
 buttons.forEach(b=>b.disabled=true);
 try{await task(isCurrent)}catch(error){if(isCurrent())authMsg(authErrorMessage(error),"error")}
 finally{authBusy=false;buttons.forEach(b=>{if(b.isConnected)b.disabled=false})}
}
function validEmailInput(id){
 const input=$(id),email=input?.value.trim()||"";
 if(!email||!input.checkValidity()){authMsg("Indique une adresse email valide.","error");input?.focus();return null}
 return email
}
async function signUp(){
 const email=validEmailInput("#signupEmail"),password=$("#signupPassword").value,name=$("#signupName").value.trim();
 if(!email)return;if(password.length<8){authMsg("Choisis un mot de passe de 8 caractères minimum.","error");return}
 return authRequest(async isCurrent=>{
  authMsg("Création du compte…");
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:APP_URL}});
  if(!isCurrent())return;if(error){authMsg(authErrorMessage(error),"error");return}
  $("#signupPassword").value="";
  if(data?.session){session=data.session;renderAccountPanel();authMsg("Compte créé. Tu peux ajouter un profil enfant.","good")}
  else authMsg("Vérifie ta boîte mail et clique sur le lien de confirmation pour continuer.","good")
 })
}
async function login(){
 const email=validEmailInput("#loginEmail"),password=$("#loginPassword").value;
 if(!email)return;if(!password){authMsg("Indique ton mot de passe.","error");return}
 return authRequest(async isCurrent=>{
  authMsg("Connexion…");const {error}=await sb.auth.signInWithPassword({email,password});
  if(!isCurrent())return;if(error){authMsg(authErrorMessage(error),"error");return}closeAuth()
 })
}
async function forgot(){
 const email=validEmailInput("#loginEmail");if(!email)return;
 return authRequest(async isCurrent=>{
  authMsg("Envoi du lien…");const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});
  if(!isCurrent())return;
  authMsg(error?authErrorMessage(error):"Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe.",error?"error":"good")
 })
}
function openPasswordRecovery(){
 authViewId++;const modal=$("#authModal"),content=$("#authContent");
 if(modal.classList.contains("hidden"))authOpener=document.activeElement;
 modal.classList.remove("hidden");
 content.innerHTML='<h2>Nouveau mot de passe</h2><p>Choisis un nouveau mot de passe pour ton compte parent.</p><div class="form"><div class="field"><label for="recoveryPassword">Nouveau mot de passe (8 caractères minimum)</label><input id="recoveryPassword" type="password" autocomplete="new-password" minlength="8"></div><div class="field"><label for="recoveryConfirm">Confirmer le mot de passe</label><input id="recoveryConfirm" type="password" autocomplete="new-password"></div><button class="btn primary" data-action="update-password">Enregistrer le mot de passe</button></div><div class="auth-msg" id="authMsg" role="status" aria-live="polite"></div><div class="actions"><button class="btn gray" data-action="close-modal">Fermer</button></div>';
 $("#recoveryPassword").focus()
}
async function updatePassword(){
 if(!session||!passwordRecovery){authMsg("Le lien a expiré. Demande un nouveau lien depuis « Mot de passe oublié ».","error");return}
 const password=$("#recoveryPassword").value,confirmation=$("#recoveryConfirm").value;
 if(password.length<8){authMsg("Choisis un mot de passe de 8 caractères minimum.","error");return}
 if(password!==confirmation){authMsg("Les deux mots de passe ne sont pas identiques.","error");return}
 const ownerId=session.user.id;
 return authRequest(async isCurrent=>{
  authMsg("Enregistrement…");const {error}=await sb.auth.updateUser({password});
  if(!isCurrent()||session?.user?.id!==ownerId)return;
  if(error){authMsg(authErrorMessage(error),"error");return}
  passwordRecovery=false;$("#recoveryPassword").value="";$("#recoveryConfirm").value="";
  authViewId++;$("#authContent").innerHTML='<h2>Mot de passe enregistré</h2><p>Ton nouveau mot de passe est prêt. Tu peux retrouver les profils de tes enfants.</p><button class="btn primary" data-action="account-open">Retrouver mes profils</button>';
  $("#authContent").querySelector("button").focus()
 })
}
async function logout(){
 return authRequest(async isCurrent=>{
  authMsg("Déconnexion…");clearTimeout(saveTimer);if(currentChild&&!profileLoading)await saveRemoteNow();
  const {error}=await sb.auth.signOut();if(error){if(isCurrent())authMsg(authErrorMessage(error),"error");return}
  profileLoadSequence++;profileLoading=false;passwordRecovery=false;session=null;currentChild=null;children=[];
  try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}
  currentView=state.lastView||"home";closeAuth();render();topUI()
 })
}

async function loadChildren(){if(!sb||!session)return;const ownerId=session.user.id;const {data,error}=await sb.from("children").select("id,parent_id,nickname,school_level,avatar,created_at").eq("parent_id",session.user.id).order("created_at",{ascending:true});if(ownerId!==session?.user?.id)return;if(error){console.error(error);return}children=(data||[]).filter(ch=>ch.parent_id===ownerId)}
function renderAccountPanel(){authViewId++;const c=$("#authContent");c.innerHTML=`<h2>Mon compte</h2><p>${esc(session.user.email||"")}</p><div class="children-grid">${children.map(ch=>`<button class="child-card" data-action="select-child" data-id="${esc(ch.id)}"><div class="avatar">${esc(ch.avatar||"🦊")}</div><b>${esc(ch.nickname)}</b><small>${esc(ch.school_level||"CP")}</small></button>`).join("")}</div><div class="card"><h3 style="margin-top:0">Ajouter un enfant</h3><div class="form"><div class="field"><label for="newChildName">Prénom ou pseudo</label><input id="newChildName" maxlength="30"></div><div class="field"><label for="newChildLevel">Niveau</label><select id="newChildLevel"><option>CP</option><option>Grande section</option><option>CE1</option></select></div><div class="field"><label for="newChildAvatar">Avatar</label><select id="newChildAvatar"><option>🦊</option><option>🐼</option><option>🦄</option><option>🐯</option><option>🐨</option><option>🐰</option></select></div><button class="btn primary" data-action="create-child">Créer le profil</button></div><div class="auth-msg" id="authMsg" role="status" aria-live="polite"></div></div><div class="actions" style="margin-top:12px"><button class="btn gray" data-action="close-modal">Fermer</button><button class="btn redbtn" data-action="logout">Se déconnecter</button></div>`}
async function createChild(){
 if(!session)return;
 const nickname=$("#newChildName").value.trim(),school_level=$("#newChildLevel").value,avatar=$("#newChildAvatar").value,ownerId=session.user.id;
 if(!nickname){authMsg("Indique un prénom ou un pseudo.","error");return}
 return authRequest(async isCurrent=>{
  authMsg("Création du profil…");
  const {data,error}=await sb.from("children").insert({parent_id:ownerId,nickname,school_level,avatar}).select().single();
  if(!isCurrent()||session?.user?.id!==ownerId)return;
  if(error){authMsg(authErrorMessage(error),"error");return}
  await loadChildren();if(data.parent_id!==session?.user?.id||!isCurrent())return;
  enterChildProfile(data);await loadRemoteState();if(session?.user?.id===ownerId&&isCurrent())renderAccountPanel();topUI()
 })
}

async function selectChild(id){const ch=children.find(x=>x.id===id&&x.parent_id===session?.user?.id);if(!ch)return;enterChildProfile(ch);closeAuth();await loadRemoteState();topUI()}

document.addEventListener("click",e=>{
 const b=e.target.closest("[data-action]");if(!b)return;
 const a=b.dataset.action;
 if(profileLoading&&!["select-child","close-modal","logout","update-password","account-open"].includes(a))return;
 if(stage.contains(b)&&refreshExpiredMission())return;
 if(a==="recover-home"){runtimeErrorShown=false;missionMode=false;activate("home");return}
 if(a==="go"){missionMode=false;activate(b.dataset.to);return}
 if(a==="mission-start"){missionHub();return}
 if(a==="mission-next"){startMissionStep();return}
 if(a==="mission-continue"){startMissionStep();return}
 if(a==="mission-finish"){missionComplete();return}
 if(a==="mission-back"){missionHub();return}
 if(a==="mission-review"){missionMode=false;activate("games");return}
 if(a==="mission-discover-listen"){speakMission(currentAnswer,.58);return}
 if(a==="mission-repeat-answer"){speakMission(currentAnswer,.60);return}
 if(a==="mission-bubble-repeat"){speakMission(currentAnswer,.60);return}
 if(a==="mission-discover-done"){practiceDone("Échauffement terminé !");completeMissionStep();return}
 if(a==="speak"){speak(b.dataset.text,Number(b.dataset.rate||.72));return}
 if(a==="sound-next"){const n=activeSoundData().length;state.sound=(state.sound+1)%n;save(false);refreshPracticeScreen(sounds,a);return}
 if(a==="sound-prev"){const n=activeSoundData().length;state.sound=(state.sound-1+n)%n;save(false);refreshPracticeScreen(sounds,a);return}
 if(a==="sound-repeat"){const pool=activeSoundData(),g=pool[state.sound%pool.length].g;state.soundPractice=state.soundPractice||{};state.soundPractice[g]=true;const needed=activeSoundGraphemes();if([...needed].every(x=>state.soundPractice[x]))setDone("sounds");else save();refreshPracticeScreen(sounds,a);practiceDone("Bien répété ! Continue comme ça.");return}
 if(a==="set-next"){const n=Math.max(1,unlockedFamilyCount());state.set=(state.set+1)%n;save(false);refreshPracticeScreen(syllables,a);return}
 if(a==="set-prev"){const n=Math.max(1,unlockedFamilyCount());state.set=(state.set-1+n)%n;save(false);refreshPracticeScreen(syllables,a);return}
 if(a==="syllable-quiz"){startSyllableQuiz();return}
 if(a==="syllable-answer"){checkChoice(b,b.dataset.value,"syllables");return}
 if(a==="word-next"){const n=decodableMissionWords().length;state.word=(state.word+1)%n;save(false);refreshPracticeScreen(words,a);return}
 if(a==="word-prev"){const n=decodableMissionWords().length;state.word=(state.word-1+n)%n;save(false);refreshPracticeScreen(words,a);return}
 if(a==="word-read"){const pool=decodableMissionWords(),w=pool[state.word%pool.length];state.wordPractice=state.wordPractice||{};state.wordPractice[w.w]=true;if(wordPracticeComplete())setDone("words");else save();refreshPracticeScreen(words,a);practiceDone("Bien essayé ! Les étoiles sont réservées aux réponses vérifiées.");return}
 if(a==="game-listen"){gameListen();return}
 if(a==="game-encode"){gameEncode();return}
 if(a==="game-word-encode"){gameWordEncode();return}
 if(a==="word-encode-listen"){if(currentAnswer?.w)speak(currentAnswer.w,.68);return}
 if(a==="word-encode-token"){if(locked||b.disabled||!currentAnswer?.parts||wordEncodeMade.length>=currentAnswer.parts.length)return;b.disabled=true;wordEncodeMade.push(b.dataset.value);updateWordEncode();return}
 if(a==="word-encode-reset"){if(locked)return;wordEncodeMade=[];document.querySelectorAll("#wordEncodeChoices .choice").forEach(x=>x.disabled=false);updateWordEncode();$("#feedback").innerHTML="";return}
 if(a==="encode-letter"){if(locked||b.disabled||encodeMade.length>=2)return;b.disabled=true;encodeMade.push(b.dataset.value);updateEncode();return}
 if(a==="encode-reset"){if(locked)return;encodeMade=[];document.querySelectorAll("#encodeBank .encode-letter").forEach(x=>x.disabled=false);updateEncode();$("#feedback").innerHTML="";return}
 if(a==="game-bubbles"){gameBubbles();return}
 if(a==="parent-review"||a==="parent-syllable-review"){
   const target=b.dataset.target;
   if(activeLearningSyllables().includes(target)){gameListen(target,false,true);topUI();stage.focus({preventScroll:true})}
   return
 }
 if(a==="parent-word-review"){
   const word=wordEncodePool().find(w=>w.w===b.dataset.word);
   if(word&&wordEncodingUnlocked()){gameWordEncode(word,true);topUI();stage.focus({preventScroll:true})}
   return
 }
 if(a==="bubble-repeat"){speak(currentAnswer,.60);return}
 if(a==="bubble-answer"){
   if(locked)return;
   if(b.dataset.value===currentAnswer){locked=true;b.classList.add("pop");recordQuestionSuccess(currentAnswer,"bubble:"+currentAnswer);rewardVerified("Bonne bulle !","bubble:"+currentAnswer);setDone("bubbles");screenTask(()=>{if(!pronunciationSession)speak(currentAnswer,.60)},120);completeMissionStep()}
   else{recordQuestionError(currentAnswer);b.disabled=true;b.classList.add("wiggle");miss("Essaie une autre bulle.");setTimeout(()=>b.classList.remove("wiggle"),450)}
   return
 }
 if(a==="game-memory"){gameMemory();return}
 if(a==="memory-card"){memoryFlip(b,Number(b.dataset.index));return}
 if(a==="game-family"){gameFamily();return}
 if(a==="game-missing"){gameMissing();return}
 if(a==="missing-answer"){
   if(locked)return;
   const value=b.dataset.value,key="missing:"+(missingWord?.w||"mot")+":"+missingIndex;
   if(value===currentAnswer){locked=true;b.classList.add("correct");recordQuestionSuccess(currentAnswer,key);rewardVerified("Mot complété !",key);setDone("missing");$("#feedback").innerHTML='<div class="ok">🎉 Bravo ! Le mot est <b>'+esc(missingWord.w)+'</b>.</div>';completeMissionStep()}
   else{b.classList.add("wrong","wiggle");b.disabled=true;recordQuestionError(currentAnswer);miss("Cherche le morceau qui complète le mot.");setTimeout(()=>b.classList.remove("wrong","wiggle"),600)}
   return
 }
 if(a==="family-answer"){
   if(locked)return;
   if(b.dataset.value===currentAnswer){locked=true;b.classList.add("correct");recordQuestionSuccess(null,"family:"+currentAnswer);rewardVerified("Intrus trouvé !","family:"+currentAnswer);setDone("families");$("#feedback").innerHTML='<div class="ok">🎉 Bravo, tu as trouvé l’intrus !</div>';completeMissionStep()}
   else{b.classList.add("wrong","wiggle");b.disabled=true;recordQuestionError();miss("Regarde bien la première lettre.");setTimeout(()=>b.classList.remove("wrong","wiggle"),600)}
   return
 }
 if(a==="game-pronunciation"){gamePronunciation();return}
 if(a==="pronunciation-listen"){speak(currentAnswer,.60);return}
 if(a==="pronunciation-stop"){stopPronunciationSession("Écoute arrêtée. Tu peux réessayer.");return}
 if(a==="pronunciation-record"){startPronunciationRecognition();return}
 if(a==="game-picture"){gamePicture();return}
 if(a==="game-build"){gameBuild();return}
 if(a==="game-order"){gameOrder();return}
 if(a==="game-readaloud"){gameReadAloud();return}
 if(a==="readaloud-done"){if(locked)return;locked=true;b.disabled=true;const model=$("#readaloudModel");if(model)model.hidden=false;$("#feedback").innerHTML='<div class="ok">👏 Bravo pour ta lecture ! Maintenant, tu peux écouter le modèle et comparer.</div>';practiceDone("Bravo d’avoir lu la phrase à voix haute !");model?.querySelector("button")?.focus({preventScroll:true});return}
 if(a==="readaloud-model"){speak(readAloudSentence.join(" "),.76);return}
 if(a==="game-comprehension"){gameComprehension();return}
 if(a==="comprehension-answer"){
   if(locked)return;
   const value=b.dataset.value,key="comprehension:"+currentAnswer;
   if(value===currentAnswer){locked=true;b.classList.add("correct");recordQuestionSuccess(null,key);rewardVerified("Phrase comprise !",key);setDone("comprehension");$("#feedback").innerHTML='<div class="ok">🎉 Bravo, tu as bien compris la phrase !</div>';completeMissionStep()}
   else{b.classList.add("wrong","wiggle");b.disabled=true;recordQuestionError();miss("Relis la phrase tranquillement.");setTimeout(()=>b.classList.remove("wrong","wiggle"),600)}
   return
 }
 if(a==="repeat-answer"){speak(typeof currentAnswer==="string"?currentAnswer:currentAnswer.w,.60);return}
 if(a==="listen-answer"){checkChoice(b,b.dataset.value,"listen");return}
 if(a==="picture-hint"){questionAssisted=true;speak(currentAnswer,.70);return}
 if(a==="missing-listen"){speak(missingWord.w,.70);return}
 if(a==="picture-answer"){checkChoice(b,b.dataset.value,"pictures");return}
 if(a==="build-token"){
   if(locked||b.disabled)return;b.disabled=true;orderMade.push(b.dataset.value);updateBuild();return
 }
 if(a==="build-reset"){if(locked)return;orderMade=[];document.querySelectorAll("#buildChoices .choice").forEach(x=>x.disabled=false);updateBuild();$("#feedback").innerHTML="";return}
 if(a==="order-token"){if(locked||b.disabled)return;b.disabled=true;orderMade.push(b.dataset.value);updateOrder();return}
 if(a==="order-reset"){if(locked)return;orderMade=[];document.querySelectorAll("#orderChoices .choice").forEach(x=>x.disabled=false);updateOrder();$("#feedback").innerHTML="";return}
 if(a==="signup"){signUp();return}
 if(a==="login"){login();return}
 if(a==="forgot"){forgot();return}
 if(a==="update-password"){updatePassword();return}
 if(a==="account-open"){openParentAccount();return}
 if(a==="logout"){logout();return}
 if(a==="create-child"){createChild();return}
 if(a==="select-child"){selectChild(b.dataset.id);return}
 if(a==="close-modal"){closeAuth();return}
 if(a==="reset-mission"){resetDailyMission();return}
 if(a==="copy-diagnostic"){copyDiagnostic();return}
 if(a==="export-progress"){exportProgress();return}
 if(a==="import-progress"){const input=$("#progressImportInput");if(input)input.click();return}
 if(a==="restore-backup"){restoreBackup();return}
 if(a==="reset"){
   if(confirm("Remettre les étoiles et la progression à zéro ? Une sauvegarde locale sera conservée.")){if(!saveBackup()){alert("La copie de sécurité n’a pas pu être créée. Exporte la progression avant de réessayer.");return}state=normalizeState({name:currentChild?currentChild.nickname:(state.name||"")});currentView="home";save();render()}
 }
});
nav.addEventListener("click",e=>{const b=e.target.closest(".nav-btn");if(!b||profileLoading)return;missionMode=false;activate(b.dataset.view)});
async function openParentAccount(){
 stopPronunciationSession("Écoute interrompue. Tu peux recommencer après avoir fermé le compte parent.");
 try{if(session&&!passwordRecovery)await loadChildren();openAuth()}catch(e){openAuth();authMsg("Impossible de charger les profils. Réessaie dans un instant.","error")}
}
$("#accountBtn").addEventListener("click",openParentAccount);
$("#switchChildBtn").addEventListener("click",openParentAccount);
$("#textSizeBtn").addEventListener("click",()=>{const enabled=!document.body.classList.contains("large-text");try{localStorage.setItem(UI_TEXT_SIZE_KEY,enabled?"1":"0")}catch(e){}applyTextSizePreference(enabled);stage.focus({preventScroll:true})});
$("#authModal").addEventListener("click",e=>{if(e.target.id==="authModal")closeAuth()});
document.addEventListener("click",e=>{const tab=e.target.closest("[data-auth-tab]");if(!tab)return;document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");renderAuthForm(tab.dataset.authTab);authMsg("")});
document.addEventListener("change",async e=>{if(e.target?.id!=="progressImportInput")return;const file=e.target.files?.[0]||null;e.target.value="";await importProgressFile(file)});
function handleAuthStateChange(event,newSession){
 authEventSequence++;
 const previousOwner=session?.user?.id;
 if(previousOwner!==newSession?.user?.id)stopPronunciationSession();
 session=newSession;
 if(event==="PASSWORD_RECOVERY"){
  passwordRecovery=!!newSession;
  if(previousOwner!==newSession?.user?.id){clearTimeout(saveTimer);profileLoadSequence++;profileLoading=false;currentChild=null;children=[];missionMode=false;try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}}
  if(newSession)openPasswordRecovery();return
 }
 if(authBootstrapping)return;
 if(!newSession)passwordRecovery=false;
 if(previousOwner===newSession?.user?.id){topUI();return}
 clearTimeout(saveTimer);profileLoadSequence++;profileLoading=false;currentChild=null;children=[];missionMode=false;
 try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}
 currentView=state.lastView||"home";render();topUI();
 if(!newSession)return;
 const ownerId=newSession.user.id;
 setTimeout(()=>restoreSessionProfile(ownerId).catch(()=>authMsg("Le compte est connecté. Réessaie de choisir un profil.","error")),0)
}
async function restoreSessionProfile(ownerId){
 await loadChildren();if(session?.user?.id!==ownerId||passwordRecovery)return;
 const remembered=localStorage.getItem("lastChildId"),child=children.find(c=>c.id===remembered)||(children.length===1?children[0]:null);
 if(child){enterChildProfile(child);await loadRemoteState()}else topUI()
}
async function bootstrap(){
 applyTextSizePreference();
 if(sb){
  try{
   // Subscribe before getSession, otherwise a recovery event may already be over.
   sb.auth.onAuthStateChange(handleAuthStateChange);
   const sequence=authEventSequence,{data:{session:s}}=await sb.auth.getSession();
   if(sequence===authEventSequence)session=s;
   if(session&&!passwordRecovery)await restoreSessionProfile(session.user.id)
  }catch(e){console.error("Supabase bootstrap error",e);session=null;currentChild=null}
 }
 authBootstrapping=false;
 if("speechSynthesis" in window){refreshSpeechVoices();speechSynthesis.addEventListener?.("voiceschanged",refreshSpeechVoices)}
 render();topUI();
 if(passwordRecovery&&session)openPasswordRecovery();
 else if(incomingAuthLinkError&&!session){openAuth();authMsg("Ce lien est expiré ou invalide. Demande un nouveau lien depuis « Mot de passe oublié ».","error")}
 if(!sb&&!localSaveFailed){$("#syncStatus").textContent="Mode local • service de synchronisation indisponible";$("#syncStatus").className="sync err"}
}

function registerServiceWorker(){
 if(!("serviceWorker" in navigator))return;
 const hadController=!!navigator.serviceWorker.controller;
 let updateNotified=false;
 navigator.serviceWorker.addEventListener?.("controllerchange",()=>{
  if(hadController&&!updateNotified){updateNotified=true;toast("✨ Mise à jour installée • elle sera utilisée au prochain rechargement.","ok")}
 });
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("./sw.js")
   .then(reg=>reg.update().catch(()=>{}))
   .catch(error=>console.error("Service Worker registration error",error))
 })
}
bootstrap();
registerServiceWorker();

"use strict";
const SUPABASE_URL="https://dqxwwxzpvxroiueqursc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_uyKC1ioxc2-1MgOscqyDlQ_0AMqbOli";
const APP_URL="https://neggy-nettah.github.io/lecture-cp/";
const APP_VERSION="0.9.1";
const sb=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
const DEFAULT_STATE={updatedAt:0,stars:0,streak:0,name:"",done:{},stats:{attempts:0,correct:0},mastery:{},reviewQueue:[],attemptLedger:{},rewardLedger:{},soundPractice:{},rewards:{towardPiece:0,pieces:0,puzzles:0,collection:[]},dailyMission:null,missionHistory:[],sound:0,set:0,word:0,gameWins:0,lastView:"home"};
let session=null,currentChild=null,children=[],saveTimer=null;
function normalizeState(raw){return {...DEFAULT_STATE,...(raw||{}),done:(raw&&raw.done)||{},stats:{...DEFAULT_STATE.stats,...((raw&&raw.stats)||{})},mastery:(raw&&raw.mastery)||{},reviewQueue:Array.isArray(raw?.reviewQueue)?raw.reviewQueue:[],attemptLedger:(raw&&raw.attemptLedger)||{},rewardLedger:(raw&&raw.rewardLedger)||{},soundPractice:(raw&&raw.soundPractice)||{},missionHistory:Array.isArray(raw?.missionHistory)?raw.missionHistory:[],rewards:{...DEFAULT_STATE.rewards,...((raw&&raw.rewards)||{}),collection:[...((((raw&&raw.rewards)||{}).collection)||[])]}}}
function guestKey(){return "fabriqueSyllabesGuestV4"}
function childKey(id){return "fabriqueSyllabesChild_"+id}
let state;try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}
let currentView=state.lastView||"home",locked=false,currentAnswer=null,orderTarget=[],orderMade=[],memoryDeck=[],memoryOpen=[],memoryMatches=0,missionMode=false,questionErrorRecorded=false;
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
window.addEventListener("offline",()=>{const s=$("#syncStatus");if(s){s.textContent="📴 Hors ligne • progression sauvegardée sur cet appareil";s.className="sync err"}});
window.addEventListener("online",()=>{if(sb&&session&&currentChild)loadRemoteState();else topUI()});
function saveLocal(){
 try{localStorage.setItem(currentChild?childKey(currentChild.id):guestKey(),JSON.stringify(state));return true}
 catch(e){console.error("Local save error",e);return false}
}
async function saveRemoteNow(){
 saveLocal();topUI();if(!sb||!session||!currentChild)return;
 $("#syncStatus").textContent="☁️ Synchronisation…";$("#syncStatus").className="sync";
 const {error}=await sb.from("progress").upsert({child_id:currentChild.id,lesson_id:"app_state",stars:state.stars||0,completed:learningCourseCompleted(),attempts:state.stats?.attempts||0,correct_answers:state.stats?.correct||0,lesson_state:state},{onConflict:"child_id,lesson_id"});
 if(error){console.error(error);$("#syncStatus").textContent="⚠️ Sauvegardé localement • synchro impossible";$("#syncStatus").className="sync err"}else{$("#syncStatus").textContent="☁️ Progression synchronisée";$("#syncStatus").className="sync ok"}
}
function save(touch=true){
 if(touch)state.updatedAt=Date.now();
 saveLocal();topUI();
 if(!touch)return;
 clearTimeout(saveTimer);saveTimer=setTimeout(saveRemoteNow,450)
}
async function loadRemoteState(){
 if(!sb||!session||!currentChild)return;$("#syncStatus").textContent="☁️ Chargement…";
 let cached=null;try{cached=JSON.parse(localStorage.getItem(childKey(currentChild.id))||"null")}catch(e){console.error("Local cache read error",e)}
 const {data,error}=await sb.from("progress").select("lesson_state").eq("child_id",currentChild.id).eq("lesson_id","app_state").maybeSingle();
 if(error)console.error(error);
 const remote=data?.lesson_state||null,local=cached||null;
 if(remote&&local){
  const remoteTs=Number(remote.updatedAt||0),localTs=Number(local.updatedAt||0);
  if(localTs>remoteTs){state=normalizeState(local);await saveRemoteNow()}
  else state=normalizeState(remote)
 }else if(remote)state=normalizeState(remote);
 else if(local){state=normalizeState(local);await saveRemoteNow()}
 else{state=normalizeState({name:currentChild.nickname});save();await saveRemoteNow()}
 state.name=currentChild.nickname;currentView=state.lastView||"home";saveLocal();render();topUI();
}
function topUI(){
 const version=$("#appVersion");if(version)version.textContent="v"+APP_VERSION;
 $("#stars").textContent=state.stars||0;$("#streak").textContent=(state.streak||0)>=2?`🔥${state.streak}`:"";
 const displayName=currentChild?currentChild.nickname:(state.name||"");
 $("#hello").textContent=displayName?`Allez ${displayName} ! Mission lecture 🌟`:"Mission : devenir une super lectrice 🌟";
 $("#childLabel").textContent=currentChild?`${currentChild.avatar||"🦊"} ${currentChild.nickname}`:"Invité";
 $("#accountBtn").textContent=session?"👤 Mon compte":"👤 Se connecter";
 const keys=["sounds","syllables","words","listen","bubbles","memory","families","pictures",...(sentenceUnlocked()?["order"]:[])],done=keys.filter(k=>k==="sounds"?soundPracticeComplete():state.done[k]).length;const syllables=DATA.sets.flat(),masteryPoints=syllables.reduce((sum,s)=>sum+masteryLevel(s),0),masteryPct=masteryPoints/(syllables.length*3),activityPct=done/keys.length,pct=Math.round((masteryPct*.7+activityPct*.3)*100);$("#progressBar").style.width=pct+"%";$("#progressText").textContent=pct+" %";
 if(!session){$("#syncStatus").textContent="Mode invité • sauvegarde locale";$("#syncStatus").className="sync"}else if(!currentChild){$("#syncStatus").textContent="Compte connecté • choisissez un profil enfant";$("#syncStatus").className="sync"}
}
function setDone(k){state.done[k]=true;save()}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function colorSyl(s){return `<span class="red">${esc(s[0]||"")}</span><span class="blue">${esc(s.slice(1))}</span>`}
function wordHTML(parts){return parts.map((p,i)=>`<span>${esc(p)}</span>`).join("·")}

function voice(){
 const vs=window.speechSynthesis?.getVoices?.()||[];
 return vs.find(v=>/^fr[-_]/i.test(v.lang)&&/France|French|fr-FR/i.test(v.lang+" "+v.name))||vs.find(v=>/^fr/i.test(v.lang))||null
}
function speak(text,rate=.72,cb){
 if(!("speechSynthesis" in window)){toast("🔈 Audio non disponible sur ce navigateur.");return}
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text);u.lang="fr-FR";u.rate=rate;u.pitch=1.06;u.volume=1;
 const v=voice();if(v)u.voice=v;if(cb)u.onend=cb;speechSynthesis.speak(u)
}
function speakMission(text,rate=.60){speak(text,rate)}
function tone(kind="ok"){
 try{
  const AC=window.AudioContext||window.webkitAudioContext,ctx=new AC();
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);
  osc.type="sine";osc.frequency.value=kind==="ok"?660:220;gain.gain.setValueAtTime(.001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);
  osc.start();osc.stop(ctx.currentTime+.24)
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
function masteryLevel(key){
 const m=(state.mastery||{})[key];if(!m||!m.attempts)return 0;
 const accuracy=m.correct/m.attempts;
 if(m.correct>=4&&accuracy>=.75)return 3;
 if(m.correct>=2&&accuracy>=.60)return 2;
 if(m.correct>=1)return 1;
 return 0
}
function masteryStars(key){const n=masteryLevel(key);return "★".repeat(n)+"☆".repeat(3-n)}
function resetQuestionTracking(){questionErrorRecorded=false}
function recordQuestionError(key=null){
 if(questionErrorRecorded)return false;
 questionErrorRecorded=true;recordAttempt(false,key);return true
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
function unlockedFamilyCount(){
 const missions=(state.missionHistory||[]).length;
 return Math.min(DATA.sets.length,3+Math.floor(missions/2))
}
function activeLearningSyllables(){
 const unlocked=DATA.sets.slice(0,unlockedFamilyCount()).flat(),known=Object.keys(state.mastery||{}).filter(k=>DATA.sets.flat().includes(k));
 return [...new Set([...unlocked,...known])]
}
function activeSoundGraphemes(){
 const consonants=DATA.sets.slice(0,unlockedFamilyCount()).map(set=>set[0][0]);
 return new Set(["a","i","o","u","é",...consonants])
}
function activeSoundData(){const allowed=activeSoundGraphemes();return DATA.sounds.filter(x=>allowed.has(x.g))}
function sentenceUnlocked(){return (state.missionHistory||[]).length>=8}
function curriculumStatus(){
 const count=unlockedFamilyCount(),missions=(state.missionHistory||[]).length;
 if(count>=DATA.sets.length)return {count,complete:true,next:null,remaining:0};
 const next=DATA.sets[count],threshold=2*(count-2);
 return {count,complete:false,next,nextInitial:(next?.[0]||"")[0]?.toUpperCase()||"?",remaining:Math.max(0,threshold-missions)}
}
function familyRoadmapHTML(){
 const status=curriculumStatus(),count=status.count;
 return '<div class="family-roadmap">'+DATA.sets.map((set,i)=>{const initial=(set[0]||"")[0]?.toUpperCase()||"?",open=i<count,isNext=i===count;return '<div class="family-chip '+(open?"open":"locked")+'"><div>'+(open?initial:"🔒")+'</div><small>'+(open?"famille "+initial:isNext&&status.remaining?"dans "+status.remaining+" mission(s)":"à venir")+'</small></div>'}).join("")+'</div>'
}
function soundPracticeComplete(){const practiced=state.soundPractice||{};return activeSoundData().every(x=>!!practiced[x.g])}
function learningCourseCompleted(){return (state.missionHistory||[]).length>=14&&masterySummary().mastered>=40}
const PHRASE_NAME_PARTS={papa:["pa","pa"],lili:["li","li"],nina:["ni","na"],papi:["pa","pi"],"mémé":["mé","mé"]};
function phraseTokenParts(token){
 const clean=String(token||"").toLowerCase().replace(/[.!?,;:]/g,"");
 if(["a","un","une","le"].includes(clean))return [];
 const word=DATA.words.find(w=>w.w===clean);return word?.parts||PHRASE_NAME_PARTS[clean]||null
}
function decodableSentencePool(){
 const allowed=new Set([...activeLearningSyllables(),..."aioué"]);
 return DATA.sentences.filter(arr=>arr.every(token=>{
  const parts=phraseTokenParts(token);if(parts===null)return false;if(parts.length===0)return true;
  const clean=String(token).toLowerCase().replace(/[.!?,;:]/g,"");
  return parts.join("")===clean&&parts.every(p=>allowed.has(p))
 }))
}
function pickLearningSyllable(){
 const all=activeLearningSyllables(),weighted=[];
 all.forEach(s=>{
  const level=masteryLevel(s),m=state.mastery?.[s]||{},overdue=m.lastSeen&&daysSinceDayKey(m.lastSeen)>=7?2:0,weight=[5,4,2,1][level]+overdue;
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
 const allowed=new Set([...DATA.sets.flat(),...DATA.sounds.filter(x=>"aioué".includes(x.g)).map(x=>x.g)]);
 return DATA.words.filter(w=>w.parts.every(p=>allowed.has(p))&&w.parts.join("")===w.w)
}
function decodableMissionWords(){
 const allowed=new Set([...activeLearningSyllables(),...DATA.sounds.filter(x=>"aioué".includes(x.g)).map(x=>x.g)]);
 return DATA.words.filter(w=>w.parts.every(p=>allowed.has(p))&&w.parts.join("")===w.w)
}
function pickReviewSyllable(exclude=""){
 const all=activeLearningSyllables(),recent=[...(state.reviewQueue||[])].reverse().filter(s=>s!==exclude&&all.includes(s));
 if(recent.length)return recent[0];
 const overdue=all.filter(s=>s!==exclude&&masteryLevel(s)>=2&&state.mastery?.[s]?.lastSeen&&daysSinceDayKey(state.mastery[s].lastSeen)>=7)
   .sort((a,b)=>daysSinceDayKey(state.mastery[b].lastSeen)-daysSinceDayKey(state.mastery[a].lastSeen));
 if(overdue.length)return overdue[0];
 return weakestSyllable(exclude)
}
function buildDailyMission(){
 const primary=pickLearningSyllable(),review=pickReviewSyllable(primary),decodable=decodableMissionWords();
 const recentWords=new Set((state.missionHistory||[]).slice(-3).map(x=>x.word));
 const related=decodable.filter(w=>w.parts.includes(primary)||w.parts.includes(review)),freshRelated=related.filter(w=>!recentWords.has(w.w)),freshAll=decodable.filter(w=>!recentWords.has(w.w));
 const pool=freshRelated.length?freshRelated:related.length?related:freshAll.length?freshAll:decodable.length?decodable:DATA.words,word=pick(pool);
 const family=DATA.sets.find(set=>set.includes(primary))||DATA.sets[0],visualType=Number(localDayKey().slice(-2))%2?"family":"memory";
 state.dailyMission={date:localDayKey(),index:0,completed:false,primary,review,word:word.w,familyFirst:family[0][0],startAttempts:null,startCorrect:null,sessionStats:{attempts:0,correct:0},steps:[
  {type:"discover",target:primary,title:"Je découvre",detail:"Écoute et répète "+primary.toUpperCase()},
  {type:"listen",target:primary,title:"J’écoute",detail:"Retrouve "+primary.toUpperCase()+" parmi les cartes"},
  {type:"bubbles",target:review,title:"Je révise",detail:"Éclate la bonne bulle"},
  visualType==="memory"?{type:"memory",target:primary,title:"Je mémorise",detail:"Associe les sons aux syllabes"}:{type:"family",target:family[0][0],title:"J’observe",detail:"Trouve l’intrus de la famille "+family[0][0].toUpperCase()},
  {type:"build",target:word.w,title:"Défi final",detail:"Construis le mot "+word.w.toUpperCase()}
 ]};
 save();return state.dailyMission
}
function getDailyMission(){
 const m=state.dailyMission;
 if(!m||m.date!==localDayKey()||!Array.isArray(m.steps)||m.steps.length!==5)return buildDailyMission();
 return m
}
function missionProgressHTML(m){
 return '<div class="mission-progress">'+m.steps.map((_,i)=>'<span class="mission-dot '+(i<m.index?"done":i===m.index&&!m.completed?"current":"")+'"></span>').join("")+'</div>'
}
function missionStepsHTML(m){
 return '<div class="mission-steps">'+m.steps.map((s,i)=>'<div class="mission-step '+(i<m.index||m.completed?"done":i===m.index?"current":"")+'"><span class="num">'+(i<m.index||m.completed?"✓":i+1)+'</span><div><b>'+s.title+'</b><small>'+s.detail+'</small></div></div>').join("")+'</div>'
}
function missionCardHTML(){
 const m=getDailyMission(),done=m.completed||m.index>=m.steps.length;
 return '<div class="daily-mission"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b style="font-size:20px">🎯 Mission du jour</b><div style="color:var(--muted);font-size:13px;margin-top:3px">'+(done?"Mission terminée !":"5 petites étapes • environ 8 à 12 min")+'</div></div><span class="pill">'+(done?"✅ Terminée":Math.min(m.index+1,5)+" / 5")+'</span></div>'+missionProgressHTML(m)+missionStepsHTML(m)+'<div class="actions" style="margin-top:12px"><button class="btn primary" data-action="'+(done?"mission-review":"mission-start")+'">'+(done?"⭐ Revoir mes exercices":m.index?"▶ Continuer ma mission":"🚀 Commencer ma mission")+'</button></div></div>'
}
function currentMissionStep(){const m=getDailyMission();return m.steps[Math.min(m.index,m.steps.length-1)]}
function missionHub(){
 missionMode=false;currentView="mission";state.lastView="mission";save(false);
 const m=getDailyMission();
 stage.innerHTML=title("Mission du jour","Une petite séance variée, adaptée à ce qui mérite d’être revu.","8–12 min")+
 '<div class="card">'+missionProgressHTML(m)+missionStepsHTML(m)+'</div><div class="actions" style="margin-top:14px"><button class="btn gray" data-action="go" data-to="home">← Accueil</button><button class="btn primary" data-action="mission-next">▶ Étape '+Math.min(m.index+1,5)+'</button></div>'
}
function missionDiscover(target){
 currentView="mission-discover";state.lastView="mission";currentAnswer=target;locked=false;
 stage.innerHTML=title("Je découvre","Écoute tranquillement, puis répète à voix haute.","Étape 1")+
 '<div class="card center"><div class="hero-emoji">👂✨</div><div class="big purple">'+colorSyl(target)+'</div><div class="actions"><button class="btn yellow" data-action="mission-discover-listen">🔊 Écouter la syllabe</button><button class="btn primary" data-action="mission-discover-done">👍 J’ai écouté et répété</button></div><div class="tip">Appuie sur 🔊 pour entendre la syllabe. Échauffement : pas d’étoile ici.</div></div>'
}
function startMissionStep(){
 const m=getDailyMission();if(m.completed||m.index>=m.steps.length){missionComplete();return}
 if(m.startAttempts==null){m.startAttempts=state.stats?.attempts||0;m.startCorrect=state.stats?.correct||0;state.dailyMission=m;save()}
 const s=currentMissionStep();missionMode=true;
 if(s.type==="discover")missionDiscover(s.target);
 else if(s.type==="listen")gameListen(s.target,true);
 else if(s.type==="bubbles")gameBubbles(s.target,true);
 else if(s.type==="memory")gameMemory([m.primary,m.review],true);
 else if(s.type==="family"){const fam=DATA.sets.find(set=>set[0][0]===s.target)||DATA.sets[0];gameFamily(fam,true)}
 else if(s.type==="build")gameBuild(DATA.words.find(w=>w.w===s.target)||null,true)
}
function completeMissionStep(){
 if(!missionMode)return;
 missionMode=false;locked=true;
 const m=getDailyMission();m.index=Math.min(m.steps.length,m.index+1);
 if(m.index>=m.steps.length)m.completed=true;
 state.dailyMission=m;save();
 let box=$("#missionContinue");
 if(!box){box=document.createElement("div");box.id="missionContinue";box.className="card center";stage.appendChild(box)}
 if(m.completed){
  box.innerHTML='<div class="hero-emoji">🏆</div><b style="font-size:20px">Mission terminée !</b><p style="color:var(--muted)">Toutes les étapes sont réussies.</p><button class="btn primary" data-action="mission-finish">Voir ma récompense →</button>'
 }else{
  const next=m.steps[m.index];
  box.innerHTML='<div class="hero-emoji">✅</div><b style="font-size:20px">Étape réussie !</b><p style="color:var(--muted)">Prochaine étape : <b>'+next.title+'</b> — '+next.detail+'</p><button class="btn primary" data-action="mission-continue">Continuer → étape '+(m.index+1)+'</button>'
 }
 setTimeout(()=>box.scrollIntoView({behavior:"smooth",block:"center"}),80)
}
function missionComplete(){
 const m=getDailyMission();missionMode=false;currentView="mission-complete";state.lastView="mission-complete";
 state.missionHistory=Array.isArray(state.missionHistory)?state.missionHistory:[];
 let gain=null,familyUnlock=null,record=state.missionHistory.find(x=>x.date===m.date)||null;
 if(!record){
  const beforeFamilies=unlockedFamilyCount(),sessionStats=m.sessionStats||null,legacyMeasured=!sessionStats&&typeof m.startAttempts==="number"&&typeof m.startCorrect==="number";
  const attempts=sessionStats?Number(sessionStats.attempts||0):(legacyMeasured?Math.max(0,(state.stats?.attempts||0)-m.startAttempts):0);
  const correct=sessionStats?Number(sessionStats.correct||0):(legacyMeasured?Math.max(0,(state.stats?.correct||0)-m.startCorrect):0);
  const measured=!!sessionStats||legacyMeasured;
  record={date:m.date,primary:m.primary,review:m.review,word:m.word,attempts,correct,accuracy:measured?(attempts?Math.round(correct/attempts*100):100):null};
  state.missionHistory.push(record);state.missionHistory=state.missionHistory.slice(-60);gain=rewardMissionPiece();
  const afterFamilies=unlockedFamilyCount();
  if(afterFamilies>beforeFamilies){const set=DATA.sets[afterFamilies-1];familyUnlock=set?set[0][0].toUpperCase():null}
 }
 save();confetti();
 const reward=gain?(gain.complete?'<div class="card center" style="background:#fff8d8;border-color:#efd06c"><div class="mission-celebrate">'+gain.item.emoji+'</div><h3 style="margin:5px">Nouveau trésor !</h3><b>'+gain.item.name+'</b><p style="color:var(--muted)">Le puzzle est terminé et ce personnage rejoint ta collection.</p><button class="btn yellow" data-action="go" data-to="collection">🎁 Voir ma collection</button></div>':'<div class="card center" style="background:#fff8d8;border-color:#efd06c"><div class="mission-celebrate">🧩</div><h3 style="margin:5px">Tu gagnes un morceau !</h3><b>'+(state.rewards?.pieces||0)+' / 4 morceaux</b><p style="color:var(--muted)">Encore '+Math.max(0,4-(state.rewards?.pieces||0))+' mission(s) pour terminer le puzzle.</p></div>'):'<div class="tip">Cette mission a déjà donné sa récompense aujourd’hui.</div>';
 const unlock=familyUnlock?'<div class="card center" style="background:#f3f1ff;border-color:#c9c3ff"><div class="mission-celebrate">🔓</div><h3 style="margin:5px">Nouvelle famille !</h3><p>Tu peux maintenant travailler les syllabes de la famille <b style="font-size:24px">'+familyUnlock+'</b>.</p><button class="btn primary" data-action="go" data-to="syllables">🧩 Découvrir la famille</button></div>':"";
 const measured=record?.accuracy!=null;
 const score='<div class="parent-grid" style="margin-top:13px"><div class="parent-box"><h3>✅ Bonnes réponses</h3><p><b style="font-size:25px">'+(measured?(record.correct+" / "+record.attempts):"—")+'</b></p></div><div class="parent-box"><h3>🎯 Réussite</h3><p><b style="font-size:25px">'+(measured?(record.accuracy+" %"):"Ancien suivi")+'</b></p></div></div>';
 stage.innerHTML=title("Mission terminée !","Tu as fini ta séance du jour.","Bravo !")+
 '<div class="card center"><div class="mission-celebrate">🏆✨</div><h3 style="font-size:26px;margin:5px">Super travail !</h3><p style="color:var(--muted)">Aujourd’hui tu as travaillé <b>'+m.primary.toUpperCase()+'</b>, révisé <b>'+m.review.toUpperCase()+'</b> et construit <b>'+m.word.toUpperCase()+'</b>.</p>'+score+'<p style="color:var(--muted);font-size:13px">Mission enregistrée dans le suivi parent.</p></div>'+unlock+reward+'<div class="actions" style="margin-top:14px"><button class="btn primary" data-action="go" data-to="home">🏠 Retour à l’accueil</button><button class="btn yellow" data-action="go" data-to="world">🗺️ Mon monde</button></div>'
}
function advanceRewards(){
 state.rewards=state.rewards||{towardPiece:0,pieces:0,puzzles:0,collection:[]};
 state.rewards.towardPiece=0;state.rewards.pieces++;
 if(state.rewards.pieces<4)return {piece:true,complete:false};
 state.rewards.pieces=0;state.rewards.puzzles++;
 const item=COLLECTIBLES[(state.rewards.puzzles-1)%COLLECTIBLES.length];
 if(!state.rewards.collection.some(x=>x.id===item.id))state.rewards.collection.push(item);
 return {piece:true,complete:true,item};
}
function rewardVerified(msg="Bravo !",challengeKey=""){
 state.rewardLedger=state.rewardLedger||{};
 const scoped=scopedChallengeKey(challengeKey),key=scoped?localDayKey()+"|"+scoped:"";
 if(key&&state.rewardLedger[key]){
  tone("ok");toast("✅ "+msg+" Déjà récompensé aujourd’hui.","ok");return false
 }
 if(key)state.rewardLedger[key]=1;
 const keys=Object.keys(state.rewardLedger);if(keys.length>500)keys.slice(0,keys.length-300).forEach(k=>delete state.rewardLedger[k]);
 state.stars++;state.streak++;save();tone("ok");starFx();toast("🌟 "+msg,"ok");return true
}
function rewardMissionPiece(){
 const gain=advanceRewards();save();tone("ok");starFx();if(gain.complete)confetti();return gain
}
function practiceDone(msg="Bravo pour ton effort !"){
 tone("ok");toast("👏 "+msg,"ok")
}
function miss(msg="Écoute encore une fois."){
 state.streak=0;save();tone("no");toast("💪 "+msg,"no")
}
function toast(msg,type="ok"){
 const f=$("#feedback");if(f)f.innerHTML=`<div class="${type}">${msg}</div>`
}
function title(t,p,pill){return `<div class="titlebar"><div><h2>${t}</h2><p>${p}</p></div>${pill?`<span class="pill">${pill}</span>`:""}</div>`}
function mission(ico,b,txt){return `<div class="mission"><div class="mission-icon">${ico}</div><div><b>${b}</b><span>${txt}</span></div></div>`}
function activate(v){currentView=v;state.lastView=v;save(false);document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===v));render()}
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
   <button class="level" data-action="game-pronunciation"><div class="ico">🎤</div><b>Je répète <span class="beta-pill">BÊTA</span></b><small>Entraînement vocal seulement</small></button>
   <button class="level" data-action="game-picture"><div class="ico">🖼️</div><b>Image-mot</b><small>Je relie mot et image</small></button>
   <button class="level" data-action="game-order" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"🧠":"🔒"}</div><b>La phrase</b><small>${sentenceUnlocked()?"Je remets les mots en ordre":"Se débloque après 8 missions"}</small></button>
 </div></details>`;
}
function sounds(){
 const pool=activeSoundData();if(state.sound>=pool.length)state.sound=0;const x=pool[state.sound%pool.length];
 stage.innerHTML=title("Les sons","Écoute le son, puis répète-le à voix haute.","Niveau 1")+
 `<div class="card center">
   <div class="streak">Carte ${state.sound+1} / ${pool.length}</div>
   <div class="hero-emoji">${x.emoji}</div>
   <div class="big ${"aeioué".includes(x.g)?"blue":"red"}">${x.g}</div>
   <div class="actions"><button class="btn primary speaker" data-action="speak" data-text="${esc(x.say)}" data-rate=".58">🔊 Écouter le son</button><button class="btn good" data-action="sound-repeat">🎙️ J'ai répété</button></div>
   <div class="tip">${x.hint}. Pour les consonnes, on cherche le <b>son</b>, pas le nom de la lettre.<br><b>${pool.filter(s=>state.soundPractice?.[s.g]).length} / ${pool.length}</b> sons pratiqués dans le palier actuel.</div>
 </div>
 <div class="card">
   <b>Touche une lettre pour l'entendre :</b>
   <div class="sound-grid">${pool.map(s=>`<button class="sound-tile ${state.soundPractice?.[s.g]?"practiced":""}" data-action="speak" data-text="${esc(s.say)}" data-rate=".58">${s.g}</button>`).join("")}</div>
 </div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
 <div class="nextbar"><button class="btn gray" data-action="sound-prev">← Avant</button><button class="btn primary" data-action="sound-next">Suivant →</button></div>`;
}
function syllables(){
 const max=Math.max(1,unlockedFamilyCount());if(state.set>=max)state.set=max-1;
 const set=DATA.sets[state.set%max],first=set[0][0];
 stage.innerHTML=title("Fabrique les syllabes","Fais glisser le premier son jusqu'à la voyelle.","Niveau 2")+
 `<div class="card center">
   <div class="big" style="font-size:56px"><span class="red">${first}</span> + <span class="blue">a</span> = <span class="purple">${first}a</span></div>
   <button class="btn primary" data-action="speak" data-text="${first+first+first+'a'}" data-rate=".55">🔊 Écouter : ${first}…a → ${first}a</button>
   <div style="margin-top:12px">${set.map(s=>`<button class="syllable" data-action="speak" data-text="${s}" data-rate=".62"><span>${colorSyl(s)}</span><small>${masteryStars(s)}</small></button>`).join("")}</div>
 </div>
 <div class="card"><b>🗺️ Mes familles de syllabes</b><p style="color:var(--muted);font-size:13px;margin:5px 0">Les nouvelles familles arrivent petit à petit avec les missions.</p>${familyRoadmapHTML()}</div>
 ${mission("🧩","Mini-jeu","Écoute une syllabe et retrouve-la parmi les cartes.")}
 <div class="card center"><button class="btn primary" data-action="syllable-quiz">🎧 Lancer l'exercice</button><div id="quizArea"></div><div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="tip">🔓 Familles disponibles : <b>${unlockedFamilyCount()} / ${DATA.sets.length}</b>. Les suivantes se débloquent avec les missions.</div>
 <div class="nextbar"><button class="btn gray" data-action="set-prev">← Série</button><button class="btn primary" data-action="set-next">Série suivante →</button></div>`;
}
function startSyllableQuiz(){
 const set=DATA.sets[state.set%DATA.sets.length];currentAnswer=pick(set);locked=false;resetQuestionTracking();
 const opts=nextRandom(set,currentAnswer,4);
 $("#quizArea").innerHTML=`<div class="choices">${opts.map(x=>`<button class="choice" data-action="syllable-answer" data-value="${x}">${colorSyl(x)}</button>`).join("")}</div>`;
 $("#feedback").innerHTML="";speak(currentAnswer,.60)
}
function words(){
 const pool=decodableMissionWords(),x=pool[state.word%pool.length];
 stage.innerHTML=title("Lis le mot","Lis chaque morceau puis colle-les.","Niveau 3")+
 `<div class="card center">
   <div class="emojis">${x.emoji}</div>
   <div class="word">${wordHTML(x.parts)}</div>
   <div class="word-parts">${x.parts.map(p=>`<button class="part" data-action="speak" data-text="${p}" data-rate=".62">🔊 ${p}</button>`).join("")}</div>
   <div class="actions" style="margin-top:13px"><button class="btn primary" data-action="speak" data-text="${x.w}" data-rate=".70">🔊 Le mot entier</button><button class="btn good" data-action="word-read">🙋 J'ai essayé de le lire</button></div>
   <div class="tip">Essaie d'abord sans l'audio. Utilise 🔊 seulement pour vérifier.</div>
 </div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
 <div class="nextbar"><button class="btn gray" data-action="word-prev">← Mot</button><button class="btn primary" data-action="word-next">Mot suivant →</button></div>`;
}
function gamesMenu(){
 stage.innerHTML=title("Les mini-jeux","Des exercices très courts pour garder l'envie de lire.","À toi de jouer !")+
 `<div class="levels">
  <button class="level" data-action="game-listen"><div class="ico">👂</div><b>Écoute & trouve</b><small>Quelle syllabe as-tu entendue ?</small></button>
  <button class="level" data-action="game-bubbles"><div class="ico">🫧</div><b>Bulles express</b><small>Écoute et éclate la bonne syllabe</small></button>
  <button class="level" data-action="game-memory"><div class="ico">🧠</div><b>Memory des sons</b><small>Associe le son à la syllabe</small></button>
  <button class="level" data-action="game-family"><div class="ico">🔎</div><b>Trouve l’intrus</b><small>Repère la syllabe qui n’est pas de la même famille</small></button>
  <button class="level" data-action="game-pronunciation"><div class="ico">🎤</div><b>Écoute & répète <span class="beta-pill">BÊTA</span></b><small>Entraînement seulement • pas d’étoile</small></button>
  <button class="level" data-action="game-picture"><div class="ico">🖼️</div><b>Mot & image</b><small>Quel mot correspond à l'image ?</small></button>
  <button class="level" data-action="game-build"><div class="ico">🧱</div><b>Construis le mot</b><small>Remets les syllabes dans l'ordre</small></button>
  <button class="level" data-action="game-order" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"💬":"🔒"}</div><b>La phrase</b><small>${sentenceUnlocked()?"Remets les mots dans l'ordre":"Se débloque après 8 missions"}</small></button>
 </div>
 ${mission("⭐","Une bonne réponse vérifiée = une étoile","Les boutons d’entraînement ne donnent plus d’étoile tout seuls.")}`;
}
function gameListen(forcedTarget=null,fromMission=false){
 missionMode=fromMission;currentView="listen";state.lastView=fromMission?"mission":"listen";save(false);currentAnswer=forcedTarget||pickLearningSyllable();locked=false;resetQuestionTracking();
 const opts=nextRandom(activeLearningSyllables(),currentAnswer,4);
 stage.innerHTML=title("Écoute & trouve","Écoute sans regarder la réponse.","Jeu 1")+
 `<div class="card center"><div class="hero-emoji">👂</div><button class="btn primary" data-action="${fromMission?"mission-repeat-answer":"repeat-answer"}">🔊 Écouter la syllabe</button>
 <div class="choices">${opts.map(x=>`<button class="choice" data-action="listen-answer" data-value="${x}">${colorSyl(x)}</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-listen">Nouvelle question →</button>`}</div>`;
 if(!fromMission)setTimeout(()=>speak(currentAnswer,.60),180)
}

function gameBubbles(forcedTarget=null,fromMission=false){
 missionMode=fromMission;currentView="bubbles";state.lastView=fromMission?"mission":"bubbles";save(false);currentAnswer=forcedTarget||pickLearningSyllable();locked=false;resetQuestionTracking();
 const opts=nextRandom(activeLearningSyllables(),currentAnswer,6);
 stage.innerHTML=title("Bulles express","Écoute bien et éclate la bonne bulle.","Jeu réaction")+
 `<div class="card center"><div class="actions"><button class="btn yellow" data-action="${fromMission?"mission-bubble-repeat":"bubble-repeat"}">🔊 Écouter la syllabe</button></div>
 <div class="bubble-arena">${opts.map(x=>`<button class="bubble" data-action="bubble-answer" data-value="${x}">${colorSyl(x)}</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-bubbles">Nouvelles bulles →</button>`}</div>`;
 if(!fromMission)setTimeout(()=>speak(currentAnswer,.60),180)
}
function gameFamily(forcedFamily=null,fromMission=false){
 missionMode=fromMission;currentView="family";state.lastView=fromMission?"mission":"family";save(false);locked=false;resetQuestionTracking();
 const availableFamilies=DATA.sets.slice(0,unlockedFamilyCount()),family=forcedFamily||pick(availableFamilies),base=activeLearningSyllables(),others=base.filter(x=>!family.includes(x));
 const familyChoices=shuffle(family).slice(0,3),intruder=pick(others);currentAnswer=intruder;
 const initial=(family[0]||"")[0].toUpperCase(),opts=shuffle([...familyChoices,intruder]);
 stage.innerHTML=title("Trouve l’intrus","Trois syllabes commencent par "+initial+". Une seule n’est pas de la même famille.","Jeu visuel")+
 '<div class="card center"><div class="hero-emoji">🔎</div><div class="tip">Touche la syllabe qui ne commence pas par <b>'+initial+'</b>.</div><div class="choices">'+opts.map(x=>'<button class="choice" data-action="family-answer" data-value="'+x+'">'+colorSyl(x)+'</button>').join("")+'</div><div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>'+
 '<div class="nextbar">'+(fromMission?'<button class="btn gray" data-action="mission-back">← Mission</button>':'<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-family">Nouvel intrus →</button>')+'</div>'
}
function makeMemoryDeck(preferred=[],allowedPool=DATA.sets.flat()){
 const unique=[...new Set((preferred||[]).filter(Boolean))],rest=shuffle(allowedPool.filter(s=>!unique.includes(s))),pool=[...unique,...rest].slice(0,3);
 memoryDeck=shuffle(pool.flatMap((s,i)=>[
  {id:i+"-sound",pair:s,type:"sound",label:"🔊"},
  {id:i+"-text",pair:s,type:"text",label:s}
 ]));memoryOpen=[];memoryMatches=0
}
function gameMemory(preferred=[],fromMission=false){
 missionMode=fromMission;currentView="memory";state.lastView=fromMission?"mission":"memory";save(false);locked=false;makeMemoryDeck(preferred,activeLearningSyllables());
 stage.innerHTML=title("Memory des sons","Trouve les paires : un son et sa syllabe écrite.","Jeu mémoire")+
 `<div class="card center"><div class="tip">Retourne deux cartes. Les cartes 🔊 prononcent une syllabe : retrouve son écriture.</div>
 <div class="memory-grid" id="memoryGrid">${memoryDeck.map((x,i)=>`<button class="memory-card" data-action="memory-card" data-index="${i}">?</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-memory">Rejouer →</button>`}</div>`
}
function memoryFlip(btn,index){
 if(locked||btn.classList.contains("matched")||btn.classList.contains("open")||memoryOpen.length>=2)return;
 const card=memoryDeck[index];btn.classList.add("open");btn.innerHTML=card.type==="sound"?"🔊":colorSyl(card.label);
 if(card.type==="sound")speak(card.pair,.60);
 memoryOpen.push({btn,index,card});
 if(memoryOpen.length<2)return;
 const [a,b]=memoryOpen,match=a.card.pair===b.card.pair&&a.card.type!==b.card.type;
 if(match){
  a.btn.classList.add("matched");b.btn.classList.add("matched");memoryMatches++;memoryOpen=[];
  recordAttempt(true,a.card.pair,"memory:"+a.card.pair);tone("ok");
  if(memoryMatches===3){
   locked=true;rewardVerified("Memory terminé !","memory");setDone("memory");confetti();$("#feedback").innerHTML='<div class="ok">🎉 Bravo, toutes les paires sont trouvées !</div>';completeMissionStep()
  }else $("#feedback").innerHTML='<div class="ok">✨ Bonne paire !</div>';
 }else{
  tone("no");$("#feedback").innerHTML='<div class="no">Presque ! Mémorise bien les deux cartes.</div>';
  setTimeout(()=>{a.btn.classList.remove("open");b.btn.classList.remove("open");a.btn.textContent="?";b.btn.textContent="?";memoryOpen=[]},750)
 }
}

function speechRecognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)}
function isSafariBrowser(){return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function openMicrophone(status){
 if(!window.isSecureContext){
  if(status){status.className="mic-status error";status.textContent="Le micro nécessite une connexion sécurisée HTTPS."}
  return null
 }
 if(!navigator.mediaDevices?.getUserMedia){
  if(status){status.className="mic-status error";status.textContent="Ce navigateur ne donne pas accès au microphone."}
  return null
 }
 try{
  if(status){status.className="mic-status listening";status.innerHTML='<span class="mic-pulse">🎙️</span> Activation du micro…'}
  return await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false})
 }catch(e){
  console.error("Micro permission error",e);
  let msg="Impossible d’accéder au microphone.";
  if(e?.name==="NotAllowedError"||e?.name==="SecurityError")msg="Micro refusé. Autorise le microphone dans les réglages Safari puis recharge la page.";
  else if(e?.name==="NotFoundError")msg="Aucun microphone détecté sur cet appareil.";
  if(status){status.className="mic-status error";status.textContent=msg}
  return null
 }
}
function createVoiceGate(stream){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return {heardVoice:()=>true,stop:()=>{}};
 const ctx=new AC(),src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();
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
  stop:()=>{running=false;try{src.disconnect()}catch(e){}try{ctx.close()}catch(e){}}
 }
}
function normalizeHeard(s){
 return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"")
}
function pronunciationMatches(expected,heard){
 const e=normalizeHeard(expected),h=normalizeHeard(heard);
 if(!e||!h)return false;
 if(h===e)return true;
 const aliases={
  ma:["ma","mha"],mi:["mi","mie","mis","my"],mo:["mo","mot","mots"],mu:["mu","mue","mues"],me:["me","mais","mes","met","mets"],
  la:["la","là"],li:["li","lit","lis"],lo:["lo","lot","lots","l eau"],lu:["lu","lue","lus"],le:["le","les","lait"],
  sa:["sa","ça"],si:["si","six"],so:["so","sot","saut"],su:["su","sue","sues"],se:["se","ces","ses","c est"],
  ra:["ra"],ri:["ri","riz","rit"],ro:["ro"],ru:["ru","rue"],re:["re"],
  fa:["fa"],fi:["fi","fie"],fo:["fo","faux","faut"],fu:["fu","fut"],fe:["fe","fait","fais"],
  va:["va"],vi:["vi","vie","vis"],vo:["vo","vos","vaux"],vu:["vu","vue","vues"],ve:["ve","vais","vait"],
  pa:["pa","pas"],pi:["pi","pie"],po:["po","pot","peau"],pu:["pu","pue"],pe:["pe","paix"],
  ta:["ta","tas"],ti:["ti"],to:["to","tôt","taux"],tu:["tu","tue"],te:["te","tes"],
  na:["na"],ni:["ni","nid"],no:["no","nos"],nu:["nu","nue"],ne:["ne","nez"],
  ba:["ba","bas"],bi:["bi","bis"],bo:["bo","beau","beaux"],bu:["bu","bue"],be:["be","baie"]
 };
 return (aliases[e]||[]).some(x=>normalizeHeard(x)===h) || (h.startsWith(e)&&h.length<=e.length+2);
}
function gamePronunciation(){
 currentView="pronunciation";state.lastView="pronunciation";save(false);currentAnswer=pickLearningSyllable();locked=false;
 const micAvailable=!!navigator.mediaDevices?.getUserMedia;
 stage.innerHTML=title("Écoute & répète","Écoute la syllabe, puis dis-la dans le micro.","Jeu micro")+
 `<div class="card center"><div class="hero-emoji">🎤</div><div class="big purple" style="font-size:82px">${colorSyl(currentAnswer)}</div>
 <div class="actions"><button class="btn yellow" data-action="pronunciation-listen">🔊 Écouter</button><button class="btn primary" data-action="pronunciation-record" ${micAvailable?"":"disabled"}>🎙️ À toi !</button></div>
 <div style="margin-top:8px;font-weight:900;color:var(--muted)">Maîtrise : ${masteryStars(currentAnswer)}</div><div id="micStatus" class="mic-status">${micAvailable?"Appuie sur « À toi ! ». Le micro restera actif pendant l’écoute et aucune réponse ne sera validée sans voix détectée.":"Le microphone n’est pas disponible sur ce navigateur."}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-pronunciation">Nouvelle syllabe →</button></div>`;
 setTimeout(()=>speak(currentAnswer,.60),120)
}
async function startPronunciationRecognition(){
 if(locked)return;
 const status=$("#micStatus");
 const stream=await openMicrophone(status);
 if(!stream)return;
 const gate=createVoiceGate(stream);
 const closeMic=()=>{try{gate.stop()}catch(e){}stream.getTracks().forEach(t=>t.stop())};
 await sleep(550);
 const Ctor=speechRecognitionCtor();
 if(!Ctor){
  if(status){
   status.className="mic-status error";
   status.textContent=isIOS()&&!isSafariBrowser()?"Le micro fonctionne, mais la reconnaissance vocale est bloquée dans ce navigateur sur iPhone. Ouvre l’app directement dans Safari.":"Le micro fonctionne, mais ce navigateur ne propose pas la reconnaissance vocale."
  }
  closeMic();
  return
 }
 window.speechSynthesis?.cancel?.();
 await sleep(250);
 const recognition=new Ctor();recognition.lang="fr-FR";recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=5;
 let finished=false,started=false;
 let watchdog=setTimeout(()=>{
  if(started&&!finished){
   try{recognition.abort()}catch(e){}closeMic();
   if(status){status.className="mic-status error";status.textContent="La reconnaissance vocale ne répond pas. Vérifie que Siri est activé puis réessaie."}
  }
 },8000);
 recognition.onstart=()=>{
  started=true;
  if(status){status.className="mic-status listening";status.innerHTML='<span class="mic-pulse">🎙️</span> J’écoute… dis seulement la syllabe'}
 };
 recognition.onresult=e=>{
  finished=true;clearTimeout(watchdog);
  const voiceDetected=gate.heardVoice();closeMic();
  const alternatives=[];for(let i=0;i<e.results[0].length;i++)alternatives.push(e.results[0][i].transcript);
  const heard=alternatives[0]||"",ok=voiceDetected&&alternatives.some(x=>pronunciationMatches(currentAnswer,x));
  if(!voiceDetected){
   miss("Je n’ai pas entendu ta voix.");
   if(status){status.className="mic-status error";status.textContent="🎙️ Aucun son vocal détecté. Parle après l’apparition de « J’écoute »."}
   return
  }
  if(ok){
   locked=true;practiceDone("Très bien prononcé !");
   if(status){status.className="mic-status success";status.textContent='✅ J’ai entendu « '+heard+' »'}
   confetti();
  }else{
   miss("Presque ! Écoute encore et réessaie.");
   if(status){status.className="mic-status error";status.textContent='J’ai entendu « '+(heard||"…")+' ». Réessaie.'}
   setTimeout(()=>speak(currentAnswer,.60),250);
  }
 };
 recognition.onerror=e=>{
  finished=true;clearTimeout(watchdog);closeMic();
  const messages={not_allowed:"Autorise le microphone pour jouer.", "not-allowed":"Autorise le microphone pour jouer.", service_not_allowed:"La reconnaissance vocale est bloquée par le navigateur.", "service-not-allowed":"La reconnaissance vocale est bloquée par le navigateur.", "no-speech":"Je n’ai rien entendu. Réessaie en parlant un peu plus fort.", audio_capture:"Je ne trouve pas de microphone.", "audio-capture":"Je ne trouve pas de microphone.", network:"La reconnaissance vocale a besoin d’Internet sur ce navigateur."};
  if(status){status.className="mic-status error";status.textContent=messages[e.error]||("Le micro n’a pas compris ("+(e.error||"erreur")+"). Réessaie.")}
 };
 recognition.onend=()=>{clearTimeout(watchdog);if(!finished){closeMic();if(status){status.className="mic-status";status.textContent="Je n’ai pas bien entendu. Tu peux réessayer."}}};
 try{recognition.start()}catch(e){clearTimeout(watchdog);closeMic();console.error("SpeechRecognition start error",e);if(status){status.className="mic-status error";status.textContent="La reconnaissance vocale n’a pas démarré. Vérifie Siri et l’autorisation micro de Safari."}}
}

function gamePicture(){
 currentView="pictures";state.lastView="pictures";save(false);const pool=decodableMissionWords(),answer=pick(pool);currentAnswer=answer.w;locked=false;resetQuestionTracking();
 const opts=nextRandom(pool.map(x=>x.w),answer.w,4);
 stage.innerHTML=title("Quel est ce mot ?","Lis les mots et touche celui qui correspond à l'image.","Jeu 2")+
 `<div class="card center"><div class="emojis" style="font-size:90px">${answer.emoji}</div>
 <div class="choices">${opts.map(w=>`<button class="choice" data-action="picture-answer" data-value="${w}">${w}</button>`).join("")}</div>
 <div class="actions" style="margin-top:11px"><button class="btn yellow" data-action="speak" data-text="${answer.w}">🔊 Indice audio</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-picture">Nouvelle image →</button></div>`;
}
function gameBuild(forcedAnswer=null,fromMission=false){
 missionMode=fromMission;currentView="build";state.lastView=fromMission?"mission":"build";save(false);const buildPool=decodableMissionWords().filter(x=>x.parts.length>=2),answer=forcedAnswer||pick(buildPool);currentAnswer=answer;orderTarget=answer.parts;orderMade=[];locked=false;resetQuestionTracking();
 const extraCount=Math.max(1,4-answer.parts.length),extraBase=activeLearningSyllables(),extraPool=extraBase.filter(s=>!answer.parts.includes(s)),extras=shuffle(extraPool).slice(0,extraCount);
 const opts=shuffle([...answer.parts,...extras]);
 stage.innerHTML=title("Construis le mot","Touche les syllabes dans le bon ordre.","Jeu 3")+
 `<div class="card center"><div class="emojis">${answer.emoji}</div><div style="font-size:16px;color:var(--muted)">Fabrique : <b>${answer.w}</b></div>
 <div class="order-zone" id="orderZone"><span class="empty">Les syllabes arrivent ici…</span></div>
 <div class="choices" id="buildChoices">${opts.map((x,i)=>`<button class="choice" style="font-size:27px" data-action="build-token" data-value="${x}" data-id="${i}">${colorSyl(x)}</button>`).join("")}</div>
 <div class="actions" style="margin-top:11px"><button class="btn gray" data-action="build-reset">↩ Recommencer</button><button class="btn yellow" data-action="speak" data-text="${answer.w}">🔊 Écouter le mot</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-build">Nouveau mot →</button>`}</div>`;
}
function updateBuild(){
 const zone=$("#orderZone");zone.innerHTML=orderMade.length?orderMade.map(x=>`<span class="token">${x}</span>`).join(""):`<span class="empty">Les syllabes arrivent ici…</span>`;
 if(orderMade.length===orderTarget.length){
   const ok=orderMade.join("")===orderTarget.join("");
   if(ok){locked=true;recordAttempt(true,"word:"+currentAnswer.w,"build:"+currentAnswer.w);rewardVerified("Mot construit !","build:"+currentAnswer.w);setDone("words");confetti();speak(currentAnswer.w,.70);$("#feedback").innerHTML=`<div class="ok">🎉 Bravo : ${currentAnswer.w}</div>`;completeMissionStep()}
   else{recordQuestionError("word:"+currentAnswer.w);miss("Presque ! Recommence dans un autre ordre.");$("#feedback").innerHTML=`<div class="no">Essaie encore.</div>`;setTimeout(()=>{orderMade=[];document.querySelectorAll("#buildChoices .choice").forEach(b=>b.disabled=false);updateBuild()},800)}
 }
}
function gameOrder(){
 if(!sentenceUnlocked()){activate("games");return}
 const pool=decodableSentencePool();if(!pool.length){activate("games");return}
 currentView="order";state.lastView="order";save(false);const arr=pick(pool);orderTarget=arr;orderMade=[];locked=false;resetQuestionTracking();const opts=shuffle(arr);
 stage.innerHTML=title("Remets la phrase en ordre","Touche les mots dans l'ordre de la phrase. Les petits mots comme « un » ou « une » sont lus avec un adulte au besoin.","Jeu 4")+
 `<div class="card center"><div class="hero-emoji">💬</div>
 <div class="order-zone" id="orderZone"><span class="empty">La phrase se construit ici…</span></div>
 <div class="choices" id="orderChoices">${opts.map((x,i)=>`<button class="choice" style="font-size:21px" data-action="order-token" data-value="${esc(x)}" data-id="${i}">${esc(x)}</button>`).join("")}</div>
 <div class="actions" style="margin-top:11px"><button class="btn gray" data-action="order-reset">↩ Recommencer</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-order">Nouvelle phrase →</button></div>`;
}
function updateOrder(){
 const zone=$("#orderZone");zone.innerHTML=orderMade.length?orderMade.map(x=>`<span class="token">${esc(x)}</span>`).join(""):`<span class="empty">La phrase se construit ici…</span>`;
 if(orderMade.length===orderTarget.length){
   const ok=orderMade.join(" ")===orderTarget.join(" ");
   if(ok){locked=true;recordAttempt(true,"sentence:"+orderTarget.join(" "),"order:"+orderTarget.join(" "));rewardVerified("Phrase réussie !","order:"+orderTarget.join(" "));setDone("order");confetti();speak(orderTarget.join(" "),.73);$("#feedback").innerHTML=`<div class="ok">🎉 Très bien !</div>`}
   else{recordQuestionError("sentence:"+orderTarget.join(" "));miss("L'ordre n'est pas encore le bon.");$("#feedback").innerHTML=`<div class="no">Regarde le premier mot et recommence.</div>`;setTimeout(()=>{orderMade=[];document.querySelectorAll("#orderChoices .choice").forEach(b=>b.disabled=false);updateOrder()},900)}
 }
}
function masterySummary(){
 const syllables=DATA.sets.flat(),levels=syllables.map(s=>({s,level:masteryLevel(s),m:state.mastery?.[s]||{attempts:0,correct:0}}));
 const mastered=levels.filter(x=>x.level===3).length,learning=levels.filter(x=>x.level===1||x.level===2).length,unseen=levels.filter(x=>x.level===0).length;
 const attempted=levels.filter(x=>x.m.attempts>0).sort((a,b)=>{
  const aa=a.m.correct/Math.max(1,a.m.attempts),ab=b.m.correct/Math.max(1,b.m.attempts);
  return aa-ab || b.m.attempts-a.m.attempts
 });
 return {total:syllables.length,mastered,learning,unseen,weakest:attempted.slice(0,6)}
}
function missionDayStreak(){
 const dates=[...new Set((state.missionHistory||[]).map(x=>x.date))].sort().reverse();
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
 return (state.missionHistory||[]).filter(x=>x.date>=key).length
}
function badgeData(){
 const missions=(state.missionHistory||[]).length,ms=masterySummary(),stars=state.stars||0,streak=missionDayStreak();
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
 const n=(state.missionHistory||[]).length;
 if(n>=14)return {emoji:"🦊👑",name:"Léo, gardien des étoiles",level:5};
 if(n>=9)return {emoji:"🦊🚀",name:"Léo, explorateur",level:4};
 if(n>=5)return {emoji:"🦊🛡️",name:"Léo, aventurier",level:3};
 if(n>=2)return {emoji:"🦊🎒",name:"Léo, apprenti",level:2};
 return {emoji:"🦊",name:"Léo, petit renard",level:1}
}
function worldView(){
 const missions=(state.missionHistory||[]).length,comp=companionLevel();
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
function saveBackup(){
 try{
  const meaningful=(state.stars||0)>0||(state.stats?.attempts||0)>0||(state.missionHistory||[]).length>0||Object.keys(state.mastery||{}).length>0;
  if(!meaningful&&hasBackup())return true;
  localStorage.setItem(backupKey(),JSON.stringify(state));return true
 }catch(e){console.error("Backup error",e);return false}
}
function hasBackup(){try{return !!localStorage.getItem(backupKey())}catch(e){return false}}
function restoreBackup(){
 let raw=null;try{raw=localStorage.getItem(backupKey())}catch(e){}
 if(!raw){alert("Aucune sauvegarde locale à restaurer.");return}
 if(!confirm("Restaurer la dernière progression sauvegardée ?"))return;
 try{state=normalizeState(JSON.parse(raw));state.updatedAt=Date.now();currentView="home";save();render();alert("Progression restaurée.")}
 catch(e){console.error(e);alert("La sauvegarde locale est illisible.")}
}
function diagnosticText(){
 const m=state.dailyMission||{};
 const voices=("speechSynthesis" in window&&speechSynthesis.getVoices)?speechSynthesis.getVoices():[];
 return [
  "La Fabrique des Syllabes "+APP_VERSION,
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
  "Missions historique: "+(state.missionHistory||[]).length,
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
function resetDailyMission(){
 if(!confirm("Recréer seulement la mission du jour ? La progression générale sera conservée."))return;
 state.dailyMission=null;missionMode=false;currentView="home";save();render();alert("Nouvelle mission créée.")
}
function parents(){
 const ms=masterySummary(),attempts=state.stats?.attempts||0,correct=state.stats?.correct||0,accuracy=attempts?Math.round(correct/attempts*100):0,recent=recentPerformance();
 const weak=ms.weakest.length?ms.weakest.map(x=>`<span class="collectible">${x.s.toUpperCase()} ${masteryStars(x.s)} • ${x.m.correct}/${x.m.attempts}</span>`).join(""):`<span style="color:var(--muted);font-size:13px">Pas encore assez de réponses pour repérer les difficultés.</span>`;
 stage.innerHTML=title("Coin parent","Suivi simple de la progression réelle.","Tableau de bord")+
 `<div class="parent-grid">
  <div class="parent-box"><h3>🎯 Précision récente</h3><p><b style="font-size:26px">${recent.accuracy==null?"—":recent.accuracy+" %"}</b><br>${recent.missions?recent.missions+" dernière(s) mission(s) mesurée(s)":"Pas encore de mission mesurée"}.<br><small>Depuis le début : ${accuracy} % (${correct}/${attempts})</small></p></div>
  <div class="parent-box"><h3>🏆 Syllabes maîtrisées</h3><p><b style="font-size:26px">${ms.mastered} / ${ms.total}</b><br>★★★ = maîtrisée.</p></div>
  <div class="parent-box"><h3>🌱 En apprentissage</h3><p><b style="font-size:26px">${ms.learning}</b><br>Syllabes à ★ ou ★★ • ${unlockedFamilyCount()} / ${DATA.sets.length} familles débloquées.<br>${curriculumStatus().complete?"Toutes les familles sont ouvertes.":"Prochaine famille : "+curriculumStatus().nextInitial+" dans "+curriculumStatus().remaining+" mission(s)."}</p></div>
  <div class="parent-box"><h3>📅 Missions terminées</h3><p><b style="font-size:26px">${(state.missionHistory||[]).length}</b><br>🔥 Série : ${missionDayStreak()} jour(s) • ${missionsLast7Days()} cette semaine.</p></div>
 </div>
 <div class="card"><b>🔎 À renforcer</b><p style="color:var(--muted);font-size:13px">Les syllabes les moins solides reviennent davantage dans les missions.</p><div class="collection-row">${weak}</div></div>
 <details class="card"><summary style="cursor:pointer;font-weight:900">🔤 Voir les 50 syllabes en détail</summary><div class="mastery-grid">${DATA.sets.flat().map(s=>`<div class="mastery-chip">${s.toUpperCase()}<small>${masteryStars(s)}</small></div>`).join("")}</div></details>
 <div class="card"><b>📚 7 dernières missions</b>${recentMissionHTML()}</div>
 <div class="parent-grid">
  <div class="parent-box"><h3>📅 Routine simple</h3><p>Une mission courte par jour suffit. On s’arrête avant la fatigue et on privilégie la régularité.</p></div>
  <div class="parent-box"><h3>👂 Comment aider</h3><p>Laisser quelques secondes pour décoder. Si ça bloque, redonner le son puis fusionner : <b>mmm…a → ma</b>.</p></div>
  <div class="parent-box"><h3>🎯 Priorité</h3><p>La précision avant la vitesse. L’image sert de vérification, pas à deviner le mot.</p></div>
  <div class="parent-box"><h3>🌟 Motivation</h3><p>Valoriser l’effort et les progrès. Une courte réussite quotidienne vaut mieux qu’une longue séance tendue.</p></div>
 </div>
 <div class="card"><b>🛠️ Outils parent</b><p style="color:var(--muted);font-size:13px">En cas de souci, tu peux recréer uniquement la mission du jour, exporter la progression ou copier un diagnostic technique sans email.</p><div class="actions"><button class="btn gray" data-action="reset-mission">↻ Recréer la mission</button><button class="btn good" data-action="export-progress">⬇️ Exporter la progression</button><button class="btn gray" data-action="copy-diagnostic">📋 Copier diagnostic</button></div></div>
 <div class="card"><b>💾 Sauvegarde automatique</b><p style="color:var(--muted);font-size:13px">En mode invité, la progression reste sur cet appareil. Avec un compte parent et un profil enfant, elle est aussi synchronisée en ligne. Une copie locale est conservée avant toute remise à zéro.</p><div class="actions">${hasBackup()?'<button class="btn good" data-action="restore-backup">↩ Restaurer la dernière sauvegarde</button>':''}<button class="btn gray" data-action="reset">Réinitialiser toute la progression</button></div></div>`;
}
function render(){
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView || (["listen","bubbles","memory","family","pronunciation","pictures","build","order"].includes(currentView) && b.dataset.view==="games") || (["mission","mission-discover","mission-complete"].includes(currentView) && b.dataset.view==="home")));
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
 else if(currentView==="bubbles")gameBubbles();
 else if(currentView==="memory")gameMemory();
 else if(currentView==="family")gameFamily();
 else if(currentView==="pronunciation")gamePronunciation();
 else if(currentView==="pictures")gamePicture();
 else if(currentView==="build")gameBuild();
 else if(currentView==="order")gameOrder();
 else if(currentView==="parents")parents();
 else{currentView="home";state.lastView="home";save(false);home()}
 topUI();window.scrollTo({top:0,behavior:"smooth"});
}

function checkChoice(btn,value,kind){
 if(locked)return;
 if(value===currentAnswer){
   locked=true;btn.classList.add("correct");recordAttempt(true,kind==="pictures"?"word:"+currentAnswer:currentAnswer,kind+":"+value);rewardVerified("Bonne réponse !",kind+":"+value);
   if(kind==="listen")setDone("listen");if(kind==="pictures")setDone("pictures");if(kind==="syllables")setDone("syllables");
   speak(value,.64);if(state.streak>0&&state.streak%5===0)confetti();completeMissionStep()
 }else{
   btn.classList.add("wrong","wiggle");recordQuestionError(kind==="pictures"?"word:"+currentAnswer:currentAnswer);btn.disabled=true;miss();speak(currentAnswer,.60);setTimeout(()=>btn.classList.remove("wrong","wiggle"),650)
 }
}


function authMsg(text,type=""){const el=$("#authMsg");if(el){el.textContent=text;el.className="auth-msg "+type}}
function renderAuthForm(mode){const f=$("#authForm");if(!f)return;if(mode==="signup")f.innerHTML=`<div class="form"><div class="field"><label>Votre prénom</label><input id="signupName"></div><div class="field"><label>Email</label><input id="signupEmail" type="email"></div><div class="field"><label>Mot de passe (8 caractères minimum)</label><input id="signupPassword" type="password"></div><button class="btn primary" data-action="signup">Créer mon compte</button></div>`;else f.innerHTML=`<div class="form"><div class="field"><label>Email</label><input id="loginEmail" type="email"></div><div class="field"><label>Mot de passe</label><input id="loginPassword" type="password"></div><button class="btn primary" data-action="login">Se connecter</button><button class="btn gray" data-action="forgot">Mot de passe oublié</button></div>`}
function openAuth(mode="login"){const modal=$("#authModal"),content=$("#authContent");modal.classList.remove("hidden");if(session){renderAccountPanel();return}content.innerHTML=`<h2>Compte parent</h2><p>Connectez-vous pour synchroniser la progression entre plusieurs appareils.</p><div class="tabs"><button class="tab ${mode==="login"?"active":""}" data-auth-tab="login">Connexion</button><button class="tab ${mode==="signup"?"active":""}" data-auth-tab="signup">Créer un compte</button></div><div id="authForm"></div><div class="auth-msg" id="authMsg"></div><div class="actions" style="margin-top:10px"><button class="btn gray" data-action="close-modal">Continuer en invité</button></div>`;renderAuthForm(mode)}
async function signUp(){if(!sb){authMsg("Connexion au service indisponible. Le mode invité reste utilisable.","error");return}const email=$("#signupEmail").value.trim(),password=$("#signupPassword").value,name=$("#signupName").value.trim();if(!email||password.length<8){authMsg("Email valide et mot de passe de 8 caractères minimum.","error");return}authMsg("Création du compte…");const {error}=await sb.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:APP_URL}});authMsg(error?error.message:"Compte créé ✅ Vérifiez votre boîte mail et cliquez sur le lien de confirmation.",error?"error":"good")}
async function login(){if(!sb){authMsg("Connexion au service indisponible. Le mode invité reste utilisable.","error");return}const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;authMsg("Connexion…");const {error}=await sb.auth.signInWithPassword({email,password});if(error){authMsg(error.message,"error");return}$("#authModal").classList.add("hidden")}
async function forgot(){if(!sb){authMsg("Service de connexion indisponible.","error");return}const email=$("#loginEmail").value.trim();if(!email){authMsg("Entrez d'abord votre email.","error");return}const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});authMsg(error?error.message:"Email de réinitialisation envoyé ✅",error?"error":"good")}
async function logout(){if(sb)await sb.auth.signOut();session=null;currentChild=null;children=[];try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}currentView=state.lastView||"home";$("#authModal").classList.add("hidden");render();topUI()}
async function loadChildren(){if(!sb||!session)return;const {data,error}=await sb.from("children").select("id,parent_id,nickname,school_level,avatar,created_at").eq("parent_id",session.user.id).order("created_at",{ascending:true});if(error){console.error(error);return}children=(data||[]).filter(ch=>ch.parent_id===session.user.id)}
function renderAccountPanel(){const c=$("#authContent");c.innerHTML=`<h2>Mon compte</h2><p>${esc(session.user.email||"")}</p><div class="children-grid">${children.map(ch=>`<button class="child-card" data-action="select-child" data-id="${esc(ch.id)}"><div class="avatar">${esc(ch.avatar||"🦊")}</div><b>${esc(ch.nickname)}</b><small>${esc(ch.school_level||"CP")}</small></button>`).join("")}</div><div class="card"><h3 style="margin-top:0">Ajouter un enfant</h3><div class="form"><div class="field"><label>Prénom ou pseudo</label><input id="newChildName" maxlength="30"></div><div class="field"><label>Niveau</label><select id="newChildLevel"><option>CP</option><option>Grande section</option><option>CE1</option></select></div><div class="field"><label>Avatar</label><select id="newChildAvatar"><option>🦊</option><option>🐼</option><option>🦄</option><option>🐯</option><option>🐨</option><option>🐰</option></select></div><button class="btn primary" data-action="create-child">Créer le profil</button></div><div class="auth-msg" id="authMsg"></div></div><div class="actions" style="margin-top:12px"><button class="btn gray" data-action="close-modal">Fermer</button><button class="btn redbtn" data-action="logout">Se déconnecter</button></div>`}
async function createChild(){if(!sb){authMsg("Service de connexion indisponible.","error");return}const nickname=$("#newChildName").value.trim(),school_level=$("#newChildLevel").value,avatar=$("#newChildAvatar").value;if(!nickname){authMsg("Indiquez un prénom ou un pseudo.","error");return}const {data,error}=await sb.from("children").insert({parent_id:session.user.id,nickname,school_level,avatar}).select().single();if(error){authMsg(error.message,"error");return}await loadChildren();currentChild=data;localStorage.setItem("lastChildId",data.id);await loadRemoteState();renderAccountPanel();topUI()}
async function selectChild(id){const ch=children.find(x=>x.id===id&&x.parent_id===session?.user?.id);if(!ch)return;currentChild=ch;localStorage.setItem("lastChildId",id);await loadRemoteState();$("#authModal").classList.add("hidden");topUI()}

document.addEventListener("click",e=>{
 const b=e.target.closest("[data-action]");if(!b)return;
 const a=b.dataset.action;
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
 if(a==="sound-next"){const n=activeSoundData().length;state.sound=(state.sound+1)%n;save(false);sounds();return}
 if(a==="sound-prev"){const n=activeSoundData().length;state.sound=(state.sound-1+n)%n;save(false);sounds();return}
 if(a==="sound-repeat"){const pool=activeSoundData(),g=pool[state.sound%pool.length].g;state.soundPractice=state.soundPractice||{};state.soundPractice[g]=true;const needed=activeSoundGraphemes();if([...needed].every(x=>state.soundPractice[x]))setDone("sounds");else save();practiceDone("Bien répété ! Continue comme ça.");return}
 if(a==="set-next"){const n=Math.max(1,unlockedFamilyCount());state.set=(state.set+1)%n;save(false);syllables();return}
 if(a==="set-prev"){const n=Math.max(1,unlockedFamilyCount());state.set=(state.set-1+n)%n;save(false);syllables();return}
 if(a==="syllable-quiz"){startSyllableQuiz();return}
 if(a==="syllable-answer"){checkChoice(b,b.dataset.value,"syllables");return}
 if(a==="word-next"){const n=decodableMissionWords().length;state.word=(state.word+1)%n;save(false);words();return}
 if(a==="word-prev"){const n=decodableMissionWords().length;state.word=(state.word-1+n)%n;save(false);words();return}
 if(a==="word-read"){practiceDone("Bien essayé ! Les étoiles sont réservées aux réponses vérifiées.");return}
 if(a==="game-listen"){gameListen();return}
 if(a==="game-bubbles"){gameBubbles();return}
 if(a==="bubble-repeat"){speak(currentAnswer,.60);return}
 if(a==="bubble-answer"){
   if(locked)return;
   if(b.dataset.value===currentAnswer){locked=true;b.classList.add("pop");recordAttempt(true,currentAnswer,"bubble:"+currentAnswer);rewardVerified("Bonne bulle !","bubble:"+currentAnswer);setDone("bubbles");setTimeout(()=>speak(currentAnswer,.60),120);completeMissionStep()}
   else{recordQuestionError(currentAnswer);b.disabled=true;b.classList.add("wiggle");miss("Essaie une autre bulle.");setTimeout(()=>b.classList.remove("wiggle"),450)}
   return
 }
 if(a==="game-memory"){gameMemory();return}
 if(a==="memory-card"){memoryFlip(b,Number(b.dataset.index));return}
 if(a==="game-family"){gameFamily();return}
 if(a==="family-answer"){
   if(locked)return;
   if(b.dataset.value===currentAnswer){locked=true;b.classList.add("correct");recordAttempt(true,null,"family:"+currentAnswer);rewardVerified("Intrus trouvé !","family:"+currentAnswer);setDone("families");$("#feedback").innerHTML='<div class="ok">🎉 Bravo, tu as trouvé l’intrus !</div>';completeMissionStep()}
   else{b.classList.add("wrong","wiggle");b.disabled=true;recordQuestionError();miss("Regarde bien la première lettre.");setTimeout(()=>b.classList.remove("wrong","wiggle"),600)}
   return
 }
 if(a==="game-pronunciation"){gamePronunciation();return}
 if(a==="pronunciation-listen"){speak(currentAnswer,.60);return}
 if(a==="pronunciation-record"){startPronunciationRecognition();return}
 if(a==="game-picture"){gamePicture();return}
 if(a==="game-build"){gameBuild();return}
 if(a==="game-order"){gameOrder();return}
 if(a==="repeat-answer"){speak(typeof currentAnswer==="string"?currentAnswer:currentAnswer.w,.60);return}
 if(a==="listen-answer"){checkChoice(b,b.dataset.value,"listen");return}
 if(a==="picture-answer"){checkChoice(b,b.dataset.value,"pictures");return}
 if(a==="build-token"){
   if(b.disabled)return;b.disabled=true;orderMade.push(b.dataset.value);updateBuild();return
 }
 if(a==="build-reset"){orderMade=[];document.querySelectorAll("#buildChoices .choice").forEach(x=>x.disabled=false);updateBuild();$("#feedback").innerHTML="";return}
 if(a==="order-token"){if(b.disabled)return;b.disabled=true;orderMade.push(b.dataset.value);updateOrder();return}
 if(a==="order-reset"){orderMade=[];document.querySelectorAll("#orderChoices .choice").forEach(x=>x.disabled=false);updateOrder();$("#feedback").innerHTML="";return}
 if(a==="signup"){signUp();return}
 if(a==="login"){login();return}
 if(a==="forgot"){forgot();return}
 if(a==="logout"){logout();return}
 if(a==="create-child"){createChild();return}
 if(a==="select-child"){selectChild(b.dataset.id);return}
 if(a==="close-modal"){$("#authModal").classList.add("hidden");return}
 if(a==="reset-mission"){resetDailyMission();return}
 if(a==="copy-diagnostic"){copyDiagnostic();return}
 if(a==="export-progress"){exportProgress();return}
 if(a==="restore-backup"){restoreBackup();return}
 if(a==="reset"){
   if(confirm("Remettre les étoiles et la progression à zéro ? Une sauvegarde locale sera conservée.")){saveBackup();state=normalizeState({name:currentChild?currentChild.nickname:(state.name||"")});currentView="home";save();render()}
 }
});
nav.addEventListener("click",e=>{const b=e.target.closest(".nav-btn");if(!b)return;missionMode=false;activate(b.dataset.view)});
$("#accountBtn").addEventListener("click",()=>openAuth());
$("#switchChildBtn").addEventListener("click",async()=>{if(!session)openAuth("login");else{await loadChildren();openAuth()}});
$("#authModal").addEventListener("click",e=>{if(e.target.id==="authModal")$("#authModal").classList.add("hidden")});
document.addEventListener("click",e=>{const tab=e.target.closest("[data-auth-tab]");if(!tab)return;document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");renderAuthForm(tab.dataset.authTab);authMsg("")});
async function bootstrap(){
 if(sb){
  try{
   const {data:{session:s}}=await sb.auth.getSession();session=s;
   if(session){await loadChildren();const remembered=localStorage.getItem("lastChildId");if(remembered)currentChild=children.find(c=>c.id===remembered)||null;if(!currentChild&&children.length===1)currentChild=children[0];if(currentChild){localStorage.setItem("lastChildId",currentChild.id);await loadRemoteState()}}
   sb.auth.onAuthStateChange((event,newSession)=>{session=newSession;setTimeout(async()=>{if(session){await loadChildren();if(!currentChild&&children.length===1){currentChild=children[0];localStorage.setItem("lastChildId",currentChild.id);await loadRemoteState()}else{render();topUI()}}else{currentChild=null;children=[];try{state=normalizeState(JSON.parse(localStorage.getItem(guestKey())||"{}"))}catch(e){state=normalizeState({})}currentView=state.lastView||"home";render();topUI()}},0)})
  }catch(e){console.error("Supabase bootstrap error",e);session=null;currentChild=null}
 }
 if("speechSynthesis" in window){speechSynthesis.getVoices();speechSynthesis.addEventListener?.("voiceschanged",()=>speechSynthesis.getVoices())}
 render();topUI();
 if(!sb){$("#syncStatus").textContent="Mode local • service de synchronisation indisponible";$("#syncStatus").className="sync err"}
}
bootstrap();

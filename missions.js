"use strict";
// Daily mission composition, navigation, completion and summary.
// Uses progression rules, exercise functions and rewards; no startup side effects.

function buildDailyMission(){
 const primary=pickLearningSyllable(),review=pickReviewSyllable(primary),decodable=decodableMissionWords();
 const recentWords=new Set((state.missionHistory||[]).slice(-3).map(x=>x.word));
 const related=decodable.filter(w=>w.parts.includes(primary)||w.parts.includes(review)),freshRelated=related.filter(w=>!recentWords.has(w.w)),freshAll=decodable.filter(w=>!recentWords.has(w.w));
 const pool=freshRelated.length?freshRelated:related.length?related:freshAll.length?freshAll:decodable.length?decodable:DATA.words,word=pick(pool);
 const family=DATA.sets.find(set=>set.includes(primary))||DATA.sets[0],comprehensionPool=sentenceUnlocked()?comprehensionSentencePool():[],visualModes=["memory","family","missing",...(comprehensionPool.length?["comprehension"]:[])],visualType=visualModes[Number(localDayKey().slice(-2))%visualModes.length];
 const missingCandidates=missingSyllableWords(),missingPool=missingCandidates.filter(w=>w.w!==word.w),missingWord=pick(missingPool.length?missingPool:missingCandidates)||word;
 const comprehensionChoices=comprehensionPool.filter(x=>x.word.w!==word.w),comprehensionItem=pick(comprehensionChoices.length?comprehensionChoices:comprehensionPool);
 const visualStep=visualType==="memory"
  ?{type:"memory",target:primary,title:"Je mémorise",detail:"Associe les sons aux syllabes"}
  :visualType==="family"
   ?{type:"family",target:family[0][0],title:"J’observe",detail:"Trouve l’intrus de la famille "+family[0][0].toUpperCase()}
   :visualType==="comprehension"&&comprehensionItem
    ?{type:"comprehension",target:comprehensionItem.word.w,title:"Je comprends",detail:"Lis la phrase et choisis la bonne image"}
    :{type:"missing",target:missingWord.w,title:"Je complète",detail:"Retrouve la syllabe manquante de "+missingWord.w.toUpperCase()};
 state.dailyMission={date:localDayKey(),index:0,completed:false,primary,review,word:word.w,familyFirst:family[0][0],startAttempts:null,startCorrect:null,sessionStats:{attempts:0,correct:0},steps:[
  {type:"discover",target:primary,title:"Je découvre",detail:"Écoute et répète "+primary.toUpperCase()},
  {type:"listen",target:primary,title:"J’écoute",detail:"Retrouve "+primary.toUpperCase()+" parmi les cartes"},
  {type:"bubbles",target:review,title:"Je révise",detail:"Éclate la bonne bulle"},
  visualStep,
  {type:"build",target:word.w,title:"Défi final",detail:"Construis le mot "+word.w.toUpperCase()}
 ]};
 save();return state.dailyMission
}
function validDailyMission(m){
 if(!m||!stateDay(m.date)||!DATA.sets.flat().includes(m.primary)||!DATA.sets.flat().includes(m.review)||!DATA.words.some(w=>w.w===m.word)||!Array.isArray(m.steps)||m.steps.length!==5)return false;
 const expected=[["discover"],["listen"],["bubbles"],["memory","family","missing","comprehension"],["build"]];
 return m.steps.every((s,i)=>{
  if(!s||!expected[i].includes(s.type))return false;
  if(s.type==="memory")return true;
  if(s.type==="family")return DATA.sets.some(set=>set[0][0]===s.target);
  return ["build","missing","comprehension"].includes(s.type)?DATA.words.some(w=>w.w===s.target):DATA.sets.flat().includes(s.target)
 })
}
function getDailyMission(){
 const m=state.dailyMission;
 if(!validDailyMission(m)||m.date!==localDayKey())return buildDailyMission();
 return m
}
function missionProgressHTML(m){
 return '<div class="mission-progress">'+m.steps.map((_,i)=>'<span class="mission-dot '+(i<m.index?"done":i===m.index&&!m.completed?"current":"")+'"></span>').join("")+'</div>'
}
function missionStepsHTML(m){
 return '<div class="mission-steps">'+m.steps.map((s,i)=>'<div class="mission-step '+(i<m.index||m.completed?"done":i===m.index?"current":"")+'"><span class="num">'+(i<m.index||m.completed?"✓":i+1)+'</span><div><b>'+esc(s.title||"Étape "+(i+1))+'</b><small>'+esc(s.detail||"")+'</small></div></div>').join("")+'</div>'
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
 if(["missing","build"].includes(s.type)&&!decodableMissionWords().some(w=>w.w===s.target)){
  const replacement=pick(s.type==="missing"?missingSyllableWords():decodableMissionWords());
  s.target=replacement.w;if(s.type==="build")m.word=replacement.w;save()
 }
 if(s.type==="discover")missionDiscover(s.target);
 else if(s.type==="listen")gameListen(s.target,true);
 else if(s.type==="bubbles")gameBubbles(s.target,true);
 else if(s.type==="memory")gameMemory([m.primary,m.review],true);
 else if(s.type==="family"){const fam=DATA.sets.find(set=>set[0][0]===s.target)||DATA.sets[0];gameFamily(fam,true)}
 else if(s.type==="missing")gameMissing(DATA.words.find(w=>w.w===s.target)||null,true);
 else if(s.type==="comprehension")gameComprehension(s.target,true);
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
  box.innerHTML='<div class="hero-emoji">✅</div><b style="font-size:20px">Étape réussie !</b><p style="color:var(--muted)">Prochaine étape : <b>'+esc(next.title||"Étape "+(m.index+1))+'</b> — '+esc(next.detail||"")+'</p><button class="btn primary" data-action="mission-continue">Continuer → étape '+(m.index+1)+'</button>'
 }
 setTimeout(()=>box.scrollIntoView({behavior:"smooth",block:"center"}),80)
}
function missionComplete(){
 const m=getDailyMission();
 if(m.index<m.steps.length){missionHub();return}
 missionMode=false;currentView="mission-complete";state.lastView="mission-complete";
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

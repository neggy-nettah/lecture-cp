"use strict";
// Exercise screens and game mechanics. Functions use active state and shared helpers at call time.
// DOM event dispatch, microphone lifecycle and app boot remain in app.js.

function refreshPracticeScreen(draw,action){
 draw();
 document.querySelector('[data-action="'+action+'"]')?.focus({preventScroll:true})
}

function phraseToolHelpHTML(sentence){
 const tools=["a","un","une","le"],present=[];
 for(const token of sentence||[]){
  const clean=String(token).toLowerCase().replace(/[.!?,;:]/g,"");
  if(tools.includes(clean)&&!present.includes(clean))present.push(clean)
 }
 if(!present.length)return "";
 return '<div class="tool-word-help"><span>🧩 Petits mots :</span>'+present.map(word=>'<button class="tool-word-audio" data-action="speak" data-text="'+esc(word)+'" data-rate=".72" aria-label="Écouter le mot '+esc(word)+'">🔊 '+esc(word)+'</button>').join("")+'</div>'
}

function sounds(){
 const pool=activeSoundData();if(state.sound>=pool.length)state.sound=0;const x=pool[state.sound%pool.length];
 stage.innerHTML=title("Les sons","Écoute le son, puis répète-le à voix haute.","Niveau 1")+
 instructionAudio("Écoute le son, puis répète-le à voix haute.")+
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
 const set=DATA.sets[state.set%max],first=familyGraphemeAt(state.set%max);
 stage.innerHTML=title("Fabrique les syllabes","Écoute comment le premier son se colle à la voyelle, puis touche les syllabes pour t’entraîner.","Niveau 2")+
 instructionAudio("Écoute comment le premier son se colle à la voyelle, puis touche les syllabes pour t’entraîner.")+
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
 instructionAudio("Lis chaque morceau, assemble le mot, puis utilise l’audio seulement pour vérifier.")+
 `<div class="card center">
   <div class="emojis">${x.emoji}</div>
   <div class="word">${wordHTML(x.parts)}</div>
   <div class="word-parts">${x.parts.map(p=>`<button class="part" data-action="speak" data-text="${p}" data-rate=".62">🔊 ${p}</button>`).join("")}</div>
   <div class="actions" style="margin-top:13px"><button class="btn primary" data-action="speak" data-text="${x.w}" data-rate=".70">🔊 Le mot entier</button><button class="btn good" data-action="word-read">🙋 J'ai essayé de le lire</button></div>
   <div class="tip">Essaie d'abord sans l'audio. Utilise 🔊 seulement pour vérifier.<br><b>${Math.min(pool.filter(w=>state.wordPractice?.[w.w]).length,Math.min(5,pool.length))} / ${Math.min(5,pool.length)}</b> mots pratiqués pour valider cet atelier.</div>
 </div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
 <div class="nextbar"><button class="btn gray" data-action="word-prev">← Mot</button><button class="btn primary" data-action="word-next">Mot suivant →</button></div>`;
}
function gamesMenu(){
 stage.innerHTML=title("Les mini-jeux","Des exercices très courts pour garder l'envie de lire.","À toi de jouer !")+
 `<div class="levels">
  <button class="level" data-action="game-listen"><div class="ico">👂</div><b>Écoute & trouve</b><small>Quelle syllabe as-tu entendue ?</small></button>
  <button class="level" data-action="game-encode"><div class="ico">✍️</div><b>J’écris la syllabe</b><small>J’entends puis je choisis les lettres</small></button>
  <button class="level" data-action="game-word-encode" ${wordEncodingUnlocked()?"":"disabled"}><div class="ico">${wordEncodingUnlocked()?"📝":"🔒"}</div><b>J’écris le mot</b><small>${wordEncodingUnlocked()?"J’écoute puis j’assemble les syllabes":wordEncodingUnlockText()}</small></button>
  <button class="level" data-action="game-bubbles"><div class="ico">🫧</div><b>Bulles express</b><small>Écoute et éclate la bonne syllabe</small></button>
  <button class="level" data-action="game-memory"><div class="ico">🧠</div><b>Memory des sons</b><small>Associe le son à la syllabe</small></button>
  <button class="level" data-action="game-family"><div class="ico">🔎</div><b>Trouve l’intrus</b><small>Repère la syllabe qui n’est pas de la même famille</small></button>
  <button class="level" data-action="game-missing"><div class="ico">🕵️</div><b>Syllabe manquante</b><small>Complète le mot avec la bonne syllabe</small></button>
  <button class="level" data-action="game-silent-e" ${silentEUnlocked()?"":"disabled"}><div class="ico">${silentEUnlocked()?"🤫":"🔒"}</div><b>Le e muet</b><small>${silentEUnlocked()?"Je repère la lettre écrite qu’on n’entend pas":silentEUnlockText()}</small></button>
  <button class="level" data-action="game-pronunciation"><div class="ico">🎤</div><b>Écoute & répète <span class="beta-pill">BÊTA</span></b><small>Entraînement seulement • pas d’étoile</small></button>
  <button class="level" data-action="game-picture"><div class="ico">🖼️</div><b>Mot & image</b><small>Quel mot correspond à l'image ?</small></button>
  <button class="level" data-action="game-build"><div class="ico">🧱</div><b>Construis le mot</b><small>Remets les syllabes dans l'ordre</small></button>
  <button class="level" data-action="game-order" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"💬":"🔒"}</div><b>La phrase</b><small>${sentenceUnlocked()?"Remets les mots dans l'ordre":sentenceUnlockText()}</small></button>
  <button class="level" data-action="game-readaloud" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"🗣️":"🔒"}</div><b>Je lis à voix haute</b><small>${sentenceUnlocked()?"Je lis puis j’écoute le modèle":sentenceUnlockText()}</small></button>
  <button class="level" data-action="game-comprehension" ${sentenceUnlocked()?"":"disabled"}><div class="ico">${sentenceUnlocked()?"📖":"🔒"}</div><b>Je comprends</b><small>${sentenceUnlocked()?"Lis la phrase et choisis l’image":sentenceUnlockText()}</small></button>
  <button class="level" data-action="game-mini-text" ${textComprehensionUnlocked()?"":"disabled"}><div class="ico">${textComprehensionUnlocked()?"📚":"🔒"}</div><b>Le mini-texte</b><small>${textComprehensionUnlocked()?"Lis deux phrases puis réponds":textComprehensionUnlockText()}</small></button>
 </div>
 ${mission("⭐","Une bonne réponse vérifiée = une étoile","Les boutons d’entraînement ne donnent plus d’étoile tout seuls.")}`;
}
function encodeLetterPool(target){
 const parts=syllableGraphemes(target);if(parts.length!==2)return [];
 const [first,second]=parts,activeParts=activeLearningSyllables().map(syllableGraphemes).filter(x=>x.length===2);
 const firstPool=[...new Set(activeParts.map(x=>x[0]).filter(Boolean))],secondPool=[...new Set(activeParts.map(x=>x[1]).filter(Boolean))];
 const otherFirst=shuffle(firstPool.filter(x=>x!==first)).slice(0,3),otherSecond=shuffle(secondPool.filter(x=>x!==second)).slice(0,3);
 return shuffle([first,...otherFirst,second,...otherSecond])
}
function gameEncode(forcedTarget=null,fromMission=false){
 missionMode=fromMission;currentView="encode";state.lastView=fromMission?"mission":"encode";save(false);currentAnswer=forcedTarget||pickLearningSyllable();encodeMade=[];locked=false;resetQuestionTracking();
 const letters=encodeLetterPool(currentAnswer);
 stage.innerHTML=title("J’écris la syllabe","Écoute, puis fabrique la syllabe avec deux morceaux.","Encodage")+
 instructionAudio("Écoute la syllabe, puis touche les deux morceaux dans le bon ordre. Un morceau peut contenir deux lettres, comme ch.")+
 `<div class="card center"><div class="hero-emoji">✍️🔤</div>
 <button class="btn yellow" data-action="speak" data-text="${esc(currentAnswer)}" data-rate=".60">🔊 Écouter la syllabe</button>
 <div class="encode-zone" id="encodeZone"><span>?</span><span>?</span></div>
 <div class="encode-bank" id="encodeBank">${letters.map((letter,i)=>`<button class="encode-letter" data-action="encode-letter" data-value="${esc(letter)}" data-id="${i}">${esc(letter)}</button>`).join("")}</div>
 <div class="actions" style="margin-top:12px"><button class="btn gray" data-action="encode-reset">↩ Recommencer</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-encode">Nouvelle syllabe →</button></div>`;
 playInstruction("Écoute la syllabe, puis touche les deux morceaux dans le bon ordre.",()=>speak(currentAnswer,.60))
}
function updateEncode(){
 const zone=$("#encodeZone");if(!zone)return;
 zone.innerHTML=[0,1].map(i=>'<span class="'+(encodeMade[i]?"filled":"")+'">'+esc(encodeMade[i]||"?")+'</span>').join("");
 if(encodeMade.length<2)return;
 const ok=encodeMade.join("")===currentAnswer;
 if(ok){
  locked=true;recordQuestionSuccess(currentAnswer,"encode:"+currentAnswer);rewardVerified("Syllabe écrite !","encode:"+currentAnswer);setDone("encoding");confetti();speak(currentAnswer,.60);
  $("#feedback").innerHTML='<div class="ok">🎉 Bravo : '+colorSyl(currentAnswer)+'</div>'
 }else{
  locked=true;recordQuestionError(currentAnswer);miss("Écoute encore et recommence.");
  $("#feedback").innerHTML='<div class="no">Presque ! Écoute encore la syllabe.</div>';
  screenTask(()=>{locked=false;encodeMade=[];document.querySelectorAll("#encodeBank .encode-letter").forEach(b=>b.disabled=false);updateEncode()},850)
 }
}


function wordEncodePool(){
 return decodableMissionWords().filter(word=>word.parts.length>=2&&word.parts.length<=4)
}
function gameWordEncode(forcedWord=null,fromParent=false){
 if(!wordEncodingUnlocked()){activate("games");return}
 missionMode=false;currentView="word-encode";state.lastView=fromParent?"parents":"word-encode";save(false);locked=false;resetQuestionTracking();
 const pool=wordEncodePool(),answer=forcedWord&&pool.some(w=>w.w===forcedWord.w)?forcedWord:pickLearningWord(pool);
 if(!answer){activate("games");return}
 currentAnswer=answer;wordEncodeMade=[];
 const extraCount=Math.max(1,5-answer.parts.length),extraBase=activeLearningSyllables().filter(s=>!answer.parts.includes(s)),extras=shuffle(extraBase).slice(0,extraCount);
 const tokens=shuffle([...answer.parts,...extras].map((value,index)=>({value,index})));
 stage.innerHTML=title("J’écris le mot","Écoute le mot, puis assemble les syllabes dans le bon ordre.","Encodage d’un mot")+
 instructionAudio("Écoute le mot, puis touche les syllabes dans le bon ordre pour l’écrire.")+
 `<div class="card center"><div class="hero-emoji">👂📝</div>
 <button class="btn yellow" data-action="word-encode-listen">🔊 Écouter le mot</button>
 <div class="order-zone" id="wordEncodeZone"><span class="empty">Les syllabes arrivent ici…</span></div>
 <div class="choices" id="wordEncodeChoices">${tokens.map(token=>`<button class="choice" style="font-size:27px" data-action="word-encode-token" data-value="${esc(token.value)}" data-id="${token.index}">${colorSyl(token.value)}</button>`).join("")}</div>
 <div class="actions" style="margin-top:11px"><button class="btn gray" data-action="word-encode-reset">↩ Recommencer</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromParent?`<button class="btn gray" data-action="go" data-to="parents">← Retour au bilan</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-word-encode">Nouveau mot →</button>`}</div>`;
 playInstruction("Écoute le mot, puis touche les syllabes dans le bon ordre pour l’écrire.",()=>speak(answer.w,.68))
}
function updateWordEncode(){
 const zone=$("#wordEncodeZone");if(!zone||!currentAnswer?.parts)return;
 zone.innerHTML=wordEncodeMade.length?wordEncodeMade.map(x=>`<span class="token">${esc(x)}</span>`).join(""):`<span class="empty">Les syllabes arrivent ici…</span>`;
 if(wordEncodeMade.length<currentAnswer.parts.length)return;
 const ok=wordEncodeMade.join("")===currentAnswer.parts.join("");
 const key="word-encode:"+currentAnswer.w;
 if(ok){
  locked=true;recordQuestionSuccess("word:"+currentAnswer.w,key);rewardVerified("Mot écrit !",key);
  state.wordPractice=state.wordPractice||{};state.wordPractice[currentAnswer.w]=true;setDone("wordEncoding");
  confetti();speak(currentAnswer.w,.70);
  $("#feedback").innerHTML=`<div class="ok">🎉 Bravo : <b>${esc(currentAnswer.w)}</b> ${currentAnswer.emoji||""}</div>`
 }else{
  locked=true;recordQuestionError("word:"+currentAnswer.w);miss("Écoute encore le mot et recommence.");
  $("#feedback").innerHTML='<div class="no">Presque ! Écoute encore le mot.</div>';
  screenTask(()=>{locked=false;wordEncodeMade=[];document.querySelectorAll("#wordEncodeChoices .choice").forEach(b=>b.disabled=false);updateWordEncode();speak(currentAnswer.w,.68)},850)
 }
}

function gameListen(forcedTarget=null,fromMission=false,fromParent=false){
 missionMode=fromMission;currentView="listen";state.lastView=fromMission?"mission":fromParent?"parents":"listen";save(false);currentAnswer=forcedTarget||pickLearningSyllable();locked=false;resetQuestionTracking();
 const opts=nextRandom(activeLearningSyllables(),currentAnswer,4);
 stage.innerHTML=title("Écoute & trouve","Écoute sans regarder la réponse.","Jeu 1")+
 instructionAudio("Écoute la syllabe, puis touche la carte qui correspond.")+
 `<div class="card center"><div class="hero-emoji">👂</div><button class="btn primary" data-action="${fromMission?"mission-repeat-answer":"repeat-answer"}">🔊 Écouter la syllabe</button>
 <div class="choices">${opts.map(x=>`<button class="choice" data-action="listen-answer" data-value="${x}">${colorSyl(x)}</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:fromParent?`<button class="btn gray" data-action="go" data-to="parents">← Retour au bilan</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-listen">Nouvelle question →</button>`}</div>`;
 if(fromMission)playInstruction("Écoute la syllabe, puis touche la carte qui correspond.",()=>speak(currentAnswer,.60));
 else screenTask(()=>speak(currentAnswer,.60),180)
}

function gameBubbles(forcedTarget=null,fromMission=false){
 missionMode=fromMission;currentView="bubbles";state.lastView=fromMission?"mission":"bubbles";save(false);currentAnswer=forcedTarget||pickLearningSyllable();locked=false;resetQuestionTracking();
 const opts=nextRandom(activeLearningSyllables(),currentAnswer,6);
 stage.innerHTML=title("Bulles express","Écoute bien et éclate la bonne bulle.","Jeu réaction")+
 instructionAudio("Écoute la syllabe, puis éclate la bulle qui correspond.")+
 `<div class="card center"><div class="actions"><button class="btn yellow" data-action="${fromMission?"mission-bubble-repeat":"bubble-repeat"}">🔊 Écouter la syllabe</button></div>
 <div class="bubble-arena">${opts.map(x=>`<button class="bubble" data-action="bubble-answer" data-value="${x}">${colorSyl(x)}</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-bubbles">Nouvelles bulles →</button>`}</div>`;
 if(fromMission)playInstruction("Écoute la syllabe, puis éclate la bulle qui correspond.",()=>speak(currentAnswer,.60));
 else screenTask(()=>speak(currentAnswer,.60),180)
}
function gameFamily(forcedFamily=null,fromMission=false){
 missionMode=fromMission;currentView="family";state.lastView=fromMission?"mission":"family";save(false);locked=false;resetQuestionTracking();
 const availableFamilies=DATA.sets.slice(0,unlockedFamilyCount()),family=forcedFamily||pick(availableFamilies),base=activeLearningSyllables(),others=base.filter(x=>!family.includes(x));
 const familyChoices=shuffle(family).slice(0,3),intruder=pick(others);currentAnswer=intruder;
 const initial=(familyGraphemeForSet(family)||"?").toUpperCase(),opts=shuffle([...familyChoices,intruder]);
 stage.innerHTML=title("Trouve l’intrus","Trois syllabes commencent par "+initial+". Une seule n’est pas de la même famille.","Jeu visuel")+
 instructionAudio("Trouve la syllabe qui ne commence pas comme les trois autres.")+
 '<div class="card center"><div class="hero-emoji">🔎</div><div class="tip">Touche la syllabe qui ne commence pas par <b>'+initial+'</b>.</div><div class="choices">'+opts.map(x=>'<button class="choice" data-action="family-answer" data-value="'+x+'">'+colorSyl(x)+'</button>').join("")+'</div><div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>'+
 '<div class="nextbar">'+(fromMission?'<button class="btn gray" data-action="mission-back">← Mission</button>':'<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-family">Nouvel intrus →</button>')+'</div>';
 if(fromMission)playInstruction("Trouve la syllabe qui ne commence pas comme les trois autres.")
}
function makeMemoryDeck(preferred=[],allowedPool=DATA.sets.flat()){
 const unique=[...new Set((preferred||[]).filter(Boolean))],rest=shuffle(allowedPool.filter(s=>!unique.includes(s))),pool=[...unique,...rest].slice(0,3);
 memoryDeck=shuffle(pool.flatMap((s,i)=>[
  {id:i+"-sound",pair:s,type:"sound",label:"🔊"},
  {id:i+"-text",pair:s,type:"text",label:s}
 ]));memoryOpen=[];memoryMatches=0;memoryMissedPairs=new Set();memoryMatchedPairs=new Set()
}
function restoreMemoryRound(){
 const m=state.dailyMission,r=missionMode?m?.memoryRound:null,allowed=activeLearningSyllables();
 if(!r||r.step!==m.index||!Array.isArray(r.cards)||r.cards.length!==6)return false;
 if(!r.cards.every(c=>c&&allowed.includes(c.pair)&&["sound","text"].includes(c.type)))return false;
 const pairs=[...new Set(r.cards.map(c=>c.pair))];
 if(pairs.length!==3||pairs.some(p=>["sound","text"].some(t=>r.cards.filter(c=>c.pair===p&&c.type===t).length!==1)))return false;
 memoryDeck=r.cards.map((c,i)=>({id:String(i),pair:c.pair,type:c.type,label:c.type==="sound"?"🔊":c.pair}));
 memoryMatchedPairs=new Set((Array.isArray(r.matched)?r.matched:[]).filter(p=>pairs.includes(p)));
 memoryMissedPairs=new Set((Array.isArray(r.missed)?r.missed:[]).filter(p=>pairs.includes(p)));
 memoryMatches=memoryMatchedPairs.size;memoryOpen=[];return true
}
function saveMemoryRound(){
 if(!missionMode||!state.dailyMission)return;
 state.dailyMission.memoryRound={step:state.dailyMission.index,cards:memoryDeck.map(c=>({pair:c.pair,type:c.type})),matched:[...memoryMatchedPairs],missed:[...memoryMissedPairs]}
}
function finishMemory(){
 locked=true;rewardVerified("Memory terminé !","memory");setDone("memory");confetti();$("#feedback").innerHTML='<div class="ok">🎉 Bravo, toutes les paires sont trouvées !</div>';completeMissionStep()
}
function gameMemory(preferred=[],fromMission=false){
 missionMode=fromMission;currentView="memory";state.lastView=fromMission?"mission":"memory";save(false);locked=false;resetQuestionTracking();
 if(!restoreMemoryRound()){
  makeMemoryDeck(preferred,activeLearningSyllables());
  // Old/interrupted rounds without pair details must not erase a recorded error.
  if(fromMission&&questionErrorRecorded)memoryMissedPairs=new Set(memoryDeck.map(c=>c.pair))
 }
 saveMemoryRound();save(false);
 stage.innerHTML=title("Memory des sons","Trouve les paires : un son et sa syllabe écrite.","Jeu mémoire")+
 instructionAudio("Retourne deux cartes et associe chaque son à la syllabe écrite.")+
 `<div class="card center"><div class="tip">Retourne deux cartes. Les cartes 🔊 prononcent une syllabe : retrouve son écriture.</div>
 <div class="memory-grid" id="memoryGrid">${memoryDeck.map((x,i)=>`<button class="memory-card ${memoryMatchedPairs.has(x.pair)?"matched":""}" ${memoryMatchedPairs.has(x.pair)?"disabled":""} data-action="memory-card" data-index="${i}" aria-label="${memoryMatchedPairs.has(x.pair)?"Paire trouvée : "+esc(x.pair):"Carte "+(i+1)+" masquée"}">${memoryMatchedPairs.has(x.pair)?(x.type==="sound"?"🔊":colorSyl(x.label)):"?"}</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-memory">Rejouer →</button>`}</div>`;
 if(memoryMatches===3)finishMemory();
 else if(fromMission)playInstruction("Retourne deux cartes et associe chaque son à la syllabe écrite.")
}
function memoryFlip(btn,index){
 if(locked||btn.classList.contains("matched")||btn.classList.contains("open")||memoryOpen.length>=2)return;
 const card=memoryDeck[index];if(!card)return;btn.setAttribute("aria-label",card.type==="sound"?"Carte son":card.label);btn.classList.add("open");btn.innerHTML=card.type==="sound"?"🔊":colorSyl(card.label);
 if(card.type==="sound")speak(card.pair,.60);
 memoryOpen.push({btn,index,card});
 if(memoryOpen.length<2)return;
 const [a,b]=memoryOpen,match=a.card.pair===b.card.pair&&a.card.type!==b.card.type;
 if(match){
  a.btn.classList.add("matched");b.btn.classList.add("matched");memoryMatches++;memoryMatchedPairs.add(a.card.pair);memoryOpen=[];saveMemoryRound();
  a.btn.setAttribute("aria-label","Paire trouvée : "+a.card.pair);b.btn.setAttribute("aria-label","Paire trouvée : "+b.card.pair);
  a.btn.disabled=true;b.btn.disabled=true;
  const masteryKey=memoryMissedPairs.has(a.card.pair)?null:a.card.pair;if(!recordAttempt(true,masteryKey,"memory:"+a.card.pair))save();tone("ok");
  if(memoryMatches===3){const wasMission=missionMode;finishMemory();if(!wasMission)document.querySelector('[data-action="game-memory"]')?.focus({preventScroll:true})}
  else{$("#feedback").innerHTML='<div class="ok">✨ Bonne paire !</div>';document.querySelector('#memoryGrid .memory-card:not(:disabled)')?.focus({preventScroll:true})}
 }else{
  memoryMissedPairs.add(a.card.pair);memoryMissedPairs.add(b.card.pair);saveMemoryRound();if(!recordQuestionError())save();tone("no");$("#feedback").innerHTML='<div class="no">Presque ! Mémorise bien les deux cartes.</div>';
  screenTask(()=>{a.btn.classList.remove("open");b.btn.classList.remove("open");a.btn.textContent="?";b.btn.textContent="?";a.btn.setAttribute("aria-label","Carte "+(a.index+1)+" masquée");b.btn.setAttribute("aria-label","Carte "+(b.index+1)+" masquée");memoryOpen=[]},750)
 }
}

function gameMissing(forcedWord=null,fromMission=false){
 missionMode=fromMission;currentView="missing";state.lastView=fromMission?"mission":"missing";save(false);locked=false;resetQuestionTracking();
 const active=activeLearningSyllables(),activeSet=new Set(active),pool=missingSyllableWords();
 let word=forcedWord||pick(pool),hideable=word?.parts?.map((p,i)=>activeSet.has(p)?i:-1).filter(i=>i>=0)||[];
 if(!hideable.length){word=pick(pool);hideable=word?.parts?.map((p,i)=>activeSet.has(p)?i:-1).filter(i=>i>=0)||[]}
 if(!word||!hideable.length){if(fromMission)missionHub();else activate("games");return}
 missingWord=word;missingIndex=pick(hideable);currentAnswer=word.parts[missingIndex];
 const opts=nextRandom(active,currentAnswer,4);
 const puzzle=word.parts.map((p,i)=>i===missingIndex?'<span class="missing-slot">?</span>':'<span>'+esc(p)+'</span>').join("·");
 stage.innerHTML=title("La syllabe manquante","Écoute le mot à compléter, puis retrouve le morceau qui manque.","Mot à compléter")+
 instructionAudio("Écoute le mot, puis touche la syllabe qui manque.")+
 '<div class="card center"><button class="btn primary" data-action="missing-listen">🔊 Écouter le mot à compléter</button><div class="word">'+puzzle+'</div><div class="choices">'+opts.map(x=>'<button class="choice" data-action="missing-answer" data-value="'+x+'">'+colorSyl(x)+'</button>').join("")+'</div><div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>'+
 '<div class="nextbar">'+(fromMission?'<button class="btn gray" data-action="mission-back">← Mission</button>':'<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-missing">Nouveau mot →</button>')+'</div>';
 if(fromMission)playInstruction("Écoute le mot, puis touche la syllabe qui manque.",()=>speak(word.w,.70))
}

function gameSilentE(forcedWord=null){
 if(!silentEUnlocked()){activate("games");return}
 missionMode=false;currentView="silent-e";state.lastView="silent-e";save(false);locked=false;resetQuestionTracking();
 const pool=silentEWordPool(),word=forcedWord&&pool.some(w=>w.w===forcedWord.w)?forcedWord:pick(pool);
 if(!word){activate("games");return}
 currentAnswer=word;
 const choices=shuffle(["e","a","i"]);
 stage.innerHTML=title("Le e muet","Une lettre peut être écrite sans s’entendre à la fin du mot.","Nouveau palier")+
 instructionAudio("Écoute le mot. À la fin, le e est écrit mais il ne s’entend pas. Touche la lettre muette.")+
 \`<div class="card center silent-e-intro"><div class="hero-emoji">🤫🔤</div><p style="margin-top:0">Exemple : dans <b class="silent-example">\${silentEWordHTML("lune",true)}</b>, le <b>e</b> gris reste écrit mais on ne le prononce pas.</p></div>
 <div class="card center">
   <button class="btn yellow" data-action="silent-e-listen">🔊 Écouter le mot</button>
   <div class="word" id="silentEWord">\${silentEWordHTML(word.w,false)}</div>
   <p style="color:var(--muted)">Quelle lettre est muette à la fin ?</p>
   <div class="choices">\${choices.map(letter=>\`<button class="choice" data-action="silent-e-answer" data-value="\${letter}">\${letter}</button>\`).join("")}</div>
   <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
 </div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-silent-e">Nouveau mot →</button></div>\`;
 playInstruction("Écoute le mot. Le e à la fin est écrit, mais il ne s’entend pas. Touche la lettre muette.",()=>speak(word.w,.70))
}

function pictureWordPool(){return decodableMissionWords().filter(w=>PICTURE_WORDS.includes(w.w))}
function gamePicture(){
 missionMode=false;currentView="pictures";state.lastView="pictures";save(false);const pool=pictureWordPool(),answer=pick(pool);currentAnswer=answer.w;locked=false;resetQuestionTracking();
 const opts=nextRandom(pool.map(x=>x.w),answer.w,4);
 stage.innerHTML=title("Quel est ce mot ?","Lis les mots et touche celui qui correspond à l'image.","Jeu 2")+
 instructionAudio("Regarde l’image, lis les mots, puis touche le bon mot.")+
 `<div class="card center"><div class="emojis" style="font-size:90px">${answer.emoji}</div>
 <div class="choices">${opts.map(w=>`<button class="choice" data-action="picture-answer" data-value="${w}">${w}</button>`).join("")}</div>
 <div class="actions" style="margin-top:11px"><button class="btn yellow" data-action="picture-hint">🔊 Indice audio</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-picture">Nouvelle image →</button></div>`;
}
function gameBuild(forcedAnswer=null,fromMission=false){
 missionMode=fromMission;currentView="build";state.lastView=fromMission?"mission":"build";save(false);const buildPool=decodableMissionWords().filter(x=>x.parts.length>=2),answer=forcedAnswer||pick(buildPool);currentAnswer=answer;orderTarget=answer.parts;orderMade=[];locked=false;resetQuestionTracking();
 const extraCount=Math.max(1,4-answer.parts.length),extraBase=activeLearningSyllables(),extraPool=extraBase.filter(s=>!answer.parts.includes(s)),extras=shuffle(extraPool).slice(0,extraCount);
 const opts=shuffle([...answer.parts,...extras]);
 stage.innerHTML=title("Construis le mot","Touche les syllabes dans le bon ordre.","Jeu 3")+
 instructionAudio("Touche les syllabes dans le bon ordre pour construire le mot.")+
 `<div class="card center"><div class="emojis">${answer.emoji}</div><div style="font-size:16px;color:var(--muted)">Modèle : <b>${answer.w}</b> — assemble les morceaux.</div>
 <div class="order-zone" id="orderZone"><span class="empty">Les syllabes arrivent ici…</span></div>
 <div class="choices" id="buildChoices">${opts.map((x,i)=>`<button class="choice" style="font-size:27px" data-action="build-token" data-value="${x}" data-id="${i}">${colorSyl(x)}</button>`).join("")}</div>
 <div class="actions" style="margin-top:11px"><button class="btn gray" data-action="build-reset">↩ Recommencer</button><button class="btn yellow" data-action="speak" data-text="${answer.w}">🔊 Écouter le mot</button></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar">${fromMission?`<button class="btn gray" data-action="mission-back">← Mission</button>`:`<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-build">Nouveau mot →</button>`}</div>`;
 if(fromMission)playInstruction("Touche les syllabes dans le bon ordre pour construire le mot.")
}
function updateBuild(){
 const zone=$("#orderZone");zone.innerHTML=orderMade.length?orderMade.map(x=>`<span class="token">${x}</span>`).join(""):`<span class="empty">Les syllabes arrivent ici…</span>`;
 if(orderMade.length===orderTarget.length){
   const ok=orderMade.join("")===orderTarget.join("");
   if(ok){locked=true;recordQuestionSuccess(null,"build:"+currentAnswer.w);rewardVerified("Mot construit !","build:"+currentAnswer.w);setDone("words");confetti();speak(currentAnswer.w,.70);$("#feedback").innerHTML=`<div class="ok">🎉 Bravo : ${currentAnswer.w}</div>`;completeMissionStep()}
   else{locked=true;recordQuestionError();miss("Presque ! Recommence dans un autre ordre.");$("#feedback").innerHTML=`<div class="no">Essaie encore.</div>`;screenTask(()=>{locked=false;orderMade=[];document.querySelectorAll("#buildChoices .choice").forEach(b=>b.disabled=false);updateBuild()},800)}
 }
}
function gameComprehension(forcedTarget=null,fromMission=false){
 if(!sentenceUnlocked()){if(fromMission)missionHub();else activate("games");return}
 const pool=comprehensionSentencePool();if(!pool.length){if(fromMission)missionHub();else activate("games");return}
 missionMode=fromMission;currentView="comprehension";state.lastView=fromMission?"mission":"comprehension";save(false);locked=false;resetQuestionTracking();
 const forcedPool=forcedTarget?pool.filter(x=>x.word.w===forcedTarget):[],item=pick(forcedPool.length?forcedPool:pool),sentence=item.sentence;currentAnswer=item.word.w;
 const available=pictureWordPool().filter(w=>w.w!==item.word.w&&w.emoji!==item.word.emoji),distractors=shuffle(available).slice(0,3),opts=shuffle([item.word,...distractors]);
 stage.innerHTML=title("Je comprends la phrase","Lis la phrase : que possède le personnage ? Tu peux écouter les petits mots si tu en as besoin.","Compréhension")+
 instructionAudio("Lis la phrase, puis touche l’image qui répond à la question.")+
 '<div class="card center"><div class="word" style="font-size:clamp(28px,6vw,48px)">'+sentence.map(esc).join(" ")+'</div>'+phraseToolHelpHTML(sentence)+'<div class="choices">'+opts.map(w=>'<button class="choice picture" data-action="comprehension-answer" data-value="'+esc(w.w)+'"><span style="font-size:52px">'+w.emoji+'</span></button>').join("")+'</div><div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>'+
 '<div class="nextbar">'+(fromMission?'<button class="btn gray" data-action="mission-back">← Mission</button>':'<button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-comprehension">Nouvelle phrase →</button>')+'</div>';
 if(fromMission)playInstruction("Lis la phrase, puis touche l’image qui répond à la question.")
}

function gameMiniText(forcedId=null){
 if(!textComprehensionUnlocked()){activate("games");return}
 const pool=miniTextPool();if(!pool.length){activate("games");return}
 missionMode=false;currentView="mini-text";state.lastView="mini-text";save(false);locked=false;resetQuestionTracking();
 const forced=forcedId?pool.find(item=>item.id===forcedId):null,item=forced||pick(pool);
 currentMiniText=item;currentAnswer=item.answer;
 const opts=shuffle([...item.choices]),tokens=item.sentences.flat();
 stage.innerHTML=title("Le mini-texte","Lis les deux phrases tranquillement, puis écoute la question.","Compréhension de texte")+
 instructionAudio("Lis les deux phrases tranquillement. Ensuite, écoute la question et touche la bonne réponse.")+
 `<div class="card center"><div class="hero-emoji">📚✨</div>
 <div class="mini-text-reading">${item.sentences.map(sentence=>`<div class="readaloud-sentence">${sentence.map(esc).join(" ")}</div>`).join("")}</div>
 ${phraseToolHelpHTML(tokens)}
 <div class="tip">Le bouton audio lit seulement la question. Il ne lit pas le texte à ta place.</div>
 <div class="actions" style="margin-top:12px"><button class="btn yellow" data-action="mini-text-question">🔊 Écouter la question</button></div>
 <div class="choices">${opts.map(name=>`<button class="choice" data-action="mini-text-answer" data-value="${esc(name)}">${esc(name)}</button>`).join("")}</div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-mini-text">Nouveau mini-texte →</button></div>`;
 playInstruction("Lis les deux phrases tranquillement. Ensuite, écoute la question et touche la bonne réponse.",()=>speak(item.question,.78))
}

function gameReadAloud(forcedSentence=null){
 if(!sentenceUnlocked()){activate("games");return}
 const pool=decodableSentencePool();if(!pool.length){activate("games");return}
 const validForced=Array.isArray(forcedSentence)&&pool.some(sentence=>sentence.join("\u0000")===forcedSentence.join("\u0000"));
 missionMode=false;currentView="readaloud";state.lastView="readaloud";save(false);locked=false;
 readAloudSentence=validForced?[...forcedSentence]:[...pick(pool)];
 const text=readAloudSentence.join(" ");
 stage.innerHTML=title("Je lis à voix haute","Lis la phrase tranquillement. Le modèle audio apparaît seulement après ton essai.","Lecture à voix haute")+
 instructionAudio("Lis la phrase à voix haute. Prends ton temps, puis appuie sur « J’ai fini de lire ».")+
 `<div class="card center"><div class="hero-emoji">📖🗣️</div>
 <div class="readaloud-sentence">${readAloudSentence.map(esc).join(" ")}</div>
 ${phraseToolHelpHTML(readAloudSentence)}
 <div class="tip">Lis d’abord avec ta propre voix. Il n’y a ni chrono, ni note, ni étoile : on s’entraîne simplement à lire de plus en plus facilement.</div>
 <div class="actions" style="margin-top:14px"><button class="btn primary" data-action="readaloud-done">✅ J’ai fini de lire</button></div>
 <div id="readaloudModel" class="readaloud-model" hidden>
   <b>Maintenant, compare avec le modèle :</b>
   <button class="btn yellow" data-action="readaloud-model" data-text="${esc(text)}">🔊 Écouter la phrase</button>
 </div>
 <div id="feedback" class="feedback" role="status" aria-live="polite"></div></div>
 <div class="nextbar"><button class="btn gray" data-action="go" data-to="games">← Jeux</button><button class="btn primary" data-action="game-readaloud">Nouvelle phrase →</button></div>`;
 playInstruction("Lis la phrase à voix haute. Prends ton temps, puis appuie sur « J’ai fini de lire ».")
}

function gameOrder(){
 if(!sentenceUnlocked()){activate("games");return}
 const pool=decodableSentencePool();if(!pool.length){activate("games");return}
 missionMode=false;currentView="order";state.lastView="order";save(false);const arr=pick(pool);orderTarget=arr;orderMade=[];locked=false;resetQuestionTracking();const opts=shuffle(arr);
 stage.innerHTML=title("Remets la phrase en ordre","Touche les mots dans l'ordre de la phrase. Tu peux écouter les petits mots si tu en as besoin.","Jeu 4")+
 instructionAudio("Touche les mots dans le bon ordre pour reconstruire la phrase.")+
 `<div class="card center"><div class="hero-emoji">💬</div>
 ${phraseToolHelpHTML(arr)}
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
   if(ok){locked=true;recordQuestionSuccess(null,"order:"+orderTarget.join(" "));rewardVerified("Phrase réussie !","order:"+orderTarget.join(" "));setDone("order");confetti();speak(orderTarget.join(" "),.73);$("#feedback").innerHTML=`<div class="ok">🎉 Très bien !</div>`}
   else{locked=true;recordQuestionError();miss("L'ordre n'est pas encore le bon.");$("#feedback").innerHTML=`<div class="no">Regarde le premier mot et recommence.</div>`;screenTask(()=>{locked=false;orderMade=[];document.querySelectorAll("#orderChoices .choice").forEach(b=>b.disabled=false);updateOrder()},900)}
 }
}

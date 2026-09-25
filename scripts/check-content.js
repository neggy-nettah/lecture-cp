const fs=require("fs");
const vm=require("vm");

const src=fs.readFileSync("content.js","utf8");
const context=vm.createContext({});
try{vm.runInContext(src,context,{timeout:1000})}
catch(error){console.error("CONTENT VALIDATION FAILED: syntax/runtime",error);process.exit(1)}

const data=vm.runInContext("DATA",context);
const cpRoadmap=vm.runInContext("CP_READING_ROADMAP",context);
const deferredWords=vm.runInContext("DEFERRED_WORDS",context);
const silentFinalEWords=vm.runInContext("SILENT_FINAL_E_WORDS",context);
const pictureWords=vm.runInContext("PICTURE_WORDS",context);
const pictures=data.words.filter(w=>pictureWords.includes(w.w));
if(pictures.length!==pictureWords.length||new Set(pictures.map(w=>w.emoji)).size!==pictures.length)throw Error("Ambiguous or missing picture vocabulary");
const collectibles=vm.runInContext("COLLECTIBLES",context);
const zones=vm.runInContext("WORLD_ZONES",context);

function fail(message,details=""){
  console.error("CONTENT VALIDATION FAILED:",message,details);
  process.exit(1);
}
function duplicates(arr){return [...new Set(arr.filter((x,i,a)=>a.indexOf(x)!==i))]}

if(!Array.isArray(cpRoadmap)||cpRoadmap.length<8)fail("CP reading roadmap is incomplete.");
const roadmapIds=new Set(cpRoadmap.map(x=>x.id));
for(const id of ["cg-basic","encode-basic","words-basic","sentences-basic","orthography-rules","complex-graphemes","fluency-prosody","texts-comprehension"]){
  if(!roadmapIds.has(id))fail("Missing CP roadmap stage:",id);
}
for(const stage of cpRoadmap){
  if(!stage.label||!Array.isArray(stage.skills)||!stage.skills.length||!Array.isArray(stage.app))fail("Invalid CP roadmap stage:",stage.id);
}

if(!Array.isArray(data.sounds)||data.sounds.length<10)fail("Sound list is missing or too small.");
if(!Array.isArray(data.sets)||data.sets.length!==10)fail("Expected 10 syllable families.");
if(!Array.isArray(data.words)||data.words.length<35)fail("Word bank is unexpectedly small.");
if(!Array.isArray(data.sentences)||data.sentences.length<10)fail("Sentence bank is unexpectedly small.");

const soundKeys=data.sounds.map(x=>x.g);
const dupSounds=duplicates(soundKeys);
if(dupSounds.length)fail("Duplicate sound graphemes:",dupSounds.join(", "));
for(const s of data.sounds){
  if(!s.g||!s.say||!s.hint||!s.emoji)fail("Malformed sound entry:",JSON.stringify(s));
}

const syllables=data.sets.flat();
const dupSyllables=duplicates(syllables);
if(dupSyllables.length)fail("Duplicate syllables:",dupSyllables.join(", "));
const familyVowels=["a","e","i","o","u","é"];
for(const family of data.sets){
  if(family.length!==familyVowels.length)fail("Each syllable family must contain "+familyVowels.length+" syllables:",family.join(", "));
  const initial=family[0]?.[0];
  if(!initial||!family.every(s=>s[0]===initial))fail("Mixed initial letters inside a family:",family.join(", "));
  if(!familyVowels.every(v=>family.includes(initial+v)))fail("Incomplete vowel pattern inside a family:",family.join(", "));
}

const wordNames=data.words.map(x=>x.w);
const dupWords=duplicates(wordNames);
if(dupWords.length)fail("Duplicate words:",dupWords.join(", "));
for(const w of data.words){
  if(!w.w||!Array.isArray(w.parts)||!w.parts.length||!w.emoji)fail("Malformed word:",JSON.stringify(w));
  if(w.parts.some(p=>!p||typeof p!=="string"))fail("Invalid word part:",w.w);
}
const exactWords=data.words.filter(w=>w.parts.join("")===w.w);
if(exactWords.length<30)fail("Too few exactly assembled words:",String(exactWords.length));

const taughtParts=new Set([...syllables,"a","e","i","o","u","é"]);
const fullyDecodable=data.words.filter(w=>w.parts.join("")===w.w&&w.parts.every(p=>taughtParts.has(p))&&!deferredWords.includes(w.w));
if(fullyDecodable.length<40)fail("Too few fully decodable words with taught graphemes:",String(fullyDecodable.length));
for(const expected of ["menu","poli","puni","revu","relu","pari","rami","vomi"]){
  if(!fullyDecodable.some(w=>w.w===expected))fail("Expected regular CV word is not fully decodable:",expected);
}
if(!silentFinalEWords.every(w=>deferredWords.includes(w)))fail("Silent-final-e vocabulary must stay deferred until the rule is taught.");
for(const deferred of ["maman","domino","robot","tapis",...deferredWords]){
  if(fullyDecodable.some(w=>w.w===deferred))fail("Word with an untaught rule became decodable too early:",deferred);
}
if(pictureWords.some(w=>deferredWords.includes(w)))fail("A deferred word remains in the picture-answer bank.");

for(const sentence of data.sentences){
  if(!Array.isArray(sentence)||sentence.length<3)fail("Malformed sentence:",JSON.stringify(sentence));
  if(sentence.some(token=>typeof token!=="string"||!token.trim()))fail("Invalid sentence token:",JSON.stringify(sentence));
  const last=sentence[sentence.length-1];
  if(!/[.!?]$/.test(last))fail("Sentence must end with punctuation:",sentence.join(" "));
}
const sentenceStrings=data.sentences.map(x=>x.join(" "));
const dupSentences=duplicates(sentenceStrings);
if(dupSentences.length)fail("Duplicate sentences:",dupSentences.join(" | "));

if(!Array.isArray(collectibles)||collectibles.length<5)fail("Collectible bank is too small.");
if(duplicates(collectibles.map(x=>x.id)).length)fail("Duplicate collectible ids.");
if(collectibles.some(x=>!x.id||!x.name||!x.emoji))fail("Malformed collectible.");

if(!Array.isArray(zones)||zones.length<4)fail("World zone list is too small.");
if(duplicates(zones.map(x=>x.id)).length)fail("Duplicate world zone ids.");
let previous=-1;
for(const z of zones){
  if(!z.id||!z.name||!z.emoji||!Number.isFinite(z.need))fail("Malformed world zone:",JSON.stringify(z));
  if(z.need<=previous)fail("World zone mission thresholds must increase:",z.id);
  previous=z.need;
}

console.log("Content validation OK");
console.log("- Sounds:",data.sounds.length);
console.log("- Syllable families:",data.sets.length);
console.log("- Syllables:",syllables.length);
console.log("- Words:",data.words.length);
console.log("- Exactly assembled words:",exactWords.length);
console.log("- Fully decodable with taught graphemes:",fullyDecodable.length);
console.log("- Sentences:",data.sentences.length);
console.log("- Collectibles:",collectibles.length);
console.log("- World zones:",zones.length);

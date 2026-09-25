"use strict";
// CP reading roadmap aligned with the 2025 cycle-2 programme.
// It is intentionally explicit: future content must attach to a taught stage instead of
// becoming available only because enough missions have elapsed.
const CP_OFFICIAL_MILESTONES=[
 {id:"period-1",label:"Fin de période 1",cgpMin:12,cgpMax:15,skills:["décoder et encoder des CGP régulières et fréquentes","déchiffrer syllabes, mots puis phrases selon les CGP étudiées"]},
 {id:"midyear",label:"Milieu d’année",cgpMin:25,cgpMax:30,skills:["étendre le nombre de CGP décodées et encodées","prendre conscience des lettres finales muettes","mémoriser des mots fréquents et réguliers"]}
];
const CP_READING_ROADMAP=[
 {id:"cg-basic",label:"Décoder des correspondances simples",skills:["identifier les graphèmes simples","fusionner consonne + voyelle","lire des syllabes CV"],app:["sounds","syllables","listen"]},
 {id:"encode-basic",label:"Encoder avec les correspondances connues",skills:["écrire une syllabe entendue","assembler les graphèmes connus"],app:["encoding"]},
 {id:"words-basic",label:"Lire et écrire des mots réguliers",skills:["fusionner plusieurs syllabes","lire des mots entièrement décodables","encoder un mot régulier entendu"],app:["words","build","missing","pictures","word-encoding"]},
 {id:"sentences-basic",label:"Lire et comprendre des phrases décodables",skills:["lire une phrase courte","identifier une information explicite","remettre une phrase en ordre"],app:["order","comprehension","readaloud"]},
 {id:"complex-graphemes",label:"Étendre les correspondances graphème-phonème",skills:["ajouter des CGP régulières fréquentes","introduire progressivement des graphèmes complexes fréquents","étendre le corpus décodable"],app:[],planned:true},
 {id:"orthography-rules",label:"Premières régularités orthographiques",skills:["repérer des lettres finales muettes fréquentes","traiter explicitement le e final muet"],app:[],planned:true},
 {id:"fluency-prosody",label:"Fluence et prosodie",skills:["lire avec précision","respecter les groupes de sens et la ponctuation"],app:["readaloud"],planned:true},
 {id:"texts-comprehension",label:"Comprendre des textes courts",skills:["lire un texte court décodable","répondre à des questions explicites","enrichir le vocabulaire"],app:[],planned:true}
];

const DATA={
 sounds:[
  {g:"a",say:"a",hint:"comme dans ami",emoji:"🍍"},
  {g:"i",say:"i",hint:"comme dans image",emoji:"🖼️"},
  {g:"o",say:"o",hint:"comme dans olive",emoji:"🫒"},
  {g:"u",say:"u",hint:"comme dans lune",emoji:"🌙"},
  {g:"e",say:"e",hint:"comme dans le",emoji:"📖"},
  {g:"é",say:"é",hint:"comme dans école",emoji:"🏫"},
  {g:"m",say:"mmmm",hint:"le son mmmm",emoji:"🐑"},
  {g:"l",say:"llll",hint:"le son llll",emoji:"🌙"},
  {g:"s",say:"ssss",hint:"le son ssss",emoji:"🐍"},
  {g:"r",say:"rrrr",hint:"le son rrrr",emoji:"🏎️"},
  {g:"f",say:"ffff",hint:"le son ffff",emoji:"🍃"},
  {g:"v",say:"vvvv",hint:"le son vvvv",emoji:"🐝"},
  {g:"p",say:"pe",hint:"le son p",emoji:"🐧"},
  {g:"t",say:"te",hint:"le son t",emoji:"🐯"},
  {g:"n",say:"nnnn",hint:"le son nnnn",emoji:"👃"},
  {g:"b",say:"be",hint:"le son b",emoji:"🎈"}
 ],
 familyGraphemes:["m","l","s","r","f","v","p","t","n","b"],
 sets:[
  ["ma","me","mi","mo","mu","mé"],["la","le","li","lo","lu","lé"],["sa","se","si","so","su","sé"],
  ["ra","re","ri","ro","ru","ré"],["fa","fe","fi","fo","fu","fé"],["va","ve","vi","vo","vu","vé"],
  ["pa","pe","pi","po","pu","pé"],["ta","te","ti","to","tu","té"],["na","ne","ni","no","nu","né"],["ba","be","bi","bo","bu","bé"]
 ],
 words:[
  {w:"maman",parts:["ma","man"],emoji:"👩"},{w:"papa",parts:["pa","pa"],emoji:"👨"},
  {w:"moto",parts:["mo","to"],emoji:"🏍️"},{w:"lune",parts:["lu","ne"],emoji:"🌙"},
  {w:"tomate",parts:["to","ma","te"],emoji:"🍅"},{w:"banane",parts:["ba","na","ne"],emoji:"🍌"},
  {w:"pirate",parts:["pi","ra","te"],emoji:"🏴‍☠️"},{w:"valise",parts:["va","li","se"],emoji:"🧳"},
  {w:"domino",parts:["do","mi","no"],emoji:"🁢"},{w:"salami",parts:["sa","la","mi"],emoji:"🥓"},
  {w:"cabane",parts:["ca","ba","ne"],emoji:"🛖"},{w:"minute",parts:["mi","nu","te"],emoji:"⏱️"},
  {w:"bébé",parts:["bé","bé"],emoji:"👶"},{w:"loto",parts:["lo","to"],emoji:"🎟️"},
  {w:"robot",parts:["ro","bo"],emoji:"🤖"},{w:"navire",parts:["na","vi","re"],emoji:"🚢"},
  {w:"piano",parts:["pi","a","no"],emoji:"🎹"},{w:"vélo",parts:["vé","lo"],emoji:"🚲"},
  {w:"tapis",parts:["ta","pi"],emoji:"🧶"},{w:"papi",parts:["pa","pi"],emoji:"👴"},
  {w:"puma",parts:["pu","ma"],emoji:"🐆"},{w:"tuba",parts:["tu","ba"],emoji:"🎺"},
  {w:"lama",parts:["la","ma"],emoji:"🦙"},{w:"bobo",parts:["bo","bo"],emoji:"🩹"},
  {w:"polo",parts:["po","lo"],emoji:"👕"},{w:"sari",parts:["sa","ri"],emoji:"🥻"},
  {w:"tutu",parts:["tu","tu"],emoji:"🩰"},{w:"mémé",parts:["mé","mé"],emoji:"👵"},
  {w:"tata",parts:["ta","ta"],emoji:"👩"},{w:"ravi",parts:["ra","vi"],emoji:"😄"},
  {w:"fini",parts:["fi","ni"],emoji:"✅"},{w:"télé",parts:["té","lé"],emoji:"📺"},
  {w:"météo",parts:["mé","té","o"],emoji:"🌦️"},{w:"numéro",parts:["nu","mé","ro"],emoji:"🔢"},
  {w:"mari",parts:["ma","ri"],emoji:"🤵"},{w:"panorama",parts:["pa","no","ra","ma"],emoji:"🏞️"},
  {w:"silo",parts:["si","lo"],emoji:"🌾"},{w:"solo",parts:["so","lo"],emoji:"🎤"},
  {w:"menu",parts:["me","nu"],emoji:"🍽️"},{w:"poli",parts:["po","li"],emoji:"🙂"},
  {w:"puni",parts:["pu","ni"],emoji:"😕"},{w:"revu",parts:["re","vu"],emoji:"👀"},
  {w:"relu",parts:["re","lu"],emoji:"📖"},{w:"pari",parts:["pa","ri"],emoji:"🎲"},
  {w:"rami",parts:["ra","mi"],emoji:"🃏"},{w:"vomi",parts:["vo","mi"],emoji:"🤢"},
  {w:"miso",parts:["mi","so"],emoji:"🍜"},{w:"sumo",parts:["su","mo"],emoji:"🤼"},
  {w:"salé",parts:["sa","lé"],emoji:"🧂"},{w:"lili",parts:["li","li"],emoji:"👧"},
  {w:"mimi",parts:["mi","mi"],emoji:"🐱"},{w:"lola",parts:["lo","la"],emoji:"👧"},
  {w:"mila",parts:["mi","la"],emoji:"👧"},{w:"sami",parts:["sa","mi"],emoji:"👦"},
  {w:"safari",parts:["sa","fa","ri"],emoji:"🦁"}
 ],
 sentences:[
   ["Papa","a","une","moto."],["Maman","a","une","valise."],["Lili","a","une","banane."],["Nina","a","une","jolie","robe."],
   ["Papa","a","un","vélo."],["Lili","a","un","robot."],["Nina","a","un","piano."],["Papi","a","un","tuba."],
   ["Le","lama","a","un","bobo."],["Maman","a","un","tapis."],["Mémé","a","un","vélo."],["Lili","a","un","tutu."],
   ["Nina","a","un","polo."],["Maman","a","un","sari."],["Lili","a","un","polo."],["Lili","a","un","vélo."],["Papa","a","un","polo."],
   ["Mila","a","un","vélo."],["Sami","a","un","polo."],["Lola","a","un","vélo."],
   ["Lili","a","un","lama."],["Sami","a","un","salami."],["Mila","a","un","sari."],
   ["Lola","a","un","lama."],["Papa","a","un","sari."]
 ]
};

const COLLECTIBLES=[
 {id:"dragon",emoji:"🐉",name:"Bébé dragon"},{id:"fairy",emoji:"🧚",name:"Fée des étoiles"},
 {id:"knight",emoji:"🛡️",name:"Petit chevalier"},{id:"unicorn",emoji:"🦄",name:"Licorne nuage"},
 {id:"dino",emoji:"🦕",name:"Petit dinosaure"},{id:"fox",emoji:"🦊",name:"Renard explorateur"}
];

const WORLD_ZONES=[
 {id:"meadow",name:"Prairie des sons",emoji:"🌼",need:0,desc:"On découvre les premiers sons et syllabes."},
 {id:"forest",name:"Forêt des syllabes",emoji:"🌲",need:2,desc:"Les syllabes deviennent de plus en plus familières."},
 {id:"castle",name:"Château des mots",emoji:"🏰",need:5,desc:"On assemble les syllabes pour lire des mots."},
 {id:"ocean",name:"Océan des phrases",emoji:"🌊",need:9,desc:"On commence à lire et remettre des phrases en ordre."},
 {id:"space",name:"Galaxie des lecteurs",emoji:"🚀",need:14,desc:"Une zone pour les lecteurs devenus très autonomes."}
];

// Final silent e is an explicit reading rule; do not treat it as a spoken CV syllable.
const SILENT_FINAL_E_WORDS=["lune","tomate","banane","pirate","valise","cabane","minute","navire"];
// Reserved until the corresponding pronunciation rules are explicitly taught.
const DEFERRED_WORDS=[...SILENT_FINAL_E_WORDS,"miso"];
// Only these illustrations are used as an answer clue (no names or approximate emojis).
const PICTURE_WORDS=["papa","moto","bébé","piano","vélo","papi","lama","polo","sari","tutu","mémé","télé"];

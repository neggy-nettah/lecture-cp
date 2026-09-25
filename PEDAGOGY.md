# Principes pédagogiques

Ce fichier fixe les règles de contenu de **La Fabrique des Syllabes** afin que l'application reste cohérente à mesure qu'elle grandit.

## Références principales

- Ministère de l'Éducation nationale — *Programme de français du cycle 2*, BO du 31 octobre 2024, applicable depuis la rentrée 2025  
  https://www.education.gouv.fr/bo/2024/Hebdo41/MENE2415135A
- Éduscol — *Livret d'accompagnement du programme de français — CP* (2025)  
  https://eduscol.education.gouv.fr/sites/default/files/document/2025livretaccompagnementfrancaiscp-112431_0.pdf
- Éduscol — Ressources d'accompagnement du programme de français au cycle 2  
  https://eduscol.education.gouv.fr/4740/ressources-d-accompagnement-du-programme-de-francais-au-cycle-2
- Éduscol — *Pour enseigner la lecture et l'écriture au CP*  
  https://eduscol.education.fr/document/1508/download

## Principes retenus

### 1. Enseignement explicite des correspondances graphème-phonème

L'enfant doit apprendre à relier ce qu'il voit à ce qu'il entend. Les mini-jeux ne doivent pas devenir des jeux de devinette basés uniquement sur une image.

### 2. Du simple au complexe

Le cœur actuel de l'application privilégie d'abord les structures Consonne-Voyelle simples :

- ma
- li
- so
- ra
- etc.

Les structures plus complexes seront ajoutées progressivement.

### 3. Corpus décodable

Un mot utilisé comme exercice de lecture autonome doit pouvoir être reconstruit avec les correspondances déjà disponibles.

Les données pédagogiques sont centralisées dans `content.js`. Le code applique cette règle avec :

- `fullyDecodableWords()`
- `decodableMissionWords()`
- `decodableSentencePool()`

Ne pas contourner ces filtres pour augmenter artificiellement la quantité de contenu.

#### Cas du `e` final muet

Le `e` entendu dans une syllabe CV et le `e` muet de fin de mot ne sont pas la même difficulté de lecture. Le guide Éduscol traite les lettres muettes de fin de mot, dont le `e` muet, comme une règle explicite distincte.

En conséquence, les mots de `SILENT_FINAL_E_WORDS` restent dans le corpus mais sont exclus du décodage autonome tant que cette règle n'a pas été enseignée. Il ne faut pas représenter **lune** comme une simple fusion orale `lu + ne`, ni **tomate** comme `to + ma + te`, avant cet enseignement.

Pour compenser sans gonfler artificiellement le corpus, privilégier des mots CV réguliers comme **menu, poli, puni, revu, relu, pari, rami, vomi**.

### 4. Décodage et encodage se renforcent mutuellement

Le programme et le livret CP 2025 associent explicitement décodage et encodage des correspondances graphème-phonème. L'application peut donc proposer des activités où l'enfant entend une syllabe et reconstruit son écriture, à condition de rester dans les graphèmes déjà enseignés.

Le mini-jeu `J’écris la syllabe` :

- choisit uniquement une syllabe du curriculum actif ;
- limite les consonnes proposées aux familles déjà accessibles ;
- utilise les voyelles déjà enseignées ;
- considère une réponse autonome correcte comme une preuve vérifiable ;
- remet la syllabe en révision après une erreur ;
- ne transforme pas une correction après erreur en nouvelle preuve de maîtrise ;
- reste d'abord disponible en jeu libre avant toute intégration aux missions quotidiennes.

### 5. Progression spiralaire

Une nouvelle notion ne remplace pas les précédentes.

Le moteur doit :

- réintroduire les syllabes déjà vues ;
- faire revenir rapidement les erreurs récentes ;
- réviser les acquis anciens après plusieurs jours ;
- mélanger apprentissage et révision dans une même mission.

### 6. Réussite mesurée, pas simple navigation

Faire défiler une carte ou appuyer sur un bouton audio ne signifie pas qu'une notion est maîtrisée.

La maîtrise doit être alimentée uniquement par des réponses vérifiables. Une correction après une erreur dans la même question ne constitue pas une nouvelle preuve de maîtrise : l’enfant est encouragé, puis la notion reste à réviser.

Les activités d'écoute/répétition peuvent compter comme pratique mais pas comme preuve de maîtrise.

### 7. Précision avant vitesse

Aucun chronomètre ne doit pousser l'enfant à deviner.

Une future mesure de fluence pourra exister, mais seulement après une lecture suffisamment précise.

### 8. Séances courtes

Une mission quotidienne vise environ 5 à 10 minutes de travail réel.

L'objectif est la régularité plutôt que la durée.

### 9. Compréhension et vocabulaire

Le décodage est indispensable mais ne suffit pas à lui seul.

L'application comprend déjà des associations phrase-image et des phrases à remettre en ordre. Les prochaines évolutions devront approfondir progressivement :

- compréhension de phrases variées ;
- vocabulaire explicite ;
- petites consignes ;
- lecture à voix haute sans notation automatique fragile ;
- mini-histoires entièrement ou majoritairement décodables.

### 10. Mots-outils

Des mots très fréquents comme `un`, `une`, `le` ou `a` peuvent apparaître dans les phrases accompagnées.

Ils ne doivent pas être confondus avec les mots proposés comme exercices de décodage autonome. Une aide audio ciblée peut prononcer ces seuls mots-outils pour rendre l'exercice autonome, mais ne doit pas lire le mot-réponse d'un exercice de compréhension.

### 11. Images

L'image sert à :

- confirmer le sens ;
- motiver ;
- récompenser.

Elle ne doit pas permettre de réussir un exercice censé mesurer le décodage sans avoir lu.

## Feuille de route CP issue du programme 2025

Le fichier `content.js` expose maintenant `CP_READING_ROADMAP`. Cette structure sert de contrat entre le programme officiel et les fonctionnalités : une activité nouvelle doit correspondre à une compétence de cette feuille de route.

| Palier | Compétence travaillée | État dans l'app |
| --- | --- | --- |
| Correspondances simples | identifier les graphèmes simples, fusionner consonne + voyelle, lire des syllabes CV | en place |
| Encodage simple | écrire une syllabe entendue avec les graphèmes connus | en place en jeu libre |
| Mots réguliers | lire et construire des mots entièrement décodables | en place |
| Phrases décodables | lire une phrase courte, remettre les mots en ordre, comprendre une information explicite | en place après déblocage |
| Régularités orthographiques | lettres muettes fréquentes, notamment `e` final muet | à construire explicitement |
| Graphèmes complexes | étendre progressivement les correspondances au-delà des CV simples | à construire |
| Fluence et prosodie | lecture précise puis plus fluide, respect de la ponctuation et des groupes de sens | amorcé sans notation automatique |
| Textes courts et compréhension | lire un texte court, répondre à des questions explicites, enrichir le vocabulaire | à construire |

### Règle de progression

Le nombre de missions ne suffit pas à lui seul à justifier l'introduction d'une nouvelle difficulté. Les missions et la maîtrise servent à régler le rythme **à l'intérieur d'un palier déjà enseigné**. Le passage à une règle orthographique ou à un graphème complexe doit être explicite dans le curriculum, documenté et accompagné de contenu adapté.

Pour le passage aux phrases, l'application exige désormais **deux conditions** : au moins 8 missions terminées et 12 points de maîtrise sur les syllabes. Le simple fait d'avoir ouvert l'application plusieurs jours ne suffit donc plus à débloquer la lecture de phrases.

L'encodage progresse lui aussi par paliers : d'abord une syllabe entendue à reconstruire avec des lettres, puis un mot régulier entièrement décodable à reconstruire avec ses syllabes. Dans ce deuxième exercice, le mot écrit n'est pas montré avant la réponse afin d'éviter une simple copie visuelle.

Le jeu d'encodage de mots est actuellement déverrouillé à partir de 4 missions terminées et 10 points de maîtrise des syllabes. Ce seuil est un réglage produit prudent, pas une norme officielle : il pourra être ajusté à partir d'observations d'usage réelles sans changer le principe pédagogique.

## Curriculum actuel

Les familles sont actuellement débloquées progressivement à partir de la liste définie dans `DATA.sets`.

Le moteur :

- commence avec 3 familles ;
- ajoute une famille environ toutes les 2 missions terminées ;
- conserve les syllabes déjà travaillées ;
- limite les distracteurs au curriculum actif ;
- filtre les mots et phrases selon ce qui est disponible.

L'ordre exact des familles reste **provisoire** et devra être revu avant une diffusion publique plus large, en particulier lorsque seront ajoutés les graphèmes complexes.

## Audio et prononciation

La synthèse vocale actuelle est une aide de prototypage.

Le jeu micro reste BÊTA :

- il ne donne pas d'étoile ;
- il ne modifie pas la maîtrise ;
- il ne doit jamais être présenté comme une évaluation phonétique fiable.

Une future solution de prononciation devra être testée spécifiquement avec des voix d'enfants.

## Règle pour tout nouveau contenu

Avant d'ajouter un mot ou une phrase, vérifier :

1. les graphèmes nécessaires ;
2. les syllabes nécessaires ;
3. si l'enfant est censé les connaître au palier où le contenu apparaît ;
4. si l'image ne donne pas la réponse à la place de la lecture ;
5. si l'exercice mesure bien la compétence annoncée.

## Validation automatique du contenu

Le script `scripts/check-content.js` vérifie à chaque push :

- unicité des sons, syllabes, mots et phrases ;
- structure des 10 familles de syllabes ;
- présence des champs nécessaires ;
- quantité minimale de mots assemblables exactement ;
- ponctuation des phrases ;
- unicité des collectibles et zones du monde ;
- progression croissante des seuils de déblocage des zones.

## Révision espacée actuelle

Le moteur utilise pour l'instant une règle simple et lisible :

- ★ : révision après 1 jour ;
- ★★ : révision après 3 jours ;
- ★★★ : révision après 7 jours.

Les erreurs récentes dans `reviewQueue` restent prioritaires sur cette planification. Cette logique est volontairement simple et pourra être ajustée après observation réelle des usages.

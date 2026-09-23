# Principes pédagogiques

Ce fichier fixe les règles de contenu de **La Fabrique des Syllabes** afin que l'application reste cohérente à mesure qu'elle grandit.

## Références principales

- Éduscol — *Pour enseigner la lecture et l'écriture au CP*  
  https://eduscol.education.fr/document/1508/download
- Éduscol — Ressources d'accompagnement du programme de français au cycle 2  
  https://eduscol.education.gouv.fr/4740/ressources-d-accompagnement-du-programme-de-francais-au-cycle-2
- Ministère de l'Éducation nationale — L'apprentissage de la lecture à l'École  
  https://www.education.gouv.fr/l-apprentissage-de-la-lecture-l-ecole-452883

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

Le code applique cette règle avec :

- `fullyDecodableWords()`
- `decodableMissionWords()`
- `decodableSentencePool()`

Ne pas contourner ces filtres pour augmenter artificiellement la quantité de contenu.

### 4. Progression spiralaire

Une nouvelle notion ne remplace pas les précédentes.

Le moteur doit :

- réintroduire les syllabes déjà vues ;
- faire revenir rapidement les erreurs récentes ;
- réviser les acquis anciens après plusieurs jours ;
- mélanger apprentissage et révision dans une même mission.

### 5. Réussite mesurée, pas simple navigation

Faire défiler une carte ou appuyer sur un bouton audio ne signifie pas qu'une notion est maîtrisée.

La maîtrise doit être alimentée uniquement par des réponses vérifiables.

Les activités d'écoute/répétition peuvent compter comme pratique mais pas comme preuve de maîtrise.

### 6. Précision avant vitesse

Aucun chronomètre ne doit pousser l'enfant à deviner.

Une future mesure de fluence pourra exister, mais seulement après une lecture suffisamment précise.

### 7. Séances courtes

Une mission quotidienne vise environ 5 à 10 minutes de travail réel.

L'objectif est la régularité plutôt que la durée.

### 8. Compréhension et vocabulaire

Le décodage est indispensable mais ne suffit pas à lui seul.

Les futures versions devront ajouter progressivement :

- compréhension de phrases ;
- vocabulaire ;
- petites consignes ;
- associations phrase-image ;
- mini-histoires entièrement ou majoritairement décodables.

### 9. Mots-outils

Des mots très fréquents comme `un`, `une`, `le` ou `a` peuvent apparaître dans les phrases accompagnées.

Ils ne doivent pas être confondus avec les mots proposés comme exercices de décodage autonome.

### 10. Images

L'image sert à :

- confirmer le sens ;
- motiver ;
- récompenser.

Elle ne doit pas permettre de réussir un exercice censé mesurer le décodage sans avoir lu.

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

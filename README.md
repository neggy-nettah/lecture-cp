# La Fabrique des Syllabes

Application web éducative de lecture syllabique destinée d'abord à un enfant de CP.

## Objectif produit

Créer des séances courtes, autonomes et positives :

**Je découvre → j'écoute → je joue → je révise → je réussis → je gagne → je collectionne → j'avance.**

L'application privilégie la précision, la répétition espacée et la progression réelle plutôt que le simple passage d'écran en écran.

## Architecture actuelle

- Application statique dans `index.html`
- HTML, CSS et JavaScript sans framework
- Supabase :
  - authentification parent
  - profils enfants
  - sauvegarde de l'état dans `progress.lesson_state`
- localStorage comme sauvegarde locale / mode invité
- GitHub Pages pour l'hébergement
- branche de travail : `develop-caly`
- branche publiée : `main`

## Etat sauvegardé

Principaux champs de l'état :

- `stars` : étoiles gagnées
- `streak` : série de réponses correctes
- `done` : activités déjà validées
- `stats` : essais et réponses correctes
- `mastery` : maîtrise par syllabe
- `rewardLedger` : empêche de gagner plusieurs fois la même étoile sur le même défi le même jour
- `rewards` : morceaux de puzzle, puzzles terminés, collection
- `dailyMission` : mission du jour et étape en cours
- `missionHistory` : historique des missions terminées
- `lastView` : écran à restaurer

`normalizeState()` doit rester rétrocompatible avec les anciennes sauvegardes.

## Maîtrise des syllabes

Niveaux :

- ☆☆☆ : non travaillée
- ★☆☆ : découverte
- ★★☆ : en cours
- ★★★ : maîtrisée

Règles actuelles :

- ★ : au moins 1 bonne réponse
- ★★ : au moins 2 bonnes réponses et 60 % de réussite
- ★★★ : au moins 4 bonnes réponses et 75 % de réussite

`pickLearningSyllable()` donne plus de poids aux syllabes peu maîtrisées.

## Mission du jour

Une mission contient 5 étapes :

1. découverte
2. écoute et choix
3. révision avec Bulles
4. Memory ou Trouve l'intrus selon le jour
5. construction d'un mot

La progression est sauvegardée. Une étape réussie affiche explicitement un bouton pour continuer.

Une mission terminée :

- est ajoutée à l'historique une seule fois par date
- donne 1 morceau de puzzle
- 4 morceaux terminent un puzzle
- un puzzle terminé débloque un collectible

## Récompenses

- bonne réponse vérifiée : étoile
- même défi répété le même jour : pas de nouvelle étoile
- mission terminée : 1 morceau de puzzle
- 4 morceaux : collectible
- badges : dérivés automatiquement des progrès
- monde : zones débloquées selon le nombre de missions terminées
- Léo évolue avec les missions

## Jeux actuels

- Écoute & trouve
- Bulles express
- Memory des sons
- Trouve l'intrus
- Mot & image
- Construis le mot
- Phrase en ordre
- Écoute & répète — BÊTA

Le jeu micro reste un entraînement BÊTA et ne doit pas décider de la maîtrise ou donner des récompenses.

## Audio

L'audio utilise actuellement `speechSynthesis`.

Point connu : comportement non fiable sur Safari macOS. Ne pas modifier à nouveau cette partie sans test dédié. Une future version plus robuste pourra utiliser de vrais fichiers audio pré-enregistrés ou un pipeline audio serveur.

## Règles à préserver

1. Ne jamais attribuer une maîtrise sur un simple clic d'entraînement.
2. Les boutons de répétition audio ne donnent pas d'étoile.
3. Une bonne réponse vérifiée peut faire progresser la maîtrise.
4. Les puzzles sont liés aux missions terminées, pas au nombre de clics.
5. Éviter les messages négatifs ou punitifs.
6. Les sessions enfant doivent rester courtes.
7. Le micro ne doit pas être présenté comme un véritable score de prononciation tant que l'analyse phonétique n'est pas robuste.
8. Toute nouvelle donnée ajoutée à l'état doit rester compatible avec les anciennes sauvegardes.

## Priorités suivantes

- remplacer les emojis de récompense par un univers graphique original
- ajouter davantage de contenu pédagogique validé
- améliorer les missions adaptatives selon les erreurs récentes
- améliorer l'expérience tablette/mobile
- revoir l'audio macOS avec une solution plus fiable
- renforcer l'idempotence côté serveur si l'application est ouverte au public
- ajouter des tests automatiques avant les évolutions plus importantes

## Contrôle avant publication

Avant de pousser `develop-caly` vers `main` :

1. vérifier la syntaxe JavaScript
2. vérifier qu'une ancienne sauvegarde se charge
3. vérifier qu'une mission peut être reprise
4. vérifier qu'une mission ne récompense qu'une fois par jour
5. vérifier mobile et desktop
6. ne pas réintroduire le micro dans la progression pédagogique

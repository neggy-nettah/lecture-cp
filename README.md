# La Fabrique des Syllabes

Application web éducative de lecture syllabique destinée d'abord à un enfant de CP.

## Objectif produit

Créer des séances courtes, autonomes et positives :

**Je découvre → j'écoute → je joue → je révise → je réussis → je gagne → je collectionne → j'avance.**

L'application privilégie la précision, la répétition espacée et la progression réelle plutôt que le simple passage d'écran en écran.

## Architecture actuelle

- Application statique sans framework
- `index.html` : structure HTML et chargement des assets
- `styles.css` : styles et responsive
- `content.js` : sons, syllabes, mots, phrases, collectibles et zones
- `app.js` : logique pédagogique, navigation, Supabase et jeux
- `manifest.webmanifest` : métadonnées d'installation
- `sw.js` : cache hors ligne versionné du shell applicatif
- `icon.svg` : icône temporaire de l'application
- Supabase :
  - authentification parent
  - profils enfants
  - sauvegarde de l'état dans `progress.lesson_state`
- localStorage comme sauvegarde locale / mode invité
- GitHub Pages pour l'hébergement
- version courante des assets ajoutée en query string pour limiter les problèmes de cache
- Service Worker réseau-d'abord pour les navigations et cache local des assets versionnés
- les appels Supabase et les données de progression ne sont jamais mis en cache par le Service Worker
- branche de travail : `develop-caly`
- branche publiée : `main`

## Etat sauvegardé

Principaux champs de l'état :

- `stars` : étoiles gagnées
- `streak` : série de réponses correctes
- `done` : activités déjà validées
- `stats` : essais et réponses correctes
- `mastery` : maîtrise par syllabe, avec dernière date de révision
- `reviewQueue` : erreurs récentes à revoir en priorité
- `attemptLedger` : empêche de gonfler artificiellement la maîtrise avec la même réussite répétée
- `rewardLedger` : empêche de gagner plusieurs fois la même étoile sur le même défi le même jour
- `rewards` : morceaux de puzzle, puzzles terminés, collection
- `dailyMission` : mission du jour et étape en cours
- `missionHistory` : historique des missions terminées
- `updatedAt` : horodatage utilisé pour choisir la sauvegarde locale/distante la plus récente
- `lastView` : écran à restaurer

`normalizeState()` doit rester rétrocompatible avec les anciennes sauvegardes.

## Curriculum progressif

Les missions ne tirent plus dans les 60 syllabes dès le premier jour.

- départ : 3 familles de syllabes débloquées
- chaque famille contient désormais les six formes en `a / e / i / o / u / é` (ex. `ma / me / mi / mo / mu / mé`)
- une nouvelle famille demande désormais à la fois assez de missions terminées et assez de consolidation réelle sur les syllabes déjà travaillées
- la cadence maximale reste d'environ 1 nouvelle famille tous les 2 jours de mission, mais elle peut être retardée si la maîtrise n'est pas suffisante
- une famille réellement travaillée dans une ancienne version reste accessible afin de ne pas faire régresser un profil existant
- la simple pratique d'un son isolé ne suffit pas à débloquer toute une famille
- une syllabe déjà travaillée reste dans le pool même si elle n'appartient pas au palier normalement ouvert
- les distracteurs des missions utilisent uniquement les familles actuellement débloquées
- le mot final de mission doit être entièrement décodable avec les syllabes actives et les voyelles isolées disponibles

Les jeux libres restent plus ouverts, mais les écrans de lecture et de construction utilisent seulement des mots dont les morceaux se recomposent exactement.

## Maîtrise des syllabes

Niveaux :

- ☆☆☆ : non travaillée
- ★☆☆ : découverte
- ★★☆ : en cours
- ★★★ : maîtrisée

Règles actuelles :

- ★ : au moins 1 bonne réponse autonome
- ★★ : au moins 2 bonnes réponses et 60 % de réussite
- ★★★ : au moins 4 bonnes réponses et 75 % de réussite

Une réponse corrigée après une erreur garde son encouragement et sa récompense, mais ne fait pas monter la maîtrise et ne retire pas la syllabe de la file de révision. Cette règle reste active après la reprise d’une étape de mission. Les statistiques de tentatives incluent les corrections ; elles sont distinctes de la maîtrise. Les acquis déjà enregistrés sont conservés.

`pickLearningSyllable()` donne plus de poids aux syllabes peu maîtrisées, aux erreurs récentes et aux syllabes maîtrisées qui n’ont pas été revues depuis plusieurs jours.

## Mission du jour

Une mission contient 5 étapes :

1. découverte
2. écoute et choix
3. révision avec Bulles
4. Memory, Trouve l'intrus ou Syllabe manquante selon le jour
5. construction d'un mot

La progression est sauvegardée. Une étape réussie affiche explicitement un bouton pour continuer.

Une mission terminée :

- est ajoutée à l'historique une seule fois par date
- donne 1 morceau de puzzle
- 4 morceaux terminent un puzzle
- un puzzle terminé débloque un collectible

## Récompenses

- bonne réponse vérifiée : étoile
- même défi répété le même jour : pas de nouvelle étoile et pas de nouvelle hausse artificielle de maîtrise
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
- Syllabe manquante
- Mot & image
- Construis le mot
- Phrase en ordre
- Écoute & répète — BÊTA

Le jeu micro reste un entraînement BÊTA et ne doit pas décider de la maîtrise ou donner des récompenses.

## Monde et motivation

- objectif doux : jusqu’à 5 missions sur les 7 derniers jours
- carte du monde avec zones débloquées progressivement
- évolution du compagnon Léo
- puzzles de 4 morceaux
- collectibles
- badges automatiques

## Sauvegarde et robustesse

- sauvegarde locale immédiate
- Supabase quand un compte enfant est connecté
- la sauvegarde locale ou distante la plus récente gagne lors du chargement
- reconnexion automatique après un passage hors ligne
- navigation seule non considérée comme un nouveau progrès
- l’app reste utilisable localement si Supabase est indisponible
- écran de récupération en cas d’erreur JavaScript
- diagnostic parent copiable sans email ni donnée personnelle
- copie locale automatique avant remise à zéro

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
- faire évoluer les tests automatiques avec chaque nouvelle fonctionnalité

## Contrôle avant publication

Avant de pousser `develop-caly` vers `main` :

1. exécuter `node scripts/check-app.js`
2. exécuter `node scripts/smoke-runtime.js`
3. vérifier qu'une ancienne sauvegarde se charge
4. vérifier qu'une mission peut être reprise
5. vérifier qu'une mission ne récompense qu'une fois par jour
6. vérifier mobile et desktop
7. ne pas réintroduire le micro dans la progression pédagogique


## Vérifications navigateur

Le workflow GitHub exécute désormais aussi `scripts/browser-check.js` avec Chromium.
Les appels Supabase sont simulés : aucun compte ni aucune progression réelle n’est utilisé.
Ce scénario vérifie la reprise et la fin des missions, les récompenses uniques,
les changements de profil rapides, les sauvegardes en attente et 32 écrans/tailles.

Pour le lancer localement avec Playwright 1.58.2 et Chromium installés :

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# Dans un autre terminal :
node scripts/browser-check.js
```

Le test des voix Safari et de la synchronisation entre deux appareils reste manuel.
Les écritures simultanées depuis plusieurs appareils restent basées sur l’horodatage
le plus récent ; une fusion serveur des progrès reste une évolution à prévoir.


## Compte parent et récupération

Le retour d’un lien de réinitialisation affiche un formulaire de nouveau mot de passe.
L’écoute de `PASSWORD_RECOVERY` est installée avant `getSession()` afin de couvrir
l’arrivée directe depuis l’email. L’enregistrement utilise `auth.updateUser` uniquement
avec une session de récupération active. Les mots de passe ne sont pas placés dans
la progression, les sauvegardes exportées ou le diagnostic.

Les formulaires empêchent les doubles demandes pendant un appel réseau et affichent
les erreurs sans remplacer l’écran de jeu. L’import de progression vérifie que son
profil cible est resté identique et exige une copie de sécurité avant remplacement.

Références techniques :
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange

Test manuel restant : ouvrir un vrai email de récupération Supabase et vérifier
le changement de mot de passe. Les tests automatiques simulent ce service.

### Révisions depuis le coin parent

Le bilan propose jusqu’à trois syllabes déjà travaillées parmi les familles accessibles : erreurs à revoir, échéances de révision, puis apprentissages en cours. Chaque bouton lance un exercice libre ciblé sans avancer la mission. Les syllabes non évaluées et les familles à découvrir sont nommées séparément ; une absence de données ne vaut pas un échec. Le pourcentage de tentatives inclut les corrections, contrairement aux nouvelles preuves de maîtrise.

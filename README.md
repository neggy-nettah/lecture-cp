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
- `progression.js` : maîtrise, réponses, révisions, paliers et sélection du contenu
- `rewards.js` : étoiles, récompenses, encouragements et séries
- `exercises.js` : ateliers sons/syllabes/mots et mini-jeux, hors micro bêta
- `missions.js` : composition, étapes et bilan des missions quotidiennes
- `app.js` : démarrage, navigation générale, Supabase, audio/micro, écrans parent et dispatch des actions
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
- les activités de phrase demandent au moins 8 missions terminées **et** 12 points de maîtrise des syllabes ; le temps seul ne les débloque plus

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
4. Memory, Trouve l'intrus, Syllabe manquante, encodage de syllabe ou compréhension selon les prérequis et le jour
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
- J’écris la syllabe
- J’écris le mot — mot entendu à reconstruire sans modèle écrit
- Bulles express
- Memory des sons
- Trouve l'intrus
- Syllabe manquante
- Mot & image
- Construis le mot
- Phrase en ordre
- Je lis à voix haute — entraînement sans note
- Je comprends — phrase vers image
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
- la progression locale et distante est fusionnée de façon conservatrice afin de préserver les acquis des deux appareils
- reconnexion automatique après un passage hors ligne
- navigation seule non considérée comme un nouveau progrès
- l’app reste utilisable localement si Supabase est indisponible
- écran de récupération en cas d’erreur JavaScript
- diagnostic parent copiable sans email ni donnée personnelle
- copie locale automatique avant remise à zéro

## Audio

L'audio utilise actuellement `speechSynthesis`.

Depuis la v0.32, le moteur attend la disponibilité des voix, réagit à `voiceschanged`, assigne explicitement une voix française lorsqu'elle existe et évite les annulations inutiles avant lecture. `scripts/audio-engine-check.js` simule notamment une liste de voix vide au premier appel puis chargée plus tard.

Point restant : Safari macOS doit encore être vérifié sur un appareil réel. Si la synthèse native reste instable malgré ces garde-fous, l'évolution la plus robuste sera d'utiliser de vrais fichiers audio pré-enregistrés ou un pipeline audio serveur.

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

- tester sur un vrai enfant l’encodage de mots et la lecture à voix haute ; l’encodage de syllabes est déjà introduit progressivement dans les missions
- ajouter une progression explicite pour les premières règles orthographiques, notamment le `e` final muet, avant de réintroduire les mots concernés
- travailler progressivement la prosodie et la lecture expressive sans notation automatique fragile
- remplacer progressivement les emojis de récompense par un univers graphique original
- ajouter davantage de contenu pédagogique validé, puis introduire les graphèmes complexes avec une progression explicite
- améliorer encore l’expérience tablette/mobile et les grands réglages de texte
- vérifier le moteur audio sur Safari macOS réel malgré les garde-fous ajoutés en v0.32
- passer à une résolution transactionnelle des écritures concurrentes côté serveur lorsque l’accès au projet Supabase est disponible
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

Le test des voix Safari reste manuel sur matériel réel.

Depuis la v0.33, le chargement d’un profil fusionne de façon conservatrice les progrès
présents sur l’appareil et dans Supabase : les éléments monotones (étoiles, acquis,
ateliers pratiqués, historique et collection) ne doivent plus régresser lorsqu’un
iPhone et un Mac ont travaillé séparément. La mission du jour conserve l’avancement
le plus élevé. Cette fusion réduit fortement les écrasements, mais elle ne remplace
pas encore une résolution transactionnelle côté serveur si deux appareils écrivent
strictement au même instant.


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

### Reprise du Memory de mission

La disposition des six cartes, les paires trouvées et les erreurs sont conservées avec la mission. Les cartes seulement retournées sont masquées à la reprise. Une paire précédemment manquée ne devient pas une preuve de maîtrise après rechargement. Les anciennes parties avec erreur mais sans détail des paires restent jouables, sans nouvelle maîtrise sur cette partie. Le Memory libre démarre une nouvelle partie à chaque lancement.

### Audit des exercices (0.20)

`node scripts/browser-check.js` lance aussi `scripts/audit-games-browser.js` : tous les paliers, choix corrects et incorrects, assemblage de tous les mots accessibles, phrases, images, indices, répétition des clics et affichage à 320 px. Les autres scénarios couvrent Memory, reprise, profils, comptes et sauvegardes. Voir `AUDIT.md` pour les corrections et les limites.

Les questions visuelles utilisent uniquement `PICTURE_WORDS`. La syllabe manquante donne le mot cible à écouter. La construction avec modèle entraîne l’assemblage et conserve sa récompense, mais ne prouve pas une lecture autonome. L’indice audio du jeu Mot & image supprime la preuve de maîtrise pour cette question. `DEFERRED_WORDS` exclut valise et miso tant que la règle du s prononcé z n’est pas enseignée.

### Organisation et ordre de chargement

Les scripts classiques sont chargés dans cet ordre : `content.js`, `progression.js`, `rewards.js`, `exercises.js`, `missions.js`, `app.js`. Les fichiers extraits déclarent leurs fonctions sans accéder à la progression au chargement. Ils utilisent l’état actif et les fonctions de sauvegarde/affichage lors des appels. Cette séparation est une première étape : les dépendances globales restent explicites, et ne constituent pas encore des modules indépendants.

Pour ajouter un fichier JavaScript, mettre à jour `index.html`, le cache `sw.js` et les contrôles de chargement. Modifier les règles d’acquis dans `progression.js`, les récompenses dans `rewards.js`, les exercices dans `exercises.js` et les parcours quotidiens dans `missions.js`. Les tests navigateur couvrent leur fonctionnement conjoint ; `scripts/offline-check.js` vérifie le rechargement réel sans réseau.

### Bilan parent et entraînement ciblé (0.29)

Le bilan distingue quatre catégories exclusives : pas encore évaluée, à reprendre, en apprentissage et maîtrisée. Depuis le détail, chaque syllabe disponible lance un exercice d’écoute ciblé ; les familles futures restent verrouillées. Un bouton retourne au bilan et un rechargement y ramène également. Ces exercices ne remplacent ni ne valident une étape de la mission en cours. `scripts/parent-detail-check.js` couvre ces règles et le clavier sur quatre tailles d’écran.

### Suivi sur la durée (0.28)

Le total des missions et la meilleure série sont sauvegardés séparément de l’historique récent, conservé sur 60 missions. Le badge des trois jours consécutifs reste obtenu après une pause. Les séries et le rythme hebdomadaire ignorent doublons, dates invalides et dates futures. Les anciennes sauvegardes démarrent au nombre de dates connues : une mission déjà effacée avant cette version ne peut pas être reconstituée. `scripts/long-term-progress-check.js` vérifie la 61e mission, les imports et les reprises.

### Connexion instable et mises à jour (0.27)

Après un premier chargement complet, la version installée sert de repli en cas de coupure, d’erreur serveur 5xx ou de navigation bloquée pendant quatre secondes. Son HTML reste associé à ses fichiers jusqu’à l’installation complète de la version suivante. Seuls les fichiers prévus dans le cache de l’application sont conservés ; les requêtes supplémentaires n’accumulent plus de copies. `node scripts/check-service-worker.js` simule les pannes et `node scripts/network-browser-check.js` les reproduit dans Chromium sur un serveur local contrôlé. Cela ne rend pas les connexions aux comptes disponibles hors ligne.

### Fin de mission et changement de jour (0.25)

La dernière réponse réussie enregistre immédiatement la mission et son morceau de puzzle. L’écran de récompense peut être rouvert sans nouveau gain. Les anciennes missions terminées dont cet écran n’a jamais été ouvert sont récupérées avant de générer la mission suivante. Un exercice resté ouvert depuis la veille ne peut pas valider une étape de la nouvelle mission. `scripts/mission-boundaries-check.js` couvre ces transitions dans Chromium, avec rechargement réel et changement de date simulé.

### Sauvegardes et clavier (0.24)

Le chargement isole les champs abîmés (compteurs, collection, historique, dates) pour conserver le reste de la progression. L’import garde également les mesures de maîtrise des mots. Une mission devenue invalide est reconstruite, sans récompense automatique depuis un ancien écran de fin. Les titres et consignes importés sont échappés avant affichage. Les tests `scripts/saved-state-check.js`, lancés par la suite navigateur, couvrent ces cas et le focus clavier. Aucun changement de schéma ou de droits Supabase ; les synchronisations sont simulées dans ces tests.

### Cycle de vie du micro bêta (0.23)

Une seule écoute peut être active. Le bouton « Arrêter l’écoute », la navigation, le changement de profil et le passage en arrière-plan ferment la session. Une autorisation obtenue trop tard ferme immédiatement le flux ; les anciens résultats ne modifient pas le nouvel exercice. Un délai maximum couvre aussi les reconnaissances qui ne démarrent jamais. Les réponses du micro ne donnent ni maîtrise, ni récompense, ni pénalité sur la série. Les tests de `scripts/microphone-check.js` simulent ces événements ; ils ne valident pas la qualité audio ni le fonctionnement matériel sur Safari.

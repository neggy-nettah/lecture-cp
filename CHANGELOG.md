# Changelog

## 0.18.0 — 2026-09-23

- bilan parent : trois propositions de révision avec lancement direct, erreurs prioritaires puis révisions espacées et apprentissages en cours
- distinction explicite entre réussite des tentatives, maîtrise et récompenses
- syllabes non évaluées et familles à découvrir identifiées dans le détail
- les syllabes déjà maîtrisées ne sont plus listées parmi les difficultés
- contrôles navigateur des priorités et de la séparation entre exercice libre et mission

## 0.17.0 — 2026-09-23

- distinction entre réponse autonome et correction après une erreur dans les choix, syllabes manquantes, mots et phrases à construire
- les corrections gardent leurs encouragements sans augmenter la maîtrise ni effacer une révision prévue
- les étapes de mission conservent cette information après interruption et rechargement
- vérification Chromium des erreurs, corrections, reprise et réussite autonome

## 0.16.0 — 2026-09-24

### Compte parent
- parcours de récupération du mot de passe complet : détection du retour du lien, saisie et confirmation, validation puis accès aux profils
- abonnement aux événements de connexion avant la lecture de session pour ne pas manquer PASSWORD_RECOVERY
- messages d’erreur français, validation des emails et gestion des exceptions réseau dans les formulaires
- protection contre les doubles soumissions, notamment lors de la création d’un profil enfant
- prise en charge de la touche Entrée et des gestionnaires de mots de passe
- indication claire lorsqu’un lien de connexion contient une erreur

### Récupération de progression
- un import est annulé si le compte ou le profil change pendant la lecture du fichier
- import et remise à zéro annulés si la copie de sécurité échoue
- la restauration conserve la progression remplacée, pour permettre de revenir en arrière

### Tests
- scénarios Chromium ajoutés : récupération pendant le démarrage, confirmation du mot de passe, double soumission, email invalide et erreur réseau
- tests d’import lent, de stockage saturé et de restauration réversible
- tous les appels de compte et de sauvegarde de ces scénarios sont simulés ; aucun email n’est envoyé

## 0.15.0 — 2026-09-24

### Progression et profils
- les réponses réseau périmées sont ignorées après un changement de profil ou de compte
- chaque sauvegarde en attente garde son profil et son instantané de progression
- les progrès faits pendant une lecture distante ne sont plus remplacés par une ancienne réponse
- un renouvellement de connexion ne redémarre plus l’exercice en cours
- les erreurs réseau préservent le mode local ; un échec de stockage local est signalé

### Jeux et petits écrans
- les rappels différés du Memory et des jeux de construction sont limités à leur écran d’origine
- les clics supplémentaires après une construction terminée ne modifient plus la réponse
- le mélange des choix utilise Fisher–Yates
- meilleur ajustement des cartes et du bandeau sur petits écrans, cibles tactiles agrandies
- formulaire parent utilisable au clavier, fermeture par Échap et retour du focus

### Vérification
- scénario navigateur ajouté : missions, reprise après rechargement, récompense unique, réponses réseau tardives et isolation des profils
- contrôle de débordement des écrans principaux à 320, 390, 768 et 1280 pixels
- ces scénarios utilisent un service de synchronisation simulé et ne remplacent pas l’essai réel avec deux appareils

### À vérifier sur les appareils réels
- synthèse vocale Safari macOS et micro BÊTA
- connexion réelle, profils et synchronisation Supabase sur iPhone et Mac

## 0.14.1 — 2026-09-24

- Les syllabes récemment ratées ont davantage de chances de revenir comme sujet principal d’une mission.
- Les deux derniers sujets sont moins susceptibles de revenir immédiatement.
- Test automatisé de cette sélection, sans modification de l’audio Safari.

## 0.14.0 — 2026-09-24

### Contenu de lecture
- ajout du son `e` non accentué au curriculum
- chaque famille passe de 5 à 6 syllabes : `a / e / i / o / u / é`
- le parcours contient maintenant 60 syllabes au total
- des mots comme **lune, tomate, banane, pirate, valise, minute, navire** deviennent enfin décodables lorsque leurs familles sont débloquées

### Qualité pédagogique
- le moteur reconnaît désormais `e` comme voyelle/graphème enseigné
- 42 mots du corpus sont complètement assemblables avec les sons réellement enseignés
- **maman, domino, cabane, robot, tapis** restent volontairement hors du pool 100 % décodable tant que leurs particularités ne sont pas enseignées
- le tableau parent affiche automatiquement le nombre réel de syllabes

### Tests
- validation des 10 familles à 6 syllabes
- contrôle du motif `a/e/i/o/u/é` pour chaque consonne
- garde-fou sur les 7 mots rendus décodables par le nouveau `e`
- garde-fou empêchant les mots à graphèmes ou lettres silencieuses non enseignés d’entrer trop tôt

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.13.0 — 2026-09-24

### Progression pédagogique
- le déblocage d'une nouvelle famille dépend maintenant de deux conditions : la cadence des missions terminées et la préparation réelle de l'enfant
- la cadence maximale reste d'environ une famille toutes les 2 missions, mais un nouveau palier peut attendre si les syllabes actuelles sont encore trop fragiles
- l'écran Syllabes et le Coin parent indiquent désormais quand il faut surtout consolider avant d'ouvrir la suite

### Compatibilité des anciennes progressions
- une famille déjà réellement travaillée dans une ancienne version reste accessible
- une syllabe avec des tentatives enregistrées ou un mot réellement pratiqué peut préserver cet ancien accès
- la simple répétition d'un son isolé ne suffit pas à ouvrir artificiellement les familles suivantes

### Tests
- scénarios isolés pour le curriculum progressif
- tests de blocage par manque de préparation et de déblocage après consolidation
- garde-fou empêchant la pratique d'un simple son de contourner le curriculum

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.12.0 — 2026-09-23

### Missions avancées
- à partir de 8 missions terminées, l'étape 4 peut maintenant devenir un mini-défi de compréhension
- la mission reste limitée à 5 étapes : compréhension remplace ponctuellement Memory, Intrus ou Syllabe manquante
- la phrase choisie est décodable avec le curriculum actif
- la cible de compréhension est enregistrée dans la mission pour permettre une reprise après fermeture
- la réussite de compréhension valide correctement l'étape puis affiche Continuer

### Tests
- smoke test d'une mission avancée avec compréhension
- isolation des tests de démarrage de mission pour éviter les dépendances entre scénarios
- garde-fou statique sur le routage compréhension dans la mission

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.11.2 — 2026-09-23

### Mises à jour de l'app installée
- vérification d'une nouvelle version du Service Worker à chaque chargement
- notification non intrusive lorsqu'une nouvelle version prend le contrôle
- aucune recharge automatique pendant une mission ou un jeu
- nouveau cache versionné pour forcer le renouvellement des assets installés
- garde-fou CI sur la gestion des mises à jour installées

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.11.1 — 2026-09-23

### Hors ligne
- statut hors connexion plus clair dans l'interface
- rappel que l'application reste utilisable et que la progression est conservée localement
- retour automatique au statut normal quand Internet revient
- nouveau numéro de cache pour garantir la mise à jour des appareils déjà installés
- test automatique du comportement sur navigateur hors ligne

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.11.0 — 2026-09-23

### Installation et hors ligne
- ajout d'un manifeste Web App pour une ouverture en mode autonome
- ajout d'une icône SVG dédiée à La Fabrique des Syllabes
- métadonnées iPhone/iPad pour une meilleure utilisation depuis l'écran d'accueil
- ajout d'un Service Worker limité aux fichiers statiques de l'application
- après une première ouverture en ligne, le cœur de l'application peut se rouvrir hors ligne
- les appels Supabase et les ressources externes ne sont volontairement pas mis en cache par le Service Worker

### Cache et mises à jour
- cache versionné avec la version de l'application
- suppression automatique des anciens caches lors de l'activation d'une nouvelle version
- navigation en stratégie réseau d'abord, avec repli sur l'application locale hors ligne
- assets versionnés conservés en cache local

### Tests
- validation automatique du manifeste et de l'icône
- validation syntaxique du Service Worker
- contrôle automatique de la cohérence entre APP_VERSION, les URLs d'assets et la version du cache
- test du démarrage sur un navigateur sans support Service Worker

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.10.2 — 2026-09-23

### Sauvegarde portable
- ajout de l'import d'une progression JSON exportée depuis l'application
- sauvegarde automatique de l'état courant avant import
- import limité à 2 Mo et refus des fichiers non reconnus
- ancienne mission du jour supprimée automatiquement si elle est périmée

### Validation des données importées
- normalisation des statistiques et refus de valeurs incohérentes
- suppression des syllabes inconnues dans la maîtrise
- déduplication de l'historique des missions
- nettoyage des pratiques sons/mots et des journaux anti-farming
- nettoyage des collectibles inconnus et des valeurs de puzzle invalides
- tests automatiques couvrant les fichiers valides, invalides et corrompus

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.10.1 — 2026-09-23

### Corrections
- correction du jeu de compréhension : la réponse cible est maintenant bien stockée dans l'état partagé utilisé par le clic
- Memory n'augmente plus la maîtrise d'une syllabe si cette paire a déjà été mal associée pendant la manche
- consigne de l'écran Syllabes alignée avec l'interaction réelle (plus de faux glisser-déposer)

### Qualité des données
- garde-fou automatique empêchant le retour du bug de réponse dans le jeu de compréhension
- garde-fou automatique empêchant Memory de gonfler artificiellement la maîtrise
- smoke test confirmant qu'une paire ratée puis retrouvée reste une réussite de jeu sans devenir une preuve forte de maîtrise

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.10.0 — 2026-09-23

### Nouveau jeu
- ajout de **Syllabe manquante**
- un mot décodable est affiché avec une syllabe cachée
- les distracteurs restent dans le curriculum actif
- la bonne réponse fait progresser la maîtrise de la syllabe retrouvée
- le jeu fonctionne aussi comme étape de mission

### Missions
- l'étape visuelle alterne maintenant entre Memory, Trouve l'intrus et Syllabe manquante
- le mot de Syllabe manquante est différent du défi final lorsque le corpus le permet
- test automatique du parcours complet en 5 étapes
- test d'idempotence de la récompense de fin de mission

### Révision
- révision espacée simple par niveau de maîtrise : 1, 3 ou 7 jours
- les erreurs récentes restent prioritaires
- compteur des syllabes à revoir dans le Coin parent

### Statistiques et sauvegarde
- Memory enregistre au maximum une erreur par manche
- atelier Mots validé après 5 mots réellement essayés, sans attribuer de maîtrise
- sauvegardes Supabase sérialisées pour éviter les écritures hors ordre
- backup local automatique avant remplacement par un état distant
- schéma de sauvegarde versionné

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.9.1 — 2026-09-23

### Maintenabilité
- extraction du contenu pédagogique dans `content.js`
- `app.js` ne contient plus les banques de mots, phrases, collectibles et zones
- cache-busting synchronisé pour `content.js`, `app.js` et `styles.css`
- nouveau validateur `scripts/check-content.js`
- CI étendue à la validation structurelle du contenu pédagogique

### Statistiques
- une seule erreur maximum enregistrée par question, même après plusieurs mauvais clics
- les mauvais choix déjà essayés sont désactivés
- statistiques de mission isolées des jeux libres
- compatibilité avec une mission déjà commencée avant la migration
- précision récente affichée dans le Coin parent en plus de la précision globale
- test automatique empêchant les réponses de jeu libre de contaminer le score d'une mission

### Contenu
- densité du premier palier améliorée avec Lili, Mimi, Lola, Mila, Sami et safari
- contrôle automatique des doublons de sons, syllabes, mots, phrases, collectibles et zones

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.9.0 — 2026-09-23

### Architecture
- séparation du monolithe `index.html` en `index.html`, `styles.css` et `app.js`
- cache-busting des assets aligné sur la version de l'application
- validation statique et smoke tests adaptés à la nouvelle architecture
- smoke test étendu à tous les principaux écrans, au parcours mission et à l'écran micro

### Pédagogie
- sons, syllabes, mots et jeux principaux limités au curriculum actuellement débloqué
- validation d'une activité séparée de la simple navigation
- pratique des sons suivie séparément et recalculée quand de nouveaux sons se débloquent
- jeu des phrases débloqué après 8 missions et filtré sur des phrases décodables
- enrichissement du vocabulaire initial avec Lili, Mimi, Lola, Mila, Sami et safari
- annonce visuelle lorsqu'une nouvelle famille de syllabes est débloquée
- affichage de la prochaine famille et du nombre de missions restantes
- feuille de route visuelle des familles et indicateurs des sons déjà pratiqués

### Robustesse et sécurité
- jeux libres principaux eux aussi contenus dans le palier actif
- filtre explicite `parent_id` sur les profils enfants
- contrôle d'appartenance du profil enfant avant sélection
- échappement de l'email et de l'avatar dans le panneau compte
- documentation des politiques RLS Supabase indispensables
- export JSON portable de la progression
- progression globale recalculée selon les activités réellement disponibles
- champ Supabase `completed` basé sur un critère d'apprentissage réel plutôt que sur le nombre de drapeaux

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée.

## 0.8.1 — 2026-09-23

### Corrections
- séparation des tentatives entre jeu libre et mission pour éviter de fausser le score d'une mission
- récupération automatique vers l'accueil si une ancienne sauvegarde contient une vue inconnue
- distracteurs du jeu Construis le mot dédupliqués
- tous les distracteurs de mission restent désormais dans les familles de syllabes débloquées

### Pédagogie
- déblocage progressif des familles de syllabes dans les missions
- les syllabes déjà travaillées restent disponibles même si elles sont hors du palier courant
- lecture de mots, image-mot et construction limités aux mots entièrement décodables avec le corpus actuel
- enrichissement du premier palier avec : silo, solo, miso, sumo, salé
- 8 mots finaux possibles dès le premier palier au lieu de 3

### Tests
- smoke test du curriculum progressif
- smoke test de la séparation jeu libre / mission
- vérification automatique des distracteurs de mission
- vérification de la récupération d'une vue inconnue

### Connu
- la synthèse vocale Safari macOS reste volontairement inchangée dans cette version.

## 0.8.0 — 2026-09-23

### Pédagogie
- missions adaptatives avec priorité aux erreurs récentes
- répétition espacée des syllabes déjà maîtrisées
- 36 mots au total, dont au moins 24 entièrement décodables avec le corpus actuel
- défi Construis le mot limité aux mots réellement assemblables
- alternance Memory / Trouve l'intrus dans les missions
- évitement des mots utilisés dans les 3 dernières missions
- protection contre la répétition artificielle des étoiles et de la maîtrise

### Progression et motivation
- carte Mon Monde
- évolution de Léo
- objectif doux de 5 missions sur 7 jours
- badges
- collection et puzzles
- bilan de chaque mission

### Parent
- tableau de bord de maîtrise
- historique des missions
- diagnostic technique copiable
- recréation de la mission du jour
- sauvegarde locale avant remise à zéro et restauration possible

### Robustesse
- sauvegarde locale immédiate
- résolution local/distant par horodatage
- resynchronisation après reconnexion
- navigation exclue des mises à jour de progression
- fonctionnement local si Supabase est indisponible
- écran de récupération en cas d'erreur runtime
- validation statique et smoke test runtime dans GitHub Actions

### UX
- navigation mobile horizontale compacte
- accueil recentré sur la mission
- jeux libres repliables
- support prefers-reduced-motion
- meilleure navigation clavier
- zones de feedback annoncées aux technologies d'assistance

### Connu
- la synthèse vocale reste non fiable sur Safari macOS ; le moteur audio n'a pas été modifié dans cette version.

## 0.7.0 — 2026-09-23
- Mon Monde, badges, nouveau jeu Trouve l'intrus
- amélioration du tableau parent
- davantage de contenu
- protection initiale contre le farming d'étoiles
- premiers tests automatiques

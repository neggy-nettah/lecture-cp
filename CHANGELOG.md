# Changelog

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

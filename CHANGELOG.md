# Changelog

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

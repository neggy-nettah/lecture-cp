# Audit de l’application — version 0.41.0

## Périmètre

Lecture seule : sons, syllabes, mots, écoute/choix, bulles, intrus, Memory, syllabe manquante, mot/image, construction, ordre des phrases, compréhension et micro bêta. Contrôles complémentaires des missions, récompenses, reprises, petits écrans, profils et sauvegardes.

## Corrections

| Problème | Correction |
| --- | --- |
| Plusieurs prénoms partagent une image ; certaines illustrations sont approximatives | Liste explicite de 17 mots illustrables, avec images distinctes, utilisée par Mot & image et compréhension |
| Un indice audio peut valider une lecture autonome | Récompense conservée, maîtrise non augmentée pour cette question |
| Copier le modèle d’un mot compte comme preuve de lecture | Assemblage récompensé, sans modification de la maîtrise du mot |
| Une image ne permet pas toujours de déterminer le mot à compléter | Bouton pour écouter le mot cible et consigne correspondante |
| Les syllabes écrites de valise et miso masquent une règle de prononciation non enseignée | Mots différés dans les nouveaux exercices et remplacés dans les anciennes étapes de mission concernées |
| Le comparateur vocal confond e et é, ou accepte un simple début de mot | Accents conservés, correspondances explicites, plus de validation par préfixe |
| Le compteur de mots pratiqués peut dépasser son objectif | Compteur plafonné à l’objectif de l’atelier |
| Le retour « J’ai essayé de le lire » disparaît immédiatement | Message affiché après le rafraîchissement de la fiche |
| Chaque effet sonore laisse un contexte audio ouvert | Fermeture après la fin de l’effet |

La règle du s entre voyelles a été recoupée avec la fiche pédagogique de Réseau Canopé : https://lesfondamentaux.reseau-canope.fr/fileadmin/user_upload/fiches_pedagogiques/Fondamentaux_FE480.pdf

## Vérifications reproductibles

- `node scripts/check-app.js` : syntaxe, actions, versions et invariants.
- `node scripts/check-content.js` : catalogue, assemblages, exclusions et images distinctes.
- `node scripts/smoke-runtime.js` : démarrage, progression, contenu accessible et fonctions principales.
- `node scripts/browser-check.js` : navigateur Chromium avec services de compte simulés ; comprend l’audit de tous les paliers et les parcours existants.
- `node scripts/webkit-smoke.js` : smoke test WebKit des écrans principaux, mobile, reprise d’un jeu, mode texte agrandi et compte parent.
- `scripts/audit-games-browser.js` : plus de 1 500 configurations de questions, avec réponses, erreurs, indices, doubles clics, assemblages et phrases ; audio neutralisé pendant ce contrôle de logique.

## Limites explicites

Ces contrôles ne garantissent pas l’absence absolue de bugs. Ils ne valident ni la qualité de prononciation de la synthèse vocale, ni la reconnaissance du micro sur du matériel réel. WebKit est désormais couvert automatiquement, mais le test de la voix Safari macOS reste à faire sur un vrai Mac. Le micro reste un entraînement bêta sans maîtrise ni récompense. La synchronisation réelle entre deux appareils et la réception des emails de récupération nécessitent encore des essais avec un vrai compte. Une relecture pédagogique humaine du contenu reste souhaitable avant commercialisation. Les mots-outils disposent désormais d’une aide audio ciblée ; les mots à e final muet sont différés jusqu’à l’enseignement explicite de cette règle.

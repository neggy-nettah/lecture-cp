# Validation sur appareils réels

Cette checklist couvre uniquement ce que Chromium/WebKit automatisés ne peuvent pas prouver complètement.

## iPhone / iPad

- ouvrir l’app depuis Safari puis depuis l’icône installée sur l’écran d’accueil ;
- lancer une mission, répondre à 2 ou 3 étapes, fermer complètement l’app, la rouvrir et vérifier la reprise ;
- passer en mode avion après un premier chargement et vérifier qu’une mission déjà disponible reste utilisable ;
- revenir en ligne et vérifier que le statut passe à « Progression synchronisée » pour un profil connecté ;
- activer `Aa+` et vérifier qu’aucun bouton ou mot important ne sort de l’écran ;
- écouter plusieurs consignes, syllabes et mots ; vérifier qu’un double appui rapide ne superpose pas deux voix ;
- laisser l’app en arrière-plan quelques minutes puis revenir et vérifier qu’elle reste sur le bon écran.

## Safari macOS

Priorité particulière à l’audio, car WebKit automatisé ne reproduit pas toutes les voix du système.

- ouvrir l’app dans Safari avec le son du Mac actif ;
- cliquer une fois dans la page avant le premier essai audio ;
- tester une consigne de mission, une syllabe, un mot et le modèle de lecture à voix haute ;
- tester le bouton de réécoute plusieurs fois ;
- changer d’écran pendant une voix puis relancer une consigne ;
- recharger la page et recommencer ;
- mettre Safari en arrière-plan puis revenir ;
- vérifier que la voix française reste audible et qu’aucune ancienne voix ne continue en même temps.

## Multi-appareils

Avec le même profil enfant :

1. terminer une activité sur l’iPhone ;
2. attendre l’indication de synchronisation ;
3. ouvrir le profil sur le Mac et vérifier étoiles, mission et maîtrise ;
4. faire une activité différente sur le Mac ;
5. revenir sur l’iPhone et vérifier que les deux progrès sont conservés.

Éviter volontairement les deux appareils **strictement au même instant** pour ce test : la fusion conservatrice est couverte, mais une résolution transactionnelle serveur reste à auditer directement dans Supabase.

## Séance autonome avec Caly

Observer sans guider immédiatement :

- comprend-elle quoi faire grâce à l’audio ?
- trouve-t-elle seule comment réécouter ?
- sait-elle quoi toucher après une erreur ?
- comprend-elle quand une mission est terminée ?
- y a-t-il un écran où elle attend sans savoir quoi faire ?
- clique-t-elle plusieurs fois par impatience ?
- certains textes ou boutons sont-ils trop petits ?
- demande-t-elle de l’aide pour un mot qui n’est pas encore décodable ?

Noter uniquement les blocages réels observés. Ne pas ajouter de nouvelle mécanique pendant cette phase : corriger d’abord les frictions du parcours existant.

## Informations utiles en cas de problème

Dans **Parents**, copier le diagnostic technique. Ajouter simplement :

- appareil et version iOS/macOS ;
- navigateur ;
- écran où le problème est arrivé ;
- ce qui a été touché juste avant ;
- si le problème disparaît après rechargement.

Ne jamais envoyer de mot de passe.

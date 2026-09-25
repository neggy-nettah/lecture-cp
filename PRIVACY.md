# Données et confidentialité — préparation avant diffusion publique

Ce document décrit le fonctionnement **actuel** de l’application. Il sert de checklist technique et produit ; il ne remplace pas une politique de confidentialité juridique adaptée au service final.

## Données utilisées actuellement

### Compte parent

Supabase Auth peut conserver :

- adresse email du parent ;
- identifiant technique du compte ;
- informations techniques nécessaires à la session d’authentification.

Le mot de passe n’est pas stocké dans la progression de l’application, dans les exports ou dans le diagnostic technique.

### Profil enfant

Le modèle actuel utilise :

- un prénom ou pseudo (`nickname`) ;
- le niveau scolaire ;
- un avatar ;
- un identifiant technique du profil ;
- l’identifiant du parent propriétaire côté base.

L’interface doit continuer à accepter et encourager un **pseudo** : aucun nom complet, date de naissance, adresse, école ou localisation n’est nécessaire au fonctionnement pédagogique actuel.

### Progression

La progression peut contenir notamment :

- étoiles et récompenses ;
- activités terminées ;
- réponses/tentatives agrégées ;
- maîtrise des syllabes et mots ;
- file de révision ;
- historique récent des missions ;
- mission en cours ;
- préférences de parcours nécessaires à la reprise.

Le mode invité conserve ces informations dans le navigateur. Un profil connecté peut aussi les synchroniser dans Supabase.

## Données volontairement absentes

Le code actuel n’a pas besoin de :

- géolocalisation ;
- carnet d’adresses ;
- caméra ;
- photos ou vidéos de l’enfant ;
- publicité comportementale ;
- outil d’analytics tiers ;
- enregistrement audio persistant.

Le micro bêta, lorsqu’il est utilisé par un navigateur compatible, ne doit pas être transformé en stockage d’enregistrements ou en profil biométrique sans nouvelle revue explicite.

## Export et diagnostic

L’outil d’export contient la progression et, pour un profil connecté, le pseudo, niveau et avatar de l’enfant. Il ne doit pas contenir l’adresse email du parent.

Le diagnostic technique indique uniquement des informations de fonctionnement (version, navigateur, écran, état connexion/session, vue et compteurs). Il ne doit pas inclure l’email, les identifiants de compte ou de profil, ni le contenu d’un mot de passe.

## Suppression

L’application sait actuellement réinitialiser la progression locale, mais cela ne constitue pas encore un parcours complet de suppression de compte et de données cloud.

Avant diffusion publique, il faut fournir un parcours clair permettant au parent de :

1. supprimer un profil enfant et sa progression cloud ;
2. supprimer son compte et les profils/progressions associés ;
3. comprendre ce qui est supprimé localement et à distance ;
4. exporter les données avant suppression s’il le souhaite.

La suppression cloud ne doit être implémentée qu’après vérification directe des contraintes, clés étrangères, cascades et politiques RLS du projet Supabase.

## Principes de minimisation à préserver

- demander uniquement les données nécessaires ;
- préférer un pseudo enfant à une identité complète ;
- ne pas ajouter de tracking publicitaire ;
- ne pas envoyer le contenu des exercices ou du micro à un service tiers sans besoin pédagogique documenté ;
- ne jamais exposer une clé Supabase secrète ou `service_role` dans le navigateur ;
- protéger toutes les tables exposées avec RLS et des règles de propriété parentale ;
- conserver une fonction d’export de la progression lisible par le parent.

## Blocages avant lancement commercial

- audit réel du projet Supabase et de ses RLS ;
- parcours de suppression profil enfant / compte parent ;
- politique de confidentialité finale et mentions adaptées au public visé ;
- décision documentée sur la durée de conservation des comptes et progressions inactifs ;
- test avec deux comptes parents distincts pour vérifier l’isolation des données ;
- revue de toute nouvelle télémétrie éventuelle avant son ajout.

# Phase de stabilisation

Le projet est temporairement en **gel d’extension pédagogique**. Les nouvelles familles, nouveaux graphèmes et gros ajouts de contenu attendent que le socle produit soit suffisamment robuste.

## Objectif

Pouvoir faire utiliser l’application plusieurs jours sur iPhone, iPad/Mac et plusieurs appareils sans perte de progression, écran bloqué, mise à jour incohérente ou comportement différent après rechargement.

## Priorités avant reprise du contenu

- [x] navigation et reprise des vues centralisées
- [x] état sauvegardé nettoyé et rétrocompatible
- [x] mode dégradé si le stockage navigateur est indisponible
- [x] fusion prudente des progrès local/distant
- [x] tentative de synchronisation distante au passage en arrière-plan
- [x] cache PWA versionné et tests hors ligne
- [x] dépendance Supabase JS figée sur une version exacte
- [x] tests Chromium mobiles/desktop
- [x] smoke test WebKit intégré et vert dans la CI
- [ ] audit direct du projet Supabase : tables, RLS et advisors sécurité
- [ ] vérification audio sur Safari macOS réel
- [ ] plusieurs séances réelles avec Caly sans aide adulte pour relever les frictions UX (`DEVICE_TEST.md`)
- [ ] revue finale confidentialité/données enfant avant diffusion publique
- [ ] revue finale design/identité avant commercialisation

## Règle de travail

Tant que les points techniques automatisables ci-dessus ne sont pas stabilisés, une modification doit prioritairement corriger ou tester le socle existant. Les ajouts pédagogiques ne reprennent qu’après cette phase, sauf correction indispensable du contenu déjà actif.

## Points externes

Le connecteur Supabase de ChatGPT ne retourne actuellement aucun projet accessible. L’audit RLS/base de données ne peut donc pas être validé depuis ici tant que le projet n’est pas visible par ce connecteur.

La synthèse vocale Safari doit également être testée sur un vrai Mac : WebKit automatisé réduit le risque de régression d’interface/JavaScript, mais ne reproduit pas fidèlement toutes les voix et permissions du navigateur Safari installé.

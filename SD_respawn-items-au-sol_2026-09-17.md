# RPG V2 — Session diagnostic : les items au sol ne respawnent pas (2026-09-17)

## Contexte

Validation du palier B de `specs/04_maison-interieur.md` par Xav, 15 h 45, manette, **sur toutes les sauvegardes en stock** (de la plus ancienne à la plus récente) plus des parties neuves. Constat identique partout :

- Le joueur trouve **3 branches et 1 caillou**, toujours aux **mêmes emplacements** (déterminisme attendu, §3.3 Phase 2 : PRNG dédié, graine fixe).
- La hache se crafte (2 branches + 1 caillou), le bois se coupe → palier B partiellement prouvé.
- **La pioche est impossible** : elle demande 2 cailloux, il n'y en a qu'un et **aucun nouvel exemplaire n'apparaît** — ni branche ni caillou — après plus d'une heure de jeu actif à parcourir la carte. Le fruit, lui, respawne (Xav a monté des niveaux en cuisinant en boucle).

Ce que ça veut dire : le respawn différé de 60 s (`respawn_ms`, spec 04 §3.2) fonctionne pour `item_fruit` et pas pour `item_branche` / `item_caillou`, **ou** il fonctionne pour tous mais place les nouveaux exemplaires quelque part où le joueur ne peut pas aller. Cause inconnue → diagnostic, pas patch.

Le test bot « boucle 5 min » de la Phase 3 était censé prouver branches + caillou → hache → bois : il est vert. Il n'a donc jamais eu besoin d'un respawn — c'est un trou du test, à combler dans cette session.

## Hypothèses à trancher (ne pas deviner en silence)

- **H-A** — le respawn différé n'est déclenché que par le **ramassage** dans certaines zones ; le fruit est ramassé près de la maison (zone jardin), branche/caillou dans des zones dont le tirage n'est pas rebranché après la Phase 3 (deux chemins de code : un pour le fruitier, un pour les items de zone). Deux chemins = la cause.
- **H-B** — le respawn se déclenche pour tous, mais le tirage déterministe retire **la même tuile** (même graine, même index) ou une tuile **hors des tuiles franchissables** (sous une structure, sous un arbre bloqué, hors carte) : l'item existe dans l'état, personne ne peut le voir ni le ramasser. Vérifiable : compter les items au sol dans l'état après 60 s vs ce que la carte montre.
- **H-C** — `nb_au_sol` est bien atteint (1 caillou au sol = cible respectée) et le respawn ne déclenche **que si le compte est sous la cible** — mais le ramassage ne décrémente pas le compte pour branche/caillou (item pris, compteur figé à la cible → jamais sous la cible → jamais de tirage). Le fruit passerait par un autre compteur.
- **H-D** — l'échéance du respawn est écrite dans `cooldowns` (temps actif) mais **jamais relue** par `ground_items.js` (ou relue avec `Date.now()`), donc jamais expirée ; le fruit respawnerait par un chemin distinct (H-A).
- H-A, H-C, H-D se recoupent : dans tous les cas la question est **pourquoi le fruit et pas les autres**. La réponse est probablement « deux chemins de code là où la spec en exigeait un ».

## Méthode de diagnostic attendue

1. Partie neuve. Ramasser le caillou. Console : état `ground_items` (liste des exemplaires par item : tuile, échéance de respawn), et le compteur par item. Avancer le temps actif de 61 s (fonction de test, pas d'attente réelle). Relire l'état. Trois issues possibles : (a) aucun nouvel exemplaire → H-A/H-C/H-D, suivre le chemin de code du fruit et celui du caillou côte à côte ; (b) un exemplaire sur une tuile non franchissable ou hors carte → H-B ; (c) un exemplaire sur la tuile d'origine → H-B (graine/index), et alors le rapport de Xav « jamais retrouvé » implique un second problème de rendu à vérifier.
2. Écrire la phrase « la cause est … » dans le journal **avant** de corriger.

## Détail

### Correction attendue (une fois la cause écrite)
- **Un seul chemin** de respawn pour tout item au sol, fruitier compris : ramassage → décrément → échéance en temps actif → à l'échéance, tirage déterministe **parmi les tuiles franchissables de la zone de l'item, atteignables depuis la maison**. « Atteignable » se vérifie avec le chemin critique existant (réutilisé comme fonction, pas comme test) — un item tiré sur une tuile isolée est retiré et redemandé.
- Le tirage déterministe doit **avancer** (index ou graine dérivée du nombre de tirages sauvegardé), sinon le même exemplaire réapparaît au même endroit à chaque fois — acceptable, mais à dire.
- **Donnée actée par Xav** (à appliquer après la correction, pas à la place) : `nb_au_sol` de `item_branche` et `item_caillou` passe de sa valeur actuelle à **2** (le fruit ne change pas). Une ligne de JSON chacun, commentée « équilibrage 2026-09-17, une heure de recherche pour un second caillou ». La pioche (1 branche + 2 cailloux) devient atteignable en un respawn.

### Tests dédiés
- Pour **chaque** item au sol du catalogue (itération sur `items.json`, pas une liste en dur) : ramassage → après `respawn_ms` de temps actif, un nouvel exemplaire existe, sur une tuile franchissable de sa zone, atteignable depuis la porte de la maison ; pas avant `respawn_ms` ; pas pendant une UI ouverte.
- Le bot « boucle 5 min » est étendu : hache → bois → **attente d'un respawn** → second caillou → pioche → pierre. C'est la boucle complète de la spec, et c'est ce qui manquait.
- Test data-driven : un item de test avec `respawn_ms: 1000` et une zone restreinte respawne dans cette zone.

## Contraintes non négociables

- Cause racine avant patch ; aucun `Date.now()` ; le déterminisme reste (même graine → même partie) ; FR + EN si un message change.
- Scope : si le diagnostic révèle que le fruit lui-même respawne sur un chemin parallèle « spécial fruitier », c'est **dans** le chemin direct — unifier. Tout autre problème annexe (rendu d'un item hors caméra, etc.) → documenté, pas corrigé.
- `render.js` non touché a priori ; s'il l'est, checklist visuelle.

## À la fin de la session

(1) quelle hypothèse, (2) pourquoi le fruit respawnait et pas les autres, (3) tests passés avec commandes, (4) le trou du bot de boucle et comment il est bouché, (5) reste ouvert.

## Hors scope explicite

`05_construction-stations.md` ; rareté/quantités des autres recettes ; équilibrage des 60 s (Xav juge après le respawn réparé, pas avant) ; polish UI et déplacement contre les angles (session séparée, à venir).

# RPG V2 — Session diagnostic : blocage après le choix du follet + reset de sauvegarde (2026-09-15)

**À lire d'abord** : `CLAUDE.md` (journal Phase 0 + Phase 1, architecture de focus, `etatNeutre()`, point de décision unique), `specs/02_grotte.md` §3.1 (séquence exacte de la cinématique) et §7 (critères). Ne rien relire d'autre avant d'avoir un verdict.

## Contexte

Test manuel de Xav sur `localhost:8080`, manette, partie neuve : le cold open se joue (clignements, follets, bulle, narration courte), la sélection du follet fonctionne à la manette. **Puis plus rien** : après la confirmation du choix, le héros ne bouge pas, aucune sortie n'est possible. Aucun crash visible. Ce qui se passe entre la confirmation et « déplacement possible » (§3.1 étapes 4 → 5) n'a pas pu être observé.

Décision de Xav : **la grotte est verrouillée avant toute Phase 2** — c'est le point de respawn de tout le jeu. Aucun passage à la suite tant que le critère §7 n'est pas rempli.

## Hypothèses à trancher (ne pas deviner en silence)

Elles ne s'excluent pas : plusieurs peuvent être vraies à la fois.

- **Hypothèse A — l'UI de choix n'est jamais marquée fermée.** L'écran de sélection (bulle + narration) est un écran d'UI ; après confirmation, l'état « une UI est ouverte » reste vrai → `main.js#maj()` continue d'envoyer `etatNeutre()` au gameplay.
- **Hypothèse B — état « cinématique » du héros jamais levé.** Un flag d'immobilité posé à l'étape 1 (clignements) ou 2 (follets) n'est pas retiré à la fin de l'étape 4, parce que la fin de l'animation 3 → 1 / mise en orbite n'émet aucun signal, ou que personne ne l'écoute.
- **Hypothèse C — interblocage temps de jeu / UI.** L'animation 3 → 1 et la mise en orbite avancent sur le temps de jeu ; le temps de jeu est en pause tant qu'une UI est ouverte (règle §4 de la spec) ; l'UI de choix attend la fin de l'animation pour se fermer. Chacun attend l'autre.
- **Hypothèse D — le mode « sélection » capture toujours `MOVE`.** La sélection gauche/milieu/droite consomme l'axe de déplacement ; le mode reste actif après confirmation et le gameplay ne reçoit jamais `move`.
- **Hypothèse E — `flag_follet_choisi` / `hero.companion` non posés**, et la scène rejoue ou attend indéfiniment le choix (edge case §4 : « follet non choisi → la scène 1 rejoue le choix »), sans que l'UI soit ré-affichée.

## Méthode de diagnostic attendue

1. Reproduire en headless : écrire d'abord un test qui joue la séquence §3.1 avec des inputs abstraits (confirmation du choix, puis `move = {x:1, y:0}` pendant N frames) et affirme que la position du héros change. Ce test doit être **rouge** avant correction. S'il est vert, le bug est dans une couche non testée (rendu, input manette) — le dire et remonter d'un cran.
2. Tracer, frame par frame après la confirmation, les trois valeurs : état « UI ouverte » (A), flag d'immobilité du héros (B), temps de jeu qui avance ou non (C). Une seule ligne de log par frame, retirée à la fin.
3. Vérifier ce que reçoit `entities.js` / le héros comme `move` : l'état abstrait fusionné, ou `etatNeutre()` (D vs A).
4. Vérifier la sauvegarde écrite après le choix : `hero.companion` et `flag_follet_choisi` présents (E).
5. Verdict : quelle(s) hypothèse(s) confirmée(s), preuve à l'appui. **Aucun patch avant le verdict.**

## Ordre de traitement

1. **A. Blocage après le choix** — bloquant pour tout le reste.
2. **B. Reset de sauvegarde dans le menu** — spécifié, pas de diagnostic.
3. **C. État des lieux de la Phase 1** — après A, vérifier que le chemin critique de §7.1 est réellement praticable.

## Détail par sujet

### A. Blocage après le choix du follet

Correction attendue selon la cause, en respectant l'architecture déjà en place :
- Si A ou D : la fermeture de l'écran de choix passe par le **même mécanisme** que la fermeture du menu (contrôleur de focus, `etatNeutre` uniquement tant que l'UI est ouverte) — pas un `if` spécial pour la sélection.
- Si B : un seul point qui libère le héros à la fin de la séquence, en données si c'est un enchaînement de durées ; jamais deux flags d'immobilité concurrents.
- Si C : trancher explicitement et le documenter dans `CLAUDE.md` — soit la cinématique n'est **pas** une UI (elle vit sur le temps de jeu, le gameplay est neutre par un état de scène, pas par « UI ouverte »), soit les animations de cinématique avancent sur un temps propre. Le choix doit rester compatible avec « un dialogue met le gameplay en neutre et le temps de jeu en pause » (§3.7).
- Test dédié : celui du point 1 de la méthode, vert après correction, plus un test qui vérifie que **relâcher puis reprendre la manette** après le choix ne recrée pas le blocage.

### B. Réinitialisation de la sauvegarde depuis le menu

Besoin de Xav : retrouver le cold open à volonté pour tester, sans vider le `localStorage` à la main.
- Ajouter une entrée de menu « Réinitialiser la sauvegarde » (clé localisée FR/EN), placée en **dernier** dans le menu existant.
- Deux étapes : l'entrée ouvre un écran de confirmation (« Effacer la partie ? » — Oui / Non, focus par défaut sur **Non**, `B` = Non). Réutiliser `creerControleurMenu()` : c'est un sous-menu de 2 entrées, rien d'autre.
- Oui : suppression de la clé de sauvegarde, remise à zéro de l'état en mémoire, retour au **cold open** (séquence §3.1 depuis le premier clignement) **sans rechargement de page**. Non : retour au menu.
- Fonction pure `reinitialiserSauvegarde()` dans `save.js`, testée : après appel, `charger()` renvoie l'état neuf et `schema_version` courant.
- Vérifier que la suppression n'est pas re-sauvegardée aussitôt par le `visibilitychange` ou une sauvegarde périodique (ordre : effacer → réinitialiser l'état → puis seulement réautoriser les sauvegardes).
- Pas d'option « Nouvelle partie » au menu titre (il n'y a pas de menu titre), pas de slots multiples.

### C. État des lieux Phase 1

Après A, dérouler en headless le chemin critique complet de §7.1 (choix → salle 1 → levier → salle 2 → dialogue → mort du monstre → éclats → séquence de leviers → porte → placeholder) via un test d'intégration à inputs abstraits. Rapporter dans `CLAUDE.md`, sans corriger : ce qui passe, ce qui manque, ce qui est présent mais non branché. Xav retestera à la main (manette, clavier, tactile) sur cette base.

## Contraintes non négociables

- Cause racine avant patch : pas de correctif tant que le test reproducteur n'est pas rouge puis vert.
- Aucune régression de la Phase 0 : `node tools/run_tests.js` intégralement vert, `node --check` sur chaque fichier touché.
- Commentaires et journal en français, `CLAUDE.md` mis à jour avec le verdict.
- Scope : un problème annexe découvert en chemin (rendu, équilibrage, tactile) est **documenté, pas corrigé**, sauf s'il est sur le chemin direct de A.
- Ne pas retoucher `specs/02_grotte.md` : si le diagnostic contredit la spec, le signaler dans `CLAUDE.md` en `[OUVERT]`.

## À la fin de la session

Pour chaque sujet : (1) verdict exact de la cause (hypothèse confirmée, ou aucune), (2) ce qui a été corrigé et pourquoi, (3) tests passés (noms de fichiers), (4) ce qui reste ouvert. Pour C : la liste factuelle « fait / manque / non branché » par rapport à §7.

## Hors scope explicite

- Qualité graphique (rudimentaire, assumé pour l'instant).
- Résolution logique (toujours `[OUVERT]` en spec).
- Équilibrage des valeurs de combat et de synergies.
- Phase 2 : ne rien commencer.

# Journal de session — Phase 0

**Date :** 2026-09-15  
**Fiche(s) associée(s) :** `specs/01_socle-technique.md`

## Journal de session — Phase 0 (2026-09-15)

### Décisions prises et pourquoi

- **`package.json` avec `"type": "module"`, zéro dépendance.** Nécessaire pour utiliser `import`/`export` nativement à la fois sous Node (tests) et dans le navigateur, sans bundler ni transpilation — conforme à la contrainte « pas de framework de jeu, pas de bundler obligatoire ».
- **`registry.js` et `save.js` rendus purs, I/O externalisée.** `registry.js` ne fait que valider/indexer des données déjà parsées ; `io_node.js` (fs) et `io_navigateur.js` (fetch) les lui fournissent. `save.js` ne connaît qu'une interface `{ lire, ecrire }` ; `storage_indexeddb.js` l'implémente pour le jeu, un store en mémoire pour les tests. Choix dicté par la contrainte « aucun accès DOM/fs au niveau module » et « chaque fichier de `/src` doit rester importable depuis Node ».
- **`unlocks.target` déclaré comme référence croisée vers `flags`** dans `schemas.js` (en plus de ce qu'exigeait littéralement la spec), pour que la cohérence flags/unlocks soit vérifiée au boot comme toute autre référence — pas de code spécial ajouté ailleurs.
- **Mapping manette (ABXY→attaque/skills, gâchette→consommable, LB→interact, Start→menu) marqué `provisoire`** dans `input/gamepad.js` : la spec fixe ABXY et la gâchette, le reste (interact/menu) est un choix raisonnable non encore validé à la manette par Xav.
- **Seuils numériques** (`VITESSE_HERO_PX_S=120`, `RAYON_HERO_PX=10`, `INTERVALLE_AUTOSAVE_MS=30000`, densité de décor `0.15`, `DELTA_MAX_MS=100`) centralisés chacun à un seul endroit, commentés, marqués provisoires — aucun n'a été joué/validé par Xav.
- **Test « zéro chaîne en dur »** limité à `ui/menu.js` (seul point du code qui affiche du texte joueur) et au `<body>` de `index.html`, plutôt qu'un grep généraliste sur tout `/src` : un grep large aurait aussi capturé des id de données, des couleurs, des messages d'erreur de boot (diagnostics développeur, hors scope de la contrainte).

### Livré et validé

Arborescence posée (`/src`, `/data`, `/locales`, `/tests`, `/tools`, `index.html`, `serveur_local.js`, `package.json`), specs déplacées dans `/specs/`, dépôt git initialisé.

Les 6 contrats techniques de la Phase 0 sont chacun prouvés par un test dédié :

```
node tools/run_tests.js
```
→ 7 fichiers, tous verts (`test_phase0_registry`, `_input`, `_scene_camera`, `_render_delta`, `_save`, `_flags`, `_i18n`, tous datés `2026-09-15`).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides (vérifié à la fin de session).

Vérification manuelle complémentaire (navigateur réel, `node serveur_local.js` + Chrome) : boot sans erreur console, scène `salle_test` rendue conforme au JSON (murs, sol, eau, sortie, décor), caméra correctement centrée (scène < viewport), bascule de langue FR/EN opérationnelle dans le menu, sauvegarde/rechargement via IndexedDB confirmés par un cycle écrire → recharger la page → relire. La résolution de collision (`resoudreDeplacement`) a été vérifiée directement en console : bloque contre un mur, autrement libre.

**Non vérifiable dans cette session** : le déplacement du héros piloté par la boucle `requestAnimationFrame` en conditions réelles de rendu (l'environnement d'automatisation utilisé ne déclenche pas `requestAnimationFrame`, y compris pour un script de test totalement indépendant du jeu — limite de l'outil, pas du code : la logique qu'elle appelle, elle, est testée et validée). Le déplacement manette/clavier à l'écran reste donc à confirmer par Xav dans un vrai navigateur, comme prévu par le critère de passage.

### Hors scope (reporté)

Tout gameplay (combat, feux follets, énigmes, récolte, dialogue, HUD de jeu), le tactile, l'audio, le packaging, les animations/sprites du héros, le pipeline Sheet→JSON dans `/tools`, le rechargement à chaud complet : reportés à la Phase 1 (ou Phase 7 pour le packaging), conformément à `specs/01_socle-technique.md` §8.

Aucun point de design produit n'a été laissé `[OUVERT]` cette session — tous les choix rencontrés étaient soit déjà tranchés dans les specs, soit des seuils techniques provisoires couverts par la contrainte de méthode correspondante.

### Critère de passage — reste à faire par Xav

**Mise à jour 2026-09-15 (micro-ticket navigation menu manette, voir section suivante)** : le hot-swap manette ↔ clavier (débrancher/rebrancher en marchant) est **validé** par Xav. Il ne reste que le parcours menu ci-dessous.

Lancer `node serveur_local.js`, ouvrir `http://localhost:8080` dans un navigateur, brancher une manette : Start → un élément est visiblement sélectionné (bordure + `›`) → stick bas → la sélection descend → A sur la bascule de langue → le texte passe en EN → Start → le menu se ferme, **le héros n'a pas bougé pendant que le menu était ouvert**. Rejouer le même parcours au clavier (flèches + Entrée + Échap). Vérifier que la souris fonctionne toujours (survol + clic). Ce parcours réussi valide le critère de passage de la Phase 0.


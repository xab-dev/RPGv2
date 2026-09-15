# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

**Phase 0 (Socle technique) livrée et validée** — voir le journal de session en fin de fichier pour le détail exact de ce qui a été prouvé. Le dépôt contient désormais le code du socle (`/src`, `/data`, `/locales`, `/tests`, `index.html`, `serveur_local.js`, `package.json`) en plus des specs, déplacées dans `/specs/` :

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contient le contexte projet, les décisions déjà tranchées (à ne jamais rouvrir), les contraintes de méthode non négociables, et le détail de la phase en cours.
- `specs/01_socle-technique.md` — spec détaillée de la Phase 0, livrée dans cette session.
- `specs/carte_mentale_RPG_V2_v1_2_0.md` — référence complète des décisions produit/techniques verrouillées (§0 et §8 notamment) et de la règle d'architecture directrice (§7).

**Avant toute action de code**, lire `specs/00_ROADMAP.md` en entier, puis le fichier `0N_*.md` de la phase courante dans `specs/`. Ne pas rouvrir une décision déjà actée dans ces documents — un point de design non tranché se marque `[OUVERT]` dans ce fichier et remonte à l'utilisateur (dev = Xav), il ne se tranche jamais en silence.

## Le projet

RPG action-aventure 2D en HTML5 / JS / Canvas, en 3 éléments (Feu / Eau / Terre), entièrement data-driven en JSON externes, jouable à la manette sur PC (référence) et au tactile sur mobile (en parallèle, jamais en portage tardif). Gratuit, sans pub ni achat, 100 % hors-ligne, bilingue FR/EN. Refonte complète d'un prototype V1 jetable (`monde/rpg_v0_1_0.js`, hors de ce dépôt) — aucune ligne de la V1 n'est reprise, seuls certains patrons architecturaux validés le sont (tables déclaratives, scène avec `world` calculé, dialogue généralisé, décor procédural à graine fixe, tests headless sans framework).

Développement par sessions isolées, une phase par session. Chaque phase est détaillée dans son propre fichier `0N_*.md` au moment où elle devient courante.

## Règle d'architecture directrice

> On ne spécifie pas seulement ce que le jeu doit faire aujourd'hui. On spécifie comment le jeu doit pouvoir accepter ce qu'on n'a pas encore imaginé.

Test à appliquer à chaque catalogue de données : ajouter une entrée (arme, ennemi, recette, compagnon…) doit être possible **en ajoutant une entrée JSON, sans toucher une ligne de code de système**. Si ce n'est pas le cas, le catalogue n'est pas livré.

## Contraintes de méthode non négociables

- **Cause racine avant tout patch** — jamais de rustine sur un symptôme.
- **Zéro chaîne en dur** — tout texte visible passe par la localisation FR/EN (`t("clé")`) dès la Phase 0.
- **Zéro dépendance du gameplay à un périphérique** — aucun `KeyboardEvent`, `TouchEvent` ou `Gamepad` en dehors de la couche d'input ; le gameplay ne connaît que des verbes (`MOVE, ATTACK, SKILL_1..3, CONSUME, INTERACT, MENU`).
- **Tout commentaire de code et texte d'UI en français**, style « contexte suffisant pour reconstruire le raisonnement » — un commentaire dit *pourquoi*, jamais *quoi*.
- **Séparation stricte des modules** : registre (données) / input (périphériques) / scène (monde) / rendu (canvas) / save (persistance). Une phase future doit pouvoir remplacer le rendu sans toucher au reste.
- **Tout seuil numérique** (vitesse, `tile_size`, intervalle de sauvegarde, plafond de delta-time) déclaré en un seul endroit, commenté avec son *pourquoi*, marqué **provisoire** s'il n'a pas été validé en jeu.
- **Discipline de scope** : si une tâche déborde du brief, s'arrêter au dernier palier stable et documenter ce qui reste hors scope dans le `CLAUDE.md` du projet. Aucun système généralisé avant qu'un second cas d'usage réel existe, sauf les catalogues data-driven listés dans les specs.
- **Le rendu canvas n'est jamais exercé par les tests headless** — toute vérification visuelle revient à Xav dans un vrai navigateur, à la manette.
- Pas de framework de jeu, pas de bundler obligatoire. Une dépendance de **dev** (ex. validateur de schéma type `ajv`) est acceptable tant qu'elle reste hors du jeu servi.
- Servi en `http://` (jamais `file://`) ; modules ES natifs. Chaque fichier de `/src` doit rester importable depuis Node pour les tests headless — aucun accès DOM au niveau module.

## Commandes

- Vérification syntaxique : `node --check <fichier>.js` sur chaque fichier JS livré (aucune dépendance, `package.json` déclare `"type": "module"`).
- Tests : `node tests/<nom>.js` pour un fichier isolé, ou `node tools/run_tests.js` (= `npm test`) pour toute la suite d'un coup. Pas de framework de test, scripts headless autonomes basés sur `node:assert/strict`.
- Serveur local : `node serveur_local.js` (statique, sans dépendance, réponses `no-store`), sert le jeu sur `http://localhost:8080`.

## Architecture (Phase 0, livrée)

```
rpg_v2/
├── index.html              mise en page seulement, zéro logique
├── serveur_local.js        statique, sans dépendance, no-store
├── package.json            "type": "module", zéro dépendance runtime ou dev
├── src/
│   ├── main.js             boot (§3.1) : locales+catalogues → validation → registre → save → scène → boucle
│   ├── registry.js         validerCatalogues() / construireRegistre() — pur, sans I/O
│   ├── schemas.js          schéma par catalogue (champs requis, id, refs, validation custom)
│   ├── io_node.js          chargement disque (fs) — tests et outillage Node uniquement
│   ├── io_navigateur.js    chargement réseau (fetch) — jeu servi au navigateur uniquement
│   ├── storage_indexeddb.js adaptateur IndexedDB pour save.js (jamais importé par les tests)
│   ├── input/              input.js (fusion clavier+manette en verbes), gamepad.js, keyboard.js
│   ├── scene.js            chargement de scène depuis le registre, collisions 4 coins + glissement
│   ├── camera.js           bornée sur grande scène, centrée sur scène plus petite que le viewport
│   ├── decor.js            procédural déterministe (PRNG mulberry32 sur scene.seed)
│   ├── render.js           plafonnerDelta (pur, testé) + boucle rAF + dessinerScene (jamais testés headless)
│   ├── save.js             double tampon, versions, migrations — indépendant du support de stockage
│   ├── flags.js            registre de flags + conditions all/any/not imbriquées
│   ├── i18n.js
│   └── ui/menu.js          langue, export/import save — jamais de texte littéral, toujours i18n.t()
├── data/                   catalogues JSON (voir specs/01_socle-technique.md §2.1)
├── locales/fr.json, en.json
├── specs/                  00_ROADMAP.md, 01_socle-technique.md, carte_mentale_RPG_V2_v1_2_0.md
├── tests/                  test_phase0_{registry,input,scene_camera,render_delta,save,flags,i18n}_2026-09-15.js
└── tools/run_tests.js      lance tous les tests/*.js en séquence (confort de `npm test`)
```

`registry.js` est volontairement pur (aucun accès disque/réseau) : `io_node.js` et `io_navigateur.js` sont les deux adaptateurs qui lui fournissent des données déjà parsées, l'un pour les tests/outillage, l'autre pour le jeu réel. Même principe pour `save.js`, qui ne connaît qu'une interface `{ lire, ecrire }` — `storage_indexeddb.js` l'implémente pour le navigateur, `creerStoreMemoire()` (dans save.js) pour les tests.

Six contrats techniques que la Phase 0 doit prouver (chacun avec un test dédié) : données en JSON validées au boot avec échec dur si invalide ; couche d'input abstraite (verbes, pas de périphérique) ; scène = layout de tuiles JSON rendu par une caméra bornée ; sauvegarde unique, versionnée, en double tampon (IndexedDB, jamais `localStorage` seul) ; registre de flags central avec conditions `all`/`any`/`not` imbriquées ; aucun texte en dur (FR/EN complets).

Convention d'`id` dans les catalogues : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`, `stat_force`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `carte_mentale_RPG_V2_v1_2_0.md` §0 et §8. Points structurants pour le code :

- 3 éléments (Feu/Eau/Terre), extensibles en données uniquement.
- 4 stats primaires : Force, Agilité, Vitalité, Esprit. Esprit = réserve de skills uniquement ; tout le scaling de dégâts converge sur Force, l'élément porte le type/les interactions, jamais la puissance brute.
- 5 slots d'action (1 attaque + 3 skills + 1 consommable), 3 slots d'équipement (arme/armure/accessoire) — nombres déclarés en données.
- Progression sur deux axes indépendants : XP → stats (combat et craft), jalons narratifs → capacités.
- Système de recettes unique ; stations et catégories de sortie en données.
- Cartes : tuiles réutilisables, layout écrit à la main en JSON, décor non-collisionnant procédural à graine fixe — jamais de génération procédurale de layout jouable.
- Narration diffuse, aucun journal de quêtes, aucun objectif affiché ; un journal de découvertes existe (ce qui a été trouvé, jamais ce qu'il faut faire).
- Périmètre M1 fermé : Grotte-tutoriel → Région Maison → 1ère zone de monstres → Château → Boss 1 → Poste avancé. Console/cartouches/Codex/alignement bien-mal = M2+.

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

Lancer `node serveur_local.js`, ouvrir `http://localhost:8080` dans un navigateur, brancher une manette, déplacer le héros dans `salle_test`, buter contre un mur, changer de langue par le menu (`Échap`), fermer l'onglet, rouvrir : le héros doit être où il a été laissé, dans la même langue. Débrancher la manette en marchant doit faire s'arrêter le héros, sans que le clavier ne soit affecté.

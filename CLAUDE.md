# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

**Phase 0 (Socle technique) validée.** **Phase 1 (La Grotte) + Phase 1b (polish, `specs/03_grotte-polish.md`, 4/4 paliers) livrées, validées en jeu à la manette réelle, DA validée** (2026-09-16, après cinq diagnostics correctifs listés dans les journaux ci-dessous — voir en particulier `specs/SD_grotte-blocage-choix-follet_2026-09-15.md`, `specs/SD_ui-lisibilite_2026-09-15.md`, `specs/SD_menu-reset-invisible_2026-09-15.md`, `specs/MT_rendu-net_2026-09-15.md`, `specs/SD_dialogues-invisibles_2026-09-15.md`). **Tactile en dette assumée jusqu'à la Phase 4** (compétences). **Phase 2 (Région Maison) est la phase courante — spec à venir : `04_maison-exterieur.md`.** Voir les journaux de session en fin de fichier pour le détail exact de ce qui a été prouvé et de ce qui reste à confirmer en jeu. Le dépôt contient le code du socle et de la Phase 1/1b (`/src`, `/data`, `/locales`, `/tests`, `index.html`, `serveur_local.js`, `package.json`) en plus des specs, déplacées dans `/specs/` :

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contient le contexte projet, les décisions déjà tranchées (à ne jamais rouvrir), les contraintes de méthode non négociables, et le détail de la phase en cours.
- `specs/01_socle-technique.md` — spec détaillée de la Phase 0.
- `specs/02_grotte.md` — spec détaillée de la Phase 1.
- `specs/03_grotte-polish.md` — spec détaillée de la Phase 1b (polish/verrouillage de la Grotte), livrée, 4/4 paliers.
- `specs/carte_mentale_RPG_V2_v1_3_0.md` — référence complète des décisions produit/techniques verrouillées (§0 et §8 notamment) et de la règle d'architecture directrice (§7).

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
- **Toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure** (`save`/`restore` ou re-`setTransform` en fin de fonction, commenté pourquoi) — jamais de `setTransform` inline dans `main.js#dessiner()`. Née du diagnostic `SD_dialogues-invisibles_2026-09-15.md` : un calque qui lit `ctx.canvas.width/height` pour se positionner alors qu'une transform logique->physique est active double la mise à l'échelle, sans qu'aucun test headless ne puisse l'attraper. **Tout ticket touchant `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou `main.js#dessiner()` rejoue `specs/CHECKLIST_visuelle.md` (capture par état) avant de conclure** — même quand le ticket prétend ne toucher qu'un seul de ces fichiers en isolation.
- Pas de framework de jeu, pas de bundler obligatoire. Une dépendance de **dev** (ex. validateur de schéma type `ajv`) est acceptable tant qu'elle reste hors du jeu servi.
- Servi en `http://` (jamais `file://`) ; modules ES natifs. Chaque fichier de `/src` doit rester importable depuis Node pour les tests headless — aucun accès DOM au niveau module.

## Commandes

- Vérification syntaxique : `node --check <fichier>.js` sur chaque fichier JS livré (aucune dépendance, `package.json` déclare `"type": "module"`).
- Tests : `node tests/<nom>.js` pour un fichier isolé, ou `node tools/run_tests.js` (= `npm test`) pour toute la suite d'un coup. Pas de framework de test, scripts headless autonomes basés sur `node:assert/strict`.
- Serveur local : `node serveur_local.js` (statique, sans dépendance, réponses `no-store`), sert le jeu sur `http://localhost:8080`.

## Architecture (Phase 0 + Phase 1, livrées)

```
rpg_v2/
├── index.html              mise en page seulement, zéro logique
├── serveur_local.js        statique, sans dépendance, no-store
├── package.json            "type": "module", zéro dépendance runtime ou dev
├── src/
│   ├── main.js             demarrerJeu() = boot DOM/réseau/IndexedDB uniquement ;
│   │                       creerOrchestrateurGrotte() (exporté) = tout le reste (choix du
│   │                       follet, combat, énigmes, dialogue, portails, reinitialiserPartie) —
│   │                       extrait de demarrerJeu() pendant le diagnostic 2026-09-15 pour rester
│   │                       importable/testable depuis Node sans DOM ; script propre à cette
│   │                       scène, pas un système généralisé (cf. journaux Phase 1 et diagnostic)
│   ├── registry.js         validerCatalogues() / construireRegistre() — pur, sans I/O
│   ├── schemas.js          schéma par catalogue (champs requis, id, refs, validation custom)
│   ├── io_node.js          chargement disque (fs) — tests et outillage Node uniquement
│   ├── io_navigateur.js    chargement réseau (fetch) — jeu servi au navigateur uniquement
│   ├── storage_indexeddb.js adaptateur IndexedDB pour save.js (jamais importé par les tests)
│   ├── input/              input.js (fusion clavier+manette+tactile en verbes), gamepad.js,
│   │                       keyboard.js (+ reset sur `blur`, cf. journal diagnostic 2026-09-15),
│   │                       touch.js (joystick virtuel + boutons, §2.3)
│   ├── scene.js            scène + collisions 4 coins/glissement + portes conditionnelles
│   │                       (flag → tuile effective) + portailFranchi() (transitions de scène)
│   ├── camera.js           bornée sur grande scène, centrée sur scène plus petite que le viewport
│   ├── decor.js            procédural déterministe (PRNG mulberry32, exporté — réutilisé par loot.js)
│   ├── render.js           plafonnerDelta + résolution logique/échelle entière/présentation
│   │                       (purs, testés) + boucle rAF + dessinerScene/dessinerObscurite
│   │                       (jamais testés headless)
│   ├── save.js             double tampon, versions (v2), migrations, reinitialiserSauvegarde()
│   │                       (menu, §B diagnostic 2026-09-15) — indépendant du stockage
│   ├── flags.js            registre de flags + conditions all/any/not + `initial` (persistance)
│   ├── stats.js            stats primaires + dérivées (formule linéaire en données)
│   ├── status.js           effets d'état (buff/dot/debuff/controle), un seul chemin de calcul
│   ├── entities.js         héros/monstres : PV, position, mort/respawn
│   ├── combat.js           auto-attaque annulaire (portée d'arme), cooldown
│   ├── companion.js        follet : suivre/engager, position (+ lumière collée)
│   ├── loot.js             résolution de loot table (PRNG injectable)
│   ├── puzzles.js          interprète les types levier/sequence (instances en données)
│   ├── dialogue.js         file de lignes + avancement, résolution locuteur "follet"
│   ├── i18n.js
│   └── ui/                 menu.js (DOM ; +écran de confirmation « Réinitialiser la
│                           sauvegarde », §B diagnostic 2026-09-15), hud.js + dialogue_box.js
│                           + hud_layout.js (canvas, résolution logique — jamais testés headless)
├── data/                   catalogues JSON (voir specs/01_socle-technique.md §2.1, specs/02_grotte.md §2.1)
├── locales/fr.json, en.json
├── specs/                  00_ROADMAP.md, 01_socle-technique.md, 02_grotte.md,
│                           carte_mentale_RPG_V2_v1_3_0.md, SD_grotte-blocage-choix-follet_2026-09-15.md
├── tests/                  test_phase0_*, test_menu_navigation_*, test_phase1_* (2026-09-15)
└── tools/run_tests.js      lance tous les tests/*.js en séquence (confort de `npm test`)
```

`registry.js` est volontairement pur (aucun accès disque/réseau) : `io_node.js` et `io_navigateur.js` sont les deux adaptateurs qui lui fournissent des données déjà parsées, l'un pour les tests/outillage, l'autre pour le jeu réel. Même principe pour `save.js`, qui ne connaît qu'une interface `{ lire, ecrire }` — `storage_indexeddb.js` l'implémente pour le navigateur, `creerStoreMemoire()` (dans save.js) pour les tests.

Six contrats techniques que la Phase 0 a prouvés (chacun avec un test dédié) : données en JSON validées au boot avec échec dur si invalide ; couche d'input abstraite (verbes, pas de périphérique) ; scène = layout de tuiles JSON rendu par une caméra bornée ; sauvegarde unique, versionnée, en double tampon (IndexedDB, jamais `localStorage` seul) ; registre de flags central avec conditions `all`/`any`/`not` imbriquées ; aucun texte en dur (FR/EN complets).

Convention d'`id` dans les catalogues : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`, `stat_force`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `carte_mentale_RPG_V2_v1_3_0.md` §0 et §8. Points structurants pour le code :

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

**Mise à jour 2026-09-15 (micro-ticket navigation menu manette, voir section suivante)** : le hot-swap manette ↔ clavier (débrancher/rebrancher en marchant) est **validé** par Xav. Il ne reste que le parcours menu ci-dessous.

Lancer `node serveur_local.js`, ouvrir `http://localhost:8080` dans un navigateur, brancher une manette : Start → un élément est visiblement sélectionné (bordure + `›`) → stick bas → la sélection descend → A sur la bascule de langue → le texte passe en EN → Start → le menu se ferme, **le héros n'a pas bougé pendant que le menu était ouvert**. Rejouer le même parcours au clavier (flèches + Entrée + Échap). Vérifier que la souris fonctionne toujours (survol + clic). Ce parcours réussi valide le critère de passage de la Phase 0.

## Micro-ticket — navigation du menu à la manette (2026-09-15)

Contexte complet dans `MT_menu-manette_2026-09-15.md` (racine du dépôt). Deux bugs bloquant le critère de passage de la Phase 0 : le menu n'avait aucun focus/sélection manette, et le héros continuait de bouger quand le menu était ouvert.

### Mapping retenu (provisoire, non validé à la manette par Xav)

Même statut que les autres mappings de `gamepad.js` — provisoire jusqu'à test manuel :

| Action menu | Verbe | Détail |
|---|---|---|
| Élément précédent/suivant | `MOVE` (y), front montant uniquement | seuil `SEUIL_POUSSEE_MENU = 0.5` dans `ui/menu.js` ; la croix directionnelle n'alimente pas `MOVE` donc n'y participe pas |
| Valider l'élément focalisé | `ATTACK` (pressed) | convention manette (A = confirmer), pas une décision de gameplay |
| Fermer le menu | focaliser « Fermer » puis `ATTACK`, ou `skill_3` (pressed) | **révisé 2026-09-15** (micro-fix, retour Xav) — `MENU`/Start n'ouvre plus qu'un menu fermé (`etat.menu.pressed && !menu.estOuvert()` dans `main.js`), il ne le ferme plus ; `skill_3` réutilisé comme convention manette « B = retour » (mappé sur B dans `gamepad.js`), via l'option `verbeAnnuler` de `creerControleurMenu()` — ferme immédiatement sans passer par le focus |

Pas de boucle circulaire aux bornes de la liste (provisoire, à valider).

### Cause racine du bug « héros mobile sous le menu »

`main.js#maj()` lisait `etat.move` pour déplacer le héros sans jamais regarder si le menu était ouvert : les verbes atteignaient gameplay et UI en même temps, sans arbitrage. Corrigé par un **point de décision unique** dans `main.js#maj()` : `menuOuvert` est calculé une fois, et si vrai, le gameplay reçoit `etatNeutre(etat)` (verbes à faux, `move` à `{0,0}`) au lieu de `etat`. `etatNeutre()` vit dans `input.js` (exportée, pure, dérivée de la forme réelle de l'état plutôt que d'une liste de verbes recopiée) car c'est le module qui possède la forme de l'état — pas une duplication dans `main.js`. Aucun autre `if (menuOuvert)` ailleurs dans le code.

### Architecture de focus (réutilisable par les futurs écrans d'UI)

`ui/menu.js` expose désormais, en plus de `initialiserMenu()` (DOM) :
- `creerNavigationMenu(nbElements)` — index borné, avance sur front montant de `MOVE.y` uniquement, pure.
- `creerControleurMenu(actions, options)` — ouverture/fermeture/index/dispatch de l'action focalisée sur `ATTACK`, pure (les `actions` sont des callbacks fournis par l'appelant, jamais de DOM ici). `options.verbeAnnuler` (optionnel, ex. `'skill_3'`) ferme immédiatement sans passer par le focus — chaque futur écran d'UI choisit s'il l'active.

`initialiserMenu()` fournit à `creerControleurMenu()` des actions qui, elles, touchent le DOM (bascule FR/EN, `exporterSauvegarde()`, `.click()` sur l'input fichier — la même fonction que le clic souris, pas une copie). Le rendu du focus (bordure + marqueur `›`) est appliqué en style inline depuis `menu.js`, sans toucher `index.html` (hors périmètre du ticket).

### Tests rejoués

```
node tests/test_menu_navigation_2026-09-15.js
node tools/run_tests.js
```
→ 8 fichiers, tous verts.

```
node --check src/ui/menu.js src/input/input.js src/main.js tests/test_menu_navigation_2026-09-15.js
```
→ tous valides.

Vérification manuelle en navigateur réel (souris/clavier, sans manette branchée pour cette session) : reportée à Xav — voir bloc « Critère de passage » ci-dessus.

### Décision produit à reporter dans la carte mentale (C3③)

**Croix directionnelle réservée à de futures actions secondaires, n'alimente jamais `MOVE`** (décision Xav, 2026-09-15). `input/gamepad.js` n'a pas été touché par ce ticket — cette décision y était déjà respectée, elle n'est actée ici que pour mémoire et report dans `carte_mentale_RPG_V2_v1_3_0.md` au prochain patch.

### Hors scope (reporté)

Répétition automatique en `held` (défilement continu), navigation horizontale/grilles, remapping joueur (C3⑤), tactile, tout ajout d'élément au menu — cf. `MT_menu-manette_2026-09-15.md`.

## Journal de session — Phase 1 : La Grotte (2026-09-15)

Spec complète : `specs/02_grotte.md`. Session livrée dans la continuité de la Phase 0 (le micro-ticket menu-manette ci-dessus était déjà fait et validé par Xav au démarrage de cette session).

### Décisions prises et pourquoi

- **`stats_derivees.json` en catalogue séparé de `stats.json`**, plutôt qu'un champ `derivees` ajouté aux entrées de `stats.json` comme le suggérait la formulation littérale de la spec (§2.1). Une entrée dérivée n'a pas la même forme qu'une stat primaire (`stat` cible + `formule` au lieu de `base`), et `registry.js` valide génériquement chaque catalogue comme un tableau homogène : mélanger les deux formes dans un seul fichier aurait cassé cette généricité ou forcé un cas spécial dans `registry.js`, contraire à sa nature volontairement pure. Chaque dérivée porte une formule linéaire `{ base, coefficient, min }` sur une stat primaire — un seul chemin de calcul (`stats.js`), une 3ᵉ dérivée s'ajoute en JSON seulement (prouvé par un test dédié).
- **`vitesse_deplacement` reste une constante** (`VITESSE_HERO_PX_S` de la Phase 0), pas une 3ᵉ dérivée — la spec laissait le choix (« f(agilité) ou constante », §3.5). Seules `pv_max` et `cooldown_attaque_ms` sont dérivées.
- **Effets d'état interprétés par la forme des champs, pas par un switch sur l'id** (`status.js`) : un effet avec `stat` modifie une stat primaire (buff joueur ou debuff monstre, même fonction `appliquerModificateur`), un effet avec `param: "pv"` est un DoT, un effet avec `param: "vitesse_deplacement"` est un contrôle de vitesse. "Dans l'aura" est approximé par l'état d'engagement du follet (`follet.etat === 'engager'`) plutôt qu'un second calcul de distance — source de vérité unique tant qu'un seul monstre est engageable à la fois (à réévaluer en Phase 4 si plusieurs monstres doivent être dans l'aura simultanément).
- **`puzzles.json` ne contient que des instances**, pas de catalogue de "types" séparé : `levier` et `sequence` sont des interpréteurs fixes dans `puzzles.js` (comme `comportement: "melee"` pour les ennemis), les instances (positions, `ordre[]`, `flag_pose`) sont 100 % données. Une séquence supplémentaire ailleurs = JSON seulement (prouvé par un test dédié) ; un 3ᵉ *type* de puzzle demanderait du code, ce qui est cohérent avec la spec (« ajouter une 3ᵉ **instance** d'un type existant », §3.8).
- **Portes conditionnelles = extension de `scene.js`, pas un système séparé** : `scenes.json > portes[]` fait correspondre une position à `{ flag, tile_avant, tile_apres }` ; `tuileA()`/`estSolideAuPoint()` prennent un 3ᵉ paramètre optionnel `estFlagActif` (absent par défaut = comportement Phase 0 inchangé, donc aucune régression sur les tests existants). La porte de la salle 2 est donc un mur (`tile_mur`, solide) tant que `flag_grotte_sortie` n'est pas posé, et devient `tile_sortie` (traversable) dès qu'il l'est, sans recharger la scène — exactement le comportement décrit en §3.3 (« la porte apparaît »).
- **Portails = donnée `scenes.json > portails[]` avec `condition` optionnelle**, résolus par `scene.js#portailFranchi()` : une condition non remplie ne fait rien (§4 : « simple mur, aucun message »), jamais une exception. Combiné aux portes conditionnelles ci-dessus pour la sortie de la grotte.
- **Écran de choix du follet : navigation par `MOVE.x` (front montant) + confirmation `ATTACK`, y compris au tactile**, plutôt qu'un tap direct sur le sprite de chaque follet comme le décrivait littéralement la spec (§3.1 : « tactile = tap direct »). Le tactile alimente déjà `move.x` (joystick) et `attack` (bouton) via la même couche d'input que clavier/manette : ajouter un second mécanisme de hit-test tactile spécifique à cet unique écran aurait dupliqué l'abstraction existante pour un gain marginal. Peut être révisé en Phase 2+ si Xav juge le tap direct nécessaire à l'usage.
- **La séquence de la grotte (choix du follet, tutoriel de combat, déclenchement des dialogues) est un script dans `main.js` keyé par id de scène**, pas un système de "déclencheurs" généralisé — conforme à la contrainte de méthode (« aucun système généralisé avant qu'un second cas d'usage réel existe ») et au rôle de la Phase 1 (prouver chaque système une fois, §1). `dialogues.json > declencheur` reste un champ descriptif (documentation du contexte), pas encore interprété génériquement.
- **`onUnlock` de `flags.js` sert de point d'accroche à la persistance** (`initial` au constructeur + callback qui écrit dans `save.flags`), plutôt que de faire lire/écrire `save.flags` directement par `flags.js`. Le module reste pur (aucune connaissance de `save`) ; c'est `main.js` qui fournit le pont. `initial` ne repasse jamais par `set()`/`onUnlock` pour ne pas rejouer les effets de bord (ex. rouvrir un dialogue) d'une session précédente au chargement.
- **Repli sur `scene_grotte_salle_1` si `save.hero.scene` ne résout à aucune scène connue** (`main.js`, avant `entrerDansScene`) : trouvé nécessaire en testant dans un vrai navigateur — une sauvegarde IndexedDB de la session Phase 0 pointait encore vers `scene_salle_test`, retirée de `scenes.json` en Phase 1. Ce n'est pas une sauvegarde corrompue (le schéma est valide), donc `save.js#migrer` ne l'attrape pas ; un crash au chargement de scène aurait bloqué Xav dès l'ouverture. Cause racine : un renommage de contenu de catalogue n'est pas couvert par le mécanisme de migration de *schéma*. Cette classe de problème est à garder en tête pour toute Phase future qui retire un id de scène.
- **Le calcul des stats du héros (`calculerStatsHeros` dans `main.js`) tourne à chaque frame, y compris quand une UI est ouverte** — trouvé en testant en navigateur : la cinématique d'ouverture affichait « HP 0/1 » parce que le calcul vivait à l'intérieur de `mettreAJourCombat()`, elle-même sautée tant qu'une UI est ouverte (§4 : le combat est en pause sous UI). Séparé du reste du combat : seul le calcul de stats est inconditionnel, la progression du combat (dégâts, DoT, portails) reste bien gelée sous UI.
- **Layout des boutons tactiles resserré à l'origine (§2.1), repositionné en éventail** (`ui/hud_layout.js`) — même découverte en navigateur : le premier jet (boutons entre x:480-610, y:220-300) se chevauchait visuellement. Toujours provisoire/non validé par Xav, juste plus lisible.

### Livré et validé

Les 8 systèmes de la spec sont chacun prouvés par un test dédié (headless, sans framework) :

```
node tools/run_tests.js
```
→ 19 fichiers, tous verts (7 fichiers Phase 0 + menu-manette + 11 fichiers Phase 1 : `stats`, `combat`, `status_synergies`, `companion`, `puzzles`, `dialogue`, `loot`, `touch`, `save_migration_1_2`, `scene_portes`, `render_resolution`, tous datés `2026-09-15`).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

Vérification manuelle en navigateur réel (`node serveur_local.js` + Chrome, sans manette ni tactile réel pour cette session — voir « reste à faire » ci-dessous) : boot sans erreur console jusqu'à la cinématique de choix du follet ; dialogue d'introduction affiché et avancé par `ATTACK` ; les 3 follets rendus avec une forme distincte (triangle/goutte/carré, P4②) ; navigation `MOVE.x` entre les 3 puis confirmation ; follet Terre choisi → dialogue d'enthousiasme affiché avec le bon nom traduit (« Earth Wisp ») ; **PV recalculés en direct après le choix (50/58, soit `10 + 8×(5+1)` — le buff `buff_vitalite` de Terre appliqué)** ; menu manette/clavier toujours fonctionnel (ouverture par `Escape`, bascule de langue, fermeture) pendant que le jeu tourne derrière ; `INTERACT` déclenché sans erreur près du levier. Cette session a aussi trouvé et corrigé deux bugs réels via ce test manuel (voir décisions ci-dessus : repli de scène, calcul de stats sous UI) — la vérification en navigateur réel, même partielle, s'est donc avérée nécessaire au-delà des tests headless.

### Non vérifiable dans cette session (reste à faire par Xav)

- **Manette et tactile réels** : la session a testé au clavier (événements `KeyboardEvent` synthétiques) et n'a pas pu brancher une manette physique ni simuler un écran tactile réel. Les mappings (`gamepad.js`, `touch.js`) sont testés headless mais jamais exercés en conditions réelles cette fois-ci.
- **Le parcours complet de la grotte** (salle 1 → levier → salle 2 → combat → séquence des 3 leviers → porte → sortie) n'a été rejoué que partiellement (jusqu'au choix du follet + un `INTERACT`). Le combat, la mort/respawn, la séquence d'énigme et la transition de scène par portail n'ont été vérifiés qu'en tests headless, jamais en jeu réel.
- **Lisibilité de la résolution 640×360** (§9, `[OUVERT]`) : non jugée cette session, la résolution logique a seulement été vérifiée fonctionnelle (mise à l'échelle entière, letterboxing), pas son confort visuel.
- **Layout des boutons tactiles** : repositionné une fois pendant cette session (voir ci-dessus) mais jamais testé avec de vrais doigts sur un écran tactile.
- **Équilibrage du combat** (2-3 coups pour tuer le premier monstre, dégâts reçus ≤10 % des PV) : vérifié par un test automatisé qui rejoue la formule sur les vraies données, jamais en conditions de jeu réelles (rythme, lisibilité du feedback).

### Point `[OUVERT]`

Aucun nouveau point de design n'a été laissé `[OUVERT]` cette session — le seul hérité de la spec (résolution logique 640×360 vs 480×270 vs 960×540, §9 de `specs/02_grotte.md`) reste non tranché, valeur provisoire 640×360 appliquée en attendant le verdict de Xav.

### Critère de passage — reste à faire par Xav

Reprendre le parcours manuel décrit en §7 de `specs/02_grotte.md` : manette **et** tactile, cinématique → choix du follet → salle 1 (levier, sortie) → salle 2 (dialogue, monstre tué, éclats ramassés, séquence des 3 leviers trouvée sans indication) → porte → scène placeholder ; à refaire avec chacun des 3 follets pour sentir la différence des trois effets (brûlure/ralentissement/dégâts réduits), et donner un verdict sur la résolution 640×360.

### Hors scope pour cette itération

Région Maison réelle (Phase 2, la porte de la grotte mène à un placeholder vide, assumé) ; compétences/consommables/équipement/inventaire complet (slots grisés seulement) ; audio ; sprites/animations ; pathfinding ennemi et archétypes autres que `melee` ; choix dans les dialogues, PNJ ; journal de découvertes — tous conformes à `specs/02_grotte.md` §8. Décisions actées pour les phases futures (portée par équipement, respawn/malus survie, boissons/potions) consignées en §10 de la spec, non implémentées ici par construction.

## Journal de session — Diagnostic blocage choix du follet (2026-09-15)

Brief complet : `specs/SD_grotte-blocage-choix-follet_2026-09-15.md`. Trois sujets traités dans l'ordre imposé (A bloquant, puis B, puis C).

### A. Blocage après le choix du follet

**Verdict : aucune des hypothèses A à E de la fiche de diagnostic n'est confirmée.** Méthode suivie à la lettre (§1 de la fiche) :

1. **Refactor préalable, nécessaire pour reproduire en headless sur le vrai code** (pas une réimplémentation) : `main.js` était un unique `demarrerJeu()` mêlant boot DOM/réseau/IndexedDB et toute la logique de la Grotte, donc impossible à importer depuis Node. Extrait en `export function creerOrchestrateurGrotte(deps)` — tout ce qui ne touche pas le DOM (choix du follet, dialogue, combat, énigmes, portails, flags, reinitialiserPartie) — tandis que `demarrerJeu()` ne fait plus que construire canvas/input/menu/store et lui passer en dépendances. Aucun changement de comportement ; `flags` et `hero` sont passés de `const` à `let` (réaffectables) pour permettre à `reinitialiserPartie()` — cf. §B — de les reconstruire sans redémarrer le process.
2. **Test rouge-avant-patch** (`tests/test_phase1_sd_grotte_choix_follet_2026-09-15.js`) : rejoue exactement la séquence narration → choix → confirmation → dialogue d'enthousiasme → `move` sur le vrai `creerOrchestrateurGrotte`, avec des inputs abstraits proprement front-montant (appui puis relâchement explicite, comme le ferait réellement une manette). **Résultat : vert dès l'écriture** — la machine à états (`uiOuverte`, fermeture/ouverture de `dialogue`, `choixFollet`) est correcte telle qu'écrite.
3. **Vérification en navigateur réel** (`node serveur_local.js` + Chrome, piloté par l'agent via `KeyboardEvent` réels dispatchés sur `window`, IndexedDB lu/écrit directement pour observer l'état) : le parcours complet — narration → choix → confirmation → dialogue d'enthousiasme → déplacement `KeyD` — fonctionne de bout en bout ; la position du héros en base (lue dans IndexedDB) est passée de `x=80` (spawn) à `x≈250` après ~1,4 s de touche tenue, cohérent avec `VITESSE_HERO_PX_S=120`. La boîte de dialogue reste parfaitement lisible par-dessus le calque d'obscurité (elle est dessinée après). **Aucune exception, aucun message dans la console** à aucun moment.
4. Conclusion imposée par la méthode elle-même (§1 de la fiche : « si vert, le bug est dans une couche non testée — le dire, remonter d'un cran ») : le blocage ne vient pas de la machine à états choix-follet/dialogue, qui est saine. En creusant plus loin, une cause plausible et **structurelle** a été trouvée, indépendante de cette scène précise :

**Cause racine identifiée et corrigée** (pas listée dans les hypothèses A-E de la fiche, découverte en remontant d'un cran comme prévu) : `src/input/input.js#creerCoucheInput` fusionne clavier + manette + tactile par un simple OR par verbe sur un `held` partagé (`brut = clavier[v] || manette[v] || tactile[v]`). Un navigateur **ne garantit aucun `keyup`** si la fenêtre perd le focus (alt-tab, clic hors fenêtre, notification système) pendant qu'une touche est physiquement enfoncée — comportement standard, documenté, pas une bizarrerie de cet environnement. `src/input/keyboard.js` n'avait **aucun filet** pour ce cas (contrairement à `gamepad.js`, qui retombe déjà à `held=false` sur débranchement, et `touch.js`, qui gère déjà `touchcancel`) : une touche ainsi bloquée à "enfoncée" empêche alors **la manette et le tactile** de produire le moindre front montant sur ce même verbe, pour toujours, sans la moindre erreur — exactement « aucun crash visible, plus rien » tel que rapporté. Reproduit rouge (`tests/test_phase1_sd_input_verbe_bloque_2026-09-15.js` : appui Espace puis `blur` simulé sans `keyup`, puis appui manette qui ne produit plus de front montant), corrigé par un écouteur `blur` dans `keyboard.js` qui vide `touchesEnfoncees` (même principe défensif que les deux autres sources), test vert après correctif.
   - **Limite honnête de ce verdict** : cette session n'a pas pu brancher de manette physique (contrainte de l'environnement d'automatisation, comme pour la Phase 0/1). Le mécanisme ci-dessus est confirmé comme un bug réel et généralisable (pas hypothétique), et colle exactement au symptôme rapporté, mais n'a pas pu être rejoué avec la manette de Xav précisément pour vérifier que c'est bien *ce* déclencheur-là chez lui. **À la manette, si le blocage revient malgré ce correctif, le signaler avec un détail précieux : la fenêtre a-t-elle perdu le focus (alt-tab, notification, clic ailleurs) juste avant le blocage ?**
   - Repli en cours de route : découvert que `document.hidden`/le throttling `requestAnimationFrame` de Chrome sous automatisation faussait plusieurs tentatives de reproduction en navigateur (le jeu se figeait tant que l'onglet n'était pas visible/focalisé — artefact de l'outil, pas du jeu). Signalé ici pour mémoire, aucune action côté jeu.

Tests rejoués : `node tools/run_tests.js` → tous verts (voir liste complète ci-dessous, §Livré).

### B. Réinitialisation de la sauvegarde depuis le menu

Livré selon la spec de la fiche, sans écart :
- `save.js#reinitialiserSauvegarde(store)` : réécrit une `saveNeuve()` via la même discipline double tampon que `sauvegarder()` (pas de suppression brute de clés) — après appel, `charger()` renvoie toujours une partie neuve valide à `schema_version` courante. Testé (`test_phase1_sd_reset_sauvegarde_2026-09-15.js`).
- `main.js#creerOrchestrateurGrotte` expose `reinitialiserPartie()` : efface le store, **puis seulement** mute `save` en place (jamais réassigné — `demarrerJeu()` et l'export de sauvegarde du menu partagent la même référence), reconstruit `flags` (désormais réaffectable), un `hero` neuf, ferme tout dialogue, remet `etatModifie=false` et `dernierAutosave` à jour, puis rejoue `entrerDansScene()` — qui rouvre naturellement la narration du choix puisque `flag_follet_choisi` vient d'être effacé. Ordre non négociable de la fiche respecté (effacer → réinitialiser l'état → réautoriser les sauvegardes) : testé explicitement (une frame d'autosave après reset ne fait jamais resurgir l'ancien état).
- `ui/menu.js` : 5ᵉ entrée « Réinitialiser la sauvegarde » (dernière avant Fermer), ouvre un sous-écran de confirmation à 2 entrées (`creerControleurMenu`, focus par défaut sur **Non**, `skill_3`/B = Non) — écran DOM séparé, jamais les deux visibles en même temps. Le point de couture avec l'orchestrateur (construit après le menu, qui en a lui-même besoin) passe par un setter explicite `menu.definirActionReinitialiser(fn)`, câblé dans `demarrerJeu()` juste après la construction de l'orchestrateur — pas d'import circulaire vers `main.js`.
- 4 clés de locale ajoutées FR/EN (`menu.reset_sauvegarde`, `menu.reset_confirmation_titre`, `menu.reset_oui`, `menu.reset_non`), jeux de clés toujours identiques (`test_phase0_i18n` vert).

**Non vérifié visuellement** : l'écran de confirmation DOM lui-même (`ui/menu.js`) n'a pas pu être exercé en navigateur réel dans cette session (même artefact de throttling d'onglet caché rencontré au point A) — seule la logique qu'il déclenche (`reinitialiserPartie()`) est testée bout en bout en headless. Conforme à la contrainte de méthode (rendu/DOM jamais testé headless), mais ce point précis reste à confirmer par Xav en jeu réel : ouvrir le menu, naviguer jusqu'à « Réinitialiser la sauvegarde », vérifier que le focus par défaut est bien sur **Non**, et que **Oui** renvoie bien au cold open sans recharger la page.

### C. État des lieux Phase 1 (chemin critique §7.1)

Après correction de A, le chemin critique complet de `specs/02_grotte.md` §7.1 a été rejoué en headless sur le vrai code (`tests/test_phase1_sd_audit_chemin_critique_2026-09-15.js`, inputs abstraits, données réelles de `/data`) : choix du follet → salle 1 (levier → `flag_levier_salle1`) → sortie → salle 2 (dialogue tutoriel déclenché à l'entrée → follet engagé à portée → monstre tué en un temps raisonnable → éclats ramassés → dialogue d'introduction) → séquence des 3 leviers (milieu → gauche → droite) → `flag_grotte_sequence` → `unlock_porte_salle2` pose `flag_grotte_sortie` → porte devenue traversable → portail vers `scene_maison_exterieur_placeholder`.

**Fait** : les 14 étapes ci-dessus passent toutes, sans aucune correction nécessaire — la chaîne combat/follet/énigmes/dialogue/portails/flags/unlocks est réellement branchée de bout en bout, pas seulement système par système comme le prouvaient déjà les tests unitaires de la Phase 1.

**Manque (signalé, non corrigé — hors chemin direct de A/B)** : la cinématique décrite en `specs/02_grotte.md` §3.1 étapes 1-2 (2-3 clignements d'yeux flou→net→noir, puis les trois follets qui *apparaissent* et se mettent à tourner autour du héros avant que la bulle de choix n'apparaisse) **n'a pas de code** dans ce dépôt — aucune occurrence de « clignement » ni d'animation d'apparition/orbite pré-choix dans `/src`. Le jeu actuel entre directement dans la narration du choix (étape 3) dès l'entrée en scène. Ce n'est pas une régression de cette session (le journal Phase 1 décrit déjà uniquement « dialogue d'introduction affiché » sans mentionner de clignements), mais c'est un écart factuel vis-à-vis de la spec que Xav doit trancher : combler l'étape manquante, ou acter que la spec est mise à jour pour refléter l'implémentation actuelle (choix direct, sans clignements/orbite préalables).

**Non branché** : rien trouvé dans cette catégorie lors de cet audit — tout ce qui a été exercé était soit fait, soit absent (clignements ci-dessus), rien n'était présent en données/code sans être relié à l'appelant.

### Livré et validé (session diagnostic)

```
node tools/run_tests.js
```
→ 23 fichiers, tous verts : les 19 de la session Phase 1 + `test_phase1_sd_grotte_choix_follet`, `test_phase1_sd_input_verbe_bloque`, `test_phase1_sd_reset_sauvegarde`, `test_phase1_sd_audit_chemin_critique`.

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

Fichiers modifiés : `src/main.js` (refactor orchestrateur + `reinitialiserPartie`), `src/input/keyboard.js` (filet `blur`), `src/save.js` (`reinitialiserSauvegarde`), `src/ui/menu.js` (écran de confirmation), `locales/fr.json`, `locales/en.json`, `tests/test_phase0_input_2026-09-15.js` (fixture de faux DOM étendue à `blur`, cassée par le nouvel écouteur).

### Point `[OUVERT]`

**Le point « Manque » de C** (clignements/orbite pré-choix, §3.1 étapes 1-2 non implémentées) est nouvellement remonté ici — à trancher par Xav : combler ou acter l'écart de spec. Le point hérité (résolution logique 640×360, §9 de `specs/02_grotte.md`) reste non tranché, inchangé par cette session.

### Critère de passage — reste à faire par Xav

Reprendre le parcours manuel de `specs/02_grotte.md` §7 **à la manette réelle** (bloquant : jamais testé en conditions réelles, ni dans cette session ni dans la précédente) et au tactile, en prêtant une attention particulière à l'exact moment où le blocage se reproduirait s'il se reproduit (cf. la question posée en A ci-dessus). Vérifier en plus, dans le menu : la nouvelle entrée « Réinitialiser la sauvegarde », le focus par défaut sur Non, et que Oui ramène bien au cold open sans recharger la page.

### Hors scope pour cette session

Qualité graphique, résolution logique (`[OUVERT]` toujours), équilibrage des valeurs de combat/synergies, Phase 2 — tous explicitement exclus par la fiche de diagnostic. Combler les clignements/orbite pré-choix (§C ci-dessus) n'a pas été fait : signalé, pas corrigé, en attente du verdict de Xav.

## Journal de session — Diagnostic lisibilité de l'UI (2026-09-15)

Brief complet : `specs/SD_ui-lisibilite_2026-09-15.md`. Quatre sujets traités dans l'ordre imposé par la fiche (3 tactile, 1 résolution, 2 obscurité/lumière, 4 HUD).

### 3. Tactile — verdict par hypothèse

Toutes les hypothèses de la fiche étaient vraies, plus une trouvée en cours de route :

- **3a confirmée** (`ui/hud.js` dessinait `boutonsTactiles()` sans jamais lire un état « tactile actif ») — corrigée : `dessinerHud()` ne dessine les boutons/joystick que si `tactileActif` est vrai, sinon dessine la ligne statique de 5 slots en bas au centre (§4), jamais les deux.
- **3b non confirmée telle quelle** : `input/touch.js` n'a jamais écouté `mousedown`/`pointerdown` (seulement `touchstart/move/end/cancel`), donc la souris n'activait déjà rien. Testé explicitement (`test_phase1_sd_ui_tactile`, test 2) pour que ça reste vrai si quelqu'un ajoute un jour un écouteur souris par erreur.
- **3c confirmée** : la conversion écran → logique du hit-test tactile vivait recopiée en inline dans `main.js` (une formule dupliquée de `calculerRectanglePresentation`, jamais testée séparément). Extraite en fonction pure exportée `render.js#versCoordonneesLogiques()` (réciproque de la présentation), testée en aller-retour et en conditions d'échelle/offset non triviales (`test_phase1_render_resolution` test 6, `test_phase1_sd_ui_tactile` test 6). `main.js` et `touch.js` partagent maintenant cette unique fonction.
- **Trouvée en testant en navigateur réel, absente des hypothèses A-E de la fiche** : le premier jet de l'extinction tactile (§3, « éteindre si clavier/manette repris ») recalculait `tactileActif` à zéro chaque frame à partir de `sourceTactile.estActif()` (qui reste vrai à vie dès le premier `touchstart`, par design). Résultat vert en tests headless (qui ne rejouaient qu'un aller simple clavier→relâchement), mais en navigateur réel : relâcher la touche clavier rallumait instantanément les boutons tactiles fantômes — l'exact inverse du but de l'extinction. Cause racine : il faut un **loquet**, pas une valeur dérivée. Corrigé par un compteur de contacts exposé par `touch.js` (`compteurContacts()`, incrémenté à chaque `touchstart`, jamais décrémenté) : `input.js` ne rallume `tactileActif` que sur un **nouveau** contact (le compteur a changé depuis la frame précédente), et ne l'éteint que sur un signal clavier/manette réel — en dehors de ces deux fronts, l'état précédent est conservé tel quel. Reproduit et vérifié à la fois en tests headless (`test_phase1_sd_ui_tactile`, tests 4/4b) et en navigateur réel (capture d'écran : boutons tactiles apparus après un `touchstart` simulé, éteints par un appui clavier, restés éteints après relâchement de la touche, rallumés par un nouveau `touchstart`).
- Positions/rayons repositionnés en 480×270 (`ui/hud_layout.js`) selon les valeurs de la fiche : attaque (420,210) rayon 28, 3 skills + consommable en éventail (x≥330, y≥120), interact au-dessus du joystick (70,130), joystick (70,200), menu (455,20).

### 1. Résolution 480×270 + salles agrandies

`[OUVERT]` §9 **fermé** : résolution logique passée à **480×270** dans `render.js#RESOLUTION_LOGIQUE` (seul endroit), marquée validée par Xav sur capture (2026-09-15), plus provisoire. À reporter dans `specs/02_grotte.md` §9 et dans `carte_mentale_RPG_V2_v1_3_0.md` au prochain patch (pas fait ici, conformément à la consigne de la fiche).

Salles de la grotte agrandies de 10×7 à **20×14** (18×12 de sol utile, murs compris) dans `data/scenes.json` — la caméra borde désormais au lieu de centrer dans le vide. Structure jouable conservée (spawn → levier → sortie en salle 1 ; spawn → monstre → 3 leviers en séquence → porte → sortie en salle 2), toutes les positions (`data/puzzles.json`, `spawns[]`, `portails[]`, `portes[]`) recalculées en cohérence. `scene_maison_exterieur_placeholder` inchangée (Phase 2).

`tests/test_phase1_sd_audit_chemin_critique` rejoué avec les nouvelles coordonnées — une étape (« Follet engagé sur le monstre à portée ») a d'abord échoué à cause d'un artefact de méthode de test, pas d'une régression réelle : le test visait la position de spawn *figée* du monstre, mais celui-ci chasse le héros dès l'entrée en salle (§3.5, inchangé) — sur les petites salles Phase 1, le héros arrivait toujours avant que le monstre n'ait eu le temps de trop dériver ; sur les salles agrandies, le trajet plus long laissait le temps au monstre de converger puis de re-diverger, si bien que le héros atteignait le point de spawn fixe *après* que le follet se soit déjà désengagé. Corrigé en visant la position *réelle* du monstre à chaque frame (nouvel helper `avancerVersMonstre`) plutôt qu'un point fixe — aucune ligne de `main.js`/`companion.js` touchée, uniquement le test.

### 2. Obscurité et lumière

**Cause racine trouvée en vérifiant le rendu en navigateur réel** (pas dans les hypothèses 2a/2b/2c de la fiche, qui portaient sur des réglages) : `render.js#dessinerObscurite` peignait le voile et perçait ses trous en « destination-out » **directement sur le même canvas que la scène venait d'être dessinée**. Or percer un trou de cette façon n'y révèle pas la scène dessinée juste avant : ça l'**efface** (scène et voile sont déjà fusionnés en un seul bitmap à ce stade). Le "halo" ne montrait donc jamais les murs/sol/héros — juste du noir/transparent, avec seulement une frange d'anti-aliasing à peine visible sur le pourtour du dégradé. Ça correspond exactement au symptôme rapporté par Xav (« halo à peine perceptible, aucun mur visible, même dans la lumière ») et existait déjà avant cette session (même schéma dans l'ancien code, seule l'opacité/le dégradé différaient). Repéré uniquement parce qu'une vérification en navigateur réel (capture d'écran) montrait un disque de couleur plein sans aucune silhouette dedans, alors que les tests headless — qui n'exercent jamais le rendu canvas par contrainte de méthode — ne pouvaient pas l'attraper. Corrigé en donnant au voile son **propre canvas hors-écran** : le voile + ses trous sont peints là, puis ce calque est composé par-dessus la scène déjà dessinée via `drawImage` (composition `source-over` par défaut) — opaque assombrit, trou transparent laisse la scène intacte en dessous. Vérifié en navigateur réel après correctif : héros, follet et décor bien visibles à l'intérieur du halo.

Valeurs retenues, toutes en un seul endroit (`render.js`), commentées, provisoires :
- **`OPACITE_OBSCURITE_MAX = 0.72`** (voile `rgb(6, 10, 16)`, bleuté plutôt que noir pur) — remplace l'ancien 0,94 qui ne laissait plus rien lire hors halo.
- **`RATIO_COEUR_LUMIERE = 0.35`** : le dégradé de chaque source de lumière reste à opacité pleine (trou total) jusqu'à 35 % de son rayon, puis décroît doucement jusqu'au bord — un dégradé qui décroît dès le centre (comportement d'avant) ne donne jamais de zone franchement éclairée.
- **Teinte chaude du follet** : calque additif (`globalCompositeOperation = 'lighter'`) dessiné après la composition du voile, avec la couleur déjà déclarée dans `companions.render.couleur` (orange/bleu/or selon l'élément) — jamais appliquée aux lumières statiques (le halo d'entrée reste un simple percement neutre, pas une source magique).
- **`rayon_lumiere`** des 3 follets porté de 90 à **110** px logiques dans `data/companions.json`.
- **Halo d'entrée** de `scene_grotte_salle_1` (`lumieres[]`, déjà présent dans le schéma et déjà interprété par le rendu avant cette session — hypothèse 2c déjà vraie) repositionné sur le nouveau spawn et son rayon porté à **140** px logiques.
- **Aura du follet (`rayon_aura`)** : n'était **jamais dessinée** avant cette session (trouvé en cherchant `rayon_aura` dans `/src` — seul `status.js`/`schemas.js` la référencaient, aucun rendu). Ajoutée dans `main.js#dessiner()` : cercle à trait fin blanc translucide (`rgba(255,255,255,0.35)`, 1px), jamais un disque plein — purement visuel, **aucun changement** à `companion.js#DISTANCE_ENGAGEMENT_PX` (gameplay/équilibrage, hors scope).
- Un 2ᵉ `lumieres[]` sur une scène de test passe la validation sans toucher de code (`tests/test_phase1_sd_ui_lumieres`, data-only comme prévu par la fiche).

### 4. HUD compact

`ui/hud.js` réécrit selon le patron V1 décrit par la fiche : cartouche haut-gauche (`rgba(0,0,0,0.55)`, coins arrondis 4px, padding 6px, largeur 120px logiques) contenant la forme du follet actif en tête de la ligne PV (remplace l'ancienne icône isolée sous le HUD), la barre PV (12px, valeur centrée **dans** la barre, police 9px), puis la ligne éclats (`◆` + valeur). 5 slots d'action (16px, 4px d'écart) en bas au centre **seulement** quand le tactile est inactif ; sur tactile, les boutons de `hud_layout.js` sont les slots, jamais les deux affichés en même temps. Étiquette ennemi (nom seul, pas de niveau — le champ n'existe pas en Phase 1) ajoutée dans `render.js#dessinerScene`, résolue/traduite par `main.js` (qui a `i18n`+`registre`) et passée déjà traduite au rendu.

### Livré et validé

```
node tools/run_tests.js
```
→ 25 fichiers, tous verts : les 23 précédents + `test_phase1_sd_ui_tactile`, `test_phase1_sd_ui_lumieres` (nouveaux), `test_phase1_render_resolution` et `test_phase1_sd_audit_chemin_critique` réécrits pour les nouvelles valeurs/coordonnées.

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent dans cette session** (`node serveur_local.js` + Chrome piloté par automatisation, sauvegarde IndexedDB existante rechargée) — au-delà des tests headless, comme la Phase 1 et le diagnostic précédent l'ont déjà montré nécessaire pour ce projet :
- Salle 2 remplit tout le viewport à l'échelle ×2 (vs. un rectangle ~640×450 dans du noir avant cette session) ; boutons tactiles absents tant qu'aucun `touchstart` n'a eu lieu ; cartouche HUD compact avec follet/PV/éclats corrects ; 5 slots statiques en bas au centre.
- Après un `touchstart` simulé : boutons tactiles + joystick apparus aux positions attendues, ligne statique disparue.
- Après une touche clavier : boutons tactiles disparus, ligne statique réapparue — et **restée** disparue après relâchement de la touche (contrat du loquet).
- Après un nouveau `touchstart` : boutons tactiles réapparus.
- Déplacement clavier (`KeyboardEvent` réels, tenue ~700ms) : héros déplacé, caméra a suivi et a bien bordé sur la salle agrandie (jamais centrée dans le vide).
- Menu (`Escape`) : ouvert/fermé correctement par-dessus le jeu, contenu inchangé (5ᵉ entrée réinitialisation toujours présente).
- Halo du follet : héros (cercle blanc) et follet (cercle coloré) tous deux nettement visibles à l'intérieur d'un disque lumineux teinté, aucune exception ni erreur console à aucun moment.
- **Non testé par l'agent, comme dans toutes les sessions précédentes** : manette physique et écran tactile réel (l'environnement d'automatisation ne peut ni brancher l'un ni simuler l'autre plus finement qu'un `touchstart` synthétique) — reste le critère de passage pour Xav.

Fichiers modifiés : `src/render.js` (résolution, `versCoordonneesLogiques`, `dessinerObscurite` réécrite avec canvas hors-écran, étiquette ennemi dans `dessinerScene`), `src/input/input.js` (loquet `tactileActif`), `src/input/touch.js` (`compteurContacts`), `src/ui/hud.js` (réécrit), `src/ui/hud_layout.js` (repositionné 480×270), `src/main.js` (branchement `versCoordonneesLogiques`/`input.tactileActif()`, aura du follet, étiquette ennemi, écran de choix repositionné, `sourceTactile` retiré de la signature de l'orchestrateur car plus lu), `data/companions.json` (`rayon_lumiere`), `data/scenes.json` (salles agrandies + halo d'entrée), `data/puzzles.json` (positions des leviers), `tests/test_phase1_render_resolution_2026-09-15.js`, `tests/test_phase1_sd_audit_chemin_critique_2026-09-15.js`, `tests/test_phase1_sd_ui_tactile_2026-09-15.js` (nouveau), `tests/test_phase1_sd_ui_lumieres_2026-09-15.js` (nouveau).

### Point `[OUVERT]`

Fermé cette session : résolution logique (§9 de `specs/02_grotte.md`, 480×270 validé — report dans la spec et la carte mentale au prochain patch). Hérité, toujours ouvert : clignements/orbite pré-choix (§3.1 étapes 1-2, diagnostic précédent).

### Critère de passage — reste à faire par Xav

Reprendre le parcours manuel de la fiche (`specs/SD_ui-lisibilite_2026-09-15.md`, section « Test de validation ») **à la manette et au tactile réels** — bloquant, jamais testé en conditions réelles par aucune session jusqu'ici : confirmer que les cibles tactiles (≥48px écran) sont bien atteignables au doigt, que le mapping manette reste cohérent sur les salles agrandies, et donner un verdict sur le confort visuel de l'obscurité/lumière et du HUD compact en jeu (valeurs toutes provisoires sauf la résolution). Rejouer la grotte avec chacun des 3 follets pour comparer les teintes de lumière (orange/bleu/or).

### Hors scope pour cette session

Sprites/animations, décor graphique de la grotte, clignements/orbite pré-choix (hérité, non traité), journal de découvertes, création de personnage/équipement/inventaire, audio, équilibrage, Phase 2 — tous explicitement exclus par la fiche.

## Journal de session — Diagnostic écran de confirmation du reset invisible (2026-09-15)

Brief complet : `specs/SD_menu-reset-invisible_2026-09-15.md`. Suite directe de l'avertissement du diagnostic « blocage choix du follet » §B (« l'écran de confirmation DOM lui-même n'a pas pu être exercé en navigateur réel »).

### Hypothèse confirmée et ligne fautive

**Hypothèses C et D combinées.** `index.html:10` ne stylise que `#menu` (`position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; ...`) — aucune règle ne cible `#menu-confirmation-reset`, conformément à la contrainte « `index.html` reste sans logique » (il ne connaît pas les id des éléments que `menu.js` crée dynamiquement). Or `src/ui/menu.js` posait déjà le style de focus en inline (bordure, curseur) mais **ne posait aucun style inline équivalent au positionnement plein écran** sur `confirmation` — contrairement à ce que suggérait la fiche (« le style est censé être inline »). Résultat : `confirmation.hidden = false` retirait bien l'attribut (logique d'ouverture saine, comme l'avait déjà établi Xav en aveugle), mais sans `position`/`display`, l'élément restait en flux normal statique, donc hors du rectangle visible (`body { overflow: hidden }`) — invisible bien que fonctionnellement ouvert. Hypothèses A (non attaché au document) et B (imbriqué comme enfant du menu principal) explicitement écartées par test (`confirmation` est bien un frère de `conteneur`, tous deux enfants directs de `document.body`).

### Correctif et test rouge → vert

Un premier test qui n'aurait lu que `.hidden` serait resté vert dès l'écriture (la logique d'ouverture était déjà correcte) — conformément à la règle du diagnostic précédent (« si vert, remonter d'un cran »), `tests/test_phase1_sd_menu_reset_invisible_2026-09-15.js` (faux DOM minimal écrit pour l'occasion, aucune dépendance) vérifie la **visibilité effective** (`hidden` ET `style.display`), pas seulement l'attribut — rouge avant patch sur ce point précis, vert après.

Correctif dans `src/ui/menu.js` :
- `appliquerStylePleinEcran(el)` : pose en inline, sur `confirmation` uniquement, le même habillage que `#menu` obtient via CSS (position, fond, centrage flex) — `conteneur`/`#menu` n'a pas été touché, il fonctionnait déjà.
- `afficherEcran(el, visible)` : **point unique** d'affichage/masquage (`hidden` + `style.display`), utilisé pour les deux écrans partout où le code touchait auparavant `.hidden` directement (9 sites d'appel unifiés) — un `display` inline resté figé sur `flex` aurait sinon annulé l'effet de `hidden` (une valeur inline bat la règle UA `[hidden]{display:none}`), d'où la nécessité que les deux changent toujours ensemble, au même endroit. Implémente directement l'indication C de la fiche (« faire passer les deux écrans par la même fonction »).
- `index.html` non modifié (conforme à la contrainte du ticket) ; `reinitialiserPartie()`, `save.js`, `creerControleurMenu()` non touchés (déjà validés en jeu réel).

### Vérification en navigateur réel

**Non effectuée cette session** : l'extension Chrome pilotée par l'agent (`claude-in-chrome`) n'était pas connectée dans cet environnement (`tabs_context_mcp` a échoué deux fois de suite avec « Browser extension is not connected »), contrairement aux sessions précédentes qui avaient pu l'utiliser. Le correctif repose donc uniquement sur (a) la lecture ligne à ligne confirmant l'absence totale de style pour `#menu-confirmation-reset` et (b) le test headless ci-dessus, qui reproduit fidèlement le symptôme rapporté par Xav en distinguant explicitement « logique d'ouverture correcte » de « rendu visible ». **Reste donc à confirmer par Xav en jeu réel**, capture d'écran à l'appui : menu → focus sur « Réinitialiser la sauvegarde » → A → l'écran de confirmation doit maintenant apparaître (fond sombre plein écran, comme le menu principal), focus par défaut sur **Non**, **Oui** renvoie au cold open, **B** revient au menu principal visible.

### Rappel

La logique de `reinitialiserPartie()` / `reinitialiserSauvegarde()` / `creerControleurMenu()` était déjà validée par Xav **en aveugle** (navigation au stick sans repère visuel jusqu'à « Oui », le reset fonctionnait) avant cette session — seul le rendu DOM du sous-écran était en cause, rien dans le comportement de reset lui-même n'a changé.

### Tests rejoués

```
node tools/run_tests.js
```
→ 26 fichiers, tous verts (25 précédents + `test_phase1_sd_menu_reset_invisible`, nouveau).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

Fichiers modifiés : `src/ui/menu.js` (`appliquerStylePleinEcran`, `afficherEcran`, unification des 9 sites de bascule `.hidden`). Fichier ajouté : `tests/test_phase1_sd_menu_reset_invisible_2026-09-15.js`.

### Point `[OUVERT]`

Aucun nouveau. Hérités, inchangés : clignements/orbite pré-choix (§3.1 étapes 1-2, diagnostic « blocage choix du follet »).

### Défaut annexe constaté, non corrigé (hors scope explicite du ticket)

Aucun défaut annexe trouvé dans `menu.js` au-delà de celui ciblé par la fiche (ordre des entrées, navigation, contenu : rien d'anormal observé pendant la lecture ligne à ligne).

### Critère de passage — reste à faire par Xav

Rejouer le parcours du ticket en jeu réel (clavier et/ou manette) : menu → « Réinitialiser la sauvegarde » → confirmer que l'écran de confirmation est maintenant visible, focus par défaut sur Non, Oui ramène au cold open, B revient au menu. Capture d'écran bienvenue puisque l'agent n'a pas pu la produire cette session (extension Chrome indisponible).

### Hors scope pour cette session

Contenu du menu, navigation horizontale, remapping, tactile, rendu canvas — tous explicitement exclus par la fiche.

## Journal de session — Micro-ticket rendu net à résolution physique (2026-09-15)

Brief complet : `specs/MT_rendu-net_2026-09-15.md`. Décision produit de Xav : le jeu n'est pas en pixel art (style « assemblage moderne » de la V1 — géométrie, emoji, superpositions, jeux de lumière), donc la pipeline de rendu pixel-art-net posée en Phase 1 (canvas hors-écran 480×270 mis à l'échelle par facteur entier, `image-rendering: pixelated`) pixélisait à tort tout — texte du HUD compris. Seul `src/render.js` (+ son test + une ligne de `specs/02_grotte.md` §2.2) pouvait être touché ; `main.js`, `hud.js`, `hud_layout.js`, `camera.js`, `scene.js` et les données JSON étaient explicitement hors limites.

### Décisions prises et pourquoi

- **Le cadrage logique (480×270) ne change pas** — seule la résolution du canvas hors-écran change. Le canvas de scène passe de 480×270 pixels logiques à `480·f × 270·f` pixels **physiques** (f = facteur entier courant), avec `ctx.setTransform(f,0,0,f,0,0)` posé sans condition à chaque frame par une nouvelle fonction interne `ajusterCanvasLogiquePhysique()`, appelée en tout premier dans `dessinerScene`. Le transform reste actif sur ce même contexte pour tout le reste de la frame — `dessinerObscurite`, puis (sans toucher un seul de leurs fichiers) `dessinerHud`, `dessinerDialogue`, l'écran de choix du follet et l'aura dessinés inline dans `main.js` — qui continuent tous d'écrire en unités logiques (480×270) et sortent nets à la résolution physique. C'est le seul moyen de satisfaire la contrainte « ne toucher que render.js » : le point de couture est un seul `setTransform` par frame, jamais un changement des appelants.
- **Le calque du voile d'obscurité doit vivre à la même taille physique et avec le même transform** que la scène — sinon ses propres dégradés/arcs resteraient dessinés à 480×270 logiques puis étirés en blocs par le `drawImage` de composition, réintroduisant exactement le problème qu'on corrige. Son échelle est **relue** depuis `ctx.canvas.width / RESOLUTION_LOGIQUE.largeur` (le canvas que `dessinerScene` vient de dimensionner un instant plus tôt dans la même frame) plutôt que recalculée indépendamment — une seule définition du facteur par frame (exigence explicite du ticket, point 5), et une garantie par construction plutôt que par discipline.
- **Le `drawImage` qui compose le voile sur la scène doit repasser en repère identité le temps de cet unique appel** (`ctx.save()` / `setTransform(1,0,0,1,0,0)` / `drawImage` / `ctx.restore()`) : le calque voile est déjà en pixels physiques, donc le composer sous le transform `(f,f)` encore actif l'aurait doublement mis à l'échelle et n'en aurait affiché qu'une fraction dans un coin. La teinte chaude du follet, dessinée juste après sur `ctx` (repère logique restauré par le `restore()`), n'a pas eu besoin de changer.
- **Canvas visible : buffer en pixels physiques (`largeurCSS × devicePixelRatio`), boîte affichée en pixels CSS via `style.width/height`** — recalculé sans condition à chaque frame dans `presenter()` à partir de `window.innerWidth/innerHeight/devicePixelRatio`, jamais de `main.js`. C'est le point qui répare le cas mobile décrit par le ticket (téléphone 360 px CSS de large à DPR 3 : le calcul en CSS bornait le facteur à 1 sur un écran qui permet ×2 réel) — vérifié en navigateur réel cette session (voir plus bas). `main.js` garde son propre écouteur `resize` (devenu inoffensif : `presenter()` réécrit `canvas.width` à la bonne valeur physique dès la frame suivante, avant tout `drawImage`, donc la valeur intermédiaire posée par `main.js` n'est jamais peinte à l'écran) — ne pas le supprimer, `main.js` était hors scope.
- **`versCoordonneesLogiques` convertit `clientX`/`clientY` (pixels CSS, contrat natif des événements souris/tactiles) en pixels physiques via le DPR avant d'appliquer le rectangle de présentation** (désormais lui aussi en pixels physiques) — sans changer sa signature à 3 arguments (`main.js` l'appelle telle quelle, hors scope). Le DPR est lu par une seule fonction privée `obtenirDpr()`, utilisée à la fois ici et dans `presenter()`/`ajusterCanvasLogiquePhysique()` : point unique, jamais deux calculs qui pourraient diverger (point 5 du ticket).
- **`imageSmoothingEnabled = false` retiré de `presenter()`** : il n'y a plus de mise à l'échelle à l'étape de composition finale (le canvas logique est déjà à la résolution physique exacte du rectangle de présentation), donc plus rien à (dés)activer — commenté pourquoi plutôt que supprimé en silence.
- **Bug latent corrigé en passant** : `dessinerScene` lisait `const { largeur, hauteur } = ctx.canvas` — `canvas` n'a jamais eu de propriétés `largeur`/`hauteur` (seulement `width`/`height`), donc le `clearRect` qui suivait ne faisait rien depuis la Phase 1, sans conséquence visible (les tuiles recouvrent tout l'écran chaque frame). Remplacé par un `clearRect` en unités logiques (cohérent avec le nouveau repère) puisque la ligne devait de toute façon être réécrite pour le redimensionnement physique — pas une correction hors scope, la même ligne était déjà à toucher.

### Livré et validé

```
node tools/run_tests.js
```
→ 26 fichiers, tous verts — `test_phase1_render_resolution` étendu d'un cas DPR (360×640 CSS à DPR 3 → f=2, rectangle 960×540 physique à l'offset attendu, aller-retour `versCoordonneesLogiques` exact), simulé via un faux `global.window` en Node (retiré après coup, aucune contamination des autres tests du fichier).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent cette session** (extension Chrome connectée, contrairement à la session précédente) — au-delà des tests headless, contrainte de méthode oblige (le rendu canvas n'est jamais exercé en headless) :
- Sauvegarde IndexedDB existante rechargée (salle 2, follet Eau) : scène, halo, HUD, aura tous rendus sans erreur console, texte du HUD (`46/50`) et bords des cercles héros/follet nettement anti-crénelés au zoom (plus de blocs), à DPR desktop normal (1) comme après redimensionnement de fenêtre.
- DPR simulé à 3 via `Object.defineProperty(window, 'devicePixelRatio', ...)` + fenêtre redimensionnée à ~519×649 CSS : confirmé par lecture directe du DOM que `canvas#jeu.width` = 1557 (= 519×3), `.height` = 1947 (= 649×3), `.style.width` = `"519px"`, `.style.height` = `"649px"` — exactement le contrat du point 4 du ticket. Scène toujours rendue correctement à l'échelle entière recalculée (f=3 dans ce cas), aucune erreur console.
- **Note d'environnement, pas un bug du jeu** : après capture d'écran dans cet état, `window.innerWidth`/`innerHeight` ont été observés à 1920×935 alors que la fenêtre réelle (`outerWidth/outerHeight`) restait à ~535×800 — artefact du mécanisme d'émulation de métriques de l'outil d'automatisation (probablement un reset de viewport CDP déclenché par la capture), pas un comportement du code : `presenter()`/`ajusterCanvasLogiquePhysique()` ont simplement suivi fidèlement les nouvelles valeurs de `window`, ce qui est le comportement voulu. Même classe d'artefact que le throttling d'onglet cachée déjà rencontré aux diagnostics précédents.
- **Non testé, comme à chaque session** : manette physique et DPR réel d'un vrai téléphone (seule une émulation JS de `devicePixelRatio` a pu être faite depuis cet environnement).

Fichiers modifiés : `src/render.js` (voir décisions ci-dessus), `tests/test_phase1_render_resolution_2026-09-15.js` (cas DPR ajouté), `specs/02_grotte.md` (§2.2, une ligne : décision « pas pixel art » consignée).

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : clignements/orbite pré-choix (§3.1 étapes 1-2, diagnostic « blocage choix du follet »).

### Critère de passage — reste à faire par Xav

Reprendre le test de validation manuel de la fiche (`specs/MT_rendu-net_2026-09-15.md`, section « Test de validation ») sur du matériel réel — bloquant, jamais possible depuis un environnement d'automatisation : plein écran 1080p (texte et cercles nets, cadrage identique à avant), fenêtré à ×2, et surtout **téléphone réel** (Chrome Android via `http://<ip-pc>:8080`) pour confirmer que le jeu remplit la largeur avec `f ≥ 2` et qu'un tap au centre du bouton attaque déclenche bien `attack` — le point que cette session n'a pu que simuler en JS, jamais avec un vrai DPR ni un vrai doigt.

### Hors scope pour cette session

Sprites/assets graphiques, style visuel des salles, toit de la Maison (Phase 2), HUD, obscurité (au-delà de son calque déjà existant), tactile (au-delà de la conversion DPR du point 5), échelle fractionnaire, Phase 7 — tous explicitement exclus par la fiche.

## Journal de session — Diagnostic dialogues invisibles après le rendu net (2026-09-15)

Brief complet : `specs/SD_dialogues-invisibles_2026-09-15.md`. Suite directe du MT rendu-net : plus aucun dialogue ne s'affichait, symptôme signalé par Xav après validation du rendu net lui-même.

### Hypothèse confirmée et ligne fautive

**Aucune des hypothèses A/B/C de la fiche n'est confirmée** — même schéma que le diagnostic « blocage choix du follet » (méthode : « si vert, le dire, remonter d'un cran »). Vérifié sur le vrai code via un faux contexte 2D qui enregistre `setTransform`/`save`/`restore`/`drawImage` :
- **A réfutée** : `dessinerObscurite` encadre déjà son unique `setTransform(1,...)` d'un `ctx.save()`/`ctx.restore()` — la transform active juste avant le dessin du dialogue est bien celle de l'échelle entière `f`, jamais l'identité.
- **B réfutée** : `dessinerDialogue` écrit bien sur le même `ctx` que `dessinerScene`/`dessinerObscurite` (le canvas hors-écran de la scène), jamais un autre contexte.
- **C réfutée** : dans `main.js#dessiner()`, le dialogue est bien dessiné **après** `dessinerObscurite` (donc après la composition du voile), jamais avant.

**Cause racine réelle, trouvée en creusant au-delà des trois hypothèses** : `src/ui/dialogue_box.js` et `src/ui/hud.js#dessinerHud` (ligne de slots statique, hors tactile) lisaient tous les deux `ctx.canvas.width`/`ctx.canvas.height` pour calculer leur position — un contrat qui était correct **avant** le MT rendu-net (le canvas hors-écran faisait alors exactement 480×270, la résolution logique) mais qui a silencieusement changé de sens **sans qu'aucune ligne de ces deux fichiers ne soit touchée** : depuis `ajusterCanvasLogiquePhysique()` (posée par ce même MT dans `render.js`), `ctx.canvas.width/height` est désormais la taille **physique** (`480·f × 270·f`), alors que le dessin lui-même reste sous la transform logique->physique (`f`) encore active. Une position calculée sur la taille physique puis redessinée sous cette transform est doublement mise à l'échelle : pour `f=2` (cas réel de bureau/fenêtré, jamais `f=1`), la boîte de dialogue se retrouvait à `y≈924` px physiques sur un canvas de 540 px de haut — entièrement hors cadre, en dessous. Même défaut, même conséquence pour la ligne de 5 slots du HUD. **L'écran de choix du follet, lui, était indemne** : `main.js#dessinerEcranChoixFollet()` utilise des coordonnées logiques fixes (150/240/330, y=113), jamais `ctx.canvas.width/height` — confirmé par lecture de code et par capture en navigateur (formes visibles, curseur correct).

C'est exactement le scénario que la nouvelle règle de méthode (voir plus bas) vise à empêcher de se reproduire : un ticket qui ne touchait que `render.js` a cassé deux fichiers qu'il n'a jamais ouverts, parce que ces deux fichiers dépendaient d'un contrat implicite (« `ctx.canvas.width/height` = résolution logique ») jamais documenté comme tel.

### Correctif et test rouge → vert

`tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js`, deux sections :
1. **Méthode imposée par la fiche** : faux contexte 2D (canvas + ctx factices, aucun rendu réel produit) qui rejoue `dessinerScene` → `dessinerObscurite` → `dessinerDialogue` sur le vrai code de `render.js`/`dialogue_box.js`, et vérifie explicitement les hypothèses A/B/C — toutes trois vertes dès l'écriture (conforme au diagnostic ci-dessus, pas un bug de méthode de test).
2. **Cause racine réelle** : `dessinerDialogue` et `dessinerHud` appelés directement avec un canvas factice à `f=2` (960×540 physiques, transform `(2,0,0,2,0,0)` déjà active, comme le laisse `ajusterCanvasLogiquePhysique`) — assertion que le rectangle dessiné, une fois passé par la transform active, reste dans les bornes du canvas visible. **Rouge avant patch** (`haut=924, bas=1064, canvas.height=540` pour le dialogue) exactement conforme au symptôme.

Correctif, ligne fautive dans chacun des deux fichiers :
- `src/ui/dialogue_box.js` : `const { width: largeur, height: hauteur } = ctx.canvas;` → `const { largeur, hauteur } = RESOLUTION_LOGIQUE;` (importée de `render.js`, seule source de vérité pour ce nombre).
- `src/ui/hud.js` : `dessinerSlotsBas(ctx, { largeur: ctx.canvas.width, hauteur: ctx.canvas.height });` → `dessinerSlotsBas(ctx, RESOLUTION_LOGIQUE);`.

`node tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js` → vert après correctif. `grep -rn "ctx.canvas.width\|ctx.canvas.height\|ctx.canvas;" src/` confirme qu'aucun autre fichier de `/src` (hors `render.js`, dont l'usage est légitime — c'est lui qui *pose* ces dimensions) ne reproduit ce défaut.

### Vérification en navigateur réel — les 6 états de `specs/CHECKLIST_visuelle.md`

**Effectuée cette session, extension Chrome connectée.** Point notable d'environnement (nouveau, à garder en tête pour les sessions futures) : la boucle `requestAnimationFrame` du jeu ne tournait **pas du tout** au premier chargement de la page dans cet environnement (`document.hidden === true` bien que `document.hasFocus() === true` — compteur de test à 0 après plusieurs secondes d'attente), un cran plus sévère que le simple « throttling » déjà noté aux sessions précédentes. Contournement propre à cette session (jamais touché le code du jeu) : `window.requestAnimationFrame` patché en `setTimeout(cb, 16)` puis réimport dynamique de `src/main.js` pour redémarrer une boucle qui tourne réellement — l'instance déjà stalled reste inerte à côté, sans effet observé sur les captures. Symptôme additionnel purement outillage : les actions `computer.key` (down+up atomique) arrivaient parfois trop vite pour être vues comme un front montant par la boucle de polling — contourné en dispatchant `keydown`/`keyup` séparément avec un délai explicite entre les deux, comme piloté par un humain tenant une touche.

Les 6 états capturés, tous conformes :
1. **Scène seule** — jeu en cours (post-reset), aucune UI ouverte : tuiles, décor, héros/follet nets, ligne de 5 slots statique bien visible en bas au centre, dans le cadre.
2. **Dialogue ouvert** — capturé à 4 reprises (narration du choix du follet, ligne d'enthousiasme du follet choisi, 2 lignes du tutoriel de combat à l'entrée de la salle 2) : boîte toujours dans le tiers bas de l'écran, texte lisible, locuteur nommé (`narrateur`, `Follet d'Eau`) — **le bug ciblé par cette session est résolu**.
3. **Écran de choix du follet** — triangle (Feu, rouge)/goutte (Eau, bleu)/carré (Terre, or) tous visibles, curseur (cercle blanc) correctement positionné sur l'élément focalisé.
4. **Menu DOM ouvert** — menu principal (5 entrées, focus visible) puis sous-écran de confirmation du reset (« Effacer la partie ? », focus par défaut sur Non) : les deux plein écran, jamais visibles ensemble — confirme au passage, en conditions réelles cette fois, le correctif du diagnostic `SD_menu-reset-invisible` (non vérifié en navigateur à l'époque faute d'extension connectée).
5. **Aura + étiquette ennemi** — cercle fin translucide autour du follet engagé, nom du monstre (« Rampant des cavernes ») affiché sous son sprite, tous deux dans le cadre.
6. **HUD tactile actif** — après un `touchstart` simulé sur le canvas visible : boutons d'action + zone de joystick affichés, ligne de slots statique disparue — jamais les deux à la fois, conforme au contrat de `SD_ui-lisibilite`.

Fichiers modifiés : `src/ui/dialogue_box.js`, `src/ui/hud.js`. Fichiers ajoutés : `tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js`, `specs/CHECKLIST_visuelle.md`.

### Tests rejoués

```
node tools/run_tests.js
```
→ 27 fichiers, tous verts (26 précédents + `test_phase1_sd_dialogues_invisibles`, nouveau).

```
node --check src/ui/dialogue_box.js src/ui/hud.js src/render.js tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js
```
→ tous valides.

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : clignements/orbite pré-choix (§3.1 étapes 1-2, diagnostic « blocage choix du follet »).

### Nouvelle règle de méthode

Consignée dans « Contraintes de méthode non négociables » ci-dessus : toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure ; tout ticket touchant `render.js`/`ui/hud.js`/`ui/dialogue_box.js`/`main.js#dessiner` rejoue `specs/CHECKLIST_visuelle.md` (capture par état) avant de conclure — créée cette session avec les 6 états ci-dessus, à enrichir à chaque nouveau calque.

### Critère de passage — reste à faire par Xav

Le bug ciblé par cette session (dialogues invisibles) est corrigé et vérifié en navigateur réel — plus rien de bloquant connu sur ce point précis. Reprendre malgré tout le parcours manuel complet de `specs/02_grotte.md` §7 **à la manette et au tactile réels** (toujours bloquant, jamais testé en conditions réelles par aucune session) : en particulier, confirmer que les dialogues restent lisibles à toutes les tailles d'écran/DPR réels, pas seulement aux `f` simulés cette session.

### Hors scope pour cette session

Contenu des dialogues, clignements/orbite pré-choix (`[OUVERT]` hérité), style graphique, Phase 2 — tous explicitement exclus par la fiche.

## Journal de session — Phase 1b : polish de la Grotte, palier 1 (2026-09-16)

Spec complète : `specs/03_grotte-polish.md`. Session ouverte après validation manette réelle de Xav (Phase 0→1, 2026-09-16) et l'acte de synthèse de cette même journée qui verrouille le périmètre de `03_grotte-polish.md`. Ordre des 4 paliers imposé par la fiche (§1) : cette session livre uniquement le **palier 1** (feedback de combat §3.1 + anti-spam dialogue §3.2), indépendants du rendu du catalogue visuel (paliers 2-4) et déjà signalés par Xav comme défauts joués. Paliers 2/3/4 non commencés, à reprendre dans une session ultérieure conformément à la consigne de la fiche (« s'arrêter au dernier palier stable »).

### Décisions prises et pourquoi

- **`FLASH_ATTAQUE_MS`/`FLASH_TOUCHE_MS` centralisées dans `combat.js`**, pas dans `render.js` : ce sont des durées déclenchées par des événements de combat (coup effectif, monstre touché), même si c'est `render.js` qui les consomme pour l'alpha — cohérent avec `combat.js` qui porte déjà `tickCooldown` (même famille de compte à rebours). `BARRE_PV_MONSTRE` reste dans `render.js` (patron `CARTOUCHE_*` de `ui/hud.js` : une constante de layout de rendu vit à côté de ce qui la dessine).
- **`estMonstreActif(monstre, follet)` exportée par `combat.js`**, pure : un monstre est "actif" (barre de PV visible) s'il a perdu ≥1 PV OU s'il est la cible réelle du follet engagé (`follet.cibleMonstreId`) — jamais un second calcul de distance (même principe que `status.js#statsEffectivesMonstre`, qui utilise déjà cette source de vérité pour "dans l'aura"). Testée en isolation (4 cas) puis en bout en bout sur l'orchestrateur réel.
- **`monstre.flashMs` : champ mutable sur l'entité**, tiqué comme `cooldownAttaqueMs`/`dotAccumulateurMs` déjà présents (le style de `main.js#mettreAJourCombat` mute déjà ces compteurs en place malgré `entities.js` par ailleurs pur/immuable) — cohérence avec l'existant plutôt qu'un nouveau composant séparé pour un seul champ.
- **L'anneau d'attaque se déclenche AVANT même de savoir si un monstre est touché** (`if (etatGameplay.attack.pressed && cooldownAttaqueHerosMs <= 0) { anneauAttaqueMs = FLASH_ATTAQUE_MS; ... }`), conforme à la lettre de la spec (« à chaque ATTACK effectif, même si rien n'est touché »). Le cooldown, lui, n'est posé qu'en cas de coup porté (comportement hérité de la Phase 1, non touché) — un ATTACK qui rate en continu ne se met donc jamais en cooldown et peut reflasher l'anneau à chaque frame tant qu'il est pressé ; c'est le comportement déjà existant du cooldown d'auto-attaque, pas une régression de ce ticket.
- **L'anneau est un vrai donut `[rayonMin, rayonMax]`** (deux arcs de sens opposé, remplissage `evenodd`), pas un simple disque : généralise sans code aux armes à distance futures (`min > 0`, décision Xav déjà actée en §10 de `02_grotte.md`) — un disque plein aurait fonctionné pour l'épée en bois (`min=0`) mais aurait fallu être réécrit pour l'arc.
- **Dialogue : machine à écrire + armement implémentés comme un temps interne propre à `dialogue.js`** (`msEcoulesLigne`, `msDepuisAffichageComplet`), avancé par une méthode `maj(deltaMs)` nouvellement exposée — appelée une fois par frame dans `main.js#maj()` indépendamment des branches de traitement d'input, pour que le texte continue de s'afficher même si l'appui du joueur est neutralisé cette frame-là (mécanisme 1) ou absent. `ligneCourante()` renvoie désormais `{ locuteur, texte (tronqué), arme }` — `arme` pilote le marqueur ▼ dessiné (jamais une chaîne) par `ui/dialogue_box.js`.
- **Ligne ≤ 1 caractère : complète instantanément** (`charsAffiches = texte.length` posé directement dans `reinitialiserLigne()`), armement toujours appliqué ensuite — edge case §4 explicite de la fiche.
- **Frame d'ouverture consommée (mécanisme 1, §3.2) implémentée entièrement dans `main.js#maj()`**, jamais dans `dialogue.js` (consigne explicite de la fiche) : un flag `dialogueOuvertAuDebutFramePrecedente`, mesuré au tout début de `maj()` avant toute logique de la frame courante (combat, choix du follet…) qui pourrait ouvrir un dialogue plus loin dans ce même appel. `dialogueVientDeSOuvrir` n'est vrai qu'une fois par transition fermé→ouvert. **Analyse consignée en commentaire** : dans l'ordre actuel du code (branches `if/else if` mutuellement exclusives), un dialogue tout juste ouvert par le combat ou la confirmation du choix du follet ne peut de toute façon jamais recevoir `traiterInput` la même frame — les mécanismes 2 et 3 (machine à écrire + armement, dans `dialogue.js`) suffiraient donc déjà à eux seuls avec la structure actuelle. Ce point de décision protège malgré tout un futur réordonnancement (ou une source d'input moins bien comportée) sans coût — implémenté tel que demandé par la fiche plutôt que débattu.
- **Tests existants touchés par le nouveau tempo du dialogue, mis à jour plutôt que contournés** (`test_phase1_dialogue`, `test_phase1_sd_grotte_choix_follet`, `test_phase1_sd_reset_sauvegarde`, `test_phase1_sd_audit_chemin_critique`) : chacun rejoue désormais la fermeture d'une ligne via un petit patron dupliqué (2 appuis espacés d'une attente ≥ `DELAI_ARMEMENT_DIALOGUE_MS`, le 1er pouvant retomber sans risque sur la frame d'ouverture consommée) plutôt qu'un unique appui — cohérent avec la note de `test_phase1_sd_audit_chemin_critique` elle-même (« la durée du chemin critique s'allonge mécaniquement hors dialogues, c'est attendu »).

### Livré et validé

```
node tools/run_tests.js
```
→ 29 fichiers, tous verts (27 précédents, 4 réécrits pour le nouveau tempo du dialogue, + `test_phase1b_combat_feedback`, `test_phase1b_dialogue_antispam`, nouveaux).

```
node --check <chaque fichier .js modifié/ajouté>
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent cette session** (`node serveur_local.js` + Chrome piloté par automatisation), les 3 nouveaux états de `specs/CHECKLIST_visuelle.md` (7/8/9) capturés :
- **Anneau d'attaque** : donut translucide blanc net autour du héros à l'instant d'un coup, décroissance en alpha observée sur 2 frames suivantes, disparition complète une fois `FLASH_ATTAQUE_MS` écoulé.
- **Barre de PV du monstre** : apparue dès l'engagement (avant même d'être touché, puisque déjà "actif" via `follet.cibleMonstreId`), remplissage proportionnel observé après un coup.
- **Marqueur ▼** : absent pendant l'affichage progressif d'une ligne, apparu après le délai d'armement, sur 2 dialogues différents (tutoriel combat, 2 lignes).
- **Monstre blanchi au contact** : logique validée par le test automatisé à valeur exacte (`monstre.flashMs === FLASH_TOUCHE_MS` immédiatement après le coup) ; **non confirmé pixel par pixel** dans cette session — le follet engagé se colle exactement à la position du monstre (`companion.js`, comportement de Phase 1 inchangé), le recouvrant entièrement à l'écran au moment précis du coup. Observé en revanche que le monstre reprend sa couleur normale (violet) une fois le flash expiré, cohérent avec le mécanisme. Consigné dans `CHECKLIST_visuelle.md` comme piège connu, pas un défaut de ce ticket.
- Aucune régression : menu (ouverture/fermeture), HUD, décor, halo, follet toujours corrects.

**Artefact d'outillage rencontré et contourné cette session** (nouveau, à garder en tête) : ni le patch `requestAnimationFrame` → `setTimeout` (déjà utilisé aux sessions précédentes pour contourner `document.hidden` resté vrai) ni un ticker en `setInterval` classique ne suffisaient cette fois — `setTimeout` lui-même reste throttlé en tâche de fond dans cet environnement. Contournement en deux temps : (1) un ticker basé sur un **Web Worker** (`setInterval` y échappe au throttling de la page hôte) pour un jeu qui tourne en temps réel normal ; (2) un **pilotage manuel image par image** (`window.requestAnimationFrame` remplacé par une simple file d'attente, avancée à la demande via un `deltaMs` choisi) pour figer précisément une frame et capturer un état qui ne dure normalement que 80-120 ms (`FLASH_ATTAQUE_MS`/`FLASH_TOUCHE_MS`) — impossible à attraper via une capture d'écran, intrinsèquement asynchrone. Autre piège méthodologique rencontré : forcer un `visibilitychange` synthétique pour déclencher l'autosave (patron des sessions précédentes) ne fonctionne que tant que `document.hidden` reste vrai (le code ne sauvegarde que `if (document.hidden)`) — une fois la page redevenue visible en cours de session, cette astuce cesse silencieusement de fonctionner et les lectures IndexedDB suivantes deviennent des instantanés périmés. Aucune conséquence sur le jeu lui-même, uniquement sur la méthode de vérification — signalé ici pour ne pas re-perdre de temps dessus à la prochaine session graphique.

Fichiers modifiés : `src/combat.js` (`FLASH_ATTAQUE_MS`, `FLASH_TOUCHE_MS`, `estMonstreActif`), `src/entities.js` (`flashMs` sur le monstre), `src/dialogue.js` (machine à écrire + armement, réécrit), `src/ui/dialogue_box.js` (marqueur ▼), `src/render.js` (`BARRE_PV_MONSTRE`, anneau d'attaque, flash/barre dans `dessinerScene`), `src/main.js` (anneau/flash dans `mettreAJourCombat`, frame d'ouverture consommée + `dialogue.maj()` dans `maj()`, `anneauAttaque`/`actif` dans `dessiner()`), `tests/test_phase1_dialogue_2026-09-15.js`, `tests/test_phase1_sd_grotte_choix_follet_2026-09-15.js`, `tests/test_phase1_sd_reset_sauvegarde_2026-09-15.js`, `tests/test_phase1_sd_audit_chemin_critique_2026-09-15.js` (nouveau tempo du dialogue). Fichiers ajoutés : `tests/test_phase1b_combat_feedback_2026-09-16.js`, `tests/test_phase1b_dialogue_antispam_2026-09-16.js`. `specs/CHECKLIST_visuelle.md` enrichie (états 7/8/9).

### Point `[OUVERT]`

Aucun nouveau. Hérités, inchangés : clignements/orbite pré-choix (fermé côté décision par `03_grotte-polish.md` §9, reste à implémenter en palier 4), couleur neutre du héros et durées de l'intro (`03_grotte-polish.md` §9, paliers 2/4).

### Critère de passage — reste à faire par Xav

Rejouer un combat en jeu réel (manette de préférence) et confirmer : l'anneau est visible à chaque coup porté (jamais pendant le cooldown), le monstre blanchit nettement au contact (à vérifier en conditions réelles où le chevauchement follet/monstre décrit ci-dessus peut gêner la lecture), sa barre de PV descend de façon lisible, et le marqueur ▼ du dialogue se voit sans ambiguïté avant de pouvoir avancer. Spammer `A`/Espace pendant un combat qui tue un monstre : aucun dialogue ne doit se refermer sans avoir été lu.

### Hors scope pour cette session

Paliers 2 (catalogue visuel `visuels.json`), 3 (polish des salles : faisceaux, décor, teinte du héros, aura pointillée) et 4 (intro cinématique) de `03_grotte-polish.md` — non commencés, à reprendre dans cet ordre dans une session ultérieure. Équilibrage du combat, sprites, audio — explicitement exclus par la fiche.

## Journal de session — Phase 1b : polish de la Grotte, palier 2 (2026-09-16)

Suite directe du palier 1 (même session). Spec : `specs/03_grotte-polish.md` §3.3. Livre le catalogue visuel (`data/visuels.json`) et l'unique fonction de rendu `src/visuels.js#dessinerVisuel` qui l'interprète, puis migre TOUTES les entités déjà dessinées (héros, 3 follets, monstre) vers ce mécanisme — plus aucune forme dessinée inline dans `render.js`/`main.js`/`ui/hud.js`. Paliers 3 et 4 non commencés (ordre imposé par la fiche, §1).

### Décisions prises et pourquoi

- **`teinte` (couleur passée à l'appel) vs `couleur` (couleur d'auteur d'une primitive) unifiés en UN seul mécanisme**, réutilisé pour trois besoins différents qui semblaient a priori distincts : la couleur permanente d'un follet (`companions.json > render.couleur`), le flash blanc du monstre touché (palier 1, `#ffffff` uniquement pendant `flashMs`), et l'état allumé/éteint d'un levier (`#ffd94a` si actif). Dans les trois cas : `dessinerVisuel(ctx, visuel, x, y, { teinte })`, et seules les primitives `teinte: true` du JSON en tiennent compte — jamais un `if` par cas d'usage dans `visuels.js`. C'est la preuve que l'abstraction est correcte : trois besoins de départ, un seul paramètre.
- **`companions.json`/`enemies.json` gardent `render.couleur` là où elle sert encore ailleurs** (lumière du follet dans `dessinerObscurite`, trait de l'aura) mais **`render.forme` est entièrement remplacé par `render.visuel`** (jamais doublé, conforme à la consigne explicite de la fiche §2.1) — la couleur du monstre, elle, n'était utilisée nulle part ailleurs que son propre dessin : `enemies.json > render` ne garde donc plus que `{ visuel }`.
- **Bug latent de la Phase 1 corrigé en passant** : `enemies.json` déclarait déjà `render.forme: "losange"` pour le rampant des cavernes, mais `render.js` ignorait ce champ et dessinait un simple cercle violet, sans que rien ne le remarque (aucun test ne portait sur le rendu). `visuel_monstre_rampant` est un vrai losange (polygone à 4 points) — première fois que la donnée et le rendu concordent.
- **Les leviers sont dessinés pour la première fois du jeu.** Trouvé en cherchant `render` dans `puzzles.json`/`puzzles.js`/`render.js` avant de commencer : Phase 1 posait `flag_pose` sur interaction mais ne dessinait jamais rien (`INTERACT` fonctionnait à l'aveugle). `visuel_levier` (ancre `"bas"`, pole + témoin) + `render.visuel` sur chaque instance `levier` de `puzzles.json` (jamais sur les instances `sequence`, qui ne sont que des méta-références) + une nouvelle boucle dans `main.js#dessiner()` (`puzzlesAffiches`, même patron que `monstresAffiches`) + `render.js#dessinerScene` qui les dessine avant les monstres. Témoin gris par défaut, jaune (`COULEUR_LEVIER_ACTIF`, un seul endroit) via `options.teinte` quand `puzzlesEtat[id].actif`.
- **`ancre: "bas"` réellement utilisée** (levier) et pas seulement `"centre"` (héros/follets/monstre) — couvre les deux valeurs du schéma en données réelles, pas seulement en test.
- **Convention de taille de référence pour les follets** (`TAILLE_REFERENCE_FOLLET_PX = 7`, exportée par `visuels.js`) : les 3 silhouettes sont dessinées à ce rayon une seule fois dans `visuels.json`, chaque appelant (scène : échelle 1 ; écran de choix : `taille/7`, `taille` = 14 ou 20 selon le focus, inchangé depuis Phase 1 ; HUD : `6/7`) calcule son échelle plutôt que de dupliquer les primitives à plusieurs tailles — évite exactement le problème que la fiche voulait fermer (« on n'anime pas des silhouettes qui vont changer », donc un seul dessin, jamais 3 copies qui pourraient diverger).
- **Le follet est enfin dessiné avec sa vraie forme EN SCÈNE**, pas seulement à l'écran de choix et au HUD : avant ce palier, `render.js` dessinait un simple petit cercle coloré pour le follet en jeu (`dessinerFormeFollet` n'était appelée que par l'écran de choix et le HUD). C'est un changement visuel réel, mais explicitement dans le mandat du palier (§3.3 : « héros, 3 follets [...] plus aucune forme d'entité dessinée inline »), pas un débordement de scope.
- **`ui/hud.js#dessinerFormeFollet` supprimée**, remplacée par des appels directs à `dessinerVisuel` (main.js pour l'écran de choix, hud.js pour l'icône) — hud.js reçoit désormais un `visuelFollet` déjà résolu par main.js (qui a le registre) plutôt que de connaître `registre`/`visuels.json` lui-même, cohérent avec le patron déjà en place pour `monstre.label`.
- **`teintable` (visuel) et `teinte` (primitive) validés en cohérence au boot** (`schemas.js#validerVisuel`) : une primitive `teinte: true` sans que le visuel se déclare `teintable: true` est un échec de validation — piège d'auteur (JSON) attrapé à la source plutôt qu'un silence en jeu.
- **`render.visuel` validé par un `custom` par catalogue plutôt que le mécanisme générique `refs`** : `refs` ne lit que des champs de premier niveau (`entry.champ`), jamais un chemin imbriqué comme `entry.render.visuel` — `erreursRenderVisuel()` (nouvelle fonction partagée dans `schemas.js`) est réutilisée par `companions`, `enemies` et `puzzles` (uniquement les instances `type: "levier"`).
- **Ombre non teintable par construction** (`dessinerVisuel` la dessine directement en `rgba(0,0,0,alpha)`, jamais via `resoudreStyle`) : une ombre portée ne prend jamais la couleur du compagnon, décision de bon sens non explicitée dans la fiche mais cohérente avec « ombre sombre » de sa définition (§2.1).
- **Follets sans ombre portée** (écart assumé par rapport à « chaque silhouette » de la fiche, §3.3) : ce sont des créatures flottantes en orbite, une ombre au sol n'aurait pas de sens tant qu'elles ne touchent jamais le sol — le volume vient d'une facette interne plus claire à la place (reflet/noyau), cohérent avec « éventuellement un reflet » de la même section.
- **`FauxCtx2D` de `test_phase1_sd_dialogues_invisibles` étendue** (`translate`/`rotate`/`scale` par composition affine générique, `ellipse` en no-op) : `dessinerScene` appelle désormais `dessinerVisuel` pour le héros, qui a besoin de ces primitives de transform — sans quoi ce test (qui ne portait pourtant que sur la position du dialogue/HUD, pas sur les silhouettes) aurait crashé. Un `heroVisuel` factice minimal y a été ajouté pour la même raison.

### Livré et validé

```
node tools/run_tests.js
```
→ 30 fichiers, tous verts (29 précédents + `test_phase1b_visuels`, nouveau : ordre des primitives, ombre-avant-corps, teinte limitée aux primitives `teinte: true`, alpha/échelle globaux, forme inconnue = échec dur, et un motif "tronc" entièrement nouveau — jamais présent dans `data/visuels.json` — qui passe `SCHEMAS.visuels.custom` et se dessine correctement sans toucher `src/visuels.js` ni `src/schemas.js`, la preuve data-driven demandée par la fiche).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent cette session** (`node serveur_local.js` + Chrome, pilotage manuel image par image dès le départ — cf. artefact d'outillage du palier 1, toujours d'actualité), les 2 nouveaux états de `specs/CHECKLIST_visuelle.md` (10/11) capturés, plus re-vérification des 9 précédents avec le nouveau moteur de rendu :
- Follets : triangle (Feu)/goutte (Eau)/carré (Terre) avec facette interne plus claire, identiques en scène (orbite autour du héros — nouveau, cf. décisions), à l'écran de choix (formes + focus inchangés visuellement) et dans le cartouche HUD.
- Monstre : losange violet avec facette claire et ombre portée, flash blanc toujours correct au coup porté, barre de PV toujours positionnée correctement au-dessus.
- Leviers : visibles pour la première fois (pole + témoin gris), témoin passé au jaune après `INTERACT` à portée — confirmé par capture avant/après.
- Menu, écran de confirmation du reset, cinématique de choix du follet (narration → sélection → confirmation → enthousiasme) : aucune régression après le passage par `dessinerVisuel`.
- Un unique écran totalement noir capturé une fois au milieu d'une séquence d'attaque (aucune erreur console, aucune exception synchrone au pas suivant, jamais reproduit) — probablement un artefact de capture d'écran de l'outil, signalé dans `CHECKLIST_visuelle.md` sans être creusé davantage (pas de piste de cause racine côté jeu).

Fichiers ajoutés : `src/visuels.js`, `data/visuels.json`, `tests/test_phase1b_visuels_2026-09-16.js`. Fichiers modifiés : `src/schemas.js` (schéma `visuels`, `erreursRenderVisuel`, cross-références companions/enemies/puzzles), `src/render.js` (import `dessinerVisuel`, `dessinerScene` dessine héros/monstres/follet/leviers via lui, `COULEUR_LEVIER_ACTIF`), `src/main.js` (résolution des visuels par frame, `puzzlesAffiches`, écran de choix du follet, appel à `dessinerHud`), `src/ui/hud.js` (suppression de `dessinerFormeFollet`, icône follet via `dessinerVisuel`), `src/save.js` (`VISUEL_HEROS_ID`), `data/companions.json`/`data/enemies.json`/`data/puzzles.json` (`render.visuel`), `tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js` (FauxCtx2D étendue). `specs/CHECKLIST_visuelle.md` enrichie (états 10/11).

### Point `[OUVERT]`

Aucun nouveau. Hérités, inchangés : clignements/orbite pré-choix (palier 4), couleur neutre du héros et durées de l'intro (palier 3/4).

### Critère de passage — reste à faire par Xav

Rejouer la grotte et donner un verdict sur les nouvelles silhouettes (triangle/goutte/carré/losange/levier) — c'est le prérequis explicite de la fiche avant l'intro cinématique (palier 4) : « on n'anime pas des silhouettes qui vont changer ». En particulier confirmer que le follet en orbite (nouveau, visible en jeu pour la première fois avec sa vraie forme) et le monstre en losange restent lisibles à la manette/au tactile, pas seulement sur les captures de cette session.

### Hors scope pour cette session

Paliers 3 (polish des salles : faisceaux, décor, tuiles à variantes, teinte du héros selon le follet, aura pointillée) et 4 (intro cinématique) de `03_grotte-polish.md` — non commencés, à reprendre dans cet ordre. La "porte" mentionnée en prose au §3.3 de la fiche parmi les silhouettes du catalogue n'a pas de `visuel` dédié dans cette session : les portes restent purement des tuiles (`tile_mur`/`tile_sortie` selon flag, cf. `scene.js`), pas des entités dessinées par `dessinerVisuel` — la table concrète de la fiche (§2.1) ne demande la cross-référence `render.visuel` que pour `companions.json`/`enemies.json`/`puzzles.json`, jamais pour les tuiles de `scenes.json` ; combler cet écart de prose reste possible en palier 3 si Xav le juge utile. Décor (`scenes.json > decor`), `tiles.json > variantes`, équilibrage, sprites, audio — explicitement exclus par la fiche.

## Journal de session — Phase 1b : polish de la Grotte, palier 3 (2026-09-16)

Suite directe des paliers 1-2 (session précédente). Spec : `specs/03_grotte-polish.md` §3.4. Livre le polish des deux salles de la grotte : faisceaux lumineux, décor procédural (herbe/flaque/rochers), obscurité par scène (donnée, plus une constante globale), variantes de tuiles, teinte neutre→compagnon du héros, aura pointillée, et le calque statique tuiles+décor pré-rendu demandé par la fiche pour tenir le plancher 30 fps mobile. Palier 4 (intro cinématique) non commencé (ordre imposé, §1 de la fiche).

### Décisions prises et pourquoi

- **`obscurite` devient un objet `{ opacite }`, jamais coercé** : `scene.js#chargerScene` faisait avant ce ticket `obscurite: !!donnees.obscurite` (coercion en booléen) — supprimé, la valeur passe désormais telle quelle. Un booléen résiduel (Phase 1) est un échec de validation dur et explicite (`schemas.js#validerScene`), jamais migré en silence : les 2 scènes de la grotte sont passées à `{ opacite: 0.72 }` (valeur historique inchangée), la scène placeholder Maison à `obscurite` **absent** plutôt que `false` (§4 edge case : absent = claire, comportement strictement identique à avant). `render.js#dessinerObscurite` lit `scene.obscurite.opacite` directement — plus de constante globale `OPACITE_OBSCURITE_MAX`, l'opacité est désormais une donnée par scène (prépare les futures maps "vides" à ~0,9, D10 carte mentale, jamais 1.0).
- **`lumieres[].type` distingue "halo" (perce le voile, défaut si absent — Phase 1 inchangée) et "faisceau"** (atmosphère additive, jamais un trou) : deux jeux de champs requis validés séparément par `schemas.js`. Un faisceau est un triangle (apex à la source, base à `longueur` de distance, largeur dictée par `ouverture`) rempli d'un dégradé qui décroît vers la base, tracé par une nouvelle fonction privée `render.js#dessinerFaisceau`, composée en `'lighter'` par `dessinerObscurite` juste après la composition du voile — jamais dans le calque destination-out des halos, qui ne lit désormais que les lumières de type "halo" (`(l.type || 'halo') === 'halo'`).
- **Le décor devient data-driven scène par scène** (`scenes.json > decor: { densite, motifs: [{ visuel, poids }] }`), remplaçant la liste `MOTIFS` codée en dur de la Phase 0 (`brin_herbe`/`caillou`/`fleur`, jamais reliée à un visuel réel) : `decor.js#genererDecor` fait désormais un tirage pondéré (poids/poidsTotal) parmi `motifs[]` et renvoie `{ x, y, visuel, rotation }` — `visuel` reste un id (string), résolu par `main.js` à l'entrée en scène (même patron que `monstresAffiches`/`puzzlesAffiches`), jamais par `decor.js` lui-même. Scène sans `decor` → tableau vide, jamais une erreur (§4 edge case) — d'où la mise à jour du fixture Phase 0 (`test_phase0_scene_camera`) qui, avant ce ticket, dépendait du comportement "densité par défaut toujours active" pour son test de déterminisme.
- **`dessinerVisuel` gagne une 4ᵉ option `rotation` (degrés)**, en plus de teinte/alpha/echelle : sert la "légère variation d'inclinaison par graine" demandée pour `visuel_herbe` (§3.4) sans dupliquer une silhouette pré-tournée par instance — `decor.js#genererDecor` tire un angle ±10° (provisoire, `ROTATION_MAX_DEG`) par motif généré, appliqué à **tous** les motifs (pas seulement l'herbe : un rocher/une flaque, quasi symétriques, n'en paraissent pas moins statiques ; conditionner le mécanisme à un id précis aurait couplé `decor.js` à des id de visuels précis, contraire à sa neutralité).
- **`visuel_herbe`/`visuel_flaque`/`visuel_rocher_petit`/`visuel_rocher_grand` ajoutés à `visuels.json`**, chacun un assemblage de primitives (traits pour l'herbe, dégradé radial + reflet statique pour la flaque, polygones à facette claire + ombre pour les rochers) — zéro code ajouté à `visuels.js`/`schemas.js` pour ces 4 nouvelles entrées, exactement la preuve d'extensibilité déjà établie au palier 2. Les rochers ont 2 tailles = 2 **entrées de catalogue distinctes** (pas un paramètre d'échelle sur une seule entrée) : plus proche de la lettre de la fiche ("2 tailles"), et un motif de plus dans `scenes.json > decor.motifs[]` pour en piloter la fréquence relative sans toucher `decor.js`.
- **Variantes de tuiles + teinte déterministe** (`tiles.json > render.variantes[]`/`variation_teinte`) : `decor.js#couleurTuile(scene, x, y, estFlagActif)`, pure, hash spatial `seed ^ (x·73856093) ^ (y·19349663)` (pas une avance séquentielle du PRNG comme `genererDecor` — le calque statique de `render.js` doit retomber sur exactement la même couleur à la même position quel que soit l'ordre de parcours, y compris après une reconstruction du cache) → choisit une variante parmi `[valeur, ...variantes]` puis applique un facteur de luminosité ±`variation_teinte` (4 % provisoire) à ce choix. Un test a suivi une fausse piste ici (voir §Erreurs).
- **Héros neutre → teinté** : `save.js#COULEUR_HERO_NEUTRE` (nouvelle constante, même statut que `VISUEL_HEROS_ID`) plutôt qu'un champ `hero.json` séparé — cohérent avec la remarque de la fiche ("données de départ, là où vit l'arme par défaut"). `visuel_heros` gagne une primitive de **contour clair** (`#d8d8d8`, cercle légèrement plus grand, dessiné avant le corps) : Xav a demandé un gris foncé, mais un gris foncé sur le voile bleuté à 0,72 risquait d'être quasi invisible avant le choix — valeur provisoire retenue (gris moyen désaturé + contour), `[OUVERT]` reconduit pour verdict en jeu. `main.js#dessiner()` calcule `heroTeinte = companionActif ? companionActif.render.couleur : COULEUR_HERO_NEUTRE` et le passe systématiquement à `dessinerVisuel` — jamais une 2ᵉ silhouette pour le cas neutre.
- **Aura pointillée** : `render.js#AURA_TRAIT` (nouvelle constante, `{ largeur, pointilles, alpha }`) remplace le cercle plein `rgba(255,255,255,0.35)` du diagnostic SD_ui-lisibilite — `main.js#dessiner()` pose `ctx.setLineDash(AURA_TRAIT.pointilles)` avant de tracer, dans le même bloc `save()/restore()` qu'avant (le `restore()` remet aussi le dash à `[]`, pas de fuite d'état vers les dessins suivants).
- **Calque statique tuiles+décor pré-rendu** (`render.js`, performance demandée par la fiche) : `dessinerCoucheStatique` construit, une fois par `(sceneId, echelle, signaturePortes)`, un canvas hors-écran à la taille PHYSIQUE de la scène **entière** (pas seulement le viewport), y dessine tuiles (via `couleurTuile`) puis décor (via `dessinerVisuel`), puis chaque frame se contente d'un `drawImage` recadré à la position de la caméra (repère identité le temps de l'appel, même patron que `canvasVoile`) — remplace les boucles `fillRect`/`fillRect` par tuile/motif recalculées à chaque frame depuis la Phase 1/le palier 2. Deux subtilités rendues nécessaires par ce choix, aucune des deux anticipée par la fiche :
  - **Scène plus petite que le viewport** (la seule à ce jour : `scene_maison_exterieur_placeholder`) : `camera.js` la CENTRE (jamais ne la borne), donc `camera.x`/`y` peuvent être négatifs — un recadrage naïf enverrait une coordonnée source négative à `drawImage`. `calculerOrigineCouche()` décale le contenu pré-rendu dans un canvas assez grand, avec exactement la même formule que `calculerCamera`, pour que `camera + origine` reste toujours ≥ 0 par construction.
  - **Porte conditionnelle** (`scene.portes[]`, Phase 1 : `flag_grotte_sortie` change `tile_mur` en `tile_sortie`) : un cache keyé seulement par `(sceneId, echelle)` aurait figé la porte dans son état d'entrée en scène pour toujours, puisque le calque n'est reconstruit que sur un changement de scène/échelle. `signaturePortesScene()` (l'état booléen de chaque `porte.flag`) rejoint la clé de cache — `scene.js#chargerScene` expose donc désormais `portes` (jusqu'ici seulement lu en interne par `idTuileEffectif`).
- **`scene.js#chargerScene` expose `decor` et `portes`** en plus de la correction d'`obscurite` ci-dessus — additifs, aucune régression sur les champs déjà exposés.

### Erreurs et fixes

- **Fausse alerte "damier régulier" sur les tuiles** : une première capture en navigateur montrait un motif de damier bien trop régulier pour un hash pseudo-aléatoire correctement distribué. Un premier script de diagnostic (comparaison d'égalité stricte entre la couleur retournée et les couleurs d'auteur `render.valeur`/`variantes[0]`) semblait confirmer une distribution très biaisée — mais c'était un bug du **script de diagnostic lui-même** : `couleurTuile` applique **toujours** l'ajustement de luminosité (`variation_teinte`) au résultat, donc la couleur finale n'est presque jamais strictement égale à une des couleurs d'auteur, faisant échouer l'égalité pour la quasi-totalité des cases sans rapport avec la variante réellement choisie. Un second script imprimant les valeurs hex réelles a confirmé une distribution correcte, mottée, non répétitive. Conclusion : le damier visuel de la capture JPEG est un artefact de compression (les deltas de teinte ne dépassent pas ~4 %, aisément écrasés par la quantification JPEG à ce niveau de zoom), pas un bug du jeu — consigné dans `CHECKLIST_visuelle.md` avec la méthode de vérification programmatique à rejouer si le doute revient.
- **`test_phase0_scene_camera_2026-09-15.js` cassé par le changement de contrat de `genererDecor`** : son test de déterminisme du décor (§6/§7) dépendait du comportement Phase 0 ("toujours au moins un motif, densité par défaut"), disparu avec le passage à `scene.decor` obligatoire pour produire quoi que ce soit. Corrigé en ajoutant un `decor` minimal au fixture de scène du test (un id de visuel arbitraire, `decor.js` ne validant pas les références — c'est le rôle de `schemas.js`, hors de ce test) : le test continue d'exercer exactement ce qu'il visait (déterminisme du générateur), sur le nouveau contrat.

### Livré et validé

```
node tools/run_tests.js
```
→ 31 fichiers, tous verts (30 précédents, `test_phase0_scene_camera` corrigé pour le nouveau contrat de `genererDecor`, + `test_phase1b_scenes_schema`, nouveau : obscurite objet/bool refusé, faisceau valide/incomplet/type inconnu, decor valide/référence invalide/poids invalide, scène de test à 0.9 (D10 carte mentale) passe sans code, tiles.variantes/variation_teinte).

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

**Script Node ad hoc (pas une suite headless permanente, scratchpad de session)** avant la vérification navigateur : charge le vrai `data/`, `validerCatalogues` sur l'ensemble (confirme que les 2 scènes de la grotte + `tiles.json`/`visuels.json` mis à jour passent la validation complète, pas seulement des fixtures synthétiques), puis exerce `dessinerScene`/`dessinerObscurite` sur les 2 scènes réelles avec un faux ctx enregistreur sur 2 frames (calque statique construit puis réutilisé), plus les 2 cas limites identifiés ci-dessus (scène plus petite que le viewport, bascule de la porte) — aucune exception, transform toujours restaurée à `f`.

**Vérification en navigateur réel effectuée par l'agent cette session** (`node serveur_local.js` + Chrome, pilotage manuel image par image — patch `requestAnimationFrame` + réimport de `src/main.js`, même artefact d'outillage que les paliers 1/2, `document.hidden` resté vrai malgré l'onglet actif), les 4 nouveaux états de `specs/CHECKLIST_visuelle.md` (12-15) capturés :
- Faisceaux visibles en salle 1 et salle 2 (cônes pâles tombant du haut de la scène, additifs, jamais un percement du sol).
- Décor (herbe/flaque/rochers) présent aux positions générées ; discret hors des zones éclairées, comportement voulu (le voile les recouvre comme le reste du sol).
- Tuiles avec variation de teinte confirmée programmatiquement après la fausse alerte "damier" ci-dessus.
- Héros gris neutre + contour clair avant le choix du follet (capture depuis une sauvegarde neuve, cf. ci-dessous), puis teinté bleu (Eau) après confirmation — jamais les deux à la fois.
- Aura du follet en pointillés confirmée (remplace le cercle plein).
- Anneau d'attaque toujours correct par-dessus le nouveau calque statique tuiles+décor.
- Menu, dialogue tutoriel, étiquette du monstre : aucune régression.
- Un nouvel épisode de l'artefact "écran totalement noir" (déjà documenté au palier 2 : capture ponctuelle, jamais reproduite, aucune erreur console) rencontré une fois, écarté de la même façon.
- **Effet de bord d'outillage, pas du jeu** : en tentant de vider IndexedDB (`indexedDB.deleteDatabase`) pour repartir d'une sauvegarde neuve, la requête est restée `blocked` (une connexion ouverte par la page elle-même, jamais fermée avant le rechargement) — contourné en appelant directement `save.js#reinitialiserSauvegarde(store)` puis en rechargeant, sans jamais toucher au code du jeu. A eu le bénéfice inattendu de fournir une vraie capture "héros neutre, sauvegarde neuve" sans étape supplémentaire.
- **Non refait cette session** : le monstre blanchi au contact avec sa barre de PV pleinement visible (le follet engagé s'est de nouveau collé exactement à la position du monstre, recouvrant la scène — piège déjà documenté à l'état 8) ; logique inchangée depuis le palier 1 (aucune ligne touchée par ce palier), risque de régression jugé négligeable.

Fichiers modifiés : `src/scene.js` (`obscurite`/`decor`/`portes` exposés sans coercion), `src/decor.js` (`genererDecor` data-driven + `couleurTuile`, réécrit), `src/schemas.js` (`obscurite` objet, `lumieres.type`, `decor`, `validerTile`), `src/visuels.js` (option `rotation`), `src/render.js` (`AURA_TRAIT`, calque statique tuiles+décor, faisceaux, obscurité par scène, `heroTeinte`), `src/main.js` (résolution du décor à l'entrée en scène, `heroTeinte`, aura pointillée), `src/save.js` (`COULEUR_HERO_NEUTRE`), `data/scenes.json` (obscurite objet, faisceaux, decor), `data/tiles.json` (variantes/variation_teinte), `data/visuels.json` (contour du héros, 4 nouveaux motifs de décor), `tests/test_phase0_scene_camera_2026-09-15.js`, `tests/test_phase1_sd_ui_lumieres_2026-09-15.js`, `tests/test_phase1_sd_dialogues_invisibles_2026-09-15.js` (fixtures `obscurite` objet). Fichier ajouté : `tests/test_phase1b_scenes_schema_2026-09-16.js`. `specs/CHECKLIST_visuelle.md` enrichie (états 12-15).

### Point `[OUVERT]`

Aucun nouveau. Hérités, inchangés : clignements/orbite pré-choix (palier 4, décision déjà actée — reste à implémenter), **couleur neutre du héros** (gris moyen désaturé + contour clair appliqué cette session, Xav voulait un gris foncé — verdict en jeu sur la lisibilité avant le choix, cf. `03_grotte-polish.md` §9), durées de l'intro (palier 4).

### Critère de passage — reste à faire par Xav

Rejouer la grotte à la manette et donner un verdict sur (§7 de la fiche) : le gris neutre du héros (lisible avant le choix, ou trop clair/trop terne ?), l'aura pointillée, les faisceaux (discrets ou trop présents ?), la discrétion des flaques, la densité du décor, et la direction artistique globale — c'est ce verdict qui ouvre la Phase 2 après le palier 4. En particulier signaler si le damier de teinte des tuiles reste perceptible en jeu (pas seulement sur une capture compressée) : si oui, `variation_teinte` est probablement trop faible pour ce périphérique d'affichage plutôt qu'un bug, à ajuster en donnée seulement.

### Hors scope pour cette session

Palier 4 (intro cinématique) de `03_grotte-polish.md` — non commencé, prochaine session. Reflets dynamiques de la lumière du follet dans les flaques, rochers collisionnants, chiffres de dégâts flottants, skip de l'intro, équilibrage combat/synergies, sprites, audio — explicitement exclus par la fiche. L'écouteur `resize` redondant de `main.js` (mentionné en hors-scope explicite de la fiche, à retirer seulement si le calque statique l'imposait) n'a pas eu besoin d'être touché — le calque lit l'échelle depuis `ctx.canvas.width` déjà posé par `ajusterCanvasLogiquePhysique`, comme le fait déjà `dessinerObscurite` depuis le MT rendu-net.

## Journal de session — Phase 1b : polish de la Grotte, palier 4 (2026-09-16)

Suite directe des paliers 1-3 (sessions précédentes). Spec : `specs/03_grotte-polish.md` §3.5. Livre l'intro cinématique de la Grotte (≤10s, non narrée, non skippable) : machine à états pure `src/intro.js`, durées/lévitation en données (`scenes.json > scene_grotte_salle_1.intro`), rendue via `dessinerVisuel`/un nouveau calque `render.js#dessinerPaupieres`, branchée comme une UI ouverte de plus au point de décision unique de `main.js#maj()`. Dernier palier de `03_grotte-polish.md` (§1 : ordre 1→4 imposé) — la Phase 1b est donc complète ; ne reste que le verdict de Xav sur la direction artistique globale (§7 de la fiche) pour ouvrir la Phase 2.

### Décisions prises et pourquoi

- **Deux machines à états pures distinctes dans `src/intro.js`** (`creerIntro`/`avancerIntro`/`etatRendu` pour les étapes 1-2 ; `creerDepart`/`avancerDepart`/`etatRenduDepart` pour l'étape 4), plutôt qu'une seule machine à 4 étapes : l'étape 3 (bulle de choix) est l'écran existant, piloté par son propre rythme (le joueur choisit quand il veut) — un minuteur unique pour les 4 étapes aurait dû soit ignorer cette durée variable, soit la faire dépendre à tort d'un temps fixe. `intro` couvre uniquement les étapes à durée fixe et déclenchées par l'entrée en scène (1+2, budget ≤8s vérifié par test) ; `depart` est déclenché séparément par `confirmerChoixFollet()`, à un instant que seul le joueur détermine.
- **`intro`/`depart` traités comme "une UI ouverte" de plus au point de décision unique de `main.js#maj()`** (`introEtaitActive`/`departEtaitActif`, capturés AVANT d'avancer le minuteur, pas après) — consigne explicite de la fiche (§6 : "aucun second `if`"). Capturer l'état AVANT l'avancement (plutôt que relire `intro`/`depart`, potentiellement redevenus `null` cette même frame après la transition vers `demarrerChoixFollet()`) est nécessaire pour que la frame de transition reste elle aussi gelée pour le gameplay — même principe que `dialogueVientDeSOuvrir` déjà en place pour la frame d'ouverture consommée (§3.2, palier 1) : un dialogue qui s'ouvre au milieu d'une frame ne doit jamais recevoir l'input de cette même frame.
- **Aucun input lu par `intro`/`depart`** (contrairement à `dialogue.js`/`choixFollet`, qui ont un `traiterInput`) : conforme à "non skippable" (§3.5) — la seule action de `main.js#maj()` à leur égard est d'avancer leur minuteur du delta plafonné, jamais de lire `etatBrut`.
- **Positions de départ des 3 follets (bords de l'écran) codées en constante privée de `intro.js`**, pas en données : purement décoratif, sans effet gameplay, même statut que `ORDRE_CHOIX_FOLLET`/l'arrangement de l'écran de choix dans `main.js` — la fiche ne demande la donnée que pour les durées et la lévitation (§2.2), pas pour ces positions.
- **`POSITIONS_ECRAN_FOLLETS`/`Y_ECRAN_FOLLETS`/`TAILLE_FOLLET_REPOS_PX` extraites en constantes de `main.js`**, réutilisées par `dessinerEcranChoixFollet()` (préexistant, inchangé en substance) ET par la nouvelle convergence de l'intro : une seule définition des 3 positions cibles, jamais un second jeu de coordonnées qui pourrait diverger — condition nécessaire pour que la convergence de l'intro atterrisse exactement là où l'écran de choix affichera ensuite les mêmes follets, sans saut visuel au handoff (vérifié en navigateur, cf. plus bas).
- **Paupières = nouveau calque hors-écran dédié** (`render.js#dessinerPaupieres`, `canvasPaupieres` module-level, même patron que `canvasVoile`/`dessinerObscurite`) plutôt qu'un `destination-out` direct sur `ctxLogique` : exactement le piège déjà documenté par `SD_dialogues-invisibles`/le voile d'obscurité — percer un trou directement sur le canvas où la scène est déjà dessinée l'efface au lieu de la révéler (elle est déjà fusionnée en un seul bitmap). Composé en tout dernier dans `main.js#dessiner()` (après HUD, dialogue, écran de choix) : c'est un rideau de cinématique, il doit tout couvrir tant qu'il n'est pas ouvert, sans dépendre de l'ordre des autres calques.
- **Ellipse de l'ouverture obtenue par `scale(rx, ry)` + cercle unité**, pas par un dégradé radial elliptique natif (inexistant en Canvas 2D) — `rx`/`ry` grandissent avec `ouverture` (0→1), le dégradé (`RATIO_COEUR_PAUPIERE`) évite un contour net, cohérent avec la direction artistique "assemblage moderne, jamais de flou/filtre".
- **Un "clignement" modélisé en triangle (0→1→0 sur sa durée entière)**, pas par une phase d'ouverture puis un plateau puis une fermeture séparées : plus simple, suffisant pour l'effet recherché (§3.5 ne demande pas de plateau explicite), et une seule fonction (`ouvertureClignement`) au lieu de trois.
- **Étape 4 (départ) ne redessine jamais l'élu** : `etatRenduDepart` filtre explicitement `indexElu` de son résultat — le vrai follet (`companion.js`, déjà `follet` dans l'orchestrateur dès `confirmerChoixFollet()`) est dessiné par le chemin normal de `dessinerScene()`, jamais une 2ᵉ silhouette qui dupliquerait ou décalerait le rendu.
- **`ORDRE_CHOIX_FOLLET[index]` retrouvé via `choixFollet.index` capturé avant sa remise à `null`** dans `confirmerChoixFollet()` (variable locale `index`) : nécessaire pour que `creerDepart(config, index)` sache quel follet exclure, alors que `choixFollet` lui-même est déjà effacé à ce point (le follet réel existe déjà, mais l'écran de choix ne doit plus être considéré actif).

### Livré et validé

```
node tools/run_tests.js
```
→ 32 fichiers, tous verts (31 précédents + `test_phase1b_intro_2026-09-16`, nouveau : étapes dans l'ordre sur un fixture pur, budget étapes 1+2 ≤ 8000ms **sur les vraies données de `scenes.json`** (mesuré 7200ms), positions de convergence exactes en fin d'étape 2, départ qui exclut l'élu et éteint les 2 autres, bout en bout sur le vrai orchestrateur : intro active dès l'entrée en salle 1, narration fermée pendant toute sa durée, spam `ATTACK` continu sans aucun effet avant sa fin (non skippable), narration qui s'ouvre à l'heure sans être aussitôt refermée par le même spam (mécanisme 1 du palier 1 réutilisé), `reinitialiserPartie()` qui relance l'intro à `tMs=0`, jamais un état réutilisé).

5 fichiers de tests préexistants mis à jour pour le nouveau délai automatique avant la narration (l'intro s'intercale désormais entre l'entrée en scène et `dlg_grotte_choix_follet`, ~7,2s sur les données réelles) : `test_phase1_sd_grotte_choix_follet`, `test_phase1_sd_reset_sauvegarde`, `test_phase1_sd_audit_chemin_critique`, `test_phase1b_combat_feedback`, `test_phase1b_dialogue_antispam` — chacun avance désormais des frames neutres jusqu'à l'ouverture du dialogue (`avancerJusquauDialogue`) avant de rejouer sa séquence existante, et attend la fin du départ (`attendreFinDepart`) avant de vérifier que le déplacement redevient possible après la confirmation du follet. Aucune assertion de fond modifiée — uniquement l'attente du nouveau palier, cohérent avec la note déjà présente dans ces fichiers ("la durée du chemin critique s'allonge mécaniquement hors dialogues, c'est attendu").

```
node --check <chaque fichier .js de src/, tests/, tools/, serveur_local.js>
```
→ tous valides.

**Script Node ad hoc (scratchpad de session)** avant la vérification navigateur : exerce `main.js#dessiner()` (choix follet, intro, paupières, départ) sur les vraies données avec un faux ctx enregistreur, sur plusieurs frames à travers chaque étape — aucune exception, transform toujours restaurée à l'échelle entière après chaque `dessiner()`.

**Vérification en navigateur réel effectuée par l'agent cette session** (`node serveur_local.js` + extension Chrome connectée), les 3 nouveaux états de `specs/CHECKLIST_visuelle.md` (16/17/18) capturés. **Changement de méthode par rapport aux paliers précédents** : plutôt que patcher `requestAnimationFrame` puis réimporter `src/main.js` (technique des paliers 1-3), cette session construit un second orchestrateur manuel directement dans la page (mêmes modules réels, mêmes données réelles) piloté frame par frame via `orch.maj(dt); orch.dessiner();` appelés synchrones depuis `javascript_tool` — équivalent mais qui n'a plus besoin d'attendre le moindre timer réel. **Piège rencontré et corrigé en cours de session, consigné en détail dans `CHECKLIST_visuelle.md`** : la page charge aussi `demarrerJeu()` automatiquement (comme en jeu réel), donc DEUX orchestrateurs dessinaient sur le même canvas tant que `requestAnimationFrame` n'était pas neutralisé — a produit plusieurs captures d'écran trompeuses avant d'être diagnostiqué et corrigé par `window.requestAnimationFrame = () => 0`. Aucune conséquence sur le code du jeu, uniquement sur la méthode de vérification de cette session — la leçon (vérifier par lecture directe de pixel `getImageData` dans le même appel `javascript_tool` que `dessiner()`, plus fiable qu'un `computer.screenshot` séparé sur cet environnement) est actée dans `CHECKLIST_visuelle.md` pour la prochaine session graphique. Une fois corrigé : paupières fermées au tout début (pixel noir confirmé), grand ouvertes au pic d'un clignement (scène/halo visibles), refermées dans le creux entre deux clignements, follets apparus aux bords de l'écran puis convergés en vol vers les 3 positions de l'écran de choix (capture à mi-parcours), handoff sans saut visuel vers l'écran de choix existant, confirmation → follet réel + dialogue d'enthousiasme + aura pointillée + héros teinté (aucune régression du palier 3), départ des 2 follets non élus confirmé par état (`obtenirDepart()` non nul puis `null` en fin de minuteur). Aucune erreur console sur toute la session.

Fichiers ajoutés : `src/intro.js`, `tests/test_phase1b_intro_2026-09-16.js`. Fichiers modifiés : `src/schemas.js` (validation `scenes.intro`), `src/render.js` (`dessinerPaupieres` + son calque dédié), `src/main.js` (état `intro`/`depart`, branchement au point de décision unique, `dessinerIntroConvergence`/`dessinerDepart`, constantes `POSITIONS_ECRAN_FOLLETS`/`Y_ECRAN_FOLLETS`/`TAILLE_FOLLET_REPOS_PX` extraites), `data/scenes.json` (`scene_grotte_salle_1.intro`), `tests/test_phase1_sd_grotte_choix_follet_2026-09-15.js`, `tests/test_phase1_sd_reset_sauvegarde_2026-09-15.js`, `tests/test_phase1_sd_audit_chemin_critique_2026-09-15.js`, `tests/test_phase1b_combat_feedback_2026-09-16.js`, `tests/test_phase1b_dialogue_antispam_2026-09-16.js` (délai de l'intro avant la narration). `specs/CHECKLIST_visuelle.md` enrichie (états 16-18 + journal détaillé de l'artefact d'outillage).

### Point `[OUVERT]`

Aucun nouveau. Les deux points hérités sont désormais fermés : **clignements/orbite pré-choix** (implémentés par ce palier 4, 2026-09-16) et **couleur neutre du héros** (gris moyen désaturé + contour clair — direction artistique validée en jeu par Xav le 2026-09-16). Seules les durées de l'intro (§9 de `03_grotte-polish.md`, ≈8s) restent provisoires — ajustables sur ressenti manette, pas un point de design non tranché en soi (la fiche donne déjà des valeurs de référence).

### Critère de passage — reste à faire par Xav

C'est le critère de toute la Phase 1b (§7 de la fiche), plus seulement de ce palier : nouvelle partie à la manette, intro complète (durée ressentie ≤10s, pas de saccade, pas de skip possible), choix, salle 1, salle 2 ; spammer `A` pendant tout le parcours (aucun dialogue raté) ; combat (anneau, flash, barre de PV) ; puis verdict sur le gris neutre du héros, l'aura pointillée, les faisceaux, la discrétion des flaques, la densité du décor, la durée/le rythme de l'intro, et la direction artistique globale — ce verdict ouvre la Phase 2 (Maison).

### Hors scope pour cette session

Audio (l'intro reste muette, §8), skip de l'intro, reports documentaires en retard (§8, mini-ticket séparé) — tous explicitement exclus par la fiche. Aucun système généralisé de cinématique créé : `src/intro.js` reste propre à cette unique séquence (deux machines à états dédiées), pas un moteur de cinématiques réutilisable — cohérent avec la contrainte de méthode ("aucun système généralisé avant qu'un second cas d'usage réel existe") et avec le patron déjà suivi par la séquence de la grotte elle-même (`main.js`, script par id de scène, pas un système de déclencheurs).

## Journal de session — Reports documentaires (2026-09-16)

Brief complet : `specs/MT_reports-documentaires_2026-09-16.md`. Aucun code touché — uniquement les documents en retard sur ce qui a été tranché et validé en jeu depuis le 2026-09-15.

Fichiers modifiés : la carte mentale renommée en version 1.3.0 (compteur d'avancement recompté à 31 🟢 / 7 🟡 / 0 ⚪ / 1 🔵, table des décisions complétée) ; `specs/02_grotte.md` (version 1.2.0 : résolution 480×270 actée en §2.2/§9, §7 point 3 marqué fait, §10 nettoyée) ; `specs/00_ROADMAP.md` (synergies écrites, statut Phase 1 livrée, Phase 2 courante) ; `CLAUDE.md` (bloc « État actuel du dépôt » raccourci, ce journal, `[OUVERT]` du dernier journal fermé) ; `specs/01_socle-technique.md` (référence de fichier mise à jour uniquement) ; `specs/03_grotte-polish.md` (référence de fichier + son propre §9 : la couleur neutre du héros est marquée fermée, validée en jeu — hors de la liste de cibles du ticket mais nécessaire pour que son `[OUVERT]` reste honnête, signalé ici).

Vérification : occurrences historiques seulement pour l'ancienne résolution (journaux datés du 15, changelogs) ; aucune référence résiduelle à l'ancien nom de la carte mentale hors changelogs qui le citent comme historique ; `git diff --stat` → uniquement des `.md` (+ le renommage) ; `node tools/run_tests.js` rejoué par acquit de conscience → tous verts, inchangé (aucun fichier de `/src`, `/data`, `/locales`, `/tests`, `/tools` touché).

### Point `[OUVERT]`

Aucun nouveau, aucun fermé par cette session (documentaire uniquement). Hérité, inchangé : durées de l'intro (`03_grotte-polish.md` §9).

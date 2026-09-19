# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et 3 (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`, close le 2026-09-17). **Chantier `specs/05_construction-stations.md` (placement libre des stations) close le 2026-09-19** : validé par Xav en jeu à la manette puis au clavier seul, après le correctif de parité clic/verbe (détail complet des 4 diagnostics successifs : `docs/archives/INDEX.md`). **Polish post-Construction : étapes 1 à 6 livrées et validées en jeu à la manette par Xav le 2026-09-19** (« ça fonctionne, le jeu est fluide ») — instrument de mesure sous `?debug=fps`, héros à l'échelle 0,88, follets visibles pendant l'intro, silhouette du puits, traînée de poussière, HUD sur un bandeau d'une ligne. La branche `polish-2026-09-19` est **fusionnée dans `main`** (`e5b6d44`) : on travaille sur `main`.

**Le volet rendu des fondations est clos sur PC, sous Chrome.** Treize relevés `?debug=fps` réels existent (§6 de `docs/DOC_suivi-dettes.md`). Le relevé qui tranche est `R-11` : **Chrome, plein écran, échelle forcée 8 — 59,9 fps, aucune frame sautée**, GPU à 14 %, aucune saccade vue par Xav en traversée. **Chrome est le navigateur de développement, de jeu et de référence** ; sous Firefox, le même PC exécute le dessin sur le fil principal et devient injouable à l'échelle 5 — ce n'était pas le jeu, c'était le navigateur (registre `docs/DOC_navigateurs.md`). Conséquences : `Q-19` close **sans plafond d'échelle** (la décision « rendu net à résolution physique » est confirmée, cette fois sur mesure), `D-01` déclassée en P2, `D-02` et `D-03` en P3.

**Côté mobile, rien n'est clos.** Le Galaxy A04 rend ~37 fps à l'échelle naturelle et ~40 à l'échelle 1 (`R-12`, `R-13`) : diviser les pixels par 9 ne rend que 3,6 fps, donc **l'échelle n'y est pour rien**. `maj()` + `dessiner()` ≈ 7 ms pour 27 ms de delta — **≈ 18 ms par frame que l'instrument ne voit pas** (`D-31`, gelée jusqu'au profil USB `A-07` : aucune correction ne se tente sans profil). L'A04 n'est donc **pas** déclaré appareil plancher (`Q-20`, part mobile). Les **deux relevés de base sous Chrome** sont **pris** (`A-03` close) : `R-14` de jour et `R-03` de nuit, **59,9 fps et zéro frame sautée** à l'échelle naturelle, `dessiner()` 0,33 ms, `maj()` 0,06 ms. `specs/07_chaos-nocturne.md` a donc son point de comparaison : après chaque palier, le même relevé de nuit, comparé à `R-03`.

**Ce qui reste dû (dettes, questions, validations) vit dans `docs/DOC_suivi-dettes.md`, et nulle part ailleurs.**

Historique complet des sessions : **`docs/archives/INDEX.md`** — un fichier par session archivée, contenu verbatim (source de vérité en cas de doute sur le détail d'une décision passée). `CLAUDE.md` ne garde que le journal de la session la plus récente (en fin de ce fichier) — voir la règle de méthode correspondante ci-dessous.

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contexte projet, décisions déjà tranchées (à ne jamais rouvrir), contraintes de méthode, détail de la phase en cours.
- `specs/01_socle-technique.md`, `specs/02_grotte.md`, `specs/03_grotte-polish.md`, `specs/03_maison-exterieur.md`, `specs/04_maison-interieur.md`, `specs/04_stations-proportions-collision.md`, `specs/04_indices-commandes.md`, `specs/05_construction-stations.md` — specs détaillées des phases/chantiers livrés.
- `docs/carte_mentale_RPG_V2_v1_6_0.md` — décisions produit/techniques verrouillées (§0, §8) et règle d'architecture directrice (§7).

**Avant toute action de code**, lire `specs/00_ROADMAP.md` en entier, puis le fichier `0N_*.md` de la phase courante. Ne pas rouvrir une décision déjà actée dans ces documents — un point de design non tranché se marque `[OUVERT]` et remonte à l'utilisateur (dev = Xav), il ne se tranche jamais en silence.

## Le projet

RPG action-aventure 2D en HTML5 / JS / Canvas, en 3 éléments (Feu / Eau / Terre), entièrement data-driven en JSON externes, jouable à la manette sur PC (référence) et au tactile sur mobile (en parallèle, jamais en portage tardif). Gratuit, sans pub ni achat, 100 % hors-ligne, bilingue FR/EN. Refonte complète d'un prototype V1 jetable (`monde/rpg_v0_1_0.js`, hors de ce dépôt) — aucune ligne de la V1 n'est reprise, seuls certains patrons architecturaux validés le sont (tables déclaratives, scène avec `world` calculé, dialogue généralisé, décor procédural à graine fixe, tests headless sans framework).

Développement par sessions isolées, une phase par session. Chaque phase est détaillée dans son propre fichier `0N_*.md` au moment où elle devient courante.

## Règle d'architecture directrice

> On ne spécifie pas seulement ce que le jeu doit faire aujourd'hui. On spécifie comment le jeu doit pouvoir accepter ce qu'on n'a pas encore imaginé.

Test à appliquer à chaque catalogue de données : ajouter une entrée (arme, ennemi, recette, compagnon…) doit être possible **en ajoutant une entrée JSON, sans toucher une ligne de code de système**. Si ce n'est pas le cas, le catalogue n'est pas livré.

## Contraintes de méthode non négociables

- **Un sujet par ticket, une session courte par ticket** (décision Xav, 2026-09-19) — les grosses sessions ont fait perdre plus de temps qu'elles n'en ont gagné. Xav valide en jeu entre deux tickets ; une spec par paliers se joue **un palier par session**. Chaque ticket cite les identifiants de `docs/DOC_suivi-dettes.md` qu'il touche (« traite `D-17`, ne touche pas à `D-11` ») : ne lire dans ce document que ces lignes-là.
- **Un ticket (ou une session) = un commit**, fait en fin de session, l'identifiant du ticket dans le titre (décision Xav, 2026-09-19). Motif : le commit fourre-tout `1be4688` a rendu illisible une nuit entière de travail, alors que la nuit du polish, faite ticket par ticket, se relit d'un coup d'œil. **Les `push` restent à la main de Xav : ne jamais pousser.**
- **Cause racine avant tout patch** — jamais de rustine sur un symptôme.
- **Zéro chaîne en dur** — tout texte visible passe par la localisation FR/EN (`t("clé")`) dès la Phase 0.
- **Zéro dépendance du gameplay à un périphérique** — aucun `KeyboardEvent`, `TouchEvent` ou `Gamepad` en dehors de la couche d'input ; le gameplay ne connaît que des verbes (`MOVE, ATTACK, SKILL_1..3, CONSUME, INTERACT, MENU`).
- **Tout commentaire de code et texte d'UI en français**, style « contexte suffisant pour reconstruire le raisonnement » — un commentaire dit *pourquoi*, jamais *quoi*.
- **Séparation stricte des modules** : registre (données) / input (périphériques) / scène (monde) / rendu (canvas) / save (persistance). Une phase future doit pouvoir remplacer le rendu sans toucher au reste.
- **Tout seuil numérique** (vitesse, `tile_size`, intervalle de sauvegarde, plafond de delta-time, tolérances de collision…) déclaré en un seul endroit, commenté avec son *pourquoi*, marqué **provisoire** s'il n'a pas été validé en jeu.
- **Discipline de scope** : si une tâche déborde du brief, s'arrêter au dernier palier stable et documenter ce qui reste hors scope dans `CLAUDE.md`. Aucun système généralisé avant qu'un second cas d'usage réel existe, sauf les catalogues data-driven listés dans les specs.
- **Le rendu canvas n'est jamais exercé par les tests headless** — toute vérification visuelle revient à Xav dans un vrai navigateur, à la manette.
- **Toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure** (`save`/`restore` ou re-`setTransform` en fin de fonction, commenté pourquoi) — jamais de `setTransform` inline dans `main.js#dessiner()`. Née du diagnostic dialogues invisibles (`docs/archives/JOURNAL_2026-09-15_diagnostic-dialogues-invisibles.md`) : un calque qui lit `ctx.canvas.width/height` pour se positionner alors qu'une transform logique→physique est active double la mise à l'échelle, sans qu'aucun test headless ne puisse l'attraper. **Tout ticket touchant `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou `main.js#dessiner()` se clôt par une validation en jeu de Xav, guidée par `docs/CHECKLIST_visuelle.md`** — même quand le ticket prétend ne toucher qu'un seul de ces fichiers en isolation. *Révisé le 2026-09-19 (décision `Q-15`)* : la capture par état n'est plus exigée pour clore un ticket — la checklist reste la liste de ce que Xav regarde, et les captures deviennent un **album de référence** pris à chaque clôture de phase ou de chantier (six vues fixes dans `docs/captures/AAAA-MM-JJ_jalon/`, annexe B du suivi).
- **Un renommage/retrait de contenu de catalogue (ex. id de scène) n'est jamais couvert par la migration de *schéma*** (`save.js#migrer`) — c'est une classe de bug distincte (données valides mais obsolètes) à traiter explicitement à chaque retrait. Née du repli sur `scene_grotte_salle_1` (`docs/archives/JOURNAL_2026-09-15_phase1-grotte.md`), reproduite ensuite par la migration 2→3 de la Région Maison (`docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`).
- **Ménage de journal en début de session, avant tout code** : archiver le journal présent dans `docs/archives/`, mettre à jour `docs/archives/INDEX.md`, reporter dans les sections consolidées de ce fichier ce qui en relève (décision, règle, `[OUVERT]`, dette), puis seulement travailler. `CLAUDE.md` ne contient jamais plus d'un journal de session. Plafond indicatif : 300 lignes. Née du ménage du 2026-09-17 (`DOC_menage-claude-md_2026-09-17.md`) : le fichier avait atteint ~22 000 mots / 920 lignes, coûtant plus de contexte qu'il n'apportait d'utilité.
- **Un sous-système explicitement "meilleur effort" (le contrat dit déjà : fichier absent → le jeu tourne sans son) rattrape ses propres erreurs à la frontière de son API publique, jamais au niveau de la boucle de jeu.** Née de `docs/archives/JOURNAL_2026-09-17_diagnostic-freeze-musique.md` : une exception dans `audio.js` (contexte/gain `null` à la reprise depuis le menu) est remontée non rattrapée jusqu'à `creerBoucle#frame` (`render.js`), qui ne se replanifie plus après une exception — jeu figé, manette/clavier morts (polling interne à `maj()`), souris vivante (DOM indépendant du `requestAnimationFrame`). Le remède reste local au sous-système fautif (`try/catch` dans `audio.js`, jamais un `try/catch` global autour de `update()`/`dessiner()`, qui masquerait aussi de vraies erreurs de gameplay) — la question de généraliser ce patron à d'autres sous-systèmes est ouverte sous `Q-12` dans `docs/DOC_suivi-dettes.md`.
- **Un relevé de performance cite son navigateur, et deux relevés pris sous des navigateurs différents ne se comparent pas.** La référence est **Chrome** (Xav y développe, y joue et y valide). Sous Chrome le dessin part au GPU : `dessiner()` n'y mesure que l'**émission** des ordres, et le seul signal de fluidité est **« frames sautées »**. Sous Firefox le dessin s'exécute sur le fil principal : `dessiner()` y mesure le dessin réel, ce qui en fait un bon **banc de mesure du coût par calque**, jamais un verdict de fluidité. Née des relevés du 2026-09-19 au soir (`R-05` à `R-11`), où la même build passait d'injouable à 60 fps sans qu'une ligne de code change. Registre : `docs/DOC_navigateurs.md`.
- Pas de framework de jeu, pas de bundler obligatoire. Une dépendance de **dev** (ex. validateur de schéma type `ajv`) est acceptable tant qu'elle reste hors du jeu servi.
- Servi en `http://` (jamais `file://`) ; modules ES natifs. Chaque fichier de `/src` doit rester importable depuis Node pour les tests headless — aucun accès DOM au niveau module.

## Commandes

- Vérification syntaxique : `node --check <fichier>.js` sur chaque fichier JS livré (aucune dépendance, `package.json` déclare `"type": "module"`).
- Tests : `node tests/<nom>.js` pour un fichier isolé, ou `node tools/run_tests.js` (= `npm test`) pour toute la suite d'un coup. Pas de framework de test, scripts headless autonomes basés sur `node:assert/strict`.
- Serveur local : `node serveur_local.js` (statique, sans dépendance, réponses `no-store`), sert le jeu sur `http://localhost:8080`.

## Architecture (état courant)

```
rpg_v2/
├── index.html              mise en page seulement, zéro logique
├── serveur_local.js        statique, sans dépendance, no-store
├── package.json            "type": "module", zéro dépendance runtime ou dev
├── src/
│   ├── main.js             demarrerJeu() = boot DOM/réseau/IndexedDB ; creerOrchestrateurGrotte()
│   │                       (exporté) = tout le reste (choix du follet, combat, énigmes, dialogue,
│   │                       portails, zones, jour/nuit, audio, construction des stations,
│   │                       reinitialiserPartie) — importable/
│   │                       testable depuis Node sans DOM ; script propre aux scènes du jeu, pas
│   │                       un système généralisé de déclencheurs
│   ├── registry.js         validerCatalogues() / construireRegistre() — pur, sans I/O
│   ├── schemas.js          schéma par catalogue (champs requis, id, refs, validation custom)
│   ├── io_node.js / io_navigateur.js   adaptateurs disque (tests) / réseau (jeu) pour registry.js
│   ├── storage_indexeddb.js adaptateur IndexedDB pour save.js
│   ├── input/              input.js (fusion clavier+manette+tactile en verbes, loquet tactile,
│   │                       loquet périphérique actif), gamepad.js, keyboard.js (reset sur `blur`),
│   │                       touch.js (joystick+boutons)
│   ├── scene.js            layout (tableau ou lignes+légende) → forêt procédurale → structures ;
│   │                       collisions 4 coins + glissement + correction de coin (chevauchement
│   │                       ≤ `TOLERANCE_COIN_PX`, cf. `docs/archives/JOURNAL_2026-09-16_diagnostic-accrochage-arbre.md`) ; portes conditionnelles ;
│   │                       portailFranchi()
│   ├── camera.js           bornée sur grande scène, centrée sur scène plus petite que le viewport
│   ├── decor.js            décor procédural pondéré (PRNG mulberry32) + couleurTuile (variantes/teinte)
│   ├── render.js           résolution logique/physique (DPR) — `echelleDepuisCanvas` est LA
│   │                       dérivation de l'échelle, relue par tous les calques ; `?echelle=N`
│   │                       (debug, `D-23`) la remplace en un seul point et ne touche jamais la
│   │                       présentation à l'écran ; fenêtrage du calque statique
│   │                       tuiles+décor, obscurité par scène (voile+faisceaux+halos), paupières
│   │                       d'intro, HUD/dialogue/anneau/aura — jamais testés headless au-delà
│   │                       des fonctions pures (résolution, fenêtrage)
│   ├── visuels.js          dessinerVisuel() : seul point qui interprète `data/visuels.json`
│   │                       (primitives + teinte/alpha/échelle/rotation)
│   ├── intro.js            2 machines à états pures : intro (clignements+orbite, ≤8s) et départ
│   │                       (follets non élus qui repartent) — propre à la Grotte, pas un moteur
│   │                       de cinématiques généralisé
│   ├── save.js             double tampon, versions + migrations (v5 : maison.stations), reinitialiserSauvegarde()
│   ├── flags.js            registre de flags + conditions all/any/not + `initial` (persistance)
│   ├── stats.js            stats primaires + dérivées (formule linéaire) + modulateur de survie
│   │                       (`appliquerModulateurSurvie`, Phase 3)
│   ├── status.js           effets d'état (buff/dot/debuff/contrôle) + buffs temporaires du héros
│   │                       (`tickBuffsActifs`/`ajouterBuffActif`, Phase 3), un seul chemin de calcul
│   ├── entities.js         héros/monstres : PV, position, mort/respawn
│   ├── combat.js           auto-attaque annulaire, cooldown, feedback (anneau/flash/barre de PV)
│   ├── companion.js        follet : suivre/engager, position (+ lumière collée)
│   ├── loot.js             résolution de loot table (PRNG injectable)
│   ├── puzzles.js          types `levier`/`sequence`/`station_placeholder`/`station` (instances en
│   │                       données) — `station` référence un TYPE de `stations.json` (rôle/capacité,
│   │                       + `placable` depuis `05_construction-stations.md`)
│   ├── placement.js        `05_construction-stations.md` : grille intérieure, chevauchement, BFS de
│   │                       praticabilité du couloir, `poseValide()` — pur, aucun id en dur
│   ├── resources.js        tuiles-ressources bloquées, `peutRecolter` branché sur la poche réelle
│   │                       depuis Phase 3 (outil requis)
│   ├── inventory.js        poche du héros (items comptés) : `ajouterItem`/`retirerItem`
│   ├── cooldowns.js        Phase 3 : cooldowns en temps actif, réutilise l'horloge de daynight.js
│   │                       (`save.monde.heure`, désormais avancée dans toutes les scènes)
│   ├── recipes.js          Phase 3, Palier A : `peutFabriquer`/`fabriquer`, catalogue `recipes.json`
│   ├── survival.js         Phase 3, Palier C : jauges faim/soif, modulateur, malus de respawn
│   ├── xp.js               Phase 3, Palier D : XP → niveaux (`levels.json`) → points de stats
│   ├── ground_items.js     objets au sol par scène (spawn, ramassage, respawn différé Phase 3)
│   ├── structures.js       toit (opacité dégressive selon la distance du héros) ; empreinte des
│   │                       interactifs (boîte englobante, rotation par quart de tour,
│   │                       `empreinteAbsoluePuzzle` — un seul calcul, réutilisé par scene.js,
│   │                       main.js et placement.js)
│   ├── daynight.js         cycle jour/nuit en 4 phases (constantes) ; `save.monde.heure` sert aussi
│   │                       d'horloge "temps actif" partagée (cooldowns/survie), gelée sous UI
│   ├── audio.js            musique en boucle, armée au premier verbe abstrait (DOM)
│   ├── dialogue.js         file de lignes, machine à écrire + armement anti-spam, résolution locuteur
│   ├── hints.js            indices de commande (specs/04_indices-commandes.md) : un seul affiché
│   │                       à la fois, montré une fois par partie (flag persisté), fermé dès
│   │                       l'émission effective du verbe — pur, ignore i18n/DOM
│   ├── texte_flottant.js   retour de gain dans le monde (« +1 Bois ») : réserve fixe, fusion des
│   │                       gains d'une même frame — pur, ne connaît ni item, ni i18n, ni canvas ;
│   │                       transporte des CLÉS, l'appelant compose le texte au rendu
│   ├── i18n.js             `t(cle, params?)` — `params` substitue les marqueurs `{n}`/`{item}` d'un
│   │                       gabarit traduit ; le gabarit lui-même vit dans les locales, jamais en code
│   └── ui/                 menu.js (DOM ; Langue/Musique/Poche/Stats/Construction/Export/Import/
│                           Reset/Fermer — Construction contextuel, absent hors de la Maison,
│                           liste reconstruite à chaque ouverture ; + écrans contextuels Craft/Coffre
│                           ouverts par INTERACT, patron générique `creerEcranListeGenerique`
│                           factorisé Phase 3), hud.js (+ jauges survie/niveau-XP Phase 3)
│                           + hud_hints.js + dialogue_box.js + hud_layout.js (canvas, résolution logique)
├── data/                   catalogues JSON (voir specs/*.md §2.1 de chaque phase)
├── locales/fr.json, en.json
├── specs/                  00_ROADMAP.md, 0N_*.md par phase
├── docs/                   DOC_suivi-dettes.md (registre vivant : LA liste de ce qui est dû) +
│                           carte_mentale_RPG_V2_v1_6_0.md + fiches de diagnostic/ticket actives
│                           (SD_*.md, MT_*.md, NS_*.md, CHECKLIST_visuelle.md) + archives/
│                           (journaux de session clos, fiches et NS closes) + captures/
│                           (album de référence par jalon) + sauvegardes/ (sauvegardes réelles
│                           exportées par Xav, servent aux migrations)
├── tests/                  un fichier par contrat/diagnostic, headless, `node:assert/strict`
└── tools/run_tests.js      lance tous les tests/*.js en séquence (confort de `npm test`)
```

`registry.js`/`save.js` restent purs (aucun accès disque/réseau/DOM) : les adaptateurs (`io_node.js`/`io_navigateur.js`, `storage_indexeddb.js`/`creerStoreMemoire()`) leur fournissent des données déjà prêtes. Convention d'`id` : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `docs/carte_mentale_RPG_V2_v1_6_0.md` §0 et §8. Points structurants pour le code :

- 3 éléments (Feu/Eau/Terre), extensibles en données uniquement.
- 4 stats primaires : Force, Agilité, Vitalité, Esprit. Esprit = réserve de skills uniquement ; tout le scaling de dégâts converge sur Force, l'élément porte le type/les interactions, jamais la puissance brute.
- 5 slots d'action (1 attaque + 3 skills + 1 consommable), 3 slots d'équipement (arme/armure/accessoire) — nombres déclarés en données.
- Progression sur deux axes indépendants : XP → stats (combat et craft), jalons narratifs → capacités.
- Système de recettes unique ; stations et catégories de sortie en données.
- Cartes : tuiles réutilisables, layout écrit à la main (ou via script d'aide, jamais génération procédurale de layout jouable) + décor non-collisionnant procédural à graine fixe.
- Narration diffuse, aucun journal de quêtes, aucun objectif affiché ; un journal de découvertes existe (ce qui a été trouvé, jamais ce qu'il faut faire).
- Périmètre M1 fermé : Grotte-tutoriel → Région Maison → 1ère zone de monstres → Château → Boss 1 → Poste avancé. Console/cartouches/Codex/alignement bien-mal = M2+.

Décisions datées, nées en cours de développement (détail dans l'archive citée ; une décision révisée n'apparaît qu'en version finale) :

| Décision | Date | Détail |
|---|---|---|
| Mapping manette du menu : navigation `MOVE.y` (front montant), confirmer = `ATTACK`, annuler = `skill_3`/B | 2026-09-15 | `docs/archives/JOURNAL_2026-09-15_micro-ticket-menu-manette.md` |
| Croix directionnelle réservée à de futures actions secondaires, n'alimente jamais `MOVE` | 2026-09-15 | même archive |
| Résolution logique **480×270** (ferme le débat 640×360 / 480×270 / 960×540) | 2026-09-15 | `docs/archives/JOURNAL_2026-09-15_diagnostic-lisibilite-ui.md` |
| Pas de pixel art — rendu net à résolution physique (DPR), jamais `image-rendering: pixelated` | 2026-09-15 | `docs/archives/JOURNAL_2026-09-15_mt-rendu-net.md` |
| Layout de scène en plusieurs passes : manuel > forêt procédurale > structures, le manuel prime toujours | 2026-09-16 | `docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md` |
| Toit : opacité dégressive selon la distance du héros, jamais un simple on/off | 2026-09-16 | même archive |
| Cycle jour/nuit n'avance qu'en temps de jeu actif (gelé sous UI, même point de décision unique que le reste du gameplay) | 2026-09-16 | même archive |
| Clignements + orbite pré-choix implémentés en intro cinématique, ≤10s, non-skippable — clôt le manque relevé à la Phase 1 | 2026-09-16 | `docs/archives/JOURNAL_2026-09-16_phase1b-palier4.md` |
| Couleur neutre du héros : gris moyen désaturé + contour clair — *révise* le gris foncé initialement souhaité par Xav, trop peu visible sur le voile | 2026-09-16 | même archive |
| Stations placeholder : proportions à corriger (échelle ×2 à ×2,2) **et** collision sur certains items — *révise* la décision initiale « non solides » → `specs/04_stations-proportions-collision.md` | 2026-09-16 | `docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md` |
| L'arbre fruitier ne se coupe jamais (fruits, puis jardin/récolte/craft/cuisine seulement) | 2026-09-16 | même archive |
| Tactile différé jusqu'à un lien de partage (Phase 4 ou plus) ; testeur de référence = le neveu de Xav | 2026-09-16 | même archive |
| Indice de commande au **premier** déclenchement de chaque verbe seulement, jamais répété → `specs/04_indices-commandes.md` | 2026-09-16 | même archive |
| Ambiance musicale continue à base de notes synthé qui bouclent, en attendant `piano_solo.mp3` ; repli automatique déclaré par un id (`repli`) dans `data/music.json`, résolu par `audio.js#resoudrePisteRepli` (pure) | 2026-09-16 | `docs/archives/JOURNAL_2026-09-17_micro-ticket-ambiance-synthetisee.md` |
| Nuit extérieure autorisée à dépasser le plafond de la grotte (0.72) — nuit = 0.85 ; *révise* la lecture initiale du ticket qui présentait ce plafond comme une limite dure partagée — décision explicite de Xav, soumise en question bloquante avant implémentation | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_micro-ticket-contraste-jour-nuit.md` |
| Cycle jour/nuit à durées par phase indépendantes (jour 10 min, crépuscule/aube 1 min 30, nuit 4 min francs = 17 min au total) — *révise* le `DUREE_CYCLE_MS` unique découpé en phases égales de la Phase 2 | 2026-09-17 | même archive |
| Fusion `demarrerSynthese`/`reprendreSynthese` en un seul point d'entrée à création paresseuse — corrige le freeze à la bascule Musique non→oui | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_diagnostic-freeze-musique.md` |
| Indices de commande : périphérique actif exposé par `input.js` (loquet, défaut `'manette'`), glyphes toujours résolus via `t()` (même une lettre isolée) | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_indices-commande.md` |
| Échelle des 4 stations fixée à **2,1** (milieu de la fourchette ×2 à ×2,2 demandée) ; empreinte solide = boîte englobante des primitives de rendu, calculée une fois (jamais dupliquée), sauf override explicite `empreinte` en données ; seuil d'interaction unifié (mesuré au bord de l'empreinte pour tous les interactifs, y compris les leviers dont l'empreinte est nulle) | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_stations-proportions-collision.md` |
| Station `station_atelier` déplacée de `(89,58)` à `(89,61)` en données — son empreinte agrandie chevauchait légèrement le couloir intérieur (rangée y=57 entre les deux portes) | 2026-09-17 | même archive |
| Horloge "temps de jeu actif" (cooldowns/survie) = `save.monde.heure` (celle de `daynight.js`), avancée désormais dans **toutes** les scènes (pas seulement `cycleJourNuit`) — jamais une 2ᵉ horloge ; un cooldown qui chevauche le bouclage du cycle (~17 min) expire un peu tôt plutôt que de bloquer (§4 edge case de `04_maison-interieur.md`) | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_phase3-palier-a-e.md` |
| Vitesse de déplacement du héros devient une stat dérivée (`derivee_vitesse_deplacement_px_s`, stat_agilite) au lieu d'une constante — nécessaire pour que le modulateur de survie la ralentisse sans code dédié (même mécanisme que dégâts/cadence) | 2026-09-17 | même archive |
| `item_branche`/`item_caillou` (ramassage libre, Phase 2) restent distincts de `item_bois`/`item_pierre` (récolte réelle à l'outil, Phase 3) — les premiers servent à crafter les tout premiers outils, les seconds sont le produit de `res_bois`/`res_pierre` une fois l'outil en poche | 2026-09-17 | même archive |
| Menu Craft/Coffre/Stats : écrans DOM plein écran génériques (`creerEcranListeGenerique`), Craft/Coffre ouverts directement par INTERACT (hors du menu Pause), Stats accessible depuis le menu Pause ; une entrée grisée retente quand même l'action réelle au confirmer plutôt qu'un no-op factice — le résultat fait foi, jamais une divergence affichage/état | 2026-09-17 | même archive |
| Le respawn d'un item au sol doit être **atteignable depuis le héros**, pas seulement sur une tuile non solide — `ground_items.js#calculerTuilesAtteignables` (BFS 4-connexe depuis le point d'entrée en scène, recalculé une fois par entrée, jamais par frame) filtre désormais `tirerPositionLibre` ; une tuile isolée est retirée et redemandée, jamais acceptée | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_respawn-items-au-sol.md` |
| **Phase 3 validée en jeu par Xav** (Palier A-E, boucle 5 minutes) : tous les points testés, bon — clôture le critère de passage ROADMAP de la Phase 3 | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_phase3-cloture-et-construction.md` |
| Construction (`05_construction-stations.md`) : grille intérieure avec snap (jamais en px), rotation sur les 4 côtés (quarts de tour horaires), menu Pause dédié « Construction » contextuel (absent hors de la Maison) — décisions actées par Xav avant implémentation | 2026-09-17 | même archive |
| Rotation du rendu ET de l'empreinte de collision par la MÊME fonction de composition (`structures.js#tournerEmpreinte`, appliquée le nombre de fois demandé) — jamais deux calculs de rotation qui pourraient diverger entre le visuel et la collision | 2026-09-17 | même archive |
| Mode Construction : l'écran-liste des stations disparaît PENDANT le placement (remplacé par un bandeau DOM en filigrane, sans focus) — *précise* le §3 v1.0.0 de la fiche (« affichées dans le menu lui-même » signifiait « pas via `hints.js` », pas « l'écran reste ouvert »). `A`/`B` en placement retournent à la LISTE (on enchaîne le rangement) ; `MENU` revient proprement au menu Pause (seule sortie complète du mode) | 2026-09-17 | `MT_construction-bandeau-placement_2026-09-17.md` |
| Contrat unique de « ouvert » pour tout contrôleur de `ui/menu.js` (`creerControleurMenu#element`) : booléen interne ET DOM réellement visible, jamais l'un sans l'autre — remplace les 2 contrats qui coexistaient (booléen pur pour le menu Pause/la confirmation de reset, booléen+DOM pour Poche/Craft/Coffre/Stats/Construction) | 2026-09-17 | `docs/archives/JOURNAL_2026-09-17_ecrans-orphelins.md` |
| Fermeture d'un écran de `creerEcranListeGenerique` : événement explicite `onAnnuler` (câblé sur `verbeAnnuler`) plutôt qu'une déduction après coup sur l'état du contrôleur — *2ᵉ classe de bug distincte* du contrat « ouvert » ci-dessus, cette fois entre le chemin clic (sain) et le chemin verbe (manette/clavier cassés) | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_parite-clic-verbe.md` |
| **Construction validée en jeu par Xav, à la manette puis au clavier seul** (après le correctif de parité clic/verbe) — clôt le chantier `05_construction-stations.md` | 2026-09-19 | `NS_decisions-playtest_2026-09-19.md` |
| **Vocabulaire de la Région Maison** (version en vigueur, *révise* celle du playtest) : **Forêt** = côté ouest, où débouche la Grotte · **Jardin** = puits, arbre fruitier, réapparition du fruit · **Zone sûre** = Maison + Jardin **+ un rectangle autour de la sortie de la Grotte** (rien n'y apparaît, un monstre qui y entre fait demi-tour) · **Campagne** = la bande centrale autour du chemin, hors zone sûre, **neutre** (rien n'y apparaît, mais un monstre peut y poursuivre) · **Champs** = deux grandes zones en L, au nord et au sud de la bande centrale, à l'est de la Forêt (le Chaos s'y installe la nuit ; une ferme y viendra plus tard). **Toutes les zones se décrivent en rectangles**, au format `zones` déjà présent dans `scenes.json` | 2026-09-19 | `NS_decisions-revue-dettes_2026-09-19.md` §3, `docs/carte_mentale_RPG_V2_v1_6_0.md` §3bis |
| Héros à l'échelle **0,88** (visuel et hitbox dérivés d'une seule échelle) ; pas de roulement — règle : aucun effet ne dépend de la forme du héros (reste un visuel remplaçable), effet de déplacement = traînée de poussière | 2026-09-19 | même NS |
| HUD sur une ligne en haut, pleine largeur ; barre d'XP retirée du HUD (niveau seul affiché), conservée dans l'écran Stats | 2026-09-19 | même NS |
| Intro : les follets non élus restent visibles pendant le texte (au lieu de disparaître avant) | 2026-09-19 | même NS |
| Échelle propre d'une silhouette déclarée en données (`echelle` sur une entrée de `visuels.json`, composée avec l'échelle d'instance par `visuels.js#dessinerVisuel`) — le rendu ET la hitbox du héros en dérivent, jamais deux nombres indépendants | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_polish-tickets-1-5.md` |
| L'intro reste vivante (étape `ETAPE_ATTENTE`) pendant le dialogue de choix, jusqu'à `confirmerChoixFollet()` — *révise* la mise à `null` à la fin de la convergence, qui laissait les follets sans personne pour les dessiner | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_polish-tickets-1-5.md` |
| Un effet purement visuel du monde (poussière) est un module pur + une entrée de `data/effets.json` ; il ne connaît jamais la forme du héros, et il est gelé par le point de décision unique existant (`uiOuverte`), jamais par une condition propre | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_polish-tickets-1-5.md` |
| HUD = un bandeau d'une seule ligne en haut, pleine largeur ; tout son placement vit dans `ui/hud_layout.js` (pur, testable), jamais en dur dans `ui/hud.js` | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_polish-tickets-1-5.md` |
| **Intrusion nocturne du Chaos dans la Région Maison** — *révise* « aucun monstre, ton chill » de `03_maison-exterieur.md` §5 ; cadre : nuit seulement, **par paliers de niveau déclarés en données** (Nv. 5 zone de Chaos nord-est, Nv. 10 zone sud, Nv. 15 apparitions éparses en Forêt et dans les Champs — la Forêt reste **vide avant 15**, ce qui *révise* « quelques monstres épars en Forêt dès le début »), **un monstre qui entre en zone sûre fait demi-tour** (condition sur sa position, jamais sur celle du joueur) ; destruction des plantations non tranchée (le jardinage n'existe pas encore) — spec `specs/07_chaos-nocturne.md` v1.1.0, qui ne livre que le système et le palier 1 | 2026-09-19 | `NS_decisions-revue-dettes_2026-09-19.md` §4-5 |

| **Un retour de gain dans le monde est UN seul mécanisme**, jamais un par système : `texte_flottant.js` transporte une clé de regroupement, une quantité et des **clés** de localisation — jamais une chaîne composée, qui interdirait la fusion « +1 puis +1 = +2 » et figerait la langue d'un texte déjà en vol. La composition se fait au rendu, dans l'orchestrateur. Butin, XP et dégâts s'y brancheront sans code de système nouveau | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_texte-flottant.md` |
| **Le seuil « accès à la 1ère zone de monstres gaté par niveau ~5 » est abandonné** (*révise une décision verrouillée*) : la carte suivante s'ouvre quand la carte Maison est **épuisée**, vers le niveau 40-50 (provisoire). Conséquence : les *systèmes* prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la *carte* de la Phase 4 vient après — **« Phase 4 = prochaine étape » ne doit plus se lire nulle part** | 2026-09-19 | `NS_decisions-revue-dettes_2026-09-19.md` §4 |
| **Arc de progression de la carte Maison** : Nv. 5 zone de Chaos nord-est · Nv. 10 zone sud · Nv. 15 apparitions éparses (Forêt + Champs) — ces trois sont **décidés** ; Nv. 20 petite caverne en Forêt annoncée par une ligne de lore (casse-tête dessiné par Xav), Nv. 30 les compétences, Nv. 40-50 la carte suivante — ces trois restent des **idées**. Avant toute nouvelle carte : écrire ressources, crafts, armes, compétences | 2026-09-19 | même NS §4 |
| **Critère de clôture de la Région Maison : la boucle de 2 heures** (sauvegarde neuve → deux heures de jeu → niveau 30 → l'envie de changer d'endroit), vérifiable à la main par Xav **et** par le bot headless — même patron que la boucle 5 minutes de la Phase 3 | 2026-09-19 | même NS §4 |
| **Comportement des monstres : « un domaine, pas un piquet »** (*remplace* l'idée de laisse) — errance dans un domaine fait de **zones de la carte** · poursuite bornée depuis le point de repérage · désintérêt de quelques secondes après un abandon ou un demi-tour en lisière de zone sûre · anti-blocage après ~1 s sans avancer. Un monstre ne sort de son domaine que si le joueur l'y attire. **Seuils de niveau en données, jamais dans le code** | 2026-09-19 | même NS §5, `specs/07_chaos-nocturne.md` v1.1.0 |
| **Bandeau HUD, ordre définitif** : compagnon · PV (jauge + nombre) · éclats · faim · soif · **buffs** · `Nv. N` collé au bord droit. Un buff = une icône par **effet** (la stat renforcée), forme et couleur, sans texte ni jauge ; pulsation douce en fondu sur les ~2 dernières secondes. Le bouton MENU tactile descend **sous** le bandeau, qui redevient libre sur toute sa largeur | 2026-09-19 | même NS §6 (tickets `D-13`, `D-17`) |
| **Verbe de rotation en Construction : reste `SKILL_1`**, statut provisoire levé (Construction jugée intuitive à la manette) ; l'indice de commande reste **sous** le bandeau | 2026-09-19 | même NS §6 (`Q-08`, `Q-02`) |
| **Déplacement du fantôme de Construction : impulsion puis répétition au maintien**, via une **brique d'input générique** (« maintien puis répétition ») exposée aux menus et au mode Construction, jamais recodée par écran — corrige aussi le tapotement du joystick tactile | 2026-09-19 | même NS §6 (`D-18`) |
| **« Mains nues » est la première arme du jeu** : la portée de l'auto-attaque de base (actuelle / 2, *provisoire*) et l'icône (une main) vivent dans une **entrée d'arme**, jamais dans une stat ni une constante de `combat.js` ; la case d'attaque de la barre du bas dessine l'icône de l'**arme équipée**, sans cas particulier. *Applique* la décision verrouillée « la portée vient de l'arme » — schéma minimal, à étendre par la spec des armes (`E-02`) | 2026-09-19 | `NS_decisions-fondations_2026-09-19.md` §3 (`Q-21` → `D-20`) |

| **Pas de plafond d'échelle de rendu** : la décision « rendu net à résolution physique (DPR) » du 15/09 est **maintenue et confirmée, cette fois sur mesure** (`Q-19` close). Motif : sous Chrome, 59,9 fps sans une frame sautée jusqu'à l'échelle forcée 8 (`R-11`) ; sur le Galaxy A04, diviser les pixels par 9 ne rend que 3,6 fps (`R-12` → `R-13`). Ni le PC ni le téléphone n'y gagnent : **l'échelle par calque est abandonnée comme chantier**, et pas d'échelle au-dessus de la naturelle non plus (aucun gain de netteté). `?echelle=N` reste un outil de debug | 2026-09-19 | `NS_decisions-rendu-navigateurs_2026-09-19.md` §2 |
| **Chrome est le navigateur de développement, de jeu et de référence.** Les autres : « on verra plus tard », en conseillant gentiment Chrome aux joueurs (politique d'engagement envers Firefox/Safari non tranchée, `Q-24`). Deux mises en garde qui ne se retournent jamais contre le joueur : **jamais de navigation privée** dans un conseil (la sauvegarde IndexedDB y est effacée à la fermeture), et **« hors connexion » n'existe pas** tant que le jeu n'est pas mis en ligne avec une mise en cache applicative | 2026-09-19 | même NS §2, registre `docs/DOC_navigateurs.md` |
| **Les valeurs de base du début de jeu sont basses, et tout grandit ensuite** par l'équipement, les niveaux, les buffs : taille et vitesse du héros, portée de l'arme, lumière et orbite du follet. « Là, maintenant, ce sera dur à jouer ; plus tard, ce sera normal. » **Conséquence d'architecture, et la seule** : une valeur de base destinée à grandir n'est **jamais lue directement par un système** — elle passe par une fonction pure de résolution (base en données → valeur effective), qui rend aujourd'hui la base telle quelle. Aucun buff, aucun équipement, aucun modificateur n'est livré avec le point d'entrée : seulement le point d'entrée, testé | 2026-09-19 | `BRIEF_nuit-2026-09-19.md` §0 bis |
| **Le follet est équipable** (tranche D11④ de la carte mentale) : *a priori* **un seul emplacement**, qui reçoit soit une **amulette** (capacités plutôt offensives), soit un **talisman** (capacités plutôt défensives, de support). Exemple d'effet donné par Xav : orbite × 2, pour aller frapper des monstres plus loin du héros ; l'orbite pourra aussi grandir avec la portée, le niveau et les stats du follet. **Rien n'est livré** : ni emplacement, ni objet, ni champ de sauvegarde — la spec vient avec celle des armes et de l'équipement (`E-02`) | 2026-09-19 | même brief, `Q-29` |

(Les décisions de `05_construction-stations.md` étaient déjà actées par Xav **dans la spec elle-même** avant tout code, v1.0.0 §9 — les lignes ci-dessus n'y renvoient que pour mémoire, elles ne tranchent rien de nouveau.)

## Ce qui est dû : dettes, questions, validations

Tout vit dans `docs/DOC_suivi-dettes.md`. Ce fichier n'en garde aucune copie :
deux listes finissent toujours par se contredire.

**Lecture.** Ne lis dans ce document que les lignes dont le ticket courant cite
l'identifiant. Le reste ne concerne pas ta session et noierait ton travail.

**Dans le périmètre du ticket, tu gardes l'initiative.** Quand un point de design
n'est pas tranché, tu peux retenir une valeur ou une solution par défaut et
continuer : marque-la `[OUVERT]`, ajoute une ligne `Q-` au document, et
signale-la en tête de ton rapport pour que Xav confirme ou révise. Même chose
pour une finition que le ticket ne demandait pas mais qui sert son intention.
Arrête-toi plutôt que de choisir seulement quand le choix serait coûteux à
défaire : format de sauvegarde, contrat entre modules, décision verrouillée.

**Hors du périmètre du ticket, tu proposes.** Un défaut ou une idée qui touche
d'autres fichiers ou un autre système ne se corrige pas en passant : personne ne
relit un changement hors ticket. Vérifie s'il a déjà un identifiant ; sinon
ajoute une ligne `D-` (défaut) ou `Q-` (idée, proposition de polish) et
mentionne-la dans ton rapport. Tes propositions sont attendues : le jeu se
conçoit à deux.

**Clôture.** Tu clos les lignes `D-` et `DOC-` que tu as livrées, avec la date et
une ligne de verdict. Tu ne clos jamais une ligne `Q-`, `V-` ou `E-` : Xav seul
tranche, valide en jeu et écrit.

**Ménage de journal.** En début de session, avec l'INDEX : ouvre les lignes que
la session précédente a révélées, clos celles qu'elle a livrées.

## Critère de passage courant

**Phase 3** (`04_maison-interieur.md`) et **chantier Construction** (`05_construction-stations.md`) : **tous deux close, tous deux validés en jeu par Xav.** Détail complet des diagnostics successifs (stations invisibles, jauges figées, respawn cassé, écrans orphelins, parité clic/verbe) : `docs/archives/INDEX.md`.

**Polish post-Construction — étapes 1 à 6 livrées et validées en jeu à la manette** (Xav, 2026-09-19 : « ça fonctionne, le jeu est fluide ») : instrument `?debug=fps`, héros à 0,88, follets visibles pendant l'intro, silhouette du puits, traînée de poussière, HUD sur un bandeau d'une ligne. Le tactile et les valeurs provisoires restent à valider (`V-02` a déjà rendu un « non » : le bouton MENU tactile chevauche le bandeau → ticket `D-17`). **Étape 7 (correction des saccades) : sans objet sur PC** — sous Chrome, aucune frame sautée jusqu'à l'échelle forcée 8 (`R-11`) ; `D-01` passe en P2 (pertinente sur appareil faible seulement), `D-02` et `D-03` en P3, gelées.

**Le volet rendu des fondations est clos sur PC, sous Chrome ; il ne l'est pas sur mobile.** L'A04 n'est pas jouable (~37 fps) et la cause est inconnue (`D-31`, gelée jusqu'au profil `A-07`) : il n'est donc **pas** déclaré appareil plancher. `Q-20` est reformulée en conséquence — part PC acquise, part mobile ouverte. **Chrome est le navigateur de développement, de jeu et de référence** ; le tableau des moteurs et leur statut vivent dans `docs/DOC_navigateurs.md` (registre vivant), et la politique d'engagement envers Firefox/Safari est `Q-24`, non tranchée.

**La carte Maison n'est pas finie, et la Phase 4 n'est plus la prochaine étape.** Les systèmes prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la carte suivante s'ouvre quand la Maison est épuisée (Nv. 40-50, provisoire). Critère de clôture de la Région Maison : **la boucle de 2 heures** (sauvegarde neuve → 2 h de jeu → Nv. 30 → l'envie de changer d'endroit).

**Décision de méthode (Xav, 2026-09-19, 17 h 18) : on ne rajoute pas de contenu sur des bases non confirmées.** Avant `specs/07_chaos-nocturne.md` et avant de rouvrir `Q-07` (passée à **gelée**) : la **performance** et les **retours du playtest du 19/09**. On repart de la base et on remonte, **un ticket par session**, validation en jeu entre deux.

**Ordre d'injection** (amendé par `BRIEF_nuit-2026-09-19.md`, décision de Xav — *remplace* le §5 de `NS_decisions-rendu-navigateurs_2026-09-19.md`, archivée) : **un ticket par session, un commit par ticket**, chacun citant les identifiants du suivi qu'il touche. La nuit du 19 au 20 respecte la règle autrement : une **file de micro-tickets**, un commit chacun, dans cet ordre, pour que Xav puisse fusionner « jusqu'au commit N » et laisser le reste.

1. Doc : NS de la soirée + les deux relevés de base — **fait** (`A-03` close : `R-14` jour, `R-03` nuit, 59,9 fps et zéro frame sautée sous Chrome).
2. **Tailles, vitesse, lumière** : `D-32` (héros à 9 px), `D-33` (vitesse de base −25 %), `D-34` (follet −25 % en jeu, orbite inchangée), `D-35` (lumière du follet ramenée à l'aura, **à l'extérieur seulement** — la Grotte ne change pas).
3. `specs/07_chaos-nocturne.md`, **un palier par session** (A, B, C, D). Après chaque palier : le relevé de nuit, comparé à `R-03`.
4. `D-36` — follet « aérien » : **proposition**, volontairement en dernier pour rester détachable.
5. `D-17` (bouton MENU tactile sous le bandeau) et `D-30` (plein écran au premier appui tactile) — même périphérique, même validation, à traiter ensemble.
6. `D-13` — buffs dans le bandeau HUD.
7. `D-01` (défilement incrémental du calque), `D-16` (puits), puis reprise de `Q-07`.

Les sept tickets de code du 19/09 (`D-22`, `D-21`, `D-20` A et B, `D-05`, `D-23`) sont livrés — détail et validations restantes dans `docs/DOC_suivi-dettes.md`. En parallèle, côté Xav : `A-06` (Firefox `about:support`, 2 min) et `A-07` (profil Chrome de l'A04 par USB, sans urgence, débloque `D-31`).

Les captures de la V1 (`docs/captures/v1/`) sont une **inspiration, jamais un cahier des charges** : aucun ticket ne les lit tant que `E-03` (une ligne d'intention par capture) n'est pas rempli.

`Q-10`, `Q-11`, `Q-12`, `Q-24` et `Q-25` restent à trancher avec Xav ; `Q-07` est gelée. La spec de la barre d'action du bas (`E-01`) est écrite par Xav lui-même et attend le chiffrage `Q-11`. **Une spec non écrite ne se commence pas** (même règle que pour une phase).


## Journal de session — Nuit du 19 au 20/09 (file de micro-tickets)

`BRIEF_nuit-2026-09-19.md` v1.3.0. Branche **`nuit-2026-09-19`**, créée depuis `main` ; **aucun `push`**.
Un ticket = un commit, dans l'ordre du brief, pour que la nuit se fusionne « jusqu'au commit N ».
Le rapport complet (tableau ticket par ticket) est écrit en fin de nuit, en tête de ce journal.

### Les identifiants du brief étaient tous pris

Le brief les tirait du suivi **v1.7.0** ; les sessions de code du 19/09 au soir ont pris la suite entre-temps.
Renumérotation, suivant la règle du §0 du suivi (« un identifiant n'est jamais réutilisé ») :

| Brief | Suivi | Sujet | Déjà pris par |
|---|---|---|---|
| `D-27` | **`D-32`** | Héros à 9 px | id de catalogue venu d'une sauvegarde, non vérifié |
| `D-31` | **`D-33`** | Vitesse de base du héros | Galaxy A04, ≈ 18 ms hors du code du jeu |
| `D-28` | **`D-34`** | Follet −25 % en jeu | récolte à poche pleine, silencieuse |
| `D-29` | **`D-35`** | Lumière du follet à l'extérieur | `image-rendering: pixelated` résiduel |
| `D-30` | **`D-36`** | Follet « aérien » | plein écran au tactile |
| `Q-24` | **`Q-26`** | Orbite du follet (ouverte et close) | politique navigateurs |
| `Q-25` | **`Q-27`** | Lueur sur les monstres | conseiller sur le symptôme |
| `Q-26` | **`Q-28`** | Vitesse ×0,75 (`[OUVERT]`) | — |
| `Q-27` | **`Q-29`** | Follet équipable (ouverte et close) | — |
| `Q-28` | **`Q-30`** | Lumière à l'intérieur de la Maison | — |

**Le relevé de nuit s'appelle `R-03`, pas `R-15`.** Le registre §6 lui réservait déjà une ligne vide depuis le 19/09,
nommée par `A-03` et par le §Méthode de `07`. Créer `R-15` aurait donné **deux identifiants pour une seule mesure** :
j'ai rempli la ligne réservée et j'y ai noté l'alias, pour que « R-15 » reste retrouvable. `R-14` (jour), lui,
tombait juste.

### Ticket 1 — doc seule

**Ménage.** Le journal de la NS « rendu, navigateurs, téléphone » est archivé verbatim
(`docs/archives/JOURNAL_2026-09-19_ns-rendu-navigateurs.md`) avec sa ligne d'INDEX ;
`NS_decisions-rendu-navigateurs_2026-09-19.md` descend à côté, comme ce journal l'annonçait lui-même.
`docs/DOC_navigateurs.md` reste dans `docs/` : registre **vivant**, comme le suivi.

**Les deux relevés de base, inscrits au §6.** `R-14` (jour) et `R-03` (nuit), Chrome, F11, 1920×1080, échelle
naturelle 4, manette, protocole de traversée. **59,9 fps et zéro frame sautée dans les deux cas** ; `dessiner()`
0,34 / 0,32 ms, `maj()` 0,05 / 0,06 ms, ≈ 37 recalculs de calque à environ 1 ms. `A-03` **close**.

Ce que ces deux lignes changent pour `07` : il n'y a **pas de marge de rendu à défendre** sous Chrome. À 0,33 ms de
`dessiner()` pour un budget de 16,7 ms, le rendu n'est plus le sujet — les monstres coûteront du **`maj()`** (ils se
décident, se déplacent, se cherchent) bien avant de coûter du dessin. Le §6 de la spec citait encore `R-02` et sa
« marge ≈ 4,6 ms » : c'étaient des millisecondes de **Firefox**, elles ne se comparent à rien de ce qui sera mesuré
cette nuit. Remplaçé par `R-03`, avec l'ordre de lecture : **frames sautées d'abord, `maj()` ensuite, jamais
`dessiner()`**.

**Deux décisions datées consignées** dans le tableau des décisions : le **principe d'équilibrage** (les valeurs de
base sont basses et tout grandit ensuite — avec sa **seule** conséquence d'architecture : une valeur destinée à
grandir passe par une fonction pure de résolution, jamais lue directement par un système, et **aucun buff n'est
livré avec**) et le **follet équipable** (un emplacement, amulette *ou* talisman — `Q-29`, rien de livré).

**Ordre d'injection réécrit** dans `CLAUDE.md` et la ROADMAP (1.8.0) : tailles/vitesse/lumière → `07` AàD → `D-36`,
**puis** `D-17` + `D-30`, `D-13`, `D-01`/`D-16`, reprise de `Q-07`. La spec `07` passe en 1.3.0 : plus de branche
`chaos-nocturne` (tout sur `nuit-2026-09-19`), et trois éléments extérieurs la touchent désormais — héros plus petit
(`D-32`), héros plus lent (`D-33`), aucune lueur sur les monstres (`Q-27`).

**Une précision de méthode, dite ici pour ne pas la découvrir au matin** : ce journal grandit d'une section à chaque
ticket, dans le commit de ce ticket. Ce n'est pas revenir sur un ticket précédent — c'est le journal qui avance.
Aucun fichier de `src/`, `data/` ou `tests/` n'a été touché par ce ticket-ci.

### Ticket 2 — `D-32` : le héros à 9 px

**Une ligne de données.** `data/visuels.json#visuel_heros.echelle` : **0,88 → 0,643**. Le ticket de polish du matin
avait fait le travail difficile — depuis lui, le rendu (`visuels.js#dessinerVisuel`) et la hitbox
(`main.js#rayonHeros`) dérivent du **même champ**. Changer la taille du héros, aujourd'hui, c'est toucher ce nombre
et rien d'autre. La décision verrouillée (une seule échelle en données, visuel **et** hitbox) n'est pas touchée ;
seul le 0,88 du matin est *révisé*.

**La mesure de base n'est pas 14** — le brief prévoyait le cas. Aucun nombre du dépôt ne vaut 14 à l'échelle 1 :
la silhouette est un cercle de **Ø 22 px**, la hitbox un carré de **Ø 20 px** (rayon de référence 10). J'ai donc
appliqué le rapport de repli du brief, **9 / 12,32 = 0,7305**, à l'échelle actuelle : 0,88 × 0,7305 = **0,643**
(qui tombe aussi sur 9/14, les deux chemins donnent le même nombre).

| | échelle 1 | 0,88 (ce matin) | **0,643 (ce ticket)** |
|---|---|---|---|
| Silhouette (Ø logique) | 22,0 px | 19,4 px | **14,2 px** |
| Hitbox (Ø logique) | 20,0 px | 17,6 px | **12,9 px** |
| Jeu par côté dans un couloir d'1 tuile | 6,0 px | 7,2 px | **9,6 px** |

**À l'œil de Xav, donc** : si « 9 px » désignait la **silhouette visible**, il faudrait 0,41 et non 0,643. Je n'ai
pas tranché — c'est noté dans `V-14`, à régler en jouant, la valeur étant *provisoire* et tenant en un nombre.

**Ce que j'ai vérifié sans rien corriger** (liste du ticket, une ligne chacun) :

- **`TOLERANCE_COIN_PX` n'est pas en pixels absolus.** `scene.js` la calcule `largeur / 6` — elle **suit** la hitbox :
  3,33 px avant le polish, 2,93 à 0,88, **2,14** maintenant. Le rapport tolérance/héros ne bouge pas d'un iota, et la
  crainte du brief tombe. (Le saut de coin qu'elle produit, `D-04`, rétrécit donc dans la même proportion.)
- **Seuil d'interaction** : `DISTANCE_INTERACT_PX` = 28 px, mesuré du **centre** du héros au **bord de l'empreinte** de
  l'interactif (`distanceAuRectangle`). Indépendant de sa taille — mais comme son corps rétrécit, son bras
  *apparent* s'allonge : 19,2 px au-delà de la silhouette ce matin, **21,6 px** ce soir.
- **Contact des monstres** : `enemies.json#portee_attaque` (18 px) est une distance **de centre à centre**, en pixels.
  Elle ne change pas — mais le monstre touchera désormais sans paraître le toucher : 18 px de centre à centre laissent
  maintenant **11,6 px de vide** entre les deux silhouettes, contre 9,2 ce matin. À regarder de nuit.
- **Portée de « mains nues »** : 0,5 tuile = 16 px, **en tuiles**, inchangée — mais l'anneau d'attaque déborde
  désormais de **9,6 px** autour du héros au lieu de 7,2 : il *paraîtra* plus long sans l'être.
- **Anneau, ombre, poussière** : l'anneau se calcule sur la portée de l'arme (`weapons.json`), jamais sur le héros.
  L'ombre est **dans** l'entrée du visuel, donc elle rétrécit avec lui — c'est voulu, elle fait partie de la
  silhouette. `poussiere.js` « ne connaît ni le héros ni son rayon » (son propre commentaire) : la règle tient.
  **Un point à l'œil quand même** : `effet_poussiere.offset_y_px` vaut 6 px, une valeur absolue, choisie quand le
  héros avait un rayon de 8,8 — la poussière naîtra maintenant *au bord* de ses pieds plutôt que dessous. Valeur
  déjà *provisoire* en données, à régler au ressenti (`V-11`), pas une dépendance à la forme du héros.
- **Portails et réapparition** : le point d'arrivée est le **centre d'une tuile**, puis le héros est repoussé hors
  d'une empreinte solide (`trouverPositionLibrePlusProche`). Une boîte plus petite ne peut qu'y gagner — le test qui
  balaie 2 535 positions sauvegardées le prouve : aucune position jouable avant ne devient coincée après.

**Tests.** `test_mt_heros_echelle_2026-09-19.js` figeait 0,88 : mis à jour **volontairement** (c'est la valeur que le
ticket révise), commentaire d'en-tête compris. Ses trois preuves tiennent telles quelles à la nouvelle échelle.
Suite complète verte, **71 fichiers**.

### Ticket 2 bis — `D-33` : la vitesse de base

**Une ligne de données, elle aussi.** `data/stats_derivees.json`, `derivee_vitesse_deplacement_px_s.formule.base` :
**100 → 75**. Ni la formule, ni le coefficient d'Agilité (4 px/s par point) ne sont touchés, comme le ticket le
demande. Valeur `[OUVERT]` retenue par défaut — `Q-28` — : ×0,75, proche du rapport de taille du héros (0,73), pour
que le couple taille/vitesse garde à l'écran un ressenti voisin. *Provisoire*.

**Le −25 % porte sur la base, pas sur la vitesse réelle.** À agilité 5 (la valeur de départ de toutes les stats),
la vitesse effective vaut `base + 4 × agilité` :

| | avant | **après** | écart |
|---|---|---|---|
| Terme de base (données) | 100 px/s | **75 px/s** | −25,0 % |
| Vitesse effective à agilité 5 | 120 px/s | **95 px/s** | **−20,8 %** |
| Traversée de la carte Maison, ouest→est (170 tuiles = 5 440 px) | 45,3 s | **57,3 s** | **+26,3 %** |

C'est exactement ce que produit la consigne « une seule valeur, le terme de base » : le terme d'Agilité (20 px/s
aujourd'hui) est épargné, donc le joueur perd un peu moins que le quart annoncé. Je le signale plutôt que de bricoler
un 70 qui aurait donné 90 px/s pile : la valeur est *provisoire* et se règle à l'œil.

**Rapport de vitesses, à redonner au palier C de `07`.** Le seul monstre du jeu (`enemy_grotte_rampant`) avance à
**40 px/s**, et sa poursuite est une ligne droite vers le héros (`entities.js#approcherEnLigneDroite`). Le héros reste
donc **2,4× plus rapide** (95 contre 40), là où il l'était 3,0× ce matin. **On peut toujours semer un monstre**, et
largement — rien à régler. Le chiffre à surveiller, quand `07` fera apparaître plusieurs monstres à la fois, est
celui de la nouvelle entrée de catalogue : une vitesse au-dessus de ~65 px/s rendrait la fuite inégale.

**Tests.** Aucun test ne figeait la vitesse (aucun rouge). `test_sd_saccades_calque_statique_2026-09-19.js` s'en servait
comme *ordre de grandeur* dans un commentaire et une variable locale — mis à jour à 75 pour qu'il continue de décrire
le jeu réel ; sa borne se calcule depuis la distance parcourue, elle n'en dépend pas. Suite verte, 71 fichiers.

### Ticket 3 — `D-34` : le follet à −25 % en jeu

**En données, par compagnon.** `data/companions.json` gagne un champ `echelle_jeu` (**0,75**, *provisoire*), validé
au boot comme celle du héros — une échelle nulle ou négative rendrait le follet invisible, et personne ne s'en
apercevrait avant de jouer la nuit. Un compagnon qui ne déclare pas le champ garde **1** : un catalogue existant
reste valide tel quel, comme le veut la règle des catalogues. C'est bien une échelle **de jeu** : la cinématique du
choix continue de calculer la sienne depuis `TAILLE_FOLLET_* / TAILLE_REFERENCE_FOLLET_PX`, intouchée.

**La frontière sautait déjà, avant ce ticket.** En lisant le code pour poser l'interpolation, j'ai trouvé que le
follet élu passait de l'échelle **2,86** (sa taille de focus sur l'écran de choix, 20 / 7) à **1** *d'une frame à
l'autre*, à l'instant de la confirmation. Le ticket demandait d'interpoler « sur la durée de l'étape de départ » :
c'est fait, et cela corrige du même coup un saut qui existait déjà. Désormais l'élu rétrécit **de 2,86 à 0,75 en
1 s**, pendant que les deux autres s'éloignent — sur **la même courbe**, celle de `intro.js#avancementDepart`, que
j'ai extraite pour qu'elle serve aux deux (jamais une 2ᵉ horloge). `intro.js` ne connaît toujours ni `echelle_jeu`
ni la taille de l'élu ; ses étapes et ses durées ne sont pas touchées. Le test mesure le plus gros écart d'une frame
à l'autre à 60 Hz : **0,104** pour une amplitude de 2,107, soit 5 % du chemin.

**Le point d'entrée unique du §0 bis.** `companion.js` expose désormais `resoudreOrbiteRayonPx()` et
`resoudreEchelleJeu(companion)`. L'orbite **ne bouge pas** (`Q-26`, close) : la fonction rend la base telle quelle, et
le test le prouve par le comportement, pas seulement par la constante — un follet laissé tourner 10 s décrit un
cercle de **23,5 px** autour du héros, comme avant. **Aucun buff, aucun équipement, aucun modificateur** n'est livré
avec : c'est la consigne, et c'est ce qui rend ces deux fonctions utiles le jour du talisman (`Q-29`).

### Les distances du follet, telles qu'elles sont (rapport, rien corrigé)

| Valeur | Où | Combien | Ce qu'elle fait **vraiment** |
|---|---|---|---|
| `ORBITE_RAYON_PX` | `companion.js` | 24 px | Rayon du cercle que le follet décrit autour du héros en état `suivre` |
| `ORBITE_LERP` | `companion.js` | 0,15 | « Retard ressort » du suivi : le follet n'est jamais pile sur son point d'orbite |
| `DISTANCE_ENGAGEMENT_PX` | `companion.js` | **48 px** | **La seule** distance qui décide d'un engagement. Mesurée du **héros** au monstre |
| `rayon_aura` | `companions.json` | 40 px | **Uniquement dessinée** (cercle pointillé). Aucune règle de jeu ne la lit |
| `rayon_lumiere` | `companions.json` | 110 px | Halo dans le calque d'obscurité, et rayon d'effacement du toit (× 1,125) |

**La condition d'engagement ne correspond pas à la définition de Xav**, et l'écart n'est pas un détail. Le code fait
`distance(héros, monstre) <= 48` : c'est exactement la « distance d'engagement distincte » que la définition dit ne
pas exister, et elle ne vaut ni l'orbite (24), ni l'aura (40), ni l'union des deux. Pire pour la lisibilité : le
cercle pointillé que le joueur voit fait **40 px** alors que le follet engage à **48** — l'indicateur ment de 8 px.
Et `status.js` approxime « le monstre est dans l'aura » par « le follet l'a engagé », donc `rayon_aura` n'a
strictement aucun effet de jeu. Ligne **`D-37`** ouverte, **non corrigée** : c'est du comportement de combat, hors du
périmètre de ce ticket, et ça mérite son propre commit.

**Ce qui borne la position du follet** (question posée par le brief) : en `suivre`, il converge vers un point à
24 px du héros — borné. En `engager`, il se **colle à la position du monstre**, et ce monstre est à 48 px du héros
au plus, sans quoi l'état retombe à `suivre`. L'allonge maximale du follet est donc de **48 px depuis le héros**,
et non « orbite + aura ». **L'engagement ne peut pas s'étirer de proche en proche** — la crainte inscrite au brief
ne se vérifie pas — parce que la condition est mesurée depuis le **héros**, jamais depuis le follet : déplacer le
follet ne déplace pas le centre du test.

**Tests.** Un fichier neuf, `test_d34_follet_echelle_jeu_2026-09-19.js` : échelle en données et défaut 1, refus au
boot d'une échelle dégénérée, orbite inchangée **au pixel**, continuité de la frontière frame par frame, et
non-régression de la cinématique. Suite verte, **72 fichiers**.

### Ticket 4 — `D-35` : la lumière du follet, dehors seulement

**Un profil, deux endroits où il peut vivre.** `{ rayon, fondu_px }` est désormais une donnée à part entière :
le compagnon porte sa **base** (`companions.json#lumiere`), une scène peut déclarer **le sien**
(`scenes.json#lumiere_follet`). `companion.js#resoudreProfilLumiere(companion, scene)` tranche — scène d'abord,
base ensuite — et c'est la seule lecture : `render.js` ne connaît ni l'un ni l'autre catalogue, il reçoit un rayon
et une largeur de fondu.

| | rayon | fondu | cœur net |
|---|---|---|---|
| Avant ce ticket, partout | 110 px | 71,5 px | jusqu'à 38,5 px (35 %) |
| **Base du follet** (donc la Région Maison) | **40 px** | **6 px** | jusqu'à 34 px (85 %) |
| Les deux salles de la Grotte (déclaré) | 110 px | 71,5 px | jusqu'à 38,5 px (35 %) |

40 px, c'est **exactement le rayon de l'aura** d'aujourd'hui, comme le demandait le ticket — mais dans un champ
`lumiere` **distinct**, initialisé à cette valeur : les deux divergeront. Dehors, le disque éclairé passe donc de
≈ 3,4 tuiles de rayon à **1,25 tuile**. C'est drastique, et c'est le principe : partir du minimum, faire grandir
ensuite. La teinte chaude et la douceur à l'intérieur du disque sont conservées telles quelles.

**Le critère d'acceptation est un test, pas une promesse.** `test_d35_lumiere_follet_2026-09-19.js` vérifie que dans
les **deux salles de la Grotte**, pour **les trois follets**, le rayon vaut 110 px et le cœur net s'arrête à 35 % —
des nombres **recopiés en dur dans le test**, jamais relus depuis les données : un test qui relirait le catalogue
validerait n'importe quelle dérive future. Il vérifie aussi qu'un compagnon sans champ `lumiere` (catalogue
d'avant) dessine exactement comme avant, qu'un profil incohérent (fondu plus large que le rayon) tombe **au boot**
plutôt que de nuit en jeu, et qu'une scène de plus déclare le sien sans une ligne de code.

**Deux choses trouvées en chemin, laissées en l'état.**

- **Il n'existe pas de scène d'intérieur de maison.** Le jeu compte trois scènes : deux salles de Grotte et
  `scene_maison_exterieur`. L'intérieur *est* dans l'extérieur, avec un toit qui s'efface à l'approche. La valeur
  `[OUVERT]` que le ticket prévoyait (« l'intérieur garde les valeurs d'aujourd'hui ») était donc **impossible à
  appliquer sans inventer un profil par zone**, ce que le ticket ne demande pas. L'intérieur reçoit la base réduite.
  `Q-30` réécrite en conséquence : la question qui reste est « est-ce jouable ? », et elle se répond en jouant.
- **Le toit garde son ancien rayon.** `RAYON_EFFACEMENT_TOIT` lit `rayon_lumiere` (110) × 1,125, réglé à l'œil par
  `D-21` il y a quelques heures. Le brancher sur les 40 px nouveaux aurait fait un toit qui ne se soulève presque
  plus — une décision de gameplay que ce ticket n'a pas à prendre, et que ses interdits n'évoquent pas. Conséquence
  à assumer : `rayon_lumiere` ne décrit plus la lumière, il ne sert plus qu'au toit (et de repli). Ligne **`Q-31`**
  ouverte, trois issues proposées.

**Rien d'autre n'a bougé** : ni les lumières de scène, ni les faisceaux de la Grotte, ni la fenêtre de la maison, ni
les opacités jour/nuit, ni le décor, ni les leviers. Les lumières **statiques** gardent le profil historique dans
tous les cas : seul le follet a désormais un profil à lui. Suite verte, **73 fichiers**.

### Ticket 5 — `07` palier A : zones et tirage (pur)

**La carte gagne ses zones**, au format `zones` déjà présent, enrichi d'un `id` (optionnel, non vide) pour être
référençable. Rectangles du croquis de Xav, tous *provisoires*, à ajuster à la main sur la carte 170 × 116 :

| Zone | Rectangle(s) | Vérifié par test |
|---|---|---|
| `zone_sure_maison` | (72, 42, 52, 30) | contient la maison, le jardin, **le puits** (106,57) et le point de réapparition du fruit |
| `zone_sure_grotte` | (0, 46, 16, 24) | contient **l'arrivée du portail** (6,58), relue depuis `scene_grotte_salle_2` |
| `champ_nord` | (76,0,94,29) + (125,29,45,10) | un **L** = deux rectangles de même id (choix du §3 documenté ici) |
| `champ_sud` | (125,77,45,10) + (76,87,94,29) | idem, symétrique |
| `chaos_nord_est` | (140, 6, 26, 22) | entièrement dans le Champ nord, à l'est |

**`data/spawns.json`**, catalogue neuf, validé au boot. Une entrée : Chaos nord-est, `enemy_chaos_rodeur`, nuit,
niveau ≥ 5, plafond 6, un toutes les 8 s, à 10 tuiles du joueur minimum, domaine = Champ nord, poursuite 20 tuiles,
désintérêt 6 s, anti-blocage 1 s, errance (pause 0,8–2,5 s, mi-vitesse). **`intervalle_ms` = 8 000 est une valeur
que la spec ne donnait pas** : à ce rythme, le plafond de 6 se remplit en 48 s sur une nuit de 4 min. C'est
exactement ce que le §6 demande d'observer — je ne l'ouvre pas en `Q-`, la spec le prévoit déjà.

**Le monstre** : `enemy_chaos_rodeur`, dérivé du rampant de la Grotte, **données seules** — 28 PV, force 6,
vitesse 45 px/s, portée de contact 20 px, cadence 1 s, 35 XP, même table de butin et même silhouette
(le signal visuel, c'est le palier D). Équilibrage *provisoire* visé par la spec : « un héros de niveau 5 en gère
un, pas trois » — un héros de départ a 50 PV et frappe à 5 toutes les 0,5 s, donc un rôdeur lui coûte ~3 s et
une douzaine de PV ; trois à la fois lui en coûtent 18 par seconde.

**Le seuil de niveau est une condition en données, comme exigé.** Le registre de conditions ne savait évaluer que
des flags (`all`/`any`/`not`). Plutôt qu'une condition « niveau » en dur, je lui ai appris **un type de condition de
plus, générique** : `{ valeur: 'niveau', min: 5 }`, où les valeurs nommées sont **fournies à la création** du
registre (`valeurs: () => ({ niveau })`). `flags.js` reste pur : il ne va chercher le niveau nulle part. Conséquence
voulue — le palier Nv. 10, et demain une condition sur l'heure ou sur les PV, sont des **données**. Une valeur
inconnue suit la discipline existante d'un flag non déclaré : exception en dev, **faux** en prod (une condition
qu'on ne sait pas évaluer ne doit pas débloquer).

**`src/spawns.js`**, pur : `tirerPositionApparition` (tuile de la zone, non solide, **atteignable**, hors de toute
zone sûre, à distance minimale du joueur, non occupée), `estEnZoneSure` (en tuiles, sur la position **du
monstre** — le palier C en aura besoin pour le demi-tour), `tablesDeScene`, `tableActive`. `calculerTuilesAtteignables`
est **importé** de `ground_items.js`, pas recopié : la spec l'exige, et un 2ᵉ BFS finirait par diverger de celui qui
filtre déjà les items au sol. PRNG injecté, essais bornés à 60 : zone saturée → `null`, jamais de boucle infinie.

**Les validations de boot sont des échecs durs**, et le test les provoque une par une : zone d'apparition qui
chevauche une zone sûre · `zone_apparition` inconnue · `domaine` qui nomme une zone inexistante · **phase
inventée** (« crépuscule » accentué au lieu de « crepuscule » donnerait sinon une nuit vide sans un mot — les noms
de phase sont lus depuis `daynight.js`, jamais recopiés) · monstre inconnu.

**Aucun monstre n'apparaît en jeu à ce palier**, c'est le contrat du palier A : `main.js` n'est pas touché. Le test
vérifie aussi, en relisant le **source** du module, qu'aucun « niveau » n'y est écrit, et qu'une 2ᵉ table (zone
sud, seuil 10 — exactement le palier Nv. 10) fonctionne sans une ligne de code. 300 tirages sur 300 respectent les
cinq règles. Suite verte, **74 fichiers**.

### Ticket 6 — `07` palier B : la nuit et le seuil

**Les monstres naissent.** Une fonction dans l'orchestrateur, appelée **dans** le bloc `if (!uiOuverte)` de `maj()`,
juste **après** l'avance de l'horloge — elle est donc gelée sous UI par le point de décision unique qui existe déjà,
jamais par une condition à elle, et la phase qu'elle lit est celle de la frame en cours (sans cela, la première
frame de la nuit ferait encore naître au crépuscule). Elle fait deux choses, dans cet ordre : à l'aube (ou dès que
la condition se ferme) **elle balaie** ce qui est né de la nuit ; sinon elle **accumule** le temps de jeu actif et
fait naître un rôdeur par `intervalle_ms`, jusqu'au plafond.

Trois détails qui ne se voient pas mais qui comptent :

- **Le plafond n'accumule pas de dette.** Quand les six sont là, l'accumulateur est remis à zéro plutôt que de
  continuer à courir — sinon tuer un monstre en ferait sortir trois d'un coup.
- **Le retrait de l'aube n'est pas une mort.** `onMonstreMort` n'est pas appelé : ni butin, ni XP. La nuit s'en va,
  elle ne se fait pas tuer. (Le fondu est l'affaire du rendu, palier D.)
- **Les monstres de la Grotte ne sont jamais balayés** : seuls ceux qui portent la marque de leur table (`spawnId`)
  sont concernés, et le plafond se compte par table.

**Rien n'est persisté, donc rien à migrer** — c'était l'arrêt obligatoire de la spec, et il n'a pas eu lieu d'être :
`save.schema_version` ne bouge pas, et le test vérifie qu'aucune chaîne « chaos » ne traîne dans la sauvegarde.
Changer de scène remet les compteurs à zéro, recharger en pleine nuit aussi.

### Une dette trouvée en chemin, corrigée ici : `D-38`

`creerMonstre` donnait à chaque instance **l'id de son catalogue**. Tant qu'une scène n'a qu'un monstre de chaque
type — la Grotte — personne ne le voit. Avec six rôdeurs identiques, c'est autre chose : `main.js` filtre les
monstres touchés **par id**, donc frapper celui qui est à portée les aurait **tous** blessés, où qu'ils soient, et le
follet n'aurait plus su lequel il engageait. J'ai corrigé **dans ce commit** plutôt que d'ouvrir une ligne à part :
sans ça, le palier B livrait une fonctionnalité fausse. `creerMonstre` prend désormais un `id` d'instance (le
défaut reste l'id de catalogue, pour les scènes à un monstre et les tests d'avant), et l'orchestrateur le frappe
depuis un compteur — y compris pour les monstres posés à la main dans le layout.

### Le coût, mesuré (additif 2 du brief)

Bot headless, nuit complète de 4 minutes, seconde moitié seulement (plafond atteint), 7 499 frames dans chaque cas :

| | `maj()` moy | p95 | max |
|---|---|---|---|
| Niveau 4 — **zéro monstre** | 0,004 ms | 0,005 ms | 0,188 ms |
| Niveau 5 — **plafond de 6 atteint** | **0,005 ms** | 0,006 ms | 0,625 ms |

**+0,001 ms par frame** pour six monstres qui se déplacent et attaquent, sur un budget de 16,7 ms. Deux réserves à
garder en tête, sans quoi ce tableau se lirait de travers : c'est **Node**, pas Chrome, et c'est le `maj()` du bot,
sans lecture de manette ni rendu. Ce qu'il dit, ce n'est pas « le jeu tiendra 60 fps » — c'est que la logique des
monstres, elle, ne coûte rien. Le verdict reste le relevé de Xav sous Chrome, comparé à `R-03` (`V-18`).
Aucune optimisation faite, aucune nécessaire pour l'instant.

**Tests** (`test_07b_nuit_et_seuil_2026-09-19.js`, bot headless sur la vraie scène, avec le vrai orchestrateur) :
niveau 4 → nuit entière vide · niveau 5 → 6 apparitions, plafond atteint, **toutes** dans la zone de Chaos, jamais
en zone sûre, jamais en Campagne, jamais à moins de 10 tuiles du joueur (vérifié à la frame de naissance de
chacun) · à l'aube, plus rien, sans butin ni XP · de jour, rien, même au niveau 30 · UI ouverte, ni apparition ni
horloge · sauvegarde inchangée · ids tous distincts. Le héros y est maintenu en vie de force, et c'est dit dans le
fichier : au palier B les monstres foncent encore **en ligne droite** sur lui (le domaine, c'est le palier C) et
finiraient par traverser la carte pour le tuer — on ne triche que sur ce qui n'est pas le sujet. Suite verte,
**75 fichiers**.

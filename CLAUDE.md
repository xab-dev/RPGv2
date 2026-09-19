# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et 3 (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`, close le 2026-09-17). **Chantier `specs/05_construction-stations.md` (placement libre des stations) close le 2026-09-19** : validé par Xav en jeu à la manette puis au clavier seul, après le correctif de parité clic/verbe (détail complet des 4 diagnostics successifs : `docs/archives/INDEX.md`). **Polish post-Construction : étapes 1 à 6 livrées et validées en jeu à la manette par Xav le 2026-09-19** (« ça fonctionne, le jeu est fluide ») — instrument de mesure sous `?debug=fps`, héros à l'échelle 0,88, follets visibles pendant l'intro, silhouette du puits, traînée de poussière, HUD sur un bandeau d'une ligne. La branche `polish-2026-09-19` est **fusionnée dans `main`** (`e5b6d44`) : on travaille sur `main`.

**Trois relevés `?debug=fps` réels existent** (`R-01`, `R-02`, `R-04` du registre de performance, §6 de `docs/DOC_suivi-dettes.md`). `R-04` a été pris **sous l'émulation F12** (vue adaptative, « Regular 3G ») : c'est le **PC** qui dessine, pas un téléphone — il ne dit donc rien d'un vrai appareil (`A-04`), mais il établit un fait utile, **le coût de rendu suit le nombre de pixels** (échelle 4 → 5 : `dessiner()` ×1,67, recalcul du calque ×1,63, `maj()` inchangé). La mesure **de nuit** (`A-03`) et la mesure sur téléphone réel (`A-04`) restent dues. Étape 7 (correction des saccades) : **diagnostic fait le 2026-09-19** — le fenêtrage du calque statique est sain (test rouge d'abord, vert sur HEAD) et le compteur cumulatif de `ui/hud_debug.js` a été corrigé ; **aucune correction de rendu n'a encore été faite**, elle est portée par `D-01` et `D-02` du suivi.

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
│   ├── render.js           résolution logique/physique (DPR), fenêtrage du calque statique
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
| Échelle propre d'une silhouette déclarée en données (`echelle` sur une entrée de `visuels.json`, composée avec l'échelle d'instance par `visuels.js#dessinerVisuel`) — le rendu ET la hitbox du héros en dérivent, jamais deux nombres indépendants | 2026-09-19 | journal courant, `MT_heros-echelle_2026-09-19.md` |
| L'intro reste vivante (étape `ETAPE_ATTENTE`) pendant le dialogue de choix, jusqu'à `confirmerChoixFollet()` — *révise* la mise à `null` à la fin de la convergence, qui laissait les follets sans personne pour les dessiner | 2026-09-19 | journal courant, `MT_intro-follets-visibles_2026-09-19.md` |
| Un effet purement visuel du monde (poussière) est un module pur + une entrée de `data/effets.json` ; il ne connaît jamais la forme du héros, et il est gelé par le point de décision unique existant (`uiOuverte`), jamais par une condition propre | 2026-09-19 | journal courant, `MT_trainee-poussiere_2026-09-19.md` |
| HUD = un bandeau d'une seule ligne en haut, pleine largeur ; tout son placement vit dans `ui/hud_layout.js` (pur, testable), jamais en dur dans `ui/hud.js` | 2026-09-19 | journal courant, `MT_hud-ligne-haute_2026-09-19.md` |
| **Intrusion nocturne du Chaos dans la Région Maison** — *révise* « aucun monstre, ton chill » de `03_maison-exterieur.md` §5 ; cadre : nuit seulement, **par paliers de niveau déclarés en données** (Nv. 5 zone de Chaos nord-est, Nv. 10 zone sud, Nv. 15 apparitions éparses en Forêt et dans les Champs — la Forêt reste **vide avant 15**, ce qui *révise* « quelques monstres épars en Forêt dès le début »), **un monstre qui entre en zone sûre fait demi-tour** (condition sur sa position, jamais sur celle du joueur) ; destruction des plantations non tranchée (le jardinage n'existe pas encore) — spec `specs/07_chaos-nocturne.md` v1.1.0, qui ne livre que le système et le palier 1 | 2026-09-19 | `NS_decisions-revue-dettes_2026-09-19.md` §4-5 |

| **Un retour de gain dans le monde est UN seul mécanisme**, jamais un par système : `texte_flottant.js` transporte une clé de regroupement, une quantité et des **clés** de localisation — jamais une chaîne composée, qui interdirait la fusion « +1 puis +1 = +2 » et figerait la langue d'un texte déjà en vol. La composition se fait au rendu, dans l'orchestrateur. Butin, XP et dégâts s'y brancheront sans code de système nouveau | 2026-09-19 | journal courant, `MT_texte-flottant_2026-09-19.md` |
| **Le seuil « accès à la 1ère zone de monstres gaté par niveau ~5 » est abandonné** (*révise une décision verrouillée*) : la carte suivante s'ouvre quand la carte Maison est **épuisée**, vers le niveau 40-50 (provisoire). Conséquence : les *systèmes* prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la *carte* de la Phase 4 vient après — **« Phase 4 = prochaine étape » ne doit plus se lire nulle part** | 2026-09-19 | `NS_decisions-revue-dettes_2026-09-19.md` §4 |
| **Arc de progression de la carte Maison** : Nv. 5 zone de Chaos nord-est · Nv. 10 zone sud · Nv. 15 apparitions éparses (Forêt + Champs) — ces trois sont **décidés** ; Nv. 20 petite caverne en Forêt annoncée par une ligne de lore (casse-tête dessiné par Xav), Nv. 30 les compétences, Nv. 40-50 la carte suivante — ces trois restent des **idées**. Avant toute nouvelle carte : écrire ressources, crafts, armes, compétences | 2026-09-19 | même NS §4 |
| **Critère de clôture de la Région Maison : la boucle de 2 heures** (sauvegarde neuve → deux heures de jeu → niveau 30 → l'envie de changer d'endroit), vérifiable à la main par Xav **et** par le bot headless — même patron que la boucle 5 minutes de la Phase 3 | 2026-09-19 | même NS §4 |
| **Comportement des monstres : « un domaine, pas un piquet »** (*remplace* l'idée de laisse) — errance dans un domaine fait de **zones de la carte** · poursuite bornée depuis le point de repérage · désintérêt de quelques secondes après un abandon ou un demi-tour en lisière de zone sûre · anti-blocage après ~1 s sans avancer. Un monstre ne sort de son domaine que si le joueur l'y attire. **Seuils de niveau en données, jamais dans le code** | 2026-09-19 | même NS §5, `specs/07_chaos-nocturne.md` v1.1.0 |
| **Bandeau HUD, ordre définitif** : compagnon · PV (jauge + nombre) · éclats · faim · soif · **buffs** · `Nv. N` collé au bord droit. Un buff = une icône par **effet** (la stat renforcée), forme et couleur, sans texte ni jauge ; pulsation douce en fondu sur les ~2 dernières secondes. Le bouton MENU tactile descend **sous** le bandeau, qui redevient libre sur toute sa largeur | 2026-09-19 | même NS §6 (tickets `D-13`, `D-17`) |
| **Verbe de rotation en Construction : reste `SKILL_1`**, statut provisoire levé (Construction jugée intuitive à la manette) ; l'indice de commande reste **sous** le bandeau | 2026-09-19 | même NS §6 (`Q-08`, `Q-02`) |
| **Déplacement du fantôme de Construction : impulsion puis répétition au maintien**, via une **brique d'input générique** (« maintien puis répétition ») exposée aux menus et au mode Construction, jamais recodée par écran — corrige aussi le tapotement du joystick tactile | 2026-09-19 | même NS §6 (`D-18`) |
| **« Mains nues » est la première arme du jeu** : la portée de l'auto-attaque de base (actuelle / 2, *provisoire*) et l'icône (une main) vivent dans une **entrée d'arme**, jamais dans une stat ni une constante de `combat.js` ; la case d'attaque de la barre du bas dessine l'icône de l'**arme équipée**, sans cas particulier. *Applique* la décision verrouillée « la portée vient de l'arme » — schéma minimal, à étendre par la spec des armes (`E-02`) | 2026-09-19 | `NS_decisions-fondations_2026-09-19.md` §3 (`Q-21` → `D-20`) |

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

**Polish post-Construction — étapes 1 à 6 livrées et validées en jeu à la manette** (Xav, 2026-09-19 : « ça fonctionne, le jeu est fluide ») : instrument `?debug=fps`, héros à 0,88, follets visibles pendant l'intro, silhouette du puits, traînée de poussière, HUD sur un bandeau d'une ligne. Le tactile et les valeurs provisoires restent à valider (`V-02` a déjà rendu un « non » : le bouton MENU tactile chevauche le bandeau → ticket `D-17`). Étape 7 : **diagnostic fait, aucune correction de rendu encore faite** — elle est portée par `D-01` (les frames de recalcul du calque statique sortent du budget) et `D-02` (`dessiner()` coûte 12 ms sans aucun monstre).

**La carte Maison n'est pas finie, et la Phase 4 n'est plus la prochaine étape.** Les systèmes prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la carte suivante s'ouvre quand la Maison est épuisée (Nv. 40-50, provisoire). Critère de clôture de la Région Maison : **la boucle de 2 heures** (sauvegarde neuve → 2 h de jeu → Nv. 30 → l'envie de changer d'endroit).

**Décision de méthode (Xav, 2026-09-19, 17 h 18) : on ne rajoute pas de contenu sur des bases non confirmées.** Avant `specs/07_chaos-nocturne.md` et avant de rouvrir `Q-07` (passée à **gelée**) : la **performance** et les **retours du playtest du 19/09**. On repart de la base et on remonte, **un ticket par session**, validation en jeu entre deux. Le critère qui dira « les fondations sont closes » n'est pas encore tranché : `Q-20` (proposition : PC sans aucune frame sautée, appareil plancher à 30 fps stables ; candidat = le Galaxy A04 de Xav), qui attend le relevé `A-04`.

**Ordre d'injection** (`NS_decisions-fondations_2026-09-19.md` §5 — *remplace* le §7 de `NS_decisions-revue-dettes_2026-09-19.md`) : les légers et sûrs d'abord, **un ticket par session, un commit par ticket**, chacun citant les identifiants du suivi qu'il touche.

1. Cette session de documentation (doc seule) — faite.
2. `D-22` — clavier : `E` = interagir, `F` = consommer — **livré et validé au clavier par Xav le 2026-09-19**.
3. `D-21` — rayon d'effacement du toit −10 % — **livré et validé en jeu par Xav le 2026-09-19**.
4. `D-20` palier A — « mains nues », portée (`MT_mains-nues_2026-09-19.md`) — **livré et validé en jeu par Xav le 2026-09-19**.
5. `D-20` palier B — icône de la case d'attaque — **livré le 2026-09-19, validation en jeu de Xav due** (`CHECKLIST_visuelle.md`, HUD état 1).
6. `D-05` — texte flottant « +1 bois » (`MT_texte-flottant_2026-09-19.md`) — **livré le 2026-09-19, validation en jeu de Xav due** (`V-12`, `CHECKLIST_visuelle.md` état 34, de jour **et** de nuit).
7. `D-23` — paramètre debug `?echelle=N` (`MT_echelle-debug_2026-09-19.md`) → puis relevés `A-05` par Xav.
8. `D-02` + `D-03` — ventilation de `dessiner()` par calque et explication du delta (même instrument, **mesure seule**).
9. Xav tranche `Q-19` et `Q-20` → ticket de correction d'échelle, à écrire d'après les chiffres.
10. `D-01` — défilement incrémental du calque.
11. `D-17`, `D-13`, puis `07_chaos-nocturne.md` palier par palier ; `Q-07` reprend ici.

`A-04` (relevé `?debug=fps` sur le Galaxy A04 réel, par le Wi-Fi local — procédure au §6 de la NS) est une action de Xav, faisable dès maintenant, en parallèle. `D-24` (serveur local joignable depuis le téléphone, repli du bouton « copier ») ne s'ouvre que si cette procédure échoue.

Les captures de la V1 (`docs/captures/v1/`) sont une **inspiration, jamais un cahier des charges** : aucun ticket ne les lit tant que `E-03` (une ligne d'intention par capture) n'est pas rempli.

`Q-10`, `Q-11` et `Q-12` restent à trancher avec Xav ; `Q-07` et `Q-19` sont gelées. La spec de la barre d'action du bas (`E-01`) est écrite par Xav lui-même et attend le chiffrage `Q-11`. **Une spec non écrite ne se commence pas** (même règle que pour une phase).


## Journal de session — `D-05` : le texte flottant de gain (2026-09-19)

Ticket `MT_texte-flottant_2026-09-19.md`, qui clôt `D-05`. Lignes touchées :
`D-05` (close), plus trois ouvertes — `D-28` (défaut révélé hors périmètre),
`Q-23` (le doublon que la fiche demandait de signaler), `V-12` (validation en
jeu). Aucune autre ligne du suivi lue ni touchée. Suite headless verte,
**70 fichiers**. Un commit, pas de `push`.

**Ménage de journal** : journal du palier B de `D-20` archivé dans
`docs/archives/JOURNAL_2026-09-19_icone-arme.md` + ligne d'INDEX ; la fiche
`MT_mains-nues_2026-09-19.md`, ses deux paliers livrés, descend dans
`docs/archives/`.

### Le changement

- **`src/texte_flottant.js`**, pur, sur le patron exact de `poussiere.js` :
  réserve pré-allouée, zéro allocation en jeu (`for` bruts, jamais
  `find`/`reduce`, qui allouent une closure par appel), aucune horloge propre.
- **`effet_texte_gain`** dans `data/effets.json` : 10 réglages, **tous
  provisoires**, capacité de la réserve comprise. `creerTextesFlottants` lève
  si `capacite` manque, plutôt que de porter un défaut de repli qui
  divergerait en silence des données.
- **Émission par un point unique**, `main.js#signalerGainItem(itemId,
  quantite, x, y)`, appelé aux deux endroits où un gain est déjà résolu.
  `resources.js`, `ground_items.js` et `inventory.js` n'ont pas bougé d'une
  ligne : ils continuent d'ignorer qu'un rendu existe.
- **Le texte part de la source**, jamais du héros — centre de la tuile
  récoltée, position réelle de l'objet au sol **capturée avant son retrait**
  (après, elle n'existe plus).
- **Rendu** par `render.js#dessinerTextesFlottants`, **après** l'obscurité et
  **avant** le HUD : c'est un retour d'interface, il doit rester lisible de
  nuit. Contour puis remplissage, pas de cartouche opaque qui masquerait la
  scène. `save`/`restore` en tête/fin, aucune transform touchée.
- **Gelé par `uiOuverte`**, le point de décision unique, jamais par une
  condition propre ; **vidé à chaque entrée en scène**, comme la poussière.

### Deux écarts assumés, et pourquoi

**La fiche esquissait `emettre(x, y, texte)`.** Le module transporte à la
place `cle` + `quantite` + les clés `format`/`libelle`. Une chaîne déjà
composée rend impossible la fusion « +1 puis +1 = +2 » que la fiche exige au
paragraphe suivant, et différer la composition au rendu a un second mérite :
changer de langue traduit aussi un texte déjà en vol. Le module ne connaît
donc ni item, ni ressource, ni i18n, ni canvas — vérifié par garde-fou de
source. C'est ce qui rend crédible la promesse « butin, XP et dégâts sans
code nouveau ».

**Deux fichiers hors de la liste de lecture de la fiche**, parce que « aucune
chaîne en dur » l'exigeait. `i18n.js#t(cle, params)` prend un 2ᵉ argument
**optionnel** : le gabarit `monde.gain_item` (« +{n} {item} », dans les deux
langues) est traduisible dans son entier — le « + », l'ordre des morceaux,
l'espace. Le composer par concaténation dans `main.js` aurait remis du texte
visible hors des locales. Purement additif : aucun appel existant modifié.
Et le schéma de `effets` distingue maintenant deux `type` (`particules` /
`texte`), **déclarés en données** plutôt que devinés à la présence d'un
champ : sans ça, une faute de frappe sur `intervalle_px` ferait passer la
poussière pour un effet d'un autre genre sans que rien ne le dise.

### Ce que les tests peuvent et ne peuvent pas dire

`tests/test_d05_texte_flottant_2026-09-19.js` (7 blocs) écrit avant le code,
rouge à l'import. Vérifiés à froid : émission/montée/fondu/extinction ·
réserve pleine qui recycle **le plus ancien** sans jamais grandir · fusion
dans la frame, jamais entre deux items ni hors fenêtre · gabarit et noms
d'items résolus dans les **deux** langues, sans marqueur résiduel · une
récolte et un ramassage sur le **vrai** orchestrateur donnent chacun **une**
émission, à la bonne position · garde-fou de généricité sur la source du
module.

**Le dessin n'est jamais exercé** (canvas, contrainte de méthode). Il a été
lancé **une fois, hors suite de tests**, contre un contexte 2D factice :
aucune exception, coordonnées justes. Ça ne dit rien de ce que ça donne à
l'œil. Le contrôle au navigateur réel n'a pas pu être fait, l'extension
Chrome n'étant pas connectée.

### Ce que j'ai vu et n'ai pas corrigé

`D-28` : **récolter la poche pleine consomme le cooldown de la tuile et ne
donne rien, en silence.** `essayerInteraction` ne regarde pas
`resultatRecolte.ajoute` — au plafond de pile, l'inventaire est réécrit à
l'identique et le cooldown posé quand même. Le ramassage au sol, lui, teste
bien `ajoute > 0` et laisse l'objet par terre : les deux chemins divergent.
Le texte flottant rend le défaut **visible** (rien ne monte) au lieu de muet,
mais le corriger touche le gameplay, pas le rendu — hors périmètre.

`Q-23` : le retour existant du premier ramassage est **inchangé**, comme la
fiche le demandait. Ce n'est pas un doublon à mon sens (le texte dit *ce qui
a été gagné*, la réplique dit *ce que ça veut dire*), mais les deux se gênent
un peu : le dialogue gèle le « +1 Branche » à mi-montée. Trois issues
proposées dans la ligne, à trancher en jeu.

### Validation due par Xav — ticket de rendu

`render.js` et `main.js#dessiner()` sont touchés : clôture par une validation
en jeu guidée par `docs/CHECKLIST_visuelle.md`, **état 34**, de jour **et de
nuit**. Les 10 réglages sont provisoires (`V-12`, qui rejoint `V-11`) : durée
900 ms, montée 16 px, fondu à mi-vie, taille 8 px, couleurs. Tant que ce
passage n'est pas fait, `D-05` est **livré**, pas confirmé.

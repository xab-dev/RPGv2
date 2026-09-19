# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et 3 (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`, close le 2026-09-17). **Chantier `specs/05_construction-stations.md` (placement libre des stations) close le 2026-09-19** : validé par Xav en jeu à la manette puis au clavier seul, après le correctif de parité clic/verbe (détail complet des 4 diagnostics successifs : `docs/archives/INDEX.md`). Polish post-Construction en cours (ordre d'injection acté par Xav, voir « Critère de passage courant ») : étape 1 (`MT_mesure-saccades_2026-09-19.md`) livrée en code cette session — instrument de mesure sous `?debug=fps` (`src/debug_perf.js`, `src/ui/hud_debug.js`), zéro correction, protocole de relevé en jeu encore dû par Xav.

Historique complet des sessions : **`docs/archives/INDEX.md`** — un fichier par session archivée, contenu verbatim (source de vérité en cas de doute sur le détail d'une décision passée). `CLAUDE.md` ne garde que le journal de la session la plus récente (en fin de ce fichier) — voir la règle de méthode correspondante ci-dessous.

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contexte projet, décisions déjà tranchées (à ne jamais rouvrir), contraintes de méthode, détail de la phase en cours.
- `specs/01_socle-technique.md`, `specs/02_grotte.md`, `specs/03_grotte-polish.md`, `specs/03_maison-exterieur.md`, `specs/04_maison-interieur.md`, `specs/04_stations-proportions-collision.md`, `specs/04_indices-commandes.md`, `specs/05_construction-stations.md` — specs détaillées des phases/chantiers livrés.
- `docs/carte_mentale_RPG_V2_v1_5_0.md` — décisions produit/techniques verrouillées (§0, §8) et règle d'architecture directrice (§7).

**Avant toute action de code**, lire `specs/00_ROADMAP.md` en entier, puis le fichier `0N_*.md` de la phase courante. Ne pas rouvrir une décision déjà actée dans ces documents — un point de design non tranché se marque `[OUVERT]` et remonte à l'utilisateur (dev = Xav), il ne se tranche jamais en silence.

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
- **Tout seuil numérique** (vitesse, `tile_size`, intervalle de sauvegarde, plafond de delta-time, tolérances de collision…) déclaré en un seul endroit, commenté avec son *pourquoi*, marqué **provisoire** s'il n'a pas été validé en jeu.
- **Discipline de scope** : si une tâche déborde du brief, s'arrêter au dernier palier stable et documenter ce qui reste hors scope dans `CLAUDE.md`. Aucun système généralisé avant qu'un second cas d'usage réel existe, sauf les catalogues data-driven listés dans les specs.
- **Le rendu canvas n'est jamais exercé par les tests headless** — toute vérification visuelle revient à Xav dans un vrai navigateur, à la manette.
- **Toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure** (`save`/`restore` ou re-`setTransform` en fin de fonction, commenté pourquoi) — jamais de `setTransform` inline dans `main.js#dessiner()`. Née du diagnostic dialogues invisibles (`docs/archives/JOURNAL_2026-09-15_diagnostic-dialogues-invisibles.md`) : un calque qui lit `ctx.canvas.width/height` pour se positionner alors qu'une transform logique→physique est active double la mise à l'échelle, sans qu'aucun test headless ne puisse l'attraper. **Tout ticket touchant `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou `main.js#dessiner()` rejoue `docs/CHECKLIST_visuelle.md` (capture par état) avant de conclure** — même quand le ticket prétend ne toucher qu'un seul de ces fichiers en isolation.
- **Un renommage/retrait de contenu de catalogue (ex. id de scène) n'est jamais couvert par la migration de *schéma*** (`save.js#migrer`) — c'est une classe de bug distincte (données valides mais obsolètes) à traiter explicitement à chaque retrait. Née du repli sur `scene_grotte_salle_1` (`docs/archives/JOURNAL_2026-09-15_phase1-grotte.md`), reproduite ensuite par la migration 2→3 de la Région Maison (`docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`).
- **Ménage de journal en début de session, avant tout code** : archiver le journal présent dans `docs/archives/`, mettre à jour `docs/archives/INDEX.md`, reporter dans les sections consolidées de ce fichier ce qui en relève (décision, règle, `[OUVERT]`, dette), puis seulement travailler. `CLAUDE.md` ne contient jamais plus d'un journal de session. Plafond indicatif : 300 lignes. Née du ménage du 2026-09-17 (`DOC_menage-claude-md_2026-09-17.md`) : le fichier avait atteint ~22 000 mots / 920 lignes, coûtant plus de contexte qu'il n'apportait d'utilité.
- **Un sous-système explicitement "meilleur effort" (le contrat dit déjà : fichier absent → le jeu tourne sans son) rattrape ses propres erreurs à la frontière de son API publique, jamais au niveau de la boucle de jeu.** Née de `docs/archives/JOURNAL_2026-09-17_diagnostic-freeze-musique.md` : une exception dans `audio.js` (contexte/gain `null` à la reprise depuis le menu) est remontée non rattrapée jusqu'à `creerBoucle#frame` (`render.js`), qui ne se replanifie plus après une exception — jeu figé, manette/clavier morts (polling interne à `maj()`), souris vivante (DOM indépendant du `requestAnimationFrame`). Le remède reste local au sous-système fautif (`try/catch` dans `audio.js`, jamais un `try/catch` global autour de `update()`/`dessiner()`, qui masquerait aussi de vraies erreurs de gameplay) — voir `[OUVERT]` ci-dessous pour la question de généraliser ce patron à d'autres sous-systèmes.
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
│   ├── i18n.js
│   └── ui/                 menu.js (DOM ; Langue/Musique/Poche/Stats/Construction/Export/Import/
│                           Reset/Fermer — Construction contextuel, absent hors de la Maison,
│                           liste reconstruite à chaque ouverture ; + écrans contextuels Craft/Coffre
│                           ouverts par INTERACT, patron générique `creerEcranListeGenerique`
│                           factorisé Phase 3), hud.js (+ jauges survie/niveau-XP Phase 3)
│                           + hud_hints.js + dialogue_box.js + hud_layout.js (canvas, résolution logique)
├── data/                   catalogues JSON (voir specs/*.md §2.1 de chaque phase)
├── locales/fr.json, en.json
├── specs/                  00_ROADMAP.md, 0N_*.md par phase
├── docs/                   carte_mentale_RPG_V2_v1_5_0.md + fiches de diagnostic/ticket actives
│                           (SD_*.md, MT_*.md, NS_*.md, CHECKLIST_visuelle.md) + archives/
│                           (journaux de session clos)
├── tests/                  un fichier par contrat/diagnostic, headless, `node:assert/strict`
└── tools/run_tests.js      lance tous les tests/*.js en séquence (confort de `npm test`)
```

`registry.js`/`save.js` restent purs (aucun accès disque/réseau/DOM) : les adaptateurs (`io_node.js`/`io_navigateur.js`, `storage_indexeddb.js`/`creerStoreMemoire()`) leur fournissent des données déjà prêtes. Convention d'`id` : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `docs/carte_mentale_RPG_V2_v1_5_0.md` §0 et §8. Points structurants pour le code :

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
| **Vocabulaire figé de la Région Maison** : Forêt (côté Grotte) / Jardin (puits + arbre fruitier, = zone sûre) / Zone sûre (Maison + Jardin, aucun monstre) / Champs (angles opposés à la Forêt, où le Chaos s'installe la nuit) / Campagne (le reste) — sert de référence à toutes les specs suivantes | 2026-09-19 | même NS, `docs/carte_mentale_RPG_V2_v1_5_0.md` §3bis |
| Héros à l'échelle **0,88** (visuel et hitbox dérivés d'une seule échelle) ; pas de roulement — règle : aucun effet ne dépend de la forme du héros (reste un visuel remplaçable), effet de déplacement = traînée de poussière | 2026-09-19 | même NS |
| HUD sur une ligne en haut, pleine largeur ; barre d'XP retirée du HUD (niveau seul affiché), conservée dans l'écran Stats | 2026-09-19 | même NS |
| Intro : les follets non élus restent visibles pendant le texte (au lieu de disparaître avant) | 2026-09-19 | même NS |
| **Intrusion nocturne du Chaos dans la Région Maison** — *révise* « aucun monstre, ton chill » de `03_maison-exterieur.md` §5 ; cadre : nuit seulement, zone de Chaos dans les Champs, quelques monstres épars en Forêt, **un monstre qui entre en zone sûre fait demi-tour** (condition sur sa position, jamais sur celle du joueur) — spec à écrire, `07_chaos-nocturne.md` ; destruction des plantations non tranchée (le jardinage n'existe pas encore) | 2026-09-19 | même NS |

(Les décisions de `05_construction-stations.md` étaient déjà actées par Xav **dans la spec elle-même** avant tout code, v1.0.0 §9 — les lignes ci-dessus n'y renvoient que pour mémoire, elles ne tranchent rien de nouveau.)

## Points `[OUVERT]`

- **Durées de l'intro cinématique** (`specs/03_grotte-polish.md` §9, palier 4) : budget ≤8s appliqué (mesuré ~7,2s sur les données réelles), valeurs de référence déjà données par la fiche — reste à ajuster sur ressenti manette réel. Pas un point de design non tranché en soi, juste un seuil numérique non encore validé en jeu.
- **Généraliser le patron « sous-système meilleur effort rattrape ses propres erreurs » au-delà d'`audio.js`** (ex. persistance IndexedDB, résolution de loot) ? `SD_musique-freeze-reprise_2026-09-17.md` demandait explicitement de ne pas trancher ça en silence ni de l'implémenter sans validation : une règle architecturale (pas seulement le correctif ponctuel déjà livré) reste à décider par Xav.
- **Verbe de rotation en mode Construction** (`specs/05_construction-stations.md` §9) : provisoire appliqué = `SKILL_1` (contextuel au mode, qui est une UI). Alternative envisagée par la fiche : la croix directionnelle — mais C3③ la réserve explicitement à de futures actions secondaires, et elle n'a pas d'équivalent tactile/clavier évident ; `INTERACT` est une autre option possible. À trancher par Xav sur ressenti manette réel.
- **Maintien vs front montant sur `MOVE` en mode Construction** (même fiche, §9) : provisoire = front montant seul (une tuile par impulsion). Passer à une répétition après ~400 ms de maintien si déplacer le fantôme dans une grande pièce s'avère pénible en jeu — pas tranché avant un retour de Xav.
- **Règle de méthode candidate, proposée par `SD_construction-ecrans-orphelins_2026-09-17.md`, pas encore validée par Xav** : *« ouvert » pour un écran DOM signifie toujours booléen ET DOM visible ; un écran qui n'a pas d'accesseur n'existe pas pour le routage.* Née du diagnostic des écrans orphelins (`docs/archives/JOURNAL_2026-09-17_ecrans-orphelins.md`) — appliquée en local à `ui/menu.js` (tous ses contrôleurs), pas encore généralisée en contrainte de méthode non négociable.
- **Règle de méthode candidate n°2, proposée par `SD_construction-parite-clic-verbe_2026-09-19.md` §6, PAS À IMPLÉMENTER, à chiffrer seulement** : les trois bugs de suite de ce chantier (contrat « ouvert » à deux définitions, menu Pause fermé « à tort » puis « pas assez », déduction après coup dans `creerEcranListeGenerique#traiterInput`) ont la même forme — un état DÉDUIT après coup (booléen vs DOM, « fermé donc annulé ») au lieu d'un événement DÉCLARÉ. Proposition à chiffrer (effort, risque, fichiers) dans un futur journal, sans la coder : un état d'UI pur (pile d'écrans + mode placement, sans DOM, testable headless) dont la visibilité DOM et le routage des verbes seraient dérivés par une seule fonction ; clic et verbe ne feraient que dispatcher une action. `docs/CARTE_cycle-de-vie-ui_2026-09-17.md` sert de table de transitions de départ.
- **Construction dans les Champs** (idée du playtest 2026-09-19, `NS_decisions-playtest_2026-09-19.md`) : une ferme dans les Champs contredit la grille intérieure fermée de `05_construction-stations.md` (placement pensé pour une pièce, pas pour de l'extérieur ouvert). Piste évoquée, pas actée : `zonesConstructibles` déclarées dans le JSON de scène. À trancher avant tout code de construction extérieure.
- **Barre d'action du bas** (idée du playtest 2026-09-19, même NS) : Xav veut une barre visible dès maintenant (premier slot en bas à gauche, jaune, pour l'arme, puis les slots qui se remplissent — principe de la barre Minecraft), à faire cohabiter avec D5⑤ (5 slots d'action) et le tactile (bas-gauche déjà pris par le joystick virtuel). **Spec à écrire par Xav lui-même**, pas par Claude.
- **Second rayon sûr autour de la sortie de la Grotte** (point de retour après une mort, proposé par Claude lors du playtest 2026-09-19) : retenu par défaut dans le cadrage de `07_chaos-nocturne.md`, à confirmer par Xav avant l'écriture de la spec.

Tous les autres `[OUVERT]` historiques (résolution logique, clignements/orbite pré-choix, couleur du héros, stations placeholder non solides) ont été tranchés — voir la table de décisions ci-dessus et `docs/archives/INDEX.md`.

## Dette et « à reprendre »

- **Toast de ramassage** à chaque objet ramassé (seul le premier a un retour, dialogue `dlg_premier_ramassage`) — 2026-09-16, `docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`.
- **Indicateur jour/nuit au HUD** (optionnel selon la spec, non posé) — 2026-09-16, même archive.
- **Mesure réelle du temps de frame / fps** (plancher mobile jamais mesuré, seulement borné fonctionnellement par `selectionnerTuilesVisibles`) — 2026-09-16, même archive. Reformulé le 2026-09-19 (`NS_decisions-playtest_2026-09-19.md`) : petites saccades régulières en traversant la carte en ligne droite, tous périphériques, perceptibles par un joueur confirmé. **Instrument livré le 2026-09-19** (`MT_mesure-saccades_2026-09-19.md`, journal courant) : `src/debug_perf.js`/`src/ui/hud_debug.js`, surcouche sous `?debug=fps` seulement — **zéro chiffre réel recueilli**, le protocole (traversée en ligne droite ~20s jour/nuit, bouton « copier ») reste entièrement dû par Xav en jeu ; le ticket de correction (étape 7 de l'ordre d'injection) s'écrira sur ces chiffres, pas avant.
- **Tactile réel** — **partiellement levée le 2026-09-19** : première validation tactile réelle du jeu par Xav (jouable), Construction validée au clic/tactile ; le test du neveu de Xav (testeur de référence) reste dû.
- **Mouvement légèrement téléporté à chaque angle depuis la correction de coin** (2026-09-17, retour Xav) : feeling meilleur, aucune interruption, mais pas très smooth — à lisser dans une phase de polish ultérieure (hypothèse : répartir le repoussement sur plusieurs frames ou l'interpoler plutôt que l'appliquer d'un coup — à diagnostiquer, pas à patcher en silence).
- **Validation manuelle du contraste jour/nuit encore due par Xav** (`MT_jour-nuit-contraste_2026-09-16.md` v1.1, archivée) — code fait et testé le 2026-09-17, reste la validation manette/navigateur réelle. `docs/archives/JOURNAL_2026-09-17_micro-ticket-contraste-jour-nuit.md`.
- **Validation manuelle de l'ambiance synthétisée encore due par Xav** (`MT_musique-ambiance-synth_2026-09-16.md`, archivée) — code fait et testé, freeze diagnostiqué et corrigé le 2026-09-17 ; reste la validation navigateur/manette (5 min d'écoute). `docs/archives/JOURNAL_2026-09-17_diagnostic-freeze-musique.md`.
- **Validation visuelle de `specs/04_indices-commandes.md` encore due par Xav** (état 24 de `docs/CHECKLIST_visuelle.md`, + états 1-23 rejoués) — code fait, suite headless verte, mais `main.js#dessiner()` a été touché (règle de méthode) et le rendu canvas n'est jamais exercé headless. `docs/archives/JOURNAL_2026-09-17_indices-commande.md`.
- **`station_puits` : silhouette dégradée à l'échelle ×2,1** (retour Xav en jeu, 2026-09-17, `docs/archives/JOURNAL_2026-09-17_stations-proportions-collision.md`) — proportions des stations par ailleurs validées et meilleures qu'avant ; cause à diagnostiquer (probablement `visuel_puits` dans `data/visuels.json`) avant tout correctif, explicitement reporté à une prochaine session (consigne de Xav : ne rien coder dans l'immédiat).
- **Coffre : transfert « par pile » (maintien)** non implémenté (Palier E, §3.5 de `04_maison-interieur.md`) — seul le transfert par unité (confirmer = 1) est livré ; la couche d'input n'expose pas encore de geste de maintien générique pour les menus contextuels. 2026-09-17, `docs/archives/JOURNAL_2026-09-17_phase3-palier-a-e.md`.
- **Poche : action "Consommer" directe** (§3.3, "à défaut, l'action Consommer depuis le menu Poche") non implémentée — seul le chemin "Équiper au slot consommable" + verbe CONSUME en jeu est livré, qui couvre le hint et le critère de la boucle. 2026-09-17, même archive.
- **`dlg_recette_indisponible`** déclaré au catalogue (§2.1) mais jamais déclenché en jeu — une entrée grisée du menu Craft retente silencieusement `fabriquer()` (résultat inchangé) plutôt que d'ouvrir un dialogue par-dessus un menu déjà ouvert (aurait cassé le routage input menu/dialogue). 2026-09-17, même archive.
- **Migration `3 → 4` jamais exercée sur une vraie sauvegarde Phase 2** — testée uniquement en headless (`test_save_migration_3_4`). À exercer par Xav séparément (charger une sauvegarde Phase 2 réelle). Hors scope explicite de `docs/archives/JOURNAL_2026-09-17_diagnostic-stations-pv-jauges.md`.
- **`nb_au_sol` de `item_branche`/`item_caillou` équilibrage** (`docs/archives/JOURNAL_2026-09-17_respawn-items-au-sol.md`) : la fiche demandait de le monter à 2 après la correction — déjà à 2 dans `data/items.json` depuis la Phase 2, aucun changement de donnée nécessaire ; noté pour éviter qu'une prochaine session ne recherche un changement qui n'a jamais eu lieu.
- **Migration `4 → 5` (`maison.stations`) jamais exercée sur une vraie sauvegarde** — même classe de dette que la migration 3→4 ci-dessus, testée uniquement en headless (`test_save_migration_4_5`). 2026-09-17, `docs/archives/JOURNAL_2026-09-17_phase3-cloture-et-construction.md`.
- **Validation manuelle de la Construction — close le 2026-09-19** : Xav a validé au clic/tactile puis à la manette et au clavier seul, après le correctif de parité clic/verbe (`NS_decisions-playtest_2026-09-19.md`). Reste dû : les captures des états 29-32 et 31bis de `docs/CHECKLIST_visuelle.md` (fantôme vert/rouge, station tournée, entrée de menu contextuelle, bandeau de placement), sauf mention contraire de Xav.
- **Aide-texte du mode Construction toujours en glyphes MANETTE** (jamais clavier/tactile) — simplification assumée : `ui/menu.js` ne reçoit pas `input.peripheriqueActif()` (contrairement à `hints.js`, qui lui est branché dessus). Sans conséquence tant que le clavier/tactile restent hors du parcours de référence (décision produit : PC à la manette), à généraliser si Xav en a besoin.
- **`menu.bandeauEstOuvert()` volontairement PAS inclus dans `menu.estOuvert()`** (`SD_construction-ecrans-orphelins_2026-09-17.md` §2 point 3, `docs/archives/JOURNAL_2026-09-17_ecrans-orphelins.md`) : l'inclure ferait gagner la branche `menu.traiterInput()` sur `traiterConstruction()` dans le dispatch de `main.js#maj()` pendant tout le placement (bandeau visible), réintroduisant le bug tout juste corrigé — main.js reste donc gelé pendant le placement via `constructionActif()` séparément, un appariement par convention entre les 4 fonctions qui touchent les deux (désormais vérifiable via `bandeauEstOuvert()`, plus implicite). Décorréler proprement demanderait de toucher le routage de `maj()`, explicitement hors scope de cette fiche.
- **Confirmation de reset : double appel idempotent de `revenirAuMenuPrincipal()`** sur le chemin « Non » choisi par ATTACK (audité, non corrigé — `SD_construction-parite-clic-verbe_2026-09-19.md` §3.3, journal courant) : `actionConfirmerNon()` l'appelle déjà, puis le `else if (controleur.ouvertIntentionnellement())` de `menu.traiterInput` (retour de la confirmation) l'appelle une 2ᵉ fois, sans conséquence visible (fonction idempotente). Non touché délibérément : ce site est protégé par une régression déjà connue (`test_phase1_sd_menu_reset_invisible_2026-09-15.js`, cf. `docs/archives/JOURNAL_2026-09-17_ecrans-orphelins.md`) et ne présente PAS la même classe de bug que `creerEcranListeGenerique` (aucun `onFermer` à misfire) — aligner sur `onAnnuler` ici serait un nettoyage, pas un correctif, risque jugé disproportionné pour ce chantier.

## Critère de passage courant

**Phase 3** (`04_maison-interieur.md`) et **chantier Construction** (`05_construction-stations.md`) : **tous deux close, tous deux validés en jeu par Xav.** Détail complet des diagnostics successifs (stations invisibles, jauges figées, respawn cassé, écrans orphelins, parité clic/verbe) : `docs/archives/INDEX.md`. Construction close le 2026-09-19 après validation au clic/tactile **puis** à la manette et au clavier seul, post-correctif de parité clic/verbe.

**Chantier courant : polish post-Construction** (ordre d'injection acté par Xav dans `NS_decisions-playtest_2026-09-19.md`). Étape 1 en cours (instrument livré, mesure en jeu due) — étapes 2 à 9 pas commencées, chacune attend sa propre spec (même règle que pour une phase) :

1. Mesure des saccades (`MT_mesure-saccades_2026-09-19.md`) — **instrument livré en code le 2026-09-19** (`?debug=fps`), protocole en jeu (traversée ligne droite jour/nuit, bouton « copier ») encore dû par Xav avant que l'étape 7 (correction) ne puisse s'écrire.
2. Héros à l'échelle 0,88 (visuel + hitbox).
3. Follets visibles pendant le texte de l'intro.
4. `station_puits` (silhouette dégradée à ×2,1, dette déjà notée).
5. Traînée de poussière au déplacement (remplace le roulement, jamais implémenté).
6. HUD sur une ligne pleine largeur, XP retirée du HUD.
7. Correction des saccades, écrite d'après les chiffres mesurés à l'étape 1.
8. `07_chaos-nocturne.md` (intrusion nocturne du Chaos dans la Région Maison — spec à écrire, cadrage déjà acté ci-dessus).
9. Barre d'action du bas — après écriture de la spec par Xav lui-même.

**Aucune spec n'est encore écrite pour ces chantiers : ne pas commencer sans elle** (même règle que pour une phase).

## Journal de session — Polish post-Construction, tickets 1-5 (2026-09-19)

Ménage de journal effectué en début de session : le journal précédent (« Diagnostic saccades : le calque statique n'était pas en cause ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-19_diagnostic-saccades-calque.md`, `docs/archives/INDEX.md` mis à jour (lien de la dernière ligne corrigé, la fiche `SD_saccades-calque-statique_2026-09-19.md` était déjà déplacée dans `docs/archives/`). Travail sur la branche `polish-2026-09-19`, jamais fusionnée : c'est Xav qui fusionne.

### Ticket 1 — MT héros à l'échelle 0,88 (visuel et hitbox)

**Inventaire d'abord (demandé par le ticket), avant toute ligne de code.**

Où vivait la taille du héros, AVANT :

| Quoi | Où | Valeur |
|---|---|---|
| Silhouette visuelle | `data/visuels.json` > `visuel_heros` | cercle extérieur `w/h = 22` (donc rayon visuel 11 px), ombre `w 16 / h 6 / dy 8` |
| Boîte de collision | `src/main.js:76` `const RAYON_HERO_PX = 10` | rayon 10 px, soit une hitbox carrée de 20×20 px |
| Point de dérivation unique de la hitbox | `src/main.js#hitboxHeros()` | `{ x: hero.x - rayon, y: …, largeur: rayon*2, hauteur: rayon*2 }`, seule source pour `resoudreDeplacement` |

**Constat de l'inventaire : les deux sources DIVERGEAIENT déjà** (rayon visuel 11 vs rayon de collision 10) — exactement ce que le ticket veut rendre impossible. Écart conservé tel quel en ratio (le visuel déborde légèrement la hitbox, ce qui est voulu : un corps qui mord d'un pixel sur un mur se lit mieux qu'un corps qui flotte), mais il dérive désormais d'un seul nombre.

Ce qui est dérivé de la taille du héros, et ce qui ne l'est pas :

- **Dérivé, donc suit automatiquement l'échelle** : `TOLERANCE_COIN_PX` (`scene.js:260`) vaut `largeur / 6` de la hitbox reçue — *déjà* relatif, aucun changement nécessaire, et il reste au même sixième de la boîte après réduction. Le ticket demandait de vérifier sa cohérence : elle est structurelle, pas numérique. Aucun test ne prouve qu'il faille la modifier → non modifiée.
- **Non dérivé, donc rien à figer** (vérifié un par un, tous sont des constantes absolues ou des données, aucun ne lit le rayon du héros) : vitesse (`derivee_vitesse_deplacement_px_s`, stat dérivée), portée d'arme (`combat.js#estDansPortee`, en tuiles via `tile_size`), seuil d'interaction (`DISTANCE_INTERACT_PX = 28`), orbite du follet (`companion.js#ORBITE_RAYON_PX = 24`), aura (`companionActif.rayon_aura`, donnée), halo/lumière (`rayon_lumiere`, donnée), rayon d'effacement du toit (dérivé du `rayon_lumiere` du follet, pas du héros), taille des monstres (leurs propres visuels). **Aucune valeur n'a eu besoin d'être figée** — le ticket prévoyait ce cas, il ne s'est pas présenté.
- Le ramassage n'a pas de rayon propre : `trouverItemProche` est appelé sous le même `DISTANCE_INTERACT_PX`, inchangé.

**Fait.** Une seule échelle, en données :

- `data/visuels.json` > `visuel_heros` porte désormais `"echelle": 0.88` — **le seul nombre à toucher pour retailler le héros**.
- `src/visuels.js` : nouvel export `echelleVisuel(visuel)` (échelle propre d'une silhouette, 1 par défaut) ; `dessinerVisuel` compose *échelle propre × échelle d'instance* (`echelleEffective`). Un visuel sans `echelle` est strictement inchangé — tout le catalogue existant reste valide. Même esprit que `structures.js#tournerEmpreinte` : une seule fonction, deux consommateurs, pas de divergence possible.
- `src/main.js` : `RAYON_HERO_PX = 10` devient `RAYON_HERO_BASE_PX = 10` (rayon de *référence*, échelle 1) et la nouvelle `rayonHeros()` renvoie `base × echelleVisuel(visuel_heros)`. Les 2 sites de création du héros (boot et `reinitialiserPartie`) passent par elle.
- `src/schemas.js` : `echelle` validée sur les visuels (nombre strictement positif si présent) — une échelle nulle donnerait *à la fois* un héros invisible et une hitbox dégénérée, les deux venant du même champ, donc échec dur au boot.
- **`render.js` n'a pas été touché** : l'échelle propre est appliquée à l'intérieur de `dessinerVisuel`, l'appelant n'a pas à la connaître. Donc **aucun rejeu de `docs/CHECKLIST_visuelle.md` exigé par la règle de méthode** (elle vise `render.js` / `ui/hud.js` / `ui/dialogue_box.js` / `main.js#dessiner()`, tous intacts pour ce ticket).

Effet mesuré (headless) : rayon de collision 10 → 8,8 px, donc **jeu par côté dans un passage d'1 tuile : 6 px → 7,2 px** (+20 %), ce que le ticket visait.

**Écarté volontairement** :

- `TOLERANCE_COIN_PX` **non modifiée** — elle vaut déjà `largeur / 6` de la hitbox reçue, donc elle suit l'échelle toute seule. Le ticket n'autorisait un changement que si un test le prouvait nécessaire : aucun ne l'a prouvé.
- Aucune valeur « figée » : l'inventaire ci-dessus montre qu'aucun des seuils listés par le ticket (vitesse, portées, interaction, aura, halo, orbite, toit, monstres) ne dérivait du héros. Rien à geler.
- Le rayon de base (10) reste une constante de code : le ticket demandait *une seule échelle en données*, pas de déplacer toute la géométrie du héros en données.

**Dette « mouvement légèrement téléporté à chaque angle » : réévaluée, non traitée** (le ticket l'interdit). Elle ne change pas de nature, mais son amplitude maximale **diminue** mécaniquement : la correction de coin est bornée par `TOLERANCE_COIN_PX = largeur/6`, soit 3,33 px avant, **2,93 px après**. Le saut sera donc un peu plus discret sans disparaître — la cause (repoussement appliqué d'un coup plutôt qu'interpolé) est intacte.

**Testé** : `node --check` sur `src/visuels.js`, `src/main.js`, `src/schemas.js`, `tests/test_mt_heros_echelle_2026-09-19.js`. Nouveau `tests/test_mt_heros_echelle_2026-09-19.js` (5 blocs : échelle unique en données, composition d'échelle sur faux ctx, non-régression des visuels sans échelle, refus au boot d'une échelle invalide, couloir d'1 tuile sans contact, **2535 positions sauvegardées** valides avant qui le restent après). `node tools/run_tests.js` : **62 fichiers verts** (1 nouveau).

**À valider par Xav à la manette** : silhouette du héros (proportion à 0,88 — si le ressenti est « trop petit » ou « pas assez », c'est `data/visuels.json > visuel_heros > echelle` et rien d'autre), passages étroits de la Forêt, couloir intérieur de la maison entre les stations. Aucune capture avant/après n'a pu être prise : **ni l'extension Chrome ni le démon browser-use ne répondent dans cette session** (extension non connectée ; `bu-default` ne démarre pas). Même cause pour les relevés `?debug=fps` avant/après demandés par le brief : ils supposent un navigateur *et* une traversée jouée à la main — entièrement dus à Xav.

### Ticket 2 — MT intro : les follets restent visibles pendant le texte

**Cause racine d'abord (hypothèse de la fiche vérifiée, pas présumée), nommée fichier:ligne.**

`src/main.js#maj()`, ex-lignes 1185-1189 : à l'instant `intro.terminee`, le code faisait `intro = null` **puis** `demarrerChoixFollet()`. Or `demarrerChoixFollet()` (`main.js:291`) n'ouvre qu'un dialogue et ne pose `choixFollet` que dans son `onFermer`. Entre ces deux instants — c'est-à-dire pendant **tout** le texte :

- `dessinerIntroConvergence()` (`main.js:1341`) sortait sur `if (!intro) return null;` ;
- `dessinerEcranChoixFollet()` (`main.js:1313`) sortait sur `if (!choixFolletActif()) return;`.

Personne ne dessinait les follets. Ils revenaient d'un coup à la fermeture du dialogue, quand `choixFollet` devenait non-null. **L'hypothèse de la fiche était exacte** ; la vérification a servi à nommer le point précis (`intro = null` trop tôt, pas un problème d'ordre de calques ni d'alpha).

**Fait.**

- `src/intro.js` : 3ᵉ étape `ETAPE_ATTENTE`. `creerIntro` gagne `tAttenteMs: 0` ; `avancerIntro` ne gèle plus l'horloge une fois `terminee` — il bascule sur `tAttenteMs` (et le dépassement de la frame de bascule amorce l'attente au lieu d'être perdu, pour ne pas marquer un micro-temps d'arrêt). La machine **reste pure** : aucune notion de dialogue, elle ne sait pas pourquoi on l'attend.
- Continuité aux deux frontières, obtenue par un seul paramètre `amortissement` passé à `positionFolletConvergence` : la **phase du sinus continue de courir** (donc aucun saut à l'entrée en attente, amortissement = 1 des deux côtés), seule l'**amplitude** décroît jusqu'à 0 en une période de lévitation — à ce moment les follets sont posés **exactement** sur les cibles, là même où `dessinerEcranChoixFollet()` les redessine (donc aucun saut à la sortie non plus). Durée de l'amortissement **dérivée des données existantes** (`levitation.periode_ms`) : **aucun nouveau seuil numérique introduit**, rien de neuf à régler pour Xav.
- `src/main.js` : l'intro n'est plus mise à `null` à la fin de la convergence ; `terminee` est lu comme un **front** (comparé à son état d'avant la frame) pour que le dialogue ne s'ouvre qu'une fois. L'intro s'éteint désormais dans `confirmerChoixFollet()`, où `depart` prend le relais. `dessinerIntroConvergence()` cède la priorité à `choixFolletActif()` (sans quoi les follets seraient dessinés deux fois pendant l'écran de choix).
- Le dialogue est déjà dessiné **après** les follets dans `dessiner()` : le texte passe devant, les follets lévitent derrière, sans avoir à les atténuer.

**Inchangé, comme l'exige le ticket** : durée de l'intro (budget ≤ 8 s, `dureeEtapesTempsFixe` intacte, testé), non-skippabilité (aucune lecture d'input ajoutée), armement anti-spam du dialogue (non touché).

**3 assertions de tests existants mises à jour** — elles affirmaient l'ancien contrat, c'est-à-dire *le mécanisme même du bug*, pas un comportement à préserver : `test_phase1_sd_grotte_choix_follet` ligne 135 et `test_phase1b_intro` ligne 170 (« l'intro doit être terminée/null une fois la narration ouverte » → désormais « reste vivante, `terminee` vrai ») et `test_phase1b_intro` ligne 54 (« avancerIntro est un no-op une fois terminée » → `tMs` figé mais `tAttenteMs` qui avance). Chaque modification porte en commentaire la raison et la référence de la fiche.

**Testé** : `node --check` sur `src/intro.js`, `src/main.js`, `tests/test_mt_intro_follets_visibles_2026-09-19.js`. Nouveau `tests/test_mt_intro_follets_visibles_2026-09-19.js` (6 blocs : visibilité et opacité sur 10 s de texte échantillonnées à 16 ms, continuité convergence→texte, report du dépassement de frame, follets posés au pixel près sur les cibles du choix, amortissement borné par son enveloppe et sans rebond, budget ≤ 8 s + front `terminee` unique). `node tools/run_tests.js` : **63 fichiers verts** (1 nouveau).

**`main.js#dessiner()` touché → `docs/CHECKLIST_visuelle.md` à rejouer par Xav**, avec le nouvel **état 17bis « Intro — texte de choix + follets visibles »** ajouté à la checklist (les follets restent à l'écran derrière le texte, leur lévitation se pose, aucun saut à l'appui sur `A`). Comme pour le ticket 1, **aucune capture n'a pu être prise** : ni l'extension Chrome ni le démon browser-use ne répondent dans cette session.

### Ticket 3 — SD puits : silhouette désolidarisée depuis l'échelle ×2,1

**Cause racine d'abord : ce sont les DONNÉES, pas l'interprète.** Inventaire demandé par la fiche (chaque primitive, et si elle suit l'échelle) :

`visuels.js#dessinerVisuel` applique **un unique `ctx.scale(e, e)`** autour de tout le dessin. Conséquence : longueurs, positions, rayons, **et épaisseurs de trait** (`lineWidth` est en espace utilisateur, donc mis à l'échelle lui aussi) suivent tous l'échelle, sans exception. `ancre` n'est même **jamais lu** par l'interprète (champ de métadonnée). **Donc l'interprète ne peut pas désolidariser une silhouette** : une silhouette bien assemblée à l'échelle 1 l'est à toute échelle — et réciproquement, un défaut d'assemblage existait déjà à l'échelle 1, il ne devenait visible qu'une fois agrandi. La branche « si c'est l'interprète, le défaut concerne tous les visuels » de la fiche **ne s'applique pas** ; table / coffre / atelier vérifiés malgré tout (voir tests), aucune pièce orpheline chez eux.

Le défaut réel, mesuré sur les anciennes données :

| Pièce | Boîte (échelle 1) | Verdict |
|---|---|---|
| margelle (cercle) | x[-10,10] y[-16,4] | disque r=10 centré (0,-6) |
| eau (ellipse) | x[-7,7] y[-11,-1] | ok |
| mât g / mât d (rect 3×14) | x[∓10.5,∓7.5] y[-25,-11] | **pied en porte-à-faux** |
| toit (rect 22×3) | x[-11,11] y[-25.5,-22.5] | ok |

Les **boîtes** des mâts et de la margelle se recouvrent (2,5 px) — un test naïf sur les boîtes serait resté vert. Mais le **disque** de la margelle ne mesure que `√(10² − 5²) = 8,66` px de demi-largeur à la hauteur où le mât s'arrêtait (y = −11), alors que le mât occupait x ∈ [−10,5 ; −7,5] : **seuls 1,16 px des 3 px du pied reposaient sur la margelle, 61 % flottaient dans le vide**. Et le pied s'arrêtait 5 px *au-dessus* du centre de la margelle, dans la partie où le disque se rétrécit vite — d'où « les mâts sont trop courts ». Agrandi ×2,1, le porte-à-faux devient un trou franc de ~3,9 px, parfaitement visible.

**Fait (données seules, plus une extraction sans changement de règle) :**

- `data/visuels.json` > `visuel_puits` : mâts rapprochés (x = ±7 au lieu de ±9) et **allongés** (h 18 au lieu de 14, pied à y = −7 au lieu de −11) — le pied repose désormais sur **toute** sa largeur (3 px d'appui sur 3), le sommet entre dans le toit (2,5 px de recouvrement). Ajout du **treuil** (rect 15×2,5) qui relie franchement les deux mâts, de la **corde** et du **seau**, explicitement listés au §Attendu et jusque-là absents de la silhouette.
- `src/structures.js` : `boitePrimitive(p, echelle)` **extraite** de `empreinteParDefaut` — c'est exactement le calcul qui s'y trouvait, désormais nommé et réutilisé par elle. **Aucun changement de règle** ; le but est que la vérification d'assemblage et l'empreinte solide dérivent de la *même* fonction, pour qu'un test ne puisse pas rester vert pendant que l'empreinte, elle, dérive.

**L'empreinte solide est strictement inchangée** : boîte englobante x[−11,11] y[−25,5 ; +4] avant **et** après (toutes les pièces ajoutées sont à l'intérieur ; le toit et la margelle, qui la définissent, n'ont pas bougé). La question « le puits mord-il sur un chemin ou sur la zone de réapparition du fruit ? » posée par la fiche **ne se pose donc pas** — et un test la verrouille aux 3 échelles pour qu'elle ne se pose pas non plus par surprise plus tard.

**Valeurs nouvelles, toutes *provisoires*** (arrangement purement visuel, à juger à l'œil par Xav — elles sont toutes dans `data/visuels.json > visuel_puits`) : treuil 15×2,5 en y = −19 ; corde 1×5 en y = −16 ; seau 5,5×4,5 en y = −12 ; mâts 3×18 en x = ±7, y = −16.

**Testé** : `node --check` sur `src/structures.js`, `tests/test_sd_puits_silhouette_2026-09-19.js`. Nouveau `tests/test_sd_puits_silhouette_2026-09-19.js`, **data-driven** (les contacts à vérifier sont déclarés dans une table en tête du fichier ; ajouter un visuel à surveiller ne demande aucune ligne de code) : 8 contacts tenus aux échelles **1, 2,1 et 3** ; appui réel du pied des mâts mesuré sur le **disque** et non sur sa boîte (c'est l'assertion qui aurait été **rouge** sur les anciennes données — vérifié : 1,16 px d'appui pour 3 px de mât) ; empreinte solide inchangée aux 3 échelles ; **aucune pièce orpheline** dans les 4 stations (table, coffre, atelier vérifiés au passage, tous sains). `node tools/run_tests.js` : **64 fichiers verts** (1 nouveau).

**Vérification visuelle** : aucun navigateur piloté disponible dans cette session (extension Chrome non connectée, démon browser-use en échec) — donc, comme le prévoit la fiche, **nouvel état `32bis` ajouté à `docs/CHECKLIST_visuelle.md`** (« Puits — silhouette réassemblée », de jour, à comparer avec table/coffre/atelier qui ne devaient pas changer), dû par Xav. `visuels.js`, `render.js`, `hud.js`, `dialogue_box.js` et `main.js#dessiner()` **non touchés** : pas de rejeu intégral de la checklist exigé par la règle de méthode, seulement ce nouvel état.

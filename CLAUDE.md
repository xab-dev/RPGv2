# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et **3** (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`) — **Phase 3 close le 2026-09-17**, verdict Xav en jeu : tous les points testés, bon (détail complet : `docs/archives/INDEX.md`). Chantier courant : `specs/05_construction-stations.md` v1.0.1 (placement libre des stations dans la Maison), codé en entier le 2026-09-17 (grille intérieure, rotation, `poseValide`, sauvegarde v5, menu Construction contextuel, fantôme de pose) ; une première validation manette le jour même a trouvé l'écran-liste resté affiché pendant tout le placement (housing inutilisable à l'aveugle) — corrigé par un bandeau DOM en filigrane qui remplace l'écran-liste pendant le placement (`MT_construction-bandeau-placement_2026-09-17.md`) — **le rendu réel reste encore à revoir en navigateur par Xav**, voir « Critère de passage courant ».

Historique complet des sessions : **`docs/archives/INDEX.md`** — un fichier par session archivée, contenu verbatim (source de vérité en cas de doute sur le détail d'une décision passée). `CLAUDE.md` ne garde que le journal de la session la plus récente (en fin de ce fichier) — voir la règle de méthode correspondante ci-dessous.

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contexte projet, décisions déjà tranchées (à ne jamais rouvrir), contraintes de méthode, détail de la phase en cours.
- `specs/01_socle-technique.md`, `specs/02_grotte.md`, `specs/03_grotte-polish.md`, `specs/03_maison-exterieur.md`, `specs/04_maison-interieur.md`, `specs/04_stations-proportions-collision.md`, `specs/04_indices-commandes.md`, `specs/05_construction-stations.md` — specs détaillées des phases/chantiers livrés.
- `docs/carte_mentale_RPG_V2_v1_4_0.md` — décisions produit/techniques verrouillées (§0, §8) et règle d'architecture directrice (§7).

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
├── docs/                   carte_mentale_RPG_V2_v1_4_0.md + fiches de diagnostic/ticket actives
│                           (SD_*.md, MT_*.md, NS_*.md, CHECKLIST_visuelle.md) + archives/
│                           (journaux de session clos)
├── tests/                  un fichier par contrat/diagnostic, headless, `node:assert/strict`
└── tools/run_tests.js      lance tous les tests/*.js en séquence (confort de `npm test`)
```

`registry.js`/`save.js` restent purs (aucun accès disque/réseau/DOM) : les adaptateurs (`io_node.js`/`io_navigateur.js`, `storage_indexeddb.js`/`creerStoreMemoire()`) leur fournissent des données déjà prêtes. Convention d'`id` : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `docs/carte_mentale_RPG_V2_v1_4_0.md` §0 et §8. Points structurants pour le code :

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
| **Phase 3 validée en jeu par Xav** (Palier A-E, boucle 5 minutes) : tous les points testés, bon — clôture le critère de passage ROADMAP de la Phase 3 | 2026-09-17 | journal courant |
| Construction (`05_construction-stations.md`) : grille intérieure avec snap (jamais en px), rotation sur les 4 côtés (quarts de tour horaires), menu Pause dédié « Construction » contextuel (absent hors de la Maison) — décisions actées par Xav avant implémentation | 2026-09-17 | journal courant |
| Rotation du rendu ET de l'empreinte de collision par la MÊME fonction de composition (`structures.js#tournerEmpreinte`, appliquée le nombre de fois demandé) — jamais deux calculs de rotation qui pourraient diverger entre le visuel et la collision | 2026-09-17 | journal courant |
| Mode Construction : l'écran-liste des stations disparaît PENDANT le placement (remplacé par un bandeau DOM en filigrane, sans focus) — *précise* le §3 v1.0.0 de la fiche (« affichées dans le menu lui-même » signifiait « pas via `hints.js` », pas « l'écran reste ouvert »). `A`/`B` en placement retournent à la LISTE (on enchaîne le rangement) ; `MENU` revient proprement au menu Pause (seule sortie complète du mode) | 2026-09-17 | `MT_construction-bandeau-placement_2026-09-17.md` |

(Les décisions de `05_construction-stations.md` étaient déjà actées par Xav **dans la spec elle-même** avant tout code, v1.0.0 §9 — les lignes ci-dessus n'y renvoient que pour mémoire, elles ne tranchent rien de nouveau.)

## Points `[OUVERT]`

- **Durées de l'intro cinématique** (`specs/03_grotte-polish.md` §9, palier 4) : budget ≤8s appliqué (mesuré ~7,2s sur les données réelles), valeurs de référence déjà données par la fiche — reste à ajuster sur ressenti manette réel. Pas un point de design non tranché en soi, juste un seuil numérique non encore validé en jeu.
- **Généraliser le patron « sous-système meilleur effort rattrape ses propres erreurs » au-delà d'`audio.js`** (ex. persistance IndexedDB, résolution de loot) ? `SD_musique-freeze-reprise_2026-09-17.md` demandait explicitement de ne pas trancher ça en silence ni de l'implémenter sans validation : une règle architecturale (pas seulement le correctif ponctuel déjà livré) reste à décider par Xav.
- **Verbe de rotation en mode Construction** (`specs/05_construction-stations.md` §9) : provisoire appliqué = `SKILL_1` (contextuel au mode, qui est une UI). Alternative envisagée par la fiche : la croix directionnelle — mais C3③ la réserve explicitement à de futures actions secondaires, et elle n'a pas d'équivalent tactile/clavier évident ; `INTERACT` est une autre option possible. À trancher par Xav sur ressenti manette réel.
- **Maintien vs front montant sur `MOVE` en mode Construction** (même fiche, §9) : provisoire = front montant seul (une tuile par impulsion). Passer à une répétition après ~400 ms de maintien si déplacer le fantôme dans une grande pièce s'avère pénible en jeu — pas tranché avant un retour de Xav.

Tous les autres `[OUVERT]` historiques (résolution logique, clignements/orbite pré-choix, couleur du héros, stations placeholder non solides) ont été tranchés — voir la table de décisions ci-dessus et `docs/archives/INDEX.md`.

## Dette et « à reprendre »

- **Toast de ramassage** à chaque objet ramassé (seul le premier a un retour, dialogue `dlg_premier_ramassage`) — 2026-09-16, `docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`.
- **Indicateur jour/nuit au HUD** (optionnel selon la spec, non posé) — 2026-09-16, même archive.
- **Mesure réelle du temps de frame / fps** (plancher mobile jamais mesuré, seulement borné fonctionnellement par `selectionnerTuilesVisibles`) — 2026-09-16, même archive.
- **Tactile réel** (manette/clavier seulement testés par toutes les sessions jusqu'ici) — dette assumée depuis la Phase 0, différée jusqu'à un lien de partage (Phase 4+).
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
- **Migration `4 → 5` (`maison.stations`) jamais exercée sur une vraie sauvegarde** — même classe de dette que la migration 3→4 ci-dessus, testée uniquement en headless (`test_save_migration_4_5`). 2026-09-17, journal courant.
- **Validation manuelle de la Construction encore due par Xav** (`specs/05_construction-stations.md` v1.0.1) — code livré en entier et testé headless (`tests/test_construction_2026-09-17.js` : grille, rotation, 3 refus, pose invalide au chargement, test data-driven, transitions liste/bandeau/menu Pause), mais `render.js`/`main.js#dessiner()`/`ui/menu.js` ont été touchés (règle de méthode) et **rien n'a encore été vu en navigateur réel** — états 29-32 et 31bis de `docs/CHECKLIST_visuelle.md` restent à capturer (fantôme vert/rouge, station tournée, entrée de menu contextuelle, bandeau de placement).
- **Aide-texte du mode Construction toujours en glyphes MANETTE** (jamais clavier/tactile) — simplification assumée : `ui/menu.js` ne reçoit pas `input.peripheriqueActif()` (contrairement à `hints.js`, qui lui est branché dessus). Sans conséquence tant que le clavier/tactile restent hors du parcours de référence (décision produit : PC à la manette), à généraliser si Xav en a besoin.

## Critère de passage courant

**Phase 3 — Maison, intérieur & systèmes de camp** (spec `specs/04_maison-interieur.md` v1.1.0) : **close le 2026-09-17.** Code livré et testé headless pour les 5 paliers (A recettes/craft, B récolte réelle, C survie, D XP/niveaux, E coffre). Deux validations en jeu le même jour ont trouvé 4 bugs bloquants au total, tous corrigés et testés headless le jour même : stations invisibles, PV qui semblaient baisser en mangeant, jauges figées (`docs/archives/JOURNAL_2026-09-17_diagnostic-stations-pv-jauges.md`, 13h45) puis le respawn des items au sol cassé pour `item_branche`/`item_caillou` (`docs/archives/JOURNAL_2026-09-17_respawn-items-au-sol.md`, 15h45). Critère ROADMAP (boucle 5 minutes : sortir → récolter → revenir → cuisiner/crafter → repartir, niveau ~5 qui ouvre la zone suivante) **prouvé par bot headless** (`tests/test_phase3_boucle_2026-09-17.js`) **et validé par Xav en jeu** : tous les points testés, bon.

**Chantier courant — Construction** (spec `specs/05_construction-stations.md` v1.0.1), extrait de la Phase 3 (ex-palier F). Code livré en entier le 2026-09-17 le jour même de la clôture de la Phase 3 : `placement.js` (grille, rotation, `poseValide`, BFS de praticabilité du couloir), `structures.js#tournerEmpreinte`/`empreinteAbsoluePuzzle` (une seule fonction pour la collision ET le rendu), sauvegarde v5 (`maison.stations`), menu Pause « Construction » contextuel, fantôme de pose vert/rouge (+ marqueur de forme distincte). Première validation manette le jour même : sélection/déplacement/rotation/pose fonctionnels, mais l'écran-liste restait affiché PENDANT le placement (housing à l'aveugle) — corrigé le jour même par un bandeau DOM en filigrane (`MT_construction-bandeau-placement_2026-09-17.md` → v1.0.1) : liste → placement → `A`/`B` reviennent à la liste, `MENU` revient proprement au menu Pause. Critères automatisés (§7 + micro-ticket) **tous prouvés par `tests/test_construction_2026-09-17.js`** : grille/rotation/confirmation/refus (chevauchement, hors intérieur, couloir bloqué)/pose invalide au chargement/puits jamais placable/test data-driven (5ᵉ station en JSON seul)/transitions liste-placement-menu Pause/invariant « construction active ⇒ UI ouverte ». **Validation manette par Xav encore due** — jamais vu en navigateur réel (`render.js`/`ui/menu.js` touchés, règle de méthode), voir Dette et `docs/CHECKLIST_visuelle.md` états 29-32/31bis.

## Journal de session — Bandeau de placement en mode Construction (2026-09-17, 17h50)

Ménage de journal effectué en début de session : le journal précédent (« Clôture Phase 3 + Construction ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_phase3-cloture-et-construction.md`, `docs/archives/INDEX.md` mis à jour.

Ordonnée par `MT_construction-bandeau-placement_2026-09-17.md`, qui remplace une fiche SD ouverte à 17h30 : la console était propre et le mode fonctionnait déjà (sélection/déplacement/rotation/pose confirmés à la manette par Xav) — pas un bug, une **précision de spec** (v1.0.0 → v1.0.1). Le §3 v1.0.0 disait « les touches du mode sont affichées dans le menu lui-même », implémenté le jour même en gardant l'écran-liste plein écran affiché PENDANT le placement : la pièce restait masquée par cet écran, annulant l'intérêt du housing (pose à l'aveugle), sortir demandait `MENU` puis « Quitter ».

**Décisions actées par Xav (17h50, ne pas rouvrir)** : bandeau **DOM** (pas canvas — évite de rejouer `render.js`/`main.js#dessiner()`, dont le fantôme a déjà coûté les états 29-32 non encore validés) ; `A` (pose confirmée) → retour à la **liste** (enchaîner le rangement sans repasser par `MENU`) ; `B` en placement → retour à la **liste** ; `MENU` en placement → annule + revient **proprement** au menu Pause (jamais superposé) ; bandeau en **filigrane**, position **bas** provisoire.

**`src/ui/menu.js`** : `creerEcranListeGenerique` gagne `fermerSansCallback()` (ferme sans invoquer `onFermer` — nécessaire pour enchaîner sur le bandeau sans que le menu principal ne réapparaisse dessous). Nouvel élément `bandeauConstruction` (style explicite dédié, jamais `appliquerStylePleinEcran` — leçon du diagnostic reset invisible : un écran partiel sans style déclaré est invisible), `pointer-events: none` (aucun focus, §2 : "pas de conflit avec le routage vers la machine construction"). Trois nouvelles transitions exposées : `ouvrirPlacementConstruction(nomStation)` (transition ATOMIQUE : `ecranConstruction.fermerSansCallback()` + lève le bandeau, une seule fonction synchrone), `reouvrirListeConstruction()` (cache le bandeau, rouvre la liste avec des entrées fraîches), `fermerPlacementConstruction()` (cache juste le bandeau, main.js enchaîne sur `menu.ouvrir()`). `initialiserMenu` gagne `peripheriqueActif` optionnel (défaut `'manette'`) — seul le texte du bandeau s'en sert (glyphes du périphérique réellement actif), dette existante (`ui/menu.js` non branché sur `input.js` ailleurs) réduite au minimum plutôt que généralisée. L'aide-texte de l'écran-liste (déplacer/tourner/poser/annuler, ajoutée par erreur à la session précédente sur le MAUVAIS écran) est retirée — ces verbes n'ont jamais concerné la liste, seulement le placement.

**`src/main.js`** : `demarrerConstruction` appelle désormais `menu.ouvrirPlacementConstruction(label)` (jamais `menu.fermer()` seul, cause du bug). `confirmerConstruction` (A valide) et `annulerConstruction` (B) appellent `menu.reouvrirListeConstruction()` après leur traitement habituel. Nouvelle `quitterConstructionVersMenuPause()` (MENU) : annule sans persister, cache le bandeau, ouvre le vrai menu Pause. Le garde-fou d'ouverture du menu (`etatBrut.menu.pressed && ...`) distingue maintenant explicitement le cas `constructionActif()` (route vers `quitterConstructionVersMenuPause`) du cas normal (`!menu.estOuvert()` avant d'ouvrir) — un seul point de décision, pas deux chemins parallèles. `uiOuverteMaintenant` exposée dans l'API de l'orchestrateur (déjà utilisée en interne par `maj()`, jamais une redérivation séparée côté test) pour prouver l'invariant "construction active ⇒ UI ouverte" en headless.

### Testé

- `node --check` sur `src/ui/menu.js` et `src/main.js`.
- `tests/test_construction_2026-09-17.js` étendu : transition atomique liste → placement (`menuEtat()` d'un stub dédié : liste masquée, bandeau levé, jamais le menu Pause) ; `A` confirmé → retour à la liste (jamais le jeu nu) ; `B` → retour à la liste, rien persisté ; nouveau bloc **MENU pendant le placement** → annule, aucune écriture dans `save.maison.stations`, retour propre au menu Pause (aucun écran orphelin, un second `MENU` sans effet — garde-fou déjà présent) ; invariant « construction active ⇒ UI ouverte » vérifié après CHAQUE frame de manipulation du fantôme (`pousserAxe`/`pousserBouton` l'assertent désormais automatiquement).
- `node tools/run_tests.js` : **57 fichiers, tous verts** (aucun nouveau fichier — extension du fichier existant, comme demandé par la fiche §5).

### Reste ouvert

Validation manette de Xav dans un vrai navigateur (bandeau jamais vu, états 29-32/31bis de `docs/CHECKLIST_visuelle.md`), y compris le ressenti sur la position du bandeau (provisoire = bas). Les 2 points `[OUVERT]` de la fiche 05 (verbe de rotation, maintien vs front montant) restent tels quels, non rouverts par ce ticket.

### Hors scope (explicite, cf. fiche)

Tout le reste de `05_construction-stations.md` (déjà livré) ; brancher `input.js` plus largement dans `ui/menu.js` au-delà du seul bandeau ; généraliser le patron "écran partiel paramétré" avant un 2ᵉ cas d'usage réel (Xav prévoit l'équipement, pas pour cette session).


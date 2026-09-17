# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et **3** (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`) — **Phase 3 close le 2026-09-17**, verdict Xav en jeu : tous les points testés, bon (détail complet : `docs/archives/INDEX.md`). Chantier courant : `specs/05_construction-stations.md` v1.0.1 (placement libre des stations dans la Maison), codé en entier le 2026-09-17 (grille intérieure, rotation, `poseValide`, sauvegarde v5, menu Construction contextuel, fantôme de pose). Trois validations/diagnostics le jour même, tous corrigés et testés headless le jour même : l'écran-liste resté affiché pendant tout le placement (bandeau DOM en filigrane, `docs/archives/JOURNAL_2026-09-17_bandeau-placement.md`), puis le menu Pause resté ouvert de façon invisible à l'entrée en placement (`docs/archives/JOURNAL_2026-09-17_diagnostic-menu-ouvert-placement.md`) — ce 2ᵉ correctif réparait le sens ALLER mais cassait le sens RETOUR (`menu.estOuvert()` retombait à `false` alors que le menu Pause était réaffiché), cause racine confirmée par une session de lecture seule (`docs/CARTE_cycle-de-vie-ui_2026-09-17.md`) puis réglée en unifiant le contrat « ouvert » de tous les contrôleurs de `ui/menu.js` (booléen ET DOM visible, jamais l'un sans l'autre — journal courant) — **le rendu réel reste encore à revoir en navigateur par Xav**, voir « Critère de passage courant ».

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
| Contrat unique de « ouvert » pour tout contrôleur de `ui/menu.js` (`creerControleurMenu#element`) : booléen interne ET DOM réellement visible, jamais l'un sans l'autre — remplace les 2 contrats qui coexistaient (booléen pur pour le menu Pause/la confirmation de reset, booléen+DOM pour Poche/Craft/Coffre/Stats/Construction) | 2026-09-17 | journal courant |

(Les décisions de `05_construction-stations.md` étaient déjà actées par Xav **dans la spec elle-même** avant tout code, v1.0.0 §9 — les lignes ci-dessus n'y renvoient que pour mémoire, elles ne tranchent rien de nouveau.)

## Points `[OUVERT]`

- **Durées de l'intro cinématique** (`specs/03_grotte-polish.md` §9, palier 4) : budget ≤8s appliqué (mesuré ~7,2s sur les données réelles), valeurs de référence déjà données par la fiche — reste à ajuster sur ressenti manette réel. Pas un point de design non tranché en soi, juste un seuil numérique non encore validé en jeu.
- **Généraliser le patron « sous-système meilleur effort rattrape ses propres erreurs » au-delà d'`audio.js`** (ex. persistance IndexedDB, résolution de loot) ? `SD_musique-freeze-reprise_2026-09-17.md` demandait explicitement de ne pas trancher ça en silence ni de l'implémenter sans validation : une règle architecturale (pas seulement le correctif ponctuel déjà livré) reste à décider par Xav.
- **Verbe de rotation en mode Construction** (`specs/05_construction-stations.md` §9) : provisoire appliqué = `SKILL_1` (contextuel au mode, qui est une UI). Alternative envisagée par la fiche : la croix directionnelle — mais C3③ la réserve explicitement à de futures actions secondaires, et elle n'a pas d'équivalent tactile/clavier évident ; `INTERACT` est une autre option possible. À trancher par Xav sur ressenti manette réel.
- **Maintien vs front montant sur `MOVE` en mode Construction** (même fiche, §9) : provisoire = front montant seul (une tuile par impulsion). Passer à une répétition après ~400 ms de maintien si déplacer le fantôme dans une grande pièce s'avère pénible en jeu — pas tranché avant un retour de Xav.
- **Règle de méthode candidate, proposée par `SD_construction-ecrans-orphelins_2026-09-17.md`, pas encore validée par Xav** : *« ouvert » pour un écran DOM signifie toujours booléen ET DOM visible ; un écran qui n'a pas d'accesseur n'existe pas pour le routage.* Née du diagnostic des écrans orphelins (journal courant) — appliquée en local à `ui/menu.js` (tous ses contrôleurs), pas encore généralisée en contrainte de méthode non négociable.

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
- **Validation manuelle de la Construction encore due par Xav** (`specs/05_construction-stations.md` v1.0.1) — code livré en entier et testé headless (`tests/test_construction_2026-09-17.js` + `tests/test_sd_menu_ecrans_orphelins_2026-09-17.js` : grille, rotation, 3 refus, pose invalide au chargement, test data-driven, transitions liste↔bandeau↔menu Pause dans les deux sens), mais `render.js`/`main.js#dessiner()`/`ui/menu.js` ont été touchés (règle de méthode) et **rien n'a encore été vu en navigateur réel** — états 29-32 et 31bis de `docs/CHECKLIST_visuelle.md` restent à capturer (fantôme vert/rouge, station tournée, entrée de menu contextuelle, bandeau de placement).
- **Aide-texte du mode Construction toujours en glyphes MANETTE** (jamais clavier/tactile) — simplification assumée : `ui/menu.js` ne reçoit pas `input.peripheriqueActif()` (contrairement à `hints.js`, qui lui est branché dessus). Sans conséquence tant que le clavier/tactile restent hors du parcours de référence (décision produit : PC à la manette), à généraliser si Xav en a besoin.
- **`menu.bandeauEstOuvert()` volontairement PAS inclus dans `menu.estOuvert()`** (`SD_construction-ecrans-orphelins_2026-09-17.md` §2 point 3, journal courant) : l'inclure ferait gagner la branche `menu.traiterInput()` sur `traiterConstruction()` dans le dispatch de `main.js#maj()` pendant tout le placement (bandeau visible), réintroduisant le bug tout juste corrigé — main.js reste donc gelé pendant le placement via `constructionActif()` séparément, un appariement par convention entre les 4 fonctions qui touchent les deux (désormais vérifiable via `bandeauEstOuvert()`, plus implicite). Décorréler proprement demanderait de toucher le routage de `maj()`, explicitement hors scope de cette fiche.

## Critère de passage courant

**Phase 3 — Maison, intérieur & systèmes de camp** (spec `specs/04_maison-interieur.md` v1.1.0) : **close le 2026-09-17.** Code livré et testé headless pour les 5 paliers (A recettes/craft, B récolte réelle, C survie, D XP/niveaux, E coffre). Deux validations en jeu le même jour ont trouvé 4 bugs bloquants au total, tous corrigés et testés headless le jour même : stations invisibles, PV qui semblaient baisser en mangeant, jauges figées (`docs/archives/JOURNAL_2026-09-17_diagnostic-stations-pv-jauges.md`, 13h45) puis le respawn des items au sol cassé pour `item_branche`/`item_caillou` (`docs/archives/JOURNAL_2026-09-17_respawn-items-au-sol.md`, 15h45). Critère ROADMAP (boucle 5 minutes : sortir → récolter → revenir → cuisiner/crafter → repartir, niveau ~5 qui ouvre la zone suivante) **prouvé par bot headless** (`tests/test_phase3_boucle_2026-09-17.js`) **et validé par Xav en jeu** : tous les points testés, bon.

**Chantier courant — Construction** (spec `specs/05_construction-stations.md` v1.0.1), extrait de la Phase 3 (ex-palier F). Code livré en entier le 2026-09-17 le jour même de la clôture de la Phase 3 : `placement.js` (grille, rotation, `poseValide`, BFS de praticabilité du couloir), `structures.js#tournerEmpreinte`/`empreinteAbsoluePuzzle` (une seule fonction pour la collision ET le rendu), sauvegarde v5 (`maison.stations`), menu Pause « Construction » contextuel, fantôme de pose vert/rouge (+ marqueur de forme distincte). Trois validations/diagnostics le jour même : (1) l'écran-liste restait affiché PENDANT le placement (housing à l'aveugle) — corrigé par un bandeau DOM en filigrane (`docs/archives/JOURNAL_2026-09-17_bandeau-placement.md` → v1.0.1) ; (2) le menu Pause restait ouvert de façon invisible à l'entrée en placement — corrigé (à tort, en apparence) en fermant explicitement le contrôleur de premier niveau dans `ouvrirPlacementConstruction` (`docs/archives/JOURNAL_2026-09-17_diagnostic-menu-ouvert-placement.md`) ; (3) ce 2ᵉ correctif cassait le sens RETOUR (liste → menu Pause) — `menu.estOuvert()` retombait à `false` alors que `conteneur` était réaffiché — cause racine (2 contrats différents pour « ouvert » sous le même `menu.estOuvert()`) établie par une session de lecture seule (`docs/CARTE_cycle-de-vie-ui_2026-09-17.md`), réglée en unifiant le contrat de TOUS les contrôleurs de `ui/menu.js` (`creerControleurMenu#element` : booléen ET DOM visible) — plus besoin de fermer/rouvrir explicitement le contrôleur de premier niveau, `ouvrirPlacementConstruction` se limite désormais à cacher `ecranConstruction` et lever le bandeau (journal courant). Critères automatisés (§7 + micro-tickets) **tous prouvés par `tests/test_construction_2026-09-17.js`** (mis à jour : C3bis passe désormais RÉELLEMENT par l'écran-liste avant de choisir une station) **et par `tests/test_sd_menu_ecrans_orphelins_2026-09-17.js`** (séquence composée complète sur le vrai DOM, aller ET retour, invariants `menu.estOuvert()`/`bandeauEstOuvert()`/`uiOuverteMaintenant()` vérifiés après chaque verbe — échoue sur `a70a089`, vert après ce correctif) : grille/rotation/confirmation/refus/pose invalide au chargement/puits jamais placable/test data-driven/transitions liste↔placement↔menu Pause dans les DEUX sens. **Validation manette par Xav encore due** — jamais vu en navigateur réel (`ui/menu.js` retouché, règle de méthode), voir Dette et `docs/CHECKLIST_visuelle.md` états 29-32/31bis.

## Journal de session — Correction : écrans de menu orphelins en Construction (2026-09-17, soir)

Ménage de journal effectué en début de session : le journal précédent (« Diagnostic : menu Pause resté ouvert à l'entrée en placement ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-17_diagnostic-menu-ouvert-placement.md`, `docs/archives/INDEX.md` mis à jour (avec une entrée aussi pour `docs/CARTE_cycle-de-vie-ui_2026-09-17.md`, la session de lecture seule intercalée entre les deux diagnostics).

Ordonnée par `SD_construction-ecrans-orphelins_2026-09-17.md`, elle-même fondée sur `docs/CARTE_cycle-de-vie-ui_2026-09-17.md` (session lecture seule précédente). Le correctif d'`a70a089` (`controleur.fermer()` ajouté dans `ouvrirPlacementConstruction`) réparait le sens ALLER (liste → placement, stick libéré pour le fantôme) mais cassait le sens RETOUR : `reouvrirListeConstruction()` rouvre `ecranConstruction` sans jamais rouvrir `controleur`, si bien qu'un `B` pressé DEPUIS LA LISTE (aucune station choisie) faisait réafficher `conteneur` (via `onFermerVersMenuPrincipal`, symétrique à Poche/Stats) sur un `controleur` resté fermé pour toujours — `menu.estOuvert()` retombait à `false` alors que le menu Pause était bel et bien visible à l'écran.

**Cause racine confirmée** (carte §1.2) : `menu.estOuvert()` OR-combinait deux CONTRATS différents pour « ouvert » — booléen pur pour `controleur` (menu Pause) et `controleurConfirmation` (reset), booléen ET `!el.hidden` pour les 5 écrans génériques (Poche/Craft/Coffre/Stats/Construction, via `creerEcranListeGenerique`). Un mode qui sort de la pile du menu Pause et y revient (Construction est le premier à le faire) ne peut satisfaire les deux contrats en ne jouant que sur `controleur.fermer()`/`.ouvrir()` : soit le menu Pause vole les verbes au placement (`e1c4ff3`), soit le retour tombe sur un contrôleur mort (`a70a089`).

**Correctif** (`src/ui/menu.js`) : `creerControleurMenu()` accepte désormais `options.element` — quand fourni, `estOuvert()` devient `ouvert && !element.hidden`, UN SEUL contrat pour tout le module. Câblé sur `controleur` (`element: conteneur`) et `controleurConfirmation` (`element: confirmation`), aux DEUX endroits où `controleur` est (re)créé (`construireMenuPrincipal`, appelée à chaque `menu.ouvrir()`). `creerEcranListeGenerique` porte désormais ce ET À L'INTÉRIEUR de son propre contrôleur (`element: el`, aux deux sites de création) au lieu de le refaire à l'extérieur (`estOuvert: () => controleur.estOuvert() && !el.hidden` → `() => controleur.estOuvert()`), pour ne jamais avoir le ET en double. `ouvrirPlacementConstruction` n'a plus besoin de fermer `controleur` explicitement : cacher `conteneur` suffit à faire retomber `controleur.estOuvert()` à `false` (le booléen interne reste `true`, sans conséquence tant que le DOM est caché), et le réafficher plus tard (`onFermerVersMenuPrincipal`, déjà le chemin de Poche/Stats) le fait redevenir `true` sans jamais rappeler `.ouvrir()` — la fonction se limite désormais à `ecranConstruction.fermerSansCallback()` + lever le bandeau, le `afficherEcran(conteneur, false)` redondant retiré au passage.

**Régression détectée en cours de route, corrigée** : l'unification a cassé `test_phase1_sd_menu_reset_invisible_2026-09-15.js` (retour "B" depuis la confirmation de reset). La ligne `else if (controleur.estOuvert())` du `traiterInput` principal (décide si `revenirAuMenuPrincipal()` doit rouvrir `conteneur`, ou si "Oui" a entre-temps fermé tout le menu) reposait sur le contrat PUR (« ce contrôleur a-t-il été fermé délibérément », indépendant du DOM) — or à cet instant précis `conteneur` est TOUJOURS caché (masqué par `actionOuvrirConfirmation`, pas encore réaffiché), donc `estOuvert()` unifié y est structurellement toujours `false`, qu'"Oui" ait été choisi ou non. Ajout de `controleur.ouvertIntentionnellement()` (le booléen brut, sans le ET DOM) réservé à ce SEUL site — la seule question qui a réellement besoin de l'intention plutôt que de la visibilité.

**Piste 2 de la carte (accesseur `menu.bandeauEstOuvert()`) implémentée EN PARTIE, délibérément pas fusionnée dans `menu.estOuvert()`** : l'y inclure ferait gagner la branche `menu.traiterInput()` sur `traiterConstruction()` dans le dispatch de `main.js#maj()` pendant tout le placement (bandeau visible), réintroduisant exactement le bug tout juste corrigé — vérifié par le calcul, pas supposé. Le routage de `maj()` n'a donc pas été touché (§2 point 4 de la fiche), et le gel du jeu pendant le placement reste couvert par `constructionActif()` séparément — dette notée (voir Dette et Points `[OUVERT]`).

### Testé

- `node --check` sur `src/ui/menu.js` et les 2 fichiers de test touchés/créés.
- `tests/test_sd_menu_ecrans_orphelins_2026-09-17.js` (nouveau, copié depuis le patron de `test_construction_2026-09-17.js`) : séquence composée complète sur le VRAI `ui/menu.js`, clic réel sur `#menu-construction` (équivalent souris d'`actionOuvrirConstruction`, jamais contourné) — Start → Construction → A (station) → MOVE (fantôme) → B → liste → A (autre station) → A (pose) → liste → B → menu Pause visible **et** `conteneur` effectivement visible → Quitter → rien de visible, héros mobile ; puis la même jusqu'au placement suivie de `MENU` (annule proprement, retour au menu Pause). Invariant vérifié après CHAQUE verbe : `menu.estOuvert()` == au moins un écran (bandeau exclu) visible dans le DOM, `menu.bandeauEstOuvert()` == `constructionActif()`, `uiOuverteMaintenant()` == l'OR exact de ses composantes. **Vérifié rouge avant correctif** (échoue précisément à l'étape « B depuis la liste, aucune station choisie » : `menu.estOuvert() (false) doit refléter... (true)`, exactement le symptôme 3 de la fiche), **vert après**.
- `tests/test_construction_2026-09-17.js` (C3bis) mis à jour : passait auparavant DIRECTEMENT de `menu.ouvrir()` à l'action de la station, sans jamais ouvrir réellement l'écran-liste Construction (`conteneur` restait donc visible) — devenu incompatible avec le contrat unifié (`controleur.estOuvert()` dépend désormais de la visibilité RÉELLE de `conteneur`). Corrigé en ajoutant le clic réel sur `#menu-construction` avant l'action de la station, comme le nouveau test — c'est le test qui était optimiste, pas le correctif qui était faux.
- `node tools/run_tests.js` : **58 fichiers, tous verts** (1 nouveau fichier, 2 fichiers modifiés).

### Reste ouvert

Validation manette de Xav dans un vrai navigateur — `ui/menu.js` reste en dette de validation visuelle (`docs/CHECKLIST_visuelle.md` états 29-32/31bis) ; le parcours complet Start → Construction → A → MOVE → B → liste → A → A → liste → B → Quitter reste à rejouer à la manette pour confirmer le ressenti (pas seulement la logique, déjà prouvée headless). Règle de méthode candidate proposée (voir Points `[OUVERT]`), pas encore validée par Xav. `menu.bandeauEstOuvert()` non fusionné dans `menu.estOuvert()` (voir Dette) — resterait à faire si Xav souhaite un jour toucher le routage de `main.js#maj()` pour ne plus dépendre de l'appariement par convention avec `constructionActif()`.


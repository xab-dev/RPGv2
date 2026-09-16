# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte) et 1b (polish, 4/4 paliers, DA validée) — validées en jeu à la manette réelle le 2026-09-16. Phase 2 (Région Maison, `specs/03_maison-exterieur.md`) : « première marche » (5 paliers + audio) validée à la manette et au clavier réels par Xav le 2026-09-16 ; les deux défauts qu'elle a fait remonter (accrochage des coins en collision, arbre interactif hors du chemin naturel) ont été diagnostiqués et corrigés le jour même (`SD_hitbox-angle-arbre_2026-09-16.md`) puis validés par Xav le 2026-09-17. **Phase 2 close** — prochaine phase à ouvrir. Tactile en dette assumée jusqu'à la Phase 4 (compétences), différé jusqu'à un lien de partage pour test (le neveu de Xav est le testeur mobile de référence).

`MT_jour-nuit-contraste_2026-09-16.md` (v1.1, racine du dépôt) livrée le 2026-09-17 — code fait et testé, validation manuelle manette/navigateur réelle encore due par Xav (voir journal courant). Prochaines fiches à livrer, dans cet ordre (aucune rédigée à ce jour) : `specs/04_indices-commandes.md` → `specs/04_stations-proportions-collision.md` → `docs/MT_musique-ambiance-synth_2026-09-16.md`.

Historique complet des sessions : **`docs/archives/INDEX.md`** — un fichier par session archivée, contenu verbatim (source de vérité en cas de doute sur le détail d'une décision passée). `CLAUDE.md` ne garde que le journal de la session la plus récente (en fin de ce fichier) — voir la règle de méthode correspondante ci-dessous.

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contexte projet, décisions déjà tranchées (à ne jamais rouvrir), contraintes de méthode, détail de la phase en cours.
- `specs/01_socle-technique.md`, `specs/02_grotte.md`, `specs/03_grotte-polish.md`, `specs/03_maison-exterieur.md` — specs détaillées des phases livrées.
- `specs/carte_mentale_RPG_V2_v1_3_0.md` — décisions produit/techniques verrouillées (§0, §8) et règle d'architecture directrice (§7).

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
│   │                       portails, zones, jour/nuit, audio, reinitialiserPartie) — importable/
│   │                       testable depuis Node sans DOM ; script propre aux scènes du jeu, pas
│   │                       un système généralisé de déclencheurs
│   ├── registry.js         validerCatalogues() / construireRegistre() — pur, sans I/O
│   ├── schemas.js          schéma par catalogue (champs requis, id, refs, validation custom)
│   ├── io_node.js / io_navigateur.js   adaptateurs disque (tests) / réseau (jeu) pour registry.js
│   ├── storage_indexeddb.js adaptateur IndexedDB pour save.js
│   ├── input/              input.js (fusion clavier+manette+tactile en verbes, loquet tactile),
│   │                       gamepad.js, keyboard.js (reset sur `blur`), touch.js (joystick+boutons)
│   ├── scene.js            layout (tableau ou lignes+légende) → forêt procédurale → structures ;
│   │                       collisions 4 coins + glissement + correction de coin (chevauchement
│   │                       ≤ `TOLERANCE_COIN_PX`, cf. journal courant) ; portes conditionnelles ;
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
│   ├── save.js             double tampon, versions + migrations (v3), reinitialiserSauvegarde()
│   ├── flags.js            registre de flags + conditions all/any/not + `initial` (persistance)
│   ├── stats.js            stats primaires + dérivées (formule linéaire en données)
│   ├── status.js           effets d'état (buff/dot/debuff/contrôle), un seul chemin de calcul
│   ├── entities.js         héros/monstres : PV, position, mort/respawn
│   ├── combat.js           auto-attaque annulaire, cooldown, feedback (anneau/flash/barre de PV)
│   ├── companion.js        follet : suivre/engager, position (+ lumière collée)
│   ├── loot.js             résolution de loot table (PRNG injectable)
│   ├── puzzles.js          types `levier`/`sequence`/`station_placeholder` (instances en données)
│   ├── resources.js        tuiles-ressources bloquées (`peutRecolter` toujours faux en Phase 2 —
│   │                       point d'accroche Phase 3)
│   ├── inventory.js        poche du héros (items comptés)
│   ├── ground_items.js     objets au sol par scène (spawn, ramassage)
│   ├── structures.js       toit (opacité dégressive selon la distance du héros)
│   ├── daynight.js         cycle jour/nuit en 4 phases (constantes), avance hors UI seulement
│   ├── audio.js            musique en boucle, armée au premier verbe abstrait (DOM)
│   ├── dialogue.js         file de lignes, machine à écrire + armement anti-spam, résolution locuteur
│   ├── i18n.js
│   └── ui/                 menu.js (DOM ; Langue/Musique/Poche/Export/Import/Reset/Fermer),
│                           hud.js + dialogue_box.js + hud_layout.js (canvas, résolution logique)
├── data/                   catalogues JSON (voir specs/*.md §2.1 de chaque phase)
├── locales/fr.json, en.json
├── specs/                  00_ROADMAP.md, 0N_*.md par phase, carte_mentale_RPG_V2_v1_3_0.md
├── docs/                   fiches de diagnostic/ticket actives (SD_*.md, MT_*.md, NS_*.md,
│                           CHECKLIST_visuelle.md) + archives/ (journaux de session clos)
├── tests/                  un fichier par contrat/diagnostic, headless, `node:assert/strict`
└── tools/run_tests.js      lance tous les tests/*.js en séquence (confort de `npm test`)
```

`registry.js`/`save.js` restent purs (aucun accès disque/réseau/DOM) : les adaptateurs (`io_node.js`/`io_navigateur.js`, `storage_indexeddb.js`/`creerStoreMemoire()`) leur fournissent des données déjà prêtes. Convention d'`id` : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `carte_mentale_RPG_V2_v1_3_0.md` §0 et §8. Points structurants pour le code :

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
| Stations placeholder : proportions à corriger (échelle ×2 à ×2,2) **et** collision sur certains items — *révise* la décision initiale « non solides » → `specs/04_stations-proportions-collision.md` (à rédiger) | 2026-09-16 | journal courant, ci-dessous |
| L'arbre fruitier ne se coupe jamais (fruits, puis jardin/récolte/craft/cuisine seulement) | 2026-09-16 | journal courant |
| Tactile différé jusqu'à un lien de partage (Phase 4 ou plus) ; testeur de référence = le neveu de Xav | 2026-09-16 | journal courant |
| Indice de commande au **premier** déclenchement de chaque verbe seulement, jamais répété → `specs/04_indices-commandes.md` (à rédiger) | 2026-09-16 | journal courant |
| Ambiance musicale continue à base de notes synthé qui bouclent, en attendant `piano_solo.mp3` → `docs/MT_musique-ambiance-synth_2026-09-16.md` (à rédiger) | 2026-09-16 | journal précédent |
| Nuit extérieure autorisée à dépasser le plafond de la grotte (0.72) — nuit = 0.85 ; *révise* la lecture initiale du ticket qui présentait ce plafond comme une limite dure partagée — décision explicite de Xav, soumise en question bloquante avant implémentation | 2026-09-17 | journal courant |
| Cycle jour/nuit à durées par phase indépendantes (jour 10 min, crépuscule/aube 1 min 30, nuit 4 min francs = 17 min au total) — *révise* le `DUREE_CYCLE_MS` unique découpé en phases égales de la Phase 2 | 2026-09-17 | journal courant |

## Points `[OUVERT]`

- **Durées de l'intro cinématique** (`specs/03_grotte-polish.md` §9, palier 4) : budget ≤8s appliqué (mesuré ~7,2s sur les données réelles), valeurs de référence déjà données par la fiche — reste à ajuster sur ressenti manette réel. Pas un point de design non tranché en soi, juste un seuil numérique non encore validé en jeu.

Tous les autres `[OUVERT]` historiques (résolution logique, clignements/orbite pré-choix, couleur du héros, stations placeholder non solides) ont été tranchés — voir la table de décisions ci-dessus et `docs/archives/INDEX.md`.

## Dette et « à reprendre »

- **Toast de ramassage** à chaque objet ramassé (seul le premier a un retour, dialogue `dlg_premier_ramassage`) — 2026-09-16, `docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`.
- **Indicateur jour/nuit au HUD** (optionnel selon la spec, non posé) — 2026-09-16, même archive.
- **Mesure réelle du temps de frame / fps** (plancher mobile jamais mesuré, seulement borné fonctionnellement par `selectionnerTuilesVisibles`) — 2026-09-16, même archive.
- **Tactile réel** (manette/clavier seulement testés par toutes les sessions jusqu'ici) — dette assumée depuis la Phase 0, différée jusqu'à un lien de partage (Phase 4+).
- **Mouvement légèrement téléporté à chaque angle depuis la correction de coin** (2026-09-17, retour Xav) : feeling meilleur, aucune interruption, mais pas très smooth — à lisser dans une phase de polish ultérieure (hypothèse : répartir le repoussement sur plusieurs frames ou l'interpoler plutôt que l'appliquer d'un coup — à diagnostiquer, pas à patcher en silence).
- **Fiches à rédiger** (nommées par les décisions ci-dessus) : `specs/04_indices-commandes.md`, `specs/04_stations-proportions-collision.md`, `docs/MT_musique-ambiance-synth_2026-09-16.md`. (`MT_jour-nuit-contraste_2026-09-16.md` livrée, cf. journal courant.)

## Critère de passage courant

Phase 2 (Région Maison, première marche) — verdict détaillé : `docs/NS_critere-passage-phase2_2026-09-16.md`. État au 2026-09-17 : validée à la manette et au clavier réels par Xav sur tout le parcours (grotte → rocher → branche → Poche → toit → stations → jardin/fruit/puits → campagne → persistance) ; les deux défauts remontés (arbre hors chemin, accrochage des coins) ont été corrigés le 2026-09-16 et validés le 2026-09-17 (`SD_hitbox-angle-arbre_2026-09-16.md`). **Phase 2 close.** Reste en dette, non bloquant : tactile réel (Phase 4+), musique (fichier non fourni), mesure de fps réelle.

## Journal de session — Micro-ticket contraste et durées jour/nuit (2026-09-17)

Ménage de journal effectué en début de session : le journal précédent (« Diagnostic accrochage des coins + arbre introuvable ») archivé verbatim dans `docs/archives/JOURNAL_2026-09-16_diagnostic-accrochage-arbre.md`, index mis à jour.

Brief complet : `MT_jour-nuit-contraste_2026-09-16.md` v1.1 (racine du dépôt). Suite du verdict Xav sur le critère de passage Phase 2 : sources de lumière bonnes, contraste jour/nuit insuffisant + cycle à durées égales pas assez lisible (nuit trop courte, « pas franche »).

### Conflit du ticket remonté à Xav avant code

Le ticket demandait à la fois « monter la nuit de +0,10 à +0,15 » et « sans dépasser `OPACITE_OBSCURITE_MAX` (le plafond de la grotte, référence unique) » — or `PHASES_CYCLE.nuit.opacite` valait déjà exactement 0.72, la même valeur que l'obscurité de la grotte (`data/scenes.json`, les deux scènes grotte). Impossible d'appliquer les deux consignes ensemble, et impossible de relever le plafond de la grotte elle-même (la fiche interdit de toucher aux données JSON). Point de design non tranché → question bloquante posée à Xav plutôt que résolu en silence (règle de méthode du projet). **Réponse de Xav : la nuit extérieure peut dépasser le plafond de la grotte** — ce 0.72 n'était qu'une valeur de référence de départ, pas une limite dure partagée entre intérieur et extérieur.

### Implémentation (`src/daynight.js`)

- **Jour = 0 exactement** (était 0.05) : de jour, `dessinerObscurite` ne produit plus aucun voile.
- **Nuit = 0.85** (était 0.72, +0.13 — au milieu de la fourchette +0,10/+0,15 demandée et de la fourchette ~0.82-0.87 validée par Xav), au-delà du plafond de la grotte par décision explicite ci-dessus.
- **Crépuscule et aube calés exactement sur leur voisin de plateau** (crépuscule = opacité du jour, aube = opacité de la nuit) plutôt que sur l'indication initiale du ticket (« un tiers/deux tiers du niveau nuit ») : cette indication supposait un jour non nul et devient inapplicable une fois jour=0 fixé — la seule façon de garder jour et nuit réellement plats (§6 du ticket, « une nuit franche, pas un pic isolé ») tout en gardant une transition continue (aucun saut, contrainte de continuité déjà actée en Phase 2) est que la phase de transition démarre exactement à la valeur du plateau qu'elle quitte. Conséquence appréciable : ce calage produit les plateaux **gratuitement**, par le mécanisme d'interpolation existant (deux phases voisines de même opacité n'ont rien à interpoler) — aucune restructuration de l'algorithme d'interpolation, seulement des données et son unité (ms au lieu de fraction, point suivant).
- **Durées par phase** (remplace `DUREE_CYCLE_MS` unique découpé en fractions égales) : jour 600000 ms (10 min), crépuscule 90000 ms, nuit 240000 ms (4 min francs), aube 90000 ms — `DUREE_CYCLE_MS` est maintenant la somme calculée des `duree_ms`, jamais une constante indépendante qui pourrait diverger. `PHASES_CYCLE[].debut` (fraction [0,1)) remplacé par `duree_ms` (ms) ; `opaciteAHeure`/`phaseAHeure` retravaillées pour indexer par ms cumulés au lieu de fraction — même forme d'algorithme (interpolation vers la phase suivante), signatures publiques inchangées (`avancerHeure(heureMs, deltaMs)`, `opaciteAHeure(heureMs)`, `phaseAHeure(heureMs)`), donc `main.js` n'a pas eu à bouger. `save.monde.heure` reste une position en ms dans le cycle (c'était déjà le cas, pas une fraction 0-1) : aucune migration de sauvegarde nécessaire, la sémantique du champ ne change pas, seule la longueur du cycle qu'il indexe change.

### Test (`tests/test_phase2_daynight_2026-09-16.js`)

Les blocs qui référençaient `phase.debut` (fraction) adaptés pour calculer les débuts cumulés en ms depuis `duree_ms`, indépendamment du détail interne de `daynight.js`. Bloc d'interpolation (test 3) déplacé sur la transition crépuscule→nuit (la seule rampe réelle, puisque jour/nuit sont maintenant des plateaux et n'ont plus de saut à interpoler avec leur voisin immédiat). Trois blocs ajoutés, tels que demandés par le ticket : durées exactes par phase + somme (test 5), plateaux jour/nuit échantillonnés à plusieurs points internes, pas seulement aux bornes (test 6), et transition qui ne dépasse jamais le niveau nuit ni ne descend sous le niveau jour, échantillonnage dense sur tout le cycle (test 7).

### Livré et validé

```
node --check src/daynight.js tests/test_phase2_daynight_2026-09-16.js
node tools/run_tests.js
```
→ **43 fichiers, tous verts** (aucun fichier ajouté ni retiré, seuls `src/daynight.js` et le test du même nom modifiés — contrainte stricte de la fiche respectée, confirmé par `git status`).

Validation manuelle (navigateur réel, manette) **non faite par l'agent cette session** — la fiche la réserve explicitement à Xav (forcer l'heure aux 4 phases, comparer au rendu actuel).

Fichiers modifiés : `src/daynight.js`, `tests/test_phase2_daynight_2026-09-16.js`, `CLAUDE.md` (ce journal). Fichiers archive ajoutés : `docs/archives/JOURNAL_2026-09-16_diagnostic-accrochage-arbre.md`, `docs/archives/INDEX.md` mis à jour.

### Point `[OUVERT]`

Aucun nouveau. Hérité, inchangé : durées de l'intro cinématique (`03_grotte-polish.md` §9).

### Critère de passage — reste à faire par Xav

Forcer l'heure aux 4 phases dans un vrai navigateur, à la manette (méthode : `docs/CHECKLIST_visuelle.md`, état nuit). Attendu : de jour, aucune différence perceptible avec le rendu actuel hors cycle ; de nuit, scène nettement plus sombre qu'avant, halo du follet et fenêtre de la maison toujours lisibles ; jour → crépuscule → nuit → aube → jour progressif, sans à-coup perceptible malgré le saut de plafond (0.72 → 0.85) par rapport à la grotte. Verdict de Xav sur les nouvelles valeurs (nuit à 0.85 : assez sombre ? trop ? durées de 17 min au ressenti ?) à recueillir avant de considérer ce réglage définitif.

### Hors scope pour cette session

Indicateur jour/nuit au HUD, palette des tuiles de jour, lumières statiques supplémentaires, obscurité de la grotte (`data/scenes.json` non touché) — tous explicitement exclus par la fiche.

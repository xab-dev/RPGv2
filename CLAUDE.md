# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée) et 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) — **Phase 2 close le 2026-09-17**, détail complet : `docs/archives/INDEX.md`. Phase 3 (`specs/04_maison-interieur.md`) : paliers A-E codés le 2026-09-17 ; première validation en jeu le même jour a trouvé 3 bugs bloquants (stations invisibles, PV qui semblaient baisser en mangeant, jauges figées) — cause racine trouvée et corrigée pour chacun (`SD_phase3-stations-pv-jauges_2026-09-17.md`) — **le rendu réel reste encore à revoir en navigateur par Xav**, voir « Critère de passage courant ».

Historique complet des sessions : **`docs/archives/INDEX.md`** — un fichier par session archivée, contenu verbatim (source de vérité en cas de doute sur le détail d'une décision passée). `CLAUDE.md` ne garde que le journal de la session la plus récente (en fin de ce fichier) — voir la règle de méthode correspondante ci-dessous.

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contexte projet, décisions déjà tranchées (à ne jamais rouvrir), contraintes de méthode, détail de la phase en cours.
- `specs/01_socle-technique.md`, `specs/02_grotte.md`, `specs/03_grotte-polish.md`, `specs/03_maison-exterieur.md` — specs détaillées des phases livrées.
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
- **Un sous-système explicitement "meilleur effort" (le contrat dit déjà : fichier absent → le jeu tourne sans son) rattrape ses propres erreurs à la frontière de son API publique, jamais au niveau de la boucle de jeu.** Née de `SD_musique-freeze-reprise_2026-09-17.md` (journal courant) : une exception dans `audio.js` (contexte/gain `null` à la reprise depuis le menu) est remontée non rattrapée jusqu'à `creerBoucle#frame` (`render.js`), qui ne se replanifie plus après une exception — jeu figé, manette/clavier morts (polling interne à `maj()`), souris vivante (DOM indépendant du `requestAnimationFrame`). Le remède reste local au sous-système fautif (`try/catch` dans `audio.js`, jamais un `try/catch` global autour de `update()`/`dessiner()`, qui masquerait aussi de vraies erreurs de gameplay) — voir `[OUVERT]` ci-dessous pour la question de généraliser ce patron à d'autres sous-systèmes.
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
│   ├── input/              input.js (fusion clavier+manette+tactile en verbes, loquet tactile,
│   │                       loquet périphérique actif), gamepad.js, keyboard.js (reset sur `blur`),
│   │                       touch.js (joystick+boutons)
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
│   ├── save.js             double tampon, versions + migrations (v4), reinitialiserSauvegarde()
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
│   │                       données) — `station` référence un TYPE de `stations.json` (rôle/capacité)
│   ├── resources.js        tuiles-ressources bloquées, `peutRecolter` branché sur la poche réelle
│   │                       depuis Phase 3 (outil requis)
│   ├── inventory.js        poche du héros (items comptés) : `ajouterItem`/`retirerItem`
│   ├── cooldowns.js        Phase 3 : cooldowns en temps actif, réutilise l'horloge de daynight.js
│   │                       (`save.monde.heure`, désormais avancée dans toutes les scènes)
│   ├── recipes.js          Phase 3, Palier A : `peutFabriquer`/`fabriquer`, catalogue `recipes.json`
│   ├── survival.js         Phase 3, Palier C : jauges faim/soif, modulateur, malus de respawn
│   ├── xp.js               Phase 3, Palier D : XP → niveaux (`levels.json`) → points de stats
│   ├── ground_items.js     objets au sol par scène (spawn, ramassage, respawn différé Phase 3)
│   ├── structures.js       toit (opacité dégressive selon la distance du héros)
│   ├── daynight.js         cycle jour/nuit en 4 phases (constantes) ; `save.monde.heure` sert aussi
│   │                       d'horloge "temps actif" partagée (cooldowns/survie), gelée sous UI
│   ├── audio.js            musique en boucle, armée au premier verbe abstrait (DOM)
│   ├── dialogue.js         file de lignes, machine à écrire + armement anti-spam, résolution locuteur
│   ├── hints.js            indices de commande (specs/04_indices-commandes.md) : un seul affiché
│   │                       à la fois, montré une fois par partie (flag persisté), fermé dès
│   │                       l'émission effective du verbe — pur, ignore i18n/DOM
│   ├── i18n.js
│   └── ui/                 menu.js (DOM ; Langue/Musique/Poche/Stats/Export/Import/Reset/Fermer,
│                           + écrans contextuels Craft/Coffre ouverts par INTERACT, patron générique
│                           `creerEcranListeGenerique` factorisé Phase 3), hud.js (+ jauges survie/
│                           niveau-XP Phase 3) + hud_hints.js + dialogue_box.js + hud_layout.js
│                           (canvas, résolution logique)
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
| Échelle des 4 stations fixée à **2,1** (milieu de la fourchette ×2 à ×2,2 demandée) ; empreinte solide = boîte englobante des primitives de rendu, calculée une fois (jamais dupliquée), sauf override explicite `empreinte` en données ; seuil d'interaction unifié (mesuré au bord de l'empreinte pour tous les interactifs, y compris les leviers dont l'empreinte est nulle) | 2026-09-17 | journal courant |
| Station `station_atelier` déplacée de `(89,58)` à `(89,61)` en données — son empreinte agrandie chevauchait légèrement le couloir intérieur (rangée y=57 entre les deux portes) | 2026-09-17 | journal courant |
| Horloge "temps de jeu actif" (cooldowns/survie) = `save.monde.heure` (celle de `daynight.js`), avancée désormais dans **toutes** les scènes (pas seulement `cycleJourNuit`) — jamais une 2ᵉ horloge ; un cooldown qui chevauche le bouclage du cycle (~17 min) expire un peu tôt plutôt que de bloquer (§4 edge case de `04_maison-interieur.md`) | 2026-09-17 | journal courant |
| Vitesse de déplacement du héros devient une stat dérivée (`derivee_vitesse_deplacement_px_s`, stat_agilite) au lieu d'une constante — nécessaire pour que le modulateur de survie la ralentisse sans code dédié (même mécanisme que dégâts/cadence) | 2026-09-17 | journal courant |
| `item_branche`/`item_caillou` (ramassage libre, Phase 2) restent distincts de `item_bois`/`item_pierre` (récolte réelle à l'outil, Phase 3) — les premiers servent à crafter les tout premiers outils, les seconds sont le produit de `res_bois`/`res_pierre` une fois l'outil en poche | 2026-09-17 | journal courant |
| Menu Craft/Coffre/Stats : écrans DOM plein écran génériques (`creerEcranListeGenerique`), Craft/Coffre ouverts directement par INTERACT (hors du menu Pause), Stats accessible depuis le menu Pause ; une entrée grisée retente quand même l'action réelle au confirmer plutôt qu'un no-op factice — le résultat fait foi, jamais une divergence affichage/état | 2026-09-17 | journal courant |

## Points `[OUVERT]`

- **Durées de l'intro cinématique** (`specs/03_grotte-polish.md` §9, palier 4) : budget ≤8s appliqué (mesuré ~7,2s sur les données réelles), valeurs de référence déjà données par la fiche — reste à ajuster sur ressenti manette réel. Pas un point de design non tranché en soi, juste un seuil numérique non encore validé en jeu.
- **Généraliser le patron « sous-système meilleur effort rattrape ses propres erreurs » au-delà d'`audio.js`** (ex. persistance IndexedDB, résolution de loot) ? `SD_musique-freeze-reprise_2026-09-17.md` demandait explicitement de ne pas trancher ça en silence ni de l'implémenter sans validation : une règle architecturale (pas seulement le correctif ponctuel déjà livré) reste à décider par Xav.

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
- **`station_puits` : silhouette dégradée à l'échelle ×2,1** (retour Xav en jeu, 2026-09-17, journal courant) — proportions des stations par ailleurs validées et meilleures qu'avant ; cause à diagnostiquer (probablement `visuel_puits` dans `data/visuels.json`) avant tout correctif, explicitement reporté à une prochaine session (consigne de Xav : ne rien coder dans l'immédiat).
- **Coffre : transfert « par pile » (maintien)** non implémenté (Palier E, §3.5 de `04_maison-interieur.md`) — seul le transfert par unité (confirmer = 1) est livré ; la couche d'input n'expose pas encore de geste de maintien générique pour les menus contextuels. 2026-09-17, journal courant.
- **Poche : action "Consommer" directe** (§3.3, "à défaut, l'action Consommer depuis le menu Poche") non implémentée — seul le chemin "Équiper au slot consommable" + verbe CONSUME en jeu est livré, qui couvre le hint et le critère de la boucle. 2026-09-17, journal courant.
- **`dlg_recette_indisponible`** déclaré au catalogue (§2.1) mais jamais déclenché en jeu — une entrée grisée du menu Craft retente silencieusement `fabriquer()` (résultat inchangé) plutôt que d'ouvrir un dialogue par-dessus un menu déjà ouvert (aurait cassé le routage input menu/dialogue). 2026-09-17, journal courant.
- **Validation manuelle du Palier A-E de la Phase 3 encore due par Xav** — 3 causes racines trouvées et corrigées le 2026-09-17 (diagnostic `SD_phase3-stations-pv-jauges_2026-09-17.md`, détail dans le journal ci-dessous) : stations/puits désormais dessinés, PV qui ne baissent plus faussement en mangeant, jauges qui devraient bouger à l'écran — mais **rien de tout ça n'a encore été vu en navigateur réel** (`ui/hud.js`/`main.js#dessiner()` re-touchés, règle de méthode). États 21/25-28 de `docs/CHECKLIST_visuelle.md` restent à capturer.
- **Migration `3 → 4` jamais exercée sur une vraie sauvegarde Phase 2** — la première validation en jeu du 2026-09-17 est partie d'un reset (partie neuve), pas d'une migration ; testée uniquement en headless (`test_save_migration_3_4`). À exercer par Xav séparément (charger une sauvegarde Phase 2 réelle après ce correctif). Hors scope explicite de `SD_phase3-stations-pv-jauges_2026-09-17.md`.

## Critère de passage courant

**Phase 3 — Maison, intérieur & systèmes de camp** (spec `specs/04_maison-interieur.md` v1.1.0). Code livré et testé headless pour les 5 paliers (A recettes/craft, B récolte réelle, C survie, D XP/niveaux, E coffre) le 2026-09-17, 3 bugs bloquants trouvés à la première validation en jeu et corrigés le même jour (`SD_phase3-stations-pv-jauges_2026-09-17.md`, détail ci-dessous). Critère ROADMAP (boucle 5 minutes : sortir → récolter → revenir → cuisiner/crafter → repartir, niveau ~5 qui ouvre la zone suivante) **prouvé par bot headless** (`tests/test_phase3_boucle_2026-09-17.js`) mais **toujours pas validé par Xav en jeu avec un rendu correct** — la session de validation du 13h45 avait un HUD/rendu cassé, à rejouer. Placement libre des stations hors scope (`specs/05_construction-stations.md`, session future).

## Journal de session — Diagnostic stations/PV/jauges (2026-09-17)

Ordonnée par `SD_phase3-stations-pv-jauges_2026-09-17.md`, suite à la première validation en jeu du Palier A-E par Xav (13h45, manette, partie neuve après reset). Trois symptômes, traités dans l'ordre imposé par la fiche (survie d'abord — bloquant —, PV ensuite, rendu en dernier pour ne rejouer la checklist visuelle qu'une fois).

### Sujet 3 — Jauges faim/soif figées et grises

**Cause** : `ui/hud.js#dessinerHud` lisait `survie.faim`/`survie.soif` pour dessiner les barres, mais la clé réelle écrite par `survival.js`/`save.js` (et déclarée par `data/survival.json`) est `jauge_faim`/`jauge_soif` — jamais `faim`/`soif`. Le ratio passé à `dessinerJauge` valait donc toujours `undefined`, la barre de remplissage ne se dessinait jamais (seul le fond gris, statique, restait visible) — quelle que soit la vraie valeur de la jauge. La décroissance elle-même n'était **pas** cassée : `tests/test_phase3_survival_2026-09-17.js` (déjà vert avant cette session) prouvait déjà le tick sur le vrai orchestrateur. H3a/H3b/H3d (tick pas appelé, gel permanent, partie neuve sans bloc survie) sont donc écartées — seul H3c était en cause.
**Correction** : `ui/hud.js` lit désormais `survie.jauge_faim`/`survie.jauge_soif`. En même temps, `save.js` dupliquait `{ jauge_faim: 1, jauge_soif: 1 }` dans `saveNeuve()` ET dans `migrer_3_vers_4()` (deux littéraux qui n'avaient pas encore divergé, mais exactement la classe de bug que la fiche demandait d'éliminer) — extraits dans une seule fonction `etatInitialSurvie()`.
**Testé** : `node tests/test_save_migration_3_4_2026-09-17.js` (nouveau cas : partie neuve et sauvegarde migrée produisent le même `survie`, clés vérifiées) ; `node tools/run_tests.js` entier.
**Reste ouvert** : le rendu réel (barre qui bouge à l'écran) n'a pas pu être revérifié en navigateur — état 25 de `docs/CHECKLIST_visuelle.md`, encore dû.

### Sujet 2 — PV qui semblent baisser en mangeant

**Cause** : confirmée H2a. `main.js#calculerStatsHeros()` recalculait `hero.pvMax` à chaque frame (`hero.pvMax = statsDerivees.derivee_pv_max`) sans jamais toucher `hero.pv` en conséquence. Le buff `buff_repas` (+2 Vitalité, 3 min) fait monter `pv_max` (formule `derivee_pv_max`, +16 à Vitalité de base) : les PV absolus n'ont pas baissé, mais la barre RELATIVE (`pv/pv_max`) affichée par le HUD, elle, se réduit d'un coup — exactement le constat de Xav ("la barre de PV descend"). Un second problème latent, jamais rencontré en jeu mais réel dans le code : à l'expiration du buff, rien ne clampait `pv` si le joueur avait au-dessus du nouveau plafond plus bas.
**Correction** : nouvelle fonction pure `entities.js#reconcilierPvMax(hero, pvMaxNouveau)` — une hausse de `pv_max` fait monter `pv` du même delta absolu (le buff donne réellement les PV qu'il promet, jamais un headroom invisible) ; une baisse clampe `pv` au nouveau plafond sans perte supplémentaire. Câblée dans `main.js#calculerStatsHeros()` à la place de l'affectation directe — un seul chemin, jamais dans le HUD.
**Testé** : `node tests/test_sd_phase3-stations-pv-jauges_2026-09-17.js` (5 cas : premier calcul, hausse, baisse sous le nouveau plafond, baisse au-dessus — clamp, delta nul — no-op) ; `node tools/run_tests.js` entier.
**Reste ouvert** : aucun — corrigé, testé headless, le ressenti manette reste à confirmer par Xav (mais le mécanisme numérique est désormais correct par construction, testé).

### Sujet 1 — Stations et puits invisibles

**Cause** : `main.js#dessiner()` construit `puzzlesAffiches` (la liste envoyée au rendu) en filtrant `scene.interactifs` sur `p.type === 'levier' || p.type === 'station_placeholder'`. Palier A de la Phase 3 a renommé les 4 instances de stations (table/coffre/atelier/puits) de `type: "station_placeholder"` vers `type: "station"` — mais ce filtre de RENDU, codé en dur avec l'ancienne énumération de types, n'a jamais été mis à jour en même temps. Résultat : les 4 stations restent solides (la collision, dans `scene.js#empreintesSolides`, ne filtre jamais par type) et actionnables (`essayerInteraction()` non plus), mais disparaissent silencieusement de la liste dessinée — exactement le constat de Xav ("collision et INTERACT fonctionnent, rien n'est dessiné").
**Pourquoi le garde-fou « solide sans rendu » n'a pas tiré** — c'est la question la plus importante de cette session : ce garde-fou (`schemas.js#erreursGeometrieInteractif` + `erreursRenderVisuel`, appelé par `validerPuzzle` pour le type `"station"`) valide que la **donnée** déclare un `render.visuel` qui se résout dans `visuels.json`. C'était le cas : `puzzles.json` portait toujours `render: { visuel: "visuel_table" }` etc., inchangé depuis la Phase 2, et `visuel_table` existe bel et bien dans `visuels.json`. La donnée était donc valide de bout en bout — le bug n'était **pas** une donnée invalide mais un **filtre de code** qui ignorait un `type` pourtant valide. Le garde-fou protège contre « solide + aucun visuel déclaré en données », pas contre « le code de rendu a sa propre liste de types qu'il a oublié de mettre à jour » : deux classes de bug distinctes, la seconde hors du périmètre que ce garde-fou a jamais eu.
**Ce qui empêche que ça se reproduise** : le filtre de `puzzlesAffiches` n'énumère plus de `type` du tout — il ne garde que `p.render && p.render.visuel`, structurel plutôt que nominatif. Un 5ᵉ type d'interactif positionné (qui déclarera nécessairement `render.visuel`, sinon le vrai garde-fou le refuse au boot) se dessine sans toucher cette fonction — conforme à la règle d'architecture directrice (« une entrée JSON de plus, zéro code de système »).
**Testé** : `node tests/test_sd_phase3-stations-pv-jauges_2026-09-17.js` (garde-fou : un `type: "station"` sans `render.visuel` reproduisant exactement le cas de la Phase 3 est refusé au boot, message nommant l'interactif fautif ; les 4 vraies stations + le puits résolvent un visuel non nul ; les 4 passent le nouveau filtre structurel) ; `node tools/run_tests.js` entier (54 fichiers verts).
**Reste ouvert** : preuve visuelle en navigateur réel encore due (état 21 de `docs/CHECKLIST_visuelle.md`, contrainte de méthode : canvas jamais exercé headless).

### Testé (ensemble de la session)

`node tools/run_tests.js` : **54 fichiers, tous verts** (53 hérités + `test_sd_phase3-stations-pv-jauges`, plus un cas ajouté à `test_save_migration_3_4`).

### Hors scope (explicite, cf. fiche)

`05_construction-stations.md`. Équilibrage des seuils (60 s, décroissances, courbe de niveaux — Xav n'a pas encore pu juger, les jauges étant mortes jusqu'ici). Micro-ticket `station_puits` (silhouette). Migration `3 → 4` sur une vraie sauvegarde Phase 2 (à exercer par Xav séparément, cf. Dette).

Session en cours, ordonnée par `SD_phase3-stations-pv-jauges_2026-09-17.md` (première validation en jeu du Palier A-E par Xav, reset de sauvegarde, manette). Trois symptômes à diagnostiquer cause racine d'abord : stations/puits invisibles (le garde-fou « solide sans rendu » n'a pas tiré), PV qui semblent baisser en mangeant, jauges faim/soif figées et grises. Ordre imposé par la fiche : survie d'abord (bloquant), PV ensuite, rendu en dernier (checklist visuelle).


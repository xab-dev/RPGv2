# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

Phases validées : 0 (Socle technique), 1 (La Grotte) et 1b (polish, 4/4 paliers, DA validée) — validées en jeu à la manette réelle le 2026-09-16. Phase 2 (Région Maison, `specs/03_maison-exterieur.md`) : « première marche » (5 paliers + audio) validée à la manette et au clavier réels par Xav le 2026-09-16 ; les deux défauts qu'elle a fait remonter (accrochage des coins en collision, arbre interactif hors du chemin naturel) ont été diagnostiqués et corrigés le jour même (`SD_hitbox-angle-arbre_2026-09-16.md`) puis validés par Xav le 2026-09-17. **Phase 2 close** — prochaine phase à ouvrir. Tactile en dette assumée jusqu'à la Phase 4 (compétences), différé jusqu'à un lien de partage pour test (le neveu de Xav est le testeur mobile de référence).

Prochaines fiches à livrer, dans cet ordre (aucune rédigée à ce jour) : `docs/MT_jour-nuit-contraste_2026-09-16.md` (v1.1) → `specs/04_indices-commandes.md` → `specs/04_stations-proportions-collision.md` → `docs/MT_musique-ambiance-synth_2026-09-16.md`.

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
| Ambiance musicale continue à base de notes synthé qui bouclent, en attendant `piano_solo.mp3` → `docs/MT_musique-ambiance-synth_2026-09-16.md` (à rédiger) | 2026-09-16 | journal courant |

## Points `[OUVERT]`

- **Durées de l'intro cinématique** (`specs/03_grotte-polish.md` §9, palier 4) : budget ≤8s appliqué (mesuré ~7,2s sur les données réelles), valeurs de référence déjà données par la fiche — reste à ajuster sur ressenti manette réel. Pas un point de design non tranché en soi, juste un seuil numérique non encore validé en jeu.

Tous les autres `[OUVERT]` historiques (résolution logique, clignements/orbite pré-choix, couleur du héros, stations placeholder non solides) ont été tranchés — voir la table de décisions ci-dessus et `docs/archives/INDEX.md`.

## Dette et « à reprendre »

- **Toast de ramassage** à chaque objet ramassé (seul le premier a un retour, dialogue `dlg_premier_ramassage`) — 2026-09-16, `docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`.
- **Indicateur jour/nuit au HUD** (optionnel selon la spec, non posé) — 2026-09-16, même archive.
- **Mesure réelle du temps de frame / fps** (plancher mobile jamais mesuré, seulement borné fonctionnellement par `selectionnerTuilesVisibles`) — 2026-09-16, même archive.
- **Tactile réel** (manette/clavier seulement testés par toutes les sessions jusqu'ici) — dette assumée depuis la Phase 0, différée jusqu'à un lien de partage (Phase 4+).
- **Mouvement légèrement téléporté à chaque angle depuis la correction de coin** (2026-09-17, retour Xav) : feeling meilleur, aucune interruption, mais pas très smooth — à lisser dans une phase de polish ultérieure (hypothèse : répartir le repoussement sur plusieurs frames ou l'interpoler plutôt que l'appliquer d'un coup — à diagnostiquer, pas à patcher en silence).
- **Fiches à rédiger** (nommées par les décisions ci-dessus) : `docs/MT_jour-nuit-contraste_2026-09-16.md` v1.1, `specs/04_indices-commandes.md`, `specs/04_stations-proportions-collision.md`, `docs/MT_musique-ambiance-synth_2026-09-16.md`.

## Critère de passage courant

Phase 2 (Région Maison, première marche) — verdict détaillé : `docs/NS_critere-passage-phase2_2026-09-16.md`. État au 2026-09-17 : validée à la manette et au clavier réels par Xav sur tout le parcours (grotte → rocher → branche → Poche → toit → stations → jardin/fruit/puits → campagne → persistance) ; les deux défauts remontés (arbre hors chemin, accrochage des coins) ont été corrigés le 2026-09-16 et validés le 2026-09-17 (`SD_hitbox-angle-arbre_2026-09-16.md`). **Phase 2 close.** Reste en dette, non bloquant : tactile réel (Phase 4+), musique (fichier non fourni), mesure de fps réelle.

## Journal de session — Diagnostic accrochage des coins + arbre introuvable (2026-09-16)

Brief complet : `SD_hitbox-angle-arbre_2026-09-16.md` (racine du dépôt). Suite directe du retour manette de Xav sur le critère de passage Phase 2 (`docs/NS_critere-passage-phase2_2026-09-16.md`) : deux symptômes à diagnostiquer (A bloquant sur le déplacement, B sur le placement d'une donnée), un état à consigner (C, cf. bloc « Critère de passage » du journal Phase 2 ci-dessus, déjà mis à jour). Ordre imposé par la fiche : B (court) → A (cœur du déplacement) → C (documentaire).

### A. Accrochage des coins en collision (hypothèse A1 confirmée)

**Hypothèse A1 confirmée par un test rouge** sur le vrai `scene.js#resoudreDeplacement`, A2/A3 écartées : le glissement axe par axe (X résolu en premier avec l'ancien y, Y résolu ensuite avec le nouveau x) fonctionne déjà correctement pour des désalignements francs (cf. `test_phase0_scene_camera`, test 2, inchangé) — le défaut ne touche que les **petits chevauchements de coin** (quelques px) près d'une ouverture d'1 tuile. Mesuré par un script de session (scratchpad, non conservé) sur la géométrie réelle (tile_size 32, hitbox héros 20×20 = rayon 10) : à un décalage de 3-4 px de l'axe d'une porte d'1 tuile, l'axe visé restait figé plusieurs frames consécutives (jusqu'à 7 dans le pire cas mesuré) avant que le glissement sur l'autre axe ne rattrape par hasard — perçu comme un accrochage net, exactement le symptôme de Xav. Un cas encore plus net a été trouvé en cours de diagnostic (absent des hypothèses de la fiche, découvert en creusant la géométrie réelle de la porte de la maison) : en mouvement **purement horizontal** (`dy=0`, ex. clavier qui tient juste une direction), le même décalage de 3px bloque l'axe **indéfiniment** — rien ne le corrige jamais tout seul puisque l'autre axe ne bouge pas non plus. C'est la forme la plus littérale de « arrêt net ».

**Correctif** dans `src/scene.js#resoudreDeplacement` : avant d'abandonner un axe bloqué, une correction de coin est tentée — si un seul des deux coins du bord testé est solide (l'autre est libre) et que le chevauchement mesuré est ≤ `TOLERANCE_COIN_PX` (nouveau seuil local, un seul endroit, commenté, **provisoire**, valeur = le tiers du rayon du héros = `largeur/6`), le héros est repoussé exactement de ce chevauchement sur l'axe perpendiculaire avant de rejouer le mouvement bloqué — sinon (mur plein : les deux coins solides) rien ne change, le blocage reste entier. Deux branches symétriques (haut/bas pour la résolution X, gauche/droite pour la résolution Y) couvrent les deux orientations de mur (horizontal et vertical — cette dernière étant le cas réel de la porte de la maison, `structures[].portes`). Aucune modification du rayon du héros ni de la largeur des portes/passages (hors scope explicite de la fiche) : la correction ne fait que lisser un quasi-alignement, jamais un vrai désalignement.

**Non-régression garantie par construction** : la position corrigée est toujours re-vérifiée par `coinsSolides` avant d'être acceptée — un mur plein ne devient jamais traversable, testé explicitement (approche diagonale d'un coin intérieur de salle, `tests/test_phase2_sd_hitbox_angle_2026-09-16.js` test 3 : invariant « jamais embarqué dans un mur » vérifié à chaque frame).

**Vérifié en navigateur réel** (orchestrateur manuel construit dans la page, mêmes modules servis, `requestAnimationFrame` neutralisé — même patron que les sessions graphiques précédentes) sur la **vraie porte ouest de la maison** (`scene_maison_exterieur`, colonne 78, rangée 57) : héros positionné 3px au-dessus de l'axe de la porte, poussée horizontale pure — avant le correctif ce cas bloque indéfiniment (vérifié par construction du code, non rejoué sans le correctif faute de pouvoir basculer à chaud) ; après correctif, le héros est réaligné exactement sur la rangée de la porte dès le premier pas et traverse sans à-coup. Capture d'écran après franchissement : scène rendue normalement (HUD, aura, décor), aucune erreur console.

### B. Premier arbre interactif hors du chemin naturel (hypothèse B2 confirmée)

**Hypothèse B2 confirmée** (B1 et B3 écartées) : le mécanisme d'interaction sur tuile-ressource fonctionne déjà correctement (le rocher, testé au même endroit du code, marchait — confirmé par Xav) et l'unique `tile_arbre` (porteur de `res_bois`) existait bien dans le layout (`data/scenes.json > scene_maison_exterieur`) — mais à la position (20,54), **2 rangées au-dessus** de la bande de chemin manuelle (rangées 56-58). La marche naturelle spawn(6,58) → porte ouest(78,57) ne passe jamais assez près (l'écart vertical dépasse `DISTANCE_INTERACT_PX=28`) : Xav a fait tout le trajet sans jamais le croiser, exactement comme rapporté, sans que rien ne soit cassé dans le code.

**Correctif, donnée seulement** : le caractère `A` déplacé chirurgicalement dans `data/scenes.json` (édition ciblée par position de caractère, pas une régénération du layout — 2 caractères changés au total) de la rangée 54 vers la rangée 57, **directement sur la bande de chemin**, même colonne (20) — un arbre planté en bord de sentier, cohérent avec « visuellement distinct des arbres de fond » déjà acquis (palier 2 de `03_grotte-polish`, silhouette dédiée). Solide comme avant : le joueur le contourne naturellement en passant à côté, ce qui suffit à le mettre à portée d'`INTERACT`.

**Test dédié réécrit** (`tests/test_phase2_chemin_critique_2026-09-16.js`) : l'ancien bloc ciblait la coordonnée `(20,54)` en dur avec un outillage d'approche dédié (contournement délibéré de la forêt pour atteindre l'arbre, peu importe sa position réelle) — remplacé par un scan générique de la scène (toute tuile avec un champ `ressource`) suivi d'une **marche directe vers la porte ouest, sans aucun outillage d'approche** : le test échouerait si une future réédition du layout replaçait l'arbre hors du chemin, protégeant ainsi le critère « sans instruction » de la spec (§3.2) dans la durée, comme demandé par la fiche.

### Livré et validé

```
node tools/run_tests.js
```
→ **43 fichiers, tous verts** (42 précédents + `test_phase2_sd_hitbox_angle`, nouveau ; `test_phase2_chemin_critique` réécrit pour le sujet B, toutes ses autres étapes inchangées et toujours vertes).

```
node --check src/scene.js tests/test_phase2_sd_hitbox_angle_2026-09-16.js tests/test_phase2_chemin_critique_2026-09-16.js
```
→ tous valides.

**Vérification en navigateur réel effectuée par l'agent cette session** (`node serveur_local.js` + extension Chrome connectée) : orchestrateur manuel sur les vraies données, franchissement de la vraie porte ouest confirmé (cf. sujet A), aucune erreur console, capture d'écran après franchissement conforme (aucune régression visuelle des calques déjà en place).

Fichiers modifiés : `src/scene.js` (`resoudreDeplacement` : correction de coin), `data/scenes.json` (position de l'arbre interactif), `tests/test_phase2_chemin_critique_2026-09-16.js` (bloc arbre réécrit), `CLAUDE.md` (ce journal + verdict du critère de passage Phase 2 consigné). Fichier ajouté : `tests/test_phase2_sd_hitbox_angle_2026-09-16.js`.

**Incident de dépôt découvert et corrigé en cours de session, sans rapport avec la fiche** : `CLAUDE.md` était absent du disque en tout début de session (suppression non commitée, `git status` le donnait en `D`, alors que l'index/HEAD contenait encore une version antérieure — arrêtée à la session « Reports documentaires », sans le journal Phase 2). Un fichier `docs/CLAUDE_archives_16_09_26.md` (867 lignes, non suivi par git) contenait la version complète et à jour, identique à celle montrée en tête de cette session — probablement une copie de sauvegarde laissée par une session antérieure interrompue avant qu'elle ne réécrive `CLAUDE.md` lui-même. Restauré depuis cette archive avant d'y apporter les modifications de cette session ; l'archive n'a pas été supprimée (conservée telle quelle, à la discrétion de Xav).

### Point `[OUVERT]`

Aucun nouveau. Hérités, inchangés : durées de l'intro (`03_grotte-polish.md` §9) — sans lien avec cette session.

### Critère de passage — reste à faire par Xav

Rejouer, à la manette réelle, les deux points corrigés cette session : (1) l'arbre est maintenant planté sur le chemin, entre la sortie de la grotte et la maison — confirmer qu'il est bien rencontré sans indication ; (2) la porte de la maison et les passages étroits de la forêt en approche oblique — confirmer que l'accrochage a disparu ou est nettement réduit (la correction reste bornée par `TOLERANCE_COIN_PX`, un désalignement franc continue de nécessiter un réalignement manuel, par choix). Les deux restent également à valider par le parcours complet du critère de passage Phase 2 (bloc mis à jour plus haut dans ce fichier).

### Hors scope pour cette session

Largeur des portes/passages, rayon du héros (aucune remontée A3, non touché), tuto des touches, contraste jour/nuit, toast de ramassage, mesure de fps, tactile — tous explicitement exclus par la fiche. Les tickets futurs nommés par le verdict de Xav (`specs/04_stations-proportions-collision.md`, `specs/04_indices-commandes.md`, `docs/MT_jour-nuit-contraste_2026-09-16.md`, `docs/MT_musique-ambiance-synth_2026-09-16.md`) n'ont pas été rédigés cette session — seuls leurs noms/décisions sont consignés ici, conformément au périmètre strict de `SD_hitbox-angle-arbre_2026-09-16.md`.

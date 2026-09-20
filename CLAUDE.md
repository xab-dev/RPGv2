# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

**Le jeu est en ligne : `https://xab-dev.github.io/RPGv2/`** (GitHub Pages, servi depuis `main`). Conséquence qui change la portée de tout ce qui suit : **un `push` sur `main` publie le jeu.** Les `push` restent à la main de Xav (règle de méthode inchangée) — ce qui change, c'est qu'un `push` n'est plus une sauvegarde, c'est une mise en ligne. C'est aussi par cette URL que se font désormais les vérifications sur téléphone, le Wi-Fi local n'étant plus nécessaire (`R-16` : servi en ligne, l'A04 rend exactement comme en Wi-Fi local).

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et 3 (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`, close le 2026-09-17). **Chantier `specs/05_construction-stations.md` (placement libre des stations) close le 2026-09-19** : validé par Xav en jeu à la manette puis au clavier seul, après le correctif de parité clic/verbe (détail complet des 4 diagnostics successifs : `docs/archives/INDEX.md`). **Polish post-Construction : étapes 1 à 6 livrées et validées en jeu à la manette par Xav le 2026-09-19** (« ça fonctionne, le jeu est fluide ») — instrument de mesure sous `?debug=fps`, héros à l'échelle 0,88, follets visibles pendant l'intro, silhouette du puits, traînée de poussière, HUD sur un bandeau d'une ligne. La branche `polish-2026-09-19` est **fusionnée dans `main`** (`e5b6d44`) : on travaille sur `main`.

**La file de micro-tickets de la nuit du 19 au 20 est fusionnée dans `main`, sauf un commit.** Dix commits livrés, un par ticket ; Xav a **annulé** le seul qui ne lui allait pas (`git revert 9997cec`, `5b83afa`) : la lumière du follet (`D-35`) — « n'allait pas très bien », détail à venir, **à reprendre après discussion, jamais par initiative**. Ce qui est donc en vigueur : héros à l'échelle 0,643 (`D-32`) et vitesse de base 75 (`D-33`), follet à l'échelle de jeu 0,75 (`D-34`), les **quatre paliers de `specs/07_chaos-nocturne.md`** (zones et tirage, la nuit et le seuil, le comportement « un domaine, pas un piquet », le signal visuel de la zone) et le follet aérien (`D-36`, proposition conservée). La lumière du follet reste celle d'avant la nuit : **rayon 110 px partout**. Détail verbatim : `docs/archives/JOURNAL_2026-09-19_nuit-file-micro-tickets.md`.

**La file de la nuit du 20/09 (n° 2) est fusionnée dans `main`, en entier.** Sept commits : `D-39` (double orbite du follet : corps et aura dérivés du **même** point logique), `D-40` (le nom des monstres retiré du **dessin** seul, la donnée reste), `D-17` (bouton MENU tactile **sous** le bandeau), `D-13` (buffs au bandeau, une icône par **stat** renforcée posée sur `stats.json`), `D-30` (plein écran au premier appui tactile, `src/plein_ecran.js`). **Personne n'avait regardé l'écran** cette nuit-là (Chrome non connecté) : `V-21` à `V-25` étaient toutes dues. Xav a depuis joué sur téléphone, **en ligne**, et en a rapporté deux défauts : le menu Pause enfermait le joueur (`D-42`) et le plein écran ne se déclenchait jamais (`D-30` rouvert). **Les deux sont corrigés, en ligne, et validés par Xav sur téléphone par l'URL publique le 20/09 (« all good », `V-25` et `V-26`)** — mini-file `docs/archives/JOURNAL_2026-09-20_menu-tactile.md`. `V-21` à `V-24` restent dues. Verbatim de la nuit : `docs/archives/JOURNAL_2026-09-20_nuit-file-micro-tickets-2.md`.

**Chantier en cours : `specs/08_menus-cartes.md` — les menus en grille de cartes (`D-43`).** Spec **par paliers, un palier par session**, branche `menus-cartes`, un commit par étape, chacun retirable seul. Palier A (l'écran de référence) : **livré le 20/09 sur la branche `menus-cartes`, non fusionnée** — Xav l'a regardé le soir même (« tout à l'air bon ») et a **demandé d'aller au bout de la spec dans la nuit** : paliers B (une seule pile) puis C (les écrans de liste), un commit par étape, puis une passe de polish. **Pour cette nuit, Xav autorise les `push` de sauvegarde sur la branche `menus-cartes` — jamais sur `main`, et la fusion reste la sienne.** `V-27` reste ouverte : le téléphone passe par l'URL publique, donc après fusion.

**Le volet rendu des fondations est clos sur PC, sous Chrome.** Treize relevés `?debug=fps` réels existent (§6 de `docs/DOC_suivi-dettes.md`). Le relevé qui tranche est `R-11` : **Chrome, plein écran, échelle forcée 8 — 59,9 fps, aucune frame sautée**, GPU à 14 %, aucune saccade vue par Xav en traversée. **Chrome est le navigateur de développement, de jeu et de référence** ; sous Firefox, le même PC exécute le dessin sur le fil principal et devient injouable à l'échelle 5 — ce n'était pas le jeu, c'était le navigateur (registre `docs/DOC_navigateurs.md`). Conséquences : `Q-19` close **sans plafond d'échelle** (la décision « rendu net à résolution physique » est confirmée, cette fois sur mesure), `D-01` déclassée en P2, `D-02` et `D-03` en P3.

**Côté mobile, le plancher est à nommer — mais l'A04 n'est plus la question.** Le Galaxy A04 rend ~37 fps à l'échelle naturelle et ~40 à l'échelle 1 (`R-12`, `R-13`) : diviser les pixels par 9 ne rend que 3,6 fps, donc **l'échelle n'y est pour rien** ; servi **en ligne** plutôt que par le Wi-Fi local, il rend exactement pareil (`R-16`, 37,3 fps), donc **le réseau n'y était pour rien** non plus. Restaient ≈ 18 ms par frame que l'instrument ne voyait pas : **`D-31` est close le 20/09 par décision de Xav — « ça vient du matériel »**, son téléphone n'est plus une cible (« juste bon à changer »). Conséquences : `A-07` (profil USB) tombe **sans objet**, `D-02` et `D-03` sont **dégelées** (P3, rien à y corriger aujourd'hui), et le **plancher mobile est revu à la hausse** — sa définition reste `[OUVERT]`, elle se fixera sur le téléphone du neveu (`Q-20`, `D-14`). Point de comparaison bas déjà connu, déclaratif : un portable Windows 7 **sans GPU** tient 56 à 58 fps sous Chrome, jouable. Les **deux relevés de base sous Chrome** sont **pris** (`A-03` close) : `R-14` de jour et `R-03` de nuit, **59,9 fps et zéro frame sautée** à l'échelle naturelle, `dessiner()` 0,33 ms, `maj()` 0,06 ms. `specs/07_chaos-nocturne.md` a donc son point de comparaison : après chaque palier, le même relevé de nuit, comparé à `R-03`.

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
- **Une session longue est permise si c'est une *file de micro-tickets*** (décision Xav, 2026-09-20) — *amende* la règle ci-dessus sans la lever : branche dédiée, **un commit par ticket**, ordre fixe, **chaque commit retirable seul**. Vérifié la nuit du 19 au 20 : Xav a annulé un ticket au matin (`git revert 9997cec`, la lumière du follet) sans toucher aux neuf autres. Ce qui reste interdit, c'est le commit fourre-tout, pas la durée. Corollaire d'hygiène de contexte : **l'état d'une file longue vit sur le disque** (fichier de bord `docs/JOURNAL_AAAA-MM-JJ.md`, une ligne par commit écrite au moment du commit), jamais dans la mémoire de la session — une conversation qui se résume perd ce qui n'a été dit que dedans.
- **Un ticket (ou une session) = un commit**, fait en fin de session, l'identifiant du ticket dans le titre (décision Xav, 2026-09-19). Motif : le commit fourre-tout `1be4688` a rendu illisible une nuit entière de travail, alors que la nuit du polish, faite ticket par ticket, se relit d'un coup d'œil. **Les `push` restent à la main de Xav : ne jamais pousser.**
- **Cause racine avant tout patch** — jamais de rustine sur un symptôme.
- **Zéro chaîne en dur** — tout texte visible passe par la localisation FR/EN (`t("clé")`) dès la Phase 0.
- **Zéro dépendance du gameplay à un périphérique** — aucun `KeyboardEvent`, `TouchEvent` ou `Gamepad` en dehors de la couche d'input ; le gameplay ne connaît que des verbes (`MOVE, ATTACK, SKILL_1..3, CONSUME, INTERACT, MENU`).
- **Tout commentaire de code et texte d'UI en français**, style « contexte suffisant pour reconstruire le raisonnement » — un commentaire dit *pourquoi*, jamais *quoi*.
- **Séparation stricte des modules** : registre (données) / input (périphériques) / scène (monde) / rendu (canvas) / save (persistance). Une phase future doit pouvoir remplacer le rendu sans toucher au reste.
- **Tout seuil numérique** (vitesse, `tile_size`, intervalle de sauvegarde, plafond de delta-time, tolérances de collision…) déclaré en un seul endroit, commenté avec son *pourquoi*, marqué **provisoire** s'il n'a pas été validé en jeu.
- **Discipline de scope** : si une tâche déborde du brief, s'arrêter au dernier palier stable et documenter ce qui reste hors scope dans `CLAUDE.md`. Aucun système généralisé avant qu'un second cas d'usage réel existe, sauf les catalogues data-driven listés dans les specs.
- **Toute interface ouvrable au tactile est fermable au tactile, sans défilement.** Un écran d'UI recouvre le canvas : dès qu'il est ouvert, les boutons tactiles du jeu (dont `skill_3`, le « retour » de la manette) sont hors d'atteinte. « Fermer » n'est donc pas une sortie parmi trois au doigt, **c'est la seule** — elle se place dans une zone qui ne défile pas, et le reste de l'écran défile à l'intérieur de lui-même. Née de `D-42` (20/09) : à 703 × 280 px CSS, le menu Pause débordait de 59 px, son titre était hors écran **par le haut** et « Fermer » hors écran par le bas, sans rien pour les ramener — Xav a dû quitter le jeu. Corollaire de test : Node n'a pas de moteur de mise en page, donc **aucun test ne peut prouver « ça tient dans l'écran »** ; ce qui se teste est structurel (« Fermer » hors de la liste défilante, la règle CSS qui borne et fait défiler), le reste est une validation en jeu.
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
│   ├── menu_cartes.js      specs/08 : la part PURE des menus en cartes — choix de la grille,
│   │                       `voisin()` (navigation 2D), cases stables + case contextuelle, LA pile
│   │                       du menu entier (`creerNavigationEcrans` : des niveaux portés par des
│   │                       vues, une seule visible, un seul chemin de fermeture), confirmation
│   │                       d'un danger, contrôles de démarrage (textes FR/EN, câblage carte ↔
│   │                       fonction dans les deux sens)
│   └── ui/                 menu.js (DOM ; le menu Pause est une GRILLE DE CARTES décrite par
│                           `data/menus.json` — ce module garde les écrans de LISTE Poche/Stats/
│                           Construction/Craft/Coffre, patron `creerEcranListeGenerique`, et
│                           ENREGISTRE les actions/états/écrans que les cartes citent),
│                           grille_cartes.js (le composant : ne connaît ni un id de catalogue ni
│                           une valeur de style), icone_canvas.js (une icône de `visuels.json`
│                           dans un <canvas> DOM, « meilleur effort »), couleurs_ui.js (contraste
│                           des `couleur_ui`, pur), hud.js (+ jauges survie/niveau-XP Phase 3)
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
└── tools/                  run_tests.js (lance tous les tests/*.js, = `npm test`) + des outils de DEV
                            jamais chargés par le jeu : banc_menu_cartes.html (le composant seul,
                            sur le vrai catalogue), cadre_viewport.html (viewport imposé ; `&pas=oui`
                            = boucle de jeu avancée à la main, pour un onglet masqué) et
                            capture_chrome.mjs + scenarios/ (Chrome SANS FENÊTRE piloté par CDP,
                            zéro dépendance : vrais pixels à 703 × 280 et 1920 × 1080, profil
                            jetable — la sauvegarde de Xav n'est jamais touchée)
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
| **Une condition en données peut porter sur une *valeur nommée*, pas seulement sur un flag** : `flags.js` accepte `{ valeur: 'niveau', min: 5 }`, les valeurs étant **fournies à la création** du registre (`valeurs: () => ({ niveau })`) — le module reste pur, il ne va chercher le niveau nulle part. Conséquence voulue : le palier Nv. 10 du Chaos, et demain une condition sur l'heure ou les PV, sont des **données**. Une valeur inconnue suit la discipline d'un flag non déclaré : exception en dev, **faux** en prod (une condition qu'on ne sait pas évaluer ne doit pas débloquer) | 2026-09-19 | `docs/archives/JOURNAL_2026-09-19_nuit-file-micro-tickets.md`, palier `07-A` |
| **Les monstres du Chaos entrent en collision**, par `resoudreDeplacement` — **la même fonction que le héros**, donc ils glissent le long des obstacles. Motif : la règle anti-blocage suppose qu'un monstre *puisse* être bloqué, et un rôdeur qui erre dans un Champ bordé de forêt doit se cogner. **Les monstres de la Grotte n'y touchent pas** : ligne droite de Phase 1, validée en jeu, on ne rouvre pas un comportement validé — seuls ceux qui portent un `spawnId` décident | 2026-09-19 | même archive, palier `07-C` |
| **Une instance de monstre porte un id d'instance, jamais l'id de son catalogue** (`creerMonstre`, défaut = l'id de catalogue pour les scènes à un monstre). Tant qu'une scène n'a qu'un monstre de chaque type, personne ne le voit ; avec six rôdeurs identiques, frapper celui qui est à portée les blessait **tous**, où qu'ils soient (`D-38`, corrigé dans le commit du palier B — sans quoi il livrait une fonctionnalité fausse) | 2026-09-19 | même archive, palier `07-B` |
| **Les jetons de style des menus vivent dans UN bloc de variables CSS** (`index.html`, `:root { --menu-… }`), tous *provisoires* ; le code ne connaît aucune couleur. Trois d'entre eux sont **relus au démarrage** pour vérifier que chaque `couleur_ui` de compagnon se lit sur le fond des cartes (≥ 3:1) et ne se confond pas avec le magenta du danger — ajouter un follet recolore tous les menus sans code, et un accent illisible tombe au boot | 2026-09-20 | `docs/archives/JOURNAL_2026-09-20_menus-cartes.md`, A1 |
| **Le menu Pause est un catalogue** (`data/menus.json`) : écrans, cartes de trois types (dossier / bascule / action), **cases stables** (une carte absente laisse sa case vide), case contextuelle = candidates ordonnées sur une même case. `ui/menu.js` n'y apporte que des fonctions **enregistrées par id**, et le démarrage contrôle le câblage **dans les deux sens** (toute carte a sa fonction, toute fonction a sa carte, toute valeur citée par une condition est fournie — une valeur inconnue ferait lever `flags.js` dans la boucle de jeu, donc la figerait) | 2026-09-20 | même journal, A2 et A4 |
| **Une bascule affiche l'état RÉEL, relu à la source à chaque affichage** (lecteur d'état injecté qui rend une CLÉ de texte) — jamais un booléen tenu par le menu ; un refus s'annonce dans l'en-tête et laisse la carte inchangée (généralise le patron de `D-30`). **La confirmation d'un `danger` est construite par le composant**, jamais décrite écran par écran : « Non » en case 0, donc focus par défaut — une règle de sécurité ne dépend pas de l'attention de qui ajoutera la prochaine action destructive | 2026-09-20 | même journal, A2 et A3 |
| **`voisin()` : ligne droite en sautant les cases vides, sinon la carte la plus proche dans cette direction**, jamais vers l'arrière, sans bouclage (*provisoire*). La seconde passe n'est pas du zèle : sans elle une carte devient inatteignable au stick dès que les seules cases 0 et 3 sont occupées. Garantie vérifiée exhaustivement (78 combinaisons de cases) | 2026-09-20 | même journal, A3 |
| **Une carte de menu est un `<div>`, jamais un `<button>`** : un bouton natif garde le focus du navigateur après un clic, et Espace l'active — or Espace est `ATTACK`. Une bascule cliquée puis validée au clavier s'activerait deux fois dans la même frame | 2026-09-20 | même journal, A3 |
| **Le menu entier est UNE pile** (`menu_cartes.js#creerNavigationEcrans`) : la grille de cartes et les cinq écrans de liste en sont les **vues** ; ouvrir = empiler, retour = dépiler, **« ouvert » = pile non vide ET sommet réellement visible** (on interroge l'affichage, jamais un booléen : un écran caché dans le dos de la pile ne gèle pas le jeu). Deux garanties **par construction** : une seule vue visible (la pile masque toutes les autres avant de montrer le sommet — plus aucun écran ne s'affiche ni ne se masque lui-même) et **un seul chemin de fermeture** (`fermerTout` : `[X]`, B à la racine, une carte action, le verbe `MENU`). Le placement d'une station **masque le sommet sans dépiler**. *Remplace* les sept sous-contrats de `menu.estOuvert()` et clôt la classe de bug des écrans orphelins et de la parité clic/verbe | 2026-09-20 | `docs/JOURNAL_2026-09-20_menus-cartes-paliers-B-C.md`, B1 et B2 |
| **`MENU`, menu ouvert, ferme tout** (`Q-36`, retenu par défaut par la spec — *à confirmer par Xav*) : la branche vit dans `main.js#maj`, seul endroit qui sait que `MENU` vient d'OUVRIR le menu dans la même frame ; la frame de fermeture reste une frame d'UI (aucun verbe n'atteint le gameplay) | 2026-09-20 | même journal, B3 |
| **Le signal d'une zone de Chaos est une teinte additive posée *après* le calque d'obscurité** : elle se voit à travers la nuit **sans percer le voile**, donc elle ne révèle pas le sol (principe des faisceaux de la Grotte : un faisceau éclaire l'air, un halo révèle le sol). Trois règles avec : l'intensité **suit l'obscurité de la scène** (donc nulle de jour, sans condition ajoutée) · **une table fermée ne s'annonce pas** (aucune teinte sous le seuil de niveau) · la pulsation suit `save.monde.heure`, donc elle est gelée sous UI par construction. **Aucune lueur sur les monstres** (`Q-27`, « je veux être surpris ») | 2026-09-19 | même archive, palier `07-D` |

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

**Le volet rendu des fondations est clos sur PC, sous Chrome ; sur mobile, il n'a plus d'appareil à défendre.** `D-31` (l'A04 à ~37 fps, cause inconnue) est **close le 20/09 par décision de Xav** — « ça vient du matériel » : l'appareil sort des cibles, `A-07` tombe sans objet, `D-02`/`D-03` sont dégelées. Le **plancher mobile est revu à la hausse** et reste `[OUVERT]` : il se nommera sur le téléphone du neveu (`Q-20` part mobile, `D-14`). **Chrome est le navigateur de développement, de jeu et de référence** ; le tableau des moteurs et leur statut vivent dans `docs/DOC_navigateurs.md` (registre vivant), et la politique d'engagement envers Firefox/Safari est `Q-24`, non tranchée.

**La carte Maison n'est pas finie, et la Phase 4 n'est plus la prochaine étape.** Les systèmes prévus en Phase 4 (armes, équipement, compétences, tables d'apparition) arrivent d'abord **sur la carte Maison** ; la carte suivante s'ouvre quand la Maison est épuisée (Nv. 40-50, provisoire). Critère de clôture de la Région Maison : **la boucle de 2 heures** (sauvegarde neuve → 2 h de jeu → Nv. 30 → l'envie de changer d'endroit).

**Décision de méthode (Xav, 2026-09-19, 17 h 18) : on ne rajoute pas de contenu sur des bases non confirmées.** Avant `specs/07_chaos-nocturne.md` et avant de rouvrir `Q-07` (passée à **gelée**) : la **performance** et les **retours du playtest du 19/09**. On repart de la base et on remonte, **un ticket par session**, validation en jeu entre deux.

**Ordre d'injection** (amendé par `BRIEF_nuit-2026-09-19.md`, décision de Xav — *remplace* le §5 de `NS_decisions-rendu-navigateurs_2026-09-19.md`, archivée) : **un ticket par session, un commit par ticket**, chacun citant les identifiants du suivi qu'il touche. La nuit du 19 au 20 respecte la règle autrement : une **file de micro-tickets**, un commit chacun, dans cet ordre, pour que Xav puisse fusionner « jusqu'au commit N » et laisser le reste.

1. ~~Doc : NS de la soirée + les deux relevés de base~~ — **fait** (`A-03` close : `R-14` jour, `R-03` nuit, 59,9 fps et zéro frame sautée sous Chrome).
2. ~~**Tailles et vitesse**~~ — **fait et fusionné** : `D-32` (héros à l'échelle 0,643), `D-33` (vitesse de base 75), `D-34` (follet à l'échelle de jeu 0,75, orbite inchangée). **Sauf `D-35`** (lumière du follet), **annulée par Xav** et remise à *ouvert* : à reprendre après discussion, jamais par initiative.
3. ~~`specs/07_chaos-nocturne.md` (A, B, C, D)~~ — **les quatre paliers sont livrés et fusionnés**. Le relevé de nuit sous Chrome, comparé à `R-03`, reste dû (`V-18`).
4. ~~`D-36` — follet « aérien »~~ — **proposé et conservé** par Xav ; réglage et verdict final à l'œil (`V-20`).
5. ~~**La nuit du 20/09** (file autonome n° 2)~~ — **les cinq tickets sont livrés et fusionnés** (`D-39`, `D-40`, `D-17`, `D-13`, `D-30`). Le playtest téléphone qui a suivi en a rouvert deux, `D-42` et `D-30` : ~~mini-file « menu tactile »~~ — **livrée, en ligne, validée par Xav** (`V-25`, `V-26`).
5 bis. **`specs/08_menus-cartes.md`** (`D-43`) — palier A le 20/09 (`V-27` due), puis B (une seule pile, tranche `Q-36`), puis C (un écran de liste par ticket).
6. `D-01` (défilement incrémental du calque), `D-16` (puits), puis reprise de `Q-07`.
7. Ce que Xav doit trancher avant d'aller plus loin sur le contenu : `Q-33` (apparitions de ressources) et `Q-34` (lisibilité de la première nuit dangereuse) — nées du constat d'équilibrage du 19/09 au soir.

Les sept tickets de code du 19/09 (`D-22`, `D-21`, `D-20` A et B, `D-05`, `D-23`) sont livrés — détail et validations restantes dans `docs/DOC_suivi-dettes.md`. En parallèle, côté Xav : `A-06` (Firefox `about:support`, 2 min). `A-07` (profil USB de l'A04) **tombe sans objet** avec `D-31`.

Les captures de la V1 (`docs/captures/v1/`) sont une **inspiration, jamais un cahier des charges** : aucun ticket ne les lit tant que `E-03` (une ligne d'intention par capture) n'est pas rempli.

`Q-10`, `Q-11`, `Q-12`, `Q-24` et `Q-25` restent à trancher avec Xav ; `Q-07` est gelée. La spec de la barre d'action du bas (`E-01`) est écrite par Xav lui-même et attend le chiffrage `Q-11`. **Une spec non écrite ne se commence pas** (même règle que pour une phase).


## Journal de session — Menus en cartes, paliers B et C (nuit du 20 au 21/09)

`specs/08_menus-cartes.md` v1.0.0, **paliers B puis C, puis une passe de polish** — file de nuit autonome, à la demande de Xav (« continue jusqu'à la fin de 08_menus-cartes […] Commit à chaque étape »). Branche **`menus-cartes`**, un commit par étape, chacun retirable seul ; **`push` de sauvegarde autorisés sur cette branche seulement, jamais sur `main` ; la fusion reste à Xav.**

**Le fichier de bord de cette session vit sur le disque, pas ici : `docs/JOURNAL_2026-09-20_menus-cartes-paliers-B-C.md`.** Une ligne par commit, écrite au moment du commit — c'est lui qui est le rapport. Le journal du palier A est archivé (`docs/archives/JOURNAL_2026-09-20_menus-cartes.md`).

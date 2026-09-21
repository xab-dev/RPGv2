# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

**Le jeu est en ligne : `https://xab-dev.github.io/RPGv2/`** (GitHub Pages, servi depuis `main`). Conséquence qui change la portée de tout ce qui suit : **un `push` sur `main` publie le jeu.** Les `push` restent à la main de Xav (règle de méthode inchangée) — ce qui change, c'est qu'un `push` n'est plus une sauvegarde, c'est une mise en ligne. C'est aussi par cette URL que se font désormais les vérifications sur téléphone, le Wi-Fi local n'étant plus nécessaire (`R-16` : servi en ligne, l'A04 rend exactement comme en Wi-Fi local).

Phases validées : 0 (Socle technique), 1 (La Grotte), 1b (polish, DA validée), 2 (Région Maison, première marche, `specs/03_maison-exterieur.md`) et 3 (Maison, intérieur & systèmes de camp, `specs/04_maison-interieur.md`, close le 2026-09-17). **Chantier `specs/05_construction-stations.md` (placement libre des stations) close le 2026-09-19** : validé par Xav en jeu à la manette puis au clavier seul, après le correctif de parité clic/verbe (détail complet des 4 diagnostics successifs : `docs/archives/INDEX.md`). **Polish post-Construction : étapes 1 à 6 livrées et validées en jeu à la manette par Xav le 2026-09-19** (« ça fonctionne, le jeu est fluide ») — instrument de mesure sous `?debug=fps`, héros à l'échelle 0,88, follets visibles pendant l'intro, silhouette du puits, traînée de poussière, HUD sur un bandeau d'une ligne. La branche `polish-2026-09-19` est **fusionnée dans `main`** (`e5b6d44`) : on travaille sur `main`.

**La file de micro-tickets de la nuit du 19 au 20 est fusionnée dans `main`, sauf un commit.** Dix commits livrés, un par ticket ; Xav a **annulé** le seul qui ne lui allait pas (`git revert 9997cec`, `5b83afa`) : la lumière du follet (`D-35`) — « n'allait pas très bien », détail à venir, **à reprendre après discussion, jamais par initiative**. Ce qui est donc en vigueur : héros à l'échelle 0,643 (`D-32`) et vitesse de base 75 (`D-33`), follet à l'échelle de jeu 0,75 (`D-34`), les **quatre paliers de `specs/07_chaos-nocturne.md`** (zones et tirage, la nuit et le seuil, le comportement « un domaine, pas un piquet », le signal visuel de la zone) et le follet aérien (`D-36`, proposition conservée). La lumière du follet reste celle d'avant la nuit, à un essai près : **rayon 100 px partout** — valeur d'ESSAI posée par Xav lui-même le 20/09 (`e1632ec`, les trois follets ensemble, elle valait 110), pas une décision et pas une reprise du ticket annulé ; `D-35` reste ouverte. Détail verbatim : `docs/archives/JOURNAL_2026-09-19_nuit-file-micro-tickets.md`.

**La file de la nuit du 20/09 (n° 2) est fusionnée dans `main`, en entier.** Sept commits : `D-39` (double orbite du follet : corps et aura dérivés du **même** point logique), `D-40` (le nom des monstres retiré du **dessin** seul, la donnée reste), `D-17` (bouton MENU tactile **sous** le bandeau), `D-13` (buffs au bandeau, une icône par **stat** renforcée posée sur `stats.json`), `D-30` (plein écran au premier appui tactile, `src/plein_ecran.js`). **Personne n'avait regardé l'écran** cette nuit-là (Chrome non connecté) : `V-21` à `V-25` étaient toutes dues. Xav a depuis joué sur téléphone, **en ligne**, et en a rapporté deux défauts : le menu Pause enfermait le joueur (`D-42`) et le plein écran ne se déclenchait jamais (`D-30` rouvert). **Les deux sont corrigés, en ligne, et validés par Xav sur téléphone par l'URL publique le 20/09 (« all good », `V-25` et `V-26`)** — mini-file `docs/archives/JOURNAL_2026-09-20_menu-tactile.md`. `V-21` à `V-24` restent dues. Verbatim de la nuit : `docs/archives/JOURNAL_2026-09-20_nuit-file-micro-tickets-2.md`.

**Chantier en cours : `specs/08_menus-cartes.md` — les menus en grille de cartes (`D-43`).** Spec **par paliers, un palier par session**, branche `menus-cartes`, un commit par étape, chacun retirable seul. Palier A (l'écran de référence) : livré le 20/09 ; Xav l'a regardé le soir même (« tout à l'air bon ») et a **demandé d'aller au bout de la spec dans la nuit**. **Les trois paliers sont livrés, et la branche `menus-cartes` est FUSIONNÉE dans `main` et en ligne depuis le 21/09 — à la demande explicite de Xav, après ses premiers tests clavier/manette (« validés »), pour essayer sur téléphone** : B (une seule pile pour tout le menu, `MENU` ferme tout), C (Poche, Stats, Coffre, Craft et Construction en « maître-détail » : il n'existe plus d'écran de liste), puis une passe de polish. La nuit elle-même s'est faite sans écran allumé (vérifié sous Chrome sans fenêtre, aux deux tailles) ; **reste dû : le téléphone et le doigt** — `V-27`, `V-28`, `V-29` restent ouvertes ; choix de conception à confirmer `Q-36`, `Q-39`.

**Les quatre stations ont la même facture, et c'est en ligne (21/09).** Refonte **graphique**
des trois placeholders de la Phase 2 sur le modèle du puits refait la veille : Cuisine
(`D-78`), Coffre (`D-79`), Atelier (`D-80`) — **en données seules, aucune ligne de code**. La
règle qui a commandé toute la session, et qui vaut pour la suite : **l'empreinte solide d'une
station EST la boîte englobante de ses primitives de dessin**, donc redessiner, c'est déplacer
un mur — chaque silhouette est refaite **dans** l'enveloppe d'avant, inclusion prouvée par test
aux trois échelles. Validé en jeu par Xav le jour même (`V-51`, « j'ai tout testé, all good »),
et `Q-47` tranchée dans la foulée : **les stations gardent leur taille**. Détail :
`docs/JOURNAL_2026-09-21_refonte-stations.md`.

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
│   ├── souris.js           `D-107` : ce que la souris fait faire au NAVIGATEUR et qu'on lui
│   │                       retire (clic droit), posé sur le document — « meilleur effort »
│   ├── curseur.js          `D-108` : le curseur du jeu. Parts pures (boîte du bitmap dérivée du
│   │                       dessin, géométrie de l'orbite, union de rectangles) + la part DOM :
│   │                       la TÊTE est un `cursor: url()` généré au boot depuis `visuels.json`,
│   │                       les particules et la traînée vivent sur un calque de recouvrement
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
│   │                       fonction dans les deux sens), et `rectangleMenuCss` : LE calcul de
│   │                       l'unité `--u` et de l'origine de la boîte, en pixels **CSS** (`D-48`)
│   └── ui/                 menu.js (DOM ; possède LA pile du menu et y ENREGISTRE ce que les
│                           cartes de `data/menus.json` citent : actions, états, écrans — plus le
│                           bandeau de placement), grille_cartes.js (les écrans de CARTES) et
│                           ecran_fiches.js (le « maître-détail » : tuiles à gauche, fiche à
│                           droite — Poche, Stats, Coffre, Craft, Construction) : deux VUES de la
│                           pile, qui ne connaissent ni un id de catalogue ni une valeur de style ;
│                           icone_canvas.js (un visuel de `visuels.json` dans un <canvas> DOM,
│                           recadré s'il déborde, « meilleur effort »), couleurs_ui.js (contraste
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
                            zéro dépendance : vrais pixels sous les TROIS profils de
                            `scenarios/commun.mjs#PROFILS` — 703 × 280 et 1920 × 1080 à DPR 1, plus
                            `telephone` 780 × 360 à **DPR 3** (`D-48`) ; profil Chrome jetable —
                            la sauvegarde de Xav n'est jamais touchée) et banc_visuel.html
                            (`?id=a,b,c` : une ou plusieurs entrées de `data/visuels.json` rendues
                            AUX TAILLES RÉELLES du jeu — monde à DPR 1 et 3, tuile de la Poche —
                            puis agrandies au plus proche voisin ; agrandir la transform
                            épaissirait les traits avec, et ferait juger une image que personne ne
                            voit)
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
| **Un écran « maître-détail » : une tuile se SÉLECTIONNE, c'est le bouton de la fiche qui AGIT** (au stick : sélection ; A : action — A et le bouton sont la même fonction). *Diffère* de la grille de cartes, où l'appui agit : sur une carte tout est écrit, sur une tuile il n'y a qu'une icône, et au doigt on ne lirait jamais la fiche avant d'avoir agi. La grille de tuiles défile **en elle-même** au-delà de 4 × 3 ; ni l'en-tête ni la fiche ne bougent. **Ce que dit une fiche vient des données** (`main.js#lignesFicheItem`, les dérivées de `stats_derivees.json`, les entrées de `recipes.json`), et tout texte composé passe par le contrôle de démarrage FR/EN (`clesTexteFiches`). *Retenu par défaut, à confirmer* (`Q-39`) | 2026-09-20 | `docs/JOURNAL_2026-09-20_menus-cartes-paliers-B-C.md`, palier C |
| **Le signal d'une zone de Chaos est une teinte additive posée *après* le calque d'obscurité** : elle se voit à travers la nuit **sans percer le voile**, donc elle ne révèle pas le sol (principe des faisceaux de la Grotte : un faisceau éclaire l'air, un halo révèle le sol). Trois règles avec : l'intensité **suit l'obscurité de la scène** (donc nulle de jour, sans condition ajoutée) · **une table fermée ne s'annonce pas** (aucune teinte sous le seuil de niveau) · la pulsation suit `save.monde.heure`, donc elle est gelée sous UI par construction. **Aucune lueur sur les monstres** (`Q-27`, « je veux être surpris ») | 2026-09-19 | même archive, palier `07-D` |
| **Échap reste la touche `MENU`, et la sortie du plein écran devient un appui MAINTENU** (décision de Xav, 20/09) : pas de seconde touche, pas de remappage, `Q-36` inchangée. Le moyen est `navigator.keyboard.lock(['Escape'])` et rien d'autre — tant que le plein écran **demandé par le jeu** est actif, Échap est livré à la page et le navigateur garde pour lui la sortie sur appui long (~2 s), qu'il annonce lui-même. **L'appui long n'est donc pas codé** : aucun minuteur, aucune mesure de durée dans le jeu. Un seul module le sait (`plein_ecran.js`), le verrou suit **l'état réel** et jamais un booléen, et son absence (Firefox, Safari, contexte non sécurisé) ne se voit nulle part : Échap y fait les deux, comme avant | 2026-09-20 | journal de session ci-dessous, fiche `docs/archives/MT_echap-keyboard-lock_2026-09-20.md` |
| **Une variable CSS se lit en pixels CSS — et le rectangle de présentation du jeu est en pixels PHYSIQUES.** La conversion (÷ DPR) se fait **une seule fois**, dans une fonction pure (`menu_cartes.js#rectangleMenuCss`) que TOUS les chemins traversent (ouverture d'un écran, `resize`, `orientationchange`, `fullscreenchange`) ; le menu ne lit plus `canvasVisible.width`, un nombre qui a deux écritures et deux sens. Née de `D-48` : sur téléphone (DPR 3) le menu s'ouvrait à `--u` = 4 px dans une fenêtre de 360 px CSS — la mise en page 1080p dans un écran de 360 — et un pivot la remettait à 1 px. Corollaire de test : **un profil à DPR 1 ne peut pas voir cette classe de défaut** (px CSS et px physiques y sont le même nombre), d'où le profil `telephone` de `tools/capture_chrome.mjs` | 2026-09-20 | journal de session ci-dessous, fiche `docs/archives/MT_menu-echelle-dpr_2026-09-20.md` |

| **Ce qui est dessiné est ce qui agit** : le cercle d'aura du follet n'est plus une indication de portée, c'est **la zone d'effet elle-même** — « dans l'aura » devient une question de compas (distance au **point logique** du follet ≤ rayon d'aura), et **plusieurs monstres y sont à la fois** et reçoivent tous l'effet (la 1ʳᵉ zone de monstres aura des groupes). Le rayon passe par `companion.js#resoudreRayonAuraPx`, que le **dessin** et la **règle** lisent tous les deux — jamais deux nombres, même contrat que `rayon_lumiere` (à la fois halo affiché et trou dans le voile). *Révise* l'approximation « dans l'aura = le monstre que le follet a engagé », qui ne pouvait toucher qu'un monstre et qui était **morte** depuis `D-38` (comparaison d'un id d'instance à un id de catalogue). La distance d'**engagement** du follet, elle, ne bouge pas (reste de `D-37`) | 2026-09-20 | `docs/archives/JOURNAL_2026-09-20_aura-reelle.md`, fiche `docs/archives/MT_synergies-aura-reelle_2026-09-20.md` |

| **La portée du follet est celle qu'on VOIT** : il engage un monstre qui est **dans son orbite** (distance mesurée du héros) **ou dans son aura** (distance mesurée du follet), et relâche au-delà de **orbite + aura + 12 px**. `DISTANCE_ENGAGEMENT_PX` (48 px, ni l'orbite, ni l'aura, ni leur union) est **retirée** : il n'existe plus de portée propre au follet, donc plus rien à faire diverger le jour où l'orbite ou l'aura grandiront (`Q-26`, `Q-29`) — la portée suivra toute seule. Les 12 px sont une **marge d'hystérésis fixe**, l'épaisseur du bord et non une portée : sans elle un monstre immobile pile à la frontière ferait osciller le follet d'une frame à l'autre. L'indice de commande ATTACK appelle le **prédicat d'engagement lui-même** (`companion.js#monstreEngageable`), jamais une portée recopiée. Et l'approche de la cible est **amortie comme le retour** — « mouvement fluide, jamais un flash » : l'ancien code copiait la position du monstre d'un coup, jusqu'à ~66 px en une frame. Conséquence voulue, cohérente avec `D-51` : l'aura arrive **avec** le follet, l'effet commence quand le cercle touche le monstre | 2026-09-20 | journal de session ci-dessous, fiche `docs/archives/MT_follet-engagement-relache_2026-09-20.md` |

| **Le joueur choisit le monstre du follet** (`D-54`) : un verbe **« cible suivante »**, **RB** à la manette et **Tab** au clavier (le geste tactile reste à définir, `Q-40`). Les **candidats** sont les monstres vivants **en deçà de la distance de relâche** — pas seulement ceux que la règle automatique prendrait : ordonner une cible est justement le moyen d'envoyer le follet là où il n'irait pas seul. L'ordre est « le plus proche du héros d'abord » et il boucle ; la cible **choisie tient** jusqu'à sa mort ou sa relâche, parce que `mettreAJourEtat` ne choisit qu'en état `suivre` — rien n'a eu à être ajouté pour cela. Le changement passe par le **vol amorti** de `D-37`. `Tab` demande un `preventDefault` **en jeu seulement** (sinon le focus sort du canvas) : le clavier reçoit un prédicat injecté, écrit par le **seul** endroit qui sait si une UI capte les verbes (l'orchestrateur, à chaque frame) — un `keydown` n'attend pas la boucle de jeu | 2026-09-20 | journal de session ci-dessous, fiche `docs/archives/MT_follet-cible-suivante_2026-09-20.md` |

| **La tournée de validation du 21/09 clôt vingt-trois lignes `V-`/`E-`, et en ouvre trois défauts** : la **structure des menus est gelée** (« les menus sont très bien : on ne touche plus ») · le combat et le follet sont « une très bonne base pour aller se bagarrer contre des boss » · l'ambiance sonore est **trop forte** (Xav coupe le son : `D-55`) · sur le téléphone du testeur (Motorola) le jeu **ne s'adapte pas à l'écran**, à **qualifier** avant tout correctif (`D-56`) · au tactile le bouton d'action et le joystick se marchent dessus, **consigné sans corriger** (`D-57`, chapitre tactile de Xav). Un verdict de tournée vaut `ok` · `non` · **`pas vu`** — et **une ligne `pas vu` n'est jamais close par le silence** | 2026-09-21 | `docs/CHECKLIST_tournee.md`, `docs/DOC_suivi-dettes.md` §8 |
| **Pas d'inventaire dans la barre du bas** (*révise* le souhait du 19/09, `E-01` sans objet) : elle ne porte que les **actions** de D5⑤ — arme, compétences, consommable équipé. Et **anti-spoil des touches** : sur une partie neuve, **seule la case d'attaque de base existe** ; une case apparaît quand son premier contenu est débloqué. `INTERACT` et `MENU` n'en font pas partie et restent là dès la Grotte (les leviers en dépendent au tactile) | 2026-09-21 | `docs/BRIEF_file-nv0-10_2026-09-20.md` T9 |
| **Une entrée de catalogue verrouillée est INVISIBLE** : pas de « ??? », **aucun compteur** du type « 3/12 ». Ce qui existe déjà dans le jeu ne bouge pas ; seul ce qui se débloquera plus tard est caché. Le moyen est un champ `visible_si` (condition du registre de flags, absent = toujours visible) et **une seule fonction pure** que tout écran listant un catalogue traverse. Principe d'auteur qui commande toute la file : **mystère et découverte** — le joueur doit finir par comprendre qu'il y a beaucoup à découvrir *sans qu'on le lui montre avant* | 2026-09-21 | même brief, T4 |
| **Toute récolte rapporte de l'XP** (branche, caillou, fruit, arbre, rocher, puits) — *révise* D21 : les sources d'XP sont le combat, le craft **et** la récolte. Valeur par ressource en données, jamais en code. Et le **texte flottant maigrit** : « +1 » pour la ressource, **sans son nom**, « +1xp » pour l'XP ; les deux se distinguent par la **taille** et par le **suffixe** (qui passe par les locales), la couleur pouvant s'y ajouter mais **jamais seule** — règle d'accessibilité. C'est ce texte qui apprend la boucle au joueur | 2026-09-21 | même brief, T1 |

| **La boucle de jeu survit à une exception** (décision de Xav, 21/09) — *révise* la position du 17/09 (« jamais un `try/catch` global autour de `update()`/`dessiner()`, qui masquerait aussi de vraies erreurs de gameplay »). Motif : la panne a figé le jeu **deux fois en cinq jours** — une exception dans `audio.js` (17/09), un style de texte flottant manquant (21/09) —, chaque fois pour une cause minuscule et avec un symptôme total : plus une frame, donc manette et clavier morts (sondés dans `maj()`), souris vivante. Ce qui change : **on ne masque rien** — l'exception est journalisée avec sa pile, la première occurrence en entier puis une relance tous les 300 échecs pour ne pas noyer le premier message. C'est la **mort** de la boucle qui n'est plus la punition : une frame qui échoue est une frame perdue, pas une partie perdue. Corollaire : **un garde-fou de données ne se pose pas dans la boucle de dessin** — il se pose au démarrage, là où une faute de catalogue se voit avant d'être jouée | 2026-09-21 | `docs/DOC_suivi-dettes.md` `D-71` |
| **Une charge utile passée à un autre module s'ENRICHIT, elle ne se refabrique pas.** `main.js#dessiner()` reconstruisait champ par champ l'objet que `texte_flottant.js` lui donnait, alors que ce module est fait pour **transporter des clés qu'il ne comprend pas** : la clé `style` ajoutée par `D-58` est tombée dans l'intervalle, sans bruit, et le jeu se figeait au premier ramassage. Une recopie champ par champ à une frontière est une **perte silencieuse programmée**, qui se rejoue à chaque clé ajoutée. Corollaire de test, né du même défaut : une composition qui vit **dans** `dessiner()` est intestable (le rendu n'est jamais exercé headless) — elle en sort en fonction pure, et un **tour de dessin à faux contexte après chaque action type** (`tests/test_d71_jointure_dessin`) couvre désormais l'angle mort | 2026-09-21 | `docs/DOC_suivi-dettes.md` `D-71` |

| **Un harnais de test ne réimplémente jamais ce qu'il prétend éprouver.** `test_d43_c2` recopiait la décision « quel objet va dans quel emplacement » sous un commentaire affirmant « exactement ce que fait `main.js#demarrerJeu` » — il ne l'était pas, et c'est ce qui a laissé passer `D-72`. Deux bugs de suite ont eu cette forme : une charge utile réelle **recopiée à la main** quelque part (le `.map()` du rendu pour `D-71`, ce harnais pour `D-72`). Le remède est le même dans les deux cas : **extraire la vraie fonction**, l'appeler des deux côtés | 2026-09-21 | `docs/DOC_suivi-dettes.md` `D-71`, `D-72` |
| **Ce que `demarrerJeu` et `creerOrchestrateurGrotte` partagent se déclare au NIVEAU MODULE.** Ce sont deux fonctions **sœurs** : un nom déclaré dans l'une n'existe pas dans l'autre, et l'erreur ne se voit qu'en jouant (`demarrerJeu` n'est jamais exécuté headless — DOM, IndexedDB, réseau). Née de `D-72` : du code posé par **ancre textuelle** plutôt que par portée. Au niveau module, il n'y a plus de portée à laquelle se tromper, et la fonction devient testable — les deux moitiés du remède. `tests/test_d72_portees_main` le refuse désormais statiquement | 2026-09-21 | `docs/DOC_suivi-dettes.md` `D-72` |
| **Une vue partagée s'EFFACE avant de se remplir.** Les cinq écrans maître-détail (Poche, Stats, Coffre, Craft, Construction) sont **un seul élément DOM** : tant que `rendre()` appelait `obtenirEntrees()` avant d'effacer, une exception laissait le contenu de l'écran précédent affiché **sous le titre du nouveau** — un défaut de câblage déguisé en défaut de menu. Effacer d'abord ne rattrape rien (l'exception remonte toujours) : ça rend la panne *lisible* au lieu de trompeuse | 2026-09-21 | `docs/DOC_suivi-dettes.md` `D-72` |

| **Un test n'épingle jamais une valeur de réglage : il vérifie un contrat.** Les nombres d'équilibrage — taille, portée, vitesse, échelle — appartiennent à Xav, qui les ajuste **à la main dans `data/`**, comme l'architecture le lui demande. Un test qui mémorise son dernier choix devient rouge le jour où il fait son travail, et le rouge ne veut alors rien dire. Ce qui se teste : que la valeur **vit en données**, qu'elle est **résolue par une seule fonction** qui la rend telle quelle, qu'une valeur dégénérée **tombe au boot**, et que l'**intention** du ticket tient — en *relation* (« l'épée porte plus loin que les poings », « le follet est plus petit en jeu qu'à la cinématique »), jamais en chiffre. Deux tests l'avaient oublié et sont corrigés : `D-20` (mains nues = la moitié de l'épée) et `D-52` (échelle du follet = 0,75) | 2026-09-21 | `docs/DOC_suivi-dettes.md` `D-52` |

| **Une silhouette se juge à la taille où le jeu la montre, jamais agrandie.** `dessinerVisuel` met le trait à l'échelle avec le reste : regarder une entrée de `visuels.json` à `echelle: 32` donne des barres de 32 px là où le joueur verra un cheveu — on juge alors une image qui n'existe pas. L'outil `tools/banc_visuel.html` rend donc aux tailles réelles (monde à DPR 1 et 3, tuile de la Poche) **puis** agrandit le bitmap au plus proche voisin. Né de la plume (`D-76`) : le premier jet, jugé agrandi, passait pour un pâté ; le vrai défaut était ailleurs (le **galbe** des barbes, pas leur nombre) | 2026-09-21 | `docs/JOURNAL_2026-09-21_polish-live.md`, `D-76` |
| **Mourir rejoue le réveil de l'intro** — le clignement du respawn reprend **exactement** les durées de l'intro (~3,7 s), au lieu de la version courte de ~0,9 s. *Révise* la contrainte d'origine de `D-65` (« plus court que l'intro, à ne pas allonger »), sur verdict `non` de Xav en jeu. Aucune ligne de code : `intro.js#ouverturePaupieres` était déjà la seule implémentation, seules les données changent. Corollaire de test, tiré de `D-52` : le test n'épingle plus une durée mais la **relation** (respawn = intro) | 2026-09-21 | `D-74`, `Q-46` (ce qui reste à trancher sur la mort) |
| **Une case de la barre du bas dessine ce qui l'occupe, quel que soit le verbe** : `ui/hud.js` reçoit une table `verbe → visuel` et n'a plus de branche `if (verbe === 'attack')`. L'arme équipée et le consommable équipé y passent par la même ligne, et une compétence s'y branchera **sans code de HUD nouveau** — seul `main.js`, qui a le registre, sait de quoi vient une silhouette | 2026-09-21 | `D-75` |
| **Le bord LATÉRAL d'un volume, jamais son point le plus bas, est ce qui se compare au pied de ce qui l'entoure.** En trois quarts, le point de contact le plus bas d'un cylindre est son AVANT, plus près de l'œil : un fût « posé à `y = 0 »` paraît donc **flotter au-dessus** des mâts plantés à ce même `y = 0`. Ce qui doit coïncider avec leur pied, c'est le bord du fût là où il les longe — la **hauteur du centre** de son ellipse de base. Né de `D-16`, en deux corrections de Xav ; verrouillé par test plutôt que laissé à l'œil, il resservira à toute silhouette cylindrique | 2026-09-21 | `D-16`, `tests/test_sd_puits_silhouette_…` §2 ter |
| **Le puits est refait, et son empreinte solide n'a rien gagné** : elle est strictement **incluse** dans celle d'avant (le toit, plus bas, libère une rangée de tuiles). Un ticket de silhouette qui craint pour la collision n'a donc pas à mesurer le chemin et la zone du fruit : il lui suffit de prouver l'**inclusion**. Poser une `empreinte` sur la seule base reste `[OUVERT]` — cela change où le héros peut se tenir, donc c'est une décision de jeu | 2026-09-21 | `D-16` |
| **« Pas compris » n'est pas un verdict de tournée, c'est un défaut de la checklist** : quand une ligne `V-` ne se comprend pas manette en main, c'est la ligne qu'on réécrit, jamais au lecteur de deviner. Né de `V-40` le 21/09 | 2026-09-21 | `docs/CHECKLIST_tournee.md` v1.1.0 |

| **Redessiner une station, c'est déplacer un mur** : son empreinte solide **est** la boîte englobante de ses primitives de dessin (`structures.js#empreinteParDefaut`). Une refonte purement graphique se fait donc **dans** l'enveloppe mesurée avant le ticket, et l'inclusion se **prouve par test** aux trois échelles — jamais « à peu près la même taille ». Corollaire de conception, né des trois stations : le « même standing » que le puits se joue sur la **facture** (volume de trois quarts, échelle de valeurs, ombre posée sur le contact, **un** accent de couleur qui dit ce que l'objet est), pas sur la présence — leur donner sa hauteur est une décision de jeu (`Q-47`), pas de dessin | 2026-09-21 | `D-78`, `D-79`, `D-80`, journal de session ci-dessous |
| **Le trois quarts ne demande aucune forme nouvelle** : un **polygone** trapézoïdal pour une face supérieure, l'**ordre de dessin** pour n'exposer que l'arc haut d'une ellipse (le couvercle du Coffre est une ellipse entière, dont le corps recouvre la moitié basse), et une **paire de pièces décalées** — arrière plus courte et plus sombre, avant plus longue et plus claire — pour des pieds. `visuels.json` avait déjà tout ce qu'il fallait | 2026-09-21 | même journal |
| **Le banc visuel ne peut pas dire si une silhouette se détache du décor.** Il la juge sur un fond neutre *choisi* ; la scène la pose sur la terre de la Maison. L'établi de l'Atelier a passé **trois itérations** au banc avant de se révéler **noyé dans le sol** à la première capture de jeu. Une silhouette de monde se clôt donc par une capture **en scène** (`tools/scenarios/stations_maison.mjs` : un poste d'observation par station, calculé depuis les vrais catalogues, jamais une position recopiée) — le banc reste l'outil d'itération, pas celui du verdict | 2026-09-21 | même journal |

| **Les stations gardent leur taille** (`Q-47`, tranchée par Xav le 21/09 : « on ne touche à rien, c'est très bien comme ça »). Elles font 12 unités de haut contre 29,5 au puits, et cela **reste** ainsi : leur empreinte solide ne bouge pas. Conséquence pour la suite : la présence d'une station ne se gagne pas en l'agrandissant — elle se gagne par ce qu'on met **autour** (décor, sol, lumière) ou par une station **nouvelle**, dessinée d'emblée à sa taille (scierie, ferronnerie, feu de camp) | 2026-09-21 | `Q-47`, journal de session ci-dessous |
| **Un item de poche n'a pas d'empreinte solide — mais sa boîte décide quand même de deux choses visibles** : la place qu'il prend au sol, et le **cadrage de sa tuile** dans la Poche (`ui/icone_canvas.js#cadrer` bascule d'un cadrage commun à un recadrage dès que la boîte sort de la boîte de référence de 14 unités). Grossir un item est donc une décision de **jeu**, pas de dessin — même raisonnement que `Q-47` pour les stations, et même discipline : chaque silhouette est refaite **dans** son enveloppe d'avant. Corollaire de mesure, né de la branche : `structures.js#boitePrimitive` **ignore l'épaisseur d'une ligne**, donc comparer les boîtes officielles ferait passer pour un agrandissement le simple fait de redessiner un trait épais en polygone, **à pixels identiques** — ce qui se compare est l'étendue **réellement peinte** | 2026-09-21 | `D-82`, `docs/JOURNAL_2026-09-21_refonte-items.md` |
| **La charte d'item**, arrêtée sur la plume et appliquée aux neuf autres : (1) **l'objet est posé** — une `ombre` portée, qui sépare un objet au sol d'une vignette qui flotte · (2) **trois valeurs au moins** — un fond sombre qui sert de contour, un corps, une facette éclairée ; deux valeurs font une tache, trois font un volume · (3) **un accent, un seul** — la couleur qui dit ce que l'objet *est* (l'aubier d'un bois coupé, le fil d'acier d'un outil, la feuille d'un fruit) · (4) **le trois quarts sans forme nouvelle** (leçon des stations). Les trois valeurs d'un fût ou d'un galet s'obtiennent en **glissant ou en réduisant la même forme**, jamais en dessinant trois contours qui divergeraient à la première retouche | 2026-09-21 | même journal |
| **Ce qui distingue deux items voisins n'est ni leur taille ni leur teinte : c'est un parti pris opposé.** Le caillou devient un **galet** (lisse, rond, gris chaud) et la pierre un **rocher** (anguleux, froid, facetté) ; le fruit cuit **perd** un par un les trois signes du cru (feuille, peau tendue, éclat net) et gagne les siens (fente, brûlé). Une nuance de gris ou de rouge ne survit pas à la taille du monde — un parti pris, oui | 2026-09-21 | `D-84`, `D-85`, `D-87`, `D-88` |
| **On ne régénère pas un dessin déjà validé en jeu.** La refonte de la plume a commencé par régénérer ses barbes : à 19 barbes courtes et serrées le fan se referme en masse et la plume se lit comme une **truelle**. Les barbes de `D-76` (validées `V-49`) ont été reprises à l'identique, et le ticket n'a ajouté que la charte. Un ticket de *standing* ne rouvre pas un dessin que Xav a déjà vu et accepté | 2026-09-21 | `D-82` |
| **Une silhouette d'item se vérifie à trois endroits, pas un** : au **banc** (itération), **au sol dans la scène** (le banc juge sur un fond neutre choisi, la scène pose l'objet sur la vraie terre) et **dans la barre du bas**, réduite à une case de 12 unités — la seule vue qui pouvait dire si l'ombre portée de la charte gêne à cette taille. `tools/scenarios/items_poche.mjs`. Deux pièges d'une capture d'étalage, nommés une fois pour toutes : poser les items **hors des stations**, et **geler le repos du jour** (`jour_items_sol`), sans quoi le tirage redistribue au hasard tout item qui a un bloc `spawn` | 2026-09-21 | `D-91` |
| **Une case de la barre du bas n'impose pas sa couleur à ce qu'elle contient** (*révise* le `[OUVERT]` de `D-20 B`) : **aucune icône d'arme n'est teintable**. L'épée de bois et le fruit équipé y étaient déjà à leurs vraies couleurs, la main seule restait un aplat doré — une teinte unique appliquée à toute une silhouette interdit par construction les trois valeurs de la charte d'item. Le repère de couleur de l'attaque passe dans le **contour** de la case, le seul endroit où il n'écrase rien. Et la case elle-même prend un fond **sombre** : un blanc translucide n'a pas de couleur propre, il a celle du décor — beige sur la terre de la Maison | 2026-09-22 | `D-94`, `D-99`, journal de session ci-dessous |
| **Le bandeau n'a qu'UNE barre** : les PV, la faim et la soif traversent la même fonction (`ui/hud.js#dessinerBarre`) — ils avaient deux factures, dont une écrite *inline*, donc aucun moyen d'en régler une sans laisser l'autre. Quatre valeurs chacune, qui sont la charte d'item transposée : **creux** (lisible même à zéro), **corps**, **moitié haute éclairée** (le volume vient d'une seconde forme, jamais d'un flou), **liseré** d'un pixel — qui s'arrête où le remplissage s'arrête, sinon une barre vide se lirait pleine. Le contour passe au trait sombre : c'est le blanc pur qui écrasait tout | 2026-09-22 | `D-95` |
| **Toute icône du HUD est une entrée de `visuels.json`, résolue par `main.js`** — plus aucune forme tracée au `moveTo` dans `ui/hud.js`, et plus aucun **caractère de police** en guise d'icône (les éclats étaient un `◆`, donc à la merci de la fonte du système). Les deux jauges déclarent la leur **en données** (`survival.json#icone`, référence **requise** au boot : une jauge sans forme se réduirait à sa couleur, ce que P4② interdit). Conséquence voulue : la prochaine retouche de ces icônes est une affaire de données | 2026-09-22 | `D-96` |
| **Un visuel qui sert dans deux régimes de couleur se met en volume en ALPHA PUR** — noir translucide pour l'ombre, blanc pour la lumière. Les quatre icônes de stats sont dessinées **sans teinte** au bandeau (couleurs d'auteur) et **teintées par le CSS** dans l'écran Stats (`ui/icone_canvas.js` prend la couleur calculée du canvas) : une facette en couleur fixe aurait juré dans l'un des deux. Même raison côté DOM, où une surface de menu a trois états (repos, focus, appui) : le relief y est un **blanc translucide**, donc jamais réécrit par état — et sa règle se place **après** les règles d'état, dont le raccourci `background` remet `background-image` à zéro | 2026-09-22 | `D-98`, `D-100` |
| **Une vignette de tuile rend son sol à l'objet** : l'ombre portée d'un item est dessinée *dans* son canvas, et sur le fond uni d'une tuile elle ne porte plus — une **flaque d'ombre** en fond de vignette, centrée à 72 % de la hauteur (au milieu, elle entourerait l'objet et le ferait flotter davantage). La vignette de la **fiche** ne la prend pas : sur un grand panneau, ce serait une tache | 2026-09-22 | `D-101` |

| **Le placement tactile a une mesure commune : un écart de 16 px en résolution logique, et le bouton MENU pour repère** — les autres boutons se règlent à partir de lui, et chaque écart se lit dans `ui/hud_layout.js` en une soustraction, jamais recopié en dur. Avec elle : **aucun nombre choisi à l'œil** (le rayon de l'éventail des actions, 28 + 16 + 20 = 64, et son écartement angulaire, 2·asin(26,5/64) ≈ 48,9°, se *déduisent* des deux écarts demandés ; INTERACT est l'unique point équidistant de ses deux voisins sur son axe) — changer un écart doit **redonner des nombres**, pas casser un nombre mémorisé (règle `D-52`). Les quatre boutons masqués avant déblocage sont en **éventail régulier** autour de l'attaque. Cause racine du « ils se marchent dessus » de la tournée du 21/09 : INTERACT était à gauche, donc **dans la zone qui capte le joystick** (`JOYSTICK.limiteX` = toute la moitié gauche) — un doigt posé dessus pilotait aussi le déplacement ; à droite la question ne se pose plus, sans toucher à la règle du joystick | 2026-09-22 | `D-57`, `docs/archives/JOURNAL_2026-09-22_chapitre-tactile.md` |
| **La table de niveaux va jusqu'au Nv.30, et la courbe d'XP n'a pas été retouchée** (consigne de Xav : « je veux voir où elle amène, en combien de temps ») : elle est **prolongée par sa propre règle**, celle qu'elle suit depuis le Nv.5 — +5 XP par palier. 2 340 XP cumulés et 29 points de stats sur la course. Trois fichiers et pas un, parce qu'un flag par niveau franchi est **déclaré** (`flags.js` lève sur un flag non déclaré, donc le Nv.11 coûtait une frame sans lui) et que zéro chaîne n'est en dur. La consigne de la session était « pas de `push`, la version en ligne reste au Nv.10 » ; elle est **caduque depuis le 22/09 au soir** : le `push` demandé pour `D-105` a emporté ce commit avec lui, la table est donc **en ligne**. Effet de bord bénéfique : le mur de `D-97` (un niveau hors table rend l'écran Stats inouvrable) passe du Nv.10 au Nv.30 | 2026-09-22 | `Q-44`, même archive |

| **Un motif de tuile est identique sur CHAQUE tuile de son type — donc tout motif qui se *lit* comme un motif devient un papier peint.** Il n'y a que deux issues, et le choix se fait par surface : un motif **continu d'une cellule à la suivante** (les lames du parquet : la périodicité devient le sujet, un plancher *doit* être régulier), ou un **champ dense de petites marques** sans forme dominante (l'herbe, le gravier du chemin : l'œil n'attrape pas de motif quand la cellule est remplie uniformément). Avec ce grain, les variantes de couleur d'une tuile perdent leur rôle : à ±8 % elles étaient le seul relief du sol, et un damier de carrés de 32 px — ramenées à ±2 %. Et un contrat neuf, verrouillé par test : **le grain d'une tuile NON SOLIDE tient dans sa cellule** (ce qui dépasse est effacé par la tuile suivante à droite et en bas, et peint par-dessus une tuile déjà finie à gauche et en haut — de l'herbe sur le chemin ou sur un mur), tandis qu'une tuile **solide** garde le droit de dépasser : c'est ce qui donne sa hauteur à la forêt. Contrairement à une station (`D-78`), redessiner une tuile ne déplace **aucun** mur : sa solidité est un booléen, pas une boîte englobante | 2026-09-22 | `D-105`, `docs/archives/JOURNAL_2026-09-22_grain-du-sol.md` |
| **Le sol ne coûte rien à l'arrêt, et tout ce qu'on lui ajoute se paie au franchissement d'une tuile** — le calque statique n'est reconstruit que là. Un ticket qui touche au sol se mesure donc **en marchant** (`tools/scenarios/cout_calque.mjs`, deux exécutions du même scénario comparées entre elles, jamais à un relevé du §6 : Chrome y est sans fenêtre, les fps n'ont pas de sens). Le grain du sol a porté une reconstruction de **1,02 à 3,47 ms** pour ×14 primitives, sans une frame au-dessus de 20 ms. Corollaire d'outillage : le **banc visuel ne peut pas juger un sol** — il juge une silhouette sur un fond neutre choisi, or ici l'objet du ticket EST le fond ; ce qu'il faut voir (la répétition sur quinze tuiles, la couture entre deux surfaces, la densité à l'échelle d'un écran) ne tient dans aucune vignette | 2026-09-22 | `D-105`, `D-01`, même journal |

(Les décisions de `05_construction-stations.md` étaient déjà actées par Xav **dans la spec elle-même** avant tout code, v1.0.0 §9 — les lignes ci-dessus n'y renvoient que pour mémoire, elles ne tranchent rien de nouveau.)
| **Le héros est un personnage encapuchonné vu de trois quarts, et la couleur du follet est son VISAGE** (*révise* le corps entier teinté de la Phase 1) : une boule lumineuse logée dans l'ombre de la capuche, avec un glow serré — une lueur, jamais une aura qui éclairerait le sol. Ce qui rend une silhouette lisible à 14 px n'est pas son vêtement mais son **contraste** : un point lumineux dans une masse noire. Et une relation à ne plus contredire : **le héros n'est jamais plus large que ce qui entre en collision** — contrairement à une station, sa hitbox ne dérive PAS du dessin (`RAYON_HERO_BASE_PX × echelle`), donc redessiner ne déplace aucun mur, mais l'ourlet du manteau est calé sur la demi-boîte ; en hauteur il la dépasse librement, la boîte étant son emprise au sol et non sa taille | 2026-09-22 | `D-104`, `docs/JOURNAL_2026-09-22_heros-silhouette.md` |
| **Ce qui doit être exact est exact, ce qui a le droit de traîner traîne.** Un curseur animé se partage en deux : la **tête** est un vrai `cursor: url(…)`, dessiné une fois au démarrage depuis `visuels.json` — donc **exactement** sous le pointeur, vivant **par-dessus les menus DOM** (là où la souris sert) et gratuit par frame ; les **particules et la traînée** vivent sur un calque de recouvrement (`pointer-events: none`), qui a le droit d'être en retard d'une frame puisque c'est une traînée. Deux bénéfices tombent tout seuls de ce découpage : l'orbe **occulte la moitié lointaine de son orbite** sans une ligne de tri de profondeur (le curseur système est composé par-dessus la page), et le calque passe **au-dessus des écrans d'UI**, ce qu'un dessin dans le canvas du jeu ne peut pas faire. Corollaire de lecture : **une capture d'écran ne contient jamais le curseur** — la vignette de l'album est une simulation collée à la main | 2026-09-22 | `D-108`, `docs/JOURNAL_2026-09-22_curseur.md` |
| **Un réglage qui appartient à l'APPAREIL ne voyage pas avec la sauvegarde, et son absence est une valeur.** `settings.graphismes` absent veut dire « je n'ai jamais choisi », donc `auto` — le défaut vit dans le catalogue, une seule fois (patron du volume, `D-64`), et **aucune migration** n'est due, `schema_version` ne bouge pas. À l'import, la machine **reprend les siens** : une sauvegarde exportée d'un PC en « haut » ne l'impose pas au téléphone, et une machine qui n'a jamais choisi ne l'hérite pas non plus. Le moyen est une **liste** (`save.js#REGLAGES_APPAREIL`), pas un `if` : le prochain réglage d'appareil s'y ajoute et nulle part ailleurs. Enfin, le preset **résolu** par Auto n'est jamais persisté — seul le choix du joueur l'est | 2026-09-22 | `D-111`, palier B de `specs/09_reglages-graphiques.md` |
| **Ce qu'un preset a le droit de retirer se déclare en données, sans repli.** Chaque effet de `effets.json` porte un `role` — `cosmetique` (Bas peut le retirer) ou `information` (il dit quelque chose au joueur : le « +1 » qui enseigne la boucle, les paupières de la mort). Champ **requis**, aucune valeur par défaut : un repli « absent = cosmétique » ferait disparaître en Bas le prochain effet qu'on oublierait de classer, et personne ne ferait le lien. Même discipline côté presets : **chaque palier donne une valeur à chaque levier déclaré**, faute de quoi le jeu ne démarre pas, avec le nom du levier. Et « Moyen = l'état actuel » se teste en **propriété** (aucun levier ne s'écarte de la `valeur_neutre` du catalogue), jamais en liste de nombres — le contrat survit à l'ajout d'un levier | 2026-09-22 | même palier |
| **Un système allégé par un preset reçoit un NOMBRE, jamais un preset.** `poussiere.js`, `curseur.js`, `decor.js` et la table de grains que lit `render.js` ignorent qu'un réglage graphique existe : le seul endroit qui connaît le mot « bas » est l'orchestrateur, sur trois lignes. Et **zéro n'est pas une absence** — une réserve de capacité nulle n'émet rien et ne dessine rien, un grain réduit à rien **sort de la table** et le rendu ne le cherche même plus : « le système ne dessine pas » est une **conséquence** de la donnée, pas une branche `if (éteint)` à maintenir. Corollaire pour ce qui reste : un effet `information` n'est touché par aucun preset, et une tuile **solide** n'est jamais allégée (sa silhouette *est* le monde), contrairement à un sol, qui perd son grain mais jamais sa surface | 2026-09-22 | `D-112`, `D-113`, palier C de `specs/09_reglages-graphiques.md` |
| **Un décor réduit est le PRÉFIXE du décor complet, et c'est un contrat, pas une chance.** `genererDecor` tire en séquence ; baisser la densité ne décale pourtant rien, parce que **chaque itération consomme un nombre constant de tirages** — un caillou présent en Bas est donc au même endroit en Moyen et en Haut, sans qu'une position ait eu à bouger. La spec craignait l'inverse et proposait un tirage par tuile comparé à un seuil : ça aurait déplacé **tous** les motifs de la Maison, **y compris sous Moyen**, soit une régression visible au nom d'un défaut qui n'existe pas. Vérifier à la cause avant de corriger vaut aussi pour un remède déjà écrit dans une spec. Ce qui restait à faire n'était pas un correctif mais un **verrou** : le contrat est écrit dans la boucle et tenu par test (préfixe *et* inclusion d'ensembles), pour que le prochain tirage conditionnel ajouté là tombe en test et non sous les yeux de Xav | 2026-09-22 | `D-114`, même palier |
| **Un état d'UI se relit à la source — et la source est celle qui FAIT, pas celle qui enregistre.** La carte Graphismes lit le preset de l'orchestrateur, jamais `save.settings` : sous `?qualite=`, c'est l'URL qui commande, et une carte qui annoncerait « Auto (Bas) » pendant que le jeu rend en Haut serait un mensonge qu'on passe une soirée à ne pas comprendre. Corollaire de texte : un libellé à trou (« Auto (Bas) ») est **une** clé de locale par situation, déclarée en données sur le palier, jamais deux clés qu'un gabarit assemblerait en code — sinon les parenthèses et l'ordre des mots seraient figés pour toutes les langues. Le schéma exige la seconde clé, donc un preset ajouté demain ne peut pas afficher « Auto () » | 2026-09-22 | `D-115`, palier D de `specs/09_reglages-graphiques.md` |
| **Un calque pré-rendu se refait quand la VUE EN SORT, jamais quand on franchit une tuile.** La fenêtre du calque statique portait depuis la Phase 2 une marge de 1,5 tuile en moyenne (une tuile pleine de chaque côté, plus la fraction de `floor`/`ceil`) qui ne servait qu'à couvrir les tuiles coupées au bord : la condition de reconstruction comparait `xDebut`/`yDebut` d'une frame à l'autre, donc un franchissement de tuile reconstruisait un calque qui couvrait encore parfaitement l'écran. La bonne question est celle que `drawImage` pose deux lignes plus bas — **« le rectangle source tient-il dans le calque ? »**, en pixels **physiques** (un test en pixels logiques laisserait passer l'arrondi de `canvas.width`, et une demi-frange vide au bord). Conséquence mesurée, deux exécutions par régime : reconstructions **15 → 8**, et sous bridage CPU ×6 **16 → 8 frames > 20 ms** — il y a **une frame lente par reconstruction**, donc la fréquence *est* la saccade. Le **pic ne baisse pas** : seul le défilement incrémental le ferait. Et la décision est **une fonction pure exportée** que le rendu et les tests appellent tous les deux, jamais une condition recopiée (`D-71`, `D-72`) | 2026-09-22 | `D-01`, palier A de `specs/09_reglages-graphiques.md` |
| **Le stick droit pilote le curseur, et il sort de la couche d'input par un accesseur SÉPARÉ** (`input.pointeurManette()`), jamais dans l'état de verbes : `etat` garde sa forme move + verbes dont `etatNeutre()` dérive génériquement, et c'est ce qui **garantit qu'aucun système de jeu ne lira jamais ce stick** — un pointeur analogique n'est pas un verbe. Conséquence à ne pas manquer : **une page ne peut pas déplacer le curseur du système** (aucune API, et tant mieux), donc au stick l'orbe est dessiné **sur le calque** et la variable CSS passe à `none` — même silhouette, même fonction de dessin, seul le **porteur** change, et le dernier périphérique qui bouge gagne dans les deux sens. Enfin, un déplacement au stick divise la direction par la norme BRUTE et la vitesse par la norme **bornée à 1** : confondre les deux fait aller une diagonale √2 fois trop vite (c'est `D-102` côté clavier, ici corrigeable sans toucher au gameplay) | 2026-09-22 | `D-109`, `docs/JOURNAL_2026-09-22_curseur.md` |
| **La taille de la réserve d'un système de particules suit la VITESSE de ce qu'il suit.** Les 8 bouffées de `poussiere.js` sont calibrées sur un héros à 75 px/s ; une souris les vide en quatre frames, et la traînée devient une grappe clignotante. `capacite` passe donc en données (absente = 8, héros et follet identiques au pixel près). Et l'émission est **interpolée le long du segment parcouru** : toutes les bouffées d'une même frame naissaient au point d'ARRIVÉE, invisible à 1 px par frame, ruineux à 60 — ce qui rend enfin vraie la promesse déjà écrite dans ce module, « l'émission se fait à la distance parcourue » | 2026-09-22 | `D-108` |
| **Le clic droit se verrouille sur le DOCUMENT, jamais sur le seul canvas** : les écrans d'UI sont des éléments DOM posés à côté du canvas (même raison qui fait passer `document.documentElement` en plein écran), donc un garde posé sur le canvas est un garde à moitié posé — et la moitié qui manque est celle où la souris sert. Effet de bord voulu au tactile : l'appui **maintenu** déclenche lui aussi `contextmenu`, donc la bulle « copier / partager » disparaît avec, sans toucher `input/touch.js`. La porte de secours `?souris=libre` ne pose **aucun** écouteur, plutôt qu'un écouteur qui laisse passer | 2026-09-22 | `D-107` |
| **Une silhouette de personnage se juge dans la scène, pas au banc — et la scène lui prête ses couleurs.** Le manteau du héros prend la teinte de la **lumière du follet** (rayon 100 px) : brun chaud avec le feu, gris-bleu avec l'eau. Personne ne l'a codé, c'est le calque de lumière existant. Corollaire : une capture de silhouette de personnage se prend **par compagnon**, sinon elle ne montre qu'un tiers de la vérité (`tools/scenarios/heros_scene.mjs`) | 2026-09-22 | même journal |

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
5 bis. ~~**`specs/08_menus-cartes.md`** (`D-43`)~~ — **les trois paliers et le polish sont livrés, fusionnés dans `main` et en ligne** (21/09, clavier et manette validés par Xav). Restent à Xav : le téléphone (`V-27`, `V-28`, `V-29`), et confirmer ou réviser `Q-36` et `Q-39`. **Premier retour téléphone, 20/09 midi : les menus s'ouvraient à l'échelle 1080p** — `D-48`, corrigé et mesuré le jour même (une seule fonction, en px CSS) ; verdict en jeu dû `V-31`.
6. `D-01` — **palier A livré le 22/09** (`specs/09_reglages-graphiques.md`) : le calque se reconstruit quand la vue sort de la zone pré-rendue, reconstructions et frames lentes **divisées par deux**. Le **défilement incrémental** (remède n° 2, le seul qui baisse le pic) attend la décision de Xav au vu des chiffres. **Paliers B, C et D livrés le 22/09** (`D-111` catalogue + résolution + sauvegarde ; `D-112`/`D-113`/`D-114` les trois leviers, un commit chacun ; `D-115` la carte dans Paramètres et le changement à chaud) ; reste E (Auto). `D-16` (puits) est **close**. Puis reprise de `Q-07`.
7. Ce que Xav doit trancher avant d'aller plus loin sur le contenu : `Q-33` (apparitions de ressources) et `Q-34` (lisibilité de la première nuit dangereuse) — nées du constat d'équilibrage du 19/09 au soir.

Les sept tickets de code du 19/09 (`D-22`, `D-21`, `D-20` A et B, `D-05`, `D-23`) sont livrés — détail et validations restantes dans `docs/DOC_suivi-dettes.md`. En parallèle, côté Xav : `A-06` (Firefox `about:support`, 2 min). `A-07` (profil USB de l'A04) **tombe sans objet** avec `D-31`.

Les captures de la V1 (`docs/captures/v1/`) sont une **inspiration, jamais un cahier des charges** : aucun ticket ne les lit tant que `E-03` (une ligne d'intention par capture) n'est pas rempli.

`Q-10`, `Q-11`, `Q-12`, `Q-24` et `Q-25` restent à trancher avec Xav ; `Q-07` est gelée. La spec de la barre d'action du bas (`E-01`) est écrite par Xav lui-même et attend le chiffrage `Q-11`. **Une spec non écrite ne se commence pas** (même règle que pour une phase).## Journal de session — `specs/09_reglages-graphiques.md`, PALIERS A À D (22/09)

Quatre paliers de `specs/09_reglages-graphiques.md` (arrivée écrite et
décidée, §3), branche `reglages-graphiques`, **un commit par palier** — et
**un par levier** au palier C, comme la spec le demande —, validation de Xav
entre deux.

### Palier A — `D-01` : le calque ne se refait plus à chaque tuile

La marge du calque statique existait **depuis la Phase 2** — une tuile pleine de
chaque côté, plus la fraction que `floor`/`ceil` ajoutent, soit 1,5 tuile en
moyenne — et personne ne s'en servait : la condition de reconstruction comparait
`xDebut`/`yDebut` d'une frame à l'autre, donc un franchissement de tuile
reconstruisait **un calque qui couvrait encore parfaitement la vue**. Le remède
n'ajoute rien, il pose la question que `drawImage` pose deux lignes plus bas —
« le rectangle source tient-il dans le calque ? », en pixels **physiques**.

Mesuré en marchant, deux exécutions par régime (`cout_calque.mjs` ; Chrome sans
fenêtre, les fps n'y ont aucun sens) :

| | reconstructions | moyenne | pic | frames > 20 ms |
|---|---|---|---|---|
| avant, ×1 | 15 | 3,64 ms | 5,70 ms | 0/600 |
| après, ×1 | **8** | 3,65 ms | 4,50 ms | 0/600 |
| avant, ×6 | 16 / 16 | 24,0 / 25,9 ms | 35,2 / 40,3 ms | **16/600** |
| après, ×6 | **8 / 8** | 27,6 / 27,0 ms | 48,8 / 50,0 ms | **8/600** |

Le bridage CPU ×6 est neuf (`chrome.bridageCpu`) et dit une chose nette : **une
frame lente par reconstruction, avant comme après**. Donc la fréquence *est* la
saccade — et **le pic ne baisse pas**, exactement ce que la spec annonçait. Le
défilement incrémental (remède n° 2) reste le seul qui le ferait tomber ; il
attend la décision de Xav, avec son piège déjà nommé (`D-105` : une tuile solide
a le droit de déborder de sa cellule). **`V-58` close le jour même** (« game is
still good »), `D-01` reste ouverte.

### Palier B — le catalogue, la résolution, la sauvegarde (`D-111`)

**Zéro changement visible, et c'est vérifiable autrement qu'à l'œil** : le seul
appel de `valeurLevier` est le contrôle de démarrage — `render.js`, `decor.js`
et `poussiere.js` ne sont pas touchés. Ce qui existe maintenant :
`data/graphismes.json` (les quatre paliers, les trois leviers, les seuils
d'Auto), `src/qualite.js` (pur, LE point de résolution), `role` requis sur
chaque effet, `settings.graphismes` et l'import qui l'ignore.

Trois choses tombent désormais **au démarrage** plutôt qu'en jeu : un palier qui
n'a pas de valeur pour un levier déclaré · un effet sans `role` (aucun repli :
ce que Bas retire est justement ce qui ne dit rien au joueur, donc un effet
oublié disparaîtrait en silence) · un réglage inconnu venu d'une sauvegarde,
qui est résolu comme le défaut **et** signalé (patron de `lireEchelleForcee`).

Le contrat de non-régression est posé en **propriété**, jamais en nombres (règle
`D-52`) : sous Moyen, aucun levier ne s'écarte de la `valeur_neutre` déclarée en
données. Il restera vrai le jour où un levier s'ajoutera — c'est tout l'intérêt.

Et le piège de l'export est traité à la source : **le réglage graphique
appartient à l'appareil**, donc `REGLAGES_APPAREIL` est une *liste* (le prochain
réglage d'appareil s'y ajoute et nulle part ailleurs), l'import reprend la
valeur de la machine, et **l'absence est une valeur** — une machine qui n'a
jamais choisi ne se fait pas imposer le « haut » d'un fichier venu d'un PC.
Aucune migration, `schema_version` inchangée.

### Palier C — les trois leviers branchés (`D-112`, `D-113`, `D-114`)

Un commit chacun, retirable seul. La règle qui les gouverne tous les trois :
**chaque système reçoit un NOMBRE**. `poussiere.js`, `curseur.js`, `decor.js`
et la table de grains que lit `render.js` ignorent toujours qu'un preset
existe — le seul endroit qui connaît le mot « bas » est l'orchestrateur, sur
trois lignes.

`particules` (`D-112`) multiplie les quantités déclarées par les effets
**cosmétiques**, et elles seules : les deux effets `information` du catalogue
sont intouchés dans les trois presets. **Zéro n'est pas une absence** — la
réserve est vide, donc rien ne naît et rien n'est dessiné ; « n'émet pas et ne
dessine pas » est une conséquence, pas une branche de plus. Avec, l'outil de
debug `?qualite=bas|moyen|haut` (même contrat que `?echelle`).

`grain_sol` (`D-113`) coupe la liste des primitives du grain d'une tuile **non
solide**, par la fin — convention écrite dans le schéma des tuiles, et la
coupe est un **préfixe**, vérifié. Un grain réduit à rien **sort de la table**
que reçoit `render.js` : le rendu ne le cherche même plus. Deux immunités
prouvées : la couleur de base (le sol perd son grain, jamais sa surface) et
les tuiles solides (une silhouette d'arbre *est* le monde). Le repli prêt de
`Q-55` est mesuré au passage : `0.2` laisse **3 brins sur 14**.

`densite_decor` (`D-114`) multiplie la densité déclarée par la scène. La
crainte de la spec — « si `decor.js` tire en séquence, le décor se réarrangera
à chaque changement de preset » — a été **vérifiée à la cause, et elle ne se
réalise pas** : le tirage est séquentiel, mais chaque itération consomme un
nombre **constant** de tirages, donc réduire le compte tronque au lieu de
décaler. Le décor réduit est le **préfixe** du décor complet. Il n'y avait
rien à corriger, mais un contrat implicite à rendre explicite : il est écrit
dans `genererDecor` et **tenu par test**. Le remède suggéré par la spec (un
tirage par tuile comparé à un seuil) aurait déplacé **tous** les motifs de la
Maison, **y compris sous Moyen** — une régression visible au nom d'un défaut
qui n'existe pas.

Mesuré en marchant, deux exécutions par régime (`cout_calque.mjs`, désormais
piloté par `RPG_QUALITE`) :

| | coût moyen d'une reconstruction | pic | frames > 20 ms |
|---|---|---|---|
| Bas, ×1 | **1,69 / 1,89 ms** | 3,7 / 5,8 ms | 0 / 1 sur 600 |
| Moyen, ×1 | 6,11 / 5,92 ms | 8,6 / 11,9 ms | 0 / 0 |
| Haut, ×1 | 6,70 / 5,56 ms | 12,8 / 8,5 ms | 0 / 0 |
| Bas, ×6 | **6,29 / 7,36 ms** | 8,6 / 10,6 ms | **3 / 2** |
| Moyen, ×6 | 38,4 / 34,5 ms | 51,2 / 44,4 ms | 8 / 9 |
| Haut, ×6 | 38,8 / 39,0 ms | 73,9 / 76,7 ms | **12 / 13** |

Sur un appareil lent simulé, **Bas divise le coût de reconstruction par ~5 et
les frames lentes par ~4** : c'est exactement ce que le palier visait. Et Haut
coûte ce qu'il promet — même calque que Moyen, mais plus de frames lentes et
un pic bien plus haut, à cause des particules. Assumé : c'est le palier des
machines qui s'ennuient.

L'invariant §4.1 (**un preset ne change jamais le jeu**) est éprouvé sur la
vraie scène Maison, 600 frames identiques dans les trois presets : solidité
relue par `estSolideAuPoint` — la fonction de collision elle-même, jamais une
grille recopiée —, empreintes des stations, héros, monstres, sauvegarde
entière. 121 fichiers verts.

### Palier D — la carte, et le changement à chaud (`D-115`)

Carte `bascule` en **6ᵉ et dernière case** de Paramètres, cycle
`auto → bas → moyen → haut → auto` pris dans l'**ordre du catalogue** :
insérer un preset dans le tableau l'ajoute au cycle sans une ligne de code.

Le libellé est **une seule clé**, jamais deux qu'un gabarit assemblerait ici —
« Auto (…) » composé en code figerait parenthèses et ordre des mots pour
toutes les langues. Chaque palier réel porte donc `cle_etat` **et**
`cle_etat_auto`, la seconde **exigée par le schéma** : un preset ajouté demain
ne peut pas faire afficher « Auto () ».

L'état est relu à la **source**, et la source est l'orchestrateur — pas
`save.settings`. La différence n'est pas théorique : sous `?qualite=`, c'est
l'URL qui commande, et la carte doit dire ce que le jeu **rend**, jamais ce
qui est enregistré.

Changement à chaud (§4.5), prouvé sur le vrai orchestrateur. Ce qui bouge : la
table des grains, le décor de la scène, les réserves de particules (recréées,
donc **vidées** — même geste qu'à l'entrée en scène), et le calque statique
**jeté une fois**. Ce qui ne bouge pas : le héros au pixel près, l'heure du
monde, la sauvegarde — et le preset **résolu** n'est toujours pas persisté.
Le retour en arrière rend exactement l'état d'avant.

Captures aux **trois profils**, cycle complet par clics réels, **aucune erreur
de console** (`tools/scenarios/reglages_graphiques.mjs`). Une réserve à dire :
le profil `telephone` émule la taille et le DPR, **pas** `pointer: coarse` —
il affiche donc « Auto (Moyen) » là où un vrai téléphone dirait « Auto (Bas) ».
Limite de l'outil, pas du code ; seul `V-61` peut la lever.

**Paramètres est plein** : les six cases sont prises, et une 7ᵉ ne rentre dans
aucune grille — l'écran serait vide. Consigné, non traité (décision 5).

Et une chose que les captures ont montrée et que la spec n'avait pas prévue :
en Bas, **le parquet de la Maison perd ses lames**. Dehors un aplat d'herbe
reste de l'herbe ; dedans, la lame *est* la lecture de la surface. `Q-59`.

Reste le palier E : Auto — signal de départ, descente mesurée, annonce.

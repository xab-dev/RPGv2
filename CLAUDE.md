# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État actuel du dépôt

**Le jeu est en ligne : `https://xab-dev.github.io/RPGv2/`** (GitHub Pages, servi depuis `main`). **Un `push` sur `main` publie le jeu** : ce n'est plus une sauvegarde, c'est une mise en ligne. Les `push` restent à la main de Xav. Les vérifications sur téléphone se font par cette URL.

**Dernière publication : `v0.8.0`, le 25/09.** `annexe-1` (spec 14) et `torche-vacillement` (`D-218`, `D-219`, SD_torche) ont été fusionnées dans `main`, chacune par un commit de fusion, et poussées à la demande de Xav. Les branches restent, mais tout le travail qu'elles portaient est dans `main`. Un correctif tenu à part d'une spec en cours part de `main` sur sa propre branche, et prend ses identifiants **après** ceux de la branche en cours, pour qu'aucun doublon n'apparaisse à la fusion.

**Les fondations sont closes avec la session du 23/09** (`Q-20` : le critère fixé par Xav était cette session de tri et de ménage). Livré et validé en jeu : Phases 0 à 3 (la Grotte, la Région Maison dehors et dedans), le chantier Construction (`specs/05`), le polish post-Construction, le chaos nocturne (`specs/07`), les menus en cartes (`specs/08`), les réglages graphiques (`specs/09`) et la file « inventaire survivaliste ». L'histoire de ces étapes est dans `docs/archives/INDEX.md` ; l'ancien en-tête de ce fichier, qui la racontait, est archivé tel quel dans `docs/archives/CLAUDE_etat_2026-09-23.md`.

**Ne se reprend jamais par initiative** : la lumière du follet (`D-35`, ticket annulé par Xav le 20/09 ; le rayon de 100 px est une valeur d'essai posée par lui, pas une décision).

**Rendu et plateformes.** Chrome est le navigateur de développement, de jeu et de référence (`docs/DOC_navigateurs.md`) ; aucun engagement sur Firefox ni Safari (`Q-24`). Sur PC sous Chrome, aucune frame sautée jusqu'à l'échelle forcée 8 (`R-11`) ; relevés de base `R-14` (jour) et `R-03` (nuit). Le Galaxy A04 est un banc d'épreuve, pas une cible (`D-31`, `Q-57`) ; le plancher mobile se nommera sur le téléphone du neveu (`D-14`, `V-10`).

**Ce qui reste dû (dettes, questions, validations) vit dans `docs/DOC_suivi-dettes.md`, et nulle part ailleurs.**

Historique complet des sessions : **`docs/archives/INDEX.md`** — un fichier par session archivée, contenu verbatim (source de vérité en cas de doute sur le détail d'une décision passée). Le journal de la session la plus récente vit dans `docs/JOURNAL_AAAA-MM-JJ_*.md` jusqu'au ménage de la session suivante, qui l'archive.

- `specs/00_ROADMAP.md` — brief autonome à lire en entier en premier. Contexte projet, décisions déjà tranchées (à ne jamais rouvrir), contraintes de méthode, détail de la phase en cours.
- `specs/01_socle-technique.md` à `specs/09_reglages-graphiques.md` — specs détaillées des phases et chantiers, tous livrés (`ls specs/`).
- `docs/carte_mentale_RPG_V2_v1_7_0.md` — décisions produit/techniques verrouillées (§0, §8) et règle d'architecture directrice (§7).

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
- **Un écran d'UI est « ouvert » si et seulement si son état logique le dit ET qu'il est réellement visible (DOM affiché) ; un écran que le routage des verbes ne peut pas interroger par un accesseur n'existe pas pour lui.** Jamais deux définitions d'« ouvert » qui cohabitent, jamais un « il est fermé » *déduit* après coup d'un autre signal. Née des écrans orphelins du 17/09 (`docs/archives/JOURNAL_2026-09-17_ecrans-orphelins.md`) : `menu.estOuvert()` combinait un booléen pur pour le menu Pause et « booléen ET visible » pour les autres écrans, et le joueur se retrouvait devant un menu invisible qui captait le stick, ou un écran visible que plus rien ne pilotait. Depuis `specs/08_menus-cartes.md` (palier B), la pile du menu (`menu_cartes.js#creerNavigationEcrans`) tient la règle **par construction** ; elle s'applique à tout écran ou mode qui naîtrait hors de cette pile. Promue en contrainte par Xav le 23/09 (`Q-10`).
- **Le rendu canvas n'est jamais exercé par les tests headless** — toute vérification visuelle revient à Xav dans un vrai navigateur, à la manette.
- **Toute composition de calque qui touche la transform du contexte 2D passe par une fonction unique qui la restaure** (`save`/`restore` ou re-`setTransform` en fin de fonction, commenté pourquoi) — jamais de `setTransform` inline dans `main.js#dessiner()`. Née du diagnostic dialogues invisibles (`docs/archives/JOURNAL_2026-09-15_diagnostic-dialogues-invisibles.md`) : un calque qui lit `ctx.canvas.width/height` pour se positionner alors qu'une transform logique→physique est active double la mise à l'échelle, sans qu'aucun test headless ne puisse l'attraper. **Tout ticket touchant `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou `main.js#dessiner()` se clôt par une validation en jeu de Xav, guidée par `docs/CHECKLIST_visuelle.md`** — même quand le ticket prétend ne toucher qu'un seul de ces fichiers en isolation. *Révisé le 2026-09-19 (décision `Q-15`)* : la capture par état n'est plus exigée pour clore un ticket — la checklist reste la liste de ce que Xav regarde, et les captures deviennent un **album de référence** pris à chaque clôture de phase ou de chantier (six vues fixes dans `docs/captures/AAAA-MM-JJ_jalon/`, annexe B du suivi).
- **Un renommage/retrait de contenu de catalogue (ex. id de scène) n'est jamais couvert par la migration de *schéma*** (`save.js#migrer`) — c'est une classe de bug distincte (données valides mais obsolètes) à traiter explicitement à chaque retrait. Née du repli sur `scene_grotte_salle_1` (`docs/archives/JOURNAL_2026-09-15_phase1-grotte.md`), reproduite ensuite par la migration 2→3 de la Région Maison (`docs/archives/JOURNAL_2026-09-16_phase2-premiere-marche.md`).
- **Ménage de journal en début de session, avant tout code** : archiver le journal présent dans `docs/archives/`, mettre à jour `docs/archives/INDEX.md`, reporter dans les sections consolidées de ce fichier ce qui en relève (décision, règle, `[OUVERT]`, dette), puis seulement travailler. `CLAUDE.md` ne contient jamais plus d'un journal de session. Plafond indicatif : 300 lignes. Née du ménage du 2026-09-17 (`DOC_menage-claude-md_2026-09-17.md`) : le fichier avait atteint ~22 000 mots / 920 lignes, coûtant plus de contexte qu'il n'apportait d'utilité.
- **Un sous-système explicitement "meilleur effort" (le contrat dit déjà : fichier absent → le jeu tourne sans son) rattrape ses propres erreurs à la frontière de son API publique, jamais au niveau de la boucle de jeu.** Née de `docs/archives/JOURNAL_2026-09-17_diagnostic-freeze-musique.md` : une exception dans `audio.js` (contexte/gain `null` à la reprise depuis le menu) est remontée non rattrapée jusqu'à `creerBoucle#frame` (`render.js`), qui ne se replanifie plus après une exception — jeu figé, manette/clavier morts (polling interne à `maj()`), souris vivante (DOM indépendant du `requestAnimationFrame`). Le remède reste local au sous-système fautif (`try/catch` dans `audio.js`, jamais un `try/catch` global autour de `update()`/`dessiner()`, qui masquerait aussi de vraies erreurs de gameplay) — le patron vaut pour tout sous-système dont l'absence est tolérable (plein écran, clic droit, curseur, icônes), **jamais pour le gameplay** (un bug doit se voir, la boucle le journalise et survit, `D-71`) **ni pour la sauvegarde**, dont l'échec doit être dit au joueur (`D-139`) — tranché par Xav le 23/09 (`Q-12`).
- **Un relevé de performance cite son navigateur, et deux relevés pris sous des navigateurs différents ne se comparent pas.** La référence est **Chrome** (Xav y développe, y joue et y valide). Sous Chrome le dessin part au GPU : `dessiner()` n'y mesure que l'**émission** des ordres, et le seul signal de fluidité est **« frames sautées »**. Sous Firefox le dessin s'exécute sur le fil principal : `dessiner()` y mesure le dessin réel, ce qui en fait un bon **banc de mesure du coût par calque**, jamais un verdict de fluidité. Née des relevés du 2026-09-19 au soir (`R-05` à `R-11`), où la même build passait d'injouable à 60 fps sans qu'une ligne de code change. Registre : `docs/DOC_navigateurs.md`.
- **Le budget de la carte se vérifie de temps en temps, jamais à chaque ticket** (décision de Xav, 25/09, `Q-159`, qui *remplace* `Q-156` et la règle de la spec 13) : « on écrit, on avance, on corrige les bugs, et de temps en temps on vérifie notre budget perf » ; « je préfère faire des bêtises, devoir corriger, et apprendre, plutôt que de regarder un test se rejouer pendant toute la journée ». **Aucun banc par palier, aucune capture Chrome par défaut** : Xav joue, c'est lui qui voit. **Le banc complet** (`tools/scenarios/cout_calque.mjs` et `traversee_nuit.mjs`) tourne **à la fin d'une spec, ou quand Xav part dormir** ; quand il est réveillé, on avance. **Une sentinelle** (`traversee_nuit.mjs` en Moyen, ×1 et ×6) est permise **en milieu de spec**, pour s'assurer qu'on n'a rien cassé — jamais une heure par palier. Une régression se retrouve ensuite commit par commit. Les chiffres de référence restent ceux du dernier banc complet (nuit du 25/09, après les paliers G et H : `docs/archives/JOURNAL_2026-09-25_annexe1-nuit.md` §4). Le contrat tenu par `tests/test_budget_carte` ne change pas : une frame et une reconstruction dépendent de ce qui est à l'écran, jamais de la taille de la scène ; seule l'entrée en scène suit la taille de la carte, sous un plafond en données (`graphismes.json > budget_carte`, `Q-134`).
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
│   │                       portailFranchi() ; `puzzle(id)` (`D-121`) — LE point de
│   │                       résolution d'un interactif, catalogue OU instance créée en jeu
│   ├── camera.js           bornée sur grande scène, centrée sur scène plus petite que le viewport
│   ├── decor.js            décor procédural pondéré (PRNG mulberry32) + couleurTuile (variantes/teinte)
│   │                       + `tuileDeSol` (`render.sol`, une tuile-objet posée sur une surface),
│   │                       `varianteTuile` (le dessin et le miroir d'une case, hash à sel propre)
│   │                       et `lumieresDuDecor` (les halos des motifs lumineux, dérivés du tirage)
│   ├── render.js           résolution logique/physique (DPR) — `echelleDepuisCanvas` est LA
│   │                       dérivation de l'échelle, relue par tous les calques ; `?echelle=N`
│   │                       (debug, `D-23`) la remplace en un seul point et ne touche jamais la
│   │                       présentation à l'écran ; fenêtrage du calque statique
│   │                       tuiles+décor, obscurité par scène (voile+faisceaux+halos), paupières
│   │                       d'intro, HUD/dialogue/anneau/aura — jamais testés headless au-delà
│   │                       des fonctions pures (résolution, fenêtrage)
│   ├── tampons.js          `specs/13` palier B : les TAMPONS du calque statique — clé, boîte de
│   │                       dessin (ombre et traits compris), cache ; pur. render.js trame chaque
│   │                       dessin de tuile une fois et le POSE à un pixel physique entier ; le
│   │                       décor reste vectoriel. `calque_identique.mjs` compare au pixel (`Q-135`)
│   ├── defilement.js       `specs/13` palier C : le DÉFILEMENT du calque — `planDefilement` (ce qui
│   │                       se recopie, ce qui se repeint), `rayonInfluence` (jusqu'où une case peint
│   │                       chez ses voisines, DÉDUIT des dessins) et le décor rangé par case ; pur.
│   │                       render.js peint puis recopie, sur deux canvas en ping-pong
│   ├── champ.js            `specs/13` palier F : le TRI PAR LE CHAMP — un monstre, un interactif,
│   │                       un objet au sol, une lumière ou un surlignage hors de la vue ne se
│   │                       dessinent pas ; jugé sur ce qui se PEINT (`tampons.js#boiteDessin`, un
│   │                       halo par son disque), jamais sur la position seule ; pur
│   ├── lisieres.js         `specs/13` palier D (`Q-52`) : les LISIÈRES — qui déborde sur qui
│   │                       (`tiles.json > render.lisiere` : rang, bord, coin), et les POSES
│   │                       qu'une case reçoit (`lisieresCase`) ; pur. Une lisière se dessine
│   │                       DANS la case qui la reçoit, entre son grain et son objet
│   ├── visuels.js          dessinerVisuel() : seul point qui interprète `data/visuels.json`
│   │                       (primitives + teinte/alpha/échelle/rotation)
│   ├── intro.js            2 machines à états pures : intro (clignements+orbite, ≤8s) et départ
│   │                       (follets non élus qui repartent) — propre à la Grotte, pas un moteur
│   │                       de cinématiques généralisé
│   ├── save.js             double tampon, versions + migrations (v7 : le contenu du coffre
│   │                       descend dans l'instance qui le porte ; v8 : `hero.alignement` écrit
│   │                       à 0 ; v9 : `hero.competences`, ce qui est rangé où), reinitialiserSauvegarde()
│   ├── alignement.js       `specs/10` : l'alignement CACHÉ — `regime` (LE calcul du régime et du
│   │                       palier), bornage, `lireAlignement` (absence = échec dur, jamais 0),
│   │                       `?alignement=N` ; seul écrivain : `main.js#modifierAlignement`
│   ├── flags.js            registre de flags + conditions all/any/not + `initial` (persistance)
│   │                       ; `{ valeur, egal }` compare une valeur NOMMÉE (`a_portee`, spec 14) ;
│   │                       `retirer` (seule la remise à zéro d'une descente s'en sert) ; `?flags=a,b`
│   │                       (debug) : tenus pour vrais, jamais sauvegardés
│   ├── descente.js         spec 14 : la DESCENTE sous une stèle — l'Annexe = la scène d'arrivée et
│   │                       tout ce qu'on atteint par ses portails parmi les scènes qui déclarent
│   │                       `descente: { flags }` ; LES flags que l'entrée par la stèle remet à zéro, et
│   │                       ses interactifs (leviers), dont l'état vit dans `save.puzzles` — pur
│   ├── stats.js            stats primaires + dérivées (formule linéaire) + modulateur de survie
│   │                       (`appliquerModulateurSurvie`, Phase 3)
│   ├── status.js           effets d'état (buff/dot/debuff/contrôle) + buffs temporaires du héros
│   │                       ; `resoudreSynergie` (`specs/10` palier C) : LE point de résolution
│   │                       d'une synergie sous un régime d'alignement — effets héros (stat,
│   │                       dérivée, brûlure) et effets de monstres dans l'aura, depuis
│   │                       `synergies.json#regimes` seul
│   │                       (`tickBuffsActifs`/`ajouterBuffActif`, Phase 3), un seul chemin de calcul
│   │                       ; un SOIN est un buff sur `pv` (`tickSoinsBuffsActifs`, 23/09) et
│   │                       `iconeBuffBandeau` est LE choix de l'icône d'un buff (toujours celle d'une stat)
│   ├── entities.js         héros/monstres : PV, position, mort/respawn
│   ├── combat.js           auto-attaque annulaire, cooldown, feedback (anneau/flash/barre de PV)
│   ├── companion.js        follet : suivre/engager/poste (spec 14 : posé sur ce qu'on lui confie,
│   │                       sa cible dans l'état), position (+ lumière collée)
│   │                       ; amortissement en temps réel (`D-53`), facteur d'orbite signé que
│   │                       l'alignement fait glisser (`specs/10` palier B) — reçoit un SIGNE,
│   │                       jamais la sauvegarde
│   ├── loot.js             résolution de loot table (PRNG injectable)
│   ├── puzzles.js          types `levier`/`sequence`/`station_placeholder`/`station`, et (spec 14)
│   │                       `levier_maintenu` (allumé tant qu'on le tient) + `simultane` (instances en
│   │                       données) — `station` référence un TYPE de `stations.json` (rôle/capacité,
│   │                       + `placable` depuis `05_construction-stations.md`)
│   ├── placement.js        `05_construction-stations.md` : grille intérieure, chevauchement, BFS de
│   │                       praticabilité du couloir, `poseValide()` — pur, aucun id en dur
│   ├── resources.js        tuiles-ressources bloquées, `peutRecolter` branché sur la poche réelle
│   │                       depuis Phase 3 (outil requis)
│   ├── inventory.js        poche ET coffre : `ajouterItem`/`retirerItem`, plus la CAPACITÉ
│   │                       (`D-118`) — `resoudreCapacite` est LE point de résolution (slots, pile,
│   │                       et le `filtre` que le porte-outils attend), `pileEffective` dit que la
│   │                       pile appartient au conteneur et que l'objet ne fait que l'abaisser,
│   │                       `slotsOccupes` que les slots sont une CONSÉQUENCE du contenu (la
│   │                       besace y ajoute ses `bonus` sous condition, 23/09), et
│   │                       `normaliserContenus` rattrape une vieille sauvegarde sans rien perdre
│   │                       en silence
│   ├── cooldowns.js        Phase 3 : cooldowns en temps actif, réutilise l'horloge de daynight.js
│   │                       (`save.monde.heure`, désormais avancée dans toutes les scènes)
│   ├── recipes.js          Phase 3, Palier A : `peutFabriquer`/`fabriquer`, catalogue `recipes.json`
│   │                       ; `trierRecettes` (24/09) : LE tri de l'écran Craft — type (ordre de
│   │                       `recipe_categories.json`), puis coût total, puis nom
│   ├── survival.js         Phase 3, Palier C : jauges faim/soif, modulateur, malus de respawn
│   ├── xp.js               Phase 3, Palier D : XP → niveaux (`levels.json`) → points de stats
│   │                       ; `flagDeNiveau` : LE nom du flag d'un niveau (exigé au boot pour
│   │                       chaque niveau) ; `crediter` part du niveau CRÉDITÉ, jamais repris (spec 14)
│   ├── ground_items.js     objets au sol par scène (spawn, ramassage, respawn différé Phase 3) ;
│   │                       + les objets JETÉS par le joueur (`D-145`), tenus à part du semis
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
│   ├── dialogue.js         file de lignes, machine à écrire + armement anti-spam, résolution locuteur ;
│   │                       `specs/11` : la CONVERSATION (nœuds, options, spam compté, lecture,
│   │                       résultat ordonné) — pure, n'écrit rien : `main.js#appliquerResultatDialogue`
│   │                       est le seul qui applique
│   ├── hints.js            indices de commande (specs/04_indices-commandes.md) : un seul affiché
│   │                       à la fois, montré une fois par partie (flag persisté), fermé dès
│   │                       l'émission effective du verbe — pur, ignore i18n/DOM
│   ├── effets_monde.js     `specs/11` §5 : les effets de monde (un NOM qui dure, `toit_occulte`,
│   │                       `coffre_apparence_vide`), posés par un dialogue, lus par le système
│   │                       concerné — état de SESSION, jamais sauvegardé ; catalogue
│   │                       `data/effets_monde.json` (`dialogue_fin` : ce que le follet dit quand
│   │                       l'effet se lève, ouvert par `main.js#avancerEffetsMonde`)
│   ├── texte_flottant.js   retour de gain dans le monde (« +1 Bois ») : réserve fixe, fusion des
│   │                       gains d'une même frame — pur, ne connaît ni item, ni i18n, ni canvas ;
│   │                       transporte des CLÉS, l'appelant compose le texte au rendu
│   ├── spawns.js          `specs/07` : où un monstre a le droit de naître, et sa position tirée
│   │                       (PRNG à graine, même discipline que ground_items.js) — pur
│   ├── comportement_monstres.js  `specs/07` palier C : « un domaine, pas un piquet » — machine
│   │                       à états PURE, dit où le monstre veut aller ; main.js fait le mouvement ;
│   │                       `deciderTireur` (spec 14, comportement `distance`) : recule, s'approche, tire ;
│   │                       `deciderBoss` (comportement `boss`) : un mode tiré au sort parmi ceux des
│   │                       données (agressif, kite = le tireur, errance), gardé quelques secondes
│   ├── projectiles.js      spec 14 : LES tirs — réserve fixe, ligne droite, arrêt au mur, cible d'un
│   │                       AUTRE camp touchée une fois ; un seul chemin de collision pour tout ce qui
│   │                       tire (cracheurs, Gardien, compétence) — pur ; dessinés après le voile ;
│   │                       `viseesSalve` : une salve en éventail (`attaque_distance.salve`) ; un tir à zone
│   │                       (`zonePx`) éclate au contact, au mur ou au bout de sa course
│   ├── competences.js      spec 14 palier G : les COMPÉTENCES — charge (le follet engage), recharge, hâte,
│   │                       la cible, et LE point de résolution des dégâts (Force × puissance d'Esprit ×
│   │                       multiplicateur, B1) ; palier I : RANGER (quitter l'ancien emplacement, remplacer
│   │                       sans échanger), la valeur `competence_en_<emplacement>` du HUD ; pur.
│   │                       `main.js#competencesEquipees` lit ce que le joueur a rangé (`save.hero.competences`)
│   ├── fondu_scene.js      spec 14 palier H : le fondu au noir d'un portail qui le déclare (`fondu_ms`) —
│   │                       la scène change une fois, au plus noir ; pur
│   ├── parchemin.js        spec 14 palier G : l'écriture du parchemin, un signe à la fois — pur ; la vue
│   │                       (temps, fondu, particules) est celle de la stèle, dessinée par `ui/ecran_parchemin.js`
│   ├── rencontre.js        spec 14 : LA RENCONTRE d'une salle (Zéros), déclarée sur la scène — quand
│   │                       elle démarre ou se raccourcit, ses phases (apparition, combat, fin,
│   │                       effacement), le plancher de sa cible ; pur. main.js fait naître, relève,
│   │                       ouvre les dialogues ; un intouchable ne perd rien (`entities.js`)
│   ├── ambiances.js        `D-61` : lignes d'ambiance par palier (narration diffuse, jamais un
│   │                       objectif affiché), déclenchées par conditions en données
│   ├── visibilite.js       `D-62` : le filtre anti-spoil — une entrée verrouillée est INVISIBLE
│   ├── vol_follet.js       `D-39` : la petite orbite du corps du follet autour de son point logique
│   ├── bascule.js          `D-158` : le geste d'un levier dans le temps (butée, dépassement, voyant
│   │                       à la butée, halo en fondu) — pur, un état d'AFFICHAGE jamais sauvegardé
│   ├── logo.js             le symbole du jeu (« la sagesse pour tout et pour tous », Xav) : son
│   │                       apparition signe après signe, dans l'ordre de lecture — pur ; dessiné par
│   │                       `render.js#dessinerLogo` (trois calques d'`images/logo/`, meilleur effort)
│   │                       avant le cold-open et, discret, à la montée de niveau
│   ├── prologue.js         `specs/12` : les écrans de texte AVANT le symbole (pas de quête, pourquoi
│   │                       c'est un jeu de rôle) — pur : fondu, appui armé, écran suivant ; écrans et
│   │                       durées dans `data/prologue.json`, dessinés par `ui/ecran_prologue.js`
│   ├── indices.js          les Indices du menu (23/09) : un indice illisible s'écrit en hiéroglyphes
│   │                       (brouillage déterministe, alphabet dans `data/indices.json`) ; le
│   │                       DÉCHIFFREMENT (spec 14) : un signe à la fois, dans l'ordre de lecture — pur
│   ├── stele.js            la vue rapprochée d'une stèle (23/09) : temps, armement, particules, et
│   │                       la sortie qui DESCEND (spec 14, `demanderDescente`) — pur
│   ├── polices.js          `specs/12` : LES polices embarquées (`fonts/`, OFL) et leur chargement
│   │                       `FontFace` au démarrage — « meilleur effort », repli `serif`
│   ├── poussiere.js        traînée de poussière (héros, follet) : réserve de bouffées à capacité
│   │                       en données, émission interpolée le long du segment parcouru
│   ├── ornements.js        `D-134` : étincelles et halo qui respire (réglage Haut) — reçoit un
│   │                       NOMBRE (le levier `ornements`), jamais un preset ; le vacillement
│   │                       d'une flamme (`facteurVacillement`) ; `FREQUENCE_MAX_HZ` (`D-219`) et
│   │                       `rythmeLumineuxHz` : aucun effet du catalogue ne bat au-delà de 3 Hz
│   ├── combustion.js       `specs/15` : ce qui BRÛLE (la torche) — quand (phases du cycle), la file
│   │                       des objets entamés de la poche, s'éteindre, prendre, rendre — pur ;
│   │                       `flammesAffichees` (`D-218`) : LA liste des flammes à l'écran, graine fixe ;
│   │                       `save.inventaire.combustion` et `save.monde.objets_plantes` sont
│   │                       facultatifs (absents = rien), aucune migration
│   ├── qualite.js          `specs/09` : LE point de résolution des réglages graphiques ; les
│   │                       systèmes reçoivent une valeur de levier, aucun ne lit graphismes.json
│   ├── plein_ecran.js      `D-30` : plein écran au premier relâchement tactile + bascule du menu,
│   │                       « meilleur effort » (loquet en un seul endroit)
│   ├── debug_perf.js       instrument `?debug=fps` : tampon circulaire pré-alloué, agrégats — pur ;
│   │                       la surcouche DOM est ui/hud_debug.js, qui n'existe que sous `?debug=fps`
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
│                           + hud_hints.js + dialogue_box.js (`D-169` : portrait du follet qui parle,
│                           lueur des flèches en Moyen, étincelles en Haut — habillage résolu par
│                           `main.js#habillageDialogue`) + hud_layout.js (canvas, résolution logique)
│                           + cadre.js (`D-163` : LE cadre des calques d'UI canvas, bulle et indices)
│                           + barre.js (`D-165` : LA barre de jauge — bandeau ET PV des monstres)
                           + ecran_stele.js (la stèle en gros plan : pierre, gravure qui luit, particules)
                           + ecran_parchemin.js (le parchemin du coffre : rouleau, lettres d'or qui s'écrivent)
├── fonts/                 polices embarquées (Almendra, Uncial Antiqua), licence SIL OFL 1.1 à côté
├── images/logo/            les trois calques SVG du symbole, CUITS par
│                           `docs/captures/logo/generer_logo.mjs` (seule source de la géométrie,
│                           validée telle quelle par Xav le 23/09 : elle ne se retouche pas)
├── data/                   catalogues JSON (voir specs/*.md §2.1 de chaque phase) — dont
│                           `conteneurs.json` (`D-118`) : les quatre nombres de la poche et du
│                           coffre, en un seul endroit, tous PROVISOIRES
├── locales/fr.json, en.json
├── specs/                  00_ROADMAP.md, 0N_*.md par phase
├── docs/                   DOC_suivi-dettes.md (registre vivant : LA liste de ce qui est dû) +
│                           carte_mentale_RPG_V2_v1_7_0.md + fiches de diagnostic/ticket actives
│                           (SD_*.md, MT_*.md, NS_*.md, CHECKLIST_visuelle.md) + archives/
│                           (journaux de session clos, fiches et NS closes) + captures/
│                           (album de référence par jalon)
├── prive/                  IGNORÉ par Git, jamais publié : sauvegardes/ (sauvegardes réelles
│                           exportées par Xav, servent aux migrations — existe sur son PC seulement)
├── tests/                  un fichier par contrat/diagnostic, headless, `node:assert/strict`
└── tools/                  run_tests.js (lance tous les tests/*.js, = `npm test`) + mesure_rythme.mjs
                            (`R-19` : combien de temps de JEU pour atteindre un niveau, et d'où vient
                            l'XP — un INSTRUMENT, jamais un test : un bot « vétéran » joue une partie
                            neuve sur le vrai orchestrateur, et le temps compté est le temps de jeu
                            ACTIF) + des outils de DEV
                            jamais chargés par le jeu : banc_menu_cartes.html (le composant seul,
                            sur le vrai catalogue), cadre_viewport.html (viewport imposé ; `&pas=oui`
                            = boucle de jeu avancée à la main, pour un onglet masqué) et
                            capture_chrome.mjs + scenarios/ (Chrome SANS FENÊTRE piloté par CDP,
                            zéro dépendance : vrais pixels sous les TROIS profils de
                            `scenarios/commun.mjs#PROFILS` — 703 × 280 et 1920 × 1080 à DPR 1, plus
                            `telephone` 780 × 360 à **DPR 3** (`D-48`) ; profil Chrome jetable —
                            la sauvegarde de Xav n'est jamais touchée ; les images produites ne sont
                            PAS versionnées : un scénario nouveau écrit sous docs/captures/scenarios/,
                            cf. .gitignore) et banc_visuel.html
                            (`?id=a,b,c` : une ou plusieurs entrées de `data/visuels.json` rendues
                            AUX TAILLES RÉELLES du jeu — monde à DPR 1 et 3, tuile de la Poche —
                            puis agrandies au plus proche voisin ; agrandir la transform
                            épaissirait les traits avec, et ferait juger une image que personne ne
                            voit)
```

`registry.js`/`save.js` restent purs (aucun accès disque/réseau/DOM) : les adaptateurs (`io_node.js`/`io_navigateur.js`, `storage_indexeddb.js`/`creerStoreMemoire()`) leur fournissent des données déjà prêtes. Convention d'`id` : minuscules, `_` comme séparateur, préfixé par la catégorie au singulier (`tile_sol`, `elem_feu`). Un `id` dupliqué ou une référence croisée cassée = échec dur au boot avec le chemin exact de l'erreur.

## Décisions produit verrouillées (ne pas rouvrir)

Détail complet dans `docs/carte_mentale_RPG_V2_v1_7_0.md` §0 et §8. Points structurants pour le code :

- 3 éléments (Feu/Eau/Terre), extensibles en données uniquement.
- 4 stats primaires : Force, Agilité, Vitalité, Esprit. Tout le scaling de dégâts part de la Force ; l'élément porte le type/les interactions, jamais la puissance brute. **Esprit amplifie les compétences** (révisé le 24/09) : un coefficient sur la Force des compétences, et une hâte qui raccourcit charge et recharge — jamais de dégâts sans Force.
- 5 slots d'action (1 attaque + 3 skills + 1 consommable), 3 slots d'équipement (arme/armure/accessoire) — nombres déclarés en données.
- Progression sur deux axes indépendants : XP → stats (combat et craft), jalons narratifs → capacités.
- Système de recettes unique ; stations et catégories de sortie en données.
- Cartes : tuiles réutilisables, layout écrit à la main (ou via script d'aide, jamais génération procédurale de layout jouable) + décor non-collisionnant procédural à graine fixe.
- Narration diffuse, aucun journal de quêtes, aucun objectif affiché ; un journal de découvertes existe (ce qui a été trouvé, jamais ce qu'il faut faire).
- Périmètre M1 fermé : Grotte-tutoriel → Région Maison → 1ère zone de monstres → Château → Boss 1 → Poste avancé. Console/cartouches/Codex = M2+. **L'alignement est en M1** (révisé le 23/09, voir la table ci-dessous).

Décisions datées, nées en cours de développement (détail dans l'archive citée ; une décision révisée n'apparaît qu'en version finale).

**Les décisions du 15 au 22/09 sont dans `docs/archives/decisions_archives.md`, verbatim — archivées ne veut pas dire révisées : elles restent toutes en vigueur** (Xav, 23/09 : `DOC-07`, puis le ménage du dépôt). Une décision nouvelle s'ajoute à la table ci-dessous. Parmi les archivées, celles qui règlent la façon d'écrire le code, à relire avant un ticket qui touche leur terrain :

- **Tests** : un test n'épingle jamais une valeur de réglage, il vérifie un contrat · un harnais ne réimplémente jamais ce qu'il éprouve · un instrument de rythme n'est pas un test.
- **`main.js`** : ce que `demarrerJeu` et `creerOrchestrateurGrotte` partagent se déclare au niveau module · une charge utile s'enrichit, elle ne se refabrique pas — une entrée de sauvegarde non plus · la boucle de jeu survit à une exception (journalisée, jamais masquée) · un garde-fou de données se pose au démarrage, pas dans la boucle de dessin · un état d'UI se relit à la source qui FAIT.
- **Données** : un système allégé par un preset reçoit un NOMBRE, jamais un preset · zéro n'est pas une absence · ce qu'un preset retire ou ajoute se déclare en données, sans repli · un réglage d'appareil absent est une valeur (aucune migration) · une ligne de lore interroge un état du monde, jamais un état de lore.
- **Inventaire** : la pile appartient au conteneur, les slots sont une conséquence du contenu · un slot d'équipement se revalide à chaque frame, avant toute UI · un coffre = un type + une pose + un contenu, et `scene.puzzle(id)` est LE point de résolution d'un interactif.
- **UI et input** : une vue partagée s'efface avant de se remplir · une carte de menu est un `<div>`, jamais un `<button>` · le menu entier est une pile · une variable CSS se lit en pixels CSS (conversion ÷ DPR en un seul point) · un pointeur analogique sort de la couche d'input par un accesseur séparé, jamais dans l'état de verbes.
- **Dessin** : redessiner une station, c'est déplacer un mur (inclusion prouvée par test) · une silhouette se juge à la taille du jeu, en scène · on ne régénère pas un dessin validé en jeu · retoucher un visuel partagé avec un hors-périmètre, c'est lui en donner un propre · un motif de tuile se lit comme un papier peint, sauf continu ou dense · une surface redessinée à chaque frame se pose par motif répété · un calque pré-rendu se refait quand la vue en sort · un décor réduit est le préfixe du décor complet.

| Décision | Date | Détail |
|---|---|---|
| **Toute stat primaire a au moins une dérivée**, et un système lit la dérivée, jamais la stat brute — les dégâts lisaient la Force brute, donc la Force n'avait aucune formule à régler en données. Tenu par test sur le catalogue réel | 2026-09-23 | `D-141` |
| **Ce que le joueur pose au sol n'est pas du semis** : les objets jetés vivent à part (`save.monde.objets_jetes`), ne comptent pas dans `nb_au_sol`, ne repoussent pas, ne disparaissent pas à l'aube, et **ne rapportent aucune XP** quand on les reprend. Une tuile de sol a une capacité, déclarée comme un conteneur (`conteneur_sol`) | 2026-09-23 | `D-145` |
| **Une tuile-objet se pose sur son sol, elle ne le recopie pas** : `render.sol` nomme la surface (non solide, un seul niveau) dont la couleur et le grain sont peints sous l'objet — une copie refait le carré dès que la surface change | 2026-09-23 | `D-146` (`Q-70`) |
| **Une case choisit son dessin par sa position** (`decor.js#varianteTuile`, hash spatial à sel propre, jamais le rythme de la couleur) ; le miroir est horizontal seulement (la lumière vient d'en haut). La table des grains porte une liste par tuile, chaque dessin allégé par le même levier | 2026-09-23 | `D-147` |
| **Une ombre de zone s'ajoute au voile par le maximum, jamais par une seconde couche** : `dessinerObscurite` ne voit toujours qu'un `{ opacite }`, la lumière du follet y perce le même trou ; ce qui lit la NUIT (signal du Chaos) lit le seul cycle | 2026-09-23 | `D-149` |
| **Une cible tactile qui bouge avec le monde est un cercle annoncé par l'orchestrateur à chaque frame** (`touch.js#zonesMonde`), calculé avec la même caméra que le dessin ; la couche tactile ne sait ni ce qu'est un follet ni où est la caméra. Le doigt du joystick n'en déclenche jamais | 2026-09-23 | `D-142` |
| **Une lumière de scène peut attendre un flag** (`condition`, même forme et même validateur qu'un portail) ; le filtre est pur (`scene.js#lumieresActives`) et appliqué là où la scène affichée est composée — render.js ne voit jamais une condition. Une lumière posée sur une porte attend le flag de la porte (tenu par test) | 2026-09-23 | `D-157` |
| **Une pièce qui bouge avec l'état d'un interactif est une pièce du VISUEL** (`piece_mobile` : dessin, pivot, angles ; `lumiere_active` pour la lumière de l'état allumé), et son geste est un état d'affichage (`bascule.js`), jamais sauvegardé : la vérité reste l'état du puzzle, un levier chargé allumé est posé | 2026-09-23 | `D-158` |
| **Esprit reste la réserve des compétences** (D1⑧ confirmée) ; l'idée « Esprit = alignement » du 22/09 est abandonnée | 2026-09-23 | NS alignement §1.1 |
| **L'alignement est une stat CACHÉE, distincte, en M1** (*révise* « M2+ ») : jamais affichée (ni Stats ni HUD), jamais modifiable par le joueur, présente dès le début ; bornes `[−5 ; +5]`, 0 neutre, pondération par action. Paliers : `abs(A) < 1` neutre · 1–2 · 3–4 · 5 ; bonus principal +1/+2/+3, malus sur le héros aux mêmes paliers. Poids par défaut : option de dialogue en données, spam −0,25 (plafond −1 par dialogue), lecture complète +0,1, morts 0 | 2026-09-23 | NS alignement §1.2-1.3, §1.5, §2 A et D — spec `10` à écrire |
| **Les effets de l'alignement passent par le follet seul** : orbite inversée (sens de rotation seul, rayon de l'équipement `Q-29`) dès `A ≤ −1`, et la synergie **change de camp** selon la table des régimes négatifs (carte mentale v1.7.0 §8). La lumière du follet n'est pas touchée (`D-35` ne se reprend toujours pas) ; « follet en bord d'écran » abandonné. Un régime qui touche une **dérivée** (Eau) se déclare en données par un modificateur de dérivée, un seul point de résolution (patron `D-141`) ; la vitesse d'un monstre dans l'aura accepte les deux sens, un « /2 » est un facteur | 2026-09-23 | NS alignement §1.4, §2 B-C |
| **Dialogues à conséquences** : tous les dialogues existants (FR/EN) sont à revoir ; choix multiples dès la Grotte (dialogue de la maison = premier cas, fusionné avec la ligne de `D-124`) ; **le follet est un LLM scripté** (le héros c'est Xav, le follet c'est Claude), arc pédagogique et suite narrative au Nv.15, épine = le cadre 4D de Xav | 2026-09-23 | NS alignement §1.6-1.7, §2 E-G — spec `11` à écrire |
| **Boucle 5 min** : sortir → récupérer → combattre → revenir → stocker → cuisiner → équiper ; Nv.0 → 10 en ~20 min, Nv.15 avec la nuit (mesure de Xav). Le bot de `R-19` le contredit : c'est **son trajet** qu'il faut revoir, pas le rythme | 2026-09-23 | NS alignement §1.8, `Q-62` |
| **Pas de nouvelle carte** : la carte Maison s'agrandit par des annexes et tunnels. Maison → **Annexe 1** (mini-boss 1 + énigme 1, récompense régulière du lieu, respec et re-choix du follet **illimités et gratuits depuis le menu** — *révise* « après Boss 1 » —, premières compétences) → **Annexe 2** (zone de mobs + tunnel, mini-boss 2, énigme 2) → nouvelle zone ; Château et Boss 1 après | 2026-09-23 | NS alignement §1.9-1.10 |
| **Éclats et coût des crafts : on ne touche pas** — la chaîne nuit → éclats → outils est voulue (« il faut faire un choix et ça se mérite ») | 2026-09-23 | NS alignement §1.11, `Q-69` |
| **Produit** : à terme plus d'éléments que haTD, les trois actuels restent (D2) · open source assumé, payant ou portage possibles une fois fini, **aucune sollicitation directe de dons** (P1) · **pas de sauvegarde cloud** sans multijoueur réseau · double tampon OK, P3 (C5⑥) | 2026-09-23 | NS alignement §1.12-1.15 |
| **Journal d'indices et de traces** : dernier bouton du menu principal (menu permanent), rappelle l'histoire parcourue, sous-page **Indices** de lore par zone, carnet du cryptex | 2026-09-23 | NS alignement §1.16 (D13/D16) |
| **La carte Indices partage la case contextuelle** : dans la Maison, Construction ; partout ailleurs, Indices (seconde candidate, sans condition). Un indice se **voit** toujours mais ne se **lit** qu'une fois sa `lisible_si` tenue ; avant, il s'écrit en hiéroglyphes de Claude Code (brouillage déterministe, silhouette des mots gardée). Le premier, l'entrée de la grotte, se lit au Nv.15 et attend d'être câblé sur l'Annexe 1. *Précise* « menu permanent » : c'est le premier pas du journal d'indices et de traces | 2026-09-23 | demande de Xav, `src/indices.js`, `data/indices.json`, `Q-120`, `Q-121` |
| **La stèle** : un interactif de type `stele` (`puzzles.json`), posé dès le début dans une clairière au sud-ouest de la forêt, non loin du chemin mais **invisible depuis lui** (tenu par test, avec la caméra du jeu) ; INTERACT ouvre sa vue rapprochée (jeu gelé, MENU muet), B ou un toucher la ferme, c'est tout. Sa gravure est **son indice brouillé par le même point que le menu** (`indices.js#lignesBrouillees`) : mêmes signes. Une **clairière se déclare** (`foret_procedurale.zones_exclues` + une zone), jamais en recopiant les cellules que le tirage aurait boisées | 2026-09-23 | demande de Xav, `Q-121`, `Q-122`, `V-123` |
| **Un soin est un buff sur les PV, et son icône au bandeau est celle d'une stat, empruntée et teintée** (`icone_bandeau: { stat, teinte }`), jamais un dessin à lui — `D-13` tient toujours : une recette n'ajoute pas d'icône. Le soin se compte en temps actif, avant l'expiration du buff, plafonné aux PV max | 2026-09-23 | demande de Xav (pomme cuite), `status.js#tickSoinsBuffsActifs`, `#iconeBuffBandeau` |
| **Pas de pierre fabriquée à partir de cailloux** : on lie des branches pour en faire du bois, mais lier des cailloux ne fait pas une pierre. Les cailloux sont réservés à la mine, à la ferronnerie et au concasseur, stations à venir. La **division** (bois → branches, etc.) vivra aussi dans d’autres stations | 2026-09-23 | décision de Xav, file des recettes (R4), tenu par `tests/test_corde_papyrus_nv4` |
| **Un objet PORTÉ** (la besace) : fabriqué, il ne va ni en poche ni au coffre, il se porte pour toujours ; sa présence est un **flag** (`sortie: { porte, flag }` d'une recette), jamais un objet d'inventaire, et il est unique par nature. Ce qu'il donne se déclare sur ce qu'il change : la poche porte `bonus: [{ condition, slots }]`, résolu par `inventory.js#resoudreCapacite` seul. La capacité de la poche se relit donc à chaque question, et la normalisation du chargement passe après les flags | 2026-09-23 | choix de Xav (« portée d'office »), `Q-127`, `tests/test_besace` |
| **L'icône d'une carte de menu peut suivre l'état du jeu** : `icones_si`, liste ordonnée de `{ condition, icone }`, la première qui tient gagne, sinon `icone` (la base). Première : la carte Poche prend la silhouette de la besace une fois celle-ci portée ; le sac, plus tard, se mettra **en tête** de la liste. Une icône de menu est une silhouette plate teintable de la famille `visuel_icone_menu_*`, jamais le dessin en couleur de l'objet | 2026-09-23 | demande de Xav (`Q-127`), `menu_cartes.js#iconeCarte` |
| **Licence : source visible, tous droits réservés** (`LICENSE`, FR/EN) : on lit le dépôt, on joue à l’adresse officielle, on le lance chez soi pour un usage personnel ; ni reprise, ni hébergement ailleurs, ni usage commercial sans accord écrit. *Précise* P1 « open source assumé » : le code est ouvert à la lecture, pas à la réutilisation — ce qui garde ouverts la version payante et le portage | 2026-09-23 | choix de Xav, présentation du dépôt GitHub |
| **L'écran Craft se trie** : par type, dans l'ordre du catalogue `recipe_categories.json` (ressources → nourriture → outils → armes → stations ; l'ordre est celui du fichier), puis par **coût total** croissant (ingrédients à l'unité + éclats, déduit de la recette, jamais un rang écrit à la main), le nom départageant. Le `categorie` d'une recette est une référence validée au boot. Pas d'intertitres pour l'instant : Xav y réfléchit (l'Atelier va se remplir) | 2026-09-24 | choix de Xav, `D-187`, `recipes.js#trierRecettes` |
| **Un objet peut briller à certaines phases du cycle** : `surlignage: { visuel, phases }` sur son visuel, un liseré qui est un visuel à part entière ; `visuels.js#surlignageActif` est le seul verdict (sol et icônes des menus). Dessiné **après le voile**, jamais une lumière. Première : la plume, nuit et aube ; Bas fixe, Moyen respire, Haut + filet (`effets.json`) | 2026-09-24 | demande de Xav, `D-191` |
| **Le calque statique DÉFILE en marchant** : recopier l'ancien, décalé, et ne repeindre que ce qui peut toucher la zone nouvelle ; la zone recopiée est rognée du **rayon d'influence** du côté de chaque bord qui a bougé. Ce rayon se **déduit des dessins** (`defilement.js#rayonInfluence`), jamais d'une constante : tout ce qui peint hors de sa case (les lisières du palier D) doit y entrer, sinon le défilement coupe son dessin. Un saut de caméra, un autre décor ou une autre table des grains reconstruisent en entier | 2026-09-24 | `D-01`, `specs/13` palier C |
| **Une surface déborde sur ses voisines par une entrée de données** (`render.lisiere : { rang, bord, coin_interieur }`) : entre deux surfaces qui se touchent, la plus haute en rang déborde ; même rang ou rang absent, le bord reste net. **La lisière se dessine dans la case qui la REÇOIT**, entre son grain et son objet (sous l'arbre, sur le grain), jamais chez la voisine : elle lit ses voisines sans peindre chez elles, et le défilement du calque n'a rien de plus à repeindre. Ce qui est comparé est la **surface** (`tuileDeSol`), jamais la tuile. **L'ombre d'une lisière est un dessin à part** (`render.lisiere.ombre`) : elle se lit dans une direction fixe à l'écran, alors que le bord tourne ; elle ne se pose que sur les côtés de l'écran qu'elle nomme, et sous tous les bords de la case | 2026-09-24 | `D-201`, `Q-52`, `D-202`, `specs/13` palier D |
| **Esprit amplifie les compétences** (*révise* D1⑧ « Esprit = réserve, rien d'autre », reconfirmée le 23/09) : dégâts d'une compétence = `derivee_degats_attaque` (Force) × `derivee_puissance_competence` (Esprit) × le multiplicateur de la compétence, composés en **un seul point** ; et `derivee_hate_competence` (Esprit) raccourcit charge et recharge, avec un plancher. Deux dérivées d'une seule stat chacune : le schéma des dérivées ne change pas. Sans Force, une compétence ne fait rien | 2026-09-24 | choix de Xav (« un mix entre (a) et (b) »), `specs/14_annexe-1.md` §0 B1 |
| **L'état d'une descente est fait de flags ordinaires, qu'on RETIRE** : chaque salle de l'Annexe déclare les siens (`descente: { flags }`), l'Annexe est la scène d'arrivée et ce qu'on atteint par ses portails sans en sortir (`descente.js`), et l'entrée par la stèle les retire en un seul point (`flags.js#retirer`, la sauvegarde suit). Un flag de descente n'est jamais la cible d'un unlock (refusé au démarrage). Une porte de l'Annexe attend un flag de descente, jamais un flag persistant | 2026-09-24 | `D-207`, `specs/14` palier B |
| **Un niveau se crédite depuis le niveau de la sauvegarde, jamais depuis l'XP, et ne se reprend jamais** : la table des niveaux peut s'allonger, et une sauvegarde qui a déjà l'XP d'un niveau nouveau le reçoit au chargement, flag et points compris. Chaque niveau du catalogue a son flag, exigé au démarrage | 2026-09-24 | `D-205`, `specs/14` palier A ; le passé n'est pas réparé (`D-206`, sans objet : décision de Xav) |
| **Aucun effet ne bat au-delà de 3 Hz** (seuil des recommandations sur l'épilepsie photosensible, WCAG 2.3.1), tenu par test sur le vrai catalogue : c'est un plafond, pas un réglage. Et **la graine d'un effet qui bat dit QUI est l'objet, jamais où il est en ce moment** : tirée de la position d'un objet qui bouge, elle défile sous ses pas (la torche tenue battait jusqu'à 15 Hz) | 2026-09-25 | `D-218`, `D-219` ; Xav : « je te laisse gérer la technique » ; un avertissement au lancement : `Q-164` |

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

**Fondations : closes** (23/09, `Q-20`). **Prochaine étape : finir la carte Maison**, par des **annexes et tunnels**, jamais une carte nouvelle (23/09). Sessions dans l'ordre, jamais mélangées (`docs/NS_alignement-dialogues-carte-mentale_2026-09-23.md` §4) : Doc-1 (**faite**) → Spec 10 `10_alignement-follet.md` (**livrée** le 23/09, trois paliers : A la stat et `?alignement=N`, B l'orbite inversée et `D-53`, C les régimes de synergie — A et B validés en jeu, C à voir : `V-103`) → Spec 11 `11_dialogues-consequences.md` (écrite, v1.1.0 ; **palier A** livré et validé le 23/09 : le choix, la bulle à options, spam et lecture comptés ; **palier B** livré et validé le 23/09 : effets de monde, toit occulté, tout le catalogue en nœuds ; **palier C** livré et validé le 23/09, en données seules : la porte du Nv.15 et le chapitre 1 « Description » — textes à réécrire : `Q-110` ; **palier D** livré et validé le 23/09 : le coffre effacé, chapitre 3 — choix à confirmer : `Q-111` ; la spec 11 est livrée en entier) → contenu de l'arc Nv.15+ ; en file d'attente : **spec 15** `15_torche.md` (écrite et jouée le 24/09, avant la 13 : décision de Xav, « tout maintenant »), puis **spec 13** `13_lisieres-performance-carte.md` (écrite le 24/09 : lisières de la carte + performance, **avant l'Annexe 1**, décision de Xav ; **palier A livré le 24/09**, `D-199` : les relevés de référence sont dans `docs/archives/JOURNAL_2026-09-24_spec13.md` ; **palier B livré le 24/09**, `D-153` : les tampons, une reconstruction 4 à 5 fois moins chère, validé en jeu : `V-143`, journal dans `docs/archives/JOURNAL_2026-09-24_spec13-palierB.md` ; **palier C livré le 24/09**, `D-01` : la bande entrante, le calque défile en marchant, une reconstruction encore ~2 fois moins chère sous ×6, validé en jeu : `V-144`, journal dans `docs/archives/JOURNAL_2026-09-24_spec13-palierC.md` ; **palier D livré le 24/09**, `D-201` : les lisières, le mécanisme, une seule paire (l'herbe mange le chemin), validé en jeu : `V-145`, journal dans `docs/archives/JOURNAL_2026-09-24_spec13-palierD.md` ; **l'ombre** reprise le 24/09, `D-202`, validée : `V-146` ; **palier E livré le 24/09**, `D-203` : le levier `lisiere` (Bas 0,3), aucune autre paire (la terre n'est posée nulle part : `Q-151`), validé en jeu : `V-147`, journal dans `docs/archives/JOURNAL_2026-09-24_spec13-palierE.md` ; **palier F livré le 24/09**, `D-204` : le tri par le champ, le plafond d'entrée en scène en données, le test d'indépendance à la taille et la règle de l'Annexe ; la nuit sous ×6, `dessiner()` divisé par 2,5 à 3 ; validé en jeu : `V-148`, relevés de clôture `R-24` (jour) et `R-25` (nuit) pris par Xav, 0 frame > 20 ms, journal dans `docs/archives/JOURNAL_2026-09-24_spec13-palierF.md` ; **la spec 13 est livrée en entier**), puis **Annexe 1** (`14_annexe-1.md`, **courante** : B1, B2 et B3 tranchés par Xav le 24/09, v1.3.0 prête à coder ; branche `annexe-1` partie de `main` ; paliers A → B → C → D → E → F → G → I → H, un par session ; **palier A livré le 24/09**, `D-205` : les niveaux jusqu'au Nv.50, validé en jeu : `V-149`, journal dans `docs/archives/JOURNAL_2026-09-24_annexe1-palierA.md` ; **palier B livré le 24/09**, `D-207` : la stèle s'éveille (`a_portee`, le carnet qui déchiffre, Descendre), les trois salles vides et la remise à zéro de la descente, validé en jeu : `V-150`, journal dans `docs/archives/JOURNAL_2026-09-24_annexe1-palierB.md` ; **palier C livré le 25/09**, `D-209` : les tireurs (`projectiles.js`, le comportement `distance`, quatre cracheurs), la salle nettoyée, le levier qui apparaît, validé en jeu : `V-151`, journal dans `docs/archives/JOURNAL_2026-09-25_annexe1-palierC.md` ; **palier D livré le 25/09**, `D-210` : Zéros (`rencontre.js`, la rencontre en données, l'intouchable, son follet en orbite, la relève, la fin au seuil), validé en jeu : `V-152`, journal dans `docs/archives/JOURNAL_2026-09-25_annexe1-palierD.md` ; **palier E livré le 25/09**, `D-211` : les deux mains (le levier tenu, la paire, le follet posé — l'état `poste` —, RB contextuel, l'explication qui nomme le bouton), validé en jeu : `V-153`, journal dans `docs/archives/JOURNAL_2026-09-25_annexe1-palierE.md` ; **palier F livré le 25/09**, `D-212` : le Gardien (le comportement `boss` et ses modes en données, la salve, la barre en haut de l'écran, vaincu une fois pour toutes), validé en jeu : `V-154` (« très dur, et c'est très bien » ; pistes d'équilibrage : `Q-161`), journal dans `docs/archives/JOURNAL_2026-09-25_annexe1-palierF.md` ; **palier G livré le 25/09**, `D-213` : le parchemin (le coffre, la vue aux lettres d'or, `skills.json` et son schéma, `competences.js`, l'Onde qui éclate, la jauge de charge et de recharge), reste à voir au téléphone : `V-155`, choix par défaut tranchés : `Q-162`, journal dans `docs/archives/JOURNAL_2026-09-25_annexe1-nuit.md` ; **palier H livré le 25/09**, `D-214` : la boucle (le levier-récompense qui dépose un éclat au sol, l'éclat qui est une monnaie, la sortie par un fondu au noir vers la stèle rouge), validé en jeu : `V-156` ; **palier I livré le 25/09**, `D-215` : choisir (la sauvegarde en v9, « Tout reprendre », les compétences en cartes dans Stats et leur emplacement, la carte Follet, le déblocage à la sortie), validé : `V-157`, `Q-163` tranchée (suites `D-216`, `D-217`), journal dans `docs/JOURNAL_2026-09-25_annexe1-palierI.md` ; **la spec 14 est validée par Xav le 26/09**, close quand l'album de référence sera pris (annexe B du suivi, reporté : Xav cherche de l'aide) ; **nuit du 25/09** (Xav : « palier G, puis palier H, puis polish, puis banc complet ») : H passe avant I ; **l'équilibrage se fait au ressenti de Xav**, pas par un instrument), puis le journal d'indices et de traces. La Phase 4 n'est plus la suivante : ses systèmes (armes, équipement, compétences, tables d'apparition) arrivent d'abord sur la carte Maison, et la carte suivante s'ouvre quand la Maison est épuisée (Nv. 40-50, provisoire). Critère de clôture de la Région Maison : **la boucle de 2 heures** (sauvegarde neuve → 2 h de jeu → Nv. 30 → l'envie de changer d'endroit). Le rythme ne se rouvre pas avant le Boss 1 (`Q-62` : Xav mesure 15 à 20 min du Nv.0 au Nv.10).

**Méthode (Xav, 19/09) : on ne rajoute pas de contenu sur des bases non confirmées** — un ticket par session (ou une file de micro-tickets), un commit par ticket, validation en jeu entre deux. Ce que Xav doit encore voir en jeu : les lignes `V-` ouvertes du suivi.

**En attente d'une décision de Xav, à ne pas commencer** : `Q-07` (gelée). Les captures de la V1 (`docs/captures/v1/`) sont une **inspiration, jamais un cahier des charges** : aucun ticket ne les lit tant que `E-03` n'est pas rempli. **Une spec non écrite ne se commence pas.**

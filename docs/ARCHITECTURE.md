---
projet: RPG V2
episode/session: Ménage du contexte de Claude
type: référence vivante
version: 1.0.0
statut: vivant
catégorie: Doc
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# RPG V2 — Architecture (état courant)

Sorti de `CLAUDE.md` le 25/09 (`DOC-10`), verbatim : chaque session le relisait en entier alors qu’un ticket ne touche que quelques modules. **Se lit quand un ticket touche un module** (sa ligne, et celles de ses voisins), **se met à jour dans le commit qui ajoute, retire ou change le rôle d’un module** : c’est la carte, le code reste la vérité (l’en-tête de chaque module dit son *pourquoi*).

## Arborescence commentée

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
│   ├── formes_collision.js `D-224` : la FORME qui bloque dans une case (`tiles.json > collision`) —
│   │                       rectangle aux coins arrondis au pied de la case ; un côté se ferme jusqu'au
│   │                       bord dès qu'une voisine solide le touche (la forêt reste fermée) ; la
│   │                       sortie d'un point, que la correction de coin mesure ; pur
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
│   ├── profondeur.js       `D-222` : LA PROFONDEUR — ce qui porte une ombre portée se tient DEBOUT,
│   │                       son pied est le centre de son ombre, tout ce qui est debout se peint trié
│   │                       du nord au sud (`Q-165`) ; le calque statique ne garde que ce qui est à
│   │                       plat (sol, grain, lisières, flaques, murs) ; pur. render.js pose la liste
│   │                       ; `D-223` : le FONDU d'un passage (`ordonnerAvecFondus`), par la position,
│   │                       dans la bande `graphismes.json > profondeur > fondu_px`
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
│   ├── orientation.js      `D-229`, `D-249` : OÙ REGARDE le héros — huit secteurs de 45° (marge à la
│   │                       frontière), le tir d'une compétence qui le tourne vers sa cible un instant ;
│   │                       `poseDePiece` : ce qu'une direction fait à une PIÈCE d'un visuel
│   │                       (`visuels.json > orientations` : le visage, la capuche qui penche) — pur
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
│   ├── triche.js           `D-250` : `?cheat=phenom` (les tests de Xav) — le dernier niveau, les
│   │                       recettes visibles et gratuites, les compétences connues, JAMAIS un flag
│   │                       posé ; sauvegarde dans une base à part (`rpg_v2_triche`) — pur
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
│                           carte_mentale_RPG_V2_v1_8_0.md + fiches de diagnostic/ticket actives
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

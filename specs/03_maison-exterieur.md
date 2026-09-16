# RPG V2 — SPEC : Phase 2, Région Maison — extérieur (première marche)

**Version : 1.1.0** — 2026-09-16. Phase 1 validée par Xav le même jour (rendu net, déplacements fluides, reset en boucle OK ; voir `CLAUDE.md`).

**Changelog depuis 1.0.0** : les trois `[OUVERT]` de §9 tranchés par Xav le jour même — forêt par densité déterministe sous un layout manuel (§3.1), layout en lignes de caractères (§3.1), toit à halo × 1,25 à équilibrer au ressenti (§3.4). Seuls la résolution logique et l'indicateur jour/nuit restent ouverts. Fil Crypte X précisé en §10.

**Contexte déjà disponible pour Claude Code** : `specs/00_ROADMAP.md` (à lire en entier d'abord), `CLAUDE.md` (journaux Phase 0/1 + diagnostics, notamment la règle de transform du contexte 2D et `specs/CHECKLIST_visuelle.md`), `specs/02_grotte.md` (patrons à **réutiliser** : portails déclaratifs, portes conditionnelles, `interactifs[]`, `lumieres[]`, dialogue localisé, flags/unlocks), `specs/carte_mentale_RPG_V2_v1_2_0.md` §3bis (contenu de la région) et §0 (décisions verrouillées).

**Découpage assumé de la Phase 2 (amendement à la roadmap)** : la roadmap listait pour la Phase 2 la récolte complète (bois à couper, pierre à miner, champs, animaux, déco plantable, XP de récolte). Décision Xav 2026-09-16 : la Phase 2 livre d'abord **la région traversable et sa première marche** (ce fichier). Couper/miner exigent des outils, donc du craft : ils suivent la Phase 3 (voir §10). Champs, animaux, déco plantable, XP de récolte : spec ultérieure (`03b` ou fusion avec la Phase 4, à trancher quand ce fichier est livré).

---

## 1. Rôle du module

Livrer la **première grande carte** du jeu — la Région Maison, 5400 × 3700 px — sur laquelle le joueur sort de la grotte et fait une première marche jusqu'à la campagne, et prouver une seule fois les systèmes qui se multiplieront dans toutes les régions suivantes : grande scène chargée à l'entrée et rendue par fenêtre visible, ressources bloquées (arbre, rocher) avec leur catalogue extensible, objets au sol ramassables à spawn aléatoire, inventaire poche, structure avec toit qui s'efface, cycle jour/nuit avec le follet pour seule lumière, et l'initialisation audio (première bande son).

Critère de la phase : un joueur sort de la grotte, touche un arbre et un rocher (dialogue « pas encore »), ramasse une branche, traverse la maison (toit effacé, intérieur lisible), touche le puits et ramasse un fruit côté jardin, marche jusqu'à la campagne, ferme l'onglet, rouvre : il est où il l'a laissé, la branche est dans sa poche. À la manette **et** au tactile, à 30 fps stables sur mobile.

---

## 2. Entrées / Sorties

### 2.1 Catalogues à remplir

| Catalogue | Contenu Phase 2 | Champs à figer (schéma) |
|---|---|---|
| `scenes.json` | `scene_maison_exterieur` (**remplace** `scene_maison_exterieur_placeholder` — voir §4 sur les sauvegardes qui pointent encore dessus) | + `layout` encodé pour une grande carte (§3.1), `zones[]` (rectangles nommés : `foret`, `maison`, `jardin`, `campagne` — servent aux spawns et aux exclusions), `structures[]` (§3.4 : rectangle + `toit`), `spawns_sol[]` (§3.3), `cycle_jour_nuit` (bool) |
| `tiles.json` | + `tile_herbe` (variantes), `tile_terre`, `tile_chemin`, `tile_arbre`, `tile_rocher`, `tile_arbre_fruitier`, `tile_parquet`, `tile_mur_maison`, `tile_porte_maison` (traversable), `tile_toit` | + `ressource` optionnel (réf. `resources.json`) : une tuile qui porte une ressource est solide et réagit à `INTERACT` (§3.2) |
| `resources.json` | **nouveau.** `res_bois` (arbre), `res_pierre` (rocher) ; on démarre à 2, le catalogue est conçu pour en accueillir beaucoup | `id`, `label_key`, `dialogue_bloque` (réf. `dialogues.json`), `outil_requis` (réf. future `tools.json`, `null` en Phase 2 — la clé existe pour que la Phase 3 débloque sans code), `item_produit` (réf. `items.json`), `render` |
| `items.json` | **nouveau.** `item_branche`, `item_caillou`, `item_fruit` (+ `item_eclat` migré ici depuis le compteur d'éclats si c'est propre, sinon reporté) | `id`, `label_key`, `categorie` (`ressource` / `nourriture` / `valeur`), `stack_max`, `render`, `spawn` optionnel : `{ "nb_au_sol": 2, "zones": [...], "zones_exclues": [...] }` |
| `dialogues.json` | `dlg_ressource_bloquee_bois`, `dlg_ressource_bloquee_pierre` (« tu ne peux pas encore le couper / le casser, reviens avec les bons outils »), `dlg_station_pas_encore` (table, coffre, atelier), `dlg_puits_pas_encore`, `dlg_premier_ramassage` (une seule fois, `flag_premier_ramassage`) — locuteur `follet` partout | inchangé |
| `flags.json` | `flag_maison_decouverte` (posé à la première entrée dans la zone `maison`), `flag_premier_ramassage`, `flag_jardin_decouvert` | inchangé |
| `hud_layout.json` | + emplacement du toast de ramassage, de l'indicateur jour/nuit (optionnel, §3.5) | — |
| `settings` (dans la sauvegarde) | `musique: bool` (§3.6) | — |
| `locales/*.json` | toutes les chaînes FR **et** EN (noms des items/ressources, dialogues, menu Poche, menu Musique) | — |

Rappel de la règle : chaque catalogue passe le test « une entrée JSON de plus, zéro code de système ». En particulier : **ajouter une 3ᵉ ressource (ex. `res_argile`) = une tuile + une entrée `resources.json` + un item + un dialogue + des clés de locale, aucun fichier de `/src` touché** — prouvé par un test dédié. Idem pour un 4ᵉ item au sol.

### 2.2 Grande scène — contrat de performance

- Chargée en bloc à l'entrée de la région (décision roadmap : layouts chargés à l'entrée de la zone), jamais streamée.
- **Le rendu n'itère que la fenêtre visible de la caméra** (± 1 tuile de marge), jamais les 168 × 115 tuiles. C'est le point de non-régression de cette phase pour le plancher 30 fps mobile ; un test headless vérifie que la fonction de sélection des tuiles à dessiner renvoie ≈ (20+2) × (12+2) tuiles pour un viewport 640 × 360 quelle que soit la taille de la scène.
- Le décor procédural à graine fixe (`decor.js`) se calcule par tuile visible à la volée ou par cache de secteur — jamais un tableau pré-calculé de toute la carte gardé en mémoire s'il dépasse un budget raisonnable (à chiffrer et commenter).
- La caméra bornée de la Phase 0 est réutilisée telle quelle (cas « scène plus grande que le viewport », déjà testé).

---

## 3. Comportement attendu — les paliers, dans l'ordre de la marche

Si la phase déborde, s'arrêter au dernier palier stable dans **cet ordre** : A → B → C → D → E. Chaque palier est jouable seul.

### 3.1 Palier A — La carte et la sortie de grotte

- Le portail de sortie de la salle 2 mène à `scene_maison_exterieur`. Point d'arrivée : **en bordure de carte, côté forêt, à ~200 px du bord** (donnée `spawn`, provisoire). La bouche de la grotte est dessinée dans le décor (tuiles roche) — pas de portail retour en Phase 2 (le respawn après la mort revient déjà dans la grotte par `entities.js#mourir()`, inchangé).
- **Encodage du layout (acté Xav 2026-09-16)** : le format tableau-de-tableaux de la Phase 0/1 devient inéditable à 168 × 115. Encodage **lignes de caractères** (`layout: string[]`, un caractère par tuile, `legende: { ".": "tile_herbe", "T": "tile_arbre", ... }` dans la scène) décodé par `registry.js`/`scene.js`. Les deux salles de la grotte gardent leur format actuel **ou** migrent — au choix de Claude Code, tant que le schéma accepte les deux et qu'aucun test Phase 1 ne rougit.
- **Placement de la forêt (acté Xav 2026-09-16) — deux calques** : (1) un **fond léger** — dans les `zones[]` de type `foret`, arbres posés par densité à graine fixe (`densite: 0.35`, provisoire), déterministe donc identique pour tous ; (2) par-dessus, le **layout manuel** — chemins, clairière de la maison, jardin, bords, **et les pièces interactives placées une à une** (le premier arbre et le premier rocher sur le chemin, un arbre interactif par-ci par-là). Le calque manuel **prime** toujours sur la densité. Le principe : créer l'illusion du fait-main pour le joueur, jamais lui laisser voir la grille. Conséquence de conception : les arbres du fond peuvent être une **variante non interactive** de la tuile (`tile_arbre_fond`, solide, sans `ressource`) si cela allège le rendu ou la lisibilité ; les arbres qui répondent à `INTERACT` sont ceux du calque manuel — à trancher par Claude Code selon le coût, en le documentant.
- Campagne : herbe en variantes, fleurs, buissons non-collisionnants, chemins de terre — décor procédural à graine fixe, comme la grotte.
- Aucune obscurité de jour (`obscurite: false` au sens Phase 1 ; le jour/nuit arrive au palier D).

### 3.2 Palier B — Ressources bloquées : arbre et rocher

- Une tuile qui porte `ressource` est **solide** ; `INTERACT` à proximité (même seuil que le levier de la grotte, réutiliser `puzzles.js`/`scene.js` — une tuile-ressource est un interactif comme un autre) ouvre `resources.json > dialogue_bloque` tant que `outil_requis` n'est pas satisfait. En Phase 2, `outil_requis` est `null` **et** la coupe/le minage n'existent pas : le dialogue est la seule réponse, par construction.
- Point d'accroche pour la Phase 3 : la fonction qui décide « bloqué / récoltable » vit en un seul endroit (`resources.js#peutRecolter(ressource, inventaire)`), lit `outil_requis`, et renvoie toujours `false` en Phase 2 faute d'outils dans le jeu. La Phase 3 branche la récolte réelle derrière ce `true`, sans toucher au dialogue ni à la carte.
- Le premier arbre et le premier rocher rencontrés sont placés **sur le chemin naturel** entre la bouche de la grotte et la maison (layout à la main), pour que le joueur les touche sans instruction.

### 3.3 Palier C — Objets au sol, ramassage, poche

- Principe V1 repris : pour chaque item dont `spawn` est défini, **`nb_au_sol` exemplaires** (2, provisoire) existent en permanence sur la carte, chacun sur une tuile libre tirée au hasard dans ses `zones[]` et hors `zones_exclues[]` (maison, jardin pour la branche ; jardin seulement pour le fruit), jamais sur une tuile solide, un chemin, une structure ou une autre entité.
- `INTERACT` au contact → l'item entre dans la **poche** (`inventaire.items[id] += 1`, borné par `stack_max`), toast HUD bref (icône + nom localisé + quantité), un nouvel exemplaire est **immédiatement** tiré ailleurs (le compte reste à `nb_au_sol`). Tirage via le PRNG `mulberry32` (`decor.js`), graine = `graine_scene ⊕ compteur_de_ramassages` pour rester déterministe et testable.
- Positions courantes des items au sol **persistées** dans la sauvegarde (§3.7) — recharger la page ne rebat pas les cartes.
- **Poche** : entrée « Poche » dans le menu DOM (réutiliser `creerControleurMenu()`), liste `nom × quantité`, aucune action dessus en Phase 2 (consommer/jeter = Phase 3). Le compteur d'éclats du HUD reste tel quel.
- `dlg_premier_ramassage` : une ligne du follet au tout premier ramassage, jamais rejouée (`flag_premier_ramassage`).

### 3.4 Palier D — La maison comme structure, le jardin, le puits

- `structures[]` : rectangle de tuiles + calque `toit` (tuiles `tile_toit` dessinées **par-dessus** les entités quand le toit est opaque). Murs solides, une porte traversable de chaque côté (forêt / jardin), sol en `tile_parquet`.
- **Effacement du toit par proximité** : l'opacité du calque toit est une fonction de la distance entre le héros et le **rectangle** de la structure (distance au bord, pas au centre) — 1 au-delà de `RAYON_EFFACEMENT_TOIT`, 0 en dessous de `RAYON_EFFACEMENT_TOIT − MARGE_FONDU`, lerp entre. `RAYON_EFFACEMENT_TOIT = rayon_lumiere du follet actif × 1,25` (« un peu plus grand que le halo », **acté Xav 2026-09-16**), déclaré une fois ; le facteur et la marge de fondu restent **provisoires** : Xav les équilibre au ressenti après test, sans que cela demande autre chose qu'un changement de valeur. Vu de loin : un toit ; en approchant : l'intérieur apparaît. Ce calque touche la composition du rendu → **rejouer `specs/CHECKLIST_visuelle.md`** et y ajouter l'état « toit à mi-fondu ».
- **Intérieur, placeholders** : table, coffre, atelier de craft = `interactifs[]` de type `station_placeholder` (solides, forme distincte chacun, `INTERACT` → `dlg_station_pas_encore`). En Phase 3 ils deviennent des stations réelles par changement de `type` en données, **à la même position** — la maison n'est jamais redessinée. Le placement libre des stations (D20③) est un sujet de Phase 3, pas de celle-ci : ici les positions sont fixes en JSON.
- **Jardin** (zone de l'autre côté de la maison) : un `tile_arbre_fruitier` (ressource dont le fruit tombe : le `item_fruit` spawne **uniquement** dans la zone `jardin`, à `nb_au_sol: 1`), un **puits** = `interactif` de type `station_placeholder` avec `dlg_puits_pas_encore` (« survie + gourde » = Phase 3, §10). `flag_jardin_decouvert` à l'entrée dans la zone.
- Après le jardin, la campagne (déjà posée au palier A) ferme la marche.

### 3.5 Palier E — Cycle jour/nuit

- Horloge de jeu **à l'action** de préférence à un timer strict ? **Non** : la roadmap acte « aucun timer d'attente », mais un cycle jour/nuit visuel n'est pas une attente. Cycle en temps de jeu actif (pause sous UI comme tout le reste), durée totale `DUREE_CYCLE_MS` (provisoire : 10 min), phases `jour → crépuscule → nuit → aube` en données avec, pour chacune, un niveau d'obscurité cible ; interpolation linéaire entre phases.
- La nuit réutilise **exactement** le calque d'obscurité et les `lumieres[]` de la grotte : le follet est la seule lumière mobile ; la maison porte une `lumiere` statique dans `scenes.json > lumieres[]` (fenêtre éclairée), première entrée d'un level design nocturne. Aucun nouveau système de lumière.
- Heure persistée dans la sauvegarde. Jauges de survie gelées hors session (déjà acté) — le cycle aussi : rien n'avance quand l'onglet est fermé.
- HUD : indicateur discret optionnel (icône soleil/lune, forme distincte, pas seulement la couleur) — provisoire, Xav tranche à l'usage.

### 3.6 Audio — initialisation et première bande son (transversal, peut se livrer à n'importe quel palier)

- Contrainte déjà active depuis la Phase 0 : l'`AudioContext` est créé/repris **sur le premier geste utilisateur** (touche, bouton manette, tap), jamais au boot. Un seul point (`audio.js`), le reste du jeu ne connaît que `jouerMusique(id)` / `couperMusique()`.
- Piste : `assets/audio/piano_solo.<ext>` fournie par Xav (en production), en boucle. `music.json` (catalogue : `id`, `fichier`, `boucle`, `volume`) — une seconde piste future = une entrée JSON. **Si le fichier est absent, le jeu tourne sans son et sans erreur bloquante** (avertissement console seulement).
- Entrée « Musique : oui/non » dans le menu, persistée dans `settings`. Pas de bruitages en Phase 2.

### 3.7 Sauvegarde

`schema_version: 3`, migration `2 → 3` prouvée par test : `inventaire.items` (`{ id: quantite }`), `monde.items_sol[]` (positions courantes par scène), `monde.heure` (cycle), `settings.musique`, `flags` déjà couverts. Une sauvegarde v2 migrée arrive avec une poche vide, des items au sol à retirer et l'heure au matin.

---

## 4. Edge cases à gérer

- **Sauvegardes pointant vers `scene_maison_exterieur_placeholder`** (retiré) : c'est précisément la classe de problème notée au journal Phase 1 (renommage de contenu ≠ migration de schéma). La migration `2 → 3` **redirige explicitement** cet id vers `scene_maison_exterieur` + son `spawn` ; le repli générique sur la salle 1 reste en filet derrière.
- Item au sol sans tuile libre disponible dans ses zones (carte saturée, cas théorique) → l'item n'est pas posé, avertissement console, jamais une exception ni une boucle infinie (borner les tirages).
- Ramassage à `stack_max` atteint → l'item reste au sol, dialogue court ou toast « poche pleine » localisé (D4⑤ à formaliser plus tard, ici un message suffit).
- Héros **dans** la structure quand le toit est opaque (téléportation, chargement) → l'opacité se recalcule dès la première frame, jamais d'état collé.
- Deux structures proches → l'opacité se calcule par structure, indépendamment.
- Monstres : **aucun** dans cette région en Phase 2 (ton chill) ; le follet reste en `suivre` en permanence, son aura n'a rien à faire — vérifier qu'aucun test de combat ne dépend d'un spawn présent dans la scène courante.
- Nuit dans la maison → la lumière de fenêtre + le follet suffisent ; vérifier que le toit effacé ne masque pas l'obscurité (ordre des calques : scène → entités → toit → obscurité → HUD/dialogue, documenté au point unique de composition).
- Onglet masqué → l'heure n'avance pas (delta plafonné, déjà en place).
- Manette débranchée pendant un fondu de toit → aucun effet (le fondu ne dépend que de la position).
- Fichier audio absent ou format non supporté par le navigateur → silence, pas de crash ; l'entrée Musique du menu reste affichée.

---

## 5. Structure des fichiers (ajouts)

```
src/
├── resources.js     peutRecolter() + résolution tuile→ressource, pur, testé
├── inventory.js     poche : ajouter/retirer/stack_max, pur, testé
├── ground_items.js  spawn/respawn déterministe des items au sol, pur, testé
├── daynight.js      horloge de cycle → niveau d'obscurité, pur, testé
├── audio.js         AudioContext sur geste utilisateur, jouerMusique/couperMusique (jamais testé headless)
├── scene.js         + décodage layout en lignes de caractères, zones[], structures[]
├── render.js        + sélection des tuiles visibles (pure, testée) + calque toit (jamais testé headless)
├── ui/menu.js       + entrées Poche, Musique
data/                scenes (maison), tiles, resources, items, music, dialogues, flags, hud_layout
assets/audio/        piano_solo.<ext> (fourni par Xav)
tests/
├── test_phase2_layout_lignes_<date>.js
├── test_phase2_tuiles_visibles_<date>.js       (fenêtre visible seulement, indépendante de la taille de scène)
├── test_phase2_resources_<date>.js             (+ data-driven : 3ᵉ ressource en JSON de test, zéro code)
├── test_phase2_ground_items_<date>.js          (nb_au_sol maintenu, zones respectées, déterminisme)
├── test_phase2_inventory_<date>.js
├── test_phase2_toit_opacite_<date>.js          (fonction pure distance→opacité)
├── test_phase2_daynight_<date>.js
├── test_phase2_save_migration_2_3_<date>.js    (+ redirection du placeholder)
└── test_phase2_i18n_<date>.js
```

---

## 6. Consignes d'autonomie pour Claude Code

- Ne pas demander de validation sur le nommage, la forme exacte des schémas, le découpage des tests, ni le choix de format d'encodage tant que le layout reste éditable à la main.
- **Réutiliser** : portails/portes/`interactifs[]`/`lumieres[]` de la grotte, le calque d'obscurité, `creerControleurMenu()` pour Poche et Musique, `mulberry32` pour tout tirage, le point de décision unique « une UI est ouverte ».
- Tout seuil (`spawn` à 200 px, `densite` forêt, `nb_au_sol`, `RAYON_EFFACEMENT_TOIT` et sa marge, `DUREE_CYCLE_MS`, niveaux d'obscurité par phase, volume) en données ou centralisé, commenté avec son pourquoi, marqué **provisoire**.
- Toujours pas de sprites : formes géométriques distinctes par entité (arbre ≠ arbre fruitier ≠ rocher ≠ branche ≠ fruit ≠ table ≠ coffre ≠ atelier ≠ puits), identifiables sans la couleur.
- Aucun point de design tranché en silence : un `[OUVERT]` dans `CLAUDE.md` et on continue avec la valeur provisoire indiquée ici.
- Tout ticket qui touche `render.js`, `ui/hud.js`, `ui/dialogue_box.js` ou `main.js#dessiner()` rejoue `specs/CHECKLIST_visuelle.md` avant de conclure (règle de méthode née du diagnostic dialogues-invisibles) — le calque toit et la nuit y ajoutent leurs états.
- Mesurer, pas supposer : livrer avec le nombre de tuiles dessinées par frame et un ordre de grandeur du temps de frame en console (mode debug désactivable), pour que Xav juge le plancher mobile.

---

## 7. Critères de validation

**Automatisés** (`node tools/run_tests.js`, tout vert ; `node --check` sur chaque fichier livré) :
- Layout en lignes décodé en tuiles identiques au format tableau ; une légende incomplète = échec dur au boot avec le caractère et la ligne fautifs.
- Sélection des tuiles visibles : taille du résultat bornée par le viewport, pas par la scène.
- Ressources : `INTERACT` sur une tuile-ressource ouvre le bon dialogue ; une 3ᵉ ressource ajoutée en JSON de test fonctionne sans code.
- Items au sol : après N ramassages, exactement `nb_au_sol` exemplaires présents, tous en zone autorisée et sur tuile libre ; même graine → mêmes positions.
- Poche : `stack_max` respecté ; refus propre au-delà.
- Toit : opacité 1 loin, 0 dedans, monotone entre les deux.
- Jour/nuit : l'obscurité suit les phases en données ; pause sous UI.
- Migration `2 → 3` sur un payload v2 fictif, y compris `scene: scene_maison_exterieur_placeholder` → redirigé ; version 4 refusée.
- i18n : jeux de clés identiques FR/EN, aucun texte joueur en dur.

**Manuel (Xav)** — le critère de la phase :
1. Manette : sortir de la grotte → arbre (dialogue) → rocher (dialogue) → branche ramassée (toast, Poche dans le menu) → toit vu de loin, effacé de près, intérieur lisible, table/coffre/atelier « pas encore » → jardin : fruit ramassé, puits « pas encore » → campagne. Fermer/rouvrir : position, poche et items au sol conservés.
2. Même parcours **au tactile**, en notant le fps ressenti sur le mobile de référence.
3. Laisser tourner jusqu'à la nuit : le follet éclaire, la fenêtre de la maison aussi, le reste est sombre. Verdict sur la durée du cycle et les niveaux d'obscurité.
4. Musique : rien avant le premier geste, piano en boucle ensuite, coupure/reprise depuis le menu, réglage conservé après rechargement.

---

## 8. Hors scope pour cette itération

- Couper le bois / miner la pierre (exigent des outils → après la Phase 3, §10).
- Champs à semer, animaux sauvages, décoration plantable, XP de récolte, pêche (roadmap Phase 2 initiale → spec `03b` ou Phase 4, à trancher à la livraison de ce fichier).
- Stations réelles, coffre, recettes, survie, gourde, consommation du fruit, placement libre (Phase 3).
- Monstres dans la région, combat (Phase 4 — la région Maison reste sans ennemi).
- Portail de retour dans la grotte (le respawn suffit ; à revoir si le fil du casse-tête tardif l'exige).
- Bruitages, seconde piste musicale.
- Sprites, tuiles définitives, animations.

---

## 9. Points `[OUVERT]` (valeur provisoire appliquée en attendant)

| Point | Provisoire appliqué | À trancher |
|---|---|---|
| **Résolution logique** (hérité, §9 de `02_grotte.md`) | 640 × 360 | Verdict Xav — cette grande carte est le bon terrain pour juger |
| **Indicateur jour/nuit au HUD** | Icône soleil/lune discrète | Garder, ou rien (narration diffuse : le joueur voit bien qu'il fait nuit) |

Forêt, encodage du layout et rayon du toit : **tranchés le 2026-09-16** (voir changelog), ne pas rouvrir. Les valeurs numériques associées restent provisoires et se règlent au ressenti de Xav.

---

## 10. Décisions actées par Xav (2026-09-16) — à ne pas perdre, à reporter dans la carte mentale

- **Grotte confirmée : 3 leviers sans instruction, milieu → gauche → droite.** Pas de simplification pour les joueurs occasionnels — la difficulté d'entrée est assumée. `02_grotte.md` inchangé.
- **Fil « Crypte X » transversal à toute la V2** (D14⑥, gros point de la carte mentale) : un bouton dans la Maison + un levier dans le Château + des symboles éparpillés dont un seul est à noter dans un cryptex une fois ouvert ; la grotte de départ en fait partie (ses 3 leviers en sont la première pierre). Pensé comme un **circuit imprimé superposé à la carte du monde**, portes logiques à connecter, combinaison finale. Exige une vision globale du monde : **aucune conception avant le Poste avancé**. Obligation pour cette phase : la maison **réserve un emplacement** en données pour le futur bouton (position, aucun objet posé) ; toute scène future fera de même pour ses pièces.
- **Topologie de la région** : la grotte débouche **en bordure de carte, côté forêt** (~200 px du bord) ; la maison est proche, le **jardin est de l'autre côté de la maison** ; la campagne ferme le reste. Précise la carte mentale §3bis (« la grotte est au fond du jardin » → au fond de la propriété, côté forêt).
- **Ressources = catalogue ouvert** : on démarre à 2 (bois, pierre) et on en ajoutera beaucoup — une ressource coûte une entrée JSON, jamais du code.
- **Récolte gatée par l'outil** : « reviens quand tu auras les bons outils » — les outils viennent du craft (Phase 3) à partir des items au sol (branche, caillou). Ordre acté : items au sol (Phase 2) → craft du premier outil (Phase 3) → couper/miner (Phase 3, fin, ou 03b).
- **Puits → survie + gourde** (Phase 3) : le puits existe dès la Phase 2 comme placeholder, à la position définitive.
- **Numérotation des specs** : `03_maison-exterieur.md` pour cette phase (le « 04 » était un raccourci).
- **Audio** : la bande son piano solo (en production) est le premier son du jeu ; aucun autre audio prévu à ce stade.

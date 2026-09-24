---
projet: RPG V2
episode/session: Carte Maison — lisières et performance, avant l'Annexe 1
type: spec par paliers
version: 1.0.0
statut: brouillon
catégorie: Spec
date: 2026-09-24
Ids_suivi: [Q-52, E-04, D-01, D-153, D-02, Q-61, "D-189 et suivants (à créer : un par palier ; D-188 pris le 24/09 par la zone de Chaos sud)", "Q-131 à Q-135 (à créer)", "V-133 et suivantes (à créer)", "R-22 et suivants (à créer)"]
genere_par: claude
verifie_par: xav
---

# RPG V2 — 13 : Les lisières de la carte, et la performance avant l'Annexe 1

**Méthode.** Branche dédiée `carte-lisieres-perf`. **Un palier par session**, un commit par palier, chacun retirable seul, validation de Xav entre deux. Aucun `push`. Le suivi fait foi : un identifiant « à créer » déjà pris → prendre le suivant et le dire.
**Place dans la file** (Xav, 24/09 : « besoin d'être fix avec l'Annexe 1 ») : cette spec passe **avant le contenu de l'Annexe 1**. L'Annexe agrandit la carte et y ajoute une zone de monstres : on règle le coût de la carte **avant** de le multiplier, et chaque ticket de l'Annexe passe ensuite le banc du palier F.

## 1. Intention

Deux choses, dans cet ordre :

1. **Rendre la carte assez légère pour grandir.** Aujourd'hui, marcher coûte une reconstruction complète du calque statique à chaque sortie de la zone pré-rendue ; elle est **1,6× plus chère depuis le polish ambiance** (`D-153`) et fait une frame lente à chaque fois sur un appareil faible (`D-01`). L'Annexe 1 va ajouter de la surface, des tuiles et des monstres. Le coût d'une frame doit dépendre de **ce qui est à l'écran**, jamais de la taille de la carte, et ce contrat doit être **mesuré** et pas seulement supposé.
2. **Effacer l'escalier entre deux surfaces** (`Q-52`). Là où l'herbe touche le chemin ou la terre, la lisière est une suite de carrés nets, avec des marches de 32 px, et le grain de chaque surface rend la couture *plus* visible. Une tuile doit pouvoir **déborder** sur sa voisine, et cette voisine doit se déclarer en données.

La performance passe en premier, pour deux raisons. Les lisières ajoutent des primitives au calque : elles doivent arriver sur un calque qui sait les payer. Et le défilement incrémental (palier C) doit connaître dès sa conception la règle « une case dépend de ses voisines » que les lisières introduisent.

## 2. Ce que les mesures et le code imposent (ne pas rediscuter)

| Fait | Conséquence pour cette spec |
|---|---|
| Le calque se reconstruit **en entier** dès que la vue sort de la zone pré-rendue (`render.js#calqueDoitEtreReconstruit`, palier A de `specs/09`) : de 15 à 8 reconstructions sur le trajet de `cout_calque.mjs`, **coût unitaire inchangé** | Diviser la fréquence est fait. **Seule la baisse du coût d'une reconstruction** soigne encore le pic |
| Coût d'une reconstruction : **4,1 → 6,4-8,7 ms** en Moyen sur PC, **32 → 55 ms** (pic **76-97 ms**) sous bridage CPU ×6, une frame lente par reconstruction (`D-153`, 23/09) | Deux leviers, indépendants et cumulables : **dessiner moins cher** (palier B, les tampons) et **dessiner moins** (palier C, la bande entrante) |
| L'échelle de rendu du jeu réel est **toujours entière** (`render.js#calculerEchelleEntiere`) ; seule `?echelle=N` (debug) peut être décimale | Un dessin tramé **une fois** à l'échelle courante puis posé par `drawImage` à une position entière n'est **jamais ré-échantillonné**. La réserve de `D-153` (« risque de ré-échantillonnage sur téléphone ») ne concerne que l'outil de debug |
| Le grain d'une tuile de sol **tient dans sa cellule** ; une tuile solide (arbre, rocher) **déborde** de la sienne (`D-105`) | Le tampon d'une tuile a la taille de **son dessin**, pas celle de la cellule. La boîte existe déjà : `structures.js#empreinteParDefaut`, que le curseur utilise pour tramer son orbe (`curseur.js#boiteBitmapCurseur`) — **même patron, rien à inventer** |
| Aucune tuile ne connaît ses voisines : `decor.js#couleurTuile` et `render.js#construireCoucheStatique` ne lisent que `(x, y)` (`Q-52`) | Les lisières sont du **code nouveau** dans le calque statique, le seul endroit du rendu qui parcourt les tuiles |
| `construireCoucheStatique` **crée un canvas neuf** à chaque reconstruction et parcourt **toute la liste du décor** pour trouver les motifs de la fenêtre | Deux coûts qui grandissent avec la carte et la densité de Haut (×10, `D-116`), sans rien apporter. À supprimer au passage |
| Sous Chrome, `dessiner()` ne mesure que **l'émission** des ordres ; le seul signal de fluidité est **« frames sautées »** (règle des relevés, `DOC_navigateurs.md`) | Les critères de réussite portent sur les frames sautées et sur le **coût mesuré d'une reconstruction**, jamais sur un temps de `dessiner()` pris sous un autre navigateur |
| **Le sol ne se rouvre pas** (`E-04`) : le grain de `D-105`, ses couleurs et ses variantes sont gardés tels quels | Une lisière se pose **par-dessus** le grain de la case qui la reçoit. Elle **ajoute autour**, elle ne redessine rien dedans |

## 3. Décisions déjà prises

| # | Décision | Source |
|---|---|---|
| 1 | Les lisières sont le **rang 1** de la passe de polish carte ; **la forme est déléguée à Claude** | `E-04`, `Q-52` (Xav, 22/09) |
| 2 | Le remède au pic est le **défilement incrémental**, pas une marge plus large | `D-01` (Xav + Claude, 19/09) |
| 3 | Un preset reçoit un **nombre**, jamais un preset ; ce qu'un preset retire se déclare en données | `specs/09` §4, décisions archivées |
| 4 | Chaque ajout de `E-04` dit **dans quels presets il vit** | `specs/09` §4.4 |
| 5 | `D-106` et `D-110`, rangs 3 et 2 de `E-04`, sont **livrés** (23/09) : il ne reste de `E-04` que les lisières (`Q-52`) et la densité du décor (`Q-53`) | suivi |

**La forme retenue (décision 1, prise ici)** : **un bord dentelé à fondu court**. La surface dominante déborde de quelques pixels sur sa voisine, avec un contour irrégulier fait de touffes, que suit une bande d'ombre de deux ou trois pas d'opacité décroissante. Le « dégradé » vient de cet empilement, **pas d'un `createLinearGradient`** : c'est plus sûr à tramer, et cela reste dans le vocabulaire de primitives de `visuels.json`.
Pourquoi pas les deux autres formes :
- le **liseré** (un trait) *souligne* la grille au lieu de l'effacer ;
- le **dégradé seul** rend flou le bord d'un monde dessiné net.

Le bord dentelé est aussi ce que fait la nature : **l'herbe mange le bord du chemin**.

## 4. Règles

### 4.1 Une lisière se déclare sur la surface qui déborde

```json
"render": {
  "lisiere": {
    "rang": 3,
    "bord": "visuel_lisiere_herbe_bord",
    "coin_interieur": "visuel_lisiere_herbe_coin"
  }
}
```

- **`rang`** : l'ordre de recouvrement. Entre deux surfaces qui se touchent, **celle de rang le plus élevé déborde** sur l'autre. Même rang, ou rang absent d'un côté : **aucune lisière**, et le bord reste net. C'est voulu pour le parquet et le mur de la Maison, qui sont construits : un bord droit y est juste.
- **`bord`** : le dessin d'**un côté**, écrit pour le côté **nord** de la case qui le reçoit. Les trois autres côtés sont ce même dessin tourné par quart de tour (la rotation existe déjà dans `dessinerVisuel`).
- **`coin_interieur`** : le dessin posé quand la surface dominante ne touche la case **qu'en diagonale**. Sans lui, un angle de chemin garderait une marche de 32 px à son coin rentrant.
- Un coin **extérieur** (deux côtés adjacents dominés) n'a pas de dessin propre : les deux bords se croisent, et c'est leur recouvrement qui arrondit l'angle. **À vérifier à l'œil au palier D** ; si le croisement se lit mal, un `coin_exterieur` s'ajoute en données.
- **Ce qui est comparé, c'est la SURFACE**, jamais la tuile : on passe par `decor.js#tuileDeSol`. Un arbre posé sur l'herbe (`render.sol: tile_herbe`) fait déborder l'herbe sur le chemin voisin, exactement comme une case d'herbe nue.
- Validation au démarrage : `rang` est un entier ≥ 1 ; `bord` et `coin_interieur` référencent `visuels.json` ; une tuile **solide** ne déclare pas de lisière (sa silhouette *est* le monde, `specs/09` §4.3). Toute violation est un échec dur, avec le chemin exact.

**Test d'architecture** : faire déborder la terre du Jardin sur le chemin, ou poser plus tard un sable qui mord sur l'herbe, se fait par **une entrée JSON et deux dessins**, sans toucher une ligne de code.

### 4.2 Le calcul est pur ; le dessin reste dans le calque

- **`src/lisieres.js`** (nouveau, pur, importable depuis Node) :
  - `lisieresCase(scene, x, y, estFlagActif)` rend la liste ordonnée des poses de la case, c'est-à-dire des `{ visuel, rotation, miroir }`, dans un ordre fixe : les quatre côtés N-E-S-O, puis les quatre coins ;
  - `rayonInfluence(tuiles, visuels)` rend jusqu'où, en cases, le dessin d'une case peut toucher une autre case. Il est **dérivé des données** : c'est le débordement maximal des boîtes de dessin, plus 1 si une lisière existe. Le palier C s'en sert.
- Le miroir d'un bord se tire par `decor.js#varianteTuile`, avec un **sel propre** (même règle qu'au 23/09 : la variante ne suit pas la couleur). Deux cases voisines de même configuration ne portent donc pas le même bord.
- `render.js` ne voit jamais un `rang` : il reçoit des poses, comme il reçoit déjà des visuels résolus.

**Ce que le palier D a livré (24/09), là où il s'écarte du texte ci-dessus** (technique, laissé à Claude) :
- **Une lisière se dessine DANS la case qui la reçoit**, ancrée à son centre (`ancre: "centre"`, vérifié au démarrage), jamais chez la surface qui déborde. Elle lit ses voisines, mais ne peint pas chez elles : le défilement n'a donc pas à grandir son rayon. Le terme « plus 1 si une lisière existe » devient le débordement des **boîtes** des dessins de lisière (`defilement.js#rayonInfluence`, `visuelsLisieres`). Il vaut 0 sur le catalogue actuel, et un bord qui sortirait de sa case l'agrandirait tout seul.
- **`lisieresCase(scene, x, y, estFlagActif, table)`** reçoit la table des lisières (`lisieres.js#tableLisieres`, construite par `main.js` aux mêmes moments que la table des grains, dessins résolus). `render.js` la transmet sans la lire.
- **Un coin intérieur** se pose quand la diagonale domine **et qu'aucun des deux côtés qui touchent ce coin n'est dominé** (sinon un bord couvre déjà l'angle). Le coin ne se retourne jamais : son miroir serait le coin d'à côté.
- `bord` et `coin_interieur` **vont ensemble**. Une surface sans dessin peut être dominée, jamais dominer : le chemin déclare `{ "rang": 1 }` seul. Une tuile posée sur un sol (`render.sol`) ne déclare pas de lisière : c'est son sol qui déborde.
- Le miroir d'un bord passe par `decor.js#varianteTuile`, qui reçoit maintenant un **sel** optionnel (le défaut ne change pas), un sel par côté.
- **L'ombre est un dessin à part** (`D-202`, 24/09, avant le palier E) : `render.lisiere.ombre : { bord, coin_interieur, cotes }`. Dans le bord, elle tournait avec lui, et le nord et le sud du chemin disaient deux profondeurs opposées. Elle suit toujours le contour de son bord, mais ne se pose que sur les côtés **de l'écran** qu'elle nomme (l'herbe : est, sud, ouest), et toutes les ombres d'une case passent avant tous ses bords.

### 4.3 Ordre de dessin d'une case (invariant)

Dans chaque case : **aplat → grain de la surface (`render.sol` le cas échéant) → lisières reçues → objet de la tuile**. Puis, une fois toute la fenêtre peinte, le **décor**, par-dessus. La lisière passe donc **sous** l'arbre et **sur** le grain. Cet ordre est la définition du calque : le palier C ne doit pas pouvoir le changer, et un test le fige.

### 4.4 Tamponner, c'est tramer une fois ce qu'on dessinait mille fois (palier B)

- Un **tampon** est un petit canvas hors-écran qui porte UN dessin : un visuel de tuile, une variante, un miroir, une rotation, à l'échelle courante, sous le preset courant. Sa clé est `(id du visuel, variante, miroir, rotation, échelle, fraction de grain)`. Sa taille est la boîte du dessin (`empreinteParDefaut`), plus une marge de trait.
- Le calque **pose** le tampon (`drawImage`) à une position entière au lieu de rejouer ses 14 à 20 primitives.
- **Ne sont tamponnés que les dessins de tuile**, à savoir le grain, les objets de tuile et les lisières. Le **décor** garde son dessin vectoriel : sa rotation est continue, et le décor est peu dense.
- Le cache est **vidé** en même temps que le calque (`invaliderCoucheStatique` : changement de preset) et au changement d'échelle. Il ne grossit jamais sans borne : sa taille est le nombre de dessins distincts, soit quelques dizaines.
- **Sous `?echelle=N` décimale** (debug), on tamponne quand même, en le sachant : l'image peut être très légèrement différente. C'est un outil de mesure, pas le jeu.
- **Contrat : le calque tamponné est identique au calque vectoriel**, vérifié par un scénario Chrome qui compare les deux au pixel près (§6). Si le rasteriseur diffère d'un niveau d'antialias au bord d'un tampon, la tolérance est **fixée au palier B, écrite, et motivée**, jamais découverte en cours de route.

### 4.5 Ne repeindre que ce qui entre (palier C)

- Deux canvas de calque, alloués **une fois** par échelle, qui se passent le relais (ping-pong). Plus de `createElement` à chaque reconstruction.
- Quand la vue sort de la zone pré-rendue, on **recopie** l'ancien calque décalé dans le second, puis on ne repeint que la **bande entrante**.
- **Le piège connu** (`D-01`, `D-105`) : un arbre juste hors de la bande peint *dans* la bande, et une lisière dépend de ses voisines. La bande est donc repeinte **avec un découpage (`clip`) à son rectangle**, en redessinant **toutes les cases dont le dessin peut l'atteindre** : la bande élargie de `rayonInfluence` de chaque côté, dans l'ordre de §4.3, puis le décor qui la touche. Avec un découpage et le même ordre, le résultat est **par construction** celui d'une reconstruction complète.
- **Le choix des cases à repeindre est pur** (`cellulesARepeindre(ancienneFenetre, nouvelleFenetre, rayon)`) et testé sans navigateur. Tests : aucune case oubliée, bornée par le viewport et **jamais par la taille de la scène**.
- Un saut de caméra (portail, entrée en scène, chargement) ou un changement de portes ou d'échelle fait toujours une **reconstruction complète**. Le défilement incrémental ne sert qu'à la marche.
- **Index du décor** : à l'entrée en scène, le décor est rangé **par ligne de tuiles** (une liste par `y`). Une reconstruction lit les lignes de sa fenêtre, sans parcourir toute la liste.

**Ce que le palier C a livré (24/09), là où il s'écarte du texte ci-dessus** — détails techniques, laissés à Claude :
- **Pas de `clip`** : les cases retenues sont peintes d'abord, sans découpage, puis la zone sûre est effacée et reçoit l'ancien calque recopié. Même résultat par construction, sans chemin de découpe.
- **Le décor est rangé par case**, pas par ligne : une ligne entière suit la largeur de la carte, une case non (§4.6). Chaque motif garde son rang, et l'ordre de la liste est rétabli au dessin.
- **`rayonInfluence` vit dans `src/defilement.js`**, avec `planDefilement`, `cellulesARepeindre` et l'index du décor. Le palier D y ajoutera le terme des lisières, au lieu de le créer dans `lisieres.js`.
- **La recopie n'est juste que loin des bords qui ont bougé** : la zone recopiée est l'intersection des deux fenêtres rognée du rayon de chaque côté qui a bougé, parce qu'une case de l'ancienne bande (qui sort) a pu peindre dedans.
- **Deux canvas à la taille de la plus grande fenêtre possible** (`render.js#tailleMaxCalque`), pour ne jamais les redimensionner en marchant.

### 4.6 Le budget de la carte (palier F)

Le contrat, écrit une fois pour toutes, que l'Annexe 1 et tout agrandissement de la carte Maison doivent tenir :

| Poste | Doit dépendre de | Ne doit **jamais** dépendre de |
|---|---|---|
| Une frame de marche (dessin, `maj()`) | ce qui est **à l'écran** (tuiles de la fenêtre, entités proches) | la taille de la scène, le nombre total de monstres de la carte |
| Une reconstruction du calque | la **bande entrante** (palier C) | la taille de la scène, la longueur totale du décor |
| L'entrée dans une scène | la taille de la scène (décor tiré, forêt procédurale) : c'est le seul poste où c'est permis | — mais elle a un **plafond chiffré**, mesuré (`Q-134`) |

**À mesurer au palier A, pas à présumer** : `dessinerScene` parcourt tous les monstres, interactifs et objets au sol de la scène, **sans tri hors écran**, et `maj()` fait avancer tous les monstres. Aujourd'hui, c'est une poignée d'entités : le palier A dit si c'est un coût. Si oui, le palier F ajoute un tri par la fenêtre du calque. Sinon, on l'écrit et on ne touche à rien.

## 5. Les lisières, dans les presets

| Preset | Lisières |
|---|---|
| **Bas** | Le **contour** seul, c'est-à-dire les premières primitives du dessin, par la convention du levier `grain_sol` (« les premières sont les plus importantes »). Sans grain, l'escalier d'aplats est encore plus dur à l'œil : c'est **la** chose que Bas ne devrait pas perdre. Nouveau levier `lisiere` (fraction 0 → 1) : Bas **0,3** *(provisoire, `Q-133`)* |
| **Moyen** | Complètes (levier `lisiere` à 1) |
| **Haut** | Complètes. Rien de plus en v1 : un second dessin de bord par tirage peut venir avec `Q-53`, pas avant |

Un preset ne change jamais le jeu (`specs/09` §4.1) : une lisière est un dessin, **pas** une solidité. Le chemin reste praticable jusqu'à son bord logique, même si l'herbe y mord de 6 px. Un test de l'invariant le fige.

## 6. Instruments

- **`tools/scenarios/cout_calque.mjs`** (existe) : le coût d'une reconstruction, en marchant. Comparable à lui-même seulement.
- **`tools/scenarios/traversee_nuit.mjs`** (à créer, palier A) : la nuit, Chaos actif et monstres au maximum des tables d'apparition, la même boucle à chaque fois. Il rend les **frames > 20 ms**, le **coût moyen et maximal d'une reconstruction** et le temps de `maj()`, à nu et sous bridage ×6.
- **`tools/scenarios/calque_identique.mjs`** (à créer, palier B) : extrait le calque de trois façons (vectoriel, tamponné, incrémental après un trajet) aux profils 1920 × 1080 DPR 1 et `telephone` DPR 3, puis les **compare au pixel**. C'est la preuve de « rien n'a changé à l'image » des paliers B et C : Node n'a pas de moteur de rendu, mais Chrome sans fenêtre, lui, en a un.
- **Mesure de l'entrée en scène** : durée de construction de la scène Maison (tirage du décor, forêt), relevée par `?debug=fps` au premier affichage.
- Les **relevés à la main** de Xav (§6 du suivi, `R-`) restent la seule vérité de fluidité : Chrome, F11, manette, protocole de traversée.

## 7. Paliers

### Palier A — Mesurer avant de toucher *(traite rien ; ouvre `D-189`)*

Lecture : `render.js` (l. ~313-515), `tools/scenarios/cout_calque.mjs`, `commun.mjs`, les lignes `D-01`, `D-153`, `D-02`.
1. Créer `traversee_nuit.mjs` et la mesure d'entrée en scène.
2. Relevés de référence de la branche : `cout_calque` et `traversee_nuit`, en **Bas, Moyen et Haut**, à nu et sous ×6, trois exécutions chacun.
3. Répondre par des chiffres à la question du §4.6 : que coûtent, par frame, le parcours des entités non triées et `maj()` sous la nuit la plus chargée ?
4. **S'arrêter et rendre la table.** Aucune ligne de jeu modifiée.
Relevé à la main de Xav : `R-22` (jour) et `R-23` (nuit), qui serviront de base à tout l'Annexe 1.

### Palier B — Les tampons *(traite `D-153`)*

`src/tampons.js` (clé, boîte, cache : la part pure, testée) ; le calque pose au lieu de dessiner ; le cache est vidé avec le calque ; un seul canvas de calque réutilisé. **Zéro changement visible**, prouvé par `calque_identique.mjs`. Mesure : coût d'une reconstruction, avant et après, dans les trois presets.
Validation : `V-133`. Traverser la carte de jour et de nuit, dans les trois presets : **rien ne doit avoir changé à l'image**. Regarder surtout le bord des arbres et le grain au téléphone.

### Palier C — La bande entrante *(traite le reste de `D-01`)*

Ping-pong, recopie décalée, bande élargie de `rayonInfluence` repeinte avec découpage, index du décor par ligne. `cellulesARepeindre` pur et testé ; `calque_identique.mjs` compare l'incrémental au complet après un trajet en diagonale, au pixel près. Mesure sous ×6 : le pic doit tomber, et les **frames lentes dues au calque** doivent disparaître (objectif : 8/600 → 0/600).
Validation : `V-134`. Courir en diagonale et en zigzag à travers la forêt et le long du chemin, puis franchir un portail : **aucune bande, aucune couture, aucun arbre coupé**.
**Conséquence attendue sur `Q-61`** : si le calque ne fait plus de frame lente, le point (a) de `Q-61` devient sans objet. On l'écrit, et on ne touche pas aux seuils d'Auto.

### Palier D — Les lisières, le mécanisme *(traite `Q-52`, première paire)*

Schéma (`render.lisiere`, validation au démarrage), `lisieres.js` (poses de la case, rayon d'influence), dessin tamponné dans le calque selon l'ordre de §4.3. **Une seule paire** : l'herbe sur le chemin. Dessins `visuel_lisiere_herbe_bord` et `visuel_lisiere_herbe_coin`, jugés **à la taille du jeu, en scène** (le banc visuel ne sait pas juger un sol, `E-04`).
Tests : un bord par côté dominé, un coin intérieur par diagonale seule, aucune lisière entre deux surfaces de même rang, la surface lue par `tuileDeSol`, l'ordre des poses stable, et les entrées fautives refusées au démarrage.
Validation : `V-135`. Le long du chemin de la Maison, **l'escalier se lit-il encore ?** Et les coins (angles rentrants, angles saillants, croisement de deux chemins) ?

### Palier E — Les lisières, le catalogue et les presets

Les autres paires de la Maison : l'**herbe sur la terre** du Jardin, et la **terre sur le chemin**, si Xav la veut (`Q-132`). Le levier `lisiere` dans `graphismes.json` (Bas 0,3). Le test de l'invariant « un preset ne change jamais le jeu » étendu aux lisières. Mesure du coût dans les trois presets.
Validation : `V-136`. Les trois presets, et surtout **Bas** : le contour seul suffit-il ?

### Palier F — Le budget de la carte, pour l'Annexe 1

1. Si le palier A l'a montré nécessaire : tri des entités par la fenêtre (dessin), et mise en veille des monstres lointains (`maj()`). Sinon, rien.
2. Le **plafond d'entrée en scène** (`Q-134`) écrit en données, avec son *pourquoi*, et un avertissement en console quand il est dépassé : **jamais un échec**, c'est une mesure.
3. Un test headless **d'indépendance à la taille** : sur une scène synthétique quatre fois plus grande que la Maison, le travail d'une reconstruction (nombre de cases repeintes, nombre de motifs de décor lus) **ne change pas**.
4. **La règle de l'Annexe**, ajoutée à `CLAUDE.md` : tout ticket qui agrandit la carte ou y ajoute des entités passe `cout_calque` et `traversee_nuit`, puis compare ses chiffres à ceux de clôture de cette spec. Une régression de plus de 20 % *(provisoire)* arrête le ticket et remonte à Xav.
Relevés de clôture à la main : `R-24` (jour) et `R-25` (nuit), puis l'album de référence de la carte (six vues, `docs/captures/AAAA-MM-JJ_jalon/`).

## 8. Critères de réussite

| Appareil | Attendu | Relevé |
|---|---|---|
| PC de Xav, Chrome, **Haut** | 60 fps, **0 frame sautée** en traversée, de jour comme de nuit la plus chargée | `R-24`, `R-25` |
| Scénario sous bridage ×6 (proxy, jamais un appareil) | Coût moyen d'une reconstruction **nettement sous** les 55 ms de `D-153` (palier B), et **0 frame lente due au calque** (palier C) | table du palier A, puis de chaque palier |
| Portable Pentium sans GPU, Chrome | Auto reste en **Moyen**, jouable comme aujourd'hui (58 fps), lisières comprises | à la main, par l'URL publique |
| Galaxy A04 (banc d'épreuve, `Q-57`) | **Pas** 60 fps (≈ 18 ms par frame hors du jeu, `D-31`) : on juge la **régularité**, plus aucun à-coup en marchant | à la main, par l'URL publique |
| Téléphone du neveu (`V-10`), s'il est disponible | Il devient le plancher mobile (`D-14`). S'il ne l'est pas, rien ne bloque | — |

Le visuel se juge au palier D, sur un seul point : **l'escalier ne se lit plus le long du chemin**. S'il se lit encore, la forme est à reprendre avant d'étendre le catalogue au palier E.

## 9. Questions à ouvrir au suivi

**Xav, 24/09 : « je valide Q-132, Q-133, Q-134 et Q-135 » ; la partie technique est laissée à Claude.** Ces quatre défauts sont donc des décisions ; `Q-131` (la forme) se juge au palier D.

| Id | Question | Retenu par défaut |
|---|---|---|
| `Q-131` | La **forme** : bord dentelé à fondu court (décision déléguée à Claude, §3) — Xav la voit au palier D | Bord dentelé + trois pas d'ombre |
| `Q-132` | Les **rangs** : qui mange qui ? | Herbe 3 > terre 2 > chemin 1 ; parquet, mur et porte de la Maison sans rang (bords nets) ; la Grotte n'est pas touchée |
| `Q-133` | Les lisières en **Bas** | Le contour seul, levier `lisiere: 0.3` |
| `Q-134` | Le **plafond d'entrée en scène** | Fixé au palier F sur la mesure du palier A : 2 × la valeur mesurée sur PC en Moyen |
| `Q-135` | La **tolérance** de `calque_identique.mjs` | 0 pixel différent ; tolérance écrite au palier B seulement si le rasteriseur l'impose |

## 10. Hors périmètre

La densité du décor et le catalogue de motifs (`Q-53`, rang 4 de `E-04` : la suite logique, une fois les lisières en place) · les lisières de la **Grotte** (sol, mur et eau : autre scène, autre matière) · la **forme** des tuiles d'eau (aucune eau dans la Maison aujourd'hui) · l'échelle de rendu · `D-02` (P3, rien à défendre sous Chrome) · les seuils d'Auto (`Q-61`, voir le palier C) · `D-49` · tout le contenu de l'Annexe 1 (mini-boss, énigme, tunnel), qui a sa propre spec.

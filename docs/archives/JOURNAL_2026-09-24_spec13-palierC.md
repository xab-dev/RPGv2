---
projet: RPG V2
episode/session: Spec 13, palier C — la bande entrante
type: fichier de bord
version: 1.0.0
statut: livré, validé en jeu (V-144)
catégorie: Journal
date: 2026-09-24
genere_par: claude
verifie_par: xav
---

# Fichier de bord : spec 13, palier C (24/09)

Demande de Xav : « go palier C », après un redémarrage de l'ordinateur. Un
palier, rien d'autre. Branche `carte-lisieres-perf`, pas de push.

**Identifiants** : le palier traite le reste de `D-01` (clos). La `V-134` de la
spec est déjà prise (la plume) : la validation devient **`V-144`**. `Q-135`
reçoit la tolérance du défilement (`[OUVERT]`), `Q-61` la conséquence que la
spec demandait d'écrire.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `9d2cc68` | Ménage | Journal du palier B archivé, INDEX à jour |
| (ce commit) | `D-01` — palier C | Défilement incrémental du calque, `src/defilement.js`, `calque_identique.mjs` étendu |

## 1. Ce qui a été construit

- **`src/defilement.js`** (pur) :
  - `planDefilement(ancienne, nouvelle, rayon)` : la zone **recopiée** (l'intersection des deux fenêtres, rognée du rayon du côté de chaque bord qui a bougé), les rectangles de la zone **nouvelle**, et les cases **sans dessin** (trop loin pour la toucher). `null` = saut de caméra, reconstruction complète.
  - `cellulesARepeindre` / `cellulesAPeindre` : les cases à peindre, dans l'ordre du calque. La reconstruction complète et le défilement lisent la même liste.
  - `rayonInfluence` : jusqu'où une case peint chez ses voisines, **déduit des dessins** (boîtes de `tampons.js#boiteDessin`, ombres et miroir compris ; décor borné par un cercle, sa rotation étant continue). **1 case** sur le catalogue actuel, Maison et Grotte.
  - `indexerDecor` / `motifsDesCellules` : le décor rangé **par case**, chaque motif gardant son rang ; l'ordre de la liste est rétabli au dessin.
- **`render.js`** :
  - **deux canvas de calque** (ping-pong), alloués une fois à la taille de la plus grande fenêtre (`tailleMaxCalque`) ;
  - `peindreCellules`, le seul peintre des deux chemins (l'ordre de §4.3) ;
  - `defilerCoucheStatique` : peindre les cases retenues, **puis** effacer la zone recopiée et y poser l'ancien calque ;
  - la marche défile seulement si scène, échelle, portes, décor et table des grains sont les mêmes. Sinon, et à tout saut de caméra ou échelle décimale (`?echelle=N`), la reconstruction est complète.
  - Deux instruments, que le jeu ne touche jamais : `definirDefilementActif`, `refaireCoucheStatiqueEnEntier({ dx, dy })`.
- `decor.js` exporte `ROTATION_MAX_DEG` (le rayon du décor en dépend).
- **`tests/test_defilement_2026-09-24.js`** :
  - **la preuve par le modèle** : 400 couples de fenêtres tirés (décalages jusqu'à 4 cases, fenêtres de 17-18 × 11-12 cases, rayons 0 à 2) ; sur un modèle où chaque case peint son voisinage et où l'ordre compte, le défilement donne exactement la reconstruction complète, et la zone recopiée et la zone nouvelle pavent la fenêtre. **Vérifié par mutation** : sans le rognage d'un côté, le test tombe ;
  - puis le saut de caméra, la bande bornée par la vue (66 cases sur 198 pour deux cases de marche), le rayon déduit des dessins, l'index du décor (même résultat et même ordre que le filtre de toute la liste, 10 000 motifs lointains n'y changent rien) ;
  - enfin le branchement réel de `render.js` sur un faux canvas : la marche défile ; un saut, un autre décor et l'instrument reconstruisent.
  - Le test structurel du palier B (`test_tampons`) suit la nouvelle structure. Suite : **193 fichiers verts**.

**Écarts à la lettre de la spec** (§4.5, amendée dans la spec) :
- pas de `clip` : peindre, puis recopier par-dessus, donne le même résultat sans chemin de découpe ;
- l'index du décor est par case, pas par ligne : une ligne suit la largeur de la carte ;
- `rayonInfluence` vit dans `defilement.js` : le palier D y ajoutera les lisières.

## 2. L'image : `calque_identique.mjs`, partie `defilement`

Le héros court en diagonale et en zigzag. Trois marches (le long du chemin,
autour de la Maison, au bord de la forêt), sous 3 profils × 3 presets. Le calque
défilé à l'arrivée est comparé à une reconstruction complète **de la même
fenêtre**. Chaque marche fait 5 à 9 défilements et aucune reconstruction
complète.

| Preset | Pixels différents (sur 221 184 à l'échelle 1, 3 538 944 à l'échelle 4) | Écart max |
|---|---|---|
| Bas | **0**, partout | 0 |
| Moyen | 0 à 11 | 1 |
| Haut | 0 à 40 | 1 |

**Cause, trouvée avant de décider quoi que ce soit** :
- les pixels fautifs sont éparpillés, à ±1 sur un canal, et **seulement là où il y a du décor** (Bas n'en a pas) ;
- première hypothèse, le `clip` : **démentie**. Sans découpage, les chiffres sont restés les mêmes ;
- **contre-épreuve**, ajoutée au scénario : deux reconstructions **complètes** d'origines décalées de (2, 1) cases, comparées sur leur partie commune, sans aucun défilement. En Haut, 1 à 29 pixels à 1 niveau ; en Bas, 0.

Le décor est vectoriel et posé à des positions fractionnaires. Chrome trame ses
coordonnées relativement à l'origine du calque : le même motif, tramé dans deux
calques d'origines différentes, peut différer d'un niveau d'antialias. Le calque
d'avant ce palier le faisait déjà à chaque reconstruction.
**Tolérance retenue : écart ≤ 1** (`Q-135`, `[OUVERT]`). Une case oubliée ou un
arbre coupé feraient des dizaines de niveaux.

La partie `tampons` (palier B) repasse telle quelle : dans la tolérance partout.

## 3. Le coût : avant et après, côte à côte

Chrome sans fenêtre, 1920 × 1080. **L'arbre du palier B (`9d2cc68`) est servi
sur un second port** ; exécutions alternées, même machine, même heure. Trois
exécutions par case pour `cout_calque`, deux pour `traversee_nuit`. Comme au
palier B, les chiffres absolus ne se comparent pas à ceux d'une autre soirée :
Moyen ×6 donnait 8,5-9,3 ms au palier B, et 10,6-12,1 ms ce soir pour le même
code.

### `cout_calque.mjs` : reconstruction moyenne (max), frames > 20 ms sur 600

| Preset | Bridage | Avant (palier B) | Après (palier C) |
|---|---|---|---|
| Bas | ×1 | 0,78-0,86 ms (2,5-3,0) · 0 | **0,68-0,74 ms** (4,2-4,9) · 0 |
| Bas | ×6 | 4,1-7,8 ms (6,8-58) · 0-1 | **2,8-3,1 ms** (4,9-7,1) · 0-2 |
| Moyen | ×1 | 1,53-1,66 ms (5,6-5,8) · 0 | **1,15-1,63 ms** (7,6-15,6) · 0 |
| Moyen | ×6 | 10,6-12,1 ms (28-42) · **7-13** | **6,0-6,4 ms** (11,3-12,5) · **2-4** |
| Haut | ×1 | 1,89-2,01 ms (5,8-7,6) · 0 | **1,36-1,54 ms** (7,9-10,7) · 0 |
| Haut | ×6 | 12,1-12,9 ms (23-28) · 8-12 | **7,1-7,2 ms** (11,7-13,0) · 3-6 |

- Sous ×6, la reconstruction coûte **1,7 à 2 fois moins**, et son maximum est divisé par 2 à 3.
- Le trajet ne franchit que 8 fois le bord de la zone pré-rendue. Chaque franchissement ne repeint plus qu'environ un tiers de la fenêtre, et la première reconstruction reste complète.
- **Non élucidé** : à ×1, le maximum est plus haut et plus dispersé qu'avant (7,6 à 15,6 ms, une frame par exécution), alors qu'il **baisse** sous ×6. Ce n'est donc pas un coût du défilement, qui grandirait avec le bridage. Bruit probable (ramasse-miettes) ; aucune frame > 20 ms.

### `traversee_nuit.mjs` : ×6, nuit, 12 rôdeurs, ~110 reconstructions

| Preset | Côté | Reconstruction moy / max | Frames > 20 ms (instrument) | Intervalles > 20 ms (page) |
|---|---|---|---|---|
| Bas | avant | 2,2-2,6 / 5,8-11,6 ms | 17-148 | 19-210 |
| Bas | après | **1,65-1,75 / 5,2-6,1 ms** | 8-32 | 5-25 |
| Moyen | avant | 6,9 / 13,5-26 ms | 107-136 | 31-65 |
| Moyen | après | **3,9-4,0 / 6,4-7,7 ms** | **12-25** | **12-13** |
| Haut | avant | 8,8-10,1 / 14-17 ms | 113-147 | 12-43 |
| Haut | après | **5,5-5,8 / 8,6-9,1 ms** | 34-112 | 11-74 |

**L'objectif de la spec (« frames lentes dues au calque : 8/600 → 0/600 »)**
- **En Moyen**, les frames lentes qui restent sont **au niveau de Bas**, dont une reconstruction ne coûte plus que 1,7 à 3 ms : elles ne viennent plus du calque. Sous ×6, une frame ordinaire pèse déjà ~11 ms (`dessiner()` 10-12 ms).
- **En Haut**, le bruit de la machine domine, comme au palier B (le décor dense, les ornements). Les frames lentes de Haut sous ×6 ne sont pas l'objet de ce palier. Le palier F (tri des entités) regardera ce qui reste.
- **La traversée de nuit** varie beaucoup d'une exécution à l'autre, des deux côtés (Bas avant : 17 puis 148 frames lentes). Seule la reconstruction y est stable, et c'est elle que ce palier visait.

## 4. Relevé hors ticket

- `D-200` (autosave sur l'objet vivant) reste reproduit sous ×6, des deux côtés.
- **La mémoire du calque double.** Il y a maintenant deux canvas à la taille maximale : 2304 × 1536 chacun à l'échelle 4, au lieu d'un seul de 2304 × 1408 à 2304 × 1536. Cela fait environ **28 Mo au lieu de ~13-14 Mo**, au PC comme au téléphone (échelle 4). C'est le prix du ping-pong que la spec demandait (§4.5), donc pas de ligne au suivi. À garder en tête si l'A04 manque de mémoire. Une recopie dans le même canvas éviterait le second, mais ramènerait le découpage.

## 5. Pour Xav

- **`V-144`** : courir en diagonale et en zigzag (chemin, lisière de la forêt, autour de la Maison), puis franchir un portail, dans les trois presets et au téléphone. Il ne doit y avoir **aucune bande, aucune couture, aucun arbre ni ombre coupés**. Sur le portable Pentium et l'A04, la marche doit être plus régulière.
- **`Q-135`** : la tolérance du défilement, écart ≤ 1, à confirmer.
- **`Q-61`** : le point (a) n'a presque plus d'objet. C'est écrit ; les seuils d'Auto ne sont pas touchés.
- Le palier suivant est **D** (les lisières, le mécanisme), dans une session à lui. Il devra ajouter la case d'une lisière à `defilement.js#rayonInfluence`.

## 6. Validation et clôture (24/09)

**`V-144` validée par Xav** : « V-144 : tout va bien visuellement ». « Tu peux clore cette étape et attendre mon go pour le palier D. » `Q-135` (tolérance du défilement, écart ≤ 1) reste à confirmer par Xav.

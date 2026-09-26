# État des lieux du jeu, 26/09 (spec 17, palier D)

> Palier D : état des lieux du jeu, fournis des captures d'écran dans un
> dossier à part Audit_2026_09_26 : vision globale de la carte maison
> (dézoomé), héro, feu-follet, station, monstre, + tout ce que tu jugera
> utile (décors, grain etc..) — Xav, 26/09

Toutes ces images sont rejouables :

```
node tools/capture_chrome.mjs tools/scenarios/audit_2026_09_26.mjs
RPG_PARTIES=cartes,heros node tools/capture_chrome.mjs tools/scenarios/audit_2026_09_26.mjs
```

Elles montrent le jeu tel que Chrome le dessine sans fenêtre, en `v0.9.28` (le
héros de référence, `D-286` à `D-294`), en preset Moyen sauf mention. Elles
disent « ça s'affiche ainsi », jamais « c'est réussi » : le verdict reste
celui de Xav, en jeu.

## Ce que montre chaque image

### Les cartes (`01` à `03`)

La vue d'ensemble est **dessinée par le jeu lui-même**. Le jeu n'a pas de zoom
arrière. Le scénario l'ouvre donc à `?echelle=1`, dans une fenêtre de la taille
de la scène, et élargit la résolution logique (`render.js#RESOLUTION_LOGIQUE`) à
la scène entière : la caméra, le calque, le voile et le tri du champ la
relisent à chaque frame. La lumière, la nuit et les monstres sont donc ceux du
jeu, sans assemblage.

Deux artefacts viennent du procédé, pas du jeu. Le HUD est dessiné minuscule
dans le coin haut-gauche. Le pixel vaut 1 unité, là où le jeu en montre 4 en
1080p.

| Image | Ce qu'elle montre |
|---|---|
| `01_carte_maison_jour.jpg` | La Maison entière (170 × 116 tuiles), plein jour, réduite de moitié et lissée : c'est un plan. Le héros est dans la maison |
| `01_carte_maison_jour_*.png` | Des rognures à 1 unité pour 2 pixels, au plus proche voisin : `maison`, `jardin` (le puits et le fruitier), `lisiere` (le chemin qui sort de la forêt), `steles` (les deux clairières), `champ_est`, `chaos_nord_est` |
| `02_carte_maison_nuit*.{jpg,png}` | La même carte, la nuit, au Nv.10, après 52 s : les deux zones du Chaos luisent à l'est, avec leurs rôdeurs |
| `03_1` à `03_5` | Les salles entières : la Grotte (1 et 2) et l'Annexe (1 à 3), au Nv.15, le chapitre 1 déjà vu |

### Le héros (`10` à `13`)

| Image | Ce qu'elle montre |
|---|---|
| `10_heros_directions.png` | L'atelier : les huit directions, les trois teintes des follets (lues dans `companions.json`), sur fond banc, jour et nuit (sous le voile) |
| `11_heros_angles_reference.png` | Les angles de référence de Xav (66, 76, 90, 132, 241, 300, 342°), sur quatre fonds |
| `12_heros_marche.png` | La marche rejouée à 90, 180 et 270° |
| `13_heros_en_jeu_{jour,nuit}_{bas,moyen,haut}.png` | La loupe en jeu (×5 sur le jeu en 1080p), près de la maison, dans les trois presets |

### Le follet (`20`, `21`)

| Image | Ce qu'elle montre |
|---|---|
| `20_follet_{feu,eau,terre}_{jour,nuit}.png` | Le follet en scène, avec son orbite, son sillage et la teinte qu'il donne au héros |
| `21_follets_banc.png` | Les trois follets et celui de Zéros côte à côte, en jeu ×1, ×3 et en tuile de la Poche |

### Les stations (`30`, `31`)

| Image | Ce qu'elle montre |
|---|---|
| `30_station_{table,coffre,atelier,puits}.png` | Chaque station en scène, plein jour, le héros à portée |
| `31_stations_banc.png` | Les quatre stations côte à côte, à leur échelle d'usage (2,1) |

### Les monstres (`40`, `41`)

| Image | Ce qu'elle montre |
|---|---|
| `40_monstres_banc.png` | Le rampant, le rôdeur, le cracheur, Zéros et le Gardien, côte à côte |
| `41_annexe_tireurs_echange.png` | La salle 1 de l'Annexe, en plein échange avec les cracheurs (1920 × 1080) |

### Le décor et le grain (`50`, `51`)

| Image | Ce qu'elle montre |
|---|---|
| `50_decor_banc.png` | Le chêne, le sapin, le fruitier, les deux rochers, la torche plantée allumée, la stèle, le cristal |
| `51_grain_{herbe,chemin,parquet}.png` | Le grain des trois sols, à la loupe en jeu |

### Le HUD et le menu (`60` à `62`)

| Image | Ce qu'elle montre |
|---|---|
| `60_jeu_{grand,telephone}.png` | Le jeu sous les deux profils de référence : 1920 × 1080 à DPR 1, et le téléphone (780 × 360 à DPR 3) |
| `61_hud_loupe.png` | Le HUD à la loupe |
| `62_menu_{grand,telephone}.png` | Le menu ouvert, sous les deux profils |

## Constats

### Ce qui tient

- **Le héros** se lit à tous les angles, de jour comme de nuit, dans les trois
  presets. La teinte du follet le signe sans le noyer.
- **La nuit a une composition** : la maison est une tache chaude, les stèles
  deux lueurs vertes dans la forêt, le Chaos deux nappes violettes à l'est. On
  sait où aller sans carte.
- **Les salles de la Grotte et de l'Annexe** tiennent leur ambiance : le mur
  sombre, les cristaux qui percent le voile, les rais de lumière.
- **Le fruitier (42 primitives), les cristaux et la torche** ont déjà un
  volume et une lumière proches du héros.
- **Le menu** reste lisible et fermable au téléphone.

### Les écarts, en lignes proposées au suivi (rien n'est corrigé en passant)

| Ligne | Constat | Images |
|---|---|---|
| `D-295` | **Les teintes des follets sont recopiées dans les outils, et elles ont dérivé.** `tools/atelier.html` et `tools/banc_tour.html` donnent l'eau en `#4fb3ff` (catalogue : `#3daaff`) et la terre en vert `#8fd16a` (catalogue : doré `#c2a23a`). Un héros jugé « terre » à l'atelier n'est pas celui du jeu. L'album contourne le défaut en passant les couleurs du catalogue | `10`, `20_follet_terre_*` |
| `Q-181` | **Le décor et les monstres n'ont pas le standing du héros de référence.** Le héros compte 43 primitives, un liseré de lumière en haut à gauche, des plis et des dégradés. Le chêne en a 8, le sapin 7, le grand rocher 8, les monstres 13 à 19 : des aplats sans lumière d'un côté. Côte à côte en scène, le héros semble venir d'un autre jeu. Faut-il une passe « plume d'artiste » sur les autres visuels, et dans quel ordre ? | `40`, `50`, `30_*`, `13_*` |
| `Q-182` | **De grands espaces vides.** La moitié est de la Maison (champs nord et sud, environ 100 × 116 tuiles) n'a de jour que de l'herbe et quelques cailloux ; le Chaos n'y vit que la nuit. L'intérieur de la maison est un parquet de 16 × 14 tuiles pour trois stations. Est-ce la place réservée aux annexes et aux tunnels, ou un manque à combler ? | `01_*`, `01_carte_maison_jour_maison`, `champ_est` |
| `Q-183` | **Le damier de l'herbe.** Chaque tuile d'herbe a sa teinte, et les carrés de 32 px se voient à bords francs, à la taille du jeu comme sur la vue d'ensemble. La décision en vigueur dit qu'un motif de tuile se lit comme un papier peint, **sauf continu ou dense** ; l'herbe est un sol continu | `51_grain_herbe`, `01_carte_maison_jour_lisiere` |

### Ce que l'album ne montre pas

- **Le rampant de la Grotte** n'apparaît pas sur les salles entières. Le banc
  (`40`) le montre.
- **Les torches plantées de nuit** : il faudrait une sauvegarde qui en porte.
  Le banc (`50`) montre la torche seule.
- **Les écrans profonds du menu** (Poche, Craft, Coffre) : ils ont leurs
  propres scénarios (`menus_palier_b.mjs`, `ecrans_palier_c.mjs`).

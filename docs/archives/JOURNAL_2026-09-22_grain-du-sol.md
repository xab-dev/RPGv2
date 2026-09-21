# Journal — le grain du sol (22/09)

Ticket : `D-105`. Point de départ : un topo demandé par Xav sur **le canevas de la map**,
la dernière surface du jeu qui n'avait reçu aucune passe — « on ne touche à rien pour
l'instant, je veux juste savoir où on en est et à quel point ça coûte cher d'y faire des
modifications ». Puis, après le topo : **on fait ce qui est gratuit, on note le reste.**

Périmètre, donné mot pour mot par Xav : ce que les données savent déjà faire — une
silhouette par type de tuile (`tiles.json#render.visuel`), les variantes de couleur, la
liste des motifs de décor. **Données seules, aucune ligne de code du jeu.**

## Ce que disait le topo, et ce qui s'est révélé faux

Le topo annonçait trois mécanismes « gratuits, déjà branchés ». Deux l'étaient. Le
troisième — une silhouette par type de tuile — l'est *techniquement*, mais je n'avais pas
vu ce qui le limite, et c'est la découverte de la session :

> **Un `render.visuel` de tuile est identique sur CHAQUE tuile de ce type**, dessiné à la
> même place dans la cellule. Tout motif qui se *lit* comme un motif devient donc un
> papier peint.

La première version en a fait la démonstration : trois brins groupés et deux taches douces
au milieu de la cellule, ce qui donne une tapisserie parfaitement régulière sur quinze
tuiles de large — **pire** que le damier qu'elle remplaçait. La capture est au dossier
(elle n'a pas été gardée, mais elle a coûté une itération).

Il n'y a que deux façons d'en sortir, et le choix se fait **par surface** :

1. **Un motif continu d'une cellule à la suivante.** La périodicité devient le sujet :
   un plancher *doit* être régulier. C'est le parquet — deux rainures pleine largeur et un
   joint décalé, et le sol de la Maison devient un plancher à lames. C'est la réussite la
   plus nette de la session, et elle tient précisément parce que le défaut des autres
   surfaces est ici une qualité.
2. **Un champ dense de petites marques, sans forme dominante.** L'œil n'attrape pas de
   motif quand la cellule est remplie uniformément : il lit une texture. C'est l'herbe
   (14 brins répartis sur toute la cellule, deux verts) et le chemin (12 galets
   clair/sombre). Une étape intermédiaire — une hachure à 45°, seamless par construction
   (période 32, donc continue d'une tuile à l'autre) — a été essayée et écartée : sans
   couture, oui, mais ça faisait du **tissu brossé**, pas de l'herbe.

## Le damier n'était pas une texture, c'était un pis-aller

Deuxième chose que la session a apprise, en regardant la capture « avant » : les
`variantes[]` + `variation_teinte` de l'herbe donnaient **±8 %** de luminance, ce qui se lit
comme un damier de carrés de 32 px — c'était le seul relief du sol, faute de mieux. Une
fois le grain posé, ce damier n'avait plus de rôle et ne faisait que rappeler la grille :
**±8 % → ±1,8 %** sur l'herbe, ±1,2 % sur le parquet (pour que les lames se lisent), ±2 %
sur le chemin.

## Rien n'a bougé au jeu, et cette fois c'est structurel

La leçon des stations (`D-78`) était : *redessiner une station, c'est déplacer un mur*,
parce que son empreinte solide EST la boîte englobante de ses primitives. **Pour une tuile,
c'est l'inverse** : sa solidité est un booléen (`tiles.json#solid`), pas une boîte. Le grain
du sol ne pouvait donc rien déplacer — et c'est pour cela que ce ticket, contrairement à la
refonte des stations, n'a pas eu besoin de prouver une inclusion d'empreinte.

Mais il a son propre contrat, et il est nouveau :

> **Le grain d'une tuile non solide tient dans sa cellule.** Ce qui dépasse est effacé par
> l'aplat de la tuile suivante à **droite** et en **bas** (peintes après), et peint
> **par-dessus une tuile déjà finie** à **gauche** et en **haut** — de l'herbe sur le
> chemin, ou sur un mur de la Maison. Un grain qui déborde est donc rogné d'un côté et
> intrusif de l'autre. Une tuile **solide** (arbre, rocher) garde le droit de dépasser :
> c'est ce qui donne sa hauteur à la forêt.

`tests/test_d105_grain_sol_dans_la_cellule.js` le verrouille, avec ses témoins (un brin qui
dépasse en haut, un galet qui dépasse à droite, et — à l'inverse — une diagonale de coin à
coin qui doit passer, sans quoi aucun motif continu ne serait possible). Il mesure la
**géométrie** et tolère la bavure d'un demi-trait sur le bord : c'est l'épaisseur d'un
cheveu, et c'est le prix d'un motif sans couture. Il a attrapé **deux fuites d'un
demi-pixel** avant la première capture — un brin d'herbe et la hachure de la terre.

## Le coût, mesuré avant/après

Le calque statique n'est reconstruit qu'au franchissement d'une tuile : **à l'arrêt, le sol
ne coûte rien**, et un ticket qui ajoute des primitives au sol se paie là et nulle part
ailleurs. Il fallait donc marcher pour mesurer — d'où `tools/scenarios/cout_calque.mjs`
(course de 10 s vers l'est, puis relecture de `?debug=fps`).

| | reconstruction du calque | `dessiner()` | frames > 20 ms |
|---|---|---|---|
| avant | **1,02 ms** (max 1,50) | 0,73 ms | 0/600 |
| après | **3,47 ms** (max 4,40) | 0,83 ms | 0/600 |

×3,4 sur la reconstruction pour ×14 sur le nombre de primitives (un `fillRect` par tuile
devient un `fillRect` + 14 traits) : les traits d'un pixel coûtent moins que la règle de
trois ne le laissait croire. Aucun effet sur la fluidité sous Chrome, à ~1,5 reconstruction
par seconde en marche.

**Ce n'est pas un relevé du §6** : Chrome est sans fenêtre ici, les fps n'y ont pas de sens
(aucun vsync à honorer). Seul le coût d'une reconstruction est comparable — et seulement
entre deux exécutions du même scénario, ce qui est exactement l'usage qui en a été fait.

## Le banc visuel n'a pas servi, et c'était prévisible

`tools/banc_visuel.html` juge une silhouette sur un fond neutre *choisi*. Ici, l'objet du
ticket **est** le fond : ce qu'il fallait voir — la répétition sur quinze tuiles, la couture
entre deux surfaces, la densité à l'échelle d'un écran — ne tient dans aucune vignette.
D'où `tools/scenarios/sol_maison.mjs`, cinq postes d'observation **calculés** depuis les
catalogues (une pelouse franche à huit tuiles de tout, une lisière de forêt, le chemin, le
puits, l'intérieur de la Maison) plutôt que cinq positions recopiées, qui mentiraient au
premier coup de crayon dans `scenes.json`. Album : `docs/captures/sol-2026-09-22/`, dix
paires `avant_` / `apres_`.

## Relevé sans y toucher

- `Q-52` — **les transitions entre surfaces.** À mon avis le défaut le plus visible qui
  reste sur la carte, et le grain le rend **plus** voyant : deux textures qui s'arrêtent net
  sur la même ligne d'escalier. Aucune tuile ne connaît ses voisines ; c'est un chantier
  avec une spec (une bordure déclarée en données, un choix de forme, du code neuf dans le
  calque), jamais un ticket en passant.
- `D-106` — **le décor ne sait pas sur quelle surface il pousse** (de l'herbe dans le
  salon). Connu de Xav, « pas une urgence ». Consigné sans corriger : le remède est du
  code (un motif déclare les tuiles qui le portent).
- `Q-53` — **monter la densité du décor.** ~4 motifs par écran aujourd'hui ; ~40 coûteraient
  ~1 ms de plus, ce qui est payable. Bloqué par `D-106` : multiplier la densité par dix
  mettrait dix fois plus d'herbe dans le salon. Ordre : `D-106`, puis la densité.
- `D-01` — l'hypothèse que la ligne portait depuis le 19/09 est **vérifiée par lecture du
  code** : la fenêtre se reconstruit à **chaque tuile franchie**, donc la marge d'une tuile
  ne sert pas d'amortisseur. Un troisième remède, plus simple que le défilement
  incrémental, y est nommé : ne reconstruire que quand la vue **sort** de la zone
  pré-rendue.

## Ce qui reste dû

`V-55` — le verdict en jeu, et il porte une question que les captures ne peuvent pas
trancher : **en marchant, est-ce qu'on attrape la répétition ?** C'est la limite du
mécanisme, pas un réglage. La terre (`tile_terre`) a reçu son grain mais **n'existe pas sur
la carte actuelle** : elle est déclarée, jamais posée — donc non vérifiée en scène.

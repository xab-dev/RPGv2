---
projet: RPG V2
episode/session: Retouches graphiques — rocher, arbre du chemin, leviers, murs et toit de la Maison
type: fichier de bord
version: 1.0.0
statut: clos
catégorie: Journal
date: 2026-09-22
genere_par: claude
verifie_par: xav
---

# Fichier de bord — retouches graphiques (22/09, soir)

Consigne de Xav : « on fait uniquement des retouches graphisme » sur **le grand rocher**, **les
murs et le toit de la Maison**, **l'arbre au milieu du chemin** (celui qui se récolte) et **les
leviers**. On **ne touche pas** : la forêt (« je l'aime bien telle quelle »), les monstres, la
Grotte — polish ultérieur. `Q-70` reporté. Procédure : diagnostic → conceptualisation →
itérations, sous Chrome et avec les outils ; **un commit par item**, un de plus au-delà de trois
itérations. Pas de `push` sans son go.

Outil : `tools/scenarios/retouches_decor.mjs` (un poste par élément, `SUFFIXE=avant|apres`).
Captures : `docs/captures/retouches-2026-09-22/`.

## Diagnostic d'entrée (captures `avant_*`, en scène, plein jour)

1. **Grand rocher** (`tile_rocher`, (34, 61)) — un **carré gris uni** (`#666666`) planté dans
   la pelouse, avec au milieu un caillou minuscule de 2 primitives (`visuel_rocher_grand`).
   Défaut n° 1 du fruitier, en pire. Et `visuel_rocher_grand` sert AUSSI au décor de la Grotte
   (`scenes.json`, décor pondéré) : le retoucher changerait la Grotte, qui est hors périmètre —
   le rocher récoltable prend donc **son propre** visuel.
2. **Arbre du chemin** (`tile_arbre`, (20, 57)) — un **carré vert sombre** au milieu du chemin
   de terre, et la sucette de la forêt (3 primitives, `visuel_arbre`). Même contrainte : le
   visuel est partagé avec `tile_arbre_fond` (la forêt, **à ne pas toucher**) — l'arbre qui se
   récolte prend son propre visuel.
3. **Leviers** (Grotte, `visuel_levier`) — un bâton et une boule grise, 2 primitives ; l'état
   ne se lit qu'à la teinte de la boule (gris → jaune). Pas de socle, pas de volume.
4. **Murs de la Maison** (`tile_mur_maison`) — un **aplat uni** `#7a5c3e`, sans visuel : une
   bande brune qui ne dit ni pierre, ni bois, ni hauteur.
5. **Toit** (`tile_toit`) — un **rectangle plat** `#5c4530` peint par `render.js`, sans rien
   dessus. C'est le seul des cinq qui ne se retouche pas en données : le toit ne lit qu'une
   couleur.

Relevés **hors périmètre**, notés sans être traités : des objets au sol (caillou, herbe) et une
flaque de décor apparaissent **sur le parquet**, à l'intérieur de la Maison.

## Commits

| # | Item | Ce qui est livré | Itérations | Commit |
|---|---|---|---|---|
| 1 | **Grand rocher** (`D-128`) | Un visuel **propre** (`visuel_rocher_recoltable`) : la Grotte garde `visuel_rocher_grand`. Sol = l'herbe (aplat, variantes, grain recopié), fin du carré gris. Un bloc de la famille d'`item_pierre` (anguleux, froid, facetté) en trois valeurs + une face à l'ombre, une petite pierre au pied droit qui casse la boule, l'ombre portée sur l'herbe. Accent : des **éclats de quartz** épars. 2 → 32 primitives | **2** — le premier filon, horizontal sous une fissure, faisait lire **un visage** (œil + bouche) | voir git |
| 2 | **Arbre du chemin** (`D-129`) | Un visuel **propre** (`visuel_arbre_recoltable`) : la forêt garde `visuel_arbre`, intacte. Sol = le chemin (aplat, variantes, grain recopié), fin du carré vert au milieu de la terre battue. Un vieux feuillu dans les **verts de la forêt** (il en fait partie) : tronc large en trois valeurs, deux racines qui mordent le chemin, six lobes. Accent : une **entaille de bûcheron** au bois clair d'`item_bois` — ce qu'on vient y faire. 3 → 41 primitives. **Réserve** : le sol est lié au chemin ; une lettre `A` posée demain dans l'herbe referait un carré (`Q-70`) | **2** — la première entaille, un triangle clair sur le tronc, se lisait comme un bouton « lecture » ▶ ; refaite en trois quarts (face en pente dans l'ombre, plancher de coupe éclairé) | voir git |
| 3 | **Leviers** (`D-130`) | Un socle de pierre de trois quarts (les gris des murs de la Grotte), une fente, un manche de bois incliné en trois valeurs, un pommeau de métal. **Deux pièces teintées** au lieu d'une : le pommeau et un **voyant** sur la face du socle — l'état se lit à deux endroits. Leur volume est en **alpha pur** (règle `D-98`), sinon le pommeau jaune tournerait à l'olive. Empreinte nulle (levier non solide) : aucune zone d'interaction ne bouge. 2 → 13 primitives | **2** — l'ombre alpha du pommeau couvrait la moitié de la sphère et salissait le jaune ; réduite à un croissant. Au passage : le scénario ne savait pas allumer un levier (l'état vit dans `save.puzzles`, pas dans le flag), corrigé | voir git |
| 4 | **Murs de la Maison** (`D-131`) | Un visuel pour la tuile (`visuel_mur_maison`), qui n'avait qu'un aplat. **Des moellons de pierre** en trois assises inégales ; l'aplat devient le mortier, chaque pierre a son arête haute éclairée et son pied sombre, six tons alternés. La pierre plutôt que le bois parce que les quatre côtés partagent la même tuile : une pierre se lit dans toutes les orientations, une planche non. Le motif se raccorde d'une case à l'autre : l'assise du milieu **chevauche** le bord de la case. 0 → 21 primitives | **2** — la première version, en petites assises régulières de 8 px, faisait **mur de briques**, et un joint à chaque bord de case dessinait une grille | voir git |
| 5 | **Toit de la Maison** (`D-132`) | Le seul item qui demande du **code**, car `render.js` peignait le toit d'une couleur unie sans jamais lire de visuel. La tuile `tile_toit` porte désormais un motif (`visuel_toit_bardeaux`), et `render.js#dessinerToit` le pose en **un seul remplissage** par motif répété (`createPattern`), jamais cellule par cellule (le toit se redessine à chaque frame : 224 cellules × une vingtaine de formes). Remplissage en pixels physiques entiers, motif ancré au coin du toit. Sans visuel, ou si `createPattern` rend `null`, c'est l'aplat d'avant. Vérifié à DPR 3 (profil téléphone) et à mi-fondu. Motif : bardeaux de bois **à bas arrondi**, en rangs décalés, découpés à la cellule pour se raccorder (test) | **3** — (1) bardeaux de 8 px : **vannerie** ; (2) bardeaux rectangulaires de 16 : **briques** ; (3) bas arrondi : des écailles, ça se lit comme un toit. Entre-temps le tour de dessin à faux contexte (`D-71`) a levé (`document`, `DOMMatrix`) : `DOMMatrix` retiré (on translate le contexte), `null` traité, et le faux contexte rend désormais un motif, pour que ce chemin soit **parcouru** | voir git |

## Clôture

Les cinq items sont livrés, un commit chacun ; aucun n'a dépassé trois itérations. Tests verts (135 fichiers). Verdict en jeu dû : `V-74`. Ouverts par la session : `Q-71` (un levier allumé ne change que de couleur), `D-133` (objets et flaque sur le parquet, à qualifier). `Q-70` reste reporté.

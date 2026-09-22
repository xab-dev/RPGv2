---
projet: RPG V2
episode/session: Retouches graphiques — rocher, arbre du chemin, leviers, murs et toit de la Maison
type: fichier de bord
version: 1.0.0
statut: en cours
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

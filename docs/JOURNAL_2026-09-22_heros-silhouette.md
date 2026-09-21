# Journal de bord — `D-104`, la silhouette du héros (22/09)

Un ticket, un commit, branche `heros-silhouette-2026-09-22`. **Données seules** :
aucune ligne de code du jeu touchée (un test et un scénario de capture en plus).

## Ce que le ticket livre

`data/visuels.json#visuel_heros` : le disque gris de trois cercles devient un
**personnage encapuchonné vu de trois quarts**, dont le visage est une **boule
lumineuse** logée dans l'ombre de la capuche. Référence donnée par Xav : une
photo de capuche noire où seul un fil de lumière dessine la forme.

Treize primitives, dans cet ordre (arrière → avant) :

| # | rôle |
|---|---|
| 1-2 | le manteau : creux presque noir, puis corps — épaules arrondies, ourlet bombé |
| 3-4 | deux slivers pâles : l'arête extérieure du manteau, et la pente de l'épaule gauche |
| 5-6 | la capuche : même couple creux/corps, en goutte penchée |
| 7-8 | le **liseré** : vif sur l'arête avant-gauche, sourd sur l'arête droite |
| 9-10 | l'ouverture : une ellipse pâle **glissée vers le haut**, puis l'ellipse noire du creux par-dessus — le croissant qui dépasse EST le bord éclairé de la capuche |
| 11-13 | la **lueur du visage** : trois cercles concentriques `teinte: true` (halo, corps, noyau) |

## Les décisions de dessin, et pourquoi

**La teinte du compagnon quitte le corps et se concentre sur le visage.** Avant
ce ticket, tout le héros prenait la couleur du follet ; désormais une seule
chose la porte, et c'est celle qui brille. C'est ce qui rend la silhouette
lisible à 14 px : le contraste maximal qu'on puisse obtenir à cette taille est
un point lumineux dans une masse noire, pas une nuance de vêtement.

**Aucune forme nouvelle** (leçon des stations, 21/09) : le trois quarts, le
volume et le liseré s'obtiennent en **glissant ou en réduisant la même forme** —
le croissant du bord de capuche est une ellipse pâle que l'ellipse noire
recouvre aux trois quarts, les slivers sont des polygones à quatre points posés
sur la bande de creux.

**La lueur est une lueur, pas une aura.** Trois cercles, `alpha` 0,10 / 0,22 /
plein : le halo déborde d'un peu moins d'un demi-visage sur le bord intérieur de
la capuche — assez pour que la boule éclaire ce qui l'entoure, pas assez pour
faire un second follet. Un point spéculaire blanc a été essayé puis **retiré** :
il faisait une perle, donc un œil.

**Le héros n'est jamais plus large que ce qui entre en collision.** Sa hitbox
est un carré de côté `2 × RAYON_HERO_BASE_PX × echelle` centré sur le point
logique (`main.js#hitboxHeros`) — contrairement à une station, elle ne dérive
**pas** de la boîte du dessin, donc redessiner le héros ne déplace aucun mur.
Reste une relation qu'on ne peut pas contredire sans le voir en jouant : l'ourlet
du manteau est calé exactement sur la demi-boîte (10 unités). En **hauteur**, la
silhouette dépasse librement : la boîte est son emprise au sol, pas sa taille.

**`echelle` n'a pas bougé** (0,643). La taille du héros reste ce que Xav a validé
(`V-14`), et c'est aussi ce qui garantit que la hitbox est identique au pixel près.

## Itérations, et ce qu'elles ont appris

1. **Capuche trop conique, ouverture trop grande** → une pyramide avec un œil,
   façon œil de Sauron. La capuche a été reprise **courbe** (crâne bombé à
   l'arrière, pointe penchée), l'ouverture ramenée à ~55 % de sa largeur et
   descendue : il faut une **bande de capuche visible au-dessus** du visage pour
   qu'on lise « il est dedans ».
2. **Épaules en socle à angles vifs** → un pion d'échecs avec un col. Reprises
   en pente arrondie, du cou vers le bras.
3. **Le liseré remonté d'un cran à la fin** : `save.js` documente depuis la
   Phase 1 une intention explicite — « un contour clair pour rester lisible même
   dans la pénombre ». Le disque la portait par son cercle clair de 22 ; c'est
   maintenant le liseré de la capuche qui en a la charge.

## Vérifications

- `tests/test_d104_silhouette_heros_2026-09-22.js` — **des relations, jamais des
  valeurs** (règle `D-52`) : la teinte est centrée sur l'ouverture et n'en
  déborde pas de plus d'un demi-visage · la lueur tient dans la capuche · la
  demi-largeur dessinée ≤ la demi-boîte de collision · trois valeurs au moins
  hors teinte · le héros est posé (ombre portée). **Avec témoin** : le disque
  d'avant `D-104` échouerait aux deux premières.
  Le test ne réutilise pas `structures.js#boitePrimitive` : elle rend une hauteur
  **nulle** pour un `cercle` (`D-81`) — soit exactement les primitives de la lueur.
- **112 fichiers de test verts.**
- `tools/scenarios/heros_scene.mjs` (neuf) — la silhouette **en scène**, sous
  Chrome sans fenêtre, parce que le banc visuel juge sur un fond neutre *choisi*
  et la scène sur la vraie terre (leçon de l'établi, 21/09) : les trois teintes
  de compagnon en plein jour, la nuit, et la Grotte d'une partie **neuve**
  (teinte neutre, avant le choix du follet). Avec la **loupe** en unités
  logiques de `hud_polish.mjs` — le héros fait 14 px, on ne verrait rien sinon.
- Album : `docs/captures/heros-2026-09-22/`.

## Ce que les captures disent, et que le banc ne pouvait pas dire

- **Le manteau prend la couleur de la lumière du follet** (rayon 100 px) : brun
  chaud avec le feu, gris-bleu avec l'eau. Personne ne l'a codé, c'est le calque
  de lumière existant — et c'est joli.
- **La nuit ne change presque rien autour du héros** : il est toujours à
  l'intérieur de sa propre lumière de follet, donc la lueur du visage ne se
  détache pas davantage. La capture de nuit vaut surtout comme constat.
- **Dans la Grotte, avant le choix du follet**, la teinte est le gris neutre :
  le visage luit à peine et la silhouette est très sombre. Elle se lit, mais
  c'est le point le plus discutable du ticket — à juger manette en main.

## Relevé sans y toucher

- `Q-51` — le héros ne regarde toujours nulle part (aucune orientation en
  données). C'était hors périmètre, annoncé avant le go.

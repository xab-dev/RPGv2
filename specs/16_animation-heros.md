---
projet: RPG V2
spec: 16 — L'animation du héros
version: 1.0.0
statut: écrite (nuit du 26/09), à valider par Xav
date: 2026-09-26
genere_par: claude
verifie_par: xav
---

# 16 — L'animation du héros : toutes les positions du joystick

## 0. La demande

> Quand tu seras assez satisfait du polish […] j'aimerais bien qu'on se
> concentre sur l'animation, pas qu'on ait juste 8 positions, mais qu'on
> représente toutes les positions joystick de façon fluide. Xav ne sait pas du
> tout comment ça marche, si c'est possible de le faire en dehors de Godot, ni
> si c'est coûteux de le faire (8 sprites sont assez ? 16 ?). — Xav, 26/09

Réponse avant la question « combien de sprites » : **le héros n'est pas un
sprite**. C'est une pile de primitives (polygones, ellipses, dégradés)
dessinée à chaque frame par `visuels.js`, dont des PIÈCES bougent selon une
POSE (`poses.js` : un déplacement, une rotation, une échelle, un pli — une
dizaine de nombres par pièce). Une pose entre deux poses se calcule : on
mélange les nombres. Huit poses écrites à la main (dont trois en reflet)
suffisent pour en montrer 360, comme huit images clés d'un dessin animé
suffisent au logiciel pour faire les intervalles. C'est ce que fait Godot
avec un `AnimationPlayer` sur des os : rien ici n'en a besoin.

Coût : mélanger une dizaine de nombres pour six pièces, par frame — rien ; le
seul calcul qui compte (le pli de la capuche, ~300 points) se garde par angle
au degré près, donc se fait une fois par degré, jamais à chaque frame. Aucun
fichier image, aucun poids en mémoire qui grandisse avec le nombre d'angles.

## 1. Ce qui est acquis et ne change pas

- La direction du GAMEPLAY (`orientation.js#avancerOrientation` →
  `direction`, huit secteurs, la marge de bascule, le regard du tir) : elle
  reste ce qu'elle est, et ce que les tests en disent. L'animation est un
  état d'AFFICHAGE à part, jamais sauvegardé.
- Les huit poses clés du héros (validées une à une en jeu, `D-252` à
  `D-260`) : l'animation ne les retouche pas, elle passe par elles.
- La lumière vient d'en haut à gauche dans toutes les vues.
- Aucun effet ne bat au-delà de 3 Hz.

## 2. Le modèle

### 2.1 L'angle affiché

`orientation.js` tient, à côté de `direction`, l'**angle affiché** du héros
(en degrés, à l'écran : 0 = est, 90 = sud) et l'**angle visé** :

- la marche vise l'angle EXACT du geste (le stick analogique donne tous les
  angles ; le clavier, huit) ;
- un tir vise sa cible ;
- l'angle affiché tourne vers l'angle visé par le plus court chemin, à une
  vitesse bornée (`VITESSE_ROTATION_DEG_S`, provisoire ; plus vive pendant le
  regard d'un tir) — un demi-tour se voit, il ne claque pas.

### 2.2 Une pose à tout angle (`poses.js#poseAAngle`)

Les directions déclarées (`orientations`, et leurs `reflets`) sont des
**clés** posées sur le cercle, tous les 45°. À un angle quelconque, chaque
pièce prend le mélange des poses de ses deux clés voisines :

- les nombres se mélangent linéairement (déplacement, rotation, échelles,
  cisaillement, pli, rabat) ; une pièce non posée vaut la pose neutre ;
- une pièce cachée à une clé (`null`, ou une pièce `cachee` non posée)
  s'y efface : son opacité va à zéro, et — si la pièce déclare sa
  `fuite` — elle glisse d'autant vers le bord, où la silhouette de la
  capuche la découpe (l'œil qui passe derrière le bord de la capuche quand
  le héros se détourne) ;
- **le reflet** : entre deux clés dont l'une est un reflet et l'autre non
  (`sud` et `sud_est`), tout le segment se dessine en reflet. Le seul saut
  du tour est donc au passage exact de `sud` et de `nord`, là où la vue et
  son reflet sont presque les mêmes (mesuré : moins d'un pixel de contour à
  la taille du jeu). `[OUVERT]` : si Xav le voit, rendre la vue de face
  symétrique, ou fondre le passage.

### 2.3 Le rendu

`dessinerVisuel(…, { angle })` : un angle remplace la direction. Sans angle,
rien ne change (les bancs, les tests, tout autre visuel).

## 3. Les paliers

- **A — Le tour continu.** `poseAAngle`, l'angle dans `dessinerVisuel`, les
  fondus d'apparition, la `fuite`. Le banc du tour (`tools/banc_tour.html`) :
  le héros qui tourne, un curseur d'angle, un pavé qu'on tire comme un
  stick. Critère : aux angles clés, le dessin des huit poses validées, au
  pixel près ; entre elles, aucun saut (hors le reflet, §2.2).
- **B — Le héros tourne en jeu.** L'angle affiché et l'angle visé dans
  `orientation.js`, la vitesse de rotation, le stick analogique, le tir ;
  `main.js` passe l'angle au rendu. Critère : Xav tourne au joystick, « comme
  un phare », sans palier visible.
- **C — Le souffle et le pas.** À l'arrêt, une respiration lente (la cape et
  la capuche montent et descendent d'une fraction d'unité, ~0,25 Hz) ; en
  marche, un balancement au rythme du pas (≤ 2 Hz), la cape qui se soulève
  un peu. En données (`animations` du visuel : une pièce, un paramètre de
  pose, une amplitude, une période), sous le seuil de 3 Hz. Critère : Xav le
  sent vivant sans le remarquer.

## 4. Hors de cette spec

Une animation d'attaque ou de compétence, un clignement (un œil qui
s'éteint et se rallume flirte avec le seuil de 3 Hz : à discuter), la marche
des monstres et des follets.

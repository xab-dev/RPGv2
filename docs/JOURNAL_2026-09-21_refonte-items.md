# Journal de bord — refonte graphique des items de la poche (21/09)

Session **autonome supervisée**, branche `main`, **un commit par item** (et un
commit de plus si un item dépasse trois itérations). Consigne de Xav :
« refonte graphique des items de l'inventaire. On ne touche pas au menu, on ne
touche pas aux fonctionnalités, on ne touche pas au code déjà présent. Tous les
items doivent être améliorés, y compris la plume, qui va être la première et qui
servira de référence pour les autres. Le but étant de coller aux standings
actuels des stations et du jeu en général. »

Procédure imposée, par item : **1. diagnostic** (Chrome + `tools/`) — **2.
conceptualisation** — **3. application itérative**.

Fichier de bord tenu **au moment de chaque commit** (règle d'hygiène de contexte
de `CLAUDE.md` : l'état d'une file longue vit sur le disque).

---

## Diagnostic d'ouverture (les dix items, au banc visuel, aux tailles réelles)

`tools/banc_visuel.html`, sous Chrome, aux trois tailles que le jeu montre
vraiment (monde DPR 1, monde DPR 3, tuile de la Poche). Constat commun :
**les dix items datent d'avant la refonte du puits et des stations.** Deux ou
trois primitives plates chacun, aucune ombre portée, deux valeurs au mieux,
aucun accent de couleur. À côté du Coffre ou de l'Atelier refaits la veille,
ils n'ont pas le même standing — ce que Xav appelle « coller au standing ».

| item | ce qu'on voit aujourd'hui |
|---|---|
| `visuel_plume` | la mieux travaillée (39 primitives, `D-76`), mais elle **flotte** : aucune ombre, une tige d'une seule valeur, aucun accent |
| `visuel_branche` | un parallélogramme brun plat ; le rameau se confond avec le fût |
| `visuel_caillou` | un polygone gris + une facette pâle en `alpha` |
| `visuel_fruit` | un disque rouge + une pastille claire ; lisible, mais plat |
| `visuel_fruit_cuit` | le même en brun ; rien ne dit « cuit » |
| `visuel_hache` | un bâton + un quadrilatère gris — se lit comme un **couperet**, et la silhouette est **décentrée** (boîte de `x = 0` à `x = 5`) |
| `visuel_pioche` | un losange sur un manche — se lit comme une pelle ou un diamant |
| `visuel_bois` | un rectangle plat + deux ellipses **plus sombres** aux bouts, qui se lisent comme des trous |
| `visuel_pierre` | un polygone gris + une facette, en plus gros que le caillou |
| `visuel_icone_epee_bois` | trois rectangles empilés |

## La charte d'item (conceptualisation, arrêtée sur la plume puis appliquée aux neuf autres)

Reprise de ce qui fait la facture du puits et des stations, ramenée à la taille
d'un item :

1. **L'objet est POSÉ** — une `ombre` portée, discrète, sous la silhouette.
   C'est elle qui fait la différence entre un objet au sol et une vignette qui
   flotte. (`ombre` ne compte pas dans `empreinteParDefaut` : le cadrage de la
   tuile de Poche n'en est pas affecté.)
2. **Trois valeurs au moins** — un fond sombre qui sert de contour, un corps
   médian, une facette éclairée. Deux valeurs font une tache ; trois font un
   volume.
3. **Un accent, un seul** — la couleur qui dit ce que l'objet *est* (le fil
   d'acier d'un outil, l'aubier clair d'un bois coupé, la chair d'un fruit).
4. **Le trois quarts sans forme nouvelle** — polygone trapézoïdal, ordre de
   dessin, paire de pièces décalées : `visuels.json` a déjà tout ce qu'il faut
   (leçon de la refonte des stations).

**Contrainte que je m'impose, sur le précédent des stations et de `Q-47`** :
chaque silhouette est refaite **dans l'enveloppe mesurée avant son ticket**.
Un item n'a pas d'empreinte solide (aucune collision), mais sa taille est une
**décision de jeu**, pas de dessin — et le cadrage de la tuile de Poche
(`ui/icone_canvas.js#cadrer`) bascule si la boîte sort de ± 7. Inclusion
prouvée par test, aux trois échelles.

Enveloppes de départ (unités, `empreinteParDefaut`) :

```
visuel_plume            x -4.19  y -5.10  w  7.50  h 10.10
visuel_branche          x -6.00  y -4.00  w 12.00  h  7.00
visuel_caillou          x -4.00  y -3.00  w  8.00  h  6.00
visuel_fruit            x -4.00  y -6.00  w  8.00  h 10.00
visuel_fruit_cuit       x -4.00  y -6.00  w  8.00  h 10.00
visuel_hache            x  0.00  y -11.00 w  5.00  h 17.00
visuel_pioche           x -6.00  y -12.00 w 12.00  h 18.00
visuel_bois             x -6.50  y -3.00  w 13.00  h  6.00
visuel_pierre           x -6.00  y -5.00  w 12.00  h 10.00
visuel_icone_epee_bois  x -2.50  y -5.50  w  5.00  h 11.30
```

---

## Commits

### `D-82` — la plume (l'item de référence)

**Diagnostic** : la mieux travaillée des dix (`D-76`, validée `V-49`), et
pourtant elle **flotte** — aucune ombre portée. Sa tige est un trait d'une
seule valeur, et le dessin entier n'a **aucune couleur** qui ne soit un gris.

**Conceptualisation** : ne pas rouvrir un dessin validé. Les barbes restent
telles quelles ; on n'ajoute que les trois points de la charte.

**Application, trois itérations** :

1. Barbes régénérées d'un coup, avec une tige neuve. **Jetée** : à 19 barbes
   courtes et serrées, le fan se referme en masse et la plume se lit comme une
   **truelle**, le liseré sombre faisant office de tranchant. Leçon immédiate,
   et c'est elle qui fixe la méthode pour les neuf items suivants : *on ne
   régénère pas ce qui a déjà été validé en jeu.*
2. Barbes de `D-76` reprises à l'identique (extraites de `git show HEAD`),
   tige refaite en trois valeurs + calame. Lisible du premier coup.
3. Recalage : la ligne de creux, décalée d'une demi-épaisseur vers le bas,
   sortait de l'enveloppe d'origine de 0,22 unité — **c'est le test qui l'a
   dit**, pas l'œil. Départ de la tige repoussé à 2 % de sa course.

**Livré** : `ombre` (8 × 2,4, alpha 0,24), tige `#6f6757` / `#d8d2c4` /
`#f4efe4`, calame `#b9995f` + `#e0c98f`. 43 primitives (38 barbes inchangées).
Enveloppe `x -4,19 · y -5,10 · w 7,50 · h 10,09` — **incluse** dans celle
d'avant. 111 fichiers de test verts.

Ouvert au passage, sans y toucher : **`Q-48`** (les outils font 17-18 unités
contre 6 à 10 pour le reste — une décision de jeu, pas de dessin).

### `D-83` — la branche

**Diagnostic** : deux primitives, dont un trait brun de 3 unités d'épaisseur.
Un parallélogramme plat ; à la taille du monde, le rameau se confond avec le fût.

**Conceptualisation** : un fût **conique** (le bois n'a pas la même grosseur aux
deux bouts), les trois valeurs obtenues en glissant le **même** fût le long de
sa perpendiculaire, et pour accent la **cassure** au talon — l'aubier clair, qui
dit « arrachée à un arbre » et non « bâton taillé ».

**Application, deux itérations** :

1. Fût + rameau + écorce + cassure. La fourche n'écartait que de 18° : le rameau
   se lisait comme une **écharde** en train de se détacher.
2. Fourche portée à ~40°, ombre resserrée (12,2 × 2,7 au lieu de 13,4 × 3,2,
   qui dominait la vignette au cadrage de la Poche).

**Note d'outillage écrite en chemin** : la comparaison d'enveloppe du test a dû
changer de mesure. `structures.js#boitePrimitive` **ignore l'épaisseur d'une
ligne** — la branche d'origine couvrait 1,5 unité de plus que sa boîte de chaque
côté. Comparer les boîtes officielles aurait fait passer pour un agrandissement
le simple fait de redessiner un trait épais en polygone, **à pixels
identiques**. Le test compare donc l'étendue **réellement peinte**
(`boiteDessinee`, locale au test), et le contrôle de cadrage de la tuile de
Poche est devenu un **régime relevé** (`CADRAGE_COMMUN_AVANT`) : huit items sur
dix partagent le cadrage commun, la hache et la pioche sont recadrées — le
constat qui a ouvert `Q-48`.

### `D-84` — le caillou

**Diagnostic** : un polygone gris + une facette pâle en `alpha`. Deux valeurs,
aucun contact au sol — et surtout, **rien ne le distingue de la pierre** que sa
taille.

**Conceptualisation** : le second défaut commande le premier. Le caillou devient
un **galet** (lisse, rond, gris **chaud**) et la pierre restera un **rocher**
(anguleux, froid, facetté). Ce qui les sépare cesse d'être une affaire de taille.
Les trois valeurs s'obtiennent en **réduisant le même contour** autour de son
centre (`reduire`) : jamais trois silhouettes dessinées à la main, qui
divergeraient à la première retouche.

**Application, deux itérations** :

1. Silhouette + corps + facette + éclat + deux grains sombres pleins. Les deux
   grains, contrastés et posés sous un éclat clair, se lisaient comme des
   **yeux** : le galet avait une tête.
2. Grains passés en `alpha` (0,4-0,45) et aplatis, déplacés de part et d'autre.

### `D-85` — la pierre

**Diagnostic** : le caillou en plus gros, au sommet près.

**Conceptualisation** : l'autre moitié du parti pris de `D-84`. Rocher
**anguleux, froid, facetté** contre galet lisse, rond, chaud. Les facettes sont
dessinées **à la main** — `reduire` donne un volume *lisse*, or ici ce sont des
plans qui se coupent, et les arêtes doivent se voir.

**Application, deux itérations** :

1. Dix sommets rapprochés : le contour redevenait celui d'un galet, et les
   facettes ne s'expliquaient plus. Fissure en **trait** posée au milieu de la
   pierre : bouts arrondis, isolée de tout — une **lame plantée là**.
2. Huit sommets, angles francs ; la fissure devient un **coin** qui part du
   point de rencontre des facettes.

### `D-86` — le bois

**Diagnostic** : un rectangle brun plat et deux ellipses aux bouts, **plus
sombres que le fût** — donc lues comme des trous percés dans une planche.

**Conceptualisation** : la lecture s'inverse en inversant la valeur. Le bout
arrière reste sombre, mais celui de devant devient la **section de coupe** :
aubier clair et cernes concentriques. C'est l'accent, et c'est aussi ce qui dit
« bûche fendue » plutôt que « planche ».

**Application, deux itérations** :

1. Trois bandes + section à cernes + deux entailles d'écorce. À ras du
   rectangle, l'ellipse arrière se réduisait à un liseré : la bûche finissait
   sur une **coupe droite**, comme une carte posée à plat.
2. Fût raccourci de 0,6 unité pour que l'ellipse arrière **déborde** et fasse
   un bout rond.

### `D-87` — le fruit

**Diagnostic** : un disque rouge, une pastille claire, un trait vert. Et le vrai
défaut, le même couple que caillou/pierre : **rien ne le sépare du fruit cuit**
qu'une teinte.

**Conceptualisation** : la couleur d'identité (`#d94a3d`) est conservée — c'est
elle qu'on reconnaît de loin ; ce qui s'ajoute, ce sont trois **signes** que le
fruit cuit n'aura pas : une **feuille** (seul vert du dessin, et l'accent), une
peau tendue, un éclat net.

**Application, une itération** (plus un recalage de 0,08 unité demandé par le
test : la masse ombrée sortait par le bas).

### `D-88` — le fruit cuit

**Diagnostic** : le fruit cru à la teinte près.

**Conceptualisation** : il garde sa couleur d'identité et **perd** les trois
signes du cru posés par `D-87` — plus de feuille, plus de peau tendue, plus
d'éclat net —, puis gagne ce que la cuisson donne : une **fente** d'où sort la
chair claire (l'accent) et un brûlé du côté de la braise.

**Application, trois itérations** (le plafond que Xav a fixé), toutes sur ces
deux détails :

1. Fente longue et droite → un **pansement collé** sur le fruit. Brûlé petit et
   dense → un **trou**.
2. Fente raccourcie et courbée, partant du haut où la peau cède ; brûlé adouci.
   Toujours ramassé, il se lisait alors comme un **haricot** posé dessus.
3. Brûlé devenu une ombre large et très diluée (4,6 × 2,7, `alpha` 0,22).

### `D-89` — la hache

**Diagnostic** : un trait brun surmonté d'un quadrilatère gris — un **couperet**.
Et un second défaut, mesuré au passage : la silhouette est **décentrée**, x de
−1 à 5. Posée au sol, elle se tiendrait entièrement à droite de son point
logique. (Invisible aujourd'hui : la hache ne s'y pose pas, elle se fabrique, et
dans la Poche `cadrer` la recentre déjà sur sa boîte. Recentrée quand même —
c'est un piège en moins.)

**Conceptualisation, et c'est elle qui a coûté trois itérations** : la lecture
« hache » ne tient ni à l'œil, ni au tranchant. Elle tient à **une lame en
croissant qui descend le long du manche**, tranchant vers l'extérieur, rattachée
par un collier. Un fer aussi haut que large et centré sur le manche donne un
maillet, quels que soient les détails qu'on y ajoute.

**Application, trois itérations** (le plafond) :

1. Fer quasi carré + œil + tranchant → **maillet**, l'œil lu comme une panne
   fendue de marteau.
2. Fer évasé, plus large que haut → toujours un maillet : il restait **posé
   sur** le manche.
3. Lame en croissant **le long** du manche + collier → hache.

### `D-90` — la pioche

**Diagnostic** : un losange gris posé à plat sur un manche — une pelle, ou un
diamant.

**Conceptualisation** : il manque le fer **cintré à deux bouts**, l'arc passant
au-dessus du manche. Une **pointe** d'un côté, un **tranchant plat** de l'autre :
c'est leur *différence* qui dit lequel pique et lequel taille. L'arc est
construit par une fonction qui prend la demi-épaisseur en trois points de
repère, donc les trois valeurs sont trois appels du **même** parcours.

**Application, deux itérations** :

1. Fer trop mince (0,95 unité au milieu), passe éclairée couvrant presque tout :
   un fil de fer tendu, un **arc de tir**, avec deux carrés blancs à côté.
2. Fer épaissi (1,45), passe éclairée réduite au tiers, bouts fondus dans l'arc,
   collier resserré.

### `D-91` — l'épée en bois

**Diagnostic** : trois rectangles empilés — une croix. Ni lame, ni garde, ni
poignée.

**Conceptualisation** : les quatre pièces d'une épée (lame, garde, poignée
tenue, pommeau), les trois valeurs de la lame prises **dans le sens de la
longueur** (plat éclairé, chant dans l'ombre), et un chant d'**aubier clair**
plutôt qu'un tranchant blanc — elle est en bois, et c'est ce qui la sépare à
l'œil de la hache et de la pioche, seules porteuses du blanc du catalogue.

**Application, une itération.**

### Vérification en scène (la leçon des stations, appliquée d'emblée)

`tools/scenarios/items_poche.mjs` : les dix items **dans le jeu**, pas au banc.
Trois vues, en vrais pixels sous Chrome sans fenêtre —
`docs/captures/items-2026-09-21/` :

- **au sol**, les dix étalés sur deux rangées au nord de la Maison. Deux pièges
  contournés pour que la capture montre deux fois la même chose : les poser
  **hors des stations** (entre elles, la moitié passait derrière une table), et
  **geler le repos du jour** (`jour_items_sol`), sans quoi le tirage
  redistribuait au hasard les quatre items qui ont un bloc `spawn`.
- **la Poche**, les dix tuiles ensemble : c'est la vue qui dit si la série se
  tient.
- **la barre du bas**, arme et consommable équipés réduits à une case de 12
  unités — la seule vue qui pouvait dire si l'ombre portée de la charte gêne à
  cette taille. Elle ne gêne pas.

Ouverte en écrivant ce scénario, sans y toucher : **`D-92`** — un id d'arme
inconnu dans la sauvegarde vide la case d'attaque **en silence**, et rien ne
distingue « pas d'arme » de « arme introuvable ».


---

## Clôture

Dix items, dix commits, **aucune ligne de code du jeu touchée**. 111 fichiers de
test verts. Enveloppes toutes **incluses** dans celles d'avant, régimes de
cadrage de tuile tous inchangés.

**Rien n'est validé.** `V-52` est ouverte et `pas vu` : le verdict est à Xav, au
sol et en Poche.

Ouvertes par la session, sans y toucher :

- **`Q-48`** — les outils font 17-18 unités de haut contre 6 à 10 pour le reste
  des items. Décision de jeu, pas de dessin.
- **`D-92`** — un id d'arme inconnu dans la sauvegarde vide la case d'attaque
  **en silence** ; rien ne distingue « pas d'arme » de « arme introuvable ».

Hors scope, non touché comme demandé : le menu, les fonctionnalités, le code.

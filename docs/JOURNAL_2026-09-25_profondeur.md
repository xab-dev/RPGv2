---
projet: RPG V2
episode/session: Hors spec — la profondeur
type: fichier de bord
version: 1.0.0
statut: D-222, D-223, D-224 validées (V-161 à V-163) ; Q-166 tranchée ; Q-165 à méditer
catégorie: Journal
date: 2026-09-25
genere_par: claude
verifie_par: xav
---

# Fichier de bord : la profondeur

Demande de Xav : « grosse mise à jour graphique : actuellement il n'y a pas de
profondeur entre les tuiles, héros est affiché par-dessus un arbre s'il est
placé au nord de celui-ci. Pareil pour certains éléments du décor qui perdent
toute logique (flaque sur un arbre, pierre sur de l'herbe, etc.). Fix this. »

Branche `profondeur`, partie de `main`. Non poussée.

| Commit | Ticket | Ce qu'il faut en retenir |
|---|---|---|
| `8aed350` | Ménage | Les deux journaux du 25/09 (palier I, torche-épilepsie-Zéros) archivés, INDEX à jour, deux renvois corrigés |
| `65e4e35` | `D-222` | La profondeur : `src/profondeur.js`, le calque à plat, une seule liste triée par le pied |
| `b0ca7ef` | `D-224` | `V-161` validée par Xav (« parfait, aucun ralentissement »). La hitbox des arbres de la forêt : une forme aux coins arrondis, fermée côté voisin solide (`src/formes_collision.js`) |
| `c63a827` | `D-223` | Le fondu d'un passage : un fondu enchaîné par la position, l'élément repassé en un bloc sans son ombre |
| (ce commit) | Verdicts | `V-162`, `V-163` validées ; `Q-166` tranchée (on garde) ; `Q-165` : la réponse de Xav consignée, à méditer |

**Non commité, pas à moi** : `docs/captures/v1/raw/Capture d'écran 2026-09-24 130012.png`, une capture de Xav. Un premier `git add` l'avait prise dans le commit du ménage ; retirée aussitôt (`--amend`), le fichier est intact sur le disque.

## 1. La cause

Il n'existait aucun tri. Le calque statique cuisait le sol, les objets de tuile
(arbres, rochers) et le décor, puis toutes les entités étaient peintes
par-dessus, par familles à rang fixe (leviers, objets, monstres, héros,
follet). D'où le héros devant un arbre placé au sud de lui. Le décor, peint
après **toutes** les tuiles, recouvrait la couronne de l'arbre de la rangée du
dessous (« flaque sur un arbre ») ; entre deux motifs, le rang dans la liste
décidait lequel passait devant (« pierre sur de l'herbe »).

## 2. Le remède

- **Une règle, lue sur le dessin** (`Q-165`) : un visuel qui porte une ombre
  portée se tient debout ; son pied est le centre de son ombre (sans ombre, le
  bas du dessin). Sur le catalogue actuel, ça sépare exactement les arbres,
  rochers, cailloux, touffes, cristaux et entités (debout) du grain, des
  lisières, des flaques, des murs, des portes et escaliers (à plat).
- **Le calque statique ne garde que ce qui est à plat.** Son rayon d'influence
  ne compte plus ce qui est debout.
- **Une seule liste triée par le pied**, posée à chaque frame dans
  `dessinerScene` : objets de tuile debout (depuis leur tampon, au même
  sous-pixel que leur sol), décor debout, interactifs, objets au sol, monstres,
  héros, follet. La liste des objets statiques se refait une fois par case
  franchie et ne lit que sa fenêtre. Les barres de PV et le fantôme de pose
  passent après, et la poussière avant.

## 3. Ce qui est prouvé, ce qui ne l'est pas

- **Prouvé headless** (`tests/test_d222_profondeur`) : la règle sur le vrai
  catalogue ; contre un vrai arbre de la Maison, le héros arrêté par la vraie
  collision au nord se trie **avant** l'arbre, au sud **après**, et leurs
  dessins se touchent dans les deux cas ; le décor ; le rayon du calque (1 → 1
  case) ; le budget (une lecture par case de la fenêtre, indépendante de la
  taille de la scène). Suite complète verte.
- **Vu une fois sous Chrome** (`tools/scenarios/profondeur.mjs`, deux vues) :
  au nord, le sapin cache le corps du héros et seule sa tête dépasse ; au sud,
  il est devant le tronc. Aucune erreur dans la console.
- **Pas vu, dû à Xav** (`V-161`) : la marche (l'arbre glisse-t-il avec
  l'herbe ?), la nuit, la grotte, l'Annexe, les stations, et la fluidité en
  forêt dense. Aucun banc lancé (`Q-159`) : une cinquantaine de poses de tampon
  par frame en forêt, que le calque payait une fois par case franchie.

## 4. Retour de Xav, et la hitbox des arbres (`D-224`)

Xav : « parfait, aucun ralentissement, nette amélioration du confort visuel et
de la logique du réel ». Deux demandes : un fondu quand le héros passe à
travers un élément (`D-223`), et la hitbox des arbres de la forêt réduite, aux
angles arrondis « comme les cartes du menu » (`D-224`).

- **La forme** : `tiles.json > collision` sur `tile_arbre_fond` (20 × 16,
  rayon 7, relevée de 3 px : provisoire). Géométrie pure dans
  `src/formes_collision.js`.
- **Le piège évité** : rétrécir chaque arbre ouvrait la forêt entre deux
  arbres voisins. Un côté reste donc fermé jusqu'au bord dès qu'une voisine
  solide le touche (diagonales comprises) ; seuls les côtés exposés
  rétrécissent. Prouvé sur les 7167 paires de cases solides voisines de la
  Maison.
- **Le glissement** : la correction de coin mesure le chevauchement sur la
  forme, plus sur la case. Contre un coin arrondi, le héros contourne l'arc.
  Une marge d'un millionième de pixel : poussé pile sur l'arc, le point
  restait dedans d'un cheveu.
- **À voir en jeu** : `V-162`.

## 5. Le fondu d'un passage (`D-223`)

- **Fondu enchaîné, par la position** : dans une bande de 16 px autour du pied
  du héros (`graphismes.json > profondeur > fondu_px`, provisoire), un élément
  qui touche le héros est peint derrière lui puis repassé par-dessus à
  l'opacité de sa part « devant ». Aux bords de la bande, l'image est celle du
  tri : rien ne saute. Pas de temps, pas d'état : arrêté au milieu, l'élément
  reste à moitié par-dessus.
- **En un bloc** : le repassage d'un dessin vectoriel passe par un petit canvas
  à part, posé d'un coup ; un objet de tuile, déjà un tampon, prend l'opacité
  directement. Sans l'ombre portée (déjà au sol).
- **Prouvé headless** : l'ordre, et la traversée d'un vrai caillou sud → nord
  pas à pas, sans saut de plus d'un pas. **Vu sous Chrome** : une touffe de la
  Maison par-dessus les jambes du héros aux 5/8, sans cadre.
- **Contre un arbre**, le fondu ne se voit presque pas : avec la hitbox de
  `D-224`, on ne chevauche qu'environ 3 px de feuillage en longeant le tronc.
- **À voir en jeu** : `V-163` (la durée surtout).

## 6. Verdicts de Xav

- « V-162 -163 ok » : la hitbox des arbres et le fondu sont validés en jeu.
- `Q-166` : « c'est très bien tel que je viens d'essayer, on garde ». Le héros
  peut disparaître derrière un feuillage.
- `Q-165` (la règle « ombre = debout ») : « pas sûr, je pense qu'il faut la
  généraliser et aussi faire du cas par cas. L'objectif à terme étant de
  transposer le jeu en vue du dessus 3/4. À méditer. » Ouverte, rien de codé.

---
projet: RPG V2
episode/session: Hors spec — la profondeur
type: fichier de bord
version: 1.0.0
statut: livré, à voir en jeu (V-161) ; Q-165 et Q-166 ouvertes
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
| (ce commit) | `D-222` | La profondeur : `src/profondeur.js`, le calque à plat, une seule liste triée par le pied |

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

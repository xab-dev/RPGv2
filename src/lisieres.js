// Les LISIÈRES de la carte (`specs/13` palier D, `Q-52`) — la part pure : qui
// déborde sur qui, et quels dessins une case reçoit. Aucun canvas ici :
// `render.js` pose les dessins dans le calque statique ; ce module ne fait que
// dire LESQUELS, tournés comment.
//
// Pourquoi : là où l'herbe touche le chemin, la limite était une suite de
// carrés nets, des marches de 32 px, et le grain de chaque surface rendait la
// couture plus visible. Une surface déclare maintenant qu'elle DÉBORDE sur ses
// voisines (`tiles.json > render.lisiere`) : l'herbe mange le bord du chemin.
//
// Une lisière se dessine DANS la case qui la reçoit (le chemin), jamais chez la
// surface qui déborde. Elle dépend de ses voisines, mais ne peint pas chez
// elles : le défilement du calque (palier C) n'a donc rien de plus à repeindre,
// et son rayon d'influence reste déduit des seules boîtes de dessin
// (`defilement.js#rayonInfluence`, qui compte aussi les lisières).

import { tuileDeSol, varianteTuile } from './decor.js';

// Les quatre côtés, dans l'ordre des poses (N-E-S-O, `specs/13` §4.2). Le bord
// est dessiné pour le côté NORD ; les autres sont ce dessin tourné d'un quart
// de tour, dans le sens des aiguilles d'une montre (y vers le bas).
// `nom` : le côté À L'ÉCRAN, tel que `render.lisiere.ombre.cotes` le cite.
const COTES = [
  { dx: 0, dy: -1, rotation: 0, nom: 'N' },
  { dx: 1, dy: 0, rotation: 90, nom: 'E' },
  { dx: 0, dy: 1, rotation: 180, nom: 'S' },
  { dx: -1, dy: 0, rotation: 270, nom: 'O' },
];
export const NOMS_COTES = COTES.map(({ nom }) => nom);
// Les quatre coins, après les côtés. Le coin est dessiné pour le NORD-OUEST ;
// `cotes` : les deux côtés qui touchent ce coin (indices dans `COTES`).
const COINS = [
  { dx: -1, dy: -1, rotation: 0, cotes: [0, 3] },
  { dx: 1, dy: -1, rotation: 90, cotes: [0, 1] },
  { dx: 1, dy: 1, rotation: 180, cotes: [2, 1] },
  { dx: -1, dy: 1, rotation: 270, cotes: [2, 3] },
];

// Le miroir d'un bord se tire par la position de la case, avec un sel propre :
// deux cases voisines de même configuration ne portent pas le même bord, et le
// miroir ne suit ni la couleur ni la variante du grain (même règle qu'au 23/09).
// Un sel par côté : les deux bords d'un chemin étroit ne se répondent pas.
const SEL_LISIERE = 0x2c1b3c6d;
const SEL_PAR_COTE = 0x9e3779b9;

// La table des lisières, une fois par catalogue et par preset : id de la
// SURFACE → `{ rang, bord, coin, ombre }`, les dessins déjà résolus par
// `resoudre(id)` (le registre, côté `main.js`, qui y applique le levier
// `lisiere` du preset : un dessin que le levier réduit à rien vaut `null`, et
// ne se pose pas). Une surface sans `bord` peut être dominée, jamais dominer.
// `render.js` reçoit cette table sans la lire : il la rend à `lisieresCase`,
// et ne voit jamais un rang.
export function tableLisieres(tuiles, resoudre) {
  const table = new Map();
  for (const tuile of tuiles) {
    const lisiere = tuile.render && tuile.render.lisiere;
    if (!lisiere) continue;
    const ombre = lisiere.ombre;
    table.set(tuile.id, {
      rang: lisiere.rang,
      bord: lisiere.bord ? resoudre(lisiere.bord) : null,
      coin: lisiere.coin_interieur ? resoudre(lisiere.coin_interieur) : null,
      ombre: ombre
        ? {
          bord: resoudre(ombre.bord),
          coin: resoudre(ombre.coin_interieur),
          cotes: COTES.map(({ nom }) => ombre.cotes.includes(nom)),
        }
        : null,
    });
  }
  return table;
}

// Le plus haut rang d'une surface qui a de quoi déborder (un bord), une fois
// par table : une table ne change jamais en place (`main.js` en refait une).
const rangsMax = new WeakMap();
function rangMaxDominant(table) {
  let rang = rangsMax.get(table);
  if (rang === undefined) {
    rang = -Infinity;
    for (const entree of table.values()) if (entree.bord) rang = Math.max(rang, entree.rang);
    rangsMax.set(table, rang);
  }
  return rang;
}

// L'entrée de la table pour la SURFACE de la case `(x, y)` — ce qui est
// comparé, c'est la surface, jamais la tuile (`decor.js#tuileDeSol`) : un arbre
// posé sur l'herbe fait déborder l'herbe comme une case d'herbe nue.
function entreeDe(scene, x, y, estFlagActif, table) {
  const tuile = scene.tuileA(x, y, estFlagActif);
  if (!tuile) return null;
  return table.get(tuileDeSol(scene, tuile).id) || null;
}

// `voisine` domine-t-elle `ici` ? Un rang strictement plus grand, et un dessin
// pour le dire. Même rang, ou rang absent d'un côté : le bord reste net (le
// parquet et le mur de la Maison, construits, n'en déclarent pas).
function domine(voisine, ici) {
  return !!voisine && voisine.rang > ici.rang;
}

// Les POSES de la case `(x, y)` : la liste ordonnée des `{ visuel, rotation,
// miroir }` qu'elle reçoit — d'abord les OMBRES (côtés N-E-S-O, puis coins),
// ensuite les bords N-E-S-O, puis les coins.
// - un côté reçoit le bord de la voisine qui la domine ;
// - un coin reçoit le coin intérieur de la voisine en DIAGONALE qui la domine,
//   quand aucun des deux côtés qui touchent ce coin n'est dominé : sinon un bord
//   couvre déjà l'angle. Sans lui, un angle de chemin garderait sa marche.
// Un coin EXTÉRIEUR (deux côtés adjacents dominés) n'a pas de dessin propre :
// les deux bords s'y recouvrent (§4.1, à juger à l'œil : `Q-131`).
//
// L'OMBRE (`D-202`) est un dessin à part, parce qu'elle se lit dans une
// direction FIXE à l'écran, alors que le bord tourne : quand elle faisait partie
// du bord, elle tournait avec lui, et le nord et le sud du chemin disaient deux
// profondeurs opposées (Xav : « the path is on top of the north herbs »). Elle
// tourne toujours comme son bord (elle suit son contour, miroir compris), mais
// ne se pose que sur les côtés de l'écran que la surface nomme
// (`render.lisiere.ombre.cotes`) ; un coin n'a d'ombre que si ses deux côtés en
// ont. Toutes les ombres passent AVANT tous les bords : à un coin extérieur,
// l'ombre d'un côté ne couvre pas l'herbe de l'autre.
// Liste vide, et c'est le cas de presque toutes les cases : aucune allocation
// de plus qu'un tableau.
export function lisieresCase(scene, x, y, estFlagActif, table) {
  const poses = [];
  if (table.size === 0) return poses;
  const ici = entreeDe(scene, x, y, estFlagActif, table);
  // Une surface que rien ne peut dominer ne lit pas ses voisines : c'est
  // l'herbe, presque toutes les cases de la carte. Sans ce raccourci, chaque
  // case en lisait huit, et une reconstruction coûtait 25 à 50 % de plus.
  if (!ici || ici.rang >= rangMaxDominant(table)) return poses;

  const dominants = COTES.map(({ dx, dy }) => {
    const voisine = entreeDe(scene, x + dx, y + dy, estFlagActif, table);
    return domine(voisine, ici) && voisine.bord ? voisine : null;
  });
  const bords = [];
  COTES.forEach(({ rotation }, i) => {
    const voisine = dominants[i];
    if (!voisine) return;
    const { miroir } = varianteTuile(scene, x, y, 1, true, (SEL_LISIERE ^ Math.imul(i + 1, SEL_PAR_COTE)) >>> 0);
    const { ombre } = voisine;
    if (ombre && ombre.cotes[i] && ombre.bord) poses.push({ visuel: ombre.bord, rotation, miroir });
    if (voisine.bord) bords.push({ visuel: voisine.bord, rotation, miroir });
  });
  const coins = [];
  for (const { dx, dy, rotation, cotes } of COINS) {
    if (dominants[cotes[0]] || dominants[cotes[1]]) continue;
    const voisine = entreeDe(scene, x + dx, y + dy, estFlagActif, table);
    if (!domine(voisine, ici) || !voisine.coin) continue;
    // Un coin ne se retourne pas : son miroir serait le coin d'à côté.
    const { ombre } = voisine;
    if (ombre && ombre.cotes[cotes[0]] && ombre.cotes[cotes[1]] && ombre.coin) {
      poses.push({ visuel: ombre.coin, rotation, miroir: false });
    }
    coins.push({ visuel: voisine.coin, rotation, miroir: false });
  }
  poses.push(...bords, ...coins);
  return poses;
}

// Tous les dessins de lisière de la table : ce que `rayonInfluence` doit
// connaître pour savoir si une lisière peint hors de sa case.
export function visuelsDesLisieres(table) {
  const visuels = [];
  for (const { bord, coin, ombre } of table.values()) {
    if (bord) visuels.push(bord);
    if (coin) visuels.push(coin);
    if (ombre && ombre.bord) visuels.push(ombre.bord);
    if (ombre && ombre.coin) visuels.push(ombre.coin);
  }
  return visuels;
}

// Les PIÈCES d'un visuel et leurs POSES : comment une silhouette dessinée une
// fois (le héros, de face) se montre dans chacune des directions de son regard
// (`orientation.js` dit la direction, ce module dit ce qu'elle fait au dessin).
// Pur : aucune lecture du canvas, seulement des nombres — le dessin
// (`visuels.js#dessinerVisuel`) et les tests passent par les MÊMES fonctions,
// un harnais n'a jamais à refaire le calcul qu'il éprouve.
//
// Le modèle, en données sur l'entrée de visuels.json :
// - une primitive appartient à une pièce (`piece`) : la capuche, l'ouverture de
//   la capuche, l'œil ;
// - `pieces` déclare une fois ce qui ne dépend pas de la direction : l'origine
//   autour de laquelle la pièce tourne et grandit, si son dessin se reflète
//   (`miroir`), si elle est découpée par la silhouette d'une autre
//   (`decoupe`), si elle n'existe que là où une direction la pose (`cachee`) ;
// - `orientations` déclare, direction par direction, la pose de chaque pièce :
//   `null` (cachée), ou un déplacement de son origine, une rotation, une
//   échelle, un pli ;
// - `reflets` déclare les directions qui sont le reflet d'une autre (l'est,
//   celui de l'ouest) : aucune valeur recopiée à la main, en miroir, qui
//   pourrait s'écarter de sa source.

// Ce qu'une pièce déclare une fois pour toutes.
export function definitionPiece(visuel, piece) {
  return (visuel && visuel.pieces && visuel.pieces[piece]) || AUCUNE_DEFINITION;
}
const AUCUNE_DEFINITION = Object.freeze({});

// La pose d'une pièce dans une direction :
// - `undefined` : la direction ne la pose pas, elle se dessine telle qu'elle
//   est écrite (le dessin d'auteur) — sauf une pièce `cachee`, qui ne paraît
//   que là où elle est posée ;
// - `null` : elle est cachée (l'œil, de dos) ;
// - un objet : sa pose (`reflet: true` pour une direction en reflet).
export function poseDePiece(visuel, direction, piece) {
  if (!visuel || !visuel.orientations || !direction) return undefined;
  const source = visuel.reflets && visuel.reflets[direction];
  if (source) return refleter(poseDeclaree(visuel, source, piece));
  return poseDeclaree(visuel, direction, piece);
}

function poseDeclaree(visuel, direction, piece) {
  const poses = visuel.orientations[direction];
  return poses && piece in poses ? poses[piece] : undefined;
}

// Une direction en reflet : la même pose, marquée. Gardée d'une frame à
// l'autre (les primitives pliées se gardent par pose : un objet neuf à chaque
// frame les referait toutes).
const reflets = new WeakMap();
function refleter(pose) {
  if (pose == null) return pose;
  let refletee = reflets.get(pose);
  if (!refletee) reflets.set(pose, (refletee = Object.freeze({ ...pose, reflet: true })));
  return refletee;
}

// La MATRICE d'une pose : l'application affine `[a, b, c, d, e, f]` du canvas
// (x' = a·x + c·y + e, y' = b·x + d·y + f) qui mène un point du dessin
// d'auteur à sa place dans la direction. Autour de l'origine O de la pièce :
// rotation, cisaillement, échelle (uniforme, puis en hauteur dans le repère
// tourné), et O se déplace de (dx, dy).
//
// Une direction en reflet est le reflet M (x ↦ −x, autour de l'axe du héros)
// de sa source :
// - par défaut, les POSITIONS et les ROTATIONS se reflètent, pas le dessin :
//   M · A · M. L'œil glisse vers l'est quand il glissait vers l'ouest, mais
//   garde sa lumière en haut à gauche — la lumière du jeu ne se reflète pas ;
// - une pièce `miroir` (la capuche, qui n'est pas symétrique : sa pointe part
//   d'un côté de l'axe, et aucun pli ne rendait l'est pareil à l'ouest) se
//   reflète en entier : M · A. Ses liserés, eux, échangent leur ton
//   (`primitivePosee`), pour que le clair reste du côté de la lumière.
const matrices = new WeakMap();
export function matricePose(visuel, piece, pose) {
  let parPiece = matrices.get(pose);
  if (!parPiece) matrices.set(pose, (parPiece = new Map()));
  let matrice = parPiece.get(piece);
  if (!matrice) parPiece.set(piece, (matrice = calculerMatrice(definitionPiece(visuel, piece), pose)));
  return matrice;
}

function calculerMatrice(definition, pose) {
  const [ox, oy] = definition.origine ?? [0, 0];
  const r = ((pose.rotation ?? 0) * Math.PI) / 180;
  const [cos, sin] = [Math.cos(r), Math.sin(r)];
  const c = pose.cisaillement ?? 0;
  const ex = pose.echelle ?? 1;
  const ey = ex * (pose.echelle_y ?? 1);
  // L = rotation · cisaillement · échelle.
  let [a, b, cc, d] = [cos * ex, sin * ex, (cos * c - sin) * ey, (sin * c + cos) * ey];
  // A(p) = O + D + L · (p − O).
  let e = ox + (pose.dx ?? 0) - (a * ox + cc * oy);
  let f = oy + (pose.dy ?? 0) - (b * ox + d * oy);
  if (pose.reflet) {
    // M · A · M, puis (miroir) · M à droite de plus : M · A.
    [b, cc, e] = [-b, -cc, -e];
    if (definition.miroir) [a, b] = [-a, -b];
  }
  return Object.freeze([a, b, cc, d, e, f]);
}

// Un point du dessin d'auteur, là où sa pose le montre : plié, puis posé.
// Pour les tests et les outils ; le dessin, lui, pose le canvas.
export function poserPoint(visuel, piece, pose, [x, y]) {
  const [px, py] = pose.pli || pose.rabat ? plierPoint(x, y, pose) : [x, y];
  const [a, b, c, d, e, f] = matricePose(visuel, piece, pose);
  return [a * px + c * py + e, b * px + d * py + f];
}

// LE PLI, la seule pose qui ne soit pas une transform du canvas. Xav, 26/09,
// sur le héros de profil : penchée d'un bloc, la capuche emportait son sommet
// hors de l'axe et le visage se lisait « en diagonale » ; il veut le sommet
// SUR l'axe, et la direction dite par la seule pointe. Une application affine
// ne sait pas faire ça : les points se plient un à un autour du point de
// l'axe (x = 0) à la hauteur `pli.pivot_y`. Sous cette ligne, rien ne bouge ;
// au-dessus, un point tourne d'autant plus qu'il est haut, jusqu'à
// `pli.angle` degrés à `pli.longueur` unités du pivot (positif : vers l'est).
// Provisoire, non validé seul en jeu : le pli croît comme la hauteur à cette
// puissance — à 1, le flanc avant se casse en coude ; au-delà, le bas reste
// droit et le pli se concentre vers la pointe.
const PROGRESSIVITE_PLI = 1.5;

// LE RABAT, l'autre pli : vers l'œil ou à l'opposé (de face, la pointe part
// vers l'arrière ; de dos, vers nous), une pointe ne dépasse plus du crâne.
// Au-dessus de la ligne `rabat.y`, la capuche s'écrase en une calotte de
// `rabat.hauteur` (un quart d'ellipse, du bord de la ligne à la pointe, qui
// est à `rabat.longueur` au-dessus). La pointe rabattue, quand on la voit,
// est une pièce à part dessinée à la main : un pli ne sait pas dire la
// lumière.
function rabattre(y, rabat) {
  const t = Math.min(1, (rabat.y - y) / rabat.longueur);
  return rabat.y - rabat.hauteur * Math.sqrt(1 - (1 - t) ** 2);
}

// Un point du repère du visuel, plié par la pose : le pli, puis le rabat.
export function plierPoint(x, y, { pli, rabat }) {
  let [vx, vy] = [x, y];
  if (pli) {
    const hauteur = pli.pivot_y - vy;
    if (hauteur > 0) {
      const a = ((pli.angle * Math.PI) / 180) * Math.min(1, hauteur / pli.longueur) ** PROGRESSIVITE_PLI;
      [vx, vy] = [vx * Math.cos(a) + hauteur * Math.sin(a), pli.pivot_y + vx * Math.sin(a) - hauteur * Math.cos(a)];
    }
  }
  if (rabat && vy < rabat.y) vy = rabattre(vy, rabat);
  return [vx, vy];
}

// Une arête droite reste droite une fois ses deux bouts pliés : chaque arête
// se coupe en autant de segments avant le pli, sans quoi le dôme serait un
// polygone à facettes. Provisoire, non validé seul en jeu.
const SEGMENTS_PAR_ARETE_PLIEE = 6;

// Les `points` d'un polygone dont l'origine est à `(ox, oy)` dans le repère du
// visuel, pliés par la pose.
export function plierPoints(points, pose, ox = 0, oy = 0) {
  const denses = [];
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length];
    for (let k = 0; k < SEGMENTS_PAR_ARETE_PLIEE; k += 1) {
      const t = k / SEGMENTS_PAR_ARETE_PLIEE;
      denses.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  });
  return denses.map(([x, y]) => {
    const [vx, vy] = plierPoint(x + ox, y + oy, pose);
    return [vx - ox, vy - oy];
  });
}

// La primitive telle que sa pose la dessine : ses points pliés, et son style
// reflété si son dessin l'est (`reflet` d'une primitive : `{ couleur?,
// alpha? }`, le liseré clair passé à l'ombre y prend le ton du sombre). Gardée
// par pose : les pliées ne changent qu'avec elle, et la pose est une donnée.
const posees = new WeakMap();
export function primitivePosee(visuel, piece, primitive, pose) {
  const pliee = (pose.pli || pose.rabat) && primitive.points;
  const refletee = pose.reflet && definitionPiece(visuel, piece).miroir && primitive.reflet;
  if (!pliee && !refletee) return primitive;
  let parPrimitive = posees.get(pose);
  if (!parPrimitive) posees.set(pose, (parPrimitive = new WeakMap()));
  let posee = parPrimitive.get(primitive);
  if (!posee) {
    posee = { ...primitive };
    if (pliee) posee.points = plierPoints(primitive.points, pose, primitive.dx || 0, primitive.dy || 0);
    if (refletee) Object.assign(posee, primitive.reflet);
    parPrimitive.set(primitive, posee);
  }
  return posee;
}

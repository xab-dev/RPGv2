// `D-229` (`Q-51`) : OÙ REGARDE le héros. Jusqu'ici il ne regardait nulle
// part : il avançait de dos vers le nord exactement comme de face vers le sud.
// Depuis la première compétence qui vise (l'Onde, spec 14), le joueur doit
// voir vers qui il tire — Xav, 25/09 : « cette décision devient prioritaire ».
//
// Forme (`Q-167`, tranchée par Xav) : le « tricheur » de `Q-51`, une seule
// silhouette dont des PIÈCES bougent — le visage dans la capuche (décalé de
// profil, absent de dos), et depuis `D-249` la capuche elle-même, dont la
// pointe penche à l'opposé du regard, « pour faire varier de façon visible »
// (Xav) les huit directions. Ce module ne sait rien du dessin : il dit une DIRECTION, et
// le visuel déclare en données ce que chaque direction fait à ses pièces
// (`orientations`, lu par `visuels.js#dessinerVisuel`). Un état d'AFFICHAGE,
// jamais sauvegardé : recharger une partie remet le héros de face, comme le
// geste d'un levier (`bascule.js`). Pur.

// Les huit directions (`D-249`, Xav : « 8 positions »), rangées par angle à
// l'écran, de 45° en 45°, en partant de l'est et en tournant vers le bas
// (l'axe y de l'écran descend). `sud` est la pose de référence : c'est celle
// que le dessin validé en jeu montre, et un visuel n'a rien à déclarer pour elle.
export const ORIENTATIONS = ['est', 'sud_est', 'sud', 'sud_ouest', 'ouest', 'nord_ouest', 'nord', 'nord_est'];
export const ORIENTATION_INITIALE = 'sud';
const SECTEUR_DEG = 360 / ORIENTATIONS.length;

// Provisoire, non validé en jeu. Un stick tenu à la frontière de deux
// secteurs hésite : sans marge, la pose sauterait de l'un à l'autre à chaque
// frame où l'angle bouge d'un cheveu. On garde la direction courante tant que
// le geste reste à moins d'un demi-secteur (22,5°) PLUS cette marge de son axe.
export const MARGE_BASCULE_DEG = 8;

// L'angle d'un vecteur à l'écran, en degrés, et l'écart entre deux angles.
const angleDe = (dx, dy) => (Math.atan2(dy, dx) * 180) / Math.PI;
const ecartDeg = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// Provisoire, non validé en jeu. Après un tir, le héros regarde sa cible ce
// temps-là, même s'il marche : sans cela, le déplacement de la frame suivante
// le retournerait avant qu'on ait vu vers qui il tirait.
export const DUREE_REGARD_TIR_MS = 400;

// La direction d'un vecteur : le secteur de 45° où tombe son angle. `null`
// pour un vecteur nul : il n'y a rien à regarder.
export function directionDe(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  const secteur = Math.round(angleDe(dx, dy) / SECTEUR_DEG);
  return ORIENTATIONS[((secteur % ORIENTATIONS.length) + ORIENTATIONS.length) % ORIENTATIONS.length];
}

// La direction après un geste de déplacement `(dx, dy)` (le stick, pas le
// chemin après collision : pousser contre un mur tourne quand même le héros
// vers lui). Garde `precedente` si le geste est nul, ou s'il reste près de
// son axe (voir `MARGE_BASCULE_DEG`).
export function orienterDepuisMouvement(precedente, dx, dy) {
  const nouvelle = directionDe(dx, dy);
  if (nouvelle === null) return precedente;
  const iPrecedente = ORIENTATIONS.indexOf(precedente);
  if (iPrecedente >= 0 && ecartDeg(angleDe(dx, dy), iPrecedente * SECTEUR_DEG) <= SECTEUR_DEG / 2 + MARGE_BASCULE_DEG) {
    return precedente;
  }
  return nouvelle;
}

// L'état complet, avancé d'une frame : `{ direction, regardMs }`. Un tir
// (`vers`, le vecteur héros → cible) tourne le héros et arme le regard ; tant
// que le regard dure, la marche ne le retourne pas.
export function creerOrientation() {
  return { direction: ORIENTATION_INITIALE, regardMs: 0 };
}

export function avancerOrientation(etat, { deltaMs, dx = 0, dy = 0, vers = null }) {
  if (vers) {
    const direction = directionDe(vers.dx, vers.dy) ?? etat.direction;
    return { direction, regardMs: DUREE_REGARD_TIR_MS };
  }
  const regardMs = Math.max(0, etat.regardMs - deltaMs);
  if (regardMs > 0) return { direction: etat.direction, regardMs };
  return { direction: orienterDepuisMouvement(etat.direction, dx, dy), regardMs };
}

// Ce qu'une direction fait à une PIÈCE d'un visuel (`primitive.piece`) :
// `undefined` = rien, la pièce se dessine telle quelle ; `null` = la pièce
// est cachée (le visage, de dos) ; `{ dx, dy, echelle_x, cisaillement,
// pivot_y }` = resserrée à l'horizontale, penchée (`cisaillement` : x glisse de
// cisaillement × (y − pivot_y), et la ligne `pivot_y` ne bouge pas — la base
// de la capuche reste posée, sa pointe penche), puis décalée ; depuis
// `D-252`, `{ courbure, longueur }` plie la pièce au-dessus de `pivot_y` au lieu
// de la pencher (le sommet reste sur l'axe, la pointe se couche). Lu par le seul
// `visuels.js#dessinerVisuel` : le dessin ne connaît aucun nom de direction.
export function poseDePiece(visuel, direction, piece) {
  const poses = visuel && visuel.orientations && direction ? visuel.orientations[direction] : undefined;
  if (!poses || !(piece in poses)) return undefined;
  return poses[piece];
}

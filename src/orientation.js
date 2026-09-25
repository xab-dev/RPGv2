// `D-229` (`Q-51`) : OÙ REGARDE le héros. Jusqu'ici il ne regardait nulle
// part : il avançait de dos vers le nord exactement comme de face vers le sud.
// Depuis la première compétence qui vise (l'Onde, spec 14), le joueur doit
// voir vers qui il tire — Xav, 25/09 : « cette décision devient prioritaire ».
//
// Forme retenue (`[OUVERT]`, `Q-167`) : le « tricheur » de `Q-51`, une seule
// silhouette dont seul le visage bouge dans la capuche — décalé de profil,
// absent de dos. Ce module ne sait rien du dessin : il dit une DIRECTION, et
// le visuel déclare en données ce que chaque direction fait à ses pièces
// (`orientations`, lu par `visuels.js#dessinerVisuel`). Un état d'AFFICHAGE,
// jamais sauvegardé : recharger une partie remet le héros de face, comme le
// geste d'un levier (`bascule.js`). Pur.

// Les quatre directions, dans l'ordre des aiguilles d'une montre depuis le
// bas de l'écran. `sud` est la pose de référence : c'est celle que le dessin
// validé en jeu montre, et un visuel n'a rien à déclarer pour elle.
export const ORIENTATIONS = ['sud', 'ouest', 'nord', 'est'];
export const ORIENTATION_INITIALE = 'sud';

// Provisoire, non validé en jeu. Un stick tenu en diagonale hésite entre deux
// directions : sans marge, le visage sauterait d'un côté à l'autre à chaque
// frame où l'axe dominant change d'un cheveu. On garde la direction courante
// tant qu'elle est l'une des deux composantes du geste et que l'autre axe ne
// la dépasse pas de plus de ce rapport (1,25 : il faut passer à ~51° de l'axe
// courant, au lieu de 45°, pour basculer).
export const RAPPORT_BASCULE_DIAGONALE = 1.25;

// Provisoire, non validé en jeu. Après un tir, le héros regarde sa cible ce
// temps-là, même s'il marche : sans cela, le déplacement de la frame suivante
// le retournerait avant qu'on ait vu vers qui il tirait.
export const DUREE_REGARD_TIR_MS = 400;

// La direction d'un vecteur, par son axe dominant ; à égalité, l'horizontal
// l'emporte (un tir en diagonale se voit mieux de profil que de dos). `null`
// pour un vecteur nul : il n'y a rien à regarder.
export function directionDe(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'est' : 'ouest';
  return dy > 0 ? 'sud' : 'nord';
}

// La direction après un geste de déplacement `(dx, dy)` (le stick, pas le
// chemin après collision : pousser contre un mur tourne quand même le héros
// vers lui). Garde `precedente` si le geste est nul, ou s'il est diagonal et
// que `precedente` en est une composante (voir `RAPPORT_BASCULE_DIAGONALE`).
export function orienterDepuisMouvement(precedente, dx, dy) {
  const nouvelle = directionDe(dx, dy);
  if (nouvelle === null) return precedente;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const composante = (precedente === 'est' && dx > 0) || (precedente === 'ouest' && dx < 0)
    ? 'horizontale'
    : (precedente === 'sud' && dy > 0) || (precedente === 'nord' && dy < 0) ? 'verticale' : null;
  if (composante === 'horizontale' && ay <= ax * RAPPORT_BASCULE_DIAGONALE) return precedente;
  if (composante === 'verticale' && ax <= ay * RAPPORT_BASCULE_DIAGONALE) return precedente;
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
// est cachée (le visage, de dos) ; `{ dx, echelle_x }` = décalée puis
// resserrée à l'horizontale (le visage, de profil). Lu par le seul
// `visuels.js#dessinerVisuel` : le dessin ne connaît aucun nom de direction.
export function poseDePiece(visuel, direction, piece) {
  const poses = visuel && visuel.orientations && direction ? visuel.orientations[direction] : undefined;
  if (!poses || !(piece in poses)) return undefined;
  return poses[piece];
}

// Ornements du follet (`Q-58`, `D-134`) : ce que le réglage Haut ajoute au
// follet, et rien d'autre. Des étincelles qui lui tournent autour, et un halo
// qui respire.
//
// Module PUR : aucun canvas, aucune horloge propre, aucun preset. Il reçoit un
// NOMBRE (le niveau du levier `ornements`) et un temps, et rend des positions
// et des facteurs. Le seul endroit qui sait que « haut » donne 2 est le
// catalogue des presets ; le seul qui sait qu'un effet en demande 2 est
// `effets.json`. Même patron que `poussiere.js` et `decor.js`.
import { positionsOrbite } from './curseur.js';

// Un effet existe-t-il à ce niveau d'ornement ? `ornement_min` absent = oui,
// toujours : un effet d'avant `D-134` ne peut pas disparaître parce qu'on a
// ajouté un levier. Rend l'effet tel quel ou `null` — l'appelant n'a donc
// qu'un test de présence à faire, jamais une comparaison à recopier.
export function ornementActif(effet, niveau) {
  if (!effet) return null;
  if (effet.ornement_min === undefined) return effet;
  return niveau >= effet.ornement_min ? effet : null;
}

// Les étincelles autour d'un point, à l'instant `tMs`. Même géométrie que
// l'orbite du curseur (ellipse de trois quarts, répartition régulière) : une
// seule définition, lue deux fois. `devant` dit si l'étincelle passe devant
// le follet (dessinée après lui) ou derrière (avant lui) — c'est ce qui fait
// lire une ORBITE et non un anneau collé sur la silhouette. L'alpha suit la
// profondeur pour la même raison : ce qui passe derrière s'éteint un peu.
export function etincellesOrbite(effet, tMs, x, y) {
  if (!effet) return [];
  return positionsOrbite(effet, tMs).map((p) => ({
    x: x + p.dx,
    y: y + p.dy,
    devant: p.profondeur >= 0,
    alpha: 0.55 + 0.45 * (p.profondeur + 1) / 2,
    echelle: effet.echelle,
  }));
}

// Facteur de respiration à l'instant `tMs` : 1 ± amplitude, sinusoïdal. Sans
// effet, 1 exactement, donc le multiplier ne change rien : Moyen dessine le
// halo au pixel près comme avant.
export function facteurRespiration(effet, tMs) {
  if (!effet) return 1;
  return 1 + effet.amplitude * Math.sin((tMs / effet.periode_ms) * Math.PI * 2);
}

// Le filet (`D-191`) : `nb_particules` qui montent d'un point en décrivant une
// boucle, comme un filet d'éruption solaire. Chacune vit une période, décalée
// des autres d'une fraction ; son âge `a` ∈ [0, 1[ dit tout : elle monte de
// `hauteur_px`, s'écarte de `courbure_px` au milieu de sa course (sin πa) et
// dérive de `derive_px` en tout. Elle naît et meurt transparente (sin πa
// encore) et rapetisse en montant. AUCUN état : tout sort du temps, donc rien
// à tenir entre deux frames ni à vider quand l'objet disparaît. `graine`
// décale la phase d'un objet à l'autre (deux plumes voisines ne soufflent pas
// en même temps).
export function particulesFilet(effet, tMs, x, y, graine = 0) {
  if (!effet) return [];
  const particules = [];
  for (let i = 0; i < effet.nb_particules; i++) {
    const brut = tMs / effet.periode_ms + i / effet.nb_particules + graine;
    const a = brut - Math.floor(brut);
    const vie = Math.sin(Math.PI * a);
    // Une particule sur deux boucle de l'autre côté : un filet, pas une file.
    const cote = i % 2 === 0 ? 1 : -1;
    particules.push({
      x: x + cote * effet.courbure_px * vie + effet.derive_px * a,
      y: y - effet.hauteur_px * a,
      alpha: effet.alpha * vie,
      echelle: effet.echelle * (1 - 0.5 * a),
    });
  }
  return particules;
}

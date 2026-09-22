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

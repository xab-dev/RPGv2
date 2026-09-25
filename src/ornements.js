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

// Le second souffle d'une flamme bat plus vite que le premier, d'un rapport
// irrationnel (le nombre d'or) : les deux ne retombent jamais en phase, et la
// flamme ne bat pas comme un métronome.
export const RAPPORT_SECOND_SOUFFLE = 1.618;

// Le vacillement d'une flamme (`specs/15` palier E) : deux souffles mêlés.
// `graine` ∈ [0, 1[ décale la phase d'une fraction de période : elle dit QUI
// est la flamme, jamais où elle est en ce moment (`D-218` : une graine tirée
// de la position d'une flamme qui marche défile sous les pas, et la flamme
// clignote). Sans effet, 1 exactement : Bas est fixe.
export function facteurVacillement(effet, tMs, graine = 0) {
  if (!effet) return 1;
  const t = tMs + graine * effet.periode_ms;
  return (facteurRespiration(effet, t) + facteurRespiration(effet, t * RAPPORT_SECOND_SOUFFLE)) / 2;
}

// `D-219` : aucun effet ne bat plus vite que 3 fois par seconde. C'est le
// seuil des recommandations sur l'épilepsie photosensible (WCAG 2.3.1, et les
// règles de diffusion télévisée qui en sont la source) : au-delà de 3 éclats
// par seconde, un clignotement peut déclencher une crise, et la zone la plus
// dangereuse va de 15 à 25 Hz. Ces règles tolèrent un clignotement rapide
// s'il est petit ou peu contrasté ; on ne sait mesurer ni l'un ni l'autre
// sans navigateur, donc le plafond vaut pour TOUT effet, sans exception.
// Ce n'est pas un réglage, c'est un plafond : on ne le relève pas.
export const FREQUENCE_MAX_HZ = 3;

// Le rythme le plus rapide qu'un effet peut imprimer à la lumière, en Hz. Un
// type d'effet qui bat se classe ici, une fois : un type absent de la table
// rend `undefined`, et le test du catalogue refuse l'effet (un type nouveau
// doit dire s'il clignote). Une respiration est comptée avec le second
// souffle, puisque toute respiration peut être lue comme un vacillement.
const RYTHME_PAR_TYPE = {
  respiration: (e) => (1000 / e.periode_ms) * RAPPORT_SECOND_SOUFFLE,
  // Chaque particule naît et meurt une fois par période — celle de son motif
  // (`D-246`) : le plus rapide des motifs donne le rythme.
  filet: (e) => Math.max(...motifsFilet(e).map((m) => 1000 / m.periode_ms)),
  orbite: (e) => 1000 / e.periode_ms, // l'alpha suit la profondeur, un tour par période
  curseur: (e) => 1000 / e.periode_ms,
  vol: (e) => 1000 / e.periode_ms,
  // Le noir le plus court suivi de l'ouverture la plus courte : un battement.
  clignement: (e) => 1000 / (e.noir_ms + Math.min(...e.ouvertures_ms)),
  // Ne battent pas : des traînées qui s'effacent une fois, un texte qui
  // monte, un symbole qui apparaît.
  particules: () => 0,
  texte: () => 0,
  logo: () => 0,
};
export function rythmeLumineuxHz(effet) {
  const rythme = RYTHME_PAR_TYPE[effet.type];
  return rythme ? rythme(effet) : undefined;
}

// `D-246` (Xav, 25/09 : des braises « avec des mouvements chaotiques : part
// sur le côté, fait une boucle, rapide, lente… (différents patterns) ») : un
// filet peut déclarer ses MOTIFS, un petit catalogue de trajectoires ; sans
// `motifs`, l'effet est son propre et unique motif (la plume, d'avant).
export function motifsFilet(effet) {
  return Array.isArray(effet.motifs) ? effet.motifs : [effet];
}

// Un tirage dans [0, 1[ qui ne dépend que de ses entrées : la même particule,
// dans la même vie, sur la même flamme, tire toujours la même chose. Aucun état
// à tenir, et rien qui défile d'une frame à l'autre (`D-218`).
function tirage(a, b, c) {
  const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return v - Math.floor(v);
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
//
// `D-246` : la particule `i` suit le motif `i` (modulo le catalogue), à SA
// période — des braises rapides et des lentes montent ensemble. Un motif peut
// faire une boucle (`boucle_px`, `boucles`) : un cercle parcouru en montant,
// qui redescend un instant si le cercle est assez grand. Et `alea` ∈ [0, 1]
// casse la régularité : à chaque VIE d'une particule (sa naissance, invisible,
// alpha 0), elle retire son côté, le sens de sa dérive et son ampleur
// (1 ± alea). Sans `alea`, rien n'est tiré : la plume reste au pixel près.
export function particulesFilet(effet, tMs, x, y, graine = 0) {
  if (!effet) return [];
  const motifs = motifsFilet(effet);
  const alea = effet.alea ?? 0;
  const particules = [];
  for (let i = 0; i < effet.nb_particules; i++) {
    const motif = motifs[i % motifs.length];
    const brut = tMs / motif.periode_ms + i / effet.nb_particules + graine;
    const vieNumero = Math.floor(brut);
    const a = brut - vieNumero;
    const vie = Math.sin(Math.PI * a);
    // Une particule sur deux boucle de l'autre côté : un filet, pas une file.
    let cote = i % 2 === 0 ? 1 : -1;
    let sensDerive = 1;
    let ampleur = 1;
    if (alea > 0) {
      cote = tirage(i, vieNumero, graine) < 0.5 ? 1 : -1;
      sensDerive = tirage(i + 31, vieNumero, graine) < 0.5 ? 1 : -1;
      ampleur = 1 + alea * (2 * tirage(i + 67, vieNumero, graine) - 1);
    }
    const angle = 2 * Math.PI * a * (motif.boucles ?? 1);
    const boucle = motif.boucle_px ?? 0;
    particules.push({
      x: x + ampleur * (cote * (motif.courbure_px * vie + boucle * Math.sin(angle)) + sensDerive * motif.derive_px * a),
      y: y - ampleur * (motif.hauteur_px * a - boucle * (1 - Math.cos(angle))),
      alpha: effet.alpha * vie,
      echelle: effet.echelle * (1 - 0.5 * a),
    });
  }
  return particules;
}

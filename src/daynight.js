// Cycle jour/nuit (03_maison-exterieur §3.5). Pur, testé — pas un catalogue
// JSON extensible (il n'y a qu'un seul cycle dans tout le jeu, pas une
// famille d'entrées interchangeables comme companions/enemies) : les phases
// vivent ici, en un seul endroit, commentées, provisoires — même statut que
// RESOLUTION_LOGIQUE dans render.js.
//
// Horloge "en temps de jeu actif" (§3.5 : la roadmap interdit les timers
// d'ATTENTE, pas un cycle visuel qui avance pendant qu'on joue) — avancerHeure
// est appelée avec le même delta plafonné que le reste du jeu, gelée sous UI
// au même titre que le combat (main.js#maj, point de décision unique).

// Chaque phase porte sa propre durée (ms) et l'opacité de voile à SON DÉBUT
// (même donnée que scene.obscurite.opacite, render.js — jamais un second
// mécanisme d'assombrissement). opaciteAHeure interpole linéairement, sur
// toute la durée de la phase courante, vers l'opacité de la phase suivante :
// deux phases voisines à la même opacité produisent donc un plateau
// "gratuit" sans code dédié — c'est ainsi que jour et nuit restent plats
// (Xav veut une nuit franche de 4 min, pas un pic isolé) alors que
// crépuscule/aube, aux opacités différentes de leurs deux voisins, rampent.
//
// Valeurs "un cran plus sombre" (verdict Xav 2026-09-16, réglé au ressenti
// le 2026-09-17) : jour = 0 exactement (aucun voile de jour, confirmé par
// Xav — le "jour plus lumineux" relèverait de la palette des tuiles, hors
// scope ici) ; nuit = 0.85, AU-DELÀ du plafond de la grotte (0.72,
// data/scenes.json) — décision explicite de Xav (verdict du 2026-09-17,
// deux options soumises) : la nuit extérieure peut être plus sombre que la
// grotte elle-même, ce 0.72 n'était qu'une valeur de référence de départ,
// pas une limite dure partagée entre intérieur et extérieur. Crépuscule et
// aube calés exactement sur leur voisin de plateau (jour pour crépuscule,
// nuit pour aube) : la seule façon de garder la transition continue (aucun
// saut) tout en ayant jour/nuit réellement plats — rend inapplicable
// l'indication initiale "un tiers/deux tiers du niveau nuit" du ticket, qui
// supposait un jour non nul. Durées par phase au ressenti Xav : jour
// 10 min, crépuscule/aube 1 min 30 chacune, nuit 4 min (17 min au total).
// Tout provisoire — premier réglage au ressenti.
export const PHASES_CYCLE = [
  { nom: 'jour', duree_ms: 600000, opacite: 0 },
  { nom: 'crepuscule', duree_ms: 90000, opacite: 0 },
  { nom: 'nuit', duree_ms: 240000, opacite: 0.85 },
  { nom: 'aube', duree_ms: 90000, opacite: 0.85 },
];

export const DUREE_CYCLE_MS = PHASES_CYCLE.reduce((somme, phase) => somme + phase.duree_ms, 0);

// Début cumulé (ms) de chaque phase, précalculé une fois — opaciteAHeure et
// phaseAHeure sont appelées à chaque frame, pas de resommer la table à
// chaque appel.
const DEBUTS_MS = (() => {
  let cumul = 0;
  return PHASES_CYCLE.map((phase) => {
    const debut = cumul;
    cumul += phase.duree_ms;
    return debut;
  });
})();

function indexPhaseAHeure(t) {
  let i = 0;
  for (let k = 1; k < DEBUTS_MS.length; k++) {
    if (t >= DEBUTS_MS[k]) i = k;
  }
  return i;
}

export function avancerHeure(heureMs, deltaMs) {
  const heure = (heureMs + deltaMs) % DUREE_CYCLE_MS;
  return heure < 0 ? heure + DUREE_CYCLE_MS : heure;
}

// Opacité interpolée linéairement entre la phase courante et la suivante
// (qui boucle sur la première au-delà de la dernière) — jamais un saut net
// d'une phase à l'autre.
export function opaciteAHeure(heureMs) {
  const t = heureMs % DUREE_CYCLE_MS;
  const i = indexPhaseAHeure(t);
  const phase = PHASES_CYCLE[i];
  const suivante = PHASES_CYCLE[(i + 1) % PHASES_CYCLE.length];
  const ratio = phase.duree_ms > 0 ? (t - DEBUTS_MS[i]) / phase.duree_ms : 0;
  return phase.opacite + (suivante.opacite - phase.opacite) * ratio;
}

// Nom de la phase courante (HUD §3.5, indicateur optionnel jour/nuit).
export function phaseAHeure(heureMs) {
  const t = heureMs % DUREE_CYCLE_MS;
  return PHASES_CYCLE[indexPhaseAHeure(t)].nom;
}

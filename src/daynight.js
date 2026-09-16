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

export const DUREE_CYCLE_MS = 600000; // 10 min, provisoire — Xav tranche au ressenti

// Phases en fraction du cycle [0,1) avec leur opacité de voile cible — la
// même donnée que scene.obscurite.opacite (render.js), jamais un second
// mécanisme d'assombrissement. Jour quasi nul (pas "aucune obscurité de
// jour" au sens strict de la Phase 1 : un soupçon de teinte, 0.05, casse la
// platitude sans gêner la lisibilité) ; nuit = la même valeur que la grotte
// (0.72, cohérence visuelle entre intérieur et extérieur sombres).
export const PHASES_CYCLE = [
  { nom: 'jour', debut: 0, opacite: 0.05 },
  { nom: 'crepuscule', debut: 0.35, opacite: 0.5 },
  { nom: 'nuit', debut: 0.5, opacite: 0.72 },
  { nom: 'aube', debut: 0.85, opacite: 0.5 },
];

export function avancerHeure(heureMs, deltaMs) {
  const heure = (heureMs + deltaMs) % DUREE_CYCLE_MS;
  return heure < 0 ? heure + DUREE_CYCLE_MS : heure;
}

// Opacité interpolée linéairement entre la phase courante et la suivante
// (qui boucle sur la première au-delà de la dernière) — jamais un saut net
// d'une phase à l'autre.
export function opaciteAHeure(heureMs) {
  const t = (heureMs % DUREE_CYCLE_MS) / DUREE_CYCLE_MS;
  let i = 0;
  for (; i < PHASES_CYCLE.length; i++) {
    const suivante = PHASES_CYCLE[(i + 1) % PHASES_CYCLE.length];
    const finPhase = i === PHASES_CYCLE.length - 1 ? 1 : suivante.debut;
    if (t >= PHASES_CYCLE[i].debut && t < finPhase) break;
  }
  const phase = PHASES_CYCLE[i] || PHASES_CYCLE[0];
  const suivante = PHASES_CYCLE[(i + 1) % PHASES_CYCLE.length];
  const finPhase = i === PHASES_CYCLE.length - 1 ? 1 : suivante.debut;
  const ratio = finPhase > phase.debut ? (t - phase.debut) / (finPhase - phase.debut) : 0;
  return phase.opacite + (suivante.opacite - phase.opacite) * ratio;
}

// Nom de la phase courante (HUD §3.5, indicateur optionnel jour/nuit).
export function phaseAHeure(heureMs) {
  const t = (heureMs % DUREE_CYCLE_MS) / DUREE_CYCLE_MS;
  let phase = PHASES_CYCLE[0];
  for (const p of PHASES_CYCLE) {
    if (t >= p.debut) phase = p;
  }
  return phase.nom;
}

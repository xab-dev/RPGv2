// La vue rapprochée d'une stèle (demande de Xav, 23/09) : INTERACT sur la
// pierre l'ouvre, B la ferme, « c'est tout ». Ce module tient ce qui VIT
// dans cette vue — le temps écoulé (la lueur qui respire, l'armement) et les
// particules qui montent des signes. Aucun état sauvegardé : fermer et
// rouvrir repart de zéro, comme on relève les yeux vers la pierre.
//
// Pur : pas de canvas, pas de DOM, pas de `Math.random` en dur — le hasard est
// passé par l'appelant (un PRNG à graine dans les tests). Les positions des
// particules sont NORMALISÉES dans la zone gravée (0..1 en x et y) : c'est
// `ui/ecran_stele.js` qui sait où est la zone à l'écran.

// Toutes PROVISOIRES, à juger en jeu par Xav.
// Combien de particules naissent par seconde, et le plafond : au-delà, une
// naissance attend qu'une autre s'éteigne (une réserve bornée, jamais un
// tableau qui grossit si la vue reste ouverte une heure).
const PARTICULES_PAR_SECONDE = 18;
export const PARTICULES_MAX = 40;
// Durée de vie : assez pour monter d'un bon quart de la zone gravée.
const VIE_MIN_MS = 1200;
const VIE_MAX_MS = 2400;
// Vitesse de montée, en fraction de la hauteur de la zone par seconde, et
// dérive latérale maximale (même unité, en largeur).
const MONTEE_MIN = 0.08;
const MONTEE_MAX = 0.2;
const DERIVE_MAX = 0.04;
// Part des particules blanches (les autres prennent la couleur de la stèle).
const PART_BLANCHES = 0.3;

export function creerVueStele(puzzleId) {
  return { puzzleId, ms: 0, reliquatMs: 0, particules: [] };
}

function naitre(hasard) {
  return {
    x: hasard(),
    y: hasard(),
    vx: (hasard() * 2 - 1) * DERIVE_MAX,
    vy: -(MONTEE_MIN + hasard() * (MONTEE_MAX - MONTEE_MIN)),
    vieMs: 0,
    dureeMs: VIE_MIN_MS + hasard() * (VIE_MAX_MS - VIE_MIN_MS),
    blanche: hasard() < PART_BLANCHES,
  };
}

// Avance la vue de `deltaMs`. Rend un NOUVEL état (l'ancien n'est pas touché).
// Les naissances se comptent au reliquat : à 18 par seconde et 16 ms par
// frame, une frame n'en ferait naître aucune si l'on arrondissait à chaque fois.
export function avancerVueStele(vue, deltaMs, hasard) {
  const s = deltaMs / 1000;
  const particules = vue.particules
    .map((p) => ({ ...p, x: p.x + p.vx * s, y: p.y + p.vy * s, vieMs: p.vieMs + deltaMs }))
    .filter((p) => p.vieMs < p.dureeMs);
  const intervalle = 1000 / PARTICULES_PAR_SECONDE;
  let reliquatMs = vue.reliquatMs + deltaMs;
  while (reliquatMs >= intervalle) {
    reliquatMs -= intervalle;
    if (particules.length < PARTICULES_MAX) particules.push(naitre(hasard));
  }
  return { ...vue, ms: vue.ms + deltaMs, reliquatMs, particules };
}

// La fermeture n'est acceptée qu'après `armementMs` : l'appui qui a ouvert
// la vue (un doigt sur le bouton INTERACT) ne doit pas la refermer aussitôt.
export function vueSteleArmee(vue, armementMs) {
  return vue.ms >= armementMs;
}

// L'opacité d'une particule : elle s'allume vite, s'éteint lentement.
export function alphaParticule(p) {
  const t = p.vieMs / p.dureeMs;
  return t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
}

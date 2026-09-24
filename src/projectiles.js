// Les PROJECTILES (spec 14, §4.3) : ce qui part d'un tireur, vole en ligne
// droite, s'arrête sur un mur et touche ce qu'il rencontre. Un seul module,
// donc un seul chemin de collision, pour tout ce qui tirera : les cracheurs de
// l'Annexe (palier C), le Gardien (F) et la compétence du joueur (G).
//
// Module PUR : ni canvas, ni DOM, ni horloge, ni catalogue. Il ne sait pas ce
// qu'est un mur (l'appelant lui passe `estSolide`) ni qui peut être touché
// (l'appelant lui passe des `cibles`). Le dessin est fait par render.js, sur
// les positions que ce module tient.
//
// Réserve à capacité fixe, patron de `poussiere.js` : les emplacements sont
// alloués une fois, un projectile éteint est recyclé sur place, jamais retiré
// du tableau. Un tir de plus quand la réserve est pleine n'a pas lieu : c'est
// une limite de dessin, pas une règle de jeu, et elle est large.

// 32 projectiles en vol en même temps (*provisoire*) : quatre cracheurs à une
// cadence de 2,4 s pour une portée de quelques tuiles n'en ont jamais plus de
// six ou sept en l'air ; le Gardien et la compétence, plus tard, tiennent dans
// la marge.
export const CAPACITE_PROJECTILES = 32;

// Le CAMP dit qui un projectile peut toucher : jamais le sien. Un crachat de
// monstre traverse les monstres, un tir du joueur (palier G) traversera le
// héros et son follet.
export const CAMP_MONSTRES = 'monstres';
export const CAMP_HEROS = 'heros';

// Longueur maximale d'un pas de collision, en pixels : un projectile rapide
// sous une frame longue (onglet revenu au premier plan, delta plafonné)
// franchirait sinon un mur fin ou un héros en un seul saut.
const PAS_COLLISION_MAX_PX = 4;

export function creerProjectiles(capacite = CAPACITE_PROJECTILES) {
  const n = Number.isInteger(capacite) && capacite >= 0 ? capacite : CAPACITE_PROJECTILES;
  const emplacements = new Array(n);
  for (let i = 0; i < n; i += 1) {
    emplacements[i] = {
      actif: false, x: 0, y: 0, vx: 0, vy: 0, rayon: 0, degats: 0,
      camp: CAMP_MONSTRES, visuel: null, courseRestantePx: 0,
    };
  }
  return { emplacements };
}

// Un tir, de (x, y) vers (versX, versY), à `vitesse` px/s, qui vole au plus
// `courseMaxPx`. Rend vrai si le projectile est parti. Une visée sur son
// propre point (le héros exactement sur le tireur) n'a pas de direction : le
// tir n'a pas lieu, plutôt que de partir dans une direction inventée.
export function tirer(etat, { x, y, versX, versY, vitesse, rayon, degats, camp, visuel, courseMaxPx }) {
  const dx = versX - x;
  const dy = versY - y;
  const norme = Math.hypot(dx, dy);
  if (!(norme > 0) || !(vitesse > 0) || !(courseMaxPx > 0)) return false;
  const libre = etat.emplacements.find((p) => !p.actif);
  if (!libre) return false;
  libre.actif = true;
  libre.x = x;
  libre.y = y;
  libre.vx = (dx / norme) * vitesse;
  libre.vy = (dy / norme) * vitesse;
  libre.rayon = rayon;
  libre.degats = degats;
  libre.camp = camp;
  libre.visuel = visuel;
  libre.courseRestantePx = courseMaxPx;
  return true;
}

// Avance les projectiles en vol. Mute la réserve en place (c'est un système de
// particules, comme `poussiere.js`) et rend la liste des TOUCHES de la frame,
// `[{ cibleId, degats }]`, que l'appelant applique : ce module n'écrit jamais
// un PV.
//
// `estSolide(x, y)` : le mur, tel que la scène le connaît (portes comprises).
// `cibles` : `[{ id, x, y, rayon, camp }]`. Un projectile touche la première
//   cible d'un AUTRE camp dont le disque rencontre le sien, puis s'éteint : un
//   tir ne touche qu'une fois.
export function avancerProjectiles(etat, deltaMs, { estSolide, cibles = [] }) {
  const touches = [];
  const deltaS = deltaMs / 1000;
  for (const p of etat.emplacements) {
    if (!p.actif) continue;
    const distance = Math.hypot(p.vx, p.vy) * deltaS;
    const pas = Math.max(1, Math.ceil(distance / PAS_COLLISION_MAX_PX));
    for (let i = 0; i < pas && p.actif; i += 1) {
      p.x += (p.vx * deltaS) / pas;
      p.y += (p.vy * deltaS) / pas;
      p.courseRestantePx -= distance / pas;
      if (estSolide(p.x, p.y)) {
        p.actif = false;
        break;
      }
      const cible = cibles.find((c) => c.camp !== p.camp && Math.hypot(c.x - p.x, c.y - p.y) <= c.rayon + p.rayon);
      if (cible) {
        touches.push({ cibleId: cible.id, degats: p.degats });
        p.actif = false;
        break;
      }
      if (p.courseRestantePx <= 0) p.actif = false;
    }
  }
  return touches;
}

// Tout s'éteint : un changement de scène ne fait pas traverser un crachat.
export function viderProjectiles(etat) {
  for (const p of etat.emplacements) p.actif = false;
}

export function projectilesEnVol(etat) {
  return etat.emplacements.filter((p) => p.actif);
}

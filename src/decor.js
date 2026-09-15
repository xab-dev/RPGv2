// Décor procédural non-collisionnant : pose des motifs sur les tuiles de
// sol, de façon déterministe à partir de scene.seed. Un même seed doit
// produire des appels canvas strictement identiques à chaque rendu.

// PRNG déterministe (mulberry32) — indépendant de Math.random, qui n'est pas
// reproductible d'un appel à l'autre.
function mulberry32(graine) {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOTIFS = ['brin_herbe', 'caillou', 'fleur'];
const DENSITE_PROVISOIRE = 0.15; // proportion de tuiles de sol décorées, non validée en jeu

// Retourne la liste des motifs à dessiner : { tileX, tileY, motif, x, y }
// (x, y en pixels, dans le repère de la scène).
export function genererDecor(scene, densite = DENSITE_PROVISOIRE) {
  const alea = mulberry32(scene.seed);
  const positionsSol = [];
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const tuile = scene.tuileA(x, y);
      if (tuile && !tuile.solid) positionsSol.push({ x, y });
    }
  }

  const nombreMotifs = Math.floor(positionsSol.length * densite);
  const decor = [];
  for (let i = 0; i < nombreMotifs; i++) {
    const position = positionsSol[Math.floor(alea() * positionsSol.length)];
    const motif = MOTIFS[Math.floor(alea() * MOTIFS.length)];
    const decalageX = alea();
    const decalageY = alea();
    decor.push({
      tileX: position.x,
      tileY: position.y,
      motif,
      x: (position.x + decalageX) * scene.tileSize,
      y: (position.y + decalageY) * scene.tileSize,
    });
  }
  return decor;
}

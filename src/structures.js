// Opacité du toit d'une structure (03_maison-exterieur §3.4) : fonction pure
// distance -> opacité, testée headless — le dessin lui-même (fillRect teinté)
// vit dans render.js, jamais exercé en headless (contrainte de méthode).
//
// RAYON_EFFACEMENT_TOIT = rayon_lumiere du follet actif x 1,25 ("un peu plus
// grand que le halo", acté Xav 2026-09-16) et MARGE_FONDU sont fournis par
// l'appelant (main.js, qui a le follet actif) plutôt que codés ici — ce
// module ne connaît que la géométrie, jamais companions.json.

// Distance du point (px,py) au RECTANGLE (pas à son centre, §3.4) — 0 si le
// point est à l'intérieur ou sur le bord.
export function distanceAuRectangle(px, py, rectPx) {
  const dx = Math.max(rectPx.x - px, 0, px - (rectPx.x + rectPx.w));
  const dy = Math.max(rectPx.y - py, 0, py - (rectPx.y + rectPx.h));
  return Math.hypot(dx, dy);
}

// 1 = toit opaque (loin), 0 = toit invisible (dedans/tout près), lerp entre
// les deux — monotone par construction (fonction affine bornée de la
// distance), exigence explicite du critère de validation §7.
export function calculerOpaciteToit(hero, structure, tileSize, { rayonEffacement, margeFondu }) {
  const rectPx = {
    x: structure.rect.x * tileSize,
    y: structure.rect.y * tileSize,
    w: structure.rect.w * tileSize,
    h: structure.rect.h * tileSize,
  };
  const distance = distanceAuRectangle(hero.x, hero.y, rectPx);
  if (distance >= rayonEffacement) return 1;
  const seuilBas = rayonEffacement - margeFondu;
  if (distance <= seuilBas) return 0;
  return (distance - seuilBas) / margeFondu;
}

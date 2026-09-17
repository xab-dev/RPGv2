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

// specs/04_stations-proportions-collision.md — échelle/empreinte des
// interactifs (leviers, stations placeholder). Provisoire (Xav ajuste au
// ressenti) : un seul endroit pour la valeur par défaut, surchargeable par
// entrée puzzles.json (`echelle`). Les 4 stations concernées (table, coffre,
// atelier, puits) déclarent explicitement leur propre `echelle` dans
// puzzles.json — ce défaut ne s'applique qu'aux interactifs qui ne déclarent
// rien (tous les leviers aujourd'hui), donc AUCUN changement de rendu pour
// eux (§3 : "leviers : 1, inchangés").
export const ECHELLE_INTERACTIF_DEFAUT = 1;
export const ECHELLE_STATION_PROVISOIRE = 2.1;

// Boîte englobante des primitives d'un visuel (jamais l'ombre, purement
// visuelle) à l'échelle donnée, relative au point (0,0) où dessinerVisuel()
// place la silhouette — c'est-à-dire relative à la MÊME position que celle
// utilisée pour le rendu (position.x/y du puzzle), jamais un second repère.
// Rotation de primitive ignorée (aucun interactif n'en utilise à ce jour) :
// approximation documentée, pas un bug si elle réapparaît un jour.
export function empreinteParDefaut(visuel, echelle) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of visuel.primitives) {
    const dx = p.dx || 0;
    const dy = p.dy || 0;
    if (p.forme === 'polygone' || p.forme === 'ligne') {
      for (const [px, py] of p.points) {
        minX = Math.min(minX, dx + px);
        maxX = Math.max(maxX, dx + px);
        minY = Math.min(minY, dy + py);
        maxY = Math.max(maxY, dy + py);
      }
      continue;
    }
    const demiW = (p.w || 0) / 2;
    const demiH = (p.h || 0) / 2;
    minX = Math.min(minX, dx - demiW);
    maxX = Math.max(maxX, dx + demiW);
    minY = Math.min(minY, dy - demiH);
    maxY = Math.max(maxY, dy + demiH);
  }

  return { x: minX * echelle, y: minY * echelle, w: (maxX - minX) * echelle, h: (maxY - minY) * echelle };
}

// Empreinte effective d'un interactif (rectangle en px logiques, relatif à sa
// position) — §3 : "une seule règle pour tous les interactifs". Un levier
// (ni `solide`, ni `empreinte` explicite) obtient un rectangle de taille
// nulle : le seuil d'interaction mesuré à son "bord" (structures.js#
// distanceAuRectangle sur un rectangle nul) redonne exactement la distance au
// centre d'avant cette fiche — comportement identique, pas une coïncidence.
export function resoudreEmpreinteInteractif(puzzle, visuel) {
  if (puzzle.empreinte) return puzzle.empreinte;
  if (!puzzle.solide) return { x: 0, y: 0, w: 0, h: 0 };
  return empreinteParDefaut(visuel, puzzle.echelle ?? ECHELLE_INTERACTIF_DEFAUT);
}

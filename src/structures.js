// Opacité du toit d'une structure (03_maison-exterieur §3.4) : fonction pure
// distance -> opacité, testée headless — le dessin lui-même (fillRect teinté)
// vit dans render.js, jamais exercé en headless (contrainte de méthode).
//
// RAYON_EFFACEMENT_TOIT = rayon_lumiere du follet actif x un facteur ("un peu
// plus grand que le halo", acté Xav 2026-09-16 ; valeur provisoire, déclarée
// une seule fois dans main.js#FACTEUR_EFFACEMENT_TOIT — pas recopiée ici, un
// commentaire qui cite un nombre finit toujours par mentir) et MARGE_FONDU
// sont fournis par l'appelant (main.js, qui a le follet actif) plutôt que
// codés ici — ce module ne connaît que la géométrie, jamais companions.json.

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

// Boîte englobante des primitives d'un visuel (jamais l'ombre, purement
// visuelle) à l'échelle donnée, relative au point (0,0) où dessinerVisuel()
// place la silhouette — c'est-à-dire relative à la MÊME position que celle
// utilisée pour le rendu (position.x/y du puzzle), jamais un second repère.
// Rotation de primitive ignorée (aucun interactif n'en utilise à ce jour) :
// approximation documentée, pas un bug si elle réapparaît un jour.
// SD_puits-silhouette_2026-09-19 : boîte d'UNE primitive, à l'échelle
// demandée. Extraite de empreinteParDefaut (aucun changement de règle : c'est
// exactement le calcul qui s'y trouvait, désormais nommé) pour que la
// vérification d'assemblage d'une silhouette (les pièces se touchent-elles ?)
// et l'empreinte solide dérivent de la MÊME règle — un test qui recopierait
// la règle pourrait rester vert alors que l'empreinte, elle, aurait changé.
export function boitePrimitive(p, echelle = 1) {
  const dx = p.dx || 0;
  const dy = p.dy || 0;
  if (p.forme === 'polygone' || p.forme === 'ligne') {
    const xs = p.points.map(([px]) => dx + px);
    const ys = p.points.map(([, py]) => dy + py);
    return {
      minX: Math.min(...xs) * echelle,
      minY: Math.min(...ys) * echelle,
      maxX: Math.max(...xs) * echelle,
      maxY: Math.max(...ys) * echelle,
    };
  }
  const demiW = (p.w || 0) / 2;
  const demiH = (p.h || 0) / 2;
  return {
    minX: (dx - demiW) * echelle,
    minY: (dy - demiH) * echelle,
    maxX: (dx + demiW) * echelle,
    maxY: (dy + demiH) * echelle,
  };
}

export function empreinteParDefaut(visuel, echelle) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of visuel.primitives) {
    const b = boitePrimitive(p);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }

  return { x: minX * echelle, y: minY * echelle, w: (maxX - minX) * echelle, h: (maxY - minY) * echelle };
}

// Empreinte effective d'un interactif (rectangle en px logiques, relatif à sa
// position) — §3 : "une seule règle pour tous les interactifs". Un levier
// (ni `solide`, ni `empreinte` explicite) obtient un rectangle de taille
// nulle : le seuil d'interaction mesuré à son "bord" (structures.js#
// distanceAuRectangle sur un rectangle nul) redonne exactement la distance au
// centre d'avant cette fiche — comportement identique, pas une coïncidence.
//
// `rotation` (specs/05_construction-stations.md §3, quarts de tour horaires
// 0..3) tourne ce rectangle de base — jamais un second calcul d'empreinte : la
// même fonction sert la collision statique (scene.js) et la validation de
// pose en temps réel (placement.js#poseValide).
export function resoudreEmpreinteInteractif(puzzle, visuel, rotation = 0) {
  const base = puzzle.empreinte
    ? puzzle.empreinte
    : !puzzle.solide
      ? { x: 0, y: 0, w: 0, h: 0 }
      : empreinteParDefaut(visuel, puzzle.echelle ?? ECHELLE_INTERACTIF_DEFAUT);
  const r = ((rotation % 4) + 4) % 4;
  return r === 0 ? base : tournerEmpreinte(base, r);
}

// Tourne un rectangle relatif (x,y = coin, PAS le centre) de `rotation` quarts
// de tour HORAIRES autour de l'origine (0,0) — c'est-à-dire le même repère que
// dessinerVisuel(), qui pivote ses primitives via ctx.rotate((rotation*90) *
// Math.PI/180) : un point local (px,py) y devient (-py,px) après un quart de
// tour horaire (canvas 2D, axe Y vers le bas). Composer ce même pas 4x calcule
// la boîte englobante d'un rectangle tourné SANS jamais énumérer les 4 cas à
// la main (dérivation vérifiée : k fois cette étape ≡ la formule fermée pour
// une rotation de k×90°). Rendu (rotation en degrés, dessinerVisuel) et
// collision (ce module) restent ainsi rigoureusement synchronisés — spec §3 :
// "jamais deux calculs".
export function tournerEmpreinte(rect, rotation) {
  let r = rect;
  const fois = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < fois; i++) {
    r = { x: -(r.y + r.h), y: r.x, w: r.h, h: r.w };
  }
  return r;
}

// Empreinte ABSOLUE (px logiques, repère de la scène) d'un puzzle positionné
// à `pose` ({ x, y, rotation } en coordonnées TUILE) — factorise le calcul
// "centre de la tuile + empreinte relative tournée" jusqu'ici dupliqué entre
// scene.js (empreintesSolides statiques) et main.js (rectangleInteractif) ;
// specs/05_construction-stations.md en a besoin une 3ᵉ fois (fantôme de
// pose), d'où l'extraction ici plutôt qu'une nouvelle duplication.
export function empreinteAbsoluePuzzle(puzzle, visuel, pose, tileSize) {
  const rel = resoudreEmpreinteInteractif(puzzle, visuel, pose.rotation || 0);
  const cx = (pose.x + 0.5) * tileSize;
  const cy = (pose.y + 0.5) * tileSize;
  return { x: cx + rel.x, y: cy + rel.y, w: rel.w, h: rel.h };
}

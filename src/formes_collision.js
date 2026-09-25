// La FORME DE COLLISION d'une tuile (`D-224`, demande de Xav, 25/09 : « réduire
// la hitbox des arbres de la forêt pour que ça colle un peu plus à ce que l'on
// voit, notamment les angles à arrondir, un peu comme les cartes du menu »).
// La part pure : la géométrie, en px logiques, relative au coin haut gauche de
// la case. `scene.js` la construit et l'interroge ; il n'y a toujours qu'une
// seule fonction de collision (`scene.estSolideAuPoint`).
//
// Une tuile solide sans `collision` bloque sa case entière, comme avant. Une
// tuile qui en déclare une (`tiles.json > collision : { largeur, hauteur,
// rayon, retrait_bas }`) ne bloque qu'un rectangle aux coins arrondis, centré
// en largeur et posé au bas de sa case (le pied de l'arbre), relevé de
// `retrait_bas`.
//
// Mais un côté reste FERMÉ jusqu'au bord de la case dès qu'une voisine de ce
// côté est solide — orthogonale, ou en diagonale sur l'un de ses deux coins.
// Sans ça, rétrécir chaque arbre ouvrirait un passage entre deux arbres voisins
// et la forêt deviendrait une passoire : la bordure de la carte, la clairière
// de la stèle « invisible depuis le chemin ». Seuls les côtés EXPOSÉS
// rétrécissent, et seul un coin dont les deux côtés sont exposés s'arrondit.

// Un côté fermé déborde d'un pixel hors de la case : un point de la case est
// toujours « avant » ce bord, et le bord ouvert, lui, est strict (un point posé
// pile dessus est dehors — c'est là que la correction de coin le pousse).
const HORS_CASE_PX = 1;

// `fermes` : les voisines solides, par direction — { N, S, E, O, NE, NO, SE, SO }.
export function formeCollision(collision, tileSize, fermes) {
  const T = tileSize;
  const largeur = Math.min(collision.largeur, T);
  const hauteur = Math.min(collision.hauteur, T);
  const retrait = Math.max(0, Math.min(collision.retrait_bas || 0, T - hauteur));
  const nord = !!(fermes.N || fermes.NE || fermes.NO);
  const sud = !!(fermes.S || fermes.SE || fermes.SO);
  const est = !!(fermes.E || fermes.NE || fermes.SE);
  const ouest = !!(fermes.O || fermes.NO || fermes.SO);
  const x0 = ouest ? -HORS_CASE_PX : (T - largeur) / 2;
  const x1 = est ? T + HORS_CASE_PX : (T + largeur) / 2;
  const y1 = sud ? T + HORS_CASE_PX : T - retrait;
  const y0 = nord ? -HORS_CASE_PX : T - retrait - hauteur;
  const r = Math.max(0, Math.min(collision.rayon || 0, largeur / 2, hauteur / 2));
  return {
    x0, x1, y0, y1,
    rayons: {
      hg: !nord && !ouest ? r : 0,
      hd: !nord && !est ? r : 0,
      bg: !sud && !ouest ? r : 0,
      bd: !sud && !est ? r : 0,
    },
  };
}

// Le point (lx, ly) de la case est-il dans la forme ? Bords stricts.
export function pointDansForme(f, lx, ly) {
  if (!(lx > f.x0 && lx < f.x1 && ly > f.y0 && ly < f.y1)) return false;
  const { hg, hd, bg, bd } = f.rayons;
  const dansCoin = (cx, cy, r) => (lx - cx) ** 2 + (ly - cy) ** 2 < r * r;
  if (hg > 0 && lx < f.x0 + hg && ly < f.y0 + hg) return dansCoin(f.x0 + hg, f.y0 + hg, hg);
  if (hd > 0 && lx > f.x1 - hd && ly < f.y0 + hd) return dansCoin(f.x1 - hd, f.y0 + hd, hd);
  if (bg > 0 && lx < f.x0 + bg && ly > f.y1 - bg) return dansCoin(f.x0 + bg, f.y1 - bg, bg);
  if (bd > 0 && lx > f.x1 - bd && ly > f.y1 - bd) return dansCoin(f.x1 - bd, f.y1 - bd, bd);
  return true;
}

// Le bord de la forme, sur la droite qui passe par le point, du côté `sens`
// (+1 : vers les x ou y croissants). Dans une zone de coin arrondi, le bord est
// l'arc ; ailleurs, le côté droit.
function bord(f, axe, sens, travers) {
  const { hg, hd, bg, bd } = f.rayons;
  const arc = (r, centreTravers, centreAxe, versAxe) => centreAxe + versAxe * Math.sqrt(Math.max(0, r * r - (travers - centreTravers) ** 2));
  if (axe === 'y') {
    if (sens > 0) {
      if (bg > 0 && travers < f.x0 + bg) return arc(bg, f.x0 + bg, f.y1 - bg, 1);
      if (bd > 0 && travers > f.x1 - bd) return arc(bd, f.x1 - bd, f.y1 - bd, 1);
      return f.y1;
    }
    if (hg > 0 && travers < f.x0 + hg) return arc(hg, f.x0 + hg, f.y0 + hg, -1);
    if (hd > 0 && travers > f.x1 - hd) return arc(hd, f.x1 - hd, f.y0 + hd, -1);
    return f.y0;
  }
  if (sens > 0) {
    if (hd > 0 && travers < f.y0 + hd) return arc(hd, f.y0 + hd, f.x1 - hd, 1);
    if (bd > 0 && travers > f.y1 - bd) return arc(bd, f.y1 - bd, f.x1 - bd, 1);
    return f.x1;
  }
  if (hg > 0 && travers < f.y0 + hg) return arc(hg, f.y0 + hg, f.x0 + hg, -1);
  if (bg > 0 && travers > f.y1 - bg) return arc(bg, f.y1 - bg, f.x0 + bg, -1);
  return f.x0;
}

// De combien pousser le point, le long de `axe`, dans le `sens` donné, pour
// qu'il sorte de la forme (0 s'il est déjà dehors). C'est le « chevauchement »
// de la correction de coin (`scene.js#resoudreDeplacement`), mesuré sur la
// forme et non plus sur le bord de la case : contre un coin arrondi, le héros
// glisse autour de l'arc au lieu de buter.
export function sortieDeForme(f, lx, ly, axe, sens) {
  if (!pointDansForme(f, lx, ly)) return 0;
  const cible = bord(f, axe, sens, axe === 'y' ? lx : ly);
  const v = axe === 'y' ? ly : lx;
  return Math.max(0, sens > 0 ? cible - v : v - cible) + MARGE_SORTIE_PX;
}

// Poussé pile sur l'arc, un point peut rester dedans d'un cheveu : la racine
// carrée arrondit, et le test du cercle est strict. Le héros refusait alors
// un glissement que la tolérance de coin acceptait (trouvé par le test du
// coin arrondi). Un millionième de pixel ne se voit pas et ne se cumule pas :
// il n'est ajouté qu'à une poussée qui a lieu.
const MARGE_SORTIE_PX = 1e-6;

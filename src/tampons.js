// Les TAMPONS du calque statique (`specs/13` palier B, `D-153`) — la part
// pure : la clé d'un tampon, la boîte de son dessin, et le cache qui les
// garde. Aucun canvas ici : c'est `render.js` qui les fabrique et les pose,
// ce module ne fait que dire QUOI tramer, à quelle TAILLE, et s'il l'a déjà.
//
// Pourquoi : une case d'herbe rejoue ~20 primitives à chaque reconstruction du
// calque, et la fenêtre en compte ~150. Or ces dessins sont en nombre fini
// (un visuel × sa variante × son miroir, à une échelle donnée) : on les trame
// UNE fois dans un petit canvas hors-écran, et le calque les POSE par
// `drawImage` à une position entière. L'échelle du jeu réel est toujours
// entière (`render.js#calculerEchelleEntiere`) : un tampon posé à un pixel
// entier n'est jamais ré-échantillonné.
//
// Ne sont tamponnés que les dessins de TUILE (grain, objet de tuile, bientôt
// les lisières) : le décor a une rotation continue, un tampon par angle
// n'aurait aucun sens (§4.4).

// Marge de trait, en px logiques, autour de la boîte géométrique d'un dessin.
// Une `ligne` de `visuels.js` est un chemin FERMÉ tracé avec la jointure par
// défaut du canvas (`miter`, `miterLimit` 10) : une pointe peut dépasser le
// point de `miterLimit × épaisseur / 2 = 5 × épaisseur`. On la paie en entier
// plutôt que de risquer un trait rogné au bord d'un tampon — le coût est un
// tampon un peu plus grand, rien d'autre.
export const FACTEUR_POINTE_TRAIT = 5;
// Un pixel physique de plus de chaque côté : l'antialias d'un bord qui tombe
// pile sur la boîte déborde d'une fraction de pixel.
export const MARGE_ANTIALIAS_PX = 1;

// La clé d'un tampon : tout ce qui change le dessin, et rien d'autre.
// - `id` : le visuel de `visuels.json` (une variante est un autre id) ;
// - `nbPrimitives` : la fraction de grain du preset. `qualite.js#appliquerGrainSol`
//   garde les PREMIÈRES primitives : à nombre égal, le dessin est le même ;
// - `miroir`, `rotation` (degrés) : la pose ;
// - `echelle` : l'échelle de rendu, pour qu'un tampon d'une autre échelle ne
//   soit jamais posé.
export function cleTampon({ id, nbPrimitives, miroir = false, rotation = 0, echelle }) {
  return `${id}|${nbPrimitives}|${miroir ? 'm' : '-'}|${rotation}|${echelle}`;
}

// Boîte d'une primitive dans le repère du visuel (px logiques, échelle propre
// non appliquée), rotation de la primitive et trait COMPRIS. Plus large que
// `structures.js#boitePrimitive`, qui sert la collision et ignore les deux :
// ici, un pixel oublié est un pixel rogné à l'image.
function boiteDessinPrimitive(p) {
  const locale = p.forme === 'polygone' || p.forme === 'ligne'
    ? {
      minX: Math.min(...p.points.map(([x]) => x)),
      maxX: Math.max(...p.points.map(([x]) => x)),
      minY: Math.min(...p.points.map(([, y]) => y)),
      maxY: Math.max(...p.points.map(([, y]) => y)),
    }
    : { minX: -(p.w || 0) / 2, maxX: (p.w || 0) / 2, minY: -(p.h || 0) / 2, maxY: (p.h || 0) / 2 };
  const trait = p.forme === 'ligne' ? FACTEUR_POINTE_TRAIT * (p.epaisseur || 1) : 0;
  let coins = [
    [locale.minX - trait, locale.minY - trait], [locale.maxX + trait, locale.minY - trait],
    [locale.minX - trait, locale.maxY + trait], [locale.maxX + trait, locale.maxY + trait],
  ];
  if (p.rotation) {
    const a = (p.rotation * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    coins = coins.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  }
  const dx = p.dx || 0;
  const dy = p.dy || 0;
  return {
    minX: Math.min(...coins.map(([x]) => x)) + dx,
    maxX: Math.max(...coins.map(([x]) => x)) + dx,
    minY: Math.min(...coins.map(([, y]) => y)) + dy,
    maxY: Math.max(...coins.map(([, y]) => y)) + dy,
  };
}

// Boîte de TOUT ce que `visuels.js#dessinerVisuel` peint pour ce visuel,
// relative à son ancre, en px logiques : primitives, traits, et l'ombre portée
// (qu'aucune empreinte de collision ne compte, mais qui se voit), échelle
// propre appliquée, puis le miroir et la rotation de la pose — dans l'ordre où
// `dessinerVisuel` les applique.
export function boiteDessin(visuel, { echelle = 1, miroir = false, rotation = 0 } = {}) {
  const boites = visuel.primitives.map(boiteDessinPrimitive);
  if (visuel.ombre) {
    const { dy, w, h } = visuel.ombre;
    boites.push({ minX: -w / 2, maxX: w / 2, minY: dy - h / 2, maxY: dy + h / 2 });
  }
  let minX = Math.min(...boites.map((b) => b.minX)) * echelle;
  let maxX = Math.max(...boites.map((b) => b.maxX)) * echelle;
  const minY0 = Math.min(...boites.map((b) => b.minY)) * echelle;
  const maxY0 = Math.max(...boites.map((b) => b.maxY)) * echelle;
  if (miroir) [minX, maxX] = [-maxX, -minX];
  let coins = [[minX, minY0], [maxX, minY0], [minX, maxY0], [maxX, maxY0]];
  if (rotation) {
    const a = (rotation * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    coins = coins.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  }
  return {
    minX: Math.min(...coins.map(([x]) => x)),
    maxX: Math.max(...coins.map(([x]) => x)),
    minY: Math.min(...coins.map(([, y]) => y)),
    maxY: Math.max(...coins.map(([, y]) => y)),
  };
}

// La taille du tampon et la position de l'ancre dans le tampon, en pixels
// PHYSIQUES entiers. L'ancre tombe sur un pixel entier du tampon, et le
// calque la pose sur un pixel entier : le dessin est tramé exactement comme il
// l'aurait été directement dans le calque (même position du trait par rapport
// à la grille des pixels). `echelleVisuel` est l'échelle propre du visuel
// (`visuels.js#echelleVisuel`), passée par l'appelant.
export function boiteTampon(visuel, echelleRendu, { echelleVisuel = 1, miroir = false, rotation = 0 } = {}) {
  const b = boiteDessin(visuel, { echelle: echelleVisuel, miroir, rotation });
  const gauche = Math.floor(b.minX * echelleRendu) - MARGE_ANTIALIAS_PX;
  const haut = Math.floor(b.minY * echelleRendu) - MARGE_ANTIALIAS_PX;
  const droite = Math.ceil(b.maxX * echelleRendu) + MARGE_ANTIALIAS_PX;
  const bas = Math.ceil(b.maxY * echelleRendu) + MARGE_ANTIALIAS_PX;
  return { largeur: droite - gauche, hauteur: bas - haut, ancreX: -gauche, ancreY: -haut };
}

// Le cache : une clé → un tampon, fabriqué au premier besoin. `fabriquer` est
// fourni par l'appelant (render.js, qui a le DOM) : le cache ne sait pas ce
// qu'est un canvas. Sa taille est le nombre de dessins DISTINCTS de la scène —
// quelques dizaines —, jamais le nombre de cases : il n'a pas besoin de borne
// d'éviction. Il se vide avec le calque (changement de preset) et au
// changement d'échelle (`render.js#dessinerCoucheStatique`).
export function creerCacheTampons(fabriquer) {
  const tampons = new Map();
  return {
    obtenir(cle, ...args) {
      let tampon = tampons.get(cle);
      if (tampon === undefined) {
        tampon = fabriquer(...args);
        tampons.set(cle, tampon);
      }
      return tampon;
    },
    vider() {
      tampons.clear();
    },
    get taille() {
      return tampons.size;
    },
  };
}

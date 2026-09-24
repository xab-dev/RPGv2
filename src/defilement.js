// Le DÉFILEMENT INCRÉMENTAL du calque statique (`specs/13` palier C, `D-01`) —
// la part pure : quelles cases repeindre, jusqu'où une case peut peindre chez
// ses voisines, et le décor rangé par case. Aucun canvas ici : `render.js`
// peint et recopie ; ce module ne fait que dire OÙ.
//
// Pourquoi : quand la vue sort de la zone pré-rendue, le calque se refaisait
// en entier, alors que la marche ne l'a décalé que d'une ou deux cases. On
// recopie donc l'ancien calque, décalé, et on ne repeint que ce qui a changé.
//
// Le piège (`D-01`, `D-105`) : une case ne peint pas que chez elle. Un arbre
// déborde sur ses voisines, son ombre aussi, un brin d'herbe du décor aussi.
// La recopie n'est donc juste que LOIN des bords qui ont bougé, et la bande
// repeinte doit recevoir tout ce qui peut la toucher, dans le même ordre
// qu'une reconstruction complète. Peindre ces cases-là dans cet ordre, puis
// recopier l'ancien calque par-dessus la zone sûre, donne par construction
// une reconstruction complète (`tests/test_defilement_2026-09-24.js` le
// prouve sur un modèle, `tools/scenarios/calque_identique.mjs` au pixel).
//
// Toutes les fenêtres sont en CASES, bornes `[xDebut ; xFin[` et
// `[yDebut ; yFin[` (la forme de `render.js#selectionnerTuilesVisibles`).
import { boiteDessin } from './tampons.js';
import { echelleVisuel } from './visuels.js';

// Un pixel logique de plus autour de chaque boîte : l'antialias d'un bord qui
// tombe pile sur la limite d'une case déborde d'une fraction de pixel. Même
// raison que `tampons.js#MARGE_ANTIALIAS_PX`, en px LOGIQUES ici (la plus
// petite échelle est 1, donc un px logique couvre au moins un px physique).
const MARGE_ANTIALIAS_LOGIQUE = 1;

function vide(r) {
  return r.xDebut >= r.xFin || r.yDebut >= r.yFin;
}

function intersection(a, b) {
  return {
    xDebut: Math.max(a.xDebut, b.xDebut),
    yDebut: Math.max(a.yDebut, b.yDebut),
    xFin: Math.min(a.xFin, b.xFin),
    yFin: Math.min(a.yFin, b.yFin),
  };
}

// Le plan d'un défilement, de l'ancienne fenêtre `ancienne` (ce que montre le
// calque) à la nouvelle `nouvelle`, sachant qu'une case peint jusqu'à `rayon`
// cases autour d'elle. Rend `null` quand rien ne se recopie (saut de caméra,
// ou fenêtres trop éloignées) : l'appelant reconstruit alors en entier.
//
// - `copie` : les cases dont les pixels de l'ancien calque sont EXACTEMENT
//   ceux qu'une reconstruction de la nouvelle fenêtre donnerait. C'est
//   l'intersection des deux fenêtres, rognée de `rayon` du côté de chaque bord
//   qui a bougé : là, une case que l'une des deux fenêtres dessine et l'autre
//   pas (la nouvelle bande, ou l'ancienne qui sort) peut avoir peint. Un bord
//   resté en place ne se rogne pas : de ce côté, ni l'une ni l'autre ne
//   dessine au-delà.
// - `repeindre` : le reste de la nouvelle fenêtre, en rectangles disjoints
//   (bande du haut et du bas sur toute la largeur, puis gauche et droite) —
//   la zone nouvelle, qui avec `copie` pave la nouvelle fenêtre.
// - `sansDessin` : les cases de la nouvelle fenêtre qui ne peuvent PAS
//   toucher la zone à repeindre (plus loin que `rayon` de chacun de ses
//   rectangles), ou `null` si toutes peuvent la toucher. Toutes les autres
//   cases de la nouvelle fenêtre se redessinent, avant la recopie.
export function planDefilement(ancienne, nouvelle, rayon) {
  const commun = intersection(ancienne, nouvelle);
  if (vide(commun)) return null;
  const copie = {
    xDebut: commun.xDebut + (ancienne.xDebut !== nouvelle.xDebut ? rayon : 0),
    yDebut: commun.yDebut + (ancienne.yDebut !== nouvelle.yDebut ? rayon : 0),
    xFin: commun.xFin - (ancienne.xFin !== nouvelle.xFin ? rayon : 0),
    yFin: commun.yFin - (ancienne.yFin !== nouvelle.yFin ? rayon : 0),
  };
  if (vide(copie)) return null;

  const repeindre = [
    { xDebut: nouvelle.xDebut, yDebut: nouvelle.yDebut, xFin: nouvelle.xFin, yFin: copie.yDebut },
    { xDebut: nouvelle.xDebut, yDebut: copie.yFin, xFin: nouvelle.xFin, yFin: nouvelle.yFin },
    { xDebut: nouvelle.xDebut, yDebut: copie.yDebut, xFin: copie.xDebut, yFin: copie.yFin },
    { xDebut: copie.xFin, yDebut: copie.yDebut, xFin: nouvelle.xFin, yFin: copie.yFin },
  ].filter((r) => !vide(r));

  // La zone à repeindre entoure `copie` du côté de chaque bord qui n'est pas
  // celui de la nouvelle fenêtre : c'est de là, et de là seulement, qu'une
  // case de `copie` est à moins de `rayon` d'elle.
  const sansDessin = {
    xDebut: copie.xDebut + (copie.xDebut > nouvelle.xDebut ? rayon : 0),
    yDebut: copie.yDebut + (copie.yDebut > nouvelle.yDebut ? rayon : 0),
    xFin: copie.xFin - (copie.xFin < nouvelle.xFin ? rayon : 0),
    yFin: copie.yFin - (copie.yFin < nouvelle.yFin ? rayon : 0),
  };
  return { copie, repeindre, sansDessin: vide(sansDessin) ? null : sansDessin };
}

export function dansFenetre(f, x, y) {
  return x >= f.xDebut && x < f.xFin && y >= f.yDebut && y < f.yFin;
}

// Les cases à redessiner pour un défilement, dans l'ordre de la
// reconstruction complète (ligne par ligne, de gauche à droite) : c'est cet
// ordre qui décide qui passe par-dessus qui, et la bande doit le rejouer tel
// quel. `null` : reconstruction complète (cf. `planDefilement`).
export function cellulesARepeindre(ancienne, nouvelle, rayon) {
  const plan = planDefilement(ancienne, nouvelle, rayon);
  return plan ? cellulesAPeindre(nouvelle, plan.sansDessin) : null;
}

// Les cases de `fenetre` hors de `sansDessin`, dans l'ordre du dessin. C'est
// aussi ce que parcourt une reconstruction complète (`sansDessin` absent) :
// les deux chemins du calque lisent la MÊME liste, dans le même ordre.
export function cellulesAPeindre(fenetre, sansDessin = null) {
  const cellules = [];
  for (let y = fenetre.yDebut; y < fenetre.yFin; y++) {
    for (let x = fenetre.xDebut; x < fenetre.xFin; x++) {
      if (sansDessin && dansFenetre(sansDessin, x, y)) continue;
      cellules.push({ x, y });
    }
  }
  return cellules;
}

// Jusqu'où, en px logiques, un dessin posé à `(0, 0)` peut peindre, dans
// chaque direction — le plus grand des débordements de ses boîtes, miroir
// compris (un miroir échange la gauche et la droite).
function debordements(visuel, rotationMaxDeg = 0) {
  const echelle = echelleVisuel(visuel);
  const b = boiteDessin(visuel, { echelle });
  if (!rotationMaxDeg) {
    const cote = Math.max(-b.minX, b.maxX);
    return { gauche: cote, droite: cote, haut: -b.minY, bas: b.maxY };
  }
  // Une rotation continue (le décor, `decor.js#ROTATION_MAX_DEG`) : on borne
  // par le cercle qui contient la boîte, ce que toute rotation respecte.
  const r = Math.hypot(Math.max(-b.minX, b.maxX), Math.max(-b.minY, b.maxY));
  return { gauche: r, droite: r, haut: r, bas: r };
}

// Le RAYON D'INFLUENCE, en cases : jusqu'où le dessin d'une case peut toucher
// une autre case. Dérivé des données, jamais écrit à la main : un arbre plus
// large, une ombre plus longue, un motif de décor plus grand l'agrandissent
// tout seuls.
// - `visuelsTuiles` : la table de `main.js#construireTableGrains` (id de tuile
//   → ses visuels), ancrés au MILIEU DU BAS de leur case ;
// - `visuelsDecor` : les visuels des motifs de décor, ancrés n'importe où DANS
//   leur case (leur case est celle de leur ancre), avec une rotation continue
//   bornée par `rotationDecorMaxDeg`.
// Le palier D (lisières) y ajoutera la case voisine que touche une lisière.
export function rayonInfluence({ visuelsTuiles, visuelsDecor = [], tileSize, rotationDecorMaxDeg = 0 }) {
  let depassement = 0;
  for (const visuels of visuelsTuiles.values()) {
    for (const visuel of visuels) {
      const d = debordements(visuel);
      depassement = Math.max(
        depassement,
        d.gauche - tileSize / 2, d.droite - tileSize / 2, d.haut - tileSize, d.bas,
      );
    }
  }
  for (const visuel of visuelsDecor) {
    const d = debordements(visuel, rotationDecorMaxDeg);
    // L'ancre peut être au bord même de sa case : tout le débordement compte.
    depassement = Math.max(depassement, d.gauche, d.droite, d.haut, d.bas);
  }
  if (depassement <= 0) return 0;
  return Math.ceil((depassement + MARGE_ANTIALIAS_LOGIQUE) / tileSize);
}

// Le décor rangé PAR CASE, une fois par liste de décor (à l'entrée en scène,
// ou quand un preset la retire) : une reconstruction lit les cases de sa
// fenêtre, sans parcourir toute la liste — dont la longueur suit la taille de
// la carte et la densité de Haut (×10, `D-116`). Chaque motif garde son rang
// dans la liste : le décor se dessine dans l'ordre de la liste (qui décide
// qui passe par-dessus qui), et `motifsDesCellules` le rétablit.
export function indexerDecor(decor, tileSize) {
  const parCase = new Map();
  decor.forEach((motif, rang) => {
    const cle = cleCase(Math.floor(motif.x / tileSize), Math.floor(motif.y / tileSize));
    let liste = parCase.get(cle);
    if (!liste) {
      liste = [];
      parCase.set(cle, liste);
    }
    liste.push({ rang, motif });
  });
  return { parCase };
}

// Une clé numérique par case. Les cases d'un décor sont dans la scène (x, y ≥
// 0), et aucune scène n'approche 2^20 cases de large.
function cleCase(x, y) {
  return y * 1048576 + x;
}

// Les motifs dont l'ancre tombe dans l'une des `cellules`, dans l'ordre de la
// liste d'origine. Ce qui est lu ne dépend que des cellules demandées, jamais
// de la longueur du décor (`specs/13` §4.6).
export function motifsDesCellules(index, cellules) {
  const trouves = [];
  for (const { x, y } of cellules) {
    const liste = index.parCase.get(cleCase(x, y));
    if (liste) for (const entree of liste) trouves.push(entree);
  }
  trouves.sort((a, b) => a.rang - b.rang);
  return trouves.map((e) => e.motif);
}

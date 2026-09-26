// OUTIL DE DEV, jamais chargé par le jeu : ce que partagent l'atelier
// (`tools/atelier.html`) et l'instrument de pixels (`tools/mesure_visuel.html`)
// — rendre une silhouette de `data/visuels.json` à sa TAILLE RÉELLE, l'agrandir
// au plus proche voisin, comparer deux rendus pixel à pixel, rejouer un tour
// ou une marche comme le jeu le fait.
//
// Pourquoi un module et pas des copies : les outils des sessions du héros
// (`tools/_ref/`, 26/09) recopiaient chacun leur `rendre()`, avec des cadres
// fixes (30 × 34 unités) qui coupaient le puits et des transforms agrandies
// qui épaississaient les traits. Spec 17, palier A.
//
// Les modules du jeu sont PASSÉS (`mod`), jamais importés ici : `diff` rend la
// même silhouette par deux versions du code (la référence Git et l'arbre de
// travail), et chaque version doit se rendre avec SES modules.

// Le cadre d'une silhouette en unités du visuel (ombre comprise), avec une
// marge : une pièce posée (pliée, glissée) peut déborder du dessin d'auteur.
// Plusieurs visuels → le cadre qui les contient tous (deux versions comparées
// doivent partager le même cadre, sinon tout pixel diffère).
export function cadreVisuels(visuels, boitePrimitive, marge = 3) {
  const boites = [];
  for (const v of visuels) {
    if (!v) continue;
    const e = typeof v.echelle === 'number' && v.echelle > 0 ? v.echelle : 1;
    for (const p of v.primitives) boites.push(boitePrimitive(p, e));
    if (v.ombre) boites.push(boitePrimitive({ dx: 0, dy: v.ombre.dy, w: v.ombre.w, h: v.ombre.h }, e));
  }
  const haut = Math.min(0, ...boites.map((b) => b.minY)) - marge;
  const bas = Math.max(0, ...boites.map((b) => b.maxY)) + marge;
  const large = Math.max(1, ...boites.map((b) => Math.max(-b.minX, b.maxX))) + marge;
  return { haut, bas, large };
}

// Un rendu à l'échelle de rendu `echelle` (3 = le monde à DPR 3), sur `fond`.
// `options` va tel quel à `dessinerVisuel` (orientation, angle, animation,
// teinte…). `voile` (0 à 1) pose le bleu de la nuit PAR-DESSUS, comme le voile
// du jeu : une silhouette de nuit se juge sous lui, pas sur un fond sombre.
export function rendreVisuel(mod, visuel, options, { cadre, echelle = 3, fond = '#2b3138', voile = 0 }) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(2 * cadre.large * echelle));
  c.height = Math.max(1, Math.round((cadre.bas - cadre.haut) * echelle));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.setTransform(echelle, 0, 0, echelle, c.width / 2, -cadre.haut * echelle);
  mod.dessinerVisuel(ctx, visuel, 0, 0, options);
  if (voile > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(8, 12, 30, ${voile})`;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

// Agrandir au plus proche voisin : on voit les pixels du jeu, gros, jamais
// un dessin refait à une taille que personne ne voit.
export function agrandir(source, loupe) {
  const c = document.createElement('canvas');
  c.width = source.width * loupe;
  c.height = source.height * loupe;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

// L'écart entre deux rendus de même taille : le nombre de pixels dont un canal
// s'écarte de plus de `seuil`, l'écart maximal, et une image de l'écart (noir
// = identique). `seuil` 0 : identique au pixel près.
export function ecartRendus(a, b, seuil = 0) {
  if (a.width !== b.width || a.height !== b.height) return { pixels: Infinity, max: 255, image: null };
  const da = a.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, a.width, a.height).data;
  const db = b.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, b.width, b.height).data;
  const image = document.createElement('canvas');
  image.width = a.width;
  image.height = a.height;
  const ictx = image.getContext('2d');
  const sortie = ictx.createImageData(a.width, a.height);
  let pixels = 0;
  let max = 0;
  for (let i = 0; i < da.length; i += 4) {
    const m = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
    if (m > seuil) pixels += 1;
    if (m > max) max = m;
    const g = Math.min(255, m * 4);
    sortie.data[i] = g; sortie.data[i + 1] = g * 0.3; sortie.data[i + 2] = g * 0.3; sortie.data[i + 3] = 255;
  }
  ictx.putImageData(sortie, 0, 0);
  return { pixels, max, image };
}

// Une marche rejouée comme en jeu (`main.js`, la mise à jour du héros) : le
// héros part à l'arrêt, regard `deAngle`, souffle ; puis le geste pointe vers
// `versAngle` pendant `dureeMs`. Rend les états d'affichage échantillonnés
// ({ angle, animation }) — chaque version du code rejoue avec SES modules
// (`orientation`, `poses`), donc un changement du ressort ou du pas se voit.
// Sans ces modules (une référence d'avant la spec 16), rend `null`.
export function rejouerMarche({ orientation, poses }, visuel, { deAngle = 90, versAngle = 180, dureeMs = 600, pasMs = 16, tous = 4, vitessePxS = 95 } = {}) {
  if (!orientation?.avancerAnimationHeros || !orientation?.creerOrientation) return null;
  const rad = (d) => (d * Math.PI) / 180;
  let o = orientation.creerOrientation();
  let a = orientation.creerAnimationHeros();
  const cadence = poses?.cadencePas ? poses.cadencePas(visuel, vitessePxS) : 1;
  const pas = (dx, dy, marche) => {
    o = orientation.avancerOrientation(o, { deltaMs: pasMs, dx, dy });
    a = orientation.avancerAnimationHeros(a, {
      deltaMs: pasMs, dx: marche ? dx : 0, dy: marche ? dy : 0, cadence, angle: o.angle ?? null, inertie: visuel.inertie ?? null,
    });
  };
  // Se tourner vers le départ, geste bref, puis se poser (le ressort s'éteint).
  for (let t = 0; t < 400; t += pasMs) pas(Math.cos(rad(deAngle)), Math.sin(rad(deAngle)), false);
  for (let t = 0; t < 800; t += pasMs) pas(0, 0, false);
  const etats = [];
  let i = 0;
  for (let t = 0; t < dureeMs; t += pasMs, i += 1) {
    pas(Math.cos(rad(versAngle)), Math.sin(rad(versAngle)), true);
    if (i % tous === 0) etats.push({ tMs: t, angle: o.angle, animation: structuredClone(a) });
  }
  return etats;
}

// Une figure : un canvas et sa légende.
export function figure(canvas, legende) {
  const f = document.createElement('figure');
  f.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: legende }));
  return f;
}

// `specs/13` palier C (`D-01`) : le défilement incrémental du calque statique.
//
// Node n'a pas de moteur de rendu : l'image elle-même se compare dans Chrome
// (`tools/scenarios/calque_identique.mjs`, défilé contre complet).
// Ce qui se prouve ici, c'est la CONSTRUCTION : que les cases retenues,
// peintes dans l'ordre du calque puis recouvertes par la recopie, donnent ce
// que donnerait une reconstruction complète — sur un modèle de dessin où
// chaque case peint jusqu'à `rayon` cases autour d'elle, et où l'ordre des
// coups de pinceau compte.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  planDefilement, cellulesARepeindre, cellulesAPeindre, dansFenetre, rayonInfluence, indexerDecor, motifsDesCellules,
} from '../src/defilement.js';
import {
  selectionnerTuilesVisibles, tailleMaxCalque, RESOLUTION_LOGIQUE, dessinerScene, lireCoucheStatique,
  definirDefilementActif, invaliderCoucheStatique,
} from '../src/render.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { chargerScene } from '../src/scene.js';
import { genererDecor, ROTATION_MAX_DEG } from '../src/decor.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- 1. La preuve par le modèle ----------------------------------------------
// Une « image » : pour chaque case, la liste ORDONNÉE des cases qui y ont peint.
// Reconstruction complète d'une fenêtre : toutes ses cases, dans l'ordre du
// calque, chacune peignant dans son voisinage de `rayon`. Défilement : la
// recopie de `copie`, puis, dans les seuls rectangles de `repeindre`, les
// cases de `cellulesAPeindre(nouvelle, sansDessin)` dans le même ordre, puis la
// recopie de `copie` par-dessus.
function peindre(image, fenetre, cellules, rayon, dansDecoupe) {
  for (const { x, y } of cellules) {
    for (let dy = -rayon; dy <= rayon; dy++) {
      for (let dx = -rayon; dx <= rayon; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (!dansFenetre(fenetre, px, py) || !dansDecoupe(px, py)) continue;
        image.get(`${px},${py}`).push(`${x},${y}`);
      }
    }
  }
}
function imageVide(fenetre) {
  const image = new Map();
  for (const { x, y } of cellulesAPeindre(fenetre)) image.set(`${x},${y}`, []);
  return image;
}
function complete(fenetre, rayon) {
  const image = imageVide(fenetre);
  peindre(image, fenetre, cellulesAPeindre(fenetre), rayon, () => true);
  return image;
}
// La procédure de `render.js#defilerCoucheStatique`, pas à pas : peindre
// les cases retenues SANS découpage, puis effacer `copie` et y poser l'ancien
// calque.
function defilee(ancienne, nouvelle, rayon) {
  const plan = planDefilement(ancienne, nouvelle, rayon);
  if (!plan) return null;
  const avant = complete(ancienne, rayon);
  const image = imageVide(nouvelle);
  peindre(image, nouvelle, cellulesAPeindre(nouvelle, plan.sansDessin), rayon, () => true);
  for (const { x, y } of cellulesAPeindre(plan.copie)) image.set(`${x},${y}`, [...avant.get(`${x},${y}`)]);
  return { image, plan };
}

{
  // Graine fixe : le même tirage à chaque exécution.
  let graine = 12345;
  const alea = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };
  const entier = (a, b) => a + Math.floor(alea() * (b - a + 1));
  let essais = 0;
  let defiles = 0;
  for (let i = 0; i < 400; i++) {
    const rayon = entier(0, 2);
    const ancienne = { xDebut: entier(-3, 3), yDebut: entier(-3, 3) };
    ancienne.xFin = ancienne.xDebut + entier(17, 18);
    ancienne.yFin = ancienne.yDebut + entier(11, 12);
    const nouvelle = { xDebut: ancienne.xDebut + entier(-4, 4), yDebut: ancienne.yDebut + entier(-4, 4) };
    nouvelle.xFin = nouvelle.xDebut + entier(17, 18);
    nouvelle.yFin = nouvelle.yDebut + entier(11, 12);
    essais++;
    const resultat = defilee(ancienne, nouvelle, rayon);
    if (!resultat) continue;
    defiles++;
    const attendu = complete(nouvelle, rayon);
    for (const [cle, coups] of attendu) {
      assert.deepEqual(resultat.image.get(cle), coups,
        `case ${cle} : le défilement de ${JSON.stringify(ancienne)} vers ${JSON.stringify(nouvelle)} (rayon ${rayon}) ne donne pas la reconstruction complète`);
    }
    // Les rectangles à repeindre et la copie pavent la nouvelle fenêtre, sans
    // recouvrement : aucune case oubliée, aucune peinte deux fois.
    const couvertes = new Map();
    for (const r of [resultat.plan.copie, ...resultat.plan.repeindre]) {
      for (const { x, y } of cellulesAPeindre(r)) couvertes.set(`${x},${y}`, (couvertes.get(`${x},${y}`) || 0) + 1);
    }
    for (const cle of attendu.keys()) assert.equal(couvertes.get(cle), 1, `case ${cle} couverte une fois et une seule`);
    assert.equal(couvertes.size, attendu.size, 'rien hors de la nouvelle fenêtre');
  }
  assert.ok(defiles > 300, `le tirage doit surtout produire des défilements (${defiles}/${essais})`);
  console.log(`OK défilement = reconstruction complète, ${defiles} défilements sur ${essais} tirages, rayons 0 à 2`);
}

// --- 2. Un saut de caméra reconstruit en entier --------------------------------
{
  const a = { xDebut: 0, yDebut: 0, xFin: 18, yFin: 12 };
  assert.equal(planDefilement(a, { xDebut: 40, yDebut: 0, xFin: 58, yFin: 12 }, 1), null, 'aucune case commune : reconstruction');
  assert.equal(cellulesARepeindre(a, { xDebut: 17, yDebut: 0, xFin: 35, yFin: 12 }, 1), null,
    'une seule colonne commune, rognée par le rayon : plus rien à recopier');
  console.log('OK un saut de caméra reconstruit en entier');
}

// --- 3. La marche repeint une bande, bornée par la vue ----------------------------
{
  const tile = 32;
  const cam = { x: 1000, y: 800 };
  const avant = selectionnerTuilesVisibles(cam, RESOLUTION_LOGIQUE, tile);
  const apres = selectionnerTuilesVisibles({ x: cam.x + 2 * tile, y: cam.y }, RESOLUTION_LOGIQUE, tile);
  const cellules = cellulesARepeindre(avant, apres, 1);
  const toutes = cellulesAPeindre(apres).length;
  assert.ok(cellules.length < toutes / 2, `deux cases de marche vers l'est repeignent ${cellules.length} cases sur ${toutes}`);
  // L'ordre du calque : ligne par ligne, de gauche à droite.
  for (let i = 1; i < cellules.length; i++) {
    const [p, c] = [cellules[i - 1], cellules[i]];
    assert.ok(p.y < c.y || (p.y === c.y && p.x < c.x), 'ordre du calque respecté');
  }
  // Aucune scène n'entre dans le calcul : il ne peut pas dépendre de sa taille.
  assert.equal(planDefilement.length, 3);
  // Toute fenêtre tient dans les canvas du calque, quelle que soit la caméra.
  const max = tailleMaxCalque(RESOLUTION_LOGIQUE, tile);
  for (let i = 0; i < 200; i++) {
    const f = selectionnerTuilesVisibles({ x: i * 7.3, y: i * 3.1 }, RESOLUTION_LOGIQUE, tile);
    assert.ok(f.xFin - f.xDebut <= max.cases && f.yFin - f.yDebut <= max.rangees, 'la fenêtre tient dans le canvas');
  }
  console.log(`OK la marche repeint ${cellules.length}/${toutes} cases, bornées par la vue`);
}

// --- 4. Le rayon d'influence se DÉDUIT des dessins --------------------------------
{
  const tile = 32;
  const carre = (w, h, dy = 0) => ({ id: 'v', primitives: [{ forme: 'rect', w, h, dy, couleur: '#000' }] });
  // Un grain qui tient dans sa case (ancré au milieu du bas) : aucune influence.
  assert.equal(rayonInfluence({ visuelsTuiles: new Map([['t', [carre(20, 20, -12)]]]), tileSize: tile }), 0);
  // Un arbre qui déborde de 10 px sur les côtés : une case.
  assert.equal(rayonInfluence({ visuelsTuiles: new Map([['t', [carre(52, 20, -12)]]]), tileSize: tile }), 1);
  // Qui déborde de 40 px vers le haut : deux cases.
  assert.equal(rayonInfluence({ visuelsTuiles: new Map([['t', [carre(20, 72, -36)]]]), tileSize: tile }), 2);
  // Un motif de décor, même petit, peut être ancré au bord de sa case.
  assert.equal(rayonInfluence({ visuelsTuiles: new Map(), visuelsDecor: [carre(6, 6)], tileSize: tile, rotationDecorMaxDeg: ROTATION_MAX_DEG }), 1);

  // Sur le vrai catalogue : les arbres débordent, le rayon n'est donc pas nul.
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
  const registre = construireRegistre(donnees);
  const table = new Map(registre.tous('tiles').filter((t) => t.render && t.render.visuel)
    .map((t) => [t.id, [t.render.visuel, ...(t.render.visuel_variantes || [])].map((v) => registre.obtenir('visuels', v))]));
  assert.ok(rayonInfluence({ visuelsTuiles: table, tileSize: tile }) >= 1, 'les arbres du catalogue débordent de leur case');
  console.log('OK le rayon d\'influence se déduit des dessins');

  // --- 5. Le décor rangé par case -------------------------------------------------
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  const decor = genererDecor(scene, 10);
  const index = indexerDecor(decor, tile);
  const fenetre = { xDebut: 30, yDebut: 40, xFin: 48, yFin: 52 };
  const lus = motifsDesCellules(index, cellulesAPeindre(fenetre));
  const attendus = decor.filter((m) => dansFenetre(fenetre, Math.floor(m.x / tile), Math.floor(m.y / tile)));
  assert.ok(attendus.length > 0, 'le témoin a du décor dans la fenêtre');
  assert.deepEqual(lus, attendus, 'les mêmes motifs que le filtre de toute la liste, DANS L\'ORDRE de la liste');
  // Dix mille motifs de plus ailleurs sur la carte ne changent rien à ce qui est lu.
  const loin = Array.from({ length: 10000 }, (_, i) => ({ x: (100 + (i % 60)) * tile, y: (5 + (i % 20)) * tile }));
  assert.deepEqual(motifsDesCellules(indexerDecor([...decor, ...loin], tile), cellulesAPeindre(fenetre)), attendus,
    'la lecture ne dépend pas de la longueur du décor');
  console.log(`OK le décor rangé par case : ${lus.length} motifs, dans l'ordre de la liste`);
}

// --- 6. Le branchement dans render.js : la marche défile, le reste reconstruit ----
{
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  const decorBrut = genererDecor(scene, 1).map((d) => ({ ...d, visuel: registre.obtenir('visuels', d.visuel) }));

  const faireCanvas = (largeur = 480, hauteur = 270) => {
    const canvas = { width: largeur, height: hauteur, style: {} };
    const ctx = new Proxy({}, {
      get(_, p) {
        if (p === 'canvas') return canvas;
        if (p === 'measureText') return () => ({ width: 10 });
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        return () => {};
      },
      set: () => true,
    });
    canvas.getContext = () => ctx;
    return canvas;
  };
  const documentAvant = global.document;
  const windowAvant = global.window;
  global.document = { createElement: () => faireCanvas(1, 1) };
  // 1920 × 1080 à DPR 1 : l'échelle entière 4, celle du PC de Xav.
  global.window = { devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080, addEventListener() {}, location: { search: '' } };
  try {
    const ctx = faireCanvas().getContext('2d');
    const heroVisuel = registre.tous('visuels')[0];
    const recalculs = [];
    // Une table STABLE, comme celle que `main.js` passe : le défilement ne recopie
    // que ce qui a été peint avec les mêmes grains.
    const visuelsTuiles = new Map();
    const dessiner = (camera, decor = decorBrut) => dessinerScene(ctx, {
      scene, decor, camera, hero: { x: camera.x + 240, y: camera.y + 135 }, heroVisuel, follet: null,
      estFlagActif: () => false, visuelsTuiles, surRecalculCoucheStatique: (r) => recalculs.push(r),
    });

    invaliderCoucheStatique();
    dessiner({ x: 1000, y: 800 });
    assert.deepEqual(recalculs.map((r) => r.defilement), [false], 'le premier calque est une reconstruction complète');
    // La marche vers l'est, pixel par pixel : chaque sortie de la zone pré-rendue défile.
    for (let x = 1001; x <= 1200; x++) dessiner({ x, y: 800 });
    assert.ok(recalculs.length > 2, 'la marche sort plusieurs fois de la zone pré-rendue');
    assert.ok(recalculs.slice(1).every((r) => r.defilement), 'et chaque fois, elle défile');
    const couche = lireCoucheStatique();
    assert.ok(couche.xDebut * 32 <= 1200 && (couche.xFin * 32) >= 1200 + RESOLUTION_LOGIQUE.largeur,
      'le calque défilé couvre la vue à l\'arrivée');
    assert.equal(couche.yDebut, selectionnerTuilesVisibles({ x: 1000, y: 800 }, RESOLUTION_LOGIQUE, 32).yDebut,
      'une marche vers l\'est ne déplace pas le calque en hauteur');
    // Un saut (portail, respawn) reconstruit.
    recalculs.length = 0;
    dessiner({ x: 3000, y: 2000 });
    assert.deepEqual(recalculs.map((r) => r.defilement), [false], 'un saut de caméra reconstruit en entier');
    // Un autre décor (changement de preset) reconstruit, même en marchant.
    recalculs.length = 0;
    const autreDecor = decorBrut.slice(0, 10);
    for (let x = 3001; x <= 3100; x++) dessiner({ x, y: 2000 }, autreDecor);
    assert.equal(recalculs[0].defilement, false, 'un autre décor ne se recopie jamais');
    // L'instrument de référence : sans défilement, tout reconstruit.
    definirDefilementActif(false);
    recalculs.length = 0;
    for (let x = 3101; x <= 3300; x++) dessiner({ x, y: 2000 }, autreDecor);
    assert.ok(recalculs.length > 1 && recalculs.every((r) => !r.defilement), 'défilement coupé : reconstructions complètes');
    definirDefilementActif(true);
    console.log('OK la marche défile ; saut, autre décor et instrument reconstruisent');
  } finally {
    global.document = documentAvant;
    global.window = windowAvant;
    invaliderCoucheStatique();
  }
}

console.log('OK test_defilement');

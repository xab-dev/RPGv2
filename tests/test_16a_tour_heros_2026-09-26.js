// Spec 16, palier A — le héros montré à TOUT angle, entre ses huit poses clés
// (Xav, 26/09 : « qu'on représente toutes les positions joystick de façon
// fluide »).
//
// Contrats :
// 1. Aux angles des directions, le dessin est EXACTEMENT celui de la
//    direction (les huit poses validées en jeu ne bougent pas).
// 2. Entre elles, rien ne saute : d'un degré au suivant, les points qui
//    disent le regard (la pointe de la capuche, le centre de l'œil) bougent
//    d'une fraction d'unité — sauf au passage exact d'une clé qui n'est pas
//    un reflet vers un segment en reflet (spec 16 §2.2 : `sud`, `nord`).
// 3. Une pièce cachée à une clé s'y efface (opacité entre 0 et 1 entre
//    deux), et glisse de sa `fuite`.
// 4. Les poses mélangées se gardent au degré près ; une `fuite` mal formée
//    est refusée au démarrage.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIENTATIONS } from '../src/orientation.js';
import { dessinerVisuel } from '../src/visuels.js';
import { poseAAngle, poseVisible, poserPoint, definitionPiece } from '../src/poses.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);
const PAS = 360 / ORIENTATIONS.length;

function ordres(options) {
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      return (...args) => {
        appels.push([String(prop), ...args]);
        return String(prop).startsWith('create') ? { addColorStop: (...a) => appels.push(['addColorStop', ...a]) } : undefined;
      };
    },
    set(_, prop, valeur) { appels.push([`=${String(prop)}`, typeof valeur === 'object' ? '[dégradé]' : valeur]); return true; },
  });
  dessinerVisuel(ctx, HEROS, 10, 20, { teinte: '#ff0000', ...options });
  return appels;
}

// --- 1. Les clés ---------------------------------------------------------------------
ORIENTATIONS.forEach((o, i) => {
  assert.deepEqual(ordres({ angle: i * PAS }), ordres({ orientation: o }), `${o} (${i * PAS}°) : le dessin de la direction`);
});
console.log('OK clés : aux huit angles des directions, le dessin validé, ordre pour ordre');

// --- 2. Rien ne saute --------------------------------------------------------------
{
  const CAPUCHE = HEROS.primitives.filter((p) => p.piece === 'capuche');
  const POINTE = CAPUCHE.flatMap((p) => p.points).reduce((a, b) => (b[1] < a[1] ? b : a));
  const IRIS = HEROS.primitives.find((p) => p.piece === 'oeil' && p.teinte);
  const reperes = (degre) => {
    const capuche = poseAAngle(HEROS, degre, 'capuche') ?? {};
    const oeil = poseAAngle(HEROS, degre, 'oeil');
    return [poserPoint(HEROS, 'capuche', capuche, POINTE), oeil ? poserPoint(HEROS, 'oeil', oeil, [IRIS.dx, IRIS.dy]) : null];
  };
  // Les clés non reflétées qui bordent un segment en reflet : là seulement,
  // le saut du reflet.
  const reflete = (d) => !!(HEROS.reflets && HEROS.reflets[d]);
  const passages = new Set();
  ORIENTATIONS.forEach((o, i) => {
    const suivante = ORIENTATIONS[(i + 1) % ORIENTATIONS.length];
    const precedente = ORIENTATIONS[(i + ORIENTATIONS.length - 1) % ORIENTATIONS.length];
    if (!reflete(o) && reflete(suivante)) passages.add(i * PAS);
    if (!reflete(o) && reflete(precedente)) passages.add((i * PAS + 359) % 360);
  });
  const sauts = [];
  for (let d = 0; d < 360; d += 1) {
    const [[ax, ay], oa] = reperes(d);
    const [[bx, by], ob] = reperes((d + 1) % 360);
    const pas = Math.max(Math.hypot(bx - ax, by - ay), oa && ob ? Math.hypot(ob[0] - oa[0], ob[1] - oa[1]) : 0);
    if (pas > 0.35) sauts.push(d);
  }
  assert.ok(sauts.every((d) => passages.has(d)), `des sauts hors des passages du reflet : ${sauts.join(', ')} (permis : ${[...passages].join(', ')})`);
  console.log(`OK continuité : d'un degré au suivant, la pointe et l'œil glissent (sauts seulement au reflet : ${sauts.join(', ') || 'aucun'})`);
}

// --- 3. Paraître, s'effacer --------------------------------------------------------
{
  const cachees = ORIENTATIONS.filter((o) => poseVisible(HEROS, o, 'oeil') === null);
  assert.ok(cachees.length > 0, 'l\'œil est caché de dos');
  for (const o of cachees) {
    const i = ORIENTATIONS.indexOf(o);
    for (const voisine of [i - 1, i + 1]) {
      const v = ORIENTATIONS[(voisine + ORIENTATIONS.length) % ORIENTATIONS.length];
      if (poseVisible(HEROS, v, 'oeil') === null) continue;
      const milieu = ((i + voisine) * PAS) / 2;
      const pose = poseAAngle(HEROS, milieu, 'oeil');
      assert.ok(pose && pose.alpha > 0 && pose.alpha < 1, `${milieu}° (entre ${o} et ${v}) : l'œil à moitié effacé (${pose && pose.alpha})`);
      const fuite = definitionPiece(HEROS, 'oeil').fuite ?? 0;
      const sansFuite = (poseVisible(HEROS, v, 'oeil') || {}).dx ?? 0;
      if (fuite > 0 && sansFuite !== 0 && !HEROS.reflets[v]) {
        assert.ok(Math.abs(pose.dx) > Math.abs(sansFuite), `${milieu}° : l'œil glisse vers le bord en s'effaçant`);
      }
    }
  }
  console.log('OK fondus : l\'œil s\'efface entre une vue qui le montre et une qui le cache, en glissant vers le bord');
}

// --- 4. Le cache, le démarrage -------------------------------------------------------
{
  assert.equal(poseAAngle(HEROS, 123.2, 'capuche'), poseAAngle(HEROS, 123, 'capuche'), 'au degré près, la même pose (gardée)');
  const copie = structuredClone(donnees);
  copie.visuels.find((v) => v.id === VISUEL_HEROS_ID).pieces.oeil.fuite = -1;
  assert.ok(validerCatalogues(copie).some((e) => e.includes('pieces > oeil')), 'une fuite négative, refusée');
  console.log('OK cache et démarrage');
}

console.log('OK test_16a_tour_heros');

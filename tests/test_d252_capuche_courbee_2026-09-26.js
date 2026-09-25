// `D-252` — la capuche du héros de profil et de trois quarts : son sommet
// reste sur l'axe du héros, seule la pointe dit où il regarde (Xav, 26/09 :
// « le sommet de la capuche devrait être à cet endroit (pas le sommet du
// visage), et à partir de ce point de repère on peut donner à la capuche son
// sens de direction juste en orientant la pointe »).
//
// Contrats :
// 1. `visuels.js#courberPoints` : sous la ligne `pivot_y`, aucun point ne
//    bouge ; un point de l'axe à `longueur` au-dessus du pivot tourne de
//    `courbure` degrés autour du pivot, vers l'est si la courbure est
//    positive ; l'origine de la primitive est prise en compte.
// 2. Données : toute direction qui plie la capuche garde son sommet (le point
//    le plus haut, pose appliquée) plus près de l'axe que sa pointe — c'est
//    la plainte de Xav (le cisaillement emportait le sommet avec la pointe).
// 3. Dessin : une pose pliée dessine deux fois exactement la même chose (les
//    points pliés se gardent, ils ne se refont pas au hasard d'une frame).
// 4. Démarrage : une courbure sans longueur, une longueur nulle, refusées.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIENTATIONS, poseDePiece } from '../src/orientation.js';
import { dessinerVisuel, courberPoints } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg} (${a} ≠ ${b})`);

// --- 1. La fonction pure -------------------------------------------------------------
{
  const pose = { courbure: 90, longueur: 4, pivot_y: 0 };
  const carre = [[-2, 3], [2, 3], [2, 1], [-2, 1]];
  const plie = courberPoints(carre, pose);
  for (const [x, y] of carre) {
    assert.ok(plie.some(([a, b]) => a === x && b === y), `(${x}, ${y}), sous le pivot, ne bouge pas`);
  }
  const [[x, y]] = courberPoints([[0, -4]], pose);
  proche(x, 4, 'à la longueur, un quart de tour vers l\'est : x');
  proche(y, 0, 'à la longueur, un quart de tour vers l\'est : y');
  const [[xo]] = courberPoints([[0, -4]], { ...pose, courbure: -90 });
  proche(xo, -4, 'une courbure négative plie vers l\'ouest');
  const [[xd, yd]] = courberPoints([[0, -2]], pose, 0, -2);
  proche(xd, 4, 'l\'origine de la primitive compte : x');
  proche(yd, 2, 'l\'origine de la primitive compte : y (repère de la primitive)');
  console.log('OK courberPoints : le bas posé, la pointe tournée autour du pivot');
}

// --- 2. Les données -----------------------------------------------------------------
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);
const CAPUCHE = HEROS.primitives.filter((p) => p.piece === 'capuche');
const plusHaut = (points) => points.reduce((a, b) => (b[1] < a[1] ? b : a));
const POINTE = plusHaut(CAPUCHE.flatMap((p) => p.points));
{
  // La pose entière appliquée à un point : le pli, puis le reste de la pose
  // (celui de `dessinerVisuel`, dans le même ordre).
  const poser = (pose, [x0, y0]) => {
    const [x, y] = pose.courbure ? courberPoints([[x0, y0]], pose)[0] : [x0, y0];
    return [(pose.dx ?? 0) + x * (pose.echelle_x ?? 1) + (pose.cisaillement ?? 0) * (y - (pose.pivot_y ?? 0)), y + (pose.dy ?? 0)];
  };
  const pliees = ORIENTATIONS.filter((d) => (poseDePiece(HEROS, d, 'capuche') || {}).courbure);
  assert.ok(pliees.length > 0, 'au moins une direction plie la capuche');
  for (const d of pliees) {
    const pose = poseDePiece(HEROS, d, 'capuche');
    const sommet = plusHaut(CAPUCHE.flatMap((p) => courberPoints(p.points, pose, p.dx || 0, p.dy || 0)).map((pt) => poser({ ...pose, courbure: 0 }, pt)));
    const [xPointe] = poser(pose, POINTE);
    assert.ok(Math.abs(sommet[0]) < Math.abs(xPointe), `${d} : le sommet (x = ${sommet[0].toFixed(2)}) plus près de l'axe que la pointe (x = ${xPointe.toFixed(2)})`);
  }
  console.log(`OK données : ${pliees.join(', ')} — le sommet sur l'axe, la pointe à l'écart`);
}

// --- 3. Le dessin -------------------------------------------------------------------
function ordres(options) {
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) { return (...args) => appels.push([String(prop), ...args]); },
    set(_, prop, valeur) { appels.push([`=${String(prop)}`, valeur]); return true; },
  });
  dessinerVisuel(ctx, HEROS, 10, 20, options);
  return appels;
}
{
  const pliee = ORIENTATIONS.find((d) => (poseDePiece(HEROS, d, 'capuche') || {}).courbure);
  const une = ordres({ orientation: pliee });
  assert.deepEqual(ordres({ orientation: pliee }), une, 'deux frames, le même dessin');
  const lignes = (a) => a.filter((x) => x[0] === 'lineTo').length;
  assert.ok(lignes(une) > lignes(ordres({})), 'le pli arrondit : plus de segments que la capuche de face');
  console.log('OK dessin : la capuche pliée, stable d\'une frame à l\'autre');
}

// --- 4. Le démarrage --------------------------------------------------------------
{
  const erreursAvec = (modif) => {
    const copie = structuredClone(donnees);
    modif(copie.visuels.find((v) => v.id === VISUEL_HEROS_ID));
    return validerCatalogues(copie);
  };
  assert.ok(erreursAvec((v) => { v.orientations.est.capuche = { courbure: 30 }; }).some((e) => e.includes('une courbure demande sa longueur')));
  assert.ok(erreursAvec((v) => { v.orientations.est.capuche = { courbure: 30, longueur: 0 }; }).some((e) => e.includes('orientations > est > capuche')));
  assert.ok(erreursAvec((v) => { v.orientations.est.capuche = { courbure: 'forte', longueur: 5 }; }).some((e) => e.includes('orientations > est > capuche')));
  console.log('OK démarrage : une courbure mal déclarée refusée');
}

console.log('OK test_d252_capuche_courbee');

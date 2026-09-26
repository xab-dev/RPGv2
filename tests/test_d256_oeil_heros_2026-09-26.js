// `D-256` — l'œil du héros, un globe (Xav, 26/09, d'après Wheatley : « que
// l'œil prenne tout l'espace et ressemble vraiment à un globe oculaire »,
// jamais « qu'il s'aplatisse en ovale »).
//
// Contrats :
// 1. La couleur du follet atteint les dégradés : un palier `teinte: true`
//    prend la teinte passée au dessin (le halo de l'œil), les autres gardent
//    la leur.
// 2. Un globe ne s'aplatit pas : aucune direction qui montre le visage ne le
//    resserre à l'horizontale (`echelle_x`) ; il rapetisse d'un bloc
//    (`echelle`), et la pose l'applique dans les deux sens.
// 3. Démarrage : un palier teinté sur un visuel non teintable, refusé.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIENTATIONS, poseDePiece } from '../src/orientation.js';
import { dessinerVisuel } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);

// Un faux contexte qui note les paliers des dégradés et les mises à
// l'échelle.
function trace(visuel, options) {
  const paliers = [];
  const echelles = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'scale') return (x, y) => echelles.push([x, y]);
      return () => ({ addColorStop: (offset, couleur) => paliers.push(couleur) });
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, visuel, 0, 0, options);
  return { paliers, echelles };
}

// --- 1. La teinte dans les dégradés -------------------------------------------
{
  // (le halo est sur la façade de la capuche depuis `D-257` : on le cherche
  // sur tout le héros)
  const teintes = HEROS.primitives.filter((p) => p.degrade && p.degrade.stops.some((s) => s.teinte));
  assert.ok(teintes.length > 0, 'le héros a un dégradé qui suit le follet (le halo)');
  const { paliers } = trace(HEROS, { orientation: 'sud', teinte: '#00ff00' });
  assert.ok(paliers.some((c) => c.startsWith('rgba(0, 255, 0,')), 'un palier teinté prend la couleur du follet');
  const { paliers: sansTeinte } = trace(HEROS, { orientation: 'sud' });
  assert.ok(!sansTeinte.some((c) => c.startsWith('rgba(0, 255, 0,')), 'sans teinte, sa propre couleur');
  assert.ok(paliers.some((c) => c.startsWith('rgba(0, 0, 0,')), 'un palier non teinté garde la sienne (l\'ombre du globe)');
  console.log('OK teinte : le halo suit le follet, l\'ombre du globe reste noire');
}

// --- 2. Le globe reste rond ------------------------------------------------------
{
  const avecVisage = ORIENTATIONS.filter((d) => poseDePiece(HEROS, d, 'visage') !== null);
  assert.ok(avecVisage.length > 1);
  for (const d of avecVisage) {
    const pose = poseDePiece(HEROS, d, 'visage') || {};
    assert.ok(pose.echelle_x === undefined || pose.echelle_x === 1, `${d} : le globe n'est pas resserré à l'horizontale`);
  }
  const reduite = avecVisage.find((d) => (poseDePiece(HEROS, d, 'visage') || {}).echelle !== undefined);
  assert.ok(reduite, 'une direction rapetisse le globe d\'un bloc');
  const e = poseDePiece(HEROS, reduite, 'visage').echelle;
  const { echelles } = trace(HEROS, { orientation: reduite });
  assert.ok(echelles.some(([x, y]) => x === e && y === e), `${reduite} : l'échelle s'applique dans les deux sens`);
  console.log(`OK globe : rond dans ${avecVisage.length} directions, rapetissé d'un bloc de côté`);
}

// --- 3. Le démarrage ------------------------------------------------------------
{
  const copie = structuredClone(donnees);
  const plume = copie.visuels.find((v) => !v.teintable && v.primitives.length > 0);
  plume.primitives.push({ forme: 'degrade_radial', dx: 0, dy: 0, w: 2, h: 2, degrade: { stops: [
    { offset: 0, couleur: '#ffffff', teinte: true }, { offset: 1, couleur: '#ffffff', alpha: 0 },
  ] } });
  assert.ok(validerCatalogues(copie).some((e) => e.includes('un palier teinte:true nécessite')));
  console.log('OK démarrage : un palier teinté sur un visuel non teintable, refusé');
}

// --- 4. `D-257` : devant, derrière -------------------------------------------------
// Xav : « définir ce qui est devant et ce qui est derrière, comme on l'a fait
// avec l'arbre ». Dans le visuel, l'ordre des primitives est la profondeur :
// la cavité (le dedans de la capuche) avant le globe, la façade percée après.
{
  const rang = (piece, dernier = false) => {
    const rangs = HEROS.primitives.map((p, i) => (p.piece === piece ? i : -1)).filter((i) => i >= 0);
    return dernier ? Math.max(...rangs) : Math.min(...rangs);
  };
  assert.ok(rang('cavite', true) < rang('visage'), 'la cavité est derrière le globe');
  assert.ok(rang('facade') > rang('visage', true), 'la façade est devant le globe');
  assert.ok(rang('halo') > rang('facade', true), 'le halo éclaire la lèvre de la façade, devant elle');
  const facade = HEROS.primitives.find((p) => p.piece === 'facade' && p.trou);
  assert.ok(facade, 'la façade est percée');
  assert.ok(facade.trou.w > facade.trou.h, 'l\'ouverture est plus large que haute');
  for (const d of ORIENTATIONS) {
    assert.equal(poseDePiece(HEROS, d, 'facade') === null, poseDePiece(HEROS, d, 'cavite') === null, `${d} : façade et cavité paraissent ensemble`);
    // Le halo (sa propre pièce depuis le polish : il rapetisse de profil pour
    // ne pas sortir de la silhouette) paraît avec elles.
    assert.equal(poseDePiece(HEROS, d, 'halo') === null, poseDePiece(HEROS, d, 'facade') === null, `${d} : le halo paraît avec la façade`);
    // Xav : « il faut garder la même proportion que face » — de côté,
    // l'ouverture rapetisse, glisse et s'incline, jamais ne s'écrase.
    const pose = poseDePiece(HEROS, d, 'facade') || {};
    assert.ok(pose.echelle_x === undefined, `${d} : l'ouverture garde les proportions de face`);
  }
  const inclinee = ORIENTATIONS.find((d) => (poseDePiece(HEROS, d, 'facade') || {}).rotation);
  assert.ok(inclinee, 'de côté, l\'ouverture s\'incline');
  const tours = [];
  const tracant = new Proxy({}, {
    get(_, prop) {
      if (prop === 'rotate') return (a) => tours.push(a);
      return () => ({ addColorStop() {} });
    },
    set() { return true; },
  });
  dessinerVisuel(tracant, HEROS, 0, 0, { orientation: inclinee });
  const attendu = (poseDePiece(HEROS, inclinee, 'facade').rotation * Math.PI) / 180;
  assert.ok(tours.some((a) => Math.abs(a - attendu) < 1e-12), `${inclinee} : la rotation de pose s'applique`);

  // Le dessin d'un trou et d'un dégradé elliptique.
  const appels = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      return (...args) => {
        appels.push([String(prop), ...args]);
        return String(prop).startsWith('create') ? { addColorStop() {} } : undefined;
      };
    },
    set() { return true; },
  });
  const anneau = { id: 'visuel_anneau', ancre: 'centre', primitives: [{
    forme: 'degrade_radial', dx: 0, dy: 0, w: 8, h: 4, trou: { w: 4, h: 2 },
    degrade: { direction: 'elliptique', stops: [{ offset: 0, couleur: '#000000' }, { offset: 1, couleur: '#ffffff' }] },
  }] };
  dessinerVisuel(ctx, anneau, 0, 0);
  assert.ok(appels.some((a) => a[0] === 'fill' && a[1] === 'evenodd'), 'un trou se remplit pair-impair : il perce la forme');
  assert.equal(appels.filter((a) => a[0] === 'ellipse').length, 2, 'la forme et son trou');
  assert.ok(appels.some((a) => a[0] === 'scale' && a[1] === 1 && a[2] === 0.5), 'elliptique : le repère écrasé à la hauteur');
  const [, , , , , , rayon] = appels.find((a) => a[0] === 'createRadialGradient');
  assert.equal(rayon, 4, 'elliptique : le dégradé est un cercle de la largeur, dans le repère écrasé');

  const copie = structuredClone(donnees);
  copie.visuels.find((v) => v.id === VISUEL_HEROS_ID).primitives.find((p) => p.trou).trou = { w: 40, h: 1 };
  assert.ok(validerCatalogues(copie).some((e) => e.includes('trou doit être')), 'un trou plus grand que sa forme, refusé');
  console.log('OK devant / derrière : la cavité derrière le globe, la façade percée devant, l\'ouverture plus large que haute');
}

console.log('OK test_d256_oeil_heros');

// `D-263` et suivants — le polish du héros (nuit du 26/09, Xav : « il faut
// vraiment qu'il soit parfait, avec les fondus entre les parties du corps,
// les ombrages, la lumière, les reflets de l'œil »).
//
// Contrats (le moteur ; les valeurs d'auteur ne sont jamais épinglées) :
// 1. `D-263` : un dégradé déclare son `centre` dans le repère de sa
//    primitive — le canvas le reçoit tel quel, pour toutes les directions de
//    dégradé ; sans `centre`, il reste à l'origine. Un centre mal formé est
//    refusé au démarrage.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dessinerVisuel } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);

// Un faux contexte qui note les dégradés créés.
function degrades(visuel, options = {}) {
  const crees = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (String(prop).startsWith('create')) return (...args) => { crees.push([String(prop), ...args]); return { addColorStop() {} }; };
      return () => {};
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, visuel, 0, 0, options);
  return crees;
}
const stops = [{ offset: 0, couleur: '#000000' }, { offset: 1, couleur: '#ffffff' }];
const unePrimitive = (degrade, forme = 'rect') => ({ id: 'visuel_temoin', ancre: 'centre', primitives: [
  { forme, dx: 0, dy: 0, w: 4, h: 2, degrade: { ...degrade, stops } },
] });

// --- 1. Le centre d'un dégradé ------------------------------------------------------
{
  const centre = [1.5, -0.5];
  assert.deepEqual(degrades(unePrimitive({ direction: 'radial', centre }))[0], ['createRadialGradient', 1.5, -0.5, 0, 1.5, -0.5, 2]);
  assert.deepEqual(degrades(unePrimitive({ direction: 'vertical', centre }))[0], ['createLinearGradient', 1.5, -1.5, 1.5, 0.5]);
  assert.deepEqual(degrades(unePrimitive({ direction: 'horizontal', centre }))[0], ['createLinearGradient', -0.5, -0.5, 3.5, -0.5]);
  assert.deepEqual(degrades(unePrimitive({ direction: 'radial' }))[0], ['createRadialGradient', 0, 0, 0, 0, 0, 2], 'sans centre, l\'origine');
  const copie = structuredClone(donnees);
  const heros = copie.visuels.find((v) => v.id === VISUEL_HEROS_ID);
  heros.primitives.find((p) => p.degrade).degrade.centre = [1];
  assert.ok(validerCatalogues(copie).some((e) => e.includes('degrade.centre doit être [x, y]')), 'un centre mal formé, refusé');
  console.log('OK centre : le dégradé se décale dans le repère de sa primitive');
}

// --- 2. `D-264` : la lumière ne se reflète pas, même en dégradé ----------------------
// Une pièce miroir dessinée en reflet : le canvas est retourné, donc le
// dégradé reçoit un centre de l'autre côté (à l'écran, il reste où il était),
// et un dégradé horizontal s'inverse. Sans reflet, rien ne change.
{
  const temoin = (degrade, forme = 'rect') => ({
    id: 'visuel_temoin', ancre: 'centre',
    pieces: { p: { miroir: true } },
    orientations: { ouest: { p: {} } },
    reflets: { est: 'ouest' },
    primitives: [{ forme, dx: 0, dy: 0, w: 4, h: 2, piece: 'p', degrade: { ...degrade, stops } }],
  });
  const paliers = (visuel, orientation) => {
    const notes = [];
    const ctx = new Proxy({}, {
      get(_, prop) {
        if (String(prop).startsWith('create')) return (...a) => { notes.push(['cree', ...a]); return { addColorStop: (o, c) => notes.push([o, c]) }; };
        return () => {};
      },
      set() { return true; },
    });
    dessinerVisuel(ctx, visuel, 0, 0, { orientation });
    return notes;
  };
  const radial = temoin({ direction: 'radial', centre: [-1, -0.5] });
  assert.deepEqual(paliers(radial, 'ouest')[0], ['cree', -1, -0.5, 0, -1, -0.5, 2], 'sans reflet, le centre d\'auteur');
  assert.deepEqual(paliers(radial, 'est')[0], ['cree', 1, -0.5, 0, 1, -0.5, 2], 'en reflet, le centre de l\'autre côté');
  const horizontal = paliers(temoin({ direction: 'horizontal' }), 'est');
  assert.deepEqual(horizontal.slice(1), [[0, 'rgba(255, 255, 255, 1)'], [1, 'rgba(0, 0, 0, 1)']], 'en reflet, un dégradé horizontal s\'inverse');
  const rond = paliers(temoin({}, 'degrade_radial'), 'est');
  assert.deepEqual(rond.slice(1), [[0, 'rgba(0, 0, 0, 1)'], [1, 'rgba(255, 255, 255, 1)']], 'un dégradé rond ne s\'inverse pas');
  console.log('OK reflet : la lumière d\'un dégradé reste du même côté de l\'écran');
}

console.log('OK test_d263_polish_heros');

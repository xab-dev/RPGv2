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

console.log('OK test_d263_polish_heros');

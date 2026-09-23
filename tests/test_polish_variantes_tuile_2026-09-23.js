// Polish ambiance (23/09) — une case de tuile choisit SON dessin parmi ceux
// que sa tuile déclare (`render.visuel` puis `render.visuel_variantes`), et
// peut être retournée en miroir horizontal (`render.miroir`).
//
// Ce qui se tient : le tirage est une fonction de la POSITION (même case, même
// dessin, dans n'importe quel ordre de reconstruction du calque) ; toutes les
// variantes et les deux sens sortent sur une vraie scène ; le miroir n'existe
// que si la tuile le déclare ; la variante ne suit pas la couleur (sinon toutes
// les cases claires porteraient le même dessin, et la période se reverrait) ;
// le dessin retourné l'est autour de son ancre. Aucune valeur épinglée.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { couleurTuile, varianteTuile } from '../src/decor.js';
import { chargerScene } from '../src/scene.js';
import { dessinerVisuel } from '../src/visuels.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const scene = chargerScene(construireRegistre(donnees), 'scene_maison_exterieur');

// --- 1. Une fonction de la position, rien d'autre ------------------------
{
  const a = varianteTuile(scene, 40, 60, 3, true);
  varianteTuile(scene, 1, 1, 3, true); // un autre tirage entre-temps ne change rien
  assert.deepEqual(varianteTuile(scene, 40, 60, 3, true), a, 'même case, même dessin');
  for (let x = 0; x < 50; x++) {
    assert.equal(varianteTuile(scene, x, 7, 1, false).index, 0, 'une seule entrée : toujours elle');
    assert.equal(varianteTuile(scene, x, 7, 3, false).miroir, false, 'pas de miroir sans le déclarer');
  }
}

// --- 2. Sur la vraie Maison, tout sort, et pas au rythme de la couleur ---
for (const tuile of donnees.tiles.filter((t) => t.render && (t.render.visuel_variantes || t.render.miroir))) {
  const n = 1 + (tuile.render.visuel_variantes || []).length;
  const indices = new Map();
  const sens = new Set();
  const parCouleur = new Map(); // couleur -> ensemble des dessins tirés avec elle
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      if (scene.tuileA(x, y).id !== tuile.id) continue;
      const { index, miroir } = varianteTuile(scene, x, y, n, tuile.render.miroir);
      indices.set(index, (indices.get(index) || 0) + 1);
      sens.add(miroir);
      const c = couleurTuile(scene, x, y);
      if (!parCouleur.has(c)) parCouleur.set(c, new Set());
      parCouleur.get(c).add(`${index}/${miroir}`);
    }
  }
  const total = [...indices.values()].reduce((s, v) => s + v, 0);
  if (total < 30) continue; // trop peu de cases pour juger une répartition
  assert.equal(indices.size, n, `${tuile.id} : une variante ne sort jamais`);
  for (const [i, c] of indices) assert.ok(c > total / (n * 3), `${tuile.id} : la variante ${i} ne sort presque jamais (${c}/${total})`);
  if (tuile.render.miroir) assert.equal(sens.size, 2, `${tuile.id} : le miroir ne sort jamais (ou toujours)`);
  const combinaisons = n * (tuile.render.miroir ? 2 : 1);
  const liees = [...parCouleur.values()].filter((s) => s.size === 1).length;
  assert.ok(combinaisons === 1 || liees < parCouleur.size, `${tuile.id} : chaque couleur tire toujours le même dessin`);
  console.log(`OK ${tuile.id} : ${n} dessin(s)${tuile.render.miroir ? ' × miroir' : ''} sur ${total} cases`);
}

// --- 3. Le miroir retourne autour de l'ancre ------------------------------
{
  const appels = [];
  const ctx = new Proxy({}, {
    get: (_, nom) => (nom === 'globalAlpha' ? 1 : (...args) => appels.push([nom, ...args])),
    set: () => true,
  });
  const visuel = { id: 'v', primitives: [{ forme: 'rect', dx: 3, dy: -2, w: 2, h: 2, couleur: '#000000' }] };
  dessinerVisuel(ctx, visuel, 10, 20, { miroir: true });
  const i = appels.findIndex(([n]) => n === 'translate');
  assert.deepEqual(appels[i], ['translate', 10, 20], 'ancre posée d\'abord');
  assert.ok(appels.slice(i + 1).some(([n, sx, sy]) => n === 'scale' && sx === -1 && sy === 1), 'puis retournée horizontalement');
  appels.length = 0;
  dessinerVisuel(ctx, visuel, 10, 20, {});
  assert.ok(!appels.some(([n, sx]) => n === 'scale' && sx === -1), 'sans miroir, aucun retournement');
}

console.log('--- polish : une case, son dessin ; la période ne se lit plus.');

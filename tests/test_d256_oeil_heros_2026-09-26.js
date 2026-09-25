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
  const teintes = HEROS.primitives.filter((p) => p.piece === 'visage' && p.degrade && p.degrade.stops.some((s) => s.teinte));
  assert.ok(teintes.length > 0, 'le visage a un dégradé qui suit le follet (le halo)');
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

console.log('OK test_d256_oeil_heros');

// `specs/15` palier E (`D-198`) : la flamme vivante suit le levier
// `ornements`, comme la plume (`D-191`) et les menus (`D-193`). Bas : fixe.
// Moyen : la lumière vacille. Haut : en plus, des braises montent. Le dessin
// revient à Xav ; ce qui se tient ici est le contrat par réglage, et que le
// vacillement reste un facteur autour de 1 (jamais une lumière éteinte).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { ornementActif, facteurRespiration, particulesFilet } from '../src/ornements.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const effet = (id) => donnees.effets.find((e) => e.id === id);
const vacille = effet('effet_flamme_vacille');
const braises = effet('effet_flamme_braises');

const actifs = (niveau) => [ornementActif(vacille, niveau), ornementActif(braises, niveau)].map(Boolean);
assert.deepEqual(actifs(0), [false, false], 'Bas : la flamme est fixe');
assert.deepEqual(actifs(1), [true, false], 'Moyen : elle vacille');
assert.deepEqual(actifs(2), [true, true], 'Haut : elle vacille, et les braises montent');

for (let t = 0; t < 5000; t += 37) {
  const f = facteurRespiration(vacille, t);
  assert.ok(f > 0.5 && f < 1.5, 'le vacillement reste un facteur autour de 1');
}
assert.equal(particulesFilet(braises, 1000, 0, 0).length, braises.nb_particules);
assert.ok(donnees.visuels.some((v) => v.id === braises.visuel), 'la braise est un visuel du catalogue');
console.log('OK Bas fixe, Moyen vacille, Haut vacille + braises ; le vacillement ne s’éteint jamais');
console.log('OK test_15e_torche_flamme');

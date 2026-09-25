// `D-219` (né de SD_torche, 25/09) : aucun effet du catalogue ne bat plus
// vite que `FREQUENCE_MAX_HZ`, le seuil des recommandations sur l'épilepsie
// photosensible. Le test lit le vrai catalogue : ajouter un effet trop rapide,
// ou d'un type qui n'a pas dit s'il clignote, le fait échouer. Il n'épingle
// aucune période : il vérifie un plafond. Ce que le plafond ne voit pas (un
// bug qui ferait défiler une phase, comme `D-218`), le test de la flamme le
// tient, et le reste revient à Xav en jeu.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { FREQUENCE_MAX_HZ, rythmeLumineuxHz, facteurVacillement } from '../src/ornements.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);

for (const effet of donnees.effets) {
  const hz = rythmeLumineuxHz(effet);
  assert.notEqual(hz, undefined, `${effet.id} : le type « ${effet.type} » doit dire s'il clignote (ornements.js)`);
  assert.ok(Number.isFinite(hz) && hz >= 0, `${effet.id} : un rythme lisible`);
  assert.ok(hz <= FREQUENCE_MAX_HZ, `${effet.id} bat à ${hz.toFixed(2)} Hz, au-dessus de ${FREQUENCE_MAX_HZ} Hz`);
}
console.log(`OK les ${donnees.effets.length} effets du catalogue battent à ${FREQUENCE_MAX_HZ} Hz au plus`);

// Le comptage du vacillement est honnête : on compte les maximums du facteur
// sur 10 s, et il n'en fait pas plus que le rythme annoncé.
const vacille = donnees.effets.find((e) => e.id === 'effet_flamme_vacille');
let maximums = 0;
let avant = facteurVacillement(vacille, -2, 0);
let courant = facteurVacillement(vacille, -1, 0);
for (let t = 0; t <= 10000; t++) {
  const apres = facteurVacillement(vacille, t, 0);
  if (courant > avant && courant >= apres) maximums++;
  avant = courant;
  courant = apres;
}
assert.ok(maximums <= Math.ceil(rythmeLumineuxHz(vacille) * 10) + 1,
  `le vacillement fait ${maximums} pics en 10 s, plus que son rythme annoncé`);
console.log(`OK le vacillement fait ${maximums} pics en 10 s`);
console.log('OK test_effets_sous_3hz');

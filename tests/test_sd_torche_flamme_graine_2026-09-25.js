// `D-218` (SD_torche, 25/09) : la torche TENUE clignotait en marchant, en
// Moyen et en Haut. Sa graine — ce qui décale son vacillement et ses braises
// de ceux des autres flammes — était tirée de la position du héros : elle
// défilait sous les pas, et la flamme battait entre 3 et 15 Hz au lieu de
// respirer. Le contrat tenu ici : le rythme d'une flamme ne dépend que du
// temps et de QUI elle est, jamais de l'endroit où on la porte. Le dessin
// revient à Xav.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { facteurVacillement, particulesFilet } from '../src/ornements.js';
import { flammesAffichees, grainePosition } from '../src/combustion.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const effet = (id) => donnees.effets.find((e) => e.id === id);
const vacille = effet('effet_flamme_vacille');
const braises = effet('effet_flamme_braises');
const lumiere = donnees.items.find((i) => i.combustion).combustion.lumiere;

// 1. La flamme tenue : le héros marche deux secondes dans chaque direction, à
// 100 px/s et 60 images/s. Son vacillement et ses braises doivent être, image
// par image, ceux d'une torche tenue par un héros immobile.
const PAS_MS = 1000 / 60;
const VITESSE_PX_MS = 0.1;
for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [Math.SQRT1_2, Math.SQRT1_2]]) {
  for (let i = 0; i < 120; i++) {
    const t = i * PAS_MS;
    const enMarche = flammesAffichees({ x: 400 + dx * VITESSE_PX_MS * t, y: 300 + dy * VITESSE_PX_MS * t, lumiere }, []);
    const immobile = flammesAffichees({ x: 400, y: 300, lumiere }, []);
    assert.equal(enMarche[0].graine, immobile[0].graine, 'la graine de la flamme tenue ne suit pas le héros');
    assert.equal(
      facteurVacillement(vacille, t, enMarche[0].graine),
      facteurVacillement(vacille, t, immobile[0].graine),
      `le vacillement en marchant (${dx}, ${dy}) est celui de l'arrêt`,
    );
    const ages = (f) => particulesFilet(braises, t, 0, 0, f.graine).map((p) => p.alpha);
    assert.deepEqual(ages(enMarche[0]), ages(immobile[0]), 'les braises ne sautent pas sous les pas');
  }
}
console.log('OK la flamme tenue vacille et fume au même rythme, qu’on marche ou non');

// 2. Les flammes plantées : une graine dans [0, 1[, la même à chaque image pour
// la même torche, et deux torches voisines décalées l'une de l'autre.
for (const [x, y] of [[0, 0], [16.5, 48], [-24, 7], [1234.5, 987.25]]) {
  const g = grainePosition(x, y);
  assert.ok(g >= 0 && g < 1, `graine dans [0, 1[ en (${x}, ${y})`);
  assert.equal(grainePosition(x, y), g);
}
assert.notEqual(grainePosition(200, 200), grainePosition(232, 200), 'deux torches voisines ne battent pas ensemble');

// 3. Une seule liste : la tenue d'abord, les plantées qui brûlent ensuite,
// les éteintes jamais (elles n'ont pas de flamme).
const liste = flammesAffichees({ x: 10, y: 10, lumiere }, [
  { x: 100, y: 100, lumiere },
  { x: 200, y: 200, lumiere: null },
  { x: 300, y: 300, lumiere },
]);
assert.deepEqual(liste.map((f) => [f.x, f.y]), [[10, 10], [100, 100], [300, 300]]);
assert.deepEqual(flammesAffichees(null, [{ x: 1, y: 1, lumiere: null }]), []);
console.log('OK les plantées gardent leur graine, une liste pour la lumière et les braises');

// 4. Bas : sans l'effet, le facteur vaut 1 exactement.
assert.equal(facteurVacillement(null, 1234, 0.5), 1);
console.log('OK test_sd_torche_flamme_graine');

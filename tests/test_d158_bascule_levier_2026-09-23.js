// `D-158` — le geste d'un levier (`src/bascule.js`), et les données qui le
// portent. La capture ne voit pas le milieu d'un geste de 180 ms (latence du
// pilotage) : c'est ici que la chronologie se prouve.
//
// Contrats :
// 1. Un levier affiché pour la première fois est POSÉ (aucun geste rejoué au
//    chargement d'une partie où il est déjà allumé).
// 2. Allumer : le voyant ne s'allume qu'à la butée, le halo ne monte
//    qu'ensuite, et finit à pleine intensité.
// 3. Un changement de cible en plein geste repart du point atteint : le
//    manche ne saute jamais.
// 4. Données : tout levier a une pièce qui bascule, qui existe ; et au moins
//    une pièce teintée (le voyant se lit AUSSI à la couleur).
// Les durées sont lues dans le module, jamais épinglées (`D-52`).
import assert from 'node:assert/strict';
import {
  avancerBascule, positionBascule, voyantAllume, fonduHalo, DUREE_BASCULE_MS, DUREE_FONDU_HALO_MS,
} from '../src/bascule.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';

// 1
for (const allume of [false, true]) {
  const e = avancerBascule(null, allume, 16);
  assert.equal(positionBascule(e), allume ? 1 : 0, 'posé à sa butée');
  assert.equal(voyantAllume(e), allume);
  assert.equal(fonduHalo(e), allume ? 1 : 0, 'halo déjà monté (ou éteint) au chargement');
  assert.equal(avancerBascule(e, allume, 16), e, 'un levier au repos ne change pas d\'état');
}

// 2
{
  let e = avancerBascule(null, false, 0);
  e = avancerBascule(e, true, 16); // l'appui
  assert.equal(positionBascule(e), 0, 'le geste part de la butée éteinte');
  let depasse = false;
  let t = 0;
  while (t < DUREE_BASCULE_MS - 16) {
    e = avancerBascule(e, true, 16); t += 16;
    if (e.ms < DUREE_BASCULE_MS) {
      assert.equal(voyantAllume(e), false, `voyant allumé avant la butée (${e.ms} ms)`);
      assert.equal(fonduHalo(e), 0, 'halo avant la butée');
    }
    if (positionBascule(e) > 1) depasse = true;
  }
  assert.ok(depasse, 'le manche dépasse un peu sa butée (le ressort)');
  e = avancerBascule(e, true, 32);
  assert.ok(voyantAllume(e), 'voyant allumé à la butée');
  assert.ok(fonduHalo(e) < 0.5, 'le halo commence à peine');
  e = avancerBascule(e, true, DUREE_FONDU_HALO_MS);
  assert.equal(fonduHalo(e), 1, 'halo monté');
  assert.equal(positionBascule(e), 1, 'manche en butée');
}

// 3
{
  let e = avancerBascule(null, false, 0);
  e = avancerBascule(e, true, 0);
  e = avancerBascule(e, true, DUREE_BASCULE_MS / 3);
  const atteint = positionBascule(e);
  const retour = avancerBascule(e, false, 16);
  assert.equal(positionBascule(retour), atteint, 'le retour repart du point atteint');
  assert.equal(voyantAllume(retour), false);
}

// 4
const { donnees } = await chargerCataloguesDepuisDisque('data', ['visuels', 'puzzles']);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);
const leviers = donnees.puzzles.filter((p) => p.type === 'levier');
assert.ok(leviers.length > 0);
for (const l of leviers) {
  const v = visuel(l.render.visuel);
  assert.ok(v.piece_mobile, `${l.id} : aucune pièce qui bascule, il ne ferait que changer de couleur`);
  const manche = visuel(v.piece_mobile.visuel);
  assert.ok(manche, `${l.id} : pièce mobile introuvable`);
  const teintees = [...v.primitives, ...manche.primitives].filter((p) => p.teinte);
  assert.ok(teintees.length > 0, `${l.id} : aucune pièce teintée`);
  assert.notEqual(v.piece_mobile.angles[0], v.piece_mobile.angles[1], `${l.id} : le manche ne bouge pas`);
}

console.log(`test_d158_bascule_levier : geste posé au chargement, voyant à la butée, halo en fondu, ${leviers.length} leviers qui basculent`);

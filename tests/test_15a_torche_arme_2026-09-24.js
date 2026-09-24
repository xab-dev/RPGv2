// `specs/15` palier A (`D-194`) : la torche, une arme. Elle fait les mêmes
// dégâts que l'épée (Xav : « dégât feu égal à l'épée »), elle est de feu, et
// un coup pose une brûlure LIMITÉE DANS LE TEMPS sur le monstre touché.
//
// Ce qui est tenu : l'égalité avec l'épée (comparée à l'épée elle-même, jamais
// à un nombre recopié), le compte exact des ticks de brûlure, le
// rafraîchissement sans cumul, et ce que le démarrage refuse.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { poserStatutCoup, tickStatutsCoup } from '../src/status.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);

// --- 1. L'objet, l'arme, la recette ---------------------------------------
const item = registre.obtenir('items', 'item_torche');
const torche = registre.obtenir('weapons', item.arme);
const epee = registre.obtenir('weapons', 'weapon_epee_bois');
assert.equal(item.categorie, 'arme');
assert.deepEqual(torche.modificateurs, epee.modificateurs, 'les dégâts de la torche sont ceux de l’épée');
assert.deepEqual(torche.portee, epee.portee, 'et sa portée aussi');
assert.equal(torche.element, 'elem_feu');
const brulure = registre.obtenir('status_effects', torche.au_coup.statut);
assert.equal(brulure.cible, 'monstre');
const recette = registre.tous('recipes').find((r) => r.sortie.item === 'item_torche');
assert.ok(recette, 'la torche se fabrique');
assert.equal(recette.station, 'station_type_atelier');
console.log('OK la torche : une arme de feu, les dégâts et la portée de l’épée, fabriquée à l’Atelier');

// --- 2. La brûlure au coup : durée, ticks, rafraîchissement ----------------
{
  let m = poserStatutCoup({ id: 'm1', pv: 100 }, brulure);
  let total = 0;
  for (let t = 0; t < brulure.duree + 2000; t += 16) {
    const r = tickStatutsCoup(registre, m, 16);
    m = r.monstre;
    total += r.degats;
  }
  const ticksAttendus = Math.floor(brulure.duree / brulure.intervalle_ms);
  assert.equal(total, ticksAttendus * brulure.valeur, 'une brûlure fait exactement durée / intervalle ticks');
  assert.deepEqual(m.statutsCoup, [], 'expirée, elle quitte le monstre');

  // Un second coup à mi-brûlure REMET la durée à plein, il n'en pose pas deux.
  let n = poserStatutCoup({ id: 'm2', pv: 100 }, brulure);
  n = tickStatutsCoup(registre, n, brulure.duree / 2).monstre;
  n = poserStatutCoup(n, brulure);
  assert.equal(n.statutsCoup.length, 1, 'sans cumul');
  assert.equal(n.statutsCoup[0].restantMs, brulure.duree, 'la durée repart à plein');
  assert.deepEqual(tickStatutsCoup(registre, { id: 'm3', pv: 5 }, 500), { monstre: { id: 'm3', pv: 5 }, degats: 0 });
}
console.log('OK la brûlure tique durée / intervalle fois, se rafraîchit sans cumul, puis s’en va');

// --- 3. Le démarrage refuse un statut qui ne sait pas se poser au coup -----
function avecAuCoup(statut) {
  const copie = { ...donnees, weapons: donnees.weapons.map((w) => (w.id === 'weapon_torche' ? { ...w, au_coup: { statut } } : w)) };
  return validerCatalogues(copie).join('\n');
}
assert.match(avecAuCoup('dot_brulure'), /au_coup/, 'une brûlure d’aura ne se pose pas au coup');
assert.match(avecAuCoup('buff_force'), /au_coup/, 'un buff du joueur non plus');
assert.match(avecAuCoup('statut_inconnu'), /introuvable/);
const sansElement = validerCatalogues({ ...donnees, weapons: donnees.weapons.map((w) => (w.id === 'weapon_torche' ? { ...w, element: 'elem_plasma' } : w)) });
assert.ok(sansElement.some((e) => /element/.test(e)), 'un élément inconnu tombe au boot');
console.log('OK au boot : statut d’aura, buff, statut ou élément inconnus refusés');

console.log('OK test_15a_torche_arme');

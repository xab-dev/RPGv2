// `D-161` — les monstres redessinés (rampant de la Grotte, rôdeur du Chaos).
//
// Contrat 1 — `Q-27` (décision de Xav) : aucune lueur sur les monstres, on ne
// les voit qu'au dernier moment. Tenu sur les DONNÉES de chaque visuel de
// monstre : ni lumière d'état, ni dégradé radial (la seule primitive qui
// fabrique un halo).
// Contrat 2 — le coup porté se lit au flash blanc (`render.js`, teinte), qui
// ne touche que les pièces `teinte: true` : un monstre dont aucune pièce
// n'est teintable encaisserait sans que rien ne bouge à l'écran.
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['visuels', 'enemies']);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);

for (const ennemi of donnees.enemies) {
  const v = visuel(ennemi.render.visuel);
  assert.equal(v.lumiere_active, undefined, `${ennemi.id} : une lumière d'état (Q-27)`);
  assert.ok(!v.primitives.some((p) => p.forme === 'degrade_radial'), `${ennemi.id} : un halo dans le dessin (Q-27)`);
  assert.ok(v.teintable && v.primitives.some((p) => p.teinte), `${ennemi.id} : aucune pièce ne prend le flash du coup porté`);
}

console.log(`test_d161_monstres : ${donnees.enemies.length} monstres sans lueur, flash lisible`);

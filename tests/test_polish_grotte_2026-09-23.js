// Polish ambiance (23/09), étape Grotte — le sol devient de la pierre, les
// murs des moellons, et des cristaux s'ajoutent au décor.
//
// Ce qui se tient : un MUR est une surface, pas un objet (règle de `D-131`,
// posée pour la Maison) — chacun de ses dessins tient dans sa cellule sur les
// quatre bords, sinon la pierre d'un mur nord mordrait le sol au-dessous et
// celle d'un mur ouest le sol à sa droite. Le sol de la Grotte porte un grain
// (le contrat de cellule des sols est celui de `D-105`, qui les couvre déjà).
// Le décor de la Grotte ne cite que des visuels qui existent. Aucune valeur
// de réglage n'est épinglée (`D-52`).
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { boitePrimitive } from '../src/structures.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['tiles', 'visuels', 'scenes']);
const tuile = (id) => donnees.tiles.find((t) => t.id === id);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);
const grottes = donnees.scenes.filter((s) => s.id.startsWith('scene_grotte'));
const cotes = [...new Set(grottes.map((s) => s.tile_size))];

const idsDe = (t) => [t.render.visuel, ...(t.render.visuel_variantes || [])].filter(Boolean);
const tuilesDesGrottes = new Set(grottes.flatMap((s) => s.layout.flat()));

for (const id of tuilesDesGrottes) {
  const t = tuile(id);
  if (!t.solid || !t.render.visuel) continue;
  for (const idv of idsDe(t)) {
    const boites = visuel(idv).primitives.map((p) => boitePrimitive(p));
    for (const cote of cotes) {
      const e = {
        minX: Math.min(...boites.map((b) => b.minX)), maxX: Math.max(...boites.map((b) => b.maxX)),
        minY: Math.min(...boites.map((b) => b.minY)), maxY: Math.max(...boites.map((b) => b.maxY)),
      };
      assert.ok(e.minX >= -cote / 2 && e.maxX <= cote / 2 && e.minY >= -cote && e.maxY <= 0,
        `${id} : le mur "${idv}" sort de sa cellule (${JSON.stringify(e)})`);
    }
  }
}
const sol = [...tuilesDesGrottes].map(tuile).find((t) => !t.solid && t.id === 'tile_sol');
assert.ok(sol && idsDe(sol).length >= 1, 'le sol de la Grotte porte un grain');
for (const s of grottes) {
  for (const m of s.decor.motifs) assert.ok(visuel(m.visuel), `${s.id} : motif "${m.visuel}" introuvable`);
}
console.log('OK Grotte : murs dans leur cellule, sol grainé, décor résolu');

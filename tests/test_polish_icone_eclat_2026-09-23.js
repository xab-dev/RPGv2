// Polish ambiance (23/09), étape Icône éclat — le cristal gagne un halo, une
// orbite et des étincelles. Ce qui ne doit pas changer : c'est une ICÔNE, et
// elle doit tenir dans la boîte de référence des icônes (`icone_canvas.js#cadrer`)
// — sinon les fiches la RECADRERAIENT et le cristal rapetisserait d'autant que
// son halo déborde. Le halo est un ornement autour du cristal, jamais une raison
// de le réduire. Et le cristal reste la pièce la plus opaque du dessin : le sens
// est porté par la silhouette, pas par la lueur (`P4②`).
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { cadrer } from '../src/ui/icone_canvas.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['visuels', 'monnaies']);
for (const m of donnees.monnaies) {
  const v = donnees.visuels.find((x) => x.id === m.icone);
  const cote = 140;
  const c = cadrer(v, cote);
  assert.deepEqual(c, { x: cote / 2, y: cote / 2, echelle: cote / 14 }, `${v.id} déborde de la boîte des icônes : il serait réduit`);
  const pleines = v.primitives.filter((p) => p.forme === 'polygone' && p.alpha == null);
  assert.ok(pleines.length >= 1, `${v.id} : plus aucune facette opaque, la silhouette ne porte plus le sens`);
}
console.log('OK icône de la monnaie : dans la boîte des icônes, silhouette opaque');

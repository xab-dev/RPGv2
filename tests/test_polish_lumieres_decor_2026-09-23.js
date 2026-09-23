// Polish ambiance (23/09), harmonisation — un motif de décor peut émettre de
// la lumière (`decor.motifs[].lumiere`), les cristaux de la Grotte.
//
// Ce qui se tient : les halos sont DÉRIVÉS du décor déjà tiré (un par instance
// de motif lumineux, à sa position, décalés de `dy` vers le haut, avec la
// couleur déclarée) ; un décor réduit par le levier `densite_decor` éteint
// exactement les cristaux qu'il retire (préfixe de `D-114`) ; une scène sans
// motif lumineux n'en produit aucun ; le schéma refuse un rayon nul ou une
// couleur mal formée. Aucune valeur de réglage épinglée (`D-52`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { genererDecor, lumieresDuDecor } from '../src/decor.js';
import { chargerScene } from '../src/scene.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

let lumineuses = 0;
for (const s of donnees.scenes) {
  const scene = chargerScene(registre, s.id);
  const motifs = new Map(((scene.decor && scene.decor.motifs) || []).filter((m) => m.lumiere).map((m) => [m.visuel, m.lumiere]));
  const complet = genererDecor(scene, 1);
  const halos = lumieresDuDecor(scene, complet);
  const emetteurs = complet.filter((d) => motifs.has(d.visuel));
  assert.equal(halos.length, emetteurs.length, `${s.id} : un halo par motif lumineux`);
  emetteurs.forEach((d, i) => {
    const l = motifs.get(d.visuel);
    assert.deepEqual(halos[i], { x: d.x, y: d.y - (l.dy || 0), rayon: l.rayon, ...(l.couleur ? { couleur: l.couleur } : {}) });
  });
  if (motifs.size === 0) assert.equal(halos.length, 0, `${s.id} : aucun motif lumineux, aucun halo`);
  // Levier : le décor réduit est un préfixe, ses halos aussi.
  const reduit = lumieresDuDecor(scene, genererDecor(scene, 0.5));
  assert.deepEqual(reduit, halos.slice(0, reduit.length), `${s.id} : un décor réduit rallume d'autres cristaux`);
  assert.equal(lumieresDuDecor(scene, genererDecor(scene, 0)).length, 0, `${s.id} : sans décor, aucune lueur`);
  lumineuses += halos.length;
}
assert.ok(lumineuses > 0, 'au moins un motif lumineux en données (les cristaux de la Grotte)');

const avec = (lumiere) => ({
  ...donnees,
  scenes: donnees.scenes.map((s) => (s.id === 'scene_grotte_salle_1'
    ? { ...s, decor: { ...s.decor, motifs: s.decor.motifs.map((m) => (m.visuel === 'visuel_cristal' ? { ...m, lumiere } : m)) } } : s)),
});
assert.match(validerCatalogues(avec({ rayon: 0 }), SCHEMAS).join(' | '), /lumiere doit être/);
assert.match(validerCatalogues(avec({ rayon: 20, couleur: 'bleu' }), SCHEMAS).join(' | '), /lumiere doit être/);
console.log(`OK lumières du décor : ${lumineuses} halos dérivés, préfixe tenu, schéma strict`);

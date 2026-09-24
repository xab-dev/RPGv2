// `D-191` (24/09, demande de Xav) : la plume brille la nuit — un liseré blanc,
// sans lumière projetée, au sol et dans les icônes des menus. Nuit ET aube
// (« signal que les monstres peuvent être présents ; le crépuscule permet déjà
// de s'y préparer »), jamais dans une scène sans cycle. Bas : fixe · Moyen :
// il respire · Haut : en plus, un filet de particules blanches.
//
// Ce qui se teste ici est le CONTRAT : quand le liseré s'allume, ce que chaque
// réglage ajoute, et ce que le démarrage refuse. Le dessin lui-même revient à
// Xav, en jeu (`V-135`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { surlignageActif } from '../src/visuels.js';
import { ornementActif, particulesFilet } from '../src/ornements.js';
import { PHASES_CYCLE } from '../src/daynight.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);
const effet = (id) => donnees.effets.find((e) => e.id === id);

// --- 1. Quand : nuit et aube, jamais ailleurs, jamais sans cycle ----------
const plume = visuel('visuel_plume');
const allumees = PHASES_CYCLE.map((p) => p.nom).filter((nom) => surlignageActif(plume, nom));
assert.deepEqual(allumees.sort(), ['aube', 'nuit']);
assert.equal(surlignageActif(plume, null), false, 'une scène sans cycle (la Grotte) n\'a pas de nuit');
assert.equal(surlignageActif(visuel('visuel_branche'), 'nuit'), false, 'sans `surlignage`, rien ne s\'allume');
assert.ok(visuel(plume.surlignage.visuel), 'le liseré est un visuel du catalogue');
console.log('OK la plume s\'allume la nuit et à l\'aube, jamais au jour, au crépuscule ni dans la Grotte');

// --- 2. Ce que chaque réglage ajoute --------------------------------------
const respire = effet('effet_surlignage_respire');
const filet = effet('effet_surlignage_filet');
const actifs = (niveau) => [ornementActif(respire, niveau), ornementActif(filet, niveau)].map(Boolean);
assert.deepEqual(actifs(0), [false, false], 'Bas : le liseré est fixe');
assert.deepEqual(actifs(1), [true, false], 'Moyen : il respire');
assert.deepEqual(actifs(2), [true, true], 'Haut : il respire, et le filet monte');
console.log('OK Bas fixe, Moyen respire, Haut respire + filet');

// --- 3. Le filet : pur, déterministe, discret -----------------------------
assert.deepEqual(particulesFilet(null, 1234, 0, 0), [], 'sans l\'effet, aucune particule');
for (let t = 0; t < 2 * filet.periode_ms; t += 97) {
  const ps = particulesFilet(filet, t, 50, 80, 0.3);
  assert.equal(ps.length, filet.nb_particules);
  assert.deepEqual(ps, particulesFilet(filet, t, 50, 80, 0.3), 'même instant, même filet');
  for (const p of ps) {
    assert.ok(p.alpha >= 0 && p.alpha <= filet.alpha + 1e-9, 'une particule naît et meurt transparente');
    assert.ok(p.y <= 80 + 1e-9 && p.y >= 80 - filet.hauteur_px - 1e-9, 'elle monte, jamais ne tombe');
    assert.ok(p.echelle > 0 && p.echelle <= filet.echelle);
  }
}
console.log('OK le filet monte, naît et meurt transparent, sans état');

// --- 4. Le démarrage refuse ce qui ne s'allumerait jamais -----------------
function avecPlume(surlignage) {
  const copie = { ...donnees, visuels: donnees.visuels.map((v) => (v.id === 'visuel_plume' ? { ...v, surlignage } : v)) };
  return validerCatalogues(copie).join('\n');
}
assert.match(avecPlume({ visuel: 'visuel_plume_surlignage', phases: ['minuit'] }), /surlignage/);
assert.match(avecPlume({ visuel: 'visuel_plume_surlignage', phases: [] }), /surlignage/);
assert.match(avecPlume({ visuel: 'visuel_inconnu', phases: ['nuit'] }), /introuvable/);
assert.match(avecPlume({ visuel: 'visuel_plume', phases: ['nuit'] }), /introuvable/);
console.log('OK phase inconnue, liste vide, visuel inconnu ou lui-même : refusés au boot');

console.log('OK test_d191_surlignage_nuit');

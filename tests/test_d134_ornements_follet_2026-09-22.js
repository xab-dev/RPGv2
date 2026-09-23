// `D-134` (`Q-58`) — les ornements du follet : des étincelles en orbite et un
// halo qui respire, réservés au réglage Haut par un SEUIL déclaré en données.
//
// Ce qui se vérifie : le levier `ornements` existe et Moyen reste neutre ;
// un effet n'existe qu'à partir de son `ornement_min` (Haut oui, Moyen et Bas
// non), un effet sans seuil existe partout ; la respiration vaut 1 exactement
// sans effet (Moyen dessine le halo au pixel près) et reste positive avec ;
// l'orbite passe devant ET derrière ; le schéma refuse ce qui ferait un halo
// éteint ou une information réservée à une machine. Aucun réglage épinglé
// (`D-52`). Le chemin de DESSIN de Haut est parcouru par
// `test_d112_levier_particules` (600 frames dessinées sous chaque preset).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { valeurLevier, leviersNonNeutres } from '../src/qualite.js';
import { ornementActif, etincellesOrbite, facteurRespiration } from '../src/ornements.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const config = registre.obtenir('graphismes', 'graphismes_presets');
const niveau = (preset) => valeurLevier(config, preset, 'ornements');

const ornements = registre.tous('effets').filter((e) => e.ornement_min !== undefined);
assert.ok(ornements.length >= 2, 'les deux ornements du follet sont déclarés');

// --- 1. Le levier, et Moyen neutre ---------------------------------------
{
  assert.ok(config.leviers.includes('ornements'));
  assert.deepEqual(leviersNonNeutres(config, 'moyen'), [], 'Moyen = l\'état actuel, ornements compris');
  assert.ok(niveau('bas') <= niveau('moyen') && niveau('moyen') <= niveau('haut'), 'Bas ≤ Moyen ≤ Haut');
  console.log('OK levier `ornements` déclaré, Moyen neutre, ordre des presets tenu');
}

// --- 2. Le seuil : chaque effet existe à partir du sien --------------------
// `D-169` (23/09) : la lueur des flèches de la bulle est un ornement de
// Moyen — tout ornement n'est donc plus un ornement de Haut. Le contrat
// général est le seuil ; celui de `D-134`, que les deux ornements DU FOLLET
// soient réservés à Haut, se vérifie par leurs ids.
{
  for (const effet of ornements) {
    for (const p of ['bas', 'moyen', 'haut']) {
      const attendu = niveau(p) >= effet.ornement_min ? effet : null;
      assert.equal(ornementActif(effet, niveau(p)), attendu, `${effet.id} : seuil ${effet.ornement_min} sous ${p}`);
    }
  }
  for (const id of ['effet_ornement_follet', 'effet_halo_follet']) {
    const effet = registre.obtenir('effets', id);
    assert.equal(ornementActif(effet, niveau('moyen')), null, `${id} : absent en Moyen`);
    assert.equal(ornementActif(effet, niveau('bas')), null, `${id} : absent en Bas`);
    assert.equal(ornementActif(effet, niveau('haut')), effet, `${id} : présent en Haut`);
  }
  // Un effet d'avant le levier ne peut pas disparaître à cause de lui.
  const sansSeuil = registre.obtenir('effets', 'effet_sillage_follet');
  for (const p of ['bas', 'moyen', 'haut']) assert.equal(ornementActif(sansSeuil, niveau(p)), sansSeuil);
  assert.equal(ornementActif(null, 5), null);
  console.log(`OK ${ornements.length} ornements présents à partir de leur seuil, ceux du follet en Haut seulement ; sans seuil = partout`);
}

// --- 3. La respiration ----------------------------------------------------
{
  const halo = registre.obtenir('effets', 'effet_halo_follet');
  for (const t of [0, 123, 999, 5000]) assert.equal(facteurRespiration(null, t), 1, 'sans effet : 1 exactement');
  let min = Infinity;
  let max = -Infinity;
  for (let t = 0; t < halo.periode_ms; t += 10) {
    const f = facteurRespiration(halo, t);
    min = Math.min(min, f);
    max = Math.max(max, f);
  }
  assert.ok(min > 0, 'le halo ne s\'éteint jamais');
  assert.ok(max > 1 && min < 1, 'il respire autour de son intensité de Moyen');
  console.log(`OK respiration : 1 sans effet, [${min.toFixed(2)} ; ${max.toFixed(2)}] avec`);
}

// --- 4. L'orbite passe devant et derrière --------------------------------
{
  const orbite = registre.obtenir('effets', 'effet_ornement_follet');
  assert.deepEqual(etincellesOrbite(null, 0, 10, 10), []);
  let devant = 0;
  let derriere = 0;
  for (let t = 0; t < orbite.periode_ms; t += 50) {
    const e = etincellesOrbite(orbite, t, 100, 50);
    assert.equal(e.length, orbite.nb_particules);
    for (const p of e) {
      if (p.devant) devant += 1; else derriere += 1;
      assert.ok(p.alpha > 0 && p.alpha <= 1);
      assert.ok(Math.abs(p.x - 100) <= orbite.rayon_orbite_px + 1e-9, 'autour du follet, jamais ailleurs');
    }
  }
  assert.ok(devant > 0 && derriere > 0, 'une orbite, pas un anneau collé devant');
  console.log('OK orbite : autour du follet, devant puis derrière');
}

// --- 5. Le schéma ---------------------------------------------------------
{
  const casse = (id, modif) => {
    const copie = structuredClone(donnees);
    modif(copie.effets.find((e) => e.id === id));
    return validerCatalogues(copie, SCHEMAS).join('\n');
  };
  assert.match(casse('effet_halo_follet', (e) => { e.amplitude = 1; }), /amplitude/);
  assert.match(casse('effet_halo_follet', (e) => { e.ornement_min = 1.5; }), /ornement_min/);
  assert.match(casse('effet_texte_gain', (e) => { e.ornement_min = 2; }), /réservé aux effets "cosmetique"/);
  assert.match(casse('effet_ornement_follet', (e) => { delete e.visuel; }), /visuel/);
  assert.match(casse('effet_ornement_follet', (e) => { e.periode_ms = 0; }), /periode_ms/);
  console.log('OK schéma : amplitude, seuil, rôle, visuel et période vérifiés au boot');
}

// Spec 16, palier D (`D-273`) — le pas du héros suit sa vitesse, sans jamais
// passer 3 Hz (Xav, `V-190` : « avec les 49 point en agilité on risque de
// dépasser les 3hz (probablement un rendement décroissement à mettre en
// place) »).
//
// Contrats :
// 1. `poses.js#cadencePas` : 1 à la vitesse de référence ; proportionnelle
//    en dessous ; au-dessus, croissante, sans cassure de pente au passage de
//    la référence, et JAMAIS une période de marche jouée sous celle de 3 Hz,
//    quelle que soit la vitesse ; sans référence ou sans marche, 1.
// 2. `orientation.js#avancerAnimationHeros` : l'horloge du pas avance à la
//    cadence, celle du temps non ; sans geste, la dernière cadence se garde.
// 3. `poses.js#matriceAnimation` : la marche lit l'horloge du pas, le repos
//    celle du temps.
// 4. Démarrage : un `pas` mal formé, refusé.
// 5. Le branchement : `main.js` passe la cadence de la vitesse du geste.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cadencePas, matriceAnimation, PERIODE_MIN_ANIMATION_MS } from '../src/poses.js';
import { creerAnimationHeros, avancerAnimationHeros } from '../src/orientation.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);

// --- 1. La cadence ------------------------------------------------------------------
{
  const ref = HEROS.pas.vitesse_reference_px_s;
  assert.ok(ref > 0, 'le héros déclare sa vitesse de référence');
  assert.equal(cadencePas(HEROS, ref), 1, 'à la référence, rien ne change');
  assert.ok(Math.abs(cadencePas(HEROS, ref / 2) - 0.5) < 1e-12, 'plus lent, proportionnel');
  assert.equal(cadencePas(HEROS, 0), 0, 'immobile, le pas s\'arrête');
  const e = 1e-4 * ref;
  const pente = (v) => (cadencePas(HEROS, v + e) - cadencePas(HEROS, v - e)) / (2 * e / ref);
  assert.ok(Math.abs(pente(ref - 2 * e) - pente(ref + 2 * e)) < 1e-3, 'aucune cassure de pente au passage de la référence');
  const periodesMarche = HEROS.animations.filter((a) => a.quand === 'marche').map((a) => a.periode_ms);
  let avant = 1;
  for (const u of [1.1, 1.5, 2, 2.4, 3, 10, 1e3, 1e9]) {
    const c = cadencePas(HEROS, u * ref);
    assert.ok(c > avant || c === avant, `croissante (×${u})`);
    assert.ok(c < u, `rendement décroissant : la cadence croît moins que la vitesse (×${u})`);
    for (const p of periodesMarche) assert.ok(p / c >= PERIODE_MIN_ANIMATION_MS, `×${u} : une période de ${p} ms jouée à ${(p / c).toFixed(1)} ms, jamais sous 3 Hz`);
    avant = c;
  }
  const { pas, ...sansPas } = HEROS;
  assert.equal(cadencePas(sansPas, 3 * ref), 1, 'sans référence, la période d\'auteur');
  assert.equal(cadencePas({ ...HEROS, animations: HEROS.animations.filter((a) => a.quand !== 'marche') }, 3 * ref), 1, 'sans marche, 1');
  console.log('OK cadence : 1 à la référence, proportionnelle en dessous, décroissante au-dessus, jamais 3 Hz');
}

// --- 2. L'état ---------------------------------------------------------------------
{
  let s = creerAnimationHeros();
  s = avancerAnimationHeros(s, { deltaMs: 100, dx: 1, dy: 0, cadence: 1.2 });
  assert.ok(Math.abs(s.pasMs - 120) < 1e-9 && s.tempsMs === 100, 'le pas avance à la cadence, le temps non');
  s = avancerAnimationHeros(s, { deltaMs: 100, cadence: 0 });
  assert.ok(Math.abs(s.pasMs - 240) < 1e-9, 'sans geste, la dernière cadence se garde : le pas se finit');
  s = avancerAnimationHeros(s, { deltaMs: 100, dx: 1, dy: 0 });
  assert.ok(Math.abs(s.pasMs - 340) < 1e-9, 'sans cadence donnée, 1');
  console.log('OK état : l\'horloge du pas');
}

// --- 3. Chaque animation lit son horloge --------------------------------------------
{
  const temoin = { primitives: [], animations: [
    { quand: 'repos', champ: 'dy', amplitude: 1, periode_ms: 1000 },
    { quand: 'marche', champ: 'dx', amplitude: 1, periode_ms: 1000 },
  ] };
  const m = matriceAnimation(temoin, null, { tempsMs: 250, pasMs: 0, marche: 0.5 });
  assert.ok(Math.abs(m[5] - 0.5) < 1e-9, 'le repos, à l\'horloge du temps');
  assert.ok(Math.abs(m[4]) < 1e-9, 'la marche, à l\'horloge du pas');
  console.log('OK horloges');
}

// --- 4. Démarrage ------------------------------------------------------------------
{
  for (const pas of [{}, { vitesse_reference_px_s: 0 }, { vitesse_reference_px_s: 95, x: 1 }, 95]) {
    const copie = structuredClone(donnees);
    copie.visuels.find((v) => v.id === VISUEL_HEROS_ID).pas = pas;
    assert.ok(validerCatalogues(copie).some((e) => e.includes('> pas doit être')), `refusé : ${JSON.stringify(pas)}`);
  }
  console.log('OK démarrage');
}

// --- 5. Le branchement --------------------------------------------------------------
{
  const main = fs.readFileSync(path.join(RACINE, 'src/main.js'), 'utf8');
  assert.ok(/cadencePas\(registre\.obtenir\('visuels', VISUEL_HEROS_ID\), vitesseGeste\)/.test(main));
  assert.ok(/derivee_vitesse_deplacement_px_s/.test(main.slice(main.indexOf('const vitesseGeste'), main.indexOf('const vitesseGeste') + 200)));
  assert.ok(/avancerAnimationHeros\([^)]*cadence \}\)/.test(main));
  console.log('OK branchement');
}

console.log('OK test_16d_pas_vitesse');

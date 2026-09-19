// `D-36` (proposition) : le follet « aérien ». Référence de *sensation*
// donnée par Xav — le vif d'or, ni ses ailes ni son or.
//
// Ce que ce fichier protège, et c'est le point le plus important du ticket :
// **rien de ce qui compte ne bouge**. La position logique du follet, son
// aura, sa distance d'engagement et sa lumière sont exactement ce qu'elles
// étaient ; seule la silhouette se décale. Si ce n'était pas le cas,
// l'obscurité scintillerait au rythme du vol.
//
// Prouvé ici :
//   1. le vol est borné et revient toujours vers la position logique ;
//   2. il DÉPASSE aux changements de direction (c'est ce qui fait « vif ») ;
//   3. un saut de position (entrée en scène) recolle au lieu de traverser ;
//   4. le module ne connaît ni la forme du follet, ni le jeu ;
//   5. le sillage est une 2ᵉ instance de poussiere.js — aucun système neuf ;
//   6. les ornements vivent dans les visuels PARTAGÉS, donc la cinématique
//      du choix les a sans qu'on ait touché à `intro.js`.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { creerVol, avancerVol, ecartVisuel } from '../src/vol_follet.js';
import { creerPoussiere, avancerPoussiere, bouffeesVisibles } from '../src/poussiere.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), []);

const CONFIG_VOL = catalogues.effets.find((e) => e.id === 'effet_vol_follet');
const CONFIG_SILLAGE = catalogues.effets.find((e) => e.id === 'effet_sillage_follet');
const FRAME_MS = 16;

// --- 1. Borné, et toujours rappelé vers la position logique -------------
{
  let vol = creerVol(CONFIG_VOL);
  const cible = { x: 1000, y: 500 };
  let ecartMax = 0;
  for (let i = 0; i < 600; i += 1) {
    // Le follet logique orbite autour du héros : on lui fait décrire un
    // cercle de 24 px, comme companion.js.
    const angle = (i / 60) * 2;
    const cibleX = cible.x + Math.cos(angle) * 24;
    const cibleY = cible.y + Math.sin(angle) * 24;
    vol = avancerVol(vol, { cibleX, cibleY, deltaMs: FRAME_MS });
    ecartMax = Math.max(ecartMax, ecartVisuel(vol, cibleX, cibleY));
  }
  assert.ok(ecartMax < 20, `le décalage reste discret (max ${ecartMax.toFixed(1)} px)`);
  assert.ok(ecartMax > 0.5, 'mais il existe : le follet n’est pas collé à sa position');
  console.log(`OK vol borné : écart maximal ${ecartMax.toFixed(1)} px sur 10 s d’orbite`);
}

// --- 2. Le dépassement : c'est lui qui fait « vif » ----------------------
{
  let vol = creerVol(CONFIG_VOL);
  // Immobile assez longtemps pour se poser...
  for (let i = 0; i < 200; i += 1) vol = avancerVol(vol, { cibleX: 1000, cibleY: 500, deltaMs: FRAME_MS });
  // ...puis la cible part franchement à droite (sans dépasser le seuil de
  // saut, sinon le module recollerait au lieu de voler).
  let maxX = -Infinity;
  for (let i = 0; i < 120; i += 1) {
    vol = avancerVol(vol, { cibleX: 1050, cibleY: 500, deltaMs: FRAME_MS });
    maxX = Math.max(maxX, vol.rendu.x);
  }
  assert.ok(maxX > 1050 + CONFIG_VOL.amplitude_px, `la silhouette dépasse la cible (${maxX.toFixed(1)} > 1050)`);
  assert.ok(Math.abs(vol.rendu.x - 1050) < 5, 'puis elle se repose dessus');
  console.log(`OK dépassement de ${(maxX - 1050).toFixed(1)} px au changement de direction, puis retour`);
}

// --- 3. Un saut de position recolle, jamais un vol à travers la carte ---
{
  let vol = creerVol(CONFIG_VOL);
  vol = avancerVol(vol, { cibleX: 100, cibleY: 100, deltaMs: FRAME_MS });
  // Entrée dans une autre scène : le follet est brutalement ailleurs.
  vol = avancerVol(vol, { cibleX: 4000, cibleY: 3000, deltaMs: FRAME_MS });
  assert.deepEqual(vol.rendu, { x: 4000, y: 3000 }, 'au-delà du seuil de saut, la silhouette se recolle');
  assert.equal(vol.vx, 0, 'et son élan est remis à zéro');
  console.log(`OK saut de position : recollage net au-delà de ${CONFIG_VOL.seuil_saut_px} px`);
}

// --- 4. Le module ignore le follet, sa forme et le jeu ------------------
{
  const source = fs.readFileSync(path.join(RACINE, 'src/vol_follet.js'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const mot of ['aura', 'lumiere', 'engagement', 'companion', 'visuel', 'ctx']) {
    assert.ok(!source.includes(mot), `vol_follet.js ne doit jamais connaître "${mot}"`);
  }
  console.log('OK le module de vol ne connaît ni l’aura, ni la lumière, ni la silhouette');
}

// --- 5. Le sillage n'est pas un système neuf ----------------------------
{
  // C'est `poussiere.js`, avec une autre configuration. Si ce test passe,
  // c'est que la règle du 19/09 (« l'effet ne connaît pas la forme du
  // porteur ») tient sur un SECOND cas d'usage réel.
  const sillage = creerPoussiere(CONFIG_SILLAGE);
  for (let i = 0; i < 40; i += 1) {
    avancerPoussiere(sillage, { x: 100 + i * 4, y: 200, distancePx: 4, deltaMs: FRAME_MS, emettre: true });
  }
  const bouffees = bouffeesVisibles(sillage);
  assert.ok(bouffees.length > 0, 'le sillage émet quand le follet se déplace');
  assert.ok(bouffees.every((b) => b.alpha > 0 && b.alpha <= CONFIG_SILLAGE.alpha_depart));
  // Il RÉTRÉCIT en s'éteignant (echelle_fin < echelle_depart), à l'inverse de
  // la poussière du héros qui s'étale : une étincelle qui meurt, pas un nuage.
  assert.ok(CONFIG_SILLAGE.echelle_fin < CONFIG_SILLAGE.echelle_depart, 'le sillage rétrécit en s’éteignant');

  // À l'arrêt, plus rien de neuf (l'interrupteur est à l'appelant).
  const avant = bouffeesVisibles(sillage).length;
  avancerPoussiere(sillage, { x: 260, y: 200, distancePx: 0, deltaMs: FRAME_MS, emettre: true });
  assert.ok(bouffeesVisibles(sillage).length <= avant, 'à l’arrêt, il ne naît rien');
  console.log(`OK sillage : ${bouffees.length} étincelles vivantes, réserve fixe de poussiere.js, aucun système neuf`);
}

// --- 6. Les ornements sont dans les visuels partagés --------------------
{
  // Donc la cinématique du choix les a AUSSI, sans que `intro.js` ait bougé :
  // elle dessine la même entrée de catalogue que le jeu.
  for (const id of ['visuel_follet_feu', 'visuel_follet_eau', 'visuel_follet_terre']) {
    const visuel = catalogues.visuels.find((v) => v.id === id);
    assert.ok(visuel.primitives.length >= 5, `${id} porte ses ornements (${visuel.primitives.length} primitives)`);
    // Fins : aucune primitive ajoutée ne doit écraser la silhouette.
    const ajoutees = visuel.primitives.slice(2);
    assert.ok(
      ajoutees.every((p) => (p.alpha === undefined ? false : p.alpha <= 0.6)),
      `${id} : les ornements restent discrets (alpha <= 0,6)`,
    );
  }

  // Et `intro.js` n'a pas été touché par ce ticket : il ne connaît ni le vol,
  // ni le sillage, ni les ornements.
  const intro = fs.readFileSync(path.join(RACINE, 'src/intro.js'), 'utf8');
  for (const mot of ['vol_follet', 'sillage', 'ornement']) {
    assert.ok(!intro.includes(mot), `intro.js ne connaît pas "${mot}"`);
  }
  console.log('OK ornements dans les visuels partagés : la cinématique les a, intro.js n’a pas bougé');
}

console.log('OK test_d36_follet_aerien');

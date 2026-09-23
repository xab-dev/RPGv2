// `D-36` (proposition) : le follet « aérien ». Référence de *sensation*
// donnée par Xav — le vif d'or, ni ses ailes ni son or.
//
// Ce que ce fichier protège, et c'est le point le plus important du ticket :
// **rien de ce qui compte ne bouge**. La position logique du follet, son
// aura, sa distance d'engagement et sa lumière sont exactement ce qu'elles
// étaient ; seule la silhouette se décale. Si ce n'était pas le cas,
// l'obscurité scintillerait au rythme du vol.
//
// **Mis à jour par `D-39` (20/09)** : les trois premiers blocs de ce fichier
// éprouvaient le RESSORT (bornage, dépassement, recollage au saut). Xav a
// remplacé ce mouvement par une petite orbite — le ressort n'existe plus, et
// ses tests sont partis avec lui, dans `test_d39_double_orbite_2026-09-20.js`
// qui éprouve la règle qui l'a remplacé. Ce qui reste ici est ce que `D-39`
// ne touche pas et qui doit continuer de tenir : les ornements et le sillage.
//
// Prouvé ici :
//   1. le module de vol ne connaît ni la forme du follet, ni le jeu ;
//   2. le sillage est une 2ᵉ instance de poussiere.js — aucun système neuf ;
//   3. les ornements vivent dans les visuels PARTAGÉS, donc la cinématique
//      du choix les a sans qu'on ait touché à `intro.js`.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { creerPoussiere, avancerPoussiere, bouffeesVisibles } from '../src/poussiere.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), []);

const CONFIG_SILLAGE = catalogues.effets.find((e) => e.id === 'effet_sillage_follet');
const FRAME_MS = 16;

// --- 1. Le module ignore le follet, sa forme et le jeu ------------------
{
  const source = fs.readFileSync(path.join(RACINE, 'src/vol_follet.js'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const mot of ['aura', 'lumiere', 'engagement', 'companion', 'visuel', 'ctx']) {
    assert.ok(!source.includes(mot), `vol_follet.js ne doit jamais connaître "${mot}"`);
  }
  console.log('OK le module de vol ne connaît ni l’aura, ni la lumière, ni la silhouette');
}

// --- 2. Le sillage n'est pas un système neuf ----------------------------
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

// --- 3. Les ornements sont dans les visuels partagés --------------------
{
  // Donc la cinématique du choix les a AUSSI, sans que `intro.js` ait bougé :
  // elle dessine la même entrée de catalogue que le jeu.
  for (const id of ['visuel_follet_feu', 'visuel_follet_eau', 'visuel_follet_terre']) {
    const visuel = catalogues.visuels.find((v) => v.id === id);
    assert.ok(visuel.primitives.length >= 5, `${id} porte ses ornements (${visuel.primitives.length} primitives)`);
    // Fins : les ornements n'écrasent pas la silhouette. Depuis `D-162`
    // (23/09), la silhouette est faite de PLUSIEURS pièces opaques (contour,
    // corps, cœur) : les ornements du vol sont les deux étincelles, dernières
    // pièces du dessin — c'est elles qui restent translucides.
    assert.ok(visuel.primitives.some((p) => p.alpha === undefined && !p.degrade), `${id} : aucune pièce opaque ne porte la silhouette`);
    const etincelles = visuel.primitives.slice(-2);
    assert.ok(
      etincelles.every((p) => p.forme === 'polygone' && p.alpha !== undefined && p.alpha <= 0.6),
      `${id} : les étincelles restent discrètes (alpha <= 0,6)`,
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

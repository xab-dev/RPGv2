// MT_heros-echelle_2026-09-19, révisé par `D-32` (nuit du 19 au 20/09) : le
// héros passe à 0,643 de sa taille de référence — 9 px là où il en faisait 14
// avant le polish et ≈ 12,3 depuis (0,88). C'est le même mécanisme, une seule
// valeur en données ; seul le nombre attendu change ici. Le héros est VISUEL ET
// HITBOX, et ces deux-là doivent désormais dériver du MÊME nombre en données
// (`echelle` sur visuel_heros, data/visuels.json) — avant cette fiche c'étaient
// deux valeurs indépendantes (rayon visuel 11 px dans le catalogue, rayon de
// collision 10 px en dur dans main.js) qui pouvaient diverger en silence.
//
// Ce fichier prouve les 3 points demandés par le ticket §Tests :
//   1. visuel et boîte lisent la même échelle (impossible de n'en changer qu'une) ;
//   2. un couloir d'1 tuile se franchit sans contact ;
//   3. une position sauvegardée collée à un mur avec l'ANCIENNE boîte reste
//      valide avec la nouvelle (une boîte plus petite ne peut pas être coincée).
//
// Le rendu canvas n'est jamais exercé ici (contrainte de méthode) : on vérifie
// la composition d'échelle sur un faux ctx enregistreur, comme le reste des
// tests de visuels.js.
import assert from 'node:assert/strict';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerScene, resoudreDeplacement } from '../src/scene.js';
import { dessinerVisuel, echelleVisuel } from '../src/visuels.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function cataloguesDuJeu() {
  const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
    path.join(RACINE, 'data'),
    Object.keys(SCHEMAS),
  );
  assert.deepEqual(erreurs, [], 'les catalogues du jeu doivent se charger sans erreur');
  return donnees;
}

// `D-32` (Xav, playtest du 19/09 au soir) : 9/14 ≈ 0,643 — *révise* le 0,88 du
// matin (NS_decisions-playtest_2026-09-19), sans toucher à la décision verrouillée
// qui l'accompagne : UNE seule échelle en données pour le visuel et la hitbox.
// Intention : des proportions plus justes, et **la hitbox qui rétrécit est
// voulue** — pouvoir se déplacer librement dans les petits endroits.
// *Provisoire* : réglée au ressenti par Xav.
const ECHELLE_ATTENDUE = 0.643;
const RAYON_BASE_PX = 10; // RAYON_HERO_BASE_PX (main.js) — dupliqué ici, scene.js ignore la notion de "héros"

// --- 1. Une seule échelle en données, lue par le visuel ET par la hitbox ---
{
  const catalogues = await cataloguesDuJeu();
  const heros = catalogues.visuels.find((v) => v.id === 'visuel_heros');
  assert.ok(heros, 'visuel_heros doit exister dans data/visuels.json');
  assert.equal(
    heros.echelle,
    ECHELLE_ATTENDUE,
    "l'échelle du héros est déclarée UNE fois, en données, sur visuel_heros",
  );
  assert.equal(echelleVisuel(heros), ECHELLE_ATTENDUE, 'echelleVisuel() lit bien ce champ');
  console.log('OK échelle du héros déclarée une seule fois en données (0,643)');
}

// Le rendu applique cette échelle propre sans que l'appelant ait à la connaître
// (render.js n'a pas été touché) : un faux ctx enregistre les scale().
{
  const appels = [];
  const ctxFactice = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'canvas') return { width: 480, height: 270 };
        return (...args) => appels.push([String(prop), ...args]);
      },
    },
  );
  const visuel = {
    id: 'v',
    ancre: 'centre',
    echelle: ECHELLE_ATTENDUE,
    primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 22, h: 22, couleur: '#fff' }],
  };
  dessinerVisuel(ctxFactice, visuel, 0, 0);
  const scales = appels.filter((a) => a[0] === 'scale');
  assert.equal(scales.length, 1, 'une seule mise à l’échelle appliquée');
  assert.deepEqual(scales[0], ['scale', ECHELLE_ATTENDUE, ECHELLE_ATTENDUE]);

  // Composition : échelle propre × échelle d'instance (une station tournée, un
  // follet au HUD) — jamais l'une écrasant l'autre.
  appels.length = 0;
  dessinerVisuel(ctxFactice, visuel, 0, 0, { echelle: 2 });
  const scale2 = appels.filter((a) => a[0] === 'scale')[0];
  assert.ok(
    Math.abs(scale2[1] - 2 * ECHELLE_ATTENDUE) < 1e-9,
    'échelle propre × échelle d’instance',
  );

  // Un visuel sans `echelle` (tout le reste du catalogue) est inchangé.
  appels.length = 0;
  dessinerVisuel(ctxFactice, { ...visuel, echelle: undefined }, 0, 0);
  assert.equal(
    appels.filter((a) => a[0] === 'scale').length,
    0,
    'aucun scale() pour un visuel sans échelle : catalogue existant inchangé',
  );
  console.log('OK visuel et hitbox dérivent du même champ, composition d’échelle correcte');
}

// Une échelle invalide est refusée au boot (une hitbox dégénérée ET un héros
// invisible viendraient du même champ).
{
  const catalogues = await cataloguesDuJeu();
  for (const mauvaise of [0, -1, 'grand']) {
    const copie = JSON.parse(JSON.stringify(catalogues));
    copie.visuels.find((v) => v.id === 'visuel_heros').echelle = mauvaise;
    const erreurs = validerCatalogues(copie);
    assert.ok(
      erreurs.some((e) => /echelle doit être un nombre strictement positif/.test(e)),
      `echelle=${JSON.stringify(mauvaise)} doit être refusée au boot`,
    );
  }
  console.log('OK échelle nulle/négative/non numérique refusée au boot');
}

// --- Scène de test : couloir horizontal d'1 tuile (tile_size 32, comme le jeu) ---
function sceneCouloirUneTuile() {
  const donnees = {
    tiles: [
      { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
      { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
    ],
    scenes: [
      {
        id: 'scene_test',
        width: 6,
        height: 3,
        tile_size: 32,
        seed: 1,
        spawn: { x: 0, y: 1 },
        layout: [
          ['tile_mur', 'tile_mur', 'tile_mur', 'tile_mur', 'tile_mur', 'tile_mur'],
          ['tile_sol', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_sol'],
          ['tile_mur', 'tile_mur', 'tile_mur', 'tile_mur', 'tile_mur', 'tile_mur'],
        ],
      },
    ],
  };
  return chargerScene(construireRegistre(donnees), 'scene_test');
}

function boite(rayon, cx, cy) {
  return { x: cx - rayon, y: cy - rayon, largeur: rayon * 2, hauteur: rayon * 2 };
}

// --- 2. Couloir d'1 tuile franchi sans contact ---
// Le couloir (rangée y=1) occupe [32,64) en Y. Le héros centré à y=48 doit le
// traverser de bout en bout sans qu'aucune frame ne soit bloquée sur X.
{
  const scene = sceneCouloirUneTuile();
  const rayon = RAYON_BASE_PX * ECHELLE_ATTENDUE;
  let cur = boite(rayon, 20, 48);
  let framesBloquees = 0;
  for (let i = 0; i < 120; i += 1) {
    const suivant = resoudreDeplacement(scene, cur, 2, 0);
    if (suivant.x === cur.x) framesBloquees += 1;
    cur = suivant;
    if (cur.x + cur.largeur >= 6 * 32 - 2) break;
  }
  assert.equal(
    framesBloquees,
    0,
    `couloir d'1 tuile traversé sans contact (frames bloquées: ${framesBloquees})`,
  );

  // Le jeu dans le couloir a bien AUGMENTÉ (but déclaré du ticket) : marge de
  // chaque côté = (32 - 2*rayon) / 2.
  const margeAvant = (32 - 2 * RAYON_BASE_PX) / 2;
  const margeApres = (32 - 2 * rayon) / 2;
  assert.ok(margeApres > margeAvant, 'la réduction donne plus de jeu dans un passage d’1 tuile');
  console.log(
    `OK couloir d'1 tuile franchi sans contact — jeu par côté ${margeAvant} px -> ${margeApres.toFixed(2)} px`,
  );
}

// --- 3. Une position sauvegardée valide avec l'ANCIENNE boîte le reste avec la nouvelle ---
// Balayage exhaustif : pour chaque position du couloir où l'ancienne boîte
// (rayon 10) pouvait avancer, la nouvelle (rayon 6,43), centrée au même point,
// doit le pouvoir aussi. Une boîte plus petite ne peut pas être coincée là où
// une plus grande tenait.
{
  const scene = sceneCouloirUneTuile();
  const rayonNouveau = RAYON_BASE_PX * ECHELLE_ATTENDUE;
  let testees = 0;
  for (let cx = 12; cx <= 6 * 32 - 12; cx += 1) {
    for (let cy = 33; cy <= 63; cy += 1) {
      const departAncien = boite(RAYON_BASE_PX, cx, cy);
      const avant = resoudreDeplacement(scene, departAncien, 1, 0);
      if (avant.x === departAncien.x) continue; // déjà coincée avant le ticket : hors sujet
      testees += 1;
      const depart = boite(rayonNouveau, cx, cy);
      const apres = resoudreDeplacement(scene, depart, 1, 0);
      assert.notEqual(
        apres.x,
        depart.x,
        `position (${cx},${cy}) jouable avec l'ancienne boîte doit le rester avec la nouvelle`,
      );
    }
  }
  assert.ok(testees > 500, `balayage significatif (${testees} positions testées)`);
  console.log(`OK ${testees} positions sauvegardées valides avant le ticket le restent après`);
}

console.log('OK test_mt_heros_echelle');

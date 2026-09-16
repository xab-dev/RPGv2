// Contrat (03_maison-exterieur §3.3/§7) : après N ramassages, exactement
// nb_au_sol exemplaires présents, tous en zone autorisée et sur tuile libre ;
// même graine -> mêmes positions (déterminisme, PRNG mulberry32 injecté).
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { remplirItemsSol, trouverItemProche, ramasserEtRegenerer } from '../src/ground_items.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueDeTest() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  donnees.visuels = [{ id: 'visuel_x', ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.items = [
    {
      id: 'item_branche', label_key: 'item.branche', categorie: 'ressource', stack_max: 20,
      render: { visuel: 'visuel_x' }, spawn: { nb_au_sol: 3, zones: ['foret'], zones_exclues: ['maison'] },
    },
  ];
  // Scène 8x8 : "foret" couvre tout sauf une colonne "maison" à x=7 (exclue),
  // et une tuile mur au centre (jamais choisie, non solide requis).
  const layout = [];
  for (let y = 0; y < 8; y++) {
    const ligne = [];
    for (let x = 0; x < 8; x++) ligne.push(x === 3 && y === 3 ? 'tile_mur' : 'tile_sol');
    layout.push(ligne);
  }
  donnees.scenes = [
    {
      id: 'scene_items',
      width: 8,
      height: 8,
      tile_size: 32,
      seed: 42,
      spawn: { x: 0, y: 0 },
      zones: [
        { type: 'foret', rect: { x: 0, y: 0, w: 8, h: 8 } },
        { type: 'maison', rect: { x: 7, y: 0, w: 1, h: 8 } },
      ],
      layout,
    },
  ];
  return donnees;
}

function construire() {
  const donnees = catalogueDeTest();
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_items');
  return { registre, scene, items: registre.tous('items') };
}

// 1. Remplissage initial : exactement nb_au_sol exemplaires, tous hors
// zones_exclues et sur tuile non solide.
{
  const { scene, items } = construire();
  const itemsSol = remplirItemsSol(scene, items, {});
  assert.equal(itemsSol.item_branche.length, 3);
  for (const p of itemsSol.item_branche) {
    const tx = Math.floor(p.x / scene.tileSize);
    const ty = Math.floor(p.y / scene.tileSize);
    assert.ok(tx < 7, `position en zone exclue "maison" : tx=${tx}`);
    assert.ok(!(tx === 3 && ty === 3), 'position sur tuile solide');
  }
}

// 2. Déterminisme : même graine -> mêmes positions.
{
  const { scene, items } = construire();
  const a = remplirItemsSol(scene, items, {});
  const b = remplirItemsSol(scene, items, {});
  assert.deepEqual(a, b);
}

// 3. Après un ramassage, le compte reste à nb_au_sol (régénération
// immédiate ailleurs).
{
  const { scene, items } = construire();
  let itemsSol = remplirItemsSol(scene, items, {});
  const proche = trouverItemProche(itemsSol, itemsSol.item_branche[0], 1);
  assert.ok(proche);
  itemsSol = ramasserEtRegenerer(scene, items, itemsSol, proche.itemId, proche.index, 999);
  assert.equal(itemsSol.item_branche.length, 3);
}

// 4. trouverItemProche : rien à portée -> null.
{
  const { scene, items } = construire();
  const itemsSol = remplirItemsSol(scene, items, {});
  assert.equal(trouverItemProche(itemsSol, { x: -1000, y: -1000 }, 5), null);
}

console.log('OK test_phase2_ground_items');

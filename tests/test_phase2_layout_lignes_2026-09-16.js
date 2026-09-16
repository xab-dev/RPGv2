// Contrat (03_maison-exterieur §3.1/§7) : layout en lignes de caractères
// décodé en tuiles identiques au format tableau-de-tableaux ; une légende
// incomplète est un échec dur au boot avec le caractère et la ligne fautifs.
// Les deux formats restent acceptés (aucun test Phase 1 ne rougit, vérifié
// par ailleurs via node tools/run_tests.js).
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueMinimal() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  return donnees;
}

// 1. Layout en lignes valide, décodé par scene.js en tuiles identiques au
// format tableau-de-tableaux équivalent.
{
  const donnees = catalogueMinimal();
  donnees.scenes = [
    {
      id: 'scene_lignes',
      width: 3,
      height: 2,
      tile_size: 32,
      seed: 1,
      spawn: { x: 1, y: 0 },
      legende: { '.': 'tile_sol', M: 'tile_mur' },
      layout: ['.M.', 'MM.'],
    },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `layout lignes valide rejeté :\n${erreurs.join('\n')}`);
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_lignes');
  assert.equal(scene.tuileA(0, 0).id, 'tile_sol');
  assert.equal(scene.tuileA(1, 0).id, 'tile_mur');
  assert.equal(scene.tuileA(2, 1).id, 'tile_sol');
  assert.equal(scene.estSolideAuPoint(1 * 32 + 5, 0 * 32 + 5), true);
  assert.equal(scene.estSolideAuPoint(0 * 32 + 5, 0 * 32 + 5), false);
}

// 2. Légende incomplète : échec dur avec le caractère ET la ligne fautifs.
{
  const donnees = catalogueMinimal();
  donnees.scenes = [
    {
      id: 'scene_legende_incomplete',
      width: 3,
      height: 1,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
      legende: { '.': 'tile_sol' },
      layout: ['.X.'],
    },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('layout[0][1]') && e.includes('"X"')), `erreur attendue introuvable :\n${erreurs.join('\n')}`);
}

// 3. Format tableau-de-tableaux (Phase 0/1) toujours accepté, sans legende.
{
  const donnees = catalogueMinimal();
  donnees.scenes = [
    {
      id: 'scene_tableau',
      width: 2,
      height: 2,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
      layout: [
        ['tile_sol', 'tile_mur'],
        ['tile_mur', 'tile_sol'],
      ],
    },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `format tableau rejeté à tort :\n${erreurs.join('\n')}`);
}

// 4. Une ligne d'une mauvaise longueur (format lignes) est rejetée.
{
  const donnees = catalogueMinimal();
  donnees.scenes = [
    {
      id: 'scene_longueur',
      width: 3,
      height: 1,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
      legende: { '.': 'tile_sol' },
      layout: ['..'],
    },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('layout[0]') && e.includes('3 caractères')));
}

console.log('OK test_phase2_layout_lignes');

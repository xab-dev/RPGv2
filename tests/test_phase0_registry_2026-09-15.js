// Contrat : les données de jeu vivent en JSON externes validés au boot.
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueMinimalValide() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.scenes = [
    {
      id: 'scene_test',
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
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  return donnees;
}

// 1. Le vrai jeu de données du dépôt doit être valide au boot.
{
  const { donnees, erreurs: erreursChargement } = await chargerCataloguesDepuisDisque('data', NOMS);
  assert.deepEqual(erreursChargement, [], 'chargement des vrais catalogues du dépôt');
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `catalogues réels invalides :\n${erreurs.join('\n')}`);

  const registre = construireRegistre(donnees);
  assert.equal(registre.obtenir('elements', 'elem_feu').label_key, 'element.feu');
  assert.equal(registre.tous('elements').length, 3);
}

// 2. Un catalogue minimal correctement formé est accepté.
{
  const donnees = catalogueMinimalValide();
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, []);
}

// 3. id dupliqué dans un même catalogue → rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.elements.push({ id: 'elem_feu', label_key: 'x', icon: 'x', shape: 'x' });
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('id dupliqué')), 'id dupliqué non détecté');
}

// 4. id en collision entre deux catalogues différents → rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.stats.push({ id: 'elem_feu', label_key: 'x', base: 1 });
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('collision')), 'collision entre catalogues non détectée');
}

// 5. champ obligatoire manquant → rejeté.
{
  const donnees = catalogueMinimalValide();
  delete donnees.elements[0].shape;
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('shape') && e.includes('manquant')));
}

// 6. référence croisée cassée → rejetée (unlocks.target -> flags).
{
  const donnees = catalogueMinimalValide();
  donnees.unlocks[0].target = 'flag_inexistant';
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('flag_inexistant') && e.includes('flags.json')));
}

// 7. référence de tuile cassée dans le layout d'une scène → rejetée.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].layout[0][0] = 'tile_inexistante';
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('tile_inexistante')));
}

// 8. seed absent dans une scène → rejeté (pas de valeur par défaut).
{
  const donnees = catalogueMinimalValide();
  delete donnees.scenes[0].seed;
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('seed')));
}

// 9. JSON invalide détecté dès le chargement disque.
{
  const dossierTmp = 'tests/_fixtures_json_invalide';
  const fs = await import('node:fs/promises');
  await fs.mkdir(dossierTmp, { recursive: true });
  await fs.writeFile(`${dossierTmp}/elements.json`, '{ ceci n est pas du json');
  const { erreurs } = await chargerCataloguesDepuisDisque(dossierTmp, ['elements']);
  assert.ok(erreurs.some((e) => e.includes('JSON invalide')));
  await fs.rm(dossierTmp, { recursive: true, force: true });
}

// 10. catalogue absent → rejeté.
{
  const { erreurs } = await chargerCataloguesDepuisDisque('tests', ['catalogue_qui_n_existe_pas']);
  assert.ok(erreurs.some((e) => e.includes('introuvable')));
}

console.log('OK test_phase0_registry');

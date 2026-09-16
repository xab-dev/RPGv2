// Contrat (§3.3/§4) : une porte conditionnelle est un simple mur tant que
// son flag n'est pas posé, et devient franchissable dès qu'il l'est — sans
// recharger la scène. Un portail conditionné dont la condition n'est pas
// remplie ne fait rien (jamais de message, jamais d'exception).
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { creerRegistreFlags } from '../src/flags.js';
import { chargerScene, resoudreDeplacement, portailFranchi } from '../src/scene.js';

function registreDeTest() {
  return construireRegistre({
    flags: [{ id: 'flag_porte', label_key: 'x' }],
    unlocks: [],
    tiles: [
      { id: 'tile_sol', solid: false, render: {} },
      { id: 'tile_mur', solid: true, render: {} },
      { id: 'tile_sortie', solid: false, render: {} },
    ],
    scenes: [
      {
        id: 'scene_test',
        width: 3,
        height: 1,
        tile_size: 32,
        seed: 1,
        spawn: { x: 0, y: 0 },
        portails: [
          { zone: { x: 2, y: 0, w: 1, h: 1 }, cible: 'scene_test', spawn: { x: 0, y: 0 }, condition: 'flag_porte' },
        ],
        portes: [{ position: { x: 2, y: 0 }, flag: 'flag_porte', tile_avant: 'tile_mur', tile_apres: 'tile_sortie' }],
        layout: [['tile_sol', 'tile_sol', 'tile_mur']],
      },
    ],
  });
}

// 1. Sans le flag : la porte est un mur solide (donc infranchissable).
{
  const registre = registreDeTest();
  const flags = creerRegistreFlags(registre);
  const scene = chargerScene(registre, 'scene_test');
  assert.equal(scene.tuileA(2, 0, flags.has).solid, true);

  const hitbox = { x: 33, y: 0, largeur: 8, hauteur: 8 };
  const resultat = resoudreDeplacement(scene, hitbox, 20, 0, flags.has);
  assert.ok(resultat.x < 64, 'la porte fermée doit bloquer comme un mur');
}

// 2. Le flag posé : la même tuile devient non-solide, sans recharger la scène.
{
  const registre = registreDeTest();
  const flags = creerRegistreFlags(registre);
  const scene = chargerScene(registre, 'scene_test');
  flags.set('flag_porte');
  assert.equal(scene.tuileA(2, 0, flags.has).solid, false);
}

// 3. Portail conditionné : ne se déclenche que si la condition est remplie.
{
  const registre = registreDeTest();
  const flags = creerRegistreFlags(registre);
  const scene = chargerScene(registre, 'scene_test');
  const hitbox = { x: 64, y: 0, largeur: 8, hauteur: 8 }; // dans la zone du portail (tuile x=2)

  assert.equal(portailFranchi(scene, hitbox, flags), undefined, 'condition non remplie -> aucun portail');
  flags.set('flag_porte');
  assert.ok(portailFranchi(scene, hitbox, flags), 'condition remplie -> portail détecté');
}

// 4. Portail sans condition : toujours franchi dans sa zone.
{
  const registre = construireRegistre({
    flags: [], unlocks: [],
    tiles: [{ id: 'tile_sol', solid: false, render: {} }],
    scenes: [{
      id: 's', width: 2, height: 1, tile_size: 32, seed: 1, spawn: { x: 0, y: 0 },
      portails: [{ zone: { x: 1, y: 0, w: 1, h: 1 }, cible: 's2', spawn: { x: 0, y: 0 }, condition: null }],
      layout: [['tile_sol', 'tile_sol']],
    }],
  });
  const flags = creerRegistreFlags(registre);
  const scene = chargerScene(registre, 's');
  const hitbox = { x: 32, y: 0, largeur: 8, hauteur: 8 };
  assert.ok(portailFranchi(scene, hitbox, flags));
}

console.log('OK test_phase1_scene_portes');

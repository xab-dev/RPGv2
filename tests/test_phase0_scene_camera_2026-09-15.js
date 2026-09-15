// Contrat : une scène est un layout de tuiles chargé depuis JSON, rendu par
// une caméra bornée ; le décor procédural est déterministe.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { chargerScene, resoudreDeplacement } from '../src/scene.js';
import { calculerCamera } from '../src/camera.js';
import { genererDecor } from '../src/decor.js';

function registreDeTest() {
  const donnees = {
    tiles: [
      { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
      { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
    ],
    scenes: [
      {
        id: 'scene_test',
        width: 5,
        height: 5,
        tile_size: 32,
        seed: 42,
        spawn: { x: 2, y: 2 },
        layout: [
          ['tile_mur', 'tile_mur', 'tile_mur', 'tile_mur', 'tile_mur'],
          ['tile_mur', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_mur'],
          ['tile_mur', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_mur'],
          ['tile_mur', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_mur'],
          ['tile_mur', 'tile_mur', 'tile_mur', 'tile_mur', 'tile_mur'],
        ],
      },
    ],
  };
  // Registre minimal : seuls tiles/scenes sont nécessaires pour ces tests,
  // construireRegistre n'exige que la présence dans SCHEMAS pour indexer.
  return construireRegistre(donnees);
}

// 1. Collision sur tuile solide : un déplacement vers un mur est bloqué.
{
  const registre = registreDeTest();
  const scene = chargerScene(registre, 'scene_test');
  // Hitbox 8x8 centrée en tuile (1,1) = pixels (32,32) à (40,40), à un pixel du mur en x=32.
  const hitbox = { x: 33, y: 64, largeur: 8, hauteur: 8 };
  const resultat = resoudreDeplacement(scene, hitbox, -10, 0); // fonce vers le mur de gauche (x<32)
  assert.equal(resultat.x, 33, 'le déplacement vers un mur ne doit pas être appliqué');
}

// 2. Glissement axe par axe : bloqué en x mais toujours libre de bouger en y.
{
  const registre = registreDeTest();
  const scene = chargerScene(registre, 'scene_test');
  const hitbox = { x: 33, y: 64, largeur: 8, hauteur: 8 };
  const resultat = resoudreDeplacement(scene, hitbox, -10, 5);
  assert.equal(resultat.x, 33);
  assert.equal(resultat.y, 69, 'le mouvement en y doit rester appliqué malgré le blocage en x');
}

// 3. Déplacement libre en zone de sol.
{
  const registre = registreDeTest();
  const scene = chargerScene(registre, 'scene_test');
  const hitbox = { x: 64, y: 64, largeur: 8, hauteur: 8 };
  const resultat = resoudreDeplacement(scene, hitbox, 5, 5);
  assert.equal(resultat.x, 69);
  assert.equal(resultat.y, 69);
}

// 4. Caméra bornée aux limites de la scène.
{
  const camera = calculerCamera({
    cibleX: 1000, cibleY: 1000,
    largeurScene: 160, hauteurScene: 160,
    largeurVue: 800, hauteurVue: 600,
  });
  // Scène plus petite que le viewport sur les deux axes → centrée, pas bornée à 0.
  assert.equal(camera.x, (160 - 800) / 2);
  assert.equal(camera.y, (160 - 600) / 2);
}

// 5. Caméra bornée sur une grande scène (ne dépasse jamais les bords).
{
  const camera = calculerCamera({
    cibleX: 5, cibleY: 5,
    largeurScene: 2000, hauteurScene: 2000,
    largeurVue: 800, hauteurVue: 600,
  });
  assert.equal(camera.x, 0, 'la caméra ne doit jamais afficher au-delà du bord gauche');
  assert.equal(camera.y, 0, 'la caméra ne doit jamais afficher au-delà du bord haut');

  const cameraAutreCoin = calculerCamera({
    cibleX: 1995, cibleY: 1995,
    largeurScene: 2000, hauteurScene: 2000,
    largeurVue: 800, hauteurVue: 600,
  });
  assert.equal(cameraAutreCoin.x, 2000 - 800);
  assert.equal(cameraAutreCoin.y, 2000 - 600);
}

// 6. Décor procédural déterministe : même seed => mêmes appels (mêmes données).
{
  const registre = registreDeTest();
  const scene = chargerScene(registre, 'scene_test');
  const decorA = genererDecor(scene);
  const decorB = genererDecor(scene);
  assert.deepEqual(decorA, decorB, 'deux générations avec le même seed doivent être strictement identiques');
  assert.ok(decorA.length > 0, 'le générateur doit produire au moins un motif sur cette scène');
}

// 7. Un seed différent produit un décor différent.
{
  const registre = registreDeTest();
  const scene = chargerScene(registre, 'scene_test');
  const sceneAutreGraine = { ...scene, seed: 43 };
  const decorA = genererDecor(scene);
  const decorC = genererDecor(sceneAutreGraine);
  assert.notDeepEqual(decorA, decorC);
}

console.log('OK test_phase0_scene_camera');

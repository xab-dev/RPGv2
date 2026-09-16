// Contrat (03_maison-exterieur §2.2, "contrat de performance de la grande
// carte") : la sélection des tuiles à dessiner est bornée par le VIEWPORT,
// jamais par la taille de la scène — pure, testée indépendamment du rendu
// canvas (jamais exercé headless).
import assert from 'node:assert/strict';
import { selectionnerTuilesVisibles } from '../src/render.js';

const TILE = 32;
const VIEWPORT_640x360 = { largeur: 640, hauteur: 360 };

// 1. Caméra à l'origine : fenêtre ~ (20+2) x (12+2) tuiles pour un viewport
// 640x360 (exemple explicite de la fiche §2.2).
{
  const fenetre = selectionnerTuilesVisibles({ x: 0, y: 0 }, VIEWPORT_640x360, TILE);
  const largeurTuiles = fenetre.xFin - fenetre.xDebut;
  const hauteurTuiles = fenetre.yFin - fenetre.yDebut;
  assert.equal(largeurTuiles, 22, `largeur attendue 22, obtenu ${largeurTuiles}`);
  assert.equal(hauteurTuiles, 14, `hauteur attendue 14, obtenu ${hauteurTuiles}`);
}

// 2. La taille de la fenêtre est INDÉPENDANTE de la taille de la scène — même
// résultat (à alignement de tuile égal) que la caméra pointe tôt sur une
// petite scène ou loin dans une scène de 20000px (position alignée sur la
// grille de tuiles pour un compte exact, comme au test 1).
{
  const camAlignee = { x: 156 * TILE, y: 90 * TILE }; // loin dans la carte, toujours multiple de TILE
  const f1 = selectionnerTuilesVisibles(camAlignee, VIEWPORT_640x360, TILE);
  const f2 = selectionnerTuilesVisibles({ x: 0, y: 0 }, VIEWPORT_640x360, TILE);
  assert.equal(f1.xFin - f1.xDebut, f2.xFin - f2.xDebut, 'largeur indépendante de la position');
  assert.equal(f1.yFin - f1.yDebut, f2.yFin - f2.yDebut, 'hauteur indépendante de la position');
  assert.equal(f1.xFin - f1.xDebut, 22);
  assert.equal(f1.yFin - f1.yDebut, 14);
}

// 3. Une caméra à une position non multiple de la taille de tuile ne fait
// pas déborder la fenêtre au-delà de la marge prévue.
{
  const fenetre = selectionnerTuilesVisibles({ x: 17, y: 9 }, VIEWPORT_640x360, TILE);
  assert.ok(fenetre.xFin - fenetre.xDebut <= 23);
  assert.ok(fenetre.yFin - fenetre.yDebut <= 15);
}

// 4. Caméra négative (scène plus petite que le viewport, centrée, cf.
// camera.js) : la fenêtre reste bornée, jamais une explosion de taille —
// quelques tuiles d'écart possibles selon l'alignement exact (cf. tests 1-3),
// jamais démesurée.
{
  const fenetre = selectionnerTuilesVisibles({ x: -100, y: -50 }, VIEWPORT_640x360, TILE);
  assert.ok(fenetre.xFin - fenetre.xDebut <= 23, `largeur bornée attendue, obtenu ${fenetre.xFin - fenetre.xDebut}`);
  assert.ok(fenetre.yFin - fenetre.yDebut <= 15, `hauteur bornée attendue, obtenu ${fenetre.yFin - fenetre.yDebut}`);
}

console.log('OK test_phase2_tuiles_visibles');

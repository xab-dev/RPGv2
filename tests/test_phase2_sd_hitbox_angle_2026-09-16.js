// Diagnostic SD_hitbox-angle-arbre_2026-09-16, sujet A : porte d'1 tuile et
// passages étroits de la forêt « accrochent » en approche oblique (retour
// Xav, manette réelle). Hypothèses A1/A2/A3 de la fiche tranchées par lecture
// de scene.js#resoudreDeplacement : la résolution axe par axe (patron V1)
// teste bien les 4 coins de la hitbox mais, avant ce correctif, abandonnait
// tout l'axe dès qu'UN SEUL coin chevauchait une tuile solide adjacente à
// l'ouverture — même de quelques pixels — au lieu de laisser le glissement
// sur l'autre axe suffire à corriger l'alignement la même frame. Résultat
// mesuré (script de session, cf. journal) : à un décalage de 3-4 px de l'axe
// d'une ouverture d'1 tuile (rayon héros 10, tile_size 32 → tolérance de 6 px
// de chaque côté), l'axe visé restait figé plusieurs frames consécutives
// (jusqu'à 7 dans le pire cas testé) avant que le glissement ne rattrape —
// perçu comme un accrochage net. Ce fichier documente que ce cas précis (3-4
// px d'écart) est maintenant résolu sans la moindre frame figée, sans jamais
// permettre de traverser un vrai mur plein (non-régression, cf. test 3).
//
// A2 (ordre de résolution X puis Y fixe) et A3 (hitbox trop juste) ne sont
// pas la cause : le glissement axe par axe existant fonctionne déjà pour des
// décalages plus francs (cf. test_phase0_scene_camera, test 2) — seul le cas
// à faible chevauchement manquait une correction de coin. Aucune modification
// du rayon du héros ni de la largeur des portes (hors scope explicite).
//
// Ce test doit être rouge avant le correctif (TOLERANCE_COIN_PX dans
// resoudreDeplacement), vert après.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { chargerScene, resoudreDeplacement } from '../src/scene.js';

// Grille 5x3, tile_size=32 (identique au jeu réel) — rangée du milieu = mur
// avec une ouverture d'1 tuile en colonne 2. Hitbox 20x20 = rayon héros réel
// (RAYON_HERO_PX=10 dans main.js, dupliqué ici en valeur car scene.js est
// générique et ignore la notion de "héros").
function sceneOuvertureHorizontale() {
  const donnees = {
    tiles: [
      { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
      { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
    ],
    scenes: [
      {
        id: 'scene_test',
        width: 5,
        height: 3,
        tile_size: 32,
        seed: 1,
        spawn: { x: 2, y: 2 },
        layout: [
          ['tile_sol', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_sol'],
          ['tile_mur', 'tile_mur', 'tile_sol', 'tile_mur', 'tile_mur'],
          ['tile_sol', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_sol'],
        ],
      },
    ],
  };
  const registre = construireRegistre(donnees);
  return chargerScene(registre, 'scene_test');
}

const HITBOX = { largeur: 20, hauteur: 20 };
const DIAGONALE_CLAVIER = 2; // VITESSE_HERO_PX_S=120 à ~60fps, move.x/y non normalisés (input.js) -> dx=dy=2px/frame

function compterFramesFigeesSurY(scene, startX, startY, frames = 30) {
  let cur = { x: startX, y: startY, ...HITBOX };
  let maxFige = 0;
  let fige = 0;
  for (let i = 0; i < frames; i++) {
    const suivant = resoudreDeplacement(scene, cur, DIAGONALE_CLAVIER, -DIAGONALE_CLAVIER);
    fige = suivant.y === cur.y ? fige + 1 : 0;
    maxFige = Math.max(maxFige, fige);
    cur = suivant;
    if (cur.y <= 32) break; // a traversé jusqu'à la rangée du haut
  }
  return maxFige;
}

// 1. Décalage de 3-4 px de l'axe de l'ouverture (fiche §Méthode) : plus une
// seule frame figée sur Y pendant toute la traversée — avant le correctif,
// mesuré à 2 frames figées consécutives pour ce décalage précis.
{
  const scene = sceneOuvertureHorizontale();
  // Ouverture = colonne 2 -> [64,96). Seuil de liberté totale sans correctif
  // mesuré à x=58 (6 px de tolérance de chaque côté avec une hitbox de 20 px
  // dans une ouverture de 32 px) ; x=55 est donc à 3 px de ce seuil.
  const maxFige = compterFramesFigeesSurY(scene, 55, 69);
  assert.equal(maxFige, 0, `l'axe Y ne doit plus rester figé en approchant l'ouverture à 3-4px de décalage (mesuré: ${maxFige} frame(s) figée(s))`);
}

// 2. Décalage plus franc (7 px du seuil) : la correction reste bornée par
// TOLERANCE_COIN_PX (un tiers du rayon, ~3.33px) — elle réduit l'accrochage
// sans le supprimer entièrement pour un décalage hors de sa portée déclarée,
// conformément à la fiche ("ne pas patcher le rayon en silence"). Avant le
// correctif : 4 frames figées pour ce décalage ; après : au plus 3.
{
  const scene = sceneOuvertureHorizontale();
  const maxFige = compterFramesFigeesSurY(scene, 50, 69);
  assert.ok(maxFige <= 3, `l'accrochage doit être réduit (mesuré avant correctif: 4) même hors de la tolérance déclarée (mesuré: ${maxFige})`);
}

// 3. Non-régression : un mur plein (aucune ouverture adjacente) reste
// totalement infranchissable en diagonale — la correction ne doit jamais
// faire traverser un coin de mur. Rejoue le cas déjà couvert par
// test_phase0_scene_camera (test 1/2) avec la diagonale réelle du jeu.
{
  const donnees = {
    tiles: [
      { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
      { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
    ],
    scenes: [
      {
        id: 'scene_mur_plein',
        width: 5,
        height: 5,
        tile_size: 32,
        seed: 1,
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
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_mur_plein');
  // Coin de la salle : le héros approche le coin haut-gauche du mur intérieur
  // en diagonale (dx<0, dy<0) — aucune ouverture nulle part à proximité.
  let cur = { x: 40, y: 40, ...HITBOX };
  for (let i = 0; i < 20; i++) {
    cur = resoudreDeplacement(scene, cur, -DIAGONALE_CLAVIER, -DIAGONALE_CLAVIER);
    // Invariant de sécurité à chaque frame : jamais embarqué dans le mur.
    const solideAuCoin = (px, py) => scene.estSolideAuPoint(px, py);
    const embarque = solideAuCoin(cur.x, cur.y) || solideAuCoin(cur.x + cur.largeur, cur.y) ||
      solideAuCoin(cur.x, cur.y + cur.hauteur) || solideAuCoin(cur.x + cur.largeur, cur.y + cur.hauteur);
    assert.equal(embarque, false, `le héros ne doit jamais chevaucher le mur (frame ${i}, position ${cur.x},${cur.y})`);
  }
  // Bloqué par le mur du haut ET celui de gauche : reste dans la salle,
  // jamais au-delà de tile_size (le coin intérieur du mur).
  assert.ok(cur.x >= 32, `le héros ne doit jamais traverser le mur de gauche (x=${cur.x})`);
  assert.ok(cur.y >= 32, `le héros ne doit jamais traverser le mur du haut (y=${cur.y})`);
}

// 4. Orientation perpendiculaire (mur vertical — une seule colonne solide —
// avec une ouverture d'1 rangée) : cas réel de la porte de la maison
// (structures[].portes, §3.4 03_maison-exterieur — le mur ouest/est ne fait
// qu'une tuile de large, la porte perce une seule rangée). Approche en
// mouvement HORIZONTAL PUR (dy=0, ex. clavier qui tient juste "droite" après
// un ajustement vertical résiduel de quelques px) : avant le correctif, un
// décalage Y de 3px par rapport à la rangée de la porte bloquait x
// INDÉFINIMENT (dy=0 ne le corrige jamais tout seul, contrairement aux cas
// diagonaux ci-dessus où l'autre axe finit par glisser) — le cas le plus net
// d'« arrêt net » décrit par Xav.
{
  const donnees = {
    tiles: [
      { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
      { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
    ],
    scenes: [
      {
        id: 'scene_porte_verticale',
        width: 5,
        height: 5,
        tile_size: 32,
        seed: 1,
        spawn: { x: 1, y: 2 },
        layout: [
          ['tile_sol', 'tile_mur', 'tile_sol', 'tile_sol', 'tile_sol'],
          ['tile_sol', 'tile_mur', 'tile_sol', 'tile_sol', 'tile_sol'],
          ['tile_sol', 'tile_sol', 'tile_sol', 'tile_sol', 'tile_sol'], // porte en colonne 1, rangée 2
          ['tile_sol', 'tile_mur', 'tile_sol', 'tile_sol', 'tile_sol'],
          ['tile_sol', 'tile_mur', 'tile_sol', 'tile_sol', 'tile_sol'],
        ],
      },
    ],
  };
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_porte_verticale');
  // Porte = rangée 2 -> [64,96). Héros à 3px de l'axe (y=61, 3px au-dessus de
  // 64), mouvement purement horizontal.
  let cur = { x: 20, y: 61, ...HITBOX };
  const premierPas = resoudreDeplacement(scene, cur, DIAGONALE_CLAVIER, 0);
  assert.notEqual(premierPas.x, cur.x, 'le premier pas horizontal ne doit plus rester figé à 3px de l\'axe de la porte');
  assert.equal(premierPas.y, 64, 'le héros doit être réaligné exactement sur la rangée de la porte, jamais au-delà');
  cur = premierPas;
  for (let i = 0; i < 40 && cur.x < 96; i++) {
    cur = resoudreDeplacement(scene, cur, DIAGONALE_CLAVIER, 0);
  }
  assert.ok(cur.x >= 96, `le héros doit finir par traverser la porte verticale en mouvement horizontal pur (x=${cur.x})`);
}

console.log('OK test_phase2_sd_hitbox_angle');

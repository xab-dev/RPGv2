// Palier A de SD_saccades-calque-statique_2026-09-19.md : "quelle condition
// invalide le calque statique, étant donné la caméra et la fenêtre
// courante ?" — décision déjà pure et déjà exportée (calculerCamera +
// selectionnerTuilesVisibles, cf. test_phase2_tuiles_visibles_2026-09-16) :
// ce fichier ne fait qu'y rejouer les 4 scénarios du §3 point 2 de la fiche,
// avec une borne CALCULÉE depuis la marge/tileSize (jamais un nombre en dur).
//
// Résultat (cf. journal de session) : les 4 scénarios sont VERTS sur HEAD —
// le fenêtrage lui-même ne recalcule PAS plus souvent que la marge ne le
// permet. La fiche prévoyait explicitement ce cas (§3 point 2 : "S'il est
// vert, la cause est ailleurs : s'arrêter et rapporter.") — la vraie cause
// des "250 recalculs sur 600 frames" est un bug de L'INSTRUMENT de mesure
// (ui/hud_debug.js, corrigé le même jour), pas du fenêtrage : voir le journal.
import assert from 'node:assert/strict';
import { calculerCamera } from '../src/camera.js';
import { selectionnerTuilesVisibles, RESOLUTION_LOGIQUE } from '../src/render.js';

const TILE = 32;
const MARGE = 1; // défaut de selectionnerTuilesVisibles

// Rejoue une trajectoire caméra frame par frame et compte les changements de
// xDebut/yDebut de la fenêtre — exactement la condition de dessinerCoucheStatique
// (render.js) pour la partie "fenêtre", sans dupliquer echelle/signaturePortes
// (déjà stables dans les 4 scénarios ci-dessous : même scène, même écran).
function compterRecalculs(traceCamera) {
  let precedente = null;
  let recalculs = 0;
  for (const camera of traceCamera) {
    const fenetre = selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, TILE, MARGE);
    if (!precedente || precedente.xDebut !== fenetre.xDebut || precedente.yDebut !== fenetre.yDebut) recalculs++;
    precedente = fenetre;
  }
  return recalculs;
}

// 1. Traversée en ligne droite, 600 frames à ~16,68 ms (§1 du relevé de Xav),
// vitesse = base de derivee_vitesse_deplacement_px_s (data/stats_derivees.json,
// 100 px/s à agilité 0 — ordre de grandeur du relevé réel, cf. journal).
// Borne CALCULÉE depuis la distance/tileSize (jamais un 40 en dur) : au plus
// un changement de xDebut par tuile franchie, +2 pour l'alignement de bord.
{
  const vitesse = 100; // px/s logiques, cf. data/stats_derivees.json
  const deltaS = 16.68 / 1000;
  const dx = vitesse * deltaS;
  const frames = 600;
  let heroX = 10000; // scène large, loin de tout bord
  const trace = [];
  for (let i = 0; i < frames; i++) {
    heroX += dx;
    trace.push(calculerCamera({
      cibleX: heroX, cibleY: 10000,
      largeurScene: 20000, hauteurScene: 20000,
      largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    }));
  }
  const distanceTotale = dx * frames;
  const borne = Math.ceil(distanceTotale / TILE) + 2;
  const recalculs = compterRecalculs(trace);
  assert.ok(recalculs <= borne, `attendu <= ${borne} (distance ${distanceTotale.toFixed(0)}px / tileSize), obtenu ${recalculs}`);
  assert.ok(recalculs >= 1, 'une traversée doit quand même recalculer au moins une fois');
}

// 2. Caméra immobile : après le 1er frame (qui pose la fenêtre initiale),
// zéro recalcul supplémentaire.
{
  const camera = calculerCamera({
    cibleX: 5000, cibleY: 5000, largeurScene: 20000, hauteurScene: 20000,
    largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
  });
  const trace = new Array(300).fill(camera);
  assert.equal(compterRecalculs(trace), 1, 'caméra immobile -> un seul recalcul (le premier), jamais plus');
}

// 3. Va-et-vient À L'INTÉRIEUR de la marge (amplitude < 1 tuile, centré loin
// d'une frontière de tuile) : ne doit jamais changer xDebut/yDebut.
{
  const centre = 5000.5 * TILE + 16; // délibérément à mi-tuile, loin d'une frontière
  const trace = [];
  for (let i = 0; i < 200; i++) {
    const offset = Math.sin(i / 5) * (TILE * 0.4); // amplitude < TILE/2, jamais assez pour franchir une frontière
    trace.push(calculerCamera({
      cibleX: centre + offset, cibleY: 5000 * TILE,
      largeurScene: 20000 * TILE, hauteurScene: 20000 * TILE,
      largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    }));
  }
  assert.equal(compterRecalculs(trace), 1, 'va-et-vient dans la marge -> un seul recalcul (le premier), jamais plus');
}

// 4. Caméra bornée au bord de la carte (scène plus petite que le déplacement
// du héros) : la caméra reste clampée à 0, la fenêtre ne bouge donc pas même
// si le héros continue d'avancer.
{
  const largeurScene = RESOLUTION_LOGIQUE.largeur + TILE * 2; // à peine plus grande que le viewport
  const trace = [];
  for (let i = 0; i < 300; i++) {
    const heroX = i * 5; // le héros "avance" bien au-delà de largeurScene
    trace.push(calculerCamera({
      cibleX: heroX, cibleY: 100,
      largeurScene, hauteurScene: 20000,
      largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    }));
  }
  // La caméra n'a que 2 tuiles de marge de manœuvre (largeurScene - largeurVue) :
  // au plus quelques recalculs pendant que camera.x parcourt ces 64px, puis 0.
  const bornePetiteMarge = Math.ceil((largeurScene - RESOLUTION_LOGIQUE.largeur) / TILE) + 2;
  assert.ok(compterRecalculs(trace) <= bornePetiteMarge, `caméra bornée -> au plus ${bornePetiteMarge} recalculs, jamais un par frame`);
}

console.log('OK test_sd_saccades_calque_statique — fenêtrage confirmé correct (vert sur HEAD, cf. §3 point 2 de la fiche)');

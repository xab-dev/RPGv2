// `D-01`, palier A de `specs/09_reglages-graphiques.md` : le calque statique
// ne se reconstruit plus à chaque tuile franchie, mais seulement quand la vue
// SORT de la zone déjà pré-rendue.
//
// Ce qui change, et pourquoi ce n'est pas un réglage : la fenêtre bâtie porte
// déjà une marge de 1 tuile ENTIÈRE, plus la fraction de tuile que `floor` et
// `ceil` ajoutent de chaque côté — entre 1 et 2 tuiles de rab, 1,5 en moyenne.
// Cette marge existait depuis la Phase 2 et ne servait qu'à couvrir les tuiles
// coupées au bord : personne ne s'en servait comme d'un amortisseur, parce que
// la condition de reconstruction comparait `xDebut`/`yDebut` d'une frame à
// l'autre — un franchissement de tuile décale `xDebut` de 1, donc reconstruit,
// alors que le calque couvrait encore parfaitement la vue.
//
// La décision est désormais UNE fonction (`calqueDoitEtreReconstruit`), que le
// rendu et ce test appellent tous les deux — jamais une condition recopiée ici
// « comme dans render.js » (règle née de `D-71`/`D-72`).
import assert from 'node:assert/strict';
import { calculerCamera } from '../src/camera.js';
import { calqueDoitEtreReconstruit, selectionnerTuilesVisibles, RESOLUTION_LOGIQUE } from '../src/render.js';

const TILE = 32;
const ECHELLE = 4; // échelle naturelle d'un écran 1920x1080, cf. relevés du §6

// Rejoue une trajectoire caméra frame par frame en passant par LA décision du
// rendu, et rend le nombre de reconstructions. Le calque « bâti » est simulé
// par la même fenêtre que construit `construireCoucheStatique`.
function compterRecalculs(traceCamera, { tileSize = TILE, echelle = ECHELLE } = {}) {
  let calque = null;
  let recalculs = 0;
  for (const camera of traceCamera) {
    const contexte = { sceneId: 'scene_test', echelle, signaturePortes: '', camera, tileSize, resolution: RESOLUTION_LOGIQUE };
    if (calqueDoitEtreReconstruit(calque, contexte)) {
      recalculs++;
      calque = { sceneId: 'scene_test', echelle, signaturePortes: '', ...selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, tileSize) };
    }
  }
  return recalculs;
}

function traceLigneDroite(frames, dx, { depart = 10000 } = {}) {
  const trace = [];
  let heroX = depart;
  for (let i = 0; i < frames; i++) {
    heroX += dx;
    trace.push(calculerCamera({
      cibleX: heroX, cibleY: 10000,
      largeurScene: 20000, hauteurScene: 20000,
      largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    }));
  }
  return trace;
}

// 1. LE CONTRAT DE CORRECTION, celui qui ne se négocie pas : tant qu'on ne
// reconstruit pas, le rectangle source du `drawImage` tient ENTIÈREMENT dans
// le calque. Une vue qui déborderait donnerait une bande vide au bord de
// l'écran — le défaut que le test doit rendre impossible.
{
  const trace = traceLigneDroite(1200, 75 * (16.68 / 1000));
  let calque = null;
  for (const camera of trace) {
    const contexte = { sceneId: 's', echelle: ECHELLE, signaturePortes: '', camera, tileSize: TILE, resolution: RESOLUTION_LOGIQUE };
    if (calqueDoitEtreReconstruit(calque, contexte)) {
      calque = { sceneId: 's', echelle: ECHELLE, signaturePortes: '', ...selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, TILE) };
    }
    // Exactement le calcul de `dessinerCoucheStatique`, en pixels physiques.
    const sourceX = (camera.x - calque.xDebut * TILE) * ECHELLE;
    const sourceY = (camera.y - calque.yDebut * TILE) * ECHELLE;
    const largeurCalque = Math.max(1, Math.round((calque.xFin - calque.xDebut) * TILE * ECHELLE));
    const hauteurCalque = Math.max(1, Math.round((calque.yFin - calque.yDebut) * TILE * ECHELLE));
    assert.ok(sourceX >= 0 && sourceY >= 0, 'le rectangle source ne peut pas être négatif');
    assert.ok(sourceX + RESOLUTION_LOGIQUE.largeur * ECHELLE <= largeurCalque, 'la vue déborde du calque à droite');
    assert.ok(sourceY + RESOLUTION_LOGIQUE.hauteur * ECHELLE <= hauteurCalque, 'la vue déborde du calque en bas');
  }
}

// 2. L'INTENTION DU TICKET, dite en RELATION et jamais en chiffre (règle
// `D-52`) : sur une même traversée, la marge amortit — strictement moins de
// reconstructions qu'un recalcul par tuile franchie.
{
  const dx = 75 * (16.68 / 1000);
  const frames = 1200;
  const trace = traceLigneDroite(frames, dx);
  const tuilesFranchies = Math.floor((dx * frames) / TILE);
  const recalculs = compterRecalculs(trace);
  assert.ok(recalculs >= 1, 'une traversée doit quand même reconstruire au moins une fois');
  assert.ok(
    recalculs < tuilesFranchies,
    `amorti attendu : moins d'une reconstruction par tuile franchie (${tuilesFranchies} tuiles), obtenu ${recalculs}`
  );
}

// 3. La marge vaut au moins une tuile entière : entre deux reconstructions, la
// caméra a parcouru plus d'une tuile. Se déduit de la géométrie (marge de 1
// tuile pleine de chaque côté), donc c'est un contrat, pas un réglage.
{
  const dx = 75 * (16.68 / 1000);
  const frames = 1200;
  const distance = dx * frames;
  const recalculs = compterRecalculs(traceLigneDroite(frames, dx));
  const parcouruParRecalcul = distance / recalculs;
  assert.ok(
    parcouruParRecalcul > TILE,
    `attendu plus d'une tuile parcourue par reconstruction, obtenu ${parcouruParRecalcul.toFixed(1)}px pour ${TILE}px de tuile`
  );
}

// 4. Ce qui invalide le calque hors déplacement reste intact : scène, échelle,
// état des portes. Une porte qui s'ouvre pendant qu'on est immobile dans la
// salle DOIT reconstruire (Phase 1 §3.3), la marge n'y change rien.
{
  const camera = calculerCamera({
    cibleX: 5000, cibleY: 5000, largeurScene: 20000, hauteurScene: 20000,
    largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
  });
  const base = { sceneId: 'scene_a', echelle: ECHELLE, signaturePortes: '00', camera, tileSize: TILE, resolution: RESOLUTION_LOGIQUE };
  const calque = { sceneId: 'scene_a', echelle: ECHELLE, signaturePortes: '00', ...selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, TILE) };

  assert.equal(calqueDoitEtreReconstruit(calque, base), false, 'immobile, même scène, mêmes portes -> aucun recalcul');
  assert.equal(calqueDoitEtreReconstruit(null, base), true, 'pas encore de calque -> recalcul');
  assert.equal(calqueDoitEtreReconstruit(calque, { ...base, sceneId: 'scene_b' }), true, 'changement de scène -> recalcul');
  assert.equal(calqueDoitEtreReconstruit(calque, { ...base, echelle: ECHELLE + 1 }), true, 'changement d\'échelle -> recalcul');
  assert.equal(calqueDoitEtreReconstruit(calque, { ...base, signaturePortes: '10' }), true, 'porte ouverte -> recalcul');
}

// 5. Caméra immobile, 300 frames : une seule construction. (Repris de
// `test_sd_saccades_calque_statique_2026-09-19`, qui posait déjà ce contrat.)
{
  const camera = calculerCamera({
    cibleX: 5000, cibleY: 5000, largeurScene: 20000, hauteurScene: 20000,
    largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
  });
  assert.equal(compterRecalculs(new Array(300).fill(camera)), 1, 'caméra immobile -> une seule construction');
}

// 6. Aller-retour : revenir sur ses pas ne doit pas reconstruire tant qu'on
// reste dans la zone pré-rendue — c'est le cas que l'ancienne condition
// ratait le plus bêtement (franchir une frontière de tuile dans un sens puis
// dans l'autre reconstruisait deux fois).
{
  const trace = [];
  const centre = 5000 * TILE;
  for (let i = 0; i < 400; i++) {
    const offset = Math.sin(i / 40) * TILE * 0.9; // franchit des frontières de tuile, reste dans la marge
    trace.push(calculerCamera({
      cibleX: centre + offset, cibleY: centre,
      largeurScene: 20000 * TILE, hauteurScene: 20000 * TILE,
      largeurVue: RESOLUTION_LOGIQUE.largeur, hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    }));
  }
  assert.equal(compterRecalculs(trace), 1, 'va-et-vient dans la zone pré-rendue -> une seule construction');
}

console.log('OK test_d01_calque_amorti — la vue sort du calque avant qu\'il ne soit reconstruit');

// `D-290` — l'ouverture cède la place au contour (spec 17, palier C ; Xav,
// 26/09 : « > 328° nous voyons encore un peu de face donc la lueur du globe.
// < 328° on commence a voir de dos, donc le contour du personnage »).
//
// Contrats (`poses.js#poseAAngle`, clé de pièce `efface: [début, fin]`) :
// 1. Sur un segment entre une clé où la pièce se voit et une où elle est
//    cachée : avant le début, l'éclat d'avant (rien ne change) ; après la
//    fin, nul ; entre les deux, jamais au-dessus de l'éclat d'avant, et
//    décroissant vers la clé cachée.
// 2. Une pièce qui passe derrière (son rideau) n'en est pas touchée.
// 3. Démarrage : un `efface` mal formé est refusé.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import { ORIENTATIONS } from '../src/orientation.js';
import { poseAAngle, poseVisible } from '../src/poses.js';
import { VISUEL_HEROS_ID } from '../src/save.js';
import { validerCatalogues } from '../src/registry.js';
import { cataloguesValides } from './aide_dessin.js';

const { donnees, HEROS } = await cataloguesValides();
const PAS = 360 / ORIENTATIONS.length;
const piece = Object.keys(HEROS.pieces).find((p) => HEROS.pieces[p].efface);
assert.ok(piece, 'une pièce s\'efface');
const [debut, fin] = HEROS.pieces[piece].efface;
const sans = structuredClone(HEROS);
delete sans.pieces[piece].efface;

// --- 1. Le long d'un segment vers une clé cachée ------------------------------------------
{
  let segments = 0;
  ORIENTATIONS.forEach((o, i) => {
    const suivante = ORIENTATIONS[(i + 1) % ORIENTATIONS.length];
    const [va, vb] = [poseVisible(HEROS, o, piece), poseVisible(HEROS, suivante, piece)];
    if ((va === null) === (vb === null)) return;
    segments += 1;
    let avant = Infinity;
    for (let d = 1; d < PAS; d += 1) {
      const angle = i * PAS + d;
      const vers = va === null ? 1 - d / PAS : d / PAS;
      const [a, a0] = [poseAAngle(HEROS, angle, piece).alpha ?? 1, poseAAngle(sans, angle, piece).alpha ?? 1];
      if (vers <= debut) assert.equal(a, a0, `${angle}° : avant le début, l'éclat d'avant`);
      else if (vers >= fin) assert.equal(a, 0, `${angle}° : après la fin, nul`);
      else assert.ok(a <= a0, `${angle}° : jamais au-dessus de l'éclat d'avant`);
      // Décroissant vers la clé cachée : parcouru depuis la clé visible.
      const k = va === null ? PAS - d : d;
      if (k === d) { assert.ok(a <= avant + 1e-12, `${angle}° : décroissant`); avant = a; }
    }
  });
  assert.ok(segments > 0, 'au moins un segment vers une clé cachée');
  console.log(`OK efface : ${segments} segments, l'éclat d'avant jusqu'au début, nul après la fin`);
}

// --- 2. Une pièce qui passe derrière n'en est pas touchée ---------------------------------
{
  const derriere = Object.keys(HEROS.pieces).find((p) => HEROS.pieces[p].passe_derriere);
  const v = structuredClone(HEROS);
  v.pieces[derriere].efface = [0, 0.1];
  for (let a = 0; a < 360; a += 1) assert.deepEqual(poseAAngle(v, a, derriere), poseAAngle(HEROS, a, derriere), `${a}°`);
  console.log('OK passe derrière : son rideau, sans effacement');
}

// --- 3. Démarrage ------------------------------------------------------------------
{
  for (const efface of [[0.5], [0.8, 0.2], [-0.1, 0.5], [0.2, 1.5], 'oui']) {
    const copie = structuredClone(donnees);
    copie.visuels.find((e) => e.id === VISUEL_HEROS_ID).pieces[piece].efface = efface;
    assert.ok(validerCatalogues(copie).some((e) => e.includes('efface?:')), JSON.stringify(efface));
  }
  console.log('OK démarrage');
}

console.log('OK test_d290_efface');

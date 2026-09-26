// `D-276` — le saut de la capuche au passage de `sud` et de `nord`. Entre une
// clé non reflétée et sa voisine en reflet, tout le segment se dessine en
// reflet, la clé tenant lieu de sa propre source (`poses.js#melanger`) : à
// 89°, `sud` tel quel ; à 91°, `sud` reflété. Si les deux ne dessinent pas la
// même chose, le héros saute d'un coup en passant la clé — ce qu'on voyait :
// le dessin d'auteur de la capuche penchait à droite, `sud` le redressait
// d'un pli de −8°, que le reflet changeait en +8°. Xav, 26/09 : « Capuche
// symétrique » (le dessin d'auteur retouché, plutôt qu'un correctif de pose).
//
// Contrat : à toute clé qui borde un reflet, chaque pièce visible dessine, en
// reflet, ce qu'elle dessine telle quelle :
// - une pièce `miroir` (son dessin se retourne) : les mêmes points posés, au
//   même style — le liseré clair reflété prend le ton du sombre (`reflet`),
//   et tombe exactement sur le liseré sombre ;
// - une autre pièce (seule sa place se reflète) : la même matrice. Son
//   DESSIN peut pencher (la pointe rabattue du dos, `D-277`) : il ne se
//   retourne jamais ; sa POSE, elle, se retourne — une pente s'écrit donc
//   dans le dessin, jamais en cisaillement de la pose d'une telle clé.
// Aucune valeur de réglage n'est épinglée : tout se lit dans les données.
import assert from 'node:assert/strict';
import { ORIENTATIONS } from '../src/orientation.js';
import { definitionPiece, poseVisible, matricePose, primitivePosee, poserPoint } from '../src/poses.js';
import { cataloguesValides } from './aide_dessin.js';

const { donnees, HEROS } = await cataloguesValides();

// Les clés non reflétées dont une voisine l'est : là où le reflet commence.
const reflechies = new Set(Object.keys(HEROS.reflets));
const bords = ORIENTATIONS.filter((d, i) => !reflechies.has(d)
  && [ORIENTATIONS[(i + 1) % 8], ORIENTATIONS[(i + 7) % 8]].some((v) => reflechies.has(v)));
assert.ok(bords.length > 0, 'au moins une clé borde un reflet');

// Au centième près : sous le pixel à toutes les échelles du jeu.
const arrondi = (n) => (Math.abs(n) < 0.005 ? 0 : Math.round(n * 100) / 100);
const pieces = [...new Set(HEROS.primitives.map((p) => p.piece).filter(Boolean))];

// Ce que dessine une pièce miroir : chaque primitive, ses points posés
// (triés : le reflet parcourt le polygone dans l'autre sens) et son alpha.
function empreinte(piece, pose) {
  return HEROS.primitives.filter((p) => p.piece === piece && p.points).map((p) => {
    const posee = primitivePosee(HEROS, piece, p, pose);
    const points = p.points.map(([x, y]) => poserPoint(HEROS, piece, pose, [x + (p.dx || 0), y + (p.dy || 0)]))
      .map(([x, y]) => `${arrondi(x)},${arrondi(y)}`).sort().join(' ');
    return `${posee.alpha ?? 1}|${posee.couleur ?? ''}|${points}`;
  }).sort();
}

for (const d of bords) {
  for (const piece of pieces) {
    const pose = poseVisible(HEROS, d, piece);
    if (pose == null) continue;
    const reflet = { ...pose, reflet: true };
    if (definitionPiece(HEROS, piece).miroir) {
      assert.deepEqual(empreinte(piece, reflet), empreinte(piece, pose), `${d}, ${piece} : le reflet dessine la même capuche`);
    } else {
      assert.deepEqual(matricePose(HEROS, piece, reflet).map(arrondi), matricePose(HEROS, piece, pose).map(arrondi),
        `${d}, ${piece} : le reflet pose la pièce au même endroit`);
    }
  }
}
console.log(`OK ${bords.join(', ')} : chaque pièce dessine en reflet ce qu'elle dessine telle quelle — aucun saut au passage de la clé`);
console.log('OK test_d276_capuche_symetrique');

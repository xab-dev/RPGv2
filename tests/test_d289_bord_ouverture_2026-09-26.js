// `D-289` — le globe caché par le bord de l'ouverture (spec 17, palier C ;
// Xav, 26/09 : « on ne le voit pas si il est derrière le bord du liseret »).
//
// Contrats :
// 1. `passe_derriere.bord_de` : pendant le passage (rideau > 0), chaque
//    primitive de la pièce se découpe d'abord par le `trou` de la pièce
//    nommée — une découpe de plus par primitive ; hors du passage, aucune.
// 2. Sans `bord_de`, le dessin d'avant.
// 3. Démarrage : `bord_de` doit nommer une autre pièce qui porte un `trou`.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import { poseAAngle } from '../src/poses.js';
import { VISUEL_HEROS_ID } from '../src/save.js';
import { validerCatalogues } from '../src/registry.js';
import { cataloguesValides, ordresDessin } from './aide_dessin.js';

const { donnees, HEROS } = await cataloguesValides();
const piece = Object.keys(HEROS.pieces).find((p) => HEROS.pieces[p].passe_derriere?.bord_de);
assert.ok(piece, 'une pièce se cache derrière un bord');
const reglage = (bord) => {
  const v = structuredClone(HEROS);
  if (bord === undefined) delete v.pieces[piece].passe_derriere.bord_de;
  return v;
};
const primitives = HEROS.primitives.filter((p) => p.piece === piece).length;
const clips = (visuel, angle) => ordresDessin(visuel, { angle, echelle: 3 }).filter((a) => a[0] === 'clip').length;
const passage = [...Array(360).keys()].find((a) => poseAAngle(HEROS, a, piece)?.rideau > 0);
const ailleurs = [...Array(360).keys()].find((a) => poseAAngle(HEROS, a, piece) && !(poseAAngle(HEROS, a, piece).rideau > 0));
assert.ok(passage !== undefined && ailleurs !== undefined);

// --- 1 et 2. La découpe, pendant le passage seulement ------------------------------------
assert.equal(clips(HEROS, passage) - clips(reglage(undefined), passage), primitives, 'une découpe par le trou, par primitive');
assert.deepEqual(ordresDessin(HEROS, { angle: ailleurs, echelle: 3 }), ordresDessin(reglage(undefined), { angle: ailleurs, echelle: 3 }), 'hors du passage, rien ne change');
console.log('OK bord : le trou découpe la pièce pendant son passage, et là seulement');

// --- 3. Démarrage ------------------------------------------------------------------
{
  const refuse = (bord) => {
    const copie = structuredClone(donnees);
    copie.visuels.find((e) => e.id === VISUEL_HEROS_ID).pieces[piece].passe_derriere.bord_de = bord;
    assert.ok(validerCatalogues(copie).some((e) => e.includes('passe_derriere > bord_de doit nommer')), String(bord));
  };
  refuse(piece);
  refuse('pointe_rabattue');
  refuse('inconnue');
  console.log('OK démarrage');
}

console.log('OK test_d289_bord_ouverture');

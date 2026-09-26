// `D-286` et `D-287` — le rideau de l'œil (spec 17, palier C ; Xav, 26/09 :
// « donner une forme concave à la bordure de l'ombre » ; « c'est une ombre pas
// un masque »).
//
// Contrats :
// 1. Sans `bord`, `rayon`, `ombre` ni `devant`, le rideau de `D-278` : les
//    mêmes ordres de dessin qu'avec leurs défauts écrits.
// 2. Une `ombre` sous 1 : la part couverte se dessine en plus, effacée de
//    l'opacité de l'ombre (jamais pleine, jamais nulle) ; à 1, elle ne se
//    dessine pas. `devant` la découpe d'abord par la silhouette nommée.
// 3. Concave ou convexe, deux dessins différents.
// 4. Démarrage : un réglage mal formé est refusé.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import { definitionPiece, poseAAngle } from '../src/poses.js';
import { VISUEL_HEROS_ID } from '../src/save.js';
import { validerCatalogues } from '../src/registry.js';
import { cataloguesValides, ordresDessin, opacitesDessin } from './aide_dessin.js';

const { donnees, HEROS } = await cataloguesValides();
const piece = Object.keys(HEROS.pieces).find((p) => HEROS.pieces[p].passe_derriere);
assert.ok(piece, 'une pièce passe derrière');
const { debut = 0 } = definitionPiece(HEROS, piece).passe_derriere;
// Un angle en plein passage : le rideau a passé son début, sans tout couvrir.
const angle = [...Array(360).keys()].find((a) => { const r = poseAAngle(HEROS, a, piece)?.rideau; return r > debut + (1 - debut) * 0.3 && r < 1 - (1 - debut) * 0.3; });
assert.ok(angle !== undefined, 'un angle en plein passage');
const avec = (reglage) => {
  const v = structuredClone(HEROS);
  const actuel = v.pieces[piece].passe_derriere;
  v.pieces[piece].passe_derriere = { ...(actuel === true ? {} : actuel), ...reglage };
  for (const cle of Object.keys(reglage)) if (reglage[cle] === undefined) delete v.pieces[piece].passe_derriere[cle];
  return v;
};
const options = { angle, echelle: 3, teinte: '#ff0000' };
const nb = (appels, prop) => appels.filter((a) => a[0] === prop).length;

// --- 1. Les défauts ----------------------------------------------------------------
{
  const nu = avec({ bord: undefined, rayon: undefined, ombre: undefined, devant: undefined });
  const ecrits = avec({ bord: 'convexe', rayon: 6, ombre: [1], devant: undefined });
  assert.deepEqual(ordresDessin(nu, options), ordresDessin(ecrits, options));
  console.log('OK défauts : le rideau de D-278');
}

// --- 2. L'ombre --------------------------------------------------------------------
{
  const pleine = opacitesDessin(avec({ ombre: [1], devant: undefined }), options);
  const legere = opacitesDessin(avec({ ombre: [0.3], devant: undefined }), options);
  const decoupee = opacitesDessin(avec({ ombre: [0.3], devant: 'capuche' }), options);
  // Une couche de plus par primitive de la pièce dessinée sous le rideau.
  const primitives = HEROS.primitives.filter((p) => p.piece === piece).length;
  assert.equal(nb(legere, 'clip') - nb(pleine, 'clip'), primitives, 'la part couverte, une fois par primitive');
  assert.ok(nb(decoupee, 'clip') > nb(legere, 'clip'), 'devant : découpée d\'abord par la silhouette');
  // Ce qui ne se dessine que sous une ombre légère : effacé, jamais plein ni nul.
  const alphas = legere.filter((a) => a[0] === 'fill').map((a) => a[1]);
  const pleins = new Set(pleine.filter((a) => a[0] === 'fill').map((a) => a[1]));
  const neufs = alphas.filter((a) => !pleins.has(a));
  assert.ok(neufs.length > 0 && neufs.every((a) => a > 0 && a < 1), 'la part couverte, effacée de son ombre');
  console.log('OK ombre : une couche effacée, découpée par ce qui passe devant');
}

// --- 3. Concave -------------------------------------------------------------------
assert.notDeepEqual(ordresDessin(avec({ bord: 'concave' }), options), ordresDessin(avec({ bord: 'convexe' }), options));
console.log('OK concave : un autre bord');

// --- 4. Démarrage ------------------------------------------------------------------
{
  const refuse = (reglage, attendu) => {
    const copie = structuredClone(donnees);
    const v = copie.visuels.find((e) => e.id === VISUEL_HEROS_ID);
    v.pieces[piece].passe_derriere = { ...v.pieces[piece].passe_derriere, ...reglage };
    assert.ok(validerCatalogues(copie).some((e) => e.includes(attendu)), JSON.stringify(reglage));
  };
  const forme = 'passe_derriere?: true | {';
  refuse({ bord: 'rond' }, forme);
  refuse({ rayon: 0 }, forme);
  refuse({ ombre: [] }, forme);
  refuse({ ombre: [0.5, 1.2] }, forme);
  refuse({ devant: piece }, 'passe_derriere > devant doit nommer');
  refuse({ devant: 'lueur' }, 'passe_derriere > devant doit nommer');
  console.log('OK démarrage');
}

console.log('OK test_d286_rideau_ombre');

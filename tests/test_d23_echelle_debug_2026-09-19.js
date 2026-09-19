// Contrat MT_echelle-debug_2026-09-19 (`D-23`) : paramètre debug
// `?echelle=N`, INSTRUMENT DE MESURE — zéro correction. L'exigence
// centrale du ticket est négative : sans le paramètre, tout rend
// exactement ce qu'il rendait avant (bloc 2 ci-dessous), et un test le
// prouve. Le reste vérifie que sous échelle forcée, le canvas et TOUS les
// calques dérivent d'un seul nombre, et que la boîte de présentation
// (donc le hit-test tactile) n'en dépend pas du tout.
//
// Aucun dessin canvas n'est exercé ici (contrainte de méthode) : seules les
// fonctions pures de résolution/dimensionnement le sont, et c'est
// précisément pour ça que le ticket demande qu'elles existent — un calque
// qui recalculerait sa taille dans son coin resterait invisible aux tests.
import assert from 'node:assert/strict';
import {
  RESOLUTION_LOGIQUE,
  calculerEchelleEntiere,
  calculerEchelleRendu,
  echelleDepuisCanvas,
  dimensionnerCanvasRendu,
  calculerRectanglePresentation,
  versCoordonneesLogiques,
} from '../src/render.js';
import { lireEchelleForcee, ECHELLE_FORCEE_MIN, ECHELLE_FORCEE_MAX } from '../src/debug_perf.js';

// Table d'écrans du ticket, en pixels PHYSIQUES (c'est ce que
// `dimensionsEcranPhysiques()` fournit au rendu) :
// - 1920x1080 dpr 1   : le PC de `R-02` (échelle naturelle 4)
// - 2961x1449 dpr 3,5 : l'émulation F12 de `R-04` (échelle naturelle 5)
// - 720x1600 dpr 2    : un téléphone, soit 1440x3200 physiques (échelle 3)
const ECRANS = [
  { nom: 'PC de R-02', largeur: 1920, hauteur: 1080, echelleAttendue: 4 },
  { nom: 'émulation F12 de R-04', largeur: 2961, hauteur: 1449, echelleAttendue: 5 },
  { nom: 'téléphone 720x1600 dpr 2', largeur: 1440, hauteur: 3200, echelleAttendue: 3 },
];

// --- 1. Lecture du paramètre (pure, jamais `location` ici) --------------
assert.deepEqual(lireEchelleForcee(''), { echelle: null, avertissement: null }, 'aucune query string -> aucune échelle forcée');
assert.deepEqual(lireEchelleForcee(undefined), { echelle: null, avertissement: null }, 'search absent -> aucune échelle forcée');
assert.deepEqual(lireEchelleForcee('?debug=fps'), { echelle: null, avertissement: null }, '`?debug=fps` seul ne force rien');

assert.equal(lireEchelleForcee('?echelle=3').echelle, 3);
assert.equal(lireEchelleForcee('?echelle=1').echelle, ECHELLE_FORCEE_MIN, 'borne basse admise');
assert.equal(lireEchelleForcee('?echelle=8').echelle, ECHELLE_FORCEE_MAX, 'borne haute admise');
assert.equal(lireEchelleForcee('?echelle=2.5').echelle, 2.5, 'décimales admises (§ Comportement)');
// Indépendant de `?debug=fps`, cumulable dans les deux sens.
assert.equal(lireEchelleForcee('?debug=fps&echelle=4').echelle, 4);
assert.equal(lireEchelleForcee('?echelle=4&debug=fps').echelle, 4);

// Valeurs invalides : ignorées (échelle nulle) ET signalées, jamais
// silencieusement remplacées par une valeur plausible.
for (const brut of ['0', '-2', '9', '12', 'abc', '', '3px']) {
  const lu = lireEchelleForcee(`?echelle=${brut}`);
  assert.equal(lu.echelle, null, `?echelle=${brut} doit être ignoré`);
  assert.equal(typeof lu.avertissement, 'string', `?echelle=${brut} doit produire un avertissement`);
  assert.ok(lu.avertissement.includes('echelle'), 'l\'avertissement nomme le paramètre fautif');
}
assert.equal(lireEchelleForcee('?echelle=3').avertissement, null, 'une valeur valide n\'avertit de rien');

// --- 2. NON-RÉGRESSION : sans paramètre, rien ne bouge ------------------
// L'exigence n°1 du ticket ("le comportement est strictement identique à
// aujourd'hui, et un test le prouve"). `calculerEchelleEntiere` est la
// fonction d'avant, inchangée : la nouvelle doit lui rendre exactement la
// même valeur tant qu'aucune échelle n'est forcée.
for (const ecran of ECRANS) {
  const naturelle = calculerEchelleEntiere(ecran.largeur, ecran.hauteur);
  assert.equal(naturelle, ecran.echelleAttendue, `échelle naturelle attendue sur ${ecran.nom}`);
  assert.equal(calculerEchelleRendu(ecran.largeur, ecran.hauteur), naturelle, `sans forçage : échelle inchangée (${ecran.nom})`);
  assert.equal(
    calculerEchelleRendu(ecran.largeur, ecran.hauteur, RESOLUTION_LOGIQUE, null),
    naturelle,
    `null explicite = pas de forçage (${ecran.nom})`
  );

  // Dimensions du canvas hors-écran : exactement la formule d'avant
  // (480·f x 270·f), au pixel près.
  const dims = dimensionnerCanvasRendu(ecran.largeur, ecran.hauteur);
  assert.deepEqual(
    { echelle: dims.echelle, largeur: dims.largeur, hauteur: dims.hauteur },
    {
      echelle: naturelle,
      largeur: RESOLUTION_LOGIQUE.largeur * naturelle,
      hauteur: RESOLUTION_LOGIQUE.hauteur * naturelle,
    },
    `sans forçage : canvas aux dimensions d'avant (${ecran.nom})`
  );
}

// --- 3. Échelle forcée à 3 sur l'écran de `R-04` ------------------------
// Le cas exact du ticket : "échelle : 3 (forcée) — naturelle : 5".
{
  const ecran = ECRANS[1];
  assert.equal(calculerEchelleEntiere(ecran.largeur, ecran.hauteur), 5, 'naturelle de R-04 = 5');

  const dims = dimensionnerCanvasRendu(ecran.largeur, ecran.hauteur, 3);
  assert.equal(dims.echelle, 3, 'l\'échelle forcée REMPLACE la naturelle');
  assert.equal(dims.largeur, 1440, '480 x 3');
  assert.equal(dims.hauteur, 810, '270 x 3');

  // Cohérence de TOUS les calques : le calque statique, le voile
  // d'obscurité et les paupières ne connaissent pas l'échelle forcée — ils
  // la relisent tous sur la largeur du canvas déjà dimensionné. Si cette
  // dérivation et le repère posé sur le contexte divergeaient, on
  // retomberait exactement sur le diagnostic "dialogues invisibles".
  assert.equal(echelleDepuisCanvas(dims.largeur), dims.echelle, 'calques et contexte dérivent du MÊME nombre');
  // Le voile/les paupières se dimensionnent sur (canvas.width, canvas.height)
  // puis peignent RESOLUTION_LOGIQUE unités : la couverture doit être pleine.
  assert.equal(RESOLUTION_LOGIQUE.largeur * echelleDepuisCanvas(dims.largeur), dims.largeur, 'le voile couvre toute la largeur');
  assert.equal(RESOLUTION_LOGIQUE.hauteur * echelleDepuisCanvas(dims.largeur), dims.hauteur, 'le voile couvre toute la hauteur');

  // Moins de pixels dessinés, c'est tout l'objet de la mesure (`Q-19`).
  const naturel = dimensionnerCanvasRendu(ecran.largeur, ecran.hauteur);
  const rapport = (naturel.largeur * naturel.hauteur) / (dims.largeur * dims.hauteur);
  assert.ok(rapport > 2.7 && rapport < 2.8, `échelle 5 -> 3 = ~2,78x moins de pixels (mesuré ${rapport.toFixed(2)})`);
}

// --- 4. Échelle forcée décimale : le canvas reste cohérent --------------
// Un canvas ne peut pas faire 1584,000000002 px : la largeur est arrondie,
// et c'est l'échelle RELUE sur cette largeur arrondie qui fait foi partout,
// jamais celle demandée.
for (const demandee of [1, 2.5, 3.3, 4.75, 8]) {
  const dims = dimensionnerCanvasRendu(1920, 1080, demandee);
  assert.equal(dims.largeur, Math.round(RESOLUTION_LOGIQUE.largeur * demandee), `largeur pour ?echelle=${demandee}`);
  assert.equal(Number.isInteger(dims.largeur) && Number.isInteger(dims.hauteur), true, 'dimensions entières');
  assert.equal(dims.echelle, echelleDepuisCanvas(dims.largeur), `?echelle=${demandee} : l'échelle effective est celle du canvas réel`);
  assert.equal(dims.hauteur, Math.round(RESOLUTION_LOGIQUE.hauteur * dims.echelle), 'hauteur dérivée de la MÊME échelle que la largeur');
}

// --- 5. Valeur invalide : strictement le comportement d'avant -----------
// `lireEchelleForcee` rend `null`, et `null` traverse toute la chaîne sans
// jamais devenir un nombre.
for (const search of ['?echelle=0', '?echelle=abc', '?echelle=99']) {
  const { echelle } = lireEchelleForcee(search);
  const dims = dimensionnerCanvasRendu(1920, 1080, echelle);
  assert.equal(dims.echelle, calculerEchelleEntiere(1920, 1080), `${search} -> échelle naturelle intacte`);
}

// --- 6. Tactile : la boîte de présentation ne bouge pas -----------------
// Le ticket : "La boîte CSS du canvas ne change pas : le navigateur
// agrandit". `calculerRectanglePresentation` (donc `versCoordonneesLogiques`,
// donc le hit-test des boutons virtuels de main.js) ne prend AUCUNE échelle
// forcée : un appui tombe au même endroit logique avec et sans paramètre.
{
  const ecran = ECRANS[1];
  const rect = calculerRectanglePresentation(ecran.largeur, ecran.hauteur);
  assert.equal(rect.echelle, 5, 'la présentation reste à l\'échelle naturelle');

  // Un bouton virtuel au centre-bas du viewport logique, visé en pixels CSS.
  const dpr = 3.5;
  const cibleLogique = { x: 400, y: 240 };
  const clientX = (rect.x + cibleLogique.x * rect.echelle) / dpr;
  const clientY = (rect.y + cibleLogique.y * rect.echelle) / dpr;

  const avant = versCoordonneesLogiques(clientX * dpr, clientY * dpr, rect);
  assert.ok(Math.abs(avant.x - cibleLogique.x) < 0.01 && Math.abs(avant.y - cibleLogique.y) < 0.01, 'aller-retour exact');

  // Sous échelle forcée, le canvas hors-écran rétrécit… mais le rectangle
  // de présentation, lui, est calculé sur l'écran, pas sur ce canvas.
  const dimsForcees = dimensionnerCanvasRendu(ecran.largeur, ecran.hauteur, 3);
  assert.notEqual(dimsForcees.largeur, rect.largeur, 'le canvas de rendu, lui, a bien changé de taille');
  const rectSousForcage = calculerRectanglePresentation(ecran.largeur, ecran.hauteur);
  assert.deepEqual(rectSousForcage, rect, 'même rectangle de présentation -> même hit-test tactile');
}

console.log('OK test_d23_echelle_debug');

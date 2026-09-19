// Contrat MT_mesure-saccades_2026-09-19 : fonctions pures de l'instrument de
// debug perf (tampon circulaire, agrégats, détection d'activation/bascules,
// mise en forme du relevé). La surcouche DOM (ui/hud_debug.js) n'est jamais
// exercée ici (contrainte de méthode : le rendu/DOM revient à Xav dans un
// vrai navigateur) — seul ce module pur l'est.
import assert from 'node:assert/strict';
import {
  estDebugFpsActif, creerTamponCirculaire, ajouterAuTampon, valeursTampon,
  moyenne, maximum, percentile, compterAuDessus, ecartsSuccessifs, creerCompteurBascules,
  formaterReleve, SEUIL_FRAME_LENTE_MS,
} from '../src/debug_perf.js';

// --- estDebugFpsActif : seule porte d'entrée de toute la surcouche -----
assert.equal(estDebugFpsActif(''), false, 'aucune query string -> inactif');
assert.equal(estDebugFpsActif(undefined), false, 'search absent -> inactif');
assert.equal(estDebugFpsActif('?debug=fps'), true);
assert.equal(estDebugFpsActif('?autre=1&debug=fps'), true, 'ordre des paramètres indifférent');
assert.equal(estDebugFpsActif('?debug=autrechose'), false, 'valeur différente -> inactif');
assert.equal(estDebugFpsActif('?debugfps'), false, 'clé mal formée -> inactif');

// --- Tampon circulaire pré-alloué : aucune allocation par ajout ---------
{
  const tampon = creerTamponCirculaire(3);
  assert.deepEqual(valeursTampon(tampon), [], 'tampon vide au départ');

  ajouterAuTampon(tampon, 10);
  ajouterAuTampon(tampon, 20);
  assert.deepEqual(valeursTampon(tampon), [10, 20], 'ordre chronologique avant que le tampon soit plein');

  ajouterAuTampon(tampon, 30);
  assert.deepEqual(valeursTampon(tampon), [10, 20, 30], 'plein : toujours dans l\'ordre');

  // Le tampon boucle : le plus ancien (10) est écrasé, l'ordre chronologique
  // doit rester correct malgré le retour à l'indice 0 en interne.
  ajouterAuTampon(tampon, 40);
  assert.deepEqual(valeursTampon(tampon), [20, 30, 40], 'bouclage : le plus ancien est écrasé, ordre préservé');

  ajouterAuTampon(tampon, 50);
  ajouterAuTampon(tampon, 60);
  assert.deepEqual(valeursTampon(tampon), [40, 50, 60], 'plusieurs tours de boucle restent cohérents');
}

// --- Agrégats ------------------------------------------------------------
assert.equal(moyenne([]), 0);
assert.equal(moyenne([10, 20, 30]), 20);
assert.equal(maximum([]), 0);
assert.equal(maximum([5, 42, -3]), 42);
assert.equal(percentile([], 0.95), 0);
assert.equal(percentile([1, 2, 3, 4, 5], 0), 1, 'p=0 -> minimum');
assert.equal(percentile([1, 2, 3, 4, 5], 1), 5, 'p=1 arrondi au dernier indice existant');
assert.equal(compterAuDessus([1, 25, 30, 5], SEUIL_FRAME_LENTE_MS), 2, 'seuil de frame lente = 20 ms (§ ticket)');

// --- Écarts successifs (piste 3 : arrondi caméra/héros) -----------------
assert.deepEqual(ecartsSuccessifs([]), []);
assert.deepEqual(ecartsSuccessifs([5]), [], 'une seule valeur -> aucun écart');
assert.deepEqual(ecartsSuccessifs([0, 2, 4, 4, 7]), [2, 2, 0, 3]);

// --- Bascules par seconde (périphérique actif) --------------------------
{
  const compteur = creerCompteurBascules();
  // Première valeur : jamais une "bascule" (rien à comparer avant).
  compteur.enregistrer('manette', 0);
  assert.equal(compteur.basculesParSeconde(0), 0);

  compteur.enregistrer('manette', 500); // pas de changement -> pas de bascule
  compteur.enregistrer('clavier', 1000); // bascule n°1
  compteur.enregistrer('clavier', 1500); // pas de changement
  compteur.enregistrer('manette', 2000); // bascule n°2
  assert.equal(compteur.basculesParSeconde(2000, 1000), 2, 'les 2 bascules (1000, 2000) sont dans [1000,2000]');

  // La fenêtre glisse : à t=2500, [1500,2500] ne contient plus que la
  // bascule à 2000 (celle à 1000 en est sortie).
  assert.equal(compteur.basculesParSeconde(2500, 1000), 1, 'seule la bascule à 2000 reste dans [1500,2500]');
  assert.equal(compteur.basculesParSeconde(5000, 1000), 0, 'plus aucune bascule dans [4000,5000]');
}

// --- Mise en forme du relevé (bouton "copier" du protocole) -------------
{
  const etat = {
    fps: 59.8,
    deltaMoyenMs: 16.7,
    deltaP95Ms: 18.2,
    deltaMaxMs: 33.4,
    framesPlafonnees: 0,
    framesTotales: 600,
    dureeMajMoyenneMs: 0.4,
    dureeMajP95Ms: 0.9,
    dureeDessinerMoyenneMs: 1.2,
    dureeDessinerP95Ms: 2.1,
    framesLentes: 3,
    recalculsCoucheStatique: { nombre: 0, dureeMoyenneMs: 0, dureeMaxMs: 0, depuisDernierMs: null },
    ecartHeroX: { moyenne: 1.5, min: 1.5, max: 1.5 },
    ecartHeroY: { moyenne: 0, min: 0, max: 0 },
    entites: { monstres: 2, puzzles: 4, objetsSol: 6 },
    ecranPhysique: { largeurPhysique: 1920, hauteurPhysique: 1080, dpr: 2 },
    coucheStatique: { largeur: 640, hauteur: 360 },
    canvasVoile: null,
    peripheriqueActif: 'manette',
    basculesParSeconde: 0,
  };
  const texte = formaterReleve(etat);
  assert.equal(typeof texte, 'string');
  assert.ok(texte.includes('59.8'), 'fps présent dans le relevé');
  assert.ok(texte.includes('recalculs calque statique : aucun'), 'aucun recalcul -> message explicite');
  assert.ok(texte.includes('manette'), 'périphérique actif présent');
  assert.ok(texte.includes('absent (scène sans obscurité)'), 'canvasVoile null géré sans planter');

  // Avec au moins un recalcul (formatage du nombre + horodatage relatif).
  const etatAvecRecalcul = {
    ...etat,
    recalculsCoucheStatique: { nombre: 3, dureeMoyenneMs: 2.5, dureeMaxMs: 4.1, depuisDernierMs: 850 },
  };
  const texteAvecRecalcul = formaterReleve(etatAvecRecalcul);
  assert.ok(texteAvecRecalcul.includes('recalculs calque statique : 3'), 'nombre de recalculs affiché');
  assert.ok(!texteAvecRecalcul.includes('n/a'), 'un horodatage connu ne doit jamais afficher n/a');
}

console.log('OK test_mesure_saccades');

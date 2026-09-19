// `D-34` (nuit du 19 au 20/09) : le follet passe à 0,75 de sa taille EN JEU,
// la cinématique du choix garde les siennes, et l'orbite ne bouge pas.
//
// Ce fichier prouve les quatre points que le ticket demande :
//   1. l'échelle de jeu vit en données (`companions.json#echelle_jeu`), elle
//      est résolue par une fonction pure, et un compagnon qui ne la déclare
//      pas garde 1 (un catalogue existant reste valide tel quel) ;
//   2. l'orbite est désormais LUE à travers une fonction de résolution
//      (principe d'équilibrage du 19/09) et rend la base **au pixel près** —
//      la position orbitale du follet est identique à celle d'avant ;
//   3. la frontière cinématique -> jeu est CONTINUE : pas de saut d'échelle
//      d'une frame à l'autre pendant l'étape de départ ;
//   4. les tailles de la cinématique ne sont pas touchées : `intro.js` ne
//      connaît pas `echelle_jeu` et son rendu de départ est inchangé.
//
// Le rendu canvas n'est jamais exercé (contrainte de méthode) : on teste les
// fonctions pures, comme le reste.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import {
  creerFollet, avancerPosition, resoudreOrbiteRayonPx, resoudreEchelleJeu, echelleFolletEnTransition,
} from '../src/companion.js';
import { creerDepart, avancerDepart, etatRenduDepart, avancementDepart } from '../src/intro.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const ECHELLE_JEU_ATTENDUE = 0.75; // décision Xav (`D-34`), *provisoire*
const ORBITE_ATTENDUE_PX = 24; // valeur d'avant le ticket : elle ne bouge pas (`Q-26`)

async function cataloguesDuJeu() {
  const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
    path.join(RACINE, 'data'),
    Object.keys(SCHEMAS),
  );
  assert.deepEqual(erreurs, [], 'les catalogues du jeu doivent se charger sans erreur');
  return donnees;
}

// --- 1. L'échelle de jeu vit en données, résolue par une fonction pure ---
{
  const catalogues = await cataloguesDuJeu();
  for (const companion of catalogues.companions) {
    assert.equal(
      companion.echelle_jeu,
      ECHELLE_JEU_ATTENDUE,
      `${companion.id} déclare son échelle de jeu en données`,
    );
    assert.equal(resoudreEchelleJeu(companion), ECHELLE_JEU_ATTENDUE);
  }

  // Un compagnon sans le champ garde 1 : le catalogue d'avant reste valide.
  assert.equal(resoudreEchelleJeu({ id: 'comp_sans_echelle' }), 1);
  assert.equal(resoudreEchelleJeu(null), 1);
  console.log('OK échelle de jeu du follet déclarée en données (0,75), défaut 1');

  // Une échelle dégénérée est refusée au boot, comme celle du héros : elle
  // rendrait le compagnon invisible, et personne ne le verrait avant de jouer.
  for (const mauvaise of [0, -1, 'grand']) {
    const copie = JSON.parse(JSON.stringify(catalogues));
    copie.companions[0].echelle_jeu = mauvaise;
    const erreurs = validerCatalogues(copie);
    assert.ok(
      erreurs.some((e) => /echelle_jeu doit être un nombre strictement positif/.test(e)),
      `echelle_jeu=${JSON.stringify(mauvaise)} doit être refusée au boot`,
    );
  }
  console.log('OK echelle_jeu nulle/négative/non numérique refusée au boot');
}

// --- 2. L'orbite passe par une résolution, et ne bouge pas d'un pixel ---
{
  assert.equal(resoudreOrbiteRayonPx(), ORBITE_ATTENDUE_PX, "l'orbite effective est la base, telle quelle");

  // Preuve par le comportement, pas seulement par la constante : un follet
  // laissé tourner converge sur un cercle de ce rayon-là autour du héros.
  const hero = { x: 1000, y: 800 };
  let follet = creerFollet('comp_follet_feu', hero);
  assert.equal(Math.hypot(follet.x - hero.x, follet.y - hero.y), ORBITE_ATTENDUE_PX);
  for (let i = 0; i < 600; i += 1) follet = avancerPosition(follet, hero, [], 1 / 60);
  const rayonObserve = Math.hypot(follet.x - hero.x, follet.y - hero.y);
  assert.ok(
    Math.abs(rayonObserve - ORBITE_ATTENDUE_PX) < 0.5,
    `orbite observée ${rayonObserve.toFixed(2)} px, attendue ${ORBITE_ATTENDUE_PX} px`,
  );
  console.log(`OK orbite inchangée : ${rayonObserve.toFixed(2)} px autour du héros`);
}

// --- 3. Frontière cinématique -> jeu : aucune discontinuité ---
{
  const ECHELLE_CINEMATIQUE = 20 / 7; // TAILLE_FOLLET_SELECTIONNE_PX / TAILLE_REFERENCE_FOLLET_PX

  // Bornes exactes : on part de la taille de l'écran de choix, on arrive à la
  // taille de jeu. Sans ça, la transition serait douce mais fausse.
  assert.equal(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, ECHELLE_JEU_ATTENDUE, 0), ECHELLE_CINEMATIQUE);
  assert.equal(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, ECHELLE_JEU_ATTENDUE, 1), ECHELLE_JEU_ATTENDUE);
  // Un avancement hors bornes ne renvoie jamais une taille hors bornes.
  assert.equal(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, ECHELLE_JEU_ATTENDUE, -3), ECHELLE_CINEMATIQUE);
  assert.equal(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, ECHELLE_JEU_ATTENDUE, 12), ECHELLE_JEU_ATTENDUE);

  // Déroulé réel de l'étape de départ, frame à frame à 60 Hz : l'échelle
  // décroît sans jamais sauter. Le seuil est calculé depuis l'amplitude
  // totale, jamais un nombre en dur : on refuse qu'une frame consomme plus de
  // 10 % du chemin (à 60 Hz sur 1 s, la plus grosse frame en vaut ~5 %).
  const config = { depart_ms: 1000, convergence_ms: 3500, levitation: { amplitude_px: 3, periode_ms: 900 } };
  let depart = creerDepart(config, 0);
  const amplitude = Math.abs(ECHELLE_CINEMATIQUE - ECHELLE_JEU_ATTENDUE);
  let precedente = echelleFolletEnTransition(ECHELLE_CINEMATIQUE, ECHELLE_JEU_ATTENDUE, avancementDepart(depart));
  let sautMax = 0;
  while (!depart.terminee) {
    depart = avancerDepart(depart, 1000 / 60);
    const courante = echelleFolletEnTransition(ECHELLE_CINEMATIQUE, ECHELLE_JEU_ATTENDUE, avancementDepart(depart));
    assert.ok(courante <= precedente + 1e-9, 'la taille ne remonte jamais pendant la transition');
    sautMax = Math.max(sautMax, Math.abs(courante - precedente));
    precedente = courante;
  }
  assert.ok(
    sautMax < amplitude * 0.1,
    `plus gros saut d'une frame à l'autre : ${sautMax.toFixed(4)} (amplitude ${amplitude.toFixed(4)})`,
  );
  assert.ok(
    Math.abs(precedente - ECHELLE_JEU_ATTENDUE) < 1e-9,
    "la transition finit exactement sur l'échelle de jeu",
  );
  console.log(
    `OK frontière continue : ${ECHELLE_CINEMATIQUE.toFixed(3)} -> ${ECHELLE_JEU_ATTENDUE} en ${config.depart_ms} ms, plus gros saut ${sautMax.toFixed(4)}`,
  );
}

// --- 4. La cinématique n'est pas touchée ---
{
  // `etatRenduDepart` ne renvoie toujours que les NON élus, avec position et
  // alpha, et rien d'autre : la taille des partants n'est pas devenue son
  // affaire (main.js continue de la calculer depuis TAILLE_FOLLET_REPOS_PX).
  const config = { depart_ms: 1000, convergence_ms: 3500, levitation: { amplitude_px: 3, periode_ms: 900 } };
  const depart = avancerDepart(creerDepart(config, 1), 300);
  const cibles = [{ x: 150, y: 113 }, { x: 240, y: 113 }, { x: 330, y: 113 }];
  const rendu = etatRenduDepart(depart, cibles);
  assert.deepEqual(rendu.map((f) => f.index), [0, 2], "seuls les deux non élus repartent");
  for (const f of rendu) {
    assert.deepEqual(Object.keys(f).sort(), ['alpha', 'index', 'x', 'y']);
  }

  // Et l'avancement exposé est bien CELUI des positions : même courbe, une
  // seule horloge (le test échouerait si `avancementDepart` divergeait).
  const avancement = avancementDepart(depart);
  const attenduX = cibles[0].x + (-20 - cibles[0].x) * avancement; // POSITIONS_DEPART_FOLLETS[0].x
  assert.ok(
    Math.abs(rendu[0].x - attenduX) < 1e-9,
    'la position du partant suit exactement avancementDepart()',
  );
  assert.ok(
    Math.abs(rendu[0].alpha - (1 - avancement)) < 1e-9,
    'son extinction aussi : une seule courbe, une seule horloge',
  );
  console.log('OK cinématique du choix inchangée (étapes, durées, tailles des partants)');
}

console.log('OK test_d34_follet_echelle_jeu');

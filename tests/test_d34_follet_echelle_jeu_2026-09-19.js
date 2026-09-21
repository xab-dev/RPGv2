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

// `D-52` : ce fichier épinglait `0,75`, l'échelle que Xav avait décidée le
// 19/09. Il est devenu rouge le jour où Xav l'a réglée à la main à 0,66 dans
// `data/companions.json` — c'est-à-dire le jour où il a fait exactement ce
// que l'architecture lui demande de faire. Le test avait tort, pas la valeur.
//
// Un test n'apprend pas par cœur un nombre que Xav ajuste à l'œil. Il vérifie
// le CONTRAT : que l'échelle vit en données, qu'elle est résolue par une
// fonction pure, qu'une valeur dégénérée tombe au boot, et que le follet est
// bien plus petit en jeu qu'à la cinématique — ce que `D-34` voulait. Le
// chiffre exact reste à Xav, et il peut le changer sans rien casser.
const ORBITE_ATTENDUE_PX = 24; // valeur d'avant le ticket : elle ne bouge pas (`Q-26`)
// Taille du follet à l'écran de choix, dérivée des deux constantes de rendu
// (`TAILLE_FOLLET_SELECTIONNE_PX / TAILLE_REFERENCE_FOLLET_PX`). Au niveau
// module parce que DEUX blocs s'en servent désormais : celui du contrat
// (« plus petit en jeu qu'à la cinématique ») et celui de la transition.
const ECHELLE_CINEMATIQUE = 20 / 7;

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
    // Le champ EXISTE et il est jouable — c'est le contrat. Sa valeur est à
    // Xav (`D-52`).
    assert.equal(
      typeof companion.echelle_jeu, 'number',
      `${companion.id} déclare son échelle de jeu en données`,
    );
    assert.ok(companion.echelle_jeu > 0, `${companion.id} : une échelle nulle rendrait le follet invisible`);
    // La résolution passe par la fonction pure, et rend EXACTEMENT ce que les
    // données disent : c'est ça qu'on vérifie, pas le chiffre.
    assert.equal(
      resoudreEchelleJeu(companion), companion.echelle_jeu,
      `${companion.id} : la résolution doit rendre la valeur du catalogue, telle quelle`,
    );
    // L'intention de `D-34` : le follet est plus PETIT en jeu qu'à l'écran de
    // choix. Une relation, pas un nombre — elle survit à tous les réglages.
    assert.ok(
      companion.echelle_jeu < ECHELLE_CINEMATIQUE,
      `${companion.id} : le follet doit être plus petit en jeu (${companion.echelle_jeu}) `
      + `qu'à la cinématique (${ECHELLE_CINEMATIQUE.toFixed(3)})`,
    );
  }

  // Un compagnon sans le champ garde 1 : le catalogue d'avant reste valide.
  assert.equal(resoudreEchelleJeu({ id: 'comp_sans_echelle' }), 1);
  assert.equal(resoudreEchelleJeu(null), 1);
  console.log(
    'OK échelle de jeu déclarée en données ('
    + catalogues.companions.map((c) => `${c.id.replace('comp_follet_', '')} ${c.echelle_jeu}`).join(', ')
    + '), défaut 1',
  );

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
// L'échelle d'arrivée est LUE dans le catalogue, jamais épinglée (`D-52`) :
// la continuité doit tenir pour la valeur que Xav a réglée, pas pour celle
// qu'un test aurait apprise par cœur.
{
  const echelleJeu = resoudreEchelleJeu((await cataloguesDuJeu()).companions[0]);

  // Bornes exactes : on part de la taille de l'écran de choix, on arrive à la
  // taille de jeu. Sans ça, la transition serait douce mais fausse.
  assert.equal(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, echelleJeu, 0), ECHELLE_CINEMATIQUE);
  // À TOLÉRANCE, pas à l'égalité stricte : `a + (b - a) * 1` ne rend pas
  // exactement `b` en virgule flottante. Avec 0,75 ça tombait juste par
  // chance de représentation binaire ; avec 0,66, l'écart est de 1e-16 —
  // invisible, et le contrat n'a jamais été « au bit près », il est « aucun
  // saut visible ». Épingler l'égalité stricte revenait à épingler la valeur.
  const arriveSur = (avancement, cible) => assert.ok(
    Math.abs(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, echelleJeu, avancement) - cible) < 1e-9,
    `avancement ${avancement} doit arriver sur ${cible}`,
  );
  arriveSur(1, echelleJeu);
  // Un avancement hors bornes ne renvoie jamais une taille hors bornes.
  assert.equal(echelleFolletEnTransition(ECHELLE_CINEMATIQUE, echelleJeu, -3), ECHELLE_CINEMATIQUE);
  arriveSur(12, echelleJeu);

  // Déroulé réel de l'étape de départ, frame à frame à 60 Hz : l'échelle
  // décroît sans jamais sauter. Le seuil est calculé depuis l'amplitude
  // totale, jamais un nombre en dur : on refuse qu'une frame consomme plus de
  // 10 % du chemin (à 60 Hz sur 1 s, la plus grosse frame en vaut ~5 %).
  const config = { depart_ms: 1000, convergence_ms: 3500, levitation: { amplitude_px: 3, periode_ms: 900 } };
  let depart = creerDepart(config, 0);
  const amplitude = Math.abs(ECHELLE_CINEMATIQUE - echelleJeu);
  let precedente = echelleFolletEnTransition(ECHELLE_CINEMATIQUE, echelleJeu, avancementDepart(depart));
  let sautMax = 0;
  while (!depart.terminee) {
    depart = avancerDepart(depart, 1000 / 60);
    const courante = echelleFolletEnTransition(ECHELLE_CINEMATIQUE, echelleJeu, avancementDepart(depart));
    assert.ok(courante <= precedente + 1e-9, 'la taille ne remonte jamais pendant la transition');
    sautMax = Math.max(sautMax, Math.abs(courante - precedente));
    precedente = courante;
  }
  assert.ok(
    sautMax < amplitude * 0.1,
    `plus gros saut d'une frame à l'autre : ${sautMax.toFixed(4)} (amplitude ${amplitude.toFixed(4)})`,
  );
  assert.ok(
    Math.abs(precedente - echelleJeu) < 1e-9,
    "la transition finit exactement sur l'échelle de jeu",
  );
  console.log(
    `OK frontière continue : ${ECHELLE_CINEMATIQUE.toFixed(3)} -> ${echelleJeu} en ${config.depart_ms} ms, plus gros saut ${sautMax.toFixed(4)}`,
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

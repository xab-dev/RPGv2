// Contrat de `specs/10_alignement-follet.md`, palier B : l'ORBITE, et elle
// seule — zéro synergie à ce palier.
//
// 1. `D-53` : l'amortissement du follet est en temps RÉEL. À 37 et à 60 fps,
//    même trajet du héros, le follet est au même endroit (±1 px) après 2 s.
// 2. L'inversion ne touche que le SENS : le rayon de l'orbite ne bouge pas.
// 3. Continuité : pendant le renversement, aucune frame où le follet saute
//    de plus que sa vitesse maximale × dt ; il ralentit, s'arrête, repart.
// 4. Un follet créé alors que le régime est déjà négatif tourne d'emblée à
//    l'envers (`Q-89` : l'inversion commence avec le jeu, pas de renversement
//    joué à chaque chargement).
// 5. Branché sur l'orchestrateur : seul un régime NÉGATIF inverse — `-1` oui,
//    `-0,5` (bande morte) et `+3` non.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import {
  creerFollet, avancerPosition, resoudreOrbiteRayonPx, vitesseOrbiteMaxPxS,
} from '../src/companion.js';
import { configAlignement } from '../src/alignement.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dictionnaires, { donnees, erreurs }] = await Promise.all([
  chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
  chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS)),
]);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const registre = construireRegistre(donnees);
const DUREE_INVERSION_MS = configAlignement(registre).orbite.duree_inversion_ms;
const RAYON = resoudreOrbiteRayonPx();

// --- 1. `D-53` : même position à 37 et à 60 fps ---------------------------
// Le héros court en ligne droite pendant 1 s puis s'arrête : c'est quand il
// y a du RETARD à rattraper qu'un amortissement par frame se trahit.
function trajet(fps, dureeS, options) {
  const dt = 1 / fps;
  const hero = { x: 0, y: 0 };
  // Créé dans le sens d'aujourd'hui : sous `options.sens = -1`, le
  // renversement se joue PENDANT le trajet, et c'est lui qu'on compare.
  let follet = creerFollet('comp_follet_feu', hero);
  const frames = Math.round(dureeS * fps);
  for (let i = 0; i < frames; i++) {
    const t = i * dt;
    if (t < 1) hero.x += 90 * dt;
    follet = avancerPosition(follet, hero, [], dt, options);
  }
  return follet;
}
{
  const a = trajet(60, 2);
  const b = trajet(37, 2);
  const ecart = Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(ecart <= 1, `à 37 et à 60 fps, le follet doit être au même endroit à ±1 px (écart ${ecart.toFixed(2)} px)`);
  // Même témoin sous inversion : un renversement plus mou au téléphone
  // qu'au PC est exactement ce que `D-53` doit empêcher.
  const opts = { sens: -1, dureeInversionMs: DUREE_INVERSION_MS };
  const c = trajet(60, 2, { ...opts });
  const d = trajet(37, 2, { ...opts });
  const ecartInverse = Math.hypot(c.x - d.x, c.y - d.y);
  assert.ok(ecartInverse <= 1, `idem en orbite inversée (écart ${ecartInverse.toFixed(2)} px)`);
  console.log(`OK D-53 : 37 fps et 60 fps au même endroit après 2 s (écart ${ecart.toFixed(3)} px, inversé ${ecartInverse.toFixed(3)} px)`);
}

// --- 2 et 3. Le renversement : le sens seul, sans saut ----------------------
{
  const hero = { x: 0, y: 0 };
  const dt = 1 / 60;
  let f = creerFollet('comp_follet_feu', hero);
  // Laisser le follet se poser sur son orbite, sens positif.
  for (let i = 0; i < 180; i++) f = avancerPosition(f, hero, [], dt);
  const angleAvant = f.angleOrbite;
  let sautMax = 0;
  let facteurMin = Infinity;
  let passeParZero = false;
  const opts = { sens: -1, dureeInversionMs: DUREE_INVERSION_MS };
  const frames = Math.ceil((DUREE_INVERSION_MS / 1000) / dt) + 120;
  for (let i = 0; i < frames; i++) {
    const avant = f;
    f = avancerPosition(f, hero, [], dt, opts);
    sautMax = Math.max(sautMax, Math.hypot(f.x - avant.x, f.y - avant.y));
    facteurMin = Math.min(facteurMin, f.facteurOrbite);
    if (Math.abs(f.facteurOrbite) < 0.05) passeParZero = true;
  }
  assert.ok(sautMax <= vitesseOrbiteMaxPxS() * dt + 1e-9,
    `aucune frame ne saute plus que vitesse max × dt (${sautMax.toFixed(3)} > ${(vitesseOrbiteMaxPxS() * dt).toFixed(3)})`);
  assert.ok(passeParZero, 'le follet passe par l\'arrêt : il ralentit, s\'arrête, repart');
  assert.equal(facteurMin, -1, 'il finit par tourner à pleine vitesse dans l\'autre sens');
  assert.ok(f.angleOrbite < angleAvant, 'l\'angle décroît : le sens est inversé');
  // Le rayon n'a pas bougé : sur l'orbite posée, la distance au héros est la même.
  const r = Math.hypot(f.x - hero.x, f.y - hero.y);
  assert.ok(Math.abs(r - RAYON) < 1.5, `rayon inchangé (${r.toFixed(2)} px pour ${RAYON})`);

  // La durée est celle des données : à mi-course, pas encore renversé.
  let g = creerFollet('comp_follet_feu', hero);
  const moitie = Math.floor((DUREE_INVERSION_MS / 1000 / dt) * 0.4);
  for (let i = 0; i < moitie; i++) g = avancerPosition(g, hero, [], dt, opts);
  assert.ok(g.facteurOrbite > 0, 'à 40 % de la durée, le follet tourne encore dans l\'ancien sens (plus lentement)');
  assert.ok(g.facteurOrbite < 1);
  console.log(`OK renversement en ${DUREE_INVERSION_MS} ms : saut max ${sautMax.toFixed(3)} px/frame, passe par l'arrêt, rayon inchangé`);
}

// --- 4. Créé déjà négatif : pas de renversement joué -----------------------
{
  const hero = { x: 0, y: 0 };
  const f = creerFollet('comp_follet_eau', hero, -1);
  assert.equal(f.facteurOrbite, -1);
  assert.equal(creerFollet('comp_follet_eau', hero).facteurOrbite, 1, 'par défaut, le sens d\'aujourd\'hui');
  console.log('OK un follet créé en régime négatif tourne d\'emblée à l\'envers');
}

// --- 5. Dans l'orchestrateur : seul le régime négatif inverse ---------------
const etatNeutre = {
  move: { x: 0, y: 0 },
  attack: { pressed: false, held: false },
  skill_1: { pressed: false, held: false },
  skill_2: { pressed: false, held: false },
  skill_3: { pressed: false, held: false },
  consume: { pressed: false, held: false },
  interact: { pressed: false, held: false },
  menu: { pressed: false, held: false },
  target_next: { pressed: false, held: false },
};
function orchestrateur(alignementForce) {
  const save = saveNeuve();
  save.hero.scene = 'scene_maison_exterieur';
  save.hero.companion = 'comp_follet_terre';
  save.flags = { flag_follet_choisi: true, flag_grotte_sortie: true };
  // Aucune nuit, aucun monstre : on ne regarde que l'orbite.
  save.monde.heure = 0;
  const orch = creerOrchestrateurGrotte({
    registre,
    i18n: creerI18n(dictionnaires, 'fr'),
    save,
    store: creerStoreMemoire(),
    dialogue: creerDialogue(),
    menu: { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {} },
    input: { maj: () => etatNeutre },
    ctxLogique: null,
    ctxVisible: null,
    canvasLogique: null,
    alignementForce,
  });
  return { orch, save };
}
{
  for (const [valeur, attendu] of [[null, 1], [0, 1], [-0.5, 1], [-1, -1], [-3, -1], [3, 1]]) {
    const { orch } = orchestrateur(valeur);
    for (let i = 0; i < 90; i++) orch.maj(16);
    const f = orch.obtenirFollet();
    assert.ok(f, 'le follet existe');
    assert.equal(f.facteurOrbite, attendu, `alignement ${valeur} : facteur d'orbite ${attendu}`);
  }
  // La modification en cours de partie (spec 11) est relue à la frame suivante,
  // et le renversement se joue alors, amorti.
  const { orch } = orchestrateur(null);
  for (let i = 0; i < 30; i++) orch.maj(16);
  orch.modifierAlignement(-2, 'test');
  orch.maj(16);
  const f = orch.obtenirFollet();
  assert.ok(f.facteurOrbite < 1 && f.facteurOrbite > -1, 'le renversement commence, sans saut de sens');
  for (let i = 0; i < 90; i++) orch.maj(16);
  assert.equal(orch.obtenirFollet().facteurOrbite, -1);
  console.log('OK orchestrateur : -1 et au-delà inversent, -0,5 / 0 / +3 non, un changement en jeu se renverse amorti');
}

console.log('OK test_spec10_alignement_palier_b');

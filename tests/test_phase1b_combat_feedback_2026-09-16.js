// Contrat (03_grotte-polish §3.1, palier 1) : feedback de combat — anneau
// d'attaque uniquement sur un coup EFFECTIF (hors cooldown), flash du
// monstre touché sur auto-attaque ET tick de DoT, barre de PV visible ssi le
// monstre est "actif" (engagé ou déjà touché). Le rendu canvas lui-même
// n'est jamais exercé ici (contrainte de méthode) : on vérifie l'état que
// render.js consommera (anneauAttaqueMs, monstre.flashMs, estMonstreActif),
// pas les pixels.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { estMonstreActif, resoudreArmeEquipee, FLASH_ATTAQUE_MS, FLASH_TOUCHE_MS } from '../src/combat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');
const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

// ===== 1. estMonstreActif, pur — pas besoin de données réelles =====
{
  const monstrePlein = { id: 'm1', pv: 10, pvMax: 10 };
  const monstreBlesse = { id: 'm1', pv: 9, pvMax: 10 };
  assert.equal(estMonstreActif(monstrePlein, null), false, 'plein PV, pas de follet -> inactif');
  assert.equal(estMonstreActif(monstreBlesse, null), true, 'a perdu des PV -> actif même sans follet');
  assert.equal(estMonstreActif(monstrePlein, { cibleMonstreId: 'autre' }), false, 'engagé sur un AUTRE monstre -> inactif');
  assert.equal(estMonstreActif(monstrePlein, { cibleMonstreId: 'm1' }), true, 'engagé sur CE monstre -> actif même à PV pleins');
}

// ===== 2. Bout en bout : anneau + flash, sur le vrai orchestrateur/données =====
function etat({ moveX = 0, moveY = 0, attack = false, interact = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: false, held: false }, target_next: { pressed: false, held: false },
  };
}

function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}

function tapper(orchestrateur, frames, champ, deltaMs = 16) {
  frames.push(etat({ [champ]: true }));
  orchestrateur.maj(deltaMs);
  frames.push(etat({ [champ]: false }));
  orchestrateur.maj(deltaMs);
}

// Anti-spam (§3.2) : cf. commentaire détaillé dans
// test_phase1_sd_grotte_choix_follet_2026-09-15.js (patron dupliqué, chaque
// test headless reste autonome).
function fermerLigneDialogue(orchestrateur, frames, deltaMs = 16) {
  tapper(orchestrateur, frames, 'attack', deltaMs);
  tapper(orchestrateur, frames, 'attack', deltaMs);
  const framesAttente = Math.ceil(DELAI_ARMEMENT_DIALOGUE_MS / deltaMs) + 1;
  for (let i = 0; i < framesAttente; i++) { frames.push(etat()); orchestrateur.maj(deltaMs); }
  tapper(orchestrateur, frames, 'attack', deltaMs);
}

function fermerDialogue(orchestrateur, frames, maxLignes = 6) {
  for (let i = 0; i < maxLignes && orchestrateur.dialogueOuvert(); i++) fermerLigneDialogue(orchestrateur, frames);
}

// Intro cinématique (03_grotte-polish §3.5, palier 4, ajoutée après ce
// ticket) : à l'entrée en scene_grotte_salle_1 sans flag_follet_choisi,
// l'intro (clignements + convergence, ~7,2s sur les données réelles) tourne
// avant que la narration du choix ne s'ouvre — minuteur pur, aucun input lu.
function avancerJusquauDialogue(orchestrateur, frames, { maxFrames = 500, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    frames.push(etat());
    orchestrateur.maj(deltaMs);
  }
  return false;
}

function attendreFinDepart(orchestrateur, frames, { maxFrames = 100, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames && orchestrateur.obtenirDepart() !== null; i++) {
    frames.push(etat());
    orchestrateur.maj(deltaMs);
  }
}

function avancerVers(orchestrateur, frames, cible, { maxFrames = 400, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    const hero = orchestrateur.obtenirHero();
    const dx = cible.x - hero.x;
    const dy = cible.y - hero.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) return true;
    frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
    orchestrateur.maj(deltaMs);
  }
  return false;
}

// `distanceArret` est fournie par l'appelant et dérivée de la portée réelle
// de l'arme équipée (D-20, 2026-09-19) : une constante en px ici serait une
// copie de la portée du jour, qui redeviendrait fausse au prochain réglage —
// et le test échouerait alors pour une raison sans rapport avec son contrat
// (le feedback visuel), comme cela s'est produit au passage aux mains nues.
function avancerVersMonstre(orchestrateur, frames, enemyId, { distanceArret, maxFrames = 400, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    const hero = orchestrateur.obtenirHero();
    const monstre = orchestrateur.obtenirMonstres().find((m) => m.enemyId === enemyId && !m.mort);
    if (!monstre) return true;
    const dx = monstre.x - hero.x;
    const dy = monstre.y - hero.y;
    const distance = Math.hypot(dx, dy);
    if (distance < distanceArret) return true;
    frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
    orchestrateur.maj(deltaMs);
  }
  return false;
}

{
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.equal(erreurs.length, 0);
  assert.equal(validerCatalogues(donnees).length, 0);

  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');
  const save = saveNeuve();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  const menu = { estOuvert: () => false, traiterInput() {} };
  const frames = [];
  const input = creerInputScripte(frames);

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null, sourceTactile: { estActif: () => false },
  });

  // --- Amener le héros au contact du monstre de la salle 2. Follet Eau
  // (index par défaut) délibérément choisi : son effet monstre (débuff de
  // Force) ne touche jamais les PV, contrairement au Feu (DoT) — les PV du
  // monstre ne bougent donc QUE sous l'effet des auto-attaques explicites
  // ci-dessous, ce qui rend les assertions déterministes. ---
  assert.ok(avancerJusquauDialogue(orchestrateur, frames), 'l\'intro doit se terminer et ouvrir la narration');
  fermerLigneDialogue(orchestrateur, frames); // narration -> choixFollet
  tapper(orchestrateur, frames, 'attack'); // confirme l'index par défaut (eau)
  fermerLigneDialogue(orchestrateur, frames); // enthousiasme
  attendreFinDepart(orchestrateur, frames); // §3.5 étape 4 : follets non élus

  avancerVers(orchestrateur, frames, px(19, 6));
  frames.push(etat()); orchestrateur.maj(16); // laisse portailFranchi() s'exécuter
  fermerDialogue(orchestrateur, frames); // tuto combat salle 2
  // Bien à l'intérieur de la portée, pas à sa frontière : le monstre bouge
  // aussi, et un arrêt pile sur le bord rendrait le coup suivant incertain.
  const porteeMaxPx = resoudreArmeEquipee(registre, null).portee.max * TILE;
  avancerVersMonstre(orchestrateur, frames, 'enemy_grotte_rampant', { distanceArret: porteeMaxPx * 0.6 });

  const monstre = () => orchestrateur.obtenirMonstres().find((m) => m.enemyId === 'enemy_grotte_rampant');

  // 1. Avant tout appui : l'anneau est éteint.
  assert.equal(orchestrateur.obtenirAnneauAttaqueMs(), 0, 'aucun ATTACK -> anneau éteint');

  // 2. Premier ATTACK effectif (hors cooldown) : l'anneau s'allume plein, le
  // monstre flashe et perd des PV.
  const pvAvant = monstre().pv;
  frames.push(etat({ attack: true })); orchestrateur.maj(16);
  assert.equal(orchestrateur.obtenirAnneauAttaqueMs(), FLASH_ATTAQUE_MS, 'ATTACK effectif -> anneau plein');
  assert.ok(monstre().pv < pvAvant, 'le monstre doit avoir perdu des PV');
  assert.equal(monstre().flashMs, FLASH_TOUCHE_MS, 'le monstre touché doit flasher plein');
  assert.equal(estMonstreActif(monstre(), orchestrateur.obtenirFollet()), true, 'monstre touché -> actif (barre de PV visible)');

  // 3. Deuxième ATTACK la frame suivante, PENDANT le cooldown déclenché par
  // le coup précédent : l'anneau ne doit PAS se relancer à plein — seule la
  // décroissance naturelle d'une frame (16ms) doit s'appliquer. C'est la
  // preuve que "un ATTACK pendant le cooldown ne produit rien" (§3.1).
  frames.push(etat({ attack: true })); orchestrateur.maj(16);
  assert.equal(orchestrateur.obtenirAnneauAttaqueMs(), FLASH_ATTAQUE_MS - 16,
    'ATTACK pendant le cooldown -> l\'anneau continue de décroître, jamais relancé');

  // 4. Le flash décroît lui aussi frame après frame, sans appui.
  const flashApres1Frame = monstre().flashMs;
  frames.push(etat()); orchestrateur.maj(16);
  assert.ok(monstre().flashMs < flashApres1Frame, 'le flash du monstre doit décroître avec le temps');
}

console.log('OK test_phase1b_combat_feedback');

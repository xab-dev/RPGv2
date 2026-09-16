// Diagnostic SD_grotte-blocage-choix-follet_2026-09-15.md, §B : Xav a besoin
// de retrouver le cold open à volonté pour tester, sans vider IndexedDB à la
// main. Deux niveaux couverts ici :
// 1. save.js#reinitialiserSauvegarde — pur (pour la définition du module,
//    cf. son commentaire), testé isolément.
// 2. main.js#creerOrchestrateurGrotte : reinitialiserPartie() bout en bout —
//    l'écran de confirmation lui-même (DOM, ui/menu.js) n'est jamais exercé
//    headless (contrainte de méthode), seule l'action qu'il déclenche l'est.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire, reinitialiserSauvegarde, charger, VERSION_SCHEMA_COURANTE } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

function etat({ moveX = 0, attack = false } = {}) {
  return {
    move: { x: moveX, y: 0 },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: false, held: false },
    menu: { pressed: false, held: false },
  };
}

function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}

// Anti-spam (03_grotte-polish §3.2) : cf. commentaire détaillé dans
// test_phase1_sd_grotte_choix_follet_2026-09-15.js (même patron, dupliqué —
// chaque test headless reste autonome, cf. CLAUDE.md).
// Intro cinématique (03_grotte-polish §3.5, palier 4, ajoutée après ce
// diagnostic) : cf. commentaire détaillé dans
// test_phase1_sd_grotte_choix_follet_2026-09-15.js (patron dupliqué, chaque
// test headless reste autonome).
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

function fermerLigneDialogue(orchestrateur, frames, deltaMs = 16) {
  frames.push(etat({ attack: true })); orchestrateur.maj(deltaMs);
  frames.push(etat()); orchestrateur.maj(deltaMs);
  frames.push(etat({ attack: true })); orchestrateur.maj(deltaMs);
  frames.push(etat()); orchestrateur.maj(deltaMs);
  const framesAttente = Math.ceil(DELAI_ARMEMENT_DIALOGUE_MS / deltaMs) + 1;
  for (let i = 0; i < framesAttente; i++) { frames.push(etat()); orchestrateur.maj(deltaMs); }
  frames.push(etat({ attack: true })); orchestrateur.maj(deltaMs);
  frames.push(etat()); orchestrateur.maj(deltaMs);
}

// 1. reinitialiserSauvegarde() : après appel, charger() renvoie une partie
// neuve à la version de schéma courante, quel que soit l'état précédent.
{
  const store = creerStoreMemoire();
  const payload = saveNeuve();
  payload.hero.x = 999;
  payload.hero.companion = 'comp_follet_feu';
  await store.ecrire('save_current', payload);
  await store.ecrire('save_next', payload);

  await reinitialiserSauvegarde(store);
  const { payload: relu } = await charger(store);
  assert.equal(relu.schema_version, VERSION_SCHEMA_COURANTE);
  assert.equal(relu.hero.x, 0);
  assert.equal(relu.hero.companion, null);
}

// 2. Bout en bout : choisir un follet, avancer, puis réinitialiser depuis
// l'orchestrateur — l'état en mémoire ET le store doivent refléter une
// partie neuve, et le cold open (narration du choix) doit réapparaître.
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

  // Laisse l'intro (§3.5) se terminer, ferme la narration, confirme le
  // follet du milieu, ferme l'enthousiasme, laisse le départ des 2 follets
  // non élus se terminer, puis avance le héros — reproduit exactement la
  // séquence de test_phase1_sd_grotte_choix_follet.
  assert.ok(avancerJusquauDialogue(orchestrateur, frames), 'l\'intro doit se terminer et ouvrir la narration');
  fermerLigneDialogue(orchestrateur, frames);
  frames.push(etat({ attack: true })); orchestrateur.maj(16);
  fermerLigneDialogue(orchestrateur, frames);
  attendreFinDepart(orchestrateur, frames);
  frames.push(etat({ moveX: 1 })); orchestrateur.maj(16);

  assert.notEqual(orchestrateur.obtenirFollet(), null, 'un follet doit être choisi avant le test de réinitialisation');
  const xAvantReset = orchestrateur.obtenirHero().x;
  assert.notEqual(xAvantReset, 80, 'le héros doit avoir bougé avant la réinitialisation');

  await orchestrateur.reinitialiserPartie();

  assert.equal(orchestrateur.obtenirFollet(), null, 'le follet doit être oublié après réinitialisation');
  assert.equal(orchestrateur.obtenirHero().x, 80, 'le héros doit revenir au point de spawn de la salle 1');
  // L'intro (§3.5) redémarre proprement à l'étape 1 (§4 edge case : "état de
  // intro.js reconstruit, pas réutilisé") avant que la narration ne
  // réapparaisse — jamais directement la narration comme avant ce palier.
  assert.notEqual(orchestrateur.obtenirIntro(), null, 'l\'intro doit redémarrer à l\'étape 1 après réinitialisation');
  assert.equal(orchestrateur.dialogueOuvert(), false, 'la narration ne réapparaît qu\'à la fin de l\'intro rejouée');
  assert.ok(avancerJusquauDialogue(orchestrateur, frames), 'l\'intro rejouée doit se terminer et ouvrir la narration du cold open');
  assert.equal(orchestrateur.choixFolletActif(), false, 'le choix ne redémarre qu\'à la fermeture de cette narration, pas avant');

  const saveApresReset = orchestrateur.obtenirSave();
  assert.equal(saveApresReset.hero.companion, null);
  assert.equal(saveApresReset.flags.flag_follet_choisi, undefined);

  // Le store doit refléter la réinitialisation, jamais l'ancien état.
  const { payload: reluStore } = await charger(store);
  assert.equal(reluStore.hero.companion, null);
  assert.equal(reluStore.hero.x, 0);

  // Une frame supplémentaire (autosave potentiel) ne doit jamais faire
  // réapparaître l'ancien état dans le store (ordre non négociable du §B :
  // effacer -> réinitialiser l'état -> seulement ensuite réautoriser les
  // sauvegardes).
  frames.push(etat()); orchestrateur.maj(16);
  const { payload: reluStoreApres } = await charger(store);
  assert.equal(reluStoreApres.hero.companion, null, 'aucune autosave ne doit resurgir l\'ancien état après réinitialisation');
}

console.log('OK test_phase1_sd_reset_sauvegarde');

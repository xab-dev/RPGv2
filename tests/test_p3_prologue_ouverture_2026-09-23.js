// `specs/12_prologue.md`, ticket P3 — le prologue avant le symbole, sur le
// VRAI orchestrateur (jamais une réimplémentation, `D-72`). Harnais repris de
// `test_l3_logo_ouverture` (même orchestrateur, même input scripté).
//
// Contrats (les durées sont lues dans le catalogue, jamais recopiées) :
// 1. Dans le jeu servi, une partie neuve commence par le premier écran du
//    prologue : ni symbole ni intro, gameplay gelé, MENU n'ouvre rien.
// 2. Sans appui, le prologue ne part jamais. Chaque écran se passe par
//    ATTACK, INTERACT ou un toucher ; après le dernier, le symbole démarre.
// 3. Sans calques, la fin du prologue lance directement l'intro.
// 4. Réinitialiser la partie rejoue le prologue.
// 5. Par défaut (tests, outils), pas de prologue : le symbole, comme avant.
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// État abstrait minimal (mêmes champs que src/input/input.js#maj) : un seul
// verbe à la fois suffit pour ce scénario, les autres restent au repos.
function etat({ moveX = 0, moveY = 0, attack = false, interact = false, menu = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: menu, held: menu }, target_next: { pressed: false, held: false },
  };
}

// Source d'input factice pilotée par une file de frames préparées à l'avance
// (le "front montant" est déjà encodé dans la file, comme le ferait
// src/input/input.js#maj face à une vraie pression/relâchement) — remplace
// clavier/manette/tactile réels, jamais réutilisée par le jeu servi.
function creerInputScripte(frames) {
  let i = 0;
  return {
    maj() {
      const frame = frames[Math.min(i, frames.length - 1)];
      i += 1;
      return frame;
    },
  };
}

async function construireOrchestrateurDeTest(imagesLogo, jouerPrologue, contacts = []) {
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.equal(erreurs.length, 0, `catalogues invalides : ${erreurs.join(' ; ')}`);
  const erreursValidation = validerCatalogues(donnees);
  assert.equal(erreursValidation.length, 0, `schémas invalides : ${erreursValidation.join(' ; ')}`);

  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');
  const save = saveNeuve();
  const store = creerStoreMemoire();
  const dialogue = creerDialogue();
  // Le menu n'intervient jamais dans ce scénario (jamais ouvert) : un stub
  // suffit, réutiliser initialiserMenu() exigerait un DOM.
  const menu = { estOuvert: () => false, traiterInput() {} };

  const frames = [];
  const input = creerInputScripte(frames);

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    // ctxLogique/ctxVisible/canvasLogique/sourceTactile : jamais utilisés par
    // maj(), seulement par dessiner() — jamais appelé par ce test (le rendu
    // canvas n'est jamais exercé en headless, cf. CLAUDE.md).
    ctxLogique: null, ctxVisible: null, canvasLogique: null, sourceTactile: { estActif: () => false },
    imagesLogo, jouerPrologue,
    // Les contacts tactiles « nouveaux » de la frame : le test les pose, le
    // premier `maj()` qui suit les consomme (comme `touch.js`).
    lireContactsTactiles: () => contacts.splice(0),
  });

  return { orchestrateur, frames, save, registre };
}

function avancer(orchestrateur, frames, ms, e = etat()) {
  for (let t = 0; t < ms; t += 16) { frames.push(e); orchestrateur.maj(16); }
}

// Passe l'écran courant : attend son armement, appuie une frame, attend la fin
// du fondu. `appuyer` pousse l'appui de la frame (verbe ou toucher).
function passerEcran(orchestrateur, frames, appuyer) {
  const ecran = orchestrateur.obtenirPrologue().ecrans[orchestrateur.obtenirPrologue().index];
  avancer(orchestrateur, frames, ecran.armement_ms + 32);
  appuyer();
  orchestrateur.maj(16);
  avancer(orchestrateur, frames, ecran.fondu_ms + 32);
}

// 1, 2
{
  const contacts = [];
  const { orchestrateur, frames, registre } = await construireOrchestrateurDeTest([{}, {}, {}], true, contacts);
  const ecrans = registre.tous('prologue');
  assert.ok(ecrans.length > 0);
  assert.notEqual(orchestrateur.obtenirPrologue(), null, 'une partie neuve commence par le prologue');
  assert.equal(orchestrateur.obtenirPrologue().index, 0);
  assert.equal(orchestrateur.obtenirOuvertureLogo(), null, 'le symbole attend la fin du prologue');
  assert.equal(orchestrateur.obtenirIntro(), null);

  const x0 = orchestrateur.obtenirHero().x;
  avancer(orchestrateur, frames, 60_000, etat({ moveX: 1 }));
  assert.equal(orchestrateur.obtenirHero().x, x0, 'le gameplay est gelé pendant le prologue');
  assert.equal(orchestrateur.obtenirPrologue().index, 0, 'sans appui, le premier écran reste');
  // Le menu du harnais n'a pas d'`ouvrir` : si MENU passait, cette frame lèverait.
  avancer(orchestrateur, frames, 32, etat({ menu: true }));

  // Les trois gestes acceptés, tour à tour.
  const gestes = [
    () => frames.push(etat({ attack: true })),
    () => frames.push(etat({ interact: true })),
    () => { frames.push(etat()); contacts.push({ x: 10, y: 10 }); },
  ];
  for (let i = 0; i < ecrans.length; i++) {
    assert.equal(orchestrateur.obtenirPrologue().index, i, `écran ${i + 1} sur ${ecrans.length}`);
    passerEcran(orchestrateur, frames, gestes[i % gestes.length]);
  }
  assert.equal(orchestrateur.obtenirPrologue(), null, 'le prologue est fini');
  assert.notEqual(orchestrateur.obtenirOuvertureLogo(), null, 'le symbole prend la suite');
  assert.equal(orchestrateur.obtenirHero().x, x0, 'toujours gelé');

  // 4
  await orchestrateur.reinitialiserPartie();
  assert.notEqual(orchestrateur.obtenirPrologue(), null, 'une partie réinitialisée rejoue le prologue');
  assert.equal(orchestrateur.obtenirPrologue().index, 0);
  assert.equal(orchestrateur.obtenirOuvertureLogo(), null);
}

// 3
{
  const { orchestrateur, frames, registre } = await construireOrchestrateurDeTest([], true);
  for (let i = 0; i < registre.tous('prologue').length; i++) {
    passerEcran(orchestrateur, frames, () => frames.push(etat({ attack: true })));
  }
  assert.equal(orchestrateur.obtenirPrologue(), null);
  assert.equal(orchestrateur.obtenirOuvertureLogo(), null, 'sans calques, pas de symbole');
  assert.notEqual(orchestrateur.obtenirIntro(), null, "sans calques, l'intro suit le prologue");
}

// 5
{
  const { orchestrateur } = await construireOrchestrateurDeTest([{}, {}, {}], false);
  assert.equal(orchestrateur.obtenirPrologue(), null, 'par défaut, pas de prologue');
  assert.equal(orchestrateur.obtenirOuvertureLogo(), 0, 'le symbole, comme avant');
}

console.log('OK test_p3_prologue_ouverture : le prologue, à l’appui, puis le symbole ; rejoué au reset ; absent par défaut');

// Ticket L3 (journal du 23/09) — le symbole du jeu avant le cold-open, sur le
// VRAI orchestrateur (jamais une réimplémentation, `D-72`).
//
// Contrats :
// 1. Avec ses calques, une partie neuve commence par le symbole : l'intro
//    n'existe pas encore, le gameplay est gelé, MENU n'ouvre rien.
// 2. À la fin du symbole (durée lue dans les données), l'intro démarre, et la
//    suite du cold-open est celle d'avant (la narration du choix s'ouvre).
// 3. Sans calques (tests headless, image perdue), aucun écran noir de plus :
//    l'intro démarre à l'entrée, comme avant le ticket.
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
import { dureeLogo } from '../src/logo.js';

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

async function construireOrchestrateurDeTest(imagesLogo) {
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
    imagesLogo,
  });

  return { orchestrateur, frames, save };
}

function avancer(orchestrateur, frames, ms, e = etat()) {
  for (let t = 0; t < ms; t += 16) { frames.push(e); orchestrateur.maj(16); }
}

// 1 et 2
{
  const { orchestrateur, frames } = await construireOrchestrateurDeTest([{}, {}, {}]);
  assert.equal(orchestrateur.obtenirOuvertureLogo(), 0, 'une partie neuve commence par le symbole');
  assert.equal(orchestrateur.obtenirIntro(), null, "l'intro attend la fin du symbole");
  const x0 = orchestrateur.obtenirHero().x;
  avancer(orchestrateur, frames, 500, etat({ moveX: 1 }));
  assert.equal(orchestrateur.obtenirHero().x, x0, 'le gameplay est gelé pendant le symbole');
  assert.equal(orchestrateur.obtenirIntro(), null);

  // Le menu du harnais n'a pas d'`ouvrir` : si MENU passait pendant le
  // symbole, cette frame lèverait.
  avancer(orchestrateur, frames, 32, etat({ menu: true }));
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), ['effets']);
  const duree = dureeLogo(donnees.effets.find((e) => e.id === 'effet_logo_ouverture'));
  avancer(orchestrateur, frames, duree - 500 + 32);
  assert.equal(orchestrateur.obtenirOuvertureLogo(), null, 'le symbole se termine de lui-même');
  assert.notEqual(orchestrateur.obtenirIntro(), null, "l'intro prend le relais");
  let dialogue = false;
  for (let i = 0; i < 800 && !dialogue; i++) { frames.push(etat()); orchestrateur.maj(16); dialogue = orchestrateur.dialogueOuvert(); }
  assert.ok(dialogue, 'le cold-open continue comme avant : la narration du choix s’ouvre');
}

// 3
{
  const { orchestrateur } = await construireOrchestrateurDeTest([]);
  assert.equal(orchestrateur.obtenirOuvertureLogo(), null, 'sans calques, pas de symbole');
  assert.notEqual(orchestrateur.obtenirIntro(), null, "sans calques, l'intro démarre à l'entrée, comme avant");
}

console.log('OK test_l3_logo_ouverture : le symbole, puis le cold-open ; sans calques, rien ne change');

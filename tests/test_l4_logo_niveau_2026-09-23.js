// Ticket L4 (journal du 23/09) — le symbole, discret, à la montée de niveau,
// sur le VRAI orchestrateur.
//
// Contrats :
// 1. Un niveau gagné fait naître le symbole ; il s'éteint seul, à la durée lue
//    dans les données, même si une UI est ouverte (ici : l'intro).
// 2. Un niveau PERDU (réinitialisation, migration) ne le fait pas naître.
// 3. Il est discret : plus petit que celui de l'ouverture et translucide —
//    comparé aux données, jamais à un nombre épinglé.
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

const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), ['effets']);
const niveau = donnees.effets.find((e) => e.id === 'effet_logo_niveau');
const ouverture = donnees.effets.find((e) => e.id === 'effet_logo_ouverture');

// 1
{
  const { orchestrateur, frames, save } = await construireOrchestrateurDeTest([]);
  avancer(orchestrateur, frames, 64);
  assert.equal(orchestrateur.obtenirLogoNiveau(), null, 'rien sans montée de niveau');
  save.hero.niveau += 1;
  avancer(orchestrateur, frames, 16);
  assert.notEqual(orchestrateur.obtenirLogoNiveau(), null, 'un niveau gagné fait naître le symbole');
  avancer(orchestrateur, frames, dureeLogo(niveau) + 32);
  assert.equal(orchestrateur.obtenirLogoNiveau(), null, "il s'éteint seul, UI ouverte ou non");
}

// 2
{
  const { orchestrateur, frames, save } = await construireOrchestrateurDeTest([]);
  save.hero.niveau = Math.max(0, save.hero.niveau - 1);
  avancer(orchestrateur, frames, 32);
  assert.equal(orchestrateur.obtenirLogoNiveau(), null, 'un niveau perdu ne fait rien naître');
}

// 3
assert.ok(niveau.hauteur_px < ouverture.hauteur_px, 'plus petit que celui de l’ouverture');
assert.ok(niveau.alpha < 1, 'translucide');

console.log('OK test_l4_logo_niveau : le symbole naît au niveau gagné, s’éteint seul, reste discret');

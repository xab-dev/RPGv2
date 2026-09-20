// Diagnostic SD_grotte-blocage-choix-follet_2026-09-15.md, méthode §1 :
// reproduire en headless la séquence §3.1 (confirmation du choix du follet
// puis déplacement) avec des inputs abstraits, sur le VRAI code de
// main.js#creerOrchestrateurGrotte (pas une réimplémentation du test) et les
// vraies données de /data — pour ne pas manquer un bug qui vivrait
// spécifiquement dans le point de couture DOM/logique.
//
// Ce test doit être rouge avant tout patch (contrainte de méthode). S'il est
// vert, la conclusion du diagnostic est que le blocage constaté par Xav ne
// vient pas de cette logique mais d'une couche non testée ici (rendu,
// lecture manette réelle) — à consigner tel quel dans CLAUDE.md, jamais
// deviné en silence.

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

// Anti-spam (03_grotte-polish §3.2, ajouté après ce diagnostic) : fermer une
// ligne exige désormais qu'elle soit d'abord entièrement affichée (machine à
// écrire) PUIS armée (DELAI_ARMEMENT_DIALOGUE_MS écoulées depuis l'affichage
// complet). Deux appuis espacés d'une attente couvrent les deux mécanismes :
// le 1er peut retomber sur la "frame d'ouverture consommée" (mécanisme 1,
// main.js) et ne rien faire — le 2ᵉ ne le peut plus (vrai une seule fois par
// transition fermé -> ouvert) et force l'affichage complet ; l'attente qui
// suit couvre l'armement ; le dernier appui ferme/avance.
// Intro cinématique (03_grotte-polish §3.5, palier 4, ajoutée après ce
// diagnostic) : à l'entrée en scene_grotte_salle_1 sans flag_follet_choisi,
// la narration du choix ne s'ouvre plus immédiatement — l'intro (clignements
// + convergence, ~7,2s sur les données réelles) tourne d'abord, minuteur pur,
// AUCUN input lu (non skippable). On avance donc des frames neutres jusqu'à
// ce que le dialogue de narration apparaisse, avant de reprendre exactement
// le scénario original de ce diagnostic.
function avancerJusquauDialogue(orchestrateur, frames, { maxFrames = 500, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    frames.push(etat());
    orchestrateur.maj(deltaMs);
  }
  return false;
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

async function construireOrchestrateurDeTest() {
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
  });

  return { orchestrateur, frames, save };
}

{
  const { orchestrateur, frames } = await construireOrchestrateurDeTest();

  // À la construction, entrerDansScene('scene_grotte_salle_1') a démarré
  // l'intro (§3.5) — dlg_grotte_choix_follet (1 ligne, §3.1 étape 3) ne
  // s'ouvre qu'à sa fin, jamais avant.
  assert.notEqual(orchestrateur.obtenirIntro(), null, 'l\'intro doit démarrer dès l\'entrée en salle 1');
  assert.equal(orchestrateur.dialogueOuvert(), false, 'la narration ne doit pas être ouverte pendant l\'intro');
  assert.ok(avancerJusquauDialogue(orchestrateur, frames), 'l\'intro doit se terminer et ouvrir la narration');
  // MT_intro-follets-visibles_2026-09-19 : l'intro N'EST PLUS mise à `null`
  // ici — cette ligne affirmait exactement le mécanisme du bug signalé par
  // Xav (follets qui disparaissent pendant le texte, puis reviennent d'un
  // coup sur A). Nouveau contrat : la partie à temps fixe est terminée
  // (`terminee`), mais l'intro reste vivante en étape ATTENTE pour continuer
  // à dessiner les 3 follets derrière le dialogue.
  const introPendantTexte = orchestrateur.obtenirIntro();
  assert.notEqual(introPendantTexte, null, 'l\'intro reste vivante pendant la narration (follets visibles)');
  assert.equal(introPendantTexte.terminee, true, 'sa partie à temps fixe est bien terminée');

  // Ferme la narration (1 ligne, machine à écrire + armement compris,
  // cf. fermerLigneDialogue) -> choixFollet s'active.
  fermerLigneDialogue(orchestrateur, frames);
  assert.equal(orchestrateur.dialogueOuvert(), false, 'la narration doit se fermer sur ATTACK');
  assert.notEqual(orchestrateur.obtenirChoixFollet(), null, 'le choix du follet doit démarrer à la fermeture de la narration');
  assert.equal(orchestrateur.choixFolletActif(), true);

  // ATTACK confirme le follet du milieu (index par défaut = eau) — écran de
  // choix, pas un dialogue : un seul appui suffit, l'anti-spam ne s'y
  // applique pas (§3.2 ne concerne que dialogue.js).
  frames.push(etat({ attack: true }));
  orchestrateur.maj(16);
  assert.equal(orchestrateur.choixFolletActif(), false, 'la confirmation doit désactiver l\'écran de choix');
  assert.notEqual(orchestrateur.obtenirFollet(), undefined, 'un follet doit être créé à la confirmation');
  assert.equal(orchestrateur.dialogueOuvert(), true, 'le dialogue d\'enthousiasme doit s\'ouvrir juste après la confirmation');

  frames.push(etat());
  orchestrateur.maj(16);
  assert.equal(orchestrateur.dialogueOuvert(), true, 'le dialogue d\'enthousiasme ne doit pas avancer sans nouvel appui');

  // Ferme le dialogue d'enthousiasme (1 ligne).
  fermerLigneDialogue(orchestrateur, frames);
  assert.equal(orchestrateur.dialogueOuvert(), false, 'le dialogue d\'enthousiasme doit se fermer sur ATTACK');
  assert.equal(orchestrateur.choixFolletActif(), false);

  // Étape 4 de l'intro (§3.5) : les 2 follets non élus s'éloignent pendant
  // ~1s (depart_ms), indépendamment du dialogue déjà refermé — le gameplay
  // reste gelé jusqu'à la fin de cette animation, purement visuelle.
  for (let i = 0; i < 100 && orchestrateur.obtenirDepart() !== null; i++) {
    frames.push(etat());
    orchestrateur.maj(16);
  }
  assert.equal(orchestrateur.obtenirDepart(), null, 'le départ des follets non élus doit se terminer de lui-même');

  // Plus aucune UI ouverte -> le déplacement doit être possible.
  const xAvant = orchestrateur.obtenirHero().x;
  frames.push(etat({ moveX: 1 }));
  orchestrateur.maj(16);
  const xApres = orchestrateur.obtenirHero().x;

  assert.notEqual(xApres, xAvant, 'le héros doit se déplacer une fois le choix du follet et son dialogue refermés');
}

console.log('OK test_phase1_sd_grotte_choix_follet');

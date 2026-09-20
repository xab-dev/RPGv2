// Contrat (03_grotte-polish §3.2, palier 1) : ATTACK sert à la fois à
// frapper et à confirmer — spammer ATTACK ne doit jamais faire fermer un
// dialogue sans que sa ligne ait été entièrement lue. Trois mécanismes :
// (1) frame d'ouverture consommée (main.js#maj, testée en bout en bout ici
// via le vrai orchestrateur), (2) machine à écrire, (3) verrou d'armement
// (dialogue.js, testées ici en isolation, pures).

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, resoudreLignes, DELAI_ARMEMENT_DIALOGUE_MS, MACHINE_ECRIRE_MS_PAR_CARACTERE } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

function etat({ attack = false } = {}) {
  return {
    move: { x: 0, y: 0 },
    attack: { pressed: attack, held: attack },
    interact: { pressed: false, held: false },
  };
}

// ===== Mécanisme 2 : machine à écrire — un appui pendant l'affichage
// COMPLETE la ligne, il ne l'avance jamais. =====
{
  const dialogue = creerDialogue();
  const texte = 'Une phrase assez longue pour ne pas etre complete en une frame.';
  dialogue.ouvrir([{ locuteur: 'a', texte }, { locuteur: 'a', texte: 'Suite.' }]);
  dialogue.maj(10); // 10ms < MACHINE_ECRIRE_MS_PAR_CARACTERE : encore partiel
  assert.ok(dialogue.ligneCourante().texte.length < texte.length, 'texte partiellement affiché après 10ms');

  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.ligneCourante().texte, texte, 'un appui pendant l\'affichage complète la ligne entière');
  assert.equal(dialogue.ligneCourante().arme, false, 'complétée à l\'instant -> pas encore armée');
}

// ===== Mécanisme 3 : verrou d'armement — une ligne complète n'est avançable
// qu'après DELAI_ARMEMENT_DIALOGUE_MS. =====
{
  const dialogue = creerDialogue();
  // Texte d'un seul caractère (edge case §4) : complet dès l'ouverture,
  // l'armement s'applique quand même.
  dialogue.ouvrir([{ locuteur: 'a', texte: 'x' }, { locuteur: 'a', texte: 'y' }]);
  assert.equal(dialogue.ligneCourante().texte, 'x');
  assert.equal(dialogue.ligneCourante().arme, false);

  dialogue.traiterInput(etat({ attack: true })); // pas armé -> aucun effet
  assert.equal(dialogue.ligneCourante().texte, 'x', 'ne doit pas avancer avant le délai d\'armement');

  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS - 10);
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.ligneCourante().texte, 'x', 'encore 10ms avant armement -> toujours aucun effet');

  dialogue.maj(20); // franchit le délai
  assert.equal(dialogue.ligneCourante().arme, true, 'armée une fois le délai écoulé');
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.ligneCourante().texte, 'y', 'avance une fois armée');
}

// ===== "5 appuis en 5 frames -> 0 ligne consommée" (spec §5) =====
{
  const dialogue = creerDialogue();
  const texte1 = 'Ligne assez longue pour occuper plusieurs frames de machine a ecrire.';
  dialogue.ouvrir([{ locuteur: 'a', texte: texte1 }, { locuteur: 'a', texte: 'Ligne 2.' }]);

  for (let i = 0; i < 5; i++) {
    dialogue.maj(16); // même delta que le jeu à 60 fps
    dialogue.traiterInput(etat({ attack: true }));
  }
  // 5 * 16ms = 80ms, très inférieur à DELAI_ARMEMENT_DIALOGUE_MS (350ms) :
  // aucune ligne n'a pu être fermée, quel que soit le nombre d'appuis.
  assert.equal(dialogue.estOuvert(), true, '5 appuis en 80ms ne doivent jamais fermer le dialogue');
  assert.equal(dialogue.ligneCourante().texte, texte1, 'toujours sur la première ligne après 5 appuis');
  assert.equal(dialogue.ligneCourante().arme, false, 'pas encore armée après seulement 80ms');
}

// ===== Edge case §4 : ligne vide -> machine à écrire instantanée, armement
// s'applique quand même (jamais fermée sans son délai). =====
{
  const dialogue = creerDialogue();
  dialogue.ouvrir([{ locuteur: 'a', texte: '' }]);
  assert.equal(dialogue.ligneCourante().texte, '');
  assert.equal(dialogue.ligneCourante().arme, false);
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.estOuvert(), true, 'une ligne vide ne se ferme pas avant armement');
  dialogue.maj(DELAI_ARMEMENT_DIALOGUE_MS + 10);
  dialogue.traiterInput(etat({ attack: true }));
  assert.equal(dialogue.estOuvert(), false, 'fermée une fois armée');
}

// ===== Mécanisme 1 : frame d'ouverture consommée, bout en bout sur le vrai
// orchestrateur — spam ATTACK continu à travers la mort du monstre (qui
// ouvre dlg_grotte_eclats) ne doit jamais fermer ce dialogue tout neuf. =====
{
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const RACINE = path.join(__dirname, '..');
  const TILE = 32;
  const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

  function etatComplet({ moveX = 0, moveY = 0, attack = false, interact = false } = {}) {
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
    frames.push(etatComplet({ [champ]: true }));
    orchestrateur.maj(deltaMs);
    frames.push(etatComplet({ [champ]: false }));
    orchestrateur.maj(deltaMs);
  }
  function fermerLigneDialogue(orchestrateur, frames, deltaMs = 16) {
    tapper(orchestrateur, frames, 'attack', deltaMs);
    tapper(orchestrateur, frames, 'attack', deltaMs);
    const framesAttente = Math.ceil(DELAI_ARMEMENT_DIALOGUE_MS / deltaMs) + 1;
    for (let i = 0; i < framesAttente; i++) { frames.push(etatComplet()); orchestrateur.maj(deltaMs); }
    tapper(orchestrateur, frames, 'attack', deltaMs);
  }
  function fermerDialogue(orchestrateur, frames, maxLignes = 6) {
    for (let i = 0; i < maxLignes && orchestrateur.dialogueOuvert(); i++) fermerLigneDialogue(orchestrateur, frames);
  }
  // Intro cinématique (03_grotte-polish §3.5, palier 4, ajoutée après ce
  // ticket) : cf. commentaire détaillé dans test_phase1b_combat_feedback.
  function avancerJusquauDialogue(orchestrateur, frames, { maxFrames = 500, deltaMs = 16 } = {}) {
    for (let i = 0; i < maxFrames; i++) {
      if (orchestrateur.dialogueOuvert()) return true;
      frames.push(etatComplet());
      orchestrateur.maj(deltaMs);
    }
    return false;
  }
  function attendreFinDepart(orchestrateur, frames, { maxFrames = 100, deltaMs = 16 } = {}) {
    for (let i = 0; i < maxFrames && orchestrateur.obtenirDepart() !== null; i++) {
      frames.push(etatComplet());
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
      frames.push(etatComplet({ moveX: dx / distance, moveY: dy / distance }));
      orchestrateur.maj(deltaMs);
    }
    return false;
  }
  function avancerVersMonstre(orchestrateur, frames, enemyId, { maxFrames = 400, deltaMs = 16 } = {}) {
    for (let i = 0; i < maxFrames; i++) {
      if (orchestrateur.dialogueOuvert()) return true;
      const hero = orchestrateur.obtenirHero();
      const monstre = orchestrateur.obtenirMonstres().find((m) => m.enemyId === enemyId && !m.mort);
      if (!monstre) return true;
      const dx = monstre.x - hero.x;
      const dy = monstre.y - hero.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 20) return true;
      frames.push(etatComplet({ moveX: dx / distance, moveY: dy / distance }));
      orchestrateur.maj(deltaMs);
    }
    return false;
  }

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
  const dialogueCtrl = creerDialogue();
  const menu = { estOuvert: () => false, traiterInput() {} };
  const frames = [];
  const input = creerInputScripte(frames);

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue: dialogueCtrl, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null, sourceTactile: { estActif: () => false },
  });

  assert.ok(avancerJusquauDialogue(orchestrateur, frames), 'l\'intro doit se terminer et ouvrir la narration');
  fermerLigneDialogue(orchestrateur, frames); // narration -> choixFollet
  tapper(orchestrateur, frames, 'attack'); // confirme l'index par défaut (eau)
  fermerLigneDialogue(orchestrateur, frames); // enthousiasme
  attendreFinDepart(orchestrateur, frames); // §3.5 étape 4 : follets non élus

  avancerVers(orchestrateur, frames, px(19, 6));
  frames.push(etatComplet()); orchestrateur.maj(16);
  fermerDialogue(orchestrateur, frames); // tuto combat salle 2
  avancerVersMonstre(orchestrateur, frames, 'enemy_grotte_rampant');

  // Spam ATTACK à CHAQUE frame (aucun relâchement) jusqu'à et au-delà de la
  // mort du monstre — exactement le scénario cause racine de la fiche : le
  // coup qui tue ouvre dlg_grotte_eclats, et le spam continue sans relâche
  // juste après. On vérifie que ce nouveau dialogue survit à plusieurs
  // frames de spam ininterrompu (bien en-deça du délai d'armement).
  let dialogueVuOuvert = false;
  for (let i = 0; i < 400 && !dialogueVuOuvert; i++) {
    frames.push(etatComplet({ attack: true }));
    orchestrateur.maj(16);
    if (orchestrateur.dialogueOuvert()) dialogueVuOuvert = true;
  }
  assert.ok(dialogueVuOuvert, 'dlg_grotte_eclats doit s\'ouvrir à la mort du monstre');

  for (let i = 0; i < 5; i++) {
    frames.push(etatComplet({ attack: true }));
    orchestrateur.maj(16);
  }
  assert.equal(orchestrateur.dialogueOuvert(), true,
    'spam ATTACK ininterrompu à travers la mort du monstre ne doit jamais fermer dlg_grotte_eclats sans lecture');
  assert.equal(orchestrateur.obtenirSave().flags.flag_grotte_monstre_tue, true, 'le monstre doit bien être mort');
}

console.log('OK test_phase1b_dialogue_antispam');

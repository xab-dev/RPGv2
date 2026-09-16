// Diagnostic SD_grotte-blocage-choix-follet_2026-09-15.md, §C : après
// résolution de A (blocage) et B (réinitialisation), dérouler en headless le
// chemin critique complet de specs/02_grotte.md §7.1 (choix -> salle 1 ->
// levier -> salle 2 -> dialogue -> mort du monstre -> éclats -> séquence de
// leviers -> porte -> placeholder) sur le VRAI code de main.js, à base
// d'inputs abstraits. Rapporte l'état réel (fait / manque / non branché) —
// ne corrige rien ici (contrainte de méthode du diagnostic), sauf ce qui a
// déjà été traité par A et B ailleurs.

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
const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

function etat({ moveX = 0, moveY = 0, attack = false, interact = false } = {}) {
  return {
    move: { x: moveX, y: moveY },
    attack: { pressed: attack, held: attack },
    skill_1: { pressed: false, held: false },
    skill_2: { pressed: false, held: false },
    skill_3: { pressed: false, held: false },
    consume: { pressed: false, held: false },
    interact: { pressed: interact, held: interact },
    menu: { pressed: false, held: false },
  };
}

function creerInputScripte(frames) {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)] };
}

// Marche en ligne droite vers une cible logique, un pas de VITESSE_HERO_PX_S
// par frame (voir main.js) : suffisant pour l'audit, pas de contournement
// d'obstacle (chemins tous en ligne droite dans ce niveau). S'arrête aussi
// tôt qu'un portail franchi (changement de scène) ou qu'un dialogue
// déclenché en chemin gèle le déplacement (etatNeutre sous UI) — continuer à
// viser une coordonnée de l'ancienne scène boucherait sinon jusqu'à
// maxFrames pour de mauvaises raisons, indépendantes du chemin critique.
function avancerVers(orchestrateur, frames, cible, { maxFrames = 400, deltaMs = 16 } = {}) {
  const sceneDepart = orchestrateur.obtenirScene()?.id;
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.obtenirScene()?.id !== sceneDepart) return true;
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

// Comme avancerVers, mais la cible est recalculée chaque frame sur la
// position réelle du monstre (qui chasse le héros dès l'entrée en salle 2,
// §3.5) : viser sa position de spawn figée fait déraper le héros au-delà du
// point de rencontre réel une fois les salles agrandies (diagnostic
// SD_ui-lisibilite, salles ≥18x12 au lieu de 8x5 — plus de distance parcourue
// = plus de dérive du monstre avant que le héros n'arrive), ce qui a fait
// échouer à tort l'assertion d'engagement du follet sans toucher à la
// logique réelle de poursuite. S'arrête dès que le héros est nettement à
// l'intérieur de DISTANCE_ENGAGEMENT_PX (48, companion.js) pour laisser
// l'assertion porter sur l'engagement, pas sur un contact pixel-parfait.
function avancerVersMonstre(orchestrateur, frames, enemyId, { maxFrames = 400, deltaMs = 16 } = {}) {
  const sceneDepart = orchestrateur.obtenirScene()?.id;
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.obtenirScene()?.id !== sceneDepart) return true;
    if (orchestrateur.dialogueOuvert()) return true;
    const hero = orchestrateur.obtenirHero();
    const monstre = orchestrateur.obtenirMonstres().find((m) => m.enemyId === enemyId && !m.mort);
    if (!monstre) return true;
    const dx = monstre.x - hero.x;
    const dy = monstre.y - hero.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 20) return true;
    frames.push(etat({ moveX: dx / distance, moveY: dy / distance }));
    orchestrateur.maj(deltaMs);
  }
  return false;
}

// Pression discrète d'un verbe (une frame vrai, une frame faux) : les
// énigmes de type "sequence" comptent chaque activation, tenir le bouton
// plusieurs frames rejouerait le même levier plusieurs fois (§3.8).
function tapper(orchestrateur, frames, champ, deltaMs = 16) {
  frames.push(etat({ [champ]: true }));
  orchestrateur.maj(deltaMs);
  frames.push(etat({ [champ]: false }));
  orchestrateur.maj(deltaMs);
}

// Anti-spam (03_grotte-polish §3.2, ajouté après ce diagnostic) : fermer une
// ligne exige qu'elle soit d'abord entièrement affichée (machine à écrire)
// PUIS armée (DELAI_ARMEMENT_DIALOGUE_MS écoulées depuis l'affichage
// complet) — d'où le "durée qui s'allonge mécaniquement" mentionné en tête
// de fichier. 2 tappers espacés d'une attente couvrent les 2 mécanismes : le
// 1er peut retomber sur la "frame d'ouverture consommée" (main.js) et ne
// rien faire, le 2ᵉ ne le peut plus (vrai une seule fois par ouverture) et
// force l'affichage complet ; l'attente couvre l'armement ; le dernier
// appui ferme/avance.
function fermerLigneDialogue(orchestrateur, frames, deltaMs = 16) {
  tapper(orchestrateur, frames, 'attack', deltaMs);
  tapper(orchestrateur, frames, 'attack', deltaMs);
  const framesAttente = Math.ceil(DELAI_ARMEMENT_DIALOGUE_MS / deltaMs) + 1;
  for (let i = 0; i < framesAttente; i++) { frames.push(etat()); orchestrateur.maj(deltaMs); }
  tapper(orchestrateur, frames, 'attack', deltaMs);
}

function fermerDialogue(orchestrateur, frames, maxLignes = 6) {
  for (let i = 0; i < maxLignes && orchestrateur.dialogueOuvert(); i++) {
    fermerLigneDialogue(orchestrateur, frames);
  }
  return !orchestrateur.dialogueOuvert();
}

// Intro cinématique (03_grotte-polish §3.5, palier 4, ajoutée après ce
// diagnostic) : cf. commentaire détaillé dans
// test_phase1_sd_grotte_choix_follet_2026-09-15.js (patron dupliqué).
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

function attaquerJusqua(orchestrateur, frames, predicat, { maxFrames = 3000, deltaMs = 16 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (predicat()) return true;
    frames.push(etat({ attack: true }));
    orchestrateur.maj(deltaMs);
  }
  return false;
}

const rapport = [];
function etape(nom, ok, detail = '') {
  rapport.push({ nom, ok, detail });
  assert.ok(ok, `${nom}${detail ? ' — ' + detail : ''}`);
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

  // --- Intro (§3.5, palier 4, ajoutée après ce diagnostic) puis choix du
  // follet (déjà prouvé par test_phase1_sd_grotte_choix_follet, rejoué ici
  // seulement pour atteindre un état jouable) ---
  etape('Intro : narration ouverte à sa fin', avancerJusquauDialogue(orchestrateur, frames));
  fermerLigneDialogue(orchestrateur, frames); // ferme la narration -> choixFollet actif
  tapper(orchestrateur, frames, 'attack'); // confirme l'index par défaut (eau)
  etape('Choix du follet', orchestrateur.obtenirFollet() !== null);
  fermerDialogue(orchestrateur, frames); // dialogue d'enthousiasme
  attendreFinDepart(orchestrateur, frames); // §3.5 étape 4 : follets non élus

  // --- Salle 1 : levier de préfiguration, sans effet visible ---
  const okVersLevier1 = avancerVers(orchestrateur, frames, px(10, 6));
  etape('Salle 1 : atteindre le levier', okVersLevier1);
  tapper(orchestrateur, frames, 'interact');
  const flagsSauvegarde = () => orchestrateur.obtenirSave().flags;
  etape('Salle 1 : levier pose flag_levier_salle1', !!flagsSauvegarde().flag_levier_salle1);

  // --- Portail vers la salle 2 (sans condition) ---
  const okVersPortail1 = avancerVers(orchestrateur, frames, px(19, 6));
  etape('Salle 1 : atteindre la sortie', okVersPortail1);
  // portailFranchi() est vérifié à la frame suivante dans maj() ; une frame
  // neutre suffit à le laisser s'exécuter une fois la zone atteinte.
  frames.push(etat()); orchestrateur.maj(16);
  etape('Transition vers la salle 2', orchestrateur.obtenirScene()?.id === 'scene_grotte_salle_2',
    `scène actuelle : ${orchestrateur.obtenirScene()?.id}`);

  // --- Salle 2 : dialogue tutoriel de combat à l'entrée ---
  etape('Salle 2 : dialogue tutoriel déclenché à l\'entrée', orchestrateur.dialogueOuvert());
  fermerDialogue(orchestrateur, frames);

  // --- Combat : approcher le monstre (le follet doit s'engager), l'achever ---
  const okVersMonstre = avancerVersMonstre(orchestrateur, frames, 'enemy_grotte_rampant');
  etape('Salle 2 : atteindre le monstre', okVersMonstre);
  const monstreCible = () => orchestrateur.obtenirMonstres().find((m) => m.enemyId === 'enemy_grotte_rampant');
  etape('Follet engagé sur le monstre à portée', orchestrateur.obtenirFollet()?.etat === 'engager',
    `état follet = ${orchestrateur.obtenirFollet()?.etat}`);
  const okMonstreMort = attaquerJusqua(orchestrateur, frames, () => monstreCible()?.mort === true);
  etape('Monstre tué en un temps raisonnable', okMonstreMort);
  fermerDialogue(orchestrateur, frames); // dialogue d'introduction des éclats
  etape('Éclats ramassés au contact', orchestrateur.obtenirSave().inventaire.eclats > 0,
    `éclats = ${orchestrateur.obtenirSave().inventaire.eclats}`);

  // --- Séquence des 3 leviers, ordre milieu -> gauche -> droite ---
  for (const pos of [[10, 3], [6, 3], [14, 3]]) {
    avancerVers(orchestrateur, frames, px(...pos));
    tapper(orchestrateur, frames, 'interact');
  }
  etape('Séquence résolue (flag_grotte_sequence)', !!flagsSauvegarde().flag_grotte_sequence);
  etape('Unlock déclenché (flag_grotte_sortie)', !!flagsSauvegarde().flag_grotte_sortie);

  // --- Porte + portail de sortie (condition flag_grotte_sortie) ---
  const okVersPorte = avancerVers(orchestrateur, frames, px(19, 6));
  etape('Salle 2 : atteindre la porte devenue traversable', okVersPorte);
  frames.push(etat()); orchestrateur.maj(16);
  etape('Transition vers le placeholder Maison', orchestrateur.obtenirScene()?.id === 'scene_maison_exterieur_placeholder',
    `scène actuelle : ${orchestrateur.obtenirScene()?.id}`);
}

console.log('--- Audit chemin critique §7.1 (specs/02_grotte.md) ---');
for (const r of rapport) console.log(`[${r.ok ? 'OK' : 'ECHEC'}] ${r.nom}${r.detail ? ' (' + r.detail + ')' : ''}`);
console.log('OK test_phase1_sd_audit_chemin_critique');

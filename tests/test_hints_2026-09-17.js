// Contrat specs/04_indices-commandes.md §7 : (a) déclencheur -> indice
// affiché une fois, flag posé ; (b) rechargement -> pas de second affichage ;
// (c) verbe émis avant le déclencheur -> jamais affiché ; (d) glyphe = celui
// du périphérique actif, mis à jour si le périphérique change en cours
// d'affichage ; (e) catalogue invalide = échec dur au boot. Une seconde
// partie rejoue le chemin critique réel de la Grotte (creerOrchestrateurGrotte,
// même patron que test_phase1_sd_audit_chemin_critique) pour prouver que les
// 3 déclencheurs livrés par cette fiche (MOVE/INTERACT/ATTACK) se déclenchent
// bien au bon moment sur le vrai jeu, pas seulement sur des données factices.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerEtatIndices } from '../src/hints.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue, DELAI_ARMEMENT_DIALOGUE_MS } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// --- Partie A : hints.js pur, registre/flags factices --------------------

function registreFactice({ hints = [], glyphes = [] } = {}) {
  const tables = { hints, glyphes };
  return { tous: (cat) => tables[cat] || [] };
}

function flagsFactices() {
  const poses = new Set();
  return { has: (id) => poses.has(id), set: (id) => poses.add(id), poses };
}

const HINT_TEST = { id: 'hint_x', verbe: 'interact', declencheur: 'test', label_key: 'lbl.x', duree_ms: 1000, flag: 'flag_hint_x' };
const GLYPHE_TEST = { id: 'glyphe_x', verbe: 'interact', clavier_key: 'g.clavier.x', manette_key: 'g.manette.x', tactile_key: 'g.tactile.x' };

{
  // (a) déclencheur -> affiché une fois, flag posé.
  const indices = creerEtatIndices(registreFactice({ hints: [HINT_TEST], glyphes: [GLYPHE_TEST] }));
  const flags = flagsFactices();
  assert.equal(indices.indiceAffiche('manette'), null);
  indices.declencherVerbeUtile('interact', flags);
  assert.ok(flags.has('flag_hint_x'), '(a) le flag doit être posé au déclenchement');
  const rendu = indices.indiceAffiche('manette');
  assert.ok(rendu, '(a) un indice doit être affiché');
  assert.equal(rendu.verbe, 'interact');
  assert.equal(rendu.label_key, 'lbl.x');
  console.log('OK (a) déclencheur -> indice affiché une fois, flag posé');
}

{
  // (b) rechargement de la scène (nouvel état hints.js, même flags déjà posés
  // par une session précédente) -> pas de second affichage.
  const indices = creerEtatIndices(registreFactice({ hints: [HINT_TEST], glyphes: [GLYPHE_TEST] }));
  const flags = flagsFactices();
  flags.set('flag_hint_x'); // simule une sauvegarde où l'indice a déjà été vu
  indices.declencherVerbeUtile('interact', flags);
  assert.equal(indices.indiceAffiche('manette'), null, '(b) déjà montré : aucun second affichage');
  console.log('OK (b) rechargement -> pas de second affichage');
}

{
  // (c) verbe émis AVANT le déclencheur -> jamais montré, flag posé quand même.
  const indices = creerEtatIndices(registreFactice({ hints: [HINT_TEST], glyphes: [GLYPHE_TEST] }));
  const flags = flagsFactices();
  indices.verbeEmis('interact', flags); // le joueur appuie au hasard, avant d'être à portée
  assert.ok(flags.has('flag_hint_x'), '(c) le flag doit être posé dès l\'émission');
  indices.declencherVerbeUtile('interact', flags); // arrive enfin à portée
  assert.equal(indices.indiceAffiche('manette'), null, '(c) jamais affiché si émis avant le déclencheur');
  console.log('OK (c) verbe émis avant déclencheur -> jamais affiché');
}

{
  // (d) glyphe = celui du périphérique actif, relu à chaque appel (pas figé).
  const indices = creerEtatIndices(registreFactice({ hints: [HINT_TEST], glyphes: [GLYPHE_TEST] }));
  const flags = flagsFactices();
  indices.declencherVerbeUtile('interact', flags);
  assert.equal(indices.indiceAffiche('clavier').glyphe_key, 'g.clavier.x');
  assert.equal(indices.indiceAffiche('manette').glyphe_key, 'g.manette.x');
  assert.equal(indices.indiceAffiche('tactile').glyphe_key, 'g.tactile.x');
  console.log('OK (d) glyphe = celui du périphérique actif, mis à jour au changement');
}

{
  // Durée + fermeture anticipée par émission + un seul indice à la fois.
  const HINT_2 = { ...HINT_TEST, id: 'hint_y', verbe: 'attack', flag: 'flag_hint_y' };
  const GLYPHE_2 = { ...GLYPHE_TEST, id: 'glyphe_y', verbe: 'attack' };
  const indices = creerEtatIndices(registreFactice({ hints: [HINT_TEST, HINT_2], glyphes: [GLYPHE_TEST, GLYPHE_2] }));
  const flags = flagsFactices();

  indices.declencherVerbeUtile('interact', flags);
  indices.declencherVerbeUtile('attack', flags); // second déclencheur même frame : attend
  assert.ok(indices.indiceAffiche('manette'), 'le premier indice reste affiché');
  assert.equal(indices.indiceAffiche('manette').verbe, 'interact');
  assert.ok(!flags.has('flag_hint_y'), 'le second déclencheur n\'a pas encore posé son flag (toujours en attente)');

  indices.verbeEmis('interact', flags); // le joueur a compris -> ferme avant la durée
  assert.equal(indices.indiceAffiche('manette'), null);

  indices.declencherVerbeUtile('attack', flags); // le second peut enfin s'afficher
  assert.ok(indices.indiceAffiche('manette'));
  assert.equal(indices.indiceAffiche('manette').verbe, 'attack');

  indices.maj(999); // proche de la fin (duree_ms=1000) mais pas encore
  assert.ok(indices.indiceAffiche('manette'), 'encore affiché juste avant expiration');
  indices.maj(2);
  assert.equal(indices.indiceAffiche('manette'), null, 'expiré après duree_ms');
  console.log('OK durée/fermeture anticipée/un seul indice à la fois');
}

{
  // (e) catalogue invalide = échec dur au boot — un vrai jeu de catalogues
  // (celui du dépôt) avec hints.json/glyphes.json corrompus en mémoire.
  const noms = Object.keys(SCHEMAS);
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms);
  assert.deepEqual(validerCatalogues(donnees), [], 'préalable : le vrai catalogue doit être valide');

  const casseVerbeInconnu = { ...donnees, hints: [{ id: 'hint_bidon', verbe: 'voler', declencheur: 'x', duree_ms: 100, flag: 'flag_hint_move' }] };
  const erreurs1 = validerCatalogues(casseVerbeInconnu);
  assert.ok(erreurs1.some((e) => e.includes('verbe')), '(e) verbe inconnu doit être refusé');

  // skill_1 n'a aucun indice livré par cette fiche (§8, hors scope) — retirer
  // son glyphe puis lui ajouter un indice reproduit fidèlement "un hint sans
  // glyphe pour son verbe".
  const casseSansGlyphe = {
    ...donnees,
    glyphes: donnees.glyphes.filter((g) => g.verbe !== 'skill_1'),
    hints: [...donnees.hints, { id: 'hint_bidon2', verbe: 'skill_1', declencheur: 'x', duree_ms: 100, flag: 'flag_hint_move' }],
  };
  const erreurs2 = validerCatalogues(casseSansGlyphe);
  assert.ok(erreurs2.some((e) => e.includes('glyphes.json')), '(e) hint sans glyphe pour son verbe doit être refusé');

  const casseGlyphe = { ...donnees, glyphes: donnees.glyphes.map((g) => (g.id === 'glyphe_move' ? { ...g, clavier_key: '' } : g)) };
  const erreurs3 = validerCatalogues(casseGlyphe);
  assert.ok(erreurs3.some((e) => e.includes('clavier_key')), '(e) glyphe incomplet doit être refusé');

  console.log('OK (e) catalogue invalide -> échec dur (verbe inconnu / glyphe manquant / glyphe incomplet)');
}

// --- Partie B : intégration sur le vrai orchestrateur de la Grotte -------

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

function creerInputScripte(frames, peripherique = 'manette') {
  let i = 0;
  return { maj: () => frames[Math.min(i++, frames.length - 1)], peripheriqueActif: () => peripherique };
}

const TILE = 32;
const px = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

function avancerVers(orchestrateur, frames, cible, { maxFrames = 400, deltaMs = 16, arret } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    if (orchestrateur.dialogueOuvert()) return true;
    if (arret && arret()) return true;
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

function tapper(orchestrateur, frames, champ, deltaMs = 16) {
  frames.push(etat({ [champ]: true }));
  orchestrateur.maj(deltaMs);
  frames.push(etat({ [champ]: false }));
  orchestrateur.maj(deltaMs);
}

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
  const input = creerInputScripte(frames, 'clavier');

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input,
    ctxLogique: null, ctxVisible: null, canvasLogique: null,
  });

  // Avant tout contrôle (intro en cours) : aucun indice, aucun flag.
  assert.equal(orchestrateur.obtenirIndiceAffiche(), null);
  assert.ok(!save.flags.flag_hint_move);

  avancerJusquauDialogue(orchestrateur, frames);
  fermerLigneDialogue(orchestrateur, frames); // ferme la narration -> choixFollet actif
  tapper(orchestrateur, frames, 'attack'); // confirme le follet par défaut
  fermerDialogue(orchestrateur, frames); // dialogue d'enthousiasme
  attendreFinDepart(orchestrateur, frames);

  // Prise de contrôle : le tout premier maj() hors UI doit déclencher MOVE.
  frames.push(etat());
  orchestrateur.maj(16);
  assert.ok(save.flags.flag_hint_move, 'flag_hint_move posé à la prise de contrôle');
  const indiceMove = orchestrateur.obtenirIndiceAffiche();
  assert.ok(indiceMove, 'un indice MOVE doit être affiché');
  assert.equal(indiceMove.verbe, 'move');
  assert.equal(indiceMove.glyphe_key, 'glyphe.clavier.move', 'glyphe résolu pour le périphérique actif (clavier)');

  // Se déplacer ferme l'indice avant sa durée (§3 : verbe effectivement émis).
  frames.push(etat({ moveX: 1 }));
  orchestrateur.maj(16);
  assert.equal(orchestrateur.obtenirIndiceAffiche(), null, 'MOVE fermé dès l\'émission du verbe');

  // --- Vers le levier de la salle 1 : INTERACT doit se déclencher à portée,
  // AVANT tout appui sur interact.
  avancerVers(orchestrateur, frames, px(10, 6), { arret: () => !!save.flags.flag_hint_interact });
  assert.ok(save.flags.flag_hint_interact, 'flag_hint_interact posé à portée du levier, avant tout appui');
  const indiceInteract = orchestrateur.obtenirIndiceAffiche();
  assert.ok(indiceInteract, 'un indice INTERACT doit être affiché');
  assert.equal(indiceInteract.verbe, 'interact');

  tapper(orchestrateur, frames, 'interact'); // active le levier ET ferme l'indice
  assert.equal(orchestrateur.obtenirIndiceAffiche(), null, 'INTERACT fermé dès l\'émission du verbe');
  assert.ok(save.flags.flag_levier_salle1, 'sanity check : le levier a bien été actionné');

  // --- Vers la salle 2, le monstre : ATTACK doit se déclencher à l'entrée
  // dans la distance d'engagement, avant toute frappe.
  avancerVers(orchestrateur, frames, px(19, 6));
  frames.push(etat()); orchestrateur.maj(16); // laisse portailFranchi() s'exécuter
  assert.equal(orchestrateur.obtenirScene()?.id, 'scene_grotte_salle_2');
  fermerDialogue(orchestrateur, frames); // tuto de combat à l'entrée

  const monstre = () => orchestrateur.obtenirMonstres().find((m) => m.enemyId === 'enemy_grotte_rampant');
  avancerVers(orchestrateur, frames, px(10, 6), {
    maxFrames: 900,
    arret: () => !!save.flags.flag_hint_attack || !monstre(),
  });
  assert.ok(save.flags.flag_hint_attack, 'flag_hint_attack posé à l\'entrée en distance d\'engagement, avant toute frappe');
  const indiceAttack = orchestrateur.obtenirIndiceAffiche();
  assert.ok(indiceAttack, 'un indice ATTACK doit être affiché');
  assert.equal(indiceAttack.verbe, 'attack');

  const tue = attaquerJusqua(orchestrateur, frames, () => monstre()?.mort === true);
  assert.ok(tue, 'sanity check : le monstre doit pouvoir être tué normalement, indice ou pas');
  assert.equal(orchestrateur.obtenirIndiceAffiche(), null, 'ATTACK fermé dès l\'émission du verbe');

  console.log('OK intégration : MOVE/INTERACT/ATTACK déclenchés au bon moment sur le vrai chemin critique');
}

console.log('OK test_hints');

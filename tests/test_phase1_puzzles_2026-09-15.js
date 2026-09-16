// Contrat (§3.8/§7) : levier bascule + flag ; séquence bonne -> flag ;
// mauvais ordre (ou levier répété) -> réinitialisation ; ajouter une 3ᵉ
// instance ailleurs = JSON seulement.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { creerRegistreFlags } from '../src/flags.js';
import { etatInitial, activerLevier } from '../src/puzzles.js';

function donnees() {
  return {
    flags: [
      { id: 'flag_levier_seul', label_key: 'x' },
      { id: 'flag_sequence', label_key: 'x' },
    ],
    unlocks: [],
    puzzles: [
      { id: 'p_seul', type: 'levier', position: { x: 0, y: 0 }, flag_pose: 'flag_levier_seul' },
      { id: 'p_milieu', type: 'levier', position: { x: 1, y: 0 }, flag_pose: null },
      { id: 'p_gauche', type: 'levier', position: { x: 2, y: 0 }, flag_pose: null },
      { id: 'p_droite', type: 'levier', position: { x: 3, y: 0 }, flag_pose: null },
      { id: 'p_sequence', type: 'sequence', ordre: ['p_milieu', 'p_gauche', 'p_droite'], reinit_si_erreur: true, flag_pose: 'flag_sequence' },
    ],
  };
}

// 1. Levier autonome : bascule + pose son flag.
{
  const registre = construireRegistre(donnees());
  const flags = creerRegistreFlags(registre);
  let etat = etatInitial(registre);
  assert.equal(etat.p_seul.actif, false);

  etat = activerLevier(registre, etat, 'p_seul', flags);
  assert.equal(etat.p_seul.actif, true);
  assert.equal(flags.has('flag_levier_seul'), true);
}

// 2. Bon ordre (milieu -> gauche -> droite) : la séquence se résout et pose son flag.
{
  const registre = construireRegistre(donnees());
  const flags = creerRegistreFlags(registre);
  let etat = etatInitial(registre);

  etat = activerLevier(registre, etat, 'p_milieu', flags);
  assert.equal(etat.p_sequence.resolu, false);
  etat = activerLevier(registre, etat, 'p_gauche', flags);
  etat = activerLevier(registre, etat, 'p_droite', flags);

  assert.equal(etat.p_sequence.resolu, true);
  assert.equal(flags.has('flag_sequence'), true);
}

// 3. Mauvais ordre : réinitialisation, aucun flag posé, leviers éteints.
{
  const registre = construireRegistre(donnees());
  const flags = creerRegistreFlags(registre);
  let etat = etatInitial(registre);

  etat = activerLevier(registre, etat, 'p_gauche', flags); // gauche en premier = erreur
  assert.equal(etat.p_sequence.progression, 0);
  assert.equal(etat.p_gauche.actif, false, 'réinitialisé, feedback visuel court');
  assert.equal(flags.has('flag_sequence'), false);
}

// 4. Activer deux fois le même levier compte comme une erreur (réinitialisation).
{
  const registre = construireRegistre(donnees());
  const flags = creerRegistreFlags(registre);
  let etat = etatInitial(registre);

  etat = activerLevier(registre, etat, 'p_milieu', flags);
  etat = activerLevier(registre, etat, 'p_milieu', flags); // répété au lieu de "gauche"
  assert.equal(etat.p_sequence.progression, 0, 'un levier répété doit réinitialiser la séquence');
  assert.equal(flags.has('flag_sequence'), false);
}

// 5. Data-driven : une 2ᵉ séquence indépendante ajoutée en JSON de test
// fonctionne sans toucher puzzles.js (aucun id n'y est câblé en dur).
{
  const d = donnees();
  d.flags.push({ id: 'flag_sequence_2', label_key: 'x' });
  d.puzzles.push(
    { id: 'q_a', type: 'levier', position: { x: 0, y: 1 }, flag_pose: null },
    { id: 'q_b', type: 'levier', position: { x: 1, y: 1 }, flag_pose: null },
    { id: 'q_sequence', type: 'sequence', ordre: ['q_a', 'q_b'], reinit_si_erreur: true, flag_pose: 'flag_sequence_2' }
  );
  const registre = construireRegistre(d);
  const flags = creerRegistreFlags(registre);
  let etat = etatInitial(registre);
  etat = activerLevier(registre, etat, 'q_a', flags);
  etat = activerLevier(registre, etat, 'q_b', flags);
  assert.equal(flags.has('flag_sequence_2'), true);
  // L'autre séquence n'a pas été affectée.
  assert.equal(etat.p_sequence.progression, 0);
}

console.log('OK test_phase1_puzzles');

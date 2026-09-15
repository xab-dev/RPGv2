// Contrat : une frame ne rattrape jamais plus de 100 ms. Le rendu canvas
// lui-même n'est jamais exercé par un test headless (contrainte de méthode) :
// seule la logique pure de plafond de delta-time est testée ici.
import assert from 'node:assert/strict';
import { plafonnerDelta } from '../src/render.js';

assert.equal(plafonnerDelta(16), 16, 'un delta normal ne doit pas être modifié');
assert.equal(plafonnerDelta(500), 100, 'un delta trop grand doit être plafonné à 100 ms');
assert.equal(plafonnerDelta(100), 100, 'la borne exacte doit être conservée');
assert.equal(plafonnerDelta(0), 0);

console.log('OK test_phase0_render_delta');

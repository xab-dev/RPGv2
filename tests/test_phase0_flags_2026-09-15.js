// Contrat : les déblocages passent par un registre de flags central,
// conditions exprimées en données.
import assert from 'node:assert/strict';
import { construireRegistre } from '../src/registry.js';
import { creerRegistreFlags } from '../src/flags.js';

function registreDeTest(unlocks = []) {
  const donnees = {
    flags: [
      { id: 'flag_a', label_key: 'x' },
      { id: 'flag_b', label_key: 'x' },
      { id: 'flag_c', label_key: 'x' },
      { id: 'flag_deblocage', label_key: 'x' },
    ],
    unlocks,
  };
  return construireRegistre(donnees);
}

// 1. set d'un flag non déclaré → rejeté (mode dev : exception).
{
  const flags = creerRegistreFlags(registreDeTest());
  assert.throws(() => flags.set('flag_inexistant'), /non déclaré/);
}

// 2. set d'un flag non déclaré en mode "prod" → ignoré silencieusement, avec log.
{
  const flags = creerRegistreFlags(registreDeTest(), { mode: 'prod' });
  assert.doesNotThrow(() => flags.set('flag_inexistant'));
  assert.equal(flags.has('flag_inexistant'), false);
}

// 3. has/set basique.
{
  const flags = creerRegistreFlags(registreDeTest());
  assert.equal(flags.has('flag_a'), false);
  flags.set('flag_a');
  assert.equal(flags.has('flag_a'), true);
}

// 4. conditions all / any / not imbriquées.
{
  const flags = creerRegistreFlags(registreDeTest());
  flags.set('flag_a');

  assert.equal(flags.evaluate({ all: ['flag_a', 'flag_b'] }), false);
  flags.set('flag_b');
  assert.equal(flags.evaluate({ all: ['flag_a', 'flag_b'] }), true);

  assert.equal(flags.evaluate({ any: ['flag_c', 'flag_b'] }), true);
  assert.equal(flags.evaluate({ not: 'flag_c' }), true);

  assert.equal(flags.evaluate({ all: ['flag_a', { any: ['flag_c', 'flag_b'] }] }), true);
  assert.equal(flags.evaluate({ all: ['flag_a', { any: ['flag_c'] }] }), false);
}

// 5. un unlock est posé automatiquement quand sa condition devient vraie.
{
  const unlocks = [
    { id: 'unlock_test', condition: { all: ['flag_a', 'flag_b'] }, target: 'flag_deblocage' },
  ];
  const flags = creerRegistreFlags(registreDeTest(unlocks));

  flags.set('flag_a');
  assert.equal(flags.has('flag_deblocage'), false, 'la condition n\'est pas encore remplie');

  flags.set('flag_b');
  assert.equal(flags.has('flag_deblocage'), true, 'l\'unlock doit se poser dès que sa condition devient vraie');
}

console.log('OK test_phase0_flags');

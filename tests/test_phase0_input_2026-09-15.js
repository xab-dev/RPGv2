// Contrat : le gameplay ne connaît aucun périphérique, seulement des verbes.
import assert from 'node:assert/strict';
import { creerSourceClavier } from '../src/input/keyboard.js';
import { creerSourceManette } from '../src/input/gamepad.js';
import { creerCoucheInput } from '../src/input/input.js';

// Faux EventTarget minimal : le module clavier ne doit rien connaître de
// plus qu'addEventListener (cf. contrainte "faux DOM minimal en test").
function creerFausseCible() {
  const gestionnaires = {};
  return {
    addEventListener(type, fn) {
      (gestionnaires[type] ||= []).push(fn);
    },
    emettre(type, code) {
      for (const fn of gestionnaires[type] || []) fn({ code });
    },
  };
}

function creerFausseManette({ axes = [0, 0], boutonsAppuyes = [], index = 0 } = {}) {
  const boutons = Array.from({ length: 12 }, (_, i) => ({ pressed: boutonsAppuyes.includes(i) }));
  return { index, axes, buttons: boutons };
}

// 1. Un événement clavier produit `move`.
{
  const cible = creerFausseCible();
  const clavier = creerSourceClavier(cible);
  cible.emettre('keydown', 'KeyD');
  const etat = clavier.instantane();
  assert.equal(etat.move.x, 1);
  assert.equal(etat.move.y, 0);
}

// 2. Un événement manette produit le même `move` qu'un événement clavier équivalent.
{
  const nav = { getGamepads: () => [creerFausseManette({ axes: [1, 0] })] };
  const manette = creerSourceManette(nav);
  const etatManette = manette.instantane();

  const cible = creerFausseCible();
  const clavier = creerSourceClavier(cible);
  cible.emettre('keydown', 'KeyD');
  const etatClavier = clavier.instantane();

  assert.equal(etatManette.move.x, etatClavier.move.x);
  assert.equal(etatManette.move.y, etatClavier.move.y);
}

// 3. `pressed` n'est vrai qu'une seule frame, `held` reste vrai tant que la touche l'est.
{
  const cible = creerFausseCible();
  const input = creerCoucheInput({ sourceClavier: creerSourceClavier(cible), sourceManette: null });

  cible.emettre('keydown', 'Space');
  const frame1 = input.maj();
  assert.equal(frame1.attack.pressed, true);
  assert.equal(frame1.attack.held, true);

  const frame2 = input.maj();
  assert.equal(frame2.attack.pressed, false, 'pressed doit retomber dès la frame suivante');
  assert.equal(frame2.attack.held, true);

  cible.emettre('keyup', 'Space');
  const frame3 = input.maj();
  assert.equal(frame3.attack.pressed, false);
  assert.equal(frame3.attack.held, false);
}

// 4. Débranchement de la manette en cours de partie → held retombe à faux, sans rechargement.
{
  let manetteConnectee = true;
  const nav = {
    getGamepads: () => (manetteConnectee ? [creerFausseManette({ boutonsAppuyes: [0] })] : []),
  };
  const manette = creerSourceManette(nav);
  const input = creerCoucheInput({ sourceClavier: null, sourceManette: manette });

  const frame1 = input.maj();
  assert.equal(frame1.attack.held, true);

  manetteConnectee = false;
  const frame2 = input.maj();
  assert.equal(frame2.attack.held, false, 'held ne doit jamais rester "collé" après débranchement');
}

// 5. Deux manettes connectées → la première qui produit une entrée devient active,
//    et le reste active même si une manette neutre est ajoutée ensuite.
{
  const manetteInactive = creerFausseManette({ index: 0 });
  const manetteActive = creerFausseManette({ index: 1, boutonsAppuyes: [0] });
  const nav = { getGamepads: () => [manetteInactive, manetteActive] };
  const manette = creerSourceManette(nav);

  const etat1 = manette.instantane();
  assert.equal(etat1.attack, true, 'la manette qui produit une entrée doit devenir active');

  // Frame suivante : plus aucun bouton appuyé, mais la manette active reste la même.
  manetteActive.buttons[0].pressed = false;
  const etat2 = manette.instantane();
  assert.equal(etat2.attack, false);
}

// 6. Hot-swap clavier <-> manette : les deux sources contribuent au même état sans rechargement.
{
  const cible = creerFausseCible();
  const nav = { getGamepads: () => [creerFausseManette({ boutonsAppuyes: [0] })] };
  const input = creerCoucheInput({ sourceClavier: creerSourceClavier(cible), sourceManette: creerSourceManette(nav) });
  const etat = input.maj();
  assert.equal(etat.attack.held, true, 'la manette doit être prise en compte immédiatement');
}

console.log('OK test_phase0_input');

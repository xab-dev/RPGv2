// D-22 (MT_clavier-e-f_2026-09-19.md) : au clavier, `E` = INTERACT (l'action
// la plus fréquente, sous la main gauche posée sur les touches de
// déplacement) et `F` = CONSUME (plus rare). Avant ce ticket, les deux
// touches portaient les verbes inverses.
//
// Le fichier verrouille aussi l'accord entre les DEUX sources qui décrivent
// aujourd'hui la même touche : le mapping de `input/keyboard.js` (ce que le
// jeu écoute) et le libellé des glyphes dans `locales/*.json` (ce que
// l'indice de commande affiche). Ces deux sources ne dérivent pas l'une de
// l'autre — c'est la dette `D-25`, ouverte par ce ticket ; en attendant, ce
// test empêche qu'elles divergent en silence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creerSourceClavier, MAPPING_CLAVIER_PROVISOIRE } from '../src/input/keyboard.js';

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

// 1. `E` produit INTERACT, et rien d'autre.
{
  const cible = creerFausseCible();
  const clavier = creerSourceClavier(cible);
  cible.emettre('keydown', 'KeyE');
  const etat = clavier.instantane();
  assert.equal(etat.interact, true, 'KeyE doit produire INTERACT');
  assert.equal(etat.consume, false, 'KeyE ne doit pas produire CONSUME');
}

// 2. `F` produit CONSUME, et rien d'autre.
{
  const cible = creerFausseCible();
  const clavier = creerSourceClavier(cible);
  cible.emettre('keydown', 'KeyF');
  const etat = clavier.instantane();
  assert.equal(etat.consume, true, 'KeyF doit produire CONSUME');
  assert.equal(etat.interact, false, 'KeyF ne doit pas produire INTERACT');
}

// 3. Aucun autre verbe ne s'est mis à écouter `E` ou `F` au passage.
{
  for (const [verbe, codes] of Object.entries(MAPPING_CLAVIER_PROVISOIRE)) {
    if (verbe === 'interact') continue;
    assert.ok(!codes.includes('KeyE'), `KeyE ne doit être écouté que par interact, pas par ${verbe}`);
  }
  for (const [verbe, codes] of Object.entries(MAPPING_CLAVIER_PROVISOIRE)) {
    if (verbe === 'consume') continue;
    assert.ok(!codes.includes('KeyF'), `KeyF ne doit être écouté que par consume, pas par ${verbe}`);
  }
}

// 4. Le glyphe affiché dit la même touche que celle qui est écoutée — dans
//    les deux langues. Garde-fou de `D-25` (deux sources pour une touche).
{
  const LETTRE_ATTENDUE = { interact: 'E', consume: 'F' };
  for (const langue of ['fr', 'en']) {
    const libelles = JSON.parse(readFileSync(new URL(`../locales/${langue}.json`, import.meta.url), 'utf8'));
    for (const [verbe, lettre] of Object.entries(LETTRE_ATTENDUE)) {
      assert.equal(
        libelles[`glyphe.clavier.${verbe}`],
        lettre,
        `${langue}.json : le glyphe clavier de ${verbe} doit dire ${lettre}`,
      );
      assert.deepEqual(
        MAPPING_CLAVIER_PROVISOIRE[verbe],
        [`Key${lettre}`],
        `le mapping de ${verbe} doit écouter Key${lettre}`,
      );
    }
  }
}

console.log('OK test_d22_clavier_e_f');

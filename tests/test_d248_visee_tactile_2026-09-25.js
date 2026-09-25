// `D-248` (`Q-167`, Xav : « un tap and drag de la compétence pour téléphone »)
// — la couche tactile. Le trajet du tir, une fois la direction connue, est
// éprouvé par `test_d247_visee_curseur` (le même `lireVisee`).
//
// Contrats :
// 1. Sans verbe qui vise annoncé, un bouton part au contact, comme avant.
// 2. Un bouton qui vise ne part pas sous le doigt, mais une seule lecture
//    après son relâchement ; un glissé au-delà du seuil donne sa direction,
//    un simple toucher n'en donne aucune (la visée automatique).
// 3. Pendant le glissé, la visée en cours est lisible (ce que le rendu montre).
// 4. Un contact annulé par le système ne lance rien ; un doigt capturé ne
//    presse aucun autre bouton qu'il traverse ; un doigt venu d'ailleurs ne
//    capture pas le bouton.
import assert from 'node:assert/strict';
import { creerSourceTactile, SEUIL_GLISSE_PX } from '../src/input/touch.js';
import { BOUTONS_SKILLS, BOUTON_ATTAQUE } from '../src/ui/hud_layout.js';

function creerFausseCible() {
  const gestionnaires = { touchstart: [], touchmove: [], touchend: [], touchcancel: [] };
  return {
    addEventListener(type, fn) { gestionnaires[type].push(fn); },
    emettre(type, touches) { for (const fn of gestionnaires[type]) fn({ touches, changedTouches: touches }); },
  };
}
const toucher = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
const BOUTON = BOUTONS_SKILLS.find((b) => b.verbe === 'skill_1');
const VERBES = ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume'];

function source(visants = ['skill_1']) {
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible, { verbesActions: () => VERBES, verbesVisants: () => visants });
  return { cible, tactile };
}

// --- 1. Sans verbe qui vise : au contact ----------------------------------------
{
  const { cible, tactile } = source([]);
  cible.emettre('touchstart', [toucher(1, BOUTON.cx, BOUTON.cy)]);
  assert.equal(tactile.instantane().skill_1, true, 'au contact, comme avant');
  console.log('OK sans visée annoncée, le bouton part au contact');
}

// --- 2. Glisser puis lâcher ; toucher puis lâcher --------------------------------
{
  const { cible, tactile } = source();
  cible.emettre('touchstart', [toucher(1, BOUTON.cx, BOUTON.cy)]);
  assert.equal(tactile.instantane().skill_1, false, 'rien au contact');
  cible.emettre('touchmove', [toucher(1, BOUTON.cx - 4, BOUTON.cy - SEUIL_GLISSE_PX * 3)]);
  assert.equal(tactile.instantane().skill_1, false, 'rien pendant le glissé');
  cible.emettre('touchend', []);
  assert.equal(tactile.instantane().skill_1, true, 'relâché : la compétence part');
  assert.deepEqual(tactile.viseeTactile('skill_1'), { dx: -4, dy: -SEUIL_GLISSE_PX * 3 }, 'dans la direction du glissé');
  assert.equal(tactile.instantane().skill_1, false, 'une seule lecture');
  assert.equal(tactile.viseeTactile('skill_1'), null);

  cible.emettre('touchstart', [toucher(2, BOUTON.cx, BOUTON.cy)]);
  tactile.instantane();
  cible.emettre('touchmove', [toucher(2, BOUTON.cx + SEUIL_GLISSE_PX / 3, BOUTON.cy)]);
  cible.emettre('touchend', []);
  assert.equal(tactile.instantane().skill_1, true, 'un simple toucher part aussi');
  assert.equal(tactile.viseeTactile('skill_1'), null, 'sans direction : la visée automatique');
  console.log('OK un glissé part au relâchement, dans sa direction ; un toucher, en visée automatique');
}

// --- 3. La visée en cours ------------------------------------------------------
{
  const { cible, tactile } = source();
  cible.emettre('touchstart', [toucher(1, BOUTON.cx, BOUTON.cy)]);
  assert.deepEqual(tactile.glissesEnCours(), [], 'sous le seuil : rien à montrer');
  cible.emettre('touchmove', [toucher(1, BOUTON.cx + 30, BOUTON.cy)]);
  assert.deepEqual(tactile.glissesEnCours(), [{ verbe: 'skill_1', dx: 30, dy: 0 }]);
  cible.emettre('touchend', []);
  assert.deepEqual(tactile.glissesEnCours(), [], 'relâché : plus de visée en cours');
  console.log('OK la visée en cours se lit pendant le glissé');
}

// --- 4. Annulé, traversées, doigt venu d'ailleurs --------------------------------
{
  const { cible, tactile } = source();
  cible.emettre('touchstart', [toucher(1, BOUTON.cx, BOUTON.cy)]);
  cible.emettre('touchmove', [toucher(1, BOUTON.cx, BOUTON.cy - 40)]);
  cible.emettre('touchcancel', []);
  assert.equal(tactile.instantane().skill_1, false, 'un contact annulé ne lance rien');

  cible.emettre('touchstart', [toucher(2, BOUTON.cx, BOUTON.cy)]);
  cible.emettre('touchmove', [toucher(2, BOUTON_ATTAQUE.cx, BOUTON_ATTAQUE.cy)]);
  assert.equal(tactile.instantane().attack, false, 'le doigt qui vise traverse l\'attaque sans la presser');
  cible.emettre('touchend', []);
  tactile.instantane();

  cible.emettre('touchstart', [toucher(3, BOUTON_ATTAQUE.cx, BOUTON_ATTAQUE.cy)]);
  assert.equal(tactile.instantane().attack, true, 'l\'attaque, elle, part au contact');
  cible.emettre('touchmove', [toucher(3, BOUTON.cx, BOUTON.cy)]);
  assert.equal(tactile.instantane().skill_1, false, 'un doigt venu d\'ailleurs, posé sur le bouton, ne le presse pas');
  cible.emettre('touchend', []);
  assert.equal(tactile.instantane().skill_1, false, 'un doigt venu d\'ailleurs ne lance pas la compétence');
  console.log('OK annulé, traversées et doigt venu d\'ailleurs ne lancent rien');
}

console.log('OK test_d248_visee_tactile');

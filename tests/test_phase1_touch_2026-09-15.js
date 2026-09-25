// Contrat (§2.3/§4/§7) : joystick -> move normalisé, relâchement -> {0,0}
// immédiatement, tap sur un bouton -> verbe vrai une frame après passage par
// la couche d'input (pressed).
import assert from 'node:assert/strict';
import { creerSourceTactile } from '../src/input/touch.js';
import { creerCoucheInput } from '../src/input/input.js';
import { JOYSTICK, LIMITE_JOYSTICK, BOUTON_ATTAQUE } from '../src/ui/hud_layout.js';

// Faux EventTarget minimal, identité écran = logique (versLogique par défaut).
function creerFausseCible() {
  const gestionnaires = { touchstart: [], touchmove: [], touchend: [], touchcancel: [] };
  return {
    addEventListener(type, fn) {
      gestionnaires[type].push(fn);
    },
    emettre(type, touches) {
      const evt = { touches, changedTouches: touches };
      for (const fn of gestionnaires[type]) fn(evt);
    },
  };
}

function toucher(id, x, y) {
  return { identifier: id, clientX: x, clientY: y };
}

// `D-138` : le joystick flotte — son centre est l'endroit où le pouce s'est
// posé. Les contrats de la laisse, de la zone morte et de la marche lente
// vivent dans `test_d138_joystick_laisse_2026-09-25.js` ; ici, ceux du 15/09
// réécrits pour un centre qui naît sous le pouce.
const PLEINE_COURSE = JOYSTICK.rayonZone * JOYSTICK.pleineVitesse;

// 1. Un doigt qui se pose -> move = {0,0}, où qu'il tombe dans la limite
// (`D-251` : posé au-delà, le cercle reste dans la limite et le héros part).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  const ecart = LIMITE_JOYSTICK.rayonCentre * 0.6;
  cible.emettre('touchstart', [toucher(1, LIMITE_JOYSTICK.cx + ecart, LIMITE_JOYSTICK.cy - ecart)]);
  const etat = tactile.instantane();
  assert.equal(etat.move.x, 0);
  assert.equal(etat.move.y, 0);
}

// 2. Un doigt poussé de la course de pleine vitesse -> magnitude 1, normalisée.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.cx + PLEINE_COURSE, JOYSTICK.cy)]);
  const etat = tactile.instantane();
  assert.ok(Math.abs(etat.move.x - 1) < 1e-9);
  assert.equal(etat.move.y, 0);
}

// 3. Un doigt poussé bien au-delà -> magnitude clampée à 1 (jamais plus).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.cx + 3 * JOYSTICK.rayonZone, JOYSTICK.cy)]);
  // `D-251` : le centre tiré bute sur la limite, la direction peut s'en
  // écarter d'un poil ; le contrat est la magnitude.
  const { move } = tactile.instantane();
  assert.ok(Math.abs(Math.hypot(move.x, move.y) - 1) < 1e-9);
  assert.ok(move.x > 0.99);
}

// 3 bis. `D-137` : un PREMIER contact hors de la bande ne prend pas le
// joystick — c'est la zone de jeu, pas le pouce gauche.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.limiteX + 1, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.limiteX + 1 + JOYSTICK.rayonZone, JOYSTICK.cy)]);
  const etat = tactile.instantane();
  assert.equal(etat.move.x, 0);
  assert.equal(etat.move.y, 0);
}

// 3 ter. `D-137` : un doigt DÉJÀ attribué qui glisse hors de la bande garde
// la main — réduire la bande ne doit jamais couper un déplacement en cours.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.limiteX + 40, JOYSTICK.cy)]);
  assert.ok(tactile.instantane().move.x > 0.99);
}

// 4. Relâchement -> move revient à {0,0} immédiatement (aucun état collé).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy)]);
  assert.notEqual(tactile.instantane().move.x, 0);
  cible.emettre('touchend', []);
  const etat = tactile.instantane();
  assert.equal(etat.move.x, 0);
  assert.equal(etat.move.y, 0);
}

// 5. Deux doigts sur le joystick : le premier entré fait foi, le second est ignoré.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy)]);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy), toucher(2, JOYSTICK.cx - 20, JOYSTICK.cy)]);
  const etat = tactile.instantane();
  assert.ok(etat.move.x > 0.9, 'le premier doigt (identifier 1) doit continuer à faire foi');
}

// 6. Tap sur le bouton d'attaque -> verbe brut vrai, et `pressed` une seule
// frame une fois passé par creerCoucheInput (même contrat que clavier/manette).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  const input = creerCoucheInput({ sourceClavier: null, sourceManette: null, sourceTactile: tactile });

  cible.emettre('touchstart', [toucher(1, BOUTON_ATTAQUE.cx, BOUTON_ATTAQUE.cy)]);
  const frame1 = input.maj();
  assert.equal(frame1.attack.pressed, true);
  assert.equal(frame1.attack.held, true);

  const frame2 = input.maj();
  assert.equal(frame2.attack.pressed, false, 'pressed retombe dès la frame suivante');
  assert.equal(frame2.attack.held, true);

  cible.emettre('touchend', []);
  const frame3 = input.maj();
  assert.equal(frame3.attack.held, false);
}

// 7. Le tactile ne s'active (estActif) qu'après un premier touchstart.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  assert.equal(tactile.estActif(), false);
  cible.emettre('touchstart', [toucher(1, 0, 0)]);
  assert.equal(tactile.estActif(), true);
}

// 8. versLogique est bien appliqué : des coordonnées écran mises à l'échelle
// retombent sur la bonne zone logique.
{
  const cible = creerFausseCible();
  const echelle = 2;
  const tactile = creerSourceTactile(cible, { versLogique: (x, y) => ({ x: x / echelle, y: y / echelle }) });
  cible.emettre('touchstart', [toucher(1, BOUTON_ATTAQUE.cx * echelle, BOUTON_ATTAQUE.cy * echelle)]);
  assert.equal(tactile.instantane().attack, true);
}

console.log('OK test_phase1_touch');

// Contrat (§2.3/§4/§7) : joystick -> move normalisé, relâchement -> {0,0}
// immédiatement, tap sur un bouton -> verbe vrai une frame après passage par
// la couche d'input (pressed).
import assert from 'node:assert/strict';
import { creerSourceTactile } from '../src/input/touch.js';
import { creerCoucheInput } from '../src/input/input.js';
import { JOYSTICK, BOUTON_ATTAQUE } from '../src/ui/hud_layout.js';

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

// 1. Un doigt au centre du joystick -> move = {0,0}.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx, JOYSTICK.cy)]);
  const etat = tactile.instantane();
  assert.equal(etat.move.x, 0);
  assert.equal(etat.move.y, 0);
}

// 2. Un doigt poussé à la limite de la zone -> magnitude 1, normalisée.
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy)]);
  const etat = tactile.instantane();
  assert.ok(Math.abs(etat.move.x - 1) < 1e-9);
  assert.equal(etat.move.y, 0);
}

// 3. Un doigt bien au-delà du rayon visuel (mais toujours dans la moitié
// gauche de l'écran, §2.3) -> magnitude clampée à 1 (jamais plus).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone * 2, JOYSTICK.cy)]);
  const etat = tactile.instantane();
  assert.equal(etat.move.x, 1);
}

// 4. Relâchement -> move revient à {0,0} immédiatement (aucun état collé).
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy)]);
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
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy)]);
  cible.emettre('touchmove', [toucher(1, JOYSTICK.cx + JOYSTICK.rayonZone, JOYSTICK.cy), toucher(2, JOYSTICK.cx, JOYSTICK.cy)]);
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

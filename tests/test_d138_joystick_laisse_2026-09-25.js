// Contrat `D-138` (25/09) : le joystick tactile flotte, en laisse.
//   1. la pleine vitesse s'atteint dans TOUTES les directions, où que le
//      pouce se soit posé (le défaut du centre fixe : 44 % d'un côté) ;
//   2. un pouce immobile qui tremble ne fait rien (zone morte) ;
//   3. la marche lente reste : entre la zone morte et la pleine vitesse, la
//      magnitude monte strictement (Xav : « je préfère garder le choix ») ;
//   4. la laisse : un pouce parti loin fait demi-tour à pleine vitesse en
//      parcourant au plus le rayon plus la course de pleine vitesse ;
//   5. un pouce posé contre un bord atteint quand même la pleine vitesse vers
//      ce bord ;
//   6. ce que le HUD dessine suit le pouce, et se tait au repos.
// Aucune valeur de réglage n'est épinglée : tout se déduit de `JOYSTICK`.
import assert from 'node:assert/strict';
import { creerSourceTactile } from '../src/input/touch.js';
import { JOYSTICK, magnitudeJoystick } from '../src/ui/hud_layout.js';
import { RESOLUTION_LOGIQUE } from '../src/render.js';

function creerFausseCible() {
  const gestionnaires = { touchstart: [], touchmove: [], touchend: [], touchcancel: [] };
  return {
    addEventListener(type, fn) { gestionnaires[type].push(fn); },
    emettre(type, touches) {
      const evt = { touches, changedTouches: touches };
      for (const fn of gestionnaires[type]) fn(evt);
    },
  };
}
const toucher = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
const magnitude = (move) => Math.hypot(move.x, move.y);
const PLEINE_COURSE = JOYSTICK.rayonZone * JOYSTICK.pleineVitesse;
const EPS = 1e-9;

function poser(x, y) {
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  cible.emettre('touchstart', [toucher(1, x, y)]);
  return {
    tactile,
    glisser: (gx, gy) => cible.emettre('touchmove', [toucher(1, gx, gy)]),
    lever: () => cible.emettre('touchend', []),
  };
}

// --- 1. Pleine vitesse partout, d'où qu'on parte ---------------------------
{
  const poses = [
    [JOYSTICK.cx, JOYSTICK.cy],
    [JOYSTICK.cx + 25, JOYSTICK.cy],
    [JOYSTICK.cx - 25, JOYSTICK.cy + 15],
    [JOYSTICK.limiteX - 1, JOYSTICK.cy - 60],
  ];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2]];
  for (const [px, py] of poses) {
    for (const [ux, uy] of directions) {
      const { tactile, glisser } = poser(px, py);
      glisser(px + ux * PLEINE_COURSE, py + uy * PLEINE_COURSE);
      const move = tactile.instantane().move;
      assert.ok(Math.abs(magnitude(move) - 1) < EPS, `posé en (${px}, ${py}), poussé vers (${ux}, ${uy}) : ${magnitude(move)}`);
      assert.ok(move.x * ux + move.y * uy > 0.99, 'dans la direction du geste');
    }
  }
  console.log('OK la pleine vitesse dans toutes les directions, d’où que le pouce parte');
}

// --- 2. Zone morte ---------------------------------------------------------
{
  const { tactile, glisser } = poser(JOYSTICK.cx, JOYSTICK.cy);
  glisser(JOYSTICK.cx + JOYSTICK.rayonZone * JOYSTICK.zoneMorte * 0.9, JOYSTICK.cy);
  assert.deepEqual(tactile.instantane().move, { x: 0, y: 0 });
  console.log('OK un pouce qui tremble ne bouge rien');
}

// --- 3. La marche lente reste ---------------------------------------------
{
  const debut = JOYSTICK.rayonZone * JOYSTICK.zoneMorte;
  let precedente = 0;
  for (let i = 1; i < 10; i += 1) {
    const d = debut + (PLEINE_COURSE - debut) * (i / 10);
    const m = magnitudeJoystick(d);
    assert.ok(m > precedente && m < 1, `entre la zone morte et la pleine vitesse, la magnitude monte (${d} px : ${m})`);
    precedente = m;
  }
  const { tactile, glisser } = poser(JOYSTICK.cx, JOYSTICK.cy);
  glisser(JOYSTICK.cx + (debut + PLEINE_COURSE) / 2, JOYSTICK.cy);
  const m = magnitude(tactile.instantane().move);
  assert.ok(m > 0 && m < 1, `un pouce à mi-course marche lentement (${m})`);
  console.log('OK la marche lente, comme au stick');
}

// --- 4. La laisse : un demi-tour coûte au plus rayon + course --------------
{
  const { tactile, glisser } = poser(JOYSTICK.cx, JOYSTICK.cy);
  // Le pouce part loin vers la droite, par petits pas comme un vrai glissé.
  for (let x = JOYSTICK.cx; x <= JOYSTICK.cx + 200; x += 5) glisser(x, JOYSTICK.cy);
  assert.equal(tactile.instantane().move.x, 1);
  const loin = JOYSTICK.cx + 200;
  const retour = loin - (JOYSTICK.rayonZone + PLEINE_COURSE);
  for (let x = loin; x >= retour; x -= 5) glisser(x, JOYSTICK.cy);
  glisser(retour, JOYSTICK.cy);
  const move = tactile.instantane().move;
  assert.ok(Math.abs(move.x + 1) < EPS, `demi-tour à pleine vitesse après rayon + course (${move.x})`);
  // Et le centre n'est jamais à plus d'un rayon du pouce.
  const vu = tactile.joystickAffiche();
  assert.ok(Math.hypot(vu.x - vu.cx, vu.y - vu.cy) <= JOYSTICK.rayonZone + EPS);
  console.log('OK la laisse tire le centre derrière le pouce');
}

// --- 5. Contre un bord ----------------------------------------------------
{
  const bords = [
    { pose: [1, JOYSTICK.cy], vers: [0, JOYSTICK.cy], sens: [-1, 0] },
    { pose: [JOYSTICK.cx, RESOLUTION_LOGIQUE.hauteur - 1], vers: [JOYSTICK.cx, RESOLUTION_LOGIQUE.hauteur], sens: [0, 1] },
    { pose: [JOYSTICK.cx, 1], vers: [JOYSTICK.cx, 0], sens: [0, -1] },
  ];
  for (const { pose, vers, sens } of bords) {
    const { tactile, glisser } = poser(...pose);
    glisser(...vers);
    const move = tactile.instantane().move;
    assert.ok(move.x * sens[0] + move.y * sens[1] > 1 - EPS, `pleine vitesse vers le bord depuis (${pose}) : ${JSON.stringify(move)}`);
  }
  console.log('OK un pouce contre le bord va quand même à fond vers lui');
}

// --- 6. Ce que le HUD dessine ----------------------------------------------
{
  const cible = creerFausseCible();
  const tactile = creerSourceTactile(cible);
  assert.equal(tactile.joystickAffiche(), null, 'au repos, rien : le cercle reste à sa place d’origine');
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + 10, JOYSTICK.cy - 10)]);
  assert.deepEqual(tactile.joystickAffiche(), { cx: JOYSTICK.cx + 10, cy: JOYSTICK.cy - 10, x: JOYSTICK.cx + 10, y: JOYSTICK.cy - 10 });
  // Un second doigt (l'attaque) ne déplace pas le centre.
  cible.emettre('touchstart', [toucher(1, JOYSTICK.cx + 20, JOYSTICK.cy - 10), toucher(2, 420, 210)]);
  assert.equal(tactile.joystickAffiche().cx, JOYSTICK.cx + 10);
  assert.equal(tactile.joystickAffiche().x, JOYSTICK.cx + 20);
  cible.emettre('touchend', [toucher(2, 420, 210)]);
  assert.equal(tactile.joystickAffiche(), null, 'pouce levé : retour au repos');
  // Un doigt posé hors de la bande n'affiche rien.
  cible.emettre('touchstart', [toucher(3, JOYSTICK.limiteX + 5, JOYSTICK.cy)]);
  assert.equal(tactile.joystickAffiche(), null);
  console.log('OK le HUD suit le pouce, et se tait au repos');
}

console.log('OK test_d138_joystick_laisse');

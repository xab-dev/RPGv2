// Contrat `D-138` (25/09) : le joystick tactile flotte, en laisse.
//   1. la pleine vitesse s'atteint dans TOUTES les directions, où que le
//      pouce se soit posé dans la limite (le défaut du centre fixe : 44 %
//      d'un côté) ;
//   2. un pouce immobile qui tremble ne fait rien (zone morte) ;
//   3. la marche lente reste : entre la zone morte et la pleine vitesse, la
//      magnitude monte strictement (Xav : « je préfère garder le choix ») ;
//   4. la laisse : un pouce parti loin (le centre tiré restant dans la
//      limite) fait demi-tour à pleine vitesse en parcourant au plus le rayon
//      plus la course de pleine vitesse ;
//   5. `D-251` : la laisse a une limite — le cercle tiré reste entier dans le
//      cercle qui touche le bord gauche, le bas et l'horizontale du milieu, à
//      `margeLimite` px de son bord, quel que soit le chemin du pouce ; au-delà,
//      le héros va à fond vers le pouce ;
//   6. ce que le HUD dessine suit le pouce, et se tait au repos.
// Aucune valeur de réglage n'est épinglée : tout se déduit de `JOYSTICK`.
import assert from 'node:assert/strict';
import { creerSourceTactile } from '../src/input/touch.js';
import { JOYSTICK, LIMITE_JOYSTICK, bornerCentreJoystick, magnitudeJoystick } from '../src/ui/hud_layout.js';
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
  // Le repos, le centre de la limite, et des poses près de son bord (à
  // droite, la bande de capture s'arrête avant elle).
  const L = LIMITE_JOYSTICK;
  const pres = L.rayonCentre * 0.9;
  const poses = [
    [JOYSTICK.cx, JOYSTICK.cy],
    [L.cx, L.cy],
    [Math.min(L.cx + pres, JOYSTICK.limiteX - 1), L.cy],
    [L.cx - pres, L.cy],
    [L.cx, L.cy + pres],
    [L.cx, L.cy - pres],
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
  // Le pouce part d'un bord de la limite et court vers l'autre, par petits
  // pas comme un vrai glissé : le centre, tiré, traverse la limite sans
  // jamais la toucher.
  const L = LIMITE_JOYSTICK;
  const depart = L.cx - L.rayonCentre * 0.9;
  const loin = L.cx + L.rayonCentre * 0.9 + JOYSTICK.rayonZone;
  const { tactile, glisser } = poser(depart, L.cy);
  for (let x = depart; x <= loin; x += 5) glisser(x, L.cy);
  glisser(loin, L.cy);
  assert.equal(tactile.instantane().move.x, 1);
  const retour = loin - (JOYSTICK.rayonZone + PLEINE_COURSE);
  for (let x = loin; x >= retour; x -= 5) glisser(x, L.cy);
  glisser(retour, L.cy);
  const move = tactile.instantane().move;
  assert.ok(Math.abs(move.x + 1) < EPS, `demi-tour à pleine vitesse après rayon + course (${move.x})`);
  // Et le centre n'est jamais à plus d'un rayon du pouce.
  const vu = tactile.joystickAffiche();
  assert.ok(Math.hypot(vu.x - vu.cx, vu.y - vu.cy) <= JOYSTICK.rayonZone + EPS);
  console.log('OK la laisse tire le centre derrière le pouce');
}

// --- 5. La limite (`D-251`) -----------------------------------------------
{
  const L = LIMITE_JOYSTICK;
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  // Le cercle limite est celui que Xav a tracé : il touche le bord gauche, le
  // bas et l'horizontale du milieu.
  assert.ok(Math.abs(L.cx - L.rayon) < EPS, 'tangent au bord gauche');
  assert.ok(Math.abs(L.cy - L.rayon - hauteur / 2) < EPS, 'tangent au milieu');
  assert.ok(Math.abs(L.cy + L.rayon - hauteur) < EPS, 'tangent au bas');
  // Le repos est dans la limite : sinon le cercle au repos serait dessiné là
  // où le cercle tiré ne peut pas aller.
  assert.deepEqual(bornerCentreJoystick(JOYSTICK.cx, JOYSTICK.cy), { x: JOYSTICK.cx, y: JOYSTICK.cy });

  const dansLaLimite = (vu, quoi) => {
    const d = Math.hypot(vu.cx - L.cx, vu.cy - L.cy);
    assert.ok(d + JOYSTICK.rayonZone <= L.rayon - JOYSTICK.margeLimite + EPS, `${quoi} : le cercle sort de la limite (${d})`);
    assert.ok(vu.cx - JOYSTICK.rayonZone >= 0 && vu.cy + JOYSTICK.rayonZone <= hauteur
      && vu.cy - JOYSTICK.rayonZone >= 0 && vu.cx + JOYSTICK.rayonZone <= largeur, `${quoi} : le cercle déborde du cadre`);
  };
  // Le pouce se balade partout, coins compris, et bien au-delà de l'écran.
  const chemin = [[JOYSTICK.cx, JOYSTICK.cy], [largeur, JOYSTICK.cy], [largeur, 0], [0, 0],
    [0, hauteur], [largeur / 2, hauteur], [-200, hauteur + 200], [largeur + 200, -200]];
  const { tactile, glisser } = poser(...chemin[0]);
  for (let k = 1; k < chemin.length; k += 1) {
    const [ax, ay] = chemin[k - 1];
    const [bx, by] = chemin[k];
    for (let t = 0; t <= 1; t += 0.02) glisser(ax + (bx - ax) * t, ay + (by - ay) * t);
    glisser(bx, by);
    const vu = tactile.joystickAffiche();
    dansLaLimite(vu, `pouce en (${bx}, ${by})`);
    // Au-delà de la limite, le héros va à fond, vers le pouce.
    const move = tactile.instantane().move;
    const ux = vu.x - vu.cx;
    const uy = vu.y - vu.cy;
    const n = Math.hypot(ux, uy);
    assert.ok(Math.abs(magnitude(move) - 1) < EPS, `à fond hors de la limite (${bx}, ${by})`);
    assert.ok((move.x * ux + move.y * uy) / n > 1 - EPS, `vers le pouce (${bx}, ${by})`);
  }
  // Un pouce posé hors de la limite (le coin bas-gauche) : le cercle naît
  // dans la limite, au plus près du pouce.
  for (const [px, py] of [[1, hauteur - 1], [1, 1], [JOYSTICK.limiteX - 1, hauteur - 1]]) {
    const { tactile: t2 } = poser(px, py);
    dansLaLimite(t2.joystickAffiche(), `posé en (${px}, ${py})`);
  }
  console.log('OK le cercle tiré ne sort jamais de la limite');
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

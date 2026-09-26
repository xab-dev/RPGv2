// Spec 16, palier B — le héros tourne en jeu, continûment (Xav, 26/09 :
// « toutes les positions joystick de façon fluide »).
//
// Contrats (`orientation.js`, pur) :
// 1. Au départ, l'angle affiché est celui de la direction initiale.
// 2. La marche vise l'angle EXACT du geste (un stick en donne 360) ; l'angle
//    affiché y va par le plus court chemin, jamais plus vite que
//    `VITESSE_ROTATION_DEG_S`, et s'y arrête.
// 3. Un geste trop faible (le stick qui revient au centre) ne change pas
//    l'angle visé.
// 4. Un tir vise sa cible et tourne plus vite ; la marche ne reprend la main
//    qu'après le regard.
// 5. La direction du gameplay garde sa règle (huit secteurs) : l'angle
//    affiché ne la change pas.
// 6. Le rendu reçoit l'angle (`main.js` → `render.js`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ORIENTATION_INITIALE, ORIENTATIONS, VITESSE_ROTATION_DEG_S, VITESSE_ROTATION_TIR_DEG_S,
  AMPLITUDE_MIN_GESTE, DUREE_REGARD_TIR_MS, creerOrientation, avancerOrientation,
} from '../src/orientation.js';

const ecart = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const vers = (deg, r = 1) => ({ dx: r * Math.cos((deg * Math.PI) / 180), dy: r * Math.sin((deg * Math.PI) / 180) });

// --- 1. Le départ -------------------------------------------------------------------
let o = creerOrientation();
assert.equal(o.angle, ORIENTATIONS.indexOf(ORIENTATION_INITIALE) * (360 / ORIENTATIONS.length));
console.log('OK départ : l\'angle de la direction initiale');

// --- 2. La marche -------------------------------------------------------------------
{
  const cible = o.angle + 137; // un angle que le clavier ne donne pas
  const pas = 16;
  let precedent = o.angle;
  let frames = 0;
  while (ecart(o.angle, cible) > 1e-9 && frames < 200) {
    o = avancerOrientation(o, { deltaMs: pas, ...vers(cible) });
    assert.ok(ecart(o.angle, precedent) <= (VITESSE_ROTATION_DEG_S * pas) / 1000 + 1e-9, 'jamais plus vite que la vitesse de rotation');
    assert.ok(ecart(o.angle, cible) < ecart(precedent, cible) || ecart(o.angle, cible) === 0, 'toujours plus près du geste');
    precedent = o.angle;
    frames += 1;
  }
  assert.ok(frames > 1, 'un grand demi-tour prend plusieurs frames : il se voit');
  assert.ok(ecart(o.angle, cible) < 1e-9, 'l\'angle exact du geste, atteint');
  const arrete = avancerOrientation(o, { deltaMs: pas });
  assert.equal(arrete.angle, o.angle, 'arrêté, il garde son angle');
  // Le plus court chemin : de 10° à 350°, par 0°, pas par 180°.
  let court = { ...creerOrientation(), angle: 10, angleVise: 10 };
  court = avancerOrientation(court, { deltaMs: 16, ...vers(350) });
  assert.ok(ecart(court.angle, 0) < ecart(10, 0) + 1e-9 && court.angle < 10, `par le plus court chemin (${court.angle})`);
  console.log(`OK marche : l'angle exact du geste, à vitesse bornée (${frames} frames pour 137°)`);
}

// --- 3. Le geste trop faible -----------------------------------------------------------
{
  const avant = o.angleVise;
  const faible = avancerOrientation(o, { deltaMs: 16, ...vers(o.angleVise + 90, AMPLITUDE_MIN_GESTE / 2) });
  assert.equal(faible.angleVise, avant, 'un geste sous l\'amplitude minimale ne vise rien');
  console.log('OK geste faible : l\'angle visé ne bouge pas');
}

// --- 4. Le tir -----------------------------------------------------------------------
{
  let t = { ...creerOrientation(), angle: 0, angleVise: 0 };
  t = avancerOrientation(t, { deltaMs: 0, vers: vers(180, 30) });
  assert.equal(t.angleVise, 180, 'le tir vise sa cible');
  const apres = avancerOrientation(t, { deltaMs: 16, ...vers(0) });
  assert.ok(ecart(apres.angle, 0) > (VITESSE_ROTATION_DEG_S * 16) / 1000, 'plus vif qu\'à la marche');
  assert.ok(ecart(apres.angle, 0) <= (VITESSE_ROTATION_TIR_DEG_S * 16) / 1000 + 1e-9);
  assert.equal(apres.angleVise, 180, 'pendant le regard, la marche ne vise pas');
  let fin = apres;
  for (let ms = 0; ms <= DUREE_REGARD_TIR_MS; ms += 16) fin = avancerOrientation(fin, { deltaMs: 16, ...vers(0) });
  assert.equal(fin.angleVise, 0, 'le regard écoulé, la marche vise à nouveau');
  console.log('OK tir : la cible, plus vite, puis la marche reprend la main');
}

// --- 5. La direction ---------------------------------------------------------------
{
  let d = creerOrientation();
  d = avancerOrientation(d, { deltaMs: 16, dx: 0, dy: -1 });
  assert.equal(d.direction, 'nord', 'la direction bascule tout de suite (le gameplay)');
  assert.notEqual(Math.round(d.angle), 270, 'l\'angle affiché, lui, est en route');
  console.log('OK direction : sa règle, indépendante de l\'angle affiché');
}

// --- 6. Le branchement --------------------------------------------------------------
{
  const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const main = fs.readFileSync(path.join(RACINE, 'src/main.js'), 'utf8');
  const render = fs.readFileSync(path.join(RACINE, 'src/render.js'), 'utf8');
  assert.ok(/heroAngle:\s*orientationHeros\.angle/.test(main), 'main.js passe l\'angle affiché au rendu');
  assert.ok(/angle:\s*scene\.heroAngle/.test(render), 'render.js dessine le héros à cet angle');
  console.log('OK branchement : l\'angle va de l\'orientation au dessin');
}

console.log('OK test_16b_heros_tourne');

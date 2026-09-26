// Spec 16, palier E — la capuche en retard sur le regard (Xav, 26/09 : « Retard
// de la capuche »).
//
// Contrats :
// 1. `orientation.js#ressortInertie` : sans dépassement, amortissement
//    critique ; le ressort dépasse d'un saut de la part déclarée, et retarde
//    en rotation régulière du temps déclaré.
// 2. `orientation.js#avancerInertie` : au premier pas, sur le regard ; l'écart
//    borné quelle que soit la vitesse ; le tour du cercle (359° → 1°) sans
//    détour ; il se pose à l'arrêt ; le résultat ne dépend pas du découpage
//    en frames.
// 3. `poses.js#angleDePiece` : une pièce d'inertie à son angle, une pièce qui
//    en suit une autre à celui de sa guide, les autres au regard.
// 4. Le dessin : chaque pièce se dessine comme à son angle à elle — la coque
//    de la capuche comme à l'angle de son ressort, le regard comme à l'angle
//    affiché ; ressorts posés, le dessin d'avant.
// 5. Démarrage : pièce inconnue, en double, qui suit ; réglage mal formé ;
//    un ressort qui oscillerait au-delà de 3 Hz — refusés.
// 6. Le branchement : `main.js` passe l'angle affiché et l'inertie du héros.
// Aucune valeur de réglage n'est épinglée : elles sont lues dans les données.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ressortInertie, avancerInertie, creerAnimationHeros, avancerAnimationHeros } from '../src/orientation.js';
import { angleDePiece, definitionPiece } from '../src/poses.js';
import { dessinerVisuel } from '../src/visuels.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { VISUEL_HEROS_ID } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees), []);
const HEROS = donnees.visuels.find((v) => v.id === VISUEL_HEROS_ID);
const ecart = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

// Fait avancer un ressort seul, frame par frame, derrière une suite d'angles.
function suivre(entree, angles, deltaMs = 16) {
  let etats = [];
  let avant = null;
  const traces = [];
  for (const a of angles) {
    etats = avancerInertie([entree], etats.length ? etats : null, a, avant, deltaMs);
    if (avant === null) etats = avancerInertie([entree], etats, a, a, 0);
    traces.push(etats[0].angle);
    avant = a;
  }
  return traces;
}

// --- 1. Le ressort ------------------------------------------------------------------
{
  assert.deepEqual([ressortInertie({ retard_ms: 50, depassement: 0 }).zeta, ressortInertie({ retard_ms: 50, depassement: 0 }).frequenceHz], [1, 0]);
  const entree = { retard_ms: 60, depassement: 0.2, ecart_max_deg: 45 };
  // Un saut de 10° : la pièce dépasse d'environ 20 % de 10°.
  const saut = suivre(entree, [0, ...Array(200).fill(10)]);
  const pic = Math.max(...saut) - 10;
  assert.ok(pic > 0.2 * 10 * 0.8 && pic < 0.2 * 10 * 1.2, `dépassement d'un saut : ${pic.toFixed(2)}° pour 2°`);
  // Rotation régulière lente (l'écart reste sous sa borne) : retard ≈ retard_ms × v.
  const v = 100; // °/s
  const tour = suivre(entree, Array.from({ length: 150 }, (_, i) => (i * v * 16) / 1000));
  const retard = -ecart(tour[149], (149 * v * 16) / 1000);
  assert.ok(Math.abs(retard - (v * entree.retard_ms) / 1000) < 0.3, `retard en rotation : ${retard.toFixed(2)}° pour ${(v * entree.retard_ms) / 1000}°`);
  console.log('OK ressort : dépassement et retard tels que déclarés');
}

// --- 2. L'état ---------------------------------------------------------------------
{
  const [entree] = HEROS.inertie;
  assert.deepEqual(avancerInertie(null, [], 30, 20, 16), [], 'sans inertie, rien');
  assert.deepEqual(avancerInertie(HEROS.inertie, null, 30, null, 16).map((e) => e.angle), HEROS.inertie.map(() => 30), 'au premier pas, sur le regard');
  // Un tour rapide (2000°/s, bien au-delà du jeu) : l'écart reste borné, même en passant 0°.
  const vite = Array.from({ length: 120 }, (_, i) => (350 + i * 32) % 360);
  const traces = suivre(entree, vite);
  traces.forEach((a, i) => assert.ok(Math.abs(ecart(a, vite[i])) <= entree.ecart_max_deg + 1e-6, `écart borné (${i})`));
  // 359° → 1° : deux degrés, pas un tour.
  const bord = suivre(entree, [359, 359, 1, 1]);
  assert.ok(bord.every((a) => Math.abs(ecart(a, 0)) < 2.5), 'le tour du cercle, sans détour');
  // À l'arrêt, il se pose.
  const pose = suivre(entree, [0, ...Array(150).fill(180)]);
  assert.ok(Math.abs(ecart(pose[150], 180)) < 0.05, 'posé sur le regard à l\'arrêt');
  // Une frame de 32 ms vaut deux de 16.
  const e0 = avancerInertie([entree], [{ angle: 0, vitesse: 0 }], 40, 0, 32)[0];
  const e1 = avancerInertie([entree], avancerInertie([entree], [{ angle: 0, vitesse: 0 }], 20, 0, 16), 40, 20, 16)[0];
  assert.ok(Math.abs(e0.angle - e1.angle) < 0.5, `indépendant du découpage (${e0.angle.toFixed(2)} / ${e1.angle.toFixed(2)})`);
  // Par l'état du héros.
  let s = creerAnimationHeros();
  s = avancerAnimationHeros(s, { deltaMs: 16, angle: 90, inertie: HEROS.inertie });
  s = avancerAnimationHeros(s, { deltaMs: 16, angle: 180, inertie: HEROS.inertie });
  assert.equal(s.inertie.length, HEROS.inertie.length);
  assert.ok(s.inertie.every((e) => ecart(e.angle, 180) < 0), 'derrière le regard après un saut');
  console.log('OK état : premier pas, borne, tour du cercle, arrêt, frames');
}

// --- 3. L'angle de chaque pièce -------------------------------------------------------
const PIECES = Object.keys(HEROS.pieces);
const enInertie = (p) => HEROS.inertie.findIndex((e) => e.pieces.includes(definitionPiece(HEROS, p).suit ?? p));
{
  const animation = { inertie: HEROS.inertie.map((_, i) => ({ angle: 200 + 10 * i, vitesse: 0 })) };
  assert.ok(PIECES.some((p) => enInertie(p) < 0), 'des pièces mènent (le regard)');
  for (const p of PIECES) {
    const i = enInertie(p);
    assert.equal(angleDePiece(HEROS, animation, 90, p), i >= 0 ? 200 + 10 * i : 90, p);
    assert.equal(angleDePiece(HEROS, null, 90, p), 90, `${p} : sans état, le regard`);
  }
  console.log('OK angle des pièces');
}

// --- 4. Le dessin ---------------------------------------------------------------------
// Un faux contexte qui tient sa transform et note, pour chaque remplissage,
// son chemin à l'écran.
function chemins(options) {
  const pile = [];
  let m = [1, 0, 0, 1, 0, 0];
  let chemin = [];
  const fills = [];
  const mult = ([a, b, c, d, e, f]) => {
    const [A, B, C, D, E, F] = m;
    m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F];
  };
  const pt = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]].map((n) => Math.round(n * 1e4) / 1e4);
  const ctx = new Proxy({}, {
    get(_, prop) {
      switch (prop) {
        case 'save': return () => pile.push(m);
        case 'restore': return () => { m = pile.pop(); };
        case 'translate': return (x, y) => mult([1, 0, 0, 1, x, y]);
        case 'scale': return (x, y) => mult([x, 0, 0, y, 0, 0]);
        case 'rotate': return (r) => mult([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
        case 'transform': return (...t) => mult(t);
        case 'getTransform': return () => { const [a, b, c, d, e, f] = m; return { a, b, c, d, e, f }; };
        case 'setTransform': return (t, ...r) => { m = typeof t === 'object' ? [t.a, t.b, t.c, t.d, t.e, t.f] : [t, ...r]; };
        case 'beginPath': return () => { chemin = []; };
        case 'moveTo': case 'lineTo': return (x, y) => chemin.push(pt(x, y));
        case 'fill': return () => fills.push(JSON.stringify(chemin));
        default: return () => ({ addColorStop() {} });
      }
    },
    set() { return true; },
  });
  dessinerVisuel(ctx, HEROS, 0, 0, { echelle: 3, teinte: '#ff0000', ...options });
  return fills;
}
{
  // Les remplissages, dans l'ordre des primitives dessinées : le même nombre
  // d'un angle à un autre voisin (aucune pièce ne s'y cache).
  const [A, B] = [100, 118]; // un même segment (sud → sud_ouest) : aucune pièce ne s'y cache
  const repos = { tempsMs: 0, marche: 0 };
  const retarde = chemins({ angle: A, animation: { ...repos, inertie: HEROS.inertie.map(() => ({ angle: B, vitesse: 0 })) } });
  const aA = chemins({ angle: A, animation: repos });
  const aB = chemins({ angle: B, animation: repos });
  assert.equal(retarde.length, aA.length);
  assert.equal(aA.length, aB.length);
  // Les primitives dessinées sont dans l'ordre du visuel ; l'ombre d'abord.
  const posees = HEROS.primitives.map((p) => p.piece);
  const decal = retarde.length - posees.length;
  let enRetard = 0;
  let auRegard = 0;
  posees.forEach((piece, i) => {
    const k = i + decal;
    if (piece === undefined) return;
    if (enInertie(piece) >= 0) { assert.equal(retarde[k], aB[k], `${piece} (${i}) : dessinée comme à l'angle de son ressort`); enRetard += 1; }
    else { assert.equal(retarde[k], aA[k], `${piece} (${i}) : au regard (sa découpe suit la capuche, pas son dessin)`); auRegard += 1; }
  });
  assert.ok(enRetard > 0 && auRegard > 0);
  const pose = chemins({ angle: A, animation: { ...repos, inertie: HEROS.inertie.map(() => ({ angle: A, vitesse: 0 })) } });
  assert.deepEqual(pose, aA, 'ressorts posés : le dessin d\'avant');
  console.log(`OK dessin : ${enRetard} remplissages à l'angle du ressort, ${auRegard} au regard`);
}

// --- 5. Démarrage ------------------------------------------------------------------
{
  const refuse = (modif, attendu) => {
    const copie = structuredClone(donnees);
    modif(copie.visuels.find((v) => v.id === VISUEL_HEROS_ID));
    assert.ok(validerCatalogues(copie).some((e) => e.includes(attendu)), attendu);
  };
  const suiveuse = PIECES.find((p) => definitionPiece(HEROS, p).suit);
  refuse((v) => { v.inertie[0].pieces.push('chapeau'); }, 'inconnue, déjà dans une autre entrée, ou qui en suit une autre');
  refuse((v) => { v.inertie[1].pieces.push(v.inertie[0].pieces[0]); }, 'inconnue, déjà dans une autre entrée, ou qui en suit une autre');
  if (suiveuse) refuse((v) => { v.inertie[0].pieces.push(suiveuse); }, 'inconnue, déjà dans une autre entrée, ou qui en suit une autre');
  refuse((v) => { v.inertie[0].depassement = 1; }, 'inertie[0] doit être');
  refuse((v) => { v.inertie[0].ecart_max_deg = 90; }, 'inertie[0] doit être');
  refuse((v) => { v.inertie[0].couleur = 1; }, 'inertie[0] doit être');
  refuse((v) => { v.inertie[0].retard_ms = 10; }, 'au-delà de 3 Hz');
  console.log('OK démarrage');
}

// --- 6. Le branchement --------------------------------------------------------------
{
  const main = fs.readFileSync(path.join(RACINE, 'src/main.js'), 'utf8');
  assert.ok(/angle: orientationHeros\.angle \?\? null, inertie: visuelHeros\.inertie \?\? null/.test(main));
  console.log('OK branchement');
}

console.log('OK test_16e_capuche_retard');

// `D-39` — La double orbite du follet.
//
// Le défaut que ce test verrouille : depuis `D-36`, le corps du follet était
// décalé du centre de son aura par un **ressort**, donc d'une quantité qui
// dépendait de l'HISTOIRE des déplacements du héros et de rien que le joueur
// puisse lire. Mesuré sur la build d'avant ce ticket : **13,2 px à l'arrêt,
// 33,4 px en course** — pour une aura de rayon 40. Le corps frôlait la sortie
// de sa propre aura dès que Xav courait, ce qui est exactement le « l'écart
// bouge sans règle lisible » de son constat.
//
// La règle de Xav : **deux points, deux orbites**. Le point logique (centre de
// l'aura, de la lumière et de tout calcul de jeu) orbite autour du héros —
// orbite existante, INCHANGÉE. Le corps orbite autour du point logique, sur
// une orbite plus petite et de sens inverse.
//
// Ce que ce fichier prouve, dans l'ordre du brief :
//   1. |décalage| = rayon, à tout instant (et non « en moyenne »)
//   2. continuité d'une frame à l'autre, y compris au passage suivi -> engagé
//   3. le sens est bien l'inverse de la grande orbite
//   4. la borne « le corps ne sort jamais de son aura », validée au boot
//   5. aura et lumière se dessinent depuis le POINT LOGIQUE, exactement
//   6. les valeurs de la grande orbite n'ont pas bougé
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import { decalageCorpsFollet } from '../src/vol_follet.js';
import {
  creerFollet, avancerPosition, mettreAJourEtat, resoudreOrbiteRayonPx, resoudreEchelleJeu,
} from '../src/companion.js';
import { empreinteParDefaut } from '../src/structures.js';
import { echelleVisuel } from '../src/visuels.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), [], 'les catalogues du jeu doivent être valides au boot');

const CONFIG = catalogues.effets.find((e) => e.id === 'effet_vol_follet');
assert.ok(CONFIG, 'effet_vol_follet doit exister');
assert.equal(CONFIG.type, 'vol');
const FRAME_MS = 16;

// --- 1. |décalage| = rayon, à tout instant ---------------------------------
// C'est LA différence avec le ressort : le décalage n'est plus une quantité
// qui dépend de ce qui s'est passé avant, c'est une constante géométrique.
{
  let maxEcart = -Infinity;
  let minEcart = Infinity;
  for (let t = 0; t <= 60000; t += 7) { // 60 s, pas volontairement non multiple de la période
    const { dx, dy } = decalageCorpsFollet(t, CONFIG);
    const r = Math.hypot(dx, dy);
    maxEcart = Math.max(maxEcart, r);
    minEcart = Math.min(minEcart, r);
  }
  assert.ok(Math.abs(maxEcart - CONFIG.rayon_px) < 1e-9, `rayon max ${maxEcart} != ${CONFIG.rayon_px}`);
  assert.ok(Math.abs(minEcart - CONFIG.rayon_px) < 1e-9, `rayon min ${minEcart} != ${CONFIG.rayon_px}`);
  console.log(`  |décalage| constant = ${maxEcart.toFixed(3)} px sur 60 s (rayon déclaré ${CONFIG.rayon_px})`);
}

// --- 2. Continuité, y compris au passage suivi -> engagé -------------------
// Le passage à l'état `engager` fait sauter le POINT LOGIQUE (il se colle au
// monstre) : c'est le comportement existant, hors de ce ticket. Ce qui doit
// rester continu, c'est le DÉCALAGE — et il l'est par construction, puisqu'il
// ne lit que le temps. C'est précisément ce que le ressort ne savait pas
// faire : son `seuil_saut_px` remettait le décalage à zéro d'un coup.
{
  let sautMax = 0;
  let precedent = decalageCorpsFollet(0, CONFIG);
  for (let t = FRAME_MS; t <= 30000; t += FRAME_MS) {
    const courant = decalageCorpsFollet(t, CONFIG);
    sautMax = Math.max(sautMax, Math.hypot(courant.dx - precedent.dx, courant.dy - precedent.dy));
    precedent = courant;
  }
  // Une frame de 16 ms sur une période de 1400 ms parcourt 2*PI*16/1400 rad,
  // soit une corde de 2*r*sin(theta/2) ~ 0,43 px pour r = 6. On borne large.
  assert.ok(sautMax < 1, `saut max entre deux frames = ${sautMax.toFixed(3)} px`);

  // Et le même contrôle en conditions réelles : héros en course, follet qui
  // bascule suivi -> engagé -> suivi. Le décalage doit rester lisse alors que
  // la position absolue du corps, elle, suit les sauts du point logique.
  const hero = { x: 500, y: 500 };
  let follet = creerFollet(catalogues.companions[0].id, hero);
  const monstre = { id: 'm1', x: 520, y: 500, mort: false };
  let sautDecalage = 0;
  let tMs = 0;
  let precedentD = decalageCorpsFollet(tMs, CONFIG);
  const etatsVus = new Set();
  for (let i = 0; i < 1200; i++) {
    hero.x += 95 * (FRAME_MS / 1000); // vitesse réelle du héros après `D-33`
    // le monstre entre puis sort de la portée d'engagement
    monstre.x = hero.x + (i > 300 && i < 700 ? 20 : 400);
    follet = mettreAJourEtat(follet, hero, [monstre]);
    follet = avancerPosition(follet, hero, [monstre], FRAME_MS / 1000);
    etatsVus.add(follet.etat);
    tMs += FRAME_MS;
    const d = decalageCorpsFollet(tMs, CONFIG);
    sautDecalage = Math.max(sautDecalage, Math.hypot(d.dx - precedentD.dx, d.dy - precedentD.dy));
    precedentD = d;
  }
  assert.ok(etatsVus.has('suivre') && etatsVus.has('engager'), `les deux états doivent être traversés (${[...etatsVus]})`);
  assert.ok(sautDecalage < 1, `saut du décalage en jeu réel = ${sautDecalage.toFixed(3)} px`);
  console.log(`  continuité : saut max ${sautDecalage.toFixed(3)} px/frame, états traversés ${[...etatsVus].join(' + ')}`);
}

// --- 3. Sens inverse de la grande orbite -----------------------------------
// La grande orbite avance en angle croissant (companion.js : angleOrbite +=
// deltaS * ORBITE_VITESSE_RAD_S, positif). La petite doit donc tourner à
// angle décroissant : c'est ce qui dessine une rosace plutôt que des boucles.
{
  const d0 = decalageCorpsFollet(0, CONFIG);
  const d1 = decalageCorpsFollet(50, CONFIG);
  const a0 = Math.atan2(d0.dy, d0.dx);
  const a1 = Math.atan2(d1.dy, d1.dx);
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  assert.ok(delta < 0, `la petite orbite doit tourner en sens inverse (delta = ${delta})`);

  // Et le sens vient bien des DONNÉES, pas d'un signe écrit dans le code.
  const inverse = { ...CONFIG, sens: -CONFIG.sens };
  const b1 = decalageCorpsFollet(50, inverse);
  let deltaB = Math.atan2(b1.dy, b1.dx) - a0;
  while (deltaB > Math.PI) deltaB -= Math.PI * 2;
  while (deltaB < -Math.PI) deltaB += Math.PI * 2;
  assert.ok(deltaB > 0, 'inverser `sens` en données doit inverser le sens de rotation');
  console.log(`  sens : ${CONFIG.sens} -> ${delta.toFixed(4)} rad/50 ms (inversé en données -> ${deltaB.toFixed(4)})`);
}

// --- 4. La borne : le corps ne sort jamais de son aura ---------------------
// Validée AU CHARGEMENT, pas à l'exécution : un réglage de Xav qui sortirait
// le corps de l'aura doit tomber au boot avec son chemin, pas produire un
// follet dont le cercle affiché ment.
{
  const comp = catalogues.companions[0];
  const visuel = catalogues.visuels.find((v) => v.id === comp.render.visuel);
  const boite = empreinteParDefaut(visuel, echelleVisuel(visuel) * resoudreEchelleJeu(comp));
  const coins = [
    Math.hypot(boite.x, boite.y), Math.hypot(boite.x + boite.w, boite.y),
    Math.hypot(boite.x, boite.y + boite.h), Math.hypot(boite.x + boite.w, boite.y + boite.h),
  ];
  const demiTaille = Math.max(...coins);
  assert.ok(CONFIG.rayon_px + demiTaille < comp.rayon_aura,
    `borne violée : ${CONFIG.rayon_px} + ${demiTaille.toFixed(2)} >= ${comp.rayon_aura}`);
  console.log(`  borne : ${CONFIG.rayon_px} + ${demiTaille.toFixed(2)} = ${(CONFIG.rayon_px + demiTaille).toFixed(2)} < ${comp.rayon_aura} (rayon_aura)`);

  const avecVolModifie = (mutation) => {
    const copie = JSON.parse(JSON.stringify(catalogues));
    mutation(copie.effets.find((e) => e.id === 'effet_vol_follet'), copie);
    return validerCatalogues(copie);
  };

  // a) un rayon qui fait sortir le corps de l'aura
  let errs = avecVolModifie((vol) => { vol.rayon_px = 40; });
  assert.ok(errs.some((e) => /aura/i.test(e)), `attendu une erreur d'aura, obtenu : ${errs.join(' | ')}`);

  // b) période nulle : une division par zéro silencieuse, ou un follet figé
  errs = avecVolModifie((vol) => { vol.periode_ms = 0; });
  assert.ok(errs.some((e) => /periode_ms/.test(e)), errs.join(' | '));

  // c) sens qui ne vaut ni 1 ni -1 : le « sens inverse » de Xav ne serait
  //    plus un sens mais un facteur de vitesse déguisé.
  errs = avecVolModifie((vol) => { vol.sens = 0; });
  assert.ok(errs.some((e) => /sens/.test(e)), errs.join(' | '));

  // d) rayon négatif
  errs = avecVolModifie((vol) => { vol.rayon_px = -1; });
  assert.ok(errs.some((e) => /rayon_px/.test(e)), errs.join(' | '));

  // e) rayon NUL : accepté, et c'est volontaire — c'est exactement le repli
  //    prévu par le brief (« remettre le corps au centre de l'aura »), et il
  //    s'obtient en changeant un nombre, sans toucher une ligne de code.
  assert.deepEqual(avecVolModifie((vol) => { vol.rayon_px = 0; }), [],
    'rayon_px = 0 doit rester valide : c est le repli « corps au centre »');
  const auCentre = decalageCorpsFollet(1234, { ...CONFIG, rayon_px: 0 });
  assert.equal(Math.hypot(auCentre.dx, auCentre.dy), 0);
}

// --- 5. Aura et lumière : sur le point logique, exactement ------------------
// Le dessin n'est jamais exercé en headless (contrainte de méthode) : on lit
// donc le SOURCE de main.js#dessiner(). C'est la seule façon d'attraper le
// jour où quelqu'un branchera l'aura sur la silhouette — le bug serait
// invisible aux tests et visible à l'écran sous forme d'aura qui frétille.
{
  const source = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');

  // L'aura : son arc doit être centré sur le follet LOGIQUE.
  const debutAura = source.indexOf('// Aura du follet');
  assert.ok(debutAura > 0, 'le bloc de l’aura doit rester repérable dans main.js');
  // Fenêtre élargie par `D-51`, qui a allongé le commentaire de ce bloc (le
  // cercle n'est plus une indication : c'est la zone d'effet elle-même).
  const blocAura = source.slice(debutAura, debutAura + 1600);
  assert.ok(/arc\(\s*follet\.x - camera\.x,\s*follet\.y - camera\.y/.test(blocAura),
    'l’aura doit être centrée sur follet.x/y (le point logique), pas sur la silhouette');
  assert.ok(!/corpsFollet|decalageCorps/.test(blocAura),
    'l’aura ne doit jamais lire le décalage du corps');

  // La lumière : dessinerObscurite reçoit le point logique.
  assert.ok(/follet: follet \? \{ x: follet\.x, y: follet\.y \} : null/.test(source),
    'dessinerObscurite doit recevoir la position logique du follet');

  // Et la silhouette, elle, doit bien recevoir le décalage — sinon ce ticket
  // ne ferait rien du tout.
  const debutRendu = source.indexOf('follet: follet && companionActif ?');
  assert.ok(debutRendu > 0, 'le bloc de rendu du follet doit rester repérable');
  const blocRendu = source.slice(debutRendu, debutRendu + 600);
  assert.ok(/corpsFollet|decalageCorps/.test(blocRendu),
    'la silhouette doit être décalée du point logique');
}

// --- 6. La grande orbite n'a pas bougé -------------------------------------
// Interdit explicite du ticket. Vérifié par la valeur ET par le comportement :
// un follet laissé tourner autour d'un héros immobile décrit toujours le même
// cercle, au pixel près.
{
  assert.equal(resoudreOrbiteRayonPx(), 24, 'le rayon de la grande orbite ne doit pas bouger');

  const hero = { x: 1000, y: 1000 };
  let follet = creerFollet(catalogues.companions[0].id, hero);
  let minR = Infinity;
  let maxR = -Infinity;
  for (let i = 0; i < 1200; i++) {
    follet = avancerPosition(follet, hero, [], FRAME_MS / 1000);
    if (i > 600) { // après convergence du lerp
      const r = Math.hypot(follet.x - hero.x, follet.y - hero.y);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }
  }
  assert.ok(maxR > 23 && maxR < 24.5, `rayon décrit = ${maxR.toFixed(2)} px (attendu ~23,5, inchangé)`);
  assert.ok(maxR - minR < 0.01, 'le cercle décrit doit rester régulier');
  console.log(`  grande orbite inchangée : cercle décrit de ${maxR.toFixed(2)} px autour du héros`);
}

console.log('OK test_d39_double_orbite');

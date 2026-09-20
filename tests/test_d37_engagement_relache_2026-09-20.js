// `D-37` (le reste) — Le follet engage par ce qu'on VOIT, relâche avec une
// marge, et ne se téléporte jamais.
//
// Ce que ce fichier verrouille, décisions de Xav des 19 et 20/09 :
//   a) engager = le monstre est dans l'ORBITE (mesurée du héros) OU dans
//      l'AURA (mesurée du follet). `DISTANCE_ENGAGEMENT_PX = 48` n'existe plus.
//   b) relâcher = héros -> monstre > orbite + aura + 12 px (66 aujourd'hui) ;
//      à 66 il tient, à 67 il revient. La marge est l'épaisseur du bord.
//   c) garde-fou : un monstre au-delà de la relâche n'est jamais engageable,
//      même si l'aura d'un follet qui rentre l'effleure (sinon : ping-pong).
//   d) pas d'oscillation sur un monstre immobile pile à la frontière.
//   e) plusieurs candidats -> le plus proche du HÉROS.
//   f) la position ne saute jamais d'un coup sur la cible (l'approche est
//      amortie, comme le retour en orbite).
//   g) pendant le retour, le follet accroche un second monstre.
//   h) une seule source : l'indice de commande ATTACK (main.js) appelle le
//      prédicat d'engagement lui-même, plus une constante de portée.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';
import * as companion from '../src/companion.js';
import {
  creerFollet, mettreAJourEtat, avancerPosition,
  monstreEngageable, distanceRelachePx, resoudreOrbiteRayonPx, resoudreRayonAuraPx,
} from '../src/companion.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees: catalogues, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(catalogues), [], 'les catalogues du jeu doivent être valides au boot');

// Catalogue RÉEL : les seuils testés sont ceux que Xav joue.
const COMP = catalogues.companions[0];
const ORBITE = resoudreOrbiteRayonPx();
const AURA = resoudreRayonAuraPx(COMP);
const RELACHE = distanceRelachePx(COMP);

const hero = (x, y) => ({ x, y });
const monstre = (id, x, y, mort = false) => ({ id, x, y, mort });
// Un follet posé où on veut, pour interroger l'aura seule.
const folletEn = (x, y) => ({ ...creerFollet(COMP.id, hero(0, 0)), x, y });

// --- 0. La constante retirée et la marge lisible ---------------------------
{
  assert.equal(companion.DISTANCE_ENGAGEMENT_PX, undefined,
    "DISTANCE_ENGAGEMENT_PX ne doit plus exister : la portée du follet est celle qu'on voit");
  assert.equal(RELACHE, ORBITE + AURA + 12,
    'relâche = orbite + aura + marge fixe de 12 px');
  assert.equal(RELACHE, 66, `valeurs du jour : 24 + 30 + 12 = 66 (lu : ${RELACHE})`);
  console.log(`  orbite ${ORBITE} · aura ${AURA} · relâche ${RELACHE}`);
}

// --- 1. Engager par l'ORBITE seule -----------------------------------------
// Le follet est loin du monstre (aura hors de cause) : c'est la proximité du
// HÉROS qui décide.
{
  const h = hero(0, 0);
  const m = monstre('m1', ORBITE - 1, 0);
  const f = folletEn(-500, -500);
  assert.ok(monstreEngageable(m, h, f, COMP), "dans l'orbite -> engageable");
  assert.equal(mettreAJourEtat(f, h, [m], COMP).etat, 'engager');
}

// --- 2. Engager par l'AURA seule -------------------------------------------
// Monstre HORS orbite (40 px du héros, orbite 24), mais le follet est de son
// côté : le cercle pointillé le touche, donc le follet part.
{
  const h = hero(0, 0);
  const m = monstre('m1', 40, 0);
  assert.ok(Math.hypot(m.x, m.y) > ORBITE, 'le monstre doit bien être hors orbite');
  const dedans = folletEn(40 - AURA + 1, 0);
  const dehors = folletEn(40 - AURA - 1, 0);
  assert.ok(monstreEngageable(m, h, dedans, COMP), "touché par l'aura -> engageable");
  assert.ok(!monstreEngageable(m, h, dehors, COMP), "aura qui ne le touche pas -> pas d'engagement");
  assert.equal(mettreAJourEtat(dedans, h, [m], COMP).etat, 'engager');
  assert.equal(mettreAJourEtat(dehors, h, [m], COMP).etat, 'suivre');
}

// --- 3. Garde-fou : jamais d'engagement au-delà de la relâche --------------
// Un follet qui rentre, aura collée à un monstre lointain : sans ce garde-fou
// il l'engagerait une frame puis le lâcherait la suivante, à l'infini.
{
  const h = hero(0, 0);
  const m = monstre('m1', RELACHE + 1, 0);
  const f = folletEn(m.x - 1, 0); // l'aura le touche largement
  assert.ok(Math.hypot(f.x - m.x, f.y - m.y) <= AURA, "mise en place : l'aura touche bien le monstre");
  assert.ok(!monstreEngageable(m, h, f, COMP), 'au-delà de la relâche -> jamais engageable');
  assert.equal(mettreAJourEtat(f, h, [m], COMP).etat, 'suivre');
}

// --- 4. Relâche : à 66 il tient, à 67 il revient ---------------------------
{
  const h = hero(0, 0);
  let f = mettreAJourEtat(folletEn(0, 0), h, [monstre('m1', 10, 0)], COMP);
  assert.equal(f.etat, 'engager');
  f = mettreAJourEtat(f, h, [monstre('m1', RELACHE, 0)], COMP);
  assert.equal(f.etat, 'engager', `à ${RELACHE} px le follet tient encore`);
  f = mettreAJourEtat(f, h, [monstre('m1', RELACHE + 1, 0)], COMP);
  assert.equal(f.etat, 'suivre', `à ${RELACHE + 1} px il revient`);
  assert.equal(f.cibleMonstreId, null);
}

// --- 5. Pas d'oscillation sur un monstre immobile à la frontière -----------
// Le monstre est pile à la distance de relâche. Un seuil unique (l'ancien
// code) ferait clignoter l'état ; l'hystérésis l'interdit.
{
  const h = hero(0, 0);
  const m = monstre('m1', RELACHE, 0);
  let f = folletEn(0, 0);
  const etats = new Set();
  for (let i = 0; i < 600; i += 1) {
    f = mettreAJourEtat(f, h, [m], COMP);
    f = avancerPosition(f, h, [m], 1 / 60);
    etats.add(f.etat);
  }
  assert.equal(etats.size, 1, `un seul état sur 600 frames (vu : ${[...etats].join(' + ')})`);
}

// --- 6. Plusieurs candidats -> le plus proche du héros ---------------------
{
  const h = hero(0, 0);
  const loin = monstre('loin', 20, 0);
  const pres = monstre('pres', 8, 0);
  const f = folletEn(0, 0);
  assert.equal(mettreAJourEtat(f, h, [loin, pres], COMP).cibleMonstreId, 'pres');
  assert.equal(mettreAJourEtat(f, h, [pres, loin], COMP).cibleMonstreId, 'pres',
    "le choix ne doit pas dépendre de l'ordre du tableau");
}

// --- 7. La position ne saute jamais ----------------------------------------
// Ancien code : `x: cible.x` — jusqu'à ~66 px en une frame. Le follet vole.
{
  const h = hero(0, 0);
  const m = monstre('m1', 60, 0); // à portée d'aura d'un follet posé près de lui
  let f = folletEn(45, 0);
  f = mettreAJourEtat(f, h, [m], COMP);
  assert.equal(f.etat, 'engager');
  let sautMax = 0;
  let distanceFinale = Infinity;
  for (let i = 0; i < 400; i += 1) {
    const avant = { x: f.x, y: f.y };
    f = avancerPosition(f, h, [m], 1 / 60);
    sautMax = Math.max(sautMax, Math.hypot(f.x - avant.x, f.y - avant.y));
    distanceFinale = Math.hypot(f.x - m.x, f.y - m.y);
  }
  assert.ok(sautMax <= 4, `aucun saut brutal (max ${sautMax.toFixed(2)} px/frame)`);
  assert.ok(distanceFinale < 0.01, 'mais le follet finit bien collé au monstre');
  console.log(`  approche : saut max ${sautMax.toFixed(2)} px/frame, puis collé`);
}

// --- 8. Réengagement d'un second monstre pendant le retour -----------------
// Le premier est tout près du héros, le second plus loin et HORS orbite. Le
// premier meurt ; le follet, encore posé sur lui, rentre — et en chemin son
// aura accroche le second, sans que le héros ait bougé.
{
  const h = hero(0, 0);
  const premier = monstre('m1', 20, 0);
  const second = monstre('m2', 40, 0);
  assert.ok(Math.hypot(second.x, second.y) > ORBITE, 'le second est bien hors orbite');
  let f = folletEn(0, 0);
  f = mettreAJourEtat(f, h, [premier, second], COMP);
  assert.equal(f.cibleMonstreId, 'm1', 'le follet part sur le plus proche du héros');
  for (let i = 0; i < 120; i += 1) f = avancerPosition(f, h, [premier, second], 1 / 60);
  premier.mort = true;
  f = mettreAJourEtat(f, h, [premier, second], COMP);
  assert.equal(f.etat, 'suivre', 'mort de la cible -> retour');
  f = mettreAJourEtat(f, h, [premier, second], COMP);
  assert.equal(f.cibleMonstreId, 'm2', 'sur le chemin du retour, il accroche le second par son aura');
}

// --- 9. Une seule source pour l'indice ATTACK ------------------------------
// specs/04_indices-commandes.md §3 : l'indice se déclenche au seuil de
// l'engagement RÉEL. Il appelle donc le prédicat, pas une portée recopiée.
{
  const main = fs.readFileSync(path.join(RACINE, 'src', 'main.js'), 'utf8');
  assert.ok(!/DISTANCE_ENGAGEMENT_PX/.test(main),
    'main.js ne doit plus connaître DISTANCE_ENGAGEMENT_PX');
  const ancre = main.indexOf("declencherVerbeUtile('attack'");
  assert.ok(ancre > 0, "l'indice ATTACK doit exister dans main.js");
  const bloc = main.slice(ancre - 700, ancre + 60);
  assert.ok(/monstreEngageable\(/.test(bloc),
    "l'indice ATTACK doit appeler companion.js#monstreEngageable");
  const compagnon = fs.readFileSync(path.join(RACINE, 'src', 'companion.js'), 'utf8');
  assert.ok(!/DISTANCE_ENGAGEMENT_PX\s*=/.test(compagnon),
    'la constante de portée doit avoir disparu de companion.js');
}

console.log('OK test_d37_engagement_relache');

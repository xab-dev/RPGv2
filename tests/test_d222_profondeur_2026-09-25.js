// `D-222` — LA PROFONDEUR (demande de Xav, 25/09) : « il n'y a pas de
// profondeur entre les tuiles, le héros est affiché par-dessus un arbre s'il
// est placé au nord de celui-ci ; pareil pour certains éléments du décor qui
// perdent toute logique (flaque sur un arbre, pierre sur de l'herbe) ».
//
// Le rendu n'est jamais exercé en headless (contrainte de méthode) : ce qui se
// prouve ici est la part PURE de `profondeur.js` — qui se tient debout, où est
// son pied, dans quel ordre — éprouvée sur le vrai catalogue, la vraie scène
// de la Maison et la vraie collision. Ce que Xav voit reste à voir en jeu.
//
// 1. la règle se lit sur le dessin : debout = porte une ombre portée ; les
//    tuiles debout sont exactement celles dont un dessin en porte une ;
// 2. contre un vrai arbre de la Maison, le héros arrêté par la collision au
//    NORD de l'arbre se peint AVANT lui (le feuillage le recouvre), et au SUD
//    APRÈS lui — et dans les deux cas leurs dessins se touchent, sans quoi la
//    question ne se poserait pas ;
// 3. un caillou du décor au nord d'une touffe passe derrière elle, et une
//    flaque (à plat) n'entre jamais dans le tri ;
// 4. le calque statique ne compte plus ce qui est debout : son rayon
//    d'influence ne grandit pas ;
// 5. le budget de la carte tient (`specs/13` §4.6) : la liste des objets
//    debout ne lit que les cases de sa fenêtre, et ne dépend pas de la taille
//    de la scène.
// Aucun nombre du catalogue n'est épinglé (`D-52`).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { chargerScene, resoudreDeplacement } from '../src/scene.js';
import { ROTATION_MAX_DEG, varianteTuile } from '../src/decor.js';
import { rayonInfluence } from '../src/defilement.js';
import { selectionnerTuilesVisibles, RESOLUTION_LOGIQUE } from '../src/render.js';
import { boiteDessin } from '../src/tampons.js';
import { echelleVisuel } from '../src/visuels.js';
import {
  estDebout, objetsDeboutDeLaFenetre, piedDe, tableAPlat, trierParPied, tuilesDebout,
} from '../src/profondeur.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

// La table des grains, comme `main.js#construireTableGrains` la bâtit (sans
// l'allègement d'un preset, qui ne retire que des primitives de grain).
const visuelsTuiles = new Map(
  registre.tous('tiles')
    .filter((t) => t.render && t.render.visuel)
    .map((t) => [t.id, [t.render.visuel, ...(t.render.visuel_variantes || [])].map((id) => registre.obtenir('visuels', id))]),
);

// --- 1. La règle se lit sur le dessin ---------------------------------------
{
  const debout = tuilesDebout(visuelsTuiles);
  assert.ok(debout.size > 0, 'le catalogue doit porter au moins une tuile debout (un arbre)');
  for (const [id, visuels] of visuelsTuiles) {
    assert.equal(debout.has(id), visuels.some((v) => !!v.ombre),
      `${id} : debout si et seulement si l'un de ses dessins porte une ombre`);
  }
  // Une surface (une tuile qu'une autre désigne comme son sol) n'est jamais
  // debout : elle se peint sous l'objet qui s'y pose.
  for (const t of registre.tous('tiles')) {
    if (t.render && t.render.sol) assert.ok(!debout.has(t.render.sol), `${t.render.sol} est un sol, il ne se tient pas debout`);
  }
  const plat = tableAPlat(visuelsTuiles);
  for (const id of debout) assert.ok(!plat.has(id), `${id} ne doit plus être cuit dans le calque`);
  for (const id of visuelsTuiles.keys()) if (!debout.has(id)) assert.ok(plat.has(id), `${id} reste dans le calque`);
  assert.equal(tuilesDebout(visuelsTuiles), debout, 'gardé par table : la même table rend le même ensemble');

  // Le pied : le centre de l'ombre, tourné avec le dessin ; sans ombre, le
  // bas du dessin.
  const avecOmbre = registre.tous('visuels').find((v) => v.ombre && v.ombre.dy !== 0);
  const e = echelleVisuel(avecOmbre);
  assert.equal(piedDe(avecOmbre, 100), 100 + avecOmbre.ombre.dy * e);
  assert.ok(Math.abs(piedDe(avecOmbre, 100, { rotation: 180 }) - (100 - avecOmbre.ombre.dy * e)) < 1e-9,
    'un demi-tour retourne l\'ombre de l\'autre côté de l\'ancre');
  const sansOmbre = registre.tous('visuels').find((v) => !v.ombre && Array.isArray(v.primitives) && v.primitives.length > 0);
  assert.equal(piedDe(sansOmbre, 50, { echelle: 2 }), 50 + boiteDessin(sansOmbre, { echelle: 2 * echelleVisuel(sansOmbre) }).maxY);
}

// --- 2. Le héros et un vrai arbre de la Maison ------------------------------
const ID = 'scene_maison_exterieur';
const scene = chargerScene(registre, ID);
const T = scene.tileSize;
const heroVisuel = registre.obtenir('visuels', 'visuel_heros');
// `main.js#rayonHeros` : RAYON_HERO_BASE_PX (10) × l'échelle propre du héros.
const rayon = 10 * echelleVisuel(heroVisuel);
const hitbox = (x, y) => ({ x: x - rayon, y: y - rayon, largeur: rayon * 2, hauteur: rayon * 2 });
const libre = (x, y) => { const t = scene.tuileA(x, y); return t && !t.solid; };

// Marche droit vers l'arbre, pas à pas, jusqu'à ce que la collision arrête.
function marcherJusquAuBlocage(x, y, pas) {
  for (let i = 0; i < 200; i++) {
    const r = resoudreDeplacement(scene, hitbox(x, y), 0, pas, () => false);
    const ny = r.y + rayon;
    if (Math.abs(ny - y) < 1e-6) return y;
    y = ny;
  }
  throw new Error('la collision n\'a jamais arrêté le héros');
}
function boitesSeTouchent(a, b) {
  return a.maxX > b.minX && a.minX < b.maxX && a.maxY > b.minY && a.minY < b.maxY;
}

{
  const debout = tuilesDebout(visuelsTuiles);
  // Un arbre isolé dans sa colonne : libre au nord et au sud, et de chaque
  // côté de ces deux cases, pour que le héros y descende droit.
  let arbre = null;
  for (let y = 2; y < scene.height - 2 && !arbre; y++) {
    for (let x = 2; x < scene.width - 2 && !arbre; x++) {
      const t = scene.tuileA(x, y);
      if (!t || !debout.has(t.id) || !/arbre/.test(t.id)) continue;
      if ([[0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [0, 2]].every(([dx, dy]) => libre(x + dx, y + dy))) arbre = { x, y };
    }
  }
  assert.ok(arbre, 'la Maison doit porter un arbre dégagé au nord et au sud');
  const fenetre = { xDebut: arbre.x, yDebut: arbre.y, xFin: arbre.x + 1, yFin: arbre.y + 1 };
  const [objet] = objetsDeboutDeLaFenetre(scene, fenetre, () => false, visuelsTuiles);
  assert.ok(objet, 'l\'arbre doit sortir de la fenêtre comme un objet debout');
  assert.equal(objet.pied, piedDe(objet.visuel, (arbre.y + 1) * T));
  // Le même dessin que le calque aurait tiré pour cette case.
  const t = scene.tuileA(arbre.x, arbre.y);
  const { index, miroir } = varianteTuile(scene, arbre.x, arbre.y, visuelsTuiles.get(t.id).length, t.render.miroir);
  assert.equal(objet.visuel, visuelsTuiles.get(t.id)[index]);
  assert.equal(objet.miroir, miroir);

  const boiteArbre = (() => {
    const b = boiteDessin(objet.visuel, { echelle: echelleVisuel(objet.visuel), miroir: objet.miroir });
    return { minX: objet.x + b.minX, maxX: objet.x + b.maxX, minY: objet.y + b.minY, maxY: objet.y + b.maxY };
  })();
  const bHeros = boiteDessin(heroVisuel, { echelle: echelleVisuel(heroVisuel) });
  const boiteHeros = (x, y) => ({ minX: x + bHeros.minX, maxX: x + bHeros.maxX, minY: y + bHeros.minY, maxY: y + bHeros.maxY });
  const cx = (arbre.x + 0.5) * T;

  const ordre = (heroY) => trierParPied([
    { nom: 'arbre', pied: objet.pied },
    { nom: 'heros', pied: piedDe(heroVisuel, heroY) },
  ]).map((e) => e.nom);

  const auNord = marcherJusquAuBlocage(cx, (arbre.y - 1.5) * T, 1);
  assert.ok(boitesSeTouchent(boiteHeros(cx, auNord), boiteArbre), 'au nord, contre l\'arbre, le héros et le feuillage se touchent');
  assert.deepEqual(ordre(auNord), ['heros', 'arbre'], 'au nord de l\'arbre, le héros passe DERRIÈRE lui');

  const auSud = marcherJusquAuBlocage(cx, (arbre.y + 2.5) * T, -1);
  assert.ok(boitesSeTouchent(boiteHeros(cx, auSud), boiteArbre), 'au sud, contre l\'arbre, le héros et l\'arbre se touchent');
  assert.deepEqual(ordre(auSud), ['arbre', 'heros'], 'au sud de l\'arbre, le héros passe DEVANT lui');
  console.log(`  arbre (${arbre.x}, ${arbre.y}) : héros arrêté à y=${auNord.toFixed(1)} au nord (derrière), y=${auSud.toFixed(1)} au sud (devant)`);
}

// --- 3. Le décor : un caillou derrière une touffe, une flaque à plat ---------
{
  const motifs = registre.tous('scenes').flatMap((s) => (s.decor ? s.decor.motifs : []));
  const visuelsDecor = [...new Set(motifs.map((m) => m.visuel))].map((id) => registre.obtenir('visuels', id));
  const plats = visuelsDecor.filter((v) => !estDebout(v));
  const deboutDecor = visuelsDecor.filter(estDebout);
  assert.ok(plats.some((v) => /flaque/.test(v.id)), 'les flaques du décor sont à plat');
  assert.ok(deboutDecor.length >= 2, 'le décor porte des motifs debout (cailloux, touffes, cristaux)');

  // Deux motifs debout qui se chevauchent : celui dont le pied est au nord
  // passe derrière, quel que soit leur rang dans la liste du décor (avant, le
  // rang décidait : un caillou tiré après une touffe se posait dessus).
  const [a, b] = deboutDecor;
  const trie = trierParPied([
    { nom: 'sud', pied: piedDe(a, 110) },
    { nom: 'nord', pied: piedDe(b, 100) },
  ]).map((e) => e.nom);
  assert.deepEqual(trie, ['nord', 'sud']);

  // Stabilité : à pied égal, l'ordre d'arrivée tient (le décor avant les
  // entités, un héros au pied exact d'un caillou reste visible).
  assert.deepEqual(trierParPied([{ n: 1, pied: 5 }, { n: 2, pied: 5 }, { n: 3, pied: 4 }]).map((e) => e.n), [3, 1, 2]);

  // --- 4. Le calque ne compte plus ce qui est debout ------------------------
  const complet = rayonInfluence({ visuelsTuiles, visuelsDecor, tileSize: T, rotationDecorMaxDeg: ROTATION_MAX_DEG });
  const aPlat = rayonInfluence({ visuelsTuiles: tableAPlat(visuelsTuiles), visuelsDecor: plats, tileSize: T, rotationDecorMaxDeg: ROTATION_MAX_DEG });
  assert.ok(aPlat <= complet, `le calque à plat ne déborde pas plus que l'ancien (${aPlat} ≤ ${complet})`);
  console.log(`  rayon d'influence du calque : ${complet} → ${aPlat} case(s)`);
}

// --- 5. Le budget de la carte -----------------------------------------------
{
  const def = registre.obtenir('scenes', ID);
  const defGrande = {
    ...def,
    width: def.width * 2,
    height: def.height * 2,
    layout: [...def.layout, ...def.layout].map((ligne) => ligne + ligne),
  };
  const registreGrand = Object.create(registre);
  registreGrand.obtenir = (cat, id) => (cat === 'scenes' && id === ID ? defGrande : registre.obtenir(cat, id));
  const grande = chargerScene(registreGrand, ID);

  const camera = { x: scene.spawn.x * T - RESOLUTION_LOGIQUE.largeur / 2, y: scene.spawn.y * T - RESOLUTION_LOGIQUE.hauteur / 2 };
  const fenetre = selectionnerTuilesVisibles(camera, RESOLUTION_LOGIQUE, T, 1);
  const lire = (s) => {
    let lectures = 0;
    const espion = { ...s, tuileA: (...args) => { lectures += 1; return s.tuileA(...args); } };
    return { objets: objetsDeboutDeLaFenetre(espion, fenetre, () => false, visuelsTuiles), lectures };
  };
  const petite = lire(scene);
  const grandeLue = lire(grande);
  const cases = (fenetre.xFin - fenetre.xDebut) * (fenetre.yFin - fenetre.yDebut);
  assert.equal(petite.lectures, cases, 'une lecture par case de la fenêtre, jamais plus');
  assert.equal(grandeLue.lectures, cases, 'la taille de la scène ne change pas ce qui est lu');
  assert.deepEqual(grandeLue.objets.map((o) => [o.x, o.y, o.visuel.id]), petite.objets.map((o) => [o.x, o.y, o.visuel.id]),
    'la même vue donne les mêmes objets debout, quelle que soit la taille de la scène');
  console.log(`  ${petite.objets.length} objet(s) debout dans la fenêtre du spawn, ${cases} cases lues`);
}

console.log('OK test_d222_profondeur');

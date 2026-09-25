// `D-223` — le FONDU d'un passage (demande de Xav, 25/09) : « certains
// éléments, quand le joueur passe à travers (sud → nord), se font sans
// transition. Est-il possible de rajouter un fondu (additive dissolve ou cross
// dissolve) ? »
//
// Le rendu n'est jamais exercé en headless : ce qui se prouve ici est l'ORDRE
// de peinture que `profondeur.js#ordonnerAvecFondus` rend à `render.js`, et
// l'opacité de chaque repassage.
// 1. la part « devant » : nulle hors de la bande, de 0 au bord nord à 1 au
//    bord sud, continue ;
// 2. l'ordre : dans la bande, l'élément est peint derrière le héros puis
//    repassé juste après lui ; hors de la bande, ou sans contact, le tri seul ;
//    le follet (`sansFondu`) n'en fait jamais ; une bande nulle éteint tout ;
// 3. la traversée d'un vrai caillou du décor, sud → nord, pas à pas : son
//    opacité par-dessus le héros monte de 0 (le héros devant) à 1 (derrière)
//    sans jamais sauter de plus d'un pas de marche ;
// 4. le repassage se fait sans ombre, d'un id à part (le cache des tampons ne
//    le confond pas avec le dessin complet) ;
// 5. le catalogue : la bande est en données, requise, et refusée négative.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { estDebout, ordonnerAvecFondus, piedDe, poidsDevant, sansOmbre } from '../src/profondeur.js';
import { boiteDuVisuel } from '../src/champ.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const BANDE = registre.obtenir('graphismes', 'profondeur').fondu_px;
assert.ok(BANDE > 0, 'le fondu est allumé dans le catalogue');

// --- 1. La part « devant » ----------------------------------------------------
{
  const b = 16;
  assert.equal(poidsDevant(-8, b), null, 'au bord nord : hors bande, le tri seul');
  assert.equal(poidsDevant(8, b), null, 'au bord sud : hors bande');
  assert.equal(poidsDevant(0, b), 0.5, 'pied contre pied : à moitié');
  assert.ok(poidsDevant(-7.99, b) < 0.001 && poidsDevant(7.99, b) > 0.999, 'continue aux bords');
  let avant = -1;
  for (let e = -7.9; e < 8; e += 0.1) {
    const t = poidsDevant(e, b);
    assert.ok(t > avant, 'croît du nord au sud');
    avant = t;
  }
  assert.equal(poidsDevant(0, 0), null, 'une bande nulle : aucun fondu');
}

// --- 2. L'ordre -------------------------------------------------------------
const noms = (liste) => liste.map(({ element, alpha, repasse }) => `${element.n}${repasse ? `@${alpha.toFixed(2)}` : ''}`);
{
  const heros = { n: 'H', pied: 100 };
  const arbre = { n: 'A', pied: 104 }; // 4 px au sud : dans la bande, devant aux trois quarts
  const loin = { n: 'L', pied: 130 };
  const nord = { n: 'N', pied: 60 };
  const follet = { n: 'F', pied: 101, sansFondu: true };
  const touche = () => true;
  assert.deepEqual(noms(ordonnerAvecFondus([nord, arbre, heros, follet, loin], heros, 16, touche)),
    ['N', 'A', 'H', 'A@0.75', 'F', 'L'], 'derrière, puis repassé juste après le héros');
  assert.deepEqual(noms(ordonnerAvecFondus([nord, arbre, heros, follet, loin], heros, 16, (e) => e !== arbre)),
    ['N', 'H', 'F', 'A', 'L'], 'sans contact : le tri seul');
  assert.deepEqual(noms(ordonnerAvecFondus([nord, arbre, heros, follet, loin], heros, 0, touche)),
    ['N', 'H', 'F', 'A', 'L'], 'bande nulle : le tri seul');
  // Au nord dans la bande : peint derrière (comme le tri), repassé faiblement.
  const touffe = { n: 'T', pied: 97 };
  assert.deepEqual(noms(ordonnerAvecFondus([heros, touffe], heros, 16, touche)), ['T', 'H', 'T@0.31']);
  // Deux éléments en fondu : repassés du nord au sud.
  const a = { n: 'a', pied: 103 };
  const b = { n: 'b', pied: 98 };
  assert.deepEqual(noms(ordonnerAvecFondus([a, heros, b], heros, 16, touche)), ['b', 'a', 'H', 'b@0.38', 'a@0.69']);
  // Chaque élément paraît une fois, plus une fois par repassage.
  const liste = ordonnerAvecFondus([nord, arbre, heros, follet, loin, touffe], heros, 16, touche);
  assert.equal(liste.filter((e) => !e.repasse).length, 6);
}

// --- 3. La traversée d'un caillou du décor, sud → nord -----------------------
{
  const heroVisuel = registre.obtenir('visuels', 'visuel_heros');
  const caillou = registre.tous('visuels').find((v) => v.id === 'visuel_rocher_grand') || registre.tous('visuels').find((v) => estDebout(v) && /rocher/.test(v.id));
  const cx = 500;
  const cy = 500;
  const elementCaillou = { n: 'C', pied: piedDe(caillou, cy) };
  const boiteCaillou = boiteDuVisuel(caillou, cx, cy);
  const pas = 1.5; // une frame de marche
  const alphas = [];
  let aTraverse = false;
  for (let y = cy + 30; y > cy - 30; y -= pas) {
    const heros = { n: 'H', pied: piedDe(heroVisuel, y) };
    const bh = boiteDuVisuel(heroVisuel, cx, y);
    const touche = () => bh.maxX > boiteCaillou.minX && bh.minX < boiteCaillou.maxX && bh.maxY > boiteCaillou.minY && bh.minY < boiteCaillou.maxY;
    const liste = ordonnerAvecFondus([elementCaillou, heros], heros, BANDE, touche);
    // L'opacité du caillou PAR-DESSUS le héros : 1 s'il est peint après lui
    // sans fondu, l'alpha du repassage s'il y en a un, 0 s'il est derrière.
    const iH = liste.findIndex((e) => e.element === heros);
    const repasse = liste.find((e) => e.repasse);
    const devant = repasse ? repasse.alpha : (liste.findIndex((e) => e.element === elementCaillou) > iH ? 1 : 0);
    if (repasse) aTraverse = true;
    if (touche()) alphas.push(devant);
  }
  assert.ok(aTraverse, 'la traversée passe par la bande');
  assert.equal(alphas[0], 0, 'au sud du caillou, le héros passe devant : rien du caillou par-dessus lui');
  assert.equal(alphas[alphas.length - 1], 1, 'au nord, le caillou le recouvre entièrement');
  for (let i = 1; i < alphas.length; i++) {
    assert.ok(alphas[i] >= alphas[i - 1] - 1e-9, 'l\'opacité ne redescend jamais en allant au nord');
    assert.ok(alphas[i] - alphas[i - 1] <= pas / BANDE + 1e-9, `aucun saut de plus d'un pas (${alphas[i - 1]} → ${alphas[i]})`);
  }
  console.log(`  un caillou traversé en ${alphas.filter((a) => a > 0 && a < 1).length} pas de fondu (bande ${BANDE} px)`);
}

// --- 4. Le repassage sans ombre ---------------------------------------------
{
  const arbre = registre.obtenir('visuels', 'visuel_arbre');
  const nu = sansOmbre(arbre);
  assert.ok(arbre.ombre && !nu.ombre, 'l\'ombre est retirée');
  assert.notEqual(nu.id, arbre.id, 'un id à part : le cache des tampons ne les confond pas');
  assert.equal(nu.primitives, arbre.primitives, 'le dessin, lui, est le même');
  assert.equal(sansOmbre(arbre), nu, 'gardé : la même copie à chaque frame');
  const plat = registre.obtenir('visuels', 'visuel_flaque');
  assert.equal(sansOmbre(plat), plat, 'sans ombre, rien à retirer');
}

// --- 5. Le catalogue --------------------------------------------------------
{
  const faux = structuredClone(donnees);
  faux.graphismes.find((e) => e.id === 'profondeur').fondu_px = -1;
  assert.ok(validerCatalogues(faux, SCHEMAS).some((e) => /fondu_px/.test(e)), 'une bande négative est refusée');
  const sans = structuredClone(donnees);
  sans.graphismes = sans.graphismes.filter((e) => e.id !== 'profondeur');
  assert.ok(validerCatalogues(sans, SCHEMAS).some((e) => /"profondeur" manque/.test(e)), 'l\'entrée est requise');
  const zero = structuredClone(donnees);
  zero.graphismes.find((e) => e.id === 'profondeur').fondu_px = 0;
  assert.deepEqual(validerCatalogues(zero, SCHEMAS), [], '0 est une valeur : le fondu éteint');
}

console.log('OK test_d223_fondu_passage');

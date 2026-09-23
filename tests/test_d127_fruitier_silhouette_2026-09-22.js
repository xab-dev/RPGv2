// `D-127` — le fruitier du Jardin, refait sur la charte du puits et des stations.
//
// Le fruitier n'est pas une station : c'est une TUILE solide, dessinée dans le
// calque statique par `render.js#construireCoucheStatique`, de gauche à droite
// et de haut en bas. Sa collision est la cellule entière (un booléen, jamais la
// boîte du dessin) : redessiner l'arbre ne déplace donc aucun mur. Ce qui
// contraint le dessin est l'ORDRE de peinture, et c'est ce que ce test tient :
//   - ce qui dépasse à DROITE ou en BAS est effacé par l'aplat de la tuile
//     suivante (une moitié de houppier coupée net) — le dessin tient dans la
//     largeur de sa cellule et ne descend pas sous son bord bas ;
//   - vers le HAUT il a le droit de dépasser (la rangée du dessus est déjà
//     peinte), c'est ce qui donne sa hauteur à un arbre.
// Et un contrat de sol, né du diagnostic (un carré vert sombre et lisse sous
// l'arbre, au milieu de la pelouse) : la tuile DÉCLARE l'herbe comme sol
// (`render.sol`, `Q-70`, 23/09) — couleur et grain viennent de l'herbe elle-même.
// Il remplace l'ancienne copie du grain en tête du visuel, qui refaisait le
// carré dès que l'herbe changeait.
// Aucun nombre d'équilibrage n'est épinglé (règle `D-52`) : seulement des relations.
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { etenduePeinte } from './test_d105_grain_sol_dans_la_cellule.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['tiles', 'visuels', 'scenes']);
const tuile = (id) => donnees.tiles.find((t) => t.id === id);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);

const fruitier = tuile('tile_arbre_fruitier');
const herbe = tuile('tile_herbe');
const arbre = visuel(fruitier.render.visuel);
const grain = visuel(herbe.render.visuel);

// 1. Le sol sous l'arbre est de l'herbe.
assert.equal(fruitier.solid, true, 'le fruitier reste solide (on ne le traverse pas)');
assert.equal(fruitier.render.sol, herbe.id, "le fruitier doit déclarer l'herbe comme sol");
assert.notDeepEqual(
  arbre.primitives.slice(0, grain.primitives.length),
  grain.primitives,
  'le visuel du fruitier porte encore une copie du grain : il serait peint deux fois'
);

// 2. Le dessin respecte l'ordre de peinture du calque statique.
for (const cote of new Set(donnees.scenes.map((s) => s.tile_size))) {
  const e = etenduePeinte(arbre);
  assert.ok(e.minX >= -cote / 2 && e.maxX <= cote / 2, `fruitier plus large que sa cellule (${e.minX}..${e.maxX})`);
  assert.ok(e.maxY <= 0, `fruitier sous le bord bas de sa cellule (${e.maxY})`);
}

// 3. Le fruit de l'arbre est le fruit qu'on ramasse : même accent de couleur.
const couleursFruit = new Set(visuel('visuel_fruit').primitives.map((p) => p.couleur));
const accents = arbre.primitives.filter((p) => ['#a8362a', '#d94a3d'].includes(p.couleur));
assert.ok(accents.length > 0, 'le fruitier ne porte plus de fruit');
for (const p of accents) assert.ok(couleursFruit.has(p.couleur), `accent ${p.couleur} absent de visuel_fruit`);

console.log('test_d127_fruitier_silhouette : ok');

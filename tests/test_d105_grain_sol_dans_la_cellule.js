// `D-105` — le grain du sol : contrat de CELLULE.
//
// Ce que la session a découvert, et que rien n'attrapait : un `render.visuel`
// de tuile est dessiné par `render.js#construireCoucheStatique` ancré au
// milieu du BAS de sa cellule, dans une boucle qui va de gauche à droite et de
// haut en bas. Ce qui dépasse de la cellule ne dépasse donc pas « un peu » :
//   - à DROITE et en BAS, l'aplat de la tuile suivante, peint après, l'EFFACE ;
//   - à GAUCHE et en HAUT, il peint PAR-DESSUS une tuile déjà finie — donc de
//     l'herbe sur le chemin, ou sur un mur de la Maison.
// Un grain qui déborde est asymétriquement rogné d'un côté et intrusif de
// l'autre : le défaut ne se voit qu'en jeu, et seulement à certains bords.
//
// D'où le contrat, qui se lit dans les données sans citer un seul id : une
// tuile NON SOLIDE qui porte un visuel porte une TEXTURE de surface, et une
// texture tient dans sa cellule. Une tuile solide (arbre, rocher) porte un
// OBJET, qui a le droit d'être plus grand que sa tuile — c'est même le but.
//
// Ce qui se mesure est la GÉOMÉTRIE du grain, pas la bavure d'un demi-trait :
// un motif qui doit être continu d'une cellule à la suivante (les lames du
// parquet) touche forcément le bord, et un trait de 1 px centré dessus lape
// d'un demi-pixel chez le voisin — à cet endroit précis où le voisin a peint
// le même trait. C'est l'épaisseur d'un cheveu, et c'est le prix d'un motif
// sans couture. Ce qui est refusé, c'est qu'une FORME ou le CHEMIN d'un trait
// passe la frontière : là, c'est un objet entier qui atterrit chez le voisin.
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { boitePrimitive } from '../src/structures.js';
import { echelleVisuel } from '../src/visuels.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['tiles', 'visuels', 'scenes']);
const visuelParId = new Map(donnees.visuels.map((v) => [v.id, v]));

// Le côté d'une cellule est une donnée de scène (`tile_size`), jamais 32 écrit
// ici : le jour où une scène change de pas, le test suit.
const COTES = [...new Set(donnees.scenes.map((s) => s.tile_size))];
assert.ok(COTES.length >= 1, 'aucune scène ne déclare de tile_size');

// Étendue peinte d'un visuel, en unités logiques, relative à l'ancre (le
// milieu du bas de la cellule) : x dans [-cote/2, +cote/2], y dans [-cote, 0].
export function etenduePeinte(visuel) {
  const echelle = echelleVisuel(visuel);
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of visuel.primitives) {
    const b = boitePrimitive(p, echelle);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }
  if (visuel.ombre) {
    const o = visuel.ombre;
    minX = Math.min(minX, (o.dx || 0) - o.w / 2);
    maxX = Math.max(maxX, (o.dx || 0) + o.w / 2);
    minY = Math.min(minY, o.dy - o.h / 2);
    maxY = Math.max(maxY, o.dy + o.h / 2);
  }
  return { minX, minY, maxX, maxY };
}

function tient(visuel, cote) {
  const e = etenduePeinte(visuel);
  return e.minX >= -cote / 2 && e.maxX <= cote / 2 && e.minY >= -cote && e.maxY <= 0;
}

// --- 1. Toute tuile non solide qui porte un visuel tient dans sa cellule ----
let grains = 0;
for (const tuile of donnees.tiles) {
  const idVisuel = tuile.render && tuile.render.visuel;
  if (!idVisuel || tuile.solid) continue;
  const visuel = visuelParId.get(idVisuel);
  assert.ok(visuel, `${tuile.id} > render.visuel "${idVisuel}" introuvable`);
  grains += 1;
  for (const cote of COTES) {
    const e = etenduePeinte(visuel);
    assert.ok(
      tient(visuel, cote),
      `${tuile.id} : le grain "${idVisuel}" sort de sa cellule de ${cote} px `
      + `(x ${e.minX}..${e.maxX}, y ${e.minY}..${e.maxY}) — il serait rogné à droite/en bas `
      + 'et peindrait sur la tuile voisine à gauche/en haut',
    );
  }
}
assert.ok(grains >= 4, `attendu au moins 4 grains de sol en données, vu ${grains}`);

// --- 2. TÉMOIN : un grain qui déborde d'un demi-pixel est refusé ------------
// Sans ce témoin, le test ci-dessus passerait aussi bien sur un catalogue où
// personne ne vérifie rien (la faute de `test_d43_c2`, cf. `D-72`).
const debordeEnHaut = { primitives: [{ forme: 'ligne', dx: 0, dy: -30, points: [[0, 0], [0, -4]], epaisseur: 1 }] };
assert.ok(!tient(debordeEnHaut, 32), 'le témoin « brin qui dépasse en haut » devrait être refusé');
const debordeADroite = { primitives: [{ forme: 'ellipse', dx: 15, dy: -8, w: 4, h: 3 }] };
assert.ok(!tient(debordeADroite, 32), 'le témoin « caillou qui dépasse à droite » devrait être refusé');
const pleineCellule = { primitives: [{ forme: 'ligne', dx: 0, dy: 0, points: [[-16, -32], [16, 0]], epaisseur: 1 }] };
assert.ok(tient(pleineCellule, 32), "une diagonale de coin à coin doit tenir : c'est elle qui rend un motif continu");

// --- 3. Un OBJET de tuile a le droit de dépasser ----------------------------
// La contrepartie du contrat : l'arbre est plus grand que sa tuile, et c'est
// ce qui donne sa hauteur à la forêt. Le test le vérifie pour qu'on ne soit
// pas tenté, un jour, d'étendre la règle à toutes les tuiles.
const objets = donnees.tiles.filter((t) => t.solid && t.render && t.render.visuel);
assert.ok(objets.length >= 1, 'aucune tuile-objet (solide + visuel) dans le catalogue');
assert.ok(
  objets.some((t) => !tient(visuelParId.get(t.render.visuel), Math.min(...COTES))),
  'aucune tuile solide ne dépasse de sa cellule : la règle du §1 ne se distingue plus de « tout tient »',
);

console.log('OK test_d105_grain_sol_dans_la_cellule');

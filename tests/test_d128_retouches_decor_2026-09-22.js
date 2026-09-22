// `D-128` et suivants — retouches graphiques du 22/09 (rocher, arbre du chemin,
// leviers, murs et toit de la Maison). Un seul fichier, une table par contrat :
// chaque commit de la session y ajoute sa ligne, rien d'autre.
//
// Contrat 1 — une tuile-OBJET posée sur un sol (même diagnostic que le fruitier,
// `D-127`) : l'aplat de la tuile EST celui du sol qui l'entoure, et le grain de ce
// sol est recopié à l'identique en tête du visuel. Sans ça, l'objet est planté
// dans un carré d'une autre couleur. Une tuile ne portant qu'UN visuel, la copie
// est le moyen (`Q-70`, reporté) : ce test refuse qu'elle diverge.
//
// Contrat 2 — l'ordre de peinture du calque statique (gauche → droite, haut →
// bas) : ce qui dépasse à droite ou en bas d'une cellule est effacé par la
// tuile suivante. Le dessin tient dans la largeur de sa cellule et ne descend
// pas sous son bord bas ; vers le haut, il a le droit de dépasser.
//
// Contrat 3 — ce qui est retouché ici ne touche PAS ce que Xav a mis hors
// périmètre : la forêt garde `visuel_arbre`, la Grotte garde `visuel_rocher_grand`.
//
// Aucun nombre d'équilibrage n'est épinglé (règle `D-52`).
import assert from 'node:assert/strict';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { boitePrimitive } from '../src/structures.js';

const { donnees } = await chargerCataloguesDepuisDisque('data', ['tiles', 'visuels', 'scenes']);
const tuile = (id) => donnees.tiles.find((t) => t.id === id);
const visuel = (id) => donnees.visuels.find((v) => v.id === id);
const COTES = [...new Set(donnees.scenes.map((s) => s.tile_size))];

function etendue(v) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const boites = v.primitives.map((p) => boitePrimitive(p));
  if (v.ombre) boites.push({ minX: -v.ombre.w / 2, maxX: v.ombre.w / 2, minY: v.ombre.dy - v.ombre.h / 2, maxY: v.ombre.dy + v.ombre.h / 2 });
  for (const b of boites) {
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
  }
  return { minX, minY, maxX, maxY };
}

// tuile-objet -> tuile de sol qu'elle continue.
const OBJETS_SUR_SOL = {
  tile_rocher: 'tile_herbe', // D-128
};

for (const [idObjet, idSol] of Object.entries(OBJETS_SUR_SOL)) {
  const objet = tuile(idObjet);
  const sol = tuile(idSol);
  const v = visuel(objet.render.visuel);
  const grain = visuel(sol.render.visuel);
  assert.equal(objet.solid, true, `${idObjet} doit rester solide`);
  for (const cle of ['valeur', 'variantes', 'variation_teinte']) {
    assert.deepEqual(objet.render[cle], sol.render[cle], `${idObjet} : aplat ≠ ${idSol} (${cle})`);
  }
  assert.deepEqual(v.primitives.slice(0, grain.primitives.length), grain.primitives, `${idObjet} : grain de ${idSol} divergé`);
  for (const cote of COTES) {
    const e = etendue(v);
    assert.ok(e.minX >= -cote / 2 && e.maxX <= cote / 2, `${idObjet} plus large que sa cellule (${e.minX}..${e.maxX})`);
    assert.ok(e.maxY <= 0, `${idObjet} descend sous le bord bas de sa cellule (${e.maxY})`);
  }
}

// Contrat 3 : le hors-périmètre n'a pas bougé de visuel.
assert.equal(tuile('tile_arbre_fond').render.visuel, 'visuel_arbre', 'la forêt a changé de visuel');
const decorGrotte = donnees.scenes
  .filter((s) => s.id.startsWith('scene_grotte'))
  .flatMap((s) => JSON.stringify(s).match(/visuel_rocher_\w+/g) || []);
assert.ok(decorGrotte.length > 0 && decorGrotte.every((id) => id === 'visuel_rocher_grand' || id === 'visuel_rocher_petit'),
  `le décor de la Grotte a changé de rocher : ${decorGrotte}`);

console.log('test_d128_retouches_decor : ok');

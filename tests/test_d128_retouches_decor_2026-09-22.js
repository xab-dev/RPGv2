// `D-128` et suivants — retouches graphiques du 22/09 (rocher, arbre du chemin,
// leviers, murs et toit de la Maison). Un seul fichier, une table par contrat :
// chaque commit de la session y ajoute sa ligne, rien d'autre.
//
// Contrat 1 — une tuile-OBJET posée sur un sol (même diagnostic que le fruitier,
// `D-127`) : la tuile DÉCLARE le sol qui l'entoure (`render.sol`, `Q-70`, livré
// le 23/09), dont la couleur et le grain sont peints sous l'objet. Sans ça,
// l'objet est planté dans un carré d'une autre couleur. Le visuel ne porte plus
// la copie du grain qu'il portait jusqu'au 23/09 : elle serait peinte deux fois.
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
  tile_arbre: 'tile_chemin', // D-129 — l'arbre récoltable est au milieu du chemin
};

for (const [idObjet, idSol] of Object.entries(OBJETS_SUR_SOL)) {
  const objet = tuile(idObjet);
  const sol = tuile(idSol);
  const v = visuel(objet.render.visuel);
  const grain = visuel(sol.render.visuel);
  assert.equal(objet.solid, true, `${idObjet} doit rester solide`);
  assert.equal(objet.render.sol, idSol, `${idObjet} doit déclarer ${idSol} comme sol`);
  assert.notDeepEqual(v.primitives.slice(0, grain.primitives.length), grain.primitives, `${idObjet} : copie du grain de ${idSol} encore là`);
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

// `D-130` — le levier. Son état ne se lit qu'à la teinte (gris → jaune, posée
// par render.js) : il faut donc AU MOINS une pièce teintée, et le visuel doit
// se déclarer teintable (schemas.js le refuse sinon). Et règle `D-98` : ce qui
// donne du volume par-dessus une pièce teintée est en ALPHA PUR (noir ou blanc
// translucide) — une facette de couleur fixe jurerait dans l'un des deux états.
{
  const levier = visuel('visuel_levier');
  assert.equal(levier.teintable, true, 'visuel_levier doit rester teintable');
  const teintees = levier.primitives.filter((p) => p.teinte);
  assert.ok(teintees.length >= 1, 'le levier ne porte plus de pièce teintée : son état ne se lirait plus');
  const indices = teintees.map((p) => levier.primitives.indexOf(p));
  for (let i = 0; i < levier.primitives.length; i++) {
    const p = levier.primitives[i];
    // Un volume = une primitive posée juste après une pièce teintée, avant la pièce suivante.
    const surTeinte = indices.some((j) => i > j && i <= j + 2 && !p.teinte && p.alpha != null);
    if (surTeinte) assert.ok(['#000000', '#ffffff'].includes(p.couleur), `volume de levier en couleur fixe : ${p.couleur}`);
  }
}

// `D-131` — les murs de la Maison. Une tuile solide a le droit de dépasser vers
// le haut (un arbre), mais un MUR est une surface, pas un objet : son appareil
// tient dans sa cellule sur les quatre bords, sinon la pierre d'un mur nord
// mordrait l'herbe au-dessus, et celle d'un mur ouest le chemin à sa gauche.
{
  const mur = tuile('tile_mur_maison');
  assert.equal(mur.solid, true, 'le mur de la Maison doit rester solide');
  const v = visuel(mur.render.visuel);
  for (const cote of COTES) {
    const e = etendue(v);
    assert.ok(e.minX >= -cote / 2 && e.maxX <= cote / 2 && e.minY >= -cote && e.maxY <= 0,
      `le mur de la Maison sort de sa cellule (${JSON.stringify(e)})`);
  }
}

// `D-132` — le toit. Son motif est la cellule répétée par render.js
// (createPattern) sur tout le rectangle : il doit donc se RACCORDER à lui-même.
// Ce qui touche le bord gauche d'une cellule doit toucher le bord droit sur les
// mêmes hauteurs, sinon une couture verticale apparaît tous les 32 px. (Qu'il
// tienne dans sa cellule, le contrat `D-105` le vérifie déjà : c'est une tuile
// non solide.)
{
  const toit = tuile('tile_toit');
  const v = visuel(toit.render.visuel);
  assert.ok(v, 'le toit a perdu son motif');
  for (const cote of COTES) {
    const bord = cote / 2;
    const hauteursAuBord = (signe) => v.primitives
      .map((p) => boitePrimitive(p))
      .filter((b) => Math.abs((signe < 0 ? b.minX : b.maxX) - signe * bord) < 1e-6)
      .map((b) => `${b.minY.toFixed(2)}..${b.maxY.toFixed(2)}`)
      .sort();
    assert.ok(hauteursAuBord(-1).length > 0, 'le motif du toit ne touche pas ses bords : il ne couvrirait pas le toit');
    assert.deepEqual(hauteursAuBord(-1), hauteursAuBord(1), 'le motif du toit ne se raccorde pas à lui-même (bord gauche ≠ bord droit)');
  }
}

console.log('test_d128_retouches_decor : ok');

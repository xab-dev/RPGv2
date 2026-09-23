// `Q-70` — le sol d'une tuile-objet est une RÉFÉRENCE, plus une copie (23/09).
//
// Une tuile solide qui porte un objet (arbre de la forêt, rocher, fruitier,
// arbre du chemin) déclare `render.sol` : la tuile de surface sur laquelle elle
// est posée. Le calque statique peint la couleur de CE sol à cette position
// (même hash, même palette que la surface voisine) puis son grain, puis l'objet.
// Né du « carré d'herbe » sous chaque arbre de la forêt (aplat `#3d5a2c` sans
// grain, découpé dans la pelouse) et de la copie du grain dans les visuels
// récoltables, qui refaisait le carré dès que l'herbe changeait.
//
// Ce qui se tient ici : la couleur d'un objet posé est celle du sol à la même
// case ; le schéma refuse un sol absent, solide ou chaîné ; la forêt procédurale
// pousse sur la tuile qu'elle déclare libre. Aucune valeur de réglage épinglée.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { couleurTuile, tuileDeSol } from '../src/decor.js';
import { chargerScene } from '../src/scene.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);

// --- 1. Sur la vraie Maison : un objet a la couleur de son sol ------------
{
  const scene = chargerScene(registre, 'scene_maison_exterieur');
  // Une scène « jumelle » où chaque tuile-objet est remplacée par son sol :
  // ce qu'on y lit est la couleur que la surface aurait eue sans l'objet.
  const surface = { ...scene, tuileA: (x, y, f) => { const t = scene.tuileA(x, y, f); return t && tuileDeSol(scene, t); } };
  let objets = 0;
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const t = scene.tuileA(x, y);
      if (!t.render.sol) continue;
      objets += 1;
      assert.equal(couleurTuile(scene, x, y), couleurTuile(surface, x, y), `${t.id} en (${x}, ${y}) : un carré d'une autre couleur`);
    }
  }
  assert.ok(objets > 100, `attendu la forêt entière parmi les objets posés, vu ${objets}`);
  console.log(`OK ${objets} tuiles-objets peintes à la couleur de leur sol`);
}

// --- 2. La forêt procédurale pousse sur ce qu'elle déclare libre ----------
for (const s of donnees.scenes.filter((x) => x.foret_procedurale)) {
  const { tile_libre: libre, tile_plein: plein } = s.foret_procedurale;
  const arbre = donnees.tiles.find((t) => t.id === plein);
  assert.equal(arbre.render.sol, libre, `${s.id} : les arbres de ${plein} ne sont pas posés sur ${libre}`);
}

// --- 3. Aucun visuel ne porte plus la copie du grain de son sol -----------
for (const t of donnees.tiles.filter((x) => x.render && x.render.sol && x.render.visuel)) {
  const sol = donnees.tiles.find((x) => x.id === t.render.sol);
  const grain = sol.render.visuel && donnees.visuels.find((v) => v.id === sol.render.visuel);
  if (!grain) continue;
  const objet = donnees.visuels.find((v) => v.id === t.render.visuel);
  assert.notDeepEqual(objet.primitives.slice(0, grain.primitives.length), grain.primitives,
    `${t.id} : ${objet.id} recopie encore le grain de ${sol.id} (peint deux fois)`);
}

// --- 4. Le schéma : un sol est une surface, un seul niveau ---------------
{
  const avec = (sol) => ({ ...donnees, tiles: donnees.tiles.map((t) => (t.id === 'tile_rocher' ? { ...t, render: { ...t.render, sol } } : t)) });
  const erreursPour = (sol) => validerCatalogues(avec(sol), SCHEMAS).join(' | ');
  assert.match(erreursPour('tile_inexistante'), /render\.sol "tile_inexistante" introuvable/);
  assert.match(erreursPour('tile_mur_maison'), /est solide/);
  const chaine = {
    ...donnees,
    tiles: donnees.tiles.map((t) => {
      if (t.id === 'tile_chemin') return { ...t, render: { ...t.render, sol: 'tile_herbe' } };
      if (t.id === 'tile_rocher') return { ...t, render: { ...t.render, sol: 'tile_chemin' } };
      return t;
    }),
  };
  assert.match(validerCatalogues(chaine, SCHEMAS).join(' | '), /déclare lui-même un sol/);
  console.log('OK schéma : sol absent, solide ou chaîné refusé au boot');
}

console.log('--- Q-70 : un objet se pose sur son sol, il ne le recopie plus.');

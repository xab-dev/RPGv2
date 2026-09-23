// `D-59` (file Nv.0 → Nv.10, T2, `Q-33`) — décision de Xav du 21/09 : les
// objets au sol ne tombent plus n'importe où dans leur zone. Chaque scène
// porte une liste de points candidats posés à la main (~3 × le nombre
// d'objets présents) ; à chaque aube, on en retient `nb_au_sol`, tirés avec
// le NUMÉRO DU JOUR pour graine.
//
// Contrats vérifiés ici :
//   - la liste existe, elle fait au moins le double du besoin, et elle est
//     jouable (aucun point solide, aucun point isolé de la carte) ;
//   - le gradient : la moitié des points est près du chemin ou du Jardin,
//     et quelques-uns sont loin ;
//   - le tirage est déterministe (même jour = mêmes positions) et il CHANGE
//     d'un jour à l'autre ;
//   - il ne sort jamais de la liste, et ne pose jamais deux objets sur la
//     même tuile ;
//   - la migration 5 -> 6 vide les positions héritées de l'ancien tirage.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { calculerTuilesAtteignables, reposerItemsDuJour, tirerPointsDuJour } from '../src/ground_items.js';
import { migrer, VERSION_SCHEMA_COURANTE, saveNeuve } from '../src/save.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_ID = 'scene_maison_exterieur';

const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'), Object.keys(SCHEMAS),
);
assert.deepEqual(erreurs, []);
assert.deepEqual(validerCatalogues(donnees, SCHEMAS), []);
const registre = construireRegistre(donnees);
const scene = chargerScene(registre, SCENE_ID);
const donneesScene = registre.obtenir('scenes', SCENE_ID);
const items = registre.tous('items').filter((i) => i.spawn);

// --- 1. La liste est là, assez longue, et jouable -------------------------
{
  const atteignables = calculerTuilesAtteignables(scene, donneesScene.spawn.x, donneesScene.spawn.y);
  assert.ok(scene.pointsRessources, `${SCENE_ID} doit déclarer des points_ressources`);
  for (const item of items) {
    const liste = scene.pointsRessources[item.id];
    assert.ok(liste && liste.length > 0, `${item.id} doit avoir des points candidats`);
    // « Environ 3 fois le nombre d'objets présents » : en dessous du double,
    // deux aubes de suite reposeraient les objets aux mêmes endroits et le
    // tirage ne se verrait pas.
    assert.ok(
      liste.length >= item.spawn.nb_au_sol * 2,
      `${item.id} : ${liste.length} points pour ${item.spawn.nb_au_sol} objets, il en faut au moins le double`,
    );
    for (const [tx, ty] of liste) {
      const tuile = scene.tuileA(tx, ty);
      assert.ok(tuile && !tuile.solid, `${item.id} : le point (${tx},${ty}) est solide`);
      assert.ok(atteignables.has(`${tx},${ty}`), `${item.id} : le point (${tx},${ty}) est isolé du reste de la carte`);
    }
  }
  console.log("OK des points candidats pour chaque item, assez nombreux, tous jouables");
}

// --- 2. Le gradient ------------------------------------------------------
// « Dense le long du chemin et autour du Jardin, clairsemé au loin ». On ne
// vérifie pas une formule — il n'y en a aucune en jeu : on vérifie la FORME
// de la liste posée, c'est-à-dire ce que le joueur rencontrera vraiment.
{
  const tuilesChemin = [];
  for (let ty = 0; ty < scene.height; ty += 1) {
    for (let tx = 0; tx < scene.width; tx += 1) {
      const t = scene.tuileA(tx, ty);
      if (t && t.id === 'tile_chemin') tuilesChemin.push([tx, ty]);
    }
  }
  assert.ok(tuilesChemin.length > 0, 'la scène doit avoir un chemin, sinon ce contrôle ne veut rien dire');
  const jardin = scene.zones.find((z) => z.type === 'jardin').rect;
  const cxJardin = jardin.x + jardin.w / 2;
  const cyJardin = jardin.y + jardin.h / 2;
  const distance = (tx, ty) => Math.min(
    Math.min(...tuilesChemin.map(([cx, cy]) => Math.abs(cx - tx) + Math.abs(cy - ty))),
    Math.hypot(tx - cxJardin, ty - cyJardin),
  );

  for (const item of items) {
    const liste = scene.pointsRessources[item.id];
    const distances = liste.map(([tx, ty]) => distance(tx, ty)).sort((a, b) => a - b);
    const mediane = distances[Math.floor(distances.length / 2)];
    // Le débutant trouve en marchant : la moitié des points est à moins de
    // 12 tuiles d'un des deux pôles.
    assert.ok(mediane <= 12, `${item.id} : médiane ${mediane} tuiles, le gradient ne penche pas assez vers le chemin`);
    // Et le vétéran a de quoi chercher : tout n'est pas collé au chemin.
    // Le fruit est l'exception assumée — il est au Jardin, par nature.
    if (item.spawn.nb_au_sol > 1) {
      assert.ok(
        distances[distances.length - 1] >= 20,
        `${item.id} : le point le plus lointain est à ${distances[distances.length - 1]} tuiles — rien à chercher au loin`,
      );
    }
  }
  console.log("OK gradient : médiane près des pôles, quelques points loin");
}

// --- 3. Déterminisme, et variation d'un jour à l'autre -------------------
{
  const jour3a = reposerItemsDuJour(scene, items, 3);
  const jour3b = reposerItemsDuJour(scene, items, 3);
  assert.deepEqual(jour3b, jour3a, 'même jour = mêmes positions (une partie rejouée se déroule pareil)');

  // Sur dix jours, un item nombreux doit changer de semis : sinon la liste
  // ne sert à rien, et on est revenu au « toujours au même endroit » que
  // `Q-33` reprochait au jeu.
  const nombreux = items.filter((i) => i.spawn.nb_au_sol > 1);
  assert.ok(nombreux.length > 0, 'au moins un item posé en plusieurs exemplaires');
  for (const item of nombreux) {
    const semis = new Set();
    for (let jour = 0; jour < 10; jour += 1) {
      semis.add(JSON.stringify(tirerPointsDuJour(scene, item.id, item.spawn.nb_au_sol, jour)));
    }
    assert.ok(semis.size >= 8, `${item.id} : seulement ${semis.size} semis différents sur 10 jours`);
  }
  console.log("OK le tirage est déterministe par jour, et change d'un jour à l'autre");
}

// --- 4. Il ne sort jamais de la liste, et n'empile pas deux objets -------
{
  for (let jour = 0; jour < 20; jour += 1) {
    const poses = reposerItemsDuJour(scene, items, jour);
    for (const [itemId, positions] of Object.entries(poses)) {
      const item = items.find((i) => i.id === itemId);
      assert.equal(positions.length, item.spawn.nb_au_sol, `${itemId} : jour ${jour}, compte inattendu`);
      const tuiles = positions.map((p) => `${Math.floor(p.x / scene.tileSize)},${Math.floor(p.y / scene.tileSize)}`);
      assert.equal(new Set(tuiles).size, tuiles.length, `${itemId} : jour ${jour}, deux objets sur la même tuile`);
      const autorisees = new Set(scene.pointsRessources[itemId].map(([tx, ty]) => `${tx},${ty}`));
      for (const t of tuiles) assert.ok(autorisees.has(t), `${itemId} : jour ${jour}, point ${t} hors liste`);
    }
  }
  console.log("OK vingt jours de tirage : toujours dans la liste, jamais deux objets sur une tuile");
}

// --- 5. La migration 5 -> 6 ---------------------------------------------
// Le point de la migration : les positions d'une v5 viennent de l'ancien
// tirage LIBRE dans les zones. Les garder les figerait jusqu'à la première
// aube jouée — un joueur qui reprend sa partie de nuit ne verrait rien du
// nouveau semis.
{
  assert.equal(VERSION_SCHEMA_COURANTE, 8);
  const v5 = {
    ...saveNeuve(),
    schema_version: 5,
    monde: {
      heure: 123456,
      items_sol: { [SCENE_ID]: { item_branche: [{ x: 999, y: 999 }] } },
      respawns_en_attente: { [SCENE_ID]: { item_branche: [42000] } },
    },
  };
  const migre = migrer(v5);
  assert.equal(migre.schema_version, VERSION_SCHEMA_COURANTE);
  assert.deepEqual(migre.monde.items_sol, {}, "les positions de l'ancien tirage doivent partir");
  assert.deepEqual(migre.monde.respawns_en_attente, {}, "les délais en attente pointaient vers l'ancien monde");
  assert.equal(migre.monde.jour, 0);
  assert.deepEqual(migre.monde.jour_items_sol, {});
  // Ce qui n'a rien à voir avec le semis ne bouge pas.
  assert.equal(migre.monde.heure, 123456, "l'heure du cycle n'est pas concernée");
  // Une sauvegarde neuve a la même forme de `monde` qu'une migrée : sans ce
  // contrôle, un champ ajouté à `saveNeuve()` et oublié dans la migration
  // ne se verrait qu'à l'exécution, sur la machine d'un joueur.
  assert.deepEqual(Object.keys(saveNeuve().monde).sort(), Object.keys(migre.monde).sort());
  console.log("OK migration 5 -> 6 : le semis hérité part, le reste du monde tient");
}

console.log('OK test_d59_tirage_du_jour');

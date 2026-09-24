// specs/07_chaos-nocturne.md, PALIER A : zones et tirage (pur).
// Aucun monstre n'apparaît en jeu à ce palier — on prouve seulement que la
// géométrie est saine et que le tirage respecte ses cinq règles.
//
// Ce que ce fichier prouve :
//   1. les zones de la carte sont là, et cohérentes (zone sûre contenant le
//      puits, le fruit et l'arrivée de la Grotte ; Chaos dans le Champ nord) ;
//   2. les validations de boot du §3 sont des ÉCHECS DURS (zone d'apparition
//      qui chevauche une zone sûre, id de zone inconnu, phase inventée) ;
//   3. le tirage ne sort jamais d'une zone sûre, ni d'une tuile solide ou
//      isolée, ni à moins de la distance minimale du joueur ;
//   4. le seuil de niveau est une CONDITION EN DONNÉES, évaluée par le
//      registre de conditions — aucun « 5 » dans le code du module (vérifié
//      en relisant son source, comme la spec le demande) ;
//   5. une 2ᵉ table (autre zone, autre monstre, autre seuil = le palier
//      Nv. 10) fonctionne sans une ligne de code.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { construireRegistre, validerCatalogues } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { creerRegistreFlags } from '../src/flags.js';
import {
  tirerPositionApparition, estEnZoneSure, rectanglesDeZone, tablesDeScene, tableActive,
  calculerTuilesAtteignables,
} from '../src/spawns.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_ID = 'scene_maison_exterieur';

const { donnees: catalogues, erreurs: erreursIo } = await chargerCataloguesDepuisDisque(
  path.join(RACINE, 'data'),
  Object.keys(SCHEMAS),
);
assert.deepEqual(erreursIo, [], 'les catalogues du jeu doivent se charger sans erreur');
assert.deepEqual(validerCatalogues(catalogues), [], 'les catalogues du jeu doivent être valides au boot');

const registre = construireRegistre(catalogues);
const scene = chargerScene(registre, SCENE_ID);

function dansRect(tx, ty, r) {
  return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
}

// --- 1. La géométrie de la carte ----------------------------------------
{
  // La zone sûre doit contenir ce que « zone sûre » veut dire pour Xav : la
  // maison, le jardin, le puits, et le point où le fruit réapparaît.
  const puits = registre.obtenir('puzzles', 'station_puits').position;
  assert.ok(estEnZoneSure(scene, puits.x, puits.y), 'le puits est en zone sûre');

  const jardin = scene.zones.find((z) => z.type === 'jardin').rect;
  for (const [tx, ty] of [[jardin.x, jardin.y], [jardin.x + jardin.w - 1, jardin.y + jardin.h - 1]]) {
    assert.ok(estEnZoneSure(scene, tx, ty), `coin du jardin (${tx},${ty}) en zone sûre`);
  }
  const maison = scene.zones.find((z) => z.type === 'maison').rect;
  for (const [tx, ty] of [[maison.x, maison.y], [maison.x + maison.w - 1, maison.y + maison.h - 1]]) {
    assert.ok(estEnZoneSure(scene, tx, ty), `coin de la maison (${tx},${ty}) en zone sûre`);
  }

  // Le point d'arrivée depuis la Grotte : personne ne doit attendre le joueur
  // à la sortie du tunnel.
  const portail = registre
    .obtenir('scenes', 'scene_grotte_salle_2')
    .portails.find((p) => p.cible === SCENE_ID);
  assert.ok(
    estEnZoneSure(scene, portail.spawn.x, portail.spawn.y),
    "l'arrivée depuis la Grotte est en zone sûre",
  );

  // La zone de Chaos est bien dans le Champ nord, et loin à l'est.
  const chaos = rectanglesDeZone(scene, 'chaos_nord_est');
  assert.equal(chaos.length, 1);
  const champNord = rectanglesDeZone(scene, 'champ_nord');
  assert.ok(
    champNord.some((r) => dansRect(chaos[0].x, chaos[0].y, r) && dansRect(chaos[0].x + chaos[0].w - 1, chaos[0].y + chaos[0].h - 1, r)),
    'la zone de Chaos est entièrement dans le Champ nord',
  );
  assert.ok(chaos[0].x > scene.width / 2, 'elle est à l’est');

  // Un Champ en L = deux rectangles de même id (choix documenté du §3).
  assert.equal(champNord.length, 2, 'le Champ nord est un L : deux rectangles, même id');
  assert.equal(rectanglesDeZone(scene, 'champ_sud').length, 2);
  console.log('OK zones de la carte : sûres (maison, jardin, puits, sortie de Grotte), Champs en L, Chaos au nord-est');
}

// --- 2. Validations de boot : échec dur ---------------------------------
{
  function avecSpawnModifie(modif) {
    const copie = JSON.parse(JSON.stringify(catalogues));
    modif(copie.spawns[0], copie);
    return validerCatalogues(copie);
  }

  // a) zone d'apparition qui chevauche une zone sûre
  let erreurs = avecSpawnModifie((s, copie) => {
    const zone = copie.scenes.find((x) => x.id === SCENE_ID).zones.find((z) => z.id === 'chaos_nord_est');
    zone.rect = { x: 72, y: 42, w: 10, h: 10 }; // pile sur la zone sûre de la maison
  });
  assert.ok(erreurs.some((e) => /chevauche la zone sûre/.test(e)), erreurs.join(' | '));

  // b) zone d'apparition inconnue
  erreurs = avecSpawnModifie((s) => { s.zone_apparition = 'chaos_nulle_part'; });
  assert.ok(erreurs.some((e) => /zone_apparition "chaos_nulle_part" introuvable/.test(e)), erreurs.join(' | '));

  // c) domaine qui référence un id inconnu
  erreurs = avecSpawnModifie((s) => { s.domaine = ['champ_du_milieu']; });
  assert.ok(erreurs.some((e) => /domaine > "champ_du_milieu"/.test(e)), erreurs.join(' | '));

  // d) phase inventée : une faute de frappe donnerait sinon une nuit vide, sans un mot
  erreurs = avecSpawnModifie((s) => { s.phases = ['crépuscule']; });
  assert.ok(erreurs.some((e) => /n'est pas une phase du cycle/.test(e)), erreurs.join(' | '));

  // e) monstre inconnu (référence croisée ordinaire)
  erreurs = avecSpawnModifie((s) => { s.enemy = 'enemy_fantome'; });
  assert.ok(erreurs.some((e) => /enemy/.test(e) && /enemy_fantome/.test(e)), erreurs.join(' | '));
  console.log('OK validations de boot : chevauchement, zone inconnue, domaine inconnu, phase inventée, monstre inconnu');
}

// --- 3. Le tirage respecte ses règles -----------------------------------
{
  const table = catalogues.spawns[0];
  // Héros au point d'arrivée de la Grotte : les tuiles atteignables sont
  // calculées depuis lui, comme le fait main.js à l'entrée en scène.
  const atteignables = calculerTuilesAtteignables(scene, 6, 58);
  const hero = { x: 6.5 * scene.tileSize, y: 58.5 * scene.tileSize };
  const chaos = rectanglesDeZone(scene, table.zone_apparition)[0];

  let tirees = 0;
  const positions = [];
  for (let graine = 1; graine <= 300; graine += 1) {
    const p = tirerPositionApparition(scene, {
      zoneId: table.zone_apparition,
      hero,
      distanceMinTuiles: table.distance_min_joueur_tuiles,
      dejaOccupees: [],
      graine,
      tuilesAtteignables: atteignables,
    });
    if (!p) continue;
    tirees += 1;
    positions.push(p);
    const tx = Math.floor(p.x / scene.tileSize);
    const ty = Math.floor(p.y / scene.tileSize);
    assert.ok(dansRect(tx, ty, chaos), `(${tx},${ty}) est dans la zone de Chaos`);
    assert.ok(!estEnZoneSure(scene, tx, ty), `(${tx},${ty}) n'est pas en zone sûre`);
    assert.ok(!scene.tuileA(tx, ty).solid, `(${tx},${ty}) n'est pas solide`);
    assert.ok(atteignables.has(`${tx},${ty}`), `(${tx},${ty}) est atteignable depuis le héros`);
    assert.ok(
      Math.hypot(hero.x - p.x, hero.y - p.y) >= table.distance_min_joueur_tuiles * scene.tileSize,
      'jamais à moins de la distance minimale du joueur',
    );
  }
  assert.ok(tirees > 250, `tirage fiable dans la zone de Chaos (${tirees}/300)`);

  // Déterminisme : même graine, même position. Une nuit se rejoue.
  const a = tirerPositionApparition(scene, { zoneId: table.zone_apparition, hero, graine: 42, tuilesAtteignables: atteignables });
  const b = tirerPositionApparition(scene, { zoneId: table.zone_apparition, hero, graine: 42, tuilesAtteignables: atteignables });
  assert.deepEqual(a, b, 'le tirage est déterministe à graine égale');

  // Une position déjà occupée n'est jamais redonnée.
  const c = tirerPositionApparition(scene, {
    zoneId: table.zone_apparition, hero, graine: 42, tuilesAtteignables: atteignables, dejaOccupees: [a],
  });
  assert.notDeepEqual(c, a, 'deux monstres ne naissent pas sur la même tuile');

  // Le héros DANS la zone de Chaos : rien ne peut naître à moins de 10 tuiles
  // de lui — la règle tient même au pire endroit.
  const heroDansChaos = { x: (chaos.x + chaos.w / 2) * scene.tileSize, y: (chaos.y + chaos.h / 2) * scene.tileSize };
  for (let graine = 1; graine <= 200; graine += 1) {
    const p = tirerPositionApparition(scene, {
      zoneId: table.zone_apparition,
      hero: heroDansChaos,
      distanceMinTuiles: table.distance_min_joueur_tuiles,
      graine,
      tuilesAtteignables: atteignables,
    });
    if (!p) continue;
    assert.ok(
      Math.hypot(heroDansChaos.x - p.x, heroDansChaos.y - p.y) >= table.distance_min_joueur_tuiles * scene.tileSize,
      'aucune apparition dans le dos du joueur, même au centre de la zone',
    );
  }

  // Zone saturée / introuvable : `null`, jamais une boucle infinie.
  assert.equal(tirerPositionApparition(scene, { zoneId: 'zone_inexistante', hero }), null);
  console.log(`OK tirage : ${tirees}/300 positions, toutes dans la zone, atteignables, hors zone sûre, à ≥ 10 tuiles du joueur`);
}

// --- 4. Le seuil de niveau est une donnée, pas un `if` ------------------
{
  const table = tablesDeScene(catalogues.spawns, SCENE_ID)[0];
  assert.deepEqual(table.condition, { valeur: 'niveau', min: 5 }, 'le seuil vit dans le JSON');

  // Aucun seuil en dur dans le module : on relit son source, comme le §5 de
  // la spec le demande (« aucun 5 en dur hors des données »).
  const source = fs.readFileSync(path.join(RACINE, 'src/spawns.js'), 'utf8');
  assert.ok(!/niveau/i.test(source.replace(/\/\/.*$/gm, '')), 'spawns.js ne connaît pas la notion de niveau');

  // Évaluation par le registre de conditions, avec le niveau fourni de
  // l'extérieur : niveau 4 -> fermé, niveau 5 -> ouvert.
  function flagsAuNiveau(niveau) {
    return creerRegistreFlags(registre, { mode: 'prod', valeurs: () => ({ niveau }) });
  }
  for (const [niveau, attendu] of [[1, false], [4, false], [5, true], [12, true]]) {
    const flags = flagsAuNiveau(niveau);
    assert.equal(
      tableActive(table, { phase: 'nuit', evaluerCondition: flags.evaluate }),
      attendu,
      `niveau ${niveau} -> ${attendu ? 'apparitions' : 'nuit vide'}`,
    );
  }

  // La phase compte autant que la condition : de jour, rien, même au niveau 30.
  const flags30 = flagsAuNiveau(30);
  for (const phase of ['jour', 'crepuscule', 'aube']) {
    assert.equal(tableActive(table, { phase, evaluerCondition: flags30.evaluate }), false, `rien en phase ${phase}`);
  }
  assert.equal(tableActive(table, { phase: 'nuit', evaluerCondition: flags30.evaluate }), true);
  console.log('OK seuil de niveau : condition en données, évaluée par le registre — nuit seulement');
}

// --- 5. Data-driven : le palier Nv. 10, sans une ligne de code ----------
// Jusqu'au 24/09, ce bloc AJOUTAIT en mémoire une 2ᵉ table (zone sud, seuil
// 10) pour prouver qu'elle marcherait sans code. Elle est désormais dans le
// catalogue réel (Xav, 24/09 : « on a oublié de la mettre ») — le test éprouve
// donc la vraie, et la preuve « sans code » tient toujours : le diff de ce
// jour ne touche que `scenes.json` et `spawns.json`.
{
  const sud = catalogues.spawns.find((t) => t.id === 'spawn_chaos_sud');
  assert.ok(sud, 'la table du Champ sud existe');
  assert.deepEqual(sud.condition, { valeur: 'niveau', min: 10 }, 'ouverte au Nv. 10');
  assert.deepEqual(sud.phases, ['nuit'], 'la nuit seulement');
  assert.deepEqual(sud.domaine, ['champ_sud'], 'elle erre dans le Champ sud');

  // Sa zone d'apparition est DANS le Champ sud, et hors de toute zone sûre.
  const zones = catalogues.scenes.find((s) => s.id === SCENE_ID).zones;
  const rectDe = (id) => zones.filter((z) => z.id === id).map((z) => z.rect);
  const [apparition] = rectDe(sud.zone_apparition);
  const contient = (r, z) => z.x <= r.x && z.y <= r.y && r.x + r.w <= z.x + z.w && r.y + r.h <= z.y + z.h;
  const touche = (r, z) => r.x < z.x + z.w && z.x < r.x + r.w && r.y < z.y + z.h && z.y < r.y + r.h;
  assert.ok(rectDe('champ_sud').some((z) => contient(apparition, z)), 'la zone de Chaos sud tient dans un rectangle du Champ sud');
  for (const z of zones.filter((x) => x.type === 'zone_sure')) {
    assert.ok(!touche(apparition, z.rect), `elle ne touche pas ${z.id}`);
  }

  const tables = tablesDeScene(catalogues.spawns, SCENE_ID);
  const activesAu = (niveau) => {
    const flags = creerRegistreFlags(registre, { mode: 'prod', valeurs: () => ({ niveau }) });
    return tables.filter((t) => tableActive(t, { phase: 'nuit', evaluerCondition: flags.evaluate })).map((t) => t.id);
  };
  assert.deepEqual(activesAu(7), ['spawn_chaos_nord_est'], 'au niveau 7, seule la table Nv. 5 est ouverte');
  assert.deepEqual(activesAu(10).sort(), ['spawn_chaos_nord_est', 'spawn_chaos_sud'], 'au niveau 10, les deux');

  // Et son tirage marche, dans une zone qu'aucun code ne connaît.
  const atteignables = calculerTuilesAtteignables(scene, 6, 58);
  const p = tirerPositionApparition(scene, {
    zoneId: sud.zone_apparition, hero: { x: 0, y: 0 }, graine: 7, tuilesAtteignables: atteignables,
  });
  assert.ok(p, 'la zone de Chaos sud sait faire naître');
  console.log('OK la 2ᵉ table (zone sud, Nv. 10) : dans le Champ sud, hors zone sûre, ouverte au bon niveau');
}

console.log('OK test_07a_zones_et_tirage');

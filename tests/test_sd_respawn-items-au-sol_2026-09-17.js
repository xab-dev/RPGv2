// Contrat (SD_respawn-items-au-sol_2026-09-17.md) : cause racine trouvée —
// tirerPositionLibre (ground_items.js) ne vérifiait que `tuile.solid`, jamais
// l'accessibilité réelle depuis le héros. La forêt procédurale (densité fixe,
// decor.js) isole parfois une poignée de tuiles libres derrière des arbres
// solides : un respawn tiré là existe bien dans l'état (`itemsSol`) mais
// n'est plus jamais trouvable en jeu — silencieusement identique à "ne
// respawne jamais" du point de vue du joueur. `item_fruit` (zone "jardin",
// sans forêt procédurale, cf. test_phase2_chemin_critique) n'a jamais ce
// problème ; `item_branche`/`item_caillou` (zones "foret"/"campagne",
// couvertes de forêt procédurale) si — exactement l'asymétrie observée par
// Xav. Correction : `calculerTuilesAtteignables` (BFS 4-connexe depuis le
// héros, une fois par entrée en scène) filtre désormais tirerPositionLibre.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { creerI18n } from '../src/i18n.js';
import { creerDialogue } from '../src/dialogue.js';
import { saveNeuve, creerStoreMemoire } from '../src/save.js';
import { creerOrchestrateurGrotte } from '../src/main.js';
import { remplirItemsSol, calculerTuilesAtteignables, planifierRespawn, tickRespawns } from '../src/ground_items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(__dirname, '..');

// --- 1. calculerTuilesAtteignables : une tuile non solide mais isolée par
// des murs n'est pas dans l'ensemble atteignable, même si elle est à portée
// de "vol d'oiseau" du départ. Grille 3x3 : (0,0) départ, (2,2) isolée (ses
// deux seuls voisins internes (1,2)/(2,1) sont solides, les deux autres sont
// hors grille). ---
{
  const donnees = {};
  for (const nom of Object.keys(SCHEMAS)) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  donnees.visuels = [{ id: 'visuel_x', ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.items = [
    {
      id: 'item_test', label_key: 'item.branche', categorie: 'ressource', stack_max: 20,
      render: { visuel: 'visuel_x' }, spawn: { nb_au_sol: 1, zones: ['zone_test'] },
    },
  ];
  const layout = [
    ['tile_sol', 'tile_sol', 'tile_sol'],
    ['tile_sol', 'tile_mur', 'tile_mur'],
    ['tile_mur', 'tile_mur', 'tile_sol'],
  ];
  donnees.scenes = [{
    id: 'scene_isolee', width: 3, height: 3, tile_size: 32, seed: 7,
    spawn: { x: 0, y: 0 }, zones: [{ type: 'zone_test', rect: { x: 0, y: 0, w: 3, h: 3 } }], layout,
  }];
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_isolee');
  const items = registre.tous('items');

  const atteignables = calculerTuilesAtteignables(scene, 0, 0);
  assert.deepEqual([...atteignables].sort(), ['0,0', '0,1', '1,0', '2,0'].sort());
  assert.ok(!atteignables.has('2,2'), '(2,2) est non solide mais isolée : jamais atteignable');

  // Seules deux tuiles non solides existent dans toute la scène : (0,0) et
  // (2,2). Sans filtre, un balayage de compteurs doit faire apparaître (2,2)
  // au moins une fois (preuve que le scénario exerce vraiment le cas isolé).
  // Avec filtre, (2,2) ne doit JAMAIS apparaître : la seule position valide
  // restante est (0,0).
  let isoleeVueSansFiltre = false;
  let isoleeVueAvecFiltre = false;
  for (let compteur = 0; compteur < 40; compteur++) {
    const sansFiltre = remplirItemsSol(scene, items, {}, compteur, null);
    if (sansFiltre.item_test.some((p) => Math.floor(p.x / 32) === 2 && Math.floor(p.y / 32) === 2)) {
      isoleeVueSansFiltre = true;
    }
    const avecFiltre = remplirItemsSol(scene, items, {}, compteur, atteignables);
    if (avecFiltre.item_test.length > 0) {
      const p = avecFiltre.item_test[0];
      const tx = Math.floor(p.x / 32);
      const ty = Math.floor(p.y / 32);
      if (tx === 2 && ty === 2) isoleeVueAvecFiltre = true;
      else assert.ok(atteignables.has(`${tx},${ty}`), `position (${tx},${ty}) hors ensemble atteignable`);
    }
  }
  assert.ok(isoleeVueSansFiltre, 'le scénario doit exercer la tuile isolée sans filtre (sinon le test ne prouve rien)');
  assert.ok(!isoleeVueAvecFiltre, 'le filtre doit exclure la tuile isolée à chaque tirage');
}

// --- 2. tickRespawns respecte le même filtre (pas seulement remplirItemsSol
// au premier remplissage) : une fois l'unique tuile atteignable occupée, un
// respawn ne doit PAS se rabattre sur la tuile isolée — zones saturées,
// signalées comme telles (comportement déjà couvert par ailleurs), jamais
// une position injouable. ---
{
  const donnees = {};
  for (const nom of Object.keys(SCHEMAS)) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  donnees.visuels = [{ id: 'visuel_x', ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.items = [
    {
      id: 'item_test', label_key: 'item.branche', categorie: 'ressource', stack_max: 20,
      render: { visuel: 'visuel_x' }, spawn: { nb_au_sol: 1, zones: ['zone_test'], respawn_ms: 1000 },
    },
  ];
  // 1x3 : (0,0) départ, (1,0) mur, (2,0) isolée — exactement DEUX tuiles non
  // solides dans toute la scène, une seule atteignable.
  const layout = [['tile_sol', 'tile_mur', 'tile_sol']];
  donnees.scenes = [{
    id: 'scene_isolee', width: 3, height: 1, tile_size: 32, seed: 7,
    spawn: { x: 0, y: 0 }, zones: [{ type: 'zone_test', rect: { x: 0, y: 0, w: 3, h: 1 } }], layout,
  }];
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_isolee');
  const items = registre.tous('items');
  const atteignables = calculerTuilesAtteignables(scene, 0, 0);
  assert.deepEqual([...atteignables], ['0,0']);

  // Seule (0,0) est atteignable : quel que soit le compteur, c'est la seule
  // position possible (la solide est toujours écartée, l'isolée l'est
  // désormais aussi).
  const itemsSol = remplirItemsSol(scene, items, {}, 5, atteignables);
  assert.deepEqual(itemsSol.item_test, [{ x: 16, y: 16 }]);
  const enAttente = planifierRespawn({}, 'item_test', 1000);
  // A l'échéance, la seule autre tuile non solide de toute la scène est
  // (2,0), isolée : le respawn échoue proprement (zone saturée), jamais une
  // position injouable.
  const resultat = tickRespawns(scene, items, itemsSol, enAttente, 1000, 999, atteignables);
  assert.equal(resultat.itemsSol.item_test.length, 1, 'toujours un seul exemplaire, la tuile isolée est refusée');
  assert.ok(resultat.enAttente.item_test, 'le respawn est reporté (zone saturée), pas perdu');
}

// --- 3. Données réelles (/data) : chaque item catalogue avec `spawn` — pas
// une liste en dur — respawne après `respawn_ms` de temps actif, sur une
// tuile atteignable depuis le héros, jamais avant, jamais pendant une UI
// ouverte. Utilise le VRAI orchestrateur, exactement comme test_phase3_boucle. ---
{
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
    chargerLocalesDepuisDisque(path.join(RACINE, 'locales')),
    chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), noms),
  ]);
  assert.deepEqual(erreursChargement, []);
  assert.deepEqual(validerCatalogues(donnees), []);
  const registre = construireRegistre(donnees);
  const itemsAvecSpawn = registre.tous('items').filter((i) => i.spawn);
  assert.ok(itemsAvecSpawn.length > 0, 'au moins un item catalogue avec spawn (sinon ce test ne prouve rien)');

  for (const itemDef of itemsAvecSpawn) {
    const i18n = creerI18n(dictionnaires, 'fr');
    const store = creerStoreMemoire();
    const save = saveNeuve();
    save.hero.scene = 'scene_maison_exterieur';
    save.hero.companion = 'comp_follet_eau';
    save.hero.pv = 40;
    save.flags = {
      flag_follet_choisi: true, flag_grotte_sortie: true, flag_grotte_sequence: true,
      flag_grotte_monstre_tue: true, flag_levier_salle1: true, flag_premier_ramassage: true,
    };
    const menu = { estOuvert: () => false, traiterInput: () => {}, ouvrir: () => {}, ouvrirCraft: () => {}, rafraichirCraft: () => {}, ouvrirCoffre: () => {}, rafraichirCoffre: () => {}, rafraichirStats: () => {} };
    const dialogue = creerDialogue();
    const frames = [];
    const input = { maj: () => frames[frames.length - 1] };
    const orch = creerOrchestrateurGrotte({ registre, i18n, save, store, dialogue, menu, input, ctxLogique: null, ctxVisible: null, canvasLogique: null });
    const scene = orch.obtenirScene();
    const hero = orch.obtenirHero();

    function etat({ interact = false } = {}) {
      return { move: { x: 0, y: 0 }, attack: { pressed: false, held: false }, skill_1: { pressed: false, held: false }, skill_2: { pressed: false, held: false }, skill_3: { pressed: false, held: false }, consume: { pressed: false, held: false }, interact: { pressed: interact, held: interact }, menu: { pressed: false, held: false } };
    }
    function tick(ms = 16) { frames.push(etat()); orch.maj(ms); }
    function avancer(ms) { let t = 0; while (t < ms) { tick(16); t += 16; } }

    const positions = save.monde.items_sol[scene.id][itemDef.id];
    assert.ok(positions && positions.length > 0, `${itemDef.id} : aucun exemplaire au sol au départ`);
    const cible = positions[0];
    hero.x = cible.x; hero.y = cible.y;
    frames.push(etat({ interact: true })); orch.maj(16);
    frames.push(etat()); orch.maj(16);

    const respawnMs = itemDef.spawn.respawn_ms || 60000;
    const avantCount = (save.monde.items_sol[scene.id][itemDef.id] || []).length;

    // Pas avant l'échéance (marge de sécurité 500ms).
    avancer(Math.max(0, respawnMs - 500));
    assert.equal(
      (save.monde.items_sol[scene.id][itemDef.id] || []).length, avantCount,
      `${itemDef.id} : ne doit pas respawner avant respawn_ms`
    );

    // Pas pendant une UI ouverte : force le menu "ouvert" un instant, le
    // temps actif ne doit pas progresser pour ce respawn en attente.
    const enAttenteAvantUi = JSON.stringify(save.monde.respawns_en_attente[scene.id][itemDef.id]);
    menu.estOuvert = () => true;
    avancer(1000);
    menu.estOuvert = () => false;
    assert.equal(
      JSON.stringify(save.monde.respawns_en_attente[scene.id][itemDef.id]), enAttenteAvantUi,
      `${itemDef.id} : le respawn ne doit pas progresser sous UI ouverte`
    );

    // Puis passe l'échéance.
    avancer(1500);
    const positionsApres = save.monde.items_sol[scene.id][itemDef.id] || [];
    assert.ok(positionsApres.length > avantCount, `${itemDef.id} : doit avoir respawné après respawn_ms de temps actif`);

    const nouvelle = positionsApres[positionsApres.length - 1];
    const tx = Math.floor(nouvelle.x / scene.tileSize);
    const ty = Math.floor(nouvelle.y / scene.tileSize);
    const heroTx = Math.floor(hero.x / scene.tileSize);
    const heroTy = Math.floor(hero.y / scene.tileSize);
    // Recalcule l'ensemble atteignable indépendamment (pas de fuite d'état
    // interne à main.js) pour vérifier la nouvelle position.
    const atteignables = calculerTuilesAtteignables(scene, heroTx, heroTy);
    assert.ok(atteignables.has(`${tx},${ty}`), `${itemDef.id} : nouvelle position (${tx},${ty}) doit être atteignable`);
  }
}

console.log('OK test_sd_respawn-items-au-sol');

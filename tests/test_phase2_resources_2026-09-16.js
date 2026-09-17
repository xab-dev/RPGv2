// Contrat (03_maison-exterieur §3.2/§7) : INTERACT sur une tuile-ressource
// ouvre le bon dialogue ; peutRecolter() renvoie toujours false en Phase 2
// (aucun outil dans le jeu) ; une 3ᵉ ressource ajoutée en JSON de test
// fonctionne sans modification de code (test data-driven).
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';
import { peutRecolter, trouverRessourceProche } from '../src/resources.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueDeTest() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  donnees.dialogues = [
    { id: 'dlg_bloque_bois', declencheur: 'x', lignes: [{ locuteur: 'follet', text_key: 'dlg.bois' }] },
    { id: 'dlg_bloque_argile', declencheur: 'x', lignes: [{ locuteur: 'follet', text_key: 'dlg.argile' }] },
  ];
  donnees.items = [
    { id: 'item_branche', label_key: 'item.branche', categorie: 'ressource', stack_max: 20, render: { visuel: 'visuel_x' } },
    { id: 'item_argile', label_key: 'item.argile', categorie: 'ressource', stack_max: 20, render: { visuel: 'visuel_x' } },
  ];
  donnees.visuels = [{ id: 'visuel_x', ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_arbre', solid: true, ressource: 'res_bois', render: { type: 'couleur', valeur: '#111' } },
    { id: 'tile_argile', solid: true, ressource: 'res_argile', render: { type: 'couleur', valeur: '#222' } },
  ];
  donnees.resources = [
    { id: 'res_bois', label_key: 'resource.bois', dialogue_bloque: 'dlg_bloque_bois', outil_requis: null, item_produit: 'item_branche', cooldown_ms: 60000 },
    // 3ᵉ ressource ajoutée pour ce test — preuve data-driven (§7 : "zéro
    // code de système"), jamais référencée ailleurs dans /src.
    { id: 'res_argile', label_key: 'resource.argile', dialogue_bloque: 'dlg_bloque_argile', outil_requis: null, item_produit: 'item_argile', cooldown_ms: 60000 },
  ];
  donnees.scenes = [
    {
      id: 'scene_ressources',
      width: 4,
      height: 1,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
      layout: [['tile_sol', 'tile_arbre', 'tile_sol', 'tile_argile']],
    },
  ];
  return donnees;
}

// 1. Catalogue data-driven valide (2 ressources, la 2ᵉ ajoutée pour ce test).
{
  const erreurs = validerCatalogues(catalogueDeTest());
  assert.deepEqual(erreurs, [], `catalogue rejeté :\n${erreurs.join('\n')}`);
}

// 2. Une tuile-ressource est solide.
{
  const registre = construireRegistre(catalogueDeTest());
  const scene = chargerScene(registre, 'scene_ressources');
  assert.equal(scene.tuileA(1, 0).solid, true);
}

// 3. trouverRessourceProche trouve la bonne ressource à portée, aucune hors
// portée.
{
  const registre = construireRegistre(catalogueDeTest());
  const scene = chargerScene(registre, 'scene_ressources');
  const heroPresArbre = { x: 1 * 32 + 16, y: 16 };
  const trouve = trouverRessourceProche(scene, heroPresArbre, 40);
  assert.ok(trouve);
  assert.equal(trouve.ressourceId, 'res_bois');

  const heroLoinDeTout = { x: 2 * 32 + 16, y: 16 };
  assert.equal(trouverRessourceProche(scene, heroLoinDeTout, 10), null);
}

// 4. La 3ᵉ ressource (argile) fonctionne exactement comme la 1ʳᵉ, sans
// aucune modification de code — c'est la preuve du test data-driven.
{
  const registre = construireRegistre(catalogueDeTest());
  const scene = chargerScene(registre, 'scene_ressources');
  const heroPresArgile = { x: 3 * 32 + 16, y: 16 };
  const trouve = trouverRessourceProche(scene, heroPresArgile, 40);
  assert.equal(trouve.ressourceId, 'res_argile');
  const donneesRessource = registre.obtenir('resources', trouve.ressourceId);
  assert.equal(donneesRessource.dialogue_bloque, 'dlg_bloque_argile');
}

// 5. peutRecolter() : toujours false en Phase 2 (outil_requis null -> aucun
// outil ne peut jamais être satisfait) ; avec un outil déclaré ET possédé,
// devient true (prépare la Phase 3 sans changer cette fonction).
{
  const ressourceSansOutil = { outil_requis: null };
  assert.equal(peutRecolter(ressourceSansOutil, { outil_hache: true }), false);

  const ressourceAvecOutil = { outil_requis: 'outil_hache' };
  assert.equal(peutRecolter(ressourceAvecOutil, {}), false);
  assert.equal(peutRecolter(ressourceAvecOutil, { outil_hache: true }), true);
}

console.log('OK test_phase2_resources');

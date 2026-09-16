// Diagnostic SD_ui-lisibilite_2026-09-15.md, sujet 2 (hypothèse 2c) :
// `scenes.json > lumieres[]` existe déjà dans le schéma (schemas.js) et est
// déjà interprété par render.js#dessinerObscurite (jamais du rendu ici,
// contrainte de méthode : seule la validation du catalogue est testée).
// Ce test prouve qu'ajouter une 2ᵉ lumière à une scène ne demande aucun
// changement de code — un catalogue seulement (§0 : règle d'architecture
// directrice), pas un test de non-régression sur une fonctionnalité neuve.
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { chargerScene } from '../src/scene.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueMinimalValide() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.scenes = [
    {
      id: 'scene_test',
      width: 2,
      height: 2,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
      obscurite: { opacite: 0.72 }, // objet depuis 03_grotte-polish §2.1 (booléen refusé)
      lumieres: [],
      layout: [
        ['tile_sol', 'tile_mur'],
        ['tile_mur', 'tile_sol'],
      ],
    },
  ];
  donnees.stats = [{ id: 'stat_force', label_key: 'stat.force', base: 5 }];
  donnees.action_slots = [{ id: 'slot_attaque', verb: 'attack' }];
  donnees.equipment_slots = [{ id: 'equip_arme', label_key: 'equipment.arme' }];
  donnees.flags = [{ id: 'flag_test', label_key: 'flag.test' }];
  donnees.unlocks = [{ id: 'unlock_test', condition: { all: ['flag_test'] }, target: 'flag_test' }];
  return donnees;
}

// 1. Une scène sans lumieres[] (tableau vide) reste valide (Phase 0, aucune
// régression pour une scène qui n'a pas d'obscurité).
{
  const donnees = catalogueMinimalValide();
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, []);
}

// 2. Une 2ᵉ lumière ajoutée à une scène déjà éclairée : JSON seulement,
// aucun code touché, toujours valide.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].lumieres = [
    { x: 20, y: 20, rayon: 140 },
    { x: 44, y: 44, rayon: 60 }, // 2ᵉ entrée : simple ajout de données
  ];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `2ᵉ lumière rejetée à tort :\n${erreurs.join('\n')}`);

  const registre = construireRegistre(donnees);
  const scene = chargerScene(registre, 'scene_test');
  assert.equal(scene.lumieres.length, 2, 'chargerScene doit exposer les 2 lumières telles quelles');
  assert.equal(scene.lumieres[1].rayon, 60);
}

// 3. Une lumière mal formée (rayon manquant) est rejetée — la validation
// porte bien sur la forme de chaque entrée, pas seulement sur la présence
// du tableau.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].lumieres = [{ x: 20, y: 20 }];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('lumieres')), 'lumière sans rayon non détectée');
}

console.log('OK test_phase1_sd_ui_lumieres');

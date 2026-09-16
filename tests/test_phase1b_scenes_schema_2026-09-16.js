// Contrat (03_grotte-polish §2.1/§3.4, palier 3) : obscurite devient un objet
// { opacite } (bool résiduel = échec dur), lumieres[] distingue halo/faisceau
// par `type`, decor = { densite, motifs: [{ visuel, poids }] } référence
// visuels.json. Validation pure (schemas.js/registry.js) : aucun rendu ici,
// conforme à la contrainte de méthode.
import assert from 'node:assert/strict';
import { SCHEMAS } from '../src/schemas.js';
import { validerCatalogues } from '../src/registry.js';

const NOMS = Object.keys(SCHEMAS);

function catalogueMinimalValide() {
  const donnees = {};
  for (const nom of NOMS) donnees[nom] = [];
  donnees.elements = [{ id: 'elem_feu', label_key: 'element.feu', icon: 'flame', shape: 'triangle' }];
  donnees.tiles = [
    { id: 'tile_sol', solid: false, render: { type: 'couleur', valeur: '#000' } },
    { id: 'tile_mur', solid: true, render: { type: 'couleur', valeur: '#111' } },
  ];
  donnees.visuels = [
    { id: 'visuel_test', ancre: 'centre', primitives: [{ forme: 'cercle', dx: 0, dy: 0, w: 4, couleur: '#fff' }] },
  ];
  donnees.scenes = [
    {
      id: 'scene_test',
      width: 2,
      height: 2,
      tile_size: 32,
      seed: 1,
      spawn: { x: 0, y: 0 },
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

// 1. obscurite absente : scène claire, valide (§4 edge case).
{
  const donnees = catalogueMinimalValide();
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, []);
}

// 2. obscurite booléenne résiduelle (Phase 1) : échec dur explicite, jamais
// migrée en silence.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].obscurite = true;
  const erreurs = validerCatalogues(donnees);
  assert.ok(
    erreurs.some((e) => e.includes('obscurite') && e.includes('objet')),
    `obscurite booléenne non détectée :\n${erreurs.join('\n')}`
  );
}
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].obscurite = false;
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('obscurite')), 'obscurite:false doit aussi être rejetée (booléen)');
}

// 3. Scène de test à 0.9 (D10 carte mentale, "impression de vide autour du
// follet", futures maps d'exploration sombre) : passe sans code, comme
// n'importe quelle autre valeur d'opacite.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].obscurite = { opacite: 0.9 };
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `opacite 0.9 rejetée à tort :\n${erreurs.join('\n')}`);
}

// 4. lumieres[] : type absent = halo (comportement Phase 1 inchangé).
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].lumieres = [{ x: 10, y: 10, rayon: 50 }];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, []);
}

// 5. lumieres[] : faisceau valide passe, faisceau incomplet est rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].lumieres = [
    { type: 'faisceau', x: 20, y: 0, angle: -6, ouverture: 12, longueur: 150, alpha: 0.14 },
  ];
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `faisceau valide rejeté :\n${erreurs.join('\n')}`);
}
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].lumieres = [{ type: 'faisceau', x: 20, y: 0, angle: -6 }]; // ouverture/longueur/alpha manquants
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('faisceau')), 'faisceau incomplet non détecté');
}

// 6. lumieres[] : type inconnu rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].lumieres = [{ type: 'projecteur', x: 0, y: 0 }];
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('type "projecteur"')), 'type de lumière inconnu non détecté');
}

// 7. decor absent : aucun motif, aucune erreur (§4 edge case).
{
  const donnees = catalogueMinimalValide();
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, []);
}

// 8. decor valide : { densite, motifs: [{ visuel, poids }] } référence
// visuels.json — un motif de plus ne demande aucun code (règle d'archi).
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].decor = { densite: 0.1, motifs: [{ visuel: 'visuel_test', poids: 3 }] };
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `decor valide rejeté :\n${erreurs.join('\n')}`);
}

// 9. decor > motifs[].visuel introuvable dans visuels.json : rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].decor = { densite: 0.1, motifs: [{ visuel: 'visuel_inexistant', poids: 1 }] };
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('visuel_inexistant')), 'référence de motif invalide non détectée');
}

// 10. decor > motifs[].poids invalide (<=0) : rejeté.
{
  const donnees = catalogueMinimalValide();
  donnees.scenes[0].decor = { densite: 0.1, motifs: [{ visuel: 'visuel_test', poids: 0 }] };
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('poids')), 'poids invalide non détecté');
}

// 11. tiles.json > render.variantes[]/variation_teinte (§3.4) : optionnels,
// valides ou rejetés selon leur forme — une tuile sans ces champs garde
// exactement son comportement Phase 0/1.
{
  const donnees = catalogueMinimalValide();
  donnees.tiles[0].render.variantes = ['#111', '#222'];
  donnees.tiles[0].render.variation_teinte = 0.04;
  const erreurs = validerCatalogues(donnees);
  assert.deepEqual(erreurs, [], `variantes/variation_teinte valides rejetées :\n${erreurs.join('\n')}`);
}
{
  const donnees = catalogueMinimalValide();
  donnees.tiles[0].render.variantes = 'pas-un-tableau';
  const erreurs = validerCatalogues(donnees);
  assert.ok(erreurs.some((e) => e.includes('variantes')), 'variantes mal formées non détectées');
}

console.log('OK test_phase1b_scenes_schema');

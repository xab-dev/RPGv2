// Contrat (03_maison-exterieur §3.3/§7) : stack_max respecté, refus propre
// au-delà (l'item reste au sol, cf. main.js#essayerInteraction).
import assert from 'node:assert/strict';
import { ajouterItem } from '../src/inventory.js';

// 1. Ajout simple sur une poche vide.
{
  const { inventaire, ajoute } = ajouterItem({}, 'item_branche', 3, 20);
  assert.equal(inventaire.item_branche, 3);
  assert.equal(ajoute, 3);
}

// 2. Ajout cumulatif sur une pile déjà entamée.
{
  const { inventaire, ajoute } = ajouterItem({ item_branche: 5 }, 'item_branche', 2, 20);
  assert.equal(inventaire.item_branche, 7);
  assert.equal(ajoute, 2);
}

// 3. stack_max respecté : plafonné, jamais dépassé.
{
  const { inventaire, ajoute } = ajouterItem({ item_branche: 19 }, 'item_branche', 5, 20);
  assert.equal(inventaire.item_branche, 20);
  assert.equal(ajoute, 1, 'un seul exemplaire a pu entrer avant le plafond');
}

// 4. Poche déjà pleine : refus propre, aucune exception, ajoute = 0.
{
  const { inventaire, ajoute } = ajouterItem({ item_branche: 20 }, 'item_branche', 1, 20);
  assert.equal(inventaire.item_branche, 20);
  assert.equal(ajoute, 0);
}

// 5. Les autres items de l'inventaire ne sont jamais mutés en place
// (immutabilité, même style que entities.js/scene.js).
{
  const original = { item_caillou: 4 };
  const { inventaire } = ajouterItem(original, 'item_branche', 1, 20);
  assert.deepEqual(original, { item_caillou: 4 }, "l'inventaire d'origine ne doit pas être muté");
  assert.equal(inventaire.item_caillou, 4);
  assert.equal(inventaire.item_branche, 1);
}

console.log('OK test_phase2_inventory');

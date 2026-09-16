// Contrat (§7) : quantités dans [min, max], résultat déterministe à graine
// fixe (même patron mulberry32 que decor.js, réutilisé par loot.js).
import assert from 'node:assert/strict';
import { creerGenerateur, resoudreLoot } from '../src/loot.js';

const TABLE = { id: 'loot_test', entrees: [{ item: 'eclats', min: 1, max: 3, poids: 1 }] };

// 1. Quantité toujours dans [min, max].
{
  const alea = creerGenerateur(1);
  for (let i = 0; i < 50; i++) {
    const { item, quantite } = resoudreLoot(TABLE, alea);
    assert.equal(item, 'eclats');
    assert.ok(quantite >= 1 && quantite <= 3, `quantité hors bornes : ${quantite}`);
  }
}

// 2. Déterministe : même graine => même séquence de résultats.
{
  const resultatsA = [];
  const aleaA = creerGenerateur(42);
  for (let i = 0; i < 10; i++) resultatsA.push(resoudreLoot(TABLE, aleaA));

  const resultatsB = [];
  const aleaB = creerGenerateur(42);
  for (let i = 0; i < 10; i++) resultatsB.push(resoudreLoot(TABLE, aleaB));

  assert.deepEqual(resultatsA, resultatsB);
}

// 3. Tirage pondéré : une entrée à poids nul relatif n'est (quasi) jamais tirée.
{
  const table = {
    id: 'loot_pondere',
    entrees: [
      { item: 'commun', min: 1, max: 1, poids: 99 },
      { item: 'rare', min: 1, max: 1, poids: 1 },
    ],
  };
  const alea = creerGenerateur(7);
  const compte = { commun: 0, rare: 0 };
  for (let i = 0; i < 200; i++) compte[resoudreLoot(table, alea).item]++;
  assert.ok(compte.commun > compte.rare * 5, 'le tirage doit respecter les poids relatifs');
}

console.log('OK test_phase1_loot');

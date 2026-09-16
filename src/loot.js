// Résolution d'une loot table (§3.5), PRNG injectable — réutilise
// mulberry32 de decor.js pour rester déterministe à graine fixe, donc
// testable sans dépendre de Math.random.

import { mulberry32 } from './decor.js';

export function creerGenerateur(graine) {
  return mulberry32(graine);
}

// Tire une entrée au prorata de son poids, puis une quantité dans [min, max].
export function resoudreLoot(table, alea) {
  const poidsTotal = table.entrees.reduce((s, e) => s + e.poids, 0);
  let tirage = alea() * poidsTotal;
  let entree = table.entrees[table.entrees.length - 1];
  for (const e of table.entrees) {
    if (tirage < e.poids) {
      entree = e;
      break;
    }
    tirage -= e.poids;
  }
  const quantite = entree.min + Math.floor(alea() * (entree.max - entree.min + 1));
  return { item: entree.item, quantite };
}

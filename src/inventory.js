// Poche (03_maison-exterieur §3.3, retrait ajouté Palier A
// specs/04_maison-interieur.md) : ajouter/retirer, plafonné par stack_max.
// Pur, testé.

// Renvoie le nouvel inventaire ET la quantité effectivement ajoutée
// (0 si déjà plein) — l'appelant (main.js) s'en sert pour distinguer un
// ramassage réussi d'un "poche pleine" (§4 edge case).
export function ajouterItem(inventaire, itemId, quantite, stackMax) {
  const actuel = inventaire[itemId] || 0;
  const nouveau = Math.min(stackMax, actuel + Math.max(0, quantite));
  return { inventaire: { ...inventaire, [itemId]: nouveau }, ajoute: nouveau - actuel };
}

// Retrait pour le craft (§3.1) et le transfert vers le coffre (§3.5) —
// jamais négatif (clampé à 0), la clé reste présente à 0 plutôt que
// supprimée (les listes de poche filtrent déjà quantite > 0, cf. main.js).
export function retirerItem(inventaire, itemId, quantite) {
  const actuel = inventaire[itemId] || 0;
  const nouveau = Math.max(0, actuel - Math.max(0, quantite));
  return { ...inventaire, [itemId]: nouveau };
}

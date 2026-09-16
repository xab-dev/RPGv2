// Poche (03_maison-exterieur §3.3) : ajouter/retirer, plafonné par
// stack_max. Pur, testé — aucune action possible dessus en Phase 2
// (consommer/jeter = Phase 3), donc pas de fonction de retrait pour
// l'instant au-delà de ce que la sauvegarde a déjà besoin.

// Renvoie le nouvel inventaire ET la quantité effectivement ajoutée
// (0 si déjà plein) — l'appelant (main.js) s'en sert pour distinguer un
// ramassage réussi d'un "poche pleine" (§4 edge case).
export function ajouterItem(inventaire, itemId, quantite, stackMax) {
  const actuel = inventaire[itemId] || 0;
  const nouveau = Math.min(stackMax, actuel + Math.max(0, quantite));
  return { inventaire: { ...inventaire, [itemId]: nouveau }, ajoute: nouveau - actuel };
}

// Vol du follet (`D-36`, proposition) : le rendre aérien, léger, vif.
// Référence de *sensation* donnée par Xav : le vif d'or — **pas** ses ailes
// ni son or, le follet garde sa forme d'élément et sa couleur.
//
// RÈGLE DIRECTRICE, et elle est stricte : ce module ne produit qu'un
// **décalage visuel**. La position logique du follet, son aura, sa distance
// d'engagement et sa lumière ne bougent pas d'un pixel — sinon l'obscurité
// scintillerait au rythme du vol, ce qui serait exactement l'inverse de
// l'effet cherché. L'appelant dessine la silhouette ici, et continue de
// tout calculer là-bas.
//
// Module PUR : aucun canvas, aucune horloge propre, aucune allocation en
// boucle (un petit état par frame, pas une réserve de particules).
//
// Le mouvement est un **ressort sous-amorti** : la silhouette court après la
// position logique et la dépasse légèrement aux changements de direction —
// c'est ce dépassement qui fait « vif », plutôt qu'un suivi parfait qui fait
// « collé ». Par-dessus, un vol stationnaire nerveux : deux oscillations de
// périodes différentes, donc jamais un cercle régulier.

export function creerVol(config) {
  return { config, x: null, y: null, vx: 0, vy: 0, tMs: 0 };
}

// `cibleX/cibleY` : la position LOGIQUE du follet, celle que companion.js
// calcule. Rend l'état suivant et le point où la silhouette doit être dessinée.
export function avancerVol(etat, { cibleX, cibleY, deltaMs }) {
  const { raideur, amortissement, amplitude_px, periode_ms, seuil_saut_px } = etat.config;
  const dt = Math.max(0, deltaMs) / 1000;

  // Premier appel, ou saut de position (entrée en scène, téléportation, fin
  // de cinématique) : on se recolle, jamais un vol de 3 000 px à travers la
  // carte.
  if (etat.x === null || Math.hypot(cibleX - etat.x, cibleY - etat.y) > seuil_saut_px) {
    return { ...etat, x: cibleX, y: cibleY, vx: 0, vy: 0, tMs: etat.tMs + deltaMs, rendu: { x: cibleX, y: cibleY } };
  }

  // Ressort : accélération vers la cible, puis frottement. Un amortissement
  // faible laisse le dépassement vivre ; trop faible, le follet oscillerait
  // sans fin (valeurs en données, *provisoires*).
  let vx = etat.vx + (cibleX - etat.x) * raideur * dt;
  let vy = etat.vy + (cibleY - etat.y) * raideur * dt;
  const frottement = Math.max(0, 1 - amortissement * dt);
  vx *= frottement;
  vy *= frottement;
  const x = etat.x + vx * dt;
  const y = etat.y + vy * dt;

  // Vol stationnaire : deux périodes volontairement non multiples l'une de
  // l'autre (le rapport 0,63 est choisi pour ça), sinon le follet décrirait
  // une figure fermée et régulière — l'œil la verrait tout de suite.
  const tMs = etat.tMs + deltaMs;
  const w = periode_ms > 0 ? (tMs / periode_ms) * Math.PI * 2 : 0;
  const oscX = Math.sin(w) * amplitude_px;
  const oscY = Math.sin(w * 0.63 + 1.7) * amplitude_px * 0.6;

  return { ...etat, x, y, vx, vy, tMs, rendu: { x: x + oscX, y: y + oscY } };
}

// Distance entre la silhouette et la position logique — exposée pour les
// tests (« le décalage reste borné ») et pour l'appelant qui voudrait s'en
// servir un jour. Jamais utilisée par une règle de jeu : ce serait faire
// dépendre le gameplay d'un effet visuel.
export function ecartVisuel(etat, cibleX, cibleY) {
  if (!etat.rendu) return 0;
  return Math.hypot(etat.rendu.x - cibleX, etat.rendu.y - cibleY);
}

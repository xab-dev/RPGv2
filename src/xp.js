// XP -> niveaux -> flags -> points de stats (Palier D, §3.4). Pur, testé.
//
// levels.json : [{ niveau, xp_cumulee, points_stats }] — crediter() peut
// franchir plusieurs niveaux d'un coup (un gros craft ou un monstre généreux
// ne doit jamais "perdre" l'XP en trop) : chaque niveau franchi entre
// `avant` (exclu) et `apres` (inclus) pose son flag et crédite ses points.

function trierParNiveau(niveaux) {
  return [...niveaux].sort((a, b) => a.niveau - b.niveau);
}

// Le plus haut niveau dont xp_cumulee est atteint — niveau 1 (premier de la
// table) si xpTotal est encore sous le 2ᵉ palier.
export function niveauPourXp(niveaux, xpTotal) {
  const tries = trierParNiveau(niveaux);
  let atteint = tries[0];
  for (const n of tries) {
    if (xpTotal >= n.xp_cumulee) atteint = n;
  }
  return atteint;
}

export function crediter(etat, xpGagne, niveaux) {
  const xpTotal = etat.xp + Math.max(0, xpGagne);
  const tries = trierParNiveau(niveaux);
  const avant = niveauPourXp(tries, etat.xp);
  const apres = niveauPourXp(tries, xpTotal);
  const niveauxFranchis = tries.filter((n) => n.niveau > avant.niveau && n.niveau <= apres.niveau);
  const pointsGagnes = niveauxFranchis.reduce((somme, n) => somme + n.points_stats, 0);
  return {
    xp: xpTotal,
    niveau: apres.niveau,
    pointsStatsLibres: etat.pointsStatsLibres + pointsGagnes,
    niveauxFranchis: niveauxFranchis.map((n) => n.niveau),
  };
}

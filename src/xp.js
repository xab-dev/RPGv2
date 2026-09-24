// XP -> niveaux -> flags -> points de stats (Palier D, §3.4). Pur, testé.
//
// levels.json : [{ niveau, xp_cumulee, points_stats }] — crediter() peut
// franchir plusieurs niveaux d'un coup (un gros craft ou un monstre généreux
// ne doit jamais "perdre" l'XP en trop) : chaque niveau franchi entre
// `avant` (exclu) et `apres` (inclus) pose son flag et crédite ses points.

// LE nom du flag qu'un niveau franchi pose. Il est fabriqué, jamais lu dans
// le catalogue : c'est pourquoi `schemas.js` exige au démarrage que chaque
// niveau de `levels.json` ait son flag déclaré. Avant ce garde-fou (spec 14,
// palier A), rien n'empêchait d'ajouter des niveaux en oubliant leurs flags,
// et l'oubli ne se serait vu qu'en jeu, au franchissement.
export function flagDeNiveau(niveau) {
  return `flag_niveau_${niveau}`;
}

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

// Le départ est le niveau CRÉDITÉ (`etat.niveau`, celui de la sauvegarde),
// jamais celui que l'XP donnerait aujourd'hui. La table peut s'allonger après
// coup (le Nv.30 était le dernier jusqu'à la spec 14) : un héros resté au
// Nv.30 avec 2 500 XP a déjà « atteint » le Nv.31 sur le papier, mais n'en a
// reçu ni le flag ni le point. Partir de son XP ferait sauter ce niveau en
// silence ; partir de son niveau le lui rend. Appelé avec 0 XP, `crediter`
// rattrape donc tout seul les niveaux dus (le chargement le fait).
// L'inverse ne se fait jamais : un niveau crédité ne se reprend pas, même si
// l'XP ne le justifie plus (une table raccourcie, un niveau posé à la main
// par un test ou un outil). Le rattrapage du chargement ne doit jamais
// rétrograder un héros.
export function crediter(etat, xpGagne, niveaux) {
  const xpTotal = etat.xp + Math.max(0, xpGagne);
  const tries = trierParNiveau(niveaux);
  const niveauDepart = typeof etat.niveau === 'number' ? etat.niveau : niveauPourXp(tries, etat.xp).niveau;
  const apres = niveauPourXp(tries, xpTotal);
  const niveauxFranchis = tries.filter((n) => n.niveau > niveauDepart && n.niveau <= apres.niveau);
  const pointsGagnes = niveauxFranchis.reduce((somme, n) => somme + n.points_stats, 0);
  return {
    xp: xpTotal,
    niveau: Math.max(niveauDepart, apres.niveau),
    pointsStatsLibres: etat.pointsStatsLibres + pointsGagnes,
    niveauxFranchis: niveauxFranchis.map((n) => n.niveau),
  };
}

// XP portée par une entrée de catalogue (`D-58`, décision de Xav du 21/09 :
// « toute récolte rapporte un peu d'XP »). Un seul lecteur pour les trois
// catalogues qui en portent une — `items.json` (ramassage au sol),
// `resources.json` (récolte à l'outil), `stations.json` (le puits) : le jour
// où une 4ᵉ source s'ajoute, elle met un champ `xp` dans sa fiche et ne
// touche pas une ligne de code.
//
// Champ ABSENT = 0, et c'est voulu : « cette entrée ne rapporte pas d'XP »
// est le cas le plus courant (une hache, un fruit cuit, un coffre), et en
// faire une erreur de catalogue obligerait à écrire `"xp": 0` partout. Une
// valeur PRÉSENTE mais absurde, elle, reste une erreur — c'est `schemas.js`
// qui la refuse au boot, pas ce lecteur qui la rattrape en silence.
export function xpDeCatalogue(entree) {
  return (entree && entree.xp) || 0;
}

// `specs/11_dialogues-consequences.md` §5 : les effets de monde.
//
// Un effet est un NOM qui dure un temps — `toit_occulte` pendant 60 s — posé
// par une conséquence de dialogue, et LU par le système qu'il concerne. Ce
// module ne sait pas ce que fait un effet : il sait seulement lesquels sont
// actifs. Un système qui ne connaît pas un id l'ignore ; c'est ce qui permet
// d'ajouter un effet en données sans rouvrir ce fichier.
//
// ÉTAT DE SESSION, JAMAIS PERSISTÉ (même choix que le Chaos nocturne) : rien
// n'entre dans la sauvegarde, donc aucune migration. Recharger la page lève
// l'effet — assumé (`Q-103`).
//
// Pur : un état entre, un nouvel état sort. Le temps est celui qu'on lui donne
// (`main.js` le fait avancer avec le jeu, gelé sous UI comme le reste).

export function creerEtatEffets() {
  return { restants: {} };
}

// Réactiver un effet déjà actif REPART de sa pleine durée (et ne s'ajoute pas
// à ce qui restait) : la même conséquence deux fois ne double pas la peine.
export function activer(etat, id, dureeMs) {
  return { restants: { ...etat.restants, [id]: dureeMs } };
}

// Un effet est levé quand son temps restant atteint ZÉRO, pas avant : après
// des pas qui somment exactement `duree_ms`, il n'est plus actif ; un pas plus
// tôt, il l'est encore (spec §8, « `tick` lève l'effet à `duree_ms`
// exactement »).
export function tick(etat, dtMs) {
  const ids = Object.keys(etat.restants);
  if (ids.length === 0) return etat;
  const restants = {};
  for (const id of ids) {
    const reste = etat.restants[id] - dtMs;
    if (reste > 0) restants[id] = reste;
  }
  return { restants };
}

export function actif(etat, id) {
  return Object.prototype.hasOwnProperty.call(etat.restants, id);
}

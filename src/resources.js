// Ressources bloquées (arbre, rocher…) — 03_maison-exterieur §3.2. Pur, testé.
//
// peutRecolter() est le point d'accroche pour la Phase 3 (§3.2 : "la
// fonction qui décide bloqué/récoltable vit en un seul endroit") : en Phase
// 2, aucun outil n'existe dans le jeu, elle renvoie donc toujours false —
// Phase 3 y branchera un vrai inventaire d'outils sans toucher au dialogue
// ni à la carte.
export function peutRecolter(ressource, inventaireOutils = {}) {
  if (!ressource.outil_requis) return false;
  return !!inventaireOutils[ressource.outil_requis];
}

// Cherche, dans un petit voisinage de tuiles autour du héros, la tuile-
// ressource la plus proche à portée d'INTERACT — une ressource est une
// propriété de TUILE (pas une entité ponctuelle comme un levier), donc on
// scanne la grille plutôt que de comparer des positions.
export function trouverRessourceProche(scene, hero, distanceMax) {
  const { tileSize } = scene;
  const txCentre = Math.floor(hero.x / tileSize);
  const tyCentre = Math.floor(hero.y / tileSize);
  const rayonTuiles = Math.ceil(distanceMax / tileSize) + 1;

  let meilleure = null;
  let meilleureDistance = Infinity;
  for (let ty = tyCentre - rayonTuiles; ty <= tyCentre + rayonTuiles; ty++) {
    for (let tx = txCentre - rayonTuiles; tx <= txCentre + rayonTuiles; tx++) {
      const tuile = scene.tuileA(tx, ty);
      if (!tuile || !tuile.ressource) continue;
      const cx = (tx + 0.5) * tileSize;
      const cy = (ty + 0.5) * tileSize;
      const distance = Math.hypot(hero.x - cx, hero.y - cy);
      if (distance <= distanceMax && distance < meilleureDistance) {
        meilleureDistance = distance;
        meilleure = { tx, ty, ressourceId: tuile.ressource };
      }
    }
  }
  return meilleure;
}

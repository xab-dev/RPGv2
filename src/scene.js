// Scène : instancie le monde jouable à partir d'une entrée scenes.json et
// expose les collisions tuile par tuile. Aucun rendu ici (cf. render.js).

export function chargerScene(registre, sceneId) {
  const donnees = registre.obtenir('scenes', sceneId);
  if (!donnees) throw new Error(`scene "${sceneId}" introuvable dans le registre`);

  const tuileParId = new Map(registre.tous('tiles').map((t) => [t.id, t]));

  function tuileA(x, y) {
    if (x < 0 || y < 0 || x >= donnees.width || y >= donnees.height) return undefined;
    return tuileParId.get(donnees.layout[y][x]);
  }

  // Hors des limites de la scène = solide (mur invisible), pour ne jamais
  // laisser le héros sortir du monde.
  function estSolideAuPoint(px, py) {
    const tx = Math.floor(px / donnees.tile_size);
    const ty = Math.floor(py / donnees.tile_size);
    const tuile = tuileA(tx, ty);
    return !tuile || tuile.solid;
  }

  return {
    id: donnees.id,
    width: donnees.width,
    height: donnees.height,
    tileSize: donnees.tile_size,
    spawn: donnees.spawn,
    seed: donnees.seed,
    tuileA,
    estSolideAuPoint,
  };
}

// Résout un déplacement (dx, dy) contre les collisions, axe par axe, en
// testant les 4 coins de la hitbox (patron V1). Empêche de traverser un coin
// de mur en diagonale et permet de glisser le long d'un mur.
export function resoudreDeplacement(scene, hitbox, dx, dy) {
  const { largeur, hauteur } = hitbox;
  let { x, y } = hitbox;

  function coinsSolides(nx, ny) {
    return (
      scene.estSolideAuPoint(nx, ny) ||
      scene.estSolideAuPoint(nx + largeur, ny) ||
      scene.estSolideAuPoint(nx, ny + hauteur) ||
      scene.estSolideAuPoint(nx + largeur, ny + hauteur)
    );
  }

  const nxCandidat = x + dx;
  if (!coinsSolides(nxCandidat, y)) {
    x = nxCandidat;
  }

  const nyCandidat = y + dy;
  if (!coinsSolides(x, nyCandidat)) {
    y = nyCandidat;
  }

  return { x, y, largeur, hauteur };
}

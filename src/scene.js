// Scène : instancie le monde jouable à partir d'une entrée scenes.json et
// expose les collisions tuile par tuile. Aucun rendu ici (cf. render.js).
//
// Phase 1 ajoute les portes conditionnelles (`portes[]`, §3.3 : "la porte
// apparaît") : une tuile dont l'id effectif dépend d'un flag. `tuileA` et
// `estSolideAuPoint` prennent un 3ᵉ paramètre optionnel `estFlagActif` — son
// absence (Phase 0, scènes sans porte) préserve exactement le comportement
// existant, donc aucune régression sur les tests déjà en place.

export function chargerScene(registre, sceneId) {
  const donnees = registre.obtenir('scenes', sceneId);
  if (!donnees) throw new Error(`scene "${sceneId}" introuvable dans le registre`);

  const tuileParId = new Map(registre.tous('tiles').map((t) => [t.id, t]));
  const portes = donnees.portes || [];

  function idTuileBrut(x, y) {
    return donnees.layout[y][x];
  }

  function idTuileEffectif(x, y, estFlagActif) {
    const porte = portes.find((p) => p.position.x === x && p.position.y === y);
    if (!porte) return idTuileBrut(x, y);
    const ouverte = !!estFlagActif && estFlagActif(porte.flag);
    return ouverte ? porte.tile_apres : porte.tile_avant;
  }

  function tuileA(x, y, estFlagActif) {
    if (x < 0 || y < 0 || x >= donnees.width || y >= donnees.height) return undefined;
    return tuileParId.get(idTuileEffectif(x, y, estFlagActif));
  }

  // Hors des limites de la scène = solide (mur invisible), pour ne jamais
  // laisser le héros sortir du monde.
  function estSolideAuPoint(px, py, estFlagActif) {
    const tx = Math.floor(px / donnees.tile_size);
    const ty = Math.floor(py / donnees.tile_size);
    const tuile = tuileA(tx, ty, estFlagActif);
    return !tuile || tuile.solid;
  }

  return {
    id: donnees.id,
    width: donnees.width,
    height: donnees.height,
    tileSize: donnees.tile_size,
    spawn: donnees.spawn,
    seed: donnees.seed,
    // 03_grotte-polish §2.1 : obscurite est désormais un objet { opacite }
    // (ou absent = scène claire) — jamais coercé en booléen, contrairement à
    // avant ce ticket : render.js lit directement `obscurite.opacite`.
    obscurite: donnees.obscurite || null,
    lumieres: donnees.lumieres || [],
    // decor (§3.4) : { densite, motifs: [{ visuel, poids }] }, lu par
    // decor.js#genererDecor — absent = aucun motif, jamais une erreur.
    decor: donnees.decor || null,
    interactifs: donnees.interactifs || [],
    spawns: donnees.spawns || [],
    portails: donnees.portails || [],
    // Exposé pour le calque statique de render.js (signature d'invalidation
    // du cache tuiles+décor quand une porte change d'état) — jusqu'ici
    // seulement lu en interne par idTuileEffectif() ci-dessus.
    portes,
    tuileA,
    estSolideAuPoint,
  };
}

// Résout un déplacement (dx, dy) contre les collisions, axe par axe, en
// testant les 4 coins de la hitbox (patron V1). Empêche de traverser un coin
// de mur en diagonale et permet de glisser le long d'un mur.
export function resoudreDeplacement(scene, hitbox, dx, dy, estFlagActif) {
  const { largeur, hauteur } = hitbox;
  let { x, y } = hitbox;

  function coinsSolides(nx, ny) {
    return (
      scene.estSolideAuPoint(nx, ny, estFlagActif) ||
      scene.estSolideAuPoint(nx + largeur, ny, estFlagActif) ||
      scene.estSolideAuPoint(nx, ny + hauteur, estFlagActif) ||
      scene.estSolideAuPoint(nx + largeur, ny + hauteur, estFlagActif)
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

// Portail franchi par la hitbox du héros à la position courante, dont la
// condition (optionnelle) est remplie — sinon "simple mur, aucun message"
// (§4) : on renvoie simplement aucun portail, jamais une exception.
export function portailFranchi(scene, hitbox, flags) {
  const cx = hitbox.x + hitbox.largeur / 2;
  const cy = hitbox.y + hitbox.hauteur / 2;
  const tx = Math.floor(cx / scene.tileSize);
  const ty = Math.floor(cy / scene.tileSize);

  return scene.portails.find((portail) => {
    const { zone } = portail;
    const dansLaZone = tx >= zone.x && tx < zone.x + zone.w && ty >= zone.y && ty < zone.y + zone.h;
    if (!dansLaZone) return false;
    if (portail.condition == null) return true;
    return flags.evaluate(portail.condition);
  });
}

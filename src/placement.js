// specs/05_construction-stations.md — placement libre des stations dans une
// structure (grille intérieure, validité de pose). Pur, testé : ne connaît
// jamais le DOM ni le registre, seulement des rectangles px et des rects
// tuile déjà résolus par l'appelant (main.js).

// Vrai si le point tuile (tx,ty) est dans le rectangle tuile `rect`
// ({x,y,w,h}, bornes incluses côté min, exclues côté max — convention déjà
// utilisée par scene.js#appliquerForetProcedurale/appliquerStructures).
export function dansRectangleTuile(tx, ty, rect) {
  return tx >= rect.x && tx < rect.x + rect.w && ty >= rect.y && ty < rect.y + rect.h;
}

// Chevauchement de deux rectangles px (bord-à-bord = pas de chevauchement,
// cohérent avec structures.js#distanceAuRectangle qui traite un bord comme
// "à portée" plutôt que "dedans").
export function rectanglesChevauchent(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Une empreinte (px) "couvre" la tuile (tx,ty) si elle chevauche son carré —
// proxy suffisant pour une vérification de PRATICABILITÉ (pas la collision
// pixel-perfect du jeu réel, qui reste resoudreDeplacement/estSolideAuPoint) :
// une tuile partiellement couverte est considérée bloquée, jamais franchissable
// "à moitié".
function empreinteCouvreTuile(empreinte, tx, ty, tileSize) {
  const tx0 = tx * tileSize;
  const ty0 = ty * tileSize;
  return (
    empreinte.x < tx0 + tileSize && empreinte.x + empreinte.w > tx0 &&
    empreinte.y < ty0 + tileSize && empreinte.y + empreinte.h > ty0
  );
}

// §3 : "la porte ouest → porte est reste praticable" — BFS 4-connexe sur les
// tuiles de `structure.interieur` (+ les 2 tuiles de `structure.couloir`,
// portes elles-mêmes, jamais couvertes par une empreinte en pratique mais
// jamais bloquées non plus par construction : une porte n'a pas de collision
// propre). Même patron que ground_items.js#calculerTuilesAtteignables
// (BFS déterministe depuis un point garanti), réutilisé ici comme fonction de
// VALIDATION appelée par le jeu (poseValide ci-dessous), pas seulement par un
// test — spec §3.
export function couloirPraticable(structure, empreintes, tileSize) {
  const { interieur, couloir } = structure;
  const [depart, arrivee] = couloir;

  function dansZone(tx, ty) {
    const dansInterieur = dansRectangleTuile(tx, ty, interieur);
    const estPorte = (tx === depart.x && ty === depart.y) || (tx === arrivee.x && ty === arrivee.y);
    return dansInterieur || estPorte;
  }

  function bloquee(tx, ty) {
    if ((tx === depart.x && ty === depart.y) || (tx === arrivee.x && ty === arrivee.y)) return false;
    return empreintes.some((e) => empreinteCouvreTuile(e, tx, ty, tileSize));
  }

  const cle = (x, y) => `${x},${y}`;
  const visitees = new Set([cle(depart.x, depart.y)]);
  const file = [depart];
  while (file.length > 0) {
    const { x, y } = file.shift();
    if (x === arrivee.x && y === arrivee.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!dansZone(nx, ny) || visitees.has(cle(nx, ny)) || bloquee(nx, ny)) continue;
      visitees.add(cle(nx, ny));
      file.push({ x: nx, y: ny });
    }
  }
  return false;
}

// Validité d'une pose candidate (§3) : { ok, raison }. `empreinte` est déjà
// l'empreinte ABSOLUE (structures.js#empreinteAbsoluePuzzle, déjà tournée) de
// la station à sa position candidate ; `autresEmpreintes` celles des AUTRES
// interactifs solides de la même structure, à leur position effective
// actuelle (jamais celle qu'on est en train de déplacer).
export function poseValide({ empreinte, structure, autresEmpreintes, tileSize }) {
  const { interieur } = structure;
  const interieurPx = {
    x: interieur.x * tileSize, y: interieur.y * tileSize, w: interieur.w * tileSize, h: interieur.h * tileSize,
  };
  // Tolérance flottante minime (erreurs d'arrondi px), jamais assez pour
  // autoriser un vrai débordement d'une tuile.
  const EPS = 0.01;
  if (
    empreinte.x < interieurPx.x - EPS || empreinte.y < interieurPx.y - EPS ||
    empreinte.x + empreinte.w > interieurPx.x + interieurPx.w + EPS ||
    empreinte.y + empreinte.h > interieurPx.y + interieurPx.h + EPS
  ) {
    return { ok: false, raison: 'hors_interieur' };
  }
  if (autresEmpreintes.some((e) => rectanglesChevauchent(empreinte, e))) {
    return { ok: false, raison: 'chevauchement' };
  }
  if (!couloirPraticable(structure, [...autresEmpreintes, empreinte], tileSize)) {
    return { ok: false, raison: 'couloir_bloque' };
  }
  return { ok: true, raison: null };
}

// Scène : instancie le monde jouable à partir d'une entrée scenes.json et
// expose les collisions tuile par tuile. Aucun rendu ici (cf. render.js).
//
// Phase 1 ajoute les portes conditionnelles (`portes[]`, §3.3 : "la porte
// apparaît") : une tuile dont l'id effectif dépend d'un flag. `tuileA` et
// `estSolideAuPoint` prennent un 3ᵉ paramètre optionnel `estFlagActif` — son
// absence (Phase 0, scènes sans porte) préserve exactement le comportement
// existant, donc aucune régression sur les tests déjà en place.
//
// 03_maison-exterieur §3.1 ajoute un second FORMAT de layout (lignes de
// caractères + legende), décodé ici en un tableau-de-tableaux d'id de tuiles
// — la même représentation interne qu'avant, pour que tout le reste de ce
// fichier (et couleurTuile/decor.js, qui lisent tuileA) reste inchangé. Puis,
// pour la seule Région Maison, trois passes supplémentaires composent le
// layout final, chacune primant sur la précédente à l'intérieur de son
// empreinte : (1) le layout décodé, (2) le fond de forêt procédural
// (`foret_procedurale`, densité à graine fixe dans les zones de type
// "foret", seulement sur les cellules encore à `tile_libre` — le calque
// manuel, déjà posé à l'étape 1, prime toujours dessus), (3) les
// structures (`structures[]` : murs/sol/portes générés depuis un simple
// rectangle, jamais encodés à la main dans le layout).
import { mulberry32 } from './decor.js';
import { resoudreEmpreinteInteractif, empreinteAbsoluePuzzle } from './structures.js';

function decoderLayout(donnees) {
  if (donnees.legende) {
    // Chaque caractère est traduit vers son id de tuile via `legende` — sans
    // cette traduction, la grille contiendrait les caractères bruts (".",
    // "C"...) plutôt que des id de tiles.json, et toute lecture (tuileA,
    // couleurTuile...) échouerait silencieusement (Map.get() sur un id qui
    // n'existe pas -> undefined).
    return donnees.layout.map((ligne) => ligne.split('').map((car) => donnees.legende[car]));
  }
  // Format tableau-de-tableaux (Phase 0/1) : déjà la représentation interne.
  return donnees.layout;
}

// Fond de forêt (§3.1, acté Xav 2026-09-16) : un caractère de plus dans
// `foret_procedurale`/`zones[]` par future région = zéro code ici — hash
// spatial déterministe (même principe que decor.js#couleurTuile, pas une
// avance séquentielle du PRNG) pour que le résultat ne dépende jamais de
// l'ordre de parcours.
function appliquerForetProcedurale(grille, donnees) {
  const config = donnees.foret_procedurale;
  if (!config) return;
  const zonesForet = (donnees.zones || []).filter((z) => z.type === 'foret');
  for (const zone of zonesForet) {
    const { x: zx, y: zy, w, h } = zone.rect;
    for (let y = zy; y < zy + h && y < donnees.height; y++) {
      for (let x = zx; x < zx + w && x < donnees.width; x++) {
        if (grille[y][x] !== config.tile_libre) continue;
        const alea = mulberry32((donnees.seed ^ (x * 73856093) ^ (y * 19349663)) >>> 0);
        if (alea() < config.densite) grille[y][x] = config.tile_plein;
      }
    }
  }
}

// Structures (§3.4) : mur sur le pourtour du rectangle (sauf aux positions
// de `portes[]`, qui reçoivent `porte_tile`), `sol` à l'intérieur — prime
// toujours sur le fond de forêt et le layout manuel dans son empreinte,
// c'est la dernière passe.
function appliquerStructures(grille, donnees) {
  for (const structure of donnees.structures || []) {
    const { x: sx, y: sy, w, h } = structure.rect;
    const portes = new Set((structure.portes || []).map((p) => `${p.x},${p.y}`));
    for (let y = sy; y < sy + h; y++) {
      for (let x = sx; x < sx + w; x++) {
        if (y < 0 || y >= donnees.height || x < 0 || x >= donnees.width) continue;
        const surPourtour = x === sx || x === sx + w - 1 || y === sy || y === sy + h - 1;
        if (portes.has(`${x},${y}`)) {
          grille[y][x] = structure.porte_tile;
        } else if (surPourtour) {
          grille[y][x] = structure.mur;
        } else {
          grille[y][x] = structure.sol;
        }
      }
    }
  }
}

// specs/05_construction-stations.md §3 : une station placable peut avoir été
// déplacée/tournée par le joueur (save.maison.stations, résolu et VALIDÉ par
// main.js#resoudreOverridesStations avant l'appel à chargerScene — ce module
// reste pur, il ne connaît jamais save.js). `overridesInteractifs` ({ id: {
// x, y, rotation } }) est optionnel : absent ou vide, chaque interactif garde
// exactement sa position/rotation de puzzles.json, comportement identique à
// avant cette fiche (aucune régression sur les scènes sans station placable).
export function chargerScene(registre, sceneId, overridesInteractifs = {}) {
  const donnees = registre.obtenir('scenes', sceneId);
  if (!donnees) throw new Error(`scene "${sceneId}" introuvable dans le registre`);

  const tuileParId = new Map(registre.tous('tiles').map((t) => [t.id, t]));
  const portes = donnees.portes || [];

  const grille = decoderLayout(donnees);
  appliquerForetProcedurale(grille, donnees);
  appliquerStructures(grille, donnees);

  // Pose effective d'un interactif positionné : l'override validé (pose du
  // joueur) prime, sinon la position/rotation déclarée dans puzzles.json
  // (rotation absente = 0, aucune station de M1 n'en déclare une en dur).
  // Résolue UNE fois par id ici (Map), réutilisée telle quelle par
  // empreintesSolides ci-dessous ET exposée pour main.js (rendu, seuil
  // d'interaction) — jamais un second calcul de "quelle est sa vraie
  // position" (spec §3/§6 : une seule source de vérité).
  const posesEffectives = new Map();
  function poseEffective(puzzle) {
    if (posesEffectives.has(puzzle.id)) return posesEffectives.get(puzzle.id);
    const o = overridesInteractifs[puzzle.id];
    const pose = o
      ? { x: o.x, y: o.y, rotation: o.rotation || 0 }
      : { x: puzzle.position.x, y: puzzle.position.y, rotation: puzzle.rotation || 0 };
    posesEffectives.set(puzzle.id, pose);
    return pose;
  }

  // specs/04_stations-proportions-collision.md §3 : empreintes des
  // interactifs `solide: true`, en px logiques absolus, résolues UNE fois à
  // l'entrée en scène (statiques, comme la grille de tuiles) — jamais
  // recalculées par frame. Un interactif non solide n'y contribue pas
  // (`resoudreEmpreinteInteractif` renvoie un rectangle nul dans ce cas, mais
  // filtrer ici évite de tester des rectangles nuls pour rien à chaque appel
  // de resoudreDeplacement).
  const empreintesSolides = (donnees.interactifs || [])
    .map((id) => registre.obtenir('puzzles', id))
    .filter((p) => p && p.solide)
    .map((p) => {
      const visuel = registre.obtenir('visuels', p.render.visuel);
      const abs = empreinteAbsoluePuzzle(p, visuel, poseEffective(p), donnees.tile_size);
      return { id: p.id, ...abs };
    });

  function dansRectangle(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function idTuileBrut(x, y) {
    return grille[y][x];
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
  // laisser le héros sortir du monde. Une empreinte d'interactif solide
  // (§3 04_stations-proportions-collision) s'ajoute à la même fonction —
  // "une seule fonction de collision" testée par resoudreDeplacement ci-
  // dessous, jamais une 2ᵉ passe séparée.
  function estSolideAuPoint(px, py, estFlagActif) {
    const tx = Math.floor(px / donnees.tile_size);
    const ty = Math.floor(py / donnees.tile_size);
    const tuile = tuileA(tx, ty, estFlagActif);
    if (!tuile || tuile.solid) return true;
    return empreintesSolides.some((rect) => dansRectangle(px, py, rect));
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
    // 03_maison-exterieur §2.1 : zones nommées (spawn d'objets au sol,
    // déclencheurs d'entrée de zone) et structures (rendu du toit) — vides
    // pour toute scène qui n'en déclare pas (grotte inchangée).
    zones: donnees.zones || [],
    // `D-59` : points candidats des objets au sol, POSÉS À LA MAIN dans le
    // JSON de scène ({ itemId: [[tx, ty], ...] }) — c'est leur répartition
    // qui fait le gradient « dense le long du chemin et autour du Jardin,
    // clairsemé au loin », jamais une formule évaluée en jeu. Absent = la
    // scène n'en déclare pas, et ses objets au sol tombent alors dans leurs
    // zones comme avant (la Grotte n'en a aucun).
    pointsRessources: donnees.points_ressources || null,
    // `D-60` (la Plume) : objets posés à un endroit FIXE, une seule fois dans
    // toute la partie — hors du tirage du jour, et retirés pour de bon par
    // leur flag une fois ramassés. Le mécanisme est générique (rien ne parle
    // de plume ici), mais il n'est pas un système : c'est une liste de
    // curiosités posées à la main, comme le layout de la carte.
    objetsUniques: donnees.objets_uniques || [],
    structures: donnees.structures || [],
    cycleJourNuit: !!donnees.cycle_jour_nuit,
    // Exposé pour le calque statique de render.js (signature d'invalidation
    // du cache tuiles+décor quand une porte change d'état) — jusqu'ici
    // seulement lu en interne par idTuileEffectif() ci-dessus.
    portes,
    tuileA,
    estSolideAuPoint,
    // Exposé pour les tests (headless, jamais le rendu) et pour
    // trouverPositionLibrePlusProche ci-dessous — la géométrie brute, jamais
    // recalculée ailleurs (§3 : "une seule fonction de collision").
    empreintesSolides,
    // specs/05_construction-stations.md §3 : position/rotation EFFECTIVE
    // (override validé ou défaut de puzzles.json) d'un interactif positionné
    // — main.js#rectangleInteractif (seuil d'INTERACT) et le rendu
    // (puzzlesAffiches) l'utilisent tous les deux, jamais `puzzle.position`
    // brut, pour qu'une station déplacée soit actionnable/dessinée à sa
    // VRAIE position.
    poseEffectiveInteractif: (puzzleId) => poseEffective(registre.obtenir('puzzles', puzzleId)),
  };
}

// specs/04_stations-proportions-collision.md §4 : héros à l'intérieur d'une
// empreinte solide au chargement (sauvegarde antérieure, position désormais
// bloquée par une station agrandie) — repousse vers la case libre la plus
// proche, jamais ne bloque le joueur au boot. Recherche par anneaux carrés
// croissants (distance de Tchebychev, pas la distance euclidienne exacte :
// approximation suffisante pour un cas de secours qui ne devrait presque
// jamais se produire en pratique).
export function trouverPositionLibrePlusProche(scene, x, y, estFlagActif) {
  if (!scene.estSolideAuPoint(x, y, estFlagActif)) return { x, y };

  const { tileSize, width, height } = scene;
  const tx0 = Math.floor(x / tileSize);
  const ty0 = Math.floor(y / tileSize);
  const rayonMax = Math.max(width, height);

  for (let rayon = 1; rayon <= rayonMax; rayon++) {
    for (let dy = -rayon; dy <= rayon; dy++) {
      for (let dx = -rayon; dx <= rayon; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rayon) continue; // anneau seulement
        const tx = tx0 + dx;
        const ty = ty0 + dy;
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
        const px = (tx + 0.5) * tileSize;
        const py = (ty + 0.5) * tileSize;
        if (!scene.estSolideAuPoint(px, py, estFlagActif)) return { x: px, y: py };
      }
    }
  }
  return { x, y }; // filet de sécurité, jamais atteint en pratique
}

// Résout un déplacement (dx, dy) contre les collisions, axe par axe, en
// testant les 4 coins de la hitbox (patron V1). Empêche de traverser un coin
// de mur en diagonale et permet de glisser le long d'un mur.
//
// Diagnostic SD_hitbox-angle-arbre_2026-09-16 (hypothèse A1 confirmée par un
// test rouge) : sans correction, un coin qui chevauche de quelques pixels une
// tuile solide adjacente à une ouverture d'1 tuile bloque tout l'axe pendant
// plusieurs frames — le héros semble « accrocher » un coin — jusqu'à ce que
// le glissement sur l'autre axe le réaligne. Avant d'abandonner un axe
// bloqué, on tente un `decalage` : repousser le héros hors d'un chevauchement
// ≤ TOLERANCE_COIN_PX sur l'axe perpendiculaire, pour que le glissement
// diagonal reste fluide dans une ouverture d'1 tuile. Seuil provisoire (non
// validé en jeu), ordre de grandeur : le tiers du rayon du héros
// (largeur/hauteur = 2×rayon).
export function resoudreDeplacement(scene, hitbox, dx, dy, estFlagActif) {
  const { largeur, hauteur } = hitbox;
  let { x, y } = hitbox;
  const TOLERANCE_COIN_PX = largeur / 6;
  const { tileSize } = scene;

  function solide(px, py) {
    return scene.estSolideAuPoint(px, py, estFlagActif);
  }

  function coinsSolides(nx, ny) {
    return solide(nx, ny) || solide(nx + largeur, ny) || solide(nx, ny + hauteur) || solide(nx + largeur, ny + hauteur);
  }

  // `decalage` ne vaut non-null que dans le cas simple et sûr à corriger : un
  // seul des deux coins du bord testé est solide (l'autre est libre) — un
  // vrai mur plein (2 coins solides) n'est jamais corrigé, pour ne jamais
  // faire traverser un coin de mur. `chevauchement` est déjà signé (positif
  // = pousser vers les x/y croissants, négatif = vers les décroissants).
  function decalage(coteASolide, coteBSolide, chevauchement) {
    if (coteASolide === coteBSolide) return null; // 2 solides (mur) ou 2 libres : rien à corriger
    const ampleur = Math.abs(chevauchement);
    if (ampleur <= 0 || ampleur > TOLERANCE_COIN_PX) return null;
    return chevauchement;
  }

  const nxCandidat = x + dx;
  if (!coinsSolides(nxCandidat, y)) {
    x = nxCandidat;
  } else {
    // Coin haut (y) vs coin bas (y+hauteur) du bord avant (nxCandidat) :
    // chevauchement à corriger sur Y si un seul des deux est solide — mur
    // horizontal avec une ouverture juste au-dessus ou en-dessous.
    const hautSolide = solide(nxCandidat, y) || solide(nxCandidat + largeur, y);
    const basSolide = solide(nxCandidat, y + hauteur) || solide(nxCandidat + largeur, y + hauteur);
    const decalY = hautSolide
      ? decalage(true, basSolide, (Math.floor(y / tileSize) + 1) * tileSize - y) // pousse vers le bas
      : decalage(false, basSolide, -(y + hauteur - Math.floor((y + hauteur) / tileSize) * tileSize)); // pousse vers le haut
    if (decalY !== null && !coinsSolides(nxCandidat, y + decalY)) {
      x = nxCandidat;
      y += decalY;
    }
  }

  const nyCandidat = y + dy;
  if (!coinsSolides(x, nyCandidat)) {
    y = nyCandidat;
  } else {
    // Coin gauche (x) vs coin droit (x+largeur) du bord avant (nyCandidat) :
    // chevauchement à corriger sur X si un seul des deux est solide — mur
    // vertical avec une ouverture juste à gauche ou à droite (cas du portail
    // de la maison, §3.4 03_maison-exterieur).
    const gaucheSolide = solide(x, nyCandidat) || solide(x, nyCandidat + hauteur);
    const droiteSolide = solide(x + largeur, nyCandidat) || solide(x + largeur, nyCandidat + hauteur);
    const decalX = gaucheSolide
      ? decalage(true, droiteSolide, (Math.floor(x / tileSize) + 1) * tileSize - x) // pousse vers la droite
      : decalage(false, droiteSolide, -(x + largeur - Math.floor((x + largeur) / tileSize) * tileSize)); // pousse vers la gauche
    if (decalX !== null && !coinsSolides(x + decalX, nyCandidat)) {
      x += decalX;
      y = nyCandidat;
    }
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

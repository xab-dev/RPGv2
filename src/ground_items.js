// Objets au sol (03_maison-exterieur §3.3) : spawn/respawn déterministe à
// graine fixe (`mulberry32`, réutilisé de decor.js comme loot.js — même
// discipline, un seul PRNG dans tout le jeu). Pur, testé.
//
// État tenu par l'appelant (main.js) : `itemsSol = { [itemId]: [{x,y}, ...] }`
// en pixels monde, longueur visée = `item.spawn.nb_au_sol`.

import { mulberry32 } from './decor.js';

function dansRect(tx, ty, rect) {
  return tx >= rect.x && tx < rect.x + rect.w && ty >= rect.y && ty < rect.y + rect.h;
}

// Tire une position libre (tuile non solide, ATTEIGNABLE depuis le héros,
// dans une zone autorisée, hors zones exclues, pas déjà occupée) via un hash
// déterministe (seed scène ^ graine passée par l'appelant) — jamais
// Math.random(), pour rester reproductible en test. Renvoie null si aucune
// position trouvée après un nombre borné d'essais (§4 edge case : carte
// saturée, jamais de boucle infinie). `tuilesAtteignables` optionnel (null =
// aucun filtre, cf. tests existants sur scènes entièrement connectées) —
// SD_respawn-items-au-sol_2026-09-17 : une tuile non solide mais isolée par
// la forêt procédurale est retirée et redemandée, jamais acceptée.
function tirerPositionLibre(scene, zonesAutorisees, zonesExclues, dejaOccupees, graine, tuilesAtteignables = null) {
  if (zonesAutorisees.length === 0) return null;
  const alea = mulberry32((scene.seed ^ graine) >>> 0);
  for (let essai = 0; essai < 60; essai++) {
    const zone = zonesAutorisees[Math.floor(alea() * zonesAutorisees.length)];
    const tx = zone.rect.x + Math.floor(alea() * zone.rect.w);
    const ty = zone.rect.y + Math.floor(alea() * zone.rect.h);
    if (zonesExclues.some((z) => dansRect(tx, ty, z.rect))) continue;
    const tuile = scene.tuileA(tx, ty);
    if (!tuile || tuile.solid) continue;
    if (tuilesAtteignables && !tuilesAtteignables.has(`${tx},${ty}`)) continue;
    const occupee = dejaOccupees.some(
      (p) => Math.floor(p.x / scene.tileSize) === tx && Math.floor(p.y / scene.tileSize) === ty
    );
    if (occupee) continue;
    return { x: (tx + 0.5) * scene.tileSize, y: (ty + 0.5) * scene.tileSize };
  }
  return null;
}

function zonesDuType(scene, types) {
  return (scene.zones || []).filter((z) => (types || []).includes(z.type));
}

// Ensemble des tuiles non solides connectées (4-adjacence) à un point de
// départ garanti franchissable (le héros, à l'entrée en scène) — SD_respawn-
// items-au-sol_2026-09-17 : la forêt procédurale (densité fixe, decor.js)
// isole parfois une poignée de tuiles libres au milieu d'arbres solides ;
// `tuile.solid` seul ne dit rien de leur accessibilité réelle. Calculé une
// fois par entrée en scène (jamais par frame, cf. main.js), réutilisé tel
// quel par remplirItemsSol/tickRespawns ci-dessous.
export function calculerTuilesAtteignables(scene, txDepart, tyDepart) {
  const vues = new Set();
  const cle = (x, y) => `${x},${y}`;
  const depart = scene.tuileA(txDepart, tyDepart);
  if (!depart || depart.solid) return vues; // départ solide (ne devrait pas arriver) : aucune tuile garantie
  const pile = [[txDepart, tyDepart]];
  vues.add(cle(txDepart, tyDepart));
  while (pile.length > 0) {
    const [tx, ty] = pile.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= scene.width || ny >= scene.height) continue;
      const k = cle(nx, ny);
      if (vues.has(k)) continue;
      const tuile = scene.tuileA(nx, ny);
      if (!tuile || tuile.solid) continue;
      vues.add(k);
      pile.push([nx, ny]);
    }
  }
  return vues;
}

// Complète le stock d'items au sol de la scène jusqu'à `nb_au_sol` pour
// chaque item catalogue dont au moins une zone de spawn existe sur cette
// scène — un item sans zone en commun (ex. item de craft futur, Phase 3+)
// n'apparaît simplement jamais au sol ici, sans erreur.
export function remplirItemsSol(scene, items, existant, compteurDepart = 0, tuilesAtteignables = null) {
  const resultat = { ...existant };
  let compteur = compteurDepart;
  for (const item of items) {
    if (!item.spawn) continue;
    const zonesAutorisees = zonesDuType(scene, item.spawn.zones);
    if (zonesAutorisees.length === 0) continue;
    const zonesExclues = zonesDuType(scene, item.spawn.zones_exclues);

    let positions = resultat[item.id] ? [...resultat[item.id]] : [];
    while (positions.length < item.spawn.nb_au_sol) {
      compteur += 1;
      const position = tirerPositionLibre(scene, zonesAutorisees, zonesExclues, positions, compteur, tuilesAtteignables);
      if (!position) {
        console.warn(`ground_items.js : impossible de placer tous les "${item.id}" (zones saturées)`);
        break;
      }
      positions.push(position);
    }
    resultat[item.id] = positions;
  }
  return resultat;
}

// Le plus proche exemplaire au sol à portée d'INTERACT, tous items
// confondus — même patron que resources.js#trouverRessourceProche.
export function trouverItemProche(itemsSol, hero, distanceMax) {
  let meilleur = null;
  let meilleureDistance = Infinity;
  for (const [itemId, positions] of Object.entries(itemsSol)) {
    positions.forEach((p, index) => {
      const distance = Math.hypot(hero.x - p.x, hero.y - p.y);
      if (distance <= distanceMax && distance < meilleureDistance) {
        meilleureDistance = distance;
        meilleur = { itemId, index, position: p };
      }
    });
  }
  return meilleur;
}

// Retire l'exemplaire ramassé (Palier B, specs/04_maison-interieur.md §3.2 :
// le nouvel exemplaire n'est plus tiré immédiatement — cf. planifierRespawn/
// tickRespawns ci-dessous — mais le compte cible reste `nb_au_sol`, tiré
// depuis le même PRNG déterministe une fois le délai écoulé).
export function ramasser(itemsSol, itemId, index) {
  return { ...itemsSol, [itemId]: itemsSol[itemId].filter((_, i) => i !== index) };
}

// Enfile un délai de respawn (temps de jeu actif) pour un item ramassé —
// plusieurs délais peuvent courir en parallèle pour un même itemId (deux
// ramassages rapprochés), chacun tiqué indépendamment par tickRespawns.
export function planifierRespawn(enAttente, itemId, respawnMs) {
  const liste = enAttente[itemId] ? [...enAttente[itemId]] : [];
  liste.push(respawnMs);
  return { ...enAttente, [itemId]: liste };
}

// Fait avancer les délais en attente ; à échéance, tire une nouvelle
// position (même PRNG déterministe que remplirItemsSol, `compteur` fourni
// par l'appelant pour rester unique dans toute la session) et l'ajoute à
// itemsSol. Zones saturées au moment précis de l'échéance (rare, carte
// pleine) : le délai est réessayé à la frame suivante plutôt que perdu.
// Position d'une repousse en cours de journée. Deux chemins, et le premier
// gagne : la LISTE de points de la scène si elle existe (on reprend un point
// non occupé, dans l'ordre du tirage du jour), sinon l'ancien tirage libre
// dans les zones — qui reste le comportement de toute scène sans liste.
function positionDeRepousse(scene, item, dejaOccupees, graine, tuilesAtteignables) {
  const liste = (scene.pointsRessources || {})[item.id];
  if (liste && liste.length > 0) {
    const alea = mulberry32((scene.seed ^ graine) >>> 0);
    const depart = Math.floor(alea() * liste.length);
    for (let k = 0; k < liste.length; k += 1) {
      const [tx, ty] = liste[(depart + k) % liste.length];
      const tuile = scene.tuileA(tx, ty);
      if (!tuile || tuile.solid) continue;
      if (tuilesAtteignables && !tuilesAtteignables.has(`${tx},${ty}`)) continue;
      const occupee = dejaOccupees.some(
        (p) => Math.floor(p.x / scene.tileSize) === tx && Math.floor(p.y / scene.tileSize) === ty
      );
      if (occupee) continue;
      return { x: (tx + 0.5) * scene.tileSize, y: (ty + 0.5) * scene.tileSize };
    }
    return null; // liste saturée : l'appelant reporte, jamais de repli hors liste
  }
  return tirerPositionLibre(
    scene, zonesDuType(scene, item.spawn.zones), zonesDuType(scene, item.spawn.zones_exclues),
    dejaOccupees, graine, tuilesAtteignables,
  );
}

export function tickRespawns(scene, items, itemsSol, enAttente, deltaMs, compteurDepart, tuilesAtteignables = null) {
  let compteur = compteurDepart;
  const itemsSolSuivant = { ...itemsSol };
  const enAttenteSuivant = {};
  for (const [itemId, delais] of Object.entries(enAttente)) {
    const restants = [];
    for (const delaiMs of delais) {
      const suivant = delaiMs - deltaMs;
      if (suivant > 0) {
        restants.push(suivant);
        continue;
      }
      const item = items.find((i) => i.id === itemId);
      compteur += 1;
      // `D-59` : si la scène déclare des points candidats pour cet item, la
      // repousse s'y tient elle aussi — sinon le fruit reviendrait dans un
      // coin de Jardin qu'aucune main n'a choisi, et la liste ne dirait plus
      // la vérité sur où les choses se trouvent.
      const position = positionDeRepousse(scene, item, itemsSolSuivant[itemId] || [], compteur, tuilesAtteignables);
      if (position) {
        itemsSolSuivant[itemId] = [...(itemsSolSuivant[itemId] || []), position];
      } else {
        console.warn(`ground_items.js : respawn de "${itemId}" reporté (zones saturées)`);
        restants.push(1);
      }
    }
    if (restants.length > 0) enAttenteSuivant[itemId] = restants;
  }
  return { itemsSol: itemsSolSuivant, enAttente: enAttenteSuivant, compteur };
}

// --- Tirage du jour (`D-59`, file Nv.0 → Nv.10, T2) ----------------------
// Décision de Xav (21/09, `Q-33`) : les objets au sol ne tombent plus
// n'importe où dans leur zone. Chaque scène porte, POUR CHAQUE ITEM, une
// liste de points candidats posés à la main (~3 fois le nombre d'objets
// présents) ; à chaque aube, on en retient `nb_au_sol`, tirés avec le
// NUMÉRO DU JOUR pour graine.
//
// Pourquoi une liste plutôt qu'un tirage libre dans la zone : le gradient.
// « Dense le long du chemin et autour du Jardin, clairsemé au loin » n'est
// pas une règle qu'on évalue en jeu, c'est une propriété de l'endroit où les
// points ont été posés — donc une donnée que Xav peut corriger point par
// point, sans toucher à une formule.
//
// Pourquoi le numéro du jour : « semi-aléatoire » veut dire que le joueur ne
// sait pas où chercher aujourd'hui, PAS que le monde est imprévisible. Deux
// parties au même jour posent les mêmes objets aux mêmes endroits ; c'est ce
// qui rend le tirage testable et une sauvegarde rejouable.

// Mêle l'id de l'item à la graine : sans lui, deux items qui partagent une
// liste tireraient les mêmes indices, et se retrouveraient chaque jour
// exactement au même endroit.
function grainePourItem(sceneSeed, jour, itemId) {
  let hachage = 0;
  for (let i = 0; i < itemId.length; i += 1) hachage = (hachage * 31 + itemId.charCodeAt(i)) >>> 0;
  return (sceneSeed ^ (jour * 2654435761) ^ hachage) >>> 0;
}

// `nb` points distincts pris dans `points`, mélange de Fisher-Yates à graine
// fixe. On mélange plutôt que de tirer `nb` fois au hasard : tirer avec
// remise poserait deux objets sur la même tuile, et retirer les doublons
// après coup biaiserait le tirage sans que personne le voie.
export function tirerPointsDuJour(scene, itemId, nb, jour) {
  const liste = (scene.pointsRessources || {})[itemId];
  if (!liste || liste.length === 0) return null;
  const alea = mulberry32(grainePourItem(scene.seed, jour, itemId));
  const melange = [...liste];
  for (let i = melange.length - 1; i > 0; i -= 1) {
    const j = Math.floor(alea() * (i + 1));
    [melange[i], melange[j]] = [melange[j], melange[i]];
  }
  const retenus = [];
  for (const [tx, ty] of melange) {
    if (retenus.length >= nb) break;
    // Un point candidat écrit à la main peut être devenu solide (une station
    // déplacée, un arbre de la forêt procédurale si la graine change) : on
    // le saute, on n'échoue pas. La liste est plus longue que le besoin
    // exactement pour ça.
    const tuile = scene.tuileA(tx, ty);
    if (!tuile || tuile.solid) continue;
    retenus.push({ x: (tx + 0.5) * scene.tileSize, y: (ty + 0.5) * scene.tileSize });
  }
  return retenus;
}

// Repose TOUS les objets au sol de la scène selon le tirage du jour. Appelé
// à chaque aube, et à l'entrée en scène si le jour a changé depuis la
// dernière visite.
//
// Le repos est SEC : ce qui traînait au sol disparaît, et les respawns en
// attente sont vidés par l'appelant. C'est voulu — un objet ramassé hier ne
// doit pas revenir au même endroit qu'hier, sinon le tirage du jour ne se
// verrait qu'au premier matin d'une partie.
//
// Un item dont la scène ne déclare AUCUN point garde son comportement
// d'avant (tirage libre dans ses zones, `remplirItemsSol`) : rien ne casse
// pour une scène qui n'a pas de liste.
export function reposerItemsDuJour(scene, items, jour) {
  const resultat = {};
  for (const item of items) {
    if (!item.spawn) continue;
    if (zonesDuType(scene, item.spawn.zones).length === 0) continue;
    const points = tirerPointsDuJour(scene, item.id, item.spawn.nb_au_sol, jour);
    if (points === null) continue; // pas de liste : laissé à remplirItemsSol
    resultat[item.id] = points;
  }
  return resultat;
}

// --- Objets JETÉS par le joueur (`D-145`, 23/09) ---------------------------
//
// Une liste à part, jamais mêlée à `itemsSol` : un objet jeté n'est pas un
// objet SEMÉ. Rangé avec eux, il compterait dans `nb_au_sol` (le semis du
// jour poserait une branche de moins), il repousserait une fois ramassé
// (`planifierRespawn`), et le repos de l'aube l'effacerait — trois règles
// faites pour le semis, qui n'ont aucun sens pour ce que le joueur a posé.
//
// Forme : `[{ item, x, y }]`, en pixels monde, au CENTRE de la tuile — tous
// les objets d'une même tuile partagent donc la même position logique, et
// l'ordre de la liste dit lequel est dessus (le dernier posé).

function tuileDe(p, tileSize) {
  return { tx: Math.floor(p.x / tileSize), ty: Math.floor(p.y / tileSize) };
}

// Combien d'objets occupent la tuile (tx, ty), SEMÉS ET JETÉS confondus : le
// joueur voit une pile, il ne distingue pas l'origine de chaque objet.
export function compterObjetsSurTuile(itemsSol, jetes, tx, ty, tileSize) {
  const surTuile = (p) => {
    const t = tuileDe(p, tileSize);
    return t.tx === tx && t.ty === ty;
  };
  let n = 0;
  for (const positions of Object.values(itemsSol || {})) n += positions.filter(surTuile).length;
  n += (jetes || []).filter(surTuile).length;
  return n;
}

// Pose un objet au centre de la tuile, par-dessus la pile. La place se
// vérifie AVANT (`compterObjetsSurTuile`) : cette fonction ne refuse rien,
// elle n'a pas la capacité — c'est l'appelant qui la lit dans les données.
export function poserObjetJete(jetes, itemId, tx, ty, tileSize) {
  return [...(jetes || []), { item: itemId, x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize }];
}

// Le plus proche objet jeté à portée — et, sur une pile, celui du DESSUS (le
// dernier posé) : `<=` sur la distance, en parcourant la liste dans l'ordre,
// fait gagner le plus récent à égalité. Même forme de retour que
// `trouverItemProche`, pour que l'appelant compare les deux sans cas à part.
export function trouverObjetJeteProche(jetes, hero, distanceMax) {
  let meilleur = null;
  let meilleureDistance = Infinity;
  (jetes || []).forEach((p, index) => {
    const distance = Math.hypot(hero.x - p.x, hero.y - p.y);
    if (distance <= distanceMax && distance <= meilleureDistance) {
      meilleureDistance = distance;
      meilleur = { itemId: p.item, index, position: p, distance };
    }
  });
  return meilleur;
}

export function retirerObjetJete(jetes, index) {
  return jetes.filter((_, i) => i !== index);
}

// Décalage de DESSIN d'un objet dans sa pile (0 = le premier posé). Sans lui,
// cinq objets au même centre se dessineraient les uns sur les autres et la
// pile se lirait comme un seul objet. Purement visuel : la position logique,
// celle qu'on ramasse, ne bouge pas.
const DECALAGES_PILE_PX = [[0, 0], [3, -1], [-3, -2], [2, -3], [-2, -4]];
export function decalageDansPile(rang) {
  return DECALAGES_PILE_PX[rang % DECALAGES_PILE_PX.length];
}

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

// Tire une position libre (tuile non solide, dans une zone autorisée, hors
// zones exclues, pas déjà occupée) via un hash déterministe (seed scène ^
// graine passée par l'appelant) — jamais Math.random(), pour rester
// reproductible en test. Renvoie null si aucune position trouvée après un
// nombre borné d'essais (§4 edge case : carte saturée, jamais de boucle
// infinie).
function tirerPositionLibre(scene, zonesAutorisees, zonesExclues, dejaOccupees, graine) {
  if (zonesAutorisees.length === 0) return null;
  const alea = mulberry32((scene.seed ^ graine) >>> 0);
  for (let essai = 0; essai < 60; essai++) {
    const zone = zonesAutorisees[Math.floor(alea() * zonesAutorisees.length)];
    const tx = zone.rect.x + Math.floor(alea() * zone.rect.w);
    const ty = zone.rect.y + Math.floor(alea() * zone.rect.h);
    if (zonesExclues.some((z) => dansRect(tx, ty, z.rect))) continue;
    const tuile = scene.tuileA(tx, ty);
    if (!tuile || tuile.solid) continue;
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

// Complète le stock d'items au sol de la scène jusqu'à `nb_au_sol` pour
// chaque item catalogue dont au moins une zone de spawn existe sur cette
// scène — un item sans zone en commun (ex. item de craft futur, Phase 3+)
// n'apparaît simplement jamais au sol ici, sans erreur.
export function remplirItemsSol(scene, items, existant, compteurDepart = 0) {
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
      const position = tirerPositionLibre(scene, zonesAutorisees, zonesExclues, positions, compteur);
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
export function tickRespawns(scene, items, itemsSol, enAttente, deltaMs, compteurDepart) {
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
      const zonesAutorisees = zonesDuType(scene, item.spawn.zones);
      const zonesExclues = zonesDuType(scene, item.spawn.zones_exclues);
      compteur += 1;
      const position = tirerPositionLibre(scene, zonesAutorisees, zonesExclues, itemsSolSuivant[itemId] || [], compteur);
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

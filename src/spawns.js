// Apparitions (specs/07_chaos-nocturne.md, palier A) : où un monstre a le
// droit de naître, et quelle position exacte on lui tire. Pur, testé, aucun
// accès DOM, aucun monstre en jeu à ce palier — c'est la géométrie et le
// tirage seuls.
//
// Discipline reprise de ground_items.js, volontairement à l'identique : PRNG
// injectable (jamais Math.random(), pour qu'un test rejoue la même nuit), et
// nombre d'essais BORNÉ (§4 edge case : carte saturée, jamais de boucle
// infinie). `calculerTuilesAtteignables` est IMPORTÉ de ground_items.js et
// non recopié — la spec l'exige, et une 2ᵉ implémentation du BFS finirait par
// diverger de celle qui filtre déjà les items au sol.

import { mulberry32 } from './decor.js';
import { calculerTuilesAtteignables } from './ground_items.js';

export { calculerTuilesAtteignables };

const ESSAIS_MAX = 60;

function dansRect(tx, ty, rect) {
  return tx >= rect.x && tx < rect.x + rect.w && ty >= rect.y && ty < rect.y + rect.h;
}

// Les rectangles d'une zone, par id OU par type — un `domaine` de spawns.json
// peut nommer les deux (« champ_nord » ou « champs »), et un Champ en L est
// justement deux rectangles qui partagent un id de groupe.
export function rectanglesDeZone(scene, nom) {
  const noms = Array.isArray(nom) ? nom : [nom];
  return (scene.zones || []).filter((z) => noms.includes(z.id) || noms.includes(z.type)).map((z) => z.rect);
}

export function rectanglesZonesSures(scene) {
  return (scene.zones || []).filter((z) => z.type === 'zone_sure').map((z) => z.rect);
}

// « Le monstre est-il (ou serait-il) en zone sûre ? » — en TUILES, et sur la
// position du MONSTRE, jamais sur celle du joueur (§2.3 règle 4 : c'est la
// prochaine position du monstre qui déclenche le demi-tour). Le palier C s'en
// sert pour faire demi-tour ; le palier A, pour ne jamais y faire naître
// personne.
export function estEnZoneSure(scene, tx, ty) {
  return rectanglesZonesSures(scene).some((rect) => dansRect(tx, ty, rect));
}

export function estEnZoneSurePx(scene, x, y) {
  return estEnZoneSure(scene, Math.floor(x / scene.tileSize), Math.floor(y / scene.tileSize));
}

// Tire une position d'apparition dans `zoneId`, en pixels monde (centre de
// tuile), ou `null` si aucune ne convient après ESSAIS_MAX essais.
//
// Une position convient si elle est : dans un rectangle de la zone · sur une
// tuile non solide · ATTEIGNABLE depuis le héros (même raison qu'au respawn
// des items : la forêt procédurale isole des poches de tuiles libres, et un
// monstre né dans l'une d'elles ne rencontrerait jamais personne) · hors de
// TOUTE zone sûre · à au moins `distanceMinTuiles` du joueur (on ne surgit
// pas dans son dos) · pas déjà occupée par un autre monstre.
//
// `tuilesAtteignables` optionnel (null = pas de filtre) : calculé une fois
// par entrée en scène par l'appelant, jamais par frame.
export function tirerPositionApparition(scene, {
  zoneId,
  hero,
  distanceMinTuiles = 0,
  dejaOccupees = [],
  graine = 1,
  tuilesAtteignables = null,
  // `specs/15` palier D : une exclusion de plus, en PIXELS (la lumière d'une
  // torche plantée n'est pas une zone de la carte). Testée APRÈS le tirage,
  // sans consommer de nombre : sans elle, les tirages restent identiques.
  exclue = null,
}) {
  // `zoneId` accepte un tableau : c'est ainsi qu'un **domaine** (une liste de
  // zones, palier C) se tire avec la même fonction qu'une zone d'apparition.
  const rects = rectanglesDeZone(scene, zoneId);
  if (rects.length === 0) return null;

  const alea = mulberry32((scene.seed ^ graine) >>> 0);
  const distanceMinPx = distanceMinTuiles * scene.tileSize;

  for (let essai = 0; essai < ESSAIS_MAX; essai += 1) {
    const rect = rects[Math.floor(alea() * rects.length)];
    const tx = rect.x + Math.floor(alea() * rect.w);
    const ty = rect.y + Math.floor(alea() * rect.h);

    if (estEnZoneSure(scene, tx, ty)) continue;
    const tuile = scene.tuileA(tx, ty);
    if (!tuile || tuile.solid) continue;
    if (tuilesAtteignables && !tuilesAtteignables.has(`${tx},${ty}`)) continue;

    const x = (tx + 0.5) * scene.tileSize;
    const y = (ty + 0.5) * scene.tileSize;

    if (hero && distanceMinPx > 0 && Math.hypot(hero.x - x, hero.y - y) < distanceMinPx) continue;
    if (exclue && exclue(x, y)) continue;
    const occupee = dejaOccupees.some(
      (p) => Math.floor(p.x / scene.tileSize) === tx && Math.floor(p.y / scene.tileSize) === ty,
    );
    if (occupee) continue;

    return { x, y };
  }
  return null;
}

// Tables d'apparition qui concernent cette scène. Rien d'autre : le palier A
// ne fait naître personne, il dit seulement « voici ce qui s'appliquerait
// ici ». Le tri par id garde un ordre stable d'une exécution à l'autre.
export function tablesDeScene(spawns, sceneId) {
  return spawns.filter((s) => s.scene === sceneId).sort((a, b) => (a.id < b.id ? -1 : 1));
}

// « Cette table a-t-elle le droit de faire naître quelqu'un, là, maintenant ? »
// Deux questions distinctes, volontairement séparées :
//   - la PHASE du cycle (la nuit, et elle seule, au palier 1) ;
//   - la CONDITION, évaluée par le registre de conditions existant
//     (`flags.js#evaluate`), jamais par un test de niveau écrit ici — la spec
//     l'interdit, et c'est ce qui rendra le palier Nv. 10 purement data.
// Une table sans `condition` est toujours ouverte.
export function tableActive(table, { phase, evaluerCondition }) {
  if (!table.phases.includes(phase)) return false;
  if (table.condition === undefined || table.condition === null) return true;
  return !!evaluerCondition(table.condition);
}

// Point d'errance : une position au hasard du **domaine** du monstre (palier
// C). C'est exactement le tirage d'apparition, sans la distance minimale au
// joueur — errer près de lui est permis, naître près de lui ne l'est pas.
export function tirerPointDomaine(scene, { domaine, graine = 1, tuilesAtteignables = null }) {
  return tirerPositionApparition(scene, { zoneId: domaine, graine, tuilesAtteignables });
}

// Signal visuel des zones de Chaos (palier D) : de quoi la nuit doit avoir
// l'air, en pixels monde, prêt à dessiner. Pur — le rendu n'a plus qu'à
// peindre. Rien n'est renvoyé si la table est fermée (mauvaise phase, niveau
// trop bas) : on ne fait pas miroiter une zone qui ne produira rien.
//
// L'intensité suit **l'obscurité de la scène**, donc la teinte monte avec la
// nuit et disparaît de jour sans condition supplémentaire ; la pulsation suit
// l'horloge de temps de jeu actif, la même que tout le reste — gelée sous UI
// par construction, jamais une 2ᵉ horloge.
export function zonesSignalees(scene, tables, { phase, evaluerCondition, opacite, opaciteMax, heureMs }) {
  const zones = [];
  for (const table of tables) {
    if (!table.signal) continue;
    if (!tableActive(table, { phase, evaluerCondition })) continue;
    const intensiteNuit = opaciteMax > 0 ? Math.max(0, Math.min(1, opacite / opaciteMax)) : 0;
    if (intensiteNuit <= 0) continue;
    // Pulsation douce : 75 % à 100 % de l'alpha, jamais d'extinction complète
    // (on doit pouvoir la deviner à n'importe quel instant).
    const periode = table.signal.pulsation_ms || 0;
    const pulsation = periode > 0 ? 0.875 + 0.125 * Math.sin((heureMs / periode) * Math.PI * 2) : 1;
    const alpha = table.signal.alpha * intensiteNuit * pulsation;
    for (const rect of rectanglesDeZone(scene, table.zone_apparition)) {
      zones.push({
        rect: {
          x: rect.x * scene.tileSize,
          y: rect.y * scene.tileSize,
          w: rect.w * scene.tileSize,
          h: rect.h * scene.tileSize,
        },
        couleur: table.signal.couleur,
        alpha,
      });
    }
  }
  return zones;
}

// La SALLE NETTOYÉE (spec 14, §4.3) : les monstres posés par les `spawns` de
// la scène sont tous tombés. Ceux d'une table d'apparition (`spawnId`, le
// Chaos) n'en font pas partie : ils reviennent chaque nuit, une salle ne se
// nettoie pas d'eux. Une scène entrée sans aucun monstre à elle (déjà
// nettoyée, ou dont la condition les a retenus) n'est pas « nettoyée » à
// nouveau : rien n'est tombé.
//
// Ceux d'une RENCONTRE (`rencontre.js`, Zéros) non plus : ils arrivent après,
// et l'un d'eux est intouchable — il ne tomberait jamais.
export function sceneNettoyee(monstres) {
  const aElle = monstres.filter((m) => !m.spawnId && !m.rencontre);
  return aElle.length > 0 && aElle.every((m) => m.mort);
}

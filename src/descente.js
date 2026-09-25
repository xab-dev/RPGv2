// La DESCENTE sous une stèle (spec 14, §4.1 et §4.2) — rien à voir avec la
// « descente » d'Auto dans les réglages graphiques (`main.js#majDescenteAuto`),
// qui parle d'un preset qui baisse.
//
// Une stèle qui déclare `descente: { scene, flag_requis }` est une ENTRÉE :
// une fois `flag_requis` posé, sa vue rapprochée gagne l'action Descendre, qui
// mène au point d'arrivée de `scene`. Chaque entrée par la stèle commence une
// descente neuve : l'état de la précédente (salle nettoyée, leviers, passages
// ouverts) est remis à zéro.
//
// CE QUI EST REMIS À ZÉRO se déclare sur les SCÈNES (`descente: { flags }`),
// jamais dans le code, et jamais sur la stèle : la stèle ne connaît que la
// première salle. L'Annexe entière, c'est la scène d'arrivée et toutes celles
// qu'on atteint depuis elle par des portails en restant dans des scènes qui
// déclarent une `descente`. Une Annexe 2 avec quatre salles se déclare donc de
// la même façon, sans une ligne de plus ici.
//
// Pur : lit les entrées brutes de `scenes.json`, ne touche ni aux flags, ni aux
// interactifs, ni à la sauvegarde. `main.js#commencerDescente` applique.

// Les scènes de la descente qui commence à `sceneEntree`, dans l'ordre où on
// les rencontre. Le parcours s'arrête aux scènes sans `descente` : le portail
// de sortie qui mène dehors ne fait pas de la carte Maison une salle de l'Annexe.
export function scenesDeLaDescente(scenes, sceneEntree) {
  const parId = new Map(scenes.map((s) => [s.id, s]));
  const vues = [];
  const aVisiter = [sceneEntree];
  const dejaVues = new Set();
  while (aVisiter.length > 0) {
    const id = aVisiter.shift();
    if (dejaVues.has(id)) continue;
    dejaVues.add(id);
    const scene = parId.get(id);
    if (!scene || !scene.descente) continue;
    vues.push(id);
    for (const portail of scene.portails || []) aVisiter.push(portail.cible);
  }
  return vues;
}

// LES flags que l'entrée par la stèle remet à zéro : ceux de toutes les salles
// de la descente, sans doublon.
export function flagsDeLaDescente(scenes, sceneEntree) {
  const parId = new Map(scenes.map((s) => [s.id, s]));
  const flags = new Set();
  for (const id of scenesDeLaDescente(scenes, sceneEntree)) {
    for (const flag of parId.get(id).descente.flags) flags.add(flag);
  }
  return [...flags];
}

// LES interactifs des salles de la descente. Leur état (un levier actionné)
// vit dans `save.puzzles`, pas dans un flag : l'entrée par la stèle le remet
// à zéro avec les flags (§4.2, « leviers » fait partie de l'état de la
// descente). Déduit des scènes, comme les flags : jamais une liste à tenir.
export function interactifsDeLaDescente(scenes, sceneEntree) {
  const parId = new Map(scenes.map((s) => [s.id, s]));
  const ids = new Set();
  for (const id of scenesDeLaDescente(scenes, sceneEntree)) {
    for (const interactif of parId.get(id).interactifs || []) ids.add(interactif);
  }
  return [...ids];
}

// L'action Descendre existe-t-elle sur cette stèle, maintenant ? Seulement si
// la stèle DÉCLARE une descente (jamais un `if` sur son id) et que son flag est
// posé : la stèle rouge et celle d'argile gardent leur vue sans action.
export function descenteDisponible(puzzle, estPose) {
  return !!(puzzle && puzzle.descente && estPose(puzzle.descente.flag_requis));
}

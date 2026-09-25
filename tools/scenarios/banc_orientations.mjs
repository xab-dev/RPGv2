// OUTIL DE DEV : ouvre `tools/banc_orientations.html` sous Chrome SANS FENÊTRE
// et en capture le rendu — les huit directions d'une silhouette en rose des
// vents, à la taille du jeu et agrandies.
//   node tools/capture_chrome.mjs tools/scenarios/banc_orientations.mjs
//   RPG_IDS=visuel_heros RPG_SORTIE=docs/captures/scenarios/orientations.png
import { ORIGINE } from './commun.mjs';

export default async function (chrome) {
  const id = process.env.RPG_IDS || 'visuel_heros';
  await chrome.taille(1400, 920, 1);
  await chrome.ouvrir(`${ORIGINE}/tools/banc_orientations.html?id=${id}`);
  await chrome.attendre(700);
  await chrome.capture(process.env.RPG_SORTIE || 'docs/captures/scenarios/orientations.png');
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

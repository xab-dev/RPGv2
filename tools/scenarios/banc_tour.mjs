// OUTIL DE DEV : ouvre `tools/banc_tour.html` (spec 16) sous Chrome SANS
// FENÊTRE, à un angle donné, et en capture le rendu.
//   node tools/capture_chrome.mjs tools/scenarios/banc_tour.mjs
//   RPG_ANGLE=200 RPG_SORTIE=docs/captures/scenarios/tour.png
import { ORIGINE } from './commun.mjs';

export default async function (chrome) {
  await chrome.taille(760, 420, 1);
  await chrome.ouvrir(`${ORIGINE}/tools/banc_tour.html`);
  await chrome.attendre(400);
  await chrome.evaluer(`(() => { const r = document.getElementById('angle'); r.value = ${Number(process.env.RPG_ANGLE ?? 200)}; r.dispatchEvent(new Event('input')); return true; })()`);
  await chrome.capture(process.env.RPG_SORTIE || 'docs/captures/scenarios/tour.png');
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

// OUTIL DE DEV : ouvre `tools/banc_visuel.html` sous Chrome SANS FENÊTRE et
// en capture le rendu — le banc aux tailles réelles, sans avoir à ouvrir un
// navigateur à la main au milieu d'une file de tickets.
//   RPG_IDS=visuel_icone_main node tools/capture_chrome.mjs tools/scenarios/banc_visuel.mjs
// Plusieurs ids séparés par des virgules : c'est la comparaison côte à côte
// qui dit si une silhouette tient le standing de ses voisines.
import { ORIGINE } from './commun.mjs';

export default async function (chrome) {
  const ids = process.env.RPG_IDS || 'visuel_icone_main';
  await chrome.taille(1200, 900, 1);
  await chrome.ouvrir(`${ORIGINE}/tools/banc_visuel.html?id=${ids}`);
  await chrome.attendre(700);
  await chrome.capture(process.env.RPG_SORTIE || 'docs/captures/banc.png');
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

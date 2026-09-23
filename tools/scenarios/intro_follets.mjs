// La cinématique d'une partie NEUVE (paupières, trois follets en orbite) —
// vérifie en scène le dessin des follets (`D-162`) là où les trois sont
// ensemble. OUTIL DE DEV : node tools/capture_chrome.mjs tools/scenarios/intro_follets.mjs
import { ouvrirLeJeu } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/polish-diagnostic-2026-09-23';
export default async function (chrome) {
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080 });
  for (const ms of [2500, 4000]) {
    await chrome.attendre(ms);
    await chrome.capture(`${DOSSIER}/intro_${ms}.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

// Le symbole du jeu avant le cold-open (ticket L3, journal du 23/09) : une
// partie NEUVE, capturée pendant l'apparition des signes puis quand les trois
// tiennent. OUTIL DE DEV : node tools/capture_chrome.mjs tools/scenarios/logo_ouverture.mjs
import { ouvrirLeJeu } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/logo-2026-09-23';
export default async function (chrome) {
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080 });
  let t = 0;
  for (const ms of [100, 700, 1500, 2600]) {
    await chrome.attendre(ms - t);
    t = ms;
    await chrome.capture(`${DOSSIER}/ouverture_${ms}.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

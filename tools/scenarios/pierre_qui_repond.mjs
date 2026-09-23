// La pierre qui répond (24/09) : la pierre la nuit, sa gravure, l'étincelle
// dans son coin, sous le profil PC. OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/pierre_qui_repond.mjs
// Le verdict reste celui de Xav, en jeu (`V-130`).
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { PHASES_CYCLE } from '../../src/daynight.js';

const DOSSIER = 'docs/captures/scenarios/pierre-qui-repond';
const NUIT = PHASES_CYCLE.slice(0, 2).reduce((s, p) => s + p.duree_ms, 0) + PHASES_CYCLE.find((p) => p.nom === 'nuit').duree_ms / 2;

export default async function (chrome) {
  const pierre = saveDansLaMaison();
  pierre.hero.x = 21.5 * 32;
  pierre.hero.y = 46 * 32 + 35;
  pierre.monde.heure = NUIT;
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: pierre });
  await chrome.capture(`${DOSSIER}/nuit_monde.png`);
  await chrome.touche('KeyE');
  await chrome.attendre(1500);
  await chrome.capture(`${DOSSIER}/nuit_vue.png`);

  const coin = saveDansLaMaison();
  coin.hero.x = 2.5 * 32;
  coin.hero.y = 2.5 * 32;
  coin.monde.heure = 60_000;
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: coin });
  await chrome.capture(`${DOSSIER}/jour_coin.png`);
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

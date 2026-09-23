// La cinématique d'une partie NEUVE sous les trois réglages graphiques —
// convergence des trois follets, écran de choix, départ des deux non élus.
// OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/intro_reglages.mjs
//   QUALITES=haut SUFFIXE=apres node tools/capture_chrome.mjs tools/scenarios/intro_reglages.mjs
// Né d'un relevé de Xav (23/09) : « bas, moyen, haut ne font pas de
// différence » pendant la sélection du follet. Ce que ça prouve : « ça
// s'affiche ainsi sous Chrome ». Le verdict reste une validation de Xav.
import { ouvrirLeJeu } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/intro-reglages-2026-09-23';
const SUFFIXE = process.env.SUFFIXE || 'etat';
const QUALITES = (process.env.QUALITES || 'bas,moyen,haut').split(',');

export default async function (chrome) {
  for (const qualite of QUALITES) {
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, requete: `?qualite=${qualite}` });
    await chrome.attendre(3000);
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${qualite}_1_convergence.png`);
    // Le dialogue « Trois feux follets… » s'ouvre à la fin de l'intro : un
    // appui le ferme et ouvre l'écran de choix, un second choisit.
    await chrome.attendre(6500);
    await chrome.touche('Space');
    await chrome.attendre(900);
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${qualite}_2_choix.png`);
    await chrome.touche('Space');
    await chrome.attendre(200);
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${qualite}_3_depart.png`);
    console.log(qualite, chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
  }
}

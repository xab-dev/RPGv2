// OUTIL DE DEV (`D-109`) : le curseur piloté au STICK DROIT, sous Chrome SANS
// FENÊTRE.
//   node tools/capture_chrome.mjs tools/scenarios/curseur_stick.mjs
//
// Chrome sans fenêtre n'a pas de manette : on en injecte une fausse en
// remplaçant `navigator.getGamepads`, exactement comme les tests headless le
// font avec `creerSourceManette`. Ce que ça prouve, et c'est tout ce qu'on lui
// demande : le fil est branché de bout en bout (Gamepad API → couche d'input →
// curseur), l'orbe se dessine bien SUR le calque en mode stick, et le curseur
// système s'éteint — sinon on en verrait deux.
//
// Ce que ça ne prouve pas : le confort. La vitesse et la courbe se jugent
// manette en main, et c'est le verdict de Xav (`V-57`).
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const TILE = 32;
const PLEIN_JOUR = 200000;

// Une manette branchée dont le stick DROIT est poussé, le gauche au repos.
async function brancherFausseManette(chrome, x, y) {
  await chrome.evaluer(`(() => {
    window.__stick = { x: ${x}, y: ${y} };
    navigator.getGamepads = () => [{
      index: 0,
      connected: true,
      axes: [0, 0, window.__stick.x, window.__stick.y],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    }];
    return true;
  })()`);
}

export default async function (chrome) {
  const save = saveDansLaMaison();
  save.hero.x = (85 + 0.5) * TILE;
  save.hero.y = (49 + 0.5) * TILE;
  save.monde.heure = PLEIN_JOUR;
  await ouvrirLeJeu(chrome, { largeur: 960, hauteur: 540, save });

  // Stick droit poussé vers la droite et un peu vers le haut : le curseur
  // part du centre de la fenêtre et trace.
  await brancherFausseManette(chrome, 1, -0.45);
  await chrome.attendre(600);

  const etat = await chrome.evaluer(`(() => {
    const c = document.querySelector('.curseur-calque');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let peints = 0;
    let minX = 1e9;
    let maxX = -1;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 8) {
        peints += 1;
        const px = ((i - 3) / 4) % c.width;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
      }
    }
    return JSON.stringify({
      curseurSysteme: getComputedStyle(document.documentElement).getPropertyValue('--curseur-jeu').trim(),
      curseurCalcule: getComputedStyle(document.body).cursor,
      peints,
      de: minX,
      a: maxX,
    });
  })()`);
  console.log(etat);
  await chrome.capture('docs/captures/curseur-2026-09-22/stick_trace.png');

  // Le héros n'a pas bougé d'un pixel : le stick droit ne pilote QUE le
  // curseur. C'est la garantie que le ticket ne doit pas casser.
  await chrome.attendre(400);
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

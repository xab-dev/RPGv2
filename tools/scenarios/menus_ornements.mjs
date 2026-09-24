// OUTIL DE DEV (`D-193`) : les ornements des menus — la case sélectionnée
// sous Bas (rien ne bouge), Moyen (la lueur respire) et Haut (+ braises), avec
// le follet de feu (l'accent le plus chaud) et celui d'eau.
//   node tools/capture_chrome.mjs tools/scenarios/menus_ornements.mjs
// Une capture fige une animation : elle dit que la lueur et les braises
// EXISTENT et prennent la bonne couleur, jamais qu'elles bougent bien. Le
// mouvement se juge en jeu (Xav).
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/menus-ornements-2026-09-24';

export default async function (chrome) {
  for (const compagnon of ['comp_follet_feu', 'comp_follet_eau']) {
    for (const qualite of ['bas', 'moyen', 'haut']) {
      await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: saveDansLaMaison({ compagnon }), requete: `?qualite=${qualite}` });
      await chrome.touche('Escape');
      await chrome.attendre(1300); // mi-souffle : la lueur au plus large
      const nom = `${compagnon.replace('comp_follet_', '')}_${qualite}`;
      await chrome.capture(`${DOSSIER}/racine_${nom}.png`);
      await chrome.touche('Space');
      await chrome.touche('Space');
      await chrome.attendre(1300);
      await chrome.capture(`${DOSSIER}/poche_${nom}.png`);
      const etat = await chrome.evaluer(`(() => {
        const c = document.querySelector('.carte-focus');
        const st = c && getComputedStyle(c);
        return { ornements: document.documentElement.dataset.ornements, animation: st && st.animationName, fonds: st && st.backgroundImage.split('radial-gradient').length - 1 };
      })()`);
      console.log(nom, JSON.stringify(etat), chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
    }
  }
}

// Palier C de specs/08_menus-cartes.md : les écrans « maître-détail » DANS LE JEU,
// aux deux tailles de la spec, sur une partie injectée « dans la Maison » (profil
// jetable). Chaque écran est ouvert par de vraies touches, capturé, mesuré.
//   node tools/capture_chrome.mjs tools/scenarios/ecrans_palier_c.mjs [poche|stats|…]
// Un écran qui n'a pas encore migré est capturé tel qu'il est : la comparaison
// avant / après se lit dans l'historique du dossier de captures.
import { ouvrirLeJeu, saveDansLaMaison, cliquer, mesurerEcrans } from './commun.mjs';

const DOSSIER = 'docs/captures/menus-cartes-2026-09-20/palier-c';
const seulement = process.argv[3] || null;

// Comment ouvrir chaque écran depuis le jeu nu (touches réelles).
const ECRANS = {
  poche: async (chrome) => { await chrome.touche('Escape'); await chrome.touche('Space'); await chrome.touche('Space'); },
  stats: async (chrome) => { await chrome.touche('Escape'); await chrome.touche('Space'); await chrome.touche('ArrowRight'); await chrome.touche('Space'); },
  construction: async (chrome) => { await chrome.touche('Escape'); await cliquer(chrome, '[data-carte="carte_construction"]'); },
};

const mesurerFiches = (chrome) => chrome.evaluer(`(() => {
  const e = document.querySelector('.ecran-fiches:not([hidden])');
  if (!e) return null;
  const d = (s) => { const x = e.querySelector(s); return x ? [x.scrollWidth - x.clientWidth, x.scrollHeight - x.clientHeight] : null; };
  const textes = [...e.querySelectorAll('.tuile-nom, .fiche-titre, .fiche-action')].filter((x) => x.scrollWidth > x.clientWidth).map((x) => x.textContent);
  return { debordeCorps: d('.fiches-corps'), debordeTuiles: d('.fiches-tuiles'), debordeFiche: d('.fiche'), debordeLignes: d('.fiche-lignes'), textesCoupes: textes };
})()`);

export default async function (chrome) {
  for (const [largeur, hauteur] of [[703, 280], [1920, 1080]]) {
    for (const [nom, ouvrir] of Object.entries(ECRANS)) {
      if (seulement && seulement !== nom) continue;
      const save = saveDansLaMaison();
      save.hero.points_stats_libres = 2;
      save.hero.equipement.consommable = 'item_fruit';
      await ouvrirLeJeu(chrome, { largeur, hauteur, save });
      await ouvrir(chrome);
      await chrome.capture(`${DOSSIER}/c_${nom}_${largeur}x${hauteur}.png`);
      console.log(largeur, nom, JSON.stringify(await mesurerEcrans(chrome)), JSON.stringify(await mesurerFiches(chrome)));
      const erreurs = chrome.erreurs();
      if (erreurs.length) console.log(largeur, nom, 'ERREURS CONSOLE', JSON.stringify(erreurs));
    }
  }
}

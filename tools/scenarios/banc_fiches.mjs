// Palier C1 : le composant « maître-détail » SEUL, sur le banc d'essai, aux deux
// tailles de la spec — poche (8 tuiles), coffre (deux groupes, la grille défile),
// vide. Mesure ce que Node ne peut pas : ce qui déborde.
//   node tools/capture_chrome.mjs tools/scenarios/banc_fiches.mjs
import { ORIGINE } from './commun.mjs';

const DOSSIER = 'docs/captures/menus-cartes-2026-09-20/palier-c';
const mesurer = (chrome) => chrome.evaluer(`(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const d = (s) => { const e = document.querySelector(s); return e ? [e.scrollWidth - e.clientWidth, e.scrollHeight - e.clientHeight] : null; };
  return {
    fenetre: [innerWidth, innerHeight], entete: r('.ecran-fiches .cartes-entete'), tuiles: r('.fiches-tuiles'), fiche: r('.fiche'),
    tuile: r('.tuile'), action: r('.fiche-action'), sortie: r('.ecran-fiches [data-sortie]'),
    debordeCorps: d('.fiches-corps'), debordeTuiles: d('.fiches-tuiles'), debordeFiche: d('.fiche'), debordeLignes: d('.fiche-lignes'),
  };
})()`);

export default async function (chrome) {
  for (const [largeur, hauteur] of [[703, 280], [1920, 1080]]) {
    for (const ecran of ['poche', 'coffre', 'vide']) {
      await chrome.taille(largeur, hauteur);
      await chrome.ouvrir(`${ORIGINE}/tools/banc_menu_cartes.html?follet=eau&ecran=${ecran}`);
      await chrome.attendre(700);
      if (ecran === 'coffre') { for (let i = 0; i < 4; i++) await chrome.touche('ArrowDown'); }
      await chrome.capture(`${DOSSIER}/c1_banc_${ecran}_${largeur}x${hauteur}.png`);
      console.log(largeur, ecran, JSON.stringify(await mesurer(chrome)));
    }
    console.log(largeur, 'erreurs console', JSON.stringify(chrome.erreurs()));
  }
}

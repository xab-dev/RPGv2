// Les Indices du menu (demande de Xav, 23/09) : la carte qui prend la case
// contextuelle hors de la Maison, puis l'écran, illisible (Nv.1) et lisible
// (Nv.15), sous les trois profils. OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/indices.mjs
import { ouvrirLeJeu, saveDansLaMaison, cliquer, mesurerEcrans, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/indices-2026-09-23';
const mesurerFiches = (chrome) => chrome.evaluer(`(() => {
  const e = document.querySelector('.ecran-fiches:not([hidden])');
  if (!e) return null;
  const d = (s) => { const x = e.querySelector(s); return x ? [x.scrollWidth - x.clientWidth, x.scrollHeight - x.clientHeight] : null; };
  return { debordeCorps: d('.fiches-corps'), debordeFiche: d('.fiche'), titre: (e.querySelector('.fiche-titre') || {}).textContent,
    lignes: [...e.querySelectorAll('.fiche-ligne, .fiche-lignes > *')].map((x) => x.textContent) };
})()`);

export default async function (chrome) {
  for (const profil of PROFILS) {
    for (const niveau of [1, 15]) {
      const save = saveDansLaMaison();
      // Dehors, sur le chemin, loin de toute structure (même point que test_d43_a4).
      save.hero.x = 60.5 * 32;
      save.hero.y = 57.5 * 32;
      save.hero.niveau = niveau;
      await ouvrirLeJeu(chrome, { ...profil, save });
      await chrome.touche('Escape');
      if (niveau === 1) await chrome.capture(`${DOSSIER}/${profil.nom}_racine.png`);
      await cliquer(chrome, '[data-carte="carte_indices"]');
      await chrome.capture(`${DOSSIER}/${profil.nom}_nv${niveau}.png`);
      console.log(profil.nom, niveau, JSON.stringify(await mesurerEcrans(chrome)), JSON.stringify(await mesurerFiches(chrome)));
    }
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

// La stèle (demande de Xav, 23/09) : dans sa clairière de jour et de nuit, puis
// sa vue rapprochée, sous les trois profils. OUTIL DE DEV :
//   node tools/capture_chrome.mjs tools/scenarios/stele.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';
import { PHASES_CYCLE } from '../../src/daynight.js';

const DOSSIER = 'docs/captures/scenarios/stele-2026-09-23';
// Le milieu de la nuit : les deux premières phases passées, plus la moitié de la nuit.
const NUIT = PHASES_CYCLE.slice(0, 2).reduce((s, p) => s + p.duree_ms, 0) + PHASES_CYCLE.find((p) => p.nom === 'nuit').duree_ms / 2;

export default async function (chrome) {
  for (const profil of PROFILS) {
    for (const [moment, heure] of [['jour', 60_000], ['nuit', NUIT]]) {
      const save = saveDansLaMaison();
      // Juste sous la stèle (tuile 21, 68), à portée d'INTERACT.
      save.hero.x = 21.5 * 32;
      save.hero.y = 68 * 32 + 35;
      save.monde.heure = heure;
      await ouvrirLeJeu(chrome, { ...profil, save });
      await chrome.capture(`${DOSSIER}/${profil.nom}_${moment}_monde.png`);
      if (moment === 'nuit' && profil.nom !== 'pc') continue;
      await chrome.touche('KeyE');
      // PS1 : un instant dans le fondu d'entrée.
      await chrome.attendre(110);
      await chrome.capture(`${DOSSIER}/${profil.nom}_${moment}_fondu.png`);
      await chrome.attendre(1400);
      await chrome.capture(`${DOSSIER}/${profil.nom}_${moment}_vue.png`);
      await chrome.touche('Digit3');
      await chrome.attendre(600);
      await chrome.capture(`${DOSSIER}/${profil.nom}_${moment}_ferme.png`);
    }
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

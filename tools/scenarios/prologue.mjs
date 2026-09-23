// Le prologue avant le symbole (`specs/12_prologue.md`) : une partie NEUVE,
// chaque écran capturé une fois posé, sous les trois profils, puis le symbole
// qui prend la suite. OUTIL DE DEV : node tools/capture_chrome.mjs tools/scenarios/prologue.mjs
import { ouvrirLeJeu, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/prologue-2026-09-23';
export default async function (chrome) {
  for (const profil of PROFILS) {
    await ouvrirLeJeu(chrome, profil);
    for (let ecran = 1; ecran <= 4; ecran++) {
      // Armement (≤ 1,5 s) passé, fondu d'entrée fini : l'écran tel qu'il attend.
      await chrome.attendre(1800);
      await chrome.capture(`${DOSSIER}/${profil.nom}_ecran_${ecran}.png`);
      await chrome.touche('Space');
      await chrome.attendre(900);
    }
    await chrome.attendre(1500);
    await chrome.capture(`${DOSSIER}/${profil.nom}_symbole.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

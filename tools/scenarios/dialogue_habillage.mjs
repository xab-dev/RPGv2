// `D-169` — L'HABILLAGE DE LA BULLE DE DIALOGUE. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/dialogue_habillage.mjs
//
// La conversation du chapitre 1 (le follet parle, trois options), sous les
// trois réglages graphiques : Bas (rien ne bouge), Moyen (la lueur des
// flèches), Haut (les étincelles autour du portrait). Deux captures par
// réglage, à 400 ms d'écart, pour voir la lueur respirer. Profils grand et
// téléphone : le portrait doit se lire aux deux tailles.
//
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome », jamais « c'est
// beau » — ça, c'est la validation en jeu de Xav.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';
import { readFileSync } from 'node:fs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/dialogue-habillage';
const AMBIANCES = JSON.parse(readFileSync('data/ambiances.json', 'utf8'));

export default async function (chrome) {
  for (const profil of PROFILS.filter((p) => p.nom !== 'pc')) {
    for (const reglage of ['bas', 'moyen', 'haut']) {
      const save = saveDansLaMaison();
      save.hero.niveau = 15;
      save.settings.graphismes = reglage;
      delete save.flags[AMBIANCES.find((a) => a.dialogue === 'dlg_chapitre_1').flag];
      await chrome.evaluer(`new Promise((r) => { const q = indexedDB.deleteDatabase('rpg_v2'); q.onsuccess = q.onerror = q.onblocked = () => r(true); })`).catch(() => {});
      await ouvrirLeJeu(chrome, { ...profil, save });
      await chrome.attendre(5000);
      await chrome.capture(`${DOSSIER}/${profil.nom}_${reglage}_a.png`);
      await chrome.attendre(400);
      await chrome.capture(`${DOSSIER}/${profil.nom}_${reglage}_b.png`);
    }
  }
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

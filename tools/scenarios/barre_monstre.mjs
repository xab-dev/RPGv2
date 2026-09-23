// `D-165` — la barre de PV d'un monstre engagé, vue en scène. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/barre_monstre.mjs
// Salle 2 de la Grotte avant le combat du tutoriel ; le héros marche vers le
// monstre (D réel) jusqu'à l'engager, un coup (Espace), capture.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const TUILE = 32;
export default async function (chrome) {
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_grotte_salle_2';
  save.hero.x = 8.5 * TUILE;
  save.hero.y = 9.5 * TUILE;
  for (const f of ['flag_grotte_monstre_tue', 'flag_grotte_sortie', 'flag_grotte_sequence']) delete save.flags[f];
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
  // Ferme la réplique d'alerte du follet, puis avance vers le monstre.
  for (let i = 0; i < 4; i++) { await chrome.touche('KeyE', 60); await chrome.attendre(250); }
  await chrome.touche('KeyD', 900);
  await chrome.attendre(300);
  await chrome.capture('docs/captures/scenarios/polish-diagnostic-2026-09-23/d165_barre.png');
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

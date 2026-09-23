// `D-158` — le geste d'un levier, capturé à plusieurs instants. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/levier.mjs
//
// Le héros est posé sous le levier de la salle 1, levier éteint ; un appui
// RÉEL sur E (le verbe INTERACT au clavier), puis des captures échelonnées :
// pendant le geste, voyant tout juste allumé, halo monté. Les instants sont
// approximatifs (le pilotage CDP a sa propre latence) : c'est la SUITE des
// images qui compte, pas la milliseconde. Le verdict reste à Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/polish-diagnostic-2026-09-23';
const TUILE = 32;

export default async function (chrome) {
  const save = saveDansLaMaison();
  save.hero.scene = 'scene_grotte_salle_1';
  save.hero.x = 10.5 * TUILE;
  save.hero.y = 7.2 * TUILE;
  delete save.flags.flag_levier_salle1;
  save.puzzles = {};
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
  await chrome.capture(`${DOSSIER}/levier_0_avant.png`);
  await chrome.touche('KeyE', 40);
  for (const [nom, ms] of [['1_geste', 40], ['2_butee', 160], ['3_halo', 700]]) {
    await chrome.attendre(ms);
    await chrome.capture(`${DOSSIER}/levier_${nom}.png`);
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

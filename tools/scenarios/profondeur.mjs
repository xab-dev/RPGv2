// `D-222` — LA PROFONDEUR, vue en scène : le héros contre un arbre de la
// Maison, arrêté par la collision au NORD (il doit passer derrière le
// feuillage) puis au SUD (devant le tronc). L'arbre est celui que
// `tests/test_d222_profondeur` trouve (35, 2), les positions sont celles où la
// collision l'arrête.
//   node tools/capture_chrome.mjs tools/scenarios/profondeur.mjs
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/profondeur';
const TILE = 32;
const PLEIN_JOUR = 200000;

function save(heroY) {
  const s = saveDansLaMaison({ compagnon: 'comp_follet_eau' });
  s.hero.x = (35 + 0.5) * TILE;
  s.hero.y = heroY;
  s.monde.heure = PLEIN_JOUR;
  return s;
}

export default async function (chrome) {
  for (const [nom, heroY] of [['nord', 57], ['sud', 103]]) {
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save(heroY) });
    await chrome.capture(`${DOSSIER}/scene_${nom}.png`);
    console.log(nom, chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
  }
}

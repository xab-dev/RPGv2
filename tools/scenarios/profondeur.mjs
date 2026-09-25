// `D-222` — LA PROFONDEUR, vue en scène : le héros contre un arbre de la
// Maison, arrêté par la collision au NORD (il doit passer derrière le
// feuillage) puis au SUD (devant le tronc). L'arbre est celui que
// `tests/test_d222_profondeur` trouve (35, 2). `D-223` : une troisième vue,
// le héros à côté du tronc, le pied dans la bande du fondu (l'arbre à moitié
// par-dessus lui), avec une loupe.
//   node tools/capture_chrome.mjs tools/scenarios/profondeur.mjs
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/profondeur';
const TILE = 32;
const PLEIN_JOUR = 200000;

function save(heroY, heroX = (35 + 0.5) * TILE) {
  const s = saveDansLaMaison({ compagnon: 'comp_follet_eau' });
  s.hero.x = heroX;
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
  // À côté du tronc (la forme de `D-224` le permet), le pied 1 px au nord de
  // celui de l'arbre : dans la bande, l'arbre repassé à un peu moins de moitié.
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save(89, (35 + 0.5) * TILE + 17) });
  await chrome.capture(`${DOSSIER}/scene_fondu.png`);
  await loupe(chrome, { x: 200, y: 55, largeur: 80, hauteur: 45 }, `${DOSSIER}/loupe_fondu.png`);
  console.log('fondu', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

  // Ce qu'on TRAVERSE : une touffe d'herbe du décor de la Maison (Moyen), le
  // pied du héros 2 px au nord du sien — la touffe repassée aux 5/8, peinte
  // en bloc par le canvas à part. Le héros est au centre de la vue.
  const touffe = { x: 2754.56, y: 2543.83 };
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save(touffe.y - 2 - 7, touffe.x) });
  await loupe(chrome, { x: 210, y: 115, largeur: 60, hauteur: 34 }, `${DOSSIER}/loupe_fondu_touffe.png`);
  console.log('touffe', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

// Une fenêtre en unités LOGIQUES agrandie au plus proche voisin (même loupe
// que `heros_scene.mjs`) ; la hauteur est choisie pour que l'agrandissement
// tienne dans la capture.
async function loupe(chrome, { x, y, largeur, hauteur }, sortie) {
  await chrome.evaluer(`(() => {
    const jeu = document.querySelector('canvas');
    const k = jeu.width / 480;
    const vue = document.createElement('canvas');
    const zoom = Math.max(1, Math.floor(innerWidth / (${largeur} * k)));
    vue.width = ${largeur} * k * zoom; vue.height = ${hauteur} * k * zoom;
    vue.id = 'loupe';
    vue.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#101317';
    const ctx = vue.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(jeu, ${x} * k, ${y} * k, ${largeur} * k, ${hauteur} * k, 0, 0, vue.width, vue.height);
    document.body.append(vue);
    return true;
  })()`);
  await chrome.capture(sortie);
  await chrome.evaluer(`(() => { document.getElementById('loupe').remove(); return true; })()`);
}

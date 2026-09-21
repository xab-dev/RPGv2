// `D-104` — la silhouette du héros, VUE EN SCÈNE. Le banc visuel la juge sur
// un fond neutre CHOISI ; la scène la pose sur la terre de la Maison, sous la
// lumière du moment. C'est la leçon de l'établi (21/09) : trois itérations au
// banc, puis noyé dans le sol à la première capture de jeu.
//   node tools/capture_chrome.mjs tools/scenarios/heros_scene.mjs
// Quatre vues : les trois teintes de compagnon en plein jour (la boule du
// visage EST la couleur du follet, donc une seule ne prouve rien) et la nuit,
// seul moment où l'on voit si la lueur « éclaire » sans percer le voile.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { saveNeuve } from '../../src/save.js';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/heros-2026-09-22';
const TILE = 32;
const PLEIN_JOUR = 200000;   // ms dans le cycle (daynight.js) : phase `jour`, à plat
const PLEINE_NUIT = 810000;  // milieu des 4 minutes de nuit franche

// Le héros DEHORS, sur la terre du Jardin, loin d'une station : on juge la
// silhouette contre le sol réel, pas contre un meuble.
function save(compagnon, heure) {
  const s = saveDansLaMaison({ compagnon });
  s.hero.x = (85 + 0.5) * TILE;
  s.hero.y = (49 + 0.5) * TILE;
  s.monde.heure = heure;
  return s;
}

// Même loupe que `hud_polish.mjs` : une fenêtre en unités LOGIQUES (480 x 270)
// agrandie au plus proche voisin. Le héros fait 14 px de haut — à la taille de
// la capture, on ne verrait ni le liseré de la capuche ni la lueur du visage.
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

// Le héros est au centre du viewport logique tant que la caméra n'est pas
// bornée sur un bord de carte — ce qui est le cas au milieu du Jardin.
const AUTOUR_DU_HEROS = { x: 214, y: 124, largeur: 52, hauteur: 52 };

export default async function (chrome) {
  for (const [compagnon, nom] of [
    ['comp_follet_feu', 'feu'], ['comp_follet_eau', 'eau'], ['comp_follet_terre', 'terre'],
  ]) {
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save(compagnon, PLEIN_JOUR) });
    await chrome.capture(`${DOSSIER}/scene_jour_${nom}.png`);
    await loupe(chrome, AUTOUR_DU_HEROS, `${DOSSIER}/loupe_jour_${nom}.png`);
    console.log(nom, chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
  }

  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save('comp_follet_eau', PLEINE_NUIT) });
  await chrome.capture(`${DOSSIER}/scene_nuit_eau.png`);
  await loupe(chrome, AUTOUR_DU_HEROS, `${DOSSIER}/loupe_nuit_eau.png`);
  console.log('nuit', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

  // La Grotte, partie NEUVE : le héros n'a pas encore choisi son follet, donc
  // sa teinte est le gris neutre (`save.js#COULEUR_HERO_NEUTRE`) — un visage
  // qui luit en gris dans le noir. C'est la toute première image du jeu, et
  // la seule où la silhouette se juge sans couleur.
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: saveNeuve() });
  await chrome.attendre(9000); // l'intro (clignements + orbite) dure ~8 s
  await chrome.capture(`${DOSSIER}/scene_grotte_neutre.png`);
  await loupe(chrome, AUTOUR_DU_HEROS, `${DOSSIER}/loupe_grotte_neutre.png`);
  console.log('grotte', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

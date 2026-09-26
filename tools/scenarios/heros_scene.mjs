// `D-104` — la silhouette du héros, VUE EN SCÈNE. Le banc visuel la juge sur
// un fond neutre CHOISI ; la scène la pose sur la terre de la Maison, sous la
// lumière du moment. C'est la leçon de l'établi (21/09) : trois itérations au
// banc, puis noyé dans le sol à la première capture de jeu.
//   node tools/capture_chrome.mjs tools/scenarios/heros_scene.mjs
// Quatre vues : les trois teintes de compagnon en plein jour (la boule du
// visage EST la couleur du follet, donc une seule ne prouve rien) et la nuit,
// seul moment où l'on voit si la lueur « éclaire » sans percer le voile.
import { ouvrirLeJeu, saveDansLaMaison, loupe, AUTOUR_DU_HEROS } from './commun.mjs';
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

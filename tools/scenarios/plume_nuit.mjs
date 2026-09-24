// OUTIL DE DEV (`D-191`) : la plume la nuit — au sol, sous les trois réglages,
// puis de jour pour comparer, et dans la Poche.
//   node tools/capture_chrome.mjs tools/scenarios/plume_nuit.mjs
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict (le trait
// brille-t-il sans éclairer, le filet est-il assez discret) revient à Xav.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/plume-nuit-2026-09-24';
const TILE = 32;
const NUIT = 800000; // ms dans le cycle (daynight.js) : phase `nuit`
const JOUR = 200000;

function save(heure) {
  const s = saveDansLaMaison();
  s.monde.heure = heure;
  // Au nord de la Maison, sur de la terre nue (le coin de `jeter.mjs`).
  s.hero.x = (85 + 0.5) * TILE;
  s.hero.y = (49 + 0.5) * TILE;
  s.monde.items_sol = { scene_maison_exterieur: {} };
  s.monde.jour_items_sol = { scene_maison_exterieur: s.monde.jour };
  // Deux plumes posées à côté du héros, et une dans la poche.
  s.monde.objets_jetes = { scene_maison_exterieur: [
    { item: 'item_plume', x: (87 + 0.5) * TILE, y: (49 + 0.5) * TILE },
    { item: 'item_plume', x: (86 + 0.5) * TILE, y: (51 + 0.5) * TILE },
  ] };
  s.inventaire.items = { item_plume: 1, item_branche: 4, item_caillou: 4 };
  return s;
}

export default async function (chrome) {
  for (const qualite of ['bas', 'moyen', 'haut']) {
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save(NUIT), requete: `?qualite=${qualite}` });
    await chrome.attendre(700);
    await chrome.capture(`${DOSSIER}/nuit_${qualite}.png`);
    console.log(qualite, chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
  }
  await chrome.touche('Escape');
  await chrome.touche('Space');
  await chrome.touche('Space');
  await chrome.attendre(300);
  await chrome.capture(`${DOSSIER}/nuit_poche.png`);
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save(JOUR) });
  await chrome.attendre(500);
  await chrome.capture(`${DOSSIER}/jour.png`);
  console.log('jour', chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

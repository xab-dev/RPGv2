// OUTIL DE DEV (`specs/15`) : la torche, vue sous Chrome — la nuit, tenue en
// main (lumière autour du héros, icône allumée au HUD), et plantée (palier C).
//   node tools/capture_chrome.mjs tools/scenarios/torche.mjs
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict revient à Xav.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/torche-2026-09-24';
const TILE = 32;
const NUIT = 800000; // ms dans le cycle (daynight.js) : phase `nuit`

export function saveTorche({ heure = NUIT, plantees = [] } = {}) {
  const s = saveDansLaMaison();
  s.monde.heure = heure;
  // Au nord de la Maison, sur de la terre nue (le coin de `jeter.mjs`).
  s.hero.x = (85 + 0.5) * TILE;
  s.hero.y = (49 + 0.5) * TILE;
  s.monde.items_sol = { scene_maison_exterieur: {} };
  s.monde.jour_items_sol = { scene_maison_exterieur: s.monde.jour };
  s.inventaire.items = { item_torche: 2, item_branche: 4 };
  s.hero.equipement = { arme: 'weapon_torche', consommable: null };
  if (plantees.length) s.monde.objets_plantes = { scene_maison_exterieur: plantees };
  return s;
}

export default async function (chrome) {
  const cas = (process.env.CAS || 'tenue').split(',');
  if (cas.includes('tenue')) {
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: saveTorche() });
    await chrome.attendre(700);
    await chrome.capture(`${DOSSIER}/nuit_tenue.png`);
    console.log('tenue', chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
  }
  if (cas.includes('plantee')) {
    const plantees = [
      { item: 'item_torche', x: (89 + 0.5) * TILE, y: (47 + 0.5) * TILE, restant_ms: 200000 },
      { item: 'item_torche', x: (81 + 0.5) * TILE, y: (48 + 0.5) * TILE, restant_ms: 330000 },
    ];
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: saveTorche({ plantees }), requete: process.env.QUALITE ? `?qualite=${process.env.QUALITE}` : '' });
    await chrome.attendre(700);
    await chrome.capture(`${DOSSIER}/nuit_plantees.png`);
    console.log('plantee', chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
  }
}

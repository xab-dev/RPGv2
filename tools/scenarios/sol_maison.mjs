// « Le grain du sol » — LE SOL DE LA MAISON, VU EN SCÈNE. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/sol_maison.mjs
//
// Pourquoi ce scénario et pas le banc visuel : le banc juge une silhouette sur
// un fond neutre CHOISI, or ici l'objet du ticket EST le fond. Ce qu'on veut
// voir ne tient dans aucune vignette — la répétition d'une tuile sur quinze
// tuiles de large, la couture entre deux surfaces, la densité d'un motif à
// l'échelle d'un écran. Ça ne se regarde qu'en scène (leçon de l'établi, 21/09).
//
// Les postes d'observation sont CALCULÉS depuis les vrais catalogues (une
// position recopiée mentirait au premier coup de crayon dans `scenes.json`) :
// une pelouse franche loin de tout, une lisière de forêt, le chemin, le puits
// du Jardin, l'intérieur de la Maison.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/sol-2026-09-22';
const ETIQUETTE = process.env.RPG_ETIQUETTE || 'apres'; // `avant` pour le témoin
const TILE = 32;
const PLEIN_JOUR = 200000; // ms dans le cycle (daynight.js) : phase `jour`, à plat

async function postes() {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  const scene = chargerScene(construireRegistre(donnees), 'scene_maison_exterieur');
  const idA = (x, y) => { const t = scene.tuileA(x, y); return t ? t.id : null; };
  const cx = Math.floor(scene.width / 2);
  const cy = Math.floor(scene.height / 2);
  const distanceAuCentre = (a, b) => (a[0] - cx) ** 2 + (a[1] - cy) ** 2 - ((b[0] - cx) ** 2 + (b[1] - cy) ** 2);

  const herbeFranche = [];
  const lisieres = [];
  const chemins = [];
  for (let y = 9; y < scene.height - 9; y++) {
    for (let x = 9; x < scene.width - 9; x++) {
      const ici = idA(x, y);
      if (ici === 'tile_chemin') chemins.push([x, y]);
      if (ici !== 'tile_herbe') continue;
      // Lisière : la forêt à trois tuiles à l'ouest, la pelouse à l'est.
      if (idA(x - 3, y) === 'tile_arbre_fond' && idA(x + 5, y) === 'tile_herbe') lisieres.push([x, y]);
      let franche = true;
      for (let dy = -8; dy <= 8 && franche; dy++) {
        for (let dx = -8; dx <= 8; dx++) if (idA(x + dx, y + dy) !== 'tile_herbe') { franche = false; break; }
      }
      if (franche) herbeFranche.push([x, y]);
    }
  }
  const parquets = [];
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) if (idA(x, y) === 'tile_parquet') parquets.push([x, y]);
  }
  const milieu = (liste) => liste[Math.floor(liste.length / 2)];
  const puits = scene.empreintesSolides.find((e) => e.id === 'station_puits');

  return [
    ['pelouse', herbeFranche.sort(distanceAuCentre)[0]],
    ['lisiere', lisieres.sort(distanceAuCentre)[0]],
    ['chemin', milieu(chemins)],
    ['parquet', milieu(parquets)],
  ].map(([nom, [x, y]]) => ({ nom, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }))
    .concat(puits ? [{ nom: 'puits', x: puits.x - 26, y: puits.y + puits.h + 26 }] : []);
}

// Même loupe que `heros_scene.mjs` : une fenêtre en unités LOGIQUES (480 × 270)
// agrandie au plus proche voisin, parce qu'une tuile fait 32 unités et que le
// grain qu'on juge se compte en pixels de tuile.
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

// Quatre tuiles de côté, prises à gauche du héros pour ne pas le photographier
// lui : ce qu'on juge est le sol, pas la silhouette.
const CARRE_DE_SOL = { x: 60, y: 108, largeur: 128, hauteur: 128 };

export default async function (chrome) {
  for (const poste of await postes()) {
    const save = saveDansLaMaison();
    save.hero.x = poste.x;
    save.hero.y = poste.y;
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
    await chrome.capture(`${DOSSIER}/${ETIQUETTE}_${poste.nom}.png`);
    await loupe(chrome, CARRE_DE_SOL, `${DOSSIER}/${ETIQUETTE}_${poste.nom}_loupe.png`);
    console.log(poste.nom, Math.round(poste.x / TILE), Math.round(poste.y / TILE),
      chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
  }
}

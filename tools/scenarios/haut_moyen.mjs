// « Haut se voit » — la MÊME vue sous Moyen puis sous Haut. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/haut_moyen.mjs
//   RPG_QUALITES=moyen,haut (défaut)  RPG_POSTES=parquet,pelouse,marche,nuit,chemin
//   RPG_ETIQUETTE=apres (préfixe des fichiers)
//
// Ce qu'un preset change ne se juge qu'à côté de l'autre : chaque poste est
// donc pris sous chaque preset, forcé par `?qualite=` (le réglage du profil
// jetable n'est jamais touché). Postes calculés depuis les vrais catalogues,
// jamais recopiés (même règle que `sol_maison.mjs`).
//
// `marche` capture PENDANT l'appui d'une touche : une traînée n'existe que
// quand le héros bouge. `nuit` pose l'horloge en pleine nuit : les halos et
// les ornements du follet ne se voient que là.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/haut-2026-09-22';
const ETIQUETTE = process.env.RPG_ETIQUETTE || 'apres';
const QUALITES = (process.env.RPG_QUALITES || 'moyen,haut').split(',');
const CHOIX = (process.env.RPG_POSTES || 'parquet,pelouse,marche,nuit').split(',');
const TILE = 32;
const PLEIN_JOUR = 200000; // ms dans le cycle (daynight.js) : phase `jour`
const PLEINE_NUIT = 12 * 60 * 1000 + 60000; // après jour (10 min) + crépuscule (1 min 30)

async function postes() {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  const scene = chargerScene(construireRegistre(donnees), 'scene_maison_exterieur');
  const idA = (x, y) => { const t = scene.tuileA(x, y); return t ? t.id : null; };
  const parquets = [];
  const chemins = [];
  let pelouse = null;
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      if (idA(x, y) === 'tile_parquet') parquets.push([x, y]);
      if (idA(x, y) === 'tile_chemin') chemins.push([x, y]);
    }
  }
  // La pelouse la plus proche de la Maison qui soit franche sur 7 tuiles :
  // c'est là que le joueur passe, et là que le décor se juge.
  const [mx, my] = parquets[Math.floor(parquets.length / 2)];
  let meilleure = Infinity;
  for (let y = 8; y < scene.height - 8; y++) {
    for (let x = 8; x < scene.width - 8; x++) {
      let franche = true;
      for (let dy = -7; dy <= 7 && franche; dy++) {
        for (let dx = -7; dx <= 7; dx++) if (idA(x + dx, y + dy) !== 'tile_herbe') { franche = false; break; }
      }
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (franche && d < meilleure) { meilleure = d; pelouse = [x, y]; }
    }
  }
  const px = (c) => (c + 0.5) * TILE;
  return {
    parquet: { x: px(mx), y: px(my), heure: PLEIN_JOUR },
    pelouse: { x: px(pelouse[0]), y: px(pelouse[1]), heure: PLEIN_JOUR },
    marche: { x: px(pelouse[0]) - 3 * TILE, y: px(pelouse[1]), heure: PLEIN_JOUR, marche: true },
    nuit: { x: px(pelouse[0]), y: px(pelouse[1]), heure: PLEINE_NUIT },
    // Le chemin, au milieu de sa longueur : c'est là que Xav a vu le
    // « champ de cailloux » (`D-135`).
    chemin: { x: px(chemins[Math.floor(chemins.length / 2)][0]), y: px(chemins[Math.floor(chemins.length / 2)][1]), heure: PLEIN_JOUR },
  };
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function (chrome) {
  const tous = await postes();
  for (const nom of CHOIX) {
    const poste = tous[nom];
    for (const qualite of QUALITES) {
      const save = saveDansLaMaison();
      save.hero.x = poste.x;
      save.hero.y = poste.y;
      save.monde.heure = poste.heure;
      await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save, requete: `?qualite=${qualite}` });
      const sortie = `${DOSSIER}/${ETIQUETTE}_${nom}_${qualite}.png`;
      if (poste.marche) {
        // Appui long NON attendu : la capture tombe en pleine marche.
        const appui = chrome.touche('KeyD', 1400);
        await attendre(900);
        await chrome.capture(sortie);
        await appui;
      } else {
        await chrome.attendre(600);
        await chrome.capture(sortie);
      }
      console.log(nom, qualite, chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
    }
  }
}

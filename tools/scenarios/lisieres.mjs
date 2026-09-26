// « Les lisières » (`specs/13` palier D, `Q-52`) — LE BORD DU CHEMIN, VU EN
// SCÈNE. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/lisieres.mjs
//
// Même raison que `sol_maison.mjs` : l'objet du ticket EST le fond, le banc
// visuel ne sait pas le juger. On regarde en scène, à la taille du jeu, puis à
// la loupe (plus proche voisin).
//
// Les postes sont CALCULÉS depuis les vrais catalogues : le milieu du chemin
// (ses deux bords), ses deux bouts (les angles saillants), et chaque objet posé
// sur le chemin (l'arbre à récolter : sa surface est le chemin, l'herbe doit
// mordre dessous). `RPG_QUALITE=bas|moyen|haut` choisit le preset.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirLeJeu, saveDansLaMaison, loupe } from './commun.mjs';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/lisieres';
const ETIQUETTE = process.env.RPG_ETIQUETTE || 'apres'; // `avant` pour le témoin
const QUALITE = process.env.RPG_QUALITE || '';
const TILE = 32;
const PLEIN_JOUR = 200000; // ms dans le cycle (daynight.js) : phase `jour`, à plat

async function postes() {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  const scene = chargerScene(construireRegistre(donnees), 'scene_maison_exterieur');
  const idA = (x, y) => { const t = scene.tuileA(x, y); return t ? t.id : null; };
  const chemins = [];
  const surLeChemin = [];
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const t = scene.tuileA(x, y);
      if (!t) continue;
      if (t.id === 'tile_chemin') chemins.push([x, y]);
      else if (t.render && t.render.sol === 'tile_chemin') surLeChemin.push([x, y]);
    }
  }
  chemins.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const ys = chemins.map(([, y]) => y);
  const yMilieu = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
  const xs = chemins.filter(([, y]) => y === yMilieu).map(([x]) => x);
  const liste = [
    ['milieu', [xs[Math.floor(xs.length / 2)], yMilieu]],
    ['bout_ouest', [Math.min(...xs) + 2, yMilieu]],
    ['bout_est', [Math.max(...xs) - 2, yMilieu]],
    ...surLeChemin.map(([x, y], i) => [`objet_${i}_${idA(x, y)}`, [x + 2, y]]),
  ];
  return liste.map(([nom, [x, y]]) => ({ nom, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
}

// Le héros est au centre de l'écran (240, 135), au milieu du chemin : la loupe
// prend ses deux bords, à sa gauche pour ne pas le photographier.
const BANDE = { x: 40, y: 70, largeur: 190, hauteur: 130 };

export default async function (chrome) {
  const suffixe = QUALITE ? `_${QUALITE}` : '';
  for (const poste of await postes()) {
    const save = saveDansLaMaison();
    save.hero.x = poste.x;
    save.hero.y = poste.y;
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, {
      largeur: 1920, hauteur: 1080, save, requete: QUALITE ? `?qualite=${QUALITE}` : '',
    });
    await chrome.capture(`${DOSSIER}/${ETIQUETTE}_${poste.nom}${suffixe}.png`);
    await loupe(chrome, BANDE, `${DOSSIER}/${ETIQUETTE}_${poste.nom}${suffixe}_loupe.png`);
    console.log(poste.nom, Math.floor(poste.x / TILE), Math.floor(poste.y / TILE),
      chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
  }
}

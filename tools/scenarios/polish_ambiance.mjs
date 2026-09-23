// Polish « ambiance » du 23/09 — LE DÉCOR, VU EN SCÈNE, de jour et de nuit. OUTIL DE DEV.
//   SUFFIXE=avant node tools/capture_chrome.mjs tools/scenarios/polish_ambiance.mjs
//   POSTES=lisiere,grotte_1 SUFFIXE=apres node tools/capture_chrome.mjs tools/scenarios/polish_ambiance.mjs
//
// Un poste = une case du layout où poser le héros, une heure. Les cases de la
// Maison sont CALCULÉES depuis les vrais catalogues (une position recopiée
// mentirait au premier coup de crayon dans `scenes.json`), celles de la Grotte
// sont des cases de sol de ses deux salles. Ce que ça prouve : « ça s'affiche
// ainsi sous Chrome ». Le verdict reste une validation de Xav, en jeu.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';

const DOSSIER = 'docs/captures/scenarios/polish-ambiance-2026-09-23';
const SUFFIXE = process.env.SUFFIXE || 'etat';
const TUILE = 32;
const PLEIN_JOUR = 200000; // ms dans le cycle (daynight.js) : phase `jour`
const PLEINE_NUIT = 810000; // ms dans le cycle : milieu de la phase `nuit`

async function postesMaison() {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  const scene = chargerScene(construireRegistre(donnees), 'scene_maison_exterieur');
  const idA = (x, y) => { const t = scene.tuileA(x, y); return t ? t.id : null; };
  const lisieres = [];
  const clairieres = [];
  const pres = { tile_arbre: [], tile_arbre_fruitier: [], tile_rocher: [] };
  for (let y = 9; y < scene.height - 9; y++) {
    for (let x = 9; x < scene.width - 9; x++) {
      const ici = idA(x, y);
      if (pres[ici]) pres[ici].push([x, y]);
      if (ici !== 'tile_herbe') continue;
      if (idA(x - 3, y) === 'tile_arbre_fond' && idA(x + 5, y) === 'tile_herbe') lisieres.push([x, y]);
      // Une clairière DANS la forêt : de l'herbe, des arbres de fond tout autour.
      let arbres = 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -6; dx <= 6; dx++) if (idA(x + dx, y + dy) === 'tile_arbre_fond') arbres++;
      if (x < 60 && arbres > 45) clairieres.push([x, y]);
    }
  }
  const milieu = (l) => l[Math.floor(l.length / 2)];
  const aCote = ([x, y]) => [x + 1.5, y + 1.2];
  return {
    lisiere: milieu(lisieres).map((v) => v + 0.5),
    foret: milieu(clairieres).map((v) => v + 0.5),
    arbre: aCote(pres.tile_arbre[0]),
    fruitier: aCote(pres.tile_arbre_fruitier[0]),
    rocher: aCote(pres.tile_rocher[0]),
  };
}

export default async function (chrome) {
  const maison = await postesMaison();
  const POSTES = {
    lisiere: { scene: 'scene_maison_exterieur', case: maison.lisiere, heure: PLEIN_JOUR },
    lisiere_nuit: { scene: 'scene_maison_exterieur', case: maison.lisiere, heure: PLEINE_NUIT },
    foret: { scene: 'scene_maison_exterieur', case: maison.foret, heure: PLEIN_JOUR },
    foret_nuit: { scene: 'scene_maison_exterieur', case: maison.foret, heure: PLEINE_NUIT },
    chemin: { scene: 'scene_maison_exterieur', case: [21.8, 58.6], heure: PLEIN_JOUR },
    arbre: { scene: 'scene_maison_exterieur', case: maison.arbre, heure: PLEIN_JOUR },
    fruitier: { scene: 'scene_maison_exterieur', case: maison.fruitier, heure: PLEIN_JOUR },
    rocher: { scene: 'scene_maison_exterieur', case: maison.rocher, heure: PLEIN_JOUR },
    grotte_1: { scene: 'scene_grotte_salle_1', case: [9.5, 8.5], heure: PLEIN_JOUR },
    grotte_2: { scene: 'scene_grotte_salle_2', case: [9.5, 7.5], heure: PLEIN_JOUR },
    grotte_mur: { scene: 'scene_grotte_salle_1', case: [3.5, 3.5], heure: PLEIN_JOUR },
    grotte_tel: { scene: 'scene_grotte_salle_1', case: [9.5, 8.5], heure: PLEIN_JOUR, ecran: { largeur: 780, hauteur: 360, dpr: 3 } },
  };
  const choix = process.env.POSTES ? process.env.POSTES.split(',') : Object.keys(POSTES);
  for (const nom of choix) {
    const p = POSTES[nom];
    const save = saveDansLaMaison();
    save.hero.scene = p.scene;
    save.hero.x = p.case[0] * TUILE;
    save.hero.y = p.case[1] * TUILE;
    save.monde.heure = p.heure;
    await ouvrirLeJeu(chrome, { ...(p.ecran || { largeur: 1920, hauteur: 1080 }), save });
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${nom}.png`);
    const erreurs = chrome.erreurs();
    console.log(nom, p.case.map((v) => v.toFixed(1)).join(','), erreurs.length ? `ERREURS ${JSON.stringify(erreurs)}` : 'ok');
  }
}

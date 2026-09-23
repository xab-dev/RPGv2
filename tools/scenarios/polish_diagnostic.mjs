// File « diagnostic polish » du 23/09 — ce que la passe d'ambiance n'avait
// pas touché, VU EN SCÈNE. OUTIL DE DEV.
//   SUFFIXE=avant node tools/capture_chrome.mjs tools/scenarios/polish_diagnostic.mjs
//   POSTES=grotte_1,parquet SUFFIXE=apres node tools/capture_chrome.mjs tools/scenarios/polish_diagnostic.mjs
//
// Même patron que `polish_ambiance.mjs` : les cases de la Maison sont
// CALCULÉES depuis les vrais catalogues (une position recopiée mentirait au
// premier coup de crayon dans `scenes.json`). Un poste peut RETIRER des flags
// de la sauvegarde de base : la porte de la salle 2 ne se voit fermée que si
// la séquence n'est pas encore résolue. Ce que ça prouve : « ça s'affiche
// ainsi sous Chrome ». Le verdict reste une validation de Xav, en jeu.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
import { SCHEMAS } from '../../src/schemas.js';
import { construireRegistre } from '../../src/registry.js';
import { chargerCataloguesDepuisDisque } from '../../src/io_node.js';
import { chargerScene } from '../../src/scene.js';

const DOSSIER = 'docs/captures/scenarios/polish-diagnostic-2026-09-23';
const SUFFIXE = process.env.SUFFIXE || 'etat';
const TUILE = 32;
const PLEIN_JOUR = 200000; // ms dans le cycle (daynight.js) : phase `jour`

async function postesMaison() {
  const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { donnees } = await chargerCataloguesDepuisDisque(path.join(racine, 'data'), Object.keys(SCHEMAS));
  const scene = chargerScene(construireRegistre(donnees), 'scene_maison_exterieur');
  const idA = (x, y) => { const t = scene.tuileA(x, y); return t ? t.id : null; };
  const cases = { tile_parquet: [], tile_porte_maison: [] };
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const ici = idA(x, y);
      if (cases[ici]) cases[ici].push([x, y]);
    }
  }
  const milieu = (l) => l[Math.floor(l.length / 2)];
  // La porte la plus à l'est : c'est celle du chemin, celle qu'on voit en arrivant.
  const [px, py] = cases.tile_porte_maison.reduce((a, b) => (b[0] > a[0] ? b : a));
  return {
    parquet: milieu(cases.tile_parquet).map((v) => v + 0.5),
    // Trois pas à l'est de la porte, dehors : on la voit dans son mur.
    porte: [px + 3.5, py + 0.5],
  };
}

export default async function (chrome) {
  const maison = await postesMaison();
  const POSTES = {
    grotte_1: { scene: 'scene_grotte_salle_1', case: [9.5, 8.5] },
    grotte_2: { scene: 'scene_grotte_salle_2', case: [9.5, 7.5] },
    sortie_1: { scene: 'scene_grotte_salle_1', case: [16.5, 6.5] },
    porte_2_fermee: { scene: 'scene_grotte_salle_2', case: [16.5, 6.5], sansFlags: ['flag_grotte_sortie', 'flag_grotte_sequence'] },
    porte_2_ouverte: { scene: 'scene_grotte_salle_2', case: [16.5, 6.5] },
    monstre_grotte: { scene: 'scene_grotte_salle_2', case: [4.5, 6.5], sansFlags: ['flag_grotte_monstre_tue', 'flag_grotte_sortie', 'flag_grotte_sequence'] },
    grotte_tel: { scene: 'scene_grotte_salle_1', case: [9.5, 8.5], ecran: { largeur: 780, hauteur: 360, dpr: 3 } },
    pre: { scene: 'scene_maison_exterieur', case: [100.5, 55.5] },
    parquet: { scene: 'scene_maison_exterieur', case: maison.parquet },
    porte_maison: { scene: 'scene_maison_exterieur', case: maison.porte },
  };
  const choix = process.env.POSTES ? process.env.POSTES.split(',') : Object.keys(POSTES);
  for (const nom of choix) {
    const p = POSTES[nom];
    const save = saveDansLaMaison();
    save.hero.scene = p.scene;
    save.hero.x = p.case[0] * TUILE;
    save.hero.y = p.case[1] * TUILE;
    save.monde.heure = PLEIN_JOUR;
    for (const f of p.sansFlags || []) delete save.flags[f];
    await ouvrirLeJeu(chrome, { ...(p.ecran || { largeur: 1920, hauteur: 1080 }), save });
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${nom}.png`);
    const erreurs = chrome.erreurs();
    console.log(nom, p.case.map((v) => v.toFixed(1)).join(','), erreurs.length ? `ERREURS ${JSON.stringify(erreurs)}` : 'ok');
  }
}

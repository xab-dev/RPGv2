// Retouches graphiques du 22/09 (rocher, arbre du chemin, leviers, murs et
// toit de la Maison) DANS LE JEU : vrais pixels, vraie lumière, vrai sol.
//   SUFFIXE=avant POSTES=rocher,arbre node tools/capture_chrome.mjs tools/scenarios/retouches_decor.mjs
// Sans POSTES, tous les postes. Ce que ça prouve : « ça s'affiche ainsi sous
// Chrome ». Le verdict reste une validation de Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = 'docs/captures/retouches-2026-09-22';
const SUFFIXE = process.env.SUFFIXE || 'etat';
const TUILE = 32;

// Un poste = une scène, une case où poser le héros, une heure, des flags retirés.
// Les cases sont celles du layout (lettres `R`, `A`) et de la structure de la
// Maison dans scenes.json / puzzles.json.
const POSTES = {
  // Le rocher récoltable (lettre R), héros au sud-est, dans l'herbe.
  rocher: { scene: 'scene_maison_exterieur', x: 35.5, y: 63.2 },
  // L'arbre récoltable au milieu du chemin (lettre A), héros sur le chemin.
  arbre: { scene: 'scene_maison_exterieur', x: 21.8, y: 58.6 },
  // La Maison vue de l'est, toit opaque : héros assez loin pour que le toit
  // ne s'efface pas (structures.js#calculerOpaciteToit).
  toit: { scene: 'scene_maison_exterieur', x: 98.6, y: 57.5 },
  // Dedans, toit effacé : les murs se voient.
  murs: { scene: 'scene_maison_exterieur', x: 81.5, y: 60.5 },
  // Grotte, salle 1 : le levier éteint, puis allumé. L'état on/off vit dans
  // `save.puzzles[id].actif` (main.js), pas dans le flag qu'il pose.
  levier_eteint: { scene: 'scene_grotte_salle_1', x: 11.2, y: 7.4, retirer: ['flag_levier_salle1'] },
  levier_allume: { scene: 'scene_grotte_salle_1', x: 11.2, y: 7.4, puzzles: { puzzle_levier_salle1: { actif: true } } },
};

export default async function (chrome) {
  const choix = process.env.POSTES ? process.env.POSTES.split(',') : Object.keys(POSTES);
  for (const nom of choix) {
    const p = POSTES[nom];
    const save = saveDansLaMaison();
    save.hero.scene = p.scene;
    save.hero.x = p.x * TUILE;
    save.hero.y = p.y * TUILE;
    save.monde.heure = 0.25; // plein jour : la nuit cacherait ce qu'on regarde
    for (const f of p.retirer || []) delete save.flags[f];
    if (p.puzzles) save.puzzles = { ...save.puzzles, ...p.puzzles };
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
    await chrome.capture(`${DOSSIER}/${SUFFIXE}_${nom}.png`);
    const erreurs = chrome.erreurs();
    console.log(nom, erreurs.length ? `ERREURS CONSOLE ${JSON.stringify(erreurs)}` : 'ok');
  }
}

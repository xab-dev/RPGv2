// OUTIL DE DEV : une silhouette VUE EN JEU, à la loupe — sur le vrai sol, sous
// la vraie lumière, pendant un vrai geste. L'atelier juge un dessin sur un fond
// choisi ; la scène le pose dans le monde (la leçon de l'établi, 21/09 : trois
// itérations au banc, noyé dans le sol à la première capture de jeu).
// Généralise `heros_scene.mjs` et la marche filmée des sessions du héros
// (spec 17, palier A).
//
//   RPG_SORTIE=dossier node tools/capture_chrome.mjs tools/scenarios/loupe_scene.mjs
//
// Variables (toutes facultatives) :
//   RPG_CASE=85,49          la case où se tient le héros (Maison ; défaut : le Jardin)
//   RPG_HEURE=jour|nuit|<ms dans le cycle>
//   RPG_TEINTE=feu|eau|terre   le follet choisi
//   RPG_QUALITE=bas|moyen|haut
//   RPG_FENETRE=x,y,l,h     la fenêtre de la loupe, en unités logiques
//                           (défaut : autour du héros, `commun.mjs#AUTOUR_DU_HEROS`)
//   RPG_GESTES=KeyA:90,KeyA:400,-,KeyD:120
//                           une suite de gestes, une loupe après chacun :
//                           « touche:ms » tient la touche ms millisecondes
//                           (relâchée seulement quand la touche change),
//                           « - » relâche et attend 600 ms (l'arrêt, le souffle).
//   RPG_DPR=1               1920 × 1080 à ce DPR (3 : la densité d'un téléphone)
import { ouvrirLeJeu, saveDansLaMaison, loupe, AUTOUR_DU_HEROS } from './commun.mjs';

const TILE = 32;
// ms dans le cycle (daynight.js) : le plein jour à plat, le milieu de la nuit franche.
const HEURES = { jour: 200000, nuit: 810000 };

export default async function (chrome) {
  const sortie = process.env.RPG_SORTIE || 'docs/captures/scenarios/loupe_scene';
  const [cx, cy] = (process.env.RPG_CASE || '85,49').split(',').map(Number);
  const heure = HEURES[process.env.RPG_HEURE || 'jour'] ?? Number(process.env.RPG_HEURE);
  const fenetre = process.env.RPG_FENETRE
    ? Object.fromEntries(['x', 'y', 'largeur', 'hauteur'].map((k, i) => [k, Number(process.env.RPG_FENETRE.split(',')[i])]))
    : AUTOUR_DU_HEROS;

  const save = saveDansLaMaison({ compagnon: `comp_follet_${process.env.RPG_TEINTE || 'feu'}` });
  save.hero.x = (cx + 0.5) * TILE;
  save.hero.y = (cy + 0.5) * TILE;
  save.monde.heure = heure;
  const requete = process.env.RPG_QUALITE ? `?qualite=${process.env.RPG_QUALITE}` : '';
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, dpr: Number(process.env.RPG_DPR) || 1, save, requete });

  await loupe(chrome, fenetre, `${sortie}/0_depart.png`);
  const gestes = (process.env.RPG_GESTES || '').split(',').filter(Boolean);
  let tenue = null;
  for (const [i, geste] of gestes.entries()) {
    if (geste === '-') {
      if (tenue) await chrome.relacher(tenue);
      tenue = null;
      await chrome.attendre(600);
    } else {
      const [touche, ms] = geste.split(':');
      if (tenue !== touche) {
        if (tenue) await chrome.relacher(tenue);
        await chrome.enfoncer(touche);
        tenue = touche;
      }
      await chrome.attendre(Number(ms) || 0);
    }
    await loupe(chrome, fenetre, `${sortie}/${i + 1}_${geste.replace(':', '_')}.png`);
  }
  if (tenue) await chrome.relacher(tenue);
  await chrome.capture(`${sortie}/scene.png`);
  const erreurs = chrome.erreurs();
  console.log(erreurs.length ? `ERREURS ${JSON.stringify(erreurs)}` : 'ok');
  if (erreurs.length) process.exitCode = 1;
}

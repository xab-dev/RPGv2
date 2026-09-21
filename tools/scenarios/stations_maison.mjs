// Les stations refondues (`D-78`/`D-79`/`D-80`) DANS LE JEU, pas au banc :
// vrais pixels, vraie lumière de scène, vrai toit, à côté du puits qui sert de
// référence. Le banc juge une silhouette isolée sur fond neutre ; seule la
// scène dit si les quatre se tiennent ensemble.
//   node tools/capture_chrome.mjs tools/scenarios/stations_maison.mjs
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict reste une
// validation de Xav, en jeu (`V-51`).
import { ouvrirLeJeu, saveDansLaMaison, positionPresDe } from './commun.mjs';

const DOSSIER = 'docs/captures/stations-2026-09-21';

// Un poste d'observation par station, calculé depuis les vrais catalogues.
const POSTES = ['station_table', 'station_coffre', 'station_atelier', 'station_puits'];

export default async function (chrome) {
  for (const id of POSTES) {
    const save = saveDansLaMaison();
    Object.assign(save.hero, await positionPresDe(id));
    // Plein jour : la nuit et son voile cacheraient précisément ce qu'on vient
    // regarder. `save.monde.heure` est l'horloge du cycle (daynight.js).
    save.monde.heure = 0.25;
    await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save });
    await chrome.capture(`${DOSSIER}/${id}_1920x1080.png`);
    const erreurs = chrome.erreurs();
    console.log(id, erreurs.length ? `ERREURS CONSOLE ${JSON.stringify(erreurs)}` : 'ok');
  }
}

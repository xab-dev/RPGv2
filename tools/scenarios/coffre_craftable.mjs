// `D-121` (T5) : le coffre craftable, sous Chrome, aux trois profils.
//
// Ce que ça prouve : « ça s'affiche ainsi, et la chaîne tient dans un vrai
// navigateur ». Le verdict reste une validation de Xav en jeu (`V-66`) — en
// particulier la seule question que des pixels ne peuvent pas trancher : est-ce
// que trier à la main dans cinq coffres est agréable ou pénible ?
//
//   node tools/capture_chrome.mjs tools/scenarios/coffre_craftable.mjs
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/coffre-2026-09-22';

// La sauvegarde du ticket : au Nv.10, de quoi payer, et la recette EXACTE en
// poche — trois slots pleins, le quatrième libre. C'est le cas que Xav doit
// retrouver manette en main (`V-66`).
function savePretePourLeCoffre() {
  const save = saveDansLaMaison();
  save.monde.heure = 0.25;
  save.hero.niveau = 10;
  save.hero.xp = 290; // xp_cumulee du Nv.10 — le niveau est recalculé depuis l'XP
  save.inventaire.eclats = 60;
  save.inventaire.items = { item_bois: 5, item_branche: 5, item_herbe: 5 };
  return save;
}

// Cinq coffres déjà posés en rangée dans la pièce : l'état qu'on ne peut pas
// atteindre en trois clics, et qui est pourtant la vraie question du ticket.
// Les coordonnées viennent de l'intérieur déclaré par `scenes.json`
// (x 79, y 51, 14 × 12) — recopiées ici parce qu'un scénario de capture n'a
// pas de registre, mais lisibles à côté de lui.
function saveAvecCinqCoffres() {
  const save = savePretePourLeCoffre();
  for (let n = 0; n < 5; n += 1) {
    save.maison.stations[`coffre_${n}`] = {
      type: 'station_type_coffre',
      scene: 'scene_maison_exterieur',
      x: 80 + n * 2,
      y: 52,
      rotation: 0,
      contenu: n === 0 ? { item_bois: 12 } : { item_pierre: 3 + n },
    };
  }
  return save;
}

export default async function (chrome) {
  for (const { nom, largeur, hauteur, dpr } of PROFILS) {
    const suffixe = `${nom}_${largeur}x${hauteur}`;

    // --- 1. La recette à l'Atelier -----------------------------------------
    await ouvrirLeJeu(chrome, { largeur, hauteur, dpr, save: savePretePourLeCoffre() });
    await chrome.capture(`${DOSSIER}/jeu_${suffixe}.png`);
    console.log(nom, 'jeu', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

    // --- 2. Cinq coffres posés, et le sixième en placement ------------------
    await ouvrirLeJeu(chrome, { largeur, hauteur, dpr, save: saveAvecCinqCoffres() });
    await chrome.capture(`${DOSSIER}/cinq_coffres_${suffixe}.png`);
    console.log(nom, 'cinq coffres', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
  }
}

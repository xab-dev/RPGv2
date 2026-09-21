// La passe de polish de l'INTERFACE (22/09) : ce que le HUD montre vraiment,
// sous Chrome, dans les deux états qui comptent — le bandeau du haut (follet,
// PV, éclats, faim, soif, buffs, niveau) et la barre du bas (l'arme équipée
// réduite à une case de 12 unités).
//   node tools/capture_chrome.mjs tools/scenarios/hud_polish.mjs
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict reste une
// validation de Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/hud-2026-09-22';
const TILE = 32;

// Un état volontairement CHARGÉ : jauges à mi-course (une jauge pleine ne dit
// rien du remplissage), PV entamés, deux buffs actifs de stats différentes,
// un niveau à deux chiffres. C'est l'état où le bandeau a le plus à montrer.
function saveChargee() {
  const save = saveDansLaMaison();
  save.monde.heure = 0.25; // plein jour
  save.hero.x = (85 + 0.5) * TILE;
  save.hero.y = (49 + 0.5) * TILE;
  save.hero.pv = 17;
  save.hero.niveau = 12;
  save.survie = { jauge_faim: 0.42, jauge_soif: 0.66 };
  save.hero.buffs_actifs = { buff_repas: 120000, buff_force: 9000, buff_agilite: 1400 };
  return save;
}

export default async function (chrome) {
  // --- 1. Mains nues : l'arme de départ, dans la case du bas -------------
  const mainsNues = saveChargee();
  mainsNues.hero.equipement.arme = 'weapon_mains_nues';
  mainsNues.hero.equipement.consommable = 'item_fruit';
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: mainsNues });
  await chrome.capture(`${DOSSIER}/hud_mains_nues_1920x1080.png`);
  console.log('mains nues', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

  // --- 2. Les écrans DOM : une tuile, une fiche, sur le vrai catalogue ----
  await chrome.touche('Escape');
  await chrome.attendre(300);
  await chrome.capture(`${DOSSIER}/menu_pause_1920x1080.png`);
  console.log('menu', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

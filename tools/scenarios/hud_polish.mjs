// La passe de polish de l'INTERFACE (22/09) : ce que le HUD montre vraiment,
// sous Chrome, dans les deux états qui comptent — le bandeau du haut (follet,
// PV, éclats, faim, soif, buffs, niveau) et la barre du bas (l'arme équipée
// réduite à une case de 12 unités).
//   node tools/capture_chrome.mjs tools/scenarios/hud_polish.mjs
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict reste une
// validation de Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison, cliquer, loupe } from './commun.mjs';

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
  save.hero.pv = 1; // +delta de pv_max au chargement : la barre finit à mi-course, ce qui est le but
  // Niveau 9 et l'XP qui va avec : au-delà de la dernière entrée de
  // `levels.json` (10), l'écran Stats lève (`D-97`) — un niveau qu'aucune
  // partie ne peut atteindre, mais qu'une sauvegarde bricolée porte très bien.
  save.hero.niveau = 9;
  save.hero.xp = 240;
  save.survie = { jauge_faim: 0.42, jauge_soif: 0.66 };
  save.hero.buffs_actifs = { buff_repas: 120000, buff_force: 9000, buff_agilite: 1400 };
  return save;
}

// Les deux zones qui font cette passe, en unités logiques.
const BANDEAU = { x: 0, y: 0, largeur: 240, hauteur: 22 };
const BARRE_BAS = { x: 190, y: 240, largeur: 100, hauteur: 30 };

export default async function (chrome) {
  // --- 1. Mains nues : l'arme de départ, dans la case du bas -------------
  const mainsNues = saveChargee();
  mainsNues.hero.equipement.arme = 'weapon_mains_nues';
  mainsNues.hero.equipement.consommable = 'item_fruit';
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: mainsNues });
  await chrome.capture(`${DOSSIER}/hud_mains_nues_1920x1080.png`);
  await loupe(chrome, BANDEAU, `${DOSSIER}/loupe_bandeau.png`);
  await loupe(chrome, BARRE_BAS, `${DOSSIER}/loupe_barre_bas.png`);
  console.log('mains nues', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

  // --- 2. Les écrans DOM : une tuile, une fiche, sur le vrai catalogue ----
  await chrome.touche('Escape');
  await chrome.attendre(300);
  await chrome.capture(`${DOSSIER}/menu_pause_1920x1080.png`);

  // Jusqu'à l'écran Stats : c'est le seul endroit où les quatre icônes de
  // stats se voient toutes, et **teintées par le CSS** (`ui/icone_canvas.js`
  // prend la couleur calculée du canvas). Une icône qui tient au HUD peut ne
  // pas tenir là : ce ne sont pas les mêmes couleurs.
  await cliquer(chrome, '[data-carte="carte_heros"]');
  await chrome.attendre(300);
  await cliquer(chrome, '[data-carte="carte_stats"]');
  await chrome.attendre(400);
  await chrome.capture(`${DOSSIER}/ecran_stats_1920x1080.png`);

  // Et la Poche : c'est l'écran qui montre le plus de tuiles d'un coup, donc
  // le seul où le cadrage d'une vignette se juge (`ui/icone_canvas.js`).
  await chrome.touche('Escape');
  await chrome.attendre(300);
  await chrome.touche('Escape');
  await chrome.attendre(300);
  await cliquer(chrome, '[data-carte="carte_heros"]');
  await chrome.attendre(250);
  await cliquer(chrome, '[data-carte="carte_poche"]');
  await chrome.attendre(400);
  await chrome.capture(`${DOSSIER}/ecran_poche_1920x1080.png`);
  console.log('menu', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

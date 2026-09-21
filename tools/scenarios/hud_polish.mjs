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

// Une LOUPE sur une zone du canvas visible, en unités LOGIQUES (480 x 270) :
// le bandeau fait 20 unités de haut et une case du bas 16 — à la taille de la
// capture, on ne verrait ni un liseré ni un pouce. L'agrandissement se fait
// au plus proche voisin, comme au banc visuel : lisser montrerait une image
// que personne ne voit. Le calque est retiré aussitôt la capture prise.
async function loupe(chrome, { x, y, largeur, hauteur }, sortie) {
  await chrome.evaluer(`(() => {
    const jeu = document.querySelector('canvas');
    const r = jeu.getBoundingClientRect();
    const k = jeu.width / 480; // logique -> physique, l'échelle de render.js
    const vue = document.createElement('canvas');
    const zoom = Math.max(1, Math.floor(innerWidth / (${largeur} * k)));
    vue.width = ${largeur} * k * zoom; vue.height = ${hauteur} * k * zoom;
    vue.id = 'loupe';
    vue.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#101317';
    const ctx = vue.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(jeu, ${x} * k, ${y} * k, ${largeur} * k, ${hauteur} * k, 0, 0, vue.width, vue.height);
    document.body.append(vue);
    return [vue.width, vue.height];
  })()`);
  await chrome.capture(sortie);
  await chrome.evaluer(`(() => { document.getElementById('loupe').remove(); return true; })()`);
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
  console.log('menu', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

// Polish libre du 24/09 — les vues que la session retouche, AVANT et APRÈS.
// OUTIL DE DEV.
//   SUFFIXE=avant node tools/capture_chrome.mjs tools/scenarios/polish_libre_24.mjs
//   VUES=bulle,menu SUFFIXE=p1 node tools/capture_chrome.mjs tools/scenarios/polish_libre_24.mjs
//
// Trois familles : la bulle du follet (options comprises), le menu (racine et
// une fiche), le jeu nu de jour et de nuit (le bandeau du HUD). Deux profils :
// le grand écran et le téléphone à DPR 3 — c'est au téléphone qu'une police
// trop fine se perd d'abord. Ce que ça prouve : « ça s'affiche ainsi sous
// Chrome » ; le verdict reste celui de Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison, cliquer, positionPresDe, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/polish-libre-2026-09-24';
const SUFFIXE = process.env.SUFFIXE || 'etat';
const PLEIN_JOUR = 200000; // ms dans le cycle (daynight.js) : phase `jour`
const PLEINE_NUIT = 800000; // phase `nuit`

const VUES = {
  bulle: async (chrome, nom) => {
    const save = saveDansLaMaison();
    // La ligne de la maison n'a PAS encore été dite : c'est elle qu'on regarde.
    delete save.flags.flag_ambiance_maison_premiere_visite;
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.attendre(4600);
    await chrome.capture(nom('bulle'));
  },
  menu: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.touche('Escape');
    await chrome.attendre(300);
    await chrome.capture(nom('menu'));
    await chrome.touche('Space');
    await chrome.touche('Space');
    await chrome.attendre(300);
    await chrome.capture(nom('poche'));
  },
  // Les écrans ajoutés pendant la nuit (24/09) : là où des CHIFFRES se mêlent
  // aux lettres, et les rares textes restés en linéale.
  parametres: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.touche('Escape');
    await cliquer(chrome, '[data-carte="carte_parametres"]');
    await chrome.attendre(300);
    await chrome.capture(nom('parametres'));
  },
  stats: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    save.hero.points_stats_libres = 2;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.touche('Escape');
    await chrome.touche('Space');
    await cliquer(chrome, '[data-carte="carte_stats"]');
    await chrome.attendre(300);
    await chrome.capture(nom('stats'));
  },
  coffre: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    Object.assign(save.hero, await positionPresDe('station_coffre'));
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.touche('KeyE');
    await chrome.attendre(300);
    await chrome.capture(nom('coffre'));
  },
  // Hors de la Maison, la case contextuelle est la carte Indices.
  indices: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    save.hero.x = 100.5 * 32;
    save.hero.y = 55.5 * 32;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.touche('Escape');
    await cliquer(chrome, '[data-carte="carte_indices"]');
    await chrome.attendre(300);
    await chrome.capture(nom('indices'));
  },
  // Le texte qui monte d'un ramassage (« +1 Branche » et l'XP) : une branche
  // posée au pied du héros, sur la terre nue au nord de la Maison.
  gain: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    save.hero.x = 85.5 * 32;
    save.hero.y = 49.5 * 32;
    save.monde.items_sol = { scene_maison_exterieur: { item_branche: [{ x: save.hero.x + 12, y: save.hero.y }] } };
    save.monde.jour_items_sol = { scene_maison_exterieur: save.monde.jour };
    save.flags.flag_premier_ramassage = true; // pas de bulle par-dessus
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.touche('KeyE');
    await chrome.attendre(250);
    await chrome.capture(nom('gain'));
  },
  jour: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEIN_JOUR;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.capture(nom('jour'));
  },
  nuit: async (chrome, nom) => {
    const save = saveDansLaMaison();
    save.monde.heure = PLEINE_NUIT;
    await ouvrirLeJeu(chrome, { ...nom.profil, save });
    await chrome.capture(nom('nuit'));
  },
};

export default async function (chrome) {
  const choix = process.env.VUES ? process.env.VUES.split(',') : Object.keys(VUES);
  // `PROFILS=pc` : le petit écran PC, pour juger un texte à sa taille minimale.
  const profils = process.env.PROFILS ? process.env.PROFILS.split(',') : ['grand', 'telephone'];
  for (const profil of PROFILS.filter((p) => profils.includes(p.nom))) {
    for (const vue of choix) {
      const nom = Object.assign((v) => `${DOSSIER}/${SUFFIXE}_${profil.nom}_${v}.png`, { profil });
      await VUES[vue](chrome, nom);
    }
  }
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

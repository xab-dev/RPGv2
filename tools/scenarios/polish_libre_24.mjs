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
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

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
  for (const profil of PROFILS.filter((p) => p.nom !== 'pc')) {
    for (const vue of choix) {
      const nom = Object.assign((v) => `${DOSSIER}/${SUFFIXE}_${profil.nom}_${v}.png`, { profil });
      await VUES[vue](chrome, nom);
    }
  }
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

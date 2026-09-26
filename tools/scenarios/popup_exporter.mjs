// OUTIL DE DEV : la pop-up de réinitialisation et sa carte « Exporter
// d'abord » (`D-274`), au téléphone couché (703 × 280) et en plein écran.
//   node tools/capture_chrome.mjs tools/scenarios/popup_exporter.mjs
//   RPG_SORTIE=<dossier> (défaut : docs/captures/scenarios)
import { ouvrirLeJeu, saveDansLaMaison, cliquer } from './commun.mjs';

const DOSSIER = process.env.RPG_SORTIE || 'docs/captures/scenarios';

export default async function (chrome) {
  for (const [largeur, hauteur] of [[703, 280], [1920, 1080]]) {
    await ouvrirLeJeu(chrome, { largeur, hauteur, save: saveDansLaMaison() });
    await chrome.touche('Escape');
    await cliquer(chrome, '[data-carte="carte_parametres"]');
    await cliquer(chrome, '[data-carte="carte_sauvegarde"]');
    await cliquer(chrome, '[data-carte="carte_reinitialiser"]');
    await cliquer(chrome, '[data-carte="carte_reinitialiser#oui"]');
    await chrome.capture(`${DOSSIER}/popup_exporter_${largeur}x${hauteur}.png`);
    // Rien ne dépasse de l'écran : la boîte entière est visible.
    const boite = await chrome.evaluer(`(() => { const r = document.querySelector('.cartes-popup-boite').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight]; })()`);
    console.log(largeur, 'boîte (haut, bas, écran)', JSON.stringify(boite));
  }
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

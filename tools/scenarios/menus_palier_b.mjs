// Palier B de specs/08_menus-cartes.md : « aucun changement visuel attendu ».
// Les mêmes vues que les captures du palier A, aux deux tailles de la spec, plus
// la preuve en vrai navigateur de `Q-36` (Échap, menu ouvert, ferme tout).
//   node tools/capture_chrome.mjs tools/scenarios/menus_palier_b.mjs
import { ouvrirLeJeu, saveDansLaMaison, cliquer, mesurerEcrans } from './commun.mjs';

const DOSSIER = 'docs/captures/menus-cartes-2026-09-20/palier-b';
const visibles = (chrome) => chrome.evaluer(`[...document.querySelectorAll('.ecran-ui')].filter((e) => !e.hidden).map((e) => (e.querySelector('.cartes-titre, .ecran-ui-titre') || {}).textContent)`);

export default async function (chrome) {
  for (const [largeur, hauteur] of [[703, 280], [1920, 1080]]) {
    const nom = (vue) => `${DOSSIER}/b_${vue}_${largeur}x${hauteur}.png`;
    await ouvrirLeJeu(chrome, { largeur, hauteur, save: saveDansLaMaison() });

    await chrome.touche('Escape');
    await chrome.capture(nom('racine'));
    console.log(largeur, 'racine', JSON.stringify(await mesurerEcrans(chrome)));

    await chrome.touche('Space'); // Héros
    await chrome.touche('Space'); // Poche : un écran de liste, empilé
    await chrome.capture(nom('poche'));
    console.log(largeur, 'poche', JSON.stringify(await visibles(chrome)));
    await chrome.touche('Digit3'); // B : un niveau
    console.log(largeur, 'B', JSON.stringify(await visibles(chrome)));
    await chrome.touche('Digit3');

    await cliquer(chrome, '[data-carte="carte_parametres"]');
    await cliquer(chrome, '[data-carte="carte_sauvegarde"]');
    await chrome.capture(nom('sauvegarde'));
    await cliquer(chrome, '[data-carte="carte_reinitialiser"]');
    await chrome.capture(nom('confirmation'));
    console.log(largeur, 'confirmation', JSON.stringify(await visibles(chrome)));

    await chrome.touche('Escape'); // Q-36 : depuis la profondeur 4, tout se ferme
    console.log(largeur, 'Échap, menu ouvert', JSON.stringify(await visibles(chrome)));
    await chrome.touche('Escape');
    console.log(largeur, 'Échap, menu fermé', JSON.stringify(await visibles(chrome)));
    console.log(largeur, 'erreurs console', JSON.stringify(chrome.erreurs()));
  }
}

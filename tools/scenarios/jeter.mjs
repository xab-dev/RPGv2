// `D-145` — « Jeter » depuis la Poche, vu sous Chrome.
//   node tools/capture_chrome.mjs tools/scenarios/jeter.mjs
// Deux questions, et seule la seconde est visuelle :
//   1. la fiche du fruit porte désormais TROIS boutons (Équiper, Manger,
//      Jeter) : tient-elle, aux trois profils, sans que rien ne sorte de
//      l'écran ? Node n'a pas de moteur de mise en page, un vrai Chrome si ;
//   2. une pile de cinq objets au sol se lit-elle comme une pile ?
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome ». Le verdict reste à
// Xav, en jeu (`V-81`).
import { ouvrirLeJeu, saveDansLaMaison, PROFILS, mesurerEcrans } from './commun.mjs';

const DOSSIER = 'docs/captures/jeter-2026-09-23';
const TILE = 32;

function save() {
  const s = saveDansLaMaison();
  s.monde.heure = 0.25; // plein jour
  // Au nord de la Maison, sur de la terre nue — le même coin que
  // `items_poche.mjs`, et sans objet semé : on veut voir la pile seule.
  s.hero.x = (85 + 0.5) * TILE;
  s.hero.y = (49 + 0.5) * TILE;
  s.monde.items_sol = { scene_maison_exterieur: {} };
  s.monde.jour_items_sol = { scene_maison_exterieur: s.monde.jour };
  return s;
}

// La fiche du bouton « Jeter », et si elle tient dans la fenêtre.
function mesurerFiche(chrome) {
  return chrome.evaluer(`(() => {
    const b = document.querySelector('[data-action="fiche-tertiaire"]');
    if (!b) return { bouton: null };
    const r = b.getBoundingClientRect();
    const fiche = b.parentNode;
    return {
      bouton: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      dansLaFenetre: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      ficheDefile: fiche.scrollHeight - fiche.clientHeight,
      texte: b.textContent,
    };
  })()`);
}

export default async function (chrome) {
  for (const profil of PROFILS) {
    await ouvrirLeJeu(chrome, { largeur: profil.largeur, hauteur: profil.hauteur, dpr: profil.dpr, save: save() });
    await chrome.touche('Escape'); // le menu
    await chrome.touche('Space'); // Héros
    await chrome.touche('Space'); // la Poche (première carte)
    // Le fruit est la troisième tuile : c'est l'objet qui a les TROIS actions.
    await chrome.touche('ArrowRight');
    await chrome.touche('ArrowRight');
    await chrome.capture(`${DOSSIER}/poche_fruit_${profil.nom}.png`);
    console.log(profil.nom, JSON.stringify(await mesurerFiche(chrome)), JSON.stringify(await mesurerEcrans(chrome)),
      chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
  }

  // --- La pile au sol : 4 branches + 1 caillou, puis un sixième refusé ------
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: save() });
  await chrome.touche('Escape');
  await chrome.touche('Space');
  await chrome.touche('Space');
  for (let i = 0; i < 4; i++) await chrome.touche('Backspace'); // branche : première tuile
  await chrome.touche('ArrowRight'); // le caillou a pris la place de la branche partie
  await chrome.touche('Backspace');
  await chrome.capture(`${DOSSIER}/poche_sol_plein_1920x1080.png`);
  await chrome.touche('Backspace'); // refusé : la tuile est pleine
  await chrome.touche('Escape');
  await chrome.attendre(300);
  await chrome.capture(`${DOSSIER}/pile_au_sol_1920x1080.png`);
  // Le héros se tient SUR la pile : un pas vers le nord pour la voir entière.
  await chrome.touche('KeyW', 450);
  await chrome.attendre(200);
  await chrome.capture(`${DOSSIER}/pile_au_sol_vue_1920x1080.png`);
  console.log('pile', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

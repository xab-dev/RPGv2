// La besace (23/09) SOUS CHROME : ce que les tests headless ne voient pas.
// Le sous-titre de la Poche est câblé dans `demarrerJeu`, qu'aucun test
// n'exécute (c'est là que `D-72` avait caché un `ReferenceError`) : seule une
// vraie page dit que « 6 / 6 » s'affiche, et sans erreur.
//   node tools/capture_chrome.mjs tools/scenarios/besace.mjs
// Le verdict reste une validation de Xav, en jeu.
import { ouvrirLeJeu, saveDansLaMaison, positionPresDe } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/besace';

export default async function (chrome) {
  // --- 1. L'Atelier au Nv.10, de quoi la fabriquer ------------------------
  const atelier = saveDansLaMaison();
  atelier.monde.heure = 0.25;
  atelier.hero.niveau = 10;
  atelier.inventaire.eclats = 10;
  // Sans ce flag, le follet parle devant l'établi et la capture ne montre que sa bulle.
  atelier.flags.flag_atelier_premiere_interaction = true;
  atelier.inventaire.items = { item_papyrus: 2, item_corde: 2, item_branche: 1, item_caillou: 1 };
  Object.assign(atelier.hero, await positionPresDe('station_atelier'));
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: atelier });
  await chrome.touche('KeyE');
  await chrome.capture(`${DOSSIER}/atelier_1920x1080.png`);
  console.log('atelier', chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');

  // --- 2. La Poche d'un porteur de besace, six slots pleins ---------------
  const porteur = saveDansLaMaison();
  porteur.monde.heure = 0.25;
  porteur.flags.flag_besace = true;
  porteur.inventaire.items = {
    item_branche: 5, item_caillou: 5, item_herbe: 5, item_bois: 5, item_corde: 5, item_papyrus: 5,
  };
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save: porteur });
  await chrome.touche('Escape');
  await chrome.touche('Space');
  await chrome.touche('Space');
  await chrome.capture(`${DOSSIER}/poche_1920x1080.png`);
  const sousTitre = await chrome.evaluer(`[...document.querySelectorAll('.ecran-ui')].filter((e) => !e.hidden)
    .map((e) => e.textContent.match(/\\d+\\s*\\/\\s*\\d+/)?.[0]).filter(Boolean)`);
  console.log('poche', JSON.stringify(sousTitre), chrome.erreurs().length ? `ERREURS ${JSON.stringify(chrome.erreurs())}` : 'ok');
}

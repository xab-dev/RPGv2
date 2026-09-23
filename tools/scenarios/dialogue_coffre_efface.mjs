// `specs/11` palier D — LE COFFRE EFFACÉ (chapitre 3). OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/dialogue_coffre_efface.mjs
//
// Une sauvegarde au Nv.15, dans la Maison, le coffre rempli aux trois quarts :
// le follet annonce qu'il a tout effacé. On choisit « Montre-moi », on ouvre
// le Coffre : il PARAÎT vide. Puis on attend la fin de l'effet (56 s de jeu),
// le follet dit « tout est là », et le Coffre montre de nouveau son contenu.
//
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome », jamais « on se fait
// avoir » — ça, c'est la validation en jeu de Xav.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';
import { readFileSync } from 'node:fs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/dialogue-coffre-efface';
const AMBIANCES = JSON.parse(readFileSync('data/ambiances.json', 'utf8'));
const TILE = 32;

export default async function (chrome) {
  const profil = PROFILS.find((p) => p.nom === 'pc');
  const save = saveDansLaMaison();
  save.hero.niveau = 15;
  // `saveDansLaMaison` marque toutes les lignes d'ambiance comme vues : on
  // rend au chapitre 3 la sienne.
  delete save.flags[AMBIANCES.find((a) => a.dialogue === 'dlg_chapitre_3').flag];
  // Huit piles de bois sur dix : au-dessus du seuil de la porte.
  save.maison.stations.station_coffre = { contenu: { item_bois: 160 } };
  save.hero.x = 86.5 * TILE - 54; // contre le flanc gauche du coffre (86, 54), comme le test
  save.hero.y = 54.5 * TILE;
  await ouvrirLeJeu(chrome, { ...profil, save, requete: '' });
  await chrome.attendre(5000);
  await chrome.capture(`${DOSSIER}/1_annonce.png`);
  await chrome.touche('ArrowDown', 120);
  await chrome.attendre(200);
  await chrome.touche('Space');
  await chrome.attendre(3000);
  await chrome.touche('Space');
  await chrome.attendre(600);
  await chrome.touche('KeyD', 350); // jusqu'au flanc du coffre
  await chrome.touche('KeyE');
  await chrome.attendre(800);
  await chrome.capture(`${DOSSIER}/2_coffre_parait_vide.png`);
  await chrome.touche('Escape');
  await chrome.attendre(58000);
  await chrome.capture(`${DOSSIER}/3_tout_est_la.png`);
  await chrome.touche('Space');
  await chrome.attendre(3000);
  await chrome.touche('Space');
  await chrome.attendre(600);
  await chrome.touche('KeyD', 350); // jusqu'au flanc du coffre
  await chrome.touche('KeyE');
  await chrome.attendre(800);
  await chrome.capture(`${DOSSIER}/4_coffre_plein.png`);
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

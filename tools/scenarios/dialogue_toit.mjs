// `specs/11` palier B — LE TOIT OCCULTÉ, ET UNE RÉPLIQUE MIGRÉE. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/dialogue_toit.mjs
//
// 1. À la Maison, la troisième option (« Personne ? Alors tout est à nous. ») :
//    le toit reste plein au-dessus du héros pendant 60 s de jeu, puis
//    s'efface de nouveau. Captures juste après la bulle, puis à 62 s.
// 2. Une partie NEUVE : l'intro de la Grotte, puis la réplique du narrateur
//    (« Trois feux follets… »), qui passe désormais par le même chemin que
//    tous les dialogues.
//
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome », jamais « le toit fait
// peur » — ça, c'est `V-105`.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/dialogue-toit';

export default async function (chrome) {
  const profil = PROFILS.find((p) => p.nom === 'pc');
  const save = saveDansLaMaison();
  delete save.flags.flag_ambiance_maison_premiere_visite;
  await ouvrirLeJeu(chrome, { ...profil, save, requete: '?debug=fps' });
  await chrome.attendre(4500);
  await chrome.touche('ArrowDown', 120);
  await chrome.attendre(150);
  await chrome.touche('ArrowDown', 120);
  await chrome.attendre(150);
  await chrome.capture(`${DOSSIER}/1_troisieme_option.png`);
  await chrome.touche('Space');
  await chrome.attendre(2500);
  await chrome.touche('Space');
  await chrome.attendre(600);
  await chrome.capture(`${DOSSIER}/2_toit_occulte.png`);
  await chrome.attendre(62000);
  await chrome.capture(`${DOSSIER}/3_toit_efface_apres_60s.png`);

  // Partie neuve : le profil est neuf à chaque LANCEMENT, pas entre deux
  // ouvertures d'un même scénario — la sauvegarde de la Maison est donc
  // effacée à la main avant de relancer le jeu.
  await chrome.evaluer(`new Promise((r) => { const q = indexedDB.deleteDatabase('rpg_v2'); q.onsuccess = q.onerror = q.onblocked = () => r(true); })`);
  await ouvrirLeJeu(chrome, { ...profil, requete: '' });
  await chrome.attendre(11000);
  await chrome.capture(`${DOSSIER}/4_grotte_replique_migree.png`);
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

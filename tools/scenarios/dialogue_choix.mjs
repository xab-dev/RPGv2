// `specs/11` palier A — LE PREMIER CHOIX DU JEU, VU EN SCÈNE. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/dialogue_choix.mjs
//
// Une partie arrive à la Maison sans avoir vu la ligne du follet : la bulle
// s'ouvre, s'écrit, s'arme, montre ses trois options. On descend d'un cran au
// clavier, on confirme, on lit la réponse, on ferme. Sous deux profils (le PC
// étroit et le téléphone à DPR 3) : la bulle grandit par le haut, et c'est là
// que la place manque d'abord.
//
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome », jamais « c'est
// lisible au pouce » — ça, c'est `V-104`.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/dialogue-choix';

export default async function (chrome) {
  for (const profil of PROFILS.filter((p) => p.nom !== 'grand')) {
    const save = saveDansLaMaison();
    // La ligne de la maison n'a PAS encore été dite : c'est elle qu'on regarde.
    delete save.flags.flag_ambiance_maison_premiere_visite;
    await ouvrirLeJeu(chrome, { ...profil, save, requete: '?debug=fps' });
    await chrome.attendre(600);
    await chrome.capture(`${DOSSIER}/${profil.nom}_1_ecriture.png`);
    await chrome.attendre(4000);
    await chrome.capture(`${DOSSIER}/${profil.nom}_2_options.png`);
    await chrome.touche('ArrowDown', 120);
    await chrome.attendre(200);
    await chrome.capture(`${DOSSIER}/${profil.nom}_3_selection.png`);
    await chrome.touche('Space');
    await chrome.attendre(3500);
    await chrome.capture(`${DOSSIER}/${profil.nom}_4_reponse.png`);
    await chrome.touche('Space');
    await chrome.attendre(400);
    await chrome.capture(`${DOSSIER}/${profil.nom}_5_ferme.png`);
    const journal = (await chrome.messages('info')).filter((m) => String(m).includes('[alignement]'));
    console.log(profil.nom, 'journal :', JSON.stringify(journal));
  }
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

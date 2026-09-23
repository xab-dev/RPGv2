// `specs/11` palier C — LE CHAPITRE 1 DU Nv.15. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/dialogue_chapitre_1.mjs
//
// Une sauvegarde à la Maison, Nv.15, toutes les autres lignes d'ambiance déjà
// dites : la conversation s'ouvre d'elle-même. Captures : les trois façons de
// demander, puis la réponse vague et son second tour (reformuler), sous les
// trois profils — les options doivent tenir dans la bulle, même au téléphone.
//
// Ce que ça prouve : « ça s'affiche ainsi sous Chrome », jamais « on sent
// qu'on parle à quelqu'un » — ça, c'est la validation en jeu de Xav.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';
import { readFileSync } from 'node:fs';

const DOSSIER = process.env.RPG_DOSSIER_CAPTURES || 'docs/captures/scenarios/dialogue-chapitre-1';
const AMBIANCES = JSON.parse(readFileSync('data/ambiances.json', 'utf8'));

export default async function (chrome) {
  for (const profil of PROFILS) {
    const save = saveDansLaMaison();
    save.hero.niveau = 15;
    // `saveDansLaMaison` marque TOUTES les lignes d'ambiance comme vues (une
    // capture montre le jeu, pas une bulle) : on rend au chapitre la sienne.
    delete save.flags[AMBIANCES.find((a) => a.dialogue === 'dlg_chapitre_1').flag];
    await chrome.evaluer(`new Promise((r) => { const q = indexedDB.deleteDatabase('rpg_v2'); q.onsuccess = q.onerror = q.onblocked = () => r(true); })`).catch(() => {});
    await ouvrirLeJeu(chrome, { ...profil, save, requete: '?debug=fps' });
    await chrome.attendre(5000);
    await chrome.capture(`${DOSSIER}/${profil.nom}_1_trois_facons.png`);
    await chrome.touche('Space');
    await chrome.attendre(5000);
    await chrome.capture(`${DOSSIER}/${profil.nom}_2_reponse_vague.png`);
  }
  console.log('erreurs :', JSON.stringify(await chrome.erreurs()));
}

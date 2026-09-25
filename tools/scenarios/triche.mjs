// `D-250` : `?cheat=phenom` démarre sans erreur, et sa partie s'écrit dans
// une base à part. OUTIL DE DEV : node tools/capture_chrome.mjs tools/scenarios/triche.mjs
import { ouvrirLeJeu, PROFILS } from './commun.mjs';

const DOSSIER = 'docs/captures/scenarios/triche-2026-09-25';
export default async function (chrome) {
  const profil = PROFILS[0];
  await ouvrirLeJeu(chrome, { ...profil, requete: '?cheat=phenom' });
  await chrome.attendre(2000);
  await chrome.capture(`${DOSSIER}/${profil.nom}_depart.png`);
  // Les bases que la page a ouvertes : celle de la triche, jamais `rpg_v2`.
  const bases = await chrome.evaluer('indexedDB.databases().then((l) => l.map((b) => b.name))');
  console.log('bases :', JSON.stringify(bases));
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

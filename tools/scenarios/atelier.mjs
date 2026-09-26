// OUTIL DE DEV : ouvre `tools/atelier.html` sous Chrome SANS FENÊTRE et en
// capture la planche — pour montrer des variantes à Xav sans qu'il ouvre un
// navigateur, ou pour les regarder soi-même avant de les lui montrer.
//   RPG_Q="id=visuel_heros&angles=66,90,132&variantes=essai.js" RPG_SORTIE=planche.png \
//     node tools/capture_chrome.mjs tools/scenarios/atelier.mjs
// `RPG_L` / `RPG_H` : la taille de la fenêtre (défaut 1850 × 1000).
import { ORIGINE } from './commun.mjs';

export default async function (chrome) {
  await chrome.taille(Number(process.env.RPG_L) || 1850, Number(process.env.RPG_H) || 1000, 1);
  await chrome.ouvrir(`${ORIGINE}/tools/atelier.html?${process.env.RPG_Q || ''}`);
  await chrome.evaluer(`new Promise((r) => { (function g() { window.pret ? r(true) : setTimeout(g, 50); })(); })`);
  // La planche entière dans la capture : la fenêtre prend la hauteur de la
  // page (bornée), les variantes du bas ne sont pas coupées.
  const [l, h] = await chrome.evaluer(`[document.documentElement.scrollWidth, document.documentElement.scrollHeight]`);
  await chrome.taille(Math.min(l, 4000), Math.min(h, 6000), 1);
  await chrome.attendre(100);
  const erreur = await chrome.evaluer(`document.getElementById('erreur').textContent`);
  await chrome.capture(process.env.RPG_SORTIE || 'docs/captures/scenarios/atelier.png');
  const erreurs = [...(erreur ? [erreur] : []), ...chrome.erreurs()];
  console.log(erreurs.length ? `ERREURS ${JSON.stringify(erreurs)}` : 'ok');
  if (erreurs.length) process.exitCode = 1;
}

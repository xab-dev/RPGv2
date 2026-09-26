// OUTIL DE DEV : ouvre `tools/mesure_visuel.html` sous Chrome SANS FENÊTRE,
// attend son `window.resultat`, l'écrit en JSON et, si on le demande, capture
// la page (les écarts, agrandis). Se lance par `tools/mesure_visuel.mjs`, qui
// prépare la requête (`RPG_MESURE`) et la référence Git.
// Code de sortie 1 si la mesure trouve un écart (diff, clés), une fuite ou un
// cache faux : un allègement se vérifie dans un script, pas à l'œil.
import { ORIGINE } from './commun.mjs';

export default async function (chrome) {
  await chrome.taille(1600, 1200, 1);
  await chrome.ouvrir(`${ORIGINE}/tools/mesure_visuel.html?${process.env.RPG_MESURE || ''}`);
  const resultat = await chrome.evaluer(`new Promise((resoudre) => {
    const t0 = Date.now();
    (function guetter() {
      if (window.resultat) return resoudre(window.resultat);
      if (Date.now() - t0 > 240000) return resoudre({ erreur: 'délai dépassé (4 min)' });
      setTimeout(guetter, 100);
    })();
  })`);
  console.log(JSON.stringify(resultat, null, 1));
  if (process.env.RPG_SORTIE) await chrome.capture(process.env.RPG_SORTIE);
  const erreurs = chrome.erreurs();
  if (erreurs.length) console.log(`ERREURS console : ${JSON.stringify(erreurs)}`);
  const commande = new URLSearchParams(process.env.RPG_MESURE || '').get('commande');
  const propre = (r) => Object.values(r).every((x) => x === 0);
  const echec = resultat.erreur || erreurs.length
    || (commande === 'diff' && (resultat.total > 0 || resultat.retires.length))
    || (['cles', 'fuite', 'cache'].includes(commande) && !propre(resultat));
  if (echec) process.exitCode = 1;
}

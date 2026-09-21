// Le COÛT du calque statique, mesuré en marche — OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/cout_calque.mjs
//
// Pourquoi il existe : le calque statique n'est reconstruit que quand la
// fenêtre de tuiles change de tuile de départ, donc **à l'arrêt il ne coûte
// rien**. Tout ticket qui ajoute des primitives au SOL (une silhouette par
// tuile, un motif de décor) se paie là et nulle part ailleurs : il faut donc
// marcher pour le mesurer. Le scénario ouvre `?debug=fps`, court vers l'est
// pendant une dizaine de secondes, puis relit le relevé de l'instrument.
//
// Ce que ça N'EST PAS : un relevé du §6 de `docs/DOC_suivi-dettes.md`. Ceux-là
// se prennent à la main par Xav, dans un vrai Chrome, à la manette. Ici Chrome
// est sans fenêtre : les fps n'ont pas de sens (pas de vsync à honorer), seul
// le **coût d'un recalcul** est comparable d'une exécution à l'autre, à
// condition de comparer deux exécutions du même scénario.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const TILE = 32;
const PLEIN_JOUR = 200000;

export default async function (chrome) {
  const save = saveDansLaMaison();
  // Départ à l'ouest du Jardin, sur la pelouse : la course vers l'est traverse
  // de l'herbe, puis le chemin — les deux surfaces du ticket.
  save.hero.x = (40 + 0.5) * TILE;
  save.hero.y = (56 + 0.5) * TILE;
  save.monde.heure = PLEIN_JOUR;
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save, requete: '?debug=fps' });

  for (let i = 0; i < 24; i++) await chrome.touche('KeyD', 420);

  const releve = await chrome.evaluer(`document.querySelector('#debug-perf').textContent`);
  console.log(releve);
}

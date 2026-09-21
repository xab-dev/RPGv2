// Le COÛT du calque du curseur (`D-108`), mesuré — OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/cout_curseur.mjs
//
// Même précaution que `cout_calque.mjs`, et pour la même raison : Chrome est
// ici SANS FENÊTRE, donc les fps n'ont aucun sens (aucun vsync à honorer).
// Ce qui se compare, c'est le coût de `dessiner()` entre DEUX MOMENTS DE LA
// MÊME EXÉCUTION — souris immobile, puis souris qui traverse l'écran sans
// arrêt. Le tampon de l'instrument couvre ~10 s, donc chaque relevé ne parle
// que de la période qui le précède.
//
// Ce qu'on cherche à savoir : le curseur dessine à CHAQUE frame dès qu'une
// souris a bougé une fois (décision de Xav : pas de masquage). Le calque fait
// toute la fenêtre, mais on n'efface que la boîte de ce qui a été peint la
// frame d'avant — c'est ce choix-là que ce scénario met à l'épreuve.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';

const TILE = 32;
const PLEIN_JOUR = 200000;

// Une souris qui traverse l'écran en continu, une position par frame — le pire
// cas réaliste (la traînée est alors pleine, 28 bouffées).
async function sourisEnMouvement(chrome, ms) {
  await chrome.evaluer(`(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const fin = performance.now() + ${ms};
    let k = 0;
    while (performance.now() < fin) {
      k += 1;
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: 200 + Math.abs(((k * 24) % 2400) - 1200),
        clientY: 300 + Math.sin(k / 9) * 200,
      }));
      await frame();
    }
  })()`);
}

export default async function (chrome) {
  const save = saveDansLaMaison();
  save.hero.x = (85 + 0.5) * TILE;
  save.hero.y = (49 + 0.5) * TILE;
  save.monde.heure = PLEIN_JOUR;
  await ouvrirLeJeu(chrome, { largeur: 1920, hauteur: 1080, save, requete: '?debug=fps' });

  // 1. Souris jamais bougée : le module n'a rien allumé, il ne dessine rien.
  await chrome.attendre(12000);
  console.log('--- souris immobile (curseur jamais réveillé) ---');
  console.log(await chrome.evaluer("document.querySelector('#debug-perf').textContent"));

  // 2. Souris en mouvement continu, traînée pleine.
  await sourisEnMouvement(chrome, 12000);
  console.log('--- souris en mouvement continu ---');
  console.log(await chrome.evaluer("document.querySelector('#debug-perf').textContent"));
  console.log(chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
}

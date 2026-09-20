// `D-48` — ÉTAPE 1 du ticket `MT_menu-echelle-dpr_2026-09-20.md` : reproduire et
// MESURER avant de corriger. OUTIL DE DEV, jamais chargé par le jeu.
//   node tools/capture_chrome.mjs tools/scenarios/diagnostic_unite_dpr.mjs
//
// Ce qu'on mesure, sous chacun des trois profils : l'unité `--u` réellement
// posée sur l'écran de menu visible (1) juste après l'ouverture d'un niveau,
// (2) après un `resize`, (3) après l'ouverture d'un SOUS-écran. Plus, à chaque
// fois, la hauteur occupée par la boîte et le débordement hors de la fenêtre —
// « ça tient dans l'écran » ne se prouve que dans un vrai moteur de mise en
// page (règle de méthode née de `D-42`).
//
// Le défaut cherché : les trois relevés d'un même profil doivent donner LA MÊME
// unité, et la boîte doit tenir dans la fenêtre. À DPR 1, ils la donnent déjà —
// c'est bien pour ça que ce scénario existe avec un profil à DPR 3.
import { ouvrirLeJeu, saveDansLaMaison, PROFILS } from './commun.mjs';

// L'écran de menu visible, tel que le navigateur l'a VRAIMENT calculé : `--u`
// résolue en px CSS, la boîte, et ce qui dépasse de la fenêtre.
const releve = (chrome, moment) => chrome.evaluer(`(() => {
  const el = [...document.querySelectorAll('.ecran-ui')].find((e) => !e.hidden);
  if (!el) return { moment: ${JSON.stringify(moment)}, ecran: null };
  const style = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const tuile = el.querySelector('.tuile, .carte');
  const rt = tuile ? tuile.getBoundingClientRect() : null;
  return {
    moment: ${JSON.stringify(moment)},
    ecran: (el.querySelector('.cartes-titre') || {}).textContent || el.id,
    u: style.getPropertyValue('--u').trim(),
    jeu: [style.getPropertyValue('--jeu-x').trim(), style.getPropertyValue('--jeu-y').trim()],
    boite: [Math.round(r.width), Math.round(r.height)],
    tuile: rt ? [Math.round(rt.width), Math.round(rt.height)] : null,
    deborde: Math.round(Math.max(0, r.bottom - innerHeight) + Math.max(0, -r.top)),
    fenetre: [innerWidth, innerHeight, devicePixelRatio],
  };
})()`);

export default async function (chrome) {
  for (const { nom, largeur, hauteur, dpr } of PROFILS) {
    await ouvrirLeJeu(chrome, { largeur, hauteur, dpr, save: saveDansLaMaison() });
    console.log(`\n--- profil ${nom} : ${largeur} × ${hauteur} px CSS, DPR ${dpr} ---`);

    await chrome.touche('Escape'); // ouverture du menu = ouverture d'un niveau
    console.log('ouverture  ', JSON.stringify(await releve(chrome, 'ouverture')));

    // Le `resize` que Xav produit en pivotant son téléphone : même viewport,
    // l'événement seul suffit à recaler la boîte (c'est le symptôme du ticket).
    await chrome.taille(largeur, hauteur + 1, dpr);
    await chrome.taille(largeur, hauteur, dpr);
    await chrome.attendre(120);
    console.log('après resize', JSON.stringify(await releve(chrome, 'resize')));

    await chrome.touche('Space'); // Héros
    await chrome.touche('Space'); // Poche : un SOUS-écran, donc un niveau de plus
    console.log('sous-écran ', JSON.stringify(await releve(chrome, 'sous-ecran')));

    await chrome.capture(`docs/captures/diagnostic-unite-dpr/apres_${nom}.png`);
    console.log('erreurs console', JSON.stringify(chrome.erreurs()));
  }
}

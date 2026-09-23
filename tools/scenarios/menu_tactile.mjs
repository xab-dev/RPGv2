// `D-176` : le HUD TACTILE vu sous Chrome — l'engrenage du bouton MENU, et
// avec lui tous les boutons du doigt. OUTIL DE DEV.
//   node tools/capture_chrome.mjs tools/scenarios/menu_tactile.mjs
// Le premier scénario qui passe la couche d'input en tactile : un vrai
// `TouchEvent` envoyé au canvas, hors joystick et hors boutons, comme le
// premier doigt d'un joueur. Aucun scénario ne le faisait : le HUD tactile
// n'avait jamais été capturé. Ce que ça prouve : « ça s'affiche ainsi sous
// Chrome ». Le verdict reste une validation de Xav, au doigt.
import { ouvrirLeJeu, saveDansLaMaison } from './commun.mjs';
const S = process.env.SORTIE || 'docs/captures/scenarios/menu-tactile-2026-09-23';
export default async function (chrome) {
  for (const [nom, ecran] of [['tel', { largeur: 780, hauteur: 360, dpr: 3 }], ['petit', { largeur: 703, hauteur: 280 }]]) {
    const save = saveDansLaMaison();
    save.hero.scene = 'scene_maison_exterieur'; save.hero.x = 100.5 * 32; save.hero.y = 55.5 * 32; save.monde.heure = 200000;
    await ouvrirLeJeu(chrome, { ...ecran, save });
    // Un contact au milieu de l'écran (hors joystick, hors boutons) : la couche
    // d'input bascule en tactile, comme au premier doigt d'un vrai joueur.
    await chrome.evaluer(`(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const t = new Touch({ identifier: 1, target: c, clientX: r.left + r.width * 0.55, clientY: r.top + r.height * 0.5 });
      c.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
      c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true, cancelable: true }));
      return true;
    })()`);
    await chrome.attendre(500);
    await chrome.capture(`${S}/menu_${nom}.png`);
    console.log(nom, chrome.erreurs().length ? JSON.stringify(chrome.erreurs()) : 'ok');
  }
}

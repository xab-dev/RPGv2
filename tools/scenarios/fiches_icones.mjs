// `D-103` (T10) : les lignes d'une fiche qui MONTRENT ce dont elles parlent —
// la fiche de Craft dans le jeu, aux deux tailles de specs/08.
//   node tools/capture_chrome.mjs tools/scenarios/fiches_icones.mjs
//
// Ce que Node ne peut pas dire et que cette capture mesure : la taille réelle
// de la vignette à côté du texte (12 unités, donc 12 px de page à 703 et 48 à
// 1920), et qu'elle est bien DESSINÉE — un canvas de largeur 0 rendrait une
// ligne muette sans lever la moindre erreur. Le verdict d'usage, lui, reste
// celui de Xav en jeu (`V-72`).
import { ouvrirLeJeu, saveDansLaMaison, positionPresDe } from './commun.mjs';

const DOSSIER = 'docs/captures/fiches-2026-09-22';

const mesurerLignes = (chrome) => chrome.evaluer(`(() => {
  const e = document.querySelector('.ecran-fiches:not([hidden])');
  if (!e) return 'aucun écran ouvert';
  return [...e.querySelectorAll('.fiche-ligne')].map((l) => {
    const c = l.querySelector('canvas');
    const b = c && c.getBoundingClientRect();
    return { texte: l.textContent, icone: c ? c.dataset.icone : null,
      pagePx: b ? [Math.round(b.width), Math.round(b.height)] : null, dessine: c ? c.width : null };
  });
})()`);

export default async function (chrome) {
  for (const [largeur, hauteur] of [[703, 280], [1920, 1080]]) {
    const save = saveDansLaMaison();
    // `D-120` : hache et pioche sont gâtées au Nv.10 et coûtent des éclats —
    // sans niveau ni éclats, il n'y aurait ni ligne d'ingrédient ni ligne de
    // coût à regarder.
    save.hero.niveau = 10;
    save.inventaire.eclats = 50;
    Object.assign(save.hero, await positionPresDe('station_atelier'));
    await ouvrirLeJeu(chrome, { largeur, hauteur, save });
    await chrome.touche('KeyE');
    await chrome.capture(`${DOSSIER}/craft_${largeur}x${hauteur}.png`);
    console.log(largeur, JSON.stringify(await mesurerLignes(chrome)));
    const erreurs = chrome.erreurs();
    if (erreurs.length) console.log(largeur, 'ERREURS CONSOLE', JSON.stringify(erreurs));
  }
}

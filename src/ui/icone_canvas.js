// Une icône de `visuels.json` dessinée dans un petit <canvas> du DOM
// (specs/08_menus-cartes.md §2 : « icônes en primitives, jamais d'emoji »).
//
// Pourquoi un canvas et pas du SVG : `visuels.js#dessinerVisuel` est le SEUL
// point du jeu qui interprète `visuels.json`. Traduire les primitives en SVG
// aurait créé un second interprète, condamné à diverger du premier à la
// prochaine primitive ajoutée. Ici, l'icône d'une carte est dessinée par la
// même fonction que le héros.
//
// Sous-système « meilleur effort » : une icône est un décor. Ce module
// rattrape donc ses propres erreurs à la frontière de son API (règle née du
// freeze-musique d'`audio.js`) — il est appelé depuis `menu.traiterInput`,
// donc depuis la boucle de jeu, qui ne se replanifie pas après une exception.
// Une icône qui rate laisse une carte sans icône ; elle ne fige jamais le jeu.
import { dessinerVisuel } from '../visuels.js';

// Les icônes de `visuels.json` sont dessinées dans une boîte d'environ ± 6
// unités autour de leur centre ; 14 laisse un filet d'air. C'est une
// convention de dessin des icônes, pas un réglage de mise en page : la TAILLE
// affichée, elle, est décidée par la feuille de style.
const COTE_REFERENCE_ICONE = 14;

// `obtenirVisuel(id)` : le registre, injecté. `fenetre` : pour le rapport de
// pixels et `getComputedStyle` — ce module ne touche à aucun global.
export function creerDessinateurIcones({ obtenirVisuel, fenetre }) {
  return function dessinerIcone(canvas, idVisuel) {
    try {
      const visuel = obtenirVisuel(idVisuel);
      if (!visuel || typeof canvas.getContext !== 'function') return;
      // La taille en pixels de page vient du CSS (en unités `--u`) ; le canvas
      // la suit à la résolution PHYSIQUE — même décision que le reste du jeu
      // (« rendu net à résolution physique », jamais `pixelated`).
      const cotePage = canvas.getBoundingClientRect().width;
      if (!(cotePage > 0)) return;
      const cote = Math.max(1, Math.round(cotePage * (fenetre.devicePixelRatio || 1)));
      // Redimensionner un canvas l'efface et remet sa transform à l'identité.
      canvas.width = cote;
      canvas.height = cote;
      // La teinte est la COULEUR CSS du canvas : c'est la feuille de style qui
      // dit « accent » ou « danger » (`.carte-icone`, `.carte-danger …`), et
      // l'accent y est une variable héritée. Aucune couleur n'entre ici.
      const teinte = fenetre.getComputedStyle(canvas).color;
      const ctx = canvas.getContext('2d');
      // `dessinerVisuel` encadre sa propre transform d'un save/restore : ce
      // contexte-ci ressort de l'appel tel qu'il y est entré.
      dessinerVisuel(ctx, visuel, cote / 2, cote / 2, { teinte, echelle: cote / COTE_REFERENCE_ICONE });
    } catch (e) {
      console.warn('icone_canvas.js : icône non dessinée, le menu continue sans elle', e);
    }
  };
}

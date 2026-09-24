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
import { dessinerVisuel, surlignageActif, echelleVisuel } from '../visuels.js';
import { empreinteParDefaut } from '../structures.js';

// Les icônes de `visuels.json` sont dessinées dans une boîte d'environ ± 6
// unités autour de leur centre ; 14 laisse un filet d'air. C'est une
// convention de dessin des icônes, pas un réglage de mise en page : la TAILLE
// affichée, elle, est décidée par la feuille de style.
export const COTE_REFERENCE_ICONE = 14;
// Filet d'air, en unités du visuel, autour d'une silhouette RECADRÉE (voir
// `cadrer`). *Provisoire.*
const MARGE_RECADRAGE = 2;

// Où et à quelle échelle dessiner `visuel` dans un canvas carré de `cote` px.
//
// Les ICÔNES (menus, stats) sont dessinées pour la boîte de référence, autour
// de leur centre : elles gardent exactement le cadrage d'avant, au pixel près.
// Mais le palier C de specs/08 affiche aussi des silhouettes du MONDE — une
// station ancrée par le bas, large de 22 unités — qui déborderaient d'une
// tuile. Celles-là sont recadrées : centrées sur leur boîte englobante, et
// réduites pour y tenir. La boîte est celle de `structures.js` (la même règle
// que l'empreinte solide des stations) : jamais un second calcul de « quelle
// place prend ce visuel ». Pure, exportée pour être testée sans canvas.
//
// `pieceMobile` (`D-177`, optionnelle) : `{ visuel, pivot, angle }`, le manche
// d'un levier tel que le monde le dessine. Sa boîte, pivotée puis posée au
// pivot, s'ajoute à celle du socle : sans elle, le bouton tactile qui montre
// un levier laissait dépasser la boule du manche.
export function cadrer(visuel, cote, pieceMobile = null) {
  const boite = unionBoites(empreinteParDefaut(visuel, echelleVisuel(visuel)), boitePieceMobile(pieceMobile));
  const demi = COTE_REFERENCE_ICONE / 2;
  const tient = boite.x >= -demi && boite.y >= -demi && boite.x + boite.w <= demi && boite.y + boite.h <= demi;
  if (tient) return { x: cote / 2, y: cote / 2, echelle: cote / COTE_REFERENCE_ICONE };
  const echelle = cote / (Math.max(boite.w, boite.h) + 2 * MARGE_RECADRAGE);
  return {
    x: cote / 2 - (boite.x + boite.w / 2) * echelle,
    y: cote / 2 - (boite.y + boite.h / 2) * echelle,
    echelle,
  };
}

function boitePieceMobile(pieceMobile) {
  if (!pieceMobile) return null;
  const { visuel, pivot, angle } = pieceMobile;
  const b = empreinteParDefaut(visuel, echelleVisuel(visuel));
  const rad = (angle * Math.PI) / 180;
  const coins = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
    .map(([x, y]) => [pivot[0] + x * Math.cos(rad) - y * Math.sin(rad), pivot[1] + x * Math.sin(rad) + y * Math.cos(rad)]);
  const xs = coins.map((c) => c[0]);
  const ys = coins.map((c) => c[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function unionBoites(a, b) {
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// `obtenirVisuel(id)` : le registre, injecté. `fenetre` : pour le rapport de
// pixels et `getComputedStyle` — ce module ne touche à aucun global.
// `phaseDuCycle` (`D-191`) : la phase du cycle au moment du dessin, ou `null`.
// Un visuel qui porte un `surlignage` allumé à cette phase reçoit son liseré
// par-dessus, au même cadre — fixe ici : une icône de menu est dessinée une
// fois, à l'ouverture, jamais animée.
export function creerDessinateurIcones({ obtenirVisuel, fenetre, phaseDuCycle = () => null }) {
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
      const cadre = cadrer(visuel, cote);
      dessinerVisuel(ctx, visuel, cadre.x, cadre.y, { teinte, echelle: cadre.echelle });
      if (surlignageActif(visuel, phaseDuCycle())) {
        dessinerVisuel(ctx, obtenirVisuel(visuel.surlignage.visuel), cadre.x, cadre.y, { echelle: cadre.echelle });
      }
    } catch (e) {
      console.warn('icone_canvas.js : icône non dessinée, le menu continue sans elle', e);
    }
  };
}

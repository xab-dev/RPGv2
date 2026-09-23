// `D-165` — LA barre de jauge du jeu, sortie de `ui/hud.js` pour que la barre
// de PV des monstres (`render.js`) soit de la même facture que celles du
// bandeau, au lieu d'un fond noir et d'un aplat rouge. Pur dessin canvas :
// ne connaît ni PV, ni faim, ni monstre ; reçoit un rectangle, un ratio et
// une palette. Ne touche jamais la transform.

// `D-95` — LA jauge du bandeau, en quatre valeurs, et une seule fonction pour
// les trois (PV, faim, soif). Avant, les PV étaient dessinés inline et les
// deux jauges de survie par une autre fonction : deux factures pour le même
// objet, et la seule façon d'en changer une sans l'autre. Le reproche de Xav
// (« par rapport aux feux follets, la barre de vie peut être améliorée »)
// porte exactement là : un follet a un corps, un cœur clair et un halo, la
// barre n'avait qu'un aplat et un contour blanc.
//
// Les quatre valeurs, et ce que chacune dit — c'est la charte d'item du 21/09
// transposée à une barre :
//   `creux`  le fond, plus sombre que le corps : la barre est CREUSÉE, et une
//            jauge vide reste lisible sur le bandeau ;
//   `corps`  le remplissage ;
//   `haut`   la moitié haute du remplissage, éclairée — le volume vient d'une
//            seconde forme, jamais d'un flou (règle de visuels.js) ;
//   `lisere` un pixel vif au sommet, l'accent.
// Le CONTOUR passe du blanc pur à un trait sombre : c'est le blanc qui
// écrasait les trois valeurs qu'on vient de poser.
export const PALETTE_JAUGES = {
  pv: { creux: '#2a0f10', corps: '#a8302f', haut: '#d8574c', lisere: '#ff9b8a' },
  faim: { creux: '#241d0a', corps: '#a8882a', haut: '#d9bb45', lisere: '#ffe79b' },
  soif: { creux: '#0e1b2a', corps: '#2a6aa8', haut: '#4a9ad9', lisere: '#a6dcff' },
};
const COULEUR_JAUGE_CONTOUR = 'rgba(8, 9, 12, 0.75)';

// `D-95` — LA barre du bandeau. Les PV, la faim et la soif la traversent
// tous les trois : une seule facture, donc jamais deux jauges qui divergent
// au premier réglage. Elle ne connaît ni PV ni faim — elle reçoit un
// rectangle, un ratio et une palette.
//
// L'ordre de dessin EST le relief, exactement comme pour une silhouette de
// `visuels.json` : creux, corps, moitié haute éclairée, liseré d'un pixel,
// puis le contour sombre par-dessus tout. Le liseré ne dépasse jamais le
// remplissage (il s'arrête où le corps s'arrête), sinon la barre vide
// garderait un trait vif qui la ferait lire comme pleine.
export function dessinerBarre(ctx, rect, ratio, palette) {
  const { x, y, largeur, hauteur } = rect;
  const rempli = largeur * Math.max(0, Math.min(1, ratio));

  ctx.fillStyle = palette.creux;
  ctx.fillRect(x, y, largeur, hauteur);
  // Le creux a sa propre ombre haute : un pixel plus sombre sous le bord
  // supérieur, qui donne l'épaisseur de la gouttière même quand la jauge est
  // à zéro.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x, y, largeur, 1);

  if (rempli > 0) {
    ctx.fillStyle = palette.corps;
    ctx.fillRect(x, y, rempli, hauteur);
    ctx.fillStyle = palette.haut;
    ctx.fillRect(x, y, rempli, Math.max(1, Math.round(hauteur * 0.42)));
    ctx.fillStyle = palette.lisere;
    ctx.globalAlpha *= 0.55;
    ctx.fillRect(x, y, rempli, 1);
    ctx.globalAlpha /= 0.55;
    // Le pied du remplissage retombe dans l'ombre : sans lui, la moitié haute
    // éclairée se lit comme deux bandes collées, pas comme un volume.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(x, y + hauteur - 1, rempli, 1);
  }

  ctx.strokeStyle = COULEUR_JAUGE_CONTOUR;
  ctx.strokeRect(x, y, largeur, hauteur);
}

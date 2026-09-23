// `D-163` — le cadre d'un calque d'UI dessiné sur le canvas (la bulle de
// dialogue, la bannière des indices de commande). Jusqu'au 23/09, les deux
// étaient un rectangle noir à liseré blanc de 2 px : la facture d'avant la
// passe d'interface du 22/09, quand le bandeau (`D-95`) et les cases de la
// barre (`D-99`) avaient reçu un dégradé, une bordure douce et une arête
// claire. Une seule fonction pour les deux, sans quoi la bulle et la
// bannière finiraient par ne plus se ressembler.
//
// Mêmes valeurs que `hud.js` (fond de case, bordure de case, arête du
// bandeau) : ce cadre est de la même famille, pas une troisième. Ne touche
// jamais la transform ; `save`/`restore` autour de ce qu'il pose.

const FOND_HAUT = 'rgba(40, 46, 58, 0.88)';
const FOND_BAS = 'rgba(8, 10, 15, 0.92)';
const BORDURE = 'rgba(255, 255, 255, 0.28)';
const ARETE = 'rgba(255, 255, 255, 0.10)';
// Rayon des coins, en px logiques : assez pour qu'un coin ne soit plus un
// angle de fenêtre système, pas assez pour faire une bulle de BD.
const RAYON = 3;

function tracer(ctx, x, y, largeur, hauteur, rayon) {
  const r = Math.min(rayon, largeur / 2, hauteur / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + largeur, y, x + largeur, y + hauteur, r);
  ctx.arcTo(x + largeur, y + hauteur, x, y + hauteur, r);
  ctx.arcTo(x, y + hauteur, x, y, r);
  ctx.arcTo(x, y, x + largeur, y, r);
  ctx.closePath();
}

export function dessinerCadre(ctx, x, y, largeur, hauteur) {
  ctx.save();
  const fond = ctx.createLinearGradient(0, y, 0, y + hauteur);
  fond.addColorStop(0, FOND_HAUT);
  fond.addColorStop(Math.min(1, 14 / hauteur), FOND_BAS);
  fond.addColorStop(1, FOND_BAS);
  tracer(ctx, x, y, largeur, hauteur, RAYON);
  ctx.fillStyle = fond;
  ctx.fill();
  // Demi-pixel : un trait d'un pixel posé sur un bord entier se répartit sur
  // deux rangées de pixels et devient une bande grise floue.
  tracer(ctx, x + 0.5, y + 0.5, largeur - 1, hauteur - 1, RAYON);
  ctx.lineWidth = 1;
  ctx.strokeStyle = BORDURE;
  ctx.stroke();
  // L'arête claire sous le bord haut : la lumière vient d'en haut, comme sur
  // les cases de la barre.
  ctx.fillStyle = ARETE;
  ctx.fillRect(x + RAYON, y + 1, largeur - 2 * RAYON, 1);
  ctx.restore();
}

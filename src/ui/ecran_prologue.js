// Le dessin d'un écran du prologue (`specs/12_prologue.md`) : un titre et
// quelques paragraphes, centrés sur le noir des paupières fermées. Jamais
// exercé par les tests headless (dessin canvas). `contenu` arrive déjà
// traduit (`main.js`), jamais de texte en dur ici.
//
// Dessiné sous la transform logique -> physique, comme la bulle : toutes les
// positions sont en unités LOGIQUES (480 × 270), jamais lues sur
// `ctx.canvas` (cf. diagnostic des dialogues invisibles, CLAUDE.md).

import { RESOLUTION_LOGIQUE } from '../render.js';
import { decouperEnFenetres } from '../dialogue.js';
import { ACCENT } from './cadre.js';
import { POLICE_CALLIGRAPHIE, POLICE_ONCIALE } from '../polices.js';

// Toutes PROVISOIRES, à juger en jeu par Xav. Retour sur `V-121` : une
// calligraphie « elfique » plutôt que la police de la bulle — le prologue est
// la voix du laboratoire (le ton du README), pas celle du follet. Repli `serif`
// si la police n'est pas arrivée (`polices.js`, meilleur effort).
const POLICE_TITRE = `17px "${POLICE_ONCIALE}", serif`;
// L'écran sans paragraphe (« Réveille-toi. ») est un mot seul : plus grand, il
// porte ce que les autres disent en phrases.
const POLICE_TITRE_SEUL = `24px "${POLICE_ONCIALE}", serif`;
const POLICE_TEXTE = `13px "${POLICE_CALLIGRAPHIE}", serif`;
// Largeur de la colonne de texte : assez étroite pour se lire d'un coup d'œil
// au centre de l'écran, assez large pour qu'un paragraphe tienne en deux ou
// trois lignes. 410 (mesuré sous Chrome : il en faut ~400) : le vers le plus long du README (« ce quelque chose vous
// choisit… ») tient sur une ligne, sans laisser « divergent. » seul.
const LARGEUR_TEXTE = 410;
const INTERLIGNE = 17;
const HAUTEUR_TITRE = 20;
const ESPACE_SOUS_TITRE = 16;
const ESPACE_PARAGRAPHE = 9;
// Le signe alchimique au-dessus du titre (ceux du README) : un triangle de
// DEMI_GLYPHE de demi-côté, posé ESPACE_GLYPHE au-dessus du titre.
const DEMI_GLYPHE = 6;
const ESPACE_GLYPHE = 10;
const TRAIT_GLYPHE = 1.2;
// Le ▼ de la bulle de dialogue, même dessin et même or : le joueur apprend ici
// le signe qui voudra dire « la suite » pendant tout le jeu.
const MARQUEUR_Y = RESOLUTION_LOGIQUE.hauteur - 22;
const MARQUEUR_DEMI = 5;

// Les quatre signes des éléments, comme les écrit l'alchimie : le triangle
// pointe vers le haut pour ce qui monte (feu, air), vers le bas pour ce qui
// descend (eau, terre) ; l'air et la terre sont barrés. Tracés, jamais des
// caractères : aucune police du jeu ne porte 🜁 🜂 🜃 🜄.
const SIGNES = {
  feu: { haut: true, barre: false },
  air: { haut: true, barre: true },
  eau: { haut: false, barre: false },
  terre: { haut: false, barre: true },
};

function dessinerGlyphe(ctx, glyphe, cx, cy) {
  const signe = SIGNES[glyphe];
  if (!signe) return;
  const h = DEMI_GLYPHE * Math.sqrt(3);
  const pointe = signe.haut ? cy - h / 2 : cy + h / 2;
  const base = signe.haut ? cy + h / 2 : cy - h / 2;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = TRAIT_GLYPHE;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, pointe);
  ctx.lineTo(cx + DEMI_GLYPHE, base);
  ctx.lineTo(cx - DEMI_GLYPHE, base);
  ctx.closePath();
  if (signe.barre) {
    // La barre coupe le triangle à mi-hauteur et déborde un peu de ses flancs.
    ctx.moveTo(cx - DEMI_GLYPHE - 2, cy);
    ctx.lineTo(cx + DEMI_GLYPHE + 2, cy);
  }
  ctx.stroke();
}

// `contenu` : { glyphe, titre, lignes } (chaînes traduites ; `glyphe` ou `null`) ; `alpha` : l'opacité du
// fondu (`prologue.js#alphaPrologue`) ; `arme` : l'appui est attendu.
export function dessinerEcranPrologue(ctx, contenu, alpha, arme) {
  if (alpha <= 0) return;
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  const cx = largeur / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Mesurer d'abord : le bloc entier (titre + paragraphes) se centre
  // verticalement, quel que soit le nombre de lignes après traduction.
  ctx.font = POLICE_TEXTE;
  const paragraphes = contenu.lignes.map((texte) =>
    decouperEnFenetres(texte, (t) => ctx.measureText(t).width, LARGEUR_TEXTE, Infinity)[0].split('\n'));
  const nbLignes = paragraphes.reduce((n, p) => n + p.length, 0);
  const hauteurTexte = paragraphes.length === 0
    ? 0
    : ESPACE_SOUS_TITRE + nbLignes * INTERLIGNE + (paragraphes.length - 1) * ESPACE_PARAGRAPHE;
  const hauteurGlyphe = contenu.glyphe ? 2 * DEMI_GLYPHE + ESPACE_GLYPHE : 0;
  let y = Math.round((hauteur - hauteurGlyphe - HAUTEUR_TITRE - hauteurTexte) / 2);
  if (contenu.glyphe) {
    dessinerGlyphe(ctx, contenu.glyphe, cx, y + DEMI_GLYPHE);
    y += hauteurGlyphe;
  }

  ctx.fillStyle = ACCENT;
  ctx.font = paragraphes.length === 0 ? POLICE_TITRE_SEUL : POLICE_TITRE;
  ctx.fillText(contenu.titre, cx, y);
  y += HAUTEUR_TITRE + ESPACE_SOUS_TITRE;

  ctx.fillStyle = '#ffffff';
  ctx.font = POLICE_TEXTE;
  paragraphes.forEach((lignes) => {
    for (const ligne of lignes) {
      ctx.fillText(ligne, cx, y);
      y += INTERLIGNE;
    }
    y += ESPACE_PARAGRAPHE;
  });

  // Un triangle DESSINÉ, jamais une chaîne « ▼ » (ce n'est pas du texte
  // localisable) — absent tant que l'appui serait ignoré.
  if (arme) {
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.moveTo(cx - MARQUEUR_DEMI, MARQUEUR_Y - 3);
    ctx.lineTo(cx + MARQUEUR_DEMI, MARQUEUR_Y - 3);
    ctx.lineTo(cx, MARQUEUR_Y + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

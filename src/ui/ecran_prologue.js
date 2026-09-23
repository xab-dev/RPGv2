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

// Toutes PROVISOIRES, à juger en jeu par Xav (`V-121`). La police du texte est
// celle de la bulle : le joueur la retrouvera dès la première réplique.
const POLICE_TITRE = 'bold 16px sans-serif';
// L'écran sans paragraphe (« Réveille-toi. ») est un mot seul : plus grand, il
// porte ce que les autres disent en phrases.
const POLICE_TITRE_SEUL = 'bold 20px sans-serif';
const POLICE_TEXTE = '13px sans-serif';
// Largeur de la colonne de texte : assez étroite pour se lire d'un coup d'œil
// au centre de l'écran, assez large pour qu'un paragraphe tienne en deux ou
// trois lignes.
const LARGEUR_TEXTE = 360;
const INTERLIGNE = 17;
const HAUTEUR_TITRE = 20;
const ESPACE_SOUS_TITRE = 16;
const ESPACE_PARAGRAPHE = 9;
// Le ▼ de la bulle de dialogue, même dessin et même or : le joueur apprend ici
// le signe qui voudra dire « la suite » pendant tout le jeu.
const MARQUEUR_Y = RESOLUTION_LOGIQUE.hauteur - 22;
const MARQUEUR_DEMI = 5;

// `contenu` : { titre, lignes } (chaînes traduites) ; `alpha` : l'opacité du
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
  let y = Math.round((hauteur - HAUTEUR_TITRE - hauteurTexte) / 2);

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

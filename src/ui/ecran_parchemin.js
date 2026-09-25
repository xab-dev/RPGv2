// Le PARCHEMIN en gros plan (spec 14, §4.6) : ouvert avec le coffre du
// Gardien, un rouleau clair où des lettres d'or s'écrivent — le nom de la
// compétence, ce qu'elle fait, le bouton qui la lance. Jamais exercé par les
// tests headless (dessin canvas) : ce que la plume a écrit arrive déjà coupé
// (`parchemin.js#lignesEcrites`, appelé par `main.js`), jamais de texte en dur.
//
// Même discipline que la stèle (`ecran_stele.js`) : unités LOGIQUES (480 ×
// 270), jamais `ctx.canvas` ; aucune `shadowBlur` (son coût est imprévisible
// sur mobile) — l'or est un trait brun décalé d'un pixel, l'or plein, puis un
// reflet clair d'un demi-pixel vers le haut.

import { RESOLUTION_LOGIQUE } from '../render.js';
import { POLICE_CALLIGRAPHIE, POLICE_ONCIALE } from '../polices.js';
import { decouperEnFenetres } from '../dialogue.js';
import { mulberry32 } from '../decor.js';
import { alphaParticule } from '../stele.js';
import { dessinerVisuel } from '../visuels.js';
import { dessinerActions } from './ecran_stele.js';

// Toutes PROVISOIRES, à juger en jeu par Xav.
const VOILE = 'rgba(4, 6, 10, 0.74)';
const LARGEUR = 244;
const HAUTEUR = 176;
// Les deux rouleaux, en haut et en bas : un peu plus larges que la feuille.
const DEBORD_ROULEAU = 7;
const HAUTEUR_ROULEAU = 9;
const COULEUR_FEUILLE_HAUT = '#eadbb4';
const COULEUR_FEUILLE_BAS = '#d8c294';
const COULEUR_BORD_FEUILLE = 'rgba(120, 88, 40, 0.35)';
const COULEUR_ROULEAU = '#a9864f';
const COULEUR_ROULEAU_OMBRE = '#6f5429';
const COULEUR_ROULEAU_REFLET = 'rgba(255, 240, 200, 0.45)';
const NB_TACHES = 70;
// L'or des lettres : l'ombre brune, le plein, le reflet.
const OR_OMBRE = 'rgba(70, 44, 10, 0.55)';
const OR_PLEIN = '#b8841c';
const OR_REFLET = 'rgba(255, 226, 140, 0.9)';
const POLICE_TITRE = `17px "${POLICE_ONCIALE}", "${POLICE_CALLIGRAPHIE}", serif`;
const POLICE_TEXTE = `11px "${POLICE_CALLIGRAPHIE}", serif`;
const INTERLIGNE_TITRE = 24;
const INTERLIGNE_TEXTE = 15;
const ECART_PARAGRAPHE = 6;
const MARGE_TEXTE = 22;
// L'icône de la compétence, en tête du rouleau, dans un halo d'or.
const TAILLE_ICONE = 34;
const HAUT_ICONE = 30;
const TAILLE_PARTICULE = 1.3;
const MONTEE_FONDU = 8;

function origine(alpha) {
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  return {
    x: Math.round((largeur - LARGEUR) / 2),
    y: Math.round((hauteur - HAUTEUR) / 2) - 4 + Math.round((1 - alpha) * MONTEE_FONDU),
  };
}

function graineDe(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i += 1) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return h >>> 0;
}

function dessinerRouleau(ctx, x, y, w) {
  const degrade = ctx.createLinearGradient(0, y, 0, y + HAUTEUR_ROULEAU);
  degrade.addColorStop(0, COULEUR_ROULEAU);
  degrade.addColorStop(1, COULEUR_ROULEAU_OMBRE);
  ctx.fillStyle = degrade;
  ctx.beginPath();
  ctx.ellipse(x, y + HAUTEUR_ROULEAU / 2, 3, HAUTEUR_ROULEAU / 2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w, y + HAUTEUR_ROULEAU / 2, 3, HAUTEUR_ROULEAU / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x, y, w, HAUTEUR_ROULEAU);
  ctx.fillStyle = COULEUR_ROULEAU_REFLET;
  ctx.fillRect(x, y + 2, w, 1);
}

// Une ligne en lettres d'or, centrée sur `cx`.
function ecrireEnOr(ctx, texte, cx, y, alpha) {
  if (!texte) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = OR_OMBRE;
  ctx.fillText(texte, cx + 0.8, y + 1);
  ctx.fillStyle = OR_PLEIN;
  ctx.fillText(texte, cx, y);
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = OR_REFLET;
  ctx.fillText(texte, cx, y - 0.5);
}

// `contenu` : { id, lignes (ce qui est écrit), lignesCompletes (le texte
// entier : la mise en page ne bouge pas pendant l'écriture), icone (un visuel),
// couleur (#rrggbb, la lueur de l'icône), actions ([{ glyphe, texte }]), vue
// (`stele.js`), alpha }. La première ligne est le TITRE (le nom de la
// compétence) ; les suivantes sont le texte, coupées à la largeur du rouleau.
export function dessinerEcranParchemin(ctx, contenu) {
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  const { vue, alpha = 1 } = contenu;
  if (alpha <= 0) return;
  const { x, y } = origine(alpha);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = VOILE;
  ctx.fillRect(0, 0, largeur, hauteur);

  // La feuille : un dégradé vertical, des taches de vieillesse tirées à une
  // graine fixe (le même parchemin montre toujours les mêmes), un bord bruni.
  const feuille = ctx.createLinearGradient(0, y, 0, y + HAUTEUR);
  feuille.addColorStop(0, COULEUR_FEUILLE_HAUT);
  feuille.addColorStop(1, COULEUR_FEUILLE_BAS);
  ctx.fillStyle = feuille;
  ctx.fillRect(x, y, LARGEUR, HAUTEUR);
  const hasard = mulberry32(graineDe(contenu.id));
  for (let i = 0; i < NB_TACHES; i += 1) {
    ctx.fillStyle = hasard() < 0.6 ? 'rgba(140, 100, 50, 0.10)' : 'rgba(255, 255, 255, 0.12)';
    const t = 1 + hasard() * 3;
    ctx.fillRect(x + hasard() * (LARGEUR - t), y + hasard() * (HAUTEUR - t), t, t);
  }
  ctx.strokeStyle = COULEUR_BORD_FEUILLE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, LARGEUR - 2, HAUTEUR - 2);
  dessinerRouleau(ctx, x - DEBORD_ROULEAU, y - HAUTEUR_ROULEAU / 2, LARGEUR + 2 * DEBORD_ROULEAU);
  dessinerRouleau(ctx, x - DEBORD_ROULEAU, y + HAUTEUR - HAUTEUR_ROULEAU / 2, LARGEUR + 2 * DEBORD_ROULEAU);

  // L'icône, dans un halo qui respire doucement.
  const cx = x + LARGEUR / 2;
  const iy = y + HAUT_ICONE;
  const souffle = 0.75 + 0.25 * Math.sin((vue.ms / 1800) * Math.PI * 2);
  const halo = ctx.createRadialGradient(cx, iy, 2, cx, iy, TAILLE_ICONE * 0.8);
  halo.addColorStop(0, `rgba(255, 214, 120, ${0.55 * souffle})`);
  halo.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - TAILLE_ICONE, iy - TAILLE_ICONE, TAILLE_ICONE * 2, TAILLE_ICONE * 2);
  if (contenu.icone) {
    ctx.fillStyle = 'rgba(60, 40, 12, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, iy, TAILLE_ICONE / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    dessinerVisuel(ctx, contenu.icone, cx, iy, { echelle: 2.4, alpha });
  }

  // Le texte : chaque ligne entière est coupée UNE fois à la largeur de la
  // feuille ; la plume en révèle autant de signes qu'elle en a écrit.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const largeurTexte = LARGEUR - 2 * MARGE_TEXTE;
  let ly = iy + TAILLE_ICONE / 2 + 8;
  const hautTexte = ly;
  contenu.lignesCompletes.forEach((complete, i) => {
    const titre = i === 0;
    ctx.font = titre ? POLICE_TITRE : POLICE_TEXTE;
    const interligne = titre ? INTERLIGNE_TITRE : INTERLIGNE_TEXTE;
    const coupees = decouperEnFenetres(complete, (t) => ctx.measureText(t).width, largeurTexte, Infinity)[0].split('\n');
    let reste = Array.from(contenu.lignes[i] || '').length;
    for (const morceau of coupees) {
      const signes = Array.from(morceau);
      const n = Math.min(signes.length, reste);
      reste = Math.max(0, reste - signes.length - 1);
      ecrireEnOr(ctx, signes.slice(0, n).join(''), cx, ly, alpha);
      ly += interligne;
    }
    if (!titre) ly += ECART_PARAGRAPHE;
  });

  // Les particules : de la poussière d'or qui monte du texte.
  const hTexte = Math.max(1, ly - hautTexte);
  for (const p of vue.particules) {
    ctx.globalAlpha = alpha * alphaParticule(p) * 0.8;
    ctx.fillStyle = p.blanche ? '#fff6d8' : '#e8b640';
    ctx.fillRect(x + MARGE_TEXTE + p.x * largeurTexte, hautTexte + p.y * hTexte, TAILLE_PARTICULE, TAILLE_PARTICULE);
  }
  ctx.restore();
  dessinerActions(ctx, contenu.actions, alpha);
}

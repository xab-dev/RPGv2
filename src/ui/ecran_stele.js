// La vue rapprochée d'une stèle (demande de Xav, 23/09) : « une vieille pierre
// sombre gravée de hiéroglyphes fluorescents, lumineux, avec des particules,
// bleu/blanc ». Jamais exercé par les tests headless (dessin canvas). Les
// lignes arrivent déjà brouillées (`indices.js#lignesBrouillees`, appelé par
// `main.js`), jamais de texte en dur ici.
//
// Dessiné sous la transform logique -> physique, comme le prologue : toutes
// les positions sont en unités LOGIQUES (480 × 270), jamais lues sur
// `ctx.canvas` (cf. diagnostic des dialogues invisibles, CLAUDE.md).
//
// La lueur n'emploie JAMAIS `shadowBlur` (règle du polish des dialogues : son
// coût par frame est imprévisible sur mobile) : un dégradé radial derrière la
// gravure, puis chaque ligne tracée quatre fois décalée d'un pixel en bleu
// pâle, une fois en bleu plein, une fois en blanc par-dessus — le cœur blanc
// d'un néon.

import { RESOLUTION_LOGIQUE } from '../render.js';
import { decouperEnFenetres } from '../dialogue.js';
import { mulberry32 } from '../decor.js';
import { alphaParticule } from '../stele.js';

// Toutes PROVISOIRES, à juger en jeu par Xav.
// La pierre : une dalle haute au sommet arrondi, centrée, qui laisse voir un
// peu du jeu voilé autour (on regarde la pierre, on n'a pas quitté la forêt).
const VOILE = 'rgba(4, 6, 10, 0.72)';
const LARGEUR_PIERRE = 170;
const HAUTEUR_PIERRE = 236;
const ARRONDI_SOMMET = 46;
const COULEUR_PIERRE_HAUT = '#343742';
const COULEUR_PIERRE_BAS = '#1a1c22';
const COULEUR_ARETE = '#5a5e6a';
const COULEUR_FISSURE = '#101216';
const NB_GRAINS = 90;
// La zone gravée, en retrait des bords de la dalle.
const MARGE_GRAVURE_X = 22;
const HAUT_GRAVURE = 58;
const BAS_GRAVURE = 26;
// Monospace : une gravure se lit comme une grille de signes, et la fonte à
// chasse fixe donne à ces signes l'allure de code qu'ils sont (`Q-121`).
const POLICE_GRAVURE = '12px monospace';
const INTERLIGNE = 17;
// La respiration de la lueur : période et amplitude.
const PERIODE_LUEUR_MS = 2600;
const LUEUR_MIN = 0.7;
const TAILLE_PARTICULE = 1.4;
// PS1 : de combien la pierre monte pendant le fondu d'entrée.
const MONTEE_FONDU = 8;

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function graineDe(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i += 1) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return h >>> 0;
}

function tracerDalle(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + ARRONDI_SOMMET);
  ctx.quadraticCurveTo(x, y, x + w / 2, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + ARRONDI_SOMMET);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

// `contenu` : { id, lignes (hiéroglyphes), couleur (#rrggbb), vue (`stele.js`),
// alpha (le fondu d'entrée et de sortie, `stele.js#alphaVueStele`) }.
export function dessinerEcranStele(ctx, contenu) {
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  const { vue, couleur, alpha = 1 } = contenu;
  if (alpha <= 0) return;
  // PS1 : la pierre monte de quelques pixels en apparaissant — un regard
  // qui se lève vers elle, pas un panneau qui tombe.
  const x = Math.round((largeur - LARGEUR_PIERRE) / 2);
  const y = Math.round((hauteur - HAUTEUR_PIERRE) / 2) + 4 + Math.round((1 - alpha) * MONTEE_FONDU);
  const lueur = LUEUR_MIN + (1 - LUEUR_MIN) * (0.5 + 0.5 * Math.sin((vue.ms / PERIODE_LUEUR_MS) * Math.PI * 2));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = VOILE;
  ctx.fillRect(0, 0, largeur, hauteur);

  // La pierre : dégradé vertical, une arête claire à gauche (la lumière vient
  // d'en haut à gauche, comme dans le monde), du grain, deux fissures.
  const degrade = ctx.createLinearGradient(0, y, 0, y + HAUTEUR_PIERRE);
  degrade.addColorStop(0, COULEUR_PIERRE_HAUT);
  degrade.addColorStop(1, COULEUR_PIERRE_BAS);
  ctx.fillStyle = degrade;
  tracerDalle(ctx, x, y, LARGEUR_PIERRE, HAUTEUR_PIERRE);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const hasard = mulberry32(graineDe(contenu.id));
  for (let i = 0; i < NB_GRAINS; i += 1) {
    ctx.fillStyle = hasard() < 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.18)';
    const t = 1 + hasard() * 2;
    ctx.fillRect(x + hasard() * LARGEUR_PIERRE, y + hasard() * HAUTEUR_PIERRE, t, t);
  }
  ctx.strokeStyle = COULEUR_FISSURE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + LARGEUR_PIERRE * 0.78, y + 18);
  ctx.lineTo(x + LARGEUR_PIERRE * 0.7, y + 44);
  ctx.lineTo(x + LARGEUR_PIERRE * 0.74, y + 62);
  ctx.moveTo(x + 8, y + HAUTEUR_PIERRE * 0.8);
  ctx.lineTo(x + 26, y + HAUTEUR_PIERRE * 0.86);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = COULEUR_ARETE;
  ctx.lineWidth = 1;
  tracerDalle(ctx, x + 0.5, y + 0.5, LARGEUR_PIERRE - 1, HAUTEUR_PIERRE);
  ctx.stroke();

  // La zone gravée et sa lueur de fond.
  const gx = x + MARGE_GRAVURE_X;
  const gy = y + HAUT_GRAVURE;
  const gw = LARGEUR_PIERRE - 2 * MARGE_GRAVURE_X;
  const gh = HAUTEUR_PIERRE - HAUT_GRAVURE - BAS_GRAVURE;
  const halo = ctx.createRadialGradient(gx + gw / 2, gy + gh / 2, 4, gx + gw / 2, gy + gh / 2, gh * 0.75);
  halo.addColorStop(0, rgba(couleur, 0.22 * lueur));
  halo.addColorStop(1, rgba(couleur, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(gx - 20, gy - 20, gw + 40, gh + 40);

  ctx.font = POLICE_GRAVURE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lignes = contenu.lignes.flatMap((texte) =>
    decouperEnFenetres(texte, (t) => ctx.measureText(t).width, gw, Infinity)[0].split('\n'));
  const cx = gx + gw / 2;
  let ly = gy + Math.max(0, Math.round((gh - lignes.length * INTERLIGNE) / 2));
  for (const ligne of lignes) {
    ctx.fillStyle = couleur;
    ctx.globalAlpha = alpha * 0.12 * lueur;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.fillText(ligne, cx + dx, ly + dy);
    ctx.globalAlpha = alpha * 0.28 * lueur;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(ligne, cx + dx, ly + dy);
    ctx.globalAlpha = alpha * 0.95;
    ctx.fillText(ligne, cx, ly);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = alpha * 0.5 * lueur;
    ctx.fillText(ligne, cx, ly);
    ly += INTERLIGNE;
  }

  // Les particules montent de la gravure.
  for (const p of vue.particules) {
    ctx.globalAlpha = alpha * alphaParticule(p) * lueur;
    ctx.fillStyle = p.blanche ? '#ffffff' : couleur;
    ctx.fillRect(gx + p.x * gw, gy + p.y * gh, TAILLE_PARTICULE, TAILLE_PARTICULE);
  }
  ctx.restore();
}

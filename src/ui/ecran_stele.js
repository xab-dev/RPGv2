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
import { POLICE_CHIFFRES, POLICE_CALLIGRAPHIE } from '../polices.js';
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
// PS3 : la profondeur. La lumière vient d'en haut à gauche (comme dans le
// monde) : le flanc droit s'assombrit, un biseau clair court en haut à gauche
// à quelques pixels du bord. La gravure est dans un panneau CREUSÉ — plus
// sombre, ombre portée sur son bord haut, reflet sur son bord bas. De la
// mousse au pied : la pierre est là depuis longtemps.
const OMBRE_FLANC = 'rgba(0, 0, 0, 0.32)';
const REFLET_FLANC = 'rgba(255, 255, 255, 0.04)';
const RETRAIT_BISEAU = 5;
const COULEUR_BISEAU = 'rgba(255, 255, 255, 0.07)';
const FOND_PANNEAU = 'rgba(0, 0, 0, 0.22)';
const OMBRE_PANNEAU = 'rgba(0, 0, 0, 0.45)';
const REFLET_PANNEAU = 'rgba(255, 255, 255, 0.08)';
const MARGE_PANNEAU = 8;
const COULEURS_MOUSSE = ['rgba(22, 38, 26, 0.9)', 'rgba(30, 50, 32, 0.8)', 'rgba(18, 30, 22, 0.9)'];
const NB_TOUFFES_MOUSSE = 18;
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
// PS2 : la lueur descend la pierre en vague — chaque ligne respire avec ce
// déphasage (en fraction de période) sur la précédente. Toutes ensemble,
// elles clignotaient comme une enseigne ; en vague, la pierre semble vivre.
const DEPHASAGE_LIGNE = 0.09;
const TAILLE_PARTICULE = 1.4;
// PS1 : de combien la pierre monte pendant le fondu d'entrée.
const MONTEE_FONDU = 8;
// Spec 14 : les actions de la vue (Descendre, Fermer), en bas à droite, hors
// de la pierre — on lit la gravure, pas un bouton posé dessus.
const POLICE_ACTION = `10px "${POLICE_CHIFFRES}", "${POLICE_CALLIGRAPHIE}", serif`;
const MARGE_ACTIONS = 10;
const INTERLIGNE_ACTIONS = 16;
const COULEUR_ACTION = '#d8dee8';
const TOUCHE_PADDING_X = 3;
const HAUTEUR_TOUCHE = 12;
const ECART_TOUCHE = 5;

// Le coin haut-gauche de la pierre à l'écran, `alpha` étant le fondu : un
// seul calcul pour le dessin et pour la zone que le doigt touche.
function originePierre(alpha) {
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  return {
    x: Math.round((largeur - LARGEUR_PIERRE) / 2),
    y: Math.round((hauteur - HAUTEUR_PIERRE) / 2) + 4 + Math.round((1 - alpha) * MONTEE_FONDU),
  };
}

// Le panneau gravé, en unités LOGIQUES, pierre posée (fondu fini). Spec 14 :
// au doigt, le toucher SUR la gravure descend — les boutons du jeu sont sous
// la vue. Pur : lu par `main.js`, jamais `ctx.canvas`.
export function zoneGravureStele() {
  const { x, y } = originePierre(1);
  return {
    x: x + MARGE_GRAVURE_X - MARGE_PANNEAU,
    y: y + HAUT_GRAVURE - MARGE_PANNEAU,
    w: LARGEUR_PIERRE - 2 * MARGE_GRAVURE_X + 2 * MARGE_PANNEAU,
    h: HAUTEUR_PIERRE - HAUT_GRAVURE - BAS_GRAVURE + 2 * MARGE_PANNEAU,
  };
}

// `actions` : [{ glyphe, texte }] — le glyphe dans une petite touche, puis le
// texte ; alignées à droite, de bas en haut dans l'ordre inverse (la
// première action est la plus haute).
function dessinerActions(ctx, actions, alpha) {
  if (!actions || actions.length === 0) return;
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  ctx.save();
  ctx.font = POLICE_ACTION;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  actions.forEach((action, i) => {
    const yc = hauteur - MARGE_ACTIONS - (actions.length - 1 - i) * INTERLIGNE_ACTIONS - HAUTEUR_TOUCHE / 2;
    const largeurTexte = ctx.measureText(action.texte).width;
    const largeurGlyphe = action.glyphe ? ctx.measureText(action.glyphe).width + 2 * TOUCHE_PADDING_X : 0;
    const ecart = action.glyphe ? ECART_TOUCHE : 0;
    let x = largeur - MARGE_ACTIONS - largeurTexte - ecart - largeurGlyphe;
    ctx.globalAlpha = alpha * 0.9;
    if (action.glyphe) {
      ctx.strokeStyle = COULEUR_ACTION;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(yc - HAUTEUR_TOUCHE / 2) + 0.5, Math.round(largeurGlyphe), HAUTEUR_TOUCHE);
      ctx.fillStyle = COULEUR_ACTION;
      ctx.fillText(action.glyphe, x + TOUCHE_PADDING_X + 0.5, yc + 1);
      x += largeurGlyphe + ecart;
    }
    ctx.fillStyle = COULEUR_ACTION;
    ctx.fillText(action.texte, x, yc + 1);
  });
  ctx.restore();
}

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

// `contenu` : { id, lignes (hiéroglyphes, ou le texte clair une fois l'indice
// déchiffré), couleur (#rrggbb), actions ([{ glyphe, texte }], spec 14 : vide
// sur une stèle sans descente), vue (`stele.js`), alpha (le fondu d'entrée
// et de sortie, `stele.js#alphaVueStele`) }.
export function dessinerEcranStele(ctx, contenu) {
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  const { vue, couleur, alpha = 1 } = contenu;
  if (alpha <= 0) return;
  // PS1 : la pierre monte de quelques pixels en apparaissant — un regard
  // qui se lève vers elle, pas un panneau qui tombe.
  const { x, y } = originePierre(alpha);
  const lueurA = (dephasage) => LUEUR_MIN + (1 - LUEUR_MIN) * (0.5 + 0.5 * Math.sin((vue.ms / PERIODE_LUEUR_MS - dephasage) * Math.PI * 2));
  const lueur = lueurA(0);

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
  // PS3 : le flanc droit dans l'ombre, le gauche à peine éclairé.
  const flanc = ctx.createLinearGradient(x, 0, x + LARGEUR_PIERRE, 0);
  flanc.addColorStop(0, REFLET_FLANC);
  flanc.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
  flanc.addColorStop(1, OMBRE_FLANC);
  ctx.fillStyle = flanc;
  ctx.fillRect(x, y, LARGEUR_PIERRE, HAUTEUR_PIERRE);
  // Le biseau : le contour de la dalle, en retrait, seulement sa moitié haute
  // gauche éclairée (tracé coupé par un rectangle de découpe).
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, LARGEUR_PIERRE * 0.62, HAUTEUR_PIERRE * 0.7);
  ctx.clip();
  ctx.strokeStyle = COULEUR_BISEAU;
  ctx.lineWidth = 1.5;
  tracerDalle(ctx, x + RETRAIT_BISEAU, y + RETRAIT_BISEAU, LARGEUR_PIERRE - 2 * RETRAIT_BISEAU, HAUTEUR_PIERRE);
  ctx.stroke();
  ctx.restore();
  // La mousse au pied : des touffes d'ellipses sombres, tirées à la même
  // graine que le grain (la même pierre montre toujours la même mousse).
  for (let i = 0; i < NB_TOUFFES_MOUSSE; i += 1) {
    ctx.fillStyle = COULEURS_MOUSSE[Math.floor(hasard() * COULEURS_MOUSSE.length)];
    const mx = x + hasard() * LARGEUR_PIERRE;
    const my = y + HAUTEUR_PIERRE - 1 - hasard() * 9;
    ctx.beginPath();
    ctx.ellipse(mx, my, 2 + hasard() * 4, 1 + hasard() * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
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
  // PS3 : le panneau creusé qui porte la gravure.
  const px0 = gx - MARGE_PANNEAU;
  const py0 = gy - MARGE_PANNEAU;
  const pw = gw + 2 * MARGE_PANNEAU;
  const ph = gh + 2 * MARGE_PANNEAU;
  ctx.fillStyle = FOND_PANNEAU;
  ctx.fillRect(px0, py0, pw, ph);
  ctx.fillStyle = OMBRE_PANNEAU;
  ctx.fillRect(px0, py0, pw, 2);
  ctx.fillRect(px0, py0, 2, ph);
  ctx.fillStyle = REFLET_PANNEAU;
  ctx.fillRect(px0, py0 + ph - 1, pw, 1);
  ctx.fillRect(px0 + pw - 1, py0, 1, ph);
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
  const hautBloc = gy + Math.max(0, Math.round((gh - lignes.length * INTERLIGNE) / 2));
  const largeurs = lignes.map((l) => ctx.measureText(l).width);
  let ly = hautBloc;
  lignes.forEach((ligne, i) => {
    const lueurLigne = lueurA(i * DEPHASAGE_LIGNE);
    ctx.fillStyle = couleur;
    ctx.globalAlpha = alpha * 0.12 * lueurLigne;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.fillText(ligne, cx + dx, ly + dy);
    ctx.globalAlpha = alpha * 0.28 * lueurLigne;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(ligne, cx + dx, ly + dy);
    ctx.globalAlpha = alpha * (0.75 + 0.2 * lueurLigne);
    ctx.fillText(ligne, cx, ly);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = alpha * 0.5 * lueurLigne;
    ctx.fillText(ligne, cx, ly);
    ly += INTERLIGNE;
  });

  // Les particules naissent SUR une ligne gravée (PS2), à l'intérieur de sa
  // largeur réelle, puis montent : ce sont les signes qui s'effritent en
  // lumière, pas une poussière posée devant la pierre.
  if (lignes.length > 0) {
    for (const p of vue.particules) {
      const rang = Math.min(lignes.length - 1, Math.floor(p.y0 * lignes.length));
      const w = largeurs[rang];
      ctx.globalAlpha = alpha * alphaParticule(p) * lueurA(rang * DEPHASAGE_LIGNE);
      ctx.fillStyle = p.blanche ? '#ffffff' : couleur;
      ctx.fillRect(cx - w / 2 + p.x * w, hautBloc + (rang + 0.5) * INTERLIGNE + (p.y - p.y0) * gh, TAILLE_PARTICULE, TAILLE_PARTICULE);
    }
  }
  ctx.restore();
  dessinerActions(ctx, contenu.actions, alpha);
}

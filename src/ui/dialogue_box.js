// Rendu de la boîte de dialogue (§3.7), en bas de l'écran logique. Jamais
// exercé par les tests headless (dessin canvas). `ligne` vient de
// dialogue.js#resoudreLignes — déjà traduite, jamais de texte en dur ici.

import { RESOLUTION_LOGIQUE } from '../render.js';
import { decouperEnFenetres } from '../dialogue.js';
import { dessinerCadre } from './cadre.js';

// `D-136` : la géométrie du texte, en un seul endroit — le dessin ET la
// pagination la lisent, jamais deux jeux de nombres qui divergeraient (une
// pagination calculée sur une autre largeur que celle dessinée referait le
// débordement qu'elle corrige). En unités LOGIQUES : la bulle vit dans le
// 480 × 270 agrandi d'un bloc, donc la taille de l'écran n'y change rien ;
// seule la police de l'appareil compte, et c'est elle qu'on mesure.
const MARGE_BOITE = 8;
const MARGE_TEXTE_X = 18;
const POLICE_TEXTE = '13px sans-serif';
// Interligne : la bulle de 70 px porte le locuteur (y + 8), puis deux lignes
// (y + 28, y + 44) qui finissent avant le marqueur d'armement (y + 60).
const INTERLIGNE = 16;
const LIGNES_PAR_FENETRE = 2;
// Marqueur d'armement : centre à RETRAIT du bord de la boîte, DEMI de
// demi-largeur.
const MARQUEUR_RETRAIT = 10;
const MARQUEUR_DEMI = 5;
// Le texte s'arrête avant la colonne du marqueur, plus 3 px d'air : la seconde
// ligne descend à sa hauteur, et un texte qui le toucherait le cacherait.
const LARGEUR_TEXTE = RESOLUTION_LOGIQUE.largeur - MARGE_BOITE - MARQUEUR_RETRAIT - MARQUEUR_DEMI - 3 - MARGE_TEXTE_X;

// La fonction de pagination que `dialogue.js` reçoit à sa création : mesure
// avec la police DESSINÉE, sur le contexte du jeu (la transform active ne
// change pas `measureText`, qui rend des unités de la police, donc logiques).
// `save`/`restore` : mesurer ne doit rien laisser sur le contexte partagé.
export function creerPaginateurDialogue(ctx) {
  return (texte) => {
    ctx.save();
    ctx.font = POLICE_TEXTE;
    const fenetres = decouperEnFenetres(texte, (t) => ctx.measureText(t).width, LARGEUR_TEXTE, LIGNES_PAR_FENETRE);
    ctx.restore();
    return fenetres;
  };
}

export function dessinerDialogue(ctx, ligne) {
  if (!ligne) return;

  // Diagnostic SD_dialogues-invisibles_2026-09-15 : `ctx.canvas.width/height`
  // est la taille PHYSIQUE du canvas hors-écran depuis le MT rendu-net
  // (redimensionné par ajusterCanvasLogiquePhysique), pas la résolution
  // logique — or ce dessin reste sous la transform logique->physique (f)
  // encore active. Lire la taille physique ici doublait la mise à l'échelle
  // et sortait la boîte entièrement du canvas visible.
  const { largeur, hauteur } = RESOLUTION_LOGIQUE;
  const boiteHauteur = 70;
  const y = hauteur - boiteHauteur - 8;

  ctx.save();
  // `D-163` : le cadre de la famille du bandeau et des cases (ui/cadre.js),
  // plus un rectangle noir à liseré blanc.
  dessinerCadre(ctx, MARGE_BOITE, y, largeur - 2 * MARGE_BOITE, boiteHauteur);

  ctx.fillStyle = '#c2a83e';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(ligne.locuteur, MARGE_TEXTE_X, y + 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = POLICE_TEXTE;
  // Les `\n` sont posés par la pagination sur la fenêtre entière : couper ce
  // qui est déjà tapé sur eux garde chaque mot sur sa ligne définitive.
  ligne.texte.split('\n').forEach((morceau, i) => {
    ctx.fillText(morceau, MARGE_TEXTE_X, y + 28 + i * INTERLIGNE);
  });

  // Marqueur d'armement (§3.2 03_grotte-polish, mécanisme 3) : un triangle
  // DESSINÉ (jamais une chaîne "▼", cf. contrainte "zéro chaîne en dur" —
  // ce n'est pas du texte localisable) en bas à droite de la boîte,
  // uniquement quand la ligne est avançable. Absent tant que la machine à
  // écrire tourne ou que le délai d'armement n'est pas écoulé.
  if (ligne.arme) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const cx = largeur - MARGE_BOITE - MARQUEUR_RETRAIT;
    const cy = y + boiteHauteur - 10;
    ctx.beginPath();
    ctx.moveTo(cx - MARQUEUR_DEMI, cy - 3);
    ctx.lineTo(cx + MARQUEUR_DEMI, cy - 3);
    ctx.lineTo(cx, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

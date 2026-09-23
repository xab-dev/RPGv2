// Rendu de la boîte de dialogue (§3.7), en bas de l'écran logique. Jamais
// exercé par les tests headless (dessin canvas). `ligne` vient de
// dialogue.js#resoudreLignes — déjà traduite, jamais de texte en dur ici.

import { RESOLUTION_LOGIQUE } from '../render.js';
import { decouperEnFenetres } from '../dialogue.js';
import { dessinerCadre } from './cadre.js';
import { geometrieBoiteDialogue, BOITE_DIALOGUE } from './hud_layout.js';

// `D-136` : la géométrie du texte, en un seul endroit — le dessin ET la
// pagination la lisent, jamais deux jeux de nombres qui divergeraient (une
// pagination calculée sur une autre largeur que celle dessinée referait le
// débordement qu'elle corrige). En unités LOGIQUES : la bulle vit dans le
// 480 × 270 agrandi d'un bloc, donc la taille de l'écran n'y change rien ;
// seule la police de l'appareil compte, et c'est elle qu'on mesure.
// La marge de la bulle appartient à sa géométrie (`hud_layout.js`, spec 11).
const MARGE_BOITE = BOITE_DIALOGUE.marge;
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
  const { largeur } = RESOLUTION_LOGIQUE;
  // Spec 11 : la bulle grandit par le haut quand des options sont visibles ;
  // sa géométrie est celle que le doigt lit (`hud_layout.js`), jamais une
  // seconde copie.
  const { boite, options } = geometrieBoiteDialogue(ligne.options ? ligne.options.length : 0, RESOLUTION_LOGIQUE);
  const boiteHauteur = boite.hauteur;
  const y = boite.y;

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
  // Spec 11 §4.2 : les options, sous le texte, dans la même bulle — pas un
  // menu. L'option retenue porte un surlignage et un curseur ▸ DESSINÉ (un
  // chemin, comme le ▼, jamais une chaîne). Les autres restent lisibles mais
  // en retrait : on voit tout, on sait ce qui partira si on appuie.
  if (ligne.options) {
    ligne.options.forEach((texteOption, i) => {
      const rangee = options[i];
      const retenue = i === ligne.selection;
      if (retenue) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(rangee.x + 4, rangee.y, rangee.largeur - 4, rangee.hauteur);
        ctx.fillStyle = '#c2a83e';
        const cy = rangee.y + rangee.hauteur / 2;
        ctx.beginPath();
        ctx.moveTo(MARGE_TEXTE_X - 4, cy - 4);
        ctx.lineTo(MARGE_TEXTE_X + 2, cy);
        ctx.lineTo(MARGE_TEXTE_X - 4, cy + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = retenue ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
      ctx.font = POLICE_TEXTE;
      ctx.fillText(texteOption, MARGE_TEXTE_X + 8, rangee.y + 3);
    });
  }

  // Avec des options, le ▼ se tait : ce n'est plus « la suite », c'est un
  // choix, et le curseur ▸ dit déjà où appuyer.
  if (ligne.arme && !ligne.options) {
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

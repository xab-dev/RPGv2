// Rendu de la boîte de dialogue (§3.7), en bas de l'écran logique. Jamais
// exercé par les tests headless (dessin canvas). `ligne` vient de
// dialogue.js#resoudreLignes — déjà traduite, jamais de texte en dur ici.

import { RESOLUTION_LOGIQUE } from '../render.js';
import { decouperEnFenetres } from '../dialogue.js';
import { dessinerVisuel, TAILLE_REFERENCE_FOLLET_PX } from '../visuels.js';
import { etincellesOrbite, facteurRespiration } from '../ornements.js';
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

// `D-169` (polish des dialogues, 23/09) : UNE couleur d'accent pour tout ce
// qui, dans la bulle, n'est pas du texte à lire — le nom du locuteur, le
// curseur ▸ et le marqueur ▼. Le ▼ était blanc et le ▸ doré : deux signes du
// même geste (« appuie ici ») qui ne se ressemblaient pas. C'est l'or du nom,
// qui existait déjà. Le surlignage de l'option retenue reste blanc : teinté
// d'or sur le fond sombre, il virait à l'olive.
const ACCENT = '#c2a83e';
const SURLIGNAGE = 'rgba(255, 255, 255, 0.12)';
// Le portrait du follet qui parle, à la place de son nom : un médaillon
// centré sur la rangée du nom (y + 8, police de 13 px), qui finit avant la
// première ligne de texte (y + 28). Diamètre de l'icône en px logiques ; le
// médaillon l'entoure sans la toucher. La taille est celle de l'icône du
// follet au HUD (`hud.js#TAILLE_ICONE_FOLLET`) : le même follet, à la même
// taille, aux deux endroits où l'interface le montre. PROVISOIRES, à juger
// en jeu par Xav.
const PORTRAIT_TAILLE = 6;
const PORTRAIT_RAYON = 9;
const PORTRAIT_CX = MARGE_TEXTE_X + PORTRAIT_RAYON - 2;
const PORTRAIT_DY = 16;
const PORTRAIT_FOND_ALPHA = 0.18;
const PORTRAIT_ANNEAU_ALPHA = 0.55;
// La lueur des flèches (réglage Moyen et au-delà) : un disque en dégradé
// radial, jamais un `shadowBlur` — celui-ci se compte en pixels PHYSIQUES
// et ignore la transform logique → physique : le même nombre ferait un halo
// quatre fois plus petit à l'échelle 4. Un dégradé vit dans le repère du
// dessin, comme tout le reste de la bulle. Rayon en px logiques, alpha au
// centre au repos (la respiration le fait varier de ±amplitude). PROVISOIRES.
const LUEUR_RAYON = 11;
const LUEUR_ALPHA = 0.55;

function dessinerLueur(ctx, cx, cy, facteur) {
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, LUEUR_RAYON);
  halo.addColorStop(0, `rgba(194, 168, 62, ${Math.min(1, LUEUR_ALPHA * facteur)})`);
  halo.addColorStop(1, 'rgba(194, 168, 62, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - LUEUR_RAYON, cy - LUEUR_RAYON, 2 * LUEUR_RAYON, 2 * LUEUR_RAYON);
}

// Les étincelles du réglage Haut : la même orbite que celle du follet dans le
// monde (`ornements.js`), autour de son portrait. `devant` trie ce qui passe
// derrière le médaillon de ce qui passe devant — c'est ce qui fait lire une
// orbite et non un anneau collé dessus.
function dessinerEtincelles(ctx, etincelles, devant, visuel, teinte) {
  for (const p of etincelles) {
    if (p.devant !== devant) continue;
    dessinerVisuel(ctx, visuel, p.x, p.y, { teinte, alpha: p.alpha, echelle: p.echelle });
  }
}

function dessinerPortrait(ctx, y, portrait, habillage) {
  const cy = y + PORTRAIT_DY;
  const etincelles = habillage.etincelles
    ? etincellesOrbite(habillage.etincelles, habillage.tMs, PORTRAIT_CX, cy)
    : [];
  dessinerEtincelles(ctx, etincelles, false, habillage.visuelEtincelle, portrait.teinte);
  ctx.save();
  ctx.beginPath();
  ctx.arc(PORTRAIT_CX, cy, PORTRAIT_RAYON, 0, Math.PI * 2);
  ctx.globalAlpha = PORTRAIT_FOND_ALPHA;
  ctx.fillStyle = portrait.teinte;
  ctx.fill();
  ctx.globalAlpha = PORTRAIT_ANNEAU_ALPHA;
  ctx.lineWidth = 1;
  ctx.strokeStyle = portrait.teinte;
  ctx.stroke();
  ctx.restore();
  dessinerVisuel(ctx, portrait.visuel, PORTRAIT_CX, cy, {
    teinte: portrait.teinte,
    echelle: PORTRAIT_TAILLE / TAILLE_REFERENCE_FOLLET_PX,
  });
  dessinerEtincelles(ctx, etincelles, true, habillage.visuelEtincelle, portrait.teinte);
}

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

// `habillage` (`D-169`) : ce que main.js résout pour la bulle, qui ne
// connaît ni registre ni preset — `portrait` ({ visuel, teinte } ou `null`),
// `lueur` et `etincelles` (des effets du catalogue, ou `null` sous leur
// seuil d'ornement : le dessin ne fait qu'un test de présence),
// `visuelEtincelle` et `tMs`, l'horloge du dialogue ouvert.
export function dessinerDialogue(ctx, ligne, habillage = {}) {
  if (!ligne) return;
  const facteurLueur = habillage.lueur ? facteurRespiration(habillage.lueur, habillage.tMs) : 0;

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

  ctx.textBaseline = 'top';
  if (habillage.portrait) {
    dessinerPortrait(ctx, y, habillage.portrait, habillage);
  } else {
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(ligne.locuteur, MARGE_TEXTE_X, y + 8);
  }

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
        ctx.fillStyle = SURLIGNAGE;
        ctx.fillRect(rangee.x + 4, rangee.y, rangee.largeur - 4, rangee.hauteur);
        const cy = rangee.y + rangee.hauteur / 2;
        if (facteurLueur > 0) dessinerLueur(ctx, MARGE_TEXTE_X - 1, cy, facteurLueur);
        ctx.fillStyle = ACCENT;
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
    const cx = largeur - MARGE_BOITE - MARQUEUR_RETRAIT;
    const cy = y + boiteHauteur - 10;
    if (facteurLueur > 0) dessinerLueur(ctx, cx, cy, facteurLueur);
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.moveTo(cx - MARQUEUR_DEMI, cy - 3);
    ctx.lineTo(cx + MARQUEUR_DEMI, cy - 3);
    ctx.lineTo(cx, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

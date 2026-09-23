// Calque HUD des indices de commande (specs/04_indices-commandes.md §2) :
// bannière éphémère glyphe + mot, centrée en haut de l'écran, fondu court aux
// deux bouts — jamais un tutoriel, jamais de son (§3). Jamais exercé par les
// tests headless (dessin canvas — contrainte de méthode) ; `main.js` résout
// déjà `texte`/`glyphe` via i18n avant d'appeler ceci (même patron que
// dessinerHud : ce calque ne connaît jamais hints.json/glyphes.json/i18n).
//
// `ctx.save()/restore()` en tête/fin (règle de méthode née du diagnostic
// dialogues-invisibles) : ce calque ne touche pas la transform lui-même, mais
// modifie fillStyle/font/alpha — les restaurer évite de fuiter sur le calque
// suivant si l'ordre de dessin change un jour.

import { RESOLUTION_LOGIQUE } from '../render.js';
import { dessinerCadre, dessinerTouche, ACCENT } from './cadre.js';
import { POLICE_CALLIGRAPHIE, POLICE_CHIFFRES } from '../polices.js';

// Sous le cartouche PV (haut-gauche, cf. hud.js), centré — jamais superposé.
// Provisoire, position/durée non validées en jeu par Xav (§7, critère manuel).
// MT_hud-ligne-haute_2026-09-19 : descendue de 8 à 26 px. Le HUD occupe
// désormais un bandeau plein écran sur les 20 premiers pixels (hud_layout.js
// #BANDEAU_HAUT) — à 8 px, la bannière d'indice se serait superposée à la
// ligne PV/faim/soif/niveau. La fiche exige explicitement que le bandeau ne
// recouvre pas les indices de commande : c'est l'indice qui laisse la place,
// le bandeau étant, lui, permanent.
const Y_BANNIERE = 26;
const HAUTEUR_BANNIERE = 18;
const PADDING_X = 8;
const DUREE_FONDU_MS = 250;
// Polish libre du 24/09 : la plume de la bulle, dont la bannière porte déjà
// le cadre (`D-163`), au lieu d'un `monospace` de console — c'était le
// premier texte du jeu, dans la Grotte, et le dernier à parler en linéale.
// Rien ne dépend d'une chasse fixe : les largeurs sont MESURÉES
// (`measureText`), et l'écart touche → texte est un nombre de pixels.
const POLICE = `bold 11px "${POLICE_CHIFFRES}", "${POLICE_CALLIGRAPHIE}", serif`;
// La touche : 14 px dans une bannière de 18 (2 px d'air en haut et en bas).
// Son padding horizontal déborde dans l'air qui l'entoure au lieu d'élargir
// la bannière : l'écart glyphe → texte vaut exactement les deux espaces
// d'avant (12 px en `bold 10px monospace`), dont 4 pour le bord de la touche
// et 8 d'air. Provisoire, jugé à la capture Chrome seulement.
const HAUTEUR_TOUCHE = 14;
const TOUCHE_PADDING_X = 4;
const ECART_TOUCHE_TEXTE = 12;

export function dessinerHudHints(ctx, indice) {
  if (!indice) return;
  const { texte, glyphe, resteMs, dureeMs } = indice;

  // Fondu bref en entrée ET en sortie (§3 : "fondu court") — jamais un
  // simple on/off, cohérent avec calculerOpaciteToit (structures.js).
  const depuisAffichage = dureeMs - resteMs;
  const alphaEntree = Math.min(1, depuisAffichage / DUREE_FONDU_MS);
  const alphaSortie = Math.min(1, resteMs / DUREE_FONDU_MS);
  const alpha = Math.max(0, Math.min(alphaEntree, alphaSortie));
  if (alpha <= 0) return;

  // Glyphe et texte, dans cet ordre, en sautant ce qui manque. Une annonce du
  // jeu (palier E de `specs/09`) n'a pas de glyphe : elle n'a donc ni touche
  // ni écart, et sa phrase reste centrée dans sa boîte.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = POLICE;
  const largeurGlyphe = glyphe ? ctx.measureText(glyphe).width : 0;
  const largeurTexte = texte ? ctx.measureText(texte).width : 0;
  const ecart = glyphe && texte ? ECART_TOUCHE_TEXTE : 0;
  const largeurBanniere = largeurGlyphe + ecart + largeurTexte + PADDING_X * 2;
  const x = (RESOLUTION_LOGIQUE.largeur - largeurBanniere) / 2;
  const yTexte = Y_BANNIERE + HAUTEUR_BANNIERE / 2 + 1;

  // `D-163` : même cadre que la bulle de dialogue (ui/cadre.js), de la
  // famille du bandeau — plus un aplat noir à liseré blanc.
  dessinerCadre(ctx, x, Y_BANNIERE, largeurBanniere, HAUTEUR_BANNIERE);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let curseur = x + PADDING_X;
  if (glyphe) {
    // La touche mord sur l'air autour du glyphe, jamais sur la largeur : la
    // bannière reste celle d'avant (le bouton MENU tactile, collé à droite,
    // compte sur elle — test `d17`).
    dessinerTouche(
      ctx,
      curseur - TOUCHE_PADDING_X,
      Y_BANNIERE + (HAUTEUR_BANNIERE - HAUTEUR_TOUCHE) / 2,
      largeurGlyphe + TOUCHE_PADDING_X * 2,
      HAUTEUR_TOUCHE,
    );
    ctx.fillStyle = ACCENT;
    ctx.fillText(glyphe, curseur, yTexte);
    curseur += largeurGlyphe + ecart;
  }
  if (texte) {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(texte, curseur, yTexte);
  }
  ctx.restore();
}

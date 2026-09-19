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

  const contenu = texte ? `${glyphe}  ${texte}` : glyphe;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 10px monospace';
  const largeurTexte = ctx.measureText(contenu).width;
  const largeurBanniere = largeurTexte + PADDING_X * 2;
  const x = (RESOLUTION_LOGIQUE.largeur - largeurBanniere) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, Y_BANNIERE, largeurBanniere, HAUTEUR_BANNIERE);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.strokeRect(x, Y_BANNIERE, largeurBanniere, HAUTEUR_BANNIERE);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(contenu, x + largeurBanniere / 2, Y_BANNIERE + HAUTEUR_BANNIERE / 2 + 1);
  ctx.restore();
}
